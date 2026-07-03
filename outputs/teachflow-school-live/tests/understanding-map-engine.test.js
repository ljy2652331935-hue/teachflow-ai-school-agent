const assert = require("assert");
const diagnosisEngine = require("../diagnosis-engine.js");
const interventionEngine = require("../intervention-engine.js");
const memoryEngine = require("../memory-engine.js");
const studentPortalEngine = require("../student-portal-engine.js");
const understandingMapEngine = require("../understanding-map-engine.js");

const csv = `student_id,answer,confidence
S001,"Fourier Transform is just a formula for waves",2
S002,"It turns time into frequency but I don't know why",2
S003,"It decomposes sound into simple waves like notes",4`;

const responses = diagnosisEngine.parseQuizResponses(csv);
const analysis = diagnosisEngine.diagnoseUnderstanding({
  topic: "Fourier Transform",
  learning_objectives: ["Explain time and frequency domain views"],
  lesson_material: "Fourier Transform represents the same signal by frequency components.",
  quiz_responses: responses
});
const intervention = interventionEngine.generateIntervention({ analysis });
const memories = memoryEngine.generateStudentMemories({ analysis, intervention, topic_id: "topic-fourier" });
const assignments = studentPortalEngine.createAssignments({
  intervention,
  student_memories: memories,
  topic_id: "topic-fourier"
});
const s002Assignment = assignments.find((assignment) => assignment.student_alias === "S002");
const assignedMaterial = studentPortalEngine.getAssignedMaterial({ assignment: s002Assignment, intervention });

const reflection = studentPortalEngine.createReflection({
  topic_id: "topic-fourier",
  student_alias: "S002",
  prompt: "Explain this concept in your own words.",
  response: "It is another way to represent the same signal."
});
const attempt = studentPortalEngine.createMicroQuizAttempt({
  intervention_id: intervention.intervention_id,
  topic_id: "topic-fourier",
  student_alias: "S002",
  answers: [{ question_id: "question-1", answer: "It finds frequency components in the signal." }]
});
const stuckSignal = understandingMapEngine.createStuckSignal({
  topic_id: "topic-fourier",
  student_alias: "S002",
  stuck_type: "diagram",
  free_text: "I do not know which side is time domain."
});

const nodes = understandingMapEngine.createUnderstandingMap({
  student_memories: memories,
  analysis,
  intervention,
  reflections: [reflection],
  micro_quiz_attempts: [attempt],
  stuck_signals: [stuckSignal],
  topic_id: "topic-fourier"
});

assert.ok(nodes.length >= memories.length);
assert.ok(nodes.every((node) => /^S\d{3}$/.test(node.student_alias)));
assert.ok(nodes.some((node) => node.student_alias === "S002" && node.status === "needs_support"));
assert.ok(nodes.some((node) => node.evidence.some((item) => item.includes("最新反思"))));

const summary = understandingMapEngine.summariseClassMap({
  nodes,
  stuck_signals: [stuckSignal]
});
const s002Summary = summary.find((item) => item.student_alias === "S002");
assert.strictEqual(s002Summary.latest_stuck_type, "diagram");
assert.ok(s002Summary.needs_support_count >= 1);

const alternate = understandingMapEngine.createAlternateExplanation({
  memory: memories.find((memory) => memory.student_alias === "S002"),
  assigned_material: assignedMaterial,
  latest_stuck_signal: stuckSignal
});
assert.strictEqual(alternate.student_alias, "S002");
assert.ok(alternate.explanation.includes("图"));
assert.ok(alternate.next_prompt.includes("一句话"));

console.log("understanding map engine tests passed");
