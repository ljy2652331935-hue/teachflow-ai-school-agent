const assert = require("assert");
const workspaceState = require("../workspace-state.js");
const teacherAgentOrchestrator = require("../teacher-agent-orchestrator.js");

const teacherContext = {role: "teacher",
 userId: "teacher-test",
 classId: "class-test"};

const state = workspaceState.scopedStateForContext({...workspaceState.createDefaultState(),
 activeclassId: "class-test",
 className: "System Test class",
 topic: "Electrons and current",
 classes: [{id: "class-test",
 name: "System Test class",
 course: "Physics",
 topic: "Electrons and current",
 teacherIds: ["teacher-test"],
 studentAliases: ["S001", "S002"],
 status: "active"}],
 students: [{id: "S001",
 status: "needs support",
 level: "Level 1",
 stuck: "definition_gap",
 next: "Use a concrete picture of an electron before current.",
 evidence: "I still do not know what an electron is.",
 memory: "Student asked for a smaller explanation."},
 {id: "S002",
 status: "Developing",
 level: "Level 2",
 stuck: "diagram_gap",
 next: "Connect picture and formula.",
 evidence: "I can follow examples but not diagrams.",
 memory: "Student needs visual support."}],
 assignments: {S001: "not submitted",
 S002: "submitted"},
 questions: [{id: "question-test",
 studentAlias: "S001",
 text: "I still do not know what an electron is.",
 createdAt: new Date().toISOString()}],
 stuckSignals: [{id: "stuck-test",
 studentAlias: "S001",
 stuckType: "definition_gap",
 note: "I need a smaller explanation of electron.",
 createdAt: new Date().toISOString()}],
 checkIns: [{id: "checkin-test",
 studentAlias: "S001",
 state: "want_teacher_help",
 summaryForteacher: "Student agreed to share: needs help understanding electron.",
 teacherVisible: true,
 createdAt: new Date().toISOString()}],
 messages: [],
 teacherAgentActions: []},
 teacherContext);

const briefing = teacherAgentOrchestrator.buildteacherBriefing(state, {context: teacherContext});

assert.strictEqual(briefing.agentId, "teacher-agent-orchestrator");
assert.strictEqual(briefing.session.role, "teacher");
assert.strictEqual(briefing.canAutopublish, false);
assert.ok(briefing.summary.includes("coordinator agent"));
assert.ok(briefing.insight.totalStudents > 0);
assert.ok(briefing.sourceSignals.some((item) => item.type === "stuck_signals"));
assert.strictEqual(briefing.outcomeEvaluation.engineId, "outcome-evaluation-engine");
assert.ok(briefing.toolCalls.some((item) => item.name === "evaluateLearningOutcomes"));
assert.ok(briefing.toolCalls.some((item) => item.name === "applysafetyAndPrivacyRules"));
assert.ok(briefing.priorityTasks.length >= 1);
assert.ok(briefing.misconceptions.length >= 1);
assert.ok(briefing.studentFocus.length >= 1);
assert.ok(briefing.materialdrafts.every((item) => item.approvalRequired));
assert.ok(briefing.messagedrafts.every((item) => item.approvalRequired));
assert.ok(briefing.safetynotes.some((item) => item.includes("Alias")));

const studentAnswer = teacherAgentOrchestrator.answerteacherAgentquestion("Which pupils should be reviewed first?", briefing);
assert.ok(studentAnswer.includes("Suggested review first"));

const sourceAnswer = teacherAgentOrchestrator.answerteacherAgentquestion("What is the evidence?", briefing);
assert.ok(sourceAnswer.includes("unified data layer"));

const outcomeAnswer = teacherAgentOrchestrator.answerteacherAgentquestion("Are teacher actions working?", briefing);
assert.ok(outcomeAnswer.includes("outcome") || outcomeAnswer.includes("action"));

console.log("teacher agent orchestrator tests passed");
