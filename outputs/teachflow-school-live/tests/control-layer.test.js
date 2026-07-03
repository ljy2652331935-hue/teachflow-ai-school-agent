const assert = require("assert");
const diagnosisEngine = require("../diagnosis-engine.js");
const interventionEngine = require("../intervention-engine.js");
const controlLayer = require("../control-layer.js");

const csv = `student_id,answer,confidence
S001,"Fourier Transform is just a formula for waves",2
S002,"It turns time into frequency but I don't know why",2
S003,"It decomposes sound into simple waves like notes",4
S004,"I don't see why this matters for physics",1`;

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

const approvals = controlLayer.createSectionApprovals(intervention);
assert.strictEqual(approvals.level_1_material.status, "draft");

const firstVersion = controlLayer.createVersion({
  intervention,
  versionNumber: 1,
  createdBy: "ai",
  changeSummary: "AI generated intervention draft",
  status: "draft"
});
assert.strictEqual(firstVersion.version_number, 1);

const levelOne = controlLayer.getSectionContent(intervention, "level_1_material");
const editedLevelOne = {
  ...levelOne,
  explanation: `${levelOne.explanation} Teacher-added sentence.`
};
const editedIntervention = controlLayer.replaceSectionContent(intervention, "level_1_material", editedLevelOne);
assert.ok(editedIntervention.differentiated_materials.level_1_confused.explanation.includes("Teacher-added sentence."));

const audit = controlLayer.createAuditEntry({
  actor: "teacher",
  action: "edited_section",
  targetType: "material",
  targetId: "level_1_material",
  details: "Teacher edited Level 1 Material"
});
assert.strictEqual(audit.actor, "teacher");
assert.strictEqual(audit.target_type, "material");

const exportPackage = controlLayer.createExportPackage({
  intervention: editedIntervention,
  analysis,
  workspace: {
    course: { title: "Physics" },
    class: { name: "Demo Class" }
  },
  status: "approved",
  sectionApprovals: approvals,
  versionHistory: [firstVersion]
});
assert.strictEqual(exportPackage.format, "markdown");
assert.ok(exportPackage.content.includes("学生讲义"));
assert.ok(exportPackage.content.includes("误解地图"));

const restored = controlLayer.restoreVersion(firstVersion);
assert.deepStrictEqual(restored, intervention);

console.log("control layer tests passed");
