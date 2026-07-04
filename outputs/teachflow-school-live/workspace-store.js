const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const workspaceState = require("./workspace-state.js");
const teacherAgentOrchestrator = require("./teacher-agent-orchestrator.js");
const studentAgentOrchestrator = require("./student-agent-orchestrator.js");
const aiAgentService = require("./ai-agent-service.js");

const stateFile = process.env.TEACHFLOW_WORKSPACE_FILE? path.resolve(process.env.TEACHFLOW_WORKSPACE_FILE): path.join(__dirname, "data", "workspace-state.json");

const ACTION_ROLE_ACCESS = {read_workspace: ["teacher", "student", "school_admin"],
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
 mark_teacher_action_read: ["student"]};

const TEACHER_PERMISSIONS = ["read_class", "read_students", "approve_materials", "export_materials", "send_feedback"];
const STUDENT_PERMISSIONS = ["read_self", "submit_assignment", "ask_agent", "send_stuck_signal", "send_check_in"];
const STABLE_PUBLIC_INVITE_TOKEN = process.env.TEACHFLOW_PUBLIC_INVITE_TOKEN || "join-demo";

function getState(context) {const state = getRawState();
 authorizeContext(context, "read_workspace");
 return clone(context? workspaceState.scopedStateForContext(state, context): state);}

function getRawState() {const stored = readStateFile();
 if (stored) {const state = workspaceState.normalizeState(stored);
 if (ensureStablePublicInvite(state)) writeStateFile(state);
 return clone(state);}
 const fresh = workspaceState.createDefaultState();
 ensureStablePublicInvite(fresh);
 writeStateFile(fresh);
 return clone(fresh);}

function ensureStablePublicInvite(state) {const token = cleanText(STABLE_PUBLIC_INVITE_TOKEN, 160);
 if (!token) return false;
 const classes = Array.isArray(state.classes)? state.classes: [];
 if (!classes.length) return false;
 const inviteLinks = Array.isArray(state.inviteLinks)? state.inviteLinks: [];
 if (inviteLinks.some((item) => item.token === token && item.active!== false)) return false;
 const classRecord = classes.find((item) => item.id === state.activeclassId) || classes[0];
 if (!classRecord?.id) return false;
 const teacherId = classRecord.teacherIds?.[0] || (state.accounts || []).find((account) => account.role === "teacher" && (account.classIds || []).includes(classRecord.id))?.id || null;
 const now = new Date().toISOString();
 const invite = {id: uniqueId(inviteLinks, "invite"),
 token,
 classId: classRecord.id,
 teacherId,
 active: true,
 stable: true,
 createdAt: classRecord.createdAt || now};
 classRecord.inviteToken = classRecord.inviteToken || token;
 state.inviteLinks = [...inviteLinks, invite];
 return true;}

function ensureStablePublicDemoClass(state) {const token = cleanText(STABLE_PUBLIC_INVITE_TOKEN, 160);
 if (!token || (Array.isArray(state.classes) && state.classes.length)) return false;
 const now = new Date().toISOString();
 const teacherId = "teacher-public-demo";
 const classId = "class-public-demo";
 const account = {id: teacherId,
 role: "teacher",
 displayName: "Ms Carter",
 classIds: [classId],
 permissions: TEACHER_PERMISSIONS};
 const classRecord = {id: classId,
 name: "Year 12 Physics Demo",
 course: "Physics",
 topic: "Waves, frequency and signals",
 teacherIds: [teacherId],
 studentAliases: [],
 status: "active",
 inviteToken: token,
 createdAt: now};
 const invite = {id: "invite-public-demo",
 token,
 classId,
 teacherId,
 active: true,
 stable: true,
 createdAt: now};
 state.school = {...(state.school || {}),
 id: state.school?.id || "school-live",
 name: state.school?.name && state.school.name!== "TeachFlow school"? state.school.name: "QE Learning Demo School"};
 state.accounts = [...(state.accounts || []), account];
 state.classes = [classRecord];
 state.inviteLinks = [invite];
 state.activeclassId = classId;
 state.className = classRecord.name;
 state.topic = classRecord.topic;
 appendAuditEvent(state, eventFromContext({role: "teacher",
 userId: teacherId,
 classId}, "stable_public_demo_invite_created", "class", classId, {className: classRecord.name,
 course: classRecord.course,
 stableInvite: true}));
 return true;}

function registerteacher(input) {const state = getRawState();
 const createdAt = new Date().toISOString();
 const teacherDisplayName = cleanText(input?.displayName, 80) || "teacher";
 const schoolName = cleanText(input?.schoolName, 100) || state.school?.name || "TeachFlow school";
 const className = cleanText(input?.className, 100) || `${teacherDisplayName}ofclass`;
 const course = cleanText(input?.course, 100) || "Course not set";
 const topic = cleanText(input?.topic, 120) || "Topic not set";
 const teacherId = uniqueId(state.accounts, "teacher");
 const classId = uniqueId(state.classes, "class");
 const inviteToken = `join-${randomToken(12)}`;

 const account = {id: teacherId,
 role: "teacher",
 displayName: teacherDisplayName,
 classIds: [classId],
 permissions: TEACHER_PERMISSIONS};
 const classRecord = {id: classId,
 name: className,
 course,
 topic,
 teacherIds: [teacherId],
 studentAliases: [],
 status: "active",
 inviteToken,
 createdAt};
 const invite = {id: uniqueId(state.inviteLinks || [], "invite"),
 token: inviteToken,
 classId,
 teacherId,
 active: true,
 createdAt};

 state.school = {...(state.school || {}),
 id: state.school?.id || "school-live",
 name: schoolName};
 state.accounts = [...(state.accounts || []), account];
 state.classes = [...(state.classes || []), classRecord];
 state.inviteLinks = [...(state.inviteLinks || []), invite];
 state.activeclassId = classId;
 state.className = className;
 state.topic = topic;
 appendAuditEvent(state, eventFromContext({role: "teacher",
 userId: teacherId,
 classId}, "teacher_register", "class", classId, {className,
 course,
 hasInvite: true}));
 writeStateFile(state);

 return {account: clone(account),
 classRecord: clone(classRecord),
 invite: publicInvite(workspaceState.normalizeState(state), invite),
 state: clone(workspaceState.normalizeState(state))};}

function getInviteByToken(token) {const state = getRawState();
 const inviteToken = cleanText(token, 160);
 if (inviteToken === cleanText(STABLE_PUBLIC_INVITE_TOKEN, 160)) {const changed = ensureStablePublicInvite(state) || ensureStablePublicDemoClass(state);
 if (changed) writeStateFile(state);}
 const invite = (state.inviteLinks || []).find((item) => item.token === inviteToken && item.active!== false)
 || (state.classes || []).map((classRecord) => ({id: `invite-${classRecord.id}`,
 token: classRecord.inviteToken,
 classId: classRecord.id,
 teacherId: classRecord.teacherIds?.[0] || null,
 active: Boolean(classRecord.inviteToken)})).find((item) => item.token === inviteToken && item.active);
 if (!invite) return null;
 return publicInvite(state, invite);}

function registerStudentWithInvite(input) {const state = getRawState();
 const invite = getInviteByToken(input?.inviteToken || input?.token || input?.joinToken);
 if (!invite) throwstatus("Invalid or expired class invite", 404);

 const classRecord = (state.classes || []).find((item) => item.id === invite.classId);
 if (!classRecord) throwstatus("Invite class was not found", 404);

 const createdAt = new Date().toISOString();
 const alias = nextStudentAlias(state, classRecord);
 const displayName = cleanText(input?.displayName, 80) || `pupil ${alias}`;
 const student = {id: alias,
 short: alias.replace(/^S/i, ""),
 status: "Just joined",
 level: "Not levelled yet",
 stuck: "No stuck signal yet",
 next: "waiting for first learning input",
 evidence: "",
 memory: `${displayName} alreadyclass invite linkjoin.`,
 createdAt};
 const account = {id: uniqueId(state.accounts || [], `student-${alias.toLowerCase()}`),
 role: "student",
 displayName,
 classIds: [classRecord.id],
 studentAlias: alias,
 permissions: STUDENT_PERMISSIONS};

 state.students = [...(state.students || []), student];
 state.accounts = [...(state.accounts || []), account];
 state.assignments = {...(state.assignments || {}),
 [alias]: "Not submitted"};
 classRecord.studentAliases = Array.from(new Set([...(classRecord.studentAliases || []), alias]));
 state.activeclassId = state.activeclassId || classRecord.id;
 state.className = classRecord.name || state.className;
 state.topic = classRecord.topic || state.topic;
 appendAuditEvent(state, eventFromContext({role: "student",
 userId: account.id,
 classId: classRecord.id,
 studentAlias: alias}, "student_join_class", "student", alias, {studentAlias: alias,
 className: classRecord.name}));
 writeStateFile(state);

 return {account: clone(account),
 classRecord: clone(classRecord),
 student: clone(student),
 invite: publicInvite(workspaceState.normalizeState(state), invite),
 state: clone(workspaceState.normalizeState(state))};}

function getteacherAgentBriefing(contextInput) {const context = requestContext(contextInput || {});
 if (!context) throwForbidden("teacher session is required");
 authorizeContext(context, "read_teacher_agent");
 const state = getRawState();
 const scoped = workspaceState.scopedStateForContext(state, context);
 return clone(teacherAgentOrchestrator.buildteacherBriefing(scoped, {context}));}

function getAistatus(contextInput) {const context = requestContext(contextInput || {});
 if (context) authorizeContext(context, "read_workspace");
 return clone(aiAgentService.getstatus());}

async function answerteacherAgentChat(input) {const context = requestContext(input || {});
 if (!context) throwForbidden("teacher session is required");
 authorizeContext(context, "use_teacher_ai");
 const briefing = getteacherAgentBriefing(context);
 const result = await aiAgentService.answerteacherquestion({question: input.question || input.text || "",
 briefing});
 const state = getRawState();
 appendAuditEvent(state, eventFromContext(context, "teacher_ai_chat", "teacher_agent", context.classId, {hasquestion: Boolean(input.question || input.text),
 mode: result.mode || "unknown"}));
 writeStateFile(state);
 return clone(result);}

async function generateAimaterial(input) {const context = requestContext(input || {});
 if (!context) throwForbidden("teacher session is required");
 authorizeContext(context, "generate_material");
 const briefing = getteacherAgentBriefing(context);
 const result = await aiAgentService.generatematerial({...input, briefing});
 const state = getRawState();
 const saveddraft = materialdraftFromAiResult(result, input, context, state);
 state.draftmaterials = [saveddraft,...(Array.isArray(state.draftmaterials)? state.draftmaterials: [])].slice(0, 50);
 appendAuditEvent(state, eventFromContext(context, "ai_material_draft", "material", saveddraft.id, {materialType: input.type || input.materialType || "unknown",
 mode: result.mode || "unknown",
 title: saveddraft.title}));
 writeStateFile(state);
 return clone({...result,
 saveddraft,
 state: workspaceState.scopedStateForContext(state, context)});}

function updatematerialdraft(input) {const context = requestContext(input || {});
 if (!context) throwForbidden("teacher session is required");
 authorizeContext(context, "update_material_draft");

 const state = getRawState();
 const draftId = cleanText(input.id || input.draftId, 120);
 const draftIndex = (state.draftmaterials || []).findIndex((item) => item.id === draftId);
 if (draftIndex < 0) throwstatus("material draft was not found", 404);

 const current = state.draftmaterials[draftIndex];
 if (current.classId && current.classId!== context.classId) {denyWithAudit(state, context, "update_material_draft", "material draft is outside class boundary", draftId);}

 const updatedAt = new Date().toISOString();
 const nextdraft = {...current,
 title: cleanText(input.title || current.title, 180),
 type: cleanText(input.type || current.type || "Handout", 80),
 topic: cleanText(input.topic || current.topic || "", 160),
 targetLevel: cleanText(input.targetLevel || current.targetLevel || "", 80),
 goal: cleanText(input.goal || current.goal || "", 500),
 content: cleanText(input.content || current.content || "", 1000),
 outline: cleanmaterialList(input.outline?? current.outline, 10, 220),
 teachernotes: cleanmaterialText(input.teachernotes?? current.teachernotes, 600),
 studentTask: cleanmaterialText(input.studentTask?? current.studentTask, 400),
 reviewChecklist: cleanmaterialList(input.reviewChecklist?? current.reviewChecklist, 8, 160),
 status: current.status || "draft",
 classId: current.classId || context.classId,
 updatedAt,
 version: Number(current.version || 1) + 1};

 state.draftmaterials = state.draftmaterials.map((item, index) => (index === draftIndex? nextdraft: item));
 appendAuditEvent(state, eventFromContext(context, "material_draft_update", "material", nextdraft.id, {materialType: nextdraft.type,
 title: nextdraft.title}));
 writeStateFile(state);
 return clone({saveddraft: nextdraft,
 state: workspaceState.scopedStateForContext(state, context)});}

async function draftAiteachermessage(input) {const context = requestContext(input || {});
 if (!context) throwForbidden("teacher session is required");
 authorizeContext(context, "draft_teacher_message");
 const alias = input.studentAlias || input.alias || null;
 if (alias) authorizeStudentMutation(context, alias, "draft_teacher_message");
 const briefing = getteacherAgentBriefing(context);
 const result = await aiAgentService.draftteachermessage({...input, briefing});
 const state = getRawState();
 appendAuditEvent(state, eventFromContext(context, "ai_message_draft", "message_draft", alias || context.classId, {studentAlias: alias,
 mode: result.mode || "unknown"}));
 writeStateFile(state);
 return clone(result);}

function applyteacherAgentAction(input) {const context = requestContext(input || {});
 if (!context) throwForbidden("teacher session is required");
 authorizeContext(context, "apply_teacher_agent_action");

 const type = normalizeteacherAgentActionType(input.type || input.actionType);
 const alias = input.studentAlias || input.alias || null;
 if (teacherAgentActionneedsAlias(type)) {if (!alias) throw new Error("studentAlias is required");
 authorizeStudentMutation(context, alias, "apply_teacher_agent_action");}

 hydrateWorkspaceState();
 const nextState = workspaceState.recordteacherAgentAction({...input,
 type,
 studentAlias: alias,
 context});
 appendAuditEvent(nextState, eventFromContext(context, "teacher_agent_action", "teacher_agent_action", nextState.teacherAgentActions[0]?.id || type, {studentAlias: alias,
 actionType: type,
 sourceId: input.sourceId || null,
 studentVisible: nextState.teacherAgentActions[0]?.studentVisible!== false}));
 writeStateFile(nextState);
 return clone(workspaceState.scopedStateForContext(nextState, context));}

function getStudentAgentBriefing(contextInput) {const context = requestContext(contextInput || {});
 if (!context) throwForbidden("Student session is required");
 authorizeContext(context, "read_student_agent");
 const state = getRawState();
 const scoped = workspaceState.scopedStateForContext(state, context);
 return clone(studentAgentOrchestrator.buildStudentBriefing(scoped, {context}));}

function answerStudentAgentChat(input) {const context = requestContext(input || {});
 if (!context) throwForbidden("Student session is required");
 authorizeContext(context, "use_student_agent");
 const briefing = getStudentAgentBriefing(context);
 return clone(studentAgentOrchestrator.answerStudentquestion(input.question || input.text || "", briefing));}

async function answerStudentAgentChatLive(input) {const context = requestContext(input || {});
 if (!context) throwForbidden("Student session is required");
 authorizeContext(context, "use_student_agent");
 const briefing = getStudentAgentBriefing(context);
 const result = await aiAgentService.answerStudentquestion({question: input.question || input.text || "",
 briefing});
 const state = getRawState();
 appendAuditEvent(state, eventFromContext(context, "student_ai_chat", "student_agent", context.studentAlias, {studentAlias: context.studentAlias,
 hasquestion: Boolean(input.question || input.text),
 mode: result.mode || "unknown"}));
 writeStateFile(state);
 return clone(result);}

async function answerStudentWellbeingChatLive(input) {const context = requestContext(input || {});
 if (!context) throwForbidden("Student session is required");
 authorizeContext(context, "use_student_agent");
 const briefing = getStudentAgentBriefing(context);
 const result = await aiAgentService.answerStudentWellbeing({message: input.message || input.question || input.text || "",
 briefing});
 const state = getRawState();
 appendAuditEvent(state, eventFromContext(context, "student_wellbeing_chat", "wellbeing_coach", context.studentAlias, {studentAlias: context.studentAlias,
 hasmessage: Boolean(input.message || input.question || input.text),
 mode: result.mode || "unknown"}));
 writeStateFile(state);
 return clone(result);}

function draftStudentAgentStuckSignal(input) {const context = requestContext(input || {});
 if (!context) throwForbidden("Student session is required");
 authorizeContext(context, "use_student_agent");
 const briefing = getStudentAgentBriefing(context);
 return clone(studentAgentOrchestrator.draftStuckSignal(input, briefing));}

function shareStudentAgentSignal(input) {const context = requestContext(input || {});
 if (!context) throwForbidden("Student session is required");
 const alias = context.studentAlias;
 authorizeStudentMutation(context, alias, "share_student_agent_signal");
 const briefing = getStudentAgentBriefing(context);
 const draft = studentAgentOrchestrator.draftStuckSignal(input, briefing);
 const evidenceNote = String(input.text || input.note || draft.teachersummary || "").trim();
 hydrateWorkspaceState();
 const nextState = workspaceState.recordStuckSignal(alias, draft.stuckType, evidenceNote || draft.teachersummary);
 appendAuditEvent(nextState, eventFromContext(context, "record_stuck_signal", "student", alias, {studentAlias: alias,
 stuckType: draft.stuckType,
 hasNote: Boolean(evidenceNote || draft.teachersummary),
 source: "student_agent"}));
 appendAuditEvent(nextState, eventFromContext(context, "student_agent_share_to_teacher", "student_agent_signal", alias, {studentAlias: alias,
 stuckType: draft.stuckType,
 source: "student_agent",
 hasNote: Boolean(draft.teachersummary)}));
 writeStateFile(nextState);
 return {draft: clone(draft),
 state: clone(workspaceState.scopedStateForContext(nextState, context))};}

function setState(nextState) {const context = requestContext(nextState.context || nextState);
 authorizeContext(context, "write_workspace");
 const state = workspaceState.normalizeState(nextState);
 appendAuditEvent(state, eventFromContext(context, "write_workspace", "workspace", "workspace", {}));
 writeStateFile(state);
 return clone(state);}

function resetState(contextInput) {const context = requestContext(contextInput || {});
 authorizeContext(context, "reset_workspace");
 const state = workspaceState.createDefaultState();
 appendAuditEvent(state, eventFromContext(context, "reset_workspace", "workspace", "workspace", {}));
 writeStateFile(state);
 return clone(context? workspaceState.scopedStateForContext(state, context): state);}

function updateclasssettings(input) {const context = requestContext(input || {});
 if (!context) throwForbidden("teacher session is required");
 authorizeContext(context, "update_class_settings");
 const state = getRawState();
 const classRecord = (state.classes || []).find((item) => item.id === context.classId);
 if (!classRecord) throwstatus("class was not found", 404);

 const nextName = cleanText(input.className, 100);
 const nextCourse = cleanText(input.course, 100);
 const nextTopic = cleanText(input.topic, 120);
 if (nextName) classRecord.name = nextName;
 if (nextCourse) classRecord.course = nextCourse;
 if (nextTopic) classRecord.topic = nextTopic;
 state.activeclassId = classRecord.id;
 state.className = classRecord.name || state.className;
 state.topic = classRecord.topic || state.topic;
 appendAuditEvent(state, eventFromContext(context, "update_class_settings", "class", classRecord.id, {className: classRecord.name,
 course: classRecord.course || "",
 topic: classRecord.topic || ""}));
 writeStateFile(state);
 return clone(workspaceState.scopedStateForContext(state, context));}

function updateassignment(input) {const alias = input.studentAlias || input.alias;
 if (!alias) throw new Error("studentAlias is required");
 const context = requestContext(input);
 authorizeStudentMutation(context, alias, "update_assignment");
 hydrateWorkspaceState();
 const nextState = workspaceState.updateassignment(alias, input.status || "draftSaved", {linkedteacherActionId: input.linkedteacherActionId,
 responseType: input.responseType});
 appendAuditEvent(nextState, eventFromContext(context, "update_assignment", "student", alias, {studentAlias: alias,
 status: input.status || "draftSaved",
 linkedteacherActionId: input.linkedteacherActionId || null,
 responseType: input.responseType || null}));
 writeStateFile(nextState);
 return clone(context? workspaceState.scopedStateForContext(nextState, context): nextState);}

function recordquestion(input) {const alias = input.studentAlias || input.alias;
 if (!alias) throw new Error("studentAlias is required");
 const context = requestContext(input);
 authorizeStudentMutation(context, alias, "record_question");
 hydrateWorkspaceState();
 const nextState = workspaceState.recordquestion(alias, input.text || input.question || "", {linkedteacherActionId: input.linkedteacherActionId,
 responseType: input.responseType});
 appendAuditEvent(nextState, eventFromContext(context, "record_question", "student", alias, {studentAlias: alias,
 hasText: Boolean(input.text || input.question),
 linkedteacherActionId: input.linkedteacherActionId || null,
 responseType: input.responseType || null}));
 writeStateFile(nextState);
 return clone(context? workspaceState.scopedStateForContext(nextState, context): nextState);}

function recordStuckSignal(input) {const alias = input.studentAlias || input.alias;
 if (!alias) throw new Error("studentAlias is required");
 const context = requestContext(input);
 authorizeStudentMutation(context, alias, "record_stuck_signal");
 hydrateWorkspaceState();
 const nextState = workspaceState.recordStuckSignal(alias, input.stuckType || "Stuck signal", input.note || "", {linkedteacherActionId: input.linkedteacherActionId,
 responseType: input.responseType});
 appendAuditEvent(nextState, eventFromContext(context, "record_stuck_signal", "student", alias, {studentAlias: alias,
 stuckType: input.stuckType || "Stuck signal",
 hasNote: Boolean(input.note),
 linkedteacherActionId: input.linkedteacherActionId || null,
 responseType: input.responseType || null}));
 writeStateFile(nextState);
 return clone(context? workspaceState.scopedStateForContext(nextState, context): nextState);}

function recordCheckIn(input) {const alias = input.studentAlias || input.alias;
 if (!alias) throw new Error("studentAlias is required");
 const context = requestContext(input);
 authorizeStudentMutation(context, alias, "record_check_in");
 hydrateWorkspaceState();
 const nextState = workspaceState.recordCheckIn(alias, {topic: input.topic,
 state: input.state || input.mood,
 note: input.note || "",
 shareChoice: input.shareChoice || "private",
 linkedteacherActionId: input.linkedteacherActionId,
 responseType: input.responseType});
 const latest = nextState.checkIns.find((item) => item.studentAlias === alias) || {};
 appendAuditEvent(nextState, eventFromContext(context, "record_check_in", "student", alias, {studentAlias: alias,
 state: latest.state || input.state || "partly_understand",
 shareChoice: latest.shareChoice || input.shareChoice || "private",
 teacherVisible: Boolean(latest.teacherVisible),
 safeguardingFlag: Boolean(latest.safeguardingFlag?.required),
 linkedteacherActionId: input.linkedteacherActionId || null,
 responseType: input.responseType || null}));
 writeStateFile(nextState);
 return clone(context? workspaceState.scopedStateForContext(nextState, context): nextState);}

function recordmessage(input) {const alias = input.studentAlias || input.alias;
 if (!alias) throw new Error("studentAlias is required");
 const context = requestContext(input);
 authorizeStudentMutation(context, alias, "record_message");
 hydrateWorkspaceState();
 const senderRole = context?.role === "teacher"? "teacher": "student";
 const nextState = workspaceState.recordmessage(alias, {text: input.text || input.message || "",
 senderRole,
 senderId: context?.userId,
 senderLabel: senderRole === "teacher"? "teacher": alias,
 kind: input.kind || "chat",
 linkedteacherActionId: input.linkedteacherActionId,
 responseType: input.responseType,
 context});
 appendAuditEvent(nextState, eventFromContext(context, "record_message", "message_thread", alias, {studentAlias: alias,
 senderRole,
 hasText: Boolean(input.text || input.message),
 linkedteacherActionId: input.linkedteacherActionId || null,
 responseType: input.responseType || null}));
 writeStateFile(nextState);
 return clone(context? workspaceState.scopedStateForContext(nextState, context): nextState);}

function markteacherActionRead(input) {const alias = input.studentAlias || input.alias;
 const actionId = input.actionId || input.teacherActionId || input.id;
 if (!alias) throw new Error("studentAlias is required");
 if (!actionId) throw new Error("actionId is required");
 const context = requestContext(input);
 authorizeStudentMutation(context, alias, "mark_teacher_action_read");
 hydrateWorkspaceState();
 const nextState = workspaceState.markteacherAgentActionRead(alias, actionId, {readAt: input.readAt,
 context});
 appendAuditEvent(nextState, eventFromContext(context, "teacher_agent_action_read", "teacher_agent_action", actionId, {studentAlias: alias,
 actionId}));
 writeStateFile(nextState);
 return clone(context? workspaceState.scopedStateForContext(nextState, context): nextState);}

function recordAuditEvent(event) {const state = getRawState();
 appendAuditEvent(state, event);
 writeStateFile(state);
 return clone(state.auditEvents[0]);}

function hydrateWorkspaceState() {workspaceState.setState(getRawState());}

function materialdraftFromAiResult(result, input, context, state) {const draft = result?.draft && typeof result.draft === "object" &&!Array.isArray(result.draft)? result.draft: {};
 const textdraft = typeof result?.draft === "string"? result.draft: "";
 const classRecord = (state.classes || []).find((item) => item.id === context.classId) || {};
 const type = cleanText(draft.type || input.type || input.materialType || "Handout", 80) || "Handout";
 const topic = cleanText(input.topic || draft.topic || classRecord.topic || state.topic || "", 160);
 const title = cleanText(draft.title || `${topic || "current topic"} ${type}draft`, 180);
 const content = cleanText(draft.content || textdraft, 1000);
 const now = new Date().toISOString();

 return {id: uniqueId(state.draftmaterials, "material"),
 title,
 type,
 topic,
 targetLevel: cleanText(draft.targetLevel || input.targetLevel || "Level 1-2", 80),
 goal: cleanText(draft.goal || input.prompt || input.request || "", 500),
 content,
 outline: cleanmaterialList(draft.outline || draft.sections || draft.slides || draft.steps || content, 10, 220),
 teachernotes: cleanmaterialText(draft.teachernotes || draft.teacherNote || draft.notes, 600),
 studentTask: cleanmaterialText(draft.studentTask || draft.task, 400),
 reviewChecklist: cleanmaterialList(draft.reviewChecklist || draft.checklist, 8, 160),
 status: "draft",
 classId: context.classId,
 createdBy: context.userId,
 source: "ai_material_generator",
 mode: result?.mode || "unknown",
 provider: result?.provider || "local",
 model: result?.model || "",
 version: 1,
 createdAt: now,
 updatedAt: now};}

function requestContext(input) {const context = input?.context || input;
 if (!context ||!context.role) return null;
 return workspaceState.getContext(context.role, context);}

function normalizeteacherAgentActionType(value) {const type = String(value || "").trim();
 if (["send_message", "assign_material", "schedule_followup", "dismiss"].includes(type)) return type;
 return "dismiss";}

function teacherAgentActionneedsAlias(type) {return ["send_message", "assign_material", "schedule_followup"].includes(type);}

function authorizeContext(contextInput, action) {const context = requestContext(contextInput || {});
 if (!context) return;
 const state = getRawState();
 const account = state.accounts.find((item) => item.id === context.userId);
 const activeclass = state.classes.find((item) => item.id === context.classId);
 const allowedRoles = ACTION_ROLE_ACCESS[action];

 if (!account) denyWithAudit(state, context, action, `Unknown account for ${action}`);
 if (!activeclass) denyWithAudit(state, context, action, `Unknown class for ${action}`);
 if (allowedRoles &&!allowedRoles.includes(context.role)) {denyWithAudit(state, context, action, `${context.role} cannot perform ${action}`);}
 if (!account.classIds.includes(context.classId)) {denyWithAudit(state, context, action, `Account cannot access this class for ${action}`);}
 if (context.role === "student" && account.studentAlias!== context.studentAlias) {denyWithAudit(state, context, action, `Student account cannot impersonate ${context.studentAlias}`);}
 if (context.role === "school_admin" && /^write|reset/.test(action)) {denyWithAudit(state, context, action, "school admin can only read aggregate data in this MVP");}}

function authorizeStudentMutation(context, alias, action) {if (!context) return;
 authorizeContext(context, action);

 if (context.role === "student" && context.studentAlias!== alias) {denyWithAudit(getRawState(), context, action, `Student can only update own alias for ${action}`, alias);}
 if (context.role === "school_admin") {denyWithAudit(getRawState(), context, action, `school admin cannot write student records for ${action}`, alias);}

 const state = getRawState();
 const activeclass = state.classes.find((item) => item.id === context.classId);
 if (!activeclass?.studentAliases.includes(alias)) {denyWithAudit(state, context, action, `Student alias is outside class boundary for ${action}`, alias);}}

function denyWithAudit(state, context, action, message, targetId) {appendAuditEvent(state, eventFromContext(context, "access_denied", "workspace", targetId || context?.classId || "unknown", {attemptedAction: action,
 reason: message}));
 writeStateFile(state);
 throwForbidden(message);}

function eventFromContext(context, action, targetType, targetId, details) {return {action,
 actorId: context?.userId || "system",
 role: context?.role || "system",
 classId: context?.classId || null,
 studentAlias: details?.studentAlias || context?.studentAlias || null,
 targetType,
 targetId,
 details: details || {}};}

function appendAuditEvent(state, event) {const nextEvent = {id: event.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
 timestamp: event.timestamp || new Date().toISOString(),
 action: event.action,
 actorId: event.actorId || "system",
 role: event.role || "system",
 classId: event.classId || null,
 studentAlias: event.studentAlias || null,
 targetType: event.targetType || "workspace",
 targetId: event.targetId || "unknown",
 details: event.details || {}};
 state.auditEvents = [nextEvent,...(Array.isArray(state.auditEvents)? state.auditEvents: [])].slice(0, 100);
 state.updatedAt = new Date().toISOString();
 return state;}

function throwForbidden(message) {const error = new Error(message);
 error.statusCode = 403;
 throw error;}

function throwstatus(message, statusCode) {const error = new Error(message);
 error.statusCode = statusCode;
 throw error;}

function cleanText(value, maxLength) {return String(value || "").trim().slice(0, maxLength || 120);}

function cleanmaterialText(value, maxLength) {if (Array.isArray(value)) return value.map((item) => cleanmaterialText(item, maxLength)).filter(Boolean).join("; ").slice(0, maxLength || 500);
 if (value && typeof value === "object") return JSON.stringify(value).slice(0, maxLength || 500);
 return cleanText(value, maxLength || 500);}

function cleanmaterialList(value, maxItems, maxLength) {let items = [];
 if (Array.isArray(value)) {items = value;} else if (value && typeof value === "object") {items = Object.values(value);} else {items = String(value || "").split(/\n+|; |;/);}
 return items.map((item) => cleanmaterialText(item, maxLength || 180).replace(/^\s*[-*\d.,]+\s*/, "")).map((item) => item.trim()).filter(Boolean).slice(0, maxItems || 8);}

function randomToken(bytes) {return crypto.randomBytes(bytes || 8).toString("hex");}

function uniqueId(items, prefix) {const existing = new Set((items || []).map((item) => item.id).filter(Boolean));
 let id = `${prefix}-${randomToken(4)}`;
 while (existing.has(id)) id = `${prefix}-${randomToken(4)}`;
 return id;}

function nextStudentAlias(state, classRecord) {const classAliases = new Set(classRecord.studentAliases || []);
 const usedNumbers = new Set((state.students || []).filter((student) =>!classAliases.size || classAliases.has(student.id)).map((student) => Number(String(student.id || "").replace(/^S/i, ""))).filter((value) => Number.isFinite(value) && value > 0));
 (classRecord.studentAliases || []).forEach((alias) => {const value = Number(String(alias || "").replace(/^S/i, ""));
 if (Number.isFinite(value) && value > 0) usedNumbers.add(value);});

 let next = 1;
 while (usedNumbers.has(next)) next += 1;
 return `S${String(next).padStart(3, "0")}`;}

function publicInvite(state, invite) {const classRecord = (state.classes || []).find((item) => item.id === invite.classId) || null;
 const teacher = (state.accounts || []).find((item) => item.id === invite.teacherId) || null;
 return {token: invite.token,
 classId: invite.classId,
 className: classRecord?.name || invite.classId,
 course: classRecord?.course || "",
 topic: classRecord?.topic || "",
 schoolName: state.school?.name || "TeachFlow school",
 teacherDisplayName: teacher?.displayName || "teacher",
 active: invite.active!== false,
 createdAt: invite.createdAt || null};}

function readStateFile() {try {const raw = fs.readFileSync(stateFile, "utf8");
 return raw? JSON.parse(raw): null;} catch (error) {if (error.code === "ENOENT") return null;
 throw error;}}

function writeStateFile(state) {fs.mkdirSync(path.dirname(stateFile), {recursive: true});
 fs.writeFileSync(stateFile, `${JSON.stringify(workspaceState.normalizeState(state), null, 2)}\n`, "utf8");}

function clone(value) {return JSON.parse(JSON.stringify(value));}

function materialdraftFromAiResult(result, input, context, state) {const draft = result?.draft && typeof result.draft === "object" &&!Array.isArray(result.draft)? result.draft: {};
 const textdraft = typeof result?.draft === "string"? result.draft: "";
 const classRecord = (state.classes || []).find((item) => item.id === context.classId) || {};
 const id = uniqueId(state.draftmaterials, "material");
 const type = normalizematerialTypeValue(draft.type || input.type || input.materialType || "Handout");
 const kind = normalizematerialKindValue(draft.kind || type);
 const topic = cleanText(input.topic || draft.topic || classRecord.topic || state.topic || "", 160);
 const title = cleanText(draft.title || `${topic || "currentCourseTopic"} ${type}draft`, 180);
 const content = cleanText(draft.content || textdraft, 1200);
 const imageUrl = kind === "image"? storegeneratedmaterialImage(id, draft.imageBase64) || cleanText(draft.imageUrl, 240): cleanText(draft.imageUrl, 240);
 const sections = cleanSectionList(draft.sections || draft.outline || content, 8);
 const exercises = cleanExerciseList(draft.exercises || draft.questions, 12);
 const answerKey = cleanmaterialList(draft.answerKey || draft.answers || draft.solutionKey, 12, 260);
 const keyPoints = cleanmaterialList(draft.keyPoints || draft.highlights || draft.outline, 10, 220);
 const outline = materialOutlineForKind(kind, {draft, content, sections, exercises, imageUrl});
 const targetAliases = normalizematerialTargetAliases(input.targetAliases || input.studentAliases || input.targetAlias, classRecord);
 const now = new Date().toISOString();

 return {id,
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
 imagePrompt: cleanmaterialText(draft.imagePrompt || input.imagePrompt, 1400),
 revisedPrompt: cleanmaterialText(draft.revisedPrompt, 1400),
 targetAliases,
 teachernotes: cleanmaterialText(draft.teachernotes || draft.teacherNote || draft.notes, 800),
 studentTask: cleanmaterialText(draft.studentTask || draft.task, 500),
 reviewChecklist: cleanmaterialList(draft.reviewChecklist || draft.checklist, 10, 180),
 status: "draft",
 classId: context.classId,
 createdBy: context.userId,
 source: "ai_material_generator",
 mode: result?.mode || "unknown",
 provider: result?.provider || "local",
 model: result?.model || "",
 version: 1,
 createdAt: now,
 updatedAt: now};}

function updatematerialdraft(input) {const context = requestContext(input || {});
 if (!context) throwForbidden("teacher session is required");
 authorizeContext(context, "update_material_draft");

 const state = getRawState();
 const draftId = cleanText(input.id || input.draftId, 120);
 const draftIndex = (state.draftmaterials || []).findIndex((item) => item.id === draftId);
 if (draftIndex < 0) throwstatus("material draft was not found", 404);

 const current = state.draftmaterials[draftIndex];
 if (current.classId && current.classId!== context.classId) {denyWithAudit(state, context, "update_material_draft", "material draft is outside class boundary", draftId);}

 const nextType = normalizematerialTypeValue(input.type || current.type || "Handout");
 const nextKind = normalizematerialKindValue(input.kind || current.kind || nextType);
 const sections = input.sections!== undefined? cleanSectionList(input.sections, 8): cleanSectionList(current.sections, 8);
 const exercises = input.exercises!== undefined? cleanExerciseList(input.exercises, 12): cleanExerciseList(current.exercises, 12);
 const answerKey = input.answerKey!== undefined? cleanmaterialList(input.answerKey, 12, 260): cleanmaterialList(current.answerKey, 12, 260);
 const keyPoints = input.keyPoints!== undefined? cleanmaterialList(input.keyPoints, 10, 220): cleanmaterialList(current.keyPoints, 10, 220);
 const outline = input.outline!== undefined? cleanmaterialList(input.outline, 12, 240): materialOutlineForKind(nextKind, {draft: current, content: current.content, sections, exercises, imageUrl: current.imageUrl});
 const classRecord = (state.classes || []).find((item) => item.id === context.classId) || {};
 const targetAliases = input.targetAliases!== undefined || input.studentAliases!== undefined || input.targetAlias!== undefined? normalizematerialTargetAliases(input.targetAliases || input.studentAliases || input.targetAlias, classRecord): (Array.isArray(current.targetAliases)? current.targetAliases: []);
 const updatedAt = new Date().toISOString();

 const nextdraft = {...current,
 kind: nextKind,
 title: cleanText(input.title || current.title, 180),
 type: nextType,
 topic: cleanText(input.topic || current.topic || "", 160),
 targetLevel: cleanText(input.targetLevel || current.targetLevel || "", 80),
 goal: cleanText(input.goal || current.goal || "", 600),
 content: cleanText(input.content?? current.content?? "", 1200),
 outline,
 sections,
 keyPoints,
 exercises,
 answerKey,
 imageUrl: cleanText(input.imageUrl || current.imageUrl || "", 240),
 imagePrompt: cleanmaterialText(input.imagePrompt?? current.imagePrompt, 1400),
 revisedPrompt: cleanmaterialText(input.revisedPrompt?? current.revisedPrompt, 1400),
 targetAliases,
 teachernotes: cleanmaterialText(input.teachernotes?? current.teachernotes, 800),
 studentTask: cleanmaterialText(input.studentTask?? current.studentTask, 500),
 reviewChecklist: cleanmaterialList(input.reviewChecklist?? current.reviewChecklist, 10, 180),
 status: current.status || "draft",
 classId: current.classId || context.classId,
 updatedAt,
 version: Number(current.version || 1) + 1};

 state.draftmaterials = state.draftmaterials.map((item, index) => (index === draftIndex? nextdraft: item));
 appendAuditEvent(state, eventFromContext(context, "material_draft_update", "material", nextdraft.id, {materialType: nextdraft.type,
 materialKind: nextdraft.kind,
 title: nextdraft.title}));
 writeStateFile(state);
 return clone({saveddraft: nextdraft,
 state: workspaceState.scopedStateForContext(state, context)});}

function normalizematerialTypeValue(value) {const text = cleanText(value, 80);
 if (/visual|diagram|image|diagram|image|diagram/i.test(text)) return "visual";
 if (/practice|exercise|quiz|exercise|quiz|practice/i.test(text)) return "practice";
 return "Handout";}

function normalizematerialKindValue(value) {const text = cleanText(value, 80);
 if (/image|visual|diagram|image|diagram/i.test(text)) return "image";
 if (/exercise|quiz|practice|exercise|quiz|practice/i.test(text)) return "exercise";
 return "handout";}

function storegeneratedmaterialImage(draftId, imageBase64) {const raw = String(imageBase64 || "").trim();
 if (!raw) return "";
 const cleanBase64 = raw.replace(/^data:image\/png;base64,/i, "");
 const outputDir = path.join(__dirname, "generated", "materials");
 const fileName = `${draftId}.png`;
 fs.mkdirSync(outputDir, {recursive: true});
 fs.writeFileSync(path.join(outputDir, fileName), Buffer.from(cleanBase64, "base64"));
 return `generated/materials/${fileName}`;}

function normalizematerialTargetAliases(value, classRecord) {const classAliases = Array.isArray(classRecord?.studentAliases)? classRecord.studentAliases: [];
 const allowed = new Set(classAliases);
 let requested = [];
 if (Array.isArray(value)) {requested = value;} else if (value && typeof value === "object") {requested = Object.values(value);} else {requested = String(value || "").split(/[,, \s]+/).filter(Boolean);}
 return requested.map((item) => cleanText(item, 30)).filter((alias) => alias && alias!== "all" && alias!== "whole class").filter((alias) =>!allowed.size || allowed.has(alias));}

function cleanSectionList(value, maxItems) {return materialObjectItems(value).map((item, index) => {if (typeof item === "string") {const body = cleanmaterialText(item, 700);
 return body? {heading: `learning ${index + 1}`, body}: null;}
 const heading = cleanText(item.heading || item.title || item.label || `learning ${index + 1}`, 120);
 const body = cleanmaterialText(item.body || item.content || item.detail || item.text || item.description, 700);
 return body || heading? {heading, body}: null;}).filter(Boolean).slice(0, maxItems || 8);}

function cleanExerciseList(value, maxItems) {return materialObjectItems(value).map((item, index) => {if (typeof item === "string") {const question = cleanmaterialText(item, 700);
 return question? {id: `Q${index + 1}`, level: "", question, expectedAnswer: "", hint: ""}: null;}
 const id = cleanText(item.id || item.number || `Q${index + 1}`, 30);
 const level = cleanText(item.level || item.targetLevel || "", 80);
 const question = cleanmaterialText(item.question || item.prompt || item.text || item.title, 700);
 const expectedAnswer = cleanmaterialText(item.expectedAnswer || item.answer || item.solution, 700);
 const hint = cleanmaterialText(item.hint || item.scaffold || item.tip, 300);
 return question? {id, level, question, expectedAnswer, hint}: null;}).filter(Boolean).slice(0, maxItems || 12);}

function materialObjectItems(value) {if (Array.isArray(value)) return value;
 if (value && typeof value === "object") return Object.values(value);
 return String(value || "").split(/\n+|; |;|learning;/).map((item) => item.replace(/^\s*[-*\d.,]+\s*/, "").trim()).filter(Boolean);}

function materialOutlineForKind(kind, source) {if (kind === "image") {return cleanmaterialList([source.imageUrl? "already generatedvisuallearning, learning inPreviewlearningview.": "visuallearningusable, diagramgeneratelearning.",
 source.draft?.imagePrompt || source.draft?.goal || source.content], 6, 240);}
 if (kind === "exercise") {const questions = (source.exercises || []).map((item) => `${item.id || ""} ${item.question || ""}`.trim());
 return cleanmaterialList(questions.length? questions: source.content, 12, 240);}
 const sectionItems = (source.sections || []).map((item) => `${item.heading || ""}: ${item.body || ""}`.trim());
 return cleanmaterialList(sectionItems.length? sectionItems: source.content, 10, 240);}

function publishmaterialdraft(input) {const context = requestContext(input || {});
 if (!context) throwForbidden("teacher session is required");
 authorizeContext(context, "publish_material_draft");

 const state = getRawState();
 const draftId = cleanText(input.id || input.draftId || input.materialId, 120);
 const draftIndex = (state.draftmaterials || []).findIndex((item) => item.id === draftId);
 if (draftIndex < 0) throwstatus("material draft was not found", 404);

 const draft = state.draftmaterials[draftIndex];
 if (draft.classId && draft.classId!== context.classId) {denyWithAudit(state, context, "publish_material_draft", "material draft is outside class boundary", draftId);}

 const classRecord = (state.classes || []).find((item) => item.id === context.classId) || {};
 const aliases = publishTargetAliases(input.studentAliases || input.targetAliases || input.targetAlias || draft.targetAliases, classRecord);
 const now = new Date().toISOString();
 const publishedmaterial = {...draft,
 id: uniqueId(state.approvedmaterials, "approved-material"),
 sourcedraftId: draft.id,
 status: "published",
 classId: context.classId,
 approvedBy: context.userId,
 approvedAt: now,
 publishedAt: now,
 publishedToAliases: aliases,
 targetAliases: aliases,
 version: Number(draft.version || 1)};

 state.approvedmaterials = [publishedmaterial,...(Array.isArray(state.approvedmaterials)? state.approvedmaterials: []).filter((item) => item.sourcedraftId!== draft.id && item.id!== publishedmaterial.id)].slice(0, 100);
 state.draftmaterials = (state.draftmaterials || []).filter((item) => item.id!== draft.id);

 const assignedActions = aliases.map((alias) => publishedmaterialAction(publishedmaterial, alias, context, now));
 state.teacherAgentActions = [...assignedActions,...(Array.isArray(state.teacherAgentActions)? state.teacherAgentActions: [])].slice(0, 100);

 appendAuditEvent(state, eventFromContext(context, "material_draft_publish", "material", publishedmaterial.id, {sourcedraftId: draft.id,
 materialType: publishedmaterial.type,
 materialKind: publishedmaterial.kind,
 publishedToCount: aliases.length,
 title: publishedmaterial.title}));
 writeStateFile(state);

 return clone({publishedmaterial,
 assignedActions,
 state: workspaceState.scopedStateForContext(state, context)});}

function publishTargetAliases(inputAliases, classRecord) {const requested = Array.isArray(inputAliases)? inputAliases.map((item) => cleanText(item, 30)).filter(Boolean): [];
 const classAliases = Array.isArray(classRecord.studentAliases)? classRecord.studentAliases: [];
 if (!requested.length) return classAliases.slice();
 const allowed = new Set(classAliases);
 return requested.filter((alias) => allowed.has(alias));}

function publishedmaterialAction(material, alias, context, createdAt) {return {id: `teacher-action-${randomToken(5)}`,
 type: "assign_material",
 status: "assigned",
 studentAlias: alias,
 classId: context.classId,
 actorId: context.userId,
 title: `learning materials: ${material.title || material.type || "materials"}`,
 detail: material.goal || material.studentTask || "teacherpublishlearning ofmaterials.",
 material: cloneStudentFacingmaterial(material),
 followUp: null,
 source: "material_approval",
 sourceId: material.id,
 sourceType: "approved_material",
 studentVisible: true,
 studentReadAt: null,
 studentResponseAt: null,
 studentResponseType: null,
 createdAt};}

function cloneStudentFacingmaterial(material) {return {id: material.id,
 sourcedraftId: material.sourcedraftId || material.id,
 kind: material.kind || normalizematerialKindValue(material.type),
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
 teachernotes: material.teachernotes || "",
 studentTask: material.studentTask || "",
 publishedAt: material.publishedAt || null};}

module.exports = {stateFile,
 getState,
 getRawState,
 registerteacher,
 getInviteByToken,
 registerStudentWithInvite,
 getAistatus,
 getteacherAgentBriefing,
 answerteacherAgentChat,
 generateAimaterial,
 updatematerialdraft,
 publishmaterialdraft,
 draftAiteachermessage,
 applyteacherAgentAction,
 getStudentAgentBriefing,
 answerStudentAgentChat,
 answerStudentAgentChatLive,
 answerStudentWellbeingChatLive,
 draftStudentAgentStuckSignal,
 shareStudentAgentSignal,
 setState,
 resetState,
 updateclasssettings,
 updateassignment,
 recordquestion,
 recordStuckSignal,
 recordCheckIn,
 recordmessage,
 markteacherActionRead,
 recordAuditEvent};
