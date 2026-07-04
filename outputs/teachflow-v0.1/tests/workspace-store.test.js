const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "teachflow-workspace-store-"));
process.env.TEACHFLOW_WORKSPACE_FILE = path.join(tempDir, "workspace-state.json");

const store = require("../workspace-store.js");

let state = store.resetState();
assert.ok(Array.isArray(state.students));
assert.ok(state.students.some((student) => student.id === "S002"));

const teacherContext = {
  role: "teacher",
  userId: "teacher-lin",
  classId: "class-physics-a"
};
const studentContext = {
  role: "student",
  userId: "student-s002",
  classId: "class-physics-a",
  studentAlias: "S002"
};

const teacherView = store.getState(teacherContext);
assert.ok(teacherView.students.length > 1);

const studentView = store.getState(studentContext);
assert.strictEqual(studentView.students.length, 1);
assert.strictEqual(studentView.students[0].id, "S002");
assert.strictEqual(studentView.accessBoundary.canReadAllStudents, false);

const teacherBriefing = store.getTeacherAgentBriefing(teacherContext);
assert.strictEqual(teacherBriefing.agentId, "teacher-agent-orchestrator");
assert.strictEqual(teacherBriefing.session.role, "teacher");
assert.ok(teacherBriefing.priorityTasks.length >= 1);
assert.strictEqual(teacherBriefing.canAutoPublish, false);

assert.throws(() => {
  store.getTeacherAgentBriefing(studentContext);
}, /cannot perform read_teacher_agent/);

const studentBriefing = store.getStudentAgentBriefing(studentContext);
assert.strictEqual(studentBriefing.agentId, "student-agent-orchestrator");
assert.strictEqual(studentBriefing.studentAlias, "S002");
assert.ok(studentBriefing.nextPlan.length >= 1);
assert.ok(studentBriefing.privacyNotes.some((item) => item.includes("点击分享")));

assert.throws(() => {
  store.getStudentAgentBriefing(teacherContext);
}, /cannot perform read_student_agent/);

const studentAgentAnswer = store.answerStudentAgentChat({
  context: studentContext,
  question: "这张图怎么看？"
});
assert.ok(studentAgentAnswer.answer.includes("左边"));

const studentAgentDraft = store.draftStudentAgentStuckSignal({
  context: studentContext,
  stuckType: "图示没懂",
  text: "我看不懂左右两边怎么对应。"
});
assert.ok(studentAgentDraft.teacherSummary.includes("图示没懂"));
assert.strictEqual(studentAgentDraft.consentRequired, true);

let studentAgentShare = store.shareStudentAgentSignal({
  context: studentContext,
  stuckType: "图示没懂",
  text: "我看不懂左右两边怎么对应。"
});
assert.ok(studentAgentShare.draft.teacherSummary.includes("图示没懂"));
assert.strictEqual(studentAgentShare.state.stuckSignals[0].studentAlias, "S002");
assert.ok(studentAgentShare.state.auditEvents.some((event) => event.action === "student_agent_share_to_teacher"));

state = store.recordStuckSignal({
  context: studentContext,
  studentAlias: "S002",
  stuckType: "公式没懂",
  note: "我不明白每个符号和图像有什么关系。"
});
assert.strictEqual(state.stuckSignals[0].studentAlias, "S002");
assert.strictEqual(state.stuckSignals[0].stuckType, "公式没懂");
assert.strictEqual(state.messages[0].kind, "help_request");
assert.strictEqual(state.messages[0].studentAlias, "S002");
assert.ok(store.getState().stuckSignals.length >= 6);

state = store.recordQuestion({
  context: studentContext,
  studentAlias: "S002",
  text: "频域到底怎么看？"
});
assert.strictEqual(state.questions[0].text, "频域到底怎么看？");

state = store.recordCheckIn({
  context: studentContext,
  studentAlias: "S002",
  state: "frustrated",
  note: "我觉得这个概念没用，越看越挫败。",
  shareChoice: "private"
});
assert.strictEqual(state.checkIns[0].studentAlias, "S002");
assert.strictEqual(state.checkIns[0].teacherVisible, false);
assert.ok(state.checkIns[0].privateReflection.includes("不是笨"));

let teacherAfterPrivateCheckIn = store.getState(teacherContext);
assert.ok(!teacherAfterPrivateCheckIn.checkIns.some((item) => item.note === "我觉得这个概念没用，越看越挫败。"));

state = store.recordCheckIn({
  context: studentContext,
  studentAlias: "S002",
  state: "want_teacher_help",
  note: "我不理解为什么可以把一个信号拆成频率。",
  shareChoice: "teacher_summary"
});
assert.strictEqual(state.checkIns[0].teacherVisible, true);
assert.ok(state.checkIns[0].teacherHelpDraft.includes("我想请老师"));
assert.strictEqual(state.messages[0].kind, "help_request");

teacherAfterPrivateCheckIn = store.getState(teacherContext);
assert.strictEqual(teacherAfterPrivateCheckIn.checkIns[0].studentAlias, "S002");
assert.ok(teacherAfterPrivateCheckIn.checkIns[0].summaryForTeacher.includes("学生同意分享"));
assert.strictEqual(teacherAfterPrivateCheckIn.checkIns[0].note, undefined);
assert.strictEqual(teacherAfterPrivateCheckIn.checkIns[0].privateReflection, undefined);

state = store.updateAssignment({
  context: studentContext,
  studentAlias: "S002",
  status: "已提交"
});
assert.strictEqual(state.assignments.S002, "已提交");

state = store.recordMessage({
  context: studentContext,
  studentAlias: "S002",
  text: "老师，我想确认右边频率图怎么读。"
});
assert.strictEqual(state.messages[0].senderRole, "student");
assert.strictEqual(state.messages[0].studentAlias, "S002");

state = store.recordMessage({
  context: teacherContext,
  studentAlias: "S002",
  text: "先只看最高的两个频率柱，再回到左边波形。"
});
assert.strictEqual(state.messages[0].senderRole, "teacher");
assert.strictEqual(state.messages[0].studentAlias, "S002");
assert.ok(store.getState(studentContext).messages.every((message) => message.studentAlias === "S002"));

state = store.applyTeacherAgentAction({
  context: teacherContext,
  type: "send_message",
  studentAlias: "S002",
  text: "Teacher Agent test: start with the smallest visual match."
});
assert.strictEqual(state.teacherAgentActions[0].type, "send_message");
assert.strictEqual(state.messages[0].kind, "teacher_agent_action");
assert.ok(store.getState(studentContext).messages.some((message) => message.text.includes("Teacher Agent test")));
const linkedTeacherActionId = state.teacherAgentActions[0].id;
assert.strictEqual(state.teacherAgentActions[0].studentReadAt, null);

state = store.markTeacherActionRead({
  context: studentContext,
  studentAlias: "S002",
  actionId: linkedTeacherActionId
});
assert.ok(state.teacherAgentActions[0].studentReadAt);
assert.strictEqual(state.teacherAgentActions[0].studentResponseAt, null);
assert.ok(state.auditEvents.some((event) => event.action === "teacher_agent_action_read"));

state = store.recordMessage({
  context: studentContext,
  studentAlias: "S002",
  text: "This helped me understand the visual match.",
  kind: "teacher_action_response",
  linkedTeacherActionId,
  responseType: "improved"
});
assert.strictEqual(state.messages[0].linkedTeacherActionId, linkedTeacherActionId);
assert.strictEqual(state.messages[0].responseType, "improved");
assert.strictEqual(state.teacherAgentActions[0].studentResponseType, "improved");
assert.ok(state.teacherAgentActions[0].studentResponseAt);

state = store.recordStuckSignal({
  context: studentContext,
  studentAlias: "S002",
  stuckType: "老师动作后仍有卡点",
  note: "I still need a smaller step after that teacher action.",
  linkedTeacherActionId,
  responseType: "still_stuck"
});
assert.strictEqual(state.stuckSignals[0].linkedTeacherActionId, linkedTeacherActionId);
assert.strictEqual(state.stuckSignals[0].responseType, "still_stuck");
assert.strictEqual(state.teacherAgentActions[0].studentResponseType, "still_stuck");

state = store.applyTeacherAgentAction({
  context: teacherContext,
  type: "assign_material",
  studentAlias: "S002",
  material: {
    id: "material-draft-test",
    title: "Teacher Agent test material",
    type: "讲义 + 图示",
    topic: "傅里叶变换",
    targetLevel: "Level 2",
    goal: "Use one diagram to connect wave shape and frequency bars."
  }
});
assert.strictEqual(state.teacherAgentActions[0].type, "assign_material");
assert.strictEqual(store.getState(studentContext).teacherAgentActions[0].material.title, "Teacher Agent test material");

assert.throws(() => {
  store.applyTeacherAgentAction({
    context: studentContext,
    type: "send_message",
    studentAlias: "S002",
    text: "Student should not be able to approve teacher actions."
  });
}, /cannot perform apply_teacher_agent_action/);

assert.throws(() => {
  store.recordQuestion({
    context: studentContext,
    studentAlias: "S009",
    text: "I should not be able to write another student's record."
  });
}, /own alias/);

assert.throws(() => {
  store.recordCheckIn({
    context: studentContext,
    studentAlias: "S009",
    state: "stuck",
    note: "This should not write another student's check-in.",
    shareChoice: "teacher_summary"
  });
}, /own alias/);

assert.throws(() => {
  store.recordMessage({
    context: studentContext,
    studentAlias: "S009",
    text: "This should not write another student's message thread."
  });
}, /own alias/);

const persisted = JSON.parse(fs.readFileSync(store.stateFile, "utf8"));
assert.strictEqual(persisted.assignments.S002, "已提交");
assert.strictEqual(persisted.stuckSignals[0].studentAlias, "S002");
assert.strictEqual(persisted.stuckSignals[0].linkedTeacherActionId, linkedTeacherActionId);
assert.strictEqual(persisted.checkIns[0].studentAlias, "S002");
assert.ok(persisted.messages.some((message) => message.senderRole === "teacher"));
assert.ok(persisted.messages.some((message) => message.linkedTeacherActionId === linkedTeacherActionId));
assert.strictEqual(persisted.teacherAgentActions[0].type, "assign_material");
const persistedLinkedAction = persisted.teacherAgentActions.find((item) => item.id === linkedTeacherActionId);
assert.strictEqual(persistedLinkedAction.studentResponseType, "still_stuck");
assert.ok(persistedLinkedAction.studentReadAt);

fs.rmSync(tempDir, { recursive: true, force: true });
console.log("workspace store tests passed");
