const ADMIN_CONTEXT = {
  role: "school_admin",
  userId: "school-admin-demo",
  classId: "class-physics-a"
};

let adminWorkspace = null;
let activeAdminChannel = "overview";

const adminChannels = {
  overview: {
    kicker: "校级总览",
    title: "学校 AI 教学系统运行状态",
    html: () => `
      <section class="admin-metric-grid">
        ${adminMetric("试点班级", `${aggregate().classCount || 0} 个`, "当前接入 TeachFlow 的班级空间")}
        ${adminMetric("匿名学生别名", `${aggregate().studentAliasCount || 0} 个`, "只看聚合数量，不展开个人明细")}
        ${adminMetric("作业提交率", `${aggregate().submittedRate || 0}%`, "来自学生端提交状态")}
        ${adminMetric("需要支持占比", `${aggregate().supportRate || 0}%`, "按 Level 1 / 需要支持聚合")}
      </section>

      ${comparisonHighlights()}

      <section class="admin-grid">
        <article class="admin-panel">
          <div class="panel-header">
            <div><p class="mini-label">运行摘要</p><h3>${escapeHtml(aggregate().schoolName || "TeachFlow 试用学校")}</h3></div>
            <span class="status-pill">${pilotReadiness().label}</span>
          </div>
          <div class="admin-summary-list">
            ${summaryItem("学生端信号", `${aggregate().stuckSignalCount || 0} 条卡点信号，${aggregate().questionCount || 0} 条问题记录`)}
            ${summaryItem("教师工作流", `${workspace().draftMaterials.length} 份草稿材料，${workspace().approvedMaterials.length} 份已批准材料`)}
            ${summaryItem("系统建议", pilotReadiness().next)}
          </div>
        </article>

        <article class="admin-panel">
          <div class="panel-header">
            <div><p class="mini-label">今日看板</p><h3>校级 Agent 认为最该关注的三件事</h3></div>
            <button class="secondary-button" type="button" data-admin-jump="agent">查看详情</button>
          </div>
          <div class="admin-action-stack">
            ${agentActions().slice(0, 3).map(agentActionCard).join("")}
          </div>
        </article>
      </section>
    `
  },
  classes: {
    kicker: "班级试点",
    title: "不同班级的 AI 教学试点进度",
    html: () => `
      ${comparisonPanel()}
      <section class="admin-panel">
        <div class="panel-header">
          <div><p class="mini-label">班级空间</p><h3>试点班级聚合状态</h3></div>
          <span class="status-pill">聚合视图</span>
        </div>
        <div class="admin-class-grid">
          ${aggregate().classes.map(classCard).join("")}
        </div>
      </section>
    `
  },
  agent: {
    kicker: "学校 Agent",
    title: "校级 Copilot 的下一步建议",
    html: () => `
      <section class="admin-grid">
        <article class="admin-panel agent-panel">
          <div class="panel-header">
            <div><p class="mini-label">AI School System Agent</p><h3>${pilotReadiness().label}</h3></div>
            <span class="status-pill warn">校级决策辅助</span>
          </div>
          <p class="agent-brief">${escapeHtml(agentBrief())}</p>
          <div class="admin-action-stack">
            ${agentActions().map(agentActionCard).join("")}
          </div>
        </article>

        <article class="admin-panel">
          <div class="panel-header">
            <div><p class="mini-label">Agent 记忆</p><h3>系统目前记住的学校级事实</h3></div>
          </div>
          <ul class="admin-list">
            ${memoryList().map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
      </section>
    `
  },
  architecture: {
    kicker: "系统架构",
    title: "AI School Agent System 工作闭环",
    html: () => `
      <section class="architecture-hero">
        <div>
          <p class="mini-label">长期系统图</p>
          <h3>学生私有支持、学习关怀信号、班级匿名证据、教师审批和学校治理必须分层</h3>
        </div>
        <span class="status-pill warn">AI drafts. Teachers decide.</span>
      </section>

      ${architectureFlow()}

      <section class="admin-grid">
        <article class="admin-panel">
          <div class="panel-header">
            <div><p class="mini-label">核心模块</p><h3>每一层负责什么</h3></div>
          </div>
          <div class="architecture-module-grid">
            ${architectureModule("学生学习助手", "只服务学生本人：解释概念、记录个人卡点、组织求助草稿，不代写作业。")}
            ${architectureModule("AI 学习关怀助手", "让学生表达学习压力和挫败，把情绪化卡点转成学习支持语言，不做心理诊断。")}
            ${architectureModule("学习信号提取器", "把学生问题和卡点整理成有限证据：别名、知识点、卡点类型、证据片段。")}
            ${architectureModule("治理与安全层", "统一处理匿名化、权限、最小必要共享、审计、教师审批、不自动评分、不自动发布。")}
            ${architectureModule("老师 Agent", "基于匿名证据、学习关怀摘要和课程上下文生成诊断、个体建议和跟进队列。")}
            ${architectureModule("教师批准内容库", "学生端正式内容优先来自老师已经批准的讲解、小测、图解和任务。")}
            ${architectureModule("效果评估闭环", "学生完成 micro-quiz、反思和练习后，系统更新理解趋势并辅助老师复盘。")}
          </div>
        </article>

        <article class="admin-panel">
          <div class="panel-header">
            <div><p class="mini-label">版本边界</p><h3>现在做什么，后面再做什么</h3></div>
          </div>
          ${scopePanel()}
        </article>
      </section>
    `
  },
  pilot: {
    kicker: "试点路线",
    title: "从一个班级走向学校试用",
    html: () => `
      <section class="admin-panel">
        <div class="panel-header">
          <div><p class="mini-label">路线图</p><h3>把 TeachFlow 做成学校可试用系统</h3></div>
          <span class="status-pill">${pilotReadiness().stage}</span>
        </div>
        <div class="pilot-roadmap">
          ${roadmapStep("1", "完成核心闭环", "老师端、学生端、学校端都能围绕同一份 workspace 运转。", "done")}
          ${roadmapStep("2", "扩大课堂样本", "继续补 2-3 个不同学科/主题的匿名案例包。", "active")}
          ${roadmapStep("3", "打磨校级复盘", "让管理者看到班级趋势、教师负担、学生支持需求。", "active")}
          ${roadmapStep("4", "准备真实试用", "整理演示脚本、教师培训说明、试点反馈表。", "next")}
        </div>
      </section>
    `
  },
  audit: {
    kicker: "审计摘要",
    title: "学校管理端看到的操作摘要",
    html: () => `
      <section class="admin-grid">
        <article class="admin-panel">
          <div class="panel-header">
            <div><p class="mini-label">操作类型</p><h3>最近工作流动作分布</h3></div>
            <span class="status-pill">摘要</span>
          </div>
          <div class="audit-action-grid">
            ${Object.entries(aggregate().auditByAction || {}).map(([action, count]) => auditAction(action, count)).join("") || emptyState("暂无审计动作")}
          </div>
        </article>
        <article class="admin-panel">
          <div class="panel-header">
            <div><p class="mini-label">最近事件</p><h3>不含学生个人明细的事件流</h3></div>
          </div>
          <ul class="admin-list compact">
            ${(aggregate().latestAudit || []).map(auditEvent).join("") || `<li>${emptyState("暂无最近事件")}</li>`}
          </ul>
        </article>
      </section>
    `
  }
};

document.addEventListener("DOMContentLoaded", () => {
  waitForAuthReady().then((ready) => {
    if (!ready) return;
    loadWorkspace().then(() => {
      bindAdminNavigation();
      renderAdmin();
    });
  });
});

async function waitForAuthReady(startedAt = Date.now()) {
  if (document.body.classList.contains("auth-ready")) return true;
  if (document.body.classList.contains("auth-gate-open")) return false;
  if (Date.now() - startedAt > 5000) return false;
  await new Promise((resolve) => setTimeout(resolve, 50));
  return waitForAuthReady(startedAt);
}

async function loadWorkspace() {
  const raw = await window.TeachFlowWorkspaceState.syncFromServer(ADMIN_CONTEXT);
  adminWorkspace = raw.session?.role === "school_admin" && raw.schoolAggregate
    ? raw
    : window.TeachFlowWorkspaceState.scopedStateForContext(raw, ADMIN_CONTEXT);
  window.addEventListener("teachflow-workspace-updated", () => {
    const next = window.TeachFlowWorkspaceState.getState();
    adminWorkspace = window.TeachFlowWorkspaceState.scopedStateForContext(next, ADMIN_CONTEXT);
    renderAdmin();
  });
}

function bindAdminNavigation() {
  document.querySelectorAll("[data-admin-channel]").forEach((button) => {
    button.addEventListener("click", () => {
      activeAdminChannel = button.dataset.adminChannel;
      renderAdmin();
    });
  });
  document.querySelectorAll("[data-admin-top-channel]").forEach((button) => {
    button.addEventListener("click", () => {
      activeAdminChannel = button.dataset.adminTopChannel;
      renderAdmin();
    });
  });
}

function renderAdmin() {
  const channel = adminChannels[activeAdminChannel] || adminChannels.overview;
  document.querySelectorAll("[data-admin-channel]").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminChannel === activeAdminChannel);
  });
  const kicker = document.getElementById("admin-kicker");
  const title = document.getElementById("admin-title");
  const schoolName = document.getElementById("admin-school-name");
  const content = document.getElementById("admin-content");
  if (kicker) kicker.textContent = channel.kicker;
  if (title) title.textContent = channel.title;
  if (schoolName) schoolName.textContent = aggregate().schoolName || "TeachFlow 试用学校";
  if (content) content.innerHTML = channel.html();
  bindInlineJumps();
  compactAdminPanels();
}

function bindInlineJumps() {
  document.querySelectorAll("[data-admin-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      activeAdminChannel = button.dataset.adminJump;
      renderAdmin();
    });
  });
}

function compactAdminPanels() {
  makeAdminCompactDisclosure(".agent-panel + .admin-panel .admin-list", "查看 Agent 记忆", "校级");
  makeAdminCompactDisclosure(".pilot-roadmap", "查看完整试点路线", "路线");
  makeAdminCompactDisclosure(".admin-list.compact", "查看最近事件流", "审计");
}

function makeAdminCompactDisclosure(selector, title, meta) {
  document.querySelectorAll(selector).forEach((node) => {
    if (node.closest("details") || node.dataset.compacted === "true") return;
    const details = document.createElement("details");
    details.className = "admin-compact-disclosure compacted-detail";
    details.dataset.compacted = "true";
    details.innerHTML = `
      <summary><span>${escapeHtml(title)}</span><em>${escapeHtml(meta || "详情")}</em></summary>
      <div class="admin-compact-body">${node.outerHTML}</div>
    `;
    node.replaceWith(details);
  });
}

function workspace() {
  return adminWorkspace || window.TeachFlowWorkspaceState.scopedStateForContext(
    window.TeachFlowWorkspaceState.getState(),
    ADMIN_CONTEXT
  );
}

function aggregate() {
  return workspace().schoolAggregate || {
    classes: [],
    auditByAction: {},
    latestAudit: []
  };
}

function pilotReadiness() {
  const data = aggregate();
  if (!data.classCount) {
    return { label: "等待接入", stage: "准备中", next: "先创建一个试点班级空间。" };
  }
  if ((data.submittedRate || 0) >= 70 && (data.supportRate || 0) <= 25) {
    return { label: "试点稳定", stage: "可复盘", next: "可以准备第二个班级或第二个学科案例。" };
  }
  if ((data.stuckSignalCount || 0) > 0 || (data.questionCount || 0) > 0) {
    return { label: "需要跟进", stage: "运行中", next: "先让老师处理学生端同步过来的卡点和问题。" };
  }
  return { label: "试点启动", stage: "启动中", next: "推动学生端完成第一次作业和卡点反馈。" };
}

function agentBrief() {
  const data = aggregate();
  return `${data.schoolName || "当前学校"}已经接入 ${data.classCount || 0} 个试点班级，覆盖 ${data.studentAliasCount || 0} 个匿名学生别名。校级 Agent 建议先看支持需求、作业提交率和老师审批节奏，再决定是否扩大试点。`;
}

function agentActions() {
  const data = aggregate();
  const actions = [];
  if ((data.needsSupportCount || 0) > 0) {
    actions.push({
      title: "安排教师复盘高支持需求",
      detail: `${data.needsSupportCount} 个匿名学生别名处于 Level 1 或需要支持状态。`,
      next: "请老师在教学分析中优先处理图示、公式、定义类卡点。"
    });
  }
  if ((data.submittedRate || 0) < 70) {
    actions.push({
      title: "提高第一次作业完成率",
      detail: `当前作业提交率为 ${data.submittedRate || 0}%。`,
      next: "让老师发布一个更短的提交任务，先拿到可诊断样本。"
    });
  }
  if ((data.stuckSignalCount || 0) > 0 || (data.questionCount || 0) > 0) {
    actions.push({
      title: "把学生端信号转成备课动作",
      detail: `已有 ${data.stuckSignalCount || 0} 条卡点和 ${data.questionCount || 0} 条问题。`,
      next: "把高频卡点变成下一节课的 5 分钟补救材料。"
    });
  }
  actions.push({
    title: "沉淀可复用试点材料",
    detail: `${workspace().approvedMaterials.length} 份材料已批准，${workspace().draftMaterials.length} 份材料仍在草稿。`,
    next: "把已批准材料整理成学校级示范包。"
  });
  return actions;
}

function memoryList() {
  const data = aggregate();
  return [
    `学校：${data.schoolName || "TeachFlow 试用学校"}`,
    `试点班级：${data.classCount || 0} 个`,
    `匿名学生别名：${data.studentAliasCount || 0} 个`,
    `学生端信号：${data.stuckSignalCount || 0} 条卡点，${data.questionCount || 0} 条问题`,
    `材料状态：${workspace().approvedMaterials.length} 份已批准，${workspace().draftMaterials.length} 份草稿`
  ];
}

function architectureFlow() {
  const stages = [
    {
      label: "学生端行为",
      title: "提问 / 作业 / 卡点 / 学习记录",
      detail: "学生在自己的页面完成学习动作，产生原始学习信号。"
    },
    {
      label: "学生学习助手",
      title: "私有帮助与个人记忆",
      detail: "优先基于老师批准材料引导学习，超出范围时标记为解释草稿。"
    },
    {
      label: "AI 学习关怀助手",
      title: "表达压力、挫败和不想学的原因",
      detail: "帮助学生把情绪化抱怨整理成可解决的学习问题，不做心理诊断。"
    },
    {
      label: "学习情绪信号分级",
      title: "普通抱怨 / 学习挫败 / 持续压力 / 安全风险",
      detail: "只输出临时学习支持指标；安全风险需要真人流程，而不是 AI 独自处理。",
      tone: "safety"
    },
    {
      label: "学习信号提取器",
      title: "把对话变成学习证据",
      detail: "只提取与学习目标相关的匿名证据，不把完整私聊直接暴露给老师。"
    },
    {
      label: "治理与安全层",
      title: "权限、匿名化、最小必要共享与审计",
      detail: "所有 Agent 输出都经过安全边界：不代写、不自动诊断、不自动评分、不自动发布。",
      tone: "safety"
    },
    {
      label: "班级匿名证据层",
      title: "别名 + 证据 + 卡点类型",
      detail: "老师看到的是可诊断证据，而不是真实身份或无关隐私。"
    },
    {
      label: "课程上下文",
      title: "目标 / 课件 / 作业 / 历史干预",
      detail: "老师 Agent 的建议必须贴合当前课程，而不是泛泛而谈。"
    },
    {
      label: "老师 Agent",
      title: "诊断、个体建议、分层干预、Teacher Inbox",
      detail: "帮助老师判断班级哪里没懂、谁需要先看、怎样用学习支持方式回应。"
    },
    {
      label: "教师审批与控制",
      title: "Edit / Approve / Reject / Export / Publish / Rollback",
      detail: "AI 只生成草稿，老师决定是否发布，并保留版本和审计记录。",
      tone: "control"
    },
    {
      label: "教师批准内容库",
      title: "讲解 / 小测 / 图解 / 任务 / 反馈",
      detail: "学生端正式学习内容回流到这里，再发布给对应别名或班级。"
    },
    {
      label: "效果评估",
      title: "micro-quiz / 反思 / 练习",
      detail: "学生完成后续任务后，新的证据再次进入信号提取器，形成教学改进闭环。"
    }
  ];

  return `
    <section class="architecture-flow" aria-label="AI School Agent System 工作流程">
      ${stages.map(architectureNode).join("")}
    </section>
  `;
}

function architectureNode(item, index) {
  const arrow = index === 0 ? "" : `<span class="architecture-arrow" aria-hidden="true">→</span>`;
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
  `;
}

function architectureModule(title, detail) {
  return `
    <div class="architecture-module">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(detail)}</span>
    </div>
  `;
}

function scopePanel() {
  const now = [
    "老师端、学生端、学校管理端",
    "匿名证据、理解诊断、分层干预",
    "Student Check-in 与学习关怀摘要",
    "教师审批、版本记录、导出、发布、审计",
    "学生作业、问题、卡点同步到老师端",
    "多班级聚合与学校端横向对比"
  ];
  const later = [
    "更完整的学生私有长期记忆",
    "可配置的学习信号提取规则",
    "Teacher Inbox 的处理动作与状态流转",
    "学校 safeguarding 角色与升级流程",
    "教师批准内容库的搜索、复用和发布历史",
    "干预效果评估报告与校级试点复盘",
    "生产级身份、数据库、安全策略和真实 AI 接入"
  ];

  return `
    <div class="scope-split">
      <div>
        <span>v0.1 / 当前先做扎实</span>
        <ul>${now.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div>
        <span>v0.2+ / 后续增强</span>
        <ul>${later.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    </div>
  `;
}

function comparisonHighlights() {
  const comparison = aggregate().comparison || {};
  return `
    <section class="comparison-highlight-grid">
      ${comparisonHighlight("最高支持需求", comparison.highestSupportClass, (item) => `${item.supportRate}% 需要支持 · 高频卡点：${item.dominantNeed}`)}
      ${comparisonHighlight("提交率最低", comparison.lowestSubmissionClass, (item) => `${item.submittedRate}% 已提交 · 需要推动第一次反馈`)}
      ${comparisonHighlight("学生端最活跃", comparison.mostActiveClass, (item) => `${item.activityScore} 活跃度 · 卡点/问题更集中`)}
      ${comparisonHighlight("最适合扩展", comparison.mostReadyClass, (item) => `${item.submittedRate}% 提交 · ${item.supportRate}% 支持需求`)}
    </section>
  `;
}

function comparisonHighlight(label, item, noteFor) {
  if (!item) return `<article class="comparison-highlight"><span>${escapeHtml(label)}</span><strong>暂无数据</strong><small>等待班级接入</small></article>`;
  return `
    <article class="comparison-highlight">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(item.name)}</strong>
      <small>${escapeHtml(noteFor(item))}</small>
    </article>
  `;
}

function comparisonPanel() {
  const rows = aggregate().classes || [];
  return `
    <section class="admin-panel comparison-panel">
      <div class="panel-header">
        <div><p class="mini-label">横向对比</p><h3>班级提交率、支持需求与活跃度</h3></div>
        <span class="status-pill">多班级 demo</span>
      </div>
      <div class="comparison-table">
        ${rows.map(classComparisonRow).join("") || emptyState("暂无班级对比数据")}
      </div>
    </section>
  `;
}

function classComparisonRow(item) {
  return `
    <article class="comparison-row">
      <div class="comparison-class">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.topic)} · ${escapeHtml(item.readinessLabel || "试点中")}</span>
      </div>
      ${comparisonBar("提交", item.submittedRate, "submit")}
      ${comparisonBar("支持", item.supportRate, "support")}
      ${comparisonBar("活跃", item.activityScore, "activity")}
      <div class="comparison-next">
        <span>下一步</span>
        <strong>${escapeHtml(nextActionForClass(item))}</strong>
      </div>
    </article>
  `;
}

function comparisonBar(label, value, tone) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return `
    <div class="comparison-bar ${escapeAttr(tone)}">
      <span>${escapeHtml(label)} · ${safeValue}%</span>
      <div><i style="width: ${safeValue}%"></i></div>
    </div>
  `;
}

function nextActionForClass(item) {
  if ((item.supportRate || 0) >= 30) return `先处理 ${item.dominantNeed || "高频卡点"}`;
  if ((item.submittedRate || 0) < 60) return "推动第一次作业提交";
  if ((item.activityScore || 0) >= 80) return "沉淀高质量试点案例";
  return "继续收集下一轮学习信号";
}

function adminMetric(label, value, note) {
  return `<article class="admin-metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
}

function summaryItem(label, value) {
  return `<div class="summary-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function classCard(item) {
  return `
    <article class="class-card">
      <div class="class-card-header">
        <div>
          <span>${escapeHtml(item.course || "课程")}</span>
          <h3>${escapeHtml(item.name)}</h3>
        </div>
        <em>${escapeHtml(item.status || "试点中")}</em>
      </div>
      <p>${escapeHtml(item.topic || "当前主题待确认")}</p>
      <div class="class-stats">
        ${smallStat("别名", item.studentAliasCount)}
        ${smallStat("提交", `${item.submittedRate}%`)}
        ${smallStat("支持", `${item.supportRate}%`)}
        ${smallStat("关注", item.attentionScore)}
      </div>
      <div class="class-card-foot">
        <span>${escapeHtml(item.readinessLabel || "试点中")}</span>
        <strong>${escapeHtml(nextActionForClass(item))}</strong>
      </div>
      <div class="need-tags">
        ${(item.topNeeds || []).map((need) => `<span>${escapeHtml(need.label)} · ${escapeHtml(need.count)}</span>`).join("")}
      </div>
    </article>
  `;
}

function smallStat(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function agentActionCard(item) {
  return `
    <article class="agent-action-card">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.detail)}</p>
      <span>${escapeHtml(item.next)}</span>
    </article>
  `;
}

function roadmapStep(number, title, detail, status) {
  return `
    <article class="roadmap-step ${escapeAttr(status)}">
      <span>${escapeHtml(number)}</span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(detail)}</p>
      </div>
    </article>
  `;
}

function auditAction(action, count) {
  return `<div class="audit-chip"><span>${escapeHtml(action)}</span><strong>${escapeHtml(count)}</strong></div>`;
}

function auditEvent(event) {
  return `<li><strong>${escapeHtml(event.action)}</strong><span>${escapeHtml(event.role)} · ${escapeHtml(event.classId || "全校")} · ${formatTime(event.timestamp)}</span></li>`;
}

function emptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function formatTime(value) {
  if (!value) return "暂无时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
