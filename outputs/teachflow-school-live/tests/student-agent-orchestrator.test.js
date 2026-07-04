const assert = require("assert");
const workspaceState = require("../workspace-state.js");
const studentAgentOrchestrator = require("../student-agent-orchestrator.js");

const studentContext = {role: "student",
 userId: "student-s002",
 classId: "class-physics-a",
 studentAlias: "S002"};

const state = workspaceState.scopedStateForContext(workspaceState.createDefaultState(),
 studentContext);

const briefing = studentAgentOrchestrator.buildStudentBriefing(state, {context: studentContext});

assert.strictEqual(briefing.agentId, "student-agent-orchestrator");
assert.strictEqual(briefing.studentAlias, "S002");
assert.ok(briefing.summary.includes("you are currently learning"));
assert.ok(briefing.profile.assignmentstatus);
assert.ok(briefing.nextPlan.length >= 2);
assert.ok(briefing.sourceSignals.some((item) => item.type === "stuck_signals"));
assert.ok(briefing.privacynotes.some((item) => item.includes("Tap Share")));
assert.ok(briefing.blockedData.some((item) => item.includes("other pupils")));

const answer = studentAgentOrchestrator.answerStudentquestion("How should I read this diagram?", briefing);
assert.ok(answer.answer.includes("left-hand side"));
assert.ok(answer.privacyNote.includes("private to you by default"));
assert.strictEqual(answer.sharedraft.consentRequired, true);

const homeworkAnswer = studentAgentOrchestrator.answerStudentquestion("write the assignment answer for me", briefing);
assert.ok(homeworkAnswer.answer.includes("cannot complete the assignment for you"));

const draft = studentAgentOrchestrator.draftStuckSignal({text: "I cannot see how the left-hand waveform and right-hand frequency graph correspond.",
 stuckType: "diagram stuck"}, briefing);

assert.strictEqual(draft.stuckType, "diagram stuck");
assert.ok(draft.teachersummary.includes("diagram stuck"));
assert.strictEqual(draft.consentRequired, true);

console.log("student agent orchestrator tests passed");
