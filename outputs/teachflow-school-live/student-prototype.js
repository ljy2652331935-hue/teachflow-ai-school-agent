let STUDENT_ALIAS = readStudentAlias();
let STUDENT_CONTEXT = readStudentContext();
let initialStudentState = window.TeachFlowWorkspaceState.getStudent(STUDENT_ALIAS);
let initialStudentSignal = window.TeachFlowWorkspaceState.latestStuckSignal(STUDENT_ALIAS);
let assignmentstatus = window.TeachFlowWorkspaceState.getassignment(STUDENT_ALIAS);
let lastStuckType = initialStudentSignal?.stuckType || initialStudentState?.stuck || "diagram stuck";
let activeStudentChannelId = "home";
let selectedCheckInState = "partly_understand";
let checkInstatusmessage = "";
let lastteachermessageId = "";
let studentAgentBriefing = null;
let studentAgentBriefingSource = "local";
let lastStudentAgentdraft = null;
let studentAgentstatusmessage = "";

function readStudentAlias() {return window.TeachFlowSession?.context?.studentAlias || "S001";}

function readStudentContext() {const sessionContext = window.TeachFlowSession?.context || {};
 return window.TeachFlowWorkspaceState.getStudentContext(sessionContext.studentAlias || STUDENT_ALIAS || "S001", {userId: sessionContext.userId,
 classId: sessionContext.classId,
 studentAlias: sessionContext.studentAlias || STUDENT_ALIAS || "S001"});}

function refreshStudentContext() {STUDENT_ALIAS = readStudentAlias();
 STUDENT_CONTEXT = readStudentContext();
 initialStudentState = window.TeachFlowWorkspaceState.getStudent(STUDENT_ALIAS);
 initialStudentSignal = window.TeachFlowWorkspaceState.latestStuckSignal(STUDENT_ALIAS);
 assignmentstatus = window.TeachFlowWorkspaceState.getassignment(STUDENT_ALIAS);
 renderStudentShellMeta();}

function renderStudentShellMeta() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, STUDENT_CONTEXT);
 const brand = document.querySelector(".student-brand");
 const identity = document.querySelector(".identity-card");
 if (brand) {const shortAlias = STUDENT_ALIAS.replace(/^S/i, "S");
 const avatar = brand.querySelector(".student-avatar");
 const title = brand.querySelector("h1");
 if (avatar) avatar.textContent = shortAlias.replace(/^S0*/, "S") || STUDENT_ALIAS;
 if (title) title.textContent = `${STUDENT_ALIAS} learning space`;}
 if (identity) {identity.innerHTML = `
 <span>current topic</span>
 <strong>${escapeHtml(scoped.topic || "Topic not set")}</strong>
 <small>${escapeHtml(scoped.className || "current class")} · teacher-created class</small>
 `;}}

const chatmessages = [{role: "assistant",
 text: "Hi, I can help with your teacher's materials, assignments, and stuck points. You can ask things like: What is frequency domain? How is it different from time domain? How should I read this diagram?"}];

const wellbeingmessages = [{role: "assistant",
 text: "I am here. This space can help with learning stress, falling behind, fear of asking questions or frustration. I am not a clinician and I do not diagnose; I help turn your current state into one small next step."}];

let wellbeingstatusmessage = "Wellbeing chat stays private by default. Use the check-in panel to share a learning summary with your teacher when you need help.";

function studentHomeChannel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, STUDENT_CONTEXT);
 const teacherActions = scoped.teacherAgentActions || [];
 const questionCount = scoped.questions?.length || 0;
 const stuckCount = scoped.stuckSignals?.length || 0;
 return `
 <section class="overview-grid">
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">My class</p><h3>${escapeHtml(scoped.className || "current class")}</h3></div>
 <span class="status-pill">${escapeHtml(STUDENT_ALIAS)}</span>
 </div>
 <ul class="task-stack">
 ${task("1. view teacher materials", teacherActions.length? "New teacher-approved items appear here.": "Your teacher has not published materials yet.", teacherActions.length? "New items": "waiting")}
 ${task("2. assignments", "Complete the mini quiz or write your explanation.", assignmentstatus || "Not submitted")}
 ${task("3. Ask when stuck", questionCount || stuckCount? `Logged ${questionCount} questions and ${stuckCount} stuck signals`: "Ask the learning agent or your teacher anytime", "Anytime")}
 </ul>
 </div>
 <div class="panel hero-material">
 <div class="hero-material-body">
 <p class="small-label">current topic</p>
 <h3>${escapeHtml(scoped.topic || "Topic not set")}</h3>
 <p>This class starts from real progress. assignments, questions, stuck signals and teacher replies feed your anonymised learning space.</p>
 </div>
 </div>
 </section>
 ${studentteacherActionNotice()}
 `;}

function studentmaterialChannel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, STUDENT_CONTEXT);
 const materialActions = (scoped.teacherAgentActions || []).filter((item) => item.type === "assign_material" && item.material);
 return `
 ${studentAssignedmaterialPanel()}
 <section class="two-column">
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">materials</p><h3>${escapeHtml(scoped.topic || "Topic not set")}</h3></div>
 <span class="status-pill">${materialActions.length? `${materialActions.length} items`: "Awaiting teacherpublish"}</span>
 </div>
 ${materialActions.length? `
 <ul class="record-list">
 ${materialActions.map((action) => record(action.material.type || "material", action.material.title || action.title)).join("")}
 </ul>
 `: `
 <article class="student-empty-card">
 <strong>learningpublishmaterial</strong>
 <span>teacher approvalmaterialwill learnnowlearning in.learningcanfirstinAsk AIasklearning Agent.</span>
 </article>
 `}
 </div>
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">learningSuggested</p><h3>first learning ofquestionlearning</h3></div>
 </div>
 <ul class="record-list">
 ${record("assignment", assignmentstatus || "Not submitted")}
 ${record("Ask AI", "canaskspecificquestions, conceptorNext steplearning.")}
 ${record("learningstucklearning", "needsteachersupportlearning, canturnlearningsummarysendtoteacher.")}
 </ul>
 </div>
 </section>
 `;}

const studentChannels = {home: {kicker: "Home",
 title: "Three tasks for today",
 html: () => studentHomeChannel(),
 legacyHtml: () => `
 <section class="overview-grid">
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">todaytask</p><h3>learningcompleted, learningneeds learning</h3></div>
 <span class="status-pill warn">learning 15 learning</span>
 </div>
 <ul class="task-stack">
 ${task("1. teacherHandout", "firstview“learningsignaloftwo representations”learning.", "already")}
 ${task("2. assignments", "completedlearning, learningsubmitlearning of learning.", assignmentstatus)}
 ${task("3. questionquestion", "inAsk AIinaskspecificquestion, orin learningsupportin learningStuck signal.", "learning")}
 </ul>
 </div>
 <div class="panel hero-material">
 <img src="assets/fourier-prism.svg" alt="Wave mechanicsmaterialsdiagram">
 <div class="hero-material-body">
 <p class="small-label">currentmaterials</p>
 <h3>turnlearningsignallearningsimplefrequency</h3>
 <p>Todayfirstunderstandinglearning: learningsignal, can learntimelearningview, learningcan learnfrequencylearningview.</p>
 </div>
 </div>
 </section>
 ${studentteacherActionNotice()}
 `},
 material: {kicker: "materials",
 title: "teacher approvallearningpublishto learning of learning",
 html: () => studentmaterialChannel(),
 legacyHtml: () => `
 ${studentAssignedmaterialPanel()}
 <section class="two-column">
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">Handout</p><h3>Wave mechanicsof learning</h3></div>
 <span class="status-pill">Level 2</span>
 </div>
 <div class="concept-card-grid">
 ${concept("time domain", "learningtimelearningviewsignallearning, learningviewlearningwaveform.")}
 ${concept("frequency domain", "learningviewsignalin learningfrequency, learningviewlearning in learning.")}
 ${concept("learningsignal", "learning isturnsignallearning, learning is learning.")}
 </div>
 </div>
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">learning</p><h3>viewdiagramlearningfirst learning</h3></div>
 </div>
 <ul class="record-list">
 ${record("left-hand sidecomplex waveform", "learningsignallearningtimelearning.")}
 ${record("in learning", "learning.")}
 ${record("right-hand sidesimplefrequency", "learningsignallearning includeslearning.")}
 </ul>
 </div>
 </section>
 `},
 assignment: {kicker: "assignments",
 title: "learning andassignmentlearningsubmit",
 html: () => `
 <section class="assignment-layout">
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">learning</p><h3>first learning of responsequestion</h3></div>
 <span id="assignment-status" class="status-pill warn">${assignmentstatus}</span>
 </div>
 <div class="quiz-card">
 <label>
 <strong>1. learningfrequency domain learning is“turntimelearning”?</strong>
 <textarea id="quiz-answer-1" placeholder="learning of response..."></textarea>
 </label>
 <label>
 <strong>2. learningcan learnfrequency?</strong>
 <textarea id="quiz-answer-2" placeholder="can learn, waveformordiagramlearning..."></textarea>
 </label>
 </div>
 </div>

 <aside class="panel">
 <div class="panel-header">
 <div><p class="small-label">assignmentsubmit</p><h3>turnlearning of learning toteacher</h3></div>
 </div>
 <div class="submit-box">
 <label>
 <span>assignmentlearning</span>
 <input id="homework-title" value="Wave mechanics: learning fortime domainandfrequency domainofunderstanding">
 </label>
 <label>
 <span>assignmentlearning</span>
 <textarea id="homework-body" placeholder="turnlearning ofunderstandinglearning in learning in, learningcannoteslearning in learning."></textarea>
 </label>
 <label class="upload-zone">
 <span>learning</span>
 <input type="file" aria-label="learningassignmentlearning">
 <small>learningstageonly learning, learning.</small>
 </label>
 <div class="button-row">
 <button class="secondary-button" type="button" data-action="save-assignment">Saveddraft</button>
 <button class="primary-button" type="button" data-action="submit-assignment">assignments</button>
 </div>
 <p id="assignment-note" class="inline-note">submitteacherwillviewlearning of learninganswers, assignmentlearning andStuck signals.</p>
 </div>
 </aside>
 </section>
 `},
 ask: {kicker: "Ask AI",
 title: "learning GPT learningasklearningaskof learning",
 html: () => `
 <section class="chat-layout">
 <div class="panel chat-panel">
 <div class="panel-header">
 <div><p class="small-label">learningasklearning</p><h3>learningcurrentmaterialquestion</h3></div>
 <span class="status-pill">learninglearning</span>
 </div>
 <div id="chat-thread" class="chat-thread">
 ${chatmessages.map(rendermessage).join("")}
 </div>
 <form id="question-form" class="question-form">
 <textarea id="question-input" placeholder="entrylearningaskofquestion, learning: learningright-hand sidelearningwavelearningleft-hand sidelearningwave?"></textarea>
 <button class="primary-button" type="submit">sendquestion</button>
 </form>
 </div>

 <aside class="panel">
 <div class="panel-header">
 <div><p class="small-label">question</p><h3>learningasklearningcan learn</h3></div>
 </div>
 <div class="prompt-list">
 ${promptButton("frequency domain learning is learning?")}
 ${promptButton("learning isturntimelearningfrequency?")}
 ${promptButton("learning in diagramlearning in learningview?")}
 ${promptButton("learning formula, learningsymbolis learning.")}
 </div>
 </aside>
 </section>
 `},
 messages: {kicker: "teachermessage",
 title: "andteacherConversation: message, ReminderandLog",
 html: () => studentteachermessagesChannel()},
 support: {kicker: "AI support",
 title: "learning ofdedicatedlearning Agent: Analysis, questions, stuck signalssupport",
 html: () => `
 <section class="support-layout agent-support-layout">
 <div class="panel agent-analysis-panel">
 <div class="panel-header">
 <div><p class="small-label">AI analysis learning</p><h3>learningwillLoglearning ofLearning status</h3></div>
 <span class="status-pill">dedicatedlearning Agent</span>
 </div>

 <div class="agent-summary-grid">
 ${agentStat("Understanding status", currentStudentAgentState().profile.level, studentAgentSummary(currentStudentAgentState()))}
 ${agentStat("Current stuck point", currentStudentAgentState().profile.stuckType, currentAgentAdvice())}
 ${agentStat("Assignment status", studentAssignmentStatus(currentStudentAgentState()), studentAssignmentConfidence(currentStudentAgentState()))}
 ${agentStat("Conversation log", `${currentStudentAgentState().profile.chatCount} items`, "Questions and stuck signals stay in your learning memory.")}
 </div>
 <div class="student-agent-source-strip">
 <span class="status-pill">${studentAgentBriefingSource === "api"? "Student Agent API" : "Agent preview"}</span>
 ${(currentStudentAgentState().sourceSignals || []).map(studentAgentSourceChip).join("")}
 </div>

 <div class="learning-memory-panel">
 <div class="panel-header compact-header">
 <div><p class="small-label">Learning memory</p><h3>What your agent remembers</h3></div>
 </div>
 <ul class="learning-memory-list">
 ${learningMemory("materials", "alreadyWave mechanicsdiagramHandout.")}
 ${learningMemory("Mini quizandassignment", assignmentstatus)}
 ${learningMemory("Stuck signal", lastStuckType)}
 ${learningMemory("Continuous support", "Questions, assignments, stuck signals and teacher feedback stay connected.")}
 </ul>
 </div>

 ${studentAgentPlanPanel()}
 ${studentAgentSharePreview()}

 <div class="map-board compact agent-map">
 ${mapColumn("learningalreadyunderstanding", [["learningsignal", "can learn."],
 ["frequencylearning", "learningsignalin learningpossibleincludesmorelearningsimplefrequency."]])}
 ${mapColumn("Next stepsupport", [["diagram mapping", "diagramturnleft-hand sidewaveformandright-hand sidefrequencylearning for learning."],
 ["formula meaning", "first learningsymbolin learning, then learning formula."]])}
 </div>
 </div>

 <aside class="support-side-stack">
 <section class="panel support-agent-chat">
 <div class="panel-header">
 <div><p class="small-label">asklearning of learning Agent</p><h3>learningChatlearningaskquestion</h3></div>
 <span class="status-pill">will learn ofLog</span>
 </div>
 <div id="support-chat-thread" class="chat-thread support-chat-thread">
 ${chatmessages.map(rendermessage).join("")}
 </div>
 <form id="support-question-form" class="question-form support-question-form">
 <textarea id="support-question-input" placeholder="learning: learningnowofStuck signal, Next steplearningfirst learning?"></textarea>
 <button class="primary-button" type="submit">asklearning</button>
 </form>
 <div class="support-prompt-row" aria-label="learningask">
 ${supportPromptButton("learning ofLog, Next steplearningfirst learning?")}
 ${supportPromptButton("turnlearningstuckof learning.")}
 ${supportPromptButton("learningcan learn toteacherofquestion.")}
 </div>
 </section>

 <section class="panel reflection-box">
 <div class="panel-header">
 <div><p class="small-label">learningstucklearning</p><h3>to Agent andteacher learning ofsignal</h3></div>
 <span id="stuck-status" class="status-pill warn">${lastStuckType}</span>
 </div>
 <div class="stuck-options">
 ${stuck("Definition stuck", "learningconceptlearning is learning")}
 ${stuck("diagram stuck", "learningviewlearningunderstanddiagraminofleftrightlearning")}
 ${stuck("formula stuck", "learning formula, learningsymbollearning")}
 ${stuck("Worked example transfer", "learning, learningwill")}
 </div>
 <label class="stuck-note">
 <span>notes</span>
 <textarea id="stuck-note" placeholder="learning: learningright-hand sidelearningwavelearning isleft-hand sidelearningwave."></textarea>
 </label>
 <div class="button-row">
 <button class="secondary-button" type="button" data-action="ask-from-stuck">learning Agent analysis learningStuck signal</button>
 <button class="primary-button" type="button" data-action="send-stuck">sendtoteacher</button>
 </div>
 <p id="student-agent-status" class="inline-note">${escapeHtml(studentAgentstatusmessage || "pupil Agent willfirst learningStuck signal; only learningclicksend, teacher learningwillviewlearningsummary.")}</p>
 </section>
 </aside>
 </section>
 `},
 checkin: {kicker: "Wellbeing",
 title: "AI wellbeing assistant: turnStresslearning of question",
 html: () => {const latest = latestStudentCheckIn();
 const draft = checkIndraft(selectedCheckInState, latest?.note || "");
 return `
 <section class="checkin-layout">
 <div class="panel checkin-panel">
 <div class="panel-header">
 <div><p class="small-label">Student Check-in</p><h3>learningnowofLearning statusis learning?</h3></div>
 <span class="status-pill warn">learning isclinicalclinician</span>
 </div>
 <div class="checkin-state-grid" aria-label="selectcurrentLearning status">
 ${checkInOption("understand", "learningunderstand learning", "learningcanContinuelearningpractice")}
 ${checkInOption("partly_understand", "learningunderstand learning", "learningneeds learningconfirm")}
 ${checkInOption("stuck", "learningstuck", "learningneeds learning")}
 ${checkInOption("frustrated", "learning", "learningneeds learningStresslearning")}
 ${checkInOption("want_teacher_help", "teacher learning", "learningHelp requestdraft")}
 </div>
 <label class="checkin-note">
 <span>one sentencelearning ofstatusorStuck signal</span>
 <textarea id="checkin-note" placeholder="learning: learningunderstandinglearningWave mechanicsforPhysicslearning.">${escapeHtml(latest?.shareChoice === "private"? "": latest?.evidenceQuote || "")}</textarea>
 </label>
 <div class="button-row">
 <button class="secondary-button" type="button" data-action="keep-checkin-private">learningprivate</button>
 <button class="secondary-button" type="button" data-action="ask-ai-checkin">first learning AI learning</button>
 <button class="primary-button" type="button" data-action="share-checkin">Sharelearningsummarytoteacher</button>
 </div>
 <p id="checkin-status" class="inline-note">${escapeHtml(checkInstatusmessage || "learningcanfirst learningprivate; needsteachersupportlearningthenSharelearningsummary.")}</p>
 </div>

 <aside class="panel checkin-preview">
 <div class="panel-header">
 <div><p class="small-label">AI learning</p><h3>learningwillturnlearning</h3></div>
 <span class="status-pill">learningLearning status</span>
 </div>
 <div class="checkin-preview-stack">
 ${checkInPreviewItem("to learning ofNext step", draft.next)}
 ${checkInPreviewItem("toteacherofHelp requestdraft", draft.teacherdraft)}
 </div>
 ${latest? latestCheckInPanel(latest): emptyCheckInPanel()}
 </aside>
 </section>
 `;}},
 progress: {kicker: "Progress",
 title: "learning ofsubmitandteacher feedback",
 html: () => `
 <section class="two-column">
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">Progress</p><h3>learningTopicLearning status</h3></div>
 </div>
 <div class="progress-strip">
 ${progress("materials", 100)}
 ${progress("assignments", assignmentstatus === "submitted"? 100: 45)}
 ${progress("Ask AI", chatmessages.length > 1? 80: 20)}
 ${progress("AI support", chatmessages.length > 1? 85: 70)}
 ${progress("Wellbeing", latestStudentCheckIn()? 80: 20)}
 </div>
 </div>
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">timelearning</p><h3>learningLog</h3></div>
 </div>
 <ul class="record-list">
 ${record("Today 10:32", "Openmaterialsdiagramexplanation.")}
 ${record("Today 10:38", `${assignmentstatus === "submitted"? "submitlearningassignment.": "Savedlearningassignmentdraft."}`)}
 ${record("Today 10:41", `currentStuck signal: ${lastStuckType}.`)}
 ${record("Wellbeing", latestStudentCheckIn()? `${latestStudentCheckIn().stateLabel} · ${latestStudentCheckIn().privacyLevel}`: "learningsubmit check-in.")}
 </ul>
 </div>
 </section>
 ${studentteacherActiontimeline()}
 `}};

const studentButtons = Array.from(document.querySelectorAll("[data-channel]"));
const studentContent = document.getElementById("student-content");
const studentTitle = document.getElementById("student-title");
const studentKicker = document.getElementById("student-kicker");

studentButtons.forEach((button) => {button.addEventListener("click", () => setStudentChannel(button.dataset.channel));});

document.querySelectorAll("[data-top-action]").forEach((button) => {button.addEventListener("click", () => setStudentChannel(button.dataset.topAction));});

function setStudentChannel(channelId, options) {activeStudentChannelId = studentChannels[channelId]? channelId: "home";
 refreshStudentWorkspaceState();
 const channel = studentChannels[channelId] || studentChannels.home;
 studentButtons.forEach((button) => button.classList.toggle("active", button.dataset.channel === activeStudentChannelId));
 studentTitle.textContent = channel.title;
 studentKicker.textContent = channel.kicker;
 studentContent.innerHTML = channel.html();
 renderStudentmessageNotice();
 bindDynamicInteractions();
 compactStudentPanels();
 if (!options?.skipReadSync) syncVisibleteacherActionReads(activeStudentChannelId);
 if (!options?.skipAgentSync) syncStudentAgentBriefing(activeStudentChannelId);}

function refreshStudentWorkspaceState() {refreshStudentContext();
 const latestStudent = window.TeachFlowWorkspaceState.getStudent(STUDENT_ALIAS);
 const latestSignal = window.TeachFlowWorkspaceState.latestStuckSignal(STUDENT_ALIAS);
 assignmentstatus = window.TeachFlowWorkspaceState.getassignment(STUDENT_ALIAS);
 lastStuckType = latestSignal?.stuckType || latestStudent?.stuck || lastStuckType;}

function studentteacherActions() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, STUDENT_CONTEXT);
 return (scoped.teacherAgentActions || []).filter((item) => item.studentAlias === STUDENT_ALIAS && item.studentVisible!== false).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));}

function studentAssignedmaterials() {return studentteacherActions().filter((item) => item.type === "assign_material" && item.material);}

function studentteacherActionNotice() {const actions = studentteacherActions().slice(0, 2);
 if (!actions.length) return "";
 return `
 <section class="panel student-teacher-action-notice">
 <div class="panel-header compact-header">
 <div><p class="small-label">teacher learning</p><h3>teacher approvallearning of action</h3></div>
 <button class="ghost-button" type="button" data-open-student-messages>viewmessage</button>
 </div>
 <div class="student-action-card-list">
 ${actions.map(studentteacherActionCard).join("")}
 </div>
 </section>
 `;}

function studentAssignedmaterialPanel() {const materials = studentAssignedmaterials();
 if (!materials.length) return "";
 return `
 <section class="panel student-assigned-materials">
 <div class="panel-header compact-header">
 <div><p class="small-label">teacherassign</p><h3>learning to learning ofmaterial</h3></div>
 <span class="status-pill">${materials.length} items</span>
 </div>
 <div class="student-action-card-list">
 ${materials.map((item) => `
 <article class="student-teacher-action-card">
 <span>${escapeHtml(item.material.type || "materials")} · ${formatStudenttime(item.createdAt)}</span>
 <strong>${escapeHtml(item.material.title)}</strong>
 <p>${escapeHtml(item.material.goal || item.detail || "teacheralreadyturnlearning materialassignto learning.")}</p>
 <small>${escapeHtml(item.material.targetLevel || "learning of learningcompleted")}</small>
 </article>
 `).join("")}
 </div>
 </section>
 `;}

function studentteacherActiontimeline() {const actions = studentteacherActions().slice(0, 4);
 if (!actions.length) return "";
 return `
 <section class="panel student-teacher-action-timeline">
 <div class="panel-header compact-header">
 <div><p class="small-label">Teacher follow-up</p><h3>Synced to your learning space</h3></div>
 </div>
 <ul class="record-list">
 ${actions.map((item) => record(formatStudenttime(item.createdAt), `${studentteacherActionLabel(item.type)}: ${item.title || item.detail}`)).join("")}
 </ul>
 </section>
 `;}

function studentteacherActionCard(item) {return `
 <article class="student-teacher-action-card">
 <span>${escapeHtml(studentteacherActionLabel(item.type))} · ${formatStudenttime(item.createdAt)}</span>
 <strong>${escapeHtml(item.title || "Teacher update")}</strong>
 <p>${escapeHtml(item.detail || item.material?.goal || "Your teacher has sent a next step.")}</p>
 <div class="student-action-response-row">
 <button class="ghost-button" type="button" data-respond-teacher-action="${escapeAttr(item.id)}" data-response-type="improved">This helped me understand</button>
 <button class="ghost-button warn" type="button" data-respond-teacher-action="${escapeAttr(item.id)}" data-response-type="still_stuck">I am still stuck</button>
 </div>
 </article>
 `;}

function studentteacherActionLabel(type) {if (type === "send_message") return "Teacher message";
 if (type === "assign_material") return "materials";
 if (type === "schedule_followup") return "Learning follow-up";
 return "Learning action";}

function studentteacherActionstatus(item) {if (item.studentResponseAt) {return {label: `Responded: ${studentResponseTypeLabel(item.studentResponseType)}`,
 className: "responded"};}
 if (item.studentReadAt) return {label: "Read, waiting for response", className: "read"};
 return {label: "New", className: "unread"};}

function studentResponseTypeLabel(type) {if (type === "improved") return "helped";
 if (type === "still_stuck") return "still stuck";
 return "synced";}

function studentteacherActionCard(item) {const status = studentteacherActionstatus(item);
 const hasResponded = Boolean(item.studentResponseAt);
 return `
 <article class="student-teacher-action-card">
 <span>${escapeHtml(studentteacherActionLabel(item.type))} · ${formatStudenttime(item.createdAt)}</span>
 <span class="student-action-read-state ${escapeAttr(status.className)}">${escapeHtml(status.label)}</span>
 <strong>${escapeHtml(item.title || "Teacher update")}</strong>
 <p>${escapeHtml(item.detail || item.material?.goal || "Your teacher has sent a next step.")}</p>
 <div class="student-action-response-row">
 <button class="ghost-button" type="button" data-respond-teacher-action="${escapeAttr(item.id)}" data-response-type="improved" ${hasResponded? "disabled": ""}>This helped me understand</button>
 <button class="ghost-button warn" type="button" data-respond-teacher-action="${escapeAttr(item.id)}" data-response-type="still_stuck" ${hasResponded? "disabled": ""}>I am still stuck</button>
 </div>
 </article>
 `;}

function syncStudentAgentBriefing(channelId) {if (!canUseWorkspaceApi()) return;
 fetch("/api/student-agent/briefing", {cache: "no-store"}).then((response) => {if (!response.ok) throw new Error(`Student Agent API ${response.status}`);
 return response.json();}).then((briefing) => {studentAgentBriefing = briefing;
 studentAgentBriefingSource = "api";
 if (channelId!== activeStudentChannelId) return;
 if (document.activeElement?.tagName === "TEXTAREA") return;
 if (["home", "support", "progress"].includes(activeStudentChannelId)) {setStudentChannel(activeStudentChannelId, {skipAgentSync: true});}}).catch(() => {studentAgentBriefingSource = "local";});}

function syncVisibleteacherActionReads(channelId) {const unreadActions = studentteacherActions().filter((item) =>!item.studentReadAt);
 if (!unreadActions.length) return;
 Promise.all(unreadActions.map((item) => postStudentteacherActionRead(item.id))).then(() => {if (channelId === activeStudentChannelId) {setStudentChannel(activeStudentChannelId, {skipAgentSync: true, skipReadSync: true});}}).catch(() => {});}

async function postStudentteacherActionRead(actionId) {const payload = {studentAlias: STUDENT_ALIAS,
 actionId};

 if (!canUseWorkspaceApi()) {return window.TeachFlowWorkspaceState.markteacherAgentActionRead(STUDENT_ALIAS, actionId, {context: STUDENT_CONTEXT});}

 try {const response = await fetch("/api/workspace/teacher-actions/read", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 if (!response.ok) throw new Error(`Workspace API ${response.status}`);
 const state = await response.json();
 return window.TeachFlowWorkspaceState.setState(state);} catch (error) {return window.TeachFlowWorkspaceState.markteacherAgentActionRead(STUDENT_ALIAS, actionId, {context: STUDENT_CONTEXT});}}

function bindDynamicInteractions() {const form = document.getElementById("question-form");
 if (form) {form.addEventListener("submit", (event) => {event.preventDefault();
 submitquestion();});}

 const supportForm = document.getElementById("support-question-form");
 if (supportForm) {supportForm.addEventListener("submit", (event) => {event.preventDefault();
 submitSupportquestion();});}

 const teachermessageForm = document.getElementById("student-teacher-message-form");
 if (teachermessageForm) {teachermessageForm.addEventListener("submit", (event) => {event.preventDefault();
 sendStudentteachermessage();});}

 document.querySelectorAll("[data-open-student-messages]").forEach((button) => {button.addEventListener("click", () => setStudentChannel("messages"));});

 document.querySelectorAll("[data-respond-teacher-action]").forEach((button) => {button.addEventListener("click", () => {respondToteacherAction(button.dataset.respondteacherAction, button.dataset.responseType);});});

 document.querySelectorAll("[data-prompt]").forEach((button) => {button.addEventListener("click", () => {const input = document.getElementById("question-input");
 if (input) {input.value = button.dataset.prompt;
 input.focus();}});});

 document.querySelectorAll("[data-support-prompt]").forEach((button) => {button.addEventListener("click", () => {const input = document.getElementById("support-question-input");
 if (input) {input.value = button.dataset.supportPrompt;
 input.focus();}});});

 document.querySelectorAll(".stuck-option").forEach((button) => {button.addEventListener("click", () => {lastStuckType = button.querySelector("strong")?.textContent || "Stuck signal";
 const status = document.getElementById("stuck-status");
 if (status) status.textContent = lastStuckType;
 document.querySelectorAll(".stuck-option").forEach((item) => item.classList.remove("selected"));
 button.classList.add("selected");});});

 const saveButton = document.querySelector("[data-action='save-assignment']");
 if (saveButton) saveButton.addEventListener("click", () => updateassignment("draft saved"));

 const submitButton = document.querySelector("[data-action='submit-assignment']");
 if (submitButton) submitButton.addEventListener("click", () => updateassignment("submitted"));

 const askFromStuck = document.querySelector("[data-action='ask-from-stuck']");
 if (askFromStuck) {askFromStuck.addEventListener("click", () => {const note = document.getElementById("stuck-note")?.value.trim() || "";
 chatmessages.push({role: "user",
 text: `I am stuck on ${lastStuckType}. ${note || "Can you help me make this smaller?"}`});
 draftStudentStuckSignal(note).then((draft) => {lastStudentAgentdraft = draft;
 studentAgentstatusmessage = "Stuck-signal draft is ready. Review it before sharing with your teacher.";
 chatmessages.push({role: "assistant",
 text: `${draft.studentFacing} Next step: ${draft.nextStep}`});
 setStudentChannel("support");});});}

 const sendStuck = document.querySelector("[data-action='send-stuck']");
 if (sendStuck) {sendStuck.addEventListener("click", () => {const note = document.getElementById("stuck-note")?.value.trim() || "";
 const status = document.getElementById("stuck-status");
 shareStudentAgentSignal(note).then((result) => {if (status) status.textContent = "Shared with teacher";
 studentAgentstatusmessage = "Shared a short stuck-signal summary with your teacher. Your private chat remains private.";
 lastStudentAgentdraft = result?.draft || lastStudentAgentdraft;
 setStudentChannel("support");});});}

 document.querySelectorAll("[data-checkin-state]").forEach((button) => {button.addEventListener("click", () => {selectedCheckInState = button.dataset.checkinState || "partly_understand";
 document.querySelectorAll("[data-checkin-state]").forEach((item) => item.classList.remove("selected"));
 button.classList.add("selected");});});

 const privateCheckIn = document.querySelector("[data-action='keep-checkin-private']");
 if (privateCheckIn) privateCheckIn.addEventListener("click", () => submitCheckIn("private"));

 const shareCheckIn = document.querySelector("[data-action='share-checkin']");
 if (shareCheckIn) shareCheckIn.addEventListener("click", () => submitCheckIn("teacher_summary"));

 const askAiCheckIn = document.querySelector("[data-action='ask-ai-checkin']");
 if (askAiCheckIn) askAiCheckIn.addEventListener("click", () => submitCheckIn("ask_ai_first"));}

function compactStudentPanels() {makeStudentCompactDisclosure(".learning-memory-panel", "viewLearning memory", "Log");
 makeStudentCompactDisclosure(".agent-map", "viewunderstanding map", "Details");
 makeStudentCompactDisclosure(".checkin-preview-stack", "view AI learning", "Preview");}

function makeStudentCompactDisclosure(selector, title, meta) {document.querySelectorAll(selector).forEach((node) => {if (node.closest("details") || node.dataset.compacted === "true") return;
 const details = document.createElement("details");
 details.className = "student-compact-disclosure compacted-detail";
 details.dataset.compacted = "true";
 details.innerHTML = `
 <summary><span>${escapeHtml(title)}</span><em>${escapeHtml(meta || "Details")}</em></summary>
 <div class="student-compact-body">${node.innerHTML}</div>
 `;
 node.replaceWith(details);});}

function updateassignment(status) {assignmentstatus = status;
 window.TeachFlowWorkspaceState.updateassignment(STUDENT_ALIAS, status);
 const statusNode = document.getElementById("assignment-status");
 const note = document.getElementById("assignment-note");
 if (statusNode) {statusNode.textContent = status;
 statusNode.classList.toggle("warn", status!== "submitted");}
 if (note) note.textContent = status === "submitted"? "Submitted to your teacher. They can review your work and learning signal.": "Draft saved. You can keep editing and submit when ready.";}

function submitquestion() {const input = document.getElementById("question-input");
 const text = input?.value.trim();
 if (!text) return;

 chatmessages.push({role: "user", text});
 window.TeachFlowWorkspaceState.recordquestion(STUDENT_ALIAS, text);
 if (input) input.value = "";
 askStudentAgent(text).then((reply) => {lastStudentAgentdraft = reply.sharedraft || lastStudentAgentdraft;
 chatmessages.push({role: "assistant", text: reply.answer || String(reply)});
 setStudentChannel("ask");});}

function submitSupportquestion() {const input = document.getElementById("support-question-input");
 const text = input?.value.trim();
 if (!text) return;

 chatmessages.push({role: "user", text});
 if (input) input.value = "";
 askStudentAgent(text).then((reply) => {lastStudentAgentdraft = reply.sharedraft || lastStudentAgentdraft;
 studentAgentstatusmessage = reply.mode === "live"? "Live AI replied. This chat is private unless you choose to share a summary.": "Local learning agent replied. This chat is private unless you choose to share a summary.";
 chatmessages.push({role: "assistant",
 text: reply.answer || String(reply)});
 setStudentChannel("support");});}

async function askStudentAgent(question) {if (!canUseWorkspaceApi()) {return localStudentAgentAnswer(question);}

 try {const response = await fetch("/api/student-agent/chat", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify({question})});
 if (!response.ok) throw new Error(`Student Agent API ${response.status}`);
 return response.json();} catch (error) {return localStudentAgentAnswer(question);}}

async function draftStudentStuckSignal(note) {const payload = {stuckType: lastStuckType,
 text: note || `I am stuck on ${lastStuckType}.`};

 if (!canUseWorkspaceApi()) {return localStudentAgentdraft(payload);}

 try {const response = await fetch("/api/student-agent/stuck-draft", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 if (!response.ok) throw new Error(`Student Agent API ${response.status}`);
 return response.json();} catch (error) {return localStudentAgentdraft(payload);}}

async function shareStudentAgentSignal(note) {const payload = {stuckType: lastStuckType,
 text: note || lastStudentAgentdraft?.studentText || `I am stuck on ${lastStuckType}.`};

 if (!canUseWorkspaceApi()) {const draft = localStudentAgentdraft(payload);
 const state = window.TeachFlowWorkspaceState.recordStuckSignal(STUDENT_ALIAS, draft.stuckType, draft.teachersummary);
 return {draft, state};}

 try {const response = await fetch("/api/student-agent/share-to-teacher", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 if (!response.ok) throw new Error(`Student Agent API ${response.status}`);
 const result = await response.json();
 if (result.state) window.TeachFlowWorkspaceState.setState(result.state);
 return result;} catch (error) {const draft = localStudentAgentdraft(payload);
 const state = window.TeachFlowWorkspaceState.recordStuckSignal(STUDENT_ALIAS, draft.stuckType, draft.teachersummary);
 return {draft, state};}}

function localStudentAgentAnswer(question) {if (window.TeachFlowStudentAgentOrchestrator?.answerStudentquestion) {return window.TeachFlowStudentAgentOrchestrator.answerStudentquestion(question, currentStudentAgentState());}
 return {answer: window.TeachFlowDualAgentEngine.answerStudentquestion(question, currentStudentAgentState()),
 nextStep: "Take one small learning step.",
 privacyNote: "Preview response."};}

function localStudentAgentdraft(payload) {if (window.TeachFlowStudentAgentOrchestrator?.draftStuckSignal) {return window.TeachFlowStudentAgentOrchestrator.draftStuckSignal(payload, currentStudentAgentState());}
 return {stuckType: payload.stuckType || lastStuckType,
 studentText: payload.text || "",
 studentFacing: "This can become a teacher-visible stuck signal after you confirm it.",
 teachersummary: payload.text || `I am stuck on ${payload.stuckType || lastStuckType}.`,
 nextStep: "Write the exact sentence you are least sure about.",
 consentRequired: true,
 source: "student_agent"};}

function submitCheckIn(shareChoice) {const note = document.getElementById("checkin-note")?.value.trim() || "";
 const state = window.TeachFlowWorkspaceState.recordCheckIn(STUDENT_ALIAS, {topic: "Wave mechanics",
 state: selectedCheckInState,
 note,
 shareChoice});
 const latest = state.checkIns.find((item) => item.studentAlias === STUDENT_ALIAS);
 const status = document.getElementById("checkin-status");
 if (status && latest?.safeguardingFlag?.required) {checkInstatusmessage = "This may need human support. Contact a trusted adult, teacher, or school support staff.";} else if (status && shareChoice === "teacher_summary") {checkInstatusmessage = "Shared a learning summary with your teacher. Your private reflection stays private.";} else if (status && shareChoice === "ask_ai_first") {checkInstatusmessage = "Saved privately first. Your AI coach can help you choose a next step.";} else if (status) {checkInstatusmessage = "Saved privately. Your teacher will not see this check-in.";}
 if (status) status.textContent = checkInstatusmessage;

 if (shareChoice === "ask_ai_first") {chatmessages.push({role: "user", text: note || "Here is my current learning state. What should I do first?"});
 chatmessages.push({role: "assistant",
 text: `${latest?.privateReflection || "Turn the feeling into one specific question."} ${latest?.nextLearningStep || "Start with one small, low-pressure step."}`});
 setStudentChannel("support");
 return;}

 setStudentChannel("checkin");}

function studentteachermessagesChannel() {const messages = messagesForStudent();
 const latestteacher = latestteachermessage();
 return `
 <section class="student-teams-layout">
 <div class="panel student-teams-chat">
 <div class="student-teams-header">
 <div class="student-avatar">You</div>
 <div>
 <p class="small-label">Teacher chat</p>
 <h3>Messages with your teacher</h3>
 <span>Use this for learning questions, stuck signals, and teacher replies. Use Ask Agent for private AI help.</span>
 </div>
 <span class="status-pill">${latestteacher? "Teacher replied": "Waiting for reply"}</span>
 </div>
 <div class="student-teams-thread" aria-live="polite">
 ${messages.length? messages.map(studentteachermessageBubble).join(""): `
 <article class="student-teams-empty"><strong>No teacher conversation yet</strong><span>You can send a specific stuck point. Your teacher will see it in the message center.</span></article>
 `}
 </div>
 <form id="student-teacher-message-form" class="student-teams-form">
 <textarea id="student-teacher-message-input" placeholder="Example: I understand the left-hand waveform, but I still cannot connect it to the right-hand frequency graph."></textarea>
 <button class="primary-button" type="submit">Send to teacher</button>
 </form>
 </div>

 <aside class="panel student-teams-records">
 <div class="panel-header">
 <div><p class="small-label">Message log</p><h3>Synced conversation</h3></div>
 <span class="status-pill">Teams-style</span>
 </div>
 <ul class="record-list">
 ${record("Current alias", STUDENT_ALIAS)}
 ${record("Latest teacher reply", latestteacher? `${formatStudenttime(latestteacher.createdAt)} · ${latestteacher.text}`: "No teacher reply yet.")}
 ${record("Current stuck point", lastStuckType)}
 </ul>
 </aside>
 </section>
 `;}

function messagesForStudent() {const workspace = window.TeachFlowWorkspaceState.getState();
 return (workspace.messages || []).filter((message) => message.studentAlias === STUDENT_ALIAS).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));}

function latestteachermessage() {return [...messagesForStudent()].reverse().find((message) => message.senderRole === "teacher") || null;}

function studentteachermessageBubble(message) {const roleclass = message.senderRole === "teacher"? "from-teacher": message.senderRole === "system"? "from-system": "from-student";
 const label = message.senderRole === "teacher"? "Teacher": message.senderRole === "system"? "System reminder": "You";
 return `
 <article class="student-teams-message ${roleclass}">
 <span>${label} · ${formatStudenttime(message.createdAt)}</span>
 <p>${escapeHtml(message.text)}</p>
 </article>
 `;}

function sendStudentteachermessage() {const input = document.getElementById("student-teacher-message-input");
 const text = input?.value.trim();
 if (!text) return;
 postStudentteachermessage(text).then(() => {if (input) input.value = "";
 setStudentChannel("messages");});
 return;
 window.TeachFlowWorkspaceState.recordmessage(STUDENT_ALIAS, {text,
 senderRole: "student",
 senderId: STUDENT_CONTEXT.userId,
 senderLabel: STUDENT_ALIAS,
 kind: "chat",
 context: STUDENT_CONTEXT});
 if (input) input.value = "";
 setStudentChannel("messages");}

function respondToteacherAction(actionId, responseType) {const action = studentteacherActions().find((item) => item.id === actionId);
 if (!action) return;

 if (responseType === "still_stuck") {const note = `After the teacher action "${action.title || studentteacherActionLabel(action.type)}", I am still stuck and need another step.`;
 postStudentActionStuck(action, note).then(() => {studentAgentstatusmessage = "Synced to your teacher. The teacher outcome view will show that follow-up is needed.";
 lastStuckType = "Still stuck after teacher action";
 setStudentChannel("support");});
 return;}

 const text = `The teacher action "${action.title || studentteacherActionLabel(action.type)}" helped me understand.`;
 postStudentteachermessage(text, {kind: "teacher_action_response",
 linkedteacherActionId: action.id,
 responseType: "improved"}).then(() => {studentAgentstatusmessage = "Synced to your teacher. The teacher outcome view will show an improved learning signal.";
 setStudentChannel("progress");});}

async function postStudentteachermessage(text, options = {}) {const payload = {studentAlias: STUDENT_ALIAS,
 text,
 kind: options.kind || "chat",
 linkedteacherActionId: options.linkedteacherActionId || null,
 responseType: options.responseType || null};

 if (!canUseWorkspaceApi()) {return window.TeachFlowWorkspaceState.recordmessage(STUDENT_ALIAS, {...payload,
 senderRole: "student",
 senderId: STUDENT_CONTEXT.userId,
 senderLabel: STUDENT_ALIAS,
 context: STUDENT_CONTEXT});}

 try {const response = await fetch("/api/workspace/messages", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 if (!response.ok) throw new Error(`Workspace API ${response.status}`);
 const state = await response.json();
 return window.TeachFlowWorkspaceState.setState(state);} catch (error) {return window.TeachFlowWorkspaceState.recordmessage(STUDENT_ALIAS, {...payload,
 senderRole: "student",
 senderId: STUDENT_CONTEXT.userId,
 senderLabel: STUDENT_ALIAS,
 context: STUDENT_CONTEXT});}}

async function postStudentActionStuck(action, note) {const payload = {studentAlias: STUDENT_ALIAS,
 stuckType: "Still stuck after teacher action",
 note,
 linkedteacherActionId: action.id,
 responseType: "still_stuck"};

 if (!canUseWorkspaceApi()) {return window.TeachFlowWorkspaceState.recordStuckSignal(STUDENT_ALIAS, payload.stuckType, payload.note, payload);}

 try {const response = await fetch("/api/workspace/stuck-signals", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 if (!response.ok) throw new Error(`Workspace API ${response.status}`);
 const state = await response.json();
 return window.TeachFlowWorkspaceState.setState(state);} catch (error) {return window.TeachFlowWorkspaceState.recordStuckSignal(STUDENT_ALIAS, payload.stuckType, payload.note, payload);}}

function canUseWorkspaceApi() {return Boolean(typeof window!== "undefined" &&
 window.fetch &&
 window.location &&
 /^https?:$/.test(window.location.protocol));}

function renderStudentmessageNotice() {const latest = latestteachermessage();
 if (latest?.id) lastteachermessageId = latest.id;
 const hide = activeStudentChannelId === "messages" ||!latest;
 document.querySelectorAll(".student-message-notice").forEach((badge) => {if (hide) {badge.hidden = true;
 badge.textContent = "";
 return;}
 badge.hidden = false;
 badge.textContent = "1";});}

function formatStudenttime(value) {if (!value) return "now";
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return value;
 return date.toLocaleString("en-GB", {month: "2-digit",
 day: "2-digit",
 hour: "2-digit",
 minute: "2-digit"});}

function responseForquestion(question) {if (/diagram|view|left|right|wave/.test(question)) {return "Start with the diagram. The left side usually shows how the signal changes over time; the right side shows the simpler frequencies that make up the same signal.";}
 if (/formula|symbol/.test(question)) {return "Do not start by calculating. First translate each symbol into one plain sentence, then choose the symbol that is still unclear.";}
 if (/frequency domain|time|time domain/.test(question)) {return "The time domain shows the signal over time. The frequency domain shows which repeating frequencies make up that same signal.";}
 return "Turn the question into one small step: what you understand, what is uncertain, and which example would help.";}

function rendermessage(message) {return `
 <article class="chat-message ${message.role === "user"? "from-user": "from-assistant"}">
 <span>${message.role === "user"? "You": "AI Agent"}</span>
 <p>${escapeHtml(message.text)}</p>
 </article>
 `;}

function promptButton(text) {return `<button class="prompt-button" type="button" data-prompt="${escapeAttr(text)}">${escapeHtml(text)}</button>`;}

function supportPromptButton(text) {return `<button class="prompt-button compact-prompt" type="button" data-support-prompt="${escapeAttr(text)}">${escapeHtml(text)}</button>`;}

function latestStudentCheckIn() {return window.TeachFlowWorkspaceState.latestCheckIn(STUDENT_ALIAS);}

function checkInOption(id, title, body) {const selected = id === selectedCheckInState? " selected": "";
 return `
 <button class="checkin-option${selected}" type="button" data-checkin-state="${escapeAttr(id)}">
 <strong>${escapeHtml(title)}</strong>
 <span>${escapeHtml(body)}</span>
 </button>
 `;}

function checkIndraft(state, note) {if (state === "understand") {return {next: "Confirm your understanding with one short practice question.",
 teacherdraft: "I understand the main idea and need a quick confirmation task."};}
 if (state === "frustrated") {return {next: "Start with a low-pressure example, then try one tiny step.",
 teacherdraft: "I feel frustrated with this topic. Could I get a simpler example or diagram first?"};}
 if (state === "want_teacher_help") {return {next: "Turn your help request into one sentence for your teacher.",
 teacherdraft: note? `Teacher, could you help me with this: ${note}`: "Teacher, could you help me identify the specific stuck point?"};}
 if (state === "stuck") {return {next: "Turn the stuck point into one specific question, then ask for a hint.",
 teacherdraft: note? `I am stuck on: ${note}`: "I am stuck and need one smaller step."};}
 return {next: "Review the teacher-approved material, then write one sentence about what is still unclear.",
 teacherdraft: note? `I partly understand this: ${note}`: "I partly understand, but I need a simple confirmation."};}

function checkInPreviewItem(title, body) {return `<article class="checkin-preview-item"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></article>`;}

function latestCheckInPanel(item) {return `
 <div class="latest-checkin-card">
 <span>Learning check-in</span>
 <strong>${escapeHtml(item.stateLabel)} · ${escapeHtml(item.wellbeingLabel)}</strong>
 <p>${escapeHtml(item.shareChoice === "teacher_summary"? "Shared a learning summary with teacher": "Saved privately")}</p>
 <small>${escapeHtml(item.nextLearningStep)}</small>
 </div>
 `;}

function emptyCheckInPanel() {return `
 <div class="latest-checkin-card">
 <span>Learning check-in</span>
 <strong>No check-in yet</strong>
 <p>You can keep this private first, or share a short learning summary with your teacher when you need support.</p>
 </div>
 `;}

function currentStudentAgentState() {if (studentAgentBriefing) return studentAgentBriefing;
 const workspace = window.TeachFlowWorkspaceState.getState();
 const scopedWorkspace = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, STUDENT_CONTEXT);
 if (window.TeachFlowStudentAgentOrchestrator?.buildStudentBriefing) {return window.TeachFlowStudentAgentOrchestrator.buildStudentBriefing(scopedWorkspace, {context: STUDENT_CONTEXT});}
 return window.TeachFlowDualAgentEngine.buildStudentAgentState({topic: "Wave mechanics",
 stuckType: lastStuckType,
 assignmentstatus,
 chatCount: Math.max(chatmessages.length - 1, 0)});}

function studentAgentSourceChip(item) {return `<span class="student-agent-source-chip"><strong>${escapeHtml(item.count)}</strong>${escapeHtml(item.label)}</span>`;}

function studentAgentSharePreview() {const draft = lastStudentAgentdraft || currentStudentAgentState().sharedraft;
 if (!draft) return "";
 return `
 <section class="student-agent-share-preview">
 <div class="panel-header compact-header">
 <div><p class="small-label">Share summary</p><h3>Confirm before your teacher sees it</h3></div>
 <span class="status-pill warn">Confirm first</span>
 </div>
 <p>${escapeHtml(draft.teacherVisiblePreview || draft.teachersummary)}</p>
 <small>${escapeHtml(draft.nextStep || "first learningcompletedstep.")}</small>
 </section>
 `;}

function cleanStudentAgentCopy(value) {if (value === undefined || value === null) return "";
 let text = String(value || "");
 const replacements = [
 ["\u4f60\u73b0\u5728\u6b63\u5728\u5b66\u4e60\u300c", "You are currently learning "],
 ["\u300d\u3002\u6211\u770b\u5230\u4f60\u7684\u4e3b\u8981\u5361\u70b9\u662f\u300c", ". Main stuck point: "],
 ["\u300d\uff0c\u4f5c\u4e1a\u72b6\u6001\u662f\u300c", ". Assignment status: "],
 ["\u300d\u3002\u4e0b\u4e00\u6b65\u5148\u505a\u4e00\u4e2a\u5c0f\u52a8\u4f5c\uff1a", ". Next step: "],
 ["\u7b49\u5f85\u8001\u5e08\u53cd\u9988\u5e76\u8ffd\u95ee", "Use teacher feedback"],
 ["\u5982\u679c\u8001\u5e08\u56de\u590d\u4e86\uff0c\u5148\u6309\u8001\u5e08\u7ed9\u7684\u4e00\u4e2a\u5c0f\u6b65\u9aa4\u505a\uff0c\u4e0d\u8981\u540c\u65f6\u5904\u7406\u592a\u591a\u95ee\u9898\u3002", "If your teacher has replied, follow one small step first before asking a new question."],
 ["\u5df2\u6709\u63d0\u4ea4\uff0c\u9002\u5408\u7b49\u5f85\u8001\u5e08\u53cd\u9988\u5e76\u7ee7\u7eed\u8ffd\u95ee", "Assignment submitted; ready for teacher feedback and follow-up questions."],
 ["teacheractionstuck point", "Still stuck after teacher action"],
 ["teacher action stuck point", "Still stuck after teacher action"],
 ["draftlearningsubmit", "draft not submitted"],
 ["learningsubmit", "submitted"],
 ["learningnowlearning", "is making more sense now"],
 ["learning good", "I understand this part."],
 ["learningsymbolis learning", "formula symbol is unclear"],
 ["learning formula, formula symbol is unclear.", "I am unsure what the formula symbols mean."],
 ["\u300c", ""],
 ["\u300d", ""]
 ];
 replacements.forEach(([from, to]) => {text = text.split(from).join(to);});
 if (window.TeachFlowCopyPolish?.clean) text = window.TeachFlowCopyPolish.clean(text);
 return text.replace(/\s+([.,:;!?])/g, "$1").replace(/\s+/g, " ").trim();}

function studentAgentSummary(agentState) {const topic = cleanStudentAgentCopy(agentState.topic || window.TeachFlowWorkspaceState.getState().topic || "current topic");
 const stuck = cleanStudentAgentCopy(agentState.profile?.stuckType || "one specific stuck point");
 const status = studentAssignmentStatus(agentState);
 const next = cleanStudentAgentCopy(agentState.nextPlan?.[0]?.action || "Break it into one small question");
 return `You are currently learning ${topic}. Main stuck point: ${stuck}. Assignment status: ${status}. Next step: ${next}.`;}

function studentAssignmentStatus(agentState) {const raw = cleanStudentAgentCopy(agentState.profile?.assignmentstatus || assignmentstatus || "");
 if (!raw || /^undefined$/i.test(raw)) return "Not submitted";
 if (/submitted|turned in|complete/i.test(raw)) return "Submitted";
 return raw;}

function studentAssignmentConfidence(agentState) {const raw = cleanStudentAgentCopy(agentState.profile?.confidence || "");
 if (raw && !/^undefined$/i.test(raw)) return raw;
 if (/submitted/i.test(studentAssignmentStatus(agentState))) return "Assignment submitted; ready for teacher feedback and follow-up questions.";
 return "Draft not finished; start with a low-pressure draft.";}

function agentStat(label, value, body) {return `
 <article class="agent-stat">
 <span>${escapeHtml(cleanStudentAgentCopy(label))}</span>
 <strong>${escapeHtml(cleanStudentAgentCopy(value))}</strong>
 <p>${escapeHtml(cleanStudentAgentCopy(body))}</p>
 </article>
 `;}

function studentAgentPlanPanel() {const agentState = currentStudentAgentState();
 return `
 <section class="student-agent-plan">
 <div class="panel-header compact-header">
 <div><p class="small-label">Personal Agent plan</p><h3>Suggested next steps</h3></div>
 <span class="status-pill">private by default</span>
 </div>
 <div class="student-agent-plan-list">
 ${agentState.nextPlan.map((item, index) => `
 <article>
 <span>${index + 1}</span>
 <div><strong>${escapeHtml(cleanStudentAgentCopy(item.action))}</strong><p>${escapeHtml(cleanStudentAgentCopy(item.detail))}</p></div>
 </article>
 `).join("")}
 </div>
 <div class="teacher-signal-draft">
 <span>Shareable teacher summary</span>
 <p>${escapeHtml(cleanStudentAgentCopy(agentState.teacherSignaldraft))}</p>
 </div>
 </section>
 `;}

function learningMemory(label, body) {return `<li><strong>${label}</strong><span>${body}</span></li>`;}

function currentAgentAdvice() {return cleanStudentAgentCopy(currentStudentAgentState().nextPlan[0].detail);}

function task(title, detail, status) {return `<li class="task-item"><strong>${title}</strong><span>${detail}</span><em class="status-pill">${status}</em></li>`;}

function concept(title, body) {return `<article class="concept-card"><strong>${title}</strong><p>${body}</p></article>`;}

function record(time, body) {return `<li class="record-item"><strong>${time}</strong><span>${body}</span></li>`;}

function mapColumn(title, items) {return `
 <section class="map-column">
 <h4>${title}</h4>
 <ul class="map-list">
 ${items.map(([itemTitle, body]) => `<li class="map-item"><strong>${itemTitle}</strong><span>${body}</span></li>`).join("")}
 </ul>
 </section>
 `;}

function stuck(title, body) {return `<button class="stuck-option" type="button"><strong>${title}</strong><span>${body}</span></button>`;}

function progress(label, value) {return `
 <div class="progress-row">
 <div class="progress-top"><span>${label}</span><span>${value}%</span></div>
 <div class="progress-bar"><span style="width: ${value}%"></span></div>
 </div>
 `;}

function escapeHtml(value) {return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");}

function escapeAttr(value) {return escapeHtml(value);}

function studentmaterialChannel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, STUDENT_CONTEXT);
 const materials = studentpublishedmaterials(scoped);
 return `
 <section class="two-column">
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">materials</p><h3>${escapeHtml(scoped.topic || "Topic not set")}</h3></div>
 <span class="status-pill">${materials.length? `${materials.length} items`: "Awaiting teacher publish"}</span>
 </div>
 ${materials.length? `
 <div class="student-material-card-list">
 ${materials.map(studentpublishedmaterialCard).join("")}
 </div>
 `: `
 <article class="student-empty-card">
 <strong>No published materials yet</strong>
 <span>When your teacher publishes a handout, visual, or practice set, it will appear here.</span>
 </article>
 `}
 </div>
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">Suggested</p><h3>Start with teacher-published material</h3></div>
 </div>
 <ul class="record-list">
 ${record("assignment", assignmentstatus || "Not submitted")}
 ${record("Ask Agent", "Ask a specific concept question or ask for a next step.")}
 ${record("Stuck signal", "If you need teacher support, share a short summary with your teacher.")}
 </ul>
 </div>
 </section>
 `;}

studentChannels.support = {kicker: "AI support",
 title: "Learning analysis and stuck-signal support",
 html: () => `
 <section class="support-layout agent-support-layout">
 <div class="panel agent-analysis-panel">
 <div class="panel-header">
 <div><p class="small-label">AI analysis</p><h3>Learning status and next step</h3></div>
 <span class="status-pill">Dedicated Agent</span>
 </div>

 <div class="agent-summary-grid">
 ${agentStat("Understanding status", currentStudentAgentState().profile.level, studentAgentSummary(currentStudentAgentState()))}
 ${agentStat("Current stuck point", currentStudentAgentState().profile.stuckType, currentAgentAdvice())}
 ${agentStat("Assignment status", studentAssignmentStatus(currentStudentAgentState()), studentAssignmentConfidence(currentStudentAgentState()))}
 ${agentStat("Conversation log", `${currentStudentAgentState().profile.chatCount} items`, "Ask AI, learning logs and stuck signals stay connected.")}
 </div>

 <div class="student-agent-source-strip">
 <span class="status-pill">${studentAgentBriefingSource === "api"? "Pupil Agent API connected": "Learning Agent preview"}</span>
 ${(currentStudentAgentState().sourceSignals || []).map(studentAgentSourceChip).join("")}
 </div>

 <div class="learning-memory-panel">
 <div class="panel-header compact-header">
 <div><p class="small-label">Learning memory</p><h3>What the Agent knows</h3></div>
 </div>
 <ul class="learning-memory-list">
 ${learningMemory("Materials", "Teacher-approved handouts, visuals and practice will appear here.")}
 ${learningMemory("Mini quiz and assignment", assignmentstatus)}
 ${learningMemory("Stuck signal", lastStuckType)}
 ${learningMemory("Next evidence", "Questions, assignments, stuck signals and teacher feedback stay connected.")}
 </ul>
 </div>

 ${studentAgentPlanPanel()}
 ${studentAgentSharePreview()}
 </div>

 <aside class="support-side-stack">
 <section class="panel reflection-box">
 <div class="panel-header">
 <div><p class="small-label">Stuck signal</p><h3>Share one learning signal</h3></div>
 <span id="stuck-status" class="status-pill warn">${escapeHtml(lastStuckType)}</span>
 </div>
 <div class="stuck-options">
 ${stuck("Definition stuck", "A concept or definition is unclear.")}
 ${stuck("Diagram stuck", "I cannot connect parts of the diagram.")}
 ${stuck("Formula stuck", "A formula or symbol is unclear.")}
 ${stuck("Worked example transfer", "I can follow the example, but not a new version.")}
 </div>
 <label class="stuck-note">
 <span>Notes</span>
 <textarea id="stuck-note" placeholder="Example: I understand the idea, but I cannot read the visual yet."></textarea>
 </label>
 <div class="button-row">
 <button class="secondary-button" type="button" data-action="ask-from-stuck">Ask Agent to analyse</button>
 <button class="primary-button" type="button" data-action="send-stuck">Send to teacher</button>
 </div>
 <p id="student-agent-status" class="inline-note">${escapeHtml(studentAgentstatusmessage || "The pupil Agent drafts the stuck signal first. The teacher only sees it after you choose Send.")}</p>
 </section>
 </aside>
 </section>
 `};

studentChannels.checkin = {kicker: "Wellbeing",
 title: "AI Wellbeing Coach: learning stress and next steps",
 html: () => studentWellbeingChannel()};

function studentWellbeingChannel() {const latest = latestStudentCheckIn();
 const draft = checkIndraft(selectedCheckInState, latest?.note || "");
 return `
 <section class="checkin-layout wellbeing-chat-layout">
 <div class="panel wellbeing-chat-panel">
 <div class="panel-header">
 <div><p class="small-label">AI Wellbeing Coach</p><h3>Turn pressure into one small next step</h3></div>
 <span class="status-pill warn">Not clinical care</span>
 </div>
 <div id="wellbeing-chat-thread" class="chat-thread wellbeing-chat-thread">
 ${wellbeingmessages.map(rendermessage).join("")}
 </div>
 <form id="wellbeing-chat-form" class="question-form wellbeing-chat-form">
 <textarea id="wellbeing-chat-input" placeholder="Example: I feel behind and I do not know how to ask my teacher for help."></textarea>
 <button class="primary-button" type="submit">Send</button>
 </form>
 <div class="wellbeing-prompt-row" aria-label="Wellbeing prompts">
 ${wellbeingPromptButton("I feel behind. What should I do first?")}
 ${wellbeingPromptButton("Help me write one sentence to ask my teacher.")}
 ${wellbeingPromptButton("I feel overwhelmed. Give me one tiny step.")}
 </div>
 <p id="wellbeing-status" class="inline-note">${escapeHtml(wellbeingstatusmessage)}</p>
 </div>

 <aside class="wellbeing-side-stack">
 <section class="panel checkin-panel">
 <div class="panel-header">
 <div><p class="small-label">Student Check-in</p><h3>How is learning going right now?</h3></div>
 <span class="status-pill">Choose what to share</span>
 </div>
 <div class="checkin-state-grid" aria-label="Select current learning status">
 ${checkInOption("understand", "I understand", "I can keep practising")}
 ${checkInOption("partly_understand", "I partly understand", "I need confirmation")}
 ${checkInOption("stuck", "I am stuck", "I need a smaller step")}
 ${checkInOption("frustrated", "I feel frustrated", "I need a low-pressure step")}
 ${checkInOption("want_teacher_help", "I want teacher help", "Draft a help request")}
 </div>
 <label class="checkin-note">
 <span>One sentence about your status or stuck point</span>
 <textarea id="checkin-note" placeholder="Example: I understand the first example, but I get stuck when the diagram changes.">${escapeHtml(latest?.shareChoice === "private"? "": latest?.evidenceQuote || "")}</textarea>
 </label>
 <div class="button-row">
 <button class="secondary-button" type="button" data-action="keep-checkin-private">Keep private</button>
 <button class="secondary-button" type="button" data-action="ask-ai-checkin">Ask AI first</button>
 <button class="primary-button" type="button" data-action="share-checkin">Share summary with teacher</button>
 </div>
 <p id="checkin-status" class="inline-note">${escapeHtml(checkInstatusmessage || "You can keep this private first. Share a short summary only when you want teacher support.")}</p>
 </section>

 <section class="panel checkin-preview">
 <div class="panel-header">
 <div><p class="small-label">AI preview</p><h3>Supportive, not diagnostic</h3></div>
 <span class="status-pill">Learning status</span>
 </div>
 <div class="checkin-preview-stack">
 ${checkInPreviewItem("Next step for you", draft.next)}
 ${checkInPreviewItem("Teacher help request draft", draft.teacherdraft)}
 </div>
 ${latest? latestCheckInPanel(latest): emptyCheckInPanel()}
 </section>
 </aside>
 </section>
 `;}

function wellbeingPromptButton(text) {return `<button class="prompt-button compact-prompt" type="button" data-wellbeing-prompt="${escapeAttr(text)}">${escapeHtml(text)}</button>`;}

function bindWellbeingInteractions() {const form = document.getElementById("wellbeing-chat-form");
 if (form) {form.addEventListener("submit", (event) => {event.preventDefault();
 submitWellbeingmessage();});}

 document.querySelectorAll("[data-wellbeing-prompt]").forEach((button) => {button.addEventListener("click", () => {const input = document.getElementById("wellbeing-chat-input");
 if (input) {input.value = button.dataset.wellbeingPrompt || "";
 input.focus();}});});}

async function submitWellbeingmessage() {const input = document.getElementById("wellbeing-chat-input");
 const text = input?.value.trim();
 if (!text) return;

 wellbeingmessages.push({role: "user", text});
 if (input) input.value = "";
 wellbeingstatusmessage = "Thinking about one safe next step.";
 setStudentChannel("checkin", {skipAgentSync: true});

 const reply = await askWellbeingCoach(text);
 const answer = [reply.answer, reply.copingStep? `Next step: ${reply.copingStep}`: "", reply.safetyNote? `Reminder: ${reply.safetyNote}`: ""].filter(Boolean).join("\n\n");
 wellbeingmessages.push({role: "assistant", text: answer});
 wellbeingstatusmessage = reply.mode === "live"? "Live AI Wellbeing Coach replied. This conversation is private by default.": "Local Wellbeing Coach replied. This conversation is private by default.";
 setStudentChannel("checkin", {skipAgentSync: true});}

async function askWellbeingCoach(message) {if (!canUseWorkspaceApi()) {return localWellbeingCoachAnswer(message);}

 try {const response = await fetch("/api/student-agent/wellbeing-chat", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify({message})});
 if (!response.ok) throw new Error(`Wellbeing API ${response.status}`);
 return response.json();} catch (error) {return localWellbeingCoachAnswer(message);}}

function localWellbeingCoachAnswer(message) {const text = String(message || "");
 if (/Self-harm|not wanting to live|harm self|harm others|kill myself|suicide|self harm|die/i.test(text)) {return {mode: "local",
 answer: "This needs human support, not only AI. Please contact a trusted adult, teacher, parent/guardian, school support staff, or emergency support now.",
 copingStep: "First step: tell a trusted person nearby that you need help staying safe.",
 safetyNote: "If there is any risk of harm to yourself or someone else, get immediate human help."};}
 return {mode: "local",
 answer: "It sounds like the learning problem and the stress are tangled together. You do not have to solve everything at once; make the first step very small.",
 copingStep: "Write one sentence: I am stuck on ___ because ___.",
 safetyNote: "If the stress feels unsafe or overwhelming, involve a teacher, parent/guardian, or school support staff."};}

const baseBindDynamicInteractions = bindDynamicInteractions;
bindDynamicInteractions = function bindDynamicInteractionsWithWellbeing() {baseBindDynamicInteractions();
 bindWellbeingInteractions();};

function studentpublishedmaterials(scoped) {const fromApproved = (scoped?.approvedmaterials || []).filter((item) => item.status === "published").map((item) => ({...item, _sourceSort: item.publishedAt || item.createdAt || ""}));
 const fromActions = studentAssignedmaterials().map((item) => item.material? {...item.material,
 status: "published",
 publishedAt: item.createdAt,
 _sourceSort: item.createdAt || ""}: null).filter(Boolean);
 const byId = new Map();
 [...fromApproved,...fromActions].forEach((item) => {const key = item.id || item.sourcedraftId || `${item.title}-${item.publishedAt || ""}`;
 if (!byId.has(key)) byId.set(key, item);});
 return Array.from(byId.values()).sort((a, b) => String(b._sourceSort || "").localeCompare(String(a._sourceSort || "")));}

function studentpublishedmaterialCard(material) {const kind = String(material.kind || "").trim() || materialKindForStudent(material.type);
 return `
 <article class="student-published-material-card">
 <span>${escapeHtml(material.type || "materials")} · ${escapeHtml(formatStudenttime(material.publishedAt || material.createdAt))}</span>
 <strong>${escapeHtml(material.title || "Teacher-published material")}</strong>
 <p>${escapeHtml(material.goal || material.studentTask || "Complete this teacher-approved learning material.")}</p>
 ${kind === "image"? studentImagematerial(material): ""}
 ${kind === "exercise"? studentExercisematerial(material): studentHandoutmaterial(material)}
 </article>
 `;}

function studentImagematerial(material) {if (!material.imageUrl) return "";
 return `<img class="student-material-image" src="${escapeAttr(material.imageUrl)}" alt="${escapeAttr(material.title || "Learning visual")}">`;}

function studentHandoutmaterial(material) {const sections = Array.isArray(material.sections)? material.sections: [];
 const keyPoints = materialArrayForStudent(material.keyPoints || material.outline);
 if (!sections.length &&!keyPoints.length &&!material.content) return "";
 return `
 <div class="student-material-detail">
 ${sections.slice(0, 4).map((item) => `
 <section>
 <strong>${escapeHtml(item.heading || "Handout section")}</strong>
 <p>${escapeHtml(item.body || item.content || "")}</p>
 </section>
 `).join("")}
 ${keyPoints.length? `<ul>${keyPoints.slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`: ""}
 ${material.content? `<p>${escapeHtml(material.content)}</p>`: ""}
 </div>
 `;}

function studentExercisematerial(material) {const exercises = Array.isArray(material.exercises)? material.exercises: [];
 if (!exercises.length) return "";
 return `
 <div class="student-material-detail">
 ${exercises.slice(0, 6).map((item) => `
 <section>
 <strong>${escapeHtml(item.id || "practice")} ${escapeHtml(item.level || "")}</strong>
 <p>${escapeHtml(item.question || "")}</p>
 ${item.hint? `<small>${escapeHtml(item.hint)}</small>`: ""}
 </section>
 `).join("")}
 </div>
 `;}

function materialKindForStudent(type) {const text = String(type || "");
 if (/visual|diagram|image|diagram|image|diagram/i.test(text)) return "image";
 if (/practice|exercise|quiz|exercise|quiz|practice/i.test(text)) return "exercise";
 return "handout";}

function materialArrayForStudent(value) {if (Array.isArray(value)) {return value.map((item) => {if (item && typeof item === "object") return [item.heading, item.body, item.question].filter(Boolean).join(": ");
 return String(item || "").trim();}).filter(Boolean);}
 if (value && typeof value === "object") return Object.values(value).map((item) => String(item || "").trim()).filter(Boolean);
 return String(value || "").split(/\n+|; |;/).map((item) => item.trim()).filter(Boolean);}

studentChannels.support = {kicker: "AI support",
 title: "Your personal learning agent",
 html: () => {const agentState = currentStudentAgentState();
 const planItems = (agentState.nextPlan || []).slice(0, 3);
 return `
 <section class="support-layout agent-support-layout">
 <div class="panel agent-analysis-panel">
 <div class="panel-header">
 <div><p class="small-label">Personal Agent</p><h3>Your learning support plan</h3></div>
 <span class="status-pill">Private by default</span>
 </div>

 <div class="agent-summary-grid">
 ${agentStat("Understanding status", agentState.profile.level, studentAgentSummary(agentState))}
 ${agentStat("Current stuck point", agentState.profile.stuckType, currentAgentAdvice())}
 ${agentStat("Assignment status", studentAssignmentStatus(agentState), studentAssignmentConfidence(agentState))}
 ${agentStat("Conversation log", `${agentState.profile.chatCount} items`, "Questions, assignments and stuck signals stay connected in your learning memory.")}
 </div>

 <div class="student-agent-plan-list">
 ${planItems.map((item, index) => `
 <article>
 <span>${index + 1}</span>
 <div><strong>${escapeHtml(cleanStudentAgentCopy(item.action))}</strong><p>${escapeHtml(cleanStudentAgentCopy(item.detail))}</p></div>
 </article>
 `).join("")}
 </div>

 <section class="student-agent-share-preview">
 <div class="panel-header compact-header">
 <div><p class="small-label">Teacher-visible draft</p><h3>Confirm before sharing</h3></div>
 <span class="status-pill warn">Your choice</span>
 </div>
 <p>${escapeHtml(cleanStudentAgentCopy(agentState.sharedraft?.teacherVisiblePreview || agentState.teacherSignaldraft || "No stuck signal draft yet."))}</p>
 <small>${escapeHtml(cleanStudentAgentCopy(agentState.sharedraft?.nextStep || "Write the exact sentence you are least sure about."))}</small>
 </section>
 </div>

 <aside class="support-side-stack">
 <section class="panel support-agent-chat">
 <div class="panel-header">
 <div><p class="small-label">Ask your Agent</p><h3>Ask one learning question</h3></div>
 <span class="status-pill">Private chat</span>
 </div>
 <div id="support-chat-thread" class="chat-thread support-chat-thread">
 ${chatmessages.map(rendermessage).join("")}
 </div>
 <form id="support-question-form" class="question-form support-question-form">
 <textarea id="support-question-input" placeholder="Example: I still do not understand what an electron is."></textarea>
 <button class="secondary-button" type="submit">Ask Agent</button>
 </form>
 <div class="support-prompt-row" aria-label="Suggested learning prompts">
 ${supportPromptButton("What is my next small step?")}
 ${supportPromptButton("Explain this another way.")}
 ${supportPromptButton("Help me write a teacher help request.")}
 </div>
 </section>

 <section class="panel reflection-box">
 <div class="panel-header">
 <div><p class="small-label">Stuck signal</p><h3>Share only after you confirm</h3></div>
 <span id="stuck-status" class="status-pill warn">${escapeHtml(lastStuckType)}</span>
 </div>
 <div class="stuck-options">
 ${stuck("Definition stuck", "I need the concept in simpler words.")}
 ${stuck("Diagram stuck", "I cannot match the left and right parts of the diagram.")}
 ${stuck("Formula stuck", "I do not know what a symbol means.")}
 ${stuck("Example transfer", "I can follow the example but cannot apply it yet.")}
 </div>
 <label class="stuck-note">
 <span>Optional note</span>
 <textarea id="stuck-note" placeholder="Example: I still cannot connect the right-hand frequency graph to the left-hand waveform."></textarea>
 </label>
 <div class="button-row">
 <button class="secondary-button" type="button" data-action="ask-from-stuck">Draft with Agent</button>
 <button class="primary-button" type="button" data-action="send-stuck">Share with teacher</button>
 </div>
 <p id="student-agent-status" class="inline-note">${escapeHtml(studentAgentstatusmessage || "Your ordinary chat is private. The teacher only sees a stuck-signal summary after you choose to share it.")}</p>
 </section>
 </aside>
 </section>
 `;}};

studentChannels.home.title = "Your learning workspace";
studentChannels.home.html = () => studentHomeChannel();
studentChannels.material.kicker = "Materials";
studentChannels.material.title = "Teacher-published materials";
studentChannels.material.html = () => studentmaterialChannel();
studentChannels.messages = {kicker: "Messages",
 title: "Teacher conversation",
 html: () => studentteachermessagesChannel()};
studentChannels.assignment = {kicker: "Work",
 title: "Submit work and ask for help",
 html: () => `
 <section class="two-column">
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">Assignment</p><h3>Draft or submit your work</h3></div>
 <span id="assignment-status" class="status-pill ${assignmentstatus === "submitted"? "": "warn"}">${escapeHtml(assignmentstatus || "Not submitted")}</span>
 </div>
 <label class="homework-box">
 <span>Your draft</span>
 <textarea id="homework-body" placeholder="Write what you know, what you are unsure about, and which example would help."></textarea>
 </label>
 <div class="button-row">
 <button class="secondary-button" type="button" data-action="save-assignment">Save draft</button>
 <button class="primary-button" type="button" data-action="submit-assignment">Submit to teacher</button>
 </div>
 <p id="assignment-note" class="inline-note">Your teacher can use submitted work and shared stuck signals to plan support.</p>
 </div>

 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">Mini check</p><h3>Turn a stuck point into one question</h3></div>
 <span class="status-pill">Private until shared</span>
 </div>
 <form id="question-form" class="question-form">
 <textarea id="question-input" placeholder="Example: I still do not understand what an electron is."></textarea>
 <button class="primary-button" type="submit">Ask Agent</button>
 </form>
 <div class="prompt-row">
 ${promptButton("What is my next small step?")}
 ${promptButton("Explain this with a simple example.")}
 ${promptButton("Help me write a teacher help request.")}
 </div>
 </div>
 </section>
 `};
studentChannels.ask = {kicker: "Question",
 title: "Ask your learning Agent",
 html: () => `
 <section class="question-layout">
 <div class="panel question-chat-panel">
 <div class="panel-header">
 <div><p class="small-label">Private learning chat</p><h3>Ask one learning question</h3></div>
 <span class="status-pill">Student Agent</span>
 </div>
 <div id="question-thread" class="chat-thread">
 ${chatmessages.map(rendermessage).join("")}
 </div>
 <form id="question-form" class="question-form">
 <textarea id="question-input" placeholder="Example: Why does this graph show frequency instead of time?"></textarea>
 <button class="primary-button" type="submit">Ask Agent</button>
 </form>
 <div class="prompt-row">
 ${promptButton("What is my next small step?")}
 ${promptButton("Explain this another way.")}
 ${promptButton("Help me write a teacher help request.")}
 </div>
 </div>
 <aside class="panel">
 <div class="panel-header">
 <div><p class="small-label">Share boundary</p><h3>Private by default</h3></div>
 </div>
 <ul class="record-list">
 ${record("Private chat", "Your ordinary Agent chat stays private.")}
 ${record("Teacher summary", "Your teacher sees a stuck-signal summary only after you choose to share.")}
 ${record("Next step", currentAgentAdvice())}
 </ul>
 </aside>
 </section>
 `};
studentChannels.progress = {kicker: "Progress",
 title: "Learning record",
 html: () => `
 <section class="two-column">
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">Progress</p><h3>Your current learning signals</h3></div>
 <span class="status-pill">${escapeHtml(STUDENT_ALIAS)}</span>
 </div>
 ${progress("Assignment", assignmentstatus === "submitted"? 100: 45)}
 ${progress("Questions", Math.min(100, Math.max(20, chatmessages.length * 15)))}
 ${progress("Teacher feedback", studentteacherActions().length? 80: 25)}
 </div>
 <div class="panel">
 <div class="panel-header">
 <div><p class="small-label">Latest signals</p><h3>What the system remembers</h3></div>
 </div>
 <ul class="record-list">
 ${record("Assignment", assignmentstatus || "Not submitted")}
 ${record("Current stuck point", lastStuckType)}
 ${record("Latest check-in", latestStudentCheckIn()? latestStudentCheckIn().stateLabel: "No check-in yet")}
 </ul>
 </div>
 </section>
 ${studentteacherActiontimeline()}
 `};

setStudentChannel("home");

if (window.TeachFlowSessionPromise) {window.TeachFlowSessionPromise.then(() => {refreshStudentContext();
 setStudentChannel(activeStudentChannelId);}).catch(() => null);}

if (typeof window.TeachFlowWorkspaceState.syncFromServer === "function") {window.TeachFlowWorkspaceState.syncFromServer(STUDENT_CONTEXT).then(() => {setStudentChannel(activeStudentChannelId);});}

setInterval(() => {if (document.activeElement?.tagName === "TEXTAREA") return;
 if (typeof window.TeachFlowWorkspaceState.syncFromServer!== "function") return;
 window.TeachFlowWorkspaceState.syncFromServer(STUDENT_CONTEXT).then(() => {setStudentChannel(activeStudentChannelId);});}, 5000);
