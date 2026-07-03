const assert = require("assert");
const workspaceState = require("../workspace-state.js");
const teacherAgentOrchestrator = require("../teacher-agent-orchestrator.js");

const teacherContext = {
  role: "teacher",
  userId: "teacher-test",
  classId: "class-test"
};

const state = workspaceState.scopedStateForContext(
  {
    ...workspaceState.createDefaultState(),
    activeClassId: "class-test",
    className: "System Test Class",
    topic: "Electrons and current",
    classes: [{
      id: "class-test",
      name: "System Test Class",
      course: "Physics",
      topic: "Electrons and current",
      teacherIds: ["teacher-test"],
      studentAliases: ["S001", "S002"],
      status: "active"
    }],
    students: [
      {
        id: "S001",
        status: "需要支持",
        level: "Level 1",
        stuck: "definition_gap",
        next: "Use a concrete picture of an electron before current.",
        evidence: "I still do not know what an electron is.",
        memory: "Student asked for a smaller explanation."
      },
      {
        id: "S002",
        status: "部分理解",
        level: "Level 2",
        stuck: "diagram_gap",
        next: "Connect picture and formula.",
        evidence: "I can follow examples but not diagrams.",
        memory: "Student needs visual support."
      }
    ],
    assignments: {
      S001: "not submitted",
      S002: "submitted"
    },
    questions: [{
      id: "question-test",
      studentAlias: "S001",
      text: "I still do not know what an electron is.",
      createdAt: new Date().toISOString()
    }],
    stuckSignals: [{
      id: "stuck-test",
      studentAlias: "S001",
      stuckType: "definition_gap",
      note: "I need a smaller explanation of electron.",
      createdAt: new Date().toISOString()
    }],
    checkIns: [{
      id: "checkin-test",
      studentAlias: "S001",
      state: "want_teacher_help",
      summaryForTeacher: "Student agreed to share: needs help understanding electron.",
      teacherVisible: true,
      createdAt: new Date().toISOString()
    }],
    messages: [],
    teacherAgentActions: []
  },
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
