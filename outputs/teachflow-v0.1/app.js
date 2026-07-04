const views = [
  { id: "agent", label: "AI 学校系统 Agent", kicker: "系统总控" },
  { id: "workspace", label: "教师工作区", kicker: "课程设置" },
  { id: "responses", label: "学生回答输入", kicker: "匿名输入" },
  { id: "map", label: "误解地图", kicker: "诊断结果" },
  { id: "evidence", label: "证据复核", kicker: "教师复核" },
  { id: "intervention", label: "干预生成器", kicker: "教学方案" },
  { id: "approval", label: "审批与导出", kicker: "教师控制" },
  { id: "memory", label: "学生记忆", kicker: "学习记忆" },
  { id: "student", label: "学生门户 Lite", kicker: "已审批材料" },
  { id: "understanding", label: "理解地图", kicker: "学习状态" }
];

let state = createInitialState();

document.addEventListener("DOMContentLoaded", () => {
  addAudit("诊断工作区已加载");
  document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      handleAction(actionButton.dataset.action, actionButton);
    }
  });
  render();
});

function createInitialState() {
  const seed = structuredClone(window.TEACHFLOW_SEED);
  return {
    view: "agent",
    workspace: seed.workspace,
    rawResponses: seed.workspace.quiz_responses_csv,
    parsedResponses: window.TeachFlowDiagnosisEngine.parseQuizResponses(seed.workspace.quiz_responses_csv),
    analysis: null,
    editableJson: "",
    intervention: null,
    editableInterventionJson: "",
    interventionStatus: "draft",
    sectionApprovals: window.TeachFlowControlLayer.createSectionApprovals(null),
    versionHistory: [],
    exportPackages: [],
    activeExportPackage: null,
    exportPreviewOpen: false,
    rollbackEvents: [],
    studentMemories: [],
    studentAssignments: [],
    studentReflections: [],
    studentMicroQuizAttempts: [],
    understandingMapNodes: [],
    studentStuckSignals: [],
    stuckSignalDraft: "",
    selectedStuckType: "diagram",
    alternateExplanations: {},
    assignedUnderstandingActions: [],
    schoolAgentBrief: "",
    selectedStudentAlias: "S002",
    studentReflectionDraft: "",
    memoryFilter: "all",
    microQuizResponses: `student_id,answer
S002,"傅里叶变换用频率成分表示同一个信号"
S004,"它能帮助我们在音乐或核磁共振信号中找到频率"`,
    followupAnalysis: null,
    activeSectionKey: "revised_teaching_plan",
    sectionEditorJson: "",
    editMode: false,
    approval: seed.approval,
    interventionApproval: {
      id: "intervention-approval-demo-001",
      status: "draft",
      version: 0,
      approved_by: null,
      approved_at: null
    },
    audit: []
  };
}

function render() {
  renderNavigation();
  renderStatus();
  renderAuditMini();

  const activeView = views.find((view) => view.id === state.view);
  document.getElementById("view-title").textContent = activeView.label;
  document.getElementById("view-kicker").textContent = activeView.kicker;

  const renderers = {
    agent: renderSchoolAgentConsole,
    workspace: renderWorkspace,
    responses: renderResponses,
    map: renderMisconceptionMap,
    evidence: renderEvidenceReview,
    intervention: renderInterventionStudio,
    approval: renderApprovalExport,
    memory: renderStudentMemory,
    student: renderStudentPortal,
    understanding: renderUnderstandingMap
  };

  document.getElementById("app").innerHTML = renderers[state.view]();
  bindInteractions();
}

function renderNavigation() {
  document.getElementById("nav-list").innerHTML = views
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
  const visibleStatus = state.view === "agent"
    ? formatAgentReadiness(currentSchoolAgentState().readiness_level)
    : state.view === "understanding" && state.understandingMapNodes.length
    ? "地图就绪"
    : state.view === "student" && state.studentAssignments.length
    ? "已发布"
    : state.view === "memory" && state.studentMemories.length
    ? "记忆已更新"
    : ["intervention", "approval"].includes(state.view) && state.intervention
    ? window.TeachFlowControlLayer.formatStatus(state.interventionStatus)
    : state.approval.status;
  status.textContent = visibleStatus;
  status.className = `status-value ${statusClass(visibleStatus)}`;
}

function renderAuditMini() {
  const list = document.getElementById("audit-mini-list");
  document.getElementById("audit-count").textContent = String(state.audit.length);
  list.innerHTML = state.audit
    .slice(-7)
    .map((entry) => `<li><time>${escapeHtml(entry.time)}</time><span>${escapeHtml(entry.text)}</span></li>`)
    .join("");
}

function renderSchoolAgentConsole() {
  const agentState = currentSchoolAgentState();
  const brief = state.schoolAgentBrief || window.TeachFlowSchoolAgentEngine.buildMorningBrief(schoolAgentInput());
  const highPriorityCount = agentState.priorities.filter((item) => item.severity === "high").length;

  return `
    <div class="agent-console-layout">
      <section class="panel agent-main-panel">
        <div class="section-heading split-heading">
          <div>
            <p class="eyebrow">AI 学校系统 Agent · 晨间简报</p>
            <h3>系统就绪度：${escapeHtml(formatAgentReadiness(agentState.readiness_level))}</h3>
          </div>
          <span class="pill">${escapeHtml(agentState.mode)}</span>
        </div>

        ${renderReadinessStepper(agentState.readiness_level)}

        <p class="student-note">${escapeHtml(agentState.summary)}</p>

        ${renderAgentMetrics(highPriorityCount)}

        <div class="agent-next-action">
          <span>下一步最佳行动</span>
          <strong>${escapeHtml(agentState.next_best_action)}</strong>
        </div>
        <div class="editor-actions multi-actions">
          <button class="primary-button" type="button" data-action="refresh-agent-brief">刷新 Agent 简报</button>
          <button class="secondary-button" type="button" data-action="go-understanding-map" ${state.analysis ? "" : "disabled"}>打开理解地图</button>
        </div>

        <div class="section-heading split-heading" style="margin-top:24px;">
          <div>
            <p class="eyebrow">优先级队列</p>
            <h3>Agent 建议的行动顺序</h3>
          </div>
          <span class="pill muted-pill">${agentState.priorities.length} 项</span>
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
          <p class="eyebrow">安全边界</p>
          <h3>学校可试用规则</h3>
        </div>
        <ul class="guardrail-list">
          ${agentState.guardrails.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        <div class="brief-box submission-review-block">
          <h4>晨间简报（可复制）</h4>
          <textarea rows="16" readonly>${escapeHtml(brief)}</textarea>
        </div>
      </aside>
    </div>
  `;
}

const READINESS_STAGES = [
  { key: "setup", label: "建立" },
  { key: "diagnosis_ready", label: "诊断" },
  { key: "teacher_review", label: "审批" },
  { key: "approved_materials", label: "导出" },
  { key: "student_support_ready", label: "发布" },
  { key: "pilot_ready", label: "试用" }
];

function renderReadinessStepper(readinessLevel) {
  const currentIndex = READINESS_STAGES.findIndex((stage) => stage.key === readinessLevel);
  return `
    <div class="readiness-stepper" aria-label="系统就绪度进度">
      ${READINESS_STAGES.map((stage, index) => {
        const stageClass = index < currentIndex ? "done" : index === currentIndex ? "current" : "";
        const mark = index < currentIndex ? "✓" : String(index + 1);
        return `
          <div class="stepper-node ${stageClass}">
            <span class="stepper-dot">${mark}</span>
            <small>${escapeHtml(stage.label)}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderAgentMetrics(highPriorityCount) {
  const misconceptionCount = state.analysis?.misconceptions?.length || 0;
  const aliasCount = new Set([
    ...state.studentMemories.map((item) => item.student_alias),
    ...state.studentAssignments.map((item) => item.student_alias)
  ]).size;
  const needsSupportCount = state.understandingMapNodes.filter((node) => node.status === "needs_support").length;

  const cards = [
    { value: misconceptionCount, label: "诊断出的误解", accent: "" },
    { value: aliasCount, label: "在册匿名别名", accent: "accent-success" },
    { value: needsSupportCount, label: "需支持的节点", accent: needsSupportCount ? "accent-warn" : "" },
    { value: highPriorityCount, label: "高优先级行动", accent: highPriorityCount ? "accent-danger" : "" }
  ];

  return `
    <div class="metric-grid">
      ${cards.map((card) => `
        <div class="metric-card ${card.accent}">
          <div class="metric-value">${escapeHtml(String(card.value))}</div>
          <div class="metric-label">${escapeHtml(card.label)}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderWorkspace() {
  return `
    <div class="workspace-grid">
      <section class="hero-panel">
        <div class="hero-copy">
          <p class="eyebrow">误解诊断引擎</p>
          <h3>用证据找出学生真正没有理解的地方。</h3>
          <p>教师专用流程。不评分、不使用真实姓名、不开放学生聊天机器人。每条诊断都必须引用匿名学生原句。</p>
          <div class="alias-row" style="margin-top:16px;">
            <span>①&nbsp;设置主题</span>
            <span>②&nbsp;录入回答</span>
            <span>③&nbsp;生成诊断</span>
            <span>④&nbsp;审批导出</span>
          </div>
          <div class="hero-actions">
            <button class="primary-button" type="button" data-action="save-workspace">保存主题</button>
            <button class="success-button" type="button" data-action="go-responses">下一步：学生回答</button>
          </div>
        </div>
        <div class="principle-list">
          <h4>输出规则</h4>
          <ul>
            <li>不得编造证据。</li>
            <li>只使用临时学习状态语言。</li>
            <li>关注理解，不做评分。</li>
            <li>教师可以编辑、审批和导出。</li>
          </ul>
        </div>
      </section>

      <section class="panel">
        <div class="section-heading">
          <p class="eyebrow">课程</p>
          <h3>创建课程与主题</h3>
        </div>
        <div class="form-grid two">
          <label>教师显示名<input id="teacher-name" value="${escapeAttr(state.workspace.teacher.display_name)}"></label>
          <label>课程<input id="course-title" value="${escapeAttr(state.workspace.course.title)}"></label>
          <label>班级<input id="class-name" value="${escapeAttr(state.workspace.class.name)}"></label>
          <label>主题<input id="topic-title" value="${escapeAttr(state.workspace.topic.title)}"></label>
        </div>
      </section>

      <section class="panel">
        <div class="section-heading">
          <p class="eyebrow">学习目标</p>
          <h3>学生应该理解什么</h3>
        </div>
        <textarea id="learning-objectives" rows="8">${escapeHtml(state.workspace.learning_objectives.join("\n"))}</textarea>
      </section>

      <section class="panel full-span">
        <div class="section-heading">
          <p class="eyebrow">课程材料</p>
          <h3>粘贴课堂笔记或讲稿</h3>
        </div>
        <textarea id="lesson-material" rows="8">${escapeHtml(state.workspace.lesson_material)}</textarea>
      </section>
    </div>
  `;
}

function renderResponses() {
  const previewRows = state.parsedResponses
    .map((response) => `
      <tr>
        <td>${escapeHtml(response.student_alias)}</td>
        <td>${escapeHtml(response.answer)}</td>
        <td>${escapeHtml(response.confidence ?? "")}</td>
      </tr>
    `)
    .join("");

  return `
    <div class="content-stack">
      <section class="panel">
        <div class="section-heading split-heading">
          <div>
            <p class="eyebrow">隐私优先输入</p>
            <h3>粘贴匿名学生回答</h3>
          </div>
          <span class="pill muted-pill">只使用别名：S001、S002、S003</span>
        </div>
        <textarea id="quiz-responses" rows="12">${escapeHtml(state.rawResponses)}</textarea>
        <div class="hero-actions">
          <button class="secondary-button" type="button" data-action="parse-responses">预览回答</button>
          <button class="success-button" type="button" data-action="analyse">分析理解状态</button>
        </div>
      </section>

      <section class="panel">
        <div class="section-heading">
          <p class="eyebrow">解析预览</p>
          <h3>${state.parsedResponses.length} 份匿名回答已准备好</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>别名</th><th>回答</th><th>信心</th></tr>
            </thead>
            <tbody>${previewRows}</tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderMisconceptionMap() {
  if (!state.analysis) {
    return renderGate("请先粘贴学生回答，并点击“分析理解状态”生成误解地图。", "go-responses", "前往学生回答");
  }

  const levels = Object.entries(state.analysis.student_levels)
    .map(([key, aliases]) => `
      <article class="level-card">
        <div class="card-topline">
          <span>${escapeHtml(key.replaceAll("_", " "))}</span>
          <strong>${aliases.length} 名学生</strong>
        </div>
        <div class="alias-row">${aliases.map((alias) => `<span>${escapeHtml(alias)}</span>`).join("")}</div>
      </article>
    `)
    .join("");

  const misconceptions = state.analysis.misconceptions
    .map((misconception, index) => `
      <article class="misconception-card">
        <div class="card-topline">
          <span>误解 ${index + 1}</span>
          <strong class="severity severity-${escapeAttr(misconception.severity)}">${escapeHtml(misconception.severity)}</strong>
        </div>
        <h3>${escapeHtml(misconception.title)}</h3>
        <p>${escapeHtml(misconception.description)}</p>
        <div class="alias-row">${misconception.affected_students.map((alias) => `<span>${escapeHtml(alias)}</span>`).join("")}</div>
        <dl>
          <div><dt>可能根因</dt><dd>${escapeHtml(misconception.likely_root_cause)}</dd></div>
          <div><dt>教学需要</dt><dd>${escapeHtml(misconception.teaching_need)}</dd></div>
          <div><dt>建议下一步</dt><dd>${escapeHtml(misconception.recommended_next_action)}</dd></div>
        </dl>
      </article>
    `)
    .join("");

  return `
    <div class="content-stack">
      <section class="panel summary-panel">
        <div>
          <p class="eyebrow">班级理解摘要</p>
          <h3>${escapeHtml(state.analysis.class_understanding_summary)}</h3>
        </div>
        <div>
          <p class="hint">${escapeHtml(state.analysis.teacher_summary)}</p>
        </div>
        <button class="primary-button" type="button" data-action="go-evidence">复核证据</button>
        <button class="success-button" type="button" data-action="generate-intervention">生成教学干预</button>
      </section>
      <section class="card-grid three">${levels}</section>
      <section class="card-grid three">${misconceptions}</section>
    </div>
  `;
}

function renderEvidenceReview() {
  if (!state.analysis) {
    return renderGate("请先运行诊断，再复核证据。", "go-responses", "前往学生回答");
  }

  const evidenceRows = state.analysis.misconceptions
    .flatMap((misconception) => misconception.evidence_quotes.map((evidence) => ({ misconception, evidence })))
    .map(({ misconception, evidence }) => `
      <tr>
        <td>${escapeHtml(misconception.title)}</td>
        <td>${escapeHtml(evidence.student_alias)}</td>
        <td>"${escapeHtml(evidence.quote)}"</td>
        <td>${escapeHtml(evidence.why_it_matters)}</td>
      </tr>
    `)
    .join("");

  const validation = window.TeachFlowDiagnosisEngine.validateAnalysis(state.analysis, state.parsedResponses);

  return `
    <div class="content-stack">
      <section class="panel">
        <div class="section-heading split-heading">
          <div>
            <p class="eyebrow">证据复核</p>
            <h3>每条引用都必须来自学生原始回答</h3>
          </div>
          <span class="pill ${validation.valid ? "" : "warning-pill"}">${validation.valid ? "证据有效" : "需要复核"}</span>
        </div>
        ${validation.valid ? "" : `<ul>${validation.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>`}
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>误解</th><th>别名</th><th>学生原句</th><th>为什么重要</th></tr>
            </thead>
            <tbody>${evidenceRows}</tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="section-heading split-heading">
          <div>
            <p class="eyebrow">可编辑 JSON</p>
            <h3>教师可以编辑生成的诊断</h3>
          </div>
          <button class="secondary-button" type="button" data-action="save-edits">保存编辑后的 JSON</button>
        </div>
        <textarea id="analysis-json" rows="22">${escapeHtml(state.editableJson || JSON.stringify(state.analysis, null, 2))}</textarea>
      </section>
    </div>
  `;
}

function renderInterventionStudio() {
  if (!state.analysis) {
    return renderGate("请先运行诊断，再生成教学干预。", "go-responses", "前往学生回答");
  }

  if (!state.intervention) {
    return `
      <section class="empty-state">
        <span class="pill muted-pill">干预生成器</span>
        <h3>把误解地图转化为教学方案。</h3>
        <p class="hint">生成的干预会继续关联诊断出的误解和学生别名。</p>
        <button class="primary-button" type="button" data-action="generate-intervention">生成教学干预</button>
      </section>
    `;
  }

  const validation = window.TeachFlowInterventionEngine.validateIntervention(state.intervention);
  const materials = state.intervention.differentiated_materials;

  return `
    <div class="intervention-studio">
      <section class="panel source-map-panel">
        <div class="section-heading">
          <p class="eyebrow">来源误解</p>
          <h3>基于诊断生成</h3>
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
            <p class="eyebrow">生成的干预</p>
            <h3>${escapeHtml(state.intervention.topic)}</h3>
          </div>
          <span class="pill ${validation.valid ? "" : "warning-pill"}">${validation.valid ? "已关联误解" : "需要复核"}</span>
        </div>

        <p class="hint">${escapeHtml(state.intervention.intervention_summary)}</p>

        <div class="intervention-section">
          <h4>修订后的教学计划</h4>
          <p>${escapeHtml(state.intervention.revised_teaching_plan.rationale)}</p>
          <ol class="plan-list">
            ${state.intervention.revised_teaching_plan.steps.map((step) => `
              <li>
                <strong>${escapeHtml(step.title)}</strong>
                <span>教师：${escapeHtml(step.teacher_action)}</span>
                <span>学生：${escapeHtml(step.student_action)}</span>
                <small>关联误解：${escapeHtml(step.linked_misconception_ids.join(", "))}</small>
              </li>
            `).join("")}
          </ol>
        </div>

        <div class="card-grid three">
          ${renderMaterialCard("Level 1：困惑", materials.level_1_confused, ["goal", "explanation", "analogy", "task"])}
          ${renderMaterialCard("Level 2：部分理解", materials.level_2_partially_understood, ["goal", "explanation", "concept_bridge", "task"])}
          ${renderMaterialCard("Level 3：准备应用", materials.level_3_ready_to_apply, ["goal", "challenge"])}
        </div>

        <div class="intervention-section">
          <h4>可视化辅助提示</h4>
          <p>${escapeHtml(state.intervention.visual_aid.image_prompt)}</p>
          <p class="hint">${escapeHtml(state.intervention.visual_aid.diagram_description)}</p>
          <div class="alias-row">${state.intervention.visual_aid.labels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}</div>
        </div>

        <div class="intervention-section two-column-section">
          <div>
            <h4>视频分镜</h4>
            <ol class="compact-list">
              ${state.intervention.video_storyboard.map((scene) => `<li><strong>场景 ${scene.scene_number}</strong>：${escapeHtml(scene.description)} <span>${escapeHtml(scene.narration)}</span></li>`).join("")}
            </ol>
          </div>
          <div>
            <h4>微型测验</h4>
            <ol class="compact-list">
              ${state.intervention.micro_quiz.map((item) => `<li>${escapeHtml(item.question)} <span>${escapeHtml(item.purpose)}</span></li>`).join("")}
            </ol>
          </div>
        </div>

        <div class="intervention-section">
          <h4>教师备注</h4>
          <ul class="compact-list">
            ${state.intervention.teacher_notes.map((item) => `<li><strong>${escapeHtml(item.note)}</strong> ${escapeHtml(item.why_it_matters)}</li>`).join("")}
          </ul>
        </div>

        <div class="intervention-section">
          <h4>学生材料</h4>
          <p>${escapeHtml(state.intervention.student_facing_material?.body || "")}</p>
          <p class="hint">${escapeHtml(state.intervention.student_facing_material?.practice_prompt || "")}</p>
        </div>

        <div class="intervention-section">
          <div class="section-heading split-heading">
            <div>
              <p class="eyebrow">可编辑 JSON</p>
              <h4>每个部分都可在审批前编辑</h4>
            </div>
          </div>
          <textarea id="intervention-json" rows="20">${escapeHtml(state.editableInterventionJson || JSON.stringify(state.intervention, null, 2))}</textarea>
          <div class="editor-actions">
            <button class="secondary-button" type="button" data-action="save-intervention-edits">保存干预编辑</button>
          </div>
        </div>
      </section>

      <aside class="panel intervention-control-panel">
        <div class="section-heading">
          <p class="eyebrow">教师控制</p>
          <h3>${escapeHtml(window.TeachFlowControlLayer.formatStatus(state.interventionStatus))}</h3>
        </div>
        <div class="button-grid">
          <button class="secondary-button" type="button" data-action="regenerate-intervention">重新生成</button>
          <button class="secondary-button" type="button" data-action="focus-intervention-editor">编辑 JSON</button>
          <button class="primary-button" type="button" data-action="go-review">进入复核</button>
          <button class="success-button" type="button" data-action="approve-intervention">批准</button>
          <button class="primary-button" type="button" data-action="export-intervention-markdown" ${canExportIntervention() ? "" : "disabled"}>导出 Markdown</button>
        </div>
        <p class="hint">只有教师批准后才能导出。</p>
        ${validation.valid ? "" : `<ul>${validation.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>`}
        <div class="audit-box">
          <h4>最近审计</h4>
          <ol>${state.audit.slice(-6).map((entry) => `<li><time>${escapeHtml(entry.time)}</time>${escapeHtml(entry.text)}</li>`).join("")}</ol>
        </div>
      </aside>
    </div>
  `;
}

function renderMaterialCard(title, material, fields) {
  const extraConnections = material.cross_domain_connections
    ? `<div><dt>关联应用</dt><dd>${material.cross_domain_connections.map((item) => escapeHtml(item)).join("<br>")}</dd></div>`
    : "";

  return `
    <article class="material-card">
      <div class="card-topline">
        <span>${escapeHtml(material.target_students.join(", ") || "暂无别名")}</span>
        <strong>${escapeHtml(material.linked_misconception_ids.join(", "))}</strong>
      </div>
      <h3>${escapeHtml(title)}</h3>
      <dl>
        ${fields.map((field) => `<div><dt>${escapeHtml(formatFieldLabel(field))}</dt><dd>${escapeHtml(material[field])}</dd></div>`).join("")}
        ${extraConnections}
      </dl>
    </article>
  `;
}

function renderApprovalExport() {
  if (!state.analysis) {
    return renderGate("请先运行诊断，再打开教师控制层。", "go-responses", "前往学生回答");
  }

  if (!state.intervention) {
    return `
      <section class="empty-state">
        <span class="pill muted-pill">复核与审批工作台</span>
        <h3>请先生成教学干预，再进行教师审批。</h3>
        <p class="hint">有了可供教师复核的 AI 草稿后，控制层才会启动。</p>
        <button class="primary-button" type="button" data-action="generate-intervention">生成教学干预</button>
      </section>
    `;
  }

  const activeSection = window.TeachFlowControlLayer.getSectionDefinition(state.activeSectionKey);
  const activeApproval = state.sectionApprovals[activeSection.key];
  const currentVersion = state.versionHistory[state.versionHistory.length - 1];
  const exportPreview = state.activeExportPackage?.content || currentExportPreview();
  const exportPreviewTitle = state.activeExportPackage ? "已准备好的 Markdown 包" : "教师包实时预览";

  return `
    <div class="review-studio">
      <section class="panel source-evidence-panel">
        <div class="section-heading split-heading">
          <div>
            <p class="eyebrow">来源证据</p>
            <h3>这份草稿为什么存在</h3>
          </div>
          <span class="pill muted-pill">${state.parsedResponses.length} 份回答</span>
        </div>
        <div class="evidence-block">
          <h4>学习目标</h4>
          <ul>${state.workspace.learning_objectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
        <div class="evidence-block">
          <h4>误解地图</h4>
          ${state.analysis.misconceptions.map((misconception) => `
            <article class="compact-evidence-item">
              <strong>${escapeHtml(misconception.title)}</strong>
              <span>${escapeHtml(misconception.teaching_need)}</span>
              <small>${escapeHtml(misconception.affected_students.join(", "))}</small>
            </article>
          `).join("")}
        </div>
        <div class="evidence-block">
          <h4>学生回答样本</h4>
          ${state.parsedResponses.slice(0, 5).map((response) => `
            <blockquote><strong>${escapeHtml(response.student_alias)}</strong>: ${escapeHtml(response.answer)}</blockquote>
          `).join("")}
        </div>
      </section>

      <section class="panel editable-intervention-panel">
        <div class="section-heading">
          <p class="eyebrow">可编辑干预</p>
          <h3>${escapeHtml(state.intervention.topic)}</h3>
        </div>
        <div class="control-status-row">
          <span class="status-value ${statusClass(window.TeachFlowControlLayer.formatStatus(state.interventionStatus))}">
            当前状态：${escapeHtml(window.TeachFlowControlLayer.formatStatus(state.interventionStatus))}
          </span>
          <span class="pill muted-pill">版本 ${currentVersion?.version_number || 0}</span>
        </div>

        <div class="section-approval-list">
          ${window.TeachFlowControlLayer.SECTION_DEFINITIONS.map((section) => {
            const approval = state.sectionApprovals[section.key];
            const isActive = section.key === state.activeSectionKey;
            return `
              <button class="section-approval-row ${isActive ? "active" : ""}" type="button" data-action="set-control-section" data-section="${escapeAttr(section.key)}">
                <span>${escapeHtml(section.label)}</span>
                <strong class="status-chip status-${statusClass(approval?.status || "draft")}">${escapeHtml(window.TeachFlowControlLayer.formatStatus(approval?.status || "draft"))}</strong>
              </button>
            `;
          }).join("")}
        </div>

        <div class="section-editor-panel">
          <div class="section-heading split-heading">
            <div>
              <p class="eyebrow">分区编辑器</p>
              <h4>${escapeHtml(activeSection.label)}</h4>
            </div>
            <span class="pill muted-pill">${escapeHtml(window.TeachFlowControlLayer.formatStatus(activeApproval?.status || "draft"))}</span>
          </div>
          <textarea id="section-editor" rows="18">${escapeHtml(sectionEditorValue())}</textarea>
          <div class="editor-actions multi-actions">
            <button class="secondary-button" type="button" data-action="save-section">保存修改</button>
            <button class="secondary-button" type="button" data-action="regenerate-section">重新生成本区</button>
            <button class="success-button" type="button" data-action="approve-section">批准本区</button>
          </div>
        </div>

        <div class="section-editor-panel">
          <div class="section-heading">
            <p class="eyebrow">Markdown 导出预览</p>
            <h4>${escapeHtml(exportPreviewTitle)}</h4>
          </div>
          ${state.exportPreviewOpen ? `<p class="hint">预览已准备好。需要在 TeachFlow 外使用时，可以复制或下载 Markdown 包。</p>` : ""}
          <textarea rows="16" readonly>${escapeHtml(exportPreview)}</textarea>
          <div class="editor-actions multi-actions">
            <button class="secondary-button" type="button" data-action="copy-export-markdown" ${state.exportPreviewOpen ? "" : "disabled"}>复制 Markdown</button>
            <button class="primary-button" type="button" data-action="download-prepared-export" ${state.exportPreviewOpen ? "" : "disabled"}>下载 .md</button>
            <button class="ghost-button" type="button" data-action="return-to-review" ${state.exportPreviewOpen ? "" : "disabled"}>返回复核</button>
          </div>
        </div>
      </section>

      <aside class="panel review-control-panel">
        <div class="section-heading">
          <p class="eyebrow">教师控制</p>
          <h3>${escapeHtml(window.TeachFlowControlLayer.formatStatus(state.interventionStatus))}</h3>
        </div>
        <div class="button-grid">
          <button class="secondary-button" type="button" data-action="mark-under-review">开始复核</button>
          <button class="success-button" type="button" data-action="approve-intervention">批准</button>
          <button class="danger-button" type="button" data-action="reject-intervention">驳回</button>
          <button class="primary-button" type="button" data-action="export-intervention-markdown" ${canExportIntervention() ? "" : "disabled"}>准备导出</button>
          <button class="secondary-button" type="button" data-action="update-student-memory" ${state.interventionStatus === "exported" || state.interventionStatus === "published" ? "" : "disabled"}>更新记忆</button>
          <button class="secondary-button" type="button" data-action="publish-intervention" ${state.interventionStatus === "exported" ? "" : "disabled"}>发布给学生</button>
          <button class="ghost-button" type="button" data-action="rollback-latest" ${state.versionHistory.length > 1 ? "" : "disabled"}>回滚最新版本</button>
          <button class="ghost-button" type="button" data-action="go-memory" ${state.studentMemories.length ? "" : "disabled"}>查看记忆</button>
          <button class="ghost-button" type="button" data-action="go-student-portal" ${state.studentAssignments.length ? "" : "disabled"}>学生门户</button>
          <button class="ghost-button" type="button" data-action="go-understanding-map" ${state.studentMemories.length ? "" : "disabled"}>理解地图</button>
        </div>
        <p class="hint">AI 草稿在教师批准前都不是最终版本。批准后才能导出；完成批准导出后才能更新学生记忆。</p>

        <div class="audit-box">
          <h4>版本历史</h4>
          <ol class="version-history-list">
            ${state.versionHistory.slice().reverse().map((version) => `
              <li>
                <strong>版本 ${version.version_number}</strong>
                <span>${escapeHtml(version.change_summary)}</span>
                <small>${escapeHtml(formatActor(version.created_by))} · ${escapeHtml(formatDateTime(version.created_at))}</small>
                <button class="ghost-button small-button" type="button" data-action="restore-version" data-version="${escapeAttr(version.version_number)}">恢复</button>
              </li>
            `).join("")}
          </ol>
        </div>

        <div class="audit-box">
          <h4>审计日志</h4>
          <ol class="structured-audit-list">
            ${state.audit.slice().reverse().slice(0, 10).map((entry) => `
              <li>
                <time>${escapeHtml(entry.time)}</time>
                <strong>${escapeHtml(entry.action || "动作")}</strong>
                <span>${escapeHtml(entry.details || entry.text)}</span>
                <small>${escapeHtml(formatActor(entry.actor || "teacher"))} · ${escapeHtml(formatAuditTarget(entry.target_type || "workflow"))}</small>
              </li>
            `).join("")}
          </ol>
        </div>
      </aside>
    </div>
  `;
}

function renderStudentMemory() {
  if (!state.analysis) {
    return renderGate("请先运行误解诊断，再建立学生记忆。", "go-responses", "前往学生回答");
  }

  const memories = filteredMemories();

  if (state.studentMemories.length === 0) {
    return `
      <section class="empty-state">
        <span class="pill muted-pill">教师专用记忆</span>
        <h3>还没有创建学生记忆。</h3>
        <p class="hint">记忆只使用匿名别名，并为教师保存临时学习状态记录。</p>
        <button class="primary-button" type="button" data-action="update-student-memory">更新学生记忆</button>
      </section>
    `;
  }

  return `
    <div class="memory-layout">
      <section class="panel memory-summary-panel">
        <div class="section-heading split-heading">
          <div>
            <p class="eyebrow">学生理解记忆</p>
            <h3>${state.studentMemories.length} 个匿名学习档案</h3>
          </div>
          <span class="pill muted-pill">只使用别名</span>
        </div>
        <div class="memory-filter-row">
          ${["all", "confused", "partially_understood", "ready_to_apply"].map((filter) => `
            <button class="filter-button ${state.memoryFilter === filter ? "active" : ""}" type="button" data-action="set-memory-filter" data-filter="${escapeAttr(filter)}">
              ${escapeHtml(filter === "all" ? "全部" : window.TeachFlowControlLayer.formatStatus(filter))}
            </button>
          `).join("")}
        </div>
        <div class="memory-grid">
          ${memories.map((memory) => `
            <article class="memory-card">
              <div class="card-topline">
                <span>${escapeHtml(memory.student_alias)}</span>
                <strong class="status-chip status-${statusClass(memory.current_level)}">${escapeHtml(window.TeachFlowControlLayer.formatStatus(memory.current_level))}</strong>
              </div>
              <dl>
                <div><dt>已经理解</dt><dd>${escapeHtml(memory.understood.join("; ") || "需要更多证据")}</dd></div>
                <div><dt>当前薄弱点</dt><dd>${escapeHtml(memory.weak_points.join("; "))}</dd></div>
                <div><dt>偏好的支持方式</dt><dd>${escapeHtml(formatSupportStyle(memory.preferred_explanation_style || "example"))}</dd></div>
                <div><dt>建议下一步</dt><dd>${escapeHtml(memory.recommended_next_action)}</dd></div>
              </dl>
              <p class="hint">更新于 ${escapeHtml(formatDateTime(memory.last_updated_at))}</p>
            </article>
          `).join("")}
        </div>
      </section>

      <aside class="panel memory-control-panel">
        <div class="section-heading">
          <p class="eyebrow">后续微型测验</p>
          <h3>根据证据更新记忆</h3>
        </div>
        <p class="hint">粘贴匿名微型测验回答。不要包含姓名、邮箱、学号或敏感个人信息。</p>
        <textarea id="micro-quiz-responses" rows="8">${escapeHtml(state.microQuizResponses)}</textarea>
        <div class="editor-actions multi-actions">
          <button class="primary-button" type="button" data-action="analyse-micro-quiz">分析后续回答</button>
          <button class="secondary-button" type="button" data-action="update-student-memory">从诊断刷新</button>
        </div>
        ${state.followupAnalysis ? `
          <div class="followup-summary">
            <h4>后续摘要</h4>
            <p>${escapeHtml(state.followupAnalysis.followup_summary)}</p>
            <p class="hint">${escapeHtml(state.followupAnalysis.next_teaching_recommendation)}</p>
          </div>
          <ol class="structured-audit-list">
            ${state.followupAnalysis.student_updates.map((update) => `
              <li>
                <strong>${escapeHtml(update.student_alias)}: ${escapeHtml(window.TeachFlowControlLayer.formatStatus(update.new_level))}</strong>
                <span>${escapeHtml(update.evidence)}</span>
                <small>仍需支持：${escapeHtml(update.remaining_weak_points.join(", "))}</small>
              </li>
            `).join("")}
          </ol>
        ` : ""}
      </aside>
    </div>
  `;
}

function renderStudentPortal() {
  if (!state.intervention || state.studentAssignments.length === 0) {
    return `
      <section class="empty-state">
        <span class="pill muted-pill">学生门户 Lite</span>
        <h3>还没有发布教师批准的材料。</h3>
        <p class="hint">请在“复核与审批工作台”批准并导出后发布。学生只能看到分配给自己别名的内容。</p>
        <button class="primary-button" type="button" data-action="go-review">前往复核工作台</button>
      </section>
    `;
  }

  const assignment = currentStudentAssignment();
  const assigned = currentAssignedMaterial();
  const memory = state.studentMemories.find((item) => item.student_alias === assignment?.student_alias);
  const submissionSummary = window.TeachFlowStudentPortalEngine.summariseSubmissions({
    reflections: state.studentReflections,
    micro_quiz_attempts: state.studentMicroQuizAttempts
  });
  const selectedSummary = submissionSummary.find((item) => item.student_alias === assignment?.student_alias) || {
    student_alias: assignment?.student_alias || "",
    reflection_count: 0,
    micro_quiz_attempt_count: 0,
    latest_reflection: "",
    latest_micro_quiz_answers: []
  };

  return `
    <div class="student-portal-layout">
      <section class="panel student-alias-panel">
        <div class="section-heading">
          <p class="eyebrow">学生访问</p>
          <h3>选择别名</h3>
        </div>
        <p class="hint">受控学生页面。没有开放聊天机器人，不显示真实姓名，也不能访问其他学生提交。</p>
        <div class="alias-select-list">
          ${state.studentAssignments.map((item) => `
            <button class="alias-select-button ${item.student_alias === assignment?.student_alias ? "active" : ""}" type="button" data-action="set-student-alias" data-alias="${escapeAttr(item.student_alias)}">
              <span>${escapeHtml(item.student_alias)}</span>
              <strong>${escapeHtml(window.TeachFlowControlLayer.formatStatus(item.material_level))}</strong>
            </button>
          `).join("")}
        </div>
        <button class="ghost-button" type="button" data-action="go-understanding-map">我的理解地图</button>
      </section>

      <section class="panel student-learning-panel">
        <div class="section-heading split-heading">
          <div>
            <p class="eyebrow">主题材料视图</p>
            <h3>${escapeHtml(assigned?.student_facing_material?.title || state.intervention.topic)}</h3>
          </div>
          <span class="status-chip status-${statusClass(assignment.material_level)}">${escapeHtml(window.TeachFlowControlLayer.formatStatus(assignment.material_level))}</span>
        </div>
        <p class="student-note">这不是成绩，而是 ${escapeHtml(assignment.student_alias)} 的临时学习支持页面。</p>

        <article class="student-material-section">
          <h4>教师批准的讲义</h4>
          <p>${escapeHtml(assigned?.student_facing_material?.body || "还没有分配学生讲义。")}</p>
          <p class="hint">${escapeHtml(assigned?.student_facing_material?.practice_prompt || "")}</p>
        </article>

        <article class="student-material-section">
          <h4>分配的层级材料</h4>
          ${renderAssignedMaterialDetails(assigned?.material)}
        </article>

        <article class="student-material-section visual-prompt-box">
          <div>
            <h4>可视化辅助提示</h4>
            <p>${escapeHtml(assigned?.visual_aid?.image_prompt || "还没有分配可视化提示。")}</p>
            <p class="hint">${escapeHtml(assigned?.visual_aid?.diagram_description || "")}</p>
          </div>
          <div class="diagram-placeholder" aria-label="生成图示占位">
            <span>图示占位</span>
            <small>${escapeHtml((assigned?.visual_aid?.labels || []).join(" / ") || "教师批准的可视化辅助")}</small>
          </div>
        </article>

        <article class="student-material-section">
          <div class="section-heading">
            <p class="eyebrow">微型测验视图</p>
            <h4>用自己的话回答</h4>
          </div>
          <div class="micro-quiz-answer-list">
            ${renderMicroQuizQuestions(assigned?.micro_quiz || [])}
          </div>
          <div class="editor-actions">
            <button class="primary-button" type="button" data-action="submit-student-micro-quiz">提交微型测验</button>
          </div>
        </article>

        <article class="student-material-section">
          <div class="section-heading">
            <p class="eyebrow">反思提交视图</p>
            <h4>把这个想法解释回来</h4>
          </div>
          <label>
            <span>请用你自己的话解释这个概念。</span>
            <textarea id="student-reflection" rows="5">${escapeHtml(state.studentReflectionDraft)}</textarea>
          </label>
          <div class="editor-actions">
            <button class="secondary-button" type="button" data-action="submit-student-reflection">提交反思</button>
          </div>
        </article>
      </section>

      <aside class="panel teacher-submissions-panel">
        <div class="section-heading">
          <p class="eyebrow">教师复核</p>
          <h3>${escapeHtml(assignment.student_alias)} 的提交</h3>
        </div>
        <dl>
          <div><dt>当前记忆状态</dt><dd>${escapeHtml(memory ? window.TeachFlowControlLayer.formatStatus(memory.current_level) : "暂无")}</dd></div>
          <div><dt>完成情况</dt><dd>${escapeHtml(assignment.completed_at ? formatDateTime(assignment.completed_at) : "未完成")}</dd></div>
          <div><dt>反思次数</dt><dd>${escapeHtml(String(selectedSummary.reflection_count))}</dd></div>
          <div><dt>微型测验次数</dt><dd>${escapeHtml(String(selectedSummary.micro_quiz_attempt_count))}</dd></div>
        </dl>
        <div class="submission-review-block">
          <h4>最新反思</h4>
          <p>${escapeHtml(selectedSummary.latest_reflection || "还没有提交反思。")}</p>
        </div>
        <div class="submission-review-block">
          <h4>最新微型测验回答</h4>
          ${selectedSummary.latest_micro_quiz_answers.length ? `
            <ol class="submission-summary-list">
              ${selectedSummary.latest_micro_quiz_answers.map((answer) => `<li><strong>${escapeHtml(answer.question_id)}</strong><span>${escapeHtml(answer.answer)}</span></li>`).join("")}
            </ol>
          ` : `<p class="hint">还没有提交微型测验。</p>`}
        </div>
      </aside>
    </div>
  `;
}

function renderAssignedMaterialDetails(material) {
  if (!material) {
    return `<p class="hint">没有找到分配给这个别名的材料。</p>`;
  }

  const rows = [
    ["学习目标", material.goal],
    ["解释", material.explanation],
    ["类比", material.analogy],
    ["概念桥接", material.concept_bridge],
    ["任务", material.task],
    ["挑战", material.challenge],
    ["关联应用", material.cross_domain_connections?.join("; ")]
  ].filter((row) => row[1]);

  return `
    <dl class="student-material-detail-list">
      ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
    </dl>
  `;
}

function renderMicroQuizQuestions(questions) {
  if (!questions.length) {
    return `<p class="hint">还没有分配微型测验。</p>`;
  }

  return questions.map((item, index) => {
    const questionId = item.id || item.question_id || `question-${index + 1}`;
    return `
      <label>
        <span>${index + 1}. ${escapeHtml(item.question)}</span>
        <small class="hint">${escapeHtml(item.purpose || "")}</small>
        <textarea rows="3" data-micro-answer data-question-id="${escapeAttr(questionId)}"></textarea>
      </label>
    `;
  }).join("");
}

function renderUnderstandingMap() {
  if (!state.analysis) {
    return renderGate("请先运行误解诊断，再建立理解地图。", "go-responses", "前往学生回答");
  }

  if (state.studentMemories.length === 0) {
    return `
      <section class="empty-state">
        <span class="pill muted-pill">学生理解地图</span>
        <h3>还没有学习状态记忆。</h3>
        <p class="hint">请先建立匿名学生记忆。理解地图会把这些记忆转化为学生端和教师端的下一步行动。</p>
        <button class="primary-button" type="button" data-action="update-student-memory">更新学生记忆</button>
      </section>
    `;
  }

  if (state.understandingMapNodes.length === 0) {
    return `
      <section class="empty-state">
        <span class="pill muted-pill">学生理解地图</span>
        <h3>理解地图已经可以建立。</h3>
        <p class="hint">TeachFlow 只会使用临时学习状态语言和匿名别名。</p>
        <button class="primary-button" type="button" data-action="go-understanding-map">建立理解地图</button>
      </section>
    `;
  }

  const memory = currentStudentMemory();
  const alias = memory?.student_alias || state.selectedStudentAlias;
  const nodes = understandingNodesFor(alias);
  const summary = window.TeachFlowUnderstandingMapEngine.summariseClassMap({
    nodes: state.understandingMapNodes,
    stuck_signals: state.studentStuckSignals
  });
  const selectedSummary = summary.find((item) => item.student_alias === alias);
  const latestAction = state.assignedUnderstandingActions.filter((item) => item.student_alias === alias).slice(-1)[0];
  const alternate = state.alternateExplanations[alias];

  return `
    <div class="understanding-layout">
      <section class="panel understanding-alias-panel">
        <div class="section-heading">
          <p class="eyebrow">我的理解地图</p>
          <h3>选择别名</h3>
        </div>
        <p class="hint">每个学生别名只能看到自己的地图。这不是成绩，而是当前理解状态地图。</p>
        <div class="alias-select-list">
          ${state.studentMemories.map((item) => `
            <button class="alias-select-button ${item.student_alias === alias ? "active" : ""}" type="button" data-action="set-student-alias" data-alias="${escapeAttr(item.student_alias)}">
              <span>${escapeHtml(item.student_alias)}</span>
              <strong>${escapeHtml(window.TeachFlowControlLayer.formatStatus(item.current_level))}</strong>
            </button>
          `).join("")}
        </div>
      </section>

      <section class="panel understanding-map-panel">
        <div class="section-heading split-heading">
          <div>
            <p class="eyebrow">学习状态</p>
            <h3>${escapeHtml(alias)} 的理解地图</h3>
          </div>
          <span class="pill muted-pill">${escapeHtml(formatSupportStyle(memory?.preferred_explanation_style || "example"))}支持</span>
        </div>
        <p class="student-note">这不是成绩，而是你当前理解了什么、下一步需要什么支持的临时地图。</p>

        <div class="understanding-node-grid">
          ${nodes.map((node) => `
            <article class="understanding-node-card status-${statusClass(node.status)}">
              <div class="card-topline">
                <span>${escapeHtml(formatMapStatus(node.status))}</span>
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
              <p class="eyebrow">我卡住是因为...</p>
              <h4>发送学习信号</h4>
            </div>
            <button class="ghost-button" type="button" data-action="explain-another-way">换一种方式解释</button>
          </div>
          <label>
            <span>选择最接近的原因</span>
            <select id="stuck-type">
              ${window.TeachFlowUnderstandingMapEngine.STUCK_TYPES.map((type) => `
                <option value="${escapeAttr(type)}" ${state.selectedStuckType === type ? "selected" : ""}>${escapeHtml(formatStuckType(type))}</option>
              `).join("")}
            </select>
          </label>
          <label>
            <span>可选说明</span>
            <textarea id="stuck-free-text" rows="4">${escapeHtml(state.stuckSignalDraft)}</textarea>
          </label>
          <div class="editor-actions">
            <button class="secondary-button" type="button" data-action="submit-stuck-signal">提交卡点信号</button>
          </div>
          ${alternate ? `
            <div class="alternate-explanation-box">
              <h4>另一种解释</h4>
              <p>${escapeHtml(alternate.explanation)}</p>
              <p class="hint">${escapeHtml(alternate.next_prompt)}</p>
            </div>
          ` : ""}
        </article>
      </section>

      <aside class="panel teacher-map-panel">
        <div class="section-heading">
          <p class="eyebrow">班级理解地图</p>
          <h3>教师下一步行动</h3>
        </div>
        <dl>
          <div><dt>已理解节点</dt><dd>${escapeHtml(String(selectedSummary?.understood_count || 0))}</dd></div>
          <div><dt>需支持节点</dt><dd>${escapeHtml(String(selectedSummary?.needs_support_count || 0))}</dd></div>
          <div><dt>最新卡点信号</dt><dd>${escapeHtml(selectedSummary?.latest_stuck_type ? formatStuckType(selectedSummary.latest_stuck_type) : "暂无")}</dd></div>
        </dl>
        <button class="primary-button" type="button" data-action="assign-understanding-next-step" data-alias="${escapeAttr(alias)}">分配下一步行动</button>
        ${latestAction ? `
          <div class="submission-review-block">
            <h4>已分配行动</h4>
            <p>${escapeHtml(latestAction.action)}</p>
            <p class="hint">${escapeHtml(formatDateTime(latestAction.assigned_at))}</p>
          </div>
        ` : ""}
        <div class="class-map-list">
          ${summary.map((item) => `
            <article class="class-map-row">
              <strong>${escapeHtml(item.student_alias)}</strong>
              <span>${escapeHtml(item.understood_count)} 个已理解 / ${escapeHtml(item.needs_support_count)} 个需支持</span>
              <small>${escapeHtml(item.recommended_next_action)}</small>
            </article>
          `).join("")}
        </div>
      </aside>
    </div>
  `;
}

function renderGate(message, action, label) {
  return `
    <section class="empty-state">
      <span class="pill muted-pill">诊断引擎</span>
      <h3>${escapeHtml(message)}</h3>
      <button class="primary-button" type="button" data-action="${escapeAttr(action)}">${escapeHtml(label || "继续")}</button>
    </section>
  `;
}

function bindInteractions() {
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.nav;
      if (state.view === "understanding") {
        prepareUnderstandingMap({ audit: false });
      }
      render();
    });
  });

  const interventionEditor = document.getElementById("intervention-json");
  if (interventionEditor) {
    interventionEditor.addEventListener("input", () => {
      state.editableInterventionJson = interventionEditor.value;
    });
  }

  const sectionEditor = document.getElementById("section-editor");
  if (sectionEditor) {
    sectionEditor.addEventListener("input", () => {
      state.sectionEditorJson = sectionEditor.value;
    });
  }

  const microQuizResponses = document.getElementById("micro-quiz-responses");
  if (microQuizResponses) {
    microQuizResponses.addEventListener("input", () => {
      state.microQuizResponses = microQuizResponses.value;
    });
  }

  const studentReflection = document.getElementById("student-reflection");
  if (studentReflection) {
    studentReflection.addEventListener("input", () => {
      state.studentReflectionDraft = studentReflection.value;
    });
  }

  const stuckType = document.getElementById("stuck-type");
  if (stuckType) {
    stuckType.addEventListener("change", () => {
      state.selectedStuckType = stuckType.value;
    });
  }

  const stuckFreeText = document.getElementById("stuck-free-text");
  if (stuckFreeText) {
    stuckFreeText.addEventListener("input", () => {
      state.stuckSignalDraft = stuckFreeText.value;
    });
  }
}

function handleAction(action, element) {
  const handlers = {
    reset,
    "save-workspace": saveWorkspaceAndRender,
    "go-responses": goResponses,
    "parse-responses": parseResponsesAndRender,
    analyse,
    "go-evidence": goEvidence,
    "save-edits": saveEditedJson,
    "generate-intervention": generateIntervention,
    "regenerate-intervention": regenerateIntervention,
    "save-intervention-edits": saveInterventionEdits,
    "focus-intervention-editor": focusInterventionEditor,
    "go-review": goReview,
    "set-control-section": () => setControlSection(element?.dataset.section),
    "save-section": saveActiveSection,
    "regenerate-section": regenerateActiveSection,
    "approve-section": approveActiveSection,
    "mark-under-review": markUnderReview,
    "approve-intervention": approveIntervention,
    "reject-intervention": rejectIntervention,
    "export-intervention-markdown": exportInterventionMarkdown,
    "copy-export-markdown": copyExportMarkdown,
    "download-prepared-export": downloadPreparedExport,
    "return-to-review": returnToReview,
    "publish-intervention": publishIntervention,
    "rollback-latest": rollbackLatest,
    "restore-version": () => restoreVersion(Number(element?.dataset.version)),
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
    "export-markdown": exportMarkdown
  };

  if (handlers[action]) handlers[action]();
}

function saveWorkspaceAndRender() {
  saveWorkspace();
  render();
}

function saveWorkspace() {
  state.workspace.teacher.display_name = valueOf("teacher-name", state.workspace.teacher.display_name);
  state.workspace.course.title = valueOf("course-title", state.workspace.course.title);
  state.workspace.class.name = valueOf("class-name", state.workspace.class.name);
  state.workspace.topic.title = valueOf("topic-title", state.workspace.topic.title);
  state.workspace.learning_objectives = linesOf("learning-objectives");
  state.workspace.lesson_material = valueOf("lesson-material", state.workspace.lesson_material);
  state.approval.status = "工作区草稿";
  addAudit("教师已保存课程、主题、学习目标和课程材料");
}

function goResponses() {
  saveWorkspace();
  state.view = "responses";
  render();
}

function parseResponsesFromInput() {
  state.rawResponses = valueOf("quiz-responses", state.rawResponses);
  state.parsedResponses = window.TeachFlowDiagnosisEngine.parseQuizResponses(state.rawResponses);
  state.workspace.student_aliases = [...new Set(state.parsedResponses.map((response) => response.student_alias))];
  addAudit(`已解析 ${state.parsedResponses.length} 份匿名学生回答`);
}

function parseResponsesAndRender() {
  parseResponsesFromInput();
  render();
}

function analyse() {
  parseResponsesFromInput();
  const input = {
    topic: state.workspace.topic.title,
    learning_objectives: state.workspace.learning_objectives,
    lesson_material: state.workspace.lesson_material,
    quiz_responses: state.parsedResponses
  };
  state.analysis = window.TeachFlowDiagnosisEngine.diagnoseUnderstanding(input);
  state.editableJson = JSON.stringify(state.analysis, null, 2);
  state.approval.status = "诊断就绪";
  state.approval.version += 1;
  addAudit("已生成误解诊断");
  addAudit("已从匿名回答中附上证据引用");
  state.view = "map";
  render();
}

function goEvidence() {
  state.view = "evidence";
  render();
}

function goIntervention() {
  state.view = "intervention";
  render();
}

function goReview() {
  state.view = "approval";
  render();
}

function goMemory() {
  state.view = "memory";
  render();
}

function goStudentPortal() {
  state.view = "student";
  render();
}

function goUnderstandingMap() {
  prepareUnderstandingMap();
  state.view = "understanding";
  render();
}

function saveEditedJson() {
  const raw = valueOf("analysis-json", "");
  try {
    const edited = JSON.parse(raw);
    state.analysis = edited;
    state.editableJson = JSON.stringify(edited, null, 2);
    state.approval.status = "教师编辑中";
    addAudit("教师已编辑诊断 JSON");
    render();
  } catch (error) {
    addAudit("编辑后的 JSON 暂时无法保存");
    window.alert("编辑后的 JSON 还不是有效格式。请修正格式后再保存。");
  }
}

function generateIntervention() {
  if (!state.analysis) {
    analyse();
    return;
  }

  state.intervention = window.TeachFlowInterventionEngine.generateIntervention({
    analysis: state.analysis,
    learning_objectives: state.workspace.learning_objectives,
    lesson_material: state.workspace.lesson_material,
    topic: state.workspace.topic.title
  });
  state.intervention.status = "draft";
  state.editableInterventionJson = JSON.stringify(state.intervention, null, 2);
  state.interventionStatus = "draft";
  state.interventionApproval.status = "draft";
  state.interventionApproval.version += 1;
  state.sectionApprovals = window.TeachFlowControlLayer.createSectionApprovals(state.intervention);
  state.versionHistory = [];
  state.exportPackages = [];
  state.activeExportPackage = null;
  state.exportPreviewOpen = false;
  state.rollbackEvents = [];
  state.studentMemories = [];
  state.studentAssignments = [];
  state.studentReflections = [];
  state.studentMicroQuizAttempts = [];
  state.understandingMapNodes = [];
  state.studentStuckSignals = [];
  state.stuckSignalDraft = "";
  state.selectedStuckType = "diagram";
  state.alternateExplanations = {};
  state.assignedUnderstandingActions = [];
  state.schoolAgentBrief = "";
  state.studentReflectionDraft = "";
  state.followupAnalysis = null;
  state.activeSectionKey = "revised_teaching_plan";
  state.sectionEditorJson = JSON.stringify(window.TeachFlowControlLayer.getSectionContent(state.intervention, state.activeSectionKey), null, 2);
  addVersion("ai", "AI 已生成干预草稿", null);
  addAudit("已根据误解地图生成教学干预", {
    actor: "ai_system",
    action: "generated_intervention",
    target_type: "intervention",
    target_id: state.intervention.intervention_id,
    details: "AI 已根据误解地图生成干预草稿"
  });
  addAudit("已生成修订计划、分层材料、可视化提示、分镜、测验、备注和学生讲义", {
    actor: "ai_system",
    action: "generated_materials",
    target_type: "material",
    target_id: state.intervention.intervention_id,
    details: "已生成修订计划、分层材料、可视化提示、分镜、测验、教师备注和学生讲义"
  });
  state.view = "intervention";
  render();
}

function regenerateIntervention() {
  generateIntervention();
  addAudit("已重新生成教学干预", {
    actor: "ai_system",
    action: "regenerated_intervention",
    target_type: "intervention",
    target_id: state.intervention?.intervention_id || "intervention",
    details: "AI 已重新生成完整教学干预草稿"
  });
  render();
}

function readInterventionDraft() {
  const editor = document.getElementById("intervention-json");
  if (editor) return editor.value;
  if (state.editableInterventionJson) return state.editableInterventionJson;
  return state.intervention ? JSON.stringify(state.intervention, null, 2) : "";
}

function persistInterventionDraft(options = {}) {
  const raw = readInterventionDraft();
  const shouldRender = options.renderAfter !== false;
  const shouldAudit = options.audit !== false;

  if (!raw) {
    if (shouldAudit) addAudit("没有找到可保存的干预 JSON");
    return false;
  }

  try {
    const edited = JSON.parse(raw);
    edited.export_markdown = window.TeachFlowInterventionEngine.buildMarkdown(edited);
    edited.status = options.status || "edited";
    state.intervention = edited;
    state.editableInterventionJson = JSON.stringify(edited, null, 2);
    state.interventionStatus = options.status || "edited";
    state.interventionApproval.status = state.interventionStatus;
    if (!options.skipVersion) {
      addVersion("teacher", options.versionSummary || "教师已编辑完整干预 JSON", null);
    }
    if (shouldAudit) {
      addAudit(options.auditText || "教师已编辑干预 JSON", {
        actor: "teacher",
        action: "edited_intervention_json",
        target_type: "intervention",
        target_id: state.intervention.intervention_id,
        details: options.auditText || "教师已编辑干预 JSON"
      });
    }
    if (shouldRender) render();
    return true;
  } catch (error) {
    if (shouldAudit) addAudit("编辑后的干预 JSON 暂时无法保存");
    window.alert("编辑后的干预 JSON 还不是有效格式。请修正格式后再保存。");
    return false;
  }
}

function saveInterventionEdits() {
  persistInterventionDraft();
}

function setControlSection(sectionKey) {
  if (!sectionKey) return;
  state.activeSectionKey = sectionKey;
  state.sectionEditorJson = JSON.stringify(window.TeachFlowControlLayer.getSectionContent(state.intervention, sectionKey), null, 2);
  if (state.interventionStatus === "draft") {
    setInterventionStatus("under_review");
  }
  render();
}

function sectionEditorValue() {
  if (!state.intervention) return "";
  if (state.sectionEditorJson) return state.sectionEditorJson;
  return JSON.stringify(window.TeachFlowControlLayer.getSectionContent(state.intervention, state.activeSectionKey), null, 2);
}

function saveActiveSection(options = {}) {
  if (!state.intervention) return false;

  const editor = document.getElementById("section-editor");
  const raw = editor ? editor.value : state.sectionEditorJson;
  const section = window.TeachFlowControlLayer.getSectionDefinition(state.activeSectionKey);
  const shouldAudit = options.audit !== false;
  const shouldRender = options.renderAfter !== false;

  if (!raw) return true;

  try {
    const parsed = JSON.parse(raw);
    const previous = window.TeachFlowControlLayer.getSectionContent(state.intervention, state.activeSectionKey);
    const changed = JSON.stringify(parsed) !== JSON.stringify(previous);

    if (!changed) {
      state.sectionEditorJson = JSON.stringify(parsed, null, 2);
      if (shouldRender) render();
      return true;
    }

    state.intervention = window.TeachFlowControlLayer.replaceSectionContent(state.intervention, state.activeSectionKey, parsed);
    rebuildInterventionExport();
    setInterventionStatus(options.status || "edited");
    updateSectionApproval(state.activeSectionKey, "edited");
    state.sectionEditorJson = JSON.stringify(parsed, null, 2);
    addVersion("teacher", `教师已编辑${section.label}`, state.activeSectionKey);

    if (shouldAudit) {
      addAudit(`教师已编辑${section.label}`, {
        actor: "teacher",
        action: "edited_section",
        target_type: section.targetType,
        target_id: state.activeSectionKey,
        details: `教师已编辑${section.label}`
      });
    }

    if (shouldRender) render();
    return true;
  } catch (error) {
    if (shouldAudit) {
      addAudit(`${section.label} JSON 暂时无法保存`, {
        actor: "teacher",
        action: "edit_failed",
        target_type: section.targetType,
        target_id: state.activeSectionKey,
        details: `${section.label} JSON 暂时无法保存`
      });
    }
    window.alert("这个分区的 JSON 还不是有效格式。请修正格式后再保存。");
    return false;
  }
}

function regenerateActiveSection() {
  if (!state.intervention || !state.analysis) return;

  const section = window.TeachFlowControlLayer.getSectionDefinition(state.activeSectionKey);
  const fresh = window.TeachFlowInterventionEngine.generateIntervention({
    analysis: state.analysis,
    learning_objectives: state.workspace.learning_objectives,
    lesson_material: state.workspace.lesson_material,
    topic: state.workspace.topic.title
  });

  const replacement = window.TeachFlowControlLayer.getSectionContent(fresh, state.activeSectionKey);
  state.intervention = window.TeachFlowControlLayer.replaceSectionContent(state.intervention, state.activeSectionKey, replacement);
  rebuildInterventionExport();
  setInterventionStatus("under_review");
  updateSectionApproval(state.activeSectionKey, "under_review");
  state.sectionEditorJson = JSON.stringify(replacement, null, 2);
  addVersion("ai", `AI 已重新生成${section.label}`, state.activeSectionKey);
  addAudit(`AI 已重新生成${section.label}`, {
    actor: "ai_system",
    action: "regenerated_section",
    target_type: section.targetType,
    target_id: state.activeSectionKey,
    details: `AI 已重新生成${section.label}，需要教师复核`
  });
  render();
}

function approveActiveSection() {
  if (!state.intervention) return;
  const saved = saveActiveSection({ audit: false, renderAfter: false });
  if (!saved) return;

  const section = window.TeachFlowControlLayer.getSectionDefinition(state.activeSectionKey);
  updateSectionApproval(state.activeSectionKey, "approved");
  if (!["approved", "exported", "published"].includes(state.interventionStatus)) {
    setInterventionStatus("under_review");
  }
  addVersion("teacher", `教师已批准${section.label}`, state.activeSectionKey);
  addAudit(`教师已批准${section.label}`, {
    actor: "teacher",
    action: "approved_section",
    target_type: section.targetType,
    target_id: state.activeSectionKey,
    details: `教师已批准${section.label}`
  });
  render();
}

function markUnderReview() {
  if (!state.intervention) return;
  setInterventionStatus("under_review");
  addAudit("教师已开始复核干预", {
    actor: "teacher",
    action: "started_review",
    target_type: "intervention",
    target_id: state.intervention.intervention_id,
    details: "教师已将干预草稿移入复核状态"
  });
  render();
}

function rejectIntervention() {
  if (!state.intervention) return;
  setInterventionStatus("rejected");
  addVersion("teacher", "教师已驳回干预", null);
  addAudit("教师已驳回教学干预", {
    actor: "teacher",
    action: "rejected_intervention",
    target_type: "intervention",
    target_id: state.intervention.intervention_id,
    details: "教师已驳回教学干预"
  });
  render();
}

function focusInterventionEditor() {
  const editor = document.getElementById("intervention-json");
  if (editor) {
    editor.focus();
    editor.scrollIntoView({ behavior: "smooth", block: "center" });
    addAudit("教师已打开干预 JSON 编辑器");
  }
}

function approveIntervention() {
  if (!state.intervention) {
    generateIntervention();
    return;
  }

  if (document.getElementById("section-editor")) {
    const savedSection = saveActiveSection({ audit: false, renderAfter: false });
    if (!savedSection) {
      addAudit("分区编辑有效前，教师审批被阻止", {
        actor: "teacher",
        action: "approval_blocked",
        target_type: "material",
        target_id: state.activeSectionKey,
        details: "当前分区编辑有效前，教师审批被阻止"
      });
      render();
      return;
    }
  }

  const saved = persistInterventionDraft({
    audit: false,
    renderAfter: false,
    status: state.interventionStatus,
    skipVersion: true
  });

  if (!saved) {
    addAudit("干预编辑有效前，教师审批被阻止", {
      actor: "teacher",
      action: "approval_blocked",
      target_type: "intervention",
      target_id: state.intervention.intervention_id,
      details: "干预编辑有效前，教师审批被阻止"
    });
    render();
    return;
  }

  window.TeachFlowControlLayer.SECTION_DEFINITIONS.forEach((section) => updateSectionApproval(section.key, "approved"));
  setInterventionStatus("approved");
  state.interventionApproval.approved_by = state.workspace.teacher.display_name || "教师";
  state.interventionApproval.approved_at = new Date().toLocaleString();
  addVersion("teacher", "教师已批准最终干预", null);
  addAudit("教师已批准教学干预", {
    actor: "teacher",
    action: "approved_intervention",
    target_type: "intervention",
    target_id: state.intervention.intervention_id,
    details: "教师已批准最终教学干预和所有可编辑分区"
  });
  render();
}

function exportInterventionMarkdown() {
  if (!state.intervention) return;

  if (!canExportIntervention()) {
    window.alert("请先批准干预，再导出教师包。");
    addAudit("干预尚未批准，导出被阻止", {
      actor: "teacher",
      action: "export_blocked",
      target_type: "export",
      target_id: state.intervention.intervention_id,
      details: "干预尚未批准，导出被阻止"
    });
    return;
  }

  const exportPackage = window.TeachFlowControlLayer.createExportPackage({
    intervention: state.intervention,
    analysis: state.analysis,
    workspace: state.workspace,
    status: state.interventionStatus,
    sectionApprovals: state.sectionApprovals,
    versionHistory: state.versionHistory
  });
  state.exportPackages.push(exportPackage);
  state.activeExportPackage = exportPackage;
  state.exportPreviewOpen = true;
  setInterventionStatus("exported");
  addVersion("teacher", "教师已导出 Markdown 包", null);
  addAudit("已生成 Markdown 教学干预导出", {
    actor: "teacher",
    action: "exported_markdown",
    target_type: "export",
    target_id: exportPackage.export_id,
    details: "教师已准备好已批准的 Markdown 干预包供预览"
  });
  updateStudentMemory({ renderAfter: false, auditText: "已在批准导出后更新学生记忆" });
  render();
}

function copyExportMarkdown() {
  const content = state.activeExportPackage?.content || currentExportPreview();
  if (!content) return;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(content).catch(() => {});
  }
  addAudit("Markdown 导出已复制到剪贴板", {
    actor: "teacher",
    action: "copied_markdown",
    target_type: "export",
    target_id: state.activeExportPackage?.export_id || state.intervention?.intervention_id || "export",
    details: "教师已将 Markdown 导出包复制到剪贴板"
  });
  render();
}

function downloadPreparedExport() {
  const content = state.activeExportPackage?.content || currentExportPreview();
  if (!content) return;

  downloadFile("teachflow-teacher-approved-intervention.md", content, "text/markdown");
  addAudit("Markdown 导出已下载", {
    actor: "teacher",
    action: "downloaded_markdown",
    target_type: "export",
    target_id: state.activeExportPackage?.export_id || state.intervention?.intervention_id || "export",
    details: "教师已下载 Markdown 导出包"
  });
  render();
}

function returnToReview() {
  state.exportPreviewOpen = false;
  render();
}

function updateStudentMemory(options = {}) {
  if (!state.analysis) return;

  state.studentMemories = window.TeachFlowMemoryEngine.generateStudentMemories({
    analysis: state.analysis,
    intervention: state.intervention,
    previous_memories: state.studentMemories,
    topic_id: state.workspace.topic.id || state.workspace.topic.title
  });
  refreshUnderstandingMap({ audit: false });

  addAudit(options.auditText || "已根据最新诊断和干预更新学生记忆", {
    actor: "system",
    action: "student_memory_updated",
    target_type: "memory",
    target_id: state.workspace.topic.id || state.workspace.topic.title,
    details: options.auditText || "已根据最新诊断和干预更新学生记忆"
  });

  if (options.renderAfter === false) return;
  state.view = "memory";
  render();
}

function analyseMicroQuiz() {
  if (!state.analysis) return;

  if (state.studentMemories.length === 0) {
    updateStudentMemory({ renderAfter: false, auditText: "已在微型测验分析前初始化学生记忆" });
  }

  const raw = valueOf("micro-quiz-responses", state.microQuizResponses);
  state.microQuizResponses = raw;
  state.followupAnalysis = window.TeachFlowMemoryEngine.analyseMicroQuizAnswers({
    raw_responses: raw,
    analysis: state.analysis,
    intervention: state.intervention,
    existing_memories: state.studentMemories
  });
  state.studentMemories = state.followupAnalysis.student_memories;
  refreshUnderstandingMap({ audit: false });
  addAudit("已分析微型测验回答并更新学生记忆", {
    actor: "system",
    action: "student_memory_updated",
    target_type: "memory",
    target_id: state.workspace.topic.id || state.workspace.topic.title,
    details: "Micro-quiz answers analysed and student memory updated"
  });
  render();
}

function setMemoryFilter(filter) {
  state.memoryFilter = filter || "all";
  render();
}

function filteredMemories() {
  if (state.memoryFilter === "all") return state.studentMemories;
  return state.studentMemories.filter((memory) => memory.current_level === state.memoryFilter);
}

function schoolAgentInput() {
  return {
    workspace: state.workspace,
    analysis: state.analysis,
    intervention: state.intervention,
    intervention_status: state.interventionStatus,
    student_memories: state.studentMemories,
    student_assignments: state.studentAssignments,
    understanding_map_nodes: state.understandingMapNodes,
    stuck_signals: state.studentStuckSignals,
    export_packages: state.exportPackages,
    audit: state.audit
  };
}

function currentSchoolAgentState() {
  return window.TeachFlowSchoolAgentEngine.evaluateSystemState(schoolAgentInput());
}

function refreshAgentBrief() {
  state.schoolAgentBrief = window.TeachFlowSchoolAgentEngine.buildMorningBrief(schoolAgentInput());
  addAudit("School Agent 已刷新项目简报", {
    actor: "system",
    action: "school_agent_brief_refreshed",
    target_type: "analysis",
    target_id: state.workspace.topic.id || state.workspace.topic.title,
    details: "School Agent 已刷新就绪状态、优先级、安全边界和晨间简报"
  });
  render();
}

function prepareUnderstandingMap(options = {}) {
  if (!state.analysis) return;
  if (state.studentMemories.length === 0) {
    updateStudentMemory({ renderAfter: false, auditText: "已在理解地图前初始化学生记忆" });
  } else {
    refreshUnderstandingMap(options);
  }
}

function refreshUnderstandingMap(options = {}) {
  if (!state.analysis || state.studentMemories.length === 0) return;
  state.understandingMapNodes = window.TeachFlowUnderstandingMapEngine.createUnderstandingMap({
    student_memories: state.studentMemories,
    analysis: state.analysis,
    intervention: state.intervention,
    reflections: state.studentReflections,
    micro_quiz_attempts: state.studentMicroQuizAttempts,
    stuck_signals: state.studentStuckSignals,
    topic_id: state.workspace.topic.id || state.workspace.topic.title
  });

  if (options.audit) {
    addAudit("学生理解地图已刷新", {
      actor: "system",
      action: "understanding_map_refreshed",
      target_type: "understanding_map",
      target_id: state.workspace.topic.id || state.workspace.topic.title,
      details: "System refreshed understanding map from memory, reflections, micro quiz attempts, and stuck signals"
    });
  }
}

function currentStudentMemory() {
  return state.studentMemories.find((memory) => memory.student_alias === state.selectedStudentAlias)
    || state.studentMemories[0]
    || null;
}

function understandingNodesFor(studentAlias) {
  return state.understandingMapNodes.filter((node) => node.student_alias === studentAlias);
}

function currentStudentAssignment() {
  return state.studentAssignments.find((assignment) => assignment.student_alias === state.selectedStudentAlias)
    || state.studentAssignments[0]
    || null;
}

function currentAssignedMaterial() {
  return window.TeachFlowStudentPortalEngine.getAssignedMaterial({
    assignment: currentStudentAssignment(),
    intervention: state.intervention
  });
}

function setStudentAlias(alias) {
  if (!alias) return;
  state.selectedStudentAlias = alias;
  state.studentReflectionDraft = "";
  state.stuckSignalDraft = "";
  render();
}

function submitStudentReflection() {
  const assignment = currentStudentAssignment();
  if (!assignment) return;

  const response = valueOf("student-reflection", state.studentReflectionDraft).trim();
  if (!response) {
    window.alert("Please write a short reflection before submitting.");
    return;
  }

  state.studentReflections.push(window.TeachFlowStudentPortalEngine.createReflection({
    topic_id: state.workspace.topic.id || state.workspace.topic.title,
    student_alias: assignment.student_alias,
    prompt: "Explain this concept in your own words.",
    response
  }));
  state.studentReflectionDraft = "";
  markStudentAssignmentComplete(assignment.student_alias);
  refreshUnderstandingMap({ audit: false });
  addAudit(`${assignment.student_alias} 已在学生门户 Lite 提交反思`, {
    actor: "student",
    action: "student_reflection_submitted",
    target_type: "memory",
    target_id: assignment.student_alias,
    details: `${assignment.student_alias} submitted a controlled reflection response`
  });
  render();
}

function submitStudentMicroQuiz() {
  const assignment = currentStudentAssignment();
  if (!assignment) return;

  const answers = Array.from(document.querySelectorAll("[data-micro-answer]"))
    .map((element, index) => ({
      question_id: element.dataset.questionId || `question-${index + 1}`,
      answer: element.value.trim()
    }))
    .filter((answer) => answer.answer);

  if (!answers.length) {
    window.alert("Please answer at least one micro quiz question before submitting.");
    return;
  }

  state.studentMicroQuizAttempts.push(window.TeachFlowStudentPortalEngine.createMicroQuizAttempt({
    intervention_id: state.intervention.intervention_id,
    topic_id: state.workspace.topic.id || state.workspace.topic.title,
    student_alias: assignment.student_alias,
    answers
  }));
  markStudentAssignmentComplete(assignment.student_alias);
  refreshUnderstandingMap({ audit: false });
  addAudit(`${assignment.student_alias} 已在学生门户 Lite 提交微型测验`, {
    actor: "student",
    action: "student_micro_quiz_submitted",
    target_type: "memory",
    target_id: assignment.student_alias,
    details: `${assignment.student_alias} submitted controlled micro quiz answers`
  });
  render();
}

function markStudentAssignmentComplete(studentAlias) {
  const assignment = state.studentAssignments.find((item) => item.student_alias === studentAlias);
  if (assignment && !assignment.completed_at) {
    assignment.completed_at = new Date().toISOString();
  }
}

function submitStuckSignal() {
  const memory = currentStudentMemory();
  if (!memory) return;

  const stuckType = valueOf("stuck-type", state.selectedStuckType) || state.selectedStuckType;
  const freeText = valueOf("stuck-free-text", state.stuckSignalDraft).trim();
  state.selectedStuckType = stuckType;
  state.studentStuckSignals.push(window.TeachFlowUnderstandingMapEngine.createStuckSignal({
    topic_id: state.workspace.topic.id || state.workspace.topic.title,
    student_alias: memory.student_alias,
    stuck_type: stuckType,
    free_text: freeText
  }));
  state.stuckSignalDraft = "";
  refreshUnderstandingMap({ audit: false });
  addAudit(`${memory.student_alias} 已提交卡点信号`, {
    actor: "student",
    action: "student_stuck_signal_submitted",
    target_type: "understanding_map",
    target_id: memory.student_alias,
    details: `${memory.student_alias} reported being stuck on ${formatStuckType(stuckType)}`
  });
  render();
}

function explainAnotherWay() {
  const memory = currentStudentMemory();
  if (!memory) return;
  const latestStuck = state.studentStuckSignals.filter((signal) => signal.student_alias === memory.student_alias).slice(-1)[0];
  state.alternateExplanations[memory.student_alias] = window.TeachFlowUnderstandingMapEngine.createAlternateExplanation({
    memory,
    assigned_material: currentAssignedMaterial(),
    latest_stuck_signal: latestStuck
  });
  addAudit(`${memory.student_alias} 请求换一种解释`, {
    actor: "student",
    action: "alternate_explanation_requested",
    target_type: "understanding_map",
    target_id: memory.student_alias,
    details: `${memory.student_alias} 基于受控材料请求换一种解释`
  });
  render();
}

function assignUnderstandingNextStep(alias) {
  const studentAlias = alias || currentStudentMemory()?.student_alias;
  const summary = window.TeachFlowUnderstandingMapEngine.summariseClassMap({
    nodes: state.understandingMapNodes,
    stuck_signals: state.studentStuckSignals
  }).find((item) => item.student_alias === studentAlias);

  if (!studentAlias || !summary) return;
  const action = {
    id: `understanding-action-${Date.now()}-${studentAlias}`,
    topic_id: state.workspace.topic.id || state.workspace.topic.title,
    student_alias: studentAlias,
    action: summary.recommended_next_action,
    assigned_at: new Date().toISOString()
  };
  state.assignedUnderstandingActions.push(action);
  addAudit(`教师已为 ${studentAlias} 分配下一步行动`, {
    actor: "teacher",
    action: "assigned_understanding_next_action",
    target_type: "understanding_map",
    target_id: studentAlias,
    details: summary.recommended_next_action
  });
  render();
}

function publishIntervention() {
  if (!state.intervention || state.interventionStatus !== "exported") return;
  if (state.studentMemories.length === 0) {
    updateStudentMemory({ renderAfter: false, auditText: "已在发布到学生门户前初始化学生记忆" });
  }

  state.studentAssignments = window.TeachFlowStudentPortalEngine.createAssignments({
    intervention: state.intervention,
    student_memories: state.studentMemories,
    topic_id: state.workspace.topic.id || state.workspace.topic.title
  });
  if (!state.studentAssignments.some((assignment) => assignment.student_alias === state.selectedStudentAlias)) {
    state.selectedStudentAlias = state.studentAssignments[0]?.student_alias || "S002";
  }
  state.studentReflectionDraft = "";
  refreshUnderstandingMap({ audit: false });
  setInterventionStatus("published");
  addVersion("teacher", "教师已向学生发布批准材料", null);
  addAudit("教师已将批准材料发布到学生门户 Lite", {
    actor: "teacher",
    action: "published_student_assignments",
    target_type: "intervention",
    target_id: state.intervention.intervention_id,
    details: "教师已向受控学生别名发布已批准的分层材料"
  });
  state.view = "student";
  render();
}

function rollbackLatest() {
  if (state.versionHistory.length < 2) return;
  const previousVersion = state.versionHistory[state.versionHistory.length - 2];
  restoreVersion(previousVersion.version_number);
}

function restoreVersion(versionNumber) {
  if (!versionNumber || !state.intervention) return;
  const version = state.versionHistory.find((item) => item.version_number === versionNumber);
  if (!version) return;

  state.intervention = window.TeachFlowControlLayer.restoreVersion(version);
  rebuildInterventionExport();
  setInterventionStatus("rolled_back");
  window.TeachFlowControlLayer.SECTION_DEFINITIONS.forEach((section) => updateSectionApproval(section.key, "under_review"));
  state.sectionEditorJson = JSON.stringify(window.TeachFlowControlLayer.getSectionContent(state.intervention, state.activeSectionKey), null, 2);
  const rollbackEvent = {
    rollback_id: `rollback-${Date.now()}`,
    restored_version_id: version.version_id,
    created_at: new Date().toISOString(),
    actor: "teacher",
    details: `教师已恢复版本 ${version.version_number}`
  };
  state.rollbackEvents.push(rollbackEvent);
  addVersion("teacher", `教师已恢复版本 ${version.version_number}`, null);
  addAudit(`教师已恢复版本 ${version.version_number}`, {
    actor: "teacher",
    action: "rolled_back_intervention",
    target_type: "rollback",
    target_id: rollbackEvent.rollback_id,
    details: `教师已恢复版本 ${version.version_number}；干预已返回复核`
  });
  render();
}

function approve() {
  state.approval.status = "已批准";
  state.approval.approved_by = state.workspace.teacher.display_name || "教师";
  state.approval.approved_at = new Date().toLocaleString();
  addAudit("教师已批准误解诊断");
  render();
}

function reject() {
  state.approval.status = "已拒绝";
  addAudit("教师已驳回误解诊断");
  render();
}

function rollback() {
  state.approval.status = "已回滚";
  addAudit("教师已回滚诊断审批状态");
  render();
}

function exportMarkdown() {
  const markdown = buildMarkdownExport();
  downloadFile("teachflow-misconception-diagnosis.md", markdown, "text/markdown");
  addAudit("已生成 Markdown 诊断导出");
  render();
}

function setInterventionStatus(status) {
  state.interventionStatus = status;
  state.interventionApproval.status = status;
  if (state.intervention) {
    state.intervention.status = status;
  }
}

function updateSectionApproval(sectionKey, status) {
  const section = window.TeachFlowControlLayer.getSectionDefinition(sectionKey);
  state.sectionApprovals[sectionKey] = {
    ...(state.sectionApprovals[sectionKey] || {}),
    section_key: sectionKey,
    label: section.label,
    status,
    approved_by: status === "approved" ? state.workspace.teacher.display_name || "教师" : state.sectionApprovals[sectionKey]?.approved_by || null,
    approved_at: status === "approved" ? new Date().toISOString() : state.sectionApprovals[sectionKey]?.approved_at || null,
    updated_at: new Date().toISOString()
  };
}

function rebuildInterventionExport() {
  if (!state.intervention) return;
  state.intervention.export_markdown = window.TeachFlowInterventionEngine.buildMarkdown(state.intervention);
  state.editableInterventionJson = JSON.stringify(state.intervention, null, 2);
}

function addVersion(createdBy, changeSummary, sectionKey) {
  if (!state.intervention) return;
  const version = window.TeachFlowControlLayer.createVersion({
    intervention: state.intervention,
    versionNumber: state.versionHistory.length + 1,
    createdBy,
    changeSummary,
    sectionKey,
    status: state.interventionStatus
  });
  state.versionHistory.push(version);
}

function currentExportPreview() {
  if (!state.intervention) return "";
  return window.TeachFlowControlLayer.buildExportMarkdown({
    intervention: state.intervention,
    analysis: state.analysis,
    workspace: state.workspace,
    status: state.interventionStatus,
    sectionApprovals: state.sectionApprovals,
    versionHistory: state.versionHistory
  });
}

function canExportIntervention() {
  return ["approved", "exported", "published"].includes(state.interventionStatus);
}

function formatDateTime(value) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function reset() {
  state = createInitialState();
  addAudit("诊断工作区已加载");
  render();
}

function buildMarkdownExport() {
  if (!state.analysis) return "# TeachFlow 误解诊断\n\n还没有生成分析。";

  const lines = [
    `# TeachFlow 误解诊断：${state.analysis.topic}`,
    "",
    `课程：${state.workspace.course.title}`,
    `班级：${state.workspace.class.name}`,
    `模式：匿名教师模式`,
    `状态：${state.approval.status}`,
    "",
    "## 班级理解摘要",
    state.analysis.class_understanding_summary,
    "",
    "## 学生层级",
    `- 困惑：${state.analysis.student_levels.confused.join(", ") || "无"}`,
    `- 部分理解：${state.analysis.student_levels.partially_understood.join(", ") || "无"}`,
    `- 准备应用：${state.analysis.student_levels.ready_to_apply.join(", ") || "无"}`,
    "",
    "## 误解地图",
    ...state.analysis.misconceptions.flatMap((misconception, index) => [
      `### ${index + 1}. ${misconception.title}`,
      "",
      `描述：${misconception.description}`,
      `严重度：${misconception.severity}`,
      `涉及学生：${misconception.affected_students.join(", ")}`,
      "",
      "证据：",
      ...misconception.evidence_quotes.map((evidence) => `- ${evidence.student_alias}: "${evidence.quote}" (${evidence.why_it_matters})`),
      "",
      `可能根因：${misconception.likely_root_cause}`,
      `教学需要：${misconception.teaching_need}`,
      `建议下一步：${misconception.recommended_next_action}`,
      ""
    ]),
    "## 教师摘要",
    state.analysis.teacher_summary
  ];

  return lines.join("\n");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function addAudit(text, metadata = {}) {
  const entry = window.TeachFlowControlLayer.createAuditEntry({
    actor: metadata.actor || "teacher",
    action: metadata.action || "workflow_note",
    targetType: metadata.target_type || "analysis",
    targetId: metadata.target_id || state.analysis?.analysis_run_id || state.intervention?.intervention_id || "workspace",
    details: metadata.details || text
  });
  entry.text = text;
  state.audit.push(entry);
}

function valueOf(id, fallback) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : fallback;
}

function linesOf(id) {
  return valueOf(id, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function statusClass(status) {
  const classMap = {
    地图就绪: "map-ready",
    已发布: "published",
    记忆已更新: "memory-updated",
    工作区草稿: "workspace-draft",
    诊断就绪: "diagnosis-ready",
    教师编辑中: "teacher-editing",
    已批准: "approved",
    已拒绝: "rejected",
    已回滚: "rolled-back"
  };
  return classMap[status] || String(status).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function formatMapStatus(status) {
  const labels = {
    understood: "已理解",
    needs_support: "需要支持",
    not_yet_assessed: "尚未评估",
    setup: "待设置",
    diagnosis_ready: "诊断就绪",
    teacher_review: "教师复核",
    approved_materials: "材料已批准",
    student_support_ready: "学生支持就绪",
    pilot_ready: "试用就绪"
  };
  return labels[status] || window.TeachFlowControlLayer.formatStatus(status);
}

function formatAgentReadiness(readinessLevel) {
  return formatMapStatus(readinessLevel);
}

function formatStuckType(stuckType) {
  const labels = {
    definition: "我不理解定义",
    diagram: "我看不懂图示",
    formula_meaning: "我记得公式，但不理解含义",
    example_transfer: "我能跟着例题走，但不能自己做",
    relevance: "我不知道这个概念为什么重要",
    application: "我能解释，但不会应用"
  };
  return labels[stuckType] || stuckType;
}

function formatSupportStyle(style) {
  const labels = {
    visual: "可视化",
    example: "例子",
    analogy: "类比",
    symbolic: "符号",
    application: "应用"
  };
  return labels[style] || style;
}

function formatPriorityLane(lane) {
  const labels = {
    teacher_workflow: "教师流程",
    teacher_control: "教师控制",
    student_support: "学生支持",
    student_voice: "学生反馈",
    pilot_safety: "试用安全",
    pilot_readiness: "试用准备"
  };
  return labels[lane] || lane.replaceAll("_", " ");
}

function formatSeverity(severity) {
  const labels = {
    high: "高",
    medium: "中",
    low: "低"
  };
  return labels[severity] || severity;
}

function formatActor(actor) {
  const labels = {
    teacher: "教师",
    ai: "AI",
    ai_system: "AI 系统",
    student: "学生"
  };
  return labels[actor] || actor;
}

function formatAuditTarget(targetType) {
  const labels = {
    workflow: "流程",
    analysis: "诊断",
    intervention: "干预",
    material: "材料",
    export: "导出",
    rollback: "回滚",
    understanding_map: "理解地图"
  };
  return labels[targetType] || targetType;
}

function formatFieldLabel(field) {
  const labels = {
    goal: "目标",
    explanation: "解释",
    analogy: "类比",
    concept_bridge: "概念桥接",
    task: "任务",
    challenge: "挑战"
  };
  return labels[field] || field.replaceAll("_", " ");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
