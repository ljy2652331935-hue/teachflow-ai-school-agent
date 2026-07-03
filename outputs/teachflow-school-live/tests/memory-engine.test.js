const assert = require("assert");
const diagnosisEngine = require("../diagnosis-engine.js");
const interventionEngine = require("../intervention-engine.js");
const memoryEngine = require("../memory-engine.js");

const csv = `student_id,answer,confidence
S001,"Fourier Transform is just a formula for waves",2
S002,"It turns time into frequency but I don't know why",2
S003,"It decomposes sound into simple waves like notes",4
S004,"I don't see why this matters for physics",1
S008,"Frequency domain shows what frequencies are inside the signal",5`;

const responses = diagnosisEngine.parseQuizResponses(csv);
const analysis = diagnosisEngine.diagnoseUnderstanding({
  topic: "Fourier Transform",
  learning_objectives: ["Explain Fourier Transform conceptually."],
  lesson_material: "Fourier Transform represents the same signal by frequency components.",
  quiz_responses: responses
});

const intervention = interventionEngine.generateIntervention({
  analysis,
  learning_objectives: ["Explain Fourier Transform conceptually."],
  lesson_material: "Fourier Transform represents the same signal by frequency components."
});

const memories = memoryEngine.generateStudentMemories({ analysis, intervention, topic_id: "topic-fourier" });

assert.ok(memories.length >= 5);
assert.ok(memories.every((memory) => /^S\d{3}$/.test(memory.student_alias)));
assert.ok(memories.every((memory) => !memory.weak_points.join(" ").toLowerCase().includes("bad")));

const s002 = memories.find((memory) => memory.student_alias === "S002");
assert.strictEqual(s002.current_level, "confused");
assert.ok(s002.weak_points.includes("可视化直觉"));
assert.strictEqual(s002.preferred_explanation_style, "visual");

const parsedFollowup = memoryEngine.parseMicroQuizResponses(`student_id,answer
S002,"Fourier Transform represents the same signal by frequency components"
S004,"It is useful in music because frequencies make up sound"`);
assert.strictEqual(parsedFollowup.length, 2);

const followup = memoryEngine.analyseMicroQuizAnswers({
  responses: parsedFollowup,
  analysis,
  intervention,
  existing_memories: memories
});

assert.ok(followup.followup_summary.includes("准备应用"));
assert.ok(followup.student_updates.some((update) => update.student_alias === "S002" && update.new_level === "ready_to_apply"));
assert.ok(followup.student_memories.find((memory) => memory.student_alias === "S002").understood.length >= s002.understood.length);

console.log("memory engine tests passed");
