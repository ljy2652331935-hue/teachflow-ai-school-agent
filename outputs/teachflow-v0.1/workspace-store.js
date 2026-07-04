const fs = require("fs");
const path = require("path");
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
  draft_teacher_message: ["teacher"],
  apply_teacher_agent_action: ["teacher"],
  read_student_agent: ["student"],
  use_student_agent: ["student"],
  share_student_agent_signal: ["student"],
  write_workspace: ["teacher"],
  reset_workspace: ["teacher"],
  update_assignment: ["teacher", "student"],
  record_question: ["student"],
  record_stuck_signal: ["student"],
  record_check_in: ["student"],
  record_message: ["teacher", "student"],
  mark_teacher_action_read: ["student"]
};

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
  appendAuditEvent(state, eventFromContext(context, "ai_material_draft", "material", input.type || input.materialType || "draft", {
    materialType: input.type || input.materialType || "unknown",
    mode: result.mode || "unknown"
  }));
  writeStateFile(state);
  return clone(result);
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

module.exports = {
  stateFile,
  getState,
  getRawState,
  getAiStatus,
  getTeacherAgentBriefing,
  answerTeacherAgentChat,
  generateAiMaterial,
  draftAiTeacherMessage,
  applyTeacherAgentAction,
  getStudentAgentBriefing,
  answerStudentAgentChat,
  answerStudentAgentChatLive,
  draftStudentAgentStuckSignal,
  shareStudentAgentSignal,
  setState,
  resetState,
  updateAssignment,
  recordQuestion,
  recordStuckSignal,
  recordCheckIn,
  recordMessage,
  markTeacherActionRead,
  recordAuditEvent
};
