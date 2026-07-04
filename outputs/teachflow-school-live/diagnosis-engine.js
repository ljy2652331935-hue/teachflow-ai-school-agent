(function (global) {function parseQuizResponses(raw) {return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).filter((line) =>!line.toLowerCase().startsWith("student")).map(parseCsvLine).filter(Boolean).filter((response) => /^S\d{3}$/.test(response.student_alias));}

 function parseCsvLine(line) {const cells = [];
 let cell = "";
 let inQuotes = false;

 for (let index = 0; index < line.length; index += 1) {const char = line[index];
 const next = line[index + 1];

 if (char === '"' && next === '"') {cell += '"';
 index += 1;} else if (char === '"') {inQuotes =!inQuotes;} else if (char === "," &&!inQuotes) {cells.push(cell.trim());
 cell = "";} else {cell += char;}}

 cells.push(cell.trim());

 if (cells.length < 2) return null;

 return {student_alias: cells[0],
 answer: cells[1],
 confidence: cells[2]? Number(cells[2]): undefined};}

 function diagnoseUnderstanding(input) {const responses = input.quiz_responses || [];
 const topic = input.topic || "learningTopic";
 const misconceptions = buildMisconceptions(responses);
 const studentLevels = classifyStudentLevels(responses);

 return {analysis_run_id: `analysis-${Date.now()}`,
 topic,
 class_understanding_summary: buildclasssummary(topic, responses, misconceptions),
 student_levels: studentLevels,
 misconceptions,
 teacher_summary: buildteachersummary(misconceptions)};}

 function buildMisconceptions(responses) {const definitions = [{id: "formula-only",
 title: "turnWave mechanicsonlyunderstandinglearning formula",
 description: "pupil learning formulaor learning, learningturnWave mechanicsunderstandinglearning of learning.",
 severity: "high",
 match: (answer) => /\bformula\b|\bequation\b|\bremember\b|formula|learning|learning/i.test(answer),
 why: "notespupilpossiblein learningsymbol, learningconceptlearning.",
 likely_root_cause: "pupilpossiblein learning or learning, first learning.",
 teaching_need: "turnWave mechanicslearning of learning, learningonlyis learning formula.",
 recommended_next_action: "first learning andwaveformdiagram, then learning."},
 {id: "time-frequency-without-intuition",
 title: "learningtime domain learningfrequency domain, learninglesslearning",
 description: "pupil learning, learningfrequency domain diagramlearning.",
 severity: "medium",
 match: (answer) => /time.*frequency|frequency.*time|changes? a signal|another signal|don't know why|dont know why|time.*frequency|time domain.*frequency domain|learning|learningsignal|learning/i.test(answer),
 why: "responselearning, learning of learning ofor learning.",
 likely_root_cause: "pupil learning, learningcannotlearningsignallearning of learning.",
 teaching_need: "learningsignallearningsimpleoffrequencylearning.",
 recommended_next_action: "learning: learningsignal, learning in learning includeslearningmorelearning andfrequency."},
 {id: "relevance-gap",
 title: "viewlearningWave mechanicslearning",
 description: "pupil learningturnfrequencylearning andreallearning or learning.",
 severity: "medium",
 match: (answer) => /why.*matters?|matters?.*why|relevance|physics|useful|application|learning|learning|Physics|learning|learning/i.test(answer),
 why: "responselearningconceptof learning or learning.",
 likely_root_cause: "Coursepossiblelearningturnconceptpupil learning of learning.",
 teaching_need: "turnWave mechanicslearning, MRI, imagelearning, signallearning and learning.",
 recommended_next_action: "learningspecificlearning, pupil viewlearningfrequency domain learningtime domainsignallearning of learning."}];

 return definitions.map((definition) => {const matches = responses.filter((response) => definition.match(response.answer));
 if (matches.length === 0) return null;

 return {id: definition.id,
 title: definition.title,
 description: definition.description,
 severity: definition.severity,
 affected_students: matches.map((response) => response.student_alias),
 evidence_quotes: matches.map((response) => ({student_alias: response.student_alias,
 quote: response.answer,
 why_it_matters: definition.why})),
 likely_root_cause: definition.likely_root_cause,
 teaching_need: definition.teaching_need,
 recommended_next_action: definition.recommended_next_action};}).filter(Boolean);}

 function classifyStudentLevels(responses) {const levels = {confused: [],
 partially_understood: [],
 ready_to_apply: []};

 responses.forEach((response) => {const answer = response.answer.toLowerCase();
 const confidence = Number(response.confidence || 0);
 const hasStrongFrequencyIdea = /frequency domain|frequencies are inside|splitting music|different frequencies|frequency domain|signalin learningfrequency|learningfrequency|learningfrequency/.test(answer);
 const hasPartialIdea = /frequency|decomposes|simple waves|notes|time|frequency|learning|simplewave|learning|time|time domain/.test(answer);
 const flagsConfusion = /just a formula|don't understand|dont understand|don't know why|dont know why|changes a signal|matters|onlyis.*formula|learningunderstanding|learning|learningsignal|learning/.test(answer);

 if (hasStrongFrequencyIdea && confidence >= 4 &&!flagsConfusion) {levels.ready_to_apply.push(response.student_alias);} else if (hasPartialIdea && confidence >= 3 &&!/just a formula/.test(answer)) {levels.partially_understood.push(response.student_alias);} else {levels.confused.push(response.student_alias);}});

 return levels;}

 function buildclasssummary(topic, responses, misconceptions) {const total = responses.length;
 const misconceptionCount = misconceptions.length;
 const evidenceCount = misconceptions.reduce((sum, item) => sum + item.evidence_quotes.length, 0);

 if (total === 0) {return `learning ${topic} learningAnonymised pupilresponse.`;}

 return `classfor ${topic} alreadyDeveloping.${total} draftsAnonymisedresponsein learning ${evidenceCount} draftslearningevidence, learning ${misconceptionCount} typesMisconceptionlearning.pupil learningturnconceptandfrequencycontactlearning, learningneeds learningclearof“learning”learning.`;}

 function buildteachersummary(misconceptions) {if (misconceptions.length === 0) {return "currentresponsein learningMisconceptionlearning.Suggestedfirstviewresponse, learning in learningInterventionlearningmorepupilresponse.";}

 const highest = misconceptions.find((item) => item.severity === "high") || misconceptions[0];
 return `Suggestedfirst learning“${highest.title}”.learningevidenceQuote, thenselectlearning ofNext stepaction, thengeneratelearning material.`;}

 function validateAnalysis(analysis, sourceResponses) {const quotes = new Set(sourceResponses.map((response) => response.answer));
 const issues = [];

 analysis.misconceptions.forEach((misconception) => {if (!misconception.evidence_quotes || misconception.evidence_quotes.length === 0) {issues.push(`${misconception.id} learningevidenceQuote.`);}

 misconception.evidence_quotes.forEach((evidence) => {if (!quotes.has(evidence.quote)) {issues.push(`${misconception.id} includesofevidencelearning ispupil quotes.`);}});});

 return {valid: issues.length === 0,
 issues};}

 const api = {parseQuizResponses,
 diagnoseUnderstanding,
 validateAnalysis};

 global.TeachFlowDiagnosisEngine = api;

 if (typeof module!== "undefined") {module.exports = api;}})(typeof window!== "undefined"? window: globalThis);
