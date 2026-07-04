/**
 * Fix broken en-GB hybrid strings from partial localization.
 * Run after apply-en-gb-localization.mjs if needed.
 */
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["node_modules", ".git", "scripts"]);

const REPAIRS = [["Pre-lessonPre-read", "pre-lesson reading"],
 ["Post-lessonreview", "post-lesson review"],
 ["pupil viewHandout", "pupil handouts"],
 ["Topic materialswill learnnow", "Topic materials appear in"],
 ["Pendingreview", "Pending review"],
 ["Savedin...", "Saving…"],
 ["Savedlearning", "Save failed"],
 ["generatein...", "Generating…"],
 ["copylink", "copy link"],
 ["class pupils", "All class pupils"],
 ["In progressgenerate", "Generating"],
 ["alreadygenerate", "already generated"],
 ["already", "already using"],
 ["already", "already sent to"],
 ["needsteacher approval", "needs teacher approval"],
 ["This classProgress", "this class progress"],
 ["ContinueEdit", "Continue editing"],
 ["publishlearning", "Before publishing"],
 ["Anonymisedpupil", "Anonymised pupil"],
 ["teacher learning of", "teacher view "],
 [" pupil", " pupils"],
 ["Level 1 and Level 2 pupil", "Level 1 and Level 2 pupils"],
 ["Creatediagram", "Create diagrams"],
 ["workflowdiagram", "flowcharts"],
 ["conceptdiagram", "concept maps"],
 ["class learningvisual", "class display visuals"],
 ["learning Level 1-3 generatelearningpracticeand learning", "generate differentiated practice and micro-quizzes for Levels 1–3"],
 ["generate pupil-readable concept handouts, suitablePre-lesson readingandPost-lesson review.", "generate pupil-readable concept handouts for pre-lesson reading and post-lesson review."],
 ["Create diagrams, flowcharts, concept mapsorclass display visuals.", "Create diagrams, flowcharts, concept maps or class display visuals."],
 ["class insights: Diagnosis, Interventionandpupil supportin learning in", "class insights: diagnosis, intervention and pupil support in one workspace"],
 ["From pupil evidencelearningNext stepaction", "From pupil evidence to your next teaching move"],
 ["assignment, question, Stuck signaland Check-in learningdatalearning.", "assignments, questions, stuck signals and check-ins feed one data layer."],
 ["onlyto learningMisconceptionandevidence, teacher learning.", "Surfaces misconceptions and evidence only — does not replace teacher judgement."],
 ["turnMisconceptionlearning Level 1-3 materialandMini quiz.", "Maps misconceptions to Level 1–3 materials and mini quizzes."],
 ["pupil learningwill learnclass insights.", "New pupil feedback returns to the next class insights cycle."],
 ["Next stepaction", "Next actions"],
 ["For Level 1 pupilspublishlearningaccessiblediagramexplanationdiagram.", "publish a low-threshold diagram explainer for Level 1 pupils."],
 ["For Level 2 pupilspublish 3 questionsdiagramfor learning.", "publish 3 short diagram questions for Level 2 pupils."],
 ["review first S009, S014, S021 ofQuoteandNext step.", "review quotes and next steps for S009, S014 and S021 first."],
 ["Teams-stylelearningsupportReminderandteacher–pupil chat", "Teams-style help alerts and teacher–pupil chat"],
 ["clickselect", "Tap to select"],
 ["In progressSaveddraftlearning.", "Saving draft changes…"],
 ["learningSaved.learningcanContinue editing, or learningApprovalview.", "Changes saved. Continue editing or open Approval."],
 ["Savedlearning", "Save changes"],
 ["supportpupilcompletedlearningunderstandingof learningstep.", "Help pupils complete one understandable small step."],
 ["learningconcept", "Core concept"],
 ["accessiblelearning", "Low-threshold example"],
 ["teacher reviewlearning", "teacher review points"],
 ["learningRulesgenerateofdraft, publishlearningneedsteacher approval.", "Locally generated draft — needs teacher approval before publishing."],
 ["learning ofone sentence.", "Write the one sentence you are least sure about."],
 ["is learningThis class progress", "Fits this class progress"],
 ["is learningprivacy", "Avoids privacy leaks"],
 ["is learningneeds learninghardlearning", "needs simpler language"],
 ["learningdraft, learningfirst learninggenerate.", "draft not found — generate again first."],
 ["In progresslearning TeachFlow", "Opening TeachFlow…"],
 ["generate pupil-readable concept handouts, suitable", "generate pupil-readable concept handouts for "],
 ["andPost-lesson review.", " and post-lesson review."],
 ["andPre-lesson readingand", " for pre-lesson reading and "],];

function collect(dir, out = []) {for (const e of fs.readdirSync(dir, {withFileTypes: true})) {if (SKIP.has(e.name)) continue;
 const full = path.join(dir, e.name);
 if (e.isDirectory()) collect(full, out);
 else if (/\.(js|html)$/.test(e.name)) out.push(full);}
 return out;}

for (const file of collect(root)) {let text = fs.readFileSync(file, "utf8");
 let changed = false;
 for (const [from, to] of REPAIRS) {if (text.includes(from)) {text = text.split(from).join(to);
 changed = true;}}
 if (changed) fs.writeFileSync(file, text, "utf8");}

console.log("Hybrid repair pass complete.");
