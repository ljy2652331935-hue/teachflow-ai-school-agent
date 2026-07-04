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
const analysis = diagnosisEngine.diagnoseUnderstanding({topic: "Fourier Transform",
 learning_objectives: ["Explain Fourier Transform conceptually."],
 lesson_material: "Fourier Transform represents the same signal by frequency components.",
 quiz_responses: responses});

const intervention = interventionEngine.generateIntervention({analysis,
 learning_objectives: ["Explain Fourier Transform conceptually."],
 lesson_material: "Fourier Transform represents the same signal by frequency components."});

const approvals = controlLayer.createSectionApprovals(intervention);
assert.strictEqual(approvals.level_1_material.status, "draft");

const firstversion = controlLayer.createversion({intervention,
 versionNumber: 1,
 createdBy: "ai",
 changesummary: "AI generated intervention draft",
 status: "draft"});
assert.strictEqual(firstversion.version_number, 1);

const levelOne = controlLayer.getSectionContent(intervention, "level_1_material");
const editedLevelOne = {...levelOne,
 explanation: `${levelOne.explanation} teacher-added sentence.`};
const editedIntervention = controlLayer.replaceSectionContent(intervention, "level_1_material", editedLevelOne);
assert.ok(editedIntervention.differentiated_materials.level_1_confused.explanation.includes("teacher-added sentence."));

const audit = controlLayer.createAuditEntry({actor: "teacher",
 action: "edited_section",
 targetType: "material",
 targetId: "level_1_material",
 details: "teacher edited Level 1 material"});
assert.strictEqual(audit.actor, "teacher");
assert.strictEqual(audit.target_type, "material");

const exportPackage = controlLayer.createexportPackage({intervention: editedIntervention,
 analysis,
 workspace: {course: {title: "Physics"},
 class: {name: "Demo class"}},
 status: "approved",
 sectionApprovals: approvals,
 versionHistory: [firstversion]});
assert.strictEqual(exportPackage.format, "markdown");
assert.ok(exportPackage.content.includes("pupil handout"));
assert.ok(exportPackage.content.includes("Misconception map"));

const restored = controlLayer.restoreversion(firstversion);
assert.deepStrictEqual(restored, intervention);

console.log("control layer tests passed");
