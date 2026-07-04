const views = [
  { id: "dashboard", label: "Teacher Dashboard", kicker: "Input" },
  { id: "misconceptions", label: "Misconception Map", kicker: "Diagnosis" },
  { id: "materials", label: "Differentiated Materials", kicker: "Intervention" },
  { id: "control", label: "Teacher Control Panel", kicker: "Approval" },
  { id: "student", label: "Student Portal", kicker: "Published View" }
];

let data = null;
let state = createInitialState();

function createInitialState() {
  return {
    view: "dashboard",
    agentRun: false,
    workflowStatus: "Draft",
    published: false,
    previewMode: false,
    editing: false,
    profileUpdated: false,
    selectedStudent: "S001",
    reviewNote: "",
    audit: []
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("data/mock-output.json", { cache: "no-store" });
    data = await response.json();
    addAudit("Demo case loaded");
    render();
  } catch (error) {
    document.getElementById("app").innerHTML = `
      <section class="empty-state">
        <h3>Mock data could not be loaded.</h3>
        <p>Start the local server with npm run dev so the app can read data/mock-output.json.</p>
      </section>
    `;
  }
});

function render() {
  if (!data) return;
  renderNavigation();
  renderStatus();
  renderWorkflow();
  renderAudit();

  const activeView = views.find((view) => view.id === state.view);
  document.getElementById("view-title").textContent = activeView.label;
  document.getElementById("view-kicker").textContent = activeView.kicker;

  const app = document.getElementById("app");
  const renderers = {
    dashboard: renderDashboard,
    misconceptions: renderMisconceptions,
    materials: renderMaterials,
    control: renderControlPanel,
    student: renderStudentPortal
  };
  app.innerHTML = renderers[state.view]();
  bindInteractions();
}

function renderNavigation() {
  const nav = document.getElementById("nav-list");
  nav.innerHTML = views
    .map((view) => `
      <button class="nav-item ${state.view === view.id ? "active" : ""}" type="button" data-nav="${view.id}">
        <span>${escapeHtml(view.kicker)}</span>
        <strong>${escapeHtml(view.label)}</strong>
      </button>
    `)
    .join("");
}

function renderStatus() {
  const status = document.getElementById("workflow-status");
  status.textContent = state.workflowStatus;
  status.className = `status-value status-${statusClass(state.workflowStatus)}`;
}

function renderWorkflow() {
  const steps = ["Draft", "Approved", "Published"];
  const activeIndex = steps.indexOf(state.workflowStatus);
  const rail = document.getElementById("workflow-rail");

  if (state.workflowStatus === "Rolled Back") {
    rail.innerHTML = `
      <div class="rail-step complete"><span></span>Draft</div>
      <div class="rail-step muted"><span></span>Approved</div>
      <div class="rail-step muted"><span></span>Published</div>
      <div class="rail-step active rollback"><span></span>Rolled Back</div>
    `;
    return;
  }

  rail.innerHTML = steps
    .map((step, index) => {
      const stateClass = index < activeIndex ? "complete" : index === activeIndex ? "active" : "muted";
      return `<div class="rail-step ${stateClass}"><span></span>${step}</div>`;
    })
    .join("");
}

function renderAudit() {
  const auditLog = document.getElementById("audit-log");
  const count = document.getElementById("audit-count");
  count.textContent = String(state.audit.length);

  if (state.audit.length === 0) {
    auditLog.innerHTML = `<li><time>--:--</time><span>No actions yet</span></li>`;
    return;
  }

  auditLog.innerHTML = state.audit
    .map((entry) => `<li><time>${escapeHtml(entry.time)}</time><span>${escapeHtml(entry.text)}</span></li>`)
    .join("");
}

function renderDashboard() {
  const files = data.demo.uploaded_files
    .map((file) => `<li><span class="file-icon">MD</span><span>${escapeHtml(file)}</span></li>`)
    .join("");

  return `
    <div class="dashboard-layout">
      <section class="hero-panel">
        <div class="hero-copy">
          <p class="eyebrow">Course</p>
          <h3>${escapeHtml(data.demo.course)}</h3>
          <dl class="meta-grid">
            <div>
              <dt>Topic</dt>
              <dd>${escapeHtml(data.demo.topic)}</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>${escapeHtml(data.demo.class)}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>Mock Agent Output</dd>
            </div>
          </dl>
          <button class="primary-button" type="button" data-action="run-agent">
            ${state.agentRun ? "Run TeachFlow Agent Again" : "Run TeachFlow Agent"}
          </button>
        </div>
        <div class="visual-frame">
          <img src="${escapeHtml(data.visual_aid.image)}" alt="Fourier Transform prism visual aid">
        </div>
      </section>

      <section class="panel">
        <div class="section-heading">
          <p class="eyebrow">Uploaded Files</p>
          <h3>Demo Case Pack</h3>
        </div>
        <ul class="file-list">${files}</ul>
      </section>

      <section class="panel">
        <div class="section-heading">
          <p class="eyebrow">Original Plan</p>
          <h3>Current Lesson Plan</h3>
        </div>
        <ol class="number-list">
          ${data.current_lesson_plan.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ol>
      </section>
    </div>
  `;
}

function renderMisconceptions() {
  if (!state.agentRun) return renderGate("Run the TeachFlow Agent to generate the misconception map.");

  const levelRows = Object.values(data.class_summary.levels)
    .map((level) => `
      <div class="level-row">
        <strong>${escapeHtml(level.label)}</strong>
        <span>${escapeHtml(level.students.join(", "))}</span>
      </div>
    `)
    .join("");

  const cards = data.misconceptions
    .map((item, index) => `
      <article class="misconception-card">
        <div class="card-topline">
          <span>Misconception ${index + 1}</span>
          <strong class="severity severity-${item.severity.toLowerCase()}">${escapeHtml(item.severity)}</strong>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="evidence-list">
          ${item.evidence.map((evidence) => `<p>${escapeHtml(evidence)}</p>`).join("")}
        </div>
        <p class="teaching-need">${escapeHtml(item.teaching_need)}</p>
      </article>
    `)
    .join("");

  return `
    <div class="content-stack">
      <section class="panel summary-panel">
        <div>
          <p class="eyebrow">Class Understanding Summary</p>
          <h3>${escapeHtml(data.class_summary.overall)}</h3>
        </div>
        <ul class="observation-list">
          ${data.class_summary.observations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        <div class="level-table">${levelRows}</div>
      </section>

      <section class="card-grid three">${cards}</section>
    </div>
  `;
}

function renderMaterials() {
  if (!state.agentRun) return renderGate("Run the TeachFlow Agent to generate differentiated materials.");

  const materialCards = data.differentiated_materials
    .map((material) => `
      <article class="material-card">
        <div class="card-topline">
          <span>${escapeHtml(material.students.join(", "))}</span>
          <strong>${escapeHtml(material.level.replace("_", " ").toUpperCase())}</strong>
        </div>
        <h3>${escapeHtml(material.title)}</h3>
        <dl class="material-list">
          <div>
            <dt>Explanation</dt>
            <dd>${escapeHtml(material.explanation)}</dd>
          </div>
          <div>
            <dt>Analogy</dt>
            <dd>${escapeHtml(material.analogy)}</dd>
          </div>
          <div>
            <dt>Task</dt>
            <dd>${escapeHtml(material.task)}</dd>
          </div>
        </dl>
      </article>
    `)
    .join("");

  return `
    <div class="content-stack">
      <section class="panel recommendation-panel">
        <div>
          <p class="eyebrow">Teacher Recommendation</p>
          <h3>${escapeHtml(data.teacher_recommendation.headline)}</h3>
        </div>
        <ol class="number-list">
          ${data.teacher_recommendation.recommended_flow.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ol>
      </section>

      <section class="card-grid three">${materialCards}</section>

      <section class="panel visual-aid-panel">
        <div class="section-heading">
          <p class="eyebrow">Visual Aid Prompt</p>
          <h3>Waveform to Frequency Decomposition</h3>
        </div>
        <div class="visual-content">
          <img src="${escapeHtml(data.visual_aid.image)}" alt="Fourier Transform diagram">
          <p>${escapeHtml(data.visual_aid.prompt)}</p>
        </div>
      </section>
    </div>
  `;
}

function renderControlPanel() {
  const canReview = state.agentRun;
  const canPublish = state.workflowStatus === "Approved";
  const canRollback = state.workflowStatus === "Approved" || state.workflowStatus === "Published";

  return `
    <div class="control-layout">
      <section class="panel control-panel">
        <div class="section-heading">
          <p class="eyebrow">Workflow Status</p>
          <h3>${escapeHtml(state.workflowStatus)}</h3>
        </div>

        ${state.reviewNote ? `<p class="review-note">${escapeHtml(state.reviewNote)}</p>` : ""}

        <div class="button-grid">
          <button class="success-button" type="button" data-action="approve" ${!canReview ? "disabled" : ""}>Approve</button>
          <button class="secondary-button" type="button" data-action="edit" ${!canReview ? "disabled" : ""}>Edit</button>
          <button class="danger-button" type="button" data-action="reject" ${!canReview ? "disabled" : ""}>Reject</button>
          <button class="secondary-button" type="button" data-action="regenerate" ${!canReview ? "disabled" : ""}>Regenerate</button>
          <button class="secondary-button" type="button" data-action="preview-student" ${!canReview ? "disabled" : ""}>Preview as Student</button>
          <button class="primary-button" type="button" data-action="publish" ${!canPublish ? "disabled" : ""}>Publish</button>
          <button class="ghost-button" type="button" data-action="rollback" ${!canRollback ? "disabled" : ""}>Rollback</button>
        </div>

        ${state.editing ? `
          <label class="editor-block">
            Teacher edits
            <textarea rows="5">Start with the prism analogy before returning to the formal equation.</textarea>
          </label>
        ` : ""}
      </section>

      <section class="panel">
        <div class="section-heading">
          <p class="eyebrow">Control Principle</p>
          <h3>AI accelerates. Teacher approves.</h3>
        </div>
        <p class="body-copy">The agent can diagnose misconceptions and generate interventions, but publication stays behind teacher approval and rollback.</p>
      </section>

      <section class="panel">
        <div class="section-heading">
          <p class="eyebrow">Rollback Target</p>
          <h3>Previous Lesson Plan</h3>
        </div>
        <ol class="number-list">
          ${data.current_lesson_plan.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ol>
      </section>
    </div>
  `;
}

function renderStudentPortal() {
  const options = allStudents()
    .map((student) => `<option value="${escapeHtml(student)}" ${state.selectedStudent === student ? "selected" : ""}>${escapeHtml(student)}</option>`)
    .join("");
  const material = materialForStudent(state.selectedStudent);
  const canSeeMaterial = state.published || state.previewMode;
  const visibilityLabel = state.previewMode && !state.published ? "Preview Mode" : state.published ? "Published" : "Waiting for Publish";

  if (!canSeeMaterial) {
    return `
      <section class="empty-state">
        <span class="pill muted-pill">${visibilityLabel}</span>
        <h3>Student materials are not published yet.</h3>
        <p>The teacher approval flow controls what appears here.</p>
      </section>
    `;
  }

  return `
    <div class="student-layout">
      <section class="panel student-card">
        <div class="student-header">
          <div>
            <p class="eyebrow">Your Topic</p>
            <h3>${escapeHtml(data.demo.topic)}</h3>
          </div>
          <label class="select-label">
            Student
            <select id="student-select">${options}</select>
          </label>
        </div>

        <span class="pill">${visibilityLabel}</span>
        <h4>Your Explanation</h4>
        <p>${escapeHtml(material.explanation)}</p>

        <h4>Analogy</h4>
        <p>${escapeHtml(material.analogy)}</p>

        <h4>Learning Task</h4>
        <p>${escapeHtml(material.task)}</p>
      </section>

      <section class="panel visual-aid-panel">
        <div class="section-heading">
          <p class="eyebrow">Visual Aid</p>
          <h3>Fourier Transform Diagram</h3>
        </div>
        <img src="${escapeHtml(data.visual_aid.image)}" alt="Fourier Transform visual aid">
        <p>${escapeHtml(data.visual_aid.prompt)}</p>
      </section>

      <section class="panel quiz-panel">
        <div class="section-heading">
          <p class="eyebrow">Mini Quiz</p>
          <h3>Check Understanding</h3>
        </div>
        <ol class="number-list">
          ${data.micro_quiz.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}
        </ol>
        <form id="quiz-form" class="quiz-form">
          <label>
            Student answer
            <textarea id="student-answer" rows="4" placeholder="Write a short answer..."></textarea>
          </label>
          <button class="primary-button" type="submit">Submit Mini Quiz</button>
        </form>
        ${state.profileUpdated ? `
          <div class="profile-update">
            <strong>Understanding Profile Updated</strong>
            <p>Next action: ${escapeHtml(memoryForStudent(state.selectedStudent).recommended_next_action)}</p>
          </div>
        ` : ""}
      </section>

      <section class="panel assistant-panel">
        <div class="section-heading">
          <p class="eyebrow">Ask AI Assistant</p>
          <h3>Student Support</h3>
        </div>
        <p class="body-copy">Prompt ready: Explain Fourier Transform with the prism analogy and one real-world application.</p>
      </section>
    </div>
  `;
}

function renderGate(message) {
  return `
    <section class="empty-state">
      <span class="pill muted-pill">Draft</span>
      <h3>${escapeHtml(message)}</h3>
      <button class="primary-button" type="button" data-action="run-agent">Run TeachFlow Agent</button>
    </section>
  `;
}

function bindInteractions() {
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.nav;
      render();
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });

  const select = document.getElementById("student-select");
  if (select) {
    select.addEventListener("change", () => {
      state.selectedStudent = select.value;
      state.profileUpdated = false;
      render();
    });
  }

  const quizForm = document.getElementById("quiz-form");
  if (quizForm) {
    quizForm.addEventListener("submit", (event) => {
      event.preventDefault();
      state.profileUpdated = true;
      addAudit(`Student ${state.selectedStudent} submitted mini quiz`);
      addAudit(`Student ${state.selectedStudent} understanding profile updated`);
      render();
    });
  }
}

function handleAction(action) {
  const actions = {
    "run-agent": runAgent,
    approve: approveIntervention,
    edit: editIntervention,
    reject: rejectIntervention,
    regenerate: regenerateMaterials,
    "preview-student": previewStudent,
    publish: publishMaterials,
    rollback: rollbackPlan,
    "reset-demo": resetDemo
  };

  if (actions[action]) actions[action]();
}

function runAgent() {
  state.agentRun = true;
  state.workflowStatus = "Draft";
  state.published = false;
  state.previewMode = false;
  state.profileUpdated = false;
  state.reviewNote = "Agent output ready for teacher review.";
  addAudit("Agent diagnosis generated");
  addAudit("Materials generated");
  state.view = "misconceptions";
  render();
}

function approveIntervention() {
  state.workflowStatus = "Approved";
  state.reviewNote = "Teacher approved intervention.";
  addAudit("Teacher approved intervention");
  render();
}

function editIntervention() {
  state.workflowStatus = "Draft";
  state.editing = !state.editing;
  state.reviewNote = state.editing ? "Teacher edit mode enabled." : "Teacher edits saved to draft.";
  addAudit(state.editing ? "Teacher opened edit mode" : "Teacher saved edits");
  render();
}

function rejectIntervention() {
  state.workflowStatus = "Draft";
  state.published = false;
  state.previewMode = false;
  state.reviewNote = "Intervention rejected. Regenerate or edit before publishing.";
  addAudit("Teacher rejected intervention");
  render();
}

function regenerateMaterials() {
  state.agentRun = true;
  state.workflowStatus = "Draft";
  state.published = false;
  state.previewMode = false;
  state.profileUpdated = false;
  state.reviewNote = "Agent regenerated materials from mock output.";
  addAudit("Agent diagnosis generated");
  addAudit("Materials generated");
  render();
}

function previewStudent() {
  state.previewMode = true;
  state.view = "student";
  addAudit("Teacher previewed student portal");
  render();
}

function publishMaterials() {
  state.workflowStatus = "Published";
  state.published = true;
  state.previewMode = false;
  state.reviewNote = "Published to Student Portal.";
  addAudit("Published to student portal");
  addAudit("Rollback available");
  state.view = "student";
  render();
}

function rollbackPlan() {
  state.workflowStatus = "Rolled Back";
  state.published = false;
  state.previewMode = false;
  state.profileUpdated = false;
  state.reviewNote = "Rolled back to previous lesson plan.";
  addAudit("Rollback triggered");
  state.view = "control";
  render();
}

function resetDemo() {
  state = createInitialState();
  addAudit("Demo case loaded");
  render();
}

function addAudit(text) {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  state.audit.push({ time, text });
}

function allStudents() {
  const students = Object.values(data.class_summary.levels).flatMap((level) => level.students);
  return [...new Set(students)].sort();
}

function materialForStudent(studentId) {
  const levelKey = Object.entries(data.class_summary.levels).find(([, level]) => level.students.includes(studentId))?.[0];
  return data.differentiated_materials.find((material) => material.level === levelKey) || data.differentiated_materials[0];
}

function memoryForStudent(studentId) {
  return data.student_memory_update[studentId] || {
    current_understanding: "Updated after mini quiz submission.",
    weak_points: ["Needs continued practice"],
    recommended_next_action: "Review the assigned explanation and answer one follow-up question."
  };
}

function statusClass(status) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
