(function (global) {const STORAGE_KEY = "teachflow.school-live.workspace.v1";
 const API_ROOT = "/api/workspace";
 const WORKSPACE_EVENT = "teachflow-workspace-updated";
 let memoryState = null;

 const DEFAULT_CLASS_ID = "class-unassigned";
 const DEFAULT_TEACHER_ID = "teacher-lin";
 const DEFAULT_STUDENT_ALIAS = "S001";

 const defaultAccounts = [{id: DEFAULT_TEACHER_ID,
 role: "teacher",
 displayName: "Ms Chen",
 classIds: [DEFAULT_CLASS_ID],
 permissions: ["read_class", "read_students", "approve_materials", "export_materials", "send_feedback"]},
 {id: "test-teacher",
 role: "teacher",
 displayName: "Demo teacher",
 classIds: [DEFAULT_CLASS_ID],
 permissions: ["read_class", "read_students", "approve_materials", "export_materials", "send_feedback"]},
 {id: "student-s002",
 role: "student",
 displayName: "S002",
 classIds: [DEFAULT_CLASS_ID],
 studentAlias: DEFAULT_STUDENT_ALIAS,
 permissions: ["read_self", "submit_assignment", "ask_agent", "send_stuck_signal", "send_check_in"]},
 {id: "test-student-s002",
 role: "student",
 displayName: "Demo pupil S002",
 classIds: [DEFAULT_CLASS_ID],
 studentAlias: DEFAULT_STUDENT_ALIAS,
 permissions: ["read_self", "submit_assignment", "ask_agent", "send_stuck_signal", "send_check_in"]},
 {id: "school-admin-demo",
 role: "school_admin",
 displayName: "Lead coordinator",
 classIds: [DEFAULT_CLASS_ID, "class-mechanics-b", "class-ap-electric"],
 permissions: ["read_aggregate", "read_audit_log"]}];

 const defaultRolePolicies = {teacher: {label: "teacher",
 canReadclass: true,
 canReadAllStudents: true,
 canWriteOwnStudentSignals: false,
 canApprove: true,
 visibleData: "Anonymised pupils in this class, quote evidence, AI suggestions, approval log"},
 student: {label: "pupil",
 canReadclass: false,
 canReadAllStudents: false,
 canWriteOwnStudentSignals: true,
 canApprove: false,
 visibleData: "Own materials, assignment status, question log, stuck signal log"},
 school_admin: {label: "school admin",
 canReadclass: true,
 canReadAllStudents: false,
 canWriteOwnStudentSignals: false,
 canApprove: false,
 visibleData: "class aggregate trends and safety audit; no individual detail"}};

 const defaultStudents = [{id: "S002",
 short: "02",
 status: "Developing",
 level: "Level 2",
 stuck: "diagram mapping",
 next: "Re-label how waveform and frequency correspond",
 evidence: "I cannot see how the left-hand and right-hand sides of the diagram match.",
 memory: "Read the handout; assignment draft not submitted; opened AI support once."},
 {id: "S004",
 short: "04",
 status: "On track",
 level: "Level 3",
 stuck: "Transfer task",
 next: "Complete the real-signal challenge question",
 evidence: "I can explain the music example, but I am unsure with seismic signals.",
 memory: "submitted mini quiz; understanding map shows steady concept grasp."},
 {id: "S009",
 short: "09",
 status: "needs support",
 level: "Level 1",
 stuck: "formula meaning",
 next: "Translate each symbol into a plain sentence",
 evidence: "I remember the formula but do not know what each symbol means.",
 memory: "Paused twice on formula-related questions."},
 {id: "S014",
 short: "14",
 status: "needs support",
 level: "Level 1",
 stuck: "diagram mapping",
 next: "Watch the low-threshold diagram explainer",
 evidence: "I cannot see the link between the frequency plot and the original waveform.",
 memory: "Mini quiz answers referenced the diagram but did not explain the mapping."},
 {id: "S018",
 short: "18",
 status: "Ready to apply",
 level: "Level 3",
 stuck: "Transfer task",
 next: "Try explaining a medical imaging scenario",
 evidence: "I know frequency domain is useful but not how it is used in practice.",
 memory: "Finished foundation questions; moving to extension tasks."},
 {id: "S021",
 short: "21",
 status: "Developing",
 level: "Level 2",
 stuck: "Worked example transfer",
 next: "Try one isomorphic variant question",
 evidence: "I can follow the worked example but not when the signal changes.",
 memory: "AI support suggested a one-step variant first."},
 {id: "S026",
 short: "26",
 status: "On track",
 level: "Level 2",
 stuck: "Explaining ideas",
 next: "Explain time and frequency domains in your own words",
 evidence: "I mostly understand but cannot explain it clearly.",
 memory: "submitted assignment; awaiting a one-line teacher comment."},
 {id: "S031",
 short: "31",
 status: "Monitoring",
 level: "Level 2",
 stuck: "Definition stuck",
 next: "Add one everyday definition example",
 evidence: "I still lack a mental picture of what frequency domain means.",
 memory: "Started reading the handout; mini quiz not submitted yet."}];

 function multiclassDemoStudents() {return [demoStudent("S101", "01", "On track", "Level 3", "Free-body transfer", "Complete a variant and explain friction direction", "I can draw weight and normal force; friction direction still needs checking.", "Year 11 Physics B pupil; submitted first mechanics mini quiz."),
 demoStudent("S104", "04", "needs support", "Level 1", "Missing forces", "Redraw the free-body diagram", "I keep forgetting to draw the normal force.", "Year 11 Physics B pupil; needs a low-threshold diagram."),
 demoStudent("S108", "08", "Developing", "Level 2", "F=ma symbols", "Turn F=ma into one plain sentence", "I know the formula but not when to use resultant force.", "Year 11 Physics B pupil; building formula meaning."),
 demoStudent("S113", "13", "Monitoring", "Level 2", "Problem modelling", "Circle the object of study first", "On inclined-plane questions I do not know where to start.", "Year 11 Physics B pupil; draft saved."),
 demoStudent("S119", "19", "On track", "Level 3", "Transfer task", "Explain the accelerating lift scenario", "I can explain the lift example but want one more practice question.", "Year 11 Physics B pupil; high completion."),
 demoStudent("S126", "26", "needs support", "Level 1", "Resultant direction", "Combine two forces with arrows", "I am not sure which way two forces add.", "Year 11 Physics B pupil; needs visual support."),
 demoStudent("S201", "01", "Ready to apply", "Level 3", "Field lines", "Explain field lines around a point charge", "I can see stronger fields where lines are denser.", "AP Physics pupil; on application questions."),
 demoStudent("S204", "04", "Developing", "Level 2", "Potential vs field", "Separate energy view from force view", "I mix up potential and field direction.", "AP Physics pupil; concept boundary still unclear."),
 demoStudent("S207", "07", "On track", "Level 3", "Graph reading", "Complete the equipotential challenge", "I can use the perpendicular equipotential and field-line rule.", "AP Physics pupil; ready for challenge tasks."),
 demoStudent("S212", "12", "needs support", "Level 1", "Units", "Sort units for each physical quantity", "Too many units in the question throws me off.", "AP Physics pupil; needs a units reference."),
 demoStudent("S218", "18", "Monitoring", "Level 2", "formula choice", "Choose Coulomb's law or electric potential energy first", "I can calculate but often pick the wrong starting formula.", "AP Physics pupil; needs a decision tree."),
 demoStudent("S223", "23", "Developing", "Level 2", "Context transfer", "Split particle motion into force and motion steps", "I can compute force alone but not link it to motion.", "AP Physics pupil; building cross-topic links.")];}

 function demoStudent(id, short, status, level, stuck, next, evidence, memory) {return {id, short, status, level, stuck, next, evidence, memory};}

 function democlasses(students) {return [{id: DEFAULT_CLASS_ID,
 name: "Year 12 Physics A",
 course: "Physics",
 topic: "Wave mechanics",
 teacherIds: [DEFAULT_TEACHER_ID],
 studentAliases: defaultStudents.map((student) => student.id),
 status: "Pilot active"},
 {id: "class-mechanics-b",
 name: "Year 11 Physics B",
 course: "Physics",
 topic: "Newton's laws",
 teacherIds: ["teacher-mei"],
 studentAliases: students.filter((student) => /^S1/.test(student.id)).map((student) => student.id),
 status: "Expanded cohort"},
 {id: "class-ap-electric",
 name: "AP Physics",
 course: "AP Physics",
 topic: "Electric Fields",
 teacherIds: ["teacher-chen"],
 studentAliases: students.filter((student) => /^S2/.test(student.id)).map((student) => student.id),
 status: "Advanced pilot"}];}

 function demoassignments() {return {S002: "draft not submitted",
 S004: "submitted",
 S009: "draft not submitted",
 S014: "draft not submitted",
 S018: "submitted",
 S021: "submitted",
 S026: "submitted",
 S031: "draft not submitted",
 S101: "submitted",
 S104: "draft not submitted",
 S108: "submitted",
 S113: "draft saved",
 S119: "submitted",
 S126: "draft not submitted",
 S201: "submitted",
 S204: "submitted",
 S207: "submitted",
 S212: "draft not submitted",
 S218: "draft saved",
 S223: "submitted"};}

 function demoquestions() {return [demoquestion("S104", "Must the normal force always be perpendicular to the contact surface?", 52),
 demoquestion("S204", "Does higher potential always mean a stronger field?", 44),
 demoquestion("S212", "Why can electric field units be written as N/C?", 31),
 demoquestion("S108", "How do I tell resultant force from individual forces in the formula?", 18)];}

 function demoStuckSignals() {return [demoSignal("S104", "Missing forces", "I am not sure which forces must be drawn on the diagram.", 56),
 demoSignal("S126", "Resultant direction", "I keep getting the combined arrow direction wrong.", 47),
 demoSignal("S204", "Potential vs field", "I do not know whether potential or field gives the direction.", 39),
 demoSignal("S212", "Units", "Once units change I am not sure the formula still applies.", 26),
 demoSignal("S014", "diagram mapping", "I cannot see how the frequency plot links to the original waveform.", 12)];}

 function demoCheckIns() {return [createCheckInRecord("S002", {topic: "Wave mechanics",
 state: "partly_understand",
 note: "I know Fourier transform relates to frequency, but not why it is useful.",
 shareChoice: "teacher_summary"}, offsetIso(16)),
 createCheckInRecord("S009", {topic: "Wave mechanics",
 state: "frustrated",
 note: "As soon as I see a formula I feel I cannot learn this.",
 shareChoice: "teacher_summary"}, offsetIso(24)),
 createCheckInRecord("S014", {topic: "Wave mechanics",
 state: "stuck",
 note: "I do not understand how the frequency plot maps to the original waveform.",
 shareChoice: "teacher_summary"}, offsetIso(31))];}

 function demomessages() {return [createmessageRecord("S002", {senderRole: "teacher",
 senderId: DEFAULT_TEACHER_ID,
 senderLabel: "Ms Chen",
 text: "I can see diagram mapping is still uncertain. Try the Level 2 left/right mapping visual, then send me the sentence you are least sure about.",
 kind: "teacher_reply"}, offsetIso(14)),
 createmessageRecord("S002", {senderRole: "student",
 senderId: "student-s002",
 senderLabel: "S002",
 text: "I understand the time-domain view, but the frequency plot on the right still will not line up.",
 kind: "chat"}, offsetIso(18)),
 createmessageRecord("S014", {senderRole: "system",
 senderId: "system",
 senderLabel: "Help needed",
 text: "S014 sent a diagram mapping stuck signal: cannot link frequency plot to original waveform.",
 kind: "help_request"}, offsetIso(12))];}

 function demoquestion(studentAlias, text, minutesAgo) {return {id: `question-demo-${studentAlias}`,
 studentAlias,
 text,
 createdAt: offsetIso(minutesAgo)};}

 function demoSignal(studentAlias, stuckType, note, minutesAgo) {return {id: `stuck-demo-${studentAlias}`,
 studentAlias,
 stuckType,
 note,
 createdAt: offsetIso(minutesAgo),
 status: "sent_to_teacher"};}

 function demoAuditEvents() {return [demoAudit("pilot_class_synced", "school-admin-demo", "school_admin", "class-ap-electric", "class", "class-ap-electric", 65),
 demoAudit("pilot_class_synced", "school-admin-demo", "school_admin", "class-mechanics-b", "class", "class-mechanics-b", 60),
 demoAudit("teacher_material_review", "teacher-mei", "teacher", "class-mechanics-b", "class", "class-mechanics-b", 42),
 demoAudit("teacher_material_review", "teacher-chen", "teacher", "class-ap-electric", "class", "class-ap-electric", 34)];}

 function demoAudit(action, actorId, role, classId, targetType, targetId, minutesAgo) {return {id: `audit-demo-${action}-${classId}-${minutesAgo}`,
 timestamp: offsetIso(minutesAgo),
 action,
 actorId,
 role,
 classId,
 studentAlias: null,
 targetType,
 targetId,
 details: {}};}

 function offsetIso(minutesAgo) {return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();}

 function defaultState() {return {version: 1,
 school: {id: "school-live",
 name: "TeachFlow school"},
 activeclassId: null,
 accounts: [],
 rolePolicies: clone(defaultRolePolicies),
 classes: [],
 className: "",
 topic: "",
 students: [],
 assignments: {},
 questions: [],
 stuckSignals: [],
 checkIns: [],
 messages: [],
 teacherAgentActions: [],
 auditEvents: [],
 approvedmaterials: [],
 draftmaterials: [],
 inviteLinks: [],
 schoolMode: "live_empty",
 updatedAt: null};}

 function createDefaultState() {return clone(defaultState());}

 function getState() {const stored = readStoredState();
 const state = normalizeState(stored || defaultState());
 if (!stored) writeState(state);
 return clone(state);}

 function setState(nextState) {const state = normalizeState(nextState);
 state.updatedAt = new Date().toISOString();
 writeState(state);
 emitWorkspaceupdate(state);
 return clone(state);}

 function resetState() {const state = defaultState();
 state.updatedAt = new Date().toISOString();
 writeState(state);
 emitWorkspaceupdate(state);
 persistMutation("/reset", {});
 return clone(state);}

 function getStudents() {return getState().students;}

 function getStudentsForContext(context) {return scopedStateForContext(getState(), context).students;}

 function getStudent(alias) {return getState().students.find((student) => student.id === alias) || null;}

 function getassignment(alias) {return getState().assignments[alias] || "draft not submitted";}

 function updateassignment(alias, status, input) {const meta = input || {};
 const state = getState();
 const linkedteacherActionId = cleanLinkId(meta.linkedteacherActionId);
 const responseType = cleanResponseType(meta.responseType);
 state.assignments[alias] = status;
 state.students = state.students.map((student) => {if (student.id!== alias) return student;
 return {...student,
 memory: status === "submitted"? "submitted assignment from pupil view; awaiting teacher feedback.": "Saved assignment draft on pupil view; can still edit."};});
 updateteacherActionStudentSignal(state, alias, linkedteacherActionId, {responseType,
 responseAt: new Date().toISOString()});
 const nextState = setState(state);
 persistMutation("/assignment", {studentAlias: alias,
 status,
 linkedteacherActionId,
 responseType}, nextState);
 return nextState;}

 function recordquestion(alias, question, input) {const text = String(question || "").trim();
 if (!text) return getState();
 const meta = input || {};
 const state = getState();
 const linkedteacherActionId = cleanLinkId(meta.linkedteacherActionId);
 const responseType = cleanResponseType(meta.responseType);
 const createdAt = new Date().toISOString();
 state.questions.unshift({id: `question-${Date.now()}`,
 studentAlias: alias,
 text,
 linkedteacherActionId,
 responseType,
 createdAt});
 state.questions = state.questions.slice(0, 20);
 updateteacherActionStudentSignal(state, alias, linkedteacherActionId, {responseType,
 responseAt: createdAt});
 const nextState = setState(state);
 persistMutation("/questions", {studentAlias: alias,
 text,
 linkedteacherActionId,
 responseType}, nextState);
 return nextState;}

 function recordStuckSignal(alias, stuckType, note, input) {const meta = input || {};
 const signal = {id: `stuck-${Date.now()}`,
 studentAlias: alias,
 stuckType: stuckType || "Stuck signal",
 note: String(note || "").trim(),
 linkedteacherActionId: cleanLinkId(meta.linkedteacherActionId),
 responseType: cleanResponseType(meta.responseType),
 createdAt: new Date().toISOString(),
 status: "sent_to_teacher"};
 const state = getState();
 state.stuckSignals.unshift(signal);
 state.stuckSignals = state.stuckSignals.slice(0, 20);
 state.messages = [createmessageRecord(alias, {senderRole: "student",
 senderId: alias,
 senderLabel: alias,
 text: `I need help: ${signal.stuckType}${signal.note? `. ${signal.note}`: ""}`,
 kind: "help_request",
 linkedteacherActionId: signal.linkedteacherActionId,
 responseType: signal.responseType || "still_stuck"}, signal.createdAt),...(Array.isArray(state.messages)? state.messages: [])].slice(0, 100);
 state.students = state.students.map((student) => {if (student.id!== alias) return student;
 return {...student,
 status: supportstatusFor(signal.stuckType),
 level: levelFor(signal.stuckType),
 stuck: signal.stuckType,
 next: nextStepFor(signal.stuckType),
 evidence: signal.note || `pupil view sent stuck signal: ${signal.stuckType}`,
 memory: `pupil view synced stuck signal: ${signal.stuckType}. ${signal.note? `Note: ${signal.note}`: "Awaiting teacher review."}`};});
 updateteacherActionStudentSignal(state, alias, signal.linkedteacherActionId, {responseType: signal.responseType || "still_stuck",
 responseAt: signal.createdAt});
 const nextState = setState(state);
 persistMutation("/stuck-signals", {studentAlias: alias,
 stuckType: signal.stuckType,
 note: signal.note,
 linkedteacherActionId: signal.linkedteacherActionId,
 responseType: signal.responseType}, nextState);
 return nextState;}

 function recordCheckIn(alias, input) {const checkIn = createCheckInRecord(alias, input || {});
 const state = getState();
 state.checkIns = [checkIn,...(Array.isArray(state.checkIns)? state.checkIns: [])].slice(0, 40);
 if (checkIn.teacherVisible) {state.messages = [createmessageRecord(alias, {senderRole: "student",
 senderId: alias,
 senderLabel: alias,
 text: `I would like my teacher to know: ${checkIn.teacherHelpdraft}`,
 kind: "help_request",
 linkedteacherActionId: checkIn.linkedteacherActionId,
 responseType: checkIn.responseType || "check_in"}, checkIn.createdAt),...(Array.isArray(state.messages)? state.messages: [])].slice(0, 100);
 state.students = state.students.map((student) => {if (student.id!== alias) return student;
 return {...student,
 status: supportstatusForCheckIn(checkIn),
 level: levelForCheckIn(checkIn),
 stuck: checkIn.learningSupportSignal,
 next: checkIn.nextLearningStep,
 evidence: checkIn.evidenceQuote || checkIn.summaryForteacher,
 memory: `pupil shared wellbeing check-in: ${checkIn.summaryForteacher}`};});}
 updateteacherActionStudentSignal(state, alias, checkIn.linkedteacherActionId, {responseType: checkIn.responseType,
 responseAt: checkIn.createdAt});
 const nextState = setState(state);
 persistMutation("/check-ins", {studentAlias: alias,
 state: checkIn.state,
 topic: checkIn.topic,
 note: checkIn.note,
 shareChoice: checkIn.shareChoice,
 linkedteacherActionId: checkIn.linkedteacherActionId,
 responseType: checkIn.responseType}, nextState);
 return nextState;}

 function recordmessage(alias, input) {const text = String(input?.text || input?.message || "").trim().slice(0, 800);
 if (!text) return getState();
 const context = normalizeContext(input?.context || {});
 const state = getState();
 const message = createmessageRecord(alias, {...input,
 text,
 senderRole: input?.senderRole || context.role,
 senderId: input?.senderId || context.userId,
 senderLabel: input?.senderLabel || senderLabelFor(input?.senderRole || context.role, alias)});
 state.messages = [message,...(Array.isArray(state.messages)? state.messages: [])].slice(0, 100);
 if (message.senderRole === "student") {updateteacherActionStudentSignal(state, alias, message.linkedteacherActionId, {responseType: message.responseType,
 responseAt: message.createdAt});}
 const nextState = setState(state);
 persistMutation("/messages", {studentAlias: alias,
 text: message.text,
 senderRole: message.senderRole,
 senderId: message.senderId,
 senderLabel: message.senderLabel,
 kind: message.kind,
 linkedteacherActionId: message.linkedteacherActionId,
 responseType: message.responseType,
 context: input?.context}, nextState);
 return nextState;}

 function markteacherAgentActionRead(alias, actionId, input) {const state = getState();
 const readAt = input?.readAt || new Date().toISOString();
 const updated = updateteacherActionStudentSignal(state, alias, cleanLinkId(actionId || input?.actionId), {readAt});
 if (!updated) return state;
 const nextState = setState(state);
 persistMutation("/teacher-actions/read", {studentAlias: alias,
 actionId: cleanLinkId(actionId || input?.actionId),
 readAt,
 context: input?.context}, nextState);
 return nextState;}

 function getmessagesForAlias(alias) {return getState().messages.filter((message) => message.studentAlias === alias).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));}

 function recordteacherAgentAction(input) {const context = normalizeContext(input?.context || {});
 const action = createteacherAgentActionRecord(input || {}, context);
 const state = getState();
 state.teacherAgentActions = [action,...(Array.isArray(state.teacherAgentActions)? state.teacherAgentActions: [])].slice(0, 100);

 if (action.type === "send_message" && action.studentAlias && action.detail) {state.messages = [createmessageRecord(action.studentAlias, {senderRole: "teacher",
 senderId: context.userId || DEFAULT_TEACHER_ID,
 senderLabel: input?.senderLabel || "teacher",
 text: action.detail,
 kind: "teacher_agent_action"}, action.createdAt),...(Array.isArray(state.messages)? state.messages: [])].slice(0, 100);}

 return setState(state);}

 function updateteacherActionStudentSignal(state, alias, actionId, input) {const linkedId = cleanLinkId(actionId);
 if (!linkedId ||!Array.isArray(state.teacherAgentActions)) return false;
 let changed = false;
 state.teacherAgentActions = state.teacherAgentActions.map((action) => {if (!action || action.id!== linkedId || action.studentAlias!== alias) return action;
 changed = true;
 const responseType = cleanResponseType(input?.responseType);
 const readAt = input?.readAt || action.studentReadAt || input?.responseAt || null;
 return {...action,
 studentReadAt: action.studentReadAt || readAt || null,
 studentResponseAt: input?.responseAt || action.studentResponseAt || null,
 studentResponseType: responseType || action.studentResponseType || null};});
 return changed;}

 function latestStuckSignal(alias) {return getState().stuckSignals.find((signal) => signal.studentAlias === alias) || null;}

 function latestCheckIn(alias) {return getState().checkIns.find((item) => item.studentAlias === alias) || null;}

 function getContext(role, overrides) {return normalizeContext({role,...(overrides || {})});}

 function getteacherContext(overrides) {return getContext("teacher", overrides);}

 function getStudentContext(alias, overrides) {return getContext("student", {studentAlias: alias || DEFAULT_STUDENT_ALIAS,...(overrides || {})});}

 function getAccount(accountId) {return getState().accounts.find((account) => account.id === accountId) || null;}

 function getActiveclass() {const state = getState();
 return state.classes.find((item) => item.id === state.activeclassId) || state.classes[0] || null;}

 function scopedStateForContext(state, context) {const normalized = normalizeState(state);
 const nextContext = normalizeContext(context);
 const activeclass = getclassById(normalized, nextContext.classId);
 const studentAliases = new Set(activeclass?.studentAliases || normalized.students.map((student) => student.id));
 let students = normalized.students.filter((student) => studentAliases.has(student.id));
 let questions = normalized.questions.filter((item) => studentAliases.has(item.studentAlias));
 let stuckSignals = normalized.stuckSignals.filter((item) => studentAliases.has(item.studentAlias));
 let checkIns = normalized.checkIns.filter((item) => studentAliases.has(item.studentAlias));
 let messages = normalized.messages.filter((item) => studentAliases.has(item.studentAlias));
 let teacherAgentActions = normalized.teacherAgentActions.filter((item) => {const inclass =!item.classId || item.classId === activeclass?.id;
 const inAliasScope =!item.studentAlias || studentAliases.has(item.studentAlias);
 return inclass && inAliasScope;});
 let approvedmaterials = (normalized.approvedmaterials || []).filter((item) => {return!item.classId || item.classId === activeclass?.id;});
 let draftmaterials = (normalized.draftmaterials || []).filter((item) => {return!item.classId || item.classId === activeclass?.id;});
 let auditEvents = normalized.auditEvents.filter((item) =>!item.classId || item.classId === activeclass?.id);
 const schoolAggregate = buildschoolAggregate(normalized);

 if (nextContext.role === "student") {students = students.filter((student) => student.id === nextContext.studentAlias);
 questions = questions.filter((item) => item.studentAlias === nextContext.studentAlias);
 stuckSignals = stuckSignals.filter((item) => item.studentAlias === nextContext.studentAlias);
 checkIns = checkIns.filter((item) => item.studentAlias === nextContext.studentAlias);
 messages = messages.filter((item) => item.studentAlias === nextContext.studentAlias);
 teacherAgentActions = teacherAgentActions.filter((item) => {return item.studentAlias === nextContext.studentAlias && item.studentVisible!== false;});
 approvedmaterials = approvedmaterials.filter((item) => {const targets = Array.isArray(item.publishedToAliases)? item.publishedToAliases: [];
 return item.status === "published" && (!targets.length || targets.includes(nextContext.studentAlias));});
 draftmaterials = [];
 auditEvents = auditEvents.filter((item) => {return item.actorId === nextContext.userId || item.studentAlias === nextContext.studentAlias;});} else if (nextContext.role === "teacher") {checkIns = checkIns.filter((item) => item.teacherVisible).map(teacherVisibleCheckIn);}

 if (nextContext.role === "school_admin") {students = [];
 questions = [];
 stuckSignals = [];
 checkIns = [];
 messages = [];
 teacherAgentActions = [];
 draftmaterials = [];
 auditEvents = auditEvents.map((item) => ({id: item.id,
 timestamp: item.timestamp,
 action: item.action,
 role: item.role,
 classId: item.classId,
 targetType: item.targetType,
 targetId: item.targetId}));}

 return {...normalized,
 activeclassId: activeclass?.id || normalized.activeclassId,
 className: activeclass?.name || normalized.className,
 topic: activeclass?.topic || normalized.topic,
 students,
 questions,
 stuckSignals,
 checkIns,
 messages,
 teacherAgentActions,
 approvedmaterials,
 draftmaterials,
 auditEvents,
 schoolAggregate,
 session: nextContext,
 accessBoundary: accessBoundaryFor(nextContext, activeclass)};}

 function buildschoolAggregate(state) {const classes = state.classes.map((classItem) => aggregateclass(state, classItem));
 const totals = classes.reduce((next, item) => ({studentAliasCount: next.studentAliasCount + item.studentAliasCount,
 submittedCount: next.submittedCount + item.submittedCount,
 needsSupportCount: next.needsSupportCount + item.needsSupportCount,
 questionCount: next.questionCount + item.questionCount,
 stuckSignalCount: next.stuckSignalCount + item.stuckSignalCount,
 checkInCount: next.checkInCount + item.checkInCount,
 sharedCheckInCount: next.sharedCheckInCount + item.sharedCheckInCount,
 frustrationSignalCount: next.frustrationSignalCount + item.frustrationSignalCount}), {studentAliasCount: 0,
 submittedCount: 0,
 needsSupportCount: 0,
 questionCount: 0,
 stuckSignalCount: 0,
 checkInCount: 0,
 sharedCheckInCount: 0,
 frustrationSignalCount: 0});
 return {generatedAt: new Date().toISOString(),
 schoolName: state.school?.name || "TeachFlow pilot school",
 classCount: classes.length,...totals,
 submittedRate: totals.studentAliasCount? Math.round((totals.submittedCount / totals.studentAliasCount) * 100): 0,
 supportRate: totals.studentAliasCount? Math.round((totals.needsSupportCount / totals.studentAliasCount) * 100): 0,
 classes,
 comparison: buildclassComparison(classes),
 auditByAction: aggregateAuditByAction(state.auditEvents),
 latestAudit: state.auditEvents.slice(0, 8).map((event) => ({id: event.id,
 timestamp: event.timestamp,
 action: event.action,
 role: event.role,
 classId: event.classId,
 targetType: event.targetType}))};}

 function aggregateclass(state, classItem) {const aliases = new Set(classItem.studentAliases || []);
 const classStudents = state.students.filter((student) => aliases.has(student.id));
 const classquestions = state.questions.filter((item) => aliases.has(item.studentAlias));
 const classSignals = state.stuckSignals.filter((item) => aliases.has(item.studentAlias));
 const classCheckIns = state.checkIns.filter((item) => aliases.has(item.studentAlias));
 const sharedCheckIns = classCheckIns.filter((item) => item.teacherVisible);
 const frustrationSignalCount = sharedCheckIns.filter((item) => item.wellbeingLevel >= 1).length;
 const submittedCount = classStudents.filter((student) => state.assignments[student.id] === "submitted").length;
 const needsSupportCount = classStudents.filter((student) => {return student.level === "Level 1" || /needs support/.test(student.status || "");}).length;
 const levelCounts = classStudents.reduce((counts, student) => {const level = student.level || "Unassigned";
 counts[level] = (counts[level] || 0) + 1;
 return counts;}, {});
 const topneeds = Object.entries(classStudents.reduce((counts, student) => {const key = student.stuck || "Monitoring";
 counts[key] = (counts[key] || 0) + 1;
 return counts;}, {})).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([label, count]) => ({label, count}));
 const submittedRate = classStudents.length? Math.round((submittedCount / classStudents.length) * 100): 0;
 const supportRate = classStudents.length? Math.round((needsSupportCount / classStudents.length) * 100): 0;
 const activityScore = Math.min(100, (classquestions.length * 8) + (classSignals.length * 12) + submittedRate);
 const attentionScore = Math.min(100, Math.round((supportRate * 0.65) + ((100 - submittedRate) * 0.25) + (classSignals.length * 5)));

 return {id: classItem.id,
 name: classItem.name,
 course: classItem.course,
 topic: classItem.topic,
 status: classItem.status,
 studentAliasCount: classStudents.length,
 submittedCount,
 needsSupportCount,
 questionCount: classquestions.length,
 stuckSignalCount: classSignals.length,
 checkInCount: classCheckIns.length,
 sharedCheckInCount: sharedCheckIns.length,
 frustrationSignalCount,
 submittedRate,
 supportRate,
 activityScore,
 attentionScore,
 readinessLabel: readinessLabelFor(submittedRate, supportRate, classSignals.length),
 dominantNeed: topneeds[0]?.label || "Monitoring",
 levelCounts,
 topneeds};}

 function buildclassComparison(classes) {return {highestSupportclass: pickclass(classes, (item) => item.supportRate, "desc"),
 lowestSubmissionclass: pickclass(classes, (item) => item.submittedRate, "asc"),
 mostActiveclass: pickclass(classes, (item) => item.activityScore, "desc"),
 mostReadyclass: pickclass(classes, (item) => item.submittedRate - item.supportRate, "desc")};}

 function pickclass(classes, scoreFor, direction) {const sorted = [...classes].sort((a, b) => {const diff = scoreFor(a) - scoreFor(b);
 return direction === "asc"? diff: -diff;});
 const item = sorted[0];
 return item? {id: item.id,
 name: item.name,
 topic: item.topic,
 submittedRate: item.submittedRate,
 supportRate: item.supportRate,
 attentionScore: item.attentionScore,
 activityScore: item.activityScore,
 dominantNeed: item.dominantNeed}: null;}

 function readinessLabelFor(submittedRate, supportRate, signalCount) {if (submittedRate >= 75 && supportRate <= 25) return "Ready to expand";
 if (signalCount >= 2 || supportRate >= 30) return "needs follow-up";
 if (submittedRate < 50) return "needs push";
 return "Stable pilot";}

 function aggregateAuditByAction(auditEvents) {return auditEvents.reduce((counts, event) => {counts[event.action] = (counts[event.action] || 0) + 1;
 return counts;}, {});}

 function normalizeContext(context) {const requested = context || {};
 const role = requested.role || "teacher";
 const accountFallback = {};
 const userId = requested.userId || requested.accountId || accountFallback.id || `${role}-local`;
 const studentAlias = requested.studentAlias || accountFallback.studentAlias || DEFAULT_STUDENT_ALIAS;
 const classId = requested.classId || accountFallback.classIds?.[0] || DEFAULT_CLASS_ID;
 return {role,
 userId,
 classId,
 studentAlias,
 permissions: clone(defaultRolePolicies[role] || defaultRolePolicies.teacher)};}

 function accessBoundaryFor(context, activeclass) {const policy = defaultRolePolicies[context.role] || defaultRolePolicies.teacher;
 return {role: context.role,
 classId: activeclass?.id || context.classId,
 className: activeclass?.name || "No class selected",
 studentAlias: context.role === "student"? context.studentAlias: null,
 visibleData: policy.visibleData,
 canApprove: Boolean(policy.canApprove),
 canReadAllStudents: Boolean(policy.canReadAllStudents)};}

 function getclassById(state, classId) {return state.classes.find((item) => item.id === classId) || state.classes[0] || null;}

 function syncFromServer(context) {if (!canUseRemote()) return Promise.resolve(getState());
 return global.fetch(`${API_ROOT}${contextQuery(context)}`, {cache: "no-store"}).then((response) => {if (!response.ok) throw new Error(`Workspace API ${response.status}`);
 return response.json();}).then(applyRemoteState).catch(() => getState());}

 function persistMutation(path, payload, fallbackState) {if (!canUseRemote()) return Promise.resolve(fallbackState || getState());
 const requestPayload = {...(payload || {}),
 context: payload?.context || contextFromPayload(payload || {})};
 return global.fetch(`${API_ROOT}${path}${contextQuery(requestPayload.context)}`, {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(requestPayload)}).then((response) => {if (!response.ok) throw new Error(`Workspace API ${response.status}`);
 return response.json();}).then(applyRemoteState).catch(() => fallbackState || getState());}

 function applyRemoteState(state) {const normalized = normalizeState(state);
 writeState(normalized);
 emitWorkspaceupdate(normalized);
 return clone(normalized);}

 function canUseRemote() {return Boolean(typeof window!== "undefined" &&
 global.fetch &&
 global.location &&
 /^https?:$/.test(global.location.protocol));}

 function emitWorkspaceupdate(state) {if (typeof global.dispatchEvent!== "function" || typeof global.CustomEvent!== "function") return;
 global.dispatchEvent(new global.CustomEvent(WORKSPACE_EVENT, {detail: clone(state)}));}

 function contextFromPayload(payload) {if (payload.studentAlias) return getStudentContext(payload.studentAlias);
 return getteacherContext();}

 function contextQuery(context) {const nextContext = normalizeContext(context);
 const params = new URLSearchParams({role: nextContext.role,
 userId: nextContext.userId,
 classId: nextContext.classId});
 if (nextContext.studentAlias) params.set("studentAlias", nextContext.studentAlias);
 return `?${params.toString()}`;}

 function supportstatusFor(stuckType) {if (/formula|Definition|diagram/i.test(stuckType)) return "needs support";
 if (/Worked example|Transfer/i.test(stuckType)) return "Developing";
 return "Monitoring";}

 function levelFor(stuckType) {if (/formula|Definition/i.test(stuckType)) return "Level 1";
 if (/diagram|Worked example|Transfer/i.test(stuckType)) return "Level 2";
 return "Level 2";}

 function nextStepFor(stuckType) {if (/diagram/i.test(stuckType)) return "Watch the low-threshold diagram explainer";
 if (/formula/i.test(stuckType)) return "Translate each symbol into one sentence";
 if (/Definition/i.test(stuckType)) return "Add one everyday definition example";
 if (/Worked example|Transfer/i.test(stuckType)) return "Try one isomorphic variant question";
 return "Awaiting teacher next-step support";}

 function cleanLinkId(value) {const text = String(value || "").trim();
 return text? text.slice(0, 120): null;}

 function cleanResponseType(value) {const text = String(value || "").trim();
 return text? text.slice(0, 60): null;}

 function createmessageRecord(alias, input, createdAt) {const senderRole = ["teacher", "student", "system"].includes(input.senderRole)? input.senderRole: "student";
 const text = String(input.text || "").trim().slice(0, 800);
 return {id: input.id || `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
 threadId: `thread-${alias}`,
 studentAlias: alias,
 senderRole,
 senderId: input.senderId || (senderRole === "student"? alias: DEFAULT_TEACHER_ID),
 senderLabel: input.senderLabel || senderLabelFor(senderRole, alias),
 text,
 kind: input.kind || "chat",
 linkedteacherActionId: cleanLinkId(input.linkedteacherActionId),
 responseType: cleanResponseType(input.responseType),
 createdAt: createdAt || new Date().toISOString()};}

 function createteacherAgentActionRecord(input, context, createdAt) {const type = normalizeteacherAgentActionType(input.type || input.actionType);
 const studentAlias = String(input.studentAlias || input.alias || "").trim() || null;
 const material = input.material && typeof input.material === "object"? {id: String(input.material.id || input.sourceId || `material-${Date.now()}`),
 title: String(input.material.title || input.title || "teacher-assigned material").trim().slice(0, 120),
 type: String(input.material.type || "materials").trim().slice(0, 80),
 topic: String(input.material.topic || input.topic || "").trim().slice(0, 120),
 targetLevel: String(input.material.targetLevel || input.targetLevel || "").trim().slice(0, 80),
 goal: String(input.material.goal || input.detail || "").trim().slice(0, 500)}: null;
 const title = String(input.title || defaultteacherAgentActionTitle(type, studentAlias, material)).trim().slice(0, 160);
 const detail = String(input.detail || input.text || input.message || material?.goal || "").trim().slice(0, 800);
 const statusByType = {send_message: "sent",
 assign_material: "assigned",
 schedule_followup: "scheduled",
 dismiss: "handled"};

 return {id: input.id || `teacher-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
 type,
 status: input.status || statusByType[type] || "completed",
 studentAlias,
 classId: context?.classId || input.classId || DEFAULT_CLASS_ID,
 actorId: context?.userId || input.actorId || DEFAULT_TEACHER_ID,
 title,
 detail,
 material,
 followUp: type === "schedule_followup"? {dueLabel: String(input.dueLabel || "next lesson").trim().slice(0, 80),
 note: detail}: null,
 source: "teacher_agent",
 sourceId: input.sourceId || null,
 sourceType: input.sourceType || "teacher_agent_recommendation",
 studentVisible: input.studentVisible === false || type === "dismiss"? false: true,
 studentReadAt: input.studentReadAt || null,
 studentResponseAt: input.studentResponseAt || null,
 studentResponseType: cleanResponseType(input.studentResponseType || input.responseType),
 createdAt: createdAt || new Date().toISOString()};}

 function normalizeteacherAgentActionType(value) {const type = String(value || "").trim();
 if (["send_message", "assign_material", "schedule_followup", "dismiss"].includes(type)) return type;
 return "dismiss";}

 function defaultteacherAgentActionTitle(type, studentAlias, material) {if (type === "send_message") return `Send support message${studentAlias? ` to ${studentAlias}`: ""}`;
 if (type === "assign_material") return material?.title || `Assign material${studentAlias? ` to ${studentAlias}`: ""}`;
 if (type === "schedule_followup") return `Learning follow-up${studentAlias? `: ${studentAlias}`: ""}`;
 return `Marked handled${studentAlias? `: ${studentAlias}`: ""}`;}

 function senderLabelFor(senderRole, alias) {if (senderRole === "teacher") return "teacher";
 if (senderRole === "system") return "SystemReminder";
 return alias;}

 function createCheckInRecord(alias, input, createdAt) {const mood = checkInStateFor(input.state || input.mood || "partly_understand");
 const note = String(input.note || "").trim().slice(0, 500);
 const shareChoice = shareChoiceFor(input.shareChoice || input.visibility || "private");
 const signal = wellbeingSignalFor(mood.id, note);
 const safeguardingRequired = signal.level === 3;
 const teacherVisible = shareChoice === "teacher_summary" &&!safeguardingRequired;
 const summaryForteacher = summaryForteacherFor(mood, note, signal);
 const nextLearningStep = nextLearningStepFor(mood.id, note);
 const recommendedteacherAction = recommendedteacherActionFor(mood.id, signal);

 return {id: input.id || `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
 studentAlias: alias,
 topic: String(input.topic || "Wave mechanics").trim() || "current topic",
 state: mood.id,
 stateLabel: mood.label,
 note,
 shareChoice,
 privateReflection: privateReflectionFor(mood.id, note),
 nextLearningStep,
 teacherHelpdraft: teacherHelpdraftFor(mood.id, note),
 learningSupportSignal: signal.type,
 wellbeingLevel: signal.level,
 wellbeingLabel: signal.label,
 summaryForteacher,
 recommendedteacherAction,
 evidenceQuote: teacherVisible? note: "",
 linkedteacherActionId: cleanLinkId(input.linkedteacherActionId),
 responseType: cleanResponseType(input.responseType),
 privacyLevel: safeguardingRequired? "safeguarding_review_required": (teacherVisible? "teacher_visible_summary_only": "private_student_only"),
 teacherVisible,
 safeguardingFlag: {required: safeguardingRequired,
 reason: safeguardingRequired? "Student language may indicate a safety risk. Follow school safeguarding policy and involve a trusted adult or designated lead.": ""},
 createdAt: createdAt || new Date().toISOString()};}

 function checkInStateFor(value) {const states = {understand: {id: "understand", label: "I understand"},
 partly_understand: {id: "partly_understand", label: "I partly understand"},
 stuck: {id: "stuck", label: "I am stuck"},
 frustrated: {id: "frustrated", label: "I feel frustrated"},
 want_teacher_help: {id: "want_teacher_help", label: "I want teacher help"}};
 return states[value] || states.partly_understand;}

 function shareChoiceFor(value) {const allowed = ["private", "teacher_summary", "ask_ai_first"];
 return allowed.includes(value)? value: "private";}

 function wellbeingSignalFor(state, note) {const text = `${state} ${note}`.toLowerCase();
 if (/self-harm|harm self|harm others|not wanting to live|suicide|self-harm|kill myself|hurt others|abuse|bully|being bullied|abuse/.test(text)) {return {level: 3, label: "safetyrisk", type: "safeguarding_review"};}
 if (/panic|fear|stress|anxious|overwhelmed|behind|pressure/.test(text)) {return {level: 2, label: "ongoing learning pressure", type: "sustained_learning_pressure"};}
 if (/frustrated|dumb|stupid|give up|confused|lost/.test(text) || state === "frustrated") {return {level: 1, label: "low confidence signal", type: "low_confidence"};}
 if (state === "stuck" || state === "want_teacher_help") {return {level: 1, label: "needs learning support", type: "learning_support_needed"};}
 return {level: 0, label: "normal learning check-in", type: "normal_learning_check_in"};}

 function privateReflectionFor(state, note) {if (state === "understand") return "You have a base understanding. Next step: confirm it with one short practice question.";
 if (state === "frustrated") return "You are not failing. The learning task is too large right now, so make it smaller first.";
 if (state === "stuck") return "Do not solve the whole topic at once. Name the exact part that is stuck first.";
 if (state === "want_teacher_help") return "You can turn this into a short teacher help request so the teacher knows exactly where to support you.";
 return note? "You have started naming the learning state. Next step: turn it into one small action.": "Start by naming one thing you know and one thing you do not know yet.";}

 function nextLearningStepFor(state, note) {if (state === "understand") return "Try one confirmation question.";
 if (state === "frustrated") return "Start with one low-pressure example, then stop and check what changed.";
 if (state === "stuck") return "Turn the stuck point into one specific question, then ask for a hint.";
 if (state === "want_teacher_help") return "Send a short help request to your teacher and name the exact stuck point.";
 if (/diagram|waveform|frequencydiagram/.test(note)) return "Review the diagram mapping material, then compare the left-hand waveform with the right-hand frequency graph.";
 if (/formula|symbol/.test(note)) return "Choose one formula symbol and write what it means in the situation.";
 return "Review the teacher-approved Level 1 material, then write one unclear sentence.";}

 function teacherHelpdraftFor(state, note) {const base = note || "I need help with a specific part of the current topic.";
 if (state === "frustrated") return `I feel frustrated with this topic. ${base} Could I get a simpler example or diagram first?`;
 if (state === "want_teacher_help") return `Teacher, could you help me with this: ${base}`;
 return `Teacher-visible learning note: ${base}`;}

 function summaryForteacherFor(mood, note, signal) {const topicText = note? `Pupil shared this learning note: ${note}`: "Pupil submitted a learning status check-in.";
 return `${mood.label}; ${signal.label}.${topicText}`;}

 function recommendedteacherActionFor(state, signal) {if (signal.level === 3) return "Do not rely on AI. Follow school safeguarding workflow and involve the appropriate human lead.";
 if (signal.level === 2) return "Send a supportive learning-pressure message and suggest contacting a trusted adult or school support if needed.";
 if (state === "frustrated") return "Send a short supportive message, then publish a low-threshold example or reading task.";
 if (state === "stuck") return "Send a diagram, hint, or one-step task that makes the stuck point smaller.";
 if (state === "want_teacher_help") return "Review the pupil help request draft, then send a reply or targeted material.";
 return "Monitor the current learning state and use a short confirmation task if needed.";}

 function teacherVisibleCheckIn(item) {return {id: item.id,
 studentAlias: item.studentAlias,
 topic: item.topic,
 state: item.state,
 stateLabel: item.stateLabel,
 learningSupportSignal: item.learningSupportSignal,
 wellbeingLevel: item.wellbeingLevel,
 wellbeingLabel: item.wellbeingLabel,
 summaryForteacher: item.summaryForteacher,
 recommendedteacherAction: item.recommendedteacherAction,
 teacherHelpdraft: item.teacherHelpdraft,
 evidenceQuote: item.evidenceQuote,
 linkedteacherActionId: item.linkedteacherActionId || null,
 responseType: item.responseType || null,
 privacyLevel: item.privacyLevel,
 teacherVisible: true,
 safeguardingFlag: {required: Boolean(item.safeguardingFlag?.required)},
 createdAt: item.createdAt};}

 function supportstatusForCheckIn(checkIn) {if (checkIn.wellbeingLevel >= 2) return "needs support";
 if (checkIn.wellbeingLevel >= 1 || checkIn.state === "stuck") return "needs support";
 if (checkIn.state === "understand") return "On track";
 return "Developing";}

 function levelForCheckIn(checkIn) {if (checkIn.wellbeingLevel >= 2 || checkIn.state === "frustrated") return "Level 1";
 if (checkIn.state === "stuck" || checkIn.state === "partly_understand") return "Level 2";
 return "Level 3";}

 function normalizeState(state) {const fallback = defaultState();
 const classes = mergeById(fallback.classes, Array.isArray(state?.classes)? state.classes: []);
 const students = mergeById(fallback.students, Array.isArray(state?.students)? state.students: []);
 const activeclassId = state?.activeclassId || classes[0]?.id || fallback.activeclassId;
 const accounts = ensureSchoolAdminAccount(mergeById(fallback.accounts, Array.isArray(state?.accounts)? state.accounts: []), classes, activeclassId);
 const collection = (key) => {if (state?.testMode?.enabled && Array.isArray(state?.[key])) return clone(state[key]);
 return mergeById(fallback[key], Array.isArray(state?.[key])? state[key]: []);};
 const normalized = {...fallback,...(state || {}),
 school: {...fallback.school,...((state && state.school) || {})},
 activeclassId,
 accounts,
 rolePolicies: {...fallback.rolePolicies,...((state && state.rolePolicies) || {})},
 classes,
 assignments: {...fallback.assignments,...((state && state.assignments) || {})},
 students,
 questions: collection("questions"),
 stuckSignals: collection("stuckSignals"),
 checkIns: collection("checkIns"),
 messages: collection("messages"),
 teacherAgentActions: collection("teacherAgentActions"),
 auditEvents: collection("auditEvents"),
 approvedmaterials: Array.isArray(state?.approvedmaterials)? state.approvedmaterials: fallback.approvedmaterials,
 draftmaterials: Array.isArray(state?.draftmaterials)? state.draftmaterials: fallback.draftmaterials};
 normalized.classes = normalized.classes.map((item) => ({...item,
 studentAliases: Array.isArray(item.studentAliases)? item.studentAliases: normalized.students.map((student) => student.id)}));
 return migrateLegacyCopyInState(normalized);}

 function ensureSchoolAdminAccount(accounts, classes, activeclassId) {const classIds = (classes || []).map((item) => item.id).filter(Boolean);
 if (!classIds.length && activeclassId) classIds.push(activeclassId);
 const existing = (accounts || []).find((account) => account.id === "school-admin-demo" || account.role === "school_admin");
 if (existing) {return (accounts || []).map((account) => {if (account !== existing) return account;
 return {...account,
 id: account.id || "school-admin-demo",
 role: "school_admin",
 displayName: account.displayName || "Lead coordinator",
 classIds: classIds.length? Array.from(new Set([...(account.classIds || []),...classIds])): (account.classIds || []),
 permissions: Array.from(new Set([...(account.permissions || []), "read_aggregate", "read_audit_log"]))};});}
 if (!classIds.length) return accounts || [];
 return [...(accounts || []), {id: "school-admin-demo",
 role: "school_admin",
 displayName: "Lead coordinator",
 classIds,
 permissions: ["read_aggregate", "read_audit_log"]}];}

 function migrateLegacyCopyInState(value) {if (Array.isArray(value)) return value.map((item) => migrateLegacyCopyInState(item));
 if (value && typeof value === "object") {const next = {};
 Object.entries(value).forEach(([key, item]) => {next[key] = migrateLegacyCopyInState(item);});
 return next;}
 if (typeof value === "string") return cleanLegacyCopy(value);
 return value;}

 function cleanLegacyCopy(value) {let text = String(value);
 const replacements = [
 ["\u6b63\u5728\u5efa\u7acb\u7406\u89e3", "Building understanding"],
 ["\u5148\u62c6\u6210\u4e00\u4e2a\u5c0f\u95ee\u9898", "Break it into one small question"],
 ["\u5148\u5199\u4e00\u53e5\u6700\u4e0d\u786e\u5b9a\u7684\u5730\u65b9\uff0c\u518d\u8ba9\u5b66\u4e60\u4f19\u4f34\u5e2e\u4f60\u62c6\u5c0f\u3002", "Write the sentence you are least sure about, then ask the learning partner to make it smaller."],
 ["\u8865\u5b8c\u4f5c\u4e1a\u8349\u7a3f", "Finish the assignment draft"],
 ["\u5148\u5199\u4e09\u53e5\u8bdd\uff0c\u4e0d\u8ffd\u6c42\u4e00\u6b21\u5199\u5b8c\u6574\uff1a\u6211\u77e5\u9053\u4ec0\u4e48\u3001\u6211\u4e0d\u786e\u5b9a\u4ec0\u4e48\u3001\u6211\u9700\u8981\u54ea\u4e2a\u4f8b\u5b50\u3002", "Write three sentences first: what I know, what I am unsure about, and which example I need."],
 ["\u9700\u8981\u65f6\u5206\u4eab\u5361\u70b9", "Share the stuck point if needed"],
 ["\u53ea\u6709\u4f60\u786e\u8ba4\u5206\u4eab\u540e\uff0c\u8001\u5e08\u624d\u4f1a\u770b\u5230\u6574\u7406\u540e\u7684\u5361\u70b9\u6458\u8981\u3002", "Only after you confirm sharing will the teacher see a short stuck-point summary."],
 ["\u590d\u76d8 ", "Review "],
 [" \u7684\u652f\u6301\u6548\u679c", " support effect"],
 ["\u8001\u5e08\u52a8\u4f5c\u540e\u4ecd\u6709\u540e\u7eed\u5361\u70b9\u6216\u6c42\u52a9\u4fe1\u53f7\u3002", "still has a follow-up stuck point or help signal after the teacher action."],
 ["\u5728\u8001\u5e08\u52a8\u4f5c\u540e\u4ecd\u6709\u540e\u7eed\u5361\u70b9\u6216\u6c42\u52a9\u4fe1\u53f7\u3002", "still has a follow-up stuck point or help signal after the teacher action."],
 ["\u5b66\u751f\u63d0\u95ee", "student question"],
 ["\u770b\u56de\u6d41", "View outcomes"],
 ["\u4f18\u5148\u8ddf\u8fdb ", "Priority follow-up "],
 ["\u5f53\u524d\u805a\u5408\u5206\u6570\u6700\u9ad8\uff0c\u4e3b\u8981\u5361\u70b9\u662f", "has the highest priority score. Main stuck point:"],
 ["\u770b\u5b66\u751f", "View pupil"],
 ["\u590d\u6838\u300c", "Review \""],
 ["\u300d\u8bc1\u636e", "\" evidence"],
 ["\u4e2a\u522b\u540d\u4e0e\u8be5\u5361\u70b9\u76f8\u5173\uff0c\u5df2\u6709", "alias is related to this stuck point, with"],
 ["\u6761\u8bc1\u636e\u3002", "evidence items."],
 ["\u770b\u8bc1\u636e", "View evidence"],
 ["\u5236\u4f5c ", "Create "],
 ["\u5206\u949f\u8865\u6551\u6750\u6599", "minute support material"],
 ["\u6750\u6599\u8349\u7a3f\u6765\u81ea\u6700\u9ad8\u9891\u5361\u70b9", "Material draft is based on the highest-frequency stuck point"],
 ["\u5236\u4f5c\u6750\u6599", "Create material"],
 ["\u5b66\u751f\u753b\u50cf", "pupil profiles"],
 ["\u4f5c\u4e1a\u63d0\u4ea4", "assignment submissions"],
 ["\u5361\u70b9\u4fe1\u53f7", "stuck signals"],
 ["\u8001\u5e08\u53ef\u89c1 Check-in", "teacher-visible check-ins"],
 ["\u5e08\u751f\u6d88\u606f", "teacher-pupil messages"],
 ["\u8001\u5e08\u52a8\u4f5c", "teacher actions"],
 ["\u6210\u6548\u56de\u6d41", "outcome feedback"],
 ["\u5df2\u8ffd\u8e2a", "Tracking"],
 ["\u4e2a\u8001\u5e08\u52a8\u4f5c", "teacher actions"],
 ["\u4e2a\u51fa\u73b0\u6539\u5584\u4fe1\u53f7", "improved"],
 ["\u4e2a\u4ecd\u9700\u8ddf\u8fdb", "need follow-up"],
 ["\u4e2a\u7b49\u5f85\u5b66\u751f\u540e\u7eed\u4fe1\u53f7", "waiting for later pupil signals"],
 ["\u7b49\u5f85\u5b66\u751f\u6253\u5f00\u6750\u6599\u3001\u63d0\u4ea4\u4f5c\u4e1a\u6216\u53d1\u9001\u65b0\u7684\u95ee\u9898\u540e\u518d\u8bc4\u4f30\u3002", "Wait for the pupil to open the material, submit work, or send a new question before evaluating."],
 ["\u4ecd\u9700\u8ddf\u8fdb", "Needs follow-up"],
 ["\u7b49\u5f85\u540e\u7eed\u4fe1\u53f7", "Awaiting signal"],
 ["\u5b66\u751f\u56de\u590d", "Pupil reply"],
 ["\u5b66\u4e60\u4fe1\u53f7", "Learning signal"],
 [" \u5728 teacher action s\u540e\u4ecd\u51fa\u73b0\u300c student question \u300d\uff0c\u9700\u8981\u518d\u6b21\u8ddf\u8fdb\u3002", " still showed a later student question after the teacher action and needs follow-up."],
 ["\u5efa\u8bae\u8001\u5e08\u6253\u5f00\u5b66\u751f\u8be6\u60c5\uff0c\u590d\u6838\u539f\u53e5\u540e\u5b89\u6392\u4e00\u6b21\u77ed\u8ddf\u8fdb\u3002", "Open the pupil detail view, review the original quote, and schedule a short follow-up."],
 ["\u4f60\u73b0\u5728\u6b63\u5728\u5b66\u4e60\u300c", "You are currently learning "],
 ["\u300d\u3002\u6211\u770b\u5230\u4f60\u7684\u4e3b\u8981\u5361\u70b9\u662f\u300c", ". Main stuck point: "],
 ["\u300d\uff0c\u4f5c\u4e1a\u72b6\u6001\u662f\u300c", ". Assignment status: "],
 ["\u300d\u3002\u4e0b\u4e00\u6b65\u5148\u505a\u4e00\u4e2a\u5c0f\u52a8\u4f5c\uff1a", ". Next step: "],
 ["\u7b49\u5f85\u8001\u5e08\u53cd\u9988\u5e76\u8ffd\u95ee", "Use teacher feedback"],
 ["\u5982\u679c\u8001\u5e08\u56de\u590d\u4e86\uff0c\u5148\u6309\u8001\u5e08\u7ed9\u7684\u4e00\u4e2a\u5c0f\u6b65\u9aa4\u505a\uff0c\u4e0d\u8981\u540c\u65f6\u5904\u7406\u592a\u591a\u95ee\u9898\u3002", "If your teacher has replied, follow one small step first before asking a new question."],
 ["\u5df2\u6709\u63d0\u4ea4\uff0c\u9002\u5408\u7b49\u5f85\u8001\u5e08\u53cd\u9988\u5e76\u7ee7\u7eed\u8ffd\u95ee", "Assignment submitted; ready for teacher feedback and follow-up questions."],
 ["teacheractionstuck point", "Still stuck after teacher action"],
 ["teacher action stuck point", "Still stuck after teacher action"],
 ["student learningsyncstuck point:", "Student shared stuck point:"],
 ["learningneedssupport:", "Needs learning support:"],
 ["learning formula, learningsymbolis learning.", "I am unsure what the formula symbols mean."],
 ["learningsymbolis learning", "formula symbol is unclear"],
 ["learning good", "I understand this part."],
 ["Learning support, learningnowlearning.", "Learning support helped; this is making more sense now."],
 ["learningnowlearning", "is making more sense now"],
 ["teacheraction\u201clearning material: learningexercise\u201d:", "After teacher action \"learning material: exercise\":"],
 ["teacher action\u201c", "After teacher action \""],
 ["learning material: learningexercise", "learning material: exercise"],
 ["learning material: learning diagramdraft", "Learning material: diagram draft"],
 ["learning diagramdraft", "diagram draft"],
 ["diagramdraft", "diagram draft"],
 ["wave frequency image smoke 2 diagram draft", "wave frequency diagram draft 2"],
 ["wave frequency image smoke diagram draft", "wave frequency diagram draft"],
 ["wave frequency image smoke diagramdraft", "wave frequency diagram draft"],
 [" image smoke ", " image "],
 ["learning isstuck, needsthen learning.", "still stuck and needs the next small step."],
 ["learning is learning", "I am still unsure"],
 ["teacher action s", "teacher actions"],
 ["After teacher actionofpupil learningsignal", "Pupil signals after teacher action"],
 ["After teacher actionofpupilsignal", "Pupil signals after teacher action"],
 ["After teacher action of pupil signal", "Pupil signals after teacher action"],
 ["Suggested, learningpublish", "Suggested actions to review"],
 ["outcomelearning", "Outcome"],
 ["actionlearning", "Actions"],
 ["learningsupportpupil", "Pupils needing support"],
 ["Quoteevidence", "Quote evidence"],
 ["viewnotes", "View notes"],
 ["defaultlearning", "collapsed"],
 ["learningFollow-up", "Learning follow-up"],
 ["Continuelearning", "Continue learning"],
 ["waitingsignal", "Awaiting signal"],
 ["waitingaction", "Awaiting action"],
 ["actionalready", "actions tracked"],
 ["alreadyLogteacher actions", "Logged teacher action"],
 ["waitingpupilsubmit, question, replyorthen learningsendStuck signal.", "Waiting for the pupil to submit work, ask a question, reply, or send a stuck signal."],
 ["pupilalready: ", "Pupil responded: "],
 ["pupilalready, waiting", "Pupil has read it; awaiting response"],
 ["learningsignal", "Learning signal"],
 ["learningsupport", "Learning support"],
 ["learningstuck", "Still stuck"],
 ["draftlearningsubmit", "draft not submitted"],
 ["teacheraction", "teacher action"],
 ["learningsubmit", "submitted"],
 ["learningunderstand learning", "I understand"],
 ["learningunderstand", "I understand"],
 ["learningstuck", "I am stuck"],
 ["ongoingStresslearning", "ongoing learning pressure"],
 ["learningsignal", "learning signal"],
 ["needs learningsupport", "needs learning support"],
 ["learningLearning status", "normal learning check-in"],
 ["alreadySynctoteacher", "Shared with teacher"],
 ["alreadySharelearningStuck signalsummarytoteacher.teacher viewlearning ofis learning of learningsignal, learning is learningprivateConversation.", "Shared a short stuck-signal summary with your teacher. Your private chat remains private."],
 ["After teacher actionlearningStuck signal", "Still stuck after teacher action"]
 ];
 replacements.forEach(([from, to]) => {text = text.split(from).join(to);});
 return text;}

 function mergeById(defaultItems, nextItems) {const byId = new Map();
 (nextItems || []).forEach((item) => {if (item && item.id) byId.set(item.id, clone(item));});
 (defaultItems || []).forEach((item) => {if (item && item.id &&!byId.has(item.id)) byId.set(item.id, clone(item));});
 return Array.from(byId.values());}

 function readStoredState() {try {if (global.localStorage) {const raw = global.localStorage.getItem(STORAGE_KEY);
 return raw? JSON.parse(raw): null;}} catch (error) {return memoryState;}
 return memoryState;}

 function writeState(state) {const next = clone(state);
 memoryState = next;
 try {if (global.localStorage) {global.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));}} catch (error) {memoryState = next;}}

 function clone(value) {return JSON.parse(JSON.stringify(value));}

 const api = {getState,
 setState,
 resetState,
 getStudents,
 getStudentsForContext,
 getStudent,
 getassignment,
 updateassignment,
 recordquestion,
 recordStuckSignal,
 recordCheckIn,
 recordmessage,
 markteacherAgentActionRead,
 recordteacherAgentAction,
 getmessagesForAlias,
 latestStuckSignal,
 latestCheckIn,
 syncFromServer,
 createDefaultState,
 normalizeState,
 getContext,
 getteacherContext,
 getStudentContext,
 getAccount,
 getActiveclass,
 scopedStateForContext};

 global.TeachFlowWorkspaceState = api;

 if (typeof module!== "undefined") {module.exports = api;}})(typeof window!== "undefined"? window: globalThis);
