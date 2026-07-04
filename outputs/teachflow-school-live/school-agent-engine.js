(function (global) {function evaluateSystemState(input) {const analysis = input.analysis;
 const intervention = input.intervention;
 const memories = input.student_memories || [];
 const assignments = input.student_assignments || [];
 const mapNodes = input.understanding_map_nodes || [];
 const stuckSignals = input.stuck_signals || [];
 const audit = input.audit || [];
 const exportPackages = input.export_packages || [];
 const priorities = buildPriorities({analysis,
 intervention,
 interventionstatus: input.intervention_status || "draft",
 memories,
 assignments,
 mapNodes,
 stuckSignals,
 audit,
 exportPackages});

 return {agent_id: "teachflow-school-agent",
 mode: "schoolPilot Copilot",
 generated_at: new Date().toISOString(),
 readiness_level: readinessLevel(input),
 summary: summaryFor(input, priorities),
 priorities,
 guardrails: ["AI outputinteacherApprovelearningonlyisdraft.",
 "pupildataonly learningAlias.",
 "understanding mapis learningLearning status, not a grade.",
 "pupil learningChatlearning.",
 "school learning of learning in learningfirst learning."],
 next_best_action: priorities[0]?.next_step || "then class learningsignal."};}

 function buildMorningBrief(input) {const state = evaluateSystemState(input);
 const lines = [`TeachFlow Agent brief - ${state.readiness_level}`,
 "",
 state.summary,
 "",
 "highest priority: ",...state.priorities.slice(0, 4).map((item, index) => `${index + 1}. [${item.lane}] ${item.action} - ${item.next_step}`),
 "",
 "safetylearning: ",...state.guardrails.map((item) => `- ${item}`)];

 return lines.join("\n");}

 function readinessLevel(input) {if (!input.analysis) return "setup";
 if (!input.intervention) return "diagnosis_ready";
 if (!["approved", "exported", "published"].includes(input.intervention_status)) return "teacher_review";
 if (!(input.student_assignments || []).length) return "approved_materials";
 if (!(input.understanding_map_nodes || []).length) return "student_support_ready";
 return "pilot_ready";}

 function summaryFor(input, priorities) {const className = input.workspace?.class?.name || "class";
 const topic = input.workspace?.topic?.title || input.intervention?.topic || input.analysis?.topic || "current topic";
 const aliasCount = new Set([...((input.student_memories || []).map((item) => item.student_alias)),...((input.student_assignments || []).map((item) => item.student_alias))]).size;
 const mainPriority = priorities[0]?.action || "learningsignal.";
 return `${className} In progresslearning ${topic} learningPilotlearning.learning ${aliasCount} learningAnonymisedAliaslearningLearning statusdata.Agent learningSuggested: ${mainPriority}`;}

 function buildPriorities(context) {const priorities = [];

 if (!context.analysis) {priorities.push(priority("teacher_workflow", "high", "RunningMisconceptionDiagnosis", "learninggenerateanalysis.", "learning“pupilresponse”, analysisAnonymisedresponse."));}

 if (context.analysis &&!context.intervention) {priorities.push(priority("teacher_workflow", "high", "generateIntervention", "alreadyDiagnosis, learningInterventiondraft.", "Open“Interventiongeneratelearning”, generatelearning material."));}

 if (context.intervention &&!["approved", "exported", "published"].includes(context.interventionstatus)) {priorities.push(priority("teacher_control", "high", "ApproveorEditIntervention", `currentInterventionstatuslearning ${context.interventionstatus}.`, "inpublishtopupil learning“reviewandapprovallearning”."));}

 if (["approved"].includes(context.interventionstatus) && context.exportPackages.length === 0) {priorities.push(priority("teacher_control", "medium", "learningexportlearning", "alreadyApprovelearningexport.", "learning Markdown export, teacher reviewand learning."));}

 if (["exported"].includes(context.interventionstatus) && context.assignments.length === 0) {priorities.push(priority("student_support", "high", "pupilpublishApproved materials", "pupil task.", "Approvelearningexportlearningpublishpupil portal lite."));}

 if (context.memories.length > 0 && context.mapNodes.length === 0) {priorities.push(priority("student_support", "high", "pupilunderstanding map", "alreadypupil memory, learninggeneratediagramlearning.", "Open“understanding map”, learningAliaslearningsupportdiagram."));}

 const needsSupportCount = context.mapNodes.filter((node) => node.status === "needs_support").length;
 if (needsSupportCount > 0) {priorities.push(priority("student_support", "medium", "learningsupportlearningNext step", `${needsSupportCount} learningunderstanding maplearningneeds support.`, "class diagramlearningAliaslearningNext stepaction."));}

 if (context.stuckSignals.length > 0) {priorities.push(priority("student_voice", "medium", "reviewpupilStuck signals", `submitted ${context.stuckSignals.length} learningStuck signals.`, "learningStuck signalsselectlearning andNext stepaction."));}

 const hasPrivacyAudit = context.audit.some((entry) => /alias|anonym|Alias|Anonymised/i.test(`${entry.details || ""} ${entry.text || ""}`));
 if (!hasPrivacyAudit) {priorities.push(priority("pilot_safety", "low", "learningprivacylearning", "learning ofAuditlearningAliasorAnonymisedsafetylearning.", "confirmPilotnoteslearningonly learningAlias, learning individualdata."));}

 if (priorities.length === 0) {priorities.push(priority("pilot_readiness", "low", "learningrealclass learning", "learningworkflowin statuslearningviewlearningalready.", "learningAnonymisedrealclass learning, learningLogteacher feedback."));}

 return priorities;}

 function priority(lane, severity, action, evidence, nextStep) {return {id: `priority-${lane}-${String(action).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "item"}`,
 lane,
 severity,
 action,
 evidence,
 next_step: nextStep};}

 const api = {evaluateSystemState,
 buildMorningBrief};

 global.TeachFlowschoolAgentEngine = api;

 if (typeof module!== "undefined") {module.exports = api;}})(typeof window!== "undefined"? window: globalThis);
