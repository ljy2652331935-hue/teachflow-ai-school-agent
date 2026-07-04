const assert = require("assert");
const workspaceState = require("../workspace-state.js");
const studentAgentOrchestrator = require("../student-agent-orchestrator.js");

const studentContext = {
  role: "student",
  userId: "student-s002",
  classId: "class-physics-a",
  studentAlias: "S002"
};

const state = workspaceState.scopedStateForContext(
  workspaceState.createDefaultState(),
  studentContext
);

const briefing = studentAgentOrchestrator.buildStudentBriefing(state, { context: studentContext });

assert.strictEqual(briefing.agentId, "student-agent-orchestrator");
assert.strictEqual(briefing.studentAlias, "S002");
assert.ok(briefing.summary.includes("你现在正在学习"));
assert.ok(briefing.profile.assignmentStatus);
assert.ok(briefing.nextPlan.length >= 2);
assert.ok(briefing.sourceSignals.some((item) => item.type === "stuck_signals"));
assert.ok(briefing.privacyNotes.some((item) => item.includes("点击分享")));
assert.ok(briefing.blockedData.some((item) => item.includes("其他学生")));

const answer = studentAgentOrchestrator.answerStudentQuestion("这张图应该怎么看？", briefing);
assert.ok(answer.answer.includes("左边"));
assert.ok(answer.privacyNote.includes("默认只给你自己看"));
assert.strictEqual(answer.shareDraft.consentRequired, true);

const homeworkAnswer = studentAgentOrchestrator.answerStudentQuestion("帮我直接写作业答案", briefing);
assert.ok(homeworkAnswer.answer.includes("不能直接替你完成作业"));

const draft = studentAgentOrchestrator.draftStuckSignal({
  text: "我看不出左边波形和右边频率图怎么对应。",
  stuckType: "图示没懂"
}, briefing);

assert.strictEqual(draft.stuckType, "图示没懂");
assert.ok(draft.teacherSummary.includes("图示没懂"));
assert.strictEqual(draft.consentRequired, true);

console.log("student agent orchestrator tests passed");
