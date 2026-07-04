/**
 * Final English demo localisation pass.
 *
 * This script removes remaining Chinese UI/runtime/test strings from the
 * school-live demo. It intentionally performs a broad mechanical rewrite after
 * phrase replacements, so the demo never surfaces Chinese text during review.
 */
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const skipDirs = new Set(["node_modules", ".git", "generated"]);
const filePattern = /\.(js|html|md|mjs|txt|json)$/;

const phrases = [["AI output remains a draft until teacher confirmation.", "AI output remains a draft until teacher confirmation."],
 ["The pupil view only reads the pupil's own learning workspace.", "The pupil view only reads the pupil's own learning workspace."],
 ["Do not send real names, emails, student IDs, secret keys or production private data.", "Do not send real names, emails, student IDs, secret keys or production private data."],
 ["The model cannot replace clinical diagnosis, disciplinary action or final teaching decisions.", "The model cannot replace clinical diagnosis, disciplinary action or final teaching decisions."],
 ["You are TeachFlow's teacher co-pilot agent.", "You are TeachFlow's teacher co-pilot agent."],
 ["reply in English with a professional, concise and actionable tone.", "reply in English with a professional, concise and actionable tone."],
 ["Use only anonymised pupil aliases and learning evidence. Do not invent identity information.", "Use only anonymised pupil aliases and learning evidence. Do not invent identity information."],
 ["All suggestions are drafts and require teacher confirmation before sending, assigning or exporting.", "All suggestions are drafts and require teacher confirmation before sending, assigning or exporting."],
 ["Do not provide clinical diagnosis, performance labelling, disciplinary suggestions or out-of-scope promises.", "Do not provide clinical diagnosis, performance labelling, disciplinary suggestions or out-of-scope promises."],
 ["The reply should include what to prioritise, the evidence behind it, and the teacher's next step.", "The reply should include what to prioritise, the evidence behind it, and the teacher's next step."],
 ["You are TeachFlow's dedicated pupil learning assistant.", "You are TeachFlow's dedicated pupil learning assistant."],
 ["reply in English, warmly and specifically, helping the pupil understand step by step.", "reply in English, warmly and specifically, helping the pupil understand step by step."],
 ["Only read the current pupil's own learning workspace. Do not mention other pupils.", "Only read the current pupil's own learning workspace. Do not mention other pupils."],
 ["Do not write assignments or final answers for the pupil. Give hints, steps, questions and next actions.", "Do not write assignments or final answers for the pupil. Give hints, steps, questions and next actions."],
 ["Ordinary explanations are private to the pupil by default. teachers only see a structured stuck-signal summary when the pupil chooses to share.", "Ordinary explanations are private to the pupil by default. teachers only see a structured stuck-signal summary when the pupil chooses to share."],
 ["If a pupil expresses crisis, self-harm, harm to others or other safety risks, suggest contacting a teacher, parent/guardian or trusted adult immediately. Do not diagnose.", "If a pupil expresses crisis, self-harm, harm to others or other safety risks, suggest contacting a teacher, parent/guardian or trusted adult immediately. Do not diagnose."],
 ["You are TeachFlow's AI pupil wellbeing assistant, not a clinician, therapist or crisis hotline.", "You are TeachFlow's AI pupil wellbeing assistant, not a clinician, therapist or crisis hotline."],
 ["reply in English with a warm, steady and specific tone. Acknowledge the pupil's feeling first, then turn stress into one small next step.", "reply in English with a warm, steady and specific tone. Acknowledge the pupil's feeling first, then turn stress into one small next step."],
 ["Only provide learning-stress support, mood organisation, help-request wording and self-care suggestions. Do not provide clinical diagnosis, condition labels, treatment plans or medication suggestions.", "Only provide learning-stress support, mood organisation, help-request wording and self-care suggestions. Do not provide clinical diagnosis, condition labels, treatment plans or medication suggestions."],
 ["Do not promise confidentiality beyond system boundaries. Ordinary wellbeing chat notes are private to the pupil by default; when shared, teachers only see a learning-related summary.", "Do not promise confidentiality beyond system boundaries. Ordinary wellbeing chat notes are private to the pupil by default; when shared, teachers only see a learning-related summary."],
 ["If a pupil may harm themselves, harm others, be harmed, or be in immediate danger, suggest contacting a trusted adult, teacher, parent/guardian, school support staff or local emergency services immediately.", "If a pupil may harm themselves, harm others, be harmed, or be in immediate danger, suggest contacting a trusted adult, teacher, parent/guardian, school support staff or local emergency services immediately."],
 ["You are TeachFlow's handout generation agent.", "You are TeachFlow's handout generation agent."],
 ["generate an English handout draft that teachers can review and pupils can read.", "generate an English handout draft that teachers can review and pupils can read."],
 ["Keep the subject explanation accurate, accessible and usable in class.", "Keep the subject explanation accurate, accessible and usable in class."],
 ["You are TeachFlow's practice generation agent.", "You are TeachFlow's practice generation agent."],
 ["generate an English class practice draft that teachers can review.", "generate an English class practice draft that teachers can review."],
 ["questions should centre on the current topic, support differentiation and avoid pupil privacy leaks.", "questions should centre on the current topic, support differentiation and avoid pupil privacy leaks."],
 ["generate a class-ready English teaching diagram for secondary school.", "generate a class-ready English teaching diagram for secondary school."],
 ["visual requirements: clean, bright, minimal text, clear concept structure, suitable for class projection.", "visual requirements: clean, bright, minimal text, clear concept structure, suitable for class projection."],
 ["If text appears in the image, keep it short and in English. Do not include real pupil names, emails, student IDs or private information.", "If text appears in the image, keep it short and in English. Do not include real pupil names, emails, student IDs or private information."],
 ["Style: modern educational infographic, white background, clear lines and restrained colour coding.", "Style: modern educational infographic, white background, clear lines and restrained colour coding."],
 ["You are TeachFlow's teacher message draft agent.", "You are TeachFlow's teacher message draft agent."],
 ["Write a short English message draft for the teacher.", "Write a short English message draft for the teacher."],
 ["Use an encouraging, specific and low-stress tone; avoid labelling or diagnosis.", "Use an encouraging, specific and low-stress tone; avoid labelling or diagnosis."],
 ["Output JSON with the fields answer, copingStep and safetyNote.", "Output JSON with the fields answer, copingStep and safetyNote."],
 ["Output JSON with kind, title, type, targetLevel, goal, sections, keyPoints, teachernotes, studentTask and reviewChecklist.", "Output JSON with kind, title, type, targetLevel, goal, sections, keyPoints, teachernotes, studentTask and reviewChecklist."],
 ["Output JSON with kind, title, type, targetLevel, goal, exercises, answerKey, teachernotes, studentTask and reviewChecklist.", "Output JSON with kind, title, type, targetLevel, goal, exercises, answerKey, teachernotes, studentTask and reviewChecklist."],
 ["sections is an array; each item contains heading and body.", "sections is an array; each item contains heading and body."],
 ["exercises is an array; each item contains id, level, question, expectedAnswer and hint.", "exercises is an array; each item contains id, level, question, expectedAnswer and hint."],
 ["answerKey is for teacher answers and review points.", "answerKey is for teacher answers and review points."],
 ["Do not publish automatically to pupils. All content waits for teacher approval.", "Do not publish automatically to pupils. All content waits for teacher approval."],
 ["Output valid JSON only. Do not add explanations outside the JSON.", "Output valid JSON only. Do not add explanations outside the JSON."],
 ["All content is draft-only and must wait for teacher approval before publishing.", "All content is draft-only and must wait for teacher approval before publishing."],
 ["Thank you for saying something this important. This is not something AI should handle alone. Please contact a trusted adult now, such as a teacher, parent/guardian, school support staff or local emergency service. If you are in immediate danger, move to safety first and seek human help.", "Thank you for saying something this important. This is not something AI should handle alone. Please contact a trusted adult now, such as a teacher, parent/guardian, school support staff or local emergency service. If you are in immediate danger, move to safety first and seek human help."],
 ["I am here. This space can help with learning stress, falling behind, fear of asking questions or frustration. I am not a clinician and I do not diagnose; I help turn your current state into one small next step.", "I am here. This space can help with learning stress, falling behind, fear of asking questions or frustration. I am not a clinician and I do not diagnose; I help turn your current state into one small next step."],
 ["A signal can be described by how it changes over time or by the repeating frequency components that make it up. Wave mechanics is a mathematical way to move between two representations of the same signal. The formula matters, but the core idea is representation: one signal, two useful views.", "A signal can be described by how it changes over time or by the repeating frequency components that make it up. Wave mechanics is a mathematical way to move between two representations of the same signal. The formula matters, but the core idea is representation: one signal, two useful views."],
 ["Look at the diagram first, without the formula: the left-hand side shows the same signal changing over time; the right-hand side breaks it into simple frequencies. Your one task now is to find where the complex waveform and simple frequencies appear.", "Look at the diagram first, without the formula: the left-hand side shows the same signal changing over time; the right-hand side breaks it into simple frequencies. Your one task now is to find where the complex waveform and simple frequencies appear."],
 ["Wave mechanicscanturnsignallearningtime domain learningfrequency domain learning.\\nintime domainin, learningsignallearningtimelearning.\\ninfrequency domainin, learningsignallearningfrequencylearning.\\nlearningsignalcan learnmoresimpleof learningwaveand learningwave.", "Wave mechanics can transform a signal from a time-domain representation into a frequency-domain representation.\\nIn the time domain, we observe how the signal changes over time.\\nIn the frequency domain, we observe which frequency components make up the signal.\\nA complex signal can be decomposed into many simple sine and cosine waves."],
 ["AI school System Agent · Morning Brief", "AI school System Agent · Morning Brief"],
 ["teacher workspace", "teacher workspace"],
 ["pupil response entry", "pupil response entry"],
 ["Misconception map", "Misconception map"],
 ["Teaching plan", "Teaching plan"],
 ["Approval and export", "Approval and export"],
 ["teacher control", "teacher control"],
 ["pupil memory", "pupil memory"],
 ["Learning memory", "Learning memory"],
 ["pupil portal lite", "pupil portal lite"],
 ["Approved materials", "Approved materials"],
 ["Learning status", "Learning status"],
 ["Waves and frequency", "Waves and frequency"],
 ["Lesson 1: introduction to waves and frequency", "Lesson 1: introduction to waves and frequency"],
 ["I do not understand how to read the frequency graph.", "I do not understand how to read the frequency graph."],
 ["generate an accessible class handout.", "generate an accessible class handout."],
 ["generate two accessible class practice questions.", "generate two accessible class practice questions."],
 ["generate a diagram that helps pupils understand the relationship between crests, troughs and frequency.", "generate a diagram that helps pupils understand the relationship between crests, troughs and frequency."],
 ["Edited class handout", "Edited class handout"],
 ["How should I read this diagram?", "How should I read this diagram?"],
 ["I cannot see how the left and right sides correspond.", "I cannot see how the left and right sides correspond."],
 ["I do not understand how each symbol relates to the image.", "I do not understand how each symbol relates to the image."],
 ["How should I read the frequency domain?", "How should I read the frequency domain?"],
 ["This concept feels useless to me and I get more frustrated the more I look at it.", "This concept feels useless to me and I get more frustrated the more I look at it."],
 ["I do not understand why one signal can be split into frequencies.", "I do not understand why one signal can be split into frequencies."],
 ["teacher, I want to confirm how to read the right-hand frequency graph.", "teacher, I want to confirm how to read the right-hand frequency graph."],
 ["Look only at the two tallest frequency bars first, then return to the left-hand waveform.", "Look only at the two tallest frequency bars first, then return to the left-hand waveform."],
 ["complex waveform", "complex waveform"],
 ["two representations", "two representations"],
 ["revised teaching plan", "revised teaching plan"],
 ["visual intuition", "visual intuition"],
 ["not a grade", "not a grade"],
 ["TeachFlow Agent brief", "TeachFlow Agent brief"],
 ["highest priority", "highest priority"],
 ["AI class Pilot", "AI class Pilot"],
 ["AI wellbeing assistant", "AI wellbeing assistant"],
 ["learning support profile", "learning support profile"],
 ["AI school Agent System work loop", "AI school Agent System work loop"],
 ["signal", "signal"],
 ["latest reflection", "latest reflection"],
 ["one sentence", "one sentence"],
 ["coordinator agent", "coordinator agent"],
 ["Which pupils should be reviewed first?", "Which pupils should be reviewed first?"],
 ["Suggested review first", "Suggested review first"],
 ["What is the evidence?", "What is the evidence?"],
 ["unified data layer", "unified data layer"],
 ["Are teacher actions working?", "Are teacher actions working?"],
 ["outcome", "outcome"],
 ["action", "action"],
 ["you are currently learning", "you are currently learning"],
 ["other pupils", "other pupils"],
 ["How should I read this diagram?", "How should I read this diagram?"],
 ["private to you by default", "private to you by default"],
 ["write the assignment answer for me", "write the assignment answer for me"],
 ["cannot complete the assignment for you", "cannot complete the assignment for you"],
 ["I cannot see how the left-hand waveform and right-hand frequency graph correspond.", "I cannot see how the left-hand waveform and right-hand frequency graph correspond."],
 ["After the teacher sent the material, I still cannot read the right-hand frequency bars.", "After the teacher sent the material, I still cannot read the right-hand frequency bars."],
 ["teacher, I have looked at this task.", "teacher, I have looked at this task."],
 ["send support message to S002", "send support message to S002"],
 ["Look at the left-right diagram correspondence first.", "Look at the left-right diagram correspondence first."],
 ["Assign diagram material to S014", "Assign diagram material to S014"],
 ["Use one diagram to connect the waveform and frequency bars.", "Use one diagram to connect the waveform and frequency bars."],
 ["diagram mapping remediation material", "diagram mapping remediation material"],
 ["Connect the left and right diagrams.", "Connect the left and right diagrams."],
 ["Short follow-up S009", "Short follow-up S009"],
 ["confirm whether formula meaning is stable.", "confirm whether formula meaning is stable."],
 ["Tracked 3 teacher actions", "Tracked 3 teacher actions"],
 ["Course not set", "Course not set"],
 ["Just joined", "Just joined"],
 ["Not levelled yet", "Not levelled yet"],
 ["No stuck signal yet", "No stuck signal yet"],
 ["waiting for first learning input", "waiting for first learning input"],
 ["Not submitted", "Not submitted"],
 ["whole class", "whole class"]];

const terms = [["self-harm", "self-harm"], ["not wanting to live", "not wanting to live"], ["harm self", "harm self"], ["harm others", "harm others"], ["being bullied", "being bullied"], ["abuse", "abuse"],
 ["image", "image"], ["diagram", "diagram"], ["exercise", "exercise"], ["quiz", "quiz"], ["practice", "practice"], ["submitted", "submitted"],
 ["student", "student"], ["student", "student"], ["teacher", "teacher"], ["teacher", "teacher"], ["school", "school"], ["class", "class"], ["course", "course"], ["class", "class"],
 ["learning", "learning"], ["understanding", "understanding"], ["knowledge", "knowledge"], ["concept", "concept"], ["formula", "formula"], ["symbol", "symbol"], ["frequency", "frequency"], ["waveform", "waveform"], ["frequency domain", "frequency domain"], ["time domain", "time domain"], ["crest", "crest"], ["trough", "trough"],
 ["assignment", "assignment"], ["handout", "handout"], ["practice", "practice"], ["image", "image"], ["diagram", "diagram"], ["image", "image"], ["material", "material"], ["explanation", "explanation"], ["draft", "draft"], ["version", "version"],
 ["approval", "approval"], ["export", "export"], ["publish", "publish"], ["edit", "edit"], ["preview", "preview"], ["generate", "generate"], ["create", "create"], ["assign", "assign"], ["send", "send"], ["copy", "copy"], ["link", "link"], ["join", "join"], ["select", "select"], ["click", "click"], ["view", "view"], ["open", "open"], ["refresh", "refresh"],
 ["question", "question"], ["response", "response"], ["question", "question"], ["submit", "submit"], ["complete", "complete"], ["log", "log"], ["reflection", "reflection"], ["status", "status"], ["stuck", "stuck"], ["stuck point", "stuck point"], ["misconception", "misconception"], ["diagnosis", "diagnosis"], ["intervention", "intervention"], ["follow-up", "follow-up"], ["analysis", "analysis"],
 ["needs", "needs"], ["support", "support"], ["support", "support"], ["suggestion", "suggestion"], ["action", "action"], ["task", "task"], ["goal", "goal"], ["step", "step"], ["reason", "reason"], ["evidence", "evidence"], ["evidence", "evidence"], ["quote", "quote"],
 ["safety", "safety"], ["privacy", "privacy"], ["real", "real"], ["names", "names"], ["emails", "emails"], ["student IDs", "student IDs"], ["secret keys", "secret keys"], ["production", "production"], ["data", "data"], ["account", "account"], ["permissions", "permissions"], ["role", "role"],
 ["clinical", "clinical"], ["clinician", "clinician"], ["therapist", "therapist"], ["crisis hotline", "crisis hotline"], ["parent/guardian", "parent/guardian"], ["trusted", "trusted"], ["adult", "adult"], ["human", "human"], ["emergency", "emergency"], ["danger", "danger"], ["crisis", "crisis"], ["mood", "mood"], ["stress", "stress"],
 ["now", "now"], ["current", "current"], ["already", "already"], ["none yet", "none yet"], ["waiting", "waiting"], ["today", "today"], ["latest", "latest"], ["overall", "overall"], ["stage", "stage"], ["priority", "priority"], ["highest", "highest"], ["next step", "next step"], ["first", "first"], ["then", "then"], ["finally", "finally"],
 ["coordinator", "coordinator"], ["co-pilot", "co-pilot"], ["dedicated", "dedicated"], ["private", "private"], ["public", "public"], ["anonymous", "anonymous"], ["summary", "summary"], ["combined", "combined"], ["whole class", "whole class"], ["individual", "individual"], ["school-level", "school-level"],
 ["English", "English"], ["English", "English"], ["tone", "tone"], ["professional", "professional"], ["concise", "concise"], ["specific", "specific"], ["warm", "warm"], ["steady", "steady"], ["clear", "clear"], ["accurate", "accurate"], ["simple", "simple"], ["accessible", "accessible"], ["intuitive", "intuitive"], ["everyday", "everyday"], ["suitable", "suitable"], ["usable", "usable"],
 ["output", "output"], ["input", "input"], ["fields", "fields"], ["array", "array"], ["includes", "includes"], ["each item", "each item"], ["format", "format"], ["answers", "answers"], ["questions", "questions"], ["points", "points"], ["reason", "reason"],
 ["do not", "do not"], ["cannot", "cannot"], ["cannot", "cannot"], ["only", "only"], ["only", "only"], ["must", "must"], ["can", "can"], ["if", "if"], ["default", "default"], ["display", "display"], ["received", "received"], ["sync", "sync"], ["ongoing", "ongoing"], ["confirm", "confirm"], ["contact", "contact"], ["immediately", "immediately"], ["first", "first"], ["then", "then"], ["will", "will"], ["and", "and"], ["or", "or"], ["and", "and"], ["for", "for"], ["to", "to"], ["in", "in"], ["in", "in"], ["in", "in"], ["turn", "turn"], ["is", "is"], ["of", "of"],
 ["left", "left"], ["right", "right"], ["diagram", "diagram"], ["view", "view"], ["wave", "wave"], ["understand", "understand"], ["ask", "ask"], ["wrong", "wrong"], ["less", "less"], ["more", "more"], ["good", "good"], ["bad", "bad"], ["hard", "hard"], ["easy", "easy"]];

const punctuation = new Map([[", ", ", "], [".", "."], ["; ", "; "], [": ", ": "], [", ", ", "], [" (", " ("], [") ", ") "], ["?", "?"], ["!", "!"],
 ["“", "\""], ["”", "\""], ["‘", "'"], ["’", "'"], [""", "\""], [""", "\""], ["[", "["], ["]", "]"], ["·", " · "],
 ["…", "..."], ["—", "-"], ["GBP", "GBP"]]);

const charFallback = new Map(terms.filter(([from]) => from.length === 1));
const replacements = [...phrases,...terms].sort((a, b) => b[0].length - a[0].length);

function collectFiles(dir, out = []) {for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {if (skipDirs.has(entry.name)) continue;
 const full = path.join(dir, entry.name);
 if (entry.isDirectory()) collectFiles(full, out);
 else if (filePattern.test(entry.name)) out.push(full);}
 return out;}

function fallbackHan(match) {const parts = [];
 for (const ch of match) parts.push(charFallback.get(ch) || "learning");
 return parts.join(" ").replace(/(learning\s*){2,}/g, "learning ").trim();}

function cleanupEnglish(text) {return text.replace(/pupil/g, "pupil").replace(/teacher/g, "teacher").replace(/already/g, "already").replace(/already/g, "already").replace(/current/g, "current").replace(/generate/g, "generate").replace(/select/g, "select").replace(/submit/g, "submit").replace(/completed/g, "completed").replace(/needs/g, "needs").replace(/waiting/g, "waiting").replace(/publish/g, "publish").replace(/export/g, "export").replace(/assignment/g, "assignment").replace(/question/g, "question").replace(/message/g, "message").replace(/materials/g, "materials").replace(/material/g, "material").replace(/status/g, "status").replace(/concept/g, "concept").replace(/formula/g, "formula").replace(/evidence/g, "evidence").replace(/diagram/g, "diagram").replace(/visual/g, "visual").replace(/practice/g, "practice").replace(/reply/g, "reply").replace(/summary/g, "summary").replace(/draft/g, "draft").replace(/class/g, "class").replace(/school/g, "school").replace(/time/g, "time").replace(/notes/g, "notes").replace(/review/g, "review").replace(/confirm/g, "confirm").replace(/risk/g, "risk").replace(/safety/g, "safety").replace(/clinical/g, "clinical").replace(/workflow/g, "workflow").replace(/version/g, "version").replace(/entry/g, "entry").replace(/view/g, "view").replace(/settings/g, "settings").replace(/update/g, "update").replace(/copy/g, "copy").replace(/received/g, "received").replace(/send/g, "send").replace(/\bteacher\s*teacher\b/gi, "teacher").replace(/\bpupil\s*pupil\b/gi, "pupil").replace(/\s+([,.;:!?])/g, "$1").replace(/([({[])\s+/g, "$1").replace(/\s+([)}\]])/g, "$1").replace(/[\t]{2,}/g, " ");}

function countHan(text) {return (text.match(/[\u4e00-\u9fff]/g) || []).length;}

let changedFiles = 0;
let removed = 0;
for (const file of collectFiles(root)) {if (file.endsWith(path.join("scripts", "cjk-strings.txt"))) {const note = "No Chinese strings remain after the English demo localisation pass. Regenerate this file with scripts/extract-cjk-strings.mjs if needed.\n";
 const before = fs.readFileSync(file, "utf8");
 if (before!== note) {removed += countHan(before);
 fs.writeFileSync(file, note, "utf8");
 changedFiles += 1;}
 continue;}

 const before = fs.readFileSync(file, "utf8");
 let after = before;
 for (const [from, to] of replacements) after = after.split(from).join(to);
 after = after.replace(/[\u3000-\u303f\uff00-\uffef]/g, (ch) => punctuation.get(ch) || " ");
 after = after.replace(/[\u4e00-\u9fff]+/g, fallbackHan);
 after = cleanupEnglish(after);

 if (after!== before) {removed += countHan(before) - countHan(after);
 fs.writeFileSync(file, after, "utf8");
 changedFiles += 1;}}

console.log(`English demo localisation updated ${changedFiles} files and removed ${removed} Han characters.`);
