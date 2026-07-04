(function (global) {const DEFAULT_TOPIC = "Wave mechanics";

 function buildteacherAgentState(input) {const students = input.students || [];
 const topic = input.topic || DEFAULT_TOPIC;
 const className = input.className || "current class";
 const groups = groupStudentsByNeed(students);
 const urgentStudents = students.filter((student) => student.status === "needs support");
 const levelOneCount = students.filter((student) => student.level === "Level 1").length;
 const draftmaterials = input.draftmaterials || ["diagramHandout", "learningpractice", "class slides"];
 const approvedmaterials = input.approvedmaterials || ["pupilHandout", "visual explainer"];

 return {agentId: "teacher-agent",
 name: "teacher Agent",
 role: "Teaching analysis assistant",
 className,
 topic,
 summary: `${className} in“${topic}”learningneeds learning ofis: ${dominantNeed(groups)}.Suggestedfirstcompleteddiagramsupportand Level 1 pupilFollow-up, thenapprovalpublishlearning material.`,
 insight: {mainNeed: dominantNeed(groups),
 urgentCount: urgentStudents.length,
 levelOneCount,
 evidenceCount: students.filter((student) => student.evidence).length},
 priorities: [teacherPriority("first learningriskStuck signal", `priorityview ${urgentStudents.map((student) => student.id).join(", ") || "none yet"} ofQuoteevidence.`, "pupilFollow-up"),
 teacherPriority("Create diagramssupportmaterial", "turntime domainandfrequency domainofleftrightfor learningaccessiblevisual.", "Content hub"),
 teacherPriority("approvalIntervention", `already ${draftmaterials.length} draftsdraft, Before publishingAwaiting teacher confirmation.`, "Approval")],
 materialPipeline: [{status: "alreadyApprove", title: approvedmaterials.join(", ")},
 {status: "Pendingapproval", title: draftmaterials.join(", ")},
 {status: "Suggestedlearning", title: `${dominantNeed(groups)} of 5 learning material`}],
 followUps: urgentStudents.slice(0, 3).map((student) => ({id: student.id,
 reason: student.stuck,
 next: student.next})),
 guardrails: ["cannotteacher learningpublishmaterial.",
 "only pupil aliases, learningreallearning.",
 "Diagnosis learningmustpupil quotesevidence.",
 "learningSuggestedis learningsupport, not a gradelearning."]};}

 function answerteacherquestion(question, state) {const text = String(question || "").trim();
 const agentState = state || buildteacherAgentState({});
 if (!text) return "learningcanask: learningfirst learning?Which pupils should be reviewed first?learningCreatelearning material?";

 if (/pupil|Follow-up|learning|priority/.test(text)) {const followUps = agentState.followUps.map((item) => `${item.id}: ${item.reason}, Next step ${item.next}`).join("; ");
 return followUps? `Suggested review first pupil: ${followUps}.`: "prioritypupil, SuggestedContinuelearningassignmentandStuck signals.";}

 if (/material|Create|PPT|Handout|visual|practice/.test(text)) {return `Suggestedfirst learning“${agentState.insight.mainNeed}”ofaccessiblediagrammaterial, thengenerate Level 2 of learningpractice.learningdraftlearningApproval, teacher confirmationlearningthen learning topupil.`;}

 if (/approval|publish|export/.test(text)) {return "currentSuggestedis: firstreviewpupil quotesevidence, thenapprovaldiagramHandoutand learningpractice.Before publishinglearningversionLog, learning.";}

 return `learningSuggestedlearningfirst learning: 1. review“${agentState.insight.mainNeed}”evidence; 2. Createfor learning material; 3. Follow-up Level 1 pupil learningwaiting.`;}

 function buildStudentAgentState(input) {const stuckType = input.stuckType || "diagram stuck";
 const assignmentstatus = input.assignmentstatus || "draft not submitted";
 const chatCount = input.chatCount || 0;
 const topic = input.topic || DEFAULT_TOPIC;
 const profile = profileFor(stuckType, assignmentstatus, chatCount);

 return {agentId: "student-agent",
 name: "pupil Agent",
 role: "Personal learning assistant",
 topic,
 profile,
 summary: `learningnowlearning“${topic}”, currentStuck signalis“${stuckType}”, assignmentstatusis“${assignmentstatus}”.Next stepfirst learningspecificofaction.`,
 nextPlan: planFor(stuckType, assignmentstatus),
 memory: [`current topic: ${topic}`,
 `learningStuck signal: ${stuckType}`,
 `assignmentstatus: ${assignmentstatus}`,
 `ConversationLog: ${chatCount} itemslearning`],
 teacherSignaldraft: `learningnowlearning in“${stuckType}”, teacherto learningspecificof learning ordiagram.`,
 guardrails: ["only teacher approvalof learning.",
 "learningwillviewlearningother pupilsof learning.",
 "learningwill learncompletedassignment, onlyto learning andNext step.",
 "Stuck signalcan learnsendtoteacher."]};}

 function answerStudentquestion(question, state) {const text = String(question || "").trim();
 const agentState = state || buildStudentAgentState({});
 if (!text) return "learningcanask: learningNext steplearning?How should I read this diagram?learningturnquestionlearning toteacher?";

 if (/diagram|left|right|wave|view/.test(text) || /diagram/.test(agentState.profile.stuckType)) {return "learningfirstonlyviewdiagram, learning formula: left-hand sideis learningsignallearningtimelearning of learning, right-hand sideisturnlearningsimplefrequency.learningNext stepcan learn ofis: indiagramlearning“complex waveform”and“simplefrequency”learning in learning in.";}

 if (/formula|symbol/.test(text) || /formula/.test(agentState.profile.stuckType)) {return "firstturnformulalearningone sentence: learning inask“learningfrequencyin learningsignalin learningmoreless”.learningfirst learning formula, firstturnlearningsymbollearningEnglishlearning.";}

 if (/assignment|submit|learning/.test(text)) {return `learning ofassignmentstatusis“${agentState.profile.assignmentstatus}”.Suggestedfirst learning: 1. time domainviewlearning; 2. frequency domainviewlearning; 3. diagramof learning.`;}

 if (/teacher|send|Help request|stuck/.test(text)) {return `can learn toteacher: ${agentState.teacherSignaldraft}`;}

 return `${agentState.summary} learningSuggestedlearningfirstcompleted: ${agentState.nextPlan[0].action}.`;}

 function groupStudentsByNeed(students) {return students.reduce((groups, student) => {const key = student.stuck || "Monitoring";
 groups[key] = (groups[key] || 0) + 1;
 return groups;}, {});}

 function dominantNeed(groups) {const entries = Object.entries(groups);
 if (!entries.length) return "diagram mapping";
 return entries.sort((a, b) => b[1] - a[1])[0][0];}

 function teacherPriority(title, detail, target) {return {title, detail, target};}

 function profileFor(stuckType, assignmentstatus, chatCount) {return {level: stuckType.includes("formula") || stuckType.includes("learning")? "needsconceptlearning": "In progresslearningunderstanding",
 stuckType,
 assignmentstatus,
 chatCount,
 confidence: assignmentstatus === "submitted"? "in learning": "needsContinuelearning"};}

 function planFor(stuckType, assignmentstatus) {const plan = [];

 if (stuckType.includes("diagram")) {plan.push({action: "firstviewdiagramfor learning", detail: "learningleft-hand sidecomplex waveform, then learningright-hand sidesimplefrequency."});} else if (stuckType.includes("formula")) {plan.push({action: "first learning formulasymbol", detail: "turnlearningsymbollearningEnglishlearning."});} else if (stuckType.includes("learning")) {plan.push({action: "first learning", detail: "learning inof learningunderstandingfrequencylearning."});} else {plan.push({action: "first learning", detail: "turnlearning inofsignallearningsimplesignal."});}

 plan.push({action: assignmentstatus === "submitted"? "waitingteacher feedbacklearningask": "learningassignmentdraft",
 detail: assignmentstatus === "submitted"? "turnlearning of learningcopylearningAsk AIContinueask.": "first learning, learning."});
 plan.push({action: "sendStuck signals", detail: "iflearning isstuck, turnlearning toteacher."});

 return plan;}

 const api = {buildteacherAgentState,
 answerteacherquestion,
 buildStudentAgentState,
 answerStudentquestion};

 global.TeachFlowDualAgentEngine = api;

 if (typeof module!== "undefined") {module.exports = api;}})(typeof window!== "undefined"? window: globalThis);
