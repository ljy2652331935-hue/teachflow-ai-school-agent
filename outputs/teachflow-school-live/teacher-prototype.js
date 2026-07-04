let selectedStudentId = "S001";
let teacherAgentquestion = "What should I prioritise in this lesson?";
let teacherAgentAnswer = "";
let teacherAgentBriefing = null;
let teacherAgentBriefingSource = "local";
let TEACHER_CONTEXT = readteacherContext();
let studentRoster = window.TeachFlowWorkspaceState.getStudentsForContext(TEACHER_CONTEXT);
let activeteacherChannelId = "overview";
let selectedmessageAlias = studentRoster[0]?.id || "S001";
let lastteacherWorkspaceSignature = "";
let selectedmaterialType = "Handout";
let materialGenerationstatus = "";
let latestgeneratedmaterial = null;

const MATERIAL_TYPE_OPTIONS = [{icon: "lecture",
 title: "Handout",
 detail: "generate pupil-readable concept handouts for pre-lesson reading and post-lesson review."},
 {icon: "image",
 title: "visual",
 detail: "Create diagrams, flowcharts, concept maps or class display visuals."},
 {icon: "practice",
 title: "practice",
 detail: "generate differentiated practice and micro-quizzes for Levels 1–3."}];

if ("scrollRestoration" in history) {history.scrollRestoration = "manual";}

function readteacherContext() {const sessionContext = window.TeachFlowSession?.context || {};
 return window.TeachFlowWorkspaceState.getteacherContext({userId: sessionContext.userId,
 classId: sessionContext.classId});}

function refreshteacherContext() {TEACHER_CONTEXT = readteacherContext();}

const channels = {overview: {kicker: "Overview",
 title: "Your teaching dashboard for today",
 html: () => teacherOverviewChannel(),
 legacyHtml: `
 <section class="metric-grid">
 ${metric("Pending reviews", "3", "2 fewer than yesterday")}
 ${metric("needs support", "9", "diagram focus")}
 ${metric("Approved materials", "4", "Ready to publish")}
 ${metric("Today's stuck signals", "6", "2 high priority")}
 </section>
 <section class="layout-grid">
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">class flow</p><h3>Today's priorities</h3></div>
 <span class="status-pill warn">Awaiting teacher confirmation</span>
 </div>
 <details class="compact-disclosure">
 <summary>
 <span>view today's timeline</span>
 <em>4 items</em>
 </summary>
 <ul class="timeline-list">
 ${timeline("09:10", "Year 12 Physics A completed mini quiz", "32 anonymised responses queued for diagnosis")}
 ${timeline("10:35", "Intervention draft generated", "review first“formula equals concept”misconception evidence")}
 ${timeline("13:20", "pupil view received 6 stuck signals", "Mostly time vs frequency diagram mapping")}
 ${timeline("15:40", "Pre-lesson materials pending export", "After teacher approval, publish to Level 1 and Level 2 pupils")}
 </ul>
 </details>
 </div>
 <div class="panel material-preview">
 <img src="assets/fourier-prism.svg" alt="Wave mechanics class material preview">
 <div class="material-caption">
 <p class="mini-label">material preview</p>
 <h3>Wave mechanics visual explainer</h3>
 <p>Topic materials appear inteacher approval, pupil handoutsandunderstanding map.</p>
 </div>
 </div>
 </section>
 `},
 courses: {kicker: "classes",
 title: "classes and topics",
 html: () => teacherCoursesChannel(),
 legacyHtml: () => `
 <section class="layout-grid">
 <div class="panel table-card">
 <div class="panel-header">
 <div><p class="mini-label">class list</p><h3>Active pilot spaces</h3></div>
 <button class="secondary-button" type="button">Add class</button>
 </div>
 <table>
 <thead><tr><th>class</th><th>current topic</th><th>pupil aliases</th><th>status</th></tr></thead>
 <tbody>
 ${row(["Year 12 Physics A", "Wave mechanics", "S001-S032", "Diagnosing"])}
 ${row(["Year 11 Physics B", "Mechanical waves", "S001-S028", "Preparing materials"])}
 ${row(["AP Physics", "Electric Fields", "S001-S021", "Not started"])}
 </tbody>
 </table>
 </div>
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">current topic</p><h3>Wave mechanics</h3></div>
 <span class="status-pill">Saved</span>
 </div>
 <ul class="task-list">
 ${task("Learning objective", "Explain the same signal in time and frequency")}
 ${task("class materials", "concept notes, visuals, practice and pupil responses")}
 ${task("Privacy settings", "pupil aliases only; no names, email or IDs")}
 </ul>
 </div>
 </section>
 <section class="class-student-section">
 <div class="panel roster-panel">
 <div class="panel-header">
 <div><p class="mini-label">pupil avatars</p><h3>select an avatar for pupil detail</h3></div>
 <span class="status-pill">Year 12 Physics A</span>
 </div>
 <div class="student-avatar-grid">
 ${studentRoster.map(studentAvatar).join("")}
 </div>
 </div>
 </section>
 `},
 analysis: {kicker: "class insights",
 title: "class insights: diagnosis, intervention and pupil support in one workspace",
 html: () => `
 ${analysisOutcomesummaryPanel()}
 ${teacherAgentPanel()}

 <section class="metric-grid analysis-metrics">
 ${analysisMetricCards()}
 </section>

 <section class="panel analysis-workbench-panel">
 <div class="panel-header">
 <div><p class="mini-label">class insights workbench</p><h3>Handle diagnosis, intervention and pupil follow-up here</h3></div>
 <span class="status-pill">summary first</span>
 </div>
 <div class="analysis-brief-grid">
 ${analysisBriefCard("diagnosis", "Diagnosis", "3 types", "view evidence", "hot")}
 ${analysisBriefCard("intervention", "Intervention", "3 drafts", "view plan", "warn")}
 ${analysisBriefCard("student", "pupil support", `${sharedCheckIns().length} items`, "view pupils", "")}
 </div>
 </section>

 <section class="analysis-clean-grid">
 <div class="panel analysis-flow-panel">
 <div class="panel-header">
 <div><p class="mini-label">AI teaching loop</p><h3>From pupil evidence to your next teaching move</h3></div>
 <span class="status-pill">updates this lesson</span>
 </div>
 <div class="analysis-flow compact-flow">
 ${analysisStep("1", "Gather evidence", "assignments, questions, stuck signals and check-ins feed one data layer.", "Live sync")}
 ${analysisStep("2", "generate insight", "Surfaces misconceptions and evidence only — does not replace teacher judgement.", "Pending review")}
 ${analysisStep("3", "Plan intervention", "Maps misconceptions to Level 1–3 materials and mini quizzes.", "draft")}
 ${analysisStep("4", "Continue follow-up", "New pupil feedback returns to the next class insights cycle.", "Ongoing log")}
 </div>
 </div>

 <aside class="panel analysis-action-panel">
 <div class="panel-header">
 <div><p class="mini-label">Next actions</p><h3>Suggested teacher priorities</h3></div>
 <span class="status-pill warn">Awaiting teacher approval</span>
 </div>
 <div class="analysis-action-stack">
 ${analysisAction("Add diagram first", "publish a low-threshold diagram explainer for Level 1 pupils.", "Create visual", "creation")}
 ${analysisAction("Add short practice", "publish 3 short diagram questions for Level 2 pupils.", "view intervention", "intervention")}
 ${analysisAction("Priority follow-up", "review quotes and next steps for S009, S014 and S021 first.", "view pupils", "student")}
 </div>
 </aside>
 </section>

 ${teacherSupportInbox()}
 ${workspaceSyncPanel()}
 `},
 messages: {kicker: "messages",
 title: "Teams-style help alerts and teacher–pupil chat",
 html: () => teachermessagesChannel()},
 creation: {kicker: "Content hub",
 title: "Create handouts, visuals and practice",
 html: () => teacherCreationChannel(),
 legacyHtml: `
 <section class="creation-layout">
 <div class="panel material-maker">
 <div class="panel-header">
 <div><p class="mini-label">material studio</p><h3>generate materials from diagnosis</h3></div>
 <span class="status-pill warn">draft stage</span>
 </div>
 <div class="material-type-grid">
 ${materialType("lecture", "Handout", "generate pupil-readable concept handouts for pre-lesson readingandpost-lesson review.", "selected")}
 ${materialType("image", "visual", "Create diagrams, flowcharts, concept maps or class display visuals.", "Available")}
 ${materialType("practice", "practice", "generate differentiated practice and micro-quizzes for Levels 1–3.", "Available")}
 </div>

 <div class="maker-form">
 <label>
 <span>material topic</span>
 <input value="Wave mechanics: time and frequency diagram mapping">
 </label>
 <label>
 <span>Creation goal</span>
 <textarea>Help pupils understand“the same signal can be shown in time or frequency”, Lower barriers for diagram mapping and formula meaning.</textarea>
 </label>
 <div class="maker-field-grid">
 <label>
 <span>Target level</span>
 <select>
 <option>Level 1 confused pupils</option>
 <option>Level 2 Developing</option>
 <option>Level 3 Ready to apply</option>
 </select>
 </label>
 <label>
 <span>Output format</span>
 <select>
 <option>Handout + visual + Mini quiz</option>
 <option>visual for class display only</option>
 </select>
 </label>
 </div>
 <div class="action-row">
 <button class="primary-button" type="button">generate material draft</button>
 <button class="secondary-button" type="button" data-jump-channel="approval">send to Approval</button>
 </div>
 </div>
 </div>

 <aside class="panel creation-preview">
 <div class="panel-header">
 <div><p class="mini-label">Preview</p><h3>Editable before teacher approval</h3></div>
 <span class="status-pill">version 3</span>
 </div>
 <img src="assets/fourier-prism.svg" alt="material preview">
 <ul class="material-review-list">
 ${materialreview("visual", "Wave mechanics visual explainer", "Explains how complex waveforms split into simple frequencies.")}
 ${materialreview("Handout", "5-minute pupil handout", "Lower jargon; intuition before formulae.")}
 </ul>
 </aside>
 </section>
 `},
 approval: {kicker: "Approval",
 title: "teacher approval layer",
 html: () => teacherApprovalChannel(),
 legacyHtml: `
 <section class="layout-grid">
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">Approval flow</p><h3>drafts are not auto-published</h3></div>
 <span class="status-pill warn">Awaiting review</span>
 </div>
 <ul class="timeline-list">
 ${timeline("version 1", "AI first draft", "Includes plan, differentiated materials, mini quiz")}
 ${timeline("version 2", "teacher edited Level 1 material", "Added clearer diagram explanations")}
 ${timeline("current", "Awaiting final approval", "export and publish to pupil view only after approvalpupil view")}
 </ul>
 </div>
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">materials sent from Content hub</p><h3>Reusable teacher materials</h3></div>
 </div>
 <ul class="material-review-list approval-materials">
 ${materialreview("Handout", "Wave mechanics pupil handout", "Awaiting teacher check on language level and examples.")}
 ${materialreview("visual", "time vs frequency diagram", "Awaiting teacher check on diagram accuracy.")}
 </ul>
 <div class="action-row">
 <button class="primary-button" type="button">Approve</button>
 <button class="secondary-button" type="button">export Markdown</button>
 <button class="secondary-button" type="button">export materials</button>
 <button class="plain-button" type="button">Revert version</button>
 </div>
 </div>
 </section>
 `},
 settings: {kicker: "settings",
 title: "Safeguarding and pilot settings",
 html: () => `
 <section class="split-panel">
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">Privacy rules</p><h3>Anonymised pilot by default</h3></div>
 <span class="status-pill">Enabled</span>
 </div>
 <ul class="task-list">
 ${task("pupil identity", "Alias codes only (e.g. S001)")}
 ${task("pupil view", "No open chat, teacher-approved materials only")}
 ${task("Leadership view", "Aggregated insights only, No individual detail")}
 </ul>
 </div>
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">Permissions</p><h3>teachers retain final control</h3></div>
 </div>
 <div class="pill-row">
 <span class="status-pill">Editable</span>
 <span class="status-pill">Can approve</span>
 <span class="status-pill">Can export</span>
 <span class="status-pill warn">review before publish</span>
 </div>
 </div>
 </section>
 ${roleBoundaryPanel()}
 ${auditLogPanel()}
 `}};

const buttons = Array.from(document.querySelectorAll("[data-channel]"));
const content = document.getElementById("channel-content");
const title = document.getElementById("channel-title");
const kicker = document.getElementById("channel-kicker");

buttons.forEach((button) => {button.addEventListener("click", () => setChannel(button.dataset.channel));});

document.querySelectorAll("[data-top-channel]").forEach((button) => {button.addEventListener("click", () => setChannel(button.dataset.topChannel));});

document.querySelectorAll("[data-preview-student]").forEach((button) => {button.addEventListener("click", () => {window.open("student-prototype.html", "_blank", "noopener,noreferrer");});});

function setChannel(channelId) {activeteacherChannelId = channels[channelId]? channelId: "overview";
 syncteacherChannelHash(activeteacherChannelId);
 renderteacherChannel(activeteacherChannelId);
 syncteacherWorkspace(activeteacherChannelId);
 syncteacherAgentBriefing(activeteacherChannelId);}

function syncteacherChannelHash(channelId) {if (!history.replaceState) return;
 const nextHash = `#${channelId}`;
 if (location.hash === nextHash) return;
 history.replaceState(null, "", nextHash);}

function channelFromLocation() {const queryChannel = new URLSearchParams(location.search).get("channel");
 if (channels[queryChannel]) return queryChannel;
 const hashChannel = decodeURIComponent(location.hash.replace(/^#/, ""));
 return channels[hashChannel]? hashChannel: "overview";}

function renderteacherChannel(channelId) {refreshteacherWorkspaceState();
 lastteacherWorkspaceSignature = teacherWorkspaceSignature();
 const channel = channels[channelId] || channels.overview;
 buttons.forEach((button) => button.classList.toggle("active", button.dataset.channel === channelId));
 title.textContent = channel.title;
 kicker.textContent = channel.kicker;
 content.innerHTML = typeof channel.html === "function"? channel.html(): channel.html;
 ensureteacherDetailModal();
 renderteachermessageNotice();
 bindDynamicInteractions();}

function syncteacherWorkspace(channelId) {if (typeof window.TeachFlowWorkspaceState.syncFromServer!== "function") return;
 const beforeSignature = teacherWorkspaceSignature();
 window.TeachFlowWorkspaceState.syncFromServer(TEACHER_CONTEXT).then(() => {renderteachermessageNotice();
 if (channelId!== activeteacherChannelId) return;
 if (isteacherdraftActive()) return;
 const afterSignature = teacherWorkspaceSignature();
 if (afterSignature === beforeSignature && afterSignature === lastteacherWorkspaceSignature) return;
 renderteacherChannel(activeteacherChannelId);});}

function syncteacherAgentBriefing(channelId) {if (!canUseteacherAgentApi()) return;
 window.fetch("/api/teacher-agent/briefing", {cache: "no-store"}).then((response) => {if (!response.ok) throw new Error(`teacher Agent API ${response.status}`);
 return response.json();}).then((briefing) => {teacherAgentBriefing = briefing;
 teacherAgentBriefingSource = "api";
 if (channelId!== activeteacherChannelId) return;
 if (isteacherdraftActive()) return;
 if (activeteacherChannelId === "analysis" || activeteacherChannelId === "overview") {renderteacherChannel(activeteacherChannelId);}}).catch(() => {teacherAgentBriefingSource = "local";});}

function canUseteacherAgentApi() {return Boolean(window.fetch &&
 window.location &&
 /^https?:$/.test(window.location.protocol));}

function isteacherdraftActive() {return isteachermessagedraftActive() || isteacherAgentdraftActive() || isteachermaterialdraftActive();}

function teacherWorkspaceSignature() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 return JSON.stringify({className: scoped.className,
 topic: scoped.topic,
 students: (scoped.students || []).map((item) => [item.id, item.status, item.level, item.stuck]),
 questions: (scoped.questions || []).map((item) => [item.id, item.studentAlias, item.text, item.createdAt]),
 stuckSignals: (scoped.stuckSignals || []).map((item) => [item.id, item.studentAlias, item.stuckType, item.createdAt]),
 checkIns: (scoped.checkIns || []).map((item) => [item.id, item.studentAlias, item.state, item.createdAt]),
 messages: (scoped.messages || []).map((item) => [item.id, item.studentAlias, item.senderRole, item.text, item.createdAt]),
 teacherAgentActions: (scoped.teacherAgentActions || []).map((item) => [item.id, item.type, item.studentAlias, item.status, item.studentResponseType]),
 draftmaterials: (scoped.draftmaterials || []).map((item) => [item.id, item.type, item.title, item.status, item.createdAt])});}

function isteachermessagedraftActive() {const form = document.getElementById("teacher-message-form");
 const input = document.getElementById("teacher-message-input");
 return Boolean(form &&
 (form.contains(document.activeElement) || input?.value.trim()));}

function isteacherAgentdraftActive() {const form = document.getElementById("teacher-agent-form");
 const input = document.getElementById("teacher-agent-input");
 const commandInput = document.getElementById("teacher-command-input");
 return Boolean((form &&
 (form.contains(document.activeElement) || input?.value.trim()!== teacherAgentquestion)) ||
 (commandInput && (commandInput === document.activeElement || commandInput.value.trim())));}

function isteachermaterialdraftActive() {const generatorForm = document.getElementById("material-generator-form");
 const editorForm = document.getElementById("material-editor-form");
 return Boolean((generatorForm && generatorForm.contains(document.activeElement)) ||
 (editorForm && editorForm.contains(document.activeElement)));}

function refreshteacherWorkspaceState() {refreshteacherContext();
 studentRoster = window.TeachFlowWorkspaceState.getStudentsForContext(TEACHER_CONTEXT);
 if (!studentRoster.some((student) => student.id === selectedStudentId)) {selectedStudentId = studentRoster[0]?.id || "S001";}
 if (!studentRoster.some((student) => student.id === selectedmessageAlias)) {selectedmessageAlias = studentRoster[0]?.id || "S001";}
 renderteacherShellMeta();}

function renderteacherShellMeta() {const card = document.querySelector(".sidebar-card");
 const meta = document.getElementById("teacher-context-meta");
 const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 const className = scoped.className || "Unnamed class";
 const topicName = scoped.topic || "Topic not set";
 if (meta) {meta.innerHTML = `
 <span>${escapeHtml(className)}</span><span>·</span>
 <span>${escapeHtml(topicName)}</span><span>·</span>
 <span>${studentRoster.length} pupils</span>
 `;}
 if (!card) return;
 card.innerHTML = `
 <p class="mini-label">current class</p>
 <strong>${escapeHtml(className)}</strong>
 <span>${escapeHtml(topicName)} · ${studentRoster.length} pupils</span>
 `;}

function ensureteacherCommandBar() {const form = document.getElementById("teacher-command-form");
 if (!form || form.dataset.bound) return;
 form.dataset.bound = "true";
 form.addEventListener("submit", (event) => {event.preventDefault();
 submitteacherCommandquestion();});}

function submitteacherCommandquestion() {const input = document.getElementById("teacher-command-input");
 const question = input?.value.trim();
 if (!question) return;
 teacherAgentquestion = question;
 teacherAgentAnswer = "";
 if (input) input.value = "";
 if (activeteacherChannelId!== "analysis") setChannel("analysis");
 askteacherAgent();
 if (activeteacherChannelId === "analysis") renderteacherChannel("analysis");}

function bindDynamicInteractions() {const teacherAgentForm = document.getElementById("teacher-agent-form");
 if (teacherAgentForm) {teacherAgentForm.addEventListener("submit", (event) => {event.preventDefault();
 askteacherAgent();});}

 document.querySelectorAll("[data-agent-action]").forEach((button) => {button.addEventListener("click", () => {applyteacherAgentAction(button.dataset.agentAction, button);});});

 document.querySelectorAll("[data-detail-type]").forEach((button) => {button.addEventListener("click", (event) => {event.stopPropagation();
 openteacherDetailModal(button.dataset.detailType, button.dataset.detailId || button.dataset.studentId || "");});});

 document.querySelectorAll("[data-student-id]:not([data-detail-type])").forEach((button) => {button.addEventListener("click", () => {selectedStudentId = button.dataset.studentId;
 openteacherDetailModal("student", selectedStudentId);});});

 document.querySelectorAll("[data-jump-channel]").forEach((button) => {button.addEventListener("click", () => setChannel(button.dataset.jumpChannel));});

 document.querySelectorAll("[data-copy-invite-link]").forEach((button) => {button.addEventListener("click", () => copyteacherInviteLink(button));});

 const classsettingsForm = document.querySelector("[data-class-settings-form]");
 if (classsettingsForm) {classsettingsForm.addEventListener("submit", (event) => {event.preventDefault();
 saveclasssettings(classsettingsForm);});}

 document.querySelectorAll("[data-material-type]").forEach((button) => {button.addEventListener("click", () => {selectedmaterialType = button.dataset.materialType || selectedmaterialType;
 document.querySelectorAll("[data-material-type]").forEach((item) => {const active = item.dataset.materialType === selectedmaterialType;
 item.classList.toggle("active", active);
 item.setAttribute("aria-pressed", active? "true": "false");
 const status = item.querySelector("em");
 if (status) status.textContent = active? "selected": "Tap to select";});
 const label = document.querySelector("[data-selected-material-label]");
 if (label) label.textContent = selectedmaterialType;});});

 const materialGeneratorForm = document.getElementById("material-generator-form");
 if (materialGeneratorForm) {materialGeneratorForm.addEventListener("submit", (event) => {event.preventDefault();
 generatematerialdraft(materialGeneratorForm);});}

 const materialEditorForm = document.getElementById("material-editor-form");
 if (materialEditorForm) {materialEditorForm.addEventListener("submit", (event) => {event.preventDefault();
 savematerialdraftEdits(materialEditorForm);});}

 document.querySelectorAll("[data-open-message]").forEach((button) => {button.addEventListener("click", () => {selectedmessageAlias = button.dataset.openmessage || selectedmessageAlias;
 setChannel("messages");});});

 document.querySelectorAll("[data-message-alias]").forEach((button) => {button.addEventListener("click", () => {selectedmessageAlias = button.dataset.messageAlias || selectedmessageAlias;
 setChannel("messages");});});

 const teachermessageForm = document.getElementById("teacher-message-form");
 if (teachermessageForm) {teachermessageForm.addEventListener("submit", (event) => {event.preventDefault();
 sendteachermessage();});
 teachermessageForm.querySelector("button[type='submit']")?.addEventListener("click", (event) => {event.preventDefault();
 sendteachermessage();});}}

function copyteacherInviteLink(button) {const input = document.querySelector("[data-class-invite-link]");
 const value = input?.value || "";
 if (!value || button.disabled) return;
 const markCopied = () => {button.textContent = "alreadycopy";
 window.setTimeout(() => {button.textContent = "copy link";}, 1600);};

 if (navigator.clipboard?.writeText) {navigator.clipboard.writeText(value).then(markCopied).catch(() => {input?.select();
 document.execCommand?.("copy");
 markCopied();});
 return;}

 input?.select();
 document.execCommand?.("copy");
 markCopied();}

function saveclasssettings(form) {const button = form.querySelector("button[type='submit']");
 const originalText = button?.textContent || "";
 const payload = Object.fromEntries(new FormData(form).entries());
 if (button) {button.disabled = true;
 button.textContent = "Saving…";}
 postclasssettings(payload).then((state) => {teacherAgentBriefing = null;
 if (state) window.TeachFlowWorkspaceState.setState(state);
 if (button) {button.disabled = false;
 button.textContent = "Saved";
 window.setTimeout(() => {button.textContent = originalText || "SavedTopic";}, 1400);}
 setChannel("courses");}).catch(() => {if (button) {button.disabled = false;
 button.textContent = "Save failed";
 window.setTimeout(() => {button.textContent = originalText || "SavedTopic";}, 1600);}});}

async function postclasssettings(payload) {if (!canUseteacherAgentApi()) {const state = window.TeachFlowWorkspaceState.getState();
 const classRecord = activeteacherclass(state);
 if (classRecord) {classRecord.name = payload.className || classRecord.name;
 classRecord.course = payload.course || classRecord.course;
 classRecord.topic = payload.topic || classRecord.topic;
 state.className = classRecord.name;
 state.topic = classRecord.topic;}
 return window.TeachFlowWorkspaceState.setState(state);}
 const response = await fetch("/api/workspace/class-settings", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 if (!response.ok) throw new Error(`class settings API ${response.status}`);
 return response.json();}

function materialpublishTargetOptions(material) {const state = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(state, TEACHER_CONTEXT);
 const students = scoped?.students || [];
 const targetAliases = Array.isArray(material.targetAliases)? material.targetAliases.filter(Boolean): [];
 const selected = targetAliases.length === 1? targetAliases[0]: "all";
 const knownAliases = new Set(students.map((student) => student.id));
 const options = [`<option value="all"${selected === "all"? " selected": ""}>All class pupils</option>`,...students.map((student) => {const label = `${student.id} · ${student.status || "pupil"}`;
 return `<option value="${escapeAttr(student.id)}"${selected === student.id? " selected": ""}>${escapeHtml(label)}</option>`;})];
 if (selected!== "all" &&!knownAliases.has(selected)) {options.push(`<option value="${escapeAttr(selected)}" selected>${escapeHtml(selected)} · selectedpupil</option>`);}
 return options.join("");}

function selectedpublishAliasesFordraft(draftId) {const select = Array.from(document.querySelectorAll("[data-publish-target]")).find((node) => node.dataset.publishTarget === draftId);
 const value = select?.value || "all";
 return value && value!== "all"? [value]: [];}

function generatematerialdraft(form) {const button = form.querySelector("[data-generate-material]");
 const payload = Object.fromEntries(new FormData(form).entries());
 payload.materialType = selectedmaterialType;
 payload.type = selectedmaterialType;
 payload.prompt = payload.prompt || payload.goal || "";

 const originalText = button?.textContent || "";
 if (button) {button.disabled = true;
 button.textContent = "Generating…";}
 materialGenerationstatus = `Generating${selectedmaterialType}draft, learning.`;

 postmaterialdraft(payload).then((result) => {latestgeneratedmaterial = result.saveddraft || result.draft || null;
 if (result.state) window.TeachFlowWorkspaceState.setState(result.state);
 teacherAgentBriefing = null;
 materialGenerationstatus = result.mode === "local" && result.error? `${selectedmaterialType}draftalready usinglearningRulesgenerate, already sent toApproval; real AI learningusable.`: `${selectedmaterialType}draftalready generated, already sent toApproval.`;
 setChannel("creation");}).catch((error) => {materialGenerationstatus = materialErrormessage(error);
 if (button) {button.disabled = false;
 button.textContent = originalText || "generate material draft";}
 setChannel("creation");});}

function savematerialdraftEdits(form) {const button = form.querySelector("[data-save-material-draft]");
 const originalText = button?.textContent || "";
 const payload = Object.fromEntries(new FormData(form).entries());
 payload.outline = materialLinesFromText(payload.outline);
 payload.reviewChecklist = materialLinesFromText(payload.reviewChecklist);

 if (button) {button.disabled = true;
 button.textContent = "Saving…";}
 materialGenerationstatus = "Saving draft changes…";

 postmaterialdraftupdate(payload).then((result) => {latestgeneratedmaterial = result.saveddraft || latestgeneratedmaterial;
 if (result.state) window.TeachFlowWorkspaceState.setState(result.state);
 teacherAgentBriefing = null;
 materialGenerationstatus = "Changes saved. Continue editing or open Approval.";
 setChannel("creation");}).catch((error) => {materialGenerationstatus = materialErrormessage(error);
 if (button) {button.disabled = false;
 button.textContent = originalText || "Save changes";}
 setChannel("creation");});}

async function postmaterialdraft(payload) {if (!canUseteacherAgentApi()) {const state = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(state, TEACHER_CONTEXT);
 const draft = {id: `material-${Date.now()}`,
 title: `${payload.topic || scoped.topic || "current topic"} ${selectedmaterialType}draft`,
 type: selectedmaterialType,
 topic: payload.topic || scoped.topic || "",
 targetLevel: payload.targetLevel || "Level 1-2",
 goal: payload.prompt || "Help pupils complete one understandable small step.",
 outline: ["Core concept", "Low-threshold example", "pupilpractice", "teacher review points"],
 teachernotes: "learningRulesgenerateofdraft, Before publishingneeds teacher approval.",
 studentTask: "Write the one sentence you are least sure about.",
 reviewChecklist: ["is learningthis class progress", "Avoids privacy leaks", "needs simpler language"],
 status: "draft",
 classId: scoped.activeclassId || TEACHER_CONTEXT.classId,
 source: "browser_local_fallback",
 createdAt: new Date().toISOString()};
 state.draftmaterials = [draft,...(state.draftmaterials || [])].slice(0, 50);
 window.TeachFlowWorkspaceState.setState(state);
 return {agent: "material-generator", mode: "local", draft, saveddraft: draft, state};}

 const response = await fetch("/api/ai/material-generator", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 if (!response.ok) {const error = await response.json().catch(() => ({}));
 throw new Error(error.error || `material generator API ${response.status}`);}
 return response.json();}

async function postmaterialdraftupdate(payload) {if (!canUseteacherAgentApi()) {const state = window.TeachFlowWorkspaceState.getState();
 const current = (state.draftmaterials || []).find((item) => item.id === payload.id);
 if (!current) throw new Error("draft not found — generate again first.");
 const saveddraft = {...current,
 title: payload.title || current.title,
 type: payload.type || current.type,
 topic: payload.topic || current.topic,
 targetLevel: payload.targetLevel || current.targetLevel,
 goal: payload.goal || current.goal,
 outline: materialLinesFromText(payload.outline),
 teachernotes: payload.teachernotes || "",
 studentTask: payload.studentTask || "",
 reviewChecklist: materialLinesFromText(payload.reviewChecklist),
 updatedAt: new Date().toISOString(),
 version: Number(current.version || 1) + 1};
 state.draftmaterials = state.draftmaterials.map((item) => item.id === saveddraft.id? saveddraft: item);
 window.TeachFlowWorkspaceState.setState(state);
 return {saveddraft, state};}

 const response = await fetch("/api/workspace/material-drafts", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 if (!response.ok) {const error = await response.json().catch(() => ({}));
 throw new Error(error.error || `material draft API ${response.status}`);}
 return response.json();}

function materialLinesFromText(value) {if (Array.isArray(value)) return value;
 return String(value || "").split(/\n+|; |;/).map((item) => item.replace(/^\s*[-*\d.,]+\s*/, "").trim()).filter(Boolean);}

function materialErrormessage(error) {const message = String(error?.message || "");
 if (/401|Authentication required/i.test(message)) return "generatelearning: teacher learningalready, teacherAccount.";
 if (/403|cannot|outside class/i.test(message)) return "generatelearning: currentAccountclassofmaterialPermissions, teacherAccount.";
 if (/not found|learning/.test(message)) return "Save failed: learningdraft, learninggeneratelearning.";
 return "learning: learningconfirmlearningalreadyStarting, or learningthen learning.";}

function askteacherAgent() {const input = document.getElementById("teacher-agent-input");
 const question = input?.value.trim();
 if (!question) return;

 teacherAgentquestion = question;
 teacherAgentAnswer = "In progresslearningreal AI Agent, learning...";
 setChannel("analysis");
 answerteacherquestion(question, currentteacherAgentState()).then((answer) => {teacherAgentAnswer = answer;
 if (activeteacherChannelId === "analysis") setChannel("analysis");});}

async function answerteacherquestion(question, agentState) {const localAnswer = () => {if (window.TeachFlowteacherAgentOrchestrator?.answerteacherAgentquestion) {return window.TeachFlowteacherAgentOrchestrator.answerteacherAgentquestion(question, agentState);}
 return window.TeachFlowDualAgentEngine.answerteacherquestion(question, agentState);};

 if (!canUseteacherAgentApi()) return localAnswer();

 try {const response = await fetch("/api/ai/teacher-agent", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify({question})});
 if (!response.ok) throw new Error(`teacher AI API ${response.status}`);
 const result = await response.json();
 return result.answer || localAnswer();} catch (error) {return localAnswer();}}

function applyteacherAgentAction(actionType, button) {const payload = teacherAgentActionPayload(actionType, button?.dataset || {});
 if (!payload) return;
 const originalText = button?.textContent || "";
 if (button) {button.disabled = true;
 button.textContent = "learning in...";}

 postteacherAgentAction(payload).then(() => {teacherAgentBriefing = null;
 teacherAgentAnswer = teacherAgentActionResultText(payload);
 if (payload.studentAlias) selectedmessageAlias = payload.studentAlias;
 setChannel("analysis");}).catch(() => {if (button) {button.disabled = false;
 button.textContent = originalText;}});}

function teacherAgentActionPayload(actionType, dataset) {const agentState = currentteacherAgentState();
 const alias = dataset.agentAlias || agentState.studentFocus?.[0]?.studentAlias || selectedmessageAlias;
 const messagedraft = (agentState.messagedrafts || []).find((item) => item.id === dataset.agentSourceId) || agentState.messagedrafts?.[0];
 const materialdraft = (agentState.materialdrafts || []).find((item) => item.id === dataset.agentSourceId) || agentState.materialdrafts?.[0];
 const focus = (agentState.studentFocus || []).find((item) => item.studentAlias === alias) || agentState.studentFocus?.[0];

 if (actionType!== "dismiss" &&!alias) return null;

 if (actionType === "send_message") {if (!messagedraft) return null;
 return {type: "send_message",
 studentAlias: messagedraft.studentAlias || alias,
 title: `Support message for ${messagedraft.studentAlias || alias}`,
 text: messagedraft.text,
 detail: messagedraft.text,
 sourceId: messagedraft.id,
 sourceType: "message_draft"};}

 if (actionType === "assign_material") {if (!materialdraft ||!alias) return null;
 return {type: "assign_material",
 studentAlias: alias,
 title: `Assigned material: ${materialdraft.title}`,
 detail: materialdraft.goal || materialdraft.title,
 sourceId: materialdraft.id,
 sourceType: "material_draft",
 material: {id: materialdraft.id,
 title: materialdraft.title,
 type: materialdraft.type,
 topic: materialdraft.topic,
 targetLevel: materialdraft.targetLevel,
 goal: materialdraft.goal}};}

 if (actionType === "schedule_followup") {if (!alias) return null;
 return {type: "schedule_followup",
 studentAlias: alias,
 title: `Learning follow-up: ${alias}`,
 detail: focus?.recommendedAction || "Ask one low-stress question before the next lesson to confirm the pupil can continue.",
 dueLabel: "Before next lesson",
 sourceId: focus?.studentAlias || alias,
 sourceType: "student_focus"};}

 return {type: "dismiss",
 studentAlias: alias || null,
 title: alias? `Handled suggestion for ${alias}`: "Handled suggestion",
 detail: "Teacher reviewed the suggestion; it will no longer appear as a priority.",
 sourceId: dataset.agentSourceId || alias || "teacher-agent",
 sourceType: "teacher_agent_recommendation",
 studentVisible: false};}

async function postteacherAgentAction(payload) {if (!canUseteacherAgentApi()) {return window.TeachFlowWorkspaceState.recordteacherAgentAction({...payload,
 context: TEACHER_CONTEXT});}

 try {const response = await fetch("/api/teacher-agent/actions", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 if (!response.ok) throw new Error(`teacher Agent API ${response.status}`);
 const state = await response.json();
 return window.TeachFlowWorkspaceState.setState(state);} catch (error) {return window.TeachFlowWorkspaceState.recordteacherAgentAction({...payload,
 context: TEACHER_CONTEXT});}}

function teacherAgentActionResultText(payload) {if (payload.type === "send_message") return `Teacher-approved support message sent to ${payload.studentAlias}. It will appear in the pupil message view.`;
 if (payload.type === "assign_material") return `${payload.material?.title || payload.title} was assigned to ${payload.studentAlias}. It will appear in pupil materials.`;
 if (payload.type === "schedule_followup") return `A learning follow-up was scheduled for ${payload.studentAlias}. It is now part of the teacher and pupil progress log.`;
 return payload.studentAlias? `Suggestion for ${payload.studentAlias} was marked handled.`: "Suggestion was marked handled.";}

function ensureteacherDetailModal() {if (document.getElementById("teacher-detail-modal")) return;

 const modal = document.createElement("section");
 modal.id = "teacher-detail-modal";
 modal.className = "teacher-detail-modal";
 modal.setAttribute("aria-hidden", "true");
 modal.innerHTML = `
 <div class="teacher-detail-backdrop" data-close-modal></div>
 <article class="teacher-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="teacher-detail-title">
 <button class="modal-close-button" type="button" data-close-modal aria-label="CloseDetails">×</button>
 <div id="teacher-detail-content"></div>
 </article>
 `;
 document.body.appendChild(modal);

 modal.addEventListener("click", (event) => {if (event.target.closest("[data-close-modal]")) closeteacherDetailModal();});

 document.addEventListener("keydown", (event) => {if (event.key === "Escape") closeteacherDetailModal();});}

function openteacherDetailModal(type, detailId) {const modal = document.getElementById("teacher-detail-modal") || null;
 if (!modal) return;

 const content = modal.querySelector("#teacher-detail-content");
 content.innerHTML = teacherDetailContent(type, detailId);
 modal.classList.add("open");
 modal.setAttribute("aria-hidden", "false");
 document.body.classList.add("has-open-teacher-modal");

 modal.querySelectorAll("[data-jump-channel]").forEach((button) => {button.addEventListener("click", () => {closeteacherDetailModal();
 setChannel(button.dataset.jumpChannel);});});}

function closeteacherDetailModal() {const modal = document.getElementById("teacher-detail-modal");
 if (!modal) return;
 modal.classList.remove("open");
 modal.setAttribute("aria-hidden", "true");
 document.body.classList.remove("has-open-teacher-modal");}

function metric(label, value, note) {return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(metricValue(value))}</strong><small>${escapeHtml(truncateMetricText(note, ""))}</small></article>`;}

function metricValue(value) {const text = String(value?? "").trim();
 if (!text) return "—";
 return text.length > 6? `${text.slice(0, 5)}…`: text;}

function misconceptionCount(agentState) {const clusters = agentState?.misconceptions || [];
 if (clusters.length) return clusters.length;
 const need = agentState?.insight?.mainNeed;
 return need && need!== "none yetinStuck signal"? 1: 0;}

function analysisBriefCard(type, title, value, action, tone) {const toneclass = tone? ` ${tone}`: "";
 return `
 <button class="analysis-brief-card${toneclass}" type="button" data-detail-type="${escapeAttr(type)}">
 <span class="status-pill${tone === "hot"? " hot": tone === "warn"? " warn": ""}">${escapeHtml(metricValue(value))}</span>
 <strong>${escapeHtml(title)}</strong>
 <em>${escapeHtml(action)}</em>
 </button>
 `;}

function timeline(time, title, detail) {return `<li><strong>${time} · ${title}</strong><span>${detail}</span></li>`;}

function task(title, detail) {return `<li><strong>${title}</strong><span>${detail}</span></li>`;}

function evidence(alias, quote) {return `<li><strong>${alias}</strong><span>${quote}</span></li>`;}

function teacherCreationChannel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 const draft = latestgeneratedmaterial || latestmaterialdraft(scoped);
 const defaultTopic = materialDefaultTopic(scoped);
 const status = materialGenerationstatus || (draft? "alreadydraft, learningContinuegeneratelearningversion.": "learningselectmaterial typeslearninggenerate draft.");

 return `
 <section class="creation-layout">
 <div class="panel material-maker">
 <div class="panel-header">
 <div><p class="mini-label">material studio</p><h3>selectmaterial typeslearning, thengenerateteachers canapprovalofdraft</h3></div>
 <span class="status-pill warn">draft stage</span>
 </div>
 <div class="material-type-grid">
 ${MATERIAL_TYPE_OPTIONS.map((item) => materialType(item.icon,
 item.title,
 item.detail,
 item.title === selectedmaterialType? "selected": "Tap to select",
 item.title === selectedmaterialType)).join("")}
 </div>

 <form class="maker-form" id="material-generator-form">
 <div class="maker-selected-row">
 <span>currentgenerate typeslearning</span>
 <strong data-selected-material-label>${escapeHtml(selectedmaterialType)}</strong>
 </div>
 <label>
 <span>material topic</span>
 <input name="topic" value="${escapeAttr(defaultTopic)}" placeholder="e.g. Introduction to waves">
 </label>
 <label>
 <span>Creation goal</span>
 <textarea name="prompt" placeholder="learning AI learning materialquestion">learningThis lessonTopic, first learningaccessiblelearningCore concept, thentopupil learningcan learncompletedof task.</textarea>
 </label>
 <div class="maker-field-grid">
 <label>
 <span>Target level</span>
 <select name="targetLevel">
 <option>Level 1 confused pupils</option>
 <option>Level 2 Developing</option>
 <option>Level 3 Ready to apply</option>
 </select>
 </label>
 <label>
 <span>outputlearninggood</span>
 <select name="formatHint">
 <option>teacher notesandpupil tasks</option>
 <option>learningsuitableclass learning</option>
 <option>learningsuitablepost-lesson review</option>
 </select>
 </label>
 </div>
 <p class="generation-status">${escapeHtml(status)}</p>
 <div class="action-row">
 <button class="primary-button" type="submit" data-generate-material>generate material draft</button>
 <button class="secondary-button" type="button" data-jump-channel="approval">send to Approval</button>
 </div>
 </form>
 </div>

 <aside class="panel creation-preview">
 <div class="panel-header">
 <div><p class="mini-label">Preview</p><h3>Editable before teacher approval</h3></div>
 <span class="status-pill">${draft? "latestdraft": "waitinggenerate"}</span>
 </div>
 ${rendermaterialPreview(draft)}
 </aside>
 </section>
 `;}

function teacherApprovalChannel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 const drafts = teacherdraftmaterials(scoped);
 const approvedCount = (scoped.approvedmaterials || []).filter((item) =>!item.classId || item.classId === scoped.activeclassId).length;
 return `
 <section class="layout-grid">
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">Approval flow</p><h3>drafts are not auto-published</h3></div>
 <span class="status-pill warn">${drafts.length? "Awaiting review": "none yetdraft"}</span>
 </div>
 <ul class="timeline-list">
 ${timeline("1", "AI generate draft", "CreatelearninggenerateofHandout, visualorpracticewillfirst learning in.")}
 ${timeline("2", "teacherreviewEdit", "confirmlearning, hardlearning, learning, privacylearning andclass learning.")}
 ${timeline("3", "Approvelearningthenpublish", "only teacher confirmationlearning, materialpupil vieworexport.")}
 </ul>
 </div>
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">materials sent from Content hub</p><h3>Reusable teacher materials</h3></div>
 <span class="status-pill">${approvedCount} draftsalreadyApprove</span>
 </div>
 <ul class="material-review-list approval-materials">
 ${drafts.length? drafts.map(materialApprovalItem).join(""): emptymaterialdraftState()}
 </ul>
 <div class="action-row">
 <button class="primary-button" type="button" disabled>Approve (Next step) </button>
 <button class="secondary-button" type="button" disabled>export Markdown (Next step) </button>
 <button class="secondary-button" type="button" disabled>export materials (Next step) </button>
 <button class="plain-button" type="button" data-jump-channel="creation">BackCreate</button>
 </div>
 </div>
 </section>
 `;}

function materialDefaultTopic(scoped) {if (scoped?.topic && scoped.topic!== "Topic not set") return scoped.topic;
 return "learningTopic";}

function teacherdraftmaterials(scoped) {const activeclassId = scoped?.activeclassId || TEACHER_CONTEXT.classId;
 return (scoped?.draftmaterials || []).filter((item) =>!item.classId || item.classId === activeclassId).slice().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));}

function latestmaterialdraft(scoped) {return teacherdraftmaterials(scoped)[0] || null;}

function rendermaterialPreview(material) {if (!material) {return `
 <img src="assets/fourier-prism.svg" alt="material preview">
 <div class="material-preview-empty">
 <strong>learninggenerate draft</strong>
 <span>firstinleftlearningselect“Handout / visual / practice”, thenclickgenerate.generatelearningwilldisplayin learning in, learningSynclearningApproval.</span>
 </div>
 `;}

 const draft = materialDisplay(material);
 return `
 <form class="generated-material-card material-editor-form" id="material-editor-form">
 <input type="hidden" name="id" value="${escapeAttr(material.id || "")}">
 <input type="hidden" name="type" value="${escapeAttr(draft.type)}">
 <input type="hidden" name="topic" value="${escapeAttr(material.topic || "")}">
 <div class="generated-material-top">
 <span class="status-pill">${escapeHtml(draft.type)}</span>
 <small>${escapeHtml(draft.targetLevel || "PendinglearningLevel")}</small>
 </div>
 ${materialEditorField("title", "draftlearning", draft.title, "input")}
 ${materialEditorField("targetLevel", "Target level", draft.targetLevel || "Level 1-2", "input")}
 ${materialEditorField("goal", "Learning objective", draft.goal || draft.content || "Help pupils complete one understandable small step.", "textarea")}
 ${materialEditorField("outline", "learning", draft.outline.join("\n"), "textarea")}
 ${materialEditorField("teachernotes", "teacher notes", draft.teachernotes, "textarea")}
 ${materialEditorField("studentTask", "pupil tasks", draft.studentTask, "textarea")}
 ${materialEditorField("reviewChecklist", "approvallearning", draft.reviewChecklist.join("\n"), "textarea")}
 <div class="action-row">
 <button class="primary-button" type="submit" data-save-material-draft>Save changes</button>
 <button class="secondary-button" type="button" data-jump-channel="approval">viewapprovaldraft</button>
 </div>
 </form>
 `;}

function materialEditorField(name, label, value, kind) {if (kind === "input") {return `
 <label class="material-editor-field">
 <span>${escapeHtml(label)}</span>
 <input name="${escapeAttr(name)}" value="${escapeAttr(value || "")}">
 </label>
 `;}
 return `
 <label class="material-editor-field">
 <span>${escapeHtml(label)}</span>
 <textarea name="${escapeAttr(name)}">${escapeHtml(value || "")}</textarea>
 </label>
 `;}

function materialApprovalItem(material) {const draft = materialDisplay(material);
 const status = draft.status === "approved"? "alreadyApprove": "Pendingteacher approval";
 return `
 <li>
 <strong>${escapeHtml(draft.type)} · ${escapeHtml(draft.title)}</strong>
 <span>${escapeHtml(status)} · ${escapeHtml(draft.targetLevel || "learningsettingsLevel")} · ${escapeHtml(draft.goal || draft.teachernotes || "waitingnotes")}</span>
 </li>
 `;}

function emptymaterialdraftState() {return `
 <li>
 <strong>none yetPendingapprovalmaterial</strong>
 <span>learning“Content hub”learning, selectHandout, visualorpracticelearninggenerate draft.</span>
 </li>
 `;}

function materialDisplay(material) {return {title: material?.title || `${material?.topic || "current topic"} ${material?.type || selectedmaterialType}draft`,
 type: material?.type || material?.materialType || selectedmaterialType,
 targetLevel: material?.targetLevel || "",
 goal: material?.goal || material?.summary || "",
 content: material?.content || "",
 outline: materialArray(material?.outline || material?.sections || material?.slides || material?.steps || material?.content),
 teachernotes: materialText(material?.teachernotes || material?.teacherNote || material?.notes),
 studentTask: materialText(material?.studentTask || material?.task),
 reviewChecklist: materialArray(material?.reviewChecklist || material?.checklist),
 status: material?.status || "draft"};}

function materialList(title, items) {const list = materialArray(items).slice(0, 8);
 if (!list.length) return "";
 return `
 <div class="material-note">
 <strong>${escapeHtml(title)}</strong>
 <ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
 </div>
 `;}

function materialArray(value) {if (Array.isArray(value)) {return value.map(materialText).filter(Boolean);}
 if (value && typeof value === "object") {return Object.values(value).map(materialText).filter(Boolean);}
 return String(value || "").split(/\n+|; |;/).map((item) => item.replace(/^\s*[-*\d.,]+\s*/, "").trim()).filter(Boolean);}

function materialText(value) {if (Array.isArray(value)) return value.map(materialText).filter(Boolean).join("; ");
 if (value && typeof value === "object") return JSON.stringify(value);
 return String(value || "").trim();}

function materialType(icon, title, detail, status, active = false) {return `
 <button class="material-type-card${active? " active": ""}" type="button" data-material-type="${escapeAttr(title)}" aria-pressed="${active? "true": "false"}">
 <span class="material-type-icon">${materialTypeIcon(icon)}</span>
 <strong>${escapeHtml(title)}</strong>
 <p>${escapeHtml(detail)}</p>
 <em class="status-pill">${escapeHtml(status)}</em>
 </button>
 `;}

function materialTypeIcon(name) {const svgOpen = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
 const icons = {lecture: `${svgOpen}<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
 image: `${svgOpen}<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
 practice: `${svgOpen}<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`};
 return icons[name] || icons.lecture;}

function materialreview(type, title, detail) {return `<li><strong>${type} · ${title}</strong><span>${detail}</span></li>`;}

function overviewFlankMetric(value, label, tone) {return `<div class="overview-flank-metric is-${tone}"><strong>${escapeHtml(metricValue(value))}</strong><span>${escapeHtml(label)}</span></div>`;}

function teacherOverviewChannel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 const activeclass = activeteacherclass(workspace);
 const invite = activeclassInvite(workspace, activeclass);
 const inviteLink = invite? classroomJoinUrl(invite.token): "";
 const questionCount = scoped.questions?.length || 0;
 const stuckCount = scoped.stuckSignals?.length || 0;
 const actionCount = scoped.teacherAgentActions?.length || 0;
 const className = scoped.className || "Unnamed class";
 const topicName = scoped.topic || "Topic not set";
 return `
 <section class="overview-hero">
 <div class="overview-hero-copy">
 <h1 class="overview-greeting">Today's teaching overview</h1>
 <p class="overview-meta">${escapeHtml(className)} · ${escapeHtml(topicName)}</p>
 </div>
 <div class="overview-orb-row">
 <div class="overview-flank-metrics overview-flank-metrics--left">
 ${overviewFlankMetric(`${stuckCount}`, "Stuck signals", "hot")}
 ${overviewFlankMetric(`${questionCount}`, "pupil questions", "warn")}
 </div>
 <div class="overview-orb-connector" aria-hidden="true"></div>
 <div class="ai-orb ai-orb-lg" aria-hidden="true"><span class="ai-orb-highlight"></span></div>
 <div class="overview-orb-connector overview-orb-connector--reverse" aria-hidden="true"></div>
 <div class="overview-flank-metrics overview-flank-metrics--right">
 ${overviewFlankMetric(`${studentRoster.length}`, "pupils in class", "ok")}
 ${overviewFlankMetric(`${actionCount}`, "teacher actions", "info")}
 </div>
 </div>
 </section>
 <section class="layout-grid">
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">class setup</p><h3>${escapeHtml(scoped.className || "Unnamed class")}</h3></div>
 <span class="status-pill">${studentRoster.length? "In progress": "Awaiting pupils"}</span>
 </div>
 <ul class="timeline-list">
 ${timeline("1", "Create class", `${escapeHtml(scoped.topic || "Topic not set")} linked to your teacherAccount`)}
 ${timeline("2", "send class invite link", inviteLink? "copy the link from classes and share with pupils": "This class does not have an invite link yet")}
 ${timeline("3", "Awaiting pupil signals", "class insights updates when pupils submit assignments, questions or stuck signals")}
 </ul>
 </div>
 <div class="panel material-preview">
 <div class="material-caption">
 <p class="mini-label">Live pilot</p>
 <h3>Start from an empty class</h3>
 <p>This version does not preload demo pupils. Invite pupils first, then generate analysis, materials and reply drafts from real learning signals.</p>
 ${inviteLink? `
 <div class="invite-link-box compact-invite">
 <input type="text" value="${escapeAttr(inviteLink)}" readonly data-class-invite-link aria-label="class invite link">
 <button class="secondary-button" type="button" data-copy-invite-link>copy link</button>
 </div>
 `: ""}
 <div class="action-row">
 <button class="primary-button" type="button" data-jump-channel="courses">${inviteLink? "Manage class": "Set class invite link"}</button>
 <button class="secondary-button" type="button" data-jump-channel="analysis">Open class insights</button>
 </div>
 </div>
 </div>
 </section>
 `;}

function teacherCoursesChannel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 const activeclass = activeteacherclass(workspace);
 const invite = activeclassInvite(workspace, activeclass);
 const inviteLink = invite? classroomJoinUrl(invite.token): "";
 const roster = studentRoster;
 return `
 <section class="layout-grid">
 <div class="panel table-card">
 <div class="panel-header">
 <div><p class="mini-label">class space</p><h3>${escapeHtml(scoped.className || "Unnamed class")}</h3></div>
 <span class="status-pill">${escapeHtml(activeclass?.status || "active")}</span>
 </div>
 <table>
 <thead><tr><th>class</th><th>Course</th><th>current topic</th><th>pupil</th></tr></thead>
 <tbody>
 ${row([scoped.className || "Unnamed class",
 activeclass?.course || "Course not set",
 scoped.topic || "Topic not set",
 `${roster.length} learning`])}
 </tbody>
 </table>
 </div>
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">class learninglink</p><h3>learning topupiljoin class</h3></div>
 <span class="status-pill">pupil learningAnonymisedlearning</span>
 </div>
 <form class="class-settings-form" data-class-settings-form>
 <label>
 <span>className</span>
 <input name="className" type="text" value="${escapeAttr(scoped.className || "")}" placeholder="learning: learningPhysicslearning">
 </label>
 <label>
 <span>Course</span>
 <input name="course" type="text" value="${escapeAttr(activeclass?.course || "")}" placeholder="e.g. Physics">
 </label>
 <label>
 <span>current topic</span>
 <input name="topic" type="text" value="${escapeAttr(scoped.topic || "")}" placeholder="e.g. Introduction to waves">
 </label>
 <button class="primary-button" type="submit">SavedTopic</button>
 </form>
 <div class="invite-link-box">
 <input type="text" value="${escapeAttr(inviteLink || "current class learninglink")}" readonly data-class-invite-link>
 <button class="secondary-button" type="button" data-copy-invite-link ${inviteLink? "": "disabled"}>copy link</button>
 </div>
 <ul class="task-list">
 ${task("pupiljoin learning", "pupilOpenlinkclassDisplay name, Systemlearning S001, S002 learningAnonymisedAlias.")}
 ${task("teachers can learn", "teacher viewonlyviewlearningAlias, assignment, question, Stuck signaland learningsupportsignal.")}
 ${task("Next step", roster.length? "Pupils have joined. You can assign materials and review learning signals.": "Share the join link so pupil accounts can enter the class.")}
 </ul>
 </div>
 </section>
 <section class="class-student-section">
 <div class="panel roster-panel">
 <div class="panel-header">
 <div><p class="mini-label">pupil avatars</p><h3>select an avatar for pupil detail</h3></div>
 <span class="status-pill">${roster.length? `${roster.length} pupils`: "waitingjoin"}</span>
 </div>
 <div class="student-avatar-grid">
 ${roster.length? roster.map(studentAvatar).join(""): emptyStudentRoster()}
 </div>
 </div>
 </section>
 `;}

function activeteacherclass(workspace) {return (workspace.classes || []).find((item) => item.id === TEACHER_CONTEXT.classId)
 || (workspace.classes || []).find((item) => item.id === workspace.activeclassId)
 || (workspace.classes || [])[0]
 || null;}

function activeclassInvite(workspace, activeclass) {if (!activeclass) return null;
 return (workspace.inviteLinks || []).find((item) => item.classId === activeclass.id && item.active!== false)
 || (activeclass.inviteToken? {token: activeclass.inviteToken, classId: activeclass.id, active: true}: null);}

function classroomJoinUrl(token) {const basePath = `${window.location.origin}${window.location.pathname.replace(/teacher-prototype\.html$/, "login.html")}`;
 return `${basePath}?join=${encodeURIComponent(token)}`;}

function emptyStudentRoster() {return `
 <article class="empty-roster-card">
 <strong>pupiljoin</strong>
 <span>copyclass invite linktopupil.pupiljoin learning, learning inwill learnAnonymisedlearning.</span>
 </article>
 `;}

function currentteacherAgentState() {if (teacherAgentBriefing) return teacherAgentBriefing;
 const workspace = window.TeachFlowWorkspaceState.getState();
 const scopedWorkspace = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 if (window.TeachFlowteacherAgentOrchestrator?.buildteacherBriefing) {return window.TeachFlowteacherAgentOrchestrator.buildteacherBriefing(scopedWorkspace, {context: TEACHER_CONTEXT});}
 return window.TeachFlowDualAgentEngine.buildteacherAgentState({className: scopedWorkspace.className,
 topic: scopedWorkspace.topic,
 students: studentRoster,
 approvedmaterials: scopedWorkspace.approvedmaterials,
 draftmaterials: scopedWorkspace.draftmaterials});}

function analysisMetricCards() {const workspace = window.TeachFlowWorkspaceState.getState();
 const agentState = currentteacherAgentState();
 const needsSupport = studentRoster.filter((student) => student.status === "needs support").length;
 const questionCount = workspace.questions.length;
 const misconceptionCount = (agentState.misconceptions || []).length;
 return [metric("Misconceptions", `${misconceptionCount} types`, truncateMetricText(agentState.insight?.mainNeed, "pupilevidence")),
 metric("learningInterventionpupil", `${needsSupport} pupils`, "Live syncpupilstatus"),
 metric("pupilStuck signals", `${workspace.stuckSignals.length} items`, truncateMetricText(latestSignalNote(workspace), "waitingpupilsignal")),
 metric("pupilquestionLog", `${questionCount} items`, "pupil Agent")].join("");}

function truncateMetricText(text, fallback) {const value = String(text || "").trim();
 if (!value) return fallback || "";
 return value.length > 14? `${value.slice(0, 13)}…`: value;}

function teacherAnalysisChannel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 const agentState = currentteacherAgentState();
 const draftCount = teacherdraftmaterials(scoped).length;
 const checkInCount = sharedCheckIns().length;
 const firstPriority = agentState.priorities?.[0];
 const firstStudent = agentState.studentFocus?.[0]?.studentAlias || selectedStudentId;

 return `
 <section class="analysis-dashboard-grid">
 <div class="analysis-dashboard-main">
 ${analysisOutcomesummaryPanel()}

 <section class="metric-grid analysis-metrics">
 ${analysisMetricCards()}
 </section>

 <section class="panel analysis-workbench-panel">
 <div class="panel-header">
 <div><p class="mini-label">class insights</p><h3>only learningsummary, learningLoglearningview</h3></div>
 <span class="status-pill">summary first</span>
 </div>
 <div class="analysis-brief-grid">
 ${analysisBriefCard("diagnosis", "Diagnosis", `${misconceptionCount(agentState)} types`, "view evidence", "hot")}
 ${analysisBriefCard("intervention", "Intervention", `${draftCount} drafts`, "view plan", "warn")}
 ${analysisBriefCard("student", "pupil support", `${checkInCount} items`, "view pupils", "")}
 </div>
 </section>
 </div>

 <aside class="analysis-command-rail">
 <section class="panel analysis-action-panel">
 <div class="panel-header">
 <div><p class="mini-label">Next step</p><h3>teacherTodayfirst learning</h3></div>
 <span class="status-pill warn">Pendingteacher confirmation</span>
 </div>
 <div class="analysis-action-stack">
 ${analysisAction(firstPriority?.title || "firstviewhighest prioritypupil",
 firstPriority?.detail || "OpenpupilDetails, confirmis learningneeds learningHandout, visualorpractice.",
 "view pupils",
 "student")}
 ${analysisAction("Createlearning material", "to pupilorwhole classgenerateHandout, visualorpractice, Before publishinglearningapproval.", "Content hub", "creation")}
 ${analysisAction("viewSyncLog", "pupilquestion, Stuck signaland Check-in will learndatalearning.", "viewdata", "sync")}
 </div>
 </section>

 <section class="panel analysis-loop-card">
 <div class="panel-header">
 <div><p class="mini-label">Loop</p><h3>learningevidencelearning</h3></div>
 <span class="status-pill">4 learning</span>
 </div>
 <details class="compact-disclosure" open>
 <summary>
 <span>viewworkflowsummary</span>
 <em>learning</em>
 </summary>
 <div class="analysis-flow compact-flow">
 ${analysisStep("1", "Gather evidence", "assignments, questions, stuck signals and check-ins feed one data layer.", "Live sync")}
 ${analysisStep("2", "generate insight", "Surfaces misconceptions and evidence only — does not replace teacher judgement.", "Pending review")}
 ${analysisStep("3", "Plan intervention", "generateHandout, visualorpractice, teacher approvallearningpublish.", "draft")}
 ${analysisStep("4", "Continue follow-up", "New pupil feedback returns to the next class insights cycle.", "Ongoing log")}
 </div>
 </details>
 </section>
 </aside>
 </section>

 ${teacherAgentPanel()}

 <section class="analysis-secondary-grid">
 ${teacherSupportInbox()}
 ${workspaceSyncCompactPanel(scoped)}
 </section>
 `;}

function workspaceSyncCompactPanel(scoped) {const latestStuck = (scoped.stuckSignals || [])[0];
 const latestquestion = (scoped.questions || [])[0];
 return `
 <section class="panel workspace-sync-compact">
 <div class="panel-header">
 <div><p class="mini-label">learningdatalearning</p><h3>pupil viewsignalSyncstatus</h3></div>
 <span class="status-pill">${scoped.updatedAt? "already": "waitingpupil"}</span>
 </div>
 <div class="compact-record-list">
 <article>
 <span>latestStuck signal</span>
 <strong>${latestStuck? `${escapeHtml(latestStuck.studentAlias)} · ${escapeHtml(latestStuck.stuckType)}`: "none yet"}</strong>
 <p>${latestStuck?.note? escapeHtml(latestStuck.note): "pupilShareStuck signallearningwill learnnowlearning in."}</p>
 </article>
 <article>
 <span>latestquestion</span>
 <strong>${latestquestion? escapeHtml(latestquestion.studentAlias || "pupil"): "none yet"}</strong>
 <p>${latestquestion?.text? escapeHtml(latestquestion.text): "pupilquestionwill learnteacherclass insights."}</p>
 </article>
 </div>
 <button class="secondary-button" type="button" data-detail-type="sync">viewSyncDetails</button>
 </section>
 `;}

function workspaceSyncPanel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const signals = workspace.stuckSignals.slice(0, 3);
 return `
 <section class="panel workspace-sync-panel">
 <div class="panel-header">
 <div><p class="mini-label">learningdatalearning</p><h3>pupil viewSyncteacher class insights</h3></div>
 <span class="status-pill">${workspace.updatedAt? "already": "waitingpupilsignal"}</span>
 </div>
 <div class="workspace-sync-grid">
 <article>
 <span>status</span>
 <strong>${escapeHtml(workspace.className)} · ${escapeHtml(workspace.topic)}</strong>
 <p>pupil viewassignment, question, Stuck signalwill learnAnonymised workspace.</p>
 </article>
 <article>
 <span>latestpupilStuck signal</span>
 <strong>${signals[0]? `${escapeHtml(signals[0].studentAlias)} · ${escapeHtml(signals[0].stuckType)}`: "none yetsignal"}</strong>
 <p>${signals[0]?.note? escapeHtml(signals[0].note): "pupilclick“sendtoteacher”learning, learning inwill learn."}</p>
 </article>
 </div>
 <ul class="sync-signal-list">
 ${signals.length? signals.map((signal) => `
 <li><strong>${escapeHtml(signal.studentAlias)} · ${escapeHtml(signal.stuckType)}</strong><span>${signal.note? escapeHtml(signal.note): "notes"} · alreadyteacher Agent</span></li>
 `).join(""): "<li><strong>waitingSync</strong><span>pupil viewlearningsendlearning ofStuck signals.</span></li>"}
 </ul>
 </section>
 `;}

function teachermessagesChannel() {const helpRequests = teacherHelpRequests();
 const activeStudent = studentRoster.find((student) => student.id === selectedmessageAlias) || studentRoster[0];
 selectedmessageAlias = activeStudent?.id || selectedmessageAlias;
 return `
 <section class="teams-layout">
 <aside class="panel teams-thread-list-panel">
 <div class="panel-header">
 <div><p class="mini-label">Activity</p><h3>needssupport</h3></div>
 <span class="status-pill warn">${helpRequests.length} items</span>
 </div>
 <div class="teams-help-stack">
 ${helpRequests.length? helpRequests.slice(0, 4).map(teacherHelpRequestCard).join(""): `
 <article class="teams-empty-card"><strong>none yetHelp request</strong><span>pupilsendStuck signalor learningsummarylearning, will learnnowlearning in.</span></article>
 `}
 </div>

 <div class="teams-thread-heading">
 <p class="mini-label">Chat</p>
 <strong>pupil learning</strong>
 </div>
 <div class="teams-thread-list">
 ${studentRoster.map(teacherThreadButton).join("")}
 </div>
 </aside>

 <div class="panel teams-chat-panel">
 ${teacherConversationPanel(selectedmessageAlias)}
 </div>
 </section>
 `;}

function teacherConversationPanel(alias) {const student = studentRoster.find((item) => item.id === alias) || studentRoster[0];
 const messages = messagesForAlias(student.id);
 return `
 <div class="teams-chat-header">
 <div class="student-avatar-circle">${escapeHtml(student.short || student.id.slice(-2))}</div>
 <div>
 <p class="mini-label">teacher–pupil chatLog</p>
 <h3>${escapeHtml(student.id)} · ${escapeHtml(student.status)}</h3>
 <span>${escapeHtml(student.stuck)} · ${escapeHtml(student.next)}</span>
 </div>
 <button class="secondary-button" type="button" data-detail-type="student" data-student-id="${escapeAttr(student.id)}">viewlearning</button>
 </div>

 <div class="teams-message-thread" aria-live="polite">
 ${messages.length? messages.map(teachermessageBubble).join(""): `
 <article class="teams-empty-card"><strong>learningConversation</strong><span>teachers can learnfirstsendlearningStresssupporttask, pupil viewwillreceivedmessagelearning.</span></article>
 `}
 </div>

 <form id="teacher-message-form" class="teams-message-form">
 <textarea id="teacher-message-input" placeholder="to ${escapeAttr(student.id)} sendmessage, learning: firstview Level 1 diagram, thenonlyresponselearning 1 learning."></textarea>
 <button class="primary-button" type="submit">sendtopupil</button>
 </form>
 `;}

function teacherThreadButton(student) {const messages = messagesForAlias(student.id);
 const latest = messages[messages.length - 1];
 const helpCount = teacherHelpRequests().filter((item) => item.studentAlias === student.id).length;
 const isActive = student.id === selectedmessageAlias? " active": "";
 return `
 <button class="teams-thread-button${isActive}" type="button" data-message-alias="${escapeAttr(student.id)}">
 <span class="student-avatar-circle">${escapeHtml(student.short || student.id.slice(-2))}</span>
 <span>
 <strong>${escapeHtml(student.id)}</strong>
 <small>${latest? escapeHtml(latest.text): escapeHtml(student.next)}</small>
 </span>
 ${helpCount? `<em>${helpCount}</em>`: ""}
 </button>
 `;}

function teacherHelpRequestCard(item) {return `
 <button class="teams-help-card" type="button" data-open-message="${escapeAttr(item.studentAlias)}">
 <span class="student-avatar-circle">${escapeHtml(item.studentAlias.slice(-2))}</span>
 <div>
 <strong>${escapeHtml(item.studentAlias)} · ${escapeHtml(item.title)}</strong>
 <p>${escapeHtml(item.detail)}</p>
 <small>${formatmessagetime(item.createdAt)}</small>
 </div>
 </button>
 `;}

function teachermessageBubble(message) {const roleclass = message.senderRole === "teacher"? "from-teacher": message.senderRole === "system"? "from-system": "from-student";
 return `
 <article class="teams-message ${roleclass}">
 <span>${escapeHtml(message.senderLabel || roleLabel(message.senderRole))} · ${formatmessagetime(message.createdAt)}</span>
 <p>${escapeHtml(message.text)}</p>
 </article>
 `;}

function messagesForAlias(alias) {const workspace = window.TeachFlowWorkspaceState.getState();
 return (workspace.messages || []).filter((message) => message.studentAlias === alias).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));}

function teacherHelpRequests() {const workspace = window.TeachFlowWorkspaceState.getState();
 const signals = (workspace.stuckSignals || []).map((signal) => ({id: signal.id,
 studentAlias: signal.studentAlias,
 title: signal.stuckType || "learningStuck signal",
 detail: signal.note || "pupil teacher learningNext stepsupport.",
 createdAt: signal.createdAt,
 source: "stuck"}));
 const checkIns = (workspace.checkIns || []).filter((item) => item.teacherVisible!== false).map((item) => ({id: item.id,
 studentAlias: item.studentAlias,
 title: item.wellbeingLabel || item.stateLabel || "learningsupport",
 detail: item.teacherHelpdraft || item.summaryForteacher || "pupilSharelearningsummary.",
 createdAt: item.createdAt,
 source: "checkin"}));
 return [...signals,...checkIns].filter((item) => studentRoster.some((student) => student.id === item.studentAlias)).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));}

function latestteachermessages() {const workspace = window.TeachFlowWorkspaceState.getState();
 return (workspace.messages || []).filter((message) => studentRoster.some((student) => student.id === message.studentAlias)).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 3);}

function sendteachermessage() {const input = document.getElementById("teacher-message-input");
 const text = input?.value.trim();
 if (!text) return;
 postteachermessage(selectedmessageAlias, text).then(() => {if (input) input.value = "";
 setChannel("messages");});
 return;
 window.TeachFlowWorkspaceState.recordmessage(selectedmessageAlias, {text,
 senderRole: "teacher",
 senderId: TEACHER_CONTEXT.userId,
 senderLabel: "teacher",
 kind: "teacher_reply",
 context: TEACHER_CONTEXT});
 if (input) input.value = "";
 setChannel("messages");}

async function postteachermessage(alias, text) {const payload = {studentAlias: alias,
 text,
 kind: "teacher_reply"};

 if (!canUseWorkspaceApi()) {return window.TeachFlowWorkspaceState.recordmessage(alias, {...payload,
 senderRole: "teacher",
 senderId: TEACHER_CONTEXT.userId,
 senderLabel: "teacher",
 context: TEACHER_CONTEXT});}

 try {const response = await fetch("/api/workspace/messages", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 if (!response.ok) throw new Error(`Workspace API ${response.status}`);
 const state = await response.json();
 return window.TeachFlowWorkspaceState.setState(state);} catch (error) {return window.TeachFlowWorkspaceState.recordmessage(alias, {...payload,
 senderRole: "teacher",
 senderId: TEACHER_CONTEXT.userId,
 senderLabel: "teacher",
 context: TEACHER_CONTEXT});}}

function canUseWorkspaceApi() {return Boolean(typeof window!== "undefined" &&
 window.fetch &&
 window.location &&
 /^https?:$/.test(window.location.protocol));}

function teachermessageNoticeCount() {const helpRequests = teacherHelpRequests();
 const latestmessages = latestteachermessages();
 return helpRequests.length + latestmessages.length;}

function renderteachermessageNotice() {const count = teachermessageNoticeCount();
 const hide = activeteacherChannelId === "messages" || count === 0;
 document.querySelectorAll(".teacher-message-notice").forEach((badge) => {if (hide) {badge.hidden = true;
 badge.textContent = "";
 return;}
 badge.hidden = false;
 badge.textContent = String(count);});}

function roleBoundaryPanel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 const teacherAccount = workspace.accounts.find((account) => account.id === TEACHER_CONTEXT.userId);
 const classScope = workspace.classes.find((item) => item.id === TEACHER_CONTEXT.classId);
 return `
 <section class="panel workspace-sync-panel">
 <div class="panel-header">
 <div><p class="mini-label">Account / role / class learning</p><h3>currentteacher viewlearningasklearning</h3></div>
 <span class="status-pill">learningEnabled</span>
 </div>
 <div class="workspace-sync-grid">
 <article>
 <span>Account</span>
 <strong>${teacherAccount?.displayName || TEACHER_CONTEXT.userId}</strong>
 <p>${TEACHER_CONTEXT.userId} · ${TEACHER_CONTEXT.role}</p>
 </article>
 <article>
 <span>class</span>
 <strong>${classScope?.name || scoped.className}</strong>
 <p>only classofAnonymised pupil, Stuck signalandassignmentstatus.</p>
 </article>
 <article>
 <span>Permissions</span>
 <strong>${scoped.accessBoundary.canApprove? "Can approvepublish": "only learning"}</strong>
 <p>learningasklearning Privacy and boundaries.</p>
 </article>
 </div>
 </section>
 `;}

function auditLogPanel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 const events = (scoped.auditEvents || []).slice(0, 12);
 const summary = auditsummary(events);
 return `
 <section class="audit-dashboard">
 <div class="panel-header audit-header">
 <div><p class="mini-label">safetyAudit</p><h3>learning in learningtimelearning</h3></div>
 <span class="status-pill">class learning</span>
 </div>
 <div class="audit-metric-grid">
 ${auditMetric("pupilsubmit", summary.studentSubmissions, "assignment, question, Stuck signal")}
 ${auditMetric("learning", summary.denied, "learning or learning")}
 ${auditMetric("learningLog", summary.sessions, "learningPilot Session")}
 ${auditMetric("learning", summary.latestLabel, summary.latesttime)}
 </div>
 <div class="panel audit-table-panel">
 <div class="panel-header">
 <div><p class="mini-label">learningAuditlearning</p><h3>onlyLogAnonymisedAlias, roleandclass learning</h3></div>
 <span class="status-pill warn">learningrealpupil identity</span>
 </div>
 <div class="audit-table-wrap">
 <table class="audit-table">
 <thead>
 <tr><th>time</th><th>role</th><th>Account / Alias</th><th>action</th><th>Goal</th><th>learning</th></tr>
 </thead>
 <tbody>
 ${events.length? events.map(auditRow).join(""): auditEmptyRow()}
 </tbody>
 </table>
 </div>
 </div>
 </section>
 `;}

function auditMetric(label, value, note) {return `<article class="audit-metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;}

function auditsummary(events) {const studentSubmissions = events.filter((event) => {return ["record_question", "record_stuck_signal", "update_assignment"].includes(event.action);}).length;
 const denied = events.filter((event) => event.action === "access_denied").length;
 const sessions = events.filter((event) => /^session_/.test(event.action)).length;
 const latest = events[0];
 return {studentSubmissions,
 denied,
 sessions,
 latestLabel: latest? actionLabel(latest.action): "none yet",
 latesttime: latest? formatAudittime(latest.timestamp): "waiting"};}

function auditRow(event) {const resultclass = event.action === "access_denied"? "hot": "ok";
 const resultLabel = event.action === "access_denied"? "already": "alreadyLog";
 return `
 <tr>
 <td>${formatAudittime(event.timestamp)}</td>
 <td>${roleLabel(event.role)}</td>
 <td>${escapeHtml(event.studentAlias || event.actorId || "system")}</td>
 <td>${actionLabel(event.action)}</td>
 <td>${escapeHtml(event.targetId || event.targetType || "workspace")}</td>
 <td><span class="status-pill ${resultclass === "hot"? "hot": ""}">${resultLabel}</span></td>
 </tr>
 `;}

function auditEmptyRow() {return `<tr><td colspan="6">none yetAuditlearning.learning, submit, Stuck signaland learningwill learnnowlearning in.</td></tr>`;}

function actionLabel(action) {const labels = {session_login: "learning",
 session_logout: "learning",
 reset_workspace: "learning",
 write_workspace: "learning",
 update_assignment: "updateassignment",
 record_question: "pupilquestion",
 record_stuck_signal: "sendStuck signal",
 record_check_in: "Wellbeing Check-in",
 record_message: "learningmessage",
 access_denied: "learning"};
 return labels[action] || action;}

function roleLabel(role) {const labels = {teacher: "teacher",
 student: "pupil",
 school_admin: "school admin",
 anonymous: "learning",
 system: "System"};
 return labels[role] || role || "System";}

function formatAudittime(value) {if (!value) return "learningtime";
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return value;
 return date.toLocaleString("zh-CN", {month: "2-digit",
 day: "2-digit",
 hour: "2-digit",
 minute: "2-digit"});}

function formatmessagetime(value) {return formatAudittime(value);}

function priorityStudents() {const ordered = [...studentRoster].sort((a, b) => scoreStudent(b) - scoreStudent(a));
 return ordered.slice(0, 3);}

function scoreStudent(student) {let score = 0;
 if (student.status === "needs support") score += 4;
 if (student.level === "Level 1") score += 2;
 if (/diagram|formula|learning/.test(student.stuck)) score += 1;
 if (student.id === "S002") score += 0.5;
 return score;}

function latestSignalNote(workspace) {const latest = workspace.stuckSignals[0];
 return latest? `${latest.studentAlias}: ${latest.stuckType}`: "waitingpupil view";}

function latestSharedCheckIn(alias) {const workspace = window.TeachFlowWorkspaceState.getState();
 return (workspace.checkIns || []).filter((item) => item.studentAlias === alias && item.teacherVisible!== false).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null;}

function sharedCheckIns() {const workspace = window.TeachFlowWorkspaceState.getState();
 return (workspace.checkIns || []).filter((item) => item.teacherVisible!== false).sort((a, b) => {const levelDiff = (b.wellbeingLevel || 0) - (a.wellbeingLevel || 0);
 if (levelDiff) return levelDiff;
 return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);});}

function teacherSupportInbox() {const items = sharedCheckIns().slice(0, 4);
 return `
 <section class="panel teacher-inbox-panel">
 <div class="panel-header">
 <div><p class="mini-label">teacher Inbox</p><h3>needsteacherprioritylearning of learningsupportsignal</h3></div>
 <span class="status-pill warn">learningdisplaylearningprivateConversation</span>
 </div>
 <div class="teacher-inbox-list">
 ${items.length? items.map(teacherInboxCard).join(""): supportEmptyState()}
 </div>
 </section>
 `;}

function teacherInboxCard(item) {return `
 <button class="teacher-inbox-card" type="button" data-detail-type="student" data-student-id="${escapeAttr(item.studentAlias)}">
 <span class="student-avatar-circle">${escapeHtml(item.studentAlias.slice(-2))}</span>
 <div>
 <strong>${escapeHtml(item.studentAlias)} · ${escapeHtml(item.wellbeingLabel || "learningsupportsignal")}</strong>
 <p>${escapeHtml(item.summaryForteacher || "pupilSharelearningsupportsummary.")}</p>
 <em>${escapeHtml(item.recommendedteacherAction || "to learningStressNext step.")}</em>
 </div>
 </button>
 `;}

function supportEmptyState() {return `
 <article class="support-empty-state">
 <strong>none yetofWellbeingShare</strong>
 <span>pupilinWellbeinglearningselect“Sharelearningsummarytoteacher”learning, learning inwill learnactionofsupportsignal.</span>
 </article>
 `;}

function teacherDetailContent(type, detailId) {if (type === "outcome") return outcomeDetailContent();
 if (type === "intervention") return interventionDetailContent();
 if (type === "student") return studentDetailContent(detailId || selectedStudentId);
 if (type === "sync") return syncDetailContent();
 return diagnosisDetailContent(detailId);}

function syncDetailContent() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 const boundary = scoped.accessBoundary || {};
 const signals = (scoped.stuckSignals || []).slice(0, 6);
 const questions = (scoped.questions || []).slice(0, 6);
 return `
 <header class="modal-title-block">
 <p class="mini-label">dataSyncDetails</p>
 <h3 id="teacher-detail-title">pupil viewsignalteacher class insights</h3>
 <span class="status-pill">${escapeHtml(boundary.className || scoped.className || "current class")}</span>
 </header>
 <div class="modal-detail-grid">
 <section>
 <h4>latestStuck signals</h4>
 <ul class="modal-evidence-list">
 ${signals.length? signals.map((signal) => `
 <li>
 <strong>${escapeHtml(signal.studentAlias)} · ${escapeHtml(signal.stuckType || "Stuck signal")}</strong>
 <span>${escapeHtml(signal.note || "pupil notes.")} · ${formatmessagetime(signal.createdAt)}</span>
 </li>
 `).join(""): `<li><strong>No stuck signal yet</strong><span>pupilclicksendtoteacher learningwill learn in.</span></li>`}
 </ul>
 </section>
 <section>
 <h4>latestpupilquestion</h4>
 <ul class="modal-evidence-list">
 ${questions.length? questions.map((question) => `
 <li>
 <strong>${escapeHtml(question.studentAlias || "pupil")} · question</strong>
 <span>${escapeHtml(question.text || question.question || "learning")} · ${formatmessagetime(question.createdAt)}</span>
 </li>
 `).join(""): `<li><strong>none yetquestion</strong><span>pupilinAsk AIquestionlearningwillSynclearning in.</span></li>`}
 </ul>
 </section>
 </div>
 `;}

function diagnosisDetailContent(detailId) {const focus = detailId || "diagram";
 const rows = [["diagram mappingviewlearningunderstand", "72%", "S014", "frequencydiagramand learning ofwaveformlearningviewlearning."],
 ["formulawill learnunderstand learning", "58%", "S009", "learning, learning."],
 ["learningcannotlearning", "36%", "S021", "learningsignallearning, learningfirstviewlearning in."]];

 return `
 <header class="modal-title-block">
 <p class="mini-label">DiagnosisDetails</p>
 <h3 id="teacher-detail-title">Misconception mapandpupil quotesevidence</h3>
 <span class="status-pill hot">teacherreviewlearningIntervention</span>
 </header>
 <div class="modal-detail-grid">
 <section>
 <h4>classMisconceptionlearning</h4>
 <div class="progress-list">
 ${progress("only learning formula, learninglessconceptlearning", 68)}
 ${progress("learningfrequency domain, learning", 44)}
 ${progress("learning typeslearning, learningcannotlearning", 31)}
 </div>
 </section>
 <section>
 <h4>evidencelearning</h4>
 <ul class="modal-evidence-list">
 ${rows.map(([title, percent, alias, quote]) => `
 <li class="${focus && title.includes("diagram")? "active": ""}">
 <strong>${title} · ${percent}</strong>
 <span>${alias}: ${quote}</span>
 </li>
 `).join("")}
 </ul>
 </section>
 </div>
 <article class="modal-note-box">
 <strong>teacher nextlearning</strong>
 <p>firstconfirmlearningQuoteis learning of learningunderstandingquestion, then learning is learningpublish Level 1 diagramexplanationand Level 2 learningpractice.</p>
 </article>
 `;}

function interventionDetailContent() {return `
 <header class="modal-title-block">
 <p class="mini-label">InterventionDetails</p>
 <h3 id="teacher-detail-title">learningMisconceptionlearninggenerateEditablelearning</h3>
 <span class="status-pill warn">draft, learningpublish</span>
 </header>
 <div class="intervention-lane-grid modal-lane-grid">
 ${interventionLane("Level 1", "learning", "first diagramlearning“learningsignalof learning”.", "S009, S014")}
 ${interventionLane("Level 2", "conceptlearningpractice", "pupil learning typeslearning inaccurate, learning in learningaccurate.", "S002, S021, S031")}
 ${interventionLane("Level 3", "learning", "selectlearning, learning or learningsignallearning.", "S004, S018")}
 </div>
 <div class="modal-detail-grid">
 <section>
 <h4>materialdraft</h4>
 <ul class="material-review-list">
 ${materialreview("visual", "time vs frequency diagram", "diagram mappinglearning.")}
 ${materialreview("Handout", "5-minute pupil handout", "first learning, then learning formula meaning.")}
 ${materialreview("Mini quiz", "3 questionsdiagramfor learning", "learning is diagramlearningconcept.")}
 </ul>
 </section>
 <section>
 <h4>teacher control</h4>
 <ul class="task-list">
 ${task("Editable", "teachers can learn materialof learning, learning andquestions.")}
 ${task("learningapproval", "Interventionlearningwill learn topupil, mustfirst learningApproval.")}
 ${task("learning", "publishlearningContinueclass insights.")}
 </ul>
 </section>
 </div>
 <div class="action-row modal-actions">
 <button class="secondary-button" type="button" data-jump-channel="creation">learningContent hub</button>
 <button class="primary-button" type="button" data-jump-channel="approval">send to Approval</button>
 </div>
 `;}

function studentDetailContent(alias) {const student = studentRoster.find((item) => item.id === alias) || selectedStudent();
 selectedStudentId = student.id;
 return `
 <header class="modal-title-block">
 <p class="mini-label">pupilFollow-upDetails</p>
 <h3 id="teacher-detail-title">${escapeHtml(student.id)} of learning support profile</h3>
 <span class="status-pill">learningsummary, learning isclinicalDiagnosis</span>
 </header>
 ${studentProfile(student)}
 `;}

function analysisOutcomesummaryPanel() {const outcome = currentteacherAgentState().outcomeEvaluation || {};
 const metrics = outcome.metrics || {};
 const statusLabel = metrics.actionCount? `${metrics.actionCount} teacher actions`: "Awaiting teacher actions";
 const summary = outcome.summary ||
 "Awaiting signals: teacher-approved messages, materials and follow-ups will be compared with later pupil questions, stuck signals, submissions and check-ins.";
 const nextAction = (outcome.nextteacherActions || [])[0];
 const nextText = nextAction? `${nextAction.studentAlias}: ${nextAction.detail || nextAction.recommendation || "Waiting for the next pupil learning signal."}`: "Approve a teacher action first, then wait for later pupil learning signals.";

 return `
 <section class="panel analysis-outcome-summary">
 <div class="panel-header">
 <div>
 <p class="mini-label">Outcome</p>
 <h3>Pupil signals after teacher action</h3>
 </div>
 <span class="status-pill">${escapeHtml(statusLabel)}</span>
 </div>
 <div class="outcome-summary-layout">
 <details class="compact-disclosure">
 <summary>
 <span>View notes</span>
 <em>collapsed</em>
 </summary>
 <div class="outcome-summary-copy">
 <p>${escapeHtml(summary)}</p>
 <strong>${escapeHtml(nextText)}</strong>
 </div>
 </details>
 <div class="outcome-summary-metrics">
 ${agentOutcomeMetric("Improved", metrics.improvedCount || 0)}
 ${agentOutcomeMetric("Needs follow-up", metrics.needsFollowupCount || 0)}
 ${agentOutcomeMetric("Monitoring", metrics.monitoringCount || 0)}
 ${agentOutcomeMetric("Awaiting signal", metrics.waitingSignalCount || 0)}
 </div>
 </div>
 <div class="action-row">
 <button class="secondary-button" type="button" data-detail-type="outcome">View details</button>
 </div>
 </section>
 `;}

function outcomeDetailContent() {const outcome = currentteacherAgentState().outcomeEvaluation || {};
 const metrics = outcome.metrics || {};
 const evaluations = outcome.evaluations || [];
 return `
 <header class="modal-title-block">
 <p class="mini-label">Outcome details</p>
 <h3 id="teacher-detail-title">Teacher actions and pupil signals</h3>
 <span class="status-pill">${escapeHtml(metrics.actionCount? `${metrics.actionCount} actions tracked`: "Awaiting signal")}</span>
 </header>
 <div class="agent-outcome-grid modal-outcome-grid">
 ${agentOutcomeMetric("Improved", metrics.improvedCount || 0)}
 ${agentOutcomeMetric("Needs follow-up", metrics.needsFollowupCount || 0)}
 ${agentOutcomeMetric("Monitoring", metrics.monitoringCount || 0)}
 ${agentOutcomeMetric("Awaiting signal", metrics.waitingSignalCount || 0)}
 </div>
 <article class="modal-note-box">
 <strong>System evidence</strong>
 <p>${escapeHtml(outcome.summary || "After a teacher action, the system waits for later pupil signals before judging impact.")}</p>
 </article>
 <div class="agent-outcome-list modal-outcome-list">
 ${evaluations.length? evaluations.map(agentOutcomeItem).join(""): `
 <article>
 <strong>Awaiting signal</strong>
 <span>Teacher-approved messages, materials or follow-ups are compared with later pupil questions, stuck signals, submissions and check-ins.</span>
 </article>
 `}
 </div>
 `;}

function teacherAgentPanel() {const agentState = currentteacherAgentState();
 const answer = teacherAgentAnswer || window.TeachFlowDualAgentEngine.answerteacherquestion(teacherAgentquestion, agentState);

 return `
 <section class="teacher-agent-console">
 <div class="panel teacher-agent-main">
 <div class="panel-header">
 <div><p class="mini-label">teacher Agent</p><h3>AI Teaching analysis assistant</h3></div>
 <span class="status-pill">${teacherAgentBriefingSource === "api"? "API connected": "Coordinator preview"}</span>
 </div>
 <details class="compact-disclosure">
 <summary>
 <span>Agent summary</span>
 <em>learningview</em>
 </summary>
 <p class="agent-summary">${escapeHtml(agentState.summary)}</p>
 </details>
 <div class="agent-insight-grid">
 ${agentInsight("Misconceptions", `${misconceptionCount(agentState)} types`)}
 ${agentInsight("Pupils needing support", `${agentState.insight.urgentCount} pupils`)}
 ${agentInsight("Quote evidence", `${agentState.insight.evidenceCount} items`)}
 ${agentInsight("Level 1", `${agentState.insight.levelOneCount} pupils`)}
 </div>
 <div class="agent-source-strip">
 ${(agentState.sourceSignals || []).map(agentSourceChip).join("")}
 </div>
 ${teacherOutcomePanel(agentState)}
 <form id="teacher-agent-form" class="agent-question-form">
 <textarea id="teacher-agent-input" placeholder="Ask the teacher Agent, for example: Which pupils should I review first?">${escapeAttr(teacherAgentquestion)}</textarea>
 <button class="secondary-button" type="submit">Ask teacher Agent</button>
 </form>
 <article class="agent-answer-box">
 <span>Agent response</span>
 <p>${escapeHtml(answer)}</p>
 </article>
 </div>

 <aside class="panel teacher-agent-side">
 <div class="panel-header">
 <div><p class="mini-label">Actions</p><h3>Suggested actions to review</h3></div>
 </div>
 <div class="agent-priority-list">
 ${(agentState.priorities || []).map((item) => `
 <article>
 <strong>${escapeHtml(item.title)}</strong>
 <span>${escapeHtml(item.detail)}</span>
 <em>${escapeHtml(item.target)}</em>
 </article>
 `).join("")}
 </div>
 ${teacherAgentActionCards(agentState)}
 ${teacherAgentHistory(agentState)}
 <details class="compact-disclosure">
 <summary>
 <span>Agent rules</span>
 <em>${agentState.guardrails.length} items</em>
 </summary>
 <div class="agent-guardrail-box">
 <ul>
 ${agentState.guardrails.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
 </ul>
 </div>
 </details>
 </aside>
 </section>
 `;}

function teacherOutcomePanel(agentState) {const outcome = agentState.outcomeEvaluation || {};
 const metrics = outcome.metrics || {};
 const evaluations = outcome.evaluations || [];
 return `
 <section class="agent-outcome-panel">
 <div class="agent-outcome-header">
 <div><p class="mini-label">Outcome</p><strong>Pupil signals after teacher action</strong></div>
 <span class="status-pill">${metrics.actionCount? `${metrics.actionCount} actions`: "Awaiting action"}</span>
 </div>
 <p>${escapeHtml(outcome.summary || "learning ofteacher actions.")}</p>
 <div class="agent-outcome-grid">
 ${agentOutcomeMetric("Improved", metrics.improvedCount || 0)}
 ${agentOutcomeMetric("Needs follow-up", metrics.needsFollowupCount || 0)}
 ${agentOutcomeMetric("Monitoring", metrics.monitoringCount || 0)}
 ${agentOutcomeMetric("Awaiting signal", metrics.waitingSignalCount || 0)}
 </div>
 <div class="agent-outcome-list">
 ${evaluations.length? evaluations.slice(0, 3).map(agentOutcomeItem).join(""): `
 <article>
 <strong>No outcome log yet</strong>
 <span>Teacher-approved messages, materials or follow-ups will be checked against later pupil questions, stuck signals, submissions and check-ins.</span>
 </article>
 `}
 </div>
 </section>
 `;}

function agentOutcomeMetric(label, value) {return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;}

function agentOutcomeItem(item) {const statusclass = item.status === "needs_followup"? " warn": item.status === "improved"? " ok": "";
 return `
 <article class="agent-outcome-item${statusclass}">
 <div>
 <strong>${escapeHtml(item.studentAlias)} - ${escapeHtml(item.statusLabel)}</strong>
 <span>${escapeHtml(item.summary)}</span>
 </div>
 ${agentOutcometimeline(item)}
 <em>${escapeHtml(item.recommendation)}</em>
 </article>
 `;}

function agentOutcometimeline(item) {const evidenceItems = (item.evidence || []).slice(0, 3);
 const studentState = teacherActionStudentState(item);
 return `
 <ul class="agent-outcome-timeline">
 <li><strong>teacher action</strong><span>${escapeHtml(item.actionTitle || item.actionLabel)} - ${formatmessagetime(item.createdAt)}</span></li>
 <li><strong>status</strong><span>${escapeHtml(studentState)}</span></li>
 ${evidenceItems.length? evidenceItems.map((evidence) => `
 <li>
 <strong>${escapeHtml(evidence.relation === "linked"? "Pupil learning": "Learning signal")}</strong>
 <span>${escapeHtml(evidence.label)} - ${formatmessagetime(evidence.createdAt)} - ${escapeHtml(evidence.quote)}</span>
 </li>
 `).join(""): `
 <li><strong>Pupil learning</strong><span>Waiting for the pupil to submit work, ask a question, reply, or send a stuck signal.</span></li>
 `}
 </ul>
 `;}

function teacherActionStudentState(item) {if (item.studentResponseAt) return `Pupil responded: ${teacherResponseTypeLabel(item.studentResponseType)}`;
 if (item.studentReadAt) return "Pupil has read it; awaiting response";
 if (item.studentVisible === false) return "teacher action";
 return "Pupil learning";}

function teacherResponseTypeLabel(type) {if (type === "improved") return "Learning support helped";
 if (type === "still_stuck") return "Still stuck";
 return "Synced";}

function teacherAgentActionCards(agentState) {const topFocus = agentState.studentFocus?.[0] || null;
 const messagedraft = agentState.messagedrafts?.[0] || null;
 const materialdraft = agentState.materialdrafts?.[0] || null;
 const alias = messagedraft?.studentAlias || topFocus?.studentAlias || selectedmessageAlias;

 if (!topFocus &&!messagedraft &&!materialdraft) {return `
 <div class="agent-action-stack">
 <article class="agent-action-card muted">
 <span>Suggested action</span>
 <strong>No teacher-approved action yet</strong>
 <p>Continue waiting for pupil assignments, questions or shared stuck signals. The teacher Agent will suggest actions when there is enough evidence.</p>
 </article>
 </div>
 `;}

 return `
 <div class="agent-action-stack">
 ${messagedraft? `
 <article class="agent-action-card">
 <span>Message - ${escapeHtml(messagedraft.studentAlias)}</span>
 <strong>Approve and send support message</strong>
 <p>${escapeHtml(messagedraft.text)}</p>
 <button class="primary-button" type="button" data-agent-action="send_message" data-agent-alias="${escapeAttr(messagedraft.studentAlias)}" data-agent-source-id="${escapeAttr(messagedraft.id)}">Approve send</button>
 </article>
 `: ""}
 ${materialdraft && alias? `
 <article class="agent-action-card">
 <span>Material - ${escapeHtml(alias)}</span>
 <strong>${escapeHtml(materialdraft.title)}</strong>
 <p>${escapeHtml(materialdraft.goal || materialdraft.type)}</p>
 <button class="secondary-button" type="button" data-agent-action="assign_material" data-agent-alias="${escapeAttr(alias)}" data-agent-source-id="${escapeAttr(materialdraft.id)}">Assign to pupil</button>
 </article>
 `: ""}
 ${topFocus? `
 <article class="agent-action-card compact">
 <span>Follow-up - ${escapeHtml(topFocus.studentAlias)}</span>
 <strong>${escapeHtml(topFocus.mainNeed)}</strong>
 <p>${escapeHtml(topFocus.recommendedAction)}</p>
 <div class="agent-action-row">
 <button class="secondary-button" type="button" data-agent-action="schedule_followup" data-agent-alias="${escapeAttr(topFocus.studentAlias)}" data-agent-source-id="${escapeAttr(topFocus.studentAlias)}">Schedule follow-up</button>
 <button class="plain-button" type="button" data-agent-action="dismiss" data-agent-alias="${escapeAttr(topFocus.studentAlias)}" data-agent-source-id="${escapeAttr(topFocus.studentAlias)}">Mark handled</button>
 </div>
 </article>
 `: ""}
 </div>
 `;}

function teacherAgentHistory(agentState) {const history = (agentState.actionHistory || currentteacherAgentActions()).slice(0, 4);
 return `
 <div class="agent-history-box">
 <p class="mini-label">History</p>
 ${history.length? `
 <ul>
 ${history.map((item) => `
 <li>
 <strong>${escapeHtml(teacherAgentActionLabel(item.type))}${item.studentAlias? ` - ${escapeHtml(item.studentAlias)}`: ""}</strong>
 <span>${escapeHtml(item.title || item.detail || "Logged teacher action")} - ${formatmessagetime(item.createdAt)}</span>
 <em class="teacher-action-read-state">${escapeHtml(teacherActionStudentState(item))}</em>
 </li>
 `).join("")}
 </ul>
 `: "<p>Teacher-approved actions will appear here.</p>"}
 </div>
 `;}

function currentteacherAgentActions() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 return (scoped.teacherAgentActions || []).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));}

function teacherAgentActionLabel(type) {if (type === "send_message") return "Support message";
 if (type === "assign_material") return "Assigned material";
 if (type === "schedule_followup") return "Learning follow-up";
 if (type === "dismiss") return "Handled";
 return "teacher actions";}

function agentInsight(label, value) {return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(metricValue(value))}</strong></article>`;}

function agentSourceChip(item) {return `<span><strong>${escapeHtml(item.count)}</strong>${escapeHtml(item.label)}</span>`;}

function analysisStep(number, title, detail, status) {return `
 <article class="analysis-step">
 <span>${number}</span>
 <strong>${title}</strong>
 <p>${detail}</p>
 <em>${status}</em>
 </article>
 `;}

function misconceptionCard(title, value, detail, alias) {return `
 <article class="misconception-card">
 <div class="progress-top"><strong>${title}</strong><span>${value}%</span></div>
 <div class="progress-bar"><span style="width: ${value}%"></span></div>
 <p>${detail}</p>
 <button class="plain-button" type="button" data-detail-type="diagnosis" data-detail-id="${escapeAttr(title)}">view ${alias} evidence</button>
 </article>
 `;}

function analysisAction(title, detail, action, targetChannel) {const actionAttribute = channels[targetChannel]? `data-jump-channel="${escapeAttr(targetChannel)}"`: `data-detail-type="${escapeAttr(targetChannel)}"`;
 return `
 <article class="analysis-action">
 <div>
 <strong>${title}</strong>
 <p>${detail}</p>
 </div>
 <button class="secondary-button" type="button" ${actionAttribute}>${action}</button>
 </article>
 `;}

function interventionLane(level, title, detail, students) {return `
 <article class="intervention-lane">
 <span class="status-pill">${level}</span>
 <strong>${title}</strong>
 <p>${detail}</p>
 <small>pupil: ${students}</small>
 </article>
 `;}

function analysisStudent(student) {return `
 <button class="analysis-student-card" type="button" data-detail-type="student" data-student-id="${escapeAttr(student.id)}">
 <span class="student-avatar-circle">${escapeHtml(student.short)}</span>
 <div>
 <strong>${escapeHtml(student.id)} · ${escapeHtml(student.status)}</strong>
 <p>${escapeHtml(student.stuck)} · ${escapeHtml(student.next)}</p>
 </div>
 </button>
 `;}

function selectedStudent() {return studentRoster.find((student) => student.id === selectedStudentId) || studentRoster[0];}

function studentAvatar(student) {const isActive = student.id === selectedStudentId? " active": "";
 return `
 <button class="student-avatar-button${isActive}" type="button" data-student-id="${escapeAttr(student.id)}">
 <span class="student-avatar-circle">${escapeHtml(student.short)}</span>
 <strong>${escapeHtml(student.id)}</strong>
 <small>${escapeHtml(student.status)}</small>
 </button>
 `;}

function studentProfile(student) {return `
 <div class="panel-header">
 <div><p class="mini-label">pupilDetails</p><h3>${escapeHtml(student.id)} of learning</h3></div>
 <span class="status-pill ${student.status === "needs support"? "hot": ""}">${escapeHtml(student.level)}</span>
 </div>
 <div class="student-profile-grid">
 ${studentProfileItem("currentstatus", student.status)}
 ${studentProfileItem("learningStuck signal", student.stuck)}
 ${studentProfileItem("Next step", student.next)}
 ${studentProfileItem("Learning memory", student.memory)}
 </div>
 <div class="student-evidence-box">
 <p class="mini-label">pupil quotesevidence</p>
 <blockquote>${escapeHtml(student.evidence)}</blockquote>
 </div>
 ${studentSupportProfile(student)}
 `;}

function studentSupportProfile(student) {const checkIn = latestSharedCheckIn(student.id);
 const stateLabel = checkIn?.stateLabel || student.status;
 const wellbeingLabel = checkIn?.wellbeingLabel || "none yetMoodsignal";
 const recommendedAction = checkIn?.recommendedteacherAction || "ContinuelearningDiagnosisto learningsupport; pupilShareHelp requestdraft, thengeneratelearningsupportSuggested.";
 const sharedquestion = checkIn?.teacherHelpdraft || "pupil learning ofHelp requestquestion.";
 const evidenceQuote = checkIn?.evidenceQuote || student.evidence;

 return `
 <section class="student-support-profile">
 <div class="support-profile-grid">
 ${supportProfileItem("A. Learning status", `current topic: ${window.TeachFlowWorkspaceState.getState().topic}; understandingstatus: ${student.level} / ${stateLabel}; learningStuck signal: ${student.stuck}`)}
 ${supportProfileItem("B. Mood/learningsignal", `${wellbeingLabel}.learning is learningLearning statuslearning, learning isclinicalDiagnosis.`)}
 ${supportProfileItem("C. Teacher action", recommendedAction)}
 ${supportProfileItem("D. Pupil question", sharedquestion)}
 </div>
 <div class="support-evidence-box">
 <span>learningevidence</span>
 <blockquote>${escapeHtml(evidenceQuote)}</blockquote>
 </div>
 </section>
 `;}

function supportProfileItem(label, value) {return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;}

function studentProfileItem(label, value) {return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;}

function row(cells) {return `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`;}

function progress(label, value) {return `
 <div class="progress-item">
 <div class="progress-top"><span>${label}</span><span>${value}%</span></div>
 <div class="progress-bar"><span style="width: ${value}%"></span></div>
 </div>
 `;}

function column(title, cards) {return `
 <section class="kanban-column">
 <h4>${title}</h4>
 ${cards.map(([cardTitle, body]) => `<article class="mini-card"><strong>${cardTitle}</strong><p>${body}</p></article>`).join("")}
 </section>
 `;}

function escapeHtml(value) {return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");}

function escapeAttr(value) {return escapeHtml(value);}

MATERIAL_TYPE_OPTIONS.splice(0,
 MATERIAL_TYPE_OPTIONS.length,
 {icon: "lecture",
 title: "Handout",
 detail: "generatepupil learning ofclasshandout, suitablePre-read, classexplanationandpost-lesson review."},
 {icon: "image",
 title: "visual",
 detail: "generateclass diagram, conceptdiagramor diagram, completedlearningPreviewvisual."},
 {icon: "practice",
 title: "practice",
 detail: "generatelearningpracticelearning, learning andteacher learninganswerslearning."});
if (!MATERIAL_TYPE_OPTIONS.some((item) => item.title === selectedmaterialType)) {selectedmaterialType = "Handout";}

function teacherCreationChannel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 const draft = latestgeneratedmaterial || latestmaterialdraft(scoped);
 const defaultTopic = materialDefaultTopic(scoped);
 const status = materialGenerationstatus || (draft? "alreadydraft, learningContinuegeneratelearningversionorEditPreview.": "learningselectHandout, visualorpractice, thengeneratelearningPreviewdraft.");

 return `
 <section class="creation-layout">
 <div class="panel material-maker">
 <div class="panel-header">
 <div><p class="mini-label">material studio</p><h3>only learning typesmaterial: Handout, visual, practice</h3></div>
 <span class="status-pill warn">teacher approvallearningpublish</span>
 </div>
 <div class="material-type-grid">
 ${MATERIAL_TYPE_OPTIONS.map((item) => materialType(item.icon,
 item.title,
 item.detail,
 item.title === selectedmaterialType? "selectedlearning": "Tap to select",
 item.title === selectedmaterialType)).join("")}
 </div>

 <form class="maker-form" id="material-generator-form">
 <div class="maker-selected-row">
 <span>currentgenerate typeslearning</span>
 <strong data-selected-material-label>${escapeHtml(selectedmaterialType)}</strong>
 </div>
 <label>
 <span>material topic</span>
 <input name="topic" value="${escapeAttr(defaultTopic)}" placeholder="e.g. Introduction to waves">
 </label>
 <label>
 <span>Creation goal</span>
 <textarea name="prompt" placeholder="learning AI learning materialquestion">learningThis lessonTopic, first learningaccessiblelearningCore concept, thentopupil learningcan learncompletedof task.</textarea>
 </label>
 <div class="maker-field-grid">
 <label>
 <span>Target level</span>
 <select name="targetLevel">
 <option>Level 1 confused pupils</option>
 <option>Level 2 Developing</option>
 <option>Level 3 Ready to apply</option>
 </select>
 </label>
 <label>
 <span>outputlearninggood</span>
 <select name="formatHint">
 <option>teacher notesandpupil tasks</option>
 <option>learningsuitableclass learning</option>
 <option>learningsuitablepost-lesson review</option>
 </select>
 </label>
 </div>
 <p class="generation-status">${escapeHtml(status)}</p>
 <div class="action-row">
 <button class="primary-button" type="submit" data-generate-material>generatelearningPreview</button>
 <button class="secondary-button" type="button" data-jump-channel="approval">viewApproval</button>
 </div>
 </form>
 </div>

 <aside class="panel creation-preview">
 <div class="panel-header">
 <div><p class="mini-label">Preview</p><h3>${draft? "generatelearningContinue editing": "waitinggenerate"}</h3></div>
 <span class="status-pill">${draft? "latestdraft": "learning"}</span>
 </div>
 ${rendermaterialPreview(draft)}
 </aside>
 </section>
 `;}

function generatematerialdraft(form) {const button = form.querySelector("[data-generate-material]");
 const payload = Object.fromEntries(new FormData(form).entries());
 payload.materialType = normalizematerialTypeForUi(selectedmaterialType);
 payload.type = payload.materialType;
 payload.kind = materialKindFromType(payload.materialType);
 payload.prompt = payload.prompt || payload.goal || "";

 const originalText = button?.textContent || "";
 if (button) {button.disabled = true;
 button.textContent = payload.kind === "image"? "generatevisualin...": "Generating…";}
 materialGenerationstatus = payload.kind === "image"? "Generatingvisual, learningneeds learning; generatelearningwillinrightlearningdisplayrealvisual.": `Generating${payload.materialType}draft, learning.`;

 postmaterialdraft(payload).then((result) => {latestgeneratedmaterial = result.saveddraft || result.draft || null;
 if (result.state) window.TeachFlowWorkspaceState.setState(result.state);
 teacherAgentBriefing = null;
 materialGenerationstatus = result.mode === "local" && result.error? `${payload.materialType}already usinglearningRulesgenerate; real AI learningusable.`: `${payload.materialType}already generated, rightlearningPreviewlearningContinuelearning.`;
 setChannel("creation");}).catch((error) => {materialGenerationstatus = materialErrormessage(error);
 if (button) {button.disabled = false;
 button.textContent = originalText || "generatelearningPreview";}
 setChannel("creation");});}

function savematerialdraftEdits(form) {const button = form.querySelector("[data-save-material-draft]");
 const originalText = button?.textContent || "";
 const payload = Object.fromEntries(new FormData(form).entries());
 payload.type = normalizematerialTypeForUi(payload.type || selectedmaterialType);
 payload.kind = payload.kind || materialKindFromType(payload.type);
 payload.outline = materialLinesFromText(payload.outline);
 payload.keyPoints = materialLinesFromText(payload.keyPoints);
 payload.reviewChecklist = materialLinesFromText(payload.reviewChecklist);
 if (payload.sectionsText!== undefined) payload.sections = sectionsFromText(payload.sectionsText);
 if (payload.exercisesText!== undefined) payload.exercises = exercisesFromText(payload.exercisesText);
 if (payload.answerKey!== undefined) payload.answerKey = materialLinesFromText(payload.answerKey);

 if (button) {button.disabled = true;
 button.textContent = "Saving…";}
 materialGenerationstatus = "Saving draft changes…";

 postmaterialdraftupdate(payload).then((result) => {latestgeneratedmaterial = result.saveddraft || latestgeneratedmaterial;
 if (result.state) window.TeachFlowWorkspaceState.setState(result.state);
 teacherAgentBriefing = null;
 materialGenerationstatus = "Changes saved. Continue editing or open Approval.";
 setChannel("creation");}).catch((error) => {materialGenerationstatus = materialErrormessage(error);
 if (button) {button.disabled = false;
 button.textContent = originalText || "Save changes";}
 setChannel("creation");});}

async function postmaterialdraft(payload) {if (!canUseteacherAgentApi()) {const state = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(state, TEACHER_CONTEXT);
 const type = normalizematerialTypeForUi(payload.materialType || payload.type);
 const kind = materialKindFromType(type);
 const topic = payload.topic || scoped.topic || "currentCourseTopic";
 const draft = localBrowsermaterialdraft({type, kind, topic, payload, scoped});
 state.draftmaterials = [draft,...(state.draftmaterials || [])].slice(0, 50);
 window.TeachFlowWorkspaceState.setState(state);
 return {agent: "material-generator", mode: "local", draft, saveddraft: draft, state};}

 const response = await fetch("/api/ai/material-generator", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 if (!response.ok) {const error = await response.json().catch(() => ({}));
 throw new Error(error.error || `material generator API ${response.status}`);}
 return response.json();}

async function postmaterialdraftupdate(payload) {if (!canUseteacherAgentApi()) {const state = window.TeachFlowWorkspaceState.getState();
 const current = (state.draftmaterials || []).find((item) => item.id === payload.id);
 if (!current) throw new Error("draft not found — generate again first.");
 const saveddraft = {...current,
 kind: payload.kind || current.kind,
 title: payload.title || current.title,
 type: payload.type || current.type,
 topic: payload.topic || current.topic,
 targetLevel: payload.targetLevel || current.targetLevel,
 goal: payload.goal || current.goal,
 outline: payload.outline || current.outline || [],
 sections: payload.sections || current.sections || [],
 keyPoints: payload.keyPoints || current.keyPoints || [],
 exercises: payload.exercises || current.exercises || [],
 answerKey: payload.answerKey || current.answerKey || [],
 imageUrl: payload.imageUrl || current.imageUrl || "",
 imagePrompt: payload.imagePrompt || current.imagePrompt || "",
 revisedPrompt: payload.revisedPrompt || current.revisedPrompt || "",
 teachernotes: payload.teachernotes || "",
 studentTask: payload.studentTask || "",
 reviewChecklist: payload.reviewChecklist || current.reviewChecklist || [],
 updatedAt: new Date().toISOString(),
 version: Number(current.version || 1) + 1};
 state.draftmaterials = state.draftmaterials.map((item) => item.id === saveddraft.id? saveddraft: item);
 window.TeachFlowWorkspaceState.setState(state);
 return {saveddraft, state};}

 const response = await fetch("/api/workspace/material-drafts", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 if (!response.ok) {const error = await response.json().catch(() => ({}));
 throw new Error(error.error || `material draft API ${response.status}`);}
 return response.json();}

function rendermaterialPreview(material) {if (!material) {return `
 <div class="material-preview-empty">
 <strong>learninggenerate draft</strong>
 <span>firstinleftlearningselect“Handout / visual / practice”, thenclickgenerate.generatelearningwillin learning inPreview, learningSynclearningApproval.</span>
 </div>
 `;}

 const draft = materialDisplay(material);
 const commonFields = `
 <input type="hidden" name="id" value="${escapeAttr(material.id || "")}">
 <input type="hidden" name="kind" value="${escapeAttr(draft.kind)}">
 <input type="hidden" name="type" value="${escapeAttr(draft.type)}">
 <input type="hidden" name="topic" value="${escapeAttr(material.topic || "")}">
 <div class="generated-material-top">
 <span class="status-pill">${escapeHtml(draft.type)}</span>
 <small>${escapeHtml(draft.targetLevel || "PendinglearningLevel")}</small>
 </div>
 ${materialEditorField("title", "draftlearning", draft.title, "input")}
 ${materialEditorField("targetLevel", "Target level", draft.targetLevel || "Level 1-2", "input")}
 ${materialEditorField("goal", "Learning objective", draft.goal || "Help pupils complete one understandable small step.", "textarea")}
 `;
 const bottomFields = `
 ${materialEditorField("teachernotes", "teacher notes", draft.teachernotes, "textarea")}
 ${materialEditorField("studentTask", "pupil tasks", draft.studentTask, "textarea")}
 ${materialEditorField("reviewChecklist", "approvallearning", draft.reviewChecklist.join("\n"), "textarea")}
 <div class="action-row">
 <button class="primary-button" type="submit" data-save-material-draft>Save changes</button>
 <button class="secondary-button" type="button" data-jump-channel="approval">viewapprovaldraft</button>
 </div>
 `;

 if (draft.kind === "image") {const imageBlock = draft.imageUrl? `<img class="generated-material-image" src="${escapeAttr(cacheBustedmaterialUrl(draft.imageUrl, draft.updatedAt))}" alt="${escapeAttr(draft.title)}">`: `<div class="generated-image-placeholder"><strong>visuallearninggenerate</strong><span>learning in learningvisuallearning.learningconfirmvisuallearningusablelearninggenerate.</span></div>`;
 return `
 <form class="generated-material-card material-editor-form" id="material-editor-form">
 ${commonFields}
 ${imageBlock}
 ${materialEditorField("imagePrompt", "visualgeneratelearning", draft.imagePrompt, "textarea")}
 <input type="hidden" name="imageUrl" value="${escapeAttr(draft.imageUrl)}">
 <input type="hidden" name="revisedPrompt" value="${escapeAttr(draft.revisedPrompt)}">
 ${bottomFields}
 </form>
 `;}

 if (draft.kind === "exercise") {return `
 <form class="generated-material-card material-editor-form" id="material-editor-form">
 ${commonFields}
 ${materialEditorField("exercisesText", "practicelearning (learning: learning Level questions learninganswers learning) ", exercisesToText(draft.exercises), "textarea")}
 ${materialEditorField("answerKey", "teacheranswersand learningpoints", draft.answerKey.join("\n"), "textarea")}
 ${bottomFields}
 </form>
 `;}

 return `
 <form class="generated-material-card material-editor-form" id="material-editor-form">
 ${commonFields}
 ${materialEditorField("sectionsText", "Handoutlearning (learning: learning: learning) ", sectionsToText(draft.sections), "textarea")}
 ${materialEditorField("keyPoints", "learningpoints", draft.keyPoints.join("\n"), "textarea")}
 ${bottomFields}
 </form>
 `;}

function materialApprovalItem(material) {const draft = materialDisplay(material);
 const status = draft.status === "approved"? "alreadyApprove": "Pendingteacher approval";
 const detail = draft.kind === "image" && draft.imageUrl? "already generatedvisual, learningCreatelearningPreview": draft.kind === "exercise"? `${draft.exercises.length || draft.outline.length} questions/learningpracticelearning`: `${draft.sections.length || draft.outline.length} learningHandoutlearning`;
 return `
 <li>
 <strong>${escapeHtml(draft.type)} · ${escapeHtml(draft.title)}</strong>
 <span>${escapeHtml(status)} · ${escapeHtml(draft.targetLevel || "learningsettingsLevel")} · ${escapeHtml(detail)}</span>
 </li>
 `;}

function emptymaterialdraftState() {return `
 <li>
 <strong>none yetPendingapprovalmaterial</strong>
 <span>learning“Content hub”, selectHandout, visualorpracticelearninggenerate draft.</span>
 </li>
 `;}

function materialDisplay(material) {const type = normalizematerialTypeForUi(material?.type || material?.materialType || selectedmaterialType);
 const kind = material?.kind || materialKindFromType(type);
 return {kind,
 title: material?.title || `${material?.topic || "current topic"} ${type}draft`,
 type,
 targetLevel: material?.targetLevel || "",
 goal: material?.goal || material?.summary || "",
 content: material?.content || "",
 outline: materialArray(material?.outline || material?.content),
 sections: materialSections(material?.sections || material?.outline || material?.content),
 keyPoints: materialArray(material?.keyPoints || material?.highlights),
 exercises: materialExercises(material?.exercises || material?.questions || material?.outline),
 answerKey: materialArray(material?.answerKey || material?.answers),
 imageUrl: material?.imageUrl || "",
 imagePrompt: materialText(material?.imagePrompt),
 revisedPrompt: materialText(material?.revisedPrompt),
 teachernotes: materialText(material?.teachernotes || material?.teacherNote || material?.notes),
 studentTask: materialText(material?.studentTask || material?.task),
 reviewChecklist: materialArray(material?.reviewChecklist || material?.checklist),
 status: material?.status || "draft",
 updatedAt: material?.updatedAt || material?.createdAt || ""};}

function normalizematerialTypeForUi(value) {const text = String(value || "").trim();
 if (/visual|diagram|image|diagram|image|diagram/i.test(text)) return "visual";
 if (/practice|exercise|quiz|exercise|quiz|practice/i.test(text)) return "practice";
 return "Handout";}

function materialKindFromType(type) {const normalized = normalizematerialTypeForUi(type);
 if (normalized === "visual") return "image";
 if (normalized === "practice") return "exercise";
 return "handout";}

function materialArray(value) {if (Array.isArray(value)) {return value.map(materialText).filter(Boolean);}
 if (value && typeof value === "object") {return Object.values(value).map(materialText).filter(Boolean);}
 return materialLinesFromText(value);}

function materialText(value) {if (Array.isArray(value)) return value.map(materialText).filter(Boolean).join("; ");
 if (value && typeof value === "object") {if (value.heading || value.body) return [value.heading, value.body].filter(Boolean).join(": ");
 if (value.question) return [value.id, value.level, value.question, value.expectedAnswer, value.hint].filter(Boolean).join(" ");
 return JSON.stringify(value);}
 return String(value || "").trim();}

function materialLinesFromText(value) {if (Array.isArray(value)) return value.map(materialText).filter(Boolean);
 return String(value || "").split(/\n+|; |;|learning;/).map((item) => item.replace(/^\s*[-*\d.,]+\s*/, "").trim()).filter(Boolean);}

function materialSections(value) {if (Array.isArray(value) && value.some((item) => item && typeof item === "object")) {return value.map((item, index) => ({heading: materialText(item.heading || item.title || `learning ${index + 1}`),
 body: materialText(item.body || item.content || item.detail || item.text)})).filter((item) => item.heading || item.body);}
 return sectionsFromText(materialLinesFromText(value).join("\n"));}

function materialExercises(value) {if (Array.isArray(value) && value.some((item) => item && typeof item === "object")) {return value.map((item, index) => ({id: materialText(item.id || `Q${index + 1}`),
 level: materialText(item.level || item.targetLevel),
 question: materialText(item.question || item.prompt || item.text || item.title),
 expectedAnswer: materialText(item.expectedAnswer || item.answer || item.solution),
 hint: materialText(item.hint || item.scaffold || item.tip)})).filter((item) => item.question);}
 return exercisesFromText(materialLinesFromText(value).join("\n"));}

function sectionsToText(sections) {return (sections || []).map((item, index) => {const heading = item.heading || `learning ${index + 1}`;
 return `${heading}: ${item.body || ""}`.trim();}).join("\n");}

function sectionsFromText(value) {return materialLinesFromText(value).map((line, index) => {const parts = line.split(/[::]/);
 if (parts.length >= 2) {return {heading: parts.shift().trim() || `learning ${index + 1}`, body: parts.join(": ").trim()};}
 return {heading: `learning ${index + 1}`, body: line};}).filter((item) => item.heading || item.body);}

function exercisesToText(exercises) {return (exercises || []).map((item, index) => [item.id || `Q${index + 1}`,
 item.level || "",
 item.question || "",
 item.expectedAnswer || "",
 item.hint || ""].join(" ")).join("\n");}

function exercisesFromText(value) {return materialLinesFromText(value).map((line, index) => {const parts = line.split(/\|| /).map((item) => item.trim());
 if (parts.length >= 3) {return {id: parts[0] || `Q${index + 1}`,
 level: parts[1] || "",
 question: parts[2] || "",
 expectedAnswer: parts[3] || "",
 hint: parts[4] || ""};}
 return {id: `Q${index + 1}`, level: "", question: line, expectedAnswer: "", hint: ""};}).filter((item) => item.question);}

function cacheBustedmaterialUrl(url, updatedAt) {const cleanUrl = String(url || "").trim();
 if (!cleanUrl) return "";
 const version = encodeURIComponent(updatedAt || Date.now());
 return `${cleanUrl}${cleanUrl.includes("?")? "&": "?"}v=${version}`;}

function localBrowsermaterialdraft({type, kind, topic, payload, scoped}) {const base = {id: `material-${Date.now()}`,
 kind,
 title: `${topic} ${type}draft`,
 type,
 topic,
 targetLevel: payload.targetLevel || "Level 1-2",
 goal: payload.prompt || "Help pupils complete one understandable small step.",
 teachernotes: "learningRulesgenerateofdraft, Before publishingneeds teacher approval.",
 studentTask: "Write the one sentence you are least sure about.",
 reviewChecklist: ["is learningthis class progress", "is learningprivacylearning", "needs simpler language"],
 status: "draft",
 classId: scoped.activeclassId || TEACHER_CONTEXT.classId,
 source: "browser_local_fallback",
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 version: 1};
 if (kind === "image") {return {...base,
 imagePrompt: `classdiagram: ${topic}.${payload.prompt || ""}`,
 outline: ["visuallearningusablelearning", "learninggeneraterealvisual"]};}
 if (kind === "exercise") {return {...base,
 exercises: exercisesFromText("Q1 Level 1 learning of learningconcept. learning. first learning formula.\nQ2 Level 2 learning is learningconceptnotesreason. learning to learningreason. learning for learning."),
 answerKey: ["Q1: learning.", "Q2: learningreasonis learning for learningconcept."],
 outline: ["learningpractice", "teacher learningpoints"]};}
 return {...base,
 sections: sectionsFromText("Core concept: learningaccessiblelearningThis lessonlearning ofconcept.\nclass learning: pupil learning of learningconcept.\ntask: pupil learning ofone sentence."),
 keyPoints: ["first learning intuitiveunderstanding", "then learning", "finallylearning"],
 outline: ["Core concept", "class learning", "task"]};}

function teacherApprovalChannel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 const drafts = teacherdraftmaterials(scoped);
 const approvedCount = (scoped.approvedmaterials || []).filter((item) =>!item.classId || item.classId === scoped.activeclassId).length;
 return `
 <section class="layout-grid">
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">Approval flow</p><h3>drafts are not auto-published</h3></div>
 <span class="status-pill warn">${drafts.length? "Awaiting review": "none yetdraft"}</span>
 </div>
 <ul class="timeline-list">
 ${timeline("1", "AI generate draft", "CreatelearninggenerateofHandout, visualorpracticewillfirst learning in.")}
 ${timeline("2", "teacherreviewEdit", "confirmlearning, hardlearning, learning, privacylearning andclass learning.")}
 ${timeline("3", "Approvelearningthenpublish", "only teacher confirmationlearning, materialpupil vieworexport.")}
 </ul>
 </div>
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">materials sent from Content hub</p><h3>Reusable teacher materials</h3></div>
 <span class="status-pill">${approvedCount} draftsalreadyApprove</span>
 </div>
 <ul class="material-review-list approval-materials">
 ${drafts.length? drafts.map(materialApprovalItem).join(""): emptymaterialdraftState()}
 </ul>
 <div class="action-row">
 <button class="primary-button" type="button" disabled>Approve (Next step) </button>
 <button class="secondary-button" type="button" disabled>export materials (Next step) </button>
 <button class="plain-button" type="button" data-jump-channel="creation">BackCreate</button>
 </div>
 </div>
 </section>
 `;}

function teacherApprovalChannel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 const drafts = teacherdraftmaterials(scoped);
 const approved = teacherApprovedmaterials(scoped);
 const status = materialGenerationstatus || (drafts.length? "learningselectlearningdraft, confirmlearningpublishtopupil.": "currentlearningPendingpublishdraft.");
 return `
 <section class="layout-grid">
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">approvalpublish</p><h3>draftlearningwill learnpupil view</h3></div>
 <span class="status-pill warn">${drafts.length? "waitingteacher confirmation": "none yetdraft"}</span>
 </div>
 <p class="generation-status">${escapeHtml(status)}</p>
 <ul class="timeline-list">
 ${timeline("1", "Createlearninggenerate draft", "Handout, visual, practicelearningwillfirst learningPendingapprovallearning.")}
 ${timeline("2", "teacherreviewlearning", "confirmlearning, hardlearning, privacylearning andclass learning.")}
 ${timeline("3", "teacher clickspublish", "publishpupil viewmaterialslearningwill learn material.")}
 </ul>
 </div>
 <div class="panel">
 <div class="panel-header">
 <div><p class="mini-label">Pendingapprovalmaterial</p><h3>Before publishingfinallyconfirm</h3></div>
 <span class="status-pill">${drafts.length} draftsPendinglearning</span>
 </div>
 <ul class="material-review-list approval-materials">
 ${drafts.length? drafts.map(materialpublishItem).join(""): emptymaterialdraftState()}
 </ul>
 <div class="panel-header">
 <div><p class="mini-label">alreadypublish</p><h3>pupil viewlearning material</h3></div>
 <span class="status-pill">${approved.length} drafts</span>
 </div>
 <ul class="material-review-list approval-materials">
 ${approved.length? approved.map(materialpublishedItem).join(""): `
 <li><strong>learningpublishmaterial</strong><span>publishlearningwilldisplayin learning in, learningSyncpupil viewmaterialslearning.</span></li>
 `}
 </ul>
 <button class="plain-button" type="button" data-jump-channel="creation">BackCreate</button>
 </div>
 </section>
 `;}

function teacherApprovedmaterials(scoped) {const activeclassId = scoped?.activeclassId || TEACHER_CONTEXT.classId;
 return (scoped?.approvedmaterials || []).filter((item) => (!item.classId || item.classId === activeclassId) && item.status === "published").slice().sort((a, b) => String(b.publishedAt || b.createdAt || "").localeCompare(String(a.publishedAt || a.createdAt || "")));}

function materialpublishItem(material) {const draft = materialDisplay(material);
 return `
 <li>
 <strong>${escapeHtml(draft.type)} · ${escapeHtml(draft.title)}</strong>
 <span>${escapeHtml(draft.targetLevel || "learningsettingsLevel")} · ${escapeHtml(draft.goal || draft.teachernotes || "waitingnotes")}</span>
 <div class="action-row">
 <button class="primary-button" type="button" data-publish-material="${escapeAttr(material.id || "")}">publishtopupil</button>
 <button class="secondary-button" type="button" data-jump-channel="creation">BackEdit</button>
 </div>
 </li>
 `;}

function materialpublishedItem(material) {const draft = materialDisplay(material);
 const count = Array.isArray(material.publishedToAliases)? material.publishedToAliases.length: 0;
 return `
 <li>
 <strong>${escapeHtml(draft.type)} · ${escapeHtml(draft.title)}</strong>
 <span>alreadypublish · ${count? `${count} pupilslearning`: "whole class/learningjoinpupil learning"} · ${escapeHtml(draft.studentTask || draft.goal || "")}</span>
 </li>
 `;}

function publishmaterialdraftFromApproval(draftId, button) {const originalText = button?.textContent || "";
 const studentAliases = selectedpublishAliasesFordraft(draftId);
 if (button) {button.disabled = true;
 button.textContent = "publishin...";}
 materialGenerationstatus = "publishing to pupil view.";
 postmaterialpublish({id: draftId, studentAliases}).then((result) => {if (result.state) window.TeachFlowWorkspaceState.setState(result.state);
 latestgeneratedmaterial = null;
 teacherAgentBriefing = null;
 const actionCount = result.assignedActions?.length || 0;
 materialGenerationstatus = actionCount? `publishlearning, ${actionCount} pupilsnowcanviewlearning material.`: "publishlearning.current class pupil, learningjoinofpupil learningcanviewclassmaterial.";
 setChannel("approval");}).catch((error) => {materialGenerationstatus = materialErrormessage(error);
 if (button) {button.disabled = false;
 button.textContent = originalText || "publishtopupil";}
 setChannel("approval");});}

async function postmaterialpublish(payload) {if (!canUseteacherAgentApi()) {const state = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(state, TEACHER_CONTEXT);
 const draft = (state.draftmaterials || []).find((item) => item.id === payload.id);
 if (!draft) throw new Error("draft not found — generate again first.");
 const activeclass = (scoped.classes || []).find((item) => item.id === scoped.activeclassId) || {};
 const selectedAliases = Array.isArray(payload.studentAliases)? payload.studentAliases.filter(Boolean): Array.isArray(payload.targetAliases)? payload.targetAliases.filter(Boolean): (payload.targetAlias && payload.targetAlias!== "all"? [payload.targetAlias]: null);
 const aliases = selectedAliases!== null? selectedAliases: (Array.isArray(draft.targetAliases) && draft.targetAliases.length? draft.targetAliases: (activeclass.studentAliases || []));
 const now = new Date().toISOString();
 const publishedmaterial = {...draft,
 id: `approved-material-${Date.now()}`,
 sourcedraftId: draft.id,
 status: "published",
 approvedAt: now,
 publishedAt: now,
 publishedToAliases: aliases};
 state.approvedmaterials = [publishedmaterial,...(state.approvedmaterials || [])].slice(0, 100);
 state.draftmaterials = (state.draftmaterials || []).filter((item) => item.id!== draft.id);
 window.TeachFlowWorkspaceState.setState(state);
 return {publishedmaterial, assignedActions: [], state};}
 const response = await fetch("/api/workspace/material-drafts/publish", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 if (!response.ok) {const error = await response.json().catch(() => ({}));
 throw new Error(error.error || `material publish API ${response.status}`);}
 return response.json();}

function teacherCreationChannel() {const workspace = window.TeachFlowWorkspaceState.getState();
 const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
 const draft = latestgeneratedmaterial || latestmaterialdraft(scoped);
 const defaultTopic = materialDefaultTopic(scoped);
 const status = materialGenerationstatus || (draft? "alreadydraft, learningContinuegeneratelearningversionorEditPreview.": "selectmaterial typeslearning andpublishAudience, thengeneratelearningPreviewdraft.");

 return `
 <section class="creation-layout">
 <div class="panel material-maker">
 <div class="panel-header">
 <div><p class="mini-label">material studio</p><h3>cantowhole class, learningcanonlyto pupil</h3></div>
 <span class="status-pill warn">teacher approvallearningpublish</span>
 </div>
 <div class="material-type-grid">
 ${MATERIAL_TYPE_OPTIONS.map((item) => materialType(item.icon,
 item.title,
 item.detail,
 item.title === selectedmaterialType? "selectedlearning": "Tap to select",
 item.title === selectedmaterialType)).join("")}
 </div>

 <form class="maker-form" id="material-generator-form">
 <div class="maker-selected-row">
 <span>currentgenerate typeslearning</span>
 <strong data-selected-material-label>${escapeHtml(selectedmaterialType)}</strong>
 </div>
 <label>
 <span>publishAudience</span>
 <select name="targetAlias">
 ${studentTargetOptions(scoped)}
 </select>
 </label>
 <label>
 <span>material topic</span>
 <input name="topic" value="${escapeAttr(defaultTopic)}" placeholder="learning: learning is learning">
 </label>
 <label>
 <span>Creation goal</span>
 <textarea name="prompt" placeholder="learning AI learning materialquestion">pupil learning“learning is learning is learning”.learning in learningunderstandingof learning: learning is learning, learning is learning of learning; learning in learning inand learningsteadylearning, learning and learning.learning, notesimageonlyis learning.</textarea>
 </label>
 <div class="maker-field-grid">
 <label>
 <span>Target level</span>
 <select name="targetLevel">
 <option>Level 1 confused pupils</option>
 <option>Level 2 Developing</option>
 <option>Level 3 Ready to apply</option>
 </select>
 </label>
 <label>
 <span>outputlearninggood</span>
 <select name="formatHint">
 <option>teacher notesandpupil tasks</option>
 <option>learningsuitableclass learning</option>
 <option>learningsuitablepost-lesson review</option>
 </select>
 </label>
 </div>
 <p class="generation-status">${escapeHtml(status)}</p>
 <div class="action-row">
 <button class="primary-button" type="submit" data-generate-material>generatelearningPreview</button>
 <button class="secondary-button" type="button" data-jump-channel="approval">viewApproval</button>
 </div>
 </form>
 </div>

 <aside class="panel creation-preview">
 <div class="panel-header">
 <div><p class="mini-label">Preview</p><h3>${draft? "generatelearningContinue editing": "waitinggenerate"}</h3></div>
 <span class="status-pill">${draft? "latestdraft": "learning"}</span>
 </div>
 ${rendermaterialPreview(draft)}
 </aside>
 </section>
 `;}

function studentTargetOptions(scoped) {const students = scoped?.students || [];
 return [`<option value="all">All class pupils</option>`,...students.map((student) => `<option value="${escapeAttr(student.id)}">${escapeHtml(student.id)} · ${escapeHtml(student.status || "pupil")}</option>`)].join("");}

function generatematerialdraft(form) {const button = form.querySelector("[data-generate-material]");
 const payload = Object.fromEntries(new FormData(form).entries());
 payload.materialType = normalizematerialTypeForUi(selectedmaterialType);
 payload.type = payload.materialType;
 payload.kind = materialKindFromType(payload.materialType);
 payload.prompt = payload.prompt || payload.goal || "";
 if (payload.targetAlias && payload.targetAlias!== "all") {payload.targetAliases = [payload.targetAlias];
 payload.prompt = `${payload.prompt}\n\nlearning is learning to ${payload.targetAlias} of learningsupportmaterial, learningaccessible, pupil learning.`;}

 const originalText = button?.textContent || "";
 if (button) {button.disabled = true;
 button.textContent = payload.kind === "image"? "generatevisualin...": "Generating…";}
 materialGenerationstatus = payload.kind === "image"? "Generatingvisual, learningneeds learning; generatelearningwillinrightlearningdisplayrealvisual.": `Generating${payload.materialType}draft, learning.`;

 postmaterialdraft(payload).then((result) => {latestgeneratedmaterial = result.saveddraft || result.draft || null;
 if (result.state) window.TeachFlowWorkspaceState.setState(result.state);
 teacherAgentBriefing = null;
 const targetText = payload.targetAliases?.length? `, Goalpupil: ${payload.targetAliases.join(", ")}`: "";
 materialGenerationstatus = result.mode === "local" && result.error? `${payload.materialType}already usinglearningRulesgenerate${targetText}; real AI learningusable.`: `${payload.materialType}already generated${targetText}, rightlearningPreviewlearningContinuelearning.`;
 setChannel("creation");}).catch((error) => {materialGenerationstatus = materialErrormessage(error);
 if (button) {button.disabled = false;
 button.textContent = originalText || "generatelearningPreview";}
 setChannel("creation");});}

function materialpublishItem(material) {const draft = materialDisplay(material);
 const targets = Array.isArray(material.targetAliases) && material.targetAliases.length? material.targetAliases.join(", "): "All class pupils";
 return `
 <li>
 <strong>${escapeHtml(draft.type)} · ${escapeHtml(draft.title)}</strong>
 <span>publishAudience: ${escapeHtml(targets)} · ${escapeHtml(draft.targetLevel || "learningsettingsLevel")} · ${escapeHtml(draft.goal || draft.teachernotes || "waitingnotes")}</span>
 <div class="action-row">
 <button class="primary-button" type="button" data-publish-material="${escapeAttr(material.id || "")}">publishtopupil</button>
 <button class="secondary-button" type="button" data-jump-channel="creation">BackEdit</button>
 </div>
 </li>
 `;}

function materialpublishItem(material) {const draft = materialDisplay(material);
 const targets = Array.isArray(material.targetAliases) && material.targetAliases.length? material.targetAliases.join(", "): "All class pupils";
 return `
 <li>
 <strong>${escapeHtml(draft.type)} · ${escapeHtml(draft.title)}</strong>
 <span>draftGoal: ${escapeHtml(targets)} · ${escapeHtml(draft.targetLevel || "learningsettingsLevel")} · ${escapeHtml(draft.goal || draft.teachernotes || "waitingnotes")}</span>
 <div class="action-row material-publish-actions">
 <label class="material-publish-target">
 <span>publishAudience</span>
 <select data-publish-target="${escapeAttr(material.id || "")}" aria-label="selectpublishAudience">
 ${materialpublishTargetOptions(material)}
 </select>
 </label>
 <button class="primary-button" type="button" data-publish-material="${escapeAttr(material.id || "")}">publishtopupil</button>
 <button class="secondary-button" type="button" data-jump-channel="creation">BackEdit</button>
 </div>
 </li>
 `;}

document.addEventListener("click", (event) => {const publishButton = event.target.closest?.("[data-publish-material]");
 if (!publishButton) return;
 event.preventDefault();
 publishmaterialdraftFromApproval(publishButton.dataset.publishmaterial, publishButton);});

function normalizeteacherStaticcopy() {channels.analysis.title = "class insights";
 channels.analysis.html = () => teacherAnalysisChannel();
 channels.creation.title = "Create handouts, visuals and practice";
 channels.approval.title = "approval, learningpublishandpupil learning material";
 const creationMeta = document.querySelector('[data-channel="creation"] small');
 if (creationMeta) creationMeta.textContent = "visual, Handout, practice";
 const approvalMeta = document.querySelector('[data-channel="approval"] small');
 if (approvalMeta) approvalMeta.textContent = "review, versions, publish";}

document.addEventListener("click", (event) => {const materialButton = event.target.closest?.("[data-material-type]");
 if (!materialButton) return;
 setTimeout(() => {document.querySelectorAll("[data-material-type]").forEach((item) => {const status = item.querySelector("em");
 if (status) status.textContent = item.dataset.materialType === selectedmaterialType? "selectedlearning": "Tap to select";});}, 0);});

normalizeteacherStaticcopy();
ensureteacherCommandBar();
setChannel(channelFromLocation());
window.scrollTo(0, 0);

if (window.TeachFlowSessionPromise) {window.TeachFlowSessionPromise.then(() => {teacherAgentBriefing = null;
 setChannel(activeteacherChannelId);}).catch(() => null);}

window.addEventListener("hashchange", () => {const nextChannel = channelFromLocation();
 if (nextChannel!== activeteacherChannelId) setChannel(nextChannel);});

setInterval(() => {if (isteachermessagedraftActive()) return;
 syncteacherWorkspace(activeteacherChannelId);}, 5000);
