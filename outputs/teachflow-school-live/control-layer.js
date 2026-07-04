(function (global) {const INTERVENTION_STATUSES = ["draft",
 "under_review",
 "edited",
 "approved",
 "rejected",
 "exported",
 "published",
 "rolled_back"];

 const SECTION_DEFINITIONS = [{key: "revised_teaching_plan",
 label: "revised teaching plan",
 targetType: "intervention_section",
 path: ["revised_teaching_plan"]},
 {key: "level_1_material",
 label: "Level 1 material",
 targetType: "material",
 path: ["differentiated_materials", "level_1_confused"]},
 {key: "level_2_material",
 label: "Level 2 material",
 targetType: "material",
 path: ["differentiated_materials", "level_2_partially_understood"]},
 {key: "level_3_material",
 label: "Level 3 material",
 targetType: "material",
 path: ["differentiated_materials", "level_3_ready_to_apply"]},
 {key: "visual_aid_prompt",
 label: "learning",
 targetType: "material",
 path: ["visual_aid"]},
 {key: "video_storyboard",
 label: "learning",
 targetType: "material",
 path: ["video_storyboard"]},
 {key: "micro_quiz",
 label: "mini quiz",
 targetType: "material",
 path: ["micro_quiz"]},
 {key: "teacher_notes",
 label: "teacher notes",
 targetType: "material",
 path: ["teacher_notes"]},
 {key: "student_facing_material",
 label: "pupil materials",
 targetType: "material",
 path: ["student_facing_material"]}];

 let auditCounter = 0;

 function clone(value) {return JSON.parse(JSON.stringify(value));}

 function nowIso() {return new Date().toISOString();}

 function createSectionApprovals(intervention) {const createdAt = nowIso();
 return SECTION_DEFINITIONS.reduce((approvals, section) => {approvals[section.key] = {section_key: section.key,
 label: section.label,
 status: intervention? "draft": "not_generated",
 approved_by: null,
 approved_at: null,
 updated_at: createdAt};
 return approvals;}, {});}

 function getSectionDefinition(sectionKey) {return SECTION_DEFINITIONS.find((section) => section.key === sectionKey) || SECTION_DEFINITIONS[0];}

 function getSectionContent(intervention, sectionKey) {const section = getSectionDefinition(sectionKey);
 return section.path.reduce((value, pathKey) => value?.[pathKey], intervention);}

 function replaceSectionContent(intervention, sectionKey, content) {const section = getSectionDefinition(sectionKey);
 const updated = clone(intervention);
 let target = updated;
 section.path.slice(0, -1).forEach((pathKey) => {target = target[pathKey];});
 target[section.path[section.path.length - 1]] = clone(content);
 return updated;}

 function createversion({intervention, versionNumber, createdBy, changesummary, sectionKey = null, status = "draft"}) {return {version_id: `version-${String(versionNumber).padStart(3, "0")}`,
 intervention_id: intervention.intervention_id,
 version_number: versionNumber,
 created_by: createdBy,
 created_at: nowIso(),
 change_summary: changesummary,
 section_key: sectionKey,
 status,
 content_snapshot: clone(intervention)};}

 function createAuditEntry({actor, action, targetType, targetId, details}) {auditCounter += 1;
 const timestamp = nowIso();
 return {audit_log_id: `audit-${Date.now()}-${auditCounter}`,
 timestamp,
 actor,
 action,
 target_type: targetType,
 target_id: targetId,
 details,
 time: new Date(timestamp).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}),
 text: details};}

 function createexportPackage({intervention, analysis, workspace, status, sectionApprovals, versionHistory}) {const content = buildexportMarkdown({intervention, analysis, workspace, status, sectionApprovals, versionHistory});
 return {export_id: `export-${Date.now()}`,
 intervention_id: intervention.intervention_id,
 format: "markdown",
 created_at: nowIso(),
 status_at_export: status,
 content};}

 function buildexportMarkdown({intervention, analysis, workspace, status, sectionApprovals, versionHistory}) {const materials = intervention.differentiated_materials;
 const sectionstatusLines = SECTION_DEFINITIONS.map((section) => {const approval = sectionApprovals?.[section.key];
 return `- ${section.label}: ${formatstatus(approval?.status || "draft")}`;});

 const misconceptionLines = (analysis?.misconceptions || []).flatMap((misconception, index) => [`### ${index + 1}. ${misconception.title}`,
 `learning: ${misconception.severity}`,
 `pupil: ${misconception.affected_students.join(", ")}`,
 `learning needs: ${misconception.teaching_need}`,
 ""]);

 return [`# TeachFlow teacher already approve learning intervention: ${intervention.topic}`,
 "",
 `Course: ${workspace?.course?.title || "learning course"}`,
 `class: ${workspace?.class?.name || "class"}`,
 `status: ${formatstatus(status)}`,
 `version: ${versionHistory?.length || 1}`,
 "",
 "## classunderstandingsummary",
 analysis?.class_understanding_summary || "none yetdiagnosis summary.",
 "",
 "## Misconception map",...misconceptionLines,
 "## learning approval status",...sectionstatusLines,
 "",
 "## intervention summary",
 intervention.intervention_summary,
 "",
 "## revised teaching plan",
 intervention.revised_teaching_plan.rationale,
 "",...intervention.revised_teaching_plan.steps.flatMap((step) => [`### ${step.step_number}. ${step.title}`,
 `teacher action: ${step.teacher_action}`,
 `pupil action: ${step.student_action}`,
 `learningMisconception: ${step.linked_misconception_ids.join(", ")}`,
 ""]),
 "## Level 1 material",
 `goal pupil: ${materials.level_1_confused.target_students.join(", ") || "learning"}`,
 `Goal: ${materials.level_1_confused.goal}`,
 materials.level_1_confused.explanation,
 `learning: ${materials.level_1_confused.analogy}`,
 `task: ${materials.level_1_confused.task}`,
 "",
 "## Level 2 material",
 `goal pupil: ${materials.level_2_partially_understood.target_students.join(", ") || "learning"}`,
 `Goal: ${materials.level_2_partially_understood.goal}`,
 materials.level_2_partially_understood.explanation,
 `conceptlearning: ${materials.level_2_partially_understood.concept_bridge}`,
 `task: ${materials.level_2_partially_understood.task}`,
 "",
 "## Level 3 material",
 `goal pupil: ${materials.level_3_ready_to_apply.target_students.join(", ") || "learning"}`,
 `Goal: ${materials.level_3_ready_to_apply.goal}`,
 `learning: ${materials.level_3_ready_to_apply.challenge}`,
 "learning: ",...materials.level_3_ready_to_apply.cross_domain_connections.map((item) => `- ${item}`),
 "",
 "## learning",
 intervention.visual_aid.image_prompt,
 "",
 "## learning",...intervention.video_storyboard.map((scene) => `${scene.scene_number}. ${scene.description} learning: ${scene.narration}`),
 "",
 "## mini quiz",...intervention.micro_quiz.map((item, index) => `${index + 1}. ${item.question}\nlearning of: ${item.purpose}\nlearningunderstanding: ${item.expected_understanding}`),
 "",
 "## teacher notes",...intervention.teacher_notes.map((item) => `- ${item.note} ${item.why_it_matters}`),
 "",
 "## pupil handout",
 intervention.student_facing_material?.body || "none yetpupil materials.",
 "",
 intervention.student_facing_material?.practice_prompt? `practice questions: ${intervention.student_facing_material.practice_prompt}`: "",
 "",
 "## version learning",...(versionHistory || []).map((version) => `- version ${version.version_number}: ${version.change_summary} (${version.created_by})`)].join("\n");}

 function formatstatus(status) {const labels = {draft: "draft",
 not_generated: "generate",
 under_review: "learning in",
 edited: "already edit",
 approved: "already approve",
 rejected: "already learning",
 exported: "already export",
 published: "already publish",
 rolled_back: "already learning",
 needs_edit: "needs learning",
 confused: "needsspecificsupport",
 partially_understood: "Developing",
 ready_to_apply: "Ready to apply"};
 return labels[status] || String(status || "draft");}

 function restoreversion(version) {return clone(version.content_snapshot);}

 const api = {INTERVENTION_STATUSES,
 SECTION_DEFINITIONS,
 createSectionApprovals,
 getSectionDefinition,
 getSectionContent,
 replaceSectionContent,
 createversion,
 createAuditEntry,
 createexportPackage,
 buildexportMarkdown,
 restoreversion,
 formatstatus,
 clone};

 global.TeachFlowControlLayer = api;

 if (typeof module!== "undefined") {module.exports = api;}})(typeof window!== "undefined"? window: globalThis);
