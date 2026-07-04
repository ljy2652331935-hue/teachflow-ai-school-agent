const views = [{id: "agent", label: "AI schoolSystem Agent", kicker: "Systemcoordinator"},
 {id: "workspace", label: "teacher workspace", kicker: "Coursesettings"},
 {id: "responses", label: "pupil response entry", kicker: "Anonymisedentry"},
 {id: "map", label: "Misconception map", kicker: "Diagnosis learning"},
 {id: "evidence", label: "evidence review", kicker: "teacher review"},
 {id: "intervention", label: "intervention generate learning", kicker: "Teaching plan"},
 {id: "approval", label: "Approval and export", kicker: "teacher control"},
 {id: "memory", label: "pupil memory", kicker: "Learning memory"},
 {id: "student", label: "pupil portal lite", kicker: "Approved materials"},
 {id: "understanding", label: "understanding map", kicker: "learning status"}];

let state = createInitialState();

document.addEventListener("DOMContentLoaded", () => {addAudit("Diagnosis learning already learning");
 document.addEventListener("click", (event) => {const actionButton = event.target.closest("[data-action]");
 if (actionButton) {handleAction(actionButton.dataset.action, actionButton);}});
 render();});

function createInitialState() {const seed = structuredClone(window.TEACHFLOW_SEED);
 return {view: "agent",
 workspace: seed.workspace,
 rawResponses: seed.workspace.quiz_responses_csv,
 parsedResponses: window.TeachFlowDiagnosisEngine.parseQuizResponses(seed.workspace.quiz_responses_csv),
 analysis: null,
 editableJson: "",
 intervention: null,
 editableInterventionJson: "",
 interventionstatus: "draft",
 sectionApprovals: window.TeachFlowControlLayer.createSectionApprovals(null),
 versionHistory: [],
 exportPackages: [],
 activeexportPackage: null,
 exportPreviewOpen: false,
 rollbackEvents: [],
 studentMemories: [],
 studentassignments: [],
 studentReflections: [],
 studentMicroQuizAttempts: [],
 understandingMapNodes: [],
 studentStuckSignals: [],
 stuckSignaldraft: "",
 selectedStuckType: "diagram",
 alternateExplanations: {},
 assignedUnderstandingActions: [],
 schoolAgentBrief: "",
 selectedStudentAlias: "S002",
 studentReflectiondraft: "",
 memoryFilter: "all",
 microQuizResponses: `student_id,answer
S002,"Wave mechanicslearningfrequencylearning signal"
S004,"learning support learning in learning or learning signalin learningfrequency"`,
 followupAnalysis: null,
 activeSectionKey: "revised_teaching_plan",
 sectionEditorJson: "",
 editMode: false,
 approval: seed.approval,
 interventionApproval: {id: "intervention-approval-demo-001",
 status: "draft",
 version: 0,
 approved_by: null,
 approved_at: null},
 audit: []};}

function render() {renderNavigation();
 renderstatus();
 renderAuditMini();

 const activeview = views.find((view) => view.id === state.view);
 document.getElementById("view-title").textContent = activeview.label;
 document.getElementById("view-kicker").textContent = activeview.kicker;

 const renderers = {agent: renderschoolAgentConsole,
 workspace: renderWorkspace,
 responses: renderResponses,
 map: renderMisconceptionMap,
 evidence: renderevidencereview,
 intervention: renderInterventionStudio,
 approval: renderApprovalexport,
 memory: renderStudentMemory,
 student: renderStudentPortal,
 understanding: renderUnderstandingMap};

 document.getElementById("app").innerHTML = renderers[state.view]();
 bindInteractions();}

function renderNavigation() {document.getElementById("nav-list").innerHTML = views.map((view) => `
 <button class="nav-item ${state.view === view.id? "active": ""}" type="button" data-nav="${view.id}">
 <span>${escapeHtml(view.kicker)}</span>
 <strong>${escapeHtml(view.label)}</strong>
 </button>
 `).join("");}

function renderstatus() {const status = document.getElementById("workflow-status");
 const visiblestatus = state.view === "agent"? formatAgentReadiness(currentschoolAgentState().readiness_level): state.view === "understanding" && state.understandingMapNodes.length? "diagram learning": state.view === "student" && state.studentAssignments.length? "already publish": state.view === "memory" && state.studentMemories.length? "learning alreadyupdate": ["intervention", "approval"].includes(state.view) && state.intervention? window.TeachFlowControlLayer.formatstatus(state.interventionstatus): state.approval.status;
 status.textContent = visiblestatus;
 status.className = `status-value ${statusClass(visiblestatus)}`;}

function renderAuditMini() {const list = document.getElementById("audit-mini-list");
 document.getElementById("audit-count").textContent = String(state.audit.length);
 list.innerHTML = state.audit.slice(-7).map((entry) => `<li><time>${escapeHtml(entry.time)}</time><span>${escapeHtml(entry.text)}</span></li>`).join("");}

function renderschoolAgentConsole() {const agentState = currentschoolAgentState();
 const brief = state.schoolAgentBrief || window.TeachFlowschoolAgentEngine.buildMorningBrief(schoolAgentInput());
 const highPriorityCount = agentState.priorities.filter((item) => item.severity === "high").length;

 return `
 <div class="agent-console-layout">
 <section class="panel agent-main-panel">
 <div class="section-heading split-heading">
 <div>
 <p class="eyebrow">AI school System Agent · Morning Brief</p>
 <h3>Systemlearning: ${escapeHtml(formatAgentReadiness(agentState.readiness_level))}</h3>
 </div>
 <span class="pill">${escapeHtml(agentState.mode)}</span>
 </div>

 ${renderReadinessStepper(agentState.readiness_level)}

 <p class="student-note">${escapeHtml(agentState.summary)}</p>

 ${renderAgentMetrics(highPriorityCount)}

 <div class="agent-next-action">
 <span>Next step action</span>
 <strong>${escapeHtml(agentState.next_best_action)}</strong>
 </div>
 <div class="editor-actions multi-actions">
 <button class="primary-button" type="button" data-action="refresh-agent-brief">refresh Agent learning</button>
 <button class="secondary-button" type="button" data-action="go-understanding-map" ${state.analysis? "": "disabled"}>Openunderstanding map</button>
 </div>

 <div class="section-heading split-heading" style="margin-top:24px;">
 <div>
 <p class="eyebrow">prioritylearning</p>
 <h3>Agent Suggestedofaction learning</h3>
 </div>
 <span class="pill muted-pill">${agentState.priorities.length} items</span>
 </div>
 <div class="agent-priority-grid">
 ${agentState.priorities.map((item, index) => `
 <article class="agent-priority-card severity-${statusClass(item.severity)}">
 <div class="card-topline">
 <span>${index + 1} · ${escapeHtml(formatPriorityLane(item.lane))}</span>
 <strong class="severity severity-${statusClass(item.severity)}">${escapeHtml(formatSeverity(item.severity))}</strong>
 </div>
 <h4>${escapeHtml(item.action)}</h4>
 <p>${escapeHtml(item.evidence)}</p>
 <p class="hint">→ ${escapeHtml(item.next_step)}</p>
 </article>
 `).join("")}
 </div>
 </section>

 <aside class="panel agent-side-panel">
 <div class="section-heading">
 <p class="eyebrow">safety learning</p>
 <h3>school learningPilotRules</h3>
 </div>
 <ul class="guardrail-list">
 ${agentState.guardrails.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
 </ul>
 <div class="brief-box submission-review-block">
 <h4>learning (learning copy) </h4>
 <textarea rows="16" readonly>${escapeHtml(brief)}</textarea>
 </div>
 </aside>
 </div>
 `;}

const READINESS_STAGES = [{key: "setup", label: "learning"},
 {key: "diagnosis_ready", label: "Diagnosis"},
 {key: "teacher_review", label: "approval"},
 {key: "approved_materials", label: "export"},
 {key: "student_support_ready", label: "publish"},
 {key: "pilot_ready", label: "Pilot"}];

function renderReadinessStepper(readinessLevel) {const currentIndex = READINESS_STAGES.findIndex((stage) => stage.key === readinessLevel);
 return `
 <div class="readiness-stepper" aria-label="SystemlearningProgress">
 ${READINESS_STAGES.map((stage, index) => {const stageclass = index < currentIndex? "done": index === currentIndex? "current": "";
 const mark = index < currentIndex? "✓": String(index + 1);
 return `
 <div class="stepper-node ${stageclass}">
 <span class="stepper-dot">${mark}</span>
 <small>${escapeHtml(stage.label)}</small>
 </div>
 `;}).join("")}
 </div>
 `;}

function renderAgentMetrics(highPriorityCount) {const misconceptionCount = state.analysis?.misconceptions?.length || 0;
 const aliasCount = new Set([...state.studentMemories.map((item) => item.student_alias),...state.studentAssignments.map((item) => item.student_alias)]).size;
 const needsSupportCount = state.understandingMapNodes.filter((node) => node.status === "needs_support").length;

 const cards = [{value: misconceptionCount, label: "Diagnosis learning ofMisconception", accent: ""},
 {value: aliasCount, label: "in learning anonymised alias", accent: "accent-success"},
 {value: needsSupportCount, label: "learning supportof learning", accent: needsSupportCount? "accent-warn": ""},
 {value: highPriorityCount, label: "priorityaction", accent: highPriorityCount? "accent-danger": ""}];

 return `
 <div class="metric-grid">
 ${cards.map((card) => `
 <div class="metric-card ${card.accent}">
 <div class="metric-value">${escapeHtml(String(card.value))}</div>
 <div class="metric-label">${escapeHtml(card.label)}</div>
 </div>
 `).join("")}
 </div>
 `;}

function renderWorkspace() {return `
 <div class="workspace-grid">
 <section class="hero-panel">
 <div class="hero-copy">
 <p class="eyebrow">MisconceptionDiagnosisEngine</p>
 <h3>learning evidence pupil learningunderstandingof learning.</h3>
 <p>teacher-only workflow.learning, learningrealnames, pupilChatlearning.learning diagnosis learningmustquoteAnonymised pupil quotes.</p>
 <div class="alias-row" style="margin-top:16px;">
 <span>①&nbsp;settingsTopic</span>
 <span>②&nbsp;response</span>
 <span>③&nbsp;generate diagnosis</span>
 <span>④&nbsp;Approval</span>
 </div>
 <div class="hero-actions">
 <button class="primary-button" type="button" data-action="save-workspace">SavedTopic</button>
 <button class="success-button" type="button" data-action="go-responses">Next step: pupil response</button>
 </div>
 </div>
 <div class="principle-list">
 <h4>outputRules</h4>
 <ul>
 <li>learning evidence.</li>
 <li>only learning status learning.</li>
 <li>learningunderstanding, learning.</li>
 <li>teachers can edit, approvalandexport.</li>
 </ul>
 </div>
 </section>

 <section class="panel">
 <div class="section-heading">
 <p class="eyebrow">Course</p>
 <h3>learning courseandTopic</h3>
 </div>
 <div class="form-grid two">
 <label>teacherDisplay name<input id="teacher-name" value="${escapeAttr(state.workspace.teacher.display_name)}"></label>
 <label>Course<input id="course-title" value="${escapeAttr(state.workspace.course.title)}"></label>
 <label>class<input id="class-name" value="${escapeAttr(state.workspace.class.name)}"></label>
 <label>Topic<input id="topic-title" value="${escapeAttr(state.workspace.topic.title)}"></label>
 </div>
 </section>

 <section class="panel">
 <div class="section-heading">
 <p class="eyebrow">Learning objective</p>
 <h3>pupil learningunderstandinglearning</h3>
 </div>
 <textarea id="learning-objectives" rows="8">${escapeHtml(state.workspace.learning_objectives.join("\n"))}</textarea>
 </section>

 <section class="panel full-span">
 <div class="section-heading">
 <p class="eyebrow">course material</p>
 <h3>Pasteclass learning or learning</h3>
 </div>
 <textarea id="lesson-material" rows="8">${escapeHtml(state.workspace.lesson_material)}</textarea>
 </section>
 </div>
 `;}

function renderResponses() {const previewRows = state.parsedResponses.map((response) => `
 <tr>
 <td>${escapeHtml(response.student_alias)}</td>
 <td>${escapeHtml(response.answer)}</td>
 <td>${escapeHtml(response.confidence?? "")}</td>
 </tr>
 `).join("");

 return `
 <div class="content-stack">
 <section class="panel">
 <div class="section-heading split-heading">
 <div>
 <p class="eyebrow">privacypriorityentry</p>
 <h3>PasteAnonymised pupil response</h3>
 </div>
 <span class="pill muted-pill">only learning alias: S001, S002, S003</span>
 </div>
 <textarea id="quiz-responses" rows="12">${escapeHtml(state.rawResponses)}</textarea>
 <div class="hero-actions">
 <button class="secondary-button" type="button" data-action="parse-responses">preview response</button>
 <button class="success-button" type="button" data-action="analyse">analysisunderstandingstatus</button>
 </div>
 </section>

 <section class="panel">
 <div class="section-heading">
 <p class="eyebrow">preview</p>
 <h3>${state.parsedResponses.length} drafts anonymised response already learninggood</h3>
 </div>
 <div class="table-wrap">
 <table>
 <thead>
 <tr><th>Alias</th><th>response</th><th>learning</th></tr>
 </thead>
 <tbody>${previewRows}</tbody>
 </table>
 </div>
 </section>
 </div>
 `;}

function renderMisconceptionMap() {if (!state.analysis) {return renderGate("learningfirstPastepupil response, learningclick“analysisunderstandingstatus”generateMisconception map.", "go-responses", "pupil response");}

 const levels = Object.entries(state.analysis.student_levels).map(([key, aliases]) => `
 <article class="level-card">
 <div class="card-topline">
 <span>${escapeHtml(key.replaceAll("_", " "))}</span>
 <strong>${aliases.length} pupils</strong>
 </div>
 <div class="alias-row">${aliases.map((alias) => `<span>${escapeHtml(alias)}</span>`).join("")}</div>
 </article>
 `).join("");

 const misconceptions = state.analysis.misconceptions.map((misconception, index) => `
 <article class="misconception-card">
 <div class="card-topline">
 <span>Misconception ${index + 1}</span>
 <strong class="severity severity-${escapeAttr(misconception.severity)}">${escapeHtml(misconception.severity)}</strong>
 </div>
 <h3>${escapeHtml(misconception.title)}</h3>
 <p>${escapeHtml(misconception.description)}</p>
 <div class="alias-row">${misconception.affected_students.map((alias) => `<span>${escapeHtml(alias)}</span>`).join("")}</div>
 <dl>
 <div><dt>possiblelearning</dt><dd>${escapeHtml(misconception.likely_root_cause)}</dd></div>
 <div><dt>learning needs</dt><dd>${escapeHtml(misconception.teaching_need)}</dd></div>
 <div><dt>SuggestedNext step</dt><dd>${escapeHtml(misconception.recommended_next_action)}</dd></div>
 </dl>
 </article>
 `).join("");

 return `
 <div class="content-stack">
 <section class="panel summary-panel">
 <div>
 <p class="eyebrow">classunderstandingsummary</p>
 <h3>${escapeHtml(state.analysis.class_understanding_summary)}</h3>
 </div>
 <div>
 <p class="hint">${escapeHtml(state.analysis.teacher_summary)}</p>
 </div>
 <button class="primary-button" type="button" data-action="go-evidence">review evidence</button>
 <button class="success-button" type="button" data-action="generate-intervention">generate learning intervention</button>
 </section>
 <section class="card-grid three">${levels}</section>
 <section class="card-grid three">${misconceptions}</section>
 </div>
 `;}

function renderevidencereview() {if (!state.analysis) {return renderGate("learningfirstRunningDiagnosis, thenreview evidence.", "go-responses", "pupil response");}

 const evidenceRows = state.analysis.misconceptions.flatMap((misconception) => misconception.evidence_quotes.map((evidence) => ({misconception, evidence}))).map(({misconception, evidence}) => `
 <tr>
 <td>${escapeHtml(misconception.title)}</td>
 <td>${escapeHtml(evidence.student_alias)}</td>
 <td>"${escapeHtml(evidence.quote)}"</td>
 <td>${escapeHtml(evidence.why_it_matters)}</td>
 </tr>
 `).join("");

 const validation = window.TeachFlowDiagnosisEngine.validateAnalysis(state.analysis, state.parsedResponses);

 return `
 <div class="content-stack">
 <section class="panel">
 <div class="section-heading split-heading">
 <div>
 <p class="eyebrow">evidence review</p>
 <h3>evidence quotelearningmustpupil response</h3>
 </div>
 <span class="pill ${validation.valid? "": "warning-pill"}">${validation.valid? "evidence learning": "needs review"}</span>
 </div>
 ${validation.valid? "": `<ul>${validation.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>`}
 <div class="table-wrap">
 <table>
 <thead>
 <tr><th>Misconception</th><th>Alias</th><th>pupil quotes</th><th>learning</th></tr>
 </thead>
 <tbody>${evidenceRows}</tbody>
 </table>
 </div>
 </section>

 <section class="panel">
 <div class="section-heading split-heading">
 <div>
 <p class="eyebrow">Editable JSON</p>
 <h3>teachers can edit generateofDiagnosis</h3>
 </div>
 <button class="secondary-button" type="button" data-action="save-edits">Savededit learning of JSON</button>
 </div>
 <textarea id="analysis-json" rows="22">${escapeHtml(state.editableJson || JSON.stringify(state.analysis, null, 2))}</textarea>
 </section>
 </div>
 `;}

function renderInterventionStudio() {if (!state.analysis) {return renderGate("learningfirstRunningDiagnosis, thengenerate learning intervention.", "go-responses", "pupil response");}

 if (!state.intervention) {return `
 <section class="empty-state">
 <span class="pill muted-pill">intervention generate learning</span>
 <h3>turnMisconception maplearningTeaching plan.</h3>
 <p class="hint">generateofInterventionwillContinuelearning diagnosis learning ofMisconceptionandpupil alias.</p>
 <button class="primary-button" type="button" data-action="generate-intervention">generate learning intervention</button>
 </section>
 `;}

 const validation = window.TeachFlowInterventionEngine.validateIntervention(state.intervention);
 const materials = state.intervention.differentiated_materials;

 return `
 <div class="intervention-studio">
 <section class="panel source-map-panel">
 <div class="section-heading">
 <p class="eyebrow">learningMisconception</p>
 <h3>learning diagnosis generate</h3>
 </div>
 <div class="source-misconception-list">
 ${state.analysis.misconceptions.map((misconception) => `
 <article class="source-misconception">
 <div class="card-topline">
 <span>${escapeHtml(misconception.id)}</span>
 <strong class="severity severity-${escapeAttr(misconception.severity)}">${escapeHtml(misconception.severity)}</strong>
 </div>
 <h4>${escapeHtml(misconception.title)}</h4>
 <p>${escapeHtml(misconception.teaching_need)}</p>
 <div class="alias-row">${misconception.affected_students.map((alias) => `<span>${escapeHtml(alias)}</span>`).join("")}</div>
 </article>
 `).join("")}
 </div>
 </section>

 <section class="panel generated-intervention-panel">
 <div class="section-heading split-heading">
 <div>
 <p class="eyebrow">generateofIntervention</p>
 <h3>${escapeHtml(state.intervention.topic)}</h3>
 </div>
 <span class="pill ${validation.valid? "": "warning-pill"}">${validation.valid? "already learningMisconception": "needs review"}</span>
 </div>

 <p class="hint">${escapeHtml(state.intervention.intervention_summary)}</p>

 <div class="intervention-section">
 <h4>revised teaching plan</h4>
 <p>${escapeHtml(state.intervention.revised_teaching_plan.rationale)}</p>
 <ol class="plan-list">
 ${state.intervention.revised_teaching_plan.steps.map((step) => `
 <li>
 <strong>${escapeHtml(step.title)}</strong>
 <span>teacher: ${escapeHtml(step.teacher_action)}</span>
 <span>pupil: ${escapeHtml(step.student_action)}</span>
 <small>learningMisconception: ${escapeHtml(step.linked_misconception_ids.join(", "))}</small>
 </li>
 `).join("")}
 </ol>
 </div>

 <div class="card-grid three">
 ${rendermaterialCard("Level 1: learning", materials.level_1_confused, ["goal", "explanation", "analogy", "task"])}
 ${rendermaterialCard("Level 2: Developing", materials.level_2_partially_understood, ["goal", "explanation", "concept_bridge", "task"])}
 ${rendermaterialCard("Level 3: Ready to apply", materials.level_3_ready_to_apply, ["goal", "challenge"])}
 </div>

 <div class="intervention-section">
 <h4>learning</h4>
 <p>${escapeHtml(state.intervention.visual_aid.image_prompt)}</p>
 <p class="hint">${escapeHtml(state.intervention.visual_aid.diagram_description)}</p>
 <div class="alias-row">${state.intervention.visual_aid.labels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}</div>
 </div>

 <div class="intervention-section two-column-section">
 <div>
 <h4>learning</h4>
 <ol class="compact-list">
 ${state.intervention.video_storyboard.map((scene) => `<li><strong>learning ${scene.scene_number}</strong>: ${escapeHtml(scene.description)} <span>${escapeHtml(scene.narration)}</span></li>`).join("")}
 </ol>
 </div>
 <div>
 <h4>mini quiz</h4>
 <ol class="compact-list">
 ${state.intervention.micro_quiz.map((item) => `<li>${escapeHtml(item.question)} <span>${escapeHtml(item.purpose)}</span></li>`).join("")}
 </ol>
 </div>
 </div>

 <div class="intervention-section">
 <h4>teacher notes</h4>
 <ul class="compact-list">
 ${state.intervention.teacher_notes.map((item) => `<li><strong>${escapeHtml(item.note)}</strong> ${escapeHtml(item.why_it_matters)}</li>`).join("")}
 </ul>
 </div>

 <div class="intervention-section">
 <h4>pupil materials</h4>
 <p>${escapeHtml(state.intervention.student_facing_material?.body || "")}</p>
 <p class="hint">${escapeHtml(state.intervention.student_facing_material?.practice_prompt || "")}</p>
 </div>

 <div class="intervention-section">
 <div class="section-heading split-heading">
 <div>
 <p class="eyebrow">Editable JSON</p>
 <h4>learning inapproval learning edit</h4>
 </div>
 </div>
 <textarea id="intervention-json" rows="20">${escapeHtml(state.editableInterventionJson || JSON.stringify(state.intervention, null, 2))}</textarea>
 <div class="editor-actions">
 <button class="secondary-button" type="button" data-action="save-intervention-edits">Savedintervention edit</button>
 </div>
 </div>
 </section>

 <aside class="panel intervention-control-panel">
 <div class="section-heading">
 <p class="eyebrow">teacher control</p>
 <h3>${escapeHtml(window.TeachFlowControlLayer.formatstatus(state.interventionstatus))}</h3>
 </div>
 <div class="button-grid">
 <button class="secondary-button" type="button" data-action="regenerate-intervention">generate</button>
 <button class="secondary-button" type="button" data-action="focus-intervention-editor">Edit JSON</button>
 <button class="primary-button" type="button" data-action="go-review">review</button>
 <button class="success-button" type="button" data-action="approve-intervention">Approve</button>
 <button class="primary-button" type="button" data-action="export-intervention-markdown" ${canexportIntervention()? "": "disabled"}>export Markdown</button>
 </div>
 <p class="hint">only teacher approve learning export.</p>
 ${validation.valid? "": `<ul>${validation.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>`}
 <div class="audit-box">
 <h4>audit</h4>
 <ol>${state.audit.slice(-6).map((entry) => `<li><time>${escapeHtml(entry.time)}</time>${escapeHtml(entry.text)}</li>`).join("")}</ol>
 </div>
 </aside>
 </div>
 `;}

function rendermaterialCard(title, material, fields) {const extraConnections = material.cross_domain_connections? `<div><dt>learning</dt><dd>${material.cross_domain_connections.map((item) => escapeHtml(item)).join("<br>")}</dd></div>`: "";

 return `
 <article class="material-card">
 <div class="card-topline">
 <span>${escapeHtml(material.target_students.join(", ") || "none yetAlias")}</span>
 <strong>${escapeHtml(material.linked_misconception_ids.join(", "))}</strong>
 </div>
 <h3>${escapeHtml(title)}</h3>
 <dl>
 ${fields.map((field) => `<div><dt>${escapeHtml(formatFieldLabel(field))}</dt><dd>${escapeHtml(material[field])}</dd></div>`).join("")}
 ${extraConnections}
 </dl>
 </article>
 `;}

function renderApprovalexport() {if (!state.analysis) {return renderGate("learningfirstRunningDiagnosis, thenOpenteacher controllearning.", "go-responses", "pupil response");}

 if (!state.intervention) {return `
 <section class="empty-state">
 <span class="pill muted-pill">reviewandapproval learning</span>
 <h3>learningfirstgenerate learning intervention, then teacher approval.</h3>
 <p class="hint">teacher reviewof AI draft learning, learningwillStarting.</p>
 <button class="primary-button" type="button" data-action="generate-intervention">generate learning intervention</button>
 </section>
 `;}

 const activeSection = window.TeachFlowControlLayer.getSectionDefinition(state.activeSectionKey);
 const activeApproval = state.sectionApprovals[activeSection.key];
 const currentversion = state.versionHistory[state.versionHistory.length - 1];
 const exportPreview = state.activeexportPackage?.content || currentexportPreview();
 const exportPreviewTitle = state.activeexportPackage? "already learninggoodof Markdown learning": "teacher preview";

 return `
 <div class="review-studio">
 <section class="panel source-evidence-panel">
 <div class="section-heading split-heading">
 <div>
 <p class="eyebrow">learning evidence</p>
 <h3>learning draft learning in</h3>
 </div>
 <span class="pill muted-pill">${state.parsedResponses.length} drafts response</span>
 </div>
 <div class="evidence-block">
 <h4>Learning objective</h4>
 <ul>${state.workspace.learning_objectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
 </div>
 <div class="evidence-block">
 <h4>Misconception map</h4>
 ${state.analysis.misconceptions.map((misconception) => `
 <article class="compact-evidence-item">
 <strong>${escapeHtml(misconception.title)}</strong>
 <span>${escapeHtml(misconception.teaching_need)}</span>
 <small>${escapeHtml(misconception.affected_students.join(", "))}</small>
 </article>
 `).join("")}
 </div>
 <div class="evidence-block">
 <h4>pupil response learning</h4>
 ${state.parsedResponses.slice(0, 5).map((response) => `
 <blockquote><strong>${escapeHtml(response.student_alias)}</strong>: ${escapeHtml(response.answer)}</blockquote>
 `).join("")}
 </div>
 </section>

 <section class="panel editable-intervention-panel">
 <div class="section-heading">
 <p class="eyebrow">editable intervention</p>
 <h3>${escapeHtml(state.intervention.topic)}</h3>
 </div>
 <div class="control-status-row">
 <span class="status-value ${statusClass(window.TeachFlowControlLayer.formatstatus(state.interventionstatus))}">
 current status: ${escapeHtml(window.TeachFlowControlLayer.formatstatus(state.interventionstatus))}
 </span>
 <span class="pill muted-pill">version ${currentVersion?.version_number || 0}</span>
 </div>

 <div class="section-approval-list">
 ${window.TeachFlowControlLayer.SECTION_DEFINITIONS.map((section) => {const approval = state.sectionApprovals[section.key];
 const isActive = section.key === state.activeSectionKey;
 return `
 <button class="section-approval-row ${isActive? "active": ""}" type="button" data-action="set-control-section" data-section="${escapeAttr(section.key)}">
 <span>${escapeHtml(section.label)}</span>
 <strong class="status-chip status-${statusClass(approval?.status || "draft")}">${escapeHtml(window.TeachFlowControlLayer.formatstatus(approval?.status || "draft"))}</strong>
 </button>
 `;}).join("")}
 </div>

 <div class="section-editor-panel">
 <div class="section-heading split-heading">
 <div>
 <p class="eyebrow">learning edit learning</p>
 <h4>${escapeHtml(activeSection.label)}</h4>
 </div>
 <span class="pill muted-pill">${escapeHtml(window.TeachFlowControlLayer.formatstatus(activeApproval?.status || "draft"))}</span>
 </div>
 <textarea id="section-editor" rows="18">${escapeHtml(sectionEditorValue())}</textarea>
 <div class="editor-actions multi-actions">
 <button class="secondary-button" type="button" data-action="save-section">Save changes</button>
 <button class="secondary-button" type="button" data-action="regenerate-section">generate learning</button>
 <button class="success-button" type="button" data-action="approve-section">approve learning</button>
 </div>
 </div>

 <div class="section-editor-panel">
 <div class="section-heading">
 <p class="eyebrow">Markdown export preview</p>
 <h4>${escapeHtml(export previewTitle)}</h4>
 </div>
 ${state.exportPreviewOpen? `<p class="hint">Previewalreadygood.needsin TeachFlow learning, cancopyor learning Markdown learning.</p>`: ""}
 <textarea rows="16" readonly>${escapeHtml(export preview)}</textarea>
 <div class="editor-actions multi-actions">
 <button class="secondary-button" type="button" data-action="copy-export-markdown" ${state.exportPreviewOpen? "": "disabled"}>copy Markdown</button>
 <button class="primary-button" type="button" data-action="download-prepared-export" ${state.exportPreviewOpen? "": "disabled"}>learning.md</button>
 <button class="ghost-button" type="button" data-action="return-to-review" ${state.exportPreviewOpen? "": "disabled"}>Backreview</button>
 </div>
 </div>
 </section>

 <aside class="panel review-control-panel">
 <div class="section-heading">
 <p class="eyebrow">teacher control</p>
 <h3>${escapeHtml(window.TeachFlowControlLayer.formatstatus(state.interventionstatus))}</h3>
 </div>
 <div class="button-grid">
 <button class="secondary-button" type="button" data-action="mark-under-review">review</button>
 <button class="success-button" type="button" data-action="approve-intervention">Approve</button>
 <button class="danger-button" type="button" data-action="reject-intervention">learning</button>
 <button class="primary-button" type="button" data-action="export-intervention-markdown" ${canexportIntervention()? "": "disabled"}>learning export</button>
 <button class="secondary-button" type="button" data-action="update-student-memory" ${state.interventionstatus === "exported" || state.interventionstatus === "published"? "": "disabled"}>updatelearning</button>
 <button class="secondary-button" type="button" data-action="publish-intervention" ${state.interventionstatus === "exported"? "": "disabled"}>publish to pupil</button>
 <button class="ghost-button" type="button" data-action="rollback-latest" ${state.versionHistory.length > 1? "": "disabled"}>learninglatestversion</button>
 <button class="ghost-button" type="button" data-action="go-memory" ${state.studentMemories.length? "": "disabled"}>view learning</button>
 <button class="ghost-button" type="button" data-action="go-student-portal" ${state.studentAssignments.length? "": "disabled"}>pupil learning</button>
 <button class="ghost-button" type="button" data-action="go-understanding-map" ${state.studentMemories.length? "": "disabled"}>understanding map</button>
 </div>
 <p class="hint">AI draftinteacher approve learning is learning version.approve learning export; completed approve export learningupdatepupil memory.</p>

 <div class="audit-box">
 <h4>version learning</h4>
 <ol class="version-history-list">
 ${state.versionHistory.slice().reverse().map((version) => `
 <li>
 <strong>version ${version.version_number}</strong>
 <span>${escapeHtml(version.change_summary)}</span>
 <small>${escapeHtml(formatActor(version.created_by))} · ${escapeHtml(formatDatetime(version.created_at))}</small>
 <button class="ghost-button small-button" type="button" data-action="restore-version" data-version="${escapeAttr(version.version_number)}">learning</button>
 </li>
 `).join("")}
 </ol>
 </div>

 <div class="audit-box">
 <h4>AuditLog</h4>
 <ol class="structured-audit-list">
 ${state.audit.slice().reverse().slice(0, 10).map((entry) => `
 <li>
 <time>${escapeHtml(entry.time)}</time>
 <strong>${escapeHtml(entry.action || "action")}</strong>
 <span>${escapeHtml(entry.details || entry.text)}</span>
 <small>${escapeHtml(formatActor(entry.actor || "teacher"))} · ${escapeHtml(formatAuditTarget(entry.target_type || "workflow"))}</small>
 </li>
 `).join("")}
 </ol>
 </div>
 </aside>
 </div>
 `;}

function renderStudentMemory() {if (!state.analysis) {return renderGate("learningfirstRunningMisconceptionDiagnosis, then pupil memory.", "go-responses", "pupil response");}

 const memories = filteredMemories();

 if (state.studentMemories.length === 0) {return `
 <section class="empty-state">
 <span class="pill muted-pill">teacher-only learning</span>
 <h3>pupil memory.</h3>
 <p class="hint">learningonly learning anonymised alias, teacherSavedlearning statusLog.</p>
 <button class="primary-button" type="button" data-action="update-student-memory">updatepupil memory</button>
 </section>
 `;}

 return `
 <div class="memory-layout">
 <section class="panel memory-summary-panel">
 <div class="section-heading split-heading">
 <div>
 <p class="eyebrow">pupilunderstandinglearning</p>
 <h3>${state.studentMemories.length} learning anonymised learning</h3>
 </div>
 <span class="pill muted-pill">only learning alias</span>
 </div>
 <div class="memory-filter-row">
 ${["all", "confused", "partially_understood", "ready_to_apply"].map((filter) => `
 <button class="filter-button ${state.memoryFilter === filter? "active": ""}" type="button" data-action="set-memory-filter" data-filter="${escapeAttr(filter)}">
 ${escapeHtml(filter === "all"? "learning": window.TeachFlowControlLayer.formatstatus(filter))}
 </button>
 `).join("")}
 </div>
 <div class="memory-grid">
 ${memories.map((memory) => `
 <article class="memory-card">
 <div class="card-topline">
 <span>${escapeHtml(memory.student_alias)}</span>
 <strong class="status-chip status-${statusClass(memory.current_level)}">${escapeHtml(window.TeachFlowControlLayer.formatstatus(memory.current_level))}</strong>
 </div>
 <dl>
 <div><dt>alreadyunderstanding</dt><dd>${escapeHtml(memory.understood.join("; ") || "needs learningmoreevidence")}</dd></div>
 <div><dt>currentlearning</dt><dd>${escapeHtml(memory.weak_points.join("; "))}</dd></div>
 <div><dt>learninggoodofsupportlearning</dt><dd>${escapeHtml(formatSupportStyle(memory.preferred_explanation_style || "example"))}</dd></div>
 <div><dt>SuggestedNext step</dt><dd>${escapeHtml(memory.recommended_next_action)}</dd></div>
 </dl>
 <p class="hint">updatelearning ${escapeHtml(formatDatetime(memory.last_updated_at))}</p>
 </article>
 `).join("")}
 </div>
 </section>

 <aside class="panel memory-control-panel">
 <div class="section-heading">
 <p class="eyebrow">mini quiz</p>
 <h3>learning evidenceupdatelearning</h3>
 </div>
 <p class="hint">Pasteanonymised mini quiz response.do notincludesnames, emails, student IDsor learning individuallearning.</p>
 <textarea id="micro-quiz-responses" rows="8">${escapeHtml(state.microQuizResponses)}</textarea>
 <div class="editor-actions multi-actions">
 <button class="primary-button" type="button" data-action="analyse-micro-quiz">analysis response</button>
 <button class="secondary-button" type="button" data-action="update-student-memory">learning diagnosisrefresh</button>
 </div>
 ${state.followupAnalysis? `
 <div class="followup-summary">
 <h4>learningsummary</h4>
 <p>${escapeHtml(state.followupAnalysis.followup_summary)}</p>
 <p class="hint">${escapeHtml(state.followupAnalysis.next_teaching_recommendation)}</p>
 </div>
 <ol class="structured-audit-list">
 ${state.followupAnalysis.student_updates.map((update) => `
 <li>
 <strong>${escapeHtml(update.student_alias)}: ${escapeHtml(window.TeachFlowControlLayer.formatstatus(update.new_level))}</strong>
 <span>${escapeHtml(update.evidence)}</span>
 <small>learning support: ${escapeHtml(update.remaining_weak_points.join(", "))}</small>
 </li>
 `).join("")}
 </ol>
 `: ""}
 </aside>
 </div>
 `;}

function renderStudentPortal() {if (!state.intervention || state.studentAssignments.length === 0) {return `
 <section class="empty-state">
 <span class="pill muted-pill">pupil portal lite</span>
 <h3>publish teacher approveofmaterial.</h3>
 <p class="hint">learning in“reviewandapproval learning”approve learning export publish.pupilonlyview learning to learning aliasof learning.</p>
 <button class="primary-button" type="button" data-action="go-review">review learning</button>
 </section>
 `;}

 const assignment = currentStudentassignment();
 const assigned = currentAssignedmaterial();
 const memory = state.studentMemories.find((item) => item.student_alias === assignment?.student_alias);
 const submissionsummary = window.TeachFlowStudentPortalEngine.summariseSubmissions({reflections: state.studentReflections,
 micro_quiz_attempts: state.studentMicroQuizAttempts});
 const selectedSummary = submissionsummary.find((item) => item.student_alias === assignment?.student_alias) || {student_alias: assignment?.student_alias || "",
 reflection_count: 0,
 micro_quiz_attempt_count: 0,
 latest_reflection: "",
 latest_micro_quiz_answers: []};

 return `
 <div class="student-portal-layout">
 <section class="panel student-alias-panel">
 <div class="section-heading">
 <p class="eyebrow">pupil learningask</p>
 <h3>select alias</h3>
 </div>
 <p class="hint">pupil learning.learningChatlearning, learningdisplayrealnames, learningcannotlearningaskother pupils submit.</p>
 <div class="alias-select-list">
 ${state.studentAssignments.map((item) => `
 <button class="alias-select-button ${item.student_alias === assignment?.student_alias? "active": ""}" type="button" data-action="set-student-alias" data-alias="${escapeAttr(item.student_alias)}">
 <span>${escapeHtml(item.student_alias)}</span>
 <strong>${escapeHtml(window.TeachFlowControlLayer.formatstatus(item.material_level))}</strong>
 </button>
 `).join("")}
 </div>
 <button class="ghost-button" type="button" data-action="go-understanding-map">learning ofunderstanding map</button>
 </section>

 <section class="panel student-learning-panel">
 <div class="section-heading split-heading">
 <div>
 <p class="eyebrow">topic material diagram</p>
 <h3>${escapeHtml(assigned?.student_facing_material?.title || state.intervention.topic)}</h3>
 </div>
 <span class="status-chip status-${statusClass(assignment.material_level)}">${escapeHtml(window.TeachFlowControlLayer.formatstatus(assignment.material_level))}</span>
 </div>
 <p class="student-note">learningnot a grade, learning is ${escapeHtml(assignment.student_alias)} of learning support learning.</p>

 <article class="student-material-section">
 <h4>teacher approveofHandout</h4>
 <p>${escapeHtml(assigned?.student_facing_material?.body || "pupil handout.")}</p>
 <p class="hint">${escapeHtml(assigned?.student_facing_material?.practice_prompt || "")}</p>
 </article>

 <article class="student-material-section">
 <h4>learning oflevel material</h4>
 ${renderAssignedmaterialDetails(assigned?.material)}
 </article>

 <article class="student-material-section visual-prompt-box">
 <div>
 <h4>learning</h4>
 <p>${escapeHtml(assigned?.visual_aid?.image_prompt || "learning.")}</p>
 <p class="hint">${escapeHtml(assigned?.visual_aid?.diagram_description || "")}</p>
 </div>
 <div class="diagram-placeholder" aria-label="generate diagram learning">
 <span>diagram learning</span>
 <small>${escapeHtml((assigned?.visual_aid?.labels || []).join(" / ") || "teacher approveof learning")}</small>
 </div>
 </article>

 <article class="student-material-section">
 <div class="section-heading">
 <p class="eyebrow">mini quiz diagram</p>
 <h4>learning of response</h4>
 </div>
 <div class="micro-quiz-answer-list">
 ${renderMicroQuizquestions(assigned?.micro_quiz || [])}
 </div>
 <div class="editor-actions">
 <button class="primary-button" type="button" data-action="submit-student-micro-quiz">submit mini quiz</button>
 </div>
 </article>

 <article class="student-material-section">
 <div class="section-heading">
 <p class="eyebrow">reflectionsubmit diagram</p>
 <h4>turnlearning</h4>
 </div>
 <label>
 <span>learning of learningconcept.</span>
 <textarea id="student-reflection" rows="5">${escapeHtml(state.studentReflectionDraft)}</textarea>
 </label>
 <div class="editor-actions">
 <button class="secondary-button" type="button" data-action="submit-student-reflection">submitreflection</button>
 </div>
 </article>
 </section>

 <aside class="panel teacher-submissions-panel">
 <div class="section-heading">
 <p class="eyebrow">teacher review</p>
 <h3>${escapeHtml(assignment.student_alias)} ofsubmit</h3>
 </div>
 <dl>
 <div><dt>current status</dt><dd>${escapeHtml(memory? window.TeachFlowControlLayer.formatstatus(memory.current_level): "none yet")}</dd></div>
 <div><dt>completed learning</dt><dd>${escapeHtml(assignment.completed_at? formatDatetime(assignment.completed_at): "learning completed")}</dd></div>
 <div><dt>reflectionlearning</dt><dd>${escapeHtml(String(selectedSummary.reflection_count))}</dd></div>
 <div><dt>mini quiz learning</dt><dd>${escapeHtml(String(selectedSummary.micro_quiz_attempt_count))}</dd></div>
 </dl>
 <div class="submission-review-block">
 <h4>latest reflection</h4>
 <p>${escapeHtml(selectedSummary.latest_reflection || "learning submitreflection.")}</p>
 </div>
 <div class="submission-review-block">
 <h4>latestmini quiz response</h4>
 ${selectedSummary.latest_micro_quiz_answers.length? `
 <ol class="submission-summary-list">
 ${selectedSummary.latest_micro_quiz_answers.map((answer) => `<li><strong>${escapeHtml(answer.question_id)}</strong><span>${escapeHtml(answer.answer)}</span></li>`).join("")}
 </ol>
 `: `<p class="hint">learningsubmitlearningquiz.</p>`}
 </div>
 </aside>
 </div>
 `;}

function renderAssignedmaterialDetails(material) {if (!material) {return `<p class="hint">learning to learning aliasofmaterial.</p>`;}

 const rows = [["Learning objective", material.goal],
 ["learning", material.explanation],
 ["learning", material.analogy],
 ["conceptlearning", material.concept_bridge],
 ["task", material.task],
 ["learning", material.challenge],
 ["learning", material.cross_domain_connections?.join("; ")]].filter((row) => row[1]);

 return `
 <dl class="student-material-detail-list">
 ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
 </dl>
 `;}

function renderMicroQuizquestions(questions) {if (!questions.length) {return `<p class="hint">mini quiz.</p>`;}

 return questions.map((item, index) => {const questionId = item.id || item.question_id || `question-${index + 1}`;
 return `
 <label>
 <span>${index + 1}. ${escapeHtml(item.question)}</span>
 <small class="hint">${escapeHtml(item.purpose || "")}</small>
 <textarea rows="3" data-micro-answer data-question-id="${escapeAttr(questionId)}"></textarea>
 </label>
 `;}).join("");}

function renderUnderstandingMap() {if (!state.analysis) {return renderGate("learningfirstRunningMisconceptionDiagnosis, then learningunderstanding map.", "go-responses", "pupil response");}

 if (state.studentMemories.length === 0) {return `
 <section class="empty-state">
 <span class="pill muted-pill">pupilunderstanding map</span>
 <h3>learning status learning.</h3>
 <p class="hint">learningfirst learning anonymised pupil learning.understanding mapwillturnpupil viewandteacher view Next step action.</p>
 <button class="primary-button" type="button" data-action="update-student-memory">updatepupil memory</button>
 </section>
 `;}

 if (state.understandingMapNodes.length === 0) {return `
 <section class="empty-state">
 <span class="pill muted-pill">pupilunderstanding map</span>
 <h3>understanding mapalready learningcan learn.</h3>
 <p class="hint">TeachFlow onlywill learnlearning status learning andanonymised alias.</p>
 <button class="primary-button" type="button" data-action="go-understanding-map">learningunderstanding map</button>
 </section>
 `;}

 const memory = currentStudentMemory();
 const alias = memory?.student_alias || state.selectedStudentAlias;
 const nodes = understandingNodesFor(alias);
 const summary = window.TeachFlowUnderstandingMapEngine.summariseclassMap({nodes: state.understandingMapNodes,
 stuck_signals: state.studentStuckSignals});
 const selectedSummary = summary.find((item) => item.student_alias === alias);
 const latestAction = state.assignedUnderstandingActions.filter((item) => item.student_alias === alias).slice(-1)[0];
 const alternate = state.alternateExplanations[alias];

 return `
 <div class="understanding-layout">
 <section class="panel understanding-alias-panel">
 <div class="section-heading">
 <p class="eyebrow">learning ofunderstanding map</p>
 <h3>select alias</h3>
 </div>
 <p class="hint">pupil aliasonlyview learning of diagram.learningnot a grade, learning iscurrentunderstandingstatus diagram.</p>
 <div class="alias-select-list">
 ${state.studentMemories.map((item) => `
 <button class="alias-select-button ${item.student_alias === alias? "active": ""}" type="button" data-action="set-student-alias" data-alias="${escapeAttr(item.student_alias)}">
 <span>${escapeHtml(item.student_alias)}</span>
 <strong>${escapeHtml(window.TeachFlowControlLayer.formatstatus(item.current_level))}</strong>
 </button>
 `).join("")}
 </div>
 </section>

 <section class="panel understanding-map-panel">
 <div class="section-heading split-heading">
 <div>
 <p class="eyebrow">learning status</p>
 <h3>${escapeHtml(alias)} ofunderstanding map</h3>
 </div>
 <span class="pill muted-pill">${escapeHtml(formatSupportStyle(memory?.preferred_explanation_style || "example"))}support</span>
 </div>
 <p class="student-note">learningnot a grade, learning is learning currentunderstandinglearning, Next step needs learning supportof diagram.</p>

 <div class="understanding-node-grid">
 ${nodes.map((node) => `
 <article class="understanding-node-card status-${statusClass(node.status)}">
 <div class="card-topline">
 <span>${escapeHtml(formatMapstatus(node.status))}</span>
 <strong>${escapeHtml(formatSupportStyle(node.preferred_explanation_style || "example"))}</strong>
 </div>
 <h4>${escapeHtml(node.concept)}</h4>
 <ul>${node.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
 <p class="hint">${escapeHtml(node.recommended_action)}</p>
 </article>
 `).join("")}
 </div>

 <article class="student-material-section">
 <div class="section-heading split-heading">
 <div>
 <p class="eyebrow">learning stuckis learning...</p>
 <h4>sendlearning signal</h4>
 </div>
 <button class="ghost-button" type="button" data-action="explain-another-way">learning</button>
 </div>
 <label>
 <span>select learning ofreason</span>
 <select id="stuck-type">
 ${window.TeachFlowUnderstandingMapEngine.STUCK_TYPES.map((type) => `
 <option value="${escapeAttr(type)}" ${state.selectedStuckType === type? "selected": ""}>${escapeHtml(formatStuckType(type))}</option>
 `).join("")}
 </select>
 </label>
 <label>
 <span>notes</span>
 <textarea id="stuck-free-text" rows="4">${escapeHtml(state.stuckSignaldraft)}</textarea>
 </label>
 <div class="editor-actions">
 <button class="secondary-button" type="button" data-action="submit-stuck-signal">submit stuck signals</button>
 </div>
 ${alternate? `
 <div class="alternate-explanation-box">
 <h4>learning</h4>
 <p>${escapeHtml(alternate.explanation)}</p>
 <p class="hint">${escapeHtml(alternate.next_prompt)}</p>
 </div>
 `: ""}
 </article>
 </section>

 <aside class="panel teacher-map-panel">
 <div class="section-heading">
 <p class="eyebrow">classunderstanding map</p>
 <h3>teacher next steps action</h3>
 </div>
 <dl>
 <div><dt>alreadyunderstandinglearning</dt><dd>${escapeHtml(String(selectedSummary?.understood_count || 0))}</dd></div>
 <div><dt>learning support learning</dt><dd>${escapeHtml(String(selectedSummary?.needs_support_count || 0))}</dd></div>
 <div><dt>lateststuck signals</dt><dd>${escapeHtml(selectedSummary?.latest_stuck_type? formatStuckType(selectedSummary.latest_stuck_type): "none yet")}</dd></div>
 </dl>
 <button class="primary-button" type="button" data-action="assign-understanding-next-step" data-alias="${escapeAttr(alias)}">learning next step action</button>
 ${latestAction? `
 <div class="submission-review-block">
 <h4>alreadyaction</h4>
 <p>${escapeHtml(latestAction.action)}</p>
 <p class="hint">${escapeHtml(formatDatetime(latestAction.assigned_at))}</p>
 </div>
 `: ""}
 <div class="class-map-list">
 ${summary.map((item) => `
 <article class="class-map-row">
 <strong>${escapeHtml(item.student_alias)}</strong>
 <span>${escapeHtml(item.understood_count)} learningalreadyunderstanding / ${escapeHtml(item.needs_support_count)} learningsupport</span>
 <small>${escapeHtml(item.recommended_next_action)}</small>
 </article>
 `).join("")}
 </div>
 </aside>
 </div>
 `;}

function renderGate(message, action, label) {return `
 <section class="empty-state">
 <span class="pill muted-pill">DiagnosisEngine</span>
 <h3>${escapeHtml(message)}</h3>
 <button class="primary-button" type="button" data-action="${escapeAttr(action)}">${escapeHtml(label || "Continue")}</button>
 </section>
 `;}

function bindInteractions() {document.querySelectorAll("[data-nav]").forEach((button) => {button.addEventListener("click", () => {state.view = button.dataset.nav;
 if (state.view === "understanding") {prepareUnderstandingMap({audit: false});}
 render();});});

 const interventionEditor = document.getElementById("intervention-json");
 if (interventionEditor) {interventionEditor.addEventListener("input", () => {state.editableInterventionJson = interventionEditor.value;});}

 const sectionEditor = document.getElementById("section-editor");
 if (sectionEditor) {sectionEditor.addEventListener("input", () => {state.sectionEditorJson = sectionEditor.value;});}

 const microQuizResponses = document.getElementById("micro-quiz-responses");
 if (microQuizResponses) {microQuizResponses.addEventListener("input", () => {state.microQuizResponses = microQuizResponses.value;});}

 const studentReflection = document.getElementById("student-reflection");
 if (studentReflection) {studentReflection.addEventListener("input", () => {state.studentReflectionDraft = studentReflection.value;});}

 const stuckType = document.getElementById("stuck-type");
 if (stuckType) {stuckType.addEventListener("change", () => {state.selectedStuckType = stuckType.value;});}

 const stuckFreeText = document.getElementById("stuck-free-text");
 if (stuckFreeText) {stuckFreeText.addEventListener("input", () => {state.stuckSignaldraft = stuckFreeText.value;});}}

function handleAction(action, element) {const handlers = {reset,
 "save-workspace": saveWorkspaceAndRender,
 "go-responses": goResponses,
 "parse-responses": parseResponsesAndRender,
 analyse,
 "go-evidence": goevidence,
 "save-edits": saveEditedJson,
 "generate-intervention": generateIntervention,
 "regenerate-intervention": regenerateIntervention,
 "save-intervention-edits": saveInterventionEdits,
 "focus-intervention-editor": focusInterventionEditor,
 "go-review": goreview,
 "set-control-section": () => setControlSection(element?.dataset.section),
 "save-section": saveActiveSection,
 "regenerate-section": regenerateActiveSection,
 "approve-section": approveActiveSection,
 "mark-under-review": markUnderreview,
 "approve-intervention": approveIntervention,
 "reject-intervention": rejectIntervention,
 "export-intervention-markdown": exportInterventionMarkdown,
 "copy-export-markdown": copyexportMarkdown,
 "download-prepared-export": downloadPreparedexport,
 "return-to-review": returnToreview,
 "publish-intervention": publishIntervention,
 "rollback-latest": rollbackLatest,
 "restore-version": () => restoreversion(Number(element?.dataset.version)),
 "update-student-memory": updateStudentMemory,
 "go-memory": goMemory,
 "go-student-portal": goStudentPortal,
 "go-understanding-map": goUnderstandingMap,
 "set-memory-filter": () => setMemoryFilter(element?.dataset.filter),
 "analyse-micro-quiz": analyseMicroQuiz,
 "set-student-alias": () => setStudentAlias(element?.dataset.alias),
 "submit-student-reflection": submitStudentReflection,
 "submit-student-micro-quiz": submitStudentMicroQuiz,
 "submit-stuck-signal": submitStuckSignal,
 "explain-another-way": explainAnotherWay,
 "assign-understanding-next-step": () => assignUnderstandingNextStep(element?.dataset.alias),
 "refresh-agent-brief": refreshAgentBrief,
 "go-intervention": goIntervention,
 approve,
 reject,
 rollback,
 "export-markdown": exportMarkdown};

 if (handlers[action]) handlers[action]();}

function saveWorkspaceAndRender() {saveWorkspace();
 render();}

function saveWorkspace() {state.workspace.teacher.display_name = valueOf("teacher-name", state.workspace.teacher.display_name);
 state.workspace.course.title = valueOf("course-title", state.workspace.course.title);
 state.workspace.class.name = valueOf("class-name", state.workspace.class.name);
 state.workspace.topic.title = valueOf("topic-title", state.workspace.topic.title);
 state.workspace.learning_objectives = linesOf("learning-objectives");
 state.workspace.lesson_material = valueOf("lesson-material", state.workspace.lesson_material);
 state.approval.status = "learning draft";
 addAudit("teacherSavedCourse, Topic, Learning objectiveandcourse material");}

function goResponses() {saveWorkspace();
 state.view = "responses";
 render();}

function parseResponsesFromInput() {state.rawResponses = valueOf("quiz-responses", state.rawResponses);
 state.parsedResponses = window.TeachFlowDiagnosisEngine.parseQuizResponses(state.rawResponses);
 state.workspace.student_aliases = [...new Set(state.parsedResponses.map((response) => response.student_alias))];
 addAudit(`already learning ${state.parsedResponses.length} drafts anonymised pupil response`);}

function parseResponsesAndRender() {parseResponsesFromInput();
 render();}

function analyse() {parseResponsesFromInput();
 const input = {topic: state.workspace.topic.title,
 learning_objectives: state.workspace.learning_objectives,
 lesson_material: state.workspace.lesson_material,
 quiz_responses: state.parsedResponses};
 state.analysis = window.TeachFlowDiagnosisEngine.diagnoseUnderstanding(input);
 state.editableJson = JSON.stringify(state.analysis, null, 2);
 state.approval.status = "Diagnosis learning";
 state.approval.version += 1;
 addAudit("already generatedMisconceptionDiagnosis");
 addAudit("already learning anonymised responsein learning evidencequote");
 state.view = "map";
 render();}

function goevidence() {state.view = "evidence";
 render();}

function goIntervention() {state.view = "intervention";
 render();}

function goreview() {state.view = "approval";
 render();}

function goMemory() {state.view = "memory";
 render();}

function goStudentPortal() {state.view = "student";
 render();}

function goUnderstandingMap() {prepareUnderstandingMap();
 state.view = "understanding";
 render();}

function saveEditedJson() {const raw = valueOf("analysis-json", "");
 try {const edited = JSON.parse(raw);
 state.analysis = edited;
 state.editableJson = JSON.stringify(edited, null, 2);
 state.approval.status = "teacher editedin";
 addAudit("teacher already edit diagnosis JSON");
 render();} catch (error) {addAudit("edit learning of JSON learningSaved");
 window.alert("edit learning of JSON learning is learningFormat.learningFormatlearningthenSaved.");}}

function generateIntervention() {if (!state.analysis) {analyse();
 return;}

 state.intervention = window.TeachFlowInterventionEngine.generateIntervention({analysis: state.analysis,
 learning_objectives: state.workspace.learning_objectives,
 lesson_material: state.workspace.lesson_material,
 topic: state.workspace.topic.title});
 state.intervention.status = "draft";
 state.editableInterventionJson = JSON.stringify(state.intervention, null, 2);
 state.interventionstatus = "draft";
 state.interventionApproval.status = "draft";
 state.interventionApproval.version += 1;
 state.sectionApprovals = window.TeachFlowControlLayer.createSectionApprovals(state.intervention);
 state.versionHistory = [];
 state.exportPackages = [];
 state.activeexportPackage = null;
 state.exportPreviewOpen = false;
 state.rollbackEvents = [];
 state.studentMemories = [];
 state.studentAssignments = [];
 state.studentReflections = [];
 state.studentMicroQuizAttempts = [];
 state.understandingMapNodes = [];
 state.studentStuckSignals = [];
 state.stuckSignaldraft = "";
 state.selectedStuckType = "diagram";
 state.alternateExplanations = {};
 state.assignedUnderstandingActions = [];
 state.schoolAgentBrief = "";
 state.studentReflectionDraft = "";
 state.followupAnalysis = null;
 state.activeSectionKey = "revised_teaching_plan";
 state.sectionEditorJson = JSON.stringify(window.TeachFlowControlLayer.getSectionContent(state.intervention, state.activeSectionKey), null, 2);
 addversion("ai", "AI already generated intervention draft", null);
 addAudit("already learningMisconception mapgenerate learning intervention", {actor: "ai_system",
 action: "generated_intervention",
 target_type: "intervention",
 target_id: state.intervention.intervention_id,
 details: "AI already learningMisconception mapgenerate intervention draft"});
 addAudit("already generated learning, learning material, learning, learning, quiz, learning andpupil handout", {actor: "ai_system",
 action: "generated_materials",
 target_type: "material",
 target_id: state.intervention.intervention_id,
 details: "already generated learning, learning material, learning, learning, quiz, teacher notesandpupil handout"});
 state.view = "intervention";
 render();}

function regenerateIntervention() {generateIntervention();
 addAudit("already generate learning intervention", {actor: "ai_system",
 action: "regenerated_intervention",
 target_type: "intervention",
 target_id: state.intervention?.intervention_id || "intervention",
 details: "AI already generate learning intervention draft"});
 render();}

function readInterventiondraft() {const editor = document.getElementById("intervention-json");
 if (editor) return editor.value;
 if (state.editableInterventionJson) return state.editableInterventionJson;
 return state.intervention? JSON.stringify(state.intervention, null, 2): "";}

function persistInterventiondraft(options = {}) {const raw = readInterventiondraft();
 const shouldRender = options.renderAfter!== false;
 const shouldAudit = options.audit!== false;

 if (!raw) {if (shouldAudit) addAudit("learningSavedofIntervention JSON");
 return false;}

 try {const edited = JSON.parse(raw);
 edited.export_markdown = window.TeachFlowInterventionEngine.buildMarkdown(edited);
 edited.status = options.status || "edited";
 state.intervention = edited;
 state.editableInterventionJson = JSON.stringify(edited, null, 2);
 state.interventionstatus = options.status || "edited";
 state.interventionApproval.status = state.interventionstatus;
 if (!options.skipversion) {addversion("teacher", options.versionsummary || "teacher already edit learning intervention JSON", null);}
 if (shouldAudit) {addAudit(options.auditText || "teacher already edit intervention JSON", {actor: "teacher",
 action: "edited_intervention_json",
 target_type: "intervention",
 target_id: state.intervention.intervention_id,
 details: options.auditText || "teacher already edit intervention JSON"});}
 if (shouldRender) render();
 return true;} catch (error) {if (shouldAudit) addAudit("edit learning ofIntervention JSON learningSaved");
 window.alert("edit learning ofIntervention JSON learning is learningFormat.learningFormatlearningthenSaved.");
 return false;}}

function saveInterventionEdits() {persistInterventiondraft();}

function setControlSection(sectionKey) {if (!sectionKey) return;
 state.activeSectionKey = sectionKey;
 state.sectionEditorJson = JSON.stringify(window.TeachFlowControlLayer.getSectionContent(state.intervention, sectionKey), null, 2);
 if (state.interventionstatus === "draft") {setInterventionstatus("under_review");}
 render();}

function sectionEditorValue() {if (!state.intervention) return "";
 if (state.sectionEditorJson) return state.sectionEditorJson;
 return JSON.stringify(window.TeachFlowControlLayer.getSectionContent(state.intervention, state.activeSectionKey), null, 2);}

function saveActiveSection(options = {}) {if (!state.intervention) return false;

 const editor = document.getElementById("section-editor");
 const raw = editor? editor.value: state.sectionEditorJson;
 const section = window.TeachFlowControlLayer.getSectionDefinition(state.activeSectionKey);
 const shouldAudit = options.audit!== false;
 const shouldRender = options.renderAfter!== false;

 if (!raw) return true;

 try {const parsed = JSON.parse(raw);
 const previous = window.TeachFlowControlLayer.getSectionContent(state.intervention, state.activeSectionKey);
 const changed = JSON.stringify(parsed)!== JSON.stringify(previous);

 if (!changed) {state.sectionEditorJson = JSON.stringify(parsed, null, 2);
 if (shouldRender) render();
 return true;}

 state.intervention = window.TeachFlowControlLayer.replaceSectionContent(state.intervention, state.activeSectionKey, parsed);
 rebuildInterventionexport();
 setInterventionstatus(options.status || "edited");
 updateSectionApproval(state.activeSectionKey, "edited");
 state.sectionEditorJson = JSON.stringify(parsed, null, 2);
 addversion("teacher", `teacher already edit${section.label}`, state.activeSectionKey);

 if (shouldAudit) {addAudit(`teacher already edit${section.label}`, {actor: "teacher",
 action: "edited_section",
 target_type: section.targetType,
 target_id: state.activeSectionKey,
 details: `teacher already edit${section.label}`});}

 if (shouldRender) render();
 return true;} catch (error) {if (shouldAudit) {addAudit(`${section.label} JSON learningSaved`, {actor: "teacher",
 action: "edit_failed",
 target_type: section.targetType,
 target_id: state.activeSectionKey,
 details: `${section.label} JSON learningSaved`});}
 window.alert("learning of JSON learning is learningFormat.learningFormatlearningthenSaved.");
 return false;}}

function regenerateActiveSection() {if (!state.intervention ||!state.analysis) return;

 const section = window.TeachFlowControlLayer.getSectionDefinition(state.activeSectionKey);
 const fresh = window.TeachFlowInterventionEngine.generateIntervention({analysis: state.analysis,
 learning_objectives: state.workspace.learning_objectives,
 lesson_material: state.workspace.lesson_material,
 topic: state.workspace.topic.title});

 const replacement = window.TeachFlowControlLayer.getSectionContent(fresh, state.activeSectionKey);
 state.intervention = window.TeachFlowControlLayer.replaceSectionContent(state.intervention, state.activeSectionKey, replacement);
 rebuildInterventionexport();
 setInterventionstatus("under_review");
 updateSectionApproval(state.activeSectionKey, "under_review");
 state.sectionEditorJson = JSON.stringify(replacement, null, 2);
 addversion("ai", `AI already generate${section.label}`, state.activeSectionKey);
 addAudit(`AI already generate${section.label}`, {actor: "ai_system",
 action: "regenerated_section",
 target_type: section.targetType,
 target_id: state.activeSectionKey,
 details: `AI already generate${section.label}, needs teacher review`});
 render();}

function approveActiveSection() {if (!state.intervention) return;
 const saved = saveActiveSection({audit: false, renderAfter: false});
 if (!saved) return;

 const section = window.TeachFlowControlLayer.getSectionDefinition(state.activeSectionKey);
 updateSectionApproval(state.activeSectionKey, "approved");
 if (!["approved", "exported", "published"].includes(state.interventionstatus)) {setInterventionstatus("under_review");}
 addversion("teacher", `teacher already approve${section.label}`, state.activeSectionKey);
 addAudit(`teacher already approve${section.label}`, {actor: "teacher",
 action: "approved_section",
 target_type: section.targetType,
 target_id: state.activeSectionKey,
 details: `teacher already approve${section.label}`});
 render();}

function markUnderreview() {if (!state.intervention) return;
 setInterventionstatus("under_review");
 addAudit("teacher already review intervention", {actor: "teacher",
 action: "started_review",
 target_type: "intervention",
 target_id: state.intervention.intervention_id,
 details: "teacher already learning intervention draft review status"});
 render();}

function rejectIntervention() {if (!state.intervention) return;
 setInterventionstatus("rejected");
 addversion("teacher", "teacher already learning intervention", null);
 addAudit("teacher already learning intervention", {actor: "teacher",
 action: "rejected_intervention",
 target_type: "intervention",
 target_id: state.intervention.intervention_id,
 details: "teacher already learning intervention"});
 render();}

function focusInterventionEditor() {const editor = document.getElementById("intervention-json");
 if (editor) {editor.focus();
 editor.scrollIntoview({behavior: "smooth", block: "center"});
 addAudit("teacher alreadyOpenIntervention JSON edit learning");}}

function approveIntervention() {if (!state.intervention) {generateIntervention();
 return;}

 if (document.getElementById("section-editor")) {const savedSection = saveActiveSection({audit: false, renderAfter: false});
 if (!savedSection) {addAudit("learning edit learning, teacher approval learning", {actor: "teacher",
 action: "approval_blocked",
 target_type: "material",
 target_id: state.activeSectionKey,
 details: "current learning edit learning, teacher approval learning"});
 render();
 return;}}

 const saved = persistInterventiondraft({audit: false,
 renderAfter: false,
 status: state.interventionstatus,
 skipversion: true});

 if (!saved) {addAudit("intervention edit learning, teacher approval learning", {actor: "teacher",
 action: "approval_blocked",
 target_type: "intervention",
 target_id: state.intervention.intervention_id,
 details: "intervention edit learning, teacher approval learning"});
 render();
 return;}

 window.TeachFlowControlLayer.SECTION_DEFINITIONS.forEach((section) => updateSectionApproval(section.key, "approved"));
 setInterventionstatus("approved");
 state.interventionApproval.approved_by = state.workspace.teacher.display_name || "teacher";
 state.interventionApproval.approved_at = new Date().toLocaleString();
 addversion("teacher", "teacher already approve learning intervention", null);
 addAudit("teacher already approve learning intervention", {actor: "teacher",
 action: "approved_intervention",
 target_type: "intervention",
 target_id: state.intervention.intervention_id,
 details: "teacher already approve learning interventionand learning editable learning"});
 render();}

function exportInterventionMarkdown() {if (!state.intervention) return;

 if (!canexportIntervention()) {window.alert("learningfirstapprove intervention, thenexport teacher learning.");
 addAudit("intervention learning approve, export learning", {actor: "teacher",
 action: "export_blocked",
 target_type: "export",
 target_id: state.intervention.intervention_id,
 details: "intervention learning approve, export learning"});
 return;}

 const exportPackage = window.TeachFlowControlLayer.createexportPackage({intervention: state.intervention,
 analysis: state.analysis,
 workspace: state.workspace,
 status: state.interventionstatus,
 sectionApprovals: state.sectionApprovals,
 versionHistory: state.versionHistory});
 state.exportPackages.push(exportPackage);
 state.activeexportPackage = exportPackage;
 state.exportPreviewOpen = true;
 setInterventionstatus("exported");
 addversion("teacher", "teacher already export Markdown learning", null);
 addAudit("already generated Markdown learning intervention export", {actor: "teacher",
 action: "exported_markdown",
 target_type: "export",
 target_id: exportPackage.export_id,
 details: "teacher already learninggoodalready approveof Markdown intervention preview"});
 updateStudentMemory({renderAfter: false, auditText: "alreadyinapprove export learningupdatepupil memory"});
 render();}

function copyexportMarkdown() {const content = state.activeexportPackage?.content || currentexportPreview();
 if (!content) return;

 if (navigator.clipboard?.writeText) {navigator.clipboard.writeText(content).catch(() => {});}
 addAudit("Markdown export already copy learning", {actor: "teacher",
 action: "copied_markdown",
 target_type: "export",
 target_id: state.activeexportPackage?.export_id || state.intervention?.intervention_id || "export",
 details: "teacher already learning Markdown export learning copy learning"});
 render();}

function downloadPreparedexport() {const content = state.activeexportPackage?.content || currentexportPreview();
 if (!content) return;

 downloadFile("teachflow-teacher-approved-intervention.md", content, "text/markdown");
 addAudit("Markdown export already learning", {actor: "teacher",
 action: "downloaded_markdown",
 target_type: "export",
 target_id: state.activeexportPackage?.export_id || state.intervention?.intervention_id || "export",
 details: "teacher already learning Markdown export learning"});
 render();}

function returnToreview() {state.exportPreviewOpen = false;
 render();}

function updateStudentMemory(options = {}) {if (!state.analysis) return;

 state.studentMemories = window.TeachFlowMemoryEngine.generateStudentMemories({analysis: state.analysis,
 intervention: state.intervention,
 previous_memories: state.studentMemories,
 topic_id: state.workspace.topic.id || state.workspace.topic.title});
 refreshUnderstandingMap({audit: false});

 addAudit(options.auditText || "already learninglatestDiagnosisandInterventionupdatepupil memory", {actor: "system",
 action: "student_memory_updated",
 target_type: "memory",
 target_id: state.workspace.topic.id || state.workspace.topic.title,
 details: options.auditText || "already learninglatestDiagnosisandInterventionupdatepupil memory"});

 if (options.renderAfter === false) return;
 state.view = "memory";
 render();}

function analyseMicroQuiz() {if (!state.analysis) return;

 if (state.studentMemories.length === 0) {updateStudentMemory({renderAfter: false, auditText: "alreadyin mini quizanalysis pupil memory"});}

 const raw = valueOf("micro-quiz-responses", state.microQuizResponses);
 state.microQuizResponses = raw;
 state.followupAnalysis = window.TeachFlowMemoryEngine.analyseMicroQuizAnswers({raw_responses: raw,
 analysis: state.analysis,
 intervention: state.intervention,
 existing_memories: state.studentMemories});
 state.studentMemories = state.followupAnalysis.student_memories;
 refreshUnderstandingMap({audit: false});
 addAudit("alreadyanalysis mini quiz response learningupdatepupil memory", {actor: "system",
 action: "student_memory_updated",
 target_type: "memory",
 target_id: state.workspace.topic.id || state.workspace.topic.title,
 details: "Micro-quiz answers analysed and student memory updated"});
 render();}

function setMemoryFilter(filter) {state.memoryFilter = filter || "all";
 render();}

function filteredMemories() {if (state.memoryFilter === "all") return state.studentMemories;
 return state.studentMemories.filter((memory) => memory.current_level === state.memoryFilter);}

function schoolAgentInput() {return {workspace: state.workspace,
 analysis: state.analysis,
 intervention: state.intervention,
 intervention_status: state.interventionstatus,
 student_memories: state.studentMemories,
 student_assignments: state.studentAssignments,
 understanding_map_nodes: state.understandingMapNodes,
 stuck_signals: state.studentStuckSignals,
 export_packages: state.exportPackages,
 audit: state.audit};}

function currentschoolAgentState() {return window.TeachFlowschoolAgentEngine.evaluateSystemState(schoolAgentInput());}

function refreshAgentBrief() {state.schoolAgentBrief = window.TeachFlowschoolAgentEngine.buildMorningBrief(schoolAgentInput());
 addAudit("school Agent alreadyrefreshlearning", {actor: "system",
 action: "school_agent_brief_refreshed",
 target_type: "analysis",
 target_id: state.workspace.topic.id || state.workspace.topic.title,
 details: "school Agent alreadyrefreshstatus, prioritylearning, safety learning and learning"});
 render();}

function prepareUnderstandingMap(options = {}) {if (!state.analysis) return;
 if (state.studentMemories.length === 0) {updateStudentMemory({renderAfter: false, auditText: "alreadyinunderstanding mappupil memory"});} else {refreshUnderstandingMap(options);}}

function refreshUnderstandingMap(options = {}) {if (!state.analysis || state.studentMemories.length === 0) return;
 state.understandingMapNodes = window.TeachFlowUnderstandingMapEngine.createUnderstandingMap({student_memories: state.studentMemories,
 analysis: state.analysis,
 intervention: state.intervention,
 reflections: state.studentReflections,
 micro_quiz_attempts: state.studentMicroQuizAttempts,
 stuck_signals: state.studentStuckSignals,
 topic_id: state.workspace.topic.id || state.workspace.topic.title});

 if (options.audit) {addAudit("pupilunderstanding mapalreadyrefresh", {actor: "system",
 action: "understanding_map_refreshed",
 target_type: "understanding_map",
 target_id: state.workspace.topic.id || state.workspace.topic.title,
 details: "System refreshed understanding map from memory, reflections, micro quiz attempts, and stuck signals"});}}

function currentStudentMemory() {return state.studentMemories.find((memory) => memory.student_alias === state.selectedStudentAlias)
 || state.studentMemories[0]
 || null;}

function understandingNodesFor(studentAlias) {return state.understandingMapNodes.filter((node) => node.student_alias === studentAlias);}

function currentStudentassignment() {return state.studentAssignments.find((assignment) => assignment.student_alias === state.selectedStudentAlias)
 || state.studentAssignments[0]
 || null;}

function currentAssignedmaterial() {return window.TeachFlowStudentPortalEngine.getAssignedmaterial({assignment: currentStudentassignment(),
 intervention: state.intervention});}

function setStudentAlias(alias) {if (!alias) return;
 state.selectedStudentAlias = alias;
 state.studentReflectionDraft = "";
 state.stuckSignaldraft = "";
 render();}

function submitStudentReflection() {const assignment = currentStudentassignment();
 if (!assignment) return;

 const response = valueOf("student-reflection", state.studentReflectionDraft).trim();
 if (!response) {window.alert("Please write a short reflection before submitting.");
 return;}

 state.studentReflections.push(window.TeachFlowStudentPortalEngine.createReflection({topic_id: state.workspace.topic.id || state.workspace.topic.title,
 student_alias: assignment.student_alias,
 prompt: "Explain this concept in your own words.",
 response}));
 state.studentReflectionDraft = "";
 markStudentassignmentComplete(assignment.student_alias);
 refreshUnderstandingMap({audit: false});
 addAudit(`${assignment.student_alias} alreadyinpupil portal lite submitreflection`, {actor: "student",
 action: "student_reflection_submitted",
 target_type: "memory",
 target_id: assignment.student_alias,
 details: `${assignment.student_alias} submitted a controlled reflection response`});
 render();}

function submitStudentMicroQuiz() {const assignment = currentStudentassignment();
 if (!assignment) return;

 const answers = Array.from(document.querySelectorAll("[data-micro-answer]")).map((element, index) => ({question_id: element.dataset.questionId || `question-${index + 1}`,
 answer: element.value.trim()})).filter((answer) => answer.answer);

 if (!answers.length) {window.alert("Please answer at least one micro quiz question before submitting.");
 return;}

 state.studentMicroQuizAttempts.push(window.TeachFlowStudentPortalEngine.createMicroQuizAttempt({intervention_id: state.intervention.intervention_id,
 topic_id: state.workspace.topic.id || state.workspace.topic.title,
 student_alias: assignment.student_alias,
 answers}));
 markStudentassignmentComplete(assignment.student_alias);
 refreshUnderstandingMap({audit: false});
 addAudit(`${assignment.student_alias} alreadyinpupil portal lite submit mini quiz`, {actor: "student",
 action: "student_micro_quiz_submitted",
 target_type: "memory",
 target_id: assignment.student_alias,
 details: `${assignment.student_alias} submitted controlled micro quiz answers`});
 render();}

function markStudentassignmentComplete(studentAlias) {const assignment = state.studentAssignments.find((item) => item.student_alias === studentAlias);
 if (assignment &&!assignment.completed_at) {assignment.completed_at = new Date().toISOString();}}

function submitStuckSignal() {const memory = currentStudentMemory();
 if (!memory) return;

 const stuckType = valueOf("stuck-type", state.selectedStuckType) || state.selectedStuckType;
 const freeText = valueOf("stuck-free-text", state.stuckSignaldraft).trim();
 state.selectedStuckType = stuckType;
 state.studentStuckSignals.push(window.TeachFlowUnderstandingMapEngine.createStuckSignal({topic_id: state.workspace.topic.id || state.workspace.topic.title,
 student_alias: memory.student_alias,
 stuck_type: stuckType,
 free_text: freeText}));
 state.stuckSignaldraft = "";
 refreshUnderstandingMap({audit: false});
 addAudit(`${memory.student_alias} submitted stuck signals`, {actor: "student",
 action: "student_stuck_signal_submitted",
 target_type: "understanding_map",
 target_id: memory.student_alias,
 details: `${memory.student_alias} reported being stuck on ${formatStuckType(stuckType)}`});
 render();}

function explainAnotherWay() {const memory = currentStudentMemory();
 if (!memory) return;
 const latestStuck = state.studentStuckSignals.filter((signal) => signal.student_alias === memory.student_alias).slice(-1)[0];
 state.alternateExplanations[memory.student_alias] = window.TeachFlowUnderstandingMapEngine.createAlternateExplanation({memory,
 assigned_material: currentAssignedmaterial(),
 latest_stuck_signal: latestStuck});
 addAudit(`${memory.student_alias} learning`, {actor: "student",
 action: "alternate_explanation_requested",
 target_type: "understanding_map",
 target_id: memory.student_alias,
 details: `${memory.student_alias} learning material learning`});
 render();}

function assignUnderstandingNextStep(alias) {const studentAlias = alias || currentStudentMemory()?.student_alias;
 const summary = window.TeachFlowUnderstandingMapEngine.summariseclassMap({nodes: state.understandingMapNodes,
 stuck_signals: state.studentStuckSignals}).find((item) => item.student_alias === studentAlias);

 if (!studentAlias ||!summary) return;
 const action = {id: `understanding-action-${Date.now()}-${studentAlias}`,
 topic_id: state.workspace.topic.id || state.workspace.topic.title,
 student_alias: studentAlias,
 action: summary.recommended_next_action,
 assigned_at: new Date().toISOString()};
 state.assignedUnderstandingActions.push(action);
 addAudit(`teacher already learning ${studentAlias} learning next step action`, {actor: "teacher",
 action: "assigned_understanding_next_action",
 target_type: "understanding_map",
 target_id: studentAlias,
 details: summary.recommended_next_action});
 render();}

function publishIntervention() {if (!state.intervention || state.interventionstatus!== "exported") return;
 if (state.studentMemories.length === 0) {updateStudentMemory({renderAfter: false, auditText: "alreadyinpublish pupil memory"});}

 state.studentAssignments = window.TeachFlowStudentPortalEngine.createassignments({intervention: state.intervention,
 student_memories: state.studentMemories,
 topic_id: state.workspace.topic.id || state.workspace.topic.title});
 if (!state.studentAssignments.some((assignment) => assignment.student_alias === state.selectedStudentAlias)) {state.selectedStudentAlias = state.studentAssignments[0]?.student_alias || "S002";}
 state.studentReflectionDraft = "";
 refreshUnderstandingMap({audit: false});
 setInterventionstatus("published");
 addversion("teacher", "teacher already pupil publish approve material", null);
 addAudit("teacher already learning approve material publish pupil portal lite", {actor: "teacher",
 action: "published_student_assignments",
 target_type: "intervention",
 target_id: state.intervention.intervention_id,
 details: "teacher already pupil alias publish already approveof learning material"});
 state.view = "student";
 render();}

function rollbackLatest() {if (state.versionHistory.length < 2) return;
 const previousversion = state.versionHistory[state.versionHistory.length - 2];
 restoreversion(previousversion.version_number);}

function restoreversion(versionNumber) {if (!versionNumber ||!state.intervention) return;
 const version = state.versionHistory.find((item) => item.version_number === versionNumber);
 if (!version) return;

 state.intervention = window.TeachFlowControlLayer.restoreversion(version);
 rebuildInterventionexport();
 setInterventionstatus("rolled_back");
 window.TeachFlowControlLayer.SECTION_DEFINITIONS.forEach((section) => updateSectionApproval(section.key, "under_review"));
 state.sectionEditorJson = JSON.stringify(window.TeachFlowControlLayer.getSectionContent(state.intervention, state.activeSectionKey), null, 2);
 const rollbackEvent = {rollback_id: `rollback-${Date.now()}`,
 restored_version_id: version.version_id,
 created_at: new Date().toISOString(),
 actor: "teacher",
 details: `teacher already learning version ${version.version_number}`};
 state.rollbackEvents.push(rollbackEvent);
 addversion("teacher", `teacher already learning version ${version.version_number}`, null);
 addAudit(`teacher already learning version ${version.version_number}`, {actor: "teacher",
 action: "rolled_back_intervention",
 target_type: "rollback",
 target_id: rollbackEvent.rollback_id,
 details: `teacher already learning version ${version.version_number}; intervention alreadyBackreview`});
 render();}

function approve() {state.approval.status = "already approve";
 state.approval.approved_by = state.workspace.teacher.display_name || "teacher";
 state.approval.approved_at = new Date().toLocaleString();
 addAudit("teacher already approveMisconceptionDiagnosis");
 render();}

function reject() {state.approval.status = "already learning";
 addAudit("teacher already learningMisconceptionDiagnosis");
 render();}

function rollback() {state.approval.status = "already learning";
 addAudit("teacher already learning diagnosis approval status");
 render();}

function exportMarkdown() {const markdown = buildMarkdownexport();
 downloadFile("teachflow-misconception-diagnosis.md", markdown, "text/markdown");
 addAudit("already generated Markdown diagnosis export");
 render();}

function setInterventionstatus(status) {state.interventionstatus = status;
 state.interventionApproval.status = status;
 if (state.intervention) {state.intervention.status = status;}}

function updateSectionApproval(sectionKey, status) {const section = window.TeachFlowControlLayer.getSectionDefinition(sectionKey);
 state.sectionApprovals[sectionKey] = {...(state.sectionApprovals[sectionKey] || {}),
 section_key: sectionKey,
 label: section.label,
 status,
 approved_by: status === "approved"? state.workspace.teacher.display_name || "teacher": state.sectionApprovals[sectionKey]?.approved_by || null,
 approved_at: status === "approved"? new Date().toISOString(): state.sectionApprovals[sectionKey]?.approved_at || null,
 updated_at: new Date().toISOString()};}

function rebuildInterventionexport() {if (!state.intervention) return;
 state.intervention.export_markdown = window.TeachFlowInterventionEngine.buildMarkdown(state.intervention);
 state.editableInterventionJson = JSON.stringify(state.intervention, null, 2);}

function addversion(createdBy, changesummary, sectionKey) {if (!state.intervention) return;
 const version = window.TeachFlowControlLayer.createversion({intervention: state.intervention,
 versionNumber: state.versionHistory.length + 1,
 createdBy,
 changesummary,
 sectionKey,
 status: state.interventionstatus});
 state.versionHistory.push(version);}

function currentexportPreview() {if (!state.intervention) return "";
 return window.TeachFlowControlLayer.buildexportMarkdown({intervention: state.intervention,
 analysis: state.analysis,
 workspace: state.workspace,
 status: state.interventionstatus,
 sectionApprovals: state.sectionApprovals,
 versionHistory: state.versionHistory});}

function canexportIntervention() {return ["approved", "exported", "published"].includes(state.interventionstatus);}

function formatDatetime(value) {return new Date(value).toLocaleString([], {month: "short",
 day: "numeric",
 hour: "2-digit",
 minute: "2-digit"});}

function reset() {state = createInitialState();
 addAudit("Diagnosis learning already learning");
 render();}

function buildMarkdownexport() {if (!state.analysis) return "# TeachFlow MisconceptionDiagnosis\n\ngenerateanalysis.";

 const lines = [`# TeachFlow MisconceptionDiagnosis: ${state.analysis.topic}`,
 "",
 `Course: ${state.workspace.course.title}`,
 `class: ${state.workspace.class.name}`,
 `learning: anonymised teacher learning`,
 `status: ${state.approval.status}`,
 "",
 "## classunderstandingsummary",
 state.analysis.class_understanding_summary,
 "",
 "## pupil level",
 `- learning: ${state.analysis.student_levels.confused.join(", ") || "learning"}`,
 `- Developing: ${state.analysis.student_levels.partially_understood.join(", ") || "learning"}`,
 `- Ready to apply: ${state.analysis.student_levels.ready_to_apply.join(", ") || "learning"}`,
 "",
 "## Misconception map",...state.analysis.misconceptions.flatMap((misconception, index) => [`### ${index + 1}. ${misconception.title}`,
 "",
 `learning: ${misconception.description}`,
 `learning: ${misconception.severity}`,
 `pupil: ${misconception.affected_students.join(", ")}`,
 "",
 "evidence: ",...misconception.evidence_quotes.map((evidence) => `- ${evidence.student_alias}: "${evidence.quote}" (${evidence.why_it_matters})`),
 "",
 `possiblelearning: ${misconception.likely_root_cause}`,
 `learning needs: ${misconception.teaching_need}`,
 `SuggestedNext step: ${misconception.recommended_next_action}`,
 ""]),
 "## teacher summary",
 state.analysis.teacher_summary];

 return lines.join("\n");}

function downloadFile(filename, content, type) {const blob = new Blob([content], {type});
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.href = url;
 link.download = filename;
 document.body.appendChild(link);
 link.click();
 link.remove();
 URL.revokeObjectURL(url);}

function addAudit(text, metadata = {}) {const entry = window.TeachFlowControlLayer.createAuditEntry({actor: metadata.actor || "teacher",
 action: metadata.action || "workflow_note",
 targetType: metadata.target_type || "analysis",
 targetId: metadata.target_id || state.analysis?.analysis_run_id || state.intervention?.intervention_id || "workspace",
 details: metadata.details || text});
 entry.text = text;
 state.audit.push(entry);}

function valueOf(id, fallback) {const element = document.getElementById(id);
 return element? element.value.trim(): fallback;}

function linesOf(id) {return valueOf(id, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);}

function statusclass(status) {const classMap = {"Map ready": "map-ready",
 published: "published",
 "Memory updated": "memory-updated",
 "Workspace draft": "workspace-draft",
 "Diagnosis ready": "diagnosis-ready",
 "teacher editing": "teacher-editing",
 Approved: "approved",
 Rejected: "rejected",
 "Rolled back": "rolled-back"};
 return classMap[status] || String(status).toLowerCase().replace(/[^a-z0-9]+/g, "-");}

function formatMapstatus(status) {const labels = {understood: "alreadyunderstanding",
 needs_support: "needs support",
 not_yet_assessed: "learning",
 setup: "Pendingsettings",
 diagnosis_ready: "Diagnosis learning",
 teacher_review: "teacher review",
 approved_materials: "material already approve",
 student_support_ready: "pupil support learning",
 pilot_ready: "Pilotlearning"};
 return labels[status] || window.TeachFlowControlLayer.formatstatus(status);}

function formatAgentReadiness(readinessLevel) {return formatMapstatus(readinessLevel);}

function formatStuckType(stuckType) {const labels = {definition: "learningunderstandinglearning",
 diagram: "learning view learningunderstanddiagram",
 formula_meaning: "learning formula, learningunderstandinglearning",
 example_transfer: "learning, learningcannotlearning",
 relevance: "learningconceptlearning",
 application: "learning, learningwill learn"};
 return labels[stuckType] || stuckType;}

function formatSupportStyle(style) {const labels = {visual: "learning",
 example: "learning",
 analogy: "learning",
 symbolic: "symbol",
 application: "learning"};
 return labels[style] || style;}

function formatPriorityLane(lane) {const labels = {teacher_workflow: "teacherworkflow",
 teacher_control: "teacher control",
 student_support: "pupil support",
 student_voice: "pupil learning",
 pilot_safety: "Pilotsafety",
 pilot_readiness: "Pilotlearning"};
 return labels[lane] || lane.replaceAll("_", " ");}

function formatSeverity(severity) {const labels = {high: "learning",
 medium: "in",
 low: "learning"};
 return labels[severity] || severity;}

function formatActor(actor) {const labels = {teacher: "teacher",
 ai: "AI",
 ai_system: "AI System",
 student: "pupil"};
 return labels[actor] || actor;}

function formatAuditTarget(targetType) {const labels = {workflow: "workflow",
 analysis: "Diagnosis",
 intervention: "Intervention",
 material: "material",
 export: "export",
 rollback: "learning",
 understanding_map: "understanding map"};
 return labels[targetType] || targetType;}

function formatFieldLabel(field) {const labels = {goal: "Goal",
 explanation: "learning",
 analogy: "learning",
 concept_bridge: "conceptlearning",
 task: "task",
 challenge: "learning"};
 return labels[field] || field.replaceAll("_", " ");}

function escapeHtml(value) {return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");}

function escapeAttr(value) {return escapeHtml(value);}
