(function (global) {const LEVELS = ["confused", "partially_understood", "ready_to_apply"];

 function generateStudentMemories(input) {const analysis = input.analysis;
 const intervention = input.intervention;
 const previousMemories = input.previous_memories || [];
 const topicId = input.topic_id || analysis?.topic || "topic-demo";
 const aliases = collectAliases(analysis);
 const now = new Date().toISOString();

 return aliases.map((studentAlias) => {const level = levelForStudent(analysis, studentAlias);
 const misconceptions = misconceptionsForStudent(analysis, studentAlias);
 const previous = previousMemories.find((memory) => memory.student_alias === studentAlias);

 return {id: previous?.id || `memory-${topicId}-${studentAlias}`,
 topic_id: topicId,
 student_alias: studentAlias,
 current_level: level,
 understood: understoodFor(level, misconceptions),
 weak_points: weakPointsFor(misconceptions, level),
 misconception_ids: misconceptions.map((misconception) => misconception.id),
 preferred_explanation_style: preferredStyleFor(misconceptions),
 recommended_next_action: recommendedActionFor(level, misconceptions, intervention),
 last_updated_at: now};});}

 function parseMicroQuizResponses(raw) {if (!raw ||!raw.trim()) return [];

 return raw.trim().split(/\r?\n/).slice(1).map((line) => splitCsvLine(line)).filter((parts) => parts.length >= 2).map((parts) => ({student_alias: parts[0].trim(),
 answer: parts.slice(1).join(",").trim().replace(/^"|"$/g, "")})).filter((response) => /^S\d{3}$/.test(response.student_alias));}

 function analyseMicroQuizAnswers(input) {const responses = Array.isArray(input.responses)? input.responses: parseMicroQuizResponses(input.raw_responses || "");
 const analysis = input.analysis;
 const intervention = input.intervention;
 const existingMemories = input.existing_memories || generateStudentMemories({analysis, intervention});
 const updates = responses.map((response) => analyseSingleAnswer(response, existingMemories, analysis, intervention));
 const updateMap = new Map(updates.map((update) => [update.student_alias, update]));

 const studentMemories = existingMemories.map((memory) => {const update = updateMap.get(memory.student_alias);
 if (!update) return memory;

 return {...memory,
 current_level: update.new_level,
 understood: unique([...memory.understood,...update.understood]),
 weak_points: update.remaining_weak_points,
 recommended_next_action: update.recommended_next_action,
 last_updated_at: new Date().toISOString()};});

 return {followup_summary: buildFollowupsummary(updates),
 student_updates: updates,
 next_teaching_recommendation: nextTeachingRecommendation(updates),
 student_memories: studentMemories};}

 function collectAliases(analysis) {const fromLevels = LEVELS.flatMap((level) => analysis?.student_levels?.[level] || []);
 const fromMisconceptions = (analysis?.misconceptions || []).flatMap((misconception) => misconception.affected_students || []);
 return unique([...fromLevels,...fromMisconceptions]).sort();}

 function levelForStudent(analysis, studentAlias) {return LEVELS.find((level) => (analysis?.student_levels?.[level] || []).includes(studentAlias)) || "partially_understood";}

 function misconceptionsForStudent(analysis, studentAlias) {return (analysis?.misconceptions || []).filter((misconception) => (misconception.affected_students || []).includes(studentAlias));}

 function understoodFor(level, misconceptions) {if (level === "ready_to_apply") {return ["frequency domain diagramcan learnsignallearning of learning", "Wave mechanicslearningonlyis learning formula, learningsupportunderstandingsignallearning"];}

 if (level === "partially_understood") {return ["Wave mechanicsandtimeandfrequencylearning", "learningsignalcan learn"];}

 if (misconceptions.some((misconception) => misconception.id === "formula-only")) {return ["learningWave mechanicsof learning andformulasymbol"];}

 return ["alreadyTopicof learning"];}

 function weakPointsFor(misconceptions, level) {const points = misconceptions.flatMap((misconception) => {if (misconception.id === "formula-only") return ["formulalearning of learning"];
 if (misconception.id === "time-frequency-without-intuition") return ["visual intuition", "learning"];
 if (misconception.id === "relevance-gap") return ["reallearning"];
 return [misconception.likely_root_cause || misconception.title];});

 if (points.length > 0) return unique(points);
 return level === "ready_to_apply"? ["learningsymbollearning"]: ["conceptlearning"];}

 function preferredStyleFor(misconceptions) {const ids = misconceptions.map((misconception) => misconception.id);
 if (ids.includes("time-frequency-without-intuition")) return "visual";
 if (ids.includes("relevance-gap")) return "application";
 if (ids.includes("formula-only")) return "analogy";
 return "example";}

 function recommendedActionFor(level, misconceptions, intervention) {const ids = misconceptions.map((misconception) => misconception.id);

 if (level === "ready_to_apply") {return intervention?.differentiated_materials?.level_3_ready_to_apply?.challenge || "assignlearning, pupil learningfrequencylearning.";}

 if (ids.includes("time-frequency-without-intuition")) {return "learningwaveformdiagram, pupil learningtime domainandfrequency domain.";}

 if (ids.includes("formula-only")) {return intervention?.differentiated_materials?.level_1_confused?.task || "first learning, thenturnlearning formulainof learning.";}

 if (ids.includes("relevance-gap")) {return "learningspecificlearning, learninganalysis, imagelearning, MRI or learning.";}

 return "learning, then pupil learningone sentencelearning.";}

 function analyseSingleAnswer(response, existingMemories, analysis, intervention) {const answer = response.answer.toLowerCase();
 const previousMemory = existingMemories.find((memory) => memory.student_alias === response.student_alias);
 const usesRepresentationLanguage = /same signal|represent|representation|time domain|frequency domain|learningsignal|learning|time domain|frequency domain/.test(answer);
 const identifiesComponents = /component|frequency|frequencies|decompos|sine|notes|learning|frequency|learning|learning|learning/.test(answer);
 const application = /music|image|mri|quantum|compression|application|learning|image|learning|learning|learning/.test(answer);

 let newLevel = "confused";
 if ((usesRepresentationLanguage && identifiesComponents) || (identifiesComponents && application)) {newLevel = "ready_to_apply";} else if (usesRepresentationLanguage || identifiesComponents) {newLevel = "partially_understood";}

 const remainingWeakPoints = remainingWeakPointsFor(newLevel, previousMemory);

 return {student_alias: response.student_alias,
 new_level: newLevel,
 evidence: response.answer,
 understood: understoodFromAnswer(response.answer, newLevel),
 remaining_weak_points: remainingWeakPoints,
 recommended_next_action: recommendedActionAfterQuiz(newLevel, remainingWeakPoints, intervention)};}

 function understoodFromAnswer(answer, level) {if (level === "ready_to_apply") {return ["learningsignallearning includesfrequencylearning"];}

 if (level === "partially_understood") {return ["learningturnWave mechanicsandtime/frequencylearning"];}

 return ["needs learningspecificlearningthen learning"];}

 function remainingWeakPointsFor(level, previousMemory) {if (level === "ready_to_apply") return ["learningsymbol"];
 if (level === "partially_understood") return (previousMemory?.weak_points || ["visual intuition"]).slice(0, 2);
 return previousMemory?.weak_points || ["learning", "reallearning"];}

 function recommendedActionAfterQuiz(level, weakPoints, intervention) {if (level === "ready_to_apply") {return "turnpupilof learningsymbolinof learningsymbol.";}

 if (weakPoints.includes("visual intuition") || weakPoints.includes("visual intuition")) {return "then learningwaveformdiagram, pupil learning of diagram.";}

 return intervention?.student_facing_material?.practice_prompt || "pupil handout, pupil learning.";}

 function buildFollowupsummary(updates) {if (updates.length === 0) return "learninganalysis learningquizresponse.";

 const readyCount = updates.filter((update) => update.new_level === "ready_to_apply").length;
 const partialCount = updates.filter((update) => update.new_level === "partially_understood").length;
 const confusedCount = updates.filter((update) => update.new_level === "confused").length;
 return `learningquiz, ${readyCount} pupilsalreadyReady to apply, ${partialCount} pupilslearningDeveloping, ${confusedCount} pupilslearningneeds supportlearning.`;}

 function nextTeachingRecommendation(updates) {if (updates.length === 0) return "PasteAnonymisedlearningquizresponse, learningupdatepupil memory.";

 const remainingvisual = updates.some((update) => update.remaining_weak_points.includes("visual intuition") || update.remaining_weak_points.includes("visual intuition"));
 if (remainingvisual) {return "learningturnlearningwaveformdiagram.";}

 const remainingNotation = updates.some((update) => update.remaining_weak_points.includes("formal notation") || update.remaining_weak_points.includes("learningsymbol"));
 if (remainingNotation) {return "learningturnpupil learningsymbol.";}

 return "task, learningContinuepupil learning inGather evidence.";}

 function splitCsvLine(line) {const values = [];
 let current = "";
 let inQuotes = false;

 for (let index = 0; index < line.length; index += 1) {const char = line[index];
 if (char === '"') {inQuotes =!inQuotes;} else if (char === "," &&!inQuotes) {values.push(current);
 current = "";} else {current += char;}}

 values.push(current);
 return values;}

 function unique(values) {return [...new Set(values.filter(Boolean))];}

 const api = {generateStudentMemories,
 parseMicroQuizResponses,
 analyseMicroQuizAnswers};

 global.TeachFlowMemoryEngine = api;

 if (typeof module!== "undefined") {module.exports = api;}})(typeof window!== "undefined"? window: globalThis);
