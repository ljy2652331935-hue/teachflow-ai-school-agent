(function (global) {function createassignments(input) {const intervention = input.intervention;
 const memories = input.student_memories || [];
 const topicId = input.topic_id || intervention?.topic || "topic-demo";
 const assignedAt = new Date().toISOString();

 return memories.map((memory) => ({id: `assignment-${intervention.intervention_id}-${memory.student_alias}`,
 intervention_id: intervention.intervention_id,
 topic_id: topicId,
 student_alias: memory.student_alias,
 material_level: levelForMemory(memory),
 assigned_at: assignedAt,
 completed_at: null}));}

 function getAssignedmaterial(input) {const assignment = input.assignment;
 const intervention = input.intervention;
 if (!assignment ||!intervention) return null;

 const materials = intervention.differentiated_materials;
 const materialByLevel = {confused: {title: "Level 1 material",
 material: materials.level_1_confused},
 partially_understood: {title: "Level 2 material",
 material: materials.level_2_partially_understood},
 ready_to_apply: {title: "Level 3 material",
 material: materials.level_3_ready_to_apply}};

 const selected = materialByLevel[assignment.material_level] || materialByLevel.partially_understood;

 return {assignment_id: assignment.id,
 student_alias: assignment.student_alias,
 material_level: assignment.material_level,
 title: selected.title,
 material: selected.material,
 visual_aid: intervention.visual_aid,
 micro_quiz: intervention.micro_quiz,
 student_facing_material: intervention.student_facing_material};}

 function createReflection(input) {return {id: `reflection-${Date.now()}-${input.student_alias}`,
 topic_id: input.topic_id,
 student_alias: input.student_alias,
 prompt: input.prompt,
 response: input.response,
 created_at: new Date().toISOString()};}

 function createMicroQuizAttempt(input) {return {id: `micro-quiz-attempt-${Date.now()}-${input.student_alias}`,
 intervention_id: input.intervention_id,
 topic_id: input.topic_id,
 student_alias: input.student_alias,
 answers: input.answers.map((answer, index) => ({question_id: answer.question_id || `question-${index + 1}`,
 answer: answer.answer})),
 submitted_at: new Date().toISOString()};}

 function summariseSubmissions(input) {const reflections = input.reflections || [];
 const attempts = input.micro_quiz_attempts || [];
 const aliases = [...new Set([...reflections.map((item) => item.student_alias),...attempts.map((item) => item.student_alias)])].sort();

 return aliases.map((studentAlias) => ({student_alias: studentAlias,
 reflection_count: reflections.filter((item) => item.student_alias === studentAlias).length,
 micro_quiz_attempt_count: attempts.filter((item) => item.student_alias === studentAlias).length,
 latest_reflection: reflections.filter((item) => item.student_alias === studentAlias).slice(-1)[0]?.response || "",
 latest_micro_quiz_answers: attempts.filter((item) => item.student_alias === studentAlias).slice(-1)[0]?.answers || []}));}

 function levelForMemory(memory) {if (["confused", "partially_understood", "ready_to_apply"].includes(memory.current_level)) {return memory.current_level;}

 return "partially_understood";}

 const api = {createassignments,
 getAssignedmaterial,
 createReflection,
 createMicroQuizAttempt,
 summariseSubmissions};

 global.TeachFlowStudentPortalEngine = api;

 if (typeof module!== "undefined") {module.exports = api;}})(typeof window!== "undefined"? window: globalThis);
