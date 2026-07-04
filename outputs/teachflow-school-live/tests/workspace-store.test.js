const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "teachflow-workspace-store-"));
process.env.TEACHFLOW_WORKSPACE_FILE = path.join(tempDir, "workspace-state.json");

const store = require("../workspace-store.js");

const teacherRegistration = store.registerteacher({displayName: "Store Test teacher",
 schoolName: "TeachFlow Store Test school",
 className: "Store Test class",
 course: "Physics",
 topic: "Fourier transform"});
const firstStudentRegistration = store.registerStudentWithInvite({inviteToken: teacherRegistration.invite.token,
 displayName: "Student A"});
const secondStudentRegistration = store.registerStudentWithInvite({inviteToken: teacherRegistration.invite.token,
 displayName: "Student B"});

let state = store.getState();
assert.ok(Array.isArray(state.students));
assert.ok(state.students.some((student) => student.id === "S002"));

const teacherContext = {role: "teacher",
 userId: teacherRegistration.account.id,
 classId: teacherRegistration.classRecord.id};
const studentContext = {role: "student",
 userId: secondStudentRegistration.account.id,
 classId: teacherRegistration.classRecord.id,
 studentAlias: secondStudentRegistration.student.id};

const teacher view = store.getState(teacherContext);
assert.ok(teacher view.students.length > 1);

const studentview = store.getState(studentContext);
assert.strictEqual(studentview.students.length, 1);
assert.strictEqual(studentview.students[0].id, "S002");
assert.strictEqual(studentview.accessBoundary.canReadAllStudents, false);

const teacherBriefing = store.getteacherAgentBriefing(teacherContext);
assert.strictEqual(teacherBriefing.agentId, "teacher-agent-orchestrator");
assert.strictEqual(teacherBriefing.session.role, "teacher");
assert.ok(teacherBriefing.priorityTasks.length >= 1);
assert.strictEqual(teacherBriefing.canAutopublish, false);

assert.throws(() => {store.getteacherAgentBriefing(studentContext);}, /cannot perform read_teacher_agent/);

const studentBriefing = store.getStudentAgentBriefing(studentContext);
assert.strictEqual(studentBriefing.agentId, "student-agent-orchestrator");
assert.strictEqual(studentBriefing.studentAlias, "S002");
assert.ok(studentBriefing.nextPlan.length >= 1);
assert.ok(studentBriefing.privacynotes.some((item) => item.includes("Tap Share")));

assert.throws(() => {store.getStudentAgentBriefing(teacherContext);}, /cannot perform read_student_agent/);

const studentAgentAnswer = store.answerStudentAgentChat({context: studentContext,
 question: "How should I read this diagram?"});
assert.ok(studentAgentAnswer.answer.includes("left-hand side"));

const studentAgentdraft = store.draftStudentAgentStuckSignal({context: studentContext,
 stuckType: "diagram stuck",
 text: "I cannot see how the left and right sides correspond."});
assert.ok(studentAgentdraft.teachersummary.includes("diagram stuck"));
assert.strictEqual(studentAgentdraft.consentRequired, true);

let studentAgentShare = store.shareStudentAgentSignal({context: studentContext,
 stuckType: "diagram stuck",
 text: "I cannot see how the left and right sides correspond."});
assert.ok(studentAgentShare.draft.teachersummary.includes("diagram stuck"));
assert.strictEqual(studentAgentShare.state.stuckSignals[0].studentAlias, "S002");
assert.ok(studentAgentShare.state.auditEvents.some((event) => event.action === "student_agent_share_to_teacher"));

state = store.recordStuckSignal({context: studentContext,
 studentAlias: "S002",
 stuckType: "formula stuck",
 note: "I do not understand how each symbol relates to the image."});
assert.strictEqual(state.stuckSignals[0].studentAlias, "S002");
assert.strictEqual(state.stuckSignals[0].stuckType, "formula stuck");
assert.strictEqual(state.messages[0].kind, "help_request");
assert.strictEqual(state.messages[0].studentAlias, "S002");
assert.ok(store.getState().stuckSignals.length >= 2);

state = store.recordquestion({context: studentContext,
 studentAlias: "S002",
 text: "How should I read the frequency domain?"});
assert.strictEqual(state.questions[0].text, "How should I read the frequency domain?");

state = store.recordCheckIn({context: studentContext,
 studentAlias: "S002",
 state: "frustrated",
 note: "This concept feels useless to me and I get more frustrated the more I look at it.",
 shareChoice: "private"});
assert.strictEqual(state.checkIns[0].studentAlias, "S002");
assert.strictEqual(state.checkIns[0].teacherVisible, false);
assert.ok(state.checkIns[0].privateReflection.includes("learning is learning"));

let teacherAfterPrivateCheckIn = store.getState(teacherContext);
assert.ok(!teacherAfterPrivateCheckIn.checkIns.some((item) => item.note === "This concept feels useless to me and I get more frustrated the more I look at it."));

state = store.recordCheckIn({context: studentContext,
 studentAlias: "S002",
 state: "want_teacher_help",
 note: "I do not understand why one signal can be split into frequencies.",
 shareChoice: "teacher_summary"});
assert.strictEqual(state.checkIns[0].teacherVisible, true);
assert.ok(state.checkIns[0].teacherHelpdraft.includes("teacher"));
assert.strictEqual(state.messages[0].kind, "help_request");

teacherAfterPrivateCheckIn = store.getState(teacherContext);
assert.strictEqual(teacherAfterPrivateCheckIn.checkIns[0].studentAlias, "S002");
assert.ok(teacherAfterPrivateCheckIn.checkIns[0].summaryForteacher.includes("pupil learningShare"));
assert.strictEqual(teacherAfterPrivateCheckIn.checkIns[0].note, undefined);
assert.strictEqual(teacherAfterPrivateCheckIn.checkIns[0].privateReflection, undefined);

state = store.updateassignment({context: studentContext,
 studentAlias: "S002",
 status: "submitted"});
assert.strictEqual(state.assignments.S002, "submitted");

state = store.recordmessage({context: studentContext,
 studentAlias: "S002",
 text: "teacher, I want to confirm how to read the right-hand frequency graph."});
assert.strictEqual(state.messages[0].senderRole, "student");
assert.strictEqual(state.messages[0].studentAlias, "S002");

state = store.recordmessage({context: teacherContext,
 studentAlias: "S002",
 text: "Look only at the two tallest frequency bars first, then return to the left-hand waveform."});
assert.strictEqual(state.messages[0].senderRole, "teacher");
assert.strictEqual(state.messages[0].studentAlias, "S002");
assert.ok(store.getState(studentContext).messages.every((message) => message.studentAlias === "S002"));

state = store.applyteacherAgentAction({context: teacherContext,
 type: "send_message",
 studentAlias: "S002",
 text: "teacher Agent test: start with the smallest visual match."});
assert.strictEqual(state.teacherAgentActions[0].type, "send_message");
assert.strictEqual(state.messages[0].kind, "teacher_agent_action");
assert.ok(store.getState(studentContext).messages.some((message) => message.text.includes("teacher Agent test")));
const linkedteacherActionId = state.teacherAgentActions[0].id;
assert.strictEqual(state.teacherAgentActions[0].studentReadAt, null);

state = store.markteacherActionRead({context: studentContext,
 studentAlias: "S002",
 actionId: linkedteacherActionId});
assert.ok(state.teacherAgentActions[0].studentReadAt);
assert.strictEqual(state.teacherAgentActions[0].studentResponseAt, null);
assert.ok(state.auditEvents.some((event) => event.action === "teacher_agent_action_read"));

state = store.recordmessage({context: studentContext,
 studentAlias: "S002",
 text: "This helped me understand the visual match.",
 kind: "teacher_action_response",
 linkedteacherActionId,
 responseType: "improved"});
assert.strictEqual(state.messages[0].linkedteacherActionId, linkedteacherActionId);
assert.strictEqual(state.messages[0].responseType, "improved");
assert.strictEqual(state.teacherAgentActions[0].studentResponseType, "improved");
assert.ok(state.teacherAgentActions[0].studentResponseAt);

state = store.recordStuckSignal({context: studentContext,
 studentAlias: "S002",
 stuckType: "After teacher actionlearningStuck signal",
 note: "I still need a smaller step after that teacher action.",
 linkedteacherActionId,
 responseType: "still_stuck"});
assert.strictEqual(state.stuckSignals[0].linkedteacherActionId, linkedteacherActionId);
assert.strictEqual(state.stuckSignals[0].responseType, "still_stuck");
assert.strictEqual(state.teacherAgentActions[0].studentResponseType, "still_stuck");

state = store.applyteacherAgentAction({context: teacherContext,
 type: "assign_material",
 studentAlias: "S002",
 material: {id: "material-draft-test",
 title: "teacher Agent test material",
 type: "Handout + diagram",
 topic: "Wave mechanics",
 targetLevel: "Level 2",
 goal: "Use one diagram to connect wave shape and frequency bars."}});
assert.strictEqual(state.teacherAgentActions[0].type, "assign_material");
assert.strictEqual(store.getState(studentContext).teacherAgentActions[0].material.title, "teacher Agent test material");

assert.throws(() => {store.applyteacherAgentAction({context: studentContext,
 type: "send_message",
 studentAlias: "S002",
 text: "Student should not be able to approve teacher actions."});}, /cannot perform apply_teacher_agent_action/);

assert.throws(() => {store.recordquestion({context: studentContext,
 studentAlias: "S009",
 text: "I should not be able to write another student's record."});}, /own alias/);

assert.throws(() => {store.recordCheckIn({context: studentContext,
 studentAlias: "S009",
 state: "stuck",
 note: "This should not write another student's check-in.",
 shareChoice: "teacher_summary"});}, /own alias/);

assert.throws(() => {store.recordmessage({context: studentContext,
 studentAlias: "S009",
 text: "This should not write another student's message thread."});}, /own alias/);

const persisted = JSON.parse(fs.readFileSync(store.stateFile, "utf8"));
assert.strictEqual(persisted.assignments.S002, "submitted");
assert.strictEqual(persisted.stuckSignals[0].studentAlias, "S002");
assert.strictEqual(persisted.stuckSignals[0].linkedteacherActionId, linkedteacherActionId);
assert.strictEqual(persisted.checkIns[0].studentAlias, "S002");
assert.ok(persisted.messages.some((message) => message.senderRole === "teacher"));
assert.ok(persisted.messages.some((message) => message.linkedteacherActionId === linkedteacherActionId));
assert.strictEqual(persisted.teacherAgentActions[0].type, "assign_material");
const persistedLinkedAction = persisted.teacherAgentActions.find((item) => item.id === linkedteacherActionId);
assert.strictEqual(persistedLinkedAction.studentResponseType, "still_stuck");
assert.ok(persistedLinkedAction.studentReadAt);

fs.rmSync(tempDir, {recursive: true, force: true});
console.log("workspace store tests passed");
