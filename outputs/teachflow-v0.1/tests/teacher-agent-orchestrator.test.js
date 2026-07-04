const assert = require("assert");
const workspaceState = require("../workspace-state.js");
const teacherAgentOrchestrator = require("../teacher-agent-orchestrator.js");

const teacherContext = {
  role: "teacher",
  userId: "teacher-lin",
  classId: "class-physics-a"
};

const state = workspaceState.scopedStateForContext(
  workspaceState.createDefaultState(),
  teacherContext
);

const briefing = teacherAgentOrchestrator.buildTeacherBriefing(state, { context: teacherContext });

assert.strictEqual(briefing.agentId, "teacher-agent-orchestrator");
assert.strictEqual(briefing.session.role, "teacher");
assert.strictEqual(briefing.canAutoPublish, false);
assert.ok(briefing.summary.includes("总控 Agent"));
assert.ok(briefing.insight.totalStudents > 0);
assert.ok(briefing.sourceSignals.some((item) => item.type === "stuck_signals"));
assert.strictEqual(briefing.outcomeEvaluation.engineId, "outcome-evaluation-engine");
assert.ok(briefing.toolCalls.some((item) => item.name === "evaluateLearningOutcomes"));
assert.ok(briefing.toolCalls.some((item) => item.name === "applySafetyAndPrivacyRules"));
assert.ok(briefing.priorityTasks.length >= 1);
assert.ok(briefing.misconceptions.length >= 1);
assert.ok(briefing.studentFocus.length >= 1);
assert.ok(briefing.materialDrafts.every((item) => item.approvalRequired));
assert.ok(briefing.messageDrafts.every((item) => item.approvalRequired));
assert.ok(briefing.safetyNotes.some((item) => item.includes("别名")));

const studentAnswer = teacherAgentOrchestrator.answerTeacherAgentQuestion("哪些学生要优先看？", briefing);
assert.ok(studentAnswer.includes("建议先看"));

const sourceAnswer = teacherAgentOrchestrator.answerTeacherAgentQuestion("依据是什么？", briefing);
assert.ok(sourceAnswer.includes("统一数据层"));

const outcomeAnswer = teacherAgentOrchestrator.answerTeacherAgentQuestion("老师动作有没有效果？", briefing);
assert.ok(outcomeAnswer.includes("成效") || outcomeAnswer.includes("动作"));

console.log("teacher agent orchestrator tests passed");
