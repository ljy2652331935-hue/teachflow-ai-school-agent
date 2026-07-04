(function (global) {const STUCK_TYPES = ["definition",
 "diagram",
 "formula_meaning",
 "example_transfer",
 "relevance",
 "application"];

 function createUnderstandingMap(input) {const memories = input.student_memories || [];
 const topicId = input.topic_id || input.analysis?.topic || "topic-demo";
 const reflections = input.reflections || [];
 const attempts = input.micro_quiz_attempts || [];
 const stuckSignals = input.stuck_signals || [];
 const now = new Date().toISOString();

 return memories.flatMap((memory) => {const understoodNodes = (memory.understood || []).map((concept, index) => createNode({topicId,
 memory,
 concept,
 status: "understood",
 evidence: evidenceFor(memory, concept, reflections, attempts, stuckSignals, "understood"),
 recommendedAction: index === 0? "pupilin taskin learning.": "pupilturnlearningTopic.",
 now}));

 const supportNodes = (memory.weak_points || []).map((concept) => createNode({topicId,
 memory,
 concept,
 status: "needs_support",
 evidence: evidenceFor(memory, concept, reflections, attempts, stuckSignals, "needs_support"),
 recommendedAction: actionForSupport(memory, concept, stuckSignals),
 now}));

 if (understoodNodes.length === 0 && supportNodes.length === 0) {return [createNode({topicId,
 memory,
 concept: "currentunderstanding",
 status: "not_yet_assessed",
 evidence: ["learning ofpupilevidence."],
 recommendedAction: "pupil learning of learning.",
 now})];}

 return [...understoodNodes,...supportNodes];});}

 function createStuckSignal(input) {const stuckType = STUCK_TYPES.includes(input.stuck_type)? input.stuck_type: "definition";
 return {id: `stuck-${Date.now()}-${input.student_alias}`,
 topic_id: input.topic_id,
 student_alias: input.student_alias,
 stuck_type: stuckType,
 free_text: input.free_text || "",
 created_at: new Date().toISOString()};}

 function summariseclassMap(input) {const nodes = input.nodes || [];
 const stuckSignals = input.stuck_signals || [];
 const aliases = [...new Set(nodes.map((node) => node.student_alias))].sort();

 return aliases.map((studentAlias) => {const studentNodes = nodes.filter((node) => node.student_alias === studentAlias);
 const latestStuck = stuckSignals.filter((signal) => signal.student_alias === studentAlias).slice(-1)[0];
 return {student_alias: studentAlias,
 understood_count: studentNodes.filter((node) => node.status === "understood").length,
 needs_support_count: studentNodes.filter((node) => node.status === "needs_support").length,
 not_yet_assessed_count: studentNodes.filter((node) => node.status === "not_yet_assessed").length,
 latest_stuck_type: latestStuck?.stuck_type || "",
 recommended_next_action: strongestAction(studentNodes)};});}

 function createAlternateExplanation(input) {const memory = input.memory || {};
 const assigned = input.assigned_material || {};
 const latestStuck = input.latest_stuck_signal;
 const stuckType = latestStuck?.stuck_type || "definition";
 const style = memory.preferred_explanation_style || "example";
 const base = assigned.material?.explanation || assigned.student_facing_material?.body || "canturnlearning, learning and learningspecificlearninglearningconcept.";

 const templates = {definition: `first learning: ${base}`,
 diagram: "learningleftlearningrightviewdiagram.learning ofsignalis diagram; learning of learning is learningsignalof diagram.",
 formula_meaning: "firstturnformulaviewlearning of learning.learningsymbollearning insupportnoteslearningfrequencylearningmoreless.",
 example_transfer: "learning: learning, learning includescan learn of learning andfrequency.",
 relevance: "firstviewlearning: learningmorerealSystemin learningsignallearning, will learneasyunderstanding.",
 application: assigned.material?.challenge || assigned.student_facing_material?.practice_prompt || "selectlearningrealsignal, learningfrequency domain diagrampossiblelearning."};

 return {student_alias: memory.student_alias,
 style,
 stuck_type: stuckType,
 explanation: templates[stuckType],
 next_prompt: "learningone sentencelearning ofunderstandinglearning."};}

 function createNode(input) {return {id: `map-${input.topicId}-${input.memory.student_alias}-${slug(input.concept)}-${input.status}`,
 topic_id: input.topicId,
 student_alias: input.memory.student_alias,
 concept: input.concept,
 status: input.status,
 evidence: unique(input.evidence).slice(0, 4),
 recommended_action: input.recommendedAction,
 preferred_explanation_style: input.memory.preferred_explanation_style || "example",
 updated_at: input.now};}

 function evidenceFor(memory, concept, reflections, attempts, stuckSignals, status) {const studentReflections = reflections.filter((item) => item.student_alias === memory.student_alias);
 const studentAttempts = attempts.filter((item) => item.student_alias === memory.student_alias);
 const studentStuckSignals = stuckSignals.filter((item) => item.student_alias === memory.student_alias);
 const latestReflection = studentReflections.slice(-1)[0];
 const latestAttempt = studentAttempts.slice(-1)[0];
 const latestStuck = studentStuckSignals.slice(-1)[0];
 const evidence = [];

 if (status === "understood") {evidence.push(`learningdisplaypupilalreadycan learn: ${concept}.`);} else if (status === "needs_support") {evidence.push(`learningdisplaypupil learningneeds support: ${concept}.`);}

 if (latestReflection?.response) {evidence.push(`latest reflection: ${latestReflection.response}`);}

 if (latestAttempt?.answers?.length) {evidence.push(`latestlearningquiz: ${latestAttempt.answers.map((answer) => answer.answer).join(" | ")}`);}

 if (latestStuck) {evidence.push(`Stuck signals: ${labelForStuckType(latestStuck.stuck_type)}${latestStuck.free_text? ` - ${latestStuck.free_text}`: ""}`);}

 return evidence.length? evidence: ["currentdiagramlearningDiagnosisandteacherApproveofLearning memory."];}

 function actionForSupport(memory, concept, stuckSignals) {const latestStuck = stuckSignals.filter((signal) => signal.student_alias === memory.student_alias).slice(-1)[0];
 if (latestStuck?.stuck_type === "diagram") {return "then diagram, pupil learning.";}
 if (latestStuck?.stuck_type === "formula_meaning") {return "turnlearning formulainof learningsymbol, do notlearning.";}
 if (latestStuck?.stuck_type === "relevance") {return "learning, then learningconcept.";}
 if (concept.includes("application") || concept.includes("learning")) {return "learningspecificlearning, learningaskpupil learningconceptin learning in learning.";}
 return memory.recommended_next_action || "to learningsupportlearning, then pupil learningone sentencelearning.";}

 function strongestAction(nodes) {const needsSupport = nodes.find((node) => node.status === "needs_support");
 if (needsSupport) return needsSupport.recommended_action;
 const notAssessed = nodes.find((node) => node.status === "not_yet_assessed");
 if (notAssessed) return notAssessed.recommended_action;
 return nodes[0]?.recommended_action || "then pupil learning.";}

 function labelForStuckType(stuckType) {const labels = {definition: "learning",
 diagram: "diagram",
 formula_meaning: "formula meaning",
 example_transfer: "Worked example transfer",
 relevance: "learning",
 application: "learning"};
 return labels[stuckType] || stuckType;}

 function slug(value) {return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "concept";}

 function unique(values) {return [...new Set(values.filter(Boolean))];}

 const api = {STUCK_TYPES,
 createUnderstandingMap,
 createStuckSignal,
 summariseclassMap,
 createAlternateExplanation};

 global.TeachFlowUnderstandingMapEngine = api;

 if (typeof module!== "undefined") {module.exports = api;}})(typeof window!== "undefined"? window: globalThis);
