const aiProvider = require("./ai-provider.js");
const teacherAgentOrchestrator = require("./teacher-agent-orchestrator.js");
const studentAgentOrchestrator = require("./student-agent-orchestrator.js");

function getstatus() {return {...aiProvider.status(),
 routes: ["GET /api/ai/status",
 "POST /api/ai/teacher-agent",
 "POST /api/ai/student-agent",
 "POST /api/ai/student-wellbeing",
 "POST /api/ai/material-generator",
 "POST /api/ai/message-draft"],
 guardrails: ["AI output remains a draft until teacher confirmation.",
 "The pupil view only reads the pupil's own learning workspace.",
 "Do not send real names, emails, student IDs, secret keys or production private data.",
 "The model cannot replace clinical diagnosis, disciplinary action or final teaching decisions."]};}

async function answerteacherquestion(input) {const briefing = input.briefing || {};
 const question = clean(input.question || "", 700);
 const fallbackAnswer = teacherAgentOrchestrator.answerteacherAgentquestion(question, briefing);
 const live = await aiProvider.generateText({instructions: ["You are TeachFlow's teacher co-pilot agent.",
 "reply in English with a professional, concise and actionable tone.",
 "Use only anonymised pupil aliases and learning evidence. Do not invent identity information.",
 "All suggestions are drafts and require teacher confirmation before sending, assigning or exporting.",
 "Do not provide clinical diagnosis, performance labelling, disciplinary suggestions or out-of-scope promises.",
 "The reply should include what to prioritise, the evidence behind it, and the teacher's next step."].join("\n"),
 input: {question,
 briefing: compactteacherBriefing(briefing)},
 maxOutputTokens: 800});

 if (!live.ok ||!live.text) {return liveFallback("teacher-agent", fallbackAnswer, live);}

 return {agent: "teacher-agent",
 mode: "live",
 provider: live.provider,
 model: live.model,
 answer: clean(live.text, 1800),
 fallbackAnswer,
 generatedAt: new Date().toISOString()};}

async function answerStudentquestion(input) {const briefing = input.briefing || {};
 const question = clean(input.question || "", 700);
 const fallback = studentAgentOrchestrator.answerStudentquestion(question, briefing);
 const live = await aiProvider.generateText({instructions: ["You are TeachFlow's dedicated pupil learning assistant.",
 "reply in English, warmly and specifically, helping the pupil understand step by step.",
 "Only read the current pupil's own learning workspace. Do not mention other pupils.",
 "Do not write assignments or final answers for the pupil. Give hints, steps, questions and next actions.",
 "Ordinary explanations are private to the pupil by default. teachers only see a structured stuck-signal summary when the pupil chooses to share.",
 "If a pupil expresses crisis, self-harm, harm to others or other safety risks, suggest contacting a teacher, parent/guardian or trusted adult immediately. Do not diagnose."].join("\n"),
 input: {question,
 briefing: compactStudentBriefing(briefing),
 responseShape: {answer: "topupil viewofresponse",
 nextStep: "learning ofNext step",
 teacherVisiblePreview: "ifpupil selectShare, teachers can learnview learning of learning stuck signal summary"}},
 maxOutputTokens: 700});

 if (!live.ok ||!live.text) {return {...fallback,
 agent: "student-agent",
 mode: "local",
 provider: live.provider,
 model: live.model,
 aiError: live.error};}

 const parsed = parseLooseJson(live.text);
 const answer = clean(parsed?.answer || live.text, 1600);
 const nextStep = clean(parsed?.nextStep || fallback.nextStep, 220);
 const teacherVisiblePreview = clean(parsed?.teacherVisiblePreview || fallback.sharedraft?.teachersummary || "", 500);
 return {...fallback,
 agent: "student-agent",
 mode: "live",
 provider: live.provider,
 model: live.model,
 answer,
 nextStep,
 sharedraft: {...(fallback.sharedraft || {}),
 studentFacing: answer,
 teachersummary: teacherVisiblePreview || fallback.sharedraft?.teachersummary,
 teacherVisiblePreview: teacherVisiblePreview || fallback.sharedraft?.teacherVisiblePreview},
 generatedAt: new Date().toISOString()};}

async function answerStudentWellbeing(input) {const briefing = input.briefing || {};
 const message = clean(input.message || input.question || input.text || "", 800);
 const fallback = localStudentWellbeingreply(message, briefing);
 const live = await aiProvider.generateText({instructions: ["You are TeachFlow's AI pupil wellbeing assistant, not a clinician, therapist or crisis hotline.",
 "reply in English with a warm, steady and specific tone. Acknowledge the pupil's feeling first, then turn stress into one small next step.",
 "Only provide learning-stress support, mood organisation, help-request wording and self-care suggestions. Do not provide clinical diagnosis, condition labels, treatment plans or medication suggestions.",
 "Do not promise confidentiality beyond system boundaries. Ordinary wellbeing chat notes are private to the pupil by default; when shared, teachers only see a learning-related summary.",
 "If a pupil may harm themselves, harm others, be harmed, or be in immediate danger, suggest contacting a trusted adult, teacher, parent/guardian, school support staff or local emergency services immediately.",
 "Output JSON with the fields answer, copingStep and safetyNote."].join("\n"),
 input: {message,
 briefing: compactStudentBriefing(briefing),
 responseShape: {answer: "topupil viewofWellbeingreply",
 copingStep: "learning, nowlearning ofNext step",
 safetyNote: "learning ofhumanhelp requestReminder"}},
 maxOutputTokens: 700});

 if (!live.ok ||!live.text) {return {...fallback,
 mode: "local",
 provider: live.provider,
 model: live.model,
 aiError: live.error};}

 const parsed = parseLooseJson(live.text);
 const answer = clean(parsed?.answer || live.text, 1600);
 const copingStep = clean(parsed?.copingStep || fallback.copingStep, 240);
 const safetyNote = clean(parsed?.safetyNote || fallback.safetyNote, 360);
 return {agent: "student-wellbeing-coach",
 mode: "live",
 provider: live.provider,
 model: live.model,
 answer,
 copingStep,
 safetyNote,
 generatedAt: new Date().toISOString()};}

async function generatematerial(input) {const briefing = input.briefing || {};
 const type = normalizematerialType(input.type || input.materialType || "Handout");
 const kind = materialKind(type);

 if (kind === "image") return generateImagematerial(input, briefing, type);
 if (kind === "exercise") return generateExercisematerial(input, briefing, type);
 return generateHandoutmaterial(input, briefing, type);}

async function generateHandoutmaterial(input, briefing, type) {const live = await aiProvider.generateText({instructions: ["You are TeachFlow's handout generation agent.",
 "generate an English handout draft that teachers can review and pupils can read.",
 "Keep the subject explanation accurate, accessible and usable in class.",
 "Output JSON with kind, title, type, target level, goal, sections, keyPoints, teacher notes, student task and review checklist.",
 "sections is an array; each item contains heading and body.",
 "Do not publish automatically to pupils. All content waits for teacher approval."].join("\n"),
 input: {materialType: type,
 topic: input.topic || briefing.topic,
 targetLevel: input.targetLevel || "Level 1-2",
 teacherRequest: input.prompt || input.request || "",
 briefing: compactteacherBriefing(briefing)},
 maxOutputTokens: 1300});

 if (!live.ok ||!live.text) {return {agent: "material-generator",
 mode: "local",
 provider: live.provider,
 model: live.model,
 error: live.error,
 draft: localHandoutdraft(type, briefing)};}

 return {agent: "material-generator",
 mode: "live",
 provider: live.provider,
 model: live.model,
 draft: {kind: "handout", type,...(parseLooseJson(live.text) || {title: `${type}draft`, content: live.text})},
 generatedAt: new Date().toISOString()};}

async function generateExercisematerial(input, briefing, type) {const live = await aiProvider.generateText({instructions: ["You are TeachFlow's practice generation agent.",
 "generate an English class practice draft that teachers can review.",
 "questions should centre on the current topic, support differentiation and avoid pupil privacy leaks.",
 "Output JSON with kind, title, type, target level, goal, exercises, answer key, teacher notes, student task and review checklist.",
 "exercises is an array; each item contains id, level, question, expectedAnswer and hint.",
 "answer key is for teacher answers and review points.",
 "Do not publish automatically to pupils. All content waits for teacher approval."].join("\n"),
 input: {materialType: type,
 topic: input.topic || briefing.topic,
 targetLevel: input.targetLevel || "Level 1-2",
 teacherRequest: input.prompt || input.request || "",
 briefing: compactteacherBriefing(briefing)},
 maxOutputTokens: 1500});

 if (!live.ok ||!live.text) {return {agent: "material-generator",
 mode: "local",
 provider: live.provider,
 model: live.model,
 error: live.error,
 draft: localExercisedraft(type, briefing)};}

 return {agent: "material-generator",
 mode: "live",
 provider: live.provider,
 model: live.model,
 draft: {kind: "exercise", type,...(parseLooseJson(live.text) || {title: `${type}draft`, exercises: [{id: "Q1", level: "Level 1", question: live.text}]})},
 generatedAt: new Date().toISOString()};}

async function generateImagematerial(input, briefing, type) {const topic = clean(input.topic || briefing.topic || "current topic", 160);
 const teacherRequest = clean(input.prompt || input.request || "", 800);
 const title = `${topic} diagram`;
 const imagePrompt = ["generate a class-ready English teaching diagram for secondary school.",
 `Topic: ${topic}`,
 `teacher goal: ${teacherRequest || "support pupil learning intuitiveunderstanding."}`,
 "visual requirements: clean, bright, minimal text, clear concept structure, suitable for class projection.",
 "If text appears in the image, keep it short and in English. Do not include real pupil names, emails, student IDs or private information.",
 "Style: modern educational infographic, white background, clear lines and restrained colour coding."].join("\n");

 const live = await aiProvider.generateImage({prompt: imagePrompt,
 size: input.imageSize || "1024x1024",
 quality: input.imageQuality || "medium"});

 if (!live.ok ||!live.imageBase64) {return {agent: "material-generator",
 mode: "local",
 provider: live.provider,
 model: live.model,
 error: live.error,
 draft: localImagedraft(type, briefing, topic, imagePrompt)};}

 return {agent: "material-generator",
 mode: "live",
 provider: live.provider,
 model: live.model,
 draft: {kind: "image",
 type,
 title,
 topic,
 targetLevel: input.targetLevel || "Level 1-2",
 goal: teacherRequest || "diagram support pupil learning intuitiveunderstanding.",
 imagePrompt,
 imageBase64: live.imageBase64,
 revisedPrompt: live.revisedPrompt,
 teachernotes: "teacher diagramis class learning, is learning needs notes.",
 studentTask: "view diagram learning, learningone sentencenotes diagramin learning of learning.",
 reviewChecklist: ["diagramis learningaccurate", "learning is learningmore", "is learningsuitablelearning", "is learning needs learningexplanation"]},
 generatedAt: new Date().toISOString()};}

async function draftteachermessage(input) {const briefing = input.briefing || {};
 const studentAlias = clean(input.studentAlias || input.alias || "", 30);
 const live = await aiProvider.generateText({instructions: ["You are TeachFlow's teacher message draft agent.",
 "Write a short English message draft for the teacher.",
 "Use an encouraging, specific and low-stress tone; avoid labelling or diagnosis.",
 "only pupil aliasesand learning evidence, cannotlearningreallearning.",
 "output JSON: studentAlias, message, reason, teacher review checklist."].join("\n"),
 input: {studentAlias,
 purpose: input.purpose || input.prompt || "learning supportreply",
 briefing: compactteacherBriefing(briefing)},
 maxOutputTokens: 550});

 if (!live.ok ||!live.text) {const draft = (briefing.messagedrafts || []).find((item) => item.studentAlias === studentAlias) || briefing.messagedrafts?.[0] || {};
 return {agent: "message-draft",
 mode: "local",
 provider: live.provider,
 model: live.model,
 error: live.error,
 draft: {studentAlias: studentAlias || draft.studentAlias || "",
 message: draft.text || "learning view learning in learningspecificlearning.first learning, learningfirst learning step.",
 reason: "learning rules generate",
 teacherreviewChecklist: ["confirmtonelearning", "confirm learning evidenceaccurate", "confirmis learning needsassignmaterial"]}};}

 return {agent: "message-draft",
 mode: "live",
 provider: live.provider,
 model: live.model,
 draft: parseLooseJson(live.text) || {studentAlias, message: live.text},
 generatedAt: new Date().toISOString()};}

function liveFallback(agent, answer, live) {return {agent,
 mode: "local",
 provider: live.provider,
 model: live.model,
 answer,
 aiError: live.error,
 generatedAt: new Date().toISOString()};}

function localStudentWellbeingreply(message, briefing) {const text = clean(message, 800);
 const riskPattern = /Self-harm|not wanting to live|harm self|harm others|kill myself|suicide|self harm|die/i;
 if (riskPattern.test(text)) {return {agent: "student-wellbeing-coach",
 answer: "Thank you for saying something this important. This is not something AI should handle alone. Please contact a trusted adult now, such as a teacher, parent/guardian, school support staff or local emergency service. If you are in immediate danger, move to safety first and seek human help.",
 copingStep: "nowfirst learningtrustedof learning, learning: learningnowlearning safety, needs learning.",
 safetyNote: "AI cannotlearninghumancrisissupport; learningharm selfor learning ofrisklearning, needsimmediatelycontacthuman.",
 generatedAt: new Date().toISOString()};}

 const topic = briefing.topic || briefing.profile?.topic || "current learning";
 const need = briefing.profile?.stuckType || "nowlearning of learning";
 const answer = text? `learning: learningnowlearningonlyis learningwill, learning is learningStresslearning in learning in.learningfirst learning“will learnwill”, firstturnlearning.and“${topic}”learning of learning, canfirst learningone sentence: learningnowlearning in“${need}”, learning.`: "learning in.learningcanturnlearningStress, learningaskquestion, learning, learning.learningwillto learning, onlywill learnturnlearningcan learnof learning step.";
 return {agent: "student-wellbeing-coach",
 answer,
 copingStep: "first learning 30 learning: learning, learning, thenonly learning“learningnowlearning needs learning ofis……”.",
 safetyNote: "ifStressalready learning or learning safety, learningimmediatelyteacher, parent/guardian, school support learning or learningemergencylearning.",
 generatedAt: new Date().toISOString()};}

function compactteacherBriefing(briefing) {return {className: briefing.className,
 topic: briefing.topic,
 summary: briefing.summary,
 insight: briefing.insight,
 priorities: first(briefing.priorities, 4),
 priorityTasks: first(briefing.priorityTasks, 4).map((item) => pick(item, ["title", "reason", "targetLabel", "next step"])),
 misconceptions: first(briefing.misconceptions, 4).map((item) => pick(item, ["name", "count", "severity", "representativeevidence"])),
 studentFocus: first(briefing.studentFocus, 6).map((item) => pick(item, ["studentAlias", "priorityLabel", "mainNeed", "assignment status", "recommendedAction"])),
 messagedrafts: first(briefing.messagedrafts, 4),
 materialdrafts: first(briefing.materialdrafts, 4),
 outcomeEvaluation: briefing.outcomeEvaluation? pick(briefing.outcomeEvaluation, ["summary", "metrics", "next teacher actions"]): null,
 safetynotes: briefing.safetynotes || briefing.guardrails || []};}

function compactStudentBriefing(briefing) {return {studentAlias: briefing.studentAlias,
 className: briefing.className,
 topic: briefing.topic,
 summary: briefing.summary,
 profile: briefing.profile,
 nextPlan: first(briefing.nextPlan, 3),
 sourceSignals: briefing.sourceSignals,
 memory: first(briefing.memory, 5),
 privacynotes: briefing.privacynotes};}

function localmaterialdraft(type, briefing) {const firstCluster = briefing.misconceptions?.[0] || {};
 return {title: `${briefing.topic || "current topic"} ${type}draft`,
 type,
 targetLevel: firstCluster.severity === "high"? "Level 1-2": "Level 2-3",
 goal: firstCluster.name? `support pupil learning ${firstCluster.name} `: "support pupil completed learningunderstandingof learning step",
 outline: ["Core concept", "Low-threshold example", "pupil practice", "teacher review points"],
 teachernotes: "learning rules generate, Suggestedteacher approval learningthen learning.",
 studentTask: "Write the one sentence you are least sure about.",
 reviewChecklist: ["is learningthis class progress", "Avoids privacy leaks", "needs simpler language"]};}

function parseLooseJson(text) {const raw = String(text || "").trim();
 if (!raw) return null;
 const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
 const candidate = fenced? fenced[1].trim(): raw;
 try {return JSON.parse(candidate);} catch (error) {const start = candidate.indexOf("{");
 const end = candidate.lastIndexOf("}");
 if (start >= 0 && end > start) {try {return JSON.parse(candidate.slice(start, end + 1));} catch (innerError) {return null;}}
 return null;}}

function first(items, count) {return (Array.isArray(items)? items: []).slice(0, count);}

function pick(value, keys) {const result = {};
 keys.forEach((key) => {if (value && value[key]!== undefined) result[key] = value[key];});
 return result;}

function clean(value, max) {const text = String(value || "").replace(/\s+/g, " ").trim();
 return max? text.slice(0, max): text;}

async function generatematerial(input) {const briefing = input.briefing || {};
 const type = normalizematerialType(input.type || input.materialType || "Handout");
 const kind = materialKind(type);

 if (kind === "image") return generateImagematerial(input, briefing, type);
 if (kind === "exercise") return generateExercisematerial(input, briefing, type);
 return generateHandoutmaterial(input, briefing, type);}

async function generateHandoutmaterial(input, briefing, type) {const topic = materialTopic(input, briefing);
 const targetLevel = clean(input.targetLevel || "Level 1-2", 80);
 const teacherRequest = clean(input.prompt || input.request || "", 900);
 const live = await aiProvider.generateText({instructions: ["learning is TeachFlow ofclass handout generate Agent.",
 "learningEnglishgenerate teachers can learn, pupil learning ofhandout draft.",
 "Output valid JSON only. Do not add explanations outside the JSON.",
 "JSON fields: kind, title, type, target level, goal, sections, keyPoints, teacher notes, student task, review checklist.",
 "sections is an array; each item contains heading and body.",
 "All content is draft-only and must wait for teacher approval before publishing."].join("\n"),
 input: {materialType: type,
 topic,
 targetLevel,
 teacherRequest,
 briefing: compactteacherBriefing(briefing)},
 maxOutputTokens: 1400});

 if (!live.ok ||!live.text) {return localmaterialResult("handout", live, localHandoutdraft(type, briefing, topic, targetLevel, teacherRequest));}

 const parsed = parseLooseJson(live.text);
 return {agent: "material-generator",
 mode: "live",
 provider: live.provider,
 model: live.model,
 draft: {kind: "handout",
 type,
 title: `${topic} handout draft`,
 targetLevel,
 goal: teacherRequest || "support pupil learningaccessibleunderstanding.",...(parsed || {content: live.text})},
 generatedAt: new Date().toISOString()};}

async function generateExercisematerial(input, briefing, type) {const topic = materialTopic(input, briefing);
 const targetLevel = clean(input.targetLevel || "Level 1-2", 80);
 const teacherRequest = clean(input.prompt || input.request || "", 900);
 const live = await aiProvider.generateText({instructions: ["learning is TeachFlow ofclass practice generate Agent.",
 "learningEnglishgenerate teachers can learnof learning practice questions draft.",
 "Output valid JSON only. Do not add explanations outside the JSON.",
 "JSON fields: kind, title, type, target level, goal, exercises, answer key, teacher notes, student task, review checklist.",
 "exercises is an array; each item contains id, level, question, expectedAnswer and hint.",
 "answer key is for teacher answers and review points.",
 "do notpupil completed assignment, practicemustwaiting teacher approval publish."].join("\n"),
 input: {materialType: type,
 topic,
 targetLevel,
 teacherRequest,
 briefing: compactteacherBriefing(briefing)},
 maxOutputTokens: 1600});

 if (!live.ok ||!live.text) {return localmaterialResult("exercise", live, localExercisedraft(type, briefing, topic, targetLevel, teacherRequest));}

 const parsed = parseLooseJson(live.text);
 return {agent: "material-generator",
 mode: "live",
 provider: live.provider,
 model: live.model,
 draft: {kind: "exercise",
 type,
 title: `${topic} practice draft`,
 targetLevel,
 goal: teacherRequest || "support pupil learningunderstandingstuck signal.",...(parsed || {exercises: [{id: "Q1", level: targetLevel, question: live.text, expectedAnswer: "", hint: ""}]})},
 generatedAt: new Date().toISOString()};}

async function generateImagematerial(input, briefing, type) {const topic = materialTopic(input, briefing);
 const targetLevel = clean(input.targetLevel || "Level 1-2", 80);
 const teacherRequest = clean(input.prompt || input.request || "", 900);
 const imagePrompt = ["Create a clean classroom teaching diagram for high-school students.",
 `Topic: ${topic}`,
 `teacher goal: ${teacherRequest || "help students build intuitive understanding"}`,
 "Style: modern educational infographic, white background, crisp lines, restrained colors, clear visual hierarchy.",
 "Use very little text. If Chinese labels are necessary, keep them short and simple.",
 "Do not include real student names, email addresses, school IDs, faces, or private information."].join("\n");

 const live = await aiProvider.generateImage({prompt: imagePrompt,
 size: input.imageSize || "1024x1024",
 quality: input.imageQuality || "medium"});

 const basedraft = {kind: "image",
 type,
 title: `${topic} diagram draft`,
 topic,
 targetLevel,
 goal: teacherRequest || "diagram support pupil learning intuitiveunderstanding.",
 imagePrompt,
 teachernotes: "teacher diagramis learningaccurate, is learningsuitablelearning, learning is learning needs notes.",
 studentTask: "view diagram learning, learningone sentencenotes diagramin learning of learning.",
 reviewChecklist: ["diagramis learningaccurate", "learning is learningmore", "is learningsuitableclass learning", "is learning needs learningexplanation"]};

 if (!live.ok ||!live.imageBase64) {return localmaterialResult("image", live, localImagedraft(type, briefing, topic, targetLevel, teacherRequest, imagePrompt));}

 return {agent: "material-generator",
 mode: "live",
 provider: live.provider,
 model: live.model,
 draft: {...basedraft,
 imageBase64: live.imageBase64,
 revisedPrompt: live.revisedPrompt || ""},
 generatedAt: new Date().toISOString()};}

function normalizematerialType(value) {const text = clean(value, 80);
 if (/visual|diagram|image|diagram|image|diagram/i.test(text)) return "visual";
 if (/practice|exercise|quiz|exercise|quiz|practice/i.test(text)) return "practice";
 return "Handout";}

function materialKind(type) {if (type === "visual") return "image";
 if (type === "practice") return "exercise";
 return "handout";}

function materialTopic(input, briefing) {return clean(input.topic || briefing.topic || "current course topic", 160);}

function localmaterialResult(kind, live, draft) {return {agent: "material-generator",
 mode: "local",
 provider: live.provider,
 model: live.model,
 error: live.error,
 draft: {kind,...draft},
 generatedAt: new Date().toISOString()};}

function localHandoutdraft(type, briefing, topic, targetLevel, teacherRequest) {const firstCluster = briefing.misconceptions?.[0] || {};
 return {kind: "handout",
 title: `${topic} handout draft`,
 type,
 topic,
 targetLevel: targetLevel || (firstCluster.severity === "high"? "Level 1-2": "Level 2-3"),
 goal: teacherRequest || (firstCluster.name? `support pupil learning“${firstCluster.name}”.`: "Help pupils complete one understandable small step."),
 sections: [{heading: "Core concept", body: "learningaccessiblelearningThis lessonlearning ofconcept."},
 {heading: "everydaylearning", body: "pupil learning of learningconcept."},
 {heading: "class task", body: "pupil learning ofone sentence."}],
 keyPoints: ["first learning intuitiveunderstanding", "then learning", "finallylearningunderstanding"],
 teachernotes: "learning rules generate, Suggestedteacher approval learningthen learning.",
 studentTask: "Write the one sentence you are least sure about.",
 reviewChecklist: ["is learningthis class progress", "is learning privacy learning", "needs simpler language"]};}

function localExercisedraft(type, briefing, topic, targetLevel, teacherRequest) {return {kind: "exercise",
 title: `${topic} practice draft`,
 type,
 topic,
 targetLevel,
 goal: teacherRequest || "learning support pupil learningunderstanding.",
 exercises: [{id: "Q1", level: "Level 1", question: "learning of learningconceptis learning.", expectedAnswer: "learning.", hint: "first learning formula, first learning."},
 {id: "Q2", level: "Level 2", question: "learning is learningconcept, notes reason.", expectedAnswer: "learning to learning reason.", hint: "learning andfor learning."},
 {id: "Q3", level: "Level 3", question: "turnlearningconceptlearning in.", expectedAnswer: "learning.", hint: "first learning already learning and learning."}],
 answerKey: ["Q1: pupilis learning.", "Q2: learning reasonis learning andconceptfor learning.", "Q3: learning, learningonlyview answers."],
 teachernotes: "learning rules generate, Suggestedteacher approval learningthen learning.",
 studentTask: "first learning completed Q1, thenselect Q2 or Q3.",
 reviewChecklist: ["questionsis class goal", "answersis learningclear", "is learningsuitablecurrent level"]};}

function localImagedraft(type, briefing, topic, targetLevel, teacherRequest, imagePrompt) {return {kind: "image",
 title: `${topic} diagram draft`,
 type,
 topic,
 targetLevel,
 goal: teacherRequest || "diagram support pupil learning intuitiveunderstanding.",
 imagePrompt,
 teachernotes: "visual learningusablegenerate diagram notes draft.learning visual generaterealvisual.",
 studentTask: "view diagram learning, learningone sentencenotes diagramin learning of learning.",
 reviewChecklist: ["diagramis learningaccurate", "is learningsuitablelearning", "is learning needs learningexplanation"]};}

module.exports = {getstatus,
 answerteacherquestion,
 answerStudentquestion,
 answerStudentWellbeing,
 generatematerial,
 draftteachermessage};
