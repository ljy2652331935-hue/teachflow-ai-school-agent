const assert = require("assert");
const diagnosisEngine = require("../diagnosis-engine.js");
const interventionEngine = require("../intervention-engine.js");

const csv = `student_id,answer,confidence
S001,"Fourier Transform is just a formula for waves",2
S002,"It turns time into frequency but I don't know why",2
S003,"It decomposes sound into simple waves like notes",4
S004,"I don't see why this matters for physics",1
S005,"It changes a signal into another signal",2
S006,"It is like splitting music into different frequencies",4
S007,"I remember the equation but I don't understand what it means",2
S008,"Frequency domain shows what frequencies are inside the signal",5`;

const responses = diagnosisEngine.parseQuizResponses(csv);
const analysis = diagnosisEngine.diagnoseUnderstanding({topic: "Fourier Transform",
 learning_objectives: [],
 lesson_material: "",
 quiz_responses: responses});

const intervention = interventionEngine.generateIntervention({analysis,
 learning_objectives: ["Explain Fourier Transform in simple language.",
 "Understand the difference between time domain and frequency domain."],
 lesson_material: "Fourier Transform converts a signal from the time domain into the frequency domain."});

assert.strictEqual(intervention.topic, "Fourier Transform");
assert.strictEqual(intervention.source_analysis_run_id, analysis.analysis_run_id);
assert.ok(intervention.revised_teaching_plan.steps.length >= 5);
assert.ok(intervention.differentiated_materials.level_1_confused.target_students.includes("S001"));
assert.ok(intervention.differentiated_materials.level_2_partially_understood.target_students.includes("S003"));
assert.ok(intervention.differentiated_materials.level_3_ready_to_apply.target_students.includes("S008"));
assert.ok(intervention.visual_aid.image_prompt.includes("complex waveform"));
assert.ok(intervention.micro_quiz.length >= 4);
assert.ok(intervention.student_facing_material.body.includes("two representations"));
assert.ok(intervention.export_markdown.includes("revised teaching plan"));
assert.ok(intervention.export_markdown.includes("pupil handout"));

const validation = interventionEngine.validateIntervention(intervention);
assert.strictEqual(validation.valid, true);
assert.deepStrictEqual(validation.issues, []);

console.log("intervention engine tests passed");
