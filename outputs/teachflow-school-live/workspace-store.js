const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const workspaceState = require("./workspace-state.js");
const teacherAgentOrchestrator = require("./teacher-agent-orchestrator.js");
const studentAgentOrchestrator = require("./student-agent-orchestrator.js");
const aiAgentService = require("./ai-agent-service.js");

const stateFile = process.env.TEACHFLOW_WORKSPACE_FILE
  ? path.resolve(process.env.TEACHFLOW_WORKSPACE_FILE)
  : path.join(__dirname, "data", "workspace-state.json");

const ACTION_ROLE_ACCESS = {
  read_workspace: ["teacher", "student", "school_admin"],
  read_teacher_agent: ["teacher"],
  use_teacher_ai: ["teacher"],
  generate_material: ["teacher"],
  update_material_draft: ["teacher"],
  publish_material_draft: ["teacher"],
  draft_teacher_message: ["teacher"],
  apply_teacher_agent_action: ["teacher"],
  read_student_agent: ["student"],
  use_student_agent: ["student"],
  share_student_agent_signal: ["student"],
  write_workspace: ["teacher"],
  update_class_settings: ["teacher"],
  reset_workspace: ["teacher"],
  update_assignment: ["teacher", "student"],
  record_question: ["student"],
  record_stuck_signal: ["student"],
  record_check_in: ["student"],
  record_message: ["teacher", "student"],
  mark_teacher_action_read: ["student"]
};

const TEACHER_PERMISSIONS = ["read_class", "read_students", "approve_materials", "export_materials", "send_feedback"];
const STUDENT_PERMISSIONS = ["read_self", "submit_assignment", "ask_agent", "send_stuck_signal", "send_check_in"];

function getState(context) {
  const state = getRawState();
  authorizeContext(context, "read_workspace");
  return clone(context ? workspaceState.scopedStateForContext(state, context) : state);
}

function getRawState() {
  const stored = readStateFile();
  if (stored) return clone(workspaceState.normalizeState(stored));
  const fresh = workspaceState.createDefaultState();
  writeStateFile(fresh);
  return clone(fresh);
}

function registerTeacher(input) {
  const state = getRawState();
  const createdAt = new Date().toISOString();
  const teacherDisplayName = cleanText(input?.displayName, 80) || "老师";
  const schoolName = cleanText(input?.schoolName, 100) || state.school?.name || "TeachFlow School";
  const className = cleanText(input?.className, 100) || `${teacherDisplayName}的课堂`;
  const course = cleanText(input?.course, 100) || "未设置课程";
  const topic = cleanText(input?.topic, 120) || "待设置主题";
  const teacherId = uniqueId(state.accounts, "teacher");
  const classId = uniqueId(state.classes, "class");
  const inviteToken = `join-${randomToken(12)}`;

  const account = {
    id: teacherId,
    role: "teacher",
    displayName: teacherDisplayName,
    classIds: [classId],
    permissions: TEACHER_PERMISSIONS
  };
  const classRecord = {
    id: classId,
    name: className,
    course,
    topic,
    teacherIds: [teacherId],
    studentAliases: [],
    status: "active",
    inviteToken,
    createdAt
  };
  const invite = {
    id: uniqueId(state.inviteLinks || [], "invite"),
    token: inviteToken,
    classId,
    teacherId,
    active: true,
    createdAt
  };

  state.school = {
    ...(state.school || {}),
    id: state.school?.id || "school-live",
    name: schoolName
  };
  state.accounts = [...(state.accounts || []), account];
  state.classes = [...(state.classes || []), classRecord];
  state.inviteLinks = [...(state.inviteLinks || []), invite];
  state.activeClassId = classId;
  state.className = className;
  state.topic = topic;
  appendAuditEvent(state, eventFromContext({
    role: "teacher",
    userId: teacherId,
    classId
  }, "teacher_register", "class", classId, {
    className,
    course,
    hasInvite: true
  }));
  writeStateFile(state);

  return {
    account: clone(account),
    classRecord: clone(classRecord),
    invite: publicInvite(workspaceState.normalizeState(state), invite),
    state: clone(workspaceState.normalizeState(state))
  };
}

function getInviteByToken(token) {
  const state = getRawState();
  const inviteToken = cleanText(token, 160);
  const invite = (state.inviteLinks || []).find((item) => item.token === inviteToken && item.active !== false)
    || (state.classes || []).map((classRecord) => ({
      id: `invite-${classRecord.id}`,
      token: classRecord.inviteToken,
      classId: classRecord.id,
      teacherId: classRecord.teacherIds?.[0] || null,
      active: Boolean(classRecord.inviteToken)
    })).find((item) => item.token === inviteToken && item.active);
  if (!invite) return null;
  return publicInvite(state, invite);
}

function registerStudentWithInvite(input) {
  const state = getRawState();
  const invite = getInviteByToken(input?.inviteToken || input?.token || input?.joinToken);
  if (!invite) throwStatus("Invalid or expired class invite", 404);

  const classRecord = (state.classes || []).find((item) => item.id === invite.classId);
  if (!classRecord) throwStatus("Invite class was not found", 404);

  const createdAt = new Date().toISOString();
  const alias = nextStudentAlias(state, classRecord);
  const displayName = cleanText(input?.displayName, 80) || `学生 ${alias}`;
  const student = {
    id: alias,
    short: alias.replace(/^S/i, ""),
    status: "刚加入",
    level: "未分层",
    stuck: "暂无卡点",
    next: "等待第一次学习输入",
    evidence: "",
    memory: `${displayName} 已通过课堂链接加入。`,
    createdAt
  };
  const account = {
    id: uniqueId(state.accounts || [], `student-${alias.toLowerCase()}`),
    role: "student",
    displayName,
    classIds: [classRecord.id],
    studentAlias: alias,
    permissions: STUDENT_PERMISSIONS
  };

  state.students = [...(state.students || []), student];
  state.accounts = [...(state.accounts || []), account];
  state.assignments = {
    ...(state.assignments || {}),
    [alias]: "未提交"
  };
  classRecord.studentAliases = Array.from(new Set([...(classRecord.studentAliases || []), alias]));
  state.activeClassId = state.activeClassId || classRecord.id;
  state.className = classRecord.name || state.className;
  state.topic = classRecord.topic || state.topic;
  appendAuditEvent(state, eventFromContext({
    role: "student",
    userId: account.id,
    classId: classRecord.id,
    studentAlias: alias
  }, "student_join_class", "student", alias, {
    studentAlias: alias,
    className: classRecord.name
  }));
  writeStateFile(state);

  return {
    account: clone(account),
    classRecord: clone(classRecord),
    student: clone(student),
    invite: publicInvite(workspaceState.normalizeState(state), invite),
    state: clone(workspaceState.normalizeState(state))
  };
}

function getTeacherAgentBriefing(contextInput) {
  const context = requestContext(contextInput || {});
  if (!context) throwForbidden("Teacher session is required");
  authorizeContext(context, "read_teacher_agent");
  const state = getRawState();
  const scoped = workspaceState.scopedStateForContext(state, context);
  return clone(teacherAgentOrchestrator.buildTeacherBriefing(scoped, { context }));
}

function getAiStatus(contextInput) {
  const context = requestContext(contextInput || {});
  if (context) authorizeContext(context, "read_workspace");
  return clone(aiAgentService.getStatus());
}

async function answerTeacherAgentChat(input) {
  const context = requestContext(input || {});
  if (!context) throwForbidden("Teacher session is required");
  authorizeContext(context, "use_teacher_ai");
  const briefing = getTeacherAgentBriefing(context);
  const result = await aiAgentService.answerTeacherQuestion({
    question: input.question || input.text || "",
    briefing
  });
  const state = getRawState();
  appendAuditEvent(state, eventFromContext(context, "teacher_ai_chat", "teacher_agent", context.classId, {
    hasQuestion: Boolean(input.question || input.text),
    mode: result.mode || "unknown"
  }));
  writeStateFile(state);
  return clone(result);
}

async function generateAiMaterial(input) {
  const context = requestContext(input || {});
  if (!context) throwForbidden("Teacher session is required");
  authorizeContext(context, "generate_material");
  const briefing = getTeacherAgentBriefing(context);
  const result = await aiAgentService.generateMaterial({ ...input, briefing });
  const state = getRawState();
  const savedDraft = materialDraftFromAiResult(result, input, context, state);
  state.draftMaterials = [savedDraft, ...(Array.isArray(state.draftMaterials) ? state.draftMaterials : [])].slice(0, 50);
  appendAuditEvent(state, eventFromContext(context, "ai_material_draft", "material", savedDraft.id, {
    materialType: input.type || input.materialType || "unknown",
    mode: result.mode || "unknown",
    title: savedDraft.title
  }));
  writeStateFile(state);
  return clone({
    ...result,
    savedDraft,
    state: workspaceState.scopedStateForContext(state, context)
  });
}

function updateMaterialDraft(input) {
  const context = requestContext(input || {});
  if (!context) throwForbidden("Teacher session is required");
  authorizeContext(context, "update_material_draft");

  const state = getRawState();
  const draftId = cleanText(input.id || input.draftId, 120);
  const draftIndex = (state.draftMaterials || []).findIndex((item) => item.id === draftId);
  if (draftIndex < 0) throwStatus("Material draft was not found", 404);

  const current = state.draftMaterials[draftIndex];
  if (current.classId && current.classId !== context.classId) {
    denyWithAudit(state, context, "update_material_draft", "Material draft is outside class boundary", draftId);
  }

  const updatedAt = new Date().toISOString();
  const nextDraft = {
    ...current,
    title: cleanText(input.title || current.title, 180),
    type: cleanText(input.type || current.type || "讲义", 80),
    topic: cleanText(input.topic || current.topic || "", 160),
    targetLevel: cleanText(input.targetLevel || current.targetLevel || "", 80),
    goal: cleanText(input.goal || current.goal || "", 500),
    content: cleanText(input.content || current.content || "", 1000),
    outline: cleanMaterialList(input.outline ?? current.outline, 10, 220),
    teacherNotes: cleanMaterialText(input.teacherNotes ?? current.teacherNotes, 600),
    studentTask: cleanMaterialText(input.studentTask ?? current.studentTask, 400),
    reviewChecklist: cleanMaterialList(input.reviewChecklist ?? current.reviewChecklist, 8, 160),
    status: current.status || "draft",
    classId: current.classId || context.classId,
    updatedAt,
    version: Number(current.version || 1) + 1
  };

  state.draftMaterials = state.draftMaterials.map((item, index) => (index === draftIndex ? nextDraft : item));
  appendAuditEvent(state, eventFromContext(context, "material_draft_update", "material", nextDraft.id, {
    materialType: nextDraft.type,
    title: nextDraft.title
  }));
  writeStateFile(state);
  return clone({
    savedDraft: nextDraft,
    state: workspaceState.scopedStateForContext(state, context)
  });
}

async function draftAiTeacherMessage(input) {
  const context = requestContext(input || {});
  if (!context) throwForbidden("Teacher session is required");
  authorizeContext(context, "draft_teacher_message");
  const alias = input.studentAlias || input.alias || null;
  if (alias) authorizeStudentMutation(context, alias, "draft_teacher_message");
  const briefing = getTeacherAgentBriefing(context);
  const result = await aiAgentService.draftTeacherMessage({ ...input, briefing });
  const state = getRawState();
  appendAuditEvent(state, eventFromContext(context, "ai_message_draft", "message_draft", alias || context.classId, {
    studentAlias: alias,
    mode: result.mode || "unknown"
  }));
  writeStateFile(state);
  return clone(result);
}

function applyTeacherAgentAction(input) {
  const context = requestContext(input || {});
  if (!context) throwForbidden("Teacher session is required");
  authorizeContext(context, "apply_teacher_agent_action");

  const type = normalizeTeacherAgentActionType(input.type || input.actionType);
  const alias = input.studentAlias || input.alias || null;
  if (teacherAgentActionNeedsAlias(type)) {
    if (!alias) throw new Error("studentAlias is required");
    authorizeStudentMutation(context, alias, "apply_teacher_agent_action");
  }

  hydrateWorkspaceState();
  const nextState = workspaceState.recordTeacherAgentAction({
    ...input,
    type,
    studentAlias: alias,
    context
  });
  appendAuditEvent(nextState, eventFromContext(context, "teacher_agent_action", "teacher_agent_action", nextState.teacherAgentActions[0]?.id || type, {
    studentAlias: alias,
    actionType: type,
    sourceId: input.sourceId || null,
    studentVisible: nextState.teacherAgentActions[0]?.studentVisible !== false
  }));
  writeStateFile(nextState);
  return clone(workspaceState.scopedStateForContext(nextState, context));
}

function getStudentAgentBriefing(contextInput) {
  const context = requestContext(contextInput || {});
  if (!context) throwForbidden("Student session is required");
  authorizeContext(context, "read_student_agent");
  const state = getRawState();
  const scoped = workspaceState.scopedStateForContext(state, context);
  return clone(studentAgentOrchestrator.buildStudentBriefing(scoped, { context }));
}

function answerStudentAgentChat(input) {
  const context = requestContext(input || {});
  if (!context) throwForbidden("Student session is required");
  authorizeContext(context, "use_student_agent");
  const briefing = getStudentAgentBriefing(context);
  return clone(studentAgentOrchestrator.answerStudentQuestion(input.question || input.text || "", briefing));
}

async function answerStudentAgentChatLive(input) {
  const context = requestContext(input || {});
  if (!context) throwForbidden("Student session is required");
  authorizeContext(context, "use_student_agent");
  const briefing = getStudentAgentBriefing(context);
  const result = await aiAgentService.answerStudentQuestion({
    question: input.question || input.text || "",
    briefing
  });
  const state = getRawState();
  appendAuditEvent(state, eventFromContext(context, "student_ai_chat", "student_agent", context.studentAlias, {
    studentAlias: context.studentAlias,
    hasQuestion: Boolean(input.question || input.text),
    mode: result.mode || "unknown"
  }));
  writeStateFile(state);
  return clone(result);
}

async function answerStudentWellbeingChatLive(input) {
  const context = requestContext(input || {});
  if (!context) throwForbidden("Student session is required");
  authorizeContext(context, "use_student_agent");
  const briefing = getStudentAgentBriefing(context);
  const result = await aiAgentService.answerStudentWellbeing({
    message: input.message || input.question || input.text || "",
    briefing
  });
  const state = getRawState();
  appendAuditEvent(state, eventFromContext(context, "student_wellbeing_chat", "wellbeing_coach", context.studentAlias, {
    studentAlias: context.studentAlias,
    hasMessage: Boolean(input.message || input.question || input.text),
    mode: result.mode || "unknown"
  }));
  writeStateFile(state);
  return clone(result);
}

function draftStudentAgentStuckSignal(input) {
  const context = requestContext(input || {});
  if (!context) throwForbidden("Student session is required");
  authorizeContext(context, "use_student_agent");
  const briefing = getStudentAgentBriefing(context);
  return clone(studentAgentOrchestrator.draftStuckSignal(input, briefing));
}

function shareStudentAgentSignal(input) {
  const context = requestContext(input || {});
  if (!context) throwForbidden("Student session is required");
  const alias = context.studentAlias;
  authorizeStudentMutation(context, alias, "share_student_agent_signal");
  const briefing = getStudentAgentBriefing(context);
  const draft = studentAgentOrchestrator.draftStuckSignal(input, briefing);
  const evidenceNote = String(input.text || input.note || draft.teacherSummary || "").trim();
  hydrateWorkspaceState();
  const nextState = workspaceState.recordStuckSignal(alias, draft.stuckType, evidenceNote || draft.teacherSummary);
  appendAuditEvent(nextState, eventFromContext(context, "record_stuck_signal", "student", alias, {
    studentAlias: alias,
    stuckType: draft.stuckType,
    hasNote: Boolean(evidenceNote || draft.teacherSummary),
    source: "student_agent"
  }));
  appendAuditEvent(nextState, eventFromContext(context, "student_agent_share_to_teacher", "student_agent_signal", alias, {
    studentAlias: alias,
    stuckType: draft.stuckType,
    source: "student_agent",
    hasNote: Boolean(draft.teacherSummary)
  }));
  writeStateFile(nextState);
  return {
    draft: clone(draft),
    state: clone(workspaceState.scopedStateForContext(nextState, context))
  };
}

function setState(nextState) {
  const context = requestContext(nextState.context || nextState);
  authorizeContext(context, "write_workspace");
  const state = workspaceState.normalizeState(nextState);
  appendAuditEvent(state, eventFromContext(context, "write_workspace", "workspace", "workspace", {}));
  writeStateFile(state);
  return clone(state);
}

function resetState(contextInput) {
  const context = requestContext(contextInput || {});
  authorizeContext(context, "reset_workspace");
  const state = workspaceState.createDefaultState();
  appendAuditEvent(state, eventFromContext(context, "reset_workspace", "workspace", "workspace", {}));
  writeStateFile(state);
  return clone(context ? workspaceState.scopedStateForContext(state, context) : state);
}

function updateClassSettings(input) {
  const context = requestContext(input || {});
  if (!context) throwForbidden("Teacher session is required");
  authorizeContext(context, "update_class_settings");
  const state = getRawState();
  const classRecord = (state.classes || []).find((item) => item.id === context.classId);
  if (!classRecord) throwStatus("Class was not found", 404);

  const nextName = cleanText(input.className, 100);
  const nextCourse = cleanText(input.course, 100);
  const nextTopic = cleanText(input.topic, 120);
  if (nextName) classRecord.name = nextName;
  if (nextCourse) classRecord.course = nextCourse;
  if (nextTopic) classRecord.topic = nextTopic;
  state.activeClassId = classRecord.id;
  state.className = classRecord.name || state.className;
  state.topic = classRecord.topic || state.topic;
  appendAuditEvent(state, eventFromContext(context, "update_class_settings", "class", classRecord.id, {
    className: classRecord.name,
    course: classRecord.course || "",
    topic: classRecord.topic || ""
  }));
  writeStateFile(state);
  return clone(workspaceState.scopedStateForContext(state, context));
}

function updateAssignment(input) {
  const alias = input.studentAlias || input.alias;
  if (!alias) throw new Error("studentAlias is required");
  const context = requestContext(input);
  authorizeStudentMutation(context, alias, "update_assignment");
  hydrateWorkspaceState();
  const nextState = workspaceState.updateAssignment(alias, input.status || "草稿已保存", {
    linkedTeacherActionId: input.linkedTeacherActionId,
    responseType: input.responseType
  });
  appendAuditEvent(nextState, eventFromContext(context, "update_assignment", "student", alias, {
    studentAlias: alias,
    status: input.status || "草稿已保存",
    linkedTeacherActionId: input.linkedTeacherActionId || null,
    responseType: input.responseType || null
  }));
  writeStateFile(nextState);
  return clone(context ? workspaceState.scopedStateForContext(nextState, context) : nextState);
}

function recordQuestion(input) {
  const alias = input.studentAlias || input.alias;
  if (!alias) throw new Error("studentAlias is required");
  const context = requestContext(input);
  authorizeStudentMutation(context, alias, "record_question");
  hydrateWorkspaceState();
  const nextState = workspaceState.recordQuestion(alias, input.text || input.question || "", {
    linkedTeacherActionId: input.linkedTeacherActionId,
    responseType: input.responseType
  });
  appendAuditEvent(nextState, eventFromContext(context, "record_question", "student", alias, {
    studentAlias: alias,
    hasText: Boolean(input.text || input.question),
    linkedTeacherActionId: input.linkedTeacherActionId || null,
    responseType: input.responseType || null
  }));
  writeStateFile(nextState);
  return clone(context ? workspaceState.scopedStateForContext(nextState, context) : nextState);
}

function recordStuckSignal(input) {
  const alias = input.studentAlias || input.alias;
  if (!alias) throw new Error("studentAlias is required");
  const context = requestContext(input);
  authorizeStudentMutation(context, alias, "record_stuck_signal");
  hydrateWorkspaceState();
  const nextState = workspaceState.recordStuckSignal(alias, input.stuckType || "卡点", input.note || "", {
    linkedTeacherActionId: input.linkedTeacherActionId,
    responseType: input.responseType
  });
  appendAuditEvent(nextState, eventFromContext(context, "record_stuck_signal", "student", alias, {
    studentAlias: alias,
    stuckType: input.stuckType || "卡点",
    hasNote: Boolean(input.note),
    linkedTeacherActionId: input.linkedTeacherActionId || null,
    responseType: input.responseType || null
  }));
  writeStateFile(nextState);
  return clone(context ? workspaceState.scopedStateForContext(nextState, context) : nextState);
}

function recordCheckIn(input) {
  const alias = input.studentAlias || input.alias;
  if (!alias) throw new Error("studentAlias is required");
  const context = requestContext(input);
  authorizeStudentMutation(context, alias, "record_check_in");
  hydrateWorkspaceState();
  const nextState = workspaceState.recordCheckIn(alias, {
    topic: input.topic,
    state: input.state || input.mood,
    note: input.note || "",
    shareChoice: input.shareChoice || "private",
    linkedTeacherActionId: input.linkedTeacherActionId,
    responseType: input.responseType
  });
  const latest = nextState.checkIns.find((item) => item.studentAlias === alias) || {};
  appendAuditEvent(nextState, eventFromContext(context, "record_check_in", "student", alias, {
    studentAlias: alias,
    state: latest.state || input.state || "partly_understand",
    shareChoice: latest.shareChoice || input.shareChoice || "private",
    teacherVisible: Boolean(latest.teacherVisible),
    safeguardingFlag: Boolean(latest.safeguardingFlag?.required),
    linkedTeacherActionId: input.linkedTeacherActionId || null,
    responseType: input.responseType || null
  }));
  writeStateFile(nextState);
  return clone(context ? workspaceState.scopedStateForContext(nextState, context) : nextState);
}

function recordMessage(input) {
  const alias = input.studentAlias || input.alias;
  if (!alias) throw new Error("studentAlias is required");
  const context = requestContext(input);
  authorizeStudentMutation(context, alias, "record_message");
  hydrateWorkspaceState();
  const senderRole = context?.role === "teacher" ? "teacher" : "student";
  const nextState = workspaceState.recordMessage(alias, {
    text: input.text || input.message || "",
    senderRole,
    senderId: context?.userId,
    senderLabel: senderRole === "teacher" ? "老师" : alias,
    kind: input.kind || "chat",
    linkedTeacherActionId: input.linkedTeacherActionId,
    responseType: input.responseType,
    context
  });
  appendAuditEvent(nextState, eventFromContext(context, "record_message", "message_thread", alias, {
    studentAlias: alias,
    senderRole,
    hasText: Boolean(input.text || input.message),
    linkedTeacherActionId: input.linkedTeacherActionId || null,
    responseType: input.responseType || null
  }));
  writeStateFile(nextState);
  return clone(context ? workspaceState.scopedStateForContext(nextState, context) : nextState);
}

function markTeacherActionRead(input) {
  const alias = input.studentAlias || input.alias;
  const actionId = input.actionId || input.teacherActionId || input.id;
  if (!alias) throw new Error("studentAlias is required");
  if (!actionId) throw new Error("actionId is required");
  const context = requestContext(input);
  authorizeStudentMutation(context, alias, "mark_teacher_action_read");
  hydrateWorkspaceState();
  const nextState = workspaceState.markTeacherAgentActionRead(alias, actionId, {
    readAt: input.readAt,
    context
  });
  appendAuditEvent(nextState, eventFromContext(context, "teacher_agent_action_read", "teacher_agent_action", actionId, {
    studentAlias: alias,
    actionId
  }));
  writeStateFile(nextState);
  return clone(context ? workspaceState.scopedStateForContext(nextState, context) : nextState);
}

function recordAuditEvent(event) {
  const state = getRawState();
  appendAuditEvent(state, event);
  writeStateFile(state);
  return clone(state.auditEvents[0]);
}

function hydrateWorkspaceState() {
  workspaceState.setState(getRawState());
}

function materialDraftFromAiResult(result, input, context, state) {
  const draft = result?.draft && typeof result.draft === "object" && !Array.isArray(result.draft)
    ? result.draft
    : {};
  const textDraft = typeof result?.draft === "string" ? result.draft : "";
  const classRecord = (state.classes || []).find((item) => item.id === context.classId) || {};
  const type = cleanText(draft.type || input.type || input.materialType || "讲义", 80) || "讲义";
  const topic = cleanText(input.topic || draft.topic || classRecord.topic || state.topic || "", 160);
  const title = cleanText(draft.title || `${topic || "当前主题"} ${type}草稿`, 180);
  const content = cleanText(draft.content || textDraft, 1000);
  const now = new Date().toISOString();

  return {
    id: uniqueId(state.draftMaterials, "material"),
    title,
    type,
    topic,
    targetLevel: cleanText(draft.targetLevel || input.targetLevel || "Level 1-2", 80),
    goal: cleanText(draft.goal || input.prompt || input.request || "", 500),
    content,
    outline: cleanMaterialList(draft.outline || draft.sections || draft.slides || draft.steps || content, 10, 220),
    teacherNotes: cleanMaterialText(draft.teacherNotes || draft.teacherNote || draft.notes, 600),
    studentTask: cleanMaterialText(draft.studentTask || draft.task, 400),
    reviewChecklist: cleanMaterialList(draft.reviewChecklist || draft.checklist, 8, 160),
    status: "draft",
    classId: context.classId,
    createdBy: context.userId,
    source: "ai_material_generator",
    mode: result?.mode || "unknown",
    provider: result?.provider || "local",
    model: result?.model || "",
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

function requestContext(input) {
  const context = input?.context || input;
  if (!context || !context.role) return null;
  return workspaceState.getContext(context.role, context);
}

function normalizeTeacherAgentActionType(value) {
  const type = String(value || "").trim();
  if (["send_message", "assign_material", "schedule_followup", "dismiss"].includes(type)) return type;
  return "dismiss";
}

function teacherAgentActionNeedsAlias(type) {
  return ["send_message", "assign_material", "schedule_followup"].includes(type);
}

function authorizeContext(contextInput, action) {
  const context = requestContext(contextInput || {});
  if (!context) return;
  const state = getRawState();
  const account = state.accounts.find((item) => item.id === context.userId);
  const activeClass = state.classes.find((item) => item.id === context.classId);
  const allowedRoles = ACTION_ROLE_ACCESS[action];

  if (!account) denyWithAudit(state, context, action, `Unknown account for ${action}`);
  if (!activeClass) denyWithAudit(state, context, action, `Unknown class for ${action}`);
  if (allowedRoles && !allowedRoles.includes(context.role)) {
    denyWithAudit(state, context, action, `${context.role} cannot perform ${action}`);
  }
  if (!account.classIds.includes(context.classId)) {
    denyWithAudit(state, context, action, `Account cannot access this class for ${action}`);
  }
  if (context.role === "student" && account.studentAlias !== context.studentAlias) {
    denyWithAudit(state, context, action, `Student account cannot impersonate ${context.studentAlias}`);
  }
  if (context.role === "school_admin" && /^write|reset/.test(action)) {
    denyWithAudit(state, context, action, "School admin can only read aggregate data in this MVP");
  }
}

function authorizeStudentMutation(context, alias, action) {
  if (!context) return;
  authorizeContext(context, action);

  if (context.role === "student" && context.studentAlias !== alias) {
    denyWithAudit(getRawState(), context, action, `Student can only update own alias for ${action}`, alias);
  }
  if (context.role === "school_admin") {
    denyWithAudit(getRawState(), context, action, `School admin cannot write student records for ${action}`, alias);
  }

  const state = getRawState();
  const activeClass = state.classes.find((item) => item.id === context.classId);
  if (!activeClass?.studentAliases.includes(alias)) {
    denyWithAudit(state, context, action, `Student alias is outside class boundary for ${action}`, alias);
  }
}

function denyWithAudit(state, context, action, message, targetId) {
  appendAuditEvent(state, eventFromContext(context, "access_denied", "workspace", targetId || context?.classId || "unknown", {
    attemptedAction: action,
    reason: message
  }));
  writeStateFile(state);
  throwForbidden(message);
}

function eventFromContext(context, action, targetType, targetId, details) {
  return {
    action,
    actorId: context?.userId || "system",
    role: context?.role || "system",
    classId: context?.classId || null,
    studentAlias: details?.studentAlias || context?.studentAlias || null,
    targetType,
    targetId,
    details: details || {}
  };
}

function appendAuditEvent(state, event) {
  const nextEvent = {
    id: event.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: event.timestamp || new Date().toISOString(),
    action: event.action,
    actorId: event.actorId || "system",
    role: event.role || "system",
    classId: event.classId || null,
    studentAlias: event.studentAlias || null,
    targetType: event.targetType || "workspace",
    targetId: event.targetId || "unknown",
    details: event.details || {}
  };
  state.auditEvents = [nextEvent, ...(Array.isArray(state.auditEvents) ? state.auditEvents : [])].slice(0, 100);
  state.updatedAt = new Date().toISOString();
  return state;
}

function throwForbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  throw error;
}

function throwStatus(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength || 120);
}

function cleanMaterialText(value, maxLength) {
  if (Array.isArray(value)) return value.map((item) => cleanMaterialText(item, maxLength)).filter(Boolean).join("；").slice(0, maxLength || 500);
  if (value && typeof value === "object") return JSON.stringify(value).slice(0, maxLength || 500);
  return cleanText(value, maxLength || 500);
}

function cleanMaterialList(value, maxItems, maxLength) {
  let items = [];
  if (Array.isArray(value)) {
    items = value;
  } else if (value && typeof value === "object") {
    items = Object.values(value);
  } else {
    items = String(value || "").split(/\n+|；|;/);
  }
  return items
    .map((item) => cleanMaterialText(item, maxLength || 180).replace(/^\s*[-*\d.、]+\s*/, ""))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems || 8);
}

function randomToken(bytes) {
  return crypto.randomBytes(bytes || 8).toString("hex");
}

function uniqueId(items, prefix) {
  const existing = new Set((items || []).map((item) => item.id).filter(Boolean));
  let id = `${prefix}-${randomToken(4)}`;
  while (existing.has(id)) id = `${prefix}-${randomToken(4)}`;
  return id;
}

function nextStudentAlias(state, classRecord) {
  const classAliases = new Set(classRecord.studentAliases || []);
  const usedNumbers = new Set(
    (state.students || [])
      .filter((student) => !classAliases.size || classAliases.has(student.id))
      .map((student) => Number(String(student.id || "").replace(/^S/i, "")))
      .filter((value) => Number.isFinite(value) && value > 0)
  );
  (classRecord.studentAliases || []).forEach((alias) => {
    const value = Number(String(alias || "").replace(/^S/i, ""));
    if (Number.isFinite(value) && value > 0) usedNumbers.add(value);
  });

  let next = 1;
  while (usedNumbers.has(next)) next += 1;
  return `S${String(next).padStart(3, "0")}`;
}

function publicInvite(state, invite) {
  const classRecord = (state.classes || []).find((item) => item.id === invite.classId) || null;
  const teacher = (state.accounts || []).find((item) => item.id === invite.teacherId) || null;
  return {
    token: invite.token,
    classId: invite.classId,
    className: classRecord?.name || invite.classId,
    course: classRecord?.course || "",
    topic: classRecord?.topic || "",
    schoolName: state.school?.name || "TeachFlow School",
    teacherDisplayName: teacher?.displayName || "老师",
    active: invite.active !== false,
    createdAt: invite.createdAt || null
  };
}

function readStateFile() {
  try {
    const raw = fs.readFileSync(stateFile, "utf8");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function writeStateFile(state) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(workspaceState.normalizeState(state), null, 2)}\n`, "utf8");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function materialDraftFromAiResult(result, input, context, state) {
  const draft = result?.draft && typeof result.draft === "object" && !Array.isArray(result.draft)
    ? result.draft
    : {};
  const textDraft = typeof result?.draft === "string" ? result.draft : "";
  const classRecord = (state.classes || []).find((item) => item.id === context.classId) || {};
  const id = uniqueId(state.draftMaterials, "material");
  const type = normalizeMaterialTypeValue(draft.type || input.type || input.materialType || "讲义");
  const kind = normalizeMaterialKindValue(draft.kind || type);
  const topic = cleanText(input.topic || draft.topic || classRecord.topic || state.topic || "", 160);
  const title = cleanText(draft.title || `${topic || "当前课程主题"} ${type}草稿`, 180);
  const content = cleanText(draft.content || textDraft, 1200);
  const imageUrl = kind === "image"
    ? storeGeneratedMaterialImage(id, draft.imageBase64) || cleanText(draft.imageUrl, 240)
    : cleanText(draft.imageUrl, 240);
  const sections = cleanSectionList(draft.sections || draft.outline || content, 8);
  const exercises = cleanExerciseList(draft.exercises || draft.questions, 12);
  const answerKey = cleanMaterialList(draft.answerKey || draft.answers || draft.solutionKey, 12, 260);
  const keyPoints = cleanMaterialList(draft.keyPoints || draft.highlights || draft.outline, 10, 220);
  const outline = materialOutlineForKind(kind, { draft, content, sections, exercises, imageUrl });
  const targetAliases = normalizeMaterialTargetAliases(input.targetAliases || input.studentAliases || input.targetAlias, classRecord);
  const now = new Date().toISOString();

  return {
    id,
    kind,
    title,
    type,
    topic,
    targetLevel: cleanText(draft.targetLevel || input.targetLevel || "Level 1-2", 80),
    goal: cleanText(draft.goal || input.prompt || input.request || "", 600),
    content,
    outline,
    sections,
    keyPoints,
    exercises,
    answerKey,
    imageUrl,
    imagePrompt: cleanMaterialText(draft.imagePrompt || input.imagePrompt, 1400),
    revisedPrompt: cleanMaterialText(draft.revisedPrompt, 1400),
    targetAliases,
    teacherNotes: cleanMaterialText(draft.teacherNotes || draft.teacherNote || draft.notes, 800),
    studentTask: cleanMaterialText(draft.studentTask || draft.task, 500),
    reviewChecklist: cleanMaterialList(draft.reviewChecklist || draft.checklist, 10, 180),
    status: "draft",
    classId: context.classId,
    createdBy: context.userId,
    source: "ai_material_generator",
    mode: result?.mode || "unknown",
    provider: result?.provider || "local",
    model: result?.model || "",
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

function updateMaterialDraft(input) {
  const context = requestContext(input || {});
  if (!context) throwForbidden("Teacher session is required");
  authorizeContext(context, "update_material_draft");

  const state = getRawState();
  const draftId = cleanText(input.id || input.draftId, 120);
  const draftIndex = (state.draftMaterials || []).findIndex((item) => item.id === draftId);
  if (draftIndex < 0) throwStatus("Material draft was not found", 404);

  const current = state.draftMaterials[draftIndex];
  if (current.classId && current.classId !== context.classId) {
    denyWithAudit(state, context, "update_material_draft", "Material draft is outside class boundary", draftId);
  }

  const nextType = normalizeMaterialTypeValue(input.type || current.type || "讲义");
  const nextKind = normalizeMaterialKindValue(input.kind || current.kind || nextType);
  const sections = input.sections !== undefined ? cleanSectionList(input.sections, 8) : cleanSectionList(current.sections, 8);
  const exercises = input.exercises !== undefined ? cleanExerciseList(input.exercises, 12) : cleanExerciseList(current.exercises, 12);
  const answerKey = input.answerKey !== undefined
    ? cleanMaterialList(input.answerKey, 12, 260)
    : cleanMaterialList(current.answerKey, 12, 260);
  const keyPoints = input.keyPoints !== undefined
    ? cleanMaterialList(input.keyPoints, 10, 220)
    : cleanMaterialList(current.keyPoints, 10, 220);
  const outline = input.outline !== undefined
    ? cleanMaterialList(input.outline, 12, 240)
    : materialOutlineForKind(nextKind, { draft: current, content: current.content, sections, exercises, imageUrl: current.imageUrl });
  const classRecord = (state.classes || []).find((item) => item.id === context.classId) || {};
  const targetAliases = input.targetAliases !== undefined || input.studentAliases !== undefined || input.targetAlias !== undefined
    ? normalizeMaterialTargetAliases(input.targetAliases || input.studentAliases || input.targetAlias, classRecord)
    : (Array.isArray(current.targetAliases) ? current.targetAliases : []);
  const updatedAt = new Date().toISOString();

  const nextDraft = {
    ...current,
    kind: nextKind,
    title: cleanText(input.title || current.title, 180),
    type: nextType,
    topic: cleanText(input.topic || current.topic || "", 160),
    targetLevel: cleanText(input.targetLevel || current.targetLevel || "", 80),
    goal: cleanText(input.goal || current.goal || "", 600),
    content: cleanText(input.content ?? current.content ?? "", 1200),
    outline,
    sections,
    keyPoints,
    exercises,
    answerKey,
    imageUrl: cleanText(input.imageUrl || current.imageUrl || "", 240),
    imagePrompt: cleanMaterialText(input.imagePrompt ?? current.imagePrompt, 1400),
    revisedPrompt: cleanMaterialText(input.revisedPrompt ?? current.revisedPrompt, 1400),
    targetAliases,
    teacherNotes: cleanMaterialText(input.teacherNotes ?? current.teacherNotes, 800),
    studentTask: cleanMaterialText(input.studentTask ?? current.studentTask, 500),
    reviewChecklist: cleanMaterialList(input.reviewChecklist ?? current.reviewChecklist, 10, 180),
    status: current.status || "draft",
    classId: current.classId || context.classId,
    updatedAt,
    version: Number(current.version || 1) + 1
  };

  state.draftMaterials = state.draftMaterials.map((item, index) => (index === draftIndex ? nextDraft : item));
  appendAuditEvent(state, eventFromContext(context, "material_draft_update", "material", nextDraft.id, {
    materialType: nextDraft.type,
    materialKind: nextDraft.kind,
    title: nextDraft.title
  }));
  writeStateFile(state);
  return clone({
    savedDraft: nextDraft,
    state: workspaceState.scopedStateForContext(state, context)
  });
}

function normalizeMaterialTypeValue(value) {
  const text = cleanText(value, 80);
  if (/图片|图示|image|diagram|鍥剧墖|鍥剧ず/i.test(text)) return "图片";
  if (/练习|习题|测验|exercise|quiz|缁冧範/i.test(text)) return "练习";
  return "讲义";
}

function normalizeMaterialKindValue(value) {
  const text = cleanText(value, 80);
  if (/image|图片|图示|鍥剧墖|鍥剧ず/i.test(text)) return "image";
  if (/exercise|quiz|练习|习题|测验|缁冧範/i.test(text)) return "exercise";
  return "handout";
}

function storeGeneratedMaterialImage(draftId, imageBase64) {
  const raw = String(imageBase64 || "").trim();
  if (!raw) return "";
  const cleanBase64 = raw.replace(/^data:image\/png;base64,/i, "");
  const outputDir = path.join(__dirname, "generated", "materials");
  const fileName = `${draftId}.png`;
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, fileName), Buffer.from(cleanBase64, "base64"));
  return `generated/materials/${fileName}`;
}

function normalizeMaterialTargetAliases(value, classRecord) {
  const classAliases = Array.isArray(classRecord?.studentAliases) ? classRecord.studentAliases : [];
  const allowed = new Set(classAliases);
  let requested = [];
  if (Array.isArray(value)) {
    requested = value;
  } else if (value && typeof value === "object") {
    requested = Object.values(value);
  } else {
    requested = String(value || "")
      .split(/[,，\s]+/)
      .filter(Boolean);
  }
  return requested
    .map((item) => cleanText(item, 30))
    .filter((alias) => alias && alias !== "all" && alias !== "全班")
    .filter((alias) => !allowed.size || allowed.has(alias));
}

function cleanSectionList(value, maxItems) {
  return materialObjectItems(value).map((item, index) => {
    if (typeof item === "string") {
      const body = cleanMaterialText(item, 700);
      return body ? { heading: `部分 ${index + 1}`, body } : null;
    }
    const heading = cleanText(item.heading || item.title || item.label || `部分 ${index + 1}`, 120);
    const body = cleanMaterialText(item.body || item.content || item.detail || item.text || item.description, 700);
    return body || heading ? { heading, body } : null;
  }).filter(Boolean).slice(0, maxItems || 8);
}

function cleanExerciseList(value, maxItems) {
  return materialObjectItems(value).map((item, index) => {
    if (typeof item === "string") {
      const question = cleanMaterialText(item, 700);
      return question ? { id: `Q${index + 1}`, level: "", question, expectedAnswer: "", hint: "" } : null;
    }
    const id = cleanText(item.id || item.number || `Q${index + 1}`, 30);
    const level = cleanText(item.level || item.targetLevel || "", 80);
    const question = cleanMaterialText(item.question || item.prompt || item.text || item.title, 700);
    const expectedAnswer = cleanMaterialText(item.expectedAnswer || item.answer || item.solution, 700);
    const hint = cleanMaterialText(item.hint || item.scaffold || item.tip, 300);
    return question ? { id, level, question, expectedAnswer, hint } : null;
  }).filter(Boolean).slice(0, maxItems || 12);
}

function materialObjectItems(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return String(value || "")
    .split(/\n+|；|;|锛泑;/)
    .map((item) => item.replace(/^\s*[-*\d.、]+\s*/, "").trim())
    .filter(Boolean);
}

function materialOutlineForKind(kind, source) {
  if (kind === "image") {
    return cleanMaterialList([
      source.imageUrl ? "已生成图片文件，可在预览区查看。" : "图片接口不可用，保留图示生成提示词。",
      source.draft?.imagePrompt || source.draft?.goal || source.content
    ], 6, 240);
  }
  if (kind === "exercise") {
    const questions = (source.exercises || []).map((item) => `${item.id || ""} ${item.question || ""}`.trim());
    return cleanMaterialList(questions.length ? questions : source.content, 12, 240);
  }
  const sectionItems = (source.sections || []).map((item) => `${item.heading || ""}：${item.body || ""}`.trim());
  return cleanMaterialList(sectionItems.length ? sectionItems : source.content, 10, 240);
}

function publishMaterialDraft(input) {
  const context = requestContext(input || {});
  if (!context) throwForbidden("Teacher session is required");
  authorizeContext(context, "publish_material_draft");

  const state = getRawState();
  const draftId = cleanText(input.id || input.draftId || input.materialId, 120);
  const draftIndex = (state.draftMaterials || []).findIndex((item) => item.id === draftId);
  if (draftIndex < 0) throwStatus("Material draft was not found", 404);

  const draft = state.draftMaterials[draftIndex];
  if (draft.classId && draft.classId !== context.classId) {
    denyWithAudit(state, context, "publish_material_draft", "Material draft is outside class boundary", draftId);
  }

  const classRecord = (state.classes || []).find((item) => item.id === context.classId) || {};
  const aliases = publishTargetAliases(input.studentAliases || input.targetAliases || input.targetAlias || draft.targetAliases, classRecord);
  const now = new Date().toISOString();
  const publishedMaterial = {
    ...draft,
    id: uniqueId(state.approvedMaterials, "approved-material"),
    sourceDraftId: draft.id,
    status: "published",
    classId: context.classId,
    approvedBy: context.userId,
    approvedAt: now,
    publishedAt: now,
    publishedToAliases: aliases,
    targetAliases: aliases,
    version: Number(draft.version || 1)
  };

  state.approvedMaterials = [
    publishedMaterial,
    ...(Array.isArray(state.approvedMaterials) ? state.approvedMaterials : [])
      .filter((item) => item.sourceDraftId !== draft.id && item.id !== publishedMaterial.id)
  ].slice(0, 100);
  state.draftMaterials = (state.draftMaterials || []).filter((item) => item.id !== draft.id);

  const assignedActions = aliases.map((alias) => publishedMaterialAction(publishedMaterial, alias, context, now));
  state.teacherAgentActions = [
    ...assignedActions,
    ...(Array.isArray(state.teacherAgentActions) ? state.teacherAgentActions : [])
  ].slice(0, 100);

  appendAuditEvent(state, eventFromContext(context, "material_draft_publish", "material", publishedMaterial.id, {
    sourceDraftId: draft.id,
    materialType: publishedMaterial.type,
    materialKind: publishedMaterial.kind,
    publishedToCount: aliases.length,
    title: publishedMaterial.title
  }));
  writeStateFile(state);

  return clone({
    publishedMaterial,
    assignedActions,
    state: workspaceState.scopedStateForContext(state, context)
  });
}

function publishTargetAliases(inputAliases, classRecord) {
  const requested = Array.isArray(inputAliases)
    ? inputAliases.map((item) => cleanText(item, 30)).filter(Boolean)
    : [];
  const classAliases = Array.isArray(classRecord.studentAliases) ? classRecord.studentAliases : [];
  if (!requested.length) return classAliases.slice();
  const allowed = new Set(classAliases);
  return requested.filter((alias) => allowed.has(alias));
}

function publishedMaterialAction(material, alias, context, createdAt) {
  return {
    id: `teacher-action-${randomToken(5)}`,
    type: "assign_material",
    status: "assigned",
    studentAlias: alias,
    classId: context.classId,
    actorId: context.userId,
    title: `新学习材料：${material.title || material.type || "学习材料"}`,
    detail: material.goal || material.studentTask || "老师发布了一份新的学习材料。",
    material: cloneStudentFacingMaterial(material),
    followUp: null,
    source: "material_approval",
    sourceId: material.id,
    sourceType: "approved_material",
    studentVisible: true,
    studentReadAt: null,
    studentResponseAt: null,
    studentResponseType: null,
    createdAt
  };
}

function cloneStudentFacingMaterial(material) {
  return {
    id: material.id,
    sourceDraftId: material.sourceDraftId || material.id,
    kind: material.kind || normalizeMaterialKindValue(material.type),
    title: material.title,
    type: material.type,
    topic: material.topic,
    targetLevel: material.targetLevel,
    goal: material.goal,
    content: material.content,
    outline: material.outline || [],
    sections: material.sections || [],
    keyPoints: material.keyPoints || [],
    exercises: material.exercises || [],
    answerKey: material.answerKey || [],
    imageUrl: material.imageUrl || "",
    teacherNotes: material.teacherNotes || "",
    studentTask: material.studentTask || "",
    publishedAt: material.publishedAt || null
  };
}

module.exports = {
  stateFile,
  getState,
  getRawState,
  registerTeacher,
  getInviteByToken,
  registerStudentWithInvite,
  getAiStatus,
  getTeacherAgentBriefing,
  answerTeacherAgentChat,
  generateAiMaterial,
  updateMaterialDraft,
  publishMaterialDraft,
  draftAiTeacherMessage,
  applyTeacherAgentAction,
  getStudentAgentBriefing,
  answerStudentAgentChat,
  answerStudentAgentChatLive,
  answerStudentWellbeingChatLive,
  draftStudentAgentStuckSignal,
  shareStudentAgentSignal,
  setState,
  resetState,
  updateClassSettings,
  updateAssignment,
  recordQuestion,
  recordStuckSignal,
  recordCheckIn,
  recordMessage,
  markTeacherActionRead,
  recordAuditEvent
};
