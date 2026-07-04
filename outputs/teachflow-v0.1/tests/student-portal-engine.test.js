const assert = require("assert");
const diagnosisEngine = require("../diagnosis-engine.js");
const interventionEngine = require("../intervention-engine.js");
const memoryEngine = require("../memory-engine.js");
const studentPortalEngine = require("../student-portal-engine.js");

const csv = `student_id,answer,confidence
S001,"Fourier Transform is just a formula for waves",2
S002,"It turns time into frequency but I don't know why",2
S003,"It decomposes sound into simple waves like notes",4
S008,"Frequency domain shows what frequencies are inside the signal",5`;

const responses = diagnosisEngine.parseQuizResponses(csv);
const analysis = diagnosisEngine.diagnoseUnderstanding({
  topic: "Fourier Transform",
  learning_objectives: ["Explain Fourier Transform conceptually."],
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

assert.strictEqual(assignments.length, memories.length);
assert.ok(assignments.every((assignment) => /^S\d{3}$/.test(assignment.student_alias)));

const s002Assignment = assignments.find((assignment) => assignment.student_alias === "S002");
const assignedMaterial = studentPortalEngine.getAssignedMaterial({ assignment: s002Assignment, intervention });
assert.strictEqual(assignedMaterial.student_alias, "S002");
assert.ok(assignedMaterial.micro_quiz.length >= 1);
assert.ok(assignedMaterial.student_facing_material.body.includes("信号"));

const reflection = studentPortalEngine.createReflection({
  topic_id: "topic-fourier",
  student_alias: "S002",
  prompt: "Explain the idea in your own words.",
  response: "It shows the frequencies inside the same signal."
});
assert.strictEqual(reflection.student_alias, "S002");

const attempt = studentPortalEngine.createMicroQuizAttempt({
  intervention_id: intervention.intervention_id,
  topic_id: "topic-fourier",
  student_alias: "S002",
  answers: [{ question_id: "q1", answer: "It identifies frequency components." }]
});
assert.strictEqual(attempt.answers.length, 1);

const summary = studentPortalEngine.summariseSubmissions({
  reflections: [reflection],
  micro_quiz_attempts: [attempt]
});
assert.strictEqual(summary[0].student_alias, "S002");
assert.strictEqual(summary[0].reflection_count, 1);
assert.strictEqual(summary[0].micro_quiz_attempt_count, 1);

console.log("student portal engine tests passed");
