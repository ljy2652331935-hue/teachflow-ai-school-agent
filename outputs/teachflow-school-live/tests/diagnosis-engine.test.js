const assert = require("assert");
const engine = require("../diagnosis-engine.js");

const csv = `student_id,answer,confidence
S001,"Fourier Transform is just a formula for waves",2
S002,"It turns time into frequency but I don't know why",2
S003,"It decomposes sound into simple waves like notes",4
S004,"I don't see why this matters for physics",1
S005,"It changes a signal into another signal",2
S006,"It is like splitting music into different frequencies",4
S007,"I remember the equation but I don't understand what it means",2
S008,"Frequency domain shows what frequencies are inside the signal",5`;

const responses = engine.parseQuizResponses(csv);
assert.strictEqual(responses.length, 8);
assert.deepStrictEqual(responses.map((response) => response.student_alias), ["S001",
 "S002",
 "S003",
 "S004",
 "S005",
 "S006",
 "S007",
 "S008"]);

const analysis = engine.diagnoseUnderstanding({topic: "Fourier Transform",
 learning_objectives: [],
 lesson_material: "",
 quiz_responses: responses});

assert.strictEqual(analysis.topic, "Fourier Transform");
assert.ok(analysis.class_understanding_summary.includes("Developing"));
assert.ok(analysis.misconceptions.length >= 3);

const formulaOnly = analysis.misconceptions.find((item) => item.id === "formula-only");
assert.ok(formulaOnly);
assert.strictEqual(formulaOnly.severity, "high");
assert.deepStrictEqual(formulaOnly.affected_students, ["S001", "S007"]);
assert.ok(formulaOnly.evidence_quotes.some((evidence) => evidence.quote === "Fourier Transform is just a formula for waves"));

analysis.misconceptions.forEach((misconception) => {assert.ok(misconception.evidence_quotes.length > 0);});

const validation = engine.validateAnalysis(analysis, responses);
assert.strictEqual(validation.valid, true);
assert.deepStrictEqual(validation.issues, []);

console.log("diagnosis engine tests passed");
