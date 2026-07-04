(function (global) {function generateIntervention(input) {const analysis = input.analysis;
 const learningObjectives = input.learning_objectives || [];
 const lessonmaterial = input.lesson_material || "";
 const topic = analysis?.topic || input.topic || "Untitled topic";
 const misconceptions = analysis?.misconceptions || [];
 const levels = analysis?.student_levels || {confused: [],
 partially_understood: [],
 ready_to_apply: []};
 const targetIds = misconceptions.map((misconception) => misconception.id);

 const intervention = {intervention_id: `intervention-${Date.now()}`,
 source_analysis_run_id: analysis?.analysis_run_id || "analysis-not-generated",
 topic,
 intervention_summary: buildsummary(topic, misconceptions),
 target_misconceptions: targetIds,
 revised_teaching_plan: buildTeachingPlan(misconceptions),
 differentiated_materials: buildDifferentiatedmaterials(levels, misconceptions),
 visual_aid: buildvisualAid(misconceptions),
 video_storyboard: buildVideoStoryboard(topic),
 micro_quiz: buildMicroQuiz(misconceptions),
 teacher_notes: buildteachernotes(misconceptions, learningObjectives, lessonmaterial),
 student_facing_material: buildStudentFacingmaterial(topic, misconceptions),
 export_markdown: ""};

 intervention.export_markdown = buildMarkdown(intervention);
 return intervention;}

 function buildsummary(topic, misconceptions) {if (misconceptions.length === 0) {return `learning ${topic} of learningMisconceptionlearning.canturnlearningInterventionlearningunderstandinglearning, learning is learning.`;}

 return `learningInterventionsupportteacher learning ${topic} ofDiagnosis learning, learning of learningworkflow, pupil materials, learning and learningquiz.`;}

 function buildTeachingPlan(misconceptions) {return {rationale: "learning offormulaprioritylearningneeds learning, learningmorepupilin learningsymbollearning, firstneeds learning“learning”of learning.",
 steps: [{step_number: 1,
 title: "learninggoodquestionlearning",
 teacher_action: "question: learning, learningimageand learningwavelearningcan learnfrequencylearning?",
 student_action: "learningfrequencylearningpossiblelearning.",
 linked_misconception_ids: idsFor(misconceptions, ["relevance-gap", "time-frequency-without-intuition"])},
 {step_number: 2,
 title: "learning and learning",
 teacher_action: "turnlearningmorefrequencylearning in learning, noteslearningturnlearning.",
 student_action: "learningone sentencenoteslearning in learning“learning”ofis learning.",
 linked_misconception_ids: idsFor(misconceptions, ["formula-only", "time-frequency-without-intuition"])},
 {step_number: 3,
 title: "learningwaveformlearning",
 teacher_action: "learningcomplex waveform, learningcanviewlearningmorelearningsimplelearningwaveof learning.",
 student_action: "learning istime domain diagram, learning isfrequency domain diagram.",
 linked_misconception_ids: idsFor(misconceptions, ["time-frequency-without-intuition"])},
 {step_number: 4,
 title: "learning",
 teacher_action: "turnWave mechanicslearning: learningfrequencylearningsignal.",
 student_action: "turnlearning inof learningsymbolor learning of learning.",
 linked_misconception_ids: idsFor(misconceptions, ["formula-only"])},
 {step_number: 5,
 title: "learningquiz",
 teacher_action: "first learningconceptlearning is learning, pupilis learning of learning.",
 student_action: "first learning, thenand learninganswers.",
 linked_misconception_ids: misconceptions.map((item) => item.id)}]};}

 function buildDifferentiatedmaterials(levels, misconceptions) {return {level_1_confused: {target_students: levels.confused || [],
 goal: "in learning, first learningspecificof learning.",
 explanation: "learningsignalintimeinviewlearningpossiblelearning ofwave, learningpossiblelearningmorelearningsimple, learning ofwavelearning.Wave mechanicssupportlearningsignallearning offrequencylearningsignal.",
 analogy: "can learnturnlearning.Wave mechanicslearning is learning of learning, learningsupportlearningturnlearningsignallearningfrequencylearning.",
 task: "learningWave mechanics, then learning of learning.",
 linked_misconception_ids: idsFor(misconceptions, ["formula-only", "time-frequency-without-intuition"])},
 level_2_partially_understood: {target_students: levels.partially_understood || [],
 goal: "turnpupil learning of learning“learning”of learning.",
 explanation: "time domain learningsignallearning.frequency domain learningsignal.Wave mechanicslearningsignalof learningtwo representationslearning.",
 concept_bridge: "do notlearning“learningturntimelearningfrequency”.learningaccurateof learning is: learningtimelearning of learningsignal, learning is learningfrequencylearningsignal.",
 task: "left-hand sidelearningtime domain, right-hand sidelearningfrequency domain, diagramlearning.",
 linked_misconception_ids: idsFor(misconceptions, ["time-frequency-without-intuition", "formula-only"])},
 level_3_ready_to_apply: {target_students: levels.ready_to_apply || [],
 goal: "turnfrequencylearning.",
 challenge: "select MRI, imagelearning, learninganalysisor learning, learning infrequencylearning in learningeasyviewlearning.",
 cross_domain_connections: ["learninganalysis: learning offrequency.",
 "imagelearning: learningimage, learninglesslearning of learning.",
 "MRI: learning andfrequencylearning ofsignallearning.",
 "learning: learningwaveofstatus."],
 linked_misconception_ids: idsFor(misconceptions, ["relevance-gap", "time-frequency-without-intuition"])}};}

 function buildvisualAid(misconceptions) {return {image_prompt: "generatelearningclearof diagram: leftlearning iscomplex waveform, in learning is learning“Wave mechanics”of learning, rightlearning is learningsimplelearningwave.learningclearlearning andlesslearning.",
 diagram_description: "leftlearning: learning oftime domainwaveform.in learning: learningWave mechanicsofstep, learning.rightlearning: learning of learningwave, learningfrequencylearning.",
 labels: ["time domain", "learningsignal", "Wave mechanics", "frequency domain", "frequencylearning"],
 linked_misconception_ids: idsFor(misconceptions, ["formula-only", "time-frequency-without-intuition"])};}

 function buildVideoStoryboard(topic) {return [{scene_number: 1,
 description: "learningwaveform, learning.",
 narration: `learning is learning ${topic} of learning: viewsignallearningtimelearning.`},
 {scene_number: 2,
 description: "learningwaveformlearningfrequencyofsimplelearningwave.",
 narration: "learningsignallearningcan learn of learning."},
 {scene_number: 3,
 description: "learningleftlearningdisplaytime domain, rightlearningdisplayfrequency domain.",
 narration: "Wave mechanicslearningsignalof learningtwo representations."}];}

 function buildMicroQuiz(misconceptions) {return [{question: "iflearning is learningmorelearning in learning, Wave mechanicslearningsupportlearning?",
 purpose: "pupilis learningunderstandingturnlearningsignallearningfrequencylearning.",
 expected_understanding: "learningsupportlearning offrequencyor learning.",
 linked_misconception_ids: idsFor(misconceptions, ["time-frequency-without-intuition"])},
 {question: "learning?learningonlyis learning?",
 purpose: "pupil learning, learningturnlearning.",
 expected_understanding: "learningturnlearning, learningWave mechanicsis learning, learning isrealofPhysicslearning.",
 linked_misconception_ids: idsFor(misconceptions, ["formula-only"])},
 {question: "time domainandfrequency domain learning?",
 purpose: "pupilis learningunderstandinglearning of learning.",
 expected_understanding: "time domaindisplaysignallearningtimelearning; frequency domaindisplaylearningfrequencylearningsignal.",
 linked_misconception_ids: idsFor(misconceptions, ["time-frequency-without-intuition"])},
 {question: "learning: Wave mechanicsonlyis learning formulalearning?learning.",
 purpose: "learning“onlyturnlearningviewlearning formula”ofMisconceptionis learning.",
 expected_understanding: "learning is.formulaonlyis learning of learning.",
 linked_misconception_ids: idsFor(misconceptions, ["formula-only"])}];}

 function buildteachernotes(misconceptions, learningObjectives, lessonmaterial) {return [{note: "do notlearning formula.",
 why_it_matters: "pupilalreadylesslearning, then learning formulalearningpossiblewill learnMisconception.",
 linked_misconception_ids: idsFor(misconceptions, ["formula-only"])},
 {note: "ongoinglearning“learning”of learning.",
 why_it_matters: "learning“turntimelearningfrequency”learningeasypupil learningtimelearning.learningaccurateof learning is: learningfrequencylearningsignal.",
 linked_misconception_ids: idsFor(misconceptions, ["time-frequency-without-intuition"])},
 {note: "inquizlearningreallearning.",
 why_it_matters: "learning“learning”ofMisconceptionneedsspecificlearning, learning is learning of learning.",
 linked_misconception_ids: idsFor(misconceptions, ["relevance-gap"])},
 {note: `learningInterventionand ${learningObjectives.length || "already"} learningLearning objectivelearning material.`,
 why_it_matters: lessonmaterial? "generateofInterventionlearningsupportlearning, learning is learning.": "generateofInterventionteacher learning ofTopicandGoal.",
 linked_misconception_ids: misconceptions.map((item) => item.id)}];}

 function buildStudentFacingmaterial(topic, misconceptions) {return {title: `${topic}: learningviewlearningsignal`,
 audience: "student",
 body: "A signal can be described by how it changes over time or by the repeating frequency components that make it up. Wave mechanics is a mathematical way to move between two representations of the same signal. The formula matters, but the core idea is representation: one signal, two useful views.",
 practice_prompt: "selectlearning, learning or learningwaveform.first learningtime domain diagramdisplaylearning, then learningfrequency domain diagrampossiblelearning.",
 linked_misconception_ids: idsFor(misconceptions, ["formula-only", "time-frequency-without-intuition", "relevance-gap"])};}

 function idsFor(misconceptions, preferredIds) {const ids = misconceptions.filter((misconception) => preferredIds.includes(misconception.id)).map((misconception) => misconception.id);

 return ids.length > 0? ids: misconceptions.map((misconception) => misconception.id).slice(0, 1);}

 function buildMarkdown(intervention) {const materials = intervention.differentiated_materials;
 const lines = [`# TeachFlow learningIntervention: ${intervention.topic}`,
 "",
 `learningDiagnosis: ${intervention.source_analysis_run_id}`,
 "",
 "## Interventionsummary",
 intervention.intervention_summary,
 "",
 "## revised teaching plan",
 intervention.revised_teaching_plan.rationale,
 "",...intervention.revised_teaching_plan.steps.flatMap((step) => [`### ${step.step_number}. ${step.title}`,
 `teacheraction: ${step.teacher_action}`,
 `pupilaction: ${step.student_action}`,
 `learningMisconception: ${step.linked_misconception_ids.join(", ")}`,
 ""]),
 "## Level 1: needsspecificlearningsupport",
 `Goalpupil: ${materials.level_1_confused.target_students.join(", ") || "learning"}`,
 `Goal: ${materials.level_1_confused.goal}`,
 materials.level_1_confused.explanation,
 `learning: ${materials.level_1_confused.analogy}`,
 `task: ${materials.level_1_confused.task}`,
 "",
 "## Level 2: Developing",
 `Goalpupil: ${materials.level_2_partially_understood.target_students.join(", ") || "learning"}`,
 `Goal: ${materials.level_2_partially_understood.goal}`,
 materials.level_2_partially_understood.explanation,
 `conceptlearning: ${materials.level_2_partially_understood.concept_bridge}`,
 `task: ${materials.level_2_partially_understood.task}`,
 "",
 "## Level 3: Ready to apply",
 `Goalpupil: ${materials.level_3_ready_to_apply.target_students.join(", ") || "learning"}`,
 `Goal: ${materials.level_3_ready_to_apply.goal}`,
 `learning: ${materials.level_3_ready_to_apply.challenge}`,
 "learning: ",...materials.level_3_ready_to_apply.cross_domain_connections.map((item) => `- ${item}`),
 "",
 "## learning",
 intervention.visual_aid.image_prompt,
 "",
 "## learning",...intervention.video_storyboard.map((scene) => `${scene.scene_number}. ${scene.description} learning: ${scene.narration}`),
 "",
 "## learningquiz",...intervention.micro_quiz.map((item, index) => `${index + 1}. ${item.question}\nlearning of: ${item.purpose}\nlearningunderstanding: ${item.expected_understanding}`),
 "",
 "## teacher notes",...intervention.teacher_notes.map((item) => `- ${item.note} ${item.why_it_matters}`),
 "",
 "## pupil handout",
 intervention.student_facing_material?.body || "",
 "",
 intervention.student_facing_material?.practice_prompt? `practicelearning: ${intervention.student_facing_material.practice_prompt}`: ""];

 return lines.join("\n");}

 function validateIntervention(intervention) {const issues = [];
 const targetIds = new Set(intervention.target_misconceptions || []);

 if (!intervention.revised_teaching_plan?.steps?.length) {issues.push("Revised teaching plan has no steps.");}

 Object.entries(intervention.differentiated_materials || {}).forEach(([key, material]) => {if (!material.linked_misconception_ids?.length) {issues.push(`${key} is not linked to a misconception.`);}});

 intervention.micro_quiz?.forEach((question, index) => {if (!question.linked_misconception_ids?.length) {issues.push(`Micro quiz question ${index + 1} is not linked to a misconception.`);}});

 const linkedIds = collectLinkedIds(intervention);
 linkedIds.forEach((id) => {if (!targetIds.has(id)) {issues.push(`Linked misconception "${id}" is not in target_misconceptions.`);}});

 return {valid: issues.length === 0,
 issues};}

 function collectLinkedIds(intervention) {const ids = [];
 intervention.revised_teaching_plan?.steps?.forEach((step) => ids.push(...(step.linked_misconception_ids || [])));
 Object.values(intervention.differentiated_materials || {}).forEach((material) => ids.push(...(material.linked_misconception_ids || [])));
 ids.push(...(intervention.visual_aid?.linked_misconception_ids || []));
 intervention.micro_quiz?.forEach((item) => ids.push(...(item.linked_misconception_ids || [])));
 intervention.teacher_notes?.forEach((item) => ids.push(...(item.linked_misconception_ids || [])));
 ids.push(...(intervention.student_facing_material?.linked_misconception_ids || []));
 return ids;}

 const api = {generateIntervention,
 buildMarkdown,
 validateIntervention};

 global.TeachFlowInterventionEngine = api;

 if (typeof module!== "undefined") {module.exports = api;}})(typeof window!== "undefined"? window: globalThis);
