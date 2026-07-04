const ADMIN_CONTEXT = {role: "school_admin",
 userId: "school-admin-demo",
 classId: "class-physics-a"};

let adminWorkspace = null;
let activeAdminChannel = "overview";

const adminChannels = {overview: {kicker: "school overview",
 title: "AI teaching system status",
 html: () => `
 <section class="admin-metric-grid">
 ${adminMetric("Pilot classes", `${aggregate().classCount || 0}`, "class spaces connected to TeachFlow")}
 ${adminMetric("Anonymised pupil aliases", `${aggregate().studentAliasCount || 0}`, "Aggregate counts only; no pupil-level detail")}
 ${adminMetric("assignment submission rate", `${aggregate().submittedRate || 0}%`, "From pupil view submission status")}
 ${adminMetric("needs support share", `${aggregate().supportRate || 0}%`, "Aggregated by Level 1 / needs support")}
 </section>

 ${comparisonHighlights()}

 <section class="admin-grid">
 <article class="admin-panel">
 <div class="panel-header">
 <div><p class="mini-label">Operations summary</p><h3>${escapeHtml(aggregate().schoolName || "TeachFlow pilot school")}</h3></div>
 <span class="status-pill">${pilotReadiness().label}</span>
 </div>
 <div class="admin-summary-list">
 ${summaryItem("pupil view signals", `${aggregate().stuckSignalCount || 0} stuck signals, ${aggregate().questionCount || 0} question records`)}
 ${summaryItem("teacher workflow", `${workspace().draftmaterials.length} draft materials, ${workspace().approvedmaterials.length} approved materials`)}
 ${summaryItem("System suggestion", pilotReadiness().next)}
 </div>
 </article>

 <article class="admin-panel">
 <div class="panel-header">
 <div><p class="mini-label">Today's board</p><h3>Top three priorities from the school agent</h3></div>
 <button class="secondary-button" type="button" data-admin-jump="agent">view details</button>
 </div>
 <div class="admin-action-stack">
 ${agentActions().slice(0, 3).map(agentActionCard).join("")}
 </div>
 </article>
 </section>
 `},
 classes: {kicker: "class pilots",
 title: "AI teaching pilot progress by class",
 html: () => `
 ${comparisonPanel()}
 <section class="admin-panel">
 <div class="panel-header">
 <div><p class="mini-label">class spaces</p><h3>Aggregated pilot class status</h3></div>
 <span class="status-pill">Aggregated view</span>
 </div>
 <div class="admin-class-grid">
 ${aggregate().classes.map(classCard).join("")}
 </div>
 </section>
 `},
 agent: {kicker: "school agent",
 title: "school copilot next-step suggestions",
 html: () => `
 <section class="admin-grid">
 <article class="admin-panel agent-panel">
 <div class="panel-header">
 <div><p class="mini-label">AI school System Agent</p><h3>${pilotReadiness().label}</h3></div>
 <span class="status-pill warn">school decision support</span>
 </div>
 <p class="agent-brief">${escapeHtml(agentBrief())}</p>
 <div class="admin-action-stack">
 ${agentActions().map(agentActionCard).join("")}
 </div>
 </article>

 <article class="admin-panel">
 <div class="panel-header">
 <div><p class="mini-label">Agent learning</p><h3>learning ofschool learning</h3></div>
 </div>
 <ul class="admin-list">
 ${memoryList().map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
 </ul>
 </article>
 </section>
 `},
 architecture: {kicker: "System architecture",
 title: "AI school Agent System learning",
 html: () => `
 <section class="architecture-hero">
 <div>
 <p class="mini-label">diagram</p>
 <h3>student learningsupport, Wellbeingsignal, classanonymousevidence, teacher approvalandschool learningmustlearning</h3>
 </div>
 <span class="status-pill warn">AI drafts. teachers decide.</span>
 </section>

 ${architectureFlow()}

 <section class="admin-grid">
 <article class="admin-panel">
 <div class="panel-header">
 <div><p class="mini-label">learning</p><h3>learning</h3></div>
 </div>
 <div class="architecture-module-grid">
 ${architectureModule("student learning", "only student learning: learningconcept, logindividualstuck point, learningdraft, learningassignment.")}
 ${architectureModule("AI wellbeing assistant", "student learningstressand learning, turnmoodstuck pointsupportlearning, learningdiagnosis.")}
 ${architectureModule("learningsignallearning", "turnstudentquestionandstuck pointevidence: learning, knowledgelearning, stuck point, evidencelearning.")}
 ${architectureModule("Governance and safety", "learninganonymouslearning, permissions, learning, learning, teacher approval, learning, learningpublish.")}
 ${architectureModule("teacher Agent", "learninganonymousevidence, Wellbeinglearning andcourselearninggeneratediagnosis, learningsuggestionandfollow-uplearning.")}
 ${architectureModule("teacher-approved content library", "pupil viewpriorityteacheralreadyofexplanation, learning, diagramlearning andtask.")}
 ${architectureModule("learning", "studentcomplete micro-quiz, reflectionandpracticelearning, learningunderstandingteacher learning.")}
 </div>
 </article>

 <article class="admin-panel">
 <div class="panel-header">
 <div><p class="mini-label">versionlearning</p><h3>nowlearning, learningthen learning</h3></div>
 </div>
 ${scopePanel()}
 </article>
 </section>
 `},
 pilot: {kicker: "Pilot roadmap",
 title: "class learningschool learning",
 html: () => `
 <section class="admin-panel">
 <div class="panel-header">
 <div><p class="mini-label">diagram</p><h3>turn TeachFlow learningschool learning</h3></div>
 <span class="status-pill">${pilotReadiness().stage}</span>
 </div>
 <div class="pilot-roadmap">
 ${roadmapStep("1", "completelearning", "teacher view, pupil view, school learning workspace learning.", "done")}
 ${roadmapStep("2", "class learning", "learning 2-3 student learning/learning ofanonymouslearning.", "active")}
 ${roadmapStep("3", "learningschool-levellearning", "learningviewclass learning, teacher learning, pupil supportlearning.", "active")}
 ${roadmapStep("4", "learningreallearning", "learning, teacher learning, learning.", "next")}
 </div>
 </section>
 `},
 audit: {kicker: "Audit summary",
 title: "school admin viewviewlearning of learning",
 html: () => `
 <section class="admin-grid">
 <article class="admin-panel">
 <div class="panel-header">
 <div><p class="mini-label">learning</p><h3>actionlearning</h3></div>
 <span class="status-pill">learning</span>
 </div>
 <div class="audit-action-grid">
 ${Object.entries(aggregate().auditByAction || {}).map(([action, count]) => auditAction(action, count)).join("") || emptyState("none yetaction")}
 </div>
 </article>
 <article class="admin-panel">
 <div class="panel-header">
 <div><p class="mini-label">learning</p><h3>pupil-levellearning of learning</h3></div>
 </div>
 <ul class="admin-list compact">
 ${(aggregate().latestAudit || []).map(auditEvent).join("") || `<li>${emptyState("none yet")}</li>`}
 </ul>
 </article>
 </section>
 `}};

document.addEventListener("DOMContentLoaded", () => {waitForAuthReady().then((ready) => {if (!ready) return;
 loadWorkspace().then(() => {bindAdminNavigation();
 renderAdmin();});});});

async function waitForAuthReady(startedAt = Date.now()) {if (document.body.classList.contains("auth-ready")) return true;
 if (document.body.classList.contains("auth-gate-open")) return false;
 if (Date.now() - startedAt > 5000) return false;
 await new Promise((resolve) => setTimeout(resolve, 50));
 return waitForAuthReady(startedAt);}

async function loadWorkspace() {const raw = await window.TeachFlowWorkspaceState.syncFromServer(ADMIN_CONTEXT);
 adminWorkspace = raw.session?.role === "school_admin" && raw.schoolAggregate? raw: window.TeachFlowWorkspaceState.scopedStateForContext(raw, ADMIN_CONTEXT);
 window.addEventListener("teachflow-workspace-updated", () => {const next = window.TeachFlowWorkspaceState.getState();
 adminWorkspace = window.TeachFlowWorkspaceState.scopedStateForContext(next, ADMIN_CONTEXT);
 renderAdmin();});}

function bindAdminNavigation() {document.querySelectorAll("[data-admin-channel]").forEach((button) => {button.addEventListener("click", () => {activeAdminChannel = button.dataset.adminChannel;
 renderAdmin();});});
 document.querySelectorAll("[data-admin-top-channel]").forEach((button) => {button.addEventListener("click", () => {activeAdminChannel = button.dataset.adminTopChannel;
 renderAdmin();});});}

function renderAdmin() {const channel = adminChannels[activeAdminChannel] || adminChannels.overview;
 document.querySelectorAll("[data-admin-channel]").forEach((button) => {button.classList.toggle("active", button.dataset.adminChannel === activeAdminChannel);});
 const kicker = document.getElementById("admin-kicker");
 const title = document.getElementById("admin-title");
 const schoolName = document.getElementById("admin-school-name");
 const content = document.getElementById("admin-content");
 if (kicker) kicker.textContent = channel.kicker;
 if (title) title.textContent = channel.title;
 if (schoolName) schoolName.textContent = aggregate().schoolName || "TeachFlow pilot school";
 if (content) content.innerHTML = channel.html();
 bindInlineJumps();
 compactAdminPanels();}

function bindInlineJumps() {document.querySelectorAll("[data-admin-jump]").forEach((button) => {button.addEventListener("click", () => {activeAdminChannel = button.dataset.adminJump;
 renderAdmin();});});}

function compactAdminPanels() {makeAdminCompactDisclosure(".agent-panel +.admin-panel.admin-list", "view Agent learning", "school-level");
 makeAdminCompactDisclosure(".pilot-roadmap", "viewlearningPilot roadmap", "learning");
 makeAdminCompactDisclosure(".admin-list.compact", "viewlearning", "learning");}

function makeAdminCompactDisclosure(selector, title, meta) {document.querySelectorAll(selector).forEach((node) => {if (node.closest("details") || node.dataset.compacted === "true") return;
 const details = document.createElement("details");
 details.className = "admin-compact-disclosure compacted-detail";
 details.dataset.compacted = "true";
 details.innerHTML = `
 <summary><span>${escapeHtml(title)}</span><em>${escapeHtml(meta || "learning")}</em></summary>
 <div class="admin-compact-body">${node.outerHTML}</div>
 `;
 node.replaceWith(details);});}

function workspace() {return adminWorkspace || window.TeachFlowWorkspaceState.scopedStateForContext(window.TeachFlowWorkspaceState.getState(),
 ADMIN_CONTEXT);}

function aggregate() {return workspace().schoolAggregate || {classes: [],
 auditByAction: {},
 latestAudit: []};}

function pilotReadiness() {const data = aggregate();
 if (!data.classCount) {return {label: "waiting", stage: "learning in", next: "first learningPilot classeslearning."};}
 if ((data.submittedRate || 0) >= 70 && (data.supportRate || 0) <= 25) {return {label: "learningsteady", stage: "learning", next: "can learnclassor learning."};}
 if ((data.stuckSignalCount || 0) > 0 || (data.questionCount || 0) > 0) {return {label: "needsfollow-up", stage: "learning in", next: "first teacher pupil viewsynclearning ofstuck pointandquestion."};}
 return {label: "learning", stage: "learning in", next: "pupil viewcompletelearningassignmentandstuck point."};}

function agentBrief() {const data = aggregate();
 return `${data.schoolName || "current school"}already ${data.classCount || 0} learningPilot classes, learning ${data.studentAliasCount || 0} learningAnonymised pupil aliases.school-level Agent suggestionfirstviewsupportlearning, assignment submission rateandteacher approvallearning, then learning is learning.`;}

function agentActions() {const data = aggregate();
 const actions = [];
 if ((data.needsSupportCount || 0) > 0) {actions.push({title: "teacher learningsupportlearning",
 detail: `${data.needsSupportCount} learningAnonymised pupil aliaseslearning Level 1 orneeds supportstatus.`,
 next: "teacherinclass insightsinprioritydiagram, formula, stuck point."});}
 if ((data.submittedRate || 0) < 70) {actions.push({title: "learningassignmentcompletelearning",
 detail: `currentassignment submission ratelearning ${data.submittedRate || 0}%.`,
 next: "teacherpublishlearning ofsubmittask, first learningdiagnosis learning."});}
 if ((data.stuckSignalCount || 0) > 0 || (data.questionCount || 0) > 0) {actions.push({title: "turnpupil view signalsaction",
 detail: `learning ${data.stuckSignalCount || 0} stuck pointand ${data.questionCount || 0} question.`,
 next: "turnstuck point of 5 learning material."});}
 actions.push({title: "learning material",
 detail: `${workspace().approvedmaterials.length} learning material, ${workspace().draftmaterials.length} learning materialindraft.`,
 next: "turnApproved materialslearningschool learning."});
 return actions;}

function memoryList() {const data = aggregate();
 return [`school: ${data.schoolName || "TeachFlow pilot school"}`,
 `Pilot classes: ${data.classCount || 0} learning`,
 `Anonymised pupil aliases: ${data.studentAliasCount || 0} learning`,
 `pupil view signals: ${data.stuckSignalCount || 0} stuck point, ${data.questionCount || 0} question`,
 `materialstatus: ${workspace().approvedmaterials.length} learning, ${workspace().draftmaterials.length} learningdraft`];}

function architectureFlow() {const stages = [{label: "pupil viewlearning",
 title: "question / assignment / stuck point / Progress",
 detail: "studentin learning of learningcompleteaction, learningsignal."},
 {label: "student learning",
 title: "learningsupportandindividuallearning",
 detail: "priorityteacher-approvedmaterial, learningdraft."},
 {label: "AI wellbeing assistant",
 title: "learningstress, learning and learning ofreason",
 detail: "supportstudentturnmoodlearning of question, learningdiagnosis."},
 {label: "learningmoodsignallearning",
 title: "learning / learning / ongoingstress / safetylearning",
 detail: "onlyoutputlearningsupportlearning; safetylearningneedshumanlearning, learning is AI learning.",
 tone: "safety"},
 {label: "learningsignallearning",
 title: "turnfor learningevidence",
 detail: "only learning andLearning objectivelearning ofanonymousevidence, learningturnlearning toteacher."},
 {label: "Governance and safety",
 title: "permissions, anonymouslearning, learning and learning",
 detail: "learning Agent outputlearningsafetylearning: learning, learningdiagnosis, learning, learningpublish.",
 tone: "safety"},
 {label: "classanonymousevidencelearning",
 title: "learning + evidence + stuck point",
 detail: "teachers seeofis learningdiagnosisevidence, learning isreallearning or learningprivacy."},
 {label: "courselearning",
 title: "goal / learning / assignment / learning intervention",
 detail: "teacher Agent ofsuggestionmustlearningcurrentcourse, learning is learning."},
 {label: "teacher Agent",
 title: "diagnosis, learningsuggestion, Intervention, teacher Inbox",
 detail: "supportteacher class learning in learningunderstand, learningneedsfirstview, learningsupportlearning."},
 {label: "teacher approval and control",
 title: "Edit / Approve / Reject / export / publish / Rollback",
 detail: "AI onlygenerate draft, teacher learning is learningpublish, learningversionand learninglog.",
 tone: "control"},
 {label: "teacher-approved content library",
 title: "explanation / learning / diagramlearning / task / learning",
 detail: "pupil viewlearninglearning in, thenpublishtofor learning orclass."},
 {label: "learning",
 title: "micro-quiz / reflection / practice",
 detail: "studentcompletetasklearning, learning ofevidencethen learningsignallearning, learning."}];

 return `
 <section class="architecture-flow" aria-label="AI school Agent System learning">
 ${stages.map(architectureNode).join("")}
 </section>
 `;}

function architectureNode(item, index) {const arrow = index === 0? "": `<span class="architecture-arrow" aria-hidden="true">→</span>`;
 return `
 <article class="architecture-node ${escapeAttr(item.tone || "")}">
 ${arrow}
 <div class="architecture-node-index">${index + 1}</div>
 <div>
 <span>${escapeHtml(item.label)}</span>
 <strong>${escapeHtml(item.title)}</strong>
 <p>${escapeHtml(item.detail)}</p>
 </div>
 </article>
 `;}

function architectureModule(title, detail) {return `
 <div class="architecture-module">
 <strong>${escapeHtml(title)}</strong>
 <span>${escapeHtml(detail)}</span>
 </div>
 `;}

function scopePanel() {const now = ["teacher view, pupil view, school admin view",
 "anonymousevidence, Diagnosis, Intervention",
 "Student Check-in andWellbeinglearning",
 "teacher approval, versionlog, export, publish, learning",
 "studentassignment, question, stuck pointsyncteacher view",
 "moreclass learning andschool learning for learning"];
 const later = ["learning ofstudent learning",
 "learning of learningsignallearning",
 "teacher Inbox of actionandstatuslearning",
 "school safeguarding roleand learning",
 "teacher-approved content libraryof learning, learning andpublishlearning",
 "interventionlearning andschool-levellearning",
 "productionlearning, datalearning, safetylearning andreal AI learning"];

 return `
 <div class="scope-split">
 <div>
 <span>v0.1 / currentfirst learning</span>
 <ul>${now.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
 </div>
 <div>
 <span>v0.2+ / learning</span>
 <ul>${later.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
 </div>
 </div>
 `;}

function comparisonHighlights() {const comparison = aggregate().comparison || {};
 return `
 <section class="comparison-highlight-grid">
 ${comparisonHighlight("highestsupportlearning", comparison.highestSupportclass, (item) => `${item.supportRate}% needs support · stuck point: ${item.dominantNeed}`)}
 ${comparisonHighlight("submitlearning", comparison.lowestSubmissionclass, (item) => `${item.submittedRate}% submitted · needs learning`)}
 ${comparisonHighlight("pupil viewlearning", comparison.mostActiveclass, (item) => `${item.activityScore} learning · stuck point/questionlearning in`)}
 ${comparisonHighlight("learningsuitablelearning", comparison.mostReadyclass, (item) => `${item.submittedRate}% submit · ${item.supportRate}% supportlearning`)}
 </section>
 `;}

function comparisonHighlight(label, item, noteFor) {if (!item) return `<article class="comparison-highlight"><span>${escapeHtml(label)}</span><strong>none yetdata</strong><small>waitingclass learning</small></article>`;
 return `
 <article class="comparison-highlight">
 <span>${escapeHtml(label)}</span>
 <strong>${escapeHtml(item.name)}</strong>
 <small>${escapeHtml(noteFor(item))}</small>
 </article>
 `;}

function comparisonPanel() {const rows = aggregate().classes || [];
 return `
 <section class="admin-panel comparison-panel">
 <div class="panel-header">
 <div><p class="mini-label">learning for learning</p><h3>classsubmitlearning, supportlearning and learning</h3></div>
 <span class="status-pill">moreclass demo</span>
 </div>
 <div class="comparison-table">
 ${rows.map(classComparisonRow).join("") || emptyState("none yetclassfor learningdata")}
 </div>
 </section>
 `;}

function classComparisonRow(item) {return `
 <article class="comparison-row">
 <div class="comparison-class">
 <strong>${escapeHtml(item.name)}</strong>
 <span>${escapeHtml(item.topic)} · ${escapeHtml(item.readinessLabel || "Pilot active")}</span>
 </div>
 ${comparisonBar("submit", item.submittedRate, "submit")}
 ${comparisonBar("support", item.supportRate, "support")}
 ${comparisonBar("learning", item.activityScore, "activity")}
 <div class="comparison-next">
 <span>next step</span>
 <strong>${escapeHtml(nextActionForclass(item))}</strong>
 </div>
 </article>
 `;}

function comparisonBar(label, value, tone) {const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
 return `
 <div class="comparison-bar ${escapeAttr(tone)}">
 <span>${escapeHtml(label)} · ${safeValue}%</span>
 <div><i style="width: ${safeValue}%"></i></div>
 </div>
 `;}

function nextActionForclass(item) {if ((item.supportRate || 0) >= 30) return `first learning ${item.dominantNeed || "stuck point"}`;
 if ((item.submittedRate || 0) < 60) return "learningassignmentsubmit";
 if ((item.activityScore || 0) >= 80) return "learning";
 return "learningsignal";}

function adminMetric(label, value, note) {return `<article class="admin-metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;}

function summaryItem(label, value) {return `<div class="summary-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;}

function classCard(item) {return `
 <article class="class-card">
 <div class="class-card-header">
 <div>
 <span>${escapeHtml(item.course || "course")}</span>
 <h3>${escapeHtml(item.name)}</h3>
 </div>
 <em>${escapeHtml(item.status || "Pilot active")}</em>
 </div>
 <p>${escapeHtml(item.topic || "current topiclearningconfirm")}</p>
 <div class="class-stats">
 ${smallStat("learning", item.studentAliasCount)}
 ${smallStat("submit", `${item.submittedRate}%`)}
 ${smallStat("support", `${item.supportRate}%`)}
 ${smallStat("learning", item.attentionScore)}
 </div>
 <div class="class-card-foot">
 <span>${escapeHtml(item.readinessLabel || "Pilot active")}</span>
 <strong>${escapeHtml(nextActionForclass(item))}</strong>
 </div>
 <div class="need-tags">
 ${(item.topneeds || []).map((need) => `<span>${escapeHtml(need.label)} · ${escapeHtml(need.count)}</span>`).join("")}
 </div>
 </article>
 `;}

function smallStat(label, value) {return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;}

function agentActionCard(item) {return `
 <article class="agent-action-card">
 <strong>${escapeHtml(item.title)}</strong>
 <p>${escapeHtml(item.detail)}</p>
 <span>${escapeHtml(item.next)}</span>
 </article>
 `;}

function roadmapStep(number, title, detail, status) {return `
 <article class="roadmap-step ${escapeAttr(status)}">
 <span>${escapeHtml(number)}</span>
 <div>
 <strong>${escapeHtml(title)}</strong>
 <p>${escapeHtml(detail)}</p>
 </div>
 </article>
 `;}

function auditAction(action, count) {return `<div class="audit-chip"><span>${escapeHtml(action)}</span><strong>${escapeHtml(count)}</strong></div>`;}

function auditEvent(event) {return `<li><strong>${escapeHtml(event.action)}</strong><span>${escapeHtml(event.role)} · ${escapeHtml(event.classId || "learning")} · ${formattime(event.timestamp)}</span></li>`;}

function emptyState(text) {return `<div class="empty-state">${escapeHtml(text)}</div>`;}

function formattime(value) {if (!value) return "none yet";
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return value;
 return date.toLocaleString("zh-CN", {hour12: false});}

function escapeHtml(value) {return String(value?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");}

function escapeAttr(value) {return escapeHtml(value);}
