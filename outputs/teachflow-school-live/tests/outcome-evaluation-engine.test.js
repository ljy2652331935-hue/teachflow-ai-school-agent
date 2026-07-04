const assert = require("assert");
const workspaceState = require("../workspace-state.js");
const outcomeEvaluationEngine = require("../outcome-evaluation-engine.js");

const teacherContext = {role: "teacher",
 userId: "teacher-lin",
 classId: "class-physics-a"};

const now = Date.now();
const minutesAgo = (minutes) => new Date(now - minutes * 60 * 1000).toISOString();
const minutesFromNow = (minutes) => new Date(now + minutes * 60 * 1000).toISOString();

const state = workspaceState.scopedStateForContext({...workspaceState.createDefaultState(),
 activeclassId: "class-physics-a",
 className: "Outcome Test class",
 topic: "Fourier transform",
 classes: [{id: "class-physics-a",
 name: "Outcome Test class",
 course: "Physics",
 topic: "Fourier transform",
 teacherIds: ["teacher-lin"],
 studentAliases: ["S002", "S014", "S009"],
 status: "active"}],
 students: [{id: "S002",
 status: "Developing",
 level: "Level 2",
 stuck: "diagram stuck",
 next: "Check left and right visual match.",
 evidence: "Student replied with improved signal.",
 memory: ""},
 {id: "S014",
 status: "needs support",
 level: "Level 1",
 stuck: "diagram stuck",
 next: "Use a smaller diagram.",
 evidence: "Student still cannot read the frequency bars.",
 memory: ""},
 {id: "S009",
 status: "Monitoring",
 level: "Level 2",
 stuck: "formula stuck",
 next: "Wait for follow-up signal.",
 evidence: "",
 memory: ""}],
 assignments: {S002: "draft not submitted",
 S014: "draft not submitted",
 S009: "submitted"},
 questions: [],
 stuckSignals: [{id: "stuck-after-action",
 studentAlias: "S014",
 stuckType: "diagram stuck",
 note: "After the teacher sent the material, I still cannot read the right-hand frequency bars.",
 createdAt: minutesAgo(5)},
 {id: "stuck-unlinked-after-linked-response",
 studentAlias: "S002",
 stuckType: "later unrelated stuck signal",
 note: "This later unlinked signal should not override the explicit teacher action response.",
 createdAt: minutesAgo(2)}],
 checkIns: [],
 messages: [{id: "message-after-action",
 threadId: "thread-S002",
 studentAlias: "S002",
 senderRole: "student",
 senderId: "S002",
 senderLabel: "S002",
 text: "teacher, I have looked at this task.",
 kind: "chat",
 linkedteacherActionId: "teacher-action-positive",
 responseType: "improved",
 createdAt: minutesAgo(40)}],
 teacherAgentActions: [{id: "teacher-action-positive",
 type: "send_message",
 status: "sent",
 studentAlias: "S002",
 classId: "class-physics-a",
 title: "send support message to S002",
 detail: "Look at the left-right diagram correspondence first.",
 studentVisible: true,
 studentReadAt: minutesAgo(29),
 studentResponseAt: minutesAgo(28),
 studentResponseType: "improved",
 createdAt: minutesAgo(30)},
 {id: "teacher-action-followup",
 type: "assign_material",
 status: "assigned",
 studentAlias: "S014",
 classId: "class-physics-a",
 title: "Assign diagram material to S014",
 detail: "Use one diagram to connect the waveform and frequency bars.",
 material: {id: "material-test",
 title: "diagram mapping remediation material",
 type: "Handout + diagram",
 topic: "Wave mechanics",
 targetLevel: "Level 2",
 goal: "Connect the left and right diagrams."},
 studentVisible: true,
 createdAt: minutesAgo(30)},
 {id: "teacher-action-waiting",
 type: "schedule_followup",
 status: "scheduled",
 studentAlias: "S009",
 classId: "class-physics-a",
 title: "Short follow-up S009",
 detail: "confirm whether formula meaning is stable.",
 studentVisible: true,
 createdAt: minutesFromNow(1)}],
 auditEvents: []}, teacherContext);

const outcome = outcomeEvaluationEngine.buildOutcomeEvaluation(state, {context: teacherContext});

assert.strictEqual(outcome.engineId, "outcome-evaluation-engine");
assert.strictEqual(outcome.metrics.actionCount, 3);
assert.strictEqual(outcome.metrics.improvedCount, 1);
assert.strictEqual(outcome.metrics.needsFollowupCount, 1);
assert.strictEqual(outcome.metrics.waitingSignalCount, 1);
assert.ok(outcome.summary.includes("Tracked 3 teacher actions"));

const improved = outcome.evaluations.find((item) => item.studentAlias === "S002");
assert.strictEqual(improved.status, "improved");
assert.ok(improved.evidence.some((item) => item.source === "student_message"));
assert.ok(improved.evidence.some((item) => item.relation === "linked"));

const followup = outcome.evaluations.find((item) => item.studentAlias === "S014");
assert.strictEqual(followup.status, "needs_followup");
assert.ok(followup.recommendation.includes("Suggested"));
assert.ok(outcome.nextteacherActions.some((item) => item.studentAlias === "S014"));

const waiting = outcome.evaluations.find((item) => item.studentAlias === "S009");
assert.strictEqual(waiting.status, "no_later_signal");

console.log("outcome evaluation engine tests passed");
