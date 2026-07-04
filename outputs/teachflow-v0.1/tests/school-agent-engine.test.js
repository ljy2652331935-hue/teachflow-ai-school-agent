const assert = require("assert");
const diagnosisEngine = require("../diagnosis-engine.js");
const interventionEngine = require("../intervention-engine.js");
const memoryEngine = require("../memory-engine.js");
const studentPortalEngine = require("../student-portal-engine.js");
const understandingMapEngine = require("../understanding-map-engine.js");
const schoolAgentEngine = require("../school-agent-engine.js");

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
const nodes = understandingMapEngine.createUnderstandingMap({
  student_memories: memories,
  analysis,
  intervention,
  topic_id: "topic-fourier"
});

const setupState = schoolAgentEngine.evaluateSystemState({});
assert.strictEqual(setupState.readiness_level, "setup");
assert.strictEqual(setupState.priorities[0].action, "运行误解诊断");

const pilotState = schoolAgentEngine.evaluateSystemState({
  workspace: { class: { name: "Physics 101" }, topic: { title: "Fourier Transform" } },
  analysis,
  intervention,
  intervention_status: "published",
  student_memories: memories,
  student_assignments: assignments,
  understanding_map_nodes: nodes,
  stuck_signals: [],
  export_packages: [{ export_id: "export-demo" }],
  audit: [{ details: "Aliases only and anonymised mode confirmed." }]
});

assert.strictEqual(pilotState.readiness_level, "pilot_ready");
assert.ok(pilotState.guardrails.some((item) => item.includes("不是成绩")));
assert.ok(pilotState.priorities.length >= 1);

const brief = schoolAgentEngine.buildMorningBrief({
  workspace: { class: { name: "Physics 101" }, topic: { title: "Fourier Transform" } },
  analysis,
  intervention,
  intervention_status: "published",
  student_memories: memories,
  student_assignments: assignments,
  understanding_map_nodes: nodes,
  export_packages: [{ export_id: "export-demo" }]
});
assert.ok(brief.includes("TeachFlow Agent 简报"));
assert.ok(brief.includes("最高优先级"));

console.log("school agent engine tests passed");
