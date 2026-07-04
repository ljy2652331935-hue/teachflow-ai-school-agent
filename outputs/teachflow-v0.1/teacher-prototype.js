let selectedStudentId = "S002";
let teacherAgentQuestion = "这节课我下一步应该先处理什么？";
let teacherAgentAnswer = "";
let teacherAgentBriefing = null;
let teacherAgentBriefingSource = "local";
const TEACHER_CONTEXT = window.TeachFlowWorkspaceState.getTeacherContext();
let studentRoster = window.TeachFlowWorkspaceState.getStudentsForContext(TEACHER_CONTEXT);
let activeTeacherChannelId = "overview";
let selectedMessageAlias = "S002";
let teacherActivityDockMinimized = readTeacherActivityDockMinimized();
let teacherActivityDockScale = readTeacherActivityDockScale();

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const channels = {
  overview: {
    kicker: "今日总览",
    title: "老师一天的决策中心",
    html: `
      <section class="metric-grid">
        ${metric("待复核诊断", "3", "比昨天少 2 项")}
        ${metric("需要支持学生", "9", "集中在图示理解")}
        ${metric("已批准材料", "4", "可直接发布")}
        ${metric("今日卡点信号", "6", "2 个高优先级")}
      </section>
      <section class="layout-grid">
        <div class="panel">
          <div class="panel-header">
            <div><p class="mini-label">课堂流</p><h3>今天需要处理的事项</h3></div>
            <span class="status-pill warn">需要老师确认</span>
          </div>
          <details class="compact-disclosure">
            <summary>
              <span>查看今日流程详情</span>
              <em>4 项</em>
            </summary>
            <ul class="timeline-list">
            ${timeline("09:10", "高二物理 A 班完成小测", "32 份匿名回答已进入理解诊断队列")}
            ${timeline("10:35", "系统生成分层干预草稿", "建议先复核“公式即概念”误解证据")}
            ${timeline("13:20", "学生端收到 6 条卡点信号", "主要集中在时域与频域图示转换")}
            ${timeline("15:40", "明日课前材料待导出", "教师批准后可发布给 Level 1 与 Level 2 学生")}
            </ul>
          </details>
        </div>
        <div class="panel material-preview">
          <img src="assets/fourier-prism.png" alt="傅里叶变换课堂材料预览">
          <div class="material-caption">
            <p class="mini-label">材料预览</p>
            <h3>傅里叶变换视觉讲解</h3>
            <p>当前主题材料会出现在老师审批、学生端讲义和理解地图里。</p>
          </div>
        </div>
      </section>
    `
  },
  courses: {
    kicker: "课程班级",
    title: "课程、班级与主题管理",
    html: () => `
      <section class="layout-grid">
        <div class="panel table-card">
          <div class="panel-header">
            <div><p class="mini-label">班级列表</p><h3>正在试用的教学空间</h3></div>
            <button class="secondary-button" type="button">添加班级</button>
          </div>
          <table>
            <thead><tr><th>班级</th><th>当前主题</th><th>学生别名</th><th>状态</th></tr></thead>
            <tbody>
              ${row(["高二物理 A 班", "傅里叶变换", "S001-S032", "诊断中"])}
              ${row(["高一物理 B 班", "机械波", "S001-S028", "准备材料"])}
              ${row(["AP Physics", "Electric Fields", "S001-S021", "待开始"])}
            </tbody>
          </table>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div><p class="mini-label">当前主题</p><h3>傅里叶变换</h3></div>
            <span class="status-pill">已保存</span>
          </div>
          <ul class="task-list">
            ${task("学习目标", "解释同一信号可以用时域和频域两种方式表示")}
            ${task("课堂材料", "包含概念讲解、图示、练习题和学生回答入口")}
            ${task("隐私设置", "只允许学生别名，不收集姓名、邮箱或学号")}
          </ul>
        </div>
      </section>
      <section class="class-student-section">
        <div class="panel roster-panel">
          <div class="panel-header">
            <div><p class="mini-label">学生头像组</p><h3>点击头像查看具体学习信息</h3></div>
            <span class="status-pill">高二物理 A 班</span>
          </div>
          <div class="student-avatar-grid">
            ${studentRoster.map(studentAvatar).join("")}
          </div>
        </div>
      </section>
    `
  },
  analysis: {
    kicker: "教学分析",
    title: "教学分析：诊断、干预和学生支持在一个工作台里",
    html: () => `
      ${analysisOutcomeSummaryPanel()}
      ${teacherAgentPanel()}

      <section class="metric-grid analysis-metrics">
        ${analysisMetricCards()}
      </section>

      <section class="panel analysis-workbench-panel">
        <div class="panel-header">
          <div><p class="mini-label">教学分析工作台</p><h3>把理解诊断、分层干预和学生跟进合在这里处理</h3></div>
          <span class="status-pill">摘要优先</span>
        </div>
        <div class="analysis-brief-grid">
          ${analysisBriefCard("diagnosis", "理解诊断", "3 个主要误解", "证据集中在图示转换、公式含义和迁移应用。", "查看证据", "hot")}
          ${analysisBriefCard("intervention", "分层干预", "3 套材料草稿", "Level 1 图示讲解、Level 2 桥接练习、Level 3 迁移挑战。", "查看方案", "warn")}
          ${analysisBriefCard("student", "学生支持", `${sharedCheckIns().length} 条共享信号`, "学生只共享学习摘要，老师不看到完整私密对话。", "查看学生", "")}
        </div>
      </section>

      <section class="analysis-clean-grid">
        <div class="panel analysis-flow-panel">
          <div class="panel-header">
            <div><p class="mini-label">AI 教学闭环</p><h3>从学生证据到下一步教学动作</h3></div>
            <span class="status-pill">本节课自动更新</span>
          </div>
          <div class="analysis-flow compact-flow">
            ${analysisStep("1", "收集证据", "作业、提问、卡点和 Check-in 汇入同一数据层。", "实时同步")}
            ${analysisStep("2", "生成判断", "只给出学习误解和证据，不替代老师判断。", "待复核")}
            ${analysisStep("3", "安排干预", "把误解映射到 Level 1-3 材料与小测。", "草稿")}
            ${analysisStep("4", "继续跟进", "学生新反馈会回到下一轮教学分析。", "持续记录")}
          </div>
        </div>

        <aside class="panel analysis-action-panel">
          <div class="panel-header">
            <div><p class="mini-label">下一步动作</p><h3>系统建议老师先做这些</h3></div>
            <span class="status-pill warn">待老师批准</span>
          </div>
          <div class="analysis-action-stack">
            ${analysisAction("先补图示", "给 Level 1 学生发布一张低门槛图示讲解图。", "制作图片", "creation")}
            ${analysisAction("再做短练", "给 Level 2 学生发布 3 道图示对应小题。", "看干预", "intervention")}
            ${analysisAction("重点跟进", "优先查看 S009、S014、S021 的原句和下一步。", "看学生", "student")}
          </div>
        </aside>
      </section>

      ${teacherSupportInbox()}
      ${workspaceSyncPanel()}
    `
  },
  messages: {
    kicker: "消息中心",
    title: "像 Teams 一样处理帮助提醒和师生对话",
    html: () => teacherMessagesChannel()
  },
  creation: {
    kicker: "制作材料",
    title: "制作图片、PPT、讲义和练习材料",
    html: `
      <section class="creation-layout">
        <div class="panel material-maker">
          <div class="panel-header">
            <div><p class="mini-label">材料制作台</p><h3>从诊断结果出发生成不同学习材料</h3></div>
            <span class="status-pill warn">草稿阶段</span>
          </div>
          <div class="material-type-grid">
            ${materialType("讲", "讲义", "生成学生可读的概念讲义，适合课前预习和课后复习。", "已选")}
            ${materialType("图", "图片", "制作图示、流程图、概念地图或课堂投影图片。", "可制作")}
            ${materialType("PPT", "PPT", "生成 6-8 页课堂幻灯片，包含讲解顺序和教师备注。", "可制作")}
            ${materialType("练", "练习", "按 Level 1-3 生成分层练习和微型测试。", "可制作")}
          </div>

          <div class="maker-form">
            <label>
              <span>材料主题</span>
              <input value="傅里叶变换：时域与频域的图示理解">
            </label>
            <label>
              <span>制作目标</span>
              <textarea>帮助学生看懂“同一个信号可以用时域和频域两种方式表示”，重点降低图示转换和公式含义的理解门槛。</textarea>
            </label>
            <div class="maker-field-grid">
              <label>
                <span>适用层级</span>
                <select>
                  <option>Level 1 困惑学生</option>
                  <option>Level 2 部分理解</option>
                  <option>Level 3 准备应用</option>
                </select>
              </label>
              <label>
                <span>输出格式</span>
                <select>
                  <option>讲义 + 图片 + 小测</option>
                  <option>PPT + 教师备注</option>
                  <option>只生成课堂图片</option>
                </select>
              </label>
            </div>
            <div class="action-row">
              <button class="primary-button" type="button">生成材料草稿</button>
              <button class="secondary-button" type="button" data-jump-channel="approval">送去审批导出</button>
            </div>
          </div>
        </div>

        <aside class="panel creation-preview">
          <div class="panel-header">
            <div><p class="mini-label">预览</p><h3>老师审批前可继续编辑</h3></div>
            <span class="status-pill">版本 3</span>
          </div>
          <img src="assets/fourier-prism.png" alt="材料制作预览图">
          <ul class="material-review-list">
            ${materialReview("图片", "傅里叶变换视觉讲解图", "用于解释复杂波形如何拆成简单频率。")}
            ${materialReview("讲义", "学生版 5 分钟讲义", "压低术语密度，先讲直觉再讲公式。")}
            ${materialReview("PPT", "课堂 8 页讲解稿", "包含教师提示、追问点和板书建议。")}
          </ul>
        </aside>
      </section>
    `
  },
  approval: {
    kicker: "审批导出",
    title: "老师最终控制层",
    html: `
      <section class="layout-grid">
        <div class="panel">
          <div class="panel-header">
            <div><p class="mini-label">审批流</p><h3>草稿不会自动发布</h3></div>
            <span class="status-pill warn">等待复核</span>
          </div>
          <ul class="timeline-list">
            ${timeline("版本 1", "AI 生成初稿", "包含教学计划、分层材料、微型测验")}
            ${timeline("版本 2", "教师编辑 Level 1 材料", "加入更具体的图示讲解")}
            ${timeline("当前", "等待最终批准", "批准后才能导出并发布到学生端")}
          </ul>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div><p class="mini-label">制作页送审材料</p><h3>教师可复用材料</h3></div>
          </div>
          <ul class="material-review-list approval-materials">
            ${materialReview("讲义", "傅里叶变换学生讲义", "等待老师确认语言难度和例子是否适合本班。")}
            ${materialReview("图片", "时域与频域对应图", "等待老师确认图示是否准确、无遮挡。")}
            ${materialReview("PPT", "课堂讲解幻灯片", "等待老师确认讲解顺序和课堂节奏。")}
          </ul>
          <div class="action-row">
            <button class="primary-button" type="button">批准</button>
            <button class="secondary-button" type="button">导出 Markdown</button>
            <button class="secondary-button" type="button">导出 PPT</button>
            <button class="plain-button" type="button">回滚版本</button>
          </div>
        </div>
      </section>
    `
  },
  settings: {
    kicker: "系统设置",
    title: "安全边界与学校试用设置",
    html: () => `
      <section class="split-panel">
        <div class="panel">
          <div class="panel-header">
            <div><p class="mini-label">隐私规则</p><h3>默认匿名试用</h3></div>
            <span class="status-pill">已启用</span>
          </div>
          <ul class="task-list">
            ${task("学生身份", "只允许 S001 这类别名")}
            ${task("学生端", "不开放自由聊天，只显示老师批准材料")}
            ${task("管理层视图", "只展示聚合洞察，不显示个人细节")}
          </ul>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div><p class="mini-label">权限</p><h3>教师拥有最终控制权</h3></div>
          </div>
          <div class="pill-row">
            <span class="status-pill">可编辑</span>
            <span class="status-pill">可审批</span>
            <span class="status-pill">可导出</span>
            <span class="status-pill warn">发布前复核</span>
          </div>
        </div>
      </section>
      ${roleBoundaryPanel()}
      ${auditLogPanel()}
    `
  }
};

const buttons = Array.from(document.querySelectorAll("[data-channel]"));
const content = document.getElementById("channel-content");
const title = document.getElementById("channel-title");
const kicker = document.getElementById("channel-kicker");

buttons.forEach((button) => {
  button.addEventListener("click", () => setChannel(button.dataset.channel));
});

document.querySelectorAll("[data-top-channel]").forEach((button) => {
  button.addEventListener("click", () => setChannel(button.dataset.topChannel));
});

function setChannel(channelId) {
  activeTeacherChannelId = channels[channelId] ? channelId : "overview";
  syncTeacherChannelHash(activeTeacherChannelId);
  renderTeacherChannel(activeTeacherChannelId);
  syncTeacherWorkspace(activeTeacherChannelId);
  syncTeacherAgentBriefing(activeTeacherChannelId);
}

function syncTeacherChannelHash(channelId) {
  if (!history.replaceState) return;
  const nextHash = `#${channelId}`;
  if (location.hash === nextHash) return;
  history.replaceState(null, "", nextHash);
}

function channelFromLocation() {
  const queryChannel = new URLSearchParams(location.search).get("channel");
  if (channels[queryChannel]) return queryChannel;
  const hashChannel = decodeURIComponent(location.hash.replace(/^#/, ""));
  return channels[hashChannel] ? hashChannel : "overview";
}

function renderTeacherChannel(channelId) {
  refreshTeacherWorkspaceState();
  const channel = channels[channelId] || channels.overview;
  buttons.forEach((button) => button.classList.toggle("active", button.dataset.channel === channelId));
  title.textContent = channel.title;
  kicker.textContent = channel.kicker;
  content.innerHTML = typeof channel.html === "function" ? channel.html() : channel.html;
  ensureTeacherDetailModal();
  ensureTeacherActivityDock();
  renderTeacherActivityDock();
  bindDynamicInteractions();
  compactTeacherPanels();
}

function syncTeacherWorkspace(channelId) {
  if (typeof window.TeachFlowWorkspaceState.syncFromServer !== "function") return;
  window.TeachFlowWorkspaceState.syncFromServer(TEACHER_CONTEXT).then(() => {
    renderTeacherActivityDock();
    if (channelId !== activeTeacherChannelId) return;
    if (isTeacherDraftActive()) return;
    renderTeacherChannel(activeTeacherChannelId);
  });
}

function syncTeacherAgentBriefing(channelId) {
  if (!canUseTeacherAgentApi()) return;
  window.fetch("/api/teacher-agent/briefing", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Teacher Agent API ${response.status}`);
      return response.json();
    })
    .then((briefing) => {
      teacherAgentBriefing = briefing;
      teacherAgentBriefingSource = "api";
      if (channelId !== activeTeacherChannelId) return;
      if (isTeacherDraftActive()) return;
      if (activeTeacherChannelId === "analysis" || activeTeacherChannelId === "overview") {
        renderTeacherChannel(activeTeacherChannelId);
      }
    })
    .catch(() => {
      teacherAgentBriefingSource = "local";
    });
}

function canUseTeacherAgentApi() {
  return Boolean(
    window.fetch &&
    window.location &&
    /^https?:$/.test(window.location.protocol)
  );
}

function isTeacherDraftActive() {
  return isTeacherMessageDraftActive() || isTeacherAgentDraftActive();
}

function isTeacherMessageDraftActive() {
  const form = document.getElementById("teacher-message-form");
  const input = document.getElementById("teacher-message-input");
  return Boolean(
    form &&
    (form.contains(document.activeElement) || input?.value.trim())
  );
}

function isTeacherAgentDraftActive() {
  const form = document.getElementById("teacher-agent-form");
  const input = document.getElementById("teacher-agent-input");
  return Boolean(
    form &&
    (form.contains(document.activeElement) || input?.value.trim() !== teacherAgentQuestion)
  );
}

function refreshTeacherWorkspaceState() {
  studentRoster = window.TeachFlowWorkspaceState.getStudentsForContext(TEACHER_CONTEXT);
}

function bindDynamicInteractions() {
  const teacherAgentForm = document.getElementById("teacher-agent-form");
  if (teacherAgentForm) {
    teacherAgentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      askTeacherAgent();
    });
  }

  document.querySelectorAll("[data-agent-action]").forEach((button) => {
    button.addEventListener("click", () => {
      applyTeacherAgentAction(button.dataset.agentAction, button);
    });
  });

  document.querySelectorAll("[data-detail-type]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openTeacherDetailModal(button.dataset.detailType, button.dataset.detailId || button.dataset.studentId || "");
    });
  });

  document.querySelectorAll("[data-student-id]:not([data-detail-type])").forEach((button) => {
    button.addEventListener("click", () => {
      selectedStudentId = button.dataset.studentId;
      openTeacherDetailModal("student", selectedStudentId);
    });
  });

  document.querySelectorAll("[data-jump-channel]").forEach((button) => {
    button.addEventListener("click", () => setChannel(button.dataset.jumpChannel));
  });

  document.querySelectorAll("[data-open-message]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMessageAlias = button.dataset.openMessage || selectedMessageAlias;
      setChannel("messages");
    });
  });

  document.querySelectorAll("[data-message-alias]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMessageAlias = button.dataset.messageAlias || selectedMessageAlias;
      setChannel("messages");
    });
  });

  const teacherMessageForm = document.getElementById("teacher-message-form");
  if (teacherMessageForm) {
    teacherMessageForm.addEventListener("submit", (event) => {
      event.preventDefault();
      sendTeacherMessage();
    });
    teacherMessageForm.querySelector("button[type='submit']")?.addEventListener("click", (event) => {
      event.preventDefault();
      sendTeacherMessage();
    });
  }
}

function compactTeacherPanels() {
  makeCompactDisclosure(".teacher-support-boundary:not(details)", "查看共享边界", "隐私");
}

function makeCompactDisclosure(selector, title, meta) {
  document.querySelectorAll(selector).forEach((node) => {
    if (node.dataset.compacted === "true") return;
    const details = document.createElement("details");
    details.className = `compact-disclosure compacted-detail ${node.className || ""}`.trim();
    details.dataset.compacted = "true";
    details.innerHTML = `
      <summary><span>${escapeHtml(title)}</span><em>${escapeHtml(meta || "详情")}</em></summary>
      <div class="compact-disclosure-body">${node.innerHTML}</div>
    `;
    node.replaceWith(details);
  });
}

function askTeacherAgent() {
  const input = document.getElementById("teacher-agent-input");
  const question = input?.value.trim();
  if (!question) return;

  teacherAgentQuestion = question;
  teacherAgentAnswer = "正在调用真实 AI Agent，请稍等...";
  setChannel("analysis");
  answerTeacherQuestion(question, currentTeacherAgentState()).then((answer) => {
    teacherAgentAnswer = answer;
    if (activeTeacherChannelId === "analysis") setChannel("analysis");
  });
}

async function answerTeacherQuestion(question, agentState) {
  const localAnswer = () => {
    if (window.TeachFlowTeacherAgentOrchestrator?.answerTeacherAgentQuestion) {
      return window.TeachFlowTeacherAgentOrchestrator.answerTeacherAgentQuestion(question, agentState);
    }
    return window.TeachFlowDualAgentEngine.answerTeacherQuestion(question, agentState);
  };

  if (!canUseTeacherAgentApi()) return localAnswer();

  try {
    const response = await fetch("/api/ai/teacher-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });
    if (!response.ok) throw new Error(`Teacher AI API ${response.status}`);
    const result = await response.json();
    return result.answer || localAnswer();
  } catch (error) {
    return localAnswer();
  }
}

function applyTeacherAgentAction(actionType, button) {
  const payload = teacherAgentActionPayload(actionType, button?.dataset || {});
  if (!payload) return;
  const originalText = button?.textContent || "";
  if (button) {
    button.disabled = true;
    button.textContent = "处理中...";
  }

  postTeacherAgentAction(payload).then(() => {
    teacherAgentBriefing = null;
    teacherAgentAnswer = teacherAgentActionResultText(payload);
    if (payload.studentAlias) selectedMessageAlias = payload.studentAlias;
    setChannel("analysis");
  }).catch(() => {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
}

function teacherAgentActionPayload(actionType, dataset) {
  const agentState = currentTeacherAgentState();
  const alias = dataset.agentAlias || agentState.studentFocus?.[0]?.studentAlias || selectedMessageAlias;
  const messageDraft = (agentState.messageDrafts || []).find((item) => item.id === dataset.agentSourceId) || agentState.messageDrafts?.[0];
  const materialDraft = (agentState.materialDrafts || []).find((item) => item.id === dataset.agentSourceId) || agentState.materialDrafts?.[0];
  const focus = (agentState.studentFocus || []).find((item) => item.studentAlias === alias) || agentState.studentFocus?.[0];

  if (actionType !== "dismiss" && !alias) return null;

  if (actionType === "send_message") {
    if (!messageDraft) return null;
    return {
      type: "send_message",
      studentAlias: messageDraft.studentAlias || alias,
      title: `批准发送给 ${messageDraft.studentAlias || alias} 的支持消息`,
      text: messageDraft.text,
      detail: messageDraft.text,
      sourceId: messageDraft.id,
      sourceType: "message_draft"
    };
  }

  if (actionType === "assign_material") {
    if (!materialDraft || !alias) return null;
    return {
      type: "assign_material",
      studentAlias: alias,
      title: `布置材料：${materialDraft.title}`,
      detail: materialDraft.goal || materialDraft.title,
      sourceId: materialDraft.id,
      sourceType: "material_draft",
      material: {
        id: materialDraft.id,
        title: materialDraft.title,
        type: materialDraft.type,
        topic: materialDraft.topic,
        targetLevel: materialDraft.targetLevel,
        goal: materialDraft.goal
      }
    };
  }

  if (actionType === "schedule_followup") {
    if (!alias) return null;
    return {
      type: "schedule_followup",
      studentAlias: alias,
      title: `短跟进：${alias}`,
      detail: focus?.recommendedAction || "课前用一个低压力问题确认学生是否能继续推进。",
      dueLabel: "下一节课前 3 分钟",
      sourceId: focus?.studentAlias || alias,
      sourceType: "student_focus"
    };
  }

  return {
    type: "dismiss",
    studentAlias: alias || null,
    title: alias ? `标记 ${alias} 的建议已处理` : "标记建议已处理",
    detail: "老师已复核本条建议，本轮不再作为优先待办显示。",
    sourceId: dataset.agentSourceId || alias || "teacher-agent",
    sourceType: "teacher_agent_recommendation",
    studentVisible: false
  };
}

async function postTeacherAgentAction(payload) {
  if (!canUseTeacherAgentApi()) {
    return window.TeachFlowWorkspaceState.recordTeacherAgentAction({
      ...payload,
      context: TEACHER_CONTEXT
    });
  }

  try {
    const response = await fetch("/api/teacher-agent/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Teacher Agent API ${response.status}`);
    const state = await response.json();
    return window.TeachFlowWorkspaceState.setState(state);
  } catch (error) {
    return window.TeachFlowWorkspaceState.recordTeacherAgentAction({
      ...payload,
      context: TEACHER_CONTEXT
    });
  }
}

function teacherAgentActionResultText(payload) {
  if (payload.type === "send_message") return `已由老师批准并发送给 ${payload.studentAlias}，学生端消息中心会收到这条支持消息。`;
  if (payload.type === "assign_material") return `已把「${payload.material?.title || payload.title}」布置给 ${payload.studentAlias}，学生端学习材料会显示。`;
  if (payload.type === "schedule_followup") return `已为 ${payload.studentAlias} 安排短跟进，记录会进入老师和学生端学习记录。`;
  return payload.studentAlias ? `已把 ${payload.studentAlias} 的本轮建议标记为已处理。` : "已标记本轮建议为已处理。";
}

function ensureTeacherDetailModal() {
  if (document.getElementById("teacher-detail-modal")) return;

  const modal = document.createElement("section");
  modal.id = "teacher-detail-modal";
  modal.className = "teacher-detail-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="teacher-detail-backdrop" data-close-modal></div>
    <article class="teacher-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="teacher-detail-title">
      <button class="modal-close-button" type="button" data-close-modal aria-label="关闭详情">×</button>
      <div id="teacher-detail-content"></div>
    </article>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-modal]")) closeTeacherDetailModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTeacherDetailModal();
  });
}

function openTeacherDetailModal(type, detailId) {
  const modal = document.getElementById("teacher-detail-modal") || null;
  if (!modal) return;

  const content = modal.querySelector("#teacher-detail-content");
  content.innerHTML = teacherDetailContent(type, detailId);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("has-open-teacher-modal");

  modal.querySelectorAll("[data-jump-channel]").forEach((button) => {
    button.addEventListener("click", () => {
      closeTeacherDetailModal();
      setChannel(button.dataset.jumpChannel);
    });
  });
}

function closeTeacherDetailModal() {
  const modal = document.getElementById("teacher-detail-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("has-open-teacher-modal");
}

function metric(label, value, note) {
  return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
}

function analysisBriefCard(type, title, value, detail, action, tone) {
  const toneClass = tone ? ` ${tone}` : "";
  return `
    <button class="analysis-brief-card${toneClass}" type="button" data-detail-type="${escapeAttr(type)}">
      <span class="status-pill${tone === "hot" ? " hot" : tone === "warn" ? " warn" : ""}">${escapeHtml(value)}</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(detail)}</p>
      <em>${escapeHtml(action)}</em>
    </button>
  `;
}

function timeline(time, title, detail) {
  return `<li><strong>${time} · ${title}</strong><span>${detail}</span></li>`;
}

function task(title, detail) {
  return `<li><strong>${title}</strong><span>${detail}</span></li>`;
}

function evidence(alias, quote) {
  return `<li><strong>${alias}</strong><span>${quote}</span></li>`;
}

function materialType(icon, title, detail, status) {
  return `
    <button class="material-type-card" type="button">
      <span>${icon}</span>
      <strong>${title}</strong>
      <p>${detail}</p>
      <em class="status-pill">${status}</em>
    </button>
  `;
}

function materialReview(type, title, detail) {
  return `<li><strong>${type} · ${title}</strong><span>${detail}</span></li>`;
}

function currentTeacherAgentState() {
  if (teacherAgentBriefing) return teacherAgentBriefing;
  const workspace = window.TeachFlowWorkspaceState.getState();
  const scopedWorkspace = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
  if (window.TeachFlowTeacherAgentOrchestrator?.buildTeacherBriefing) {
    return window.TeachFlowTeacherAgentOrchestrator.buildTeacherBriefing(scopedWorkspace, { context: TEACHER_CONTEXT });
  }
  return window.TeachFlowDualAgentEngine.buildTeacherAgentState({
    className: scopedWorkspace.className,
    topic: scopedWorkspace.topic,
    students: studentRoster,
    approvedMaterials: scopedWorkspace.approvedMaterials,
    draftMaterials: scopedWorkspace.draftMaterials
  });
}

function analysisMetricCards() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  const agentState = currentTeacherAgentState();
  const needsSupport = studentRoster.filter((student) => student.status === "需要支持").length;
  const questionCount = workspace.questions.length;
  return [
    metric("主要误解", agentState.insight.mainNeed, "来自学生证据"),
    metric("需干预学生", `${needsSupport} 人`, "实时同步学生状态"),
    metric("学生卡点信号", `${workspace.stuckSignals.length} 条`, latestSignalNote(workspace)),
    metric("学生提问记录", `${questionCount} 条`, "来自学生 Agent")
  ].join("");
}

function workspaceSyncPanel() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  const boundary = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT).accessBoundary;
  const signals = workspace.stuckSignals.slice(0, 3);
  return `
    <section class="panel workspace-sync-panel">
      <div class="panel-header">
        <div><p class="mini-label">实时数据层</p><h3>学生端同步到老师端教学分析</h3></div>
        <span class="status-pill">${workspace.updatedAt ? "已连接" : "等待学生信号"}</span>
      </div>
      <div class="workspace-sync-grid">
        <article>
          <span>共享状态</span>
          <strong>${escapeHtml(workspace.className)} · ${escapeHtml(workspace.topic)}</strong>
          <p>学生端作业、提问、卡点会写入同一份匿名 workspace。</p>
        </article>
        <article>
          <span>访问边界</span>
          <strong>${escapeHtml(boundary.className)} · 老师视图</strong>
          <p>${escapeHtml(boundary.visibleData)}</p>
        </article>
        <article>
          <span>最新学生卡点</span>
          <strong>${signals[0] ? `${escapeHtml(signals[0].studentAlias)} · ${escapeHtml(signals[0].stuckType)}` : "暂无新信号"}</strong>
          <p>${signals[0]?.note ? escapeHtml(signals[0].note) : "学生点击“发送给老师”后，这里会立即出现。"}</p>
        </article>
      </div>
      <ul class="sync-signal-list">
        ${signals.length ? signals.map((signal) => `
          <li><strong>${escapeHtml(signal.studentAlias)} · ${escapeHtml(signal.stuckType)}</strong><span>${signal.note ? escapeHtml(signal.note) : "无补充说明"} · 已进入老师 Agent</span></li>
        `).join("") : "<li><strong>等待同步</strong><span>学生端还没有发送新的卡点信号。</span></li>"}
      </ul>
    </section>
  `;
}

function teacherMessagesChannel() {
  const helpRequests = teacherHelpRequests();
  const activeStudent = studentRoster.find((student) => student.id === selectedMessageAlias) || studentRoster[0];
  selectedMessageAlias = activeStudent?.id || selectedMessageAlias;
  return `
    <section class="teams-layout">
      <aside class="panel teams-thread-list-panel">
        <div class="panel-header">
          <div><p class="mini-label">Activity</p><h3>需要帮助</h3></div>
          <span class="status-pill warn">${helpRequests.length} 条</span>
        </div>
        <div class="teams-help-stack">
          ${helpRequests.length ? helpRequests.slice(0, 4).map(teacherHelpRequestCard).join("") : `
            <article class="teams-empty-card"><strong>暂无新求助</strong><span>学生发送卡点或共享学习摘要后，会出现在这里。</span></article>
          `}
        </div>

        <div class="teams-thread-heading">
          <p class="mini-label">Chat</p>
          <strong>学生线程</strong>
        </div>
        <div class="teams-thread-list">
          ${studentRoster.map(teacherThreadButton).join("")}
        </div>
      </aside>

      <div class="panel teams-chat-panel">
        ${teacherConversationPanel(selectedMessageAlias)}
      </div>
    </section>
  `;
}

function teacherConversationPanel(alias) {
  const student = studentRoster.find((item) => item.id === alias) || studentRoster[0];
  const messages = messagesForAlias(student.id);
  return `
    <div class="teams-chat-header">
      <div class="student-avatar-circle">${escapeHtml(student.short || student.id.slice(-2))}</div>
      <div>
        <p class="mini-label">师生对话记录</p>
        <h3>${escapeHtml(student.id)} · ${escapeHtml(student.status)}</h3>
        <span>${escapeHtml(student.stuck)} · ${escapeHtml(student.next)}</span>
      </div>
      <button class="secondary-button" type="button" data-detail-type="student" data-student-id="${escapeAttr(student.id)}">查看画像</button>
    </div>

    <div class="teams-message-thread" aria-live="polite">
      ${messages.length ? messages.map(teacherMessageBubble).join("") : `
        <article class="teams-empty-card"><strong>还没有对话</strong><span>老师可以先发送一个低压力支持任务，学生端会收到消息弹窗。</span></article>
      `}
    </div>

    <form id="teacher-message-form" class="teams-message-form">
      <textarea id="teacher-message-input" placeholder="给 ${escapeAttr(student.id)} 发送消息，例如：先看 Level 1 图示，再只回答第 1 题。"></textarea>
      <button class="primary-button" type="submit">发送给学生</button>
    </form>
  `;
}

function teacherThreadButton(student) {
  const messages = messagesForAlias(student.id);
  const latest = messages[messages.length - 1];
  const helpCount = teacherHelpRequests().filter((item) => item.studentAlias === student.id).length;
  const isActive = student.id === selectedMessageAlias ? " active" : "";
  return `
    <button class="teams-thread-button${isActive}" type="button" data-message-alias="${escapeAttr(student.id)}">
      <span class="student-avatar-circle">${escapeHtml(student.short || student.id.slice(-2))}</span>
      <span>
        <strong>${escapeHtml(student.id)}</strong>
        <small>${latest ? escapeHtml(latest.text) : escapeHtml(student.next)}</small>
      </span>
      ${helpCount ? `<em>${helpCount}</em>` : ""}
    </button>
  `;
}

function teacherHelpRequestCard(item) {
  return `
    <button class="teams-help-card" type="button" data-open-message="${escapeAttr(item.studentAlias)}">
      <span class="student-avatar-circle">${escapeHtml(item.studentAlias.slice(-2))}</span>
      <div>
        <strong>${escapeHtml(item.studentAlias)} · ${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.detail)}</p>
        <small>${formatMessageTime(item.createdAt)}</small>
      </div>
    </button>
  `;
}

function teacherMessageBubble(message) {
  const roleClass = message.senderRole === "teacher" ? "from-teacher" : message.senderRole === "system" ? "from-system" : "from-student";
  return `
    <article class="teams-message ${roleClass}">
      <span>${escapeHtml(message.senderLabel || roleLabel(message.senderRole))} · ${formatMessageTime(message.createdAt)}</span>
      <p>${escapeHtml(message.text)}</p>
    </article>
  `;
}

function messagesForAlias(alias) {
  const workspace = window.TeachFlowWorkspaceState.getState();
  return (workspace.messages || [])
    .filter((message) => message.studentAlias === alias)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

function teacherHelpRequests() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  const signals = (workspace.stuckSignals || []).map((signal) => ({
    id: signal.id,
    studentAlias: signal.studentAlias,
    title: signal.stuckType || "学习卡点",
    detail: signal.note || "学生请求老师提供下一步支持。",
    createdAt: signal.createdAt,
    source: "stuck"
  }));
  const checkIns = (workspace.checkIns || [])
    .filter((item) => item.teacherVisible !== false)
    .map((item) => ({
      id: item.id,
      studentAlias: item.studentAlias,
      title: item.wellbeingLabel || item.stateLabel || "学习支持",
      detail: item.teacherHelpDraft || item.summaryForTeacher || "学生分享了学习摘要。",
      createdAt: item.createdAt,
      source: "checkin"
    }));
  return [...signals, ...checkIns]
    .filter((item) => studentRoster.some((student) => student.id === item.studentAlias))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function latestTeacherMessages() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  return (workspace.messages || [])
    .filter((message) => studentRoster.some((student) => student.id === message.studentAlias))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 3);
}

function sendTeacherMessage() {
  const input = document.getElementById("teacher-message-input");
  const text = input?.value.trim();
  if (!text) return;
  postTeacherMessage(selectedMessageAlias, text).then(() => {
    if (input) input.value = "";
    setChannel("messages");
  });
  return;
  window.TeachFlowWorkspaceState.recordMessage(selectedMessageAlias, {
    text,
    senderRole: "teacher",
    senderId: TEACHER_CONTEXT.userId,
    senderLabel: "老师",
    kind: "teacher_reply",
    context: TEACHER_CONTEXT
  });
  if (input) input.value = "";
  setChannel("messages");
}

async function postTeacherMessage(alias, text) {
  const payload = {
    studentAlias: alias,
    text,
    kind: "teacher_reply"
  };

  if (!canUseWorkspaceApi()) {
    return window.TeachFlowWorkspaceState.recordMessage(alias, {
      ...payload,
      senderRole: "teacher",
      senderId: TEACHER_CONTEXT.userId,
      senderLabel: "Teacher",
      context: TEACHER_CONTEXT
    });
  }

  try {
    const response = await fetch("/api/workspace/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Workspace API ${response.status}`);
    const state = await response.json();
    return window.TeachFlowWorkspaceState.setState(state);
  } catch (error) {
    return window.TeachFlowWorkspaceState.recordMessage(alias, {
      ...payload,
      senderRole: "teacher",
      senderId: TEACHER_CONTEXT.userId,
      senderLabel: "Teacher",
      context: TEACHER_CONTEXT
    });
  }
}

function canUseWorkspaceApi() {
  return Boolean(
    typeof window !== "undefined" &&
    window.fetch &&
    window.location &&
    /^https?:$/.test(window.location.protocol)
  );
}

function ensureTeacherActivityDock() {
  if (document.getElementById("teacher-activity-dock")) return;
  const dock = document.createElement("aside");
  dock.id = "teacher-activity-dock";
  dock.className = "teams-activity-dock";
  dock.setAttribute("aria-live", "polite");
  document.body.appendChild(dock);
}

function renderTeacherActivityDock() {
  const dock = document.getElementById("teacher-activity-dock");
  if (!dock) return;
  dock.classList.toggle("is-hidden-in-chat", activeTeacherChannelId === "messages");
  dock.classList.toggle("is-minimized", teacherActivityDockMinimized);
  const helpRequests = teacherHelpRequests().slice(0, 3);
  const latestMessages = latestTeacherMessages();
  const totalCount = helpRequests.length + latestMessages.length;
  if (teacherActivityDockMinimized) {
    dock.innerHTML = `
      <button class="teams-dock-minimized-button" type="button" data-dock-minimize="false" aria-label="展开学生帮助提醒">
        <span>学生需要帮助</span>
        <strong>${totalCount}</strong>
      </button>
    `;
    bindTeacherActivityDockControls(dock);
    return;
  }
  dock.innerHTML = `
    <div class="teams-dock-header">
      <div><p class="mini-label">Activity</p><strong>学生需要帮助</strong></div>
      <div class="teams-dock-actions">
        <button class="plain-button" type="button" data-dock-minimize="true">最小化</button>
        <div class="teams-dock-scale-control" aria-label="提醒框缩放">
          ${dockScaleButton("small", "小")}
          ${dockScaleButton("medium", "中")}
          ${dockScaleButton("large", "大")}
        </div>
        <button class="plain-button" type="button" data-open-message="${escapeAttr(helpRequests[0]?.studentAlias || selectedMessageAlias)}">打开</button>
      </div>
    </div>
    <div class="teams-dock-list">
      ${helpRequests.length ? helpRequests.map(teacherDockHelpItem).join("") : `<article><strong>暂无新帮助请求</strong><span>卡点会实时同步到这里。</span></article>`}
      ${latestMessages.map(teacherDockMessageItem).join("")}
    </div>
  `;
  bindTeacherActivityDockControls(dock);
}

function bindTeacherActivityDockControls(dock) {
  dock.querySelectorAll("[data-open-message]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMessageAlias = button.dataset.openMessage || selectedMessageAlias;
      setChannel("messages");
    });
  });
  dock.querySelectorAll("[data-dock-minimize]").forEach((button) => {
    button.addEventListener("click", () => {
      teacherActivityDockMinimized = button.dataset.dockMinimize === "true";
      rememberTeacherActivityDockMinimized(teacherActivityDockMinimized);
      renderTeacherActivityDock();
    });
  });
  dock.querySelectorAll("[data-dock-scale]").forEach((button) => {
    button.addEventListener("click", () => {
      teacherActivityDockScale = normalizeDockScale(button.dataset.dockScale);
      rememberTeacherActivityDockScale(teacherActivityDockScale);
      renderTeacherActivityDock();
    });
  });
}

function dockScaleButton(scale, label) {
  const isActive = teacherActivityDockScale === scale ? " active" : "";
  return `
    <button class="dock-scale-button${isActive}" type="button" data-dock-scale="${scale}" aria-label="切换为${label}号提醒框">
      ${label}
    </button>
  `;
}

function applyTeacherActivityDockScale(dock) {
  dock.classList.remove("dock-scale-small", "dock-scale-medium", "dock-scale-large");
  dock.classList.add(`dock-scale-${normalizeDockScale(teacherActivityDockScale)}`);
}

function normalizeDockScale(scale) {
  return ["small", "medium", "large"].includes(scale) ? scale : "medium";
}

function readTeacherActivityDockScale() {
  try {
    return normalizeDockScale(window.localStorage?.getItem("teachflow.teacherActivityDockScale"));
  } catch (error) {
    return "medium";
  }
}

function rememberTeacherActivityDockScale(scale) {
  try {
    window.localStorage?.setItem("teachflow.teacherActivityDockScale", normalizeDockScale(scale));
  } catch (error) {
    // Ignore storage failures; scaling still works for the current page.
  }
}

function readTeacherActivityDockMinimized() {
  try {
    return window.localStorage?.getItem("teachflow.teacherActivityDockMinimized") === "true";
  } catch (error) {
    return false;
  }
}

function rememberTeacherActivityDockMinimized(isMinimized) {
  try {
    window.localStorage?.setItem("teachflow.teacherActivityDockMinimized", isMinimized ? "true" : "false");
  } catch (error) {
    // Ignore storage failures; minimization still works for the current page.
  }
}

function teacherDockHelpItem(item) {
  return `
    <button type="button" data-open-message="${escapeAttr(item.studentAlias)}">
      <strong>${escapeHtml(item.studentAlias)} 请求帮助</strong>
      <span>${escapeHtml(item.title)} · ${escapeHtml(item.detail)}</span>
    </button>
  `;
}

function teacherDockMessageItem(message) {
  const label = message.senderRole === "teacher" ? "老师已回复" : "学生消息";
  return `
    <button type="button" data-open-message="${escapeAttr(message.studentAlias)}">
      <strong>${escapeHtml(message.studentAlias)} · ${label}</strong>
      <span>${escapeHtml(message.text)}</span>
    </button>
  `;
}

function roleBoundaryPanel() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
  const teacherAccount = workspace.accounts.find((account) => account.id === TEACHER_CONTEXT.userId);
  const classScope = workspace.classes.find((item) => item.id === TEACHER_CONTEXT.classId);
  return `
    <section class="panel workspace-sync-panel">
      <div class="panel-header">
        <div><p class="mini-label">账号 / 角色 / 班级边界</p><h3>当前老师端访问范围</h3></div>
        <span class="status-pill">边界已启用</span>
      </div>
      <div class="workspace-sync-grid">
        <article>
          <span>账号</span>
          <strong>${teacherAccount?.displayName || TEACHER_CONTEXT.userId}</strong>
          <p>${TEACHER_CONTEXT.userId} · ${TEACHER_CONTEXT.role}</p>
        </article>
        <article>
          <span>班级</span>
          <strong>${classScope?.name || scoped.className}</strong>
          <p>只能读取这个班级的匿名学生、卡点和作业状态。</p>
        </article>
        <article>
          <span>权限</span>
          <strong>${scoped.accessBoundary.canApprove ? "可审批发布" : "只读"}</strong>
          <p>${scoped.accessBoundary.visibleData}</p>
        </article>
      </div>
    </section>
  `;
}

function auditLogPanel() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
  const events = (scoped.auditEvents || []).slice(0, 12);
  const summary = auditSummary(events);
  return `
    <section class="audit-dashboard">
      <div class="panel-header audit-header">
        <div><p class="mini-label">安全审计</p><h3>谁在什么时间做了什么</h3></div>
        <span class="status-pill">本班级可见</span>
      </div>
      <div class="audit-metric-grid">
        ${auditMetric("学生提交", summary.studentSubmissions, "作业、提问、卡点")}
        ${auditMetric("被拦截请求", summary.denied, "越权或未登录")}
        ${auditMetric("登录记录", summary.sessions, "本地试用 Session")}
        ${auditMetric("最近操作", summary.latestLabel, summary.latestTime)}
      </div>
      <div class="panel audit-table-panel">
        <div class="panel-header">
          <div><p class="mini-label">最近审计事件</p><h3>只记录匿名别名、角色和班级边界</h3></div>
          <span class="status-pill warn">不含真实学生身份</span>
        </div>
        <div class="audit-table-wrap">
          <table class="audit-table">
            <thead>
              <tr><th>时间</th><th>角色</th><th>账号 / Alias</th><th>动作</th><th>目标</th><th>结果</th></tr>
            </thead>
            <tbody>
              ${events.length ? events.map(auditRow).join("") : auditEmptyRow()}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function auditMetric(label, value, note) {
  return `<article class="audit-metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}

function auditSummary(events) {
  const studentSubmissions = events.filter((event) => {
    return ["record_question", "record_stuck_signal", "update_assignment"].includes(event.action);
  }).length;
  const denied = events.filter((event) => event.action === "access_denied").length;
  const sessions = events.filter((event) => /^session_/.test(event.action)).length;
  const latest = events[0];
  return {
    studentSubmissions,
    denied,
    sessions,
    latestLabel: latest ? actionLabel(latest.action) : "暂无",
    latestTime: latest ? formatAuditTime(latest.timestamp) : "等待操作"
  };
}

function auditRow(event) {
  const resultClass = event.action === "access_denied" ? "hot" : "ok";
  const resultLabel = event.action === "access_denied" ? "已拦截" : "已记录";
  return `
    <tr>
      <td>${formatAuditTime(event.timestamp)}</td>
      <td>${roleLabel(event.role)}</td>
      <td>${escapeHtml(event.studentAlias || event.actorId || "system")}</td>
      <td>${actionLabel(event.action)}</td>
      <td>${escapeHtml(event.targetId || event.targetType || "workspace")}</td>
      <td><span class="status-pill ${resultClass === "hot" ? "hot" : ""}">${resultLabel}</span></td>
    </tr>
  `;
}

function auditEmptyRow() {
  return `<tr><td colspan="6">暂无审计事件。登录、提交、卡点和越权拦截会出现在这里。</td></tr>`;
}

function actionLabel(action) {
  const labels = {
    session_login: "登录",
    session_logout: "登出",
    reset_workspace: "重置工作区",
    write_workspace: "写入工作区",
    update_assignment: "更新作业",
    record_question: "学生提问",
    record_stuck_signal: "发送卡点",
    record_check_in: "学习关怀 Check-in",
    record_message: "师生消息",
    access_denied: "越权拦截"
  };
  return labels[action] || action;
}

function roleLabel(role) {
  const labels = {
    teacher: "老师",
    student: "学生",
    school_admin: "学校管理",
    anonymous: "未登录",
    system: "系统"
  };
  return labels[role] || role || "系统";
}

function formatAuditTime(value) {
  if (!value) return "未知时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatMessageTime(value) {
  return formatAuditTime(value);
}

function priorityStudents() {
  const ordered = [...studentRoster].sort((a, b) => scoreStudent(b) - scoreStudent(a));
  return ordered.slice(0, 3);
}

function scoreStudent(student) {
  let score = 0;
  if (student.status === "需要支持") score += 4;
  if (student.level === "Level 1") score += 2;
  if (/图示|公式|定义/.test(student.stuck)) score += 1;
  if (student.id === "S002") score += 0.5;
  return score;
}

function latestSignalNote(workspace) {
  const latest = workspace.stuckSignals[0];
  return latest ? `${latest.studentAlias}：${latest.stuckType}` : "等待学生端";
}

function latestSharedCheckIn(alias) {
  const workspace = window.TeachFlowWorkspaceState.getState();
  return (workspace.checkIns || [])
    .filter((item) => item.studentAlias === alias && item.teacherVisible !== false)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null;
}

function sharedCheckIns() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  return (workspace.checkIns || [])
    .filter((item) => item.teacherVisible !== false)
    .sort((a, b) => {
      const levelDiff = (b.wellbeingLevel || 0) - (a.wellbeingLevel || 0);
      if (levelDiff) return levelDiff;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
}

function teacherSupportInbox() {
  const items = sharedCheckIns().slice(0, 4);
  return `
    <section class="panel teacher-inbox-panel">
      <div class="panel-header">
        <div><p class="mini-label">Teacher Inbox</p><h3>需要老师优先关注的学习支持信号</h3></div>
        <span class="status-pill warn">不显示完整私密对话</span>
      </div>
      <div class="teacher-inbox-list">
        ${items.length ? items.map(teacherInboxCard).join("") : supportEmptyState()}
      </div>
      <div class="teacher-support-boundary">
        TeachFlow 默认不展示学生完整私密对话。情绪信号不是心理诊断，只是临时学习支持指标；如涉及安全风险，应按学校 safeguarding 流程交给指定真人。
      </div>
    </section>
  `;
}

function teacherInboxCard(item) {
  return `
    <button class="teacher-inbox-card" type="button" data-detail-type="student" data-student-id="${escapeAttr(item.studentAlias)}">
      <span class="student-avatar-circle">${escapeHtml(item.studentAlias.slice(-2))}</span>
      <div>
        <strong>${escapeHtml(item.studentAlias)} · ${escapeHtml(item.wellbeingLabel || "学习支持信号")}</strong>
        <p>${escapeHtml(item.summaryForTeacher || "学生分享了学习支持摘要。")}</p>
        <em>${escapeHtml(item.recommendedTeacherAction || "给一个低压力下一步。")}</em>
      </div>
    </button>
  `;
}

function supportEmptyState() {
  return `
    <article class="support-empty-state">
      <strong>暂无新的学习关怀分享</strong>
      <span>学生在学习关怀频道选择“分享学习摘要给老师”后，这里会出现可行动的支持信号。</span>
    </article>
  `;
}

function teacherDetailContent(type, detailId) {
  if (type === "outcome") return outcomeDetailContent();
  if (type === "intervention") return interventionDetailContent();
  if (type === "student") return studentDetailContent(detailId || selectedStudentId);
  return diagnosisDetailContent(detailId);
}

function diagnosisDetailContent(detailId) {
  const focus = detailId || "diagram";
  const rows = [
    ["图示转换看不懂", "72%", "S014", "频率图和原来的波形之间关系看不出来。"],
    ["公式会背但不懂含义", "58%", "S009", "我记得方程，但不知道它到底表示什么。"],
    ["例题能跟但不能迁移", "36%", "S021", "换一个信号后，我不知道先看哪里。"]
  ];

  return `
    <header class="modal-title-block">
      <p class="mini-label">理解诊断详情</p>
      <h3 id="teacher-detail-title">误解地图与学生原句证据</h3>
      <span class="status-pill hot">老师复核后才进入干预</span>
    </header>
    <div class="modal-detail-grid">
      <section>
        <h4>班级误解分布</h4>
        <div class="progress-list">
          ${progress("只记公式，缺少概念意义", 68)}
          ${progress("知道频域，但不知道为什么有用", 44)}
          ${progress("能用音乐类比，但不能迁移", 31)}
        </div>
      </section>
      <section>
        <h4>证据表</h4>
        <ul class="modal-evidence-list">
          ${rows.map(([title, percent, alias, quote]) => `
            <li class="${focus && title.includes("图示") ? "active" : ""}">
              <strong>${title} · ${percent}</strong>
              <span>${alias}: ${quote}</span>
            </li>
          `).join("")}
        </ul>
      </section>
    </div>
    <article class="modal-note-box">
      <strong>老师下一步</strong>
      <p>先确认这些原句是否真的代表理解问题，再决定是否发布 Level 1 图示讲解和 Level 2 桥接练习。</p>
    </article>
  `;
}

function interventionDetailContent() {
  return `
    <header class="modal-title-block">
      <p class="mini-label">分层干预详情</p>
      <h3 id="teacher-detail-title">从误解直接生成可编辑教学安排</h3>
      <span class="status-pill warn">草稿，不自动发布</span>
    </header>
    <div class="intervention-lane-grid modal-lane-grid">
      ${interventionLane("Level 1", "重新建立直觉", "先用图示拆解“同一个信号的另一种表示”。", "S009、S014")}
      ${interventionLane("Level 2", "概念桥接练习", "让学生判断类比哪里准确、哪里不准确。", "S002、S021、S031")}
      ${interventionLane("Level 3", "应用挑战", "选择音乐、医学成像或地震信号做迁移解释。", "S004、S018")}
    </div>
    <div class="modal-detail-grid">
      <section>
        <h4>材料草稿</h4>
        <ul class="material-review-list">
          ${materialReview("图片", "时域与频域对应图", "用于降低图示转换门槛。")}
          ${materialReview("讲义", "学生版 5 分钟讲义", "先讲直觉，再补公式含义。")}
          ${materialReview("小测", "3 道图示对应题", "检查是否能从图回到概念。")}
        </ul>
      </section>
      <section>
        <h4>老师控制</h4>
        <ul class="task-list">
          ${task("可编辑", "老师可以改每一层材料的语言、例子和题目。")}
          ${task("需审批", "干预不会直接发给学生，必须先进入审批导出。")}
          ${task("可追踪", "发布后继续进入下一轮教学分析。")}
        </ul>
      </section>
    </div>
    <div class="action-row modal-actions">
      <button class="secondary-button" type="button" data-jump-channel="creation">去制作材料</button>
      <button class="primary-button" type="button" data-jump-channel="approval">送去审批导出</button>
    </div>
  `;
}

function studentDetailContent(alias) {
  const student = studentRoster.find((item) => item.id === alias) || selectedStudent();
  selectedStudentId = student.id;
  return `
    <header class="modal-title-block">
      <p class="mini-label">学生跟进详情</p>
      <h3 id="teacher-detail-title">${escapeHtml(student.id)} 的学习支持画像</h3>
      <span class="status-pill">学习摘要，不是心理诊断</span>
    </header>
    ${studentProfile(student)}
  `;
}

function analysisOutcomeSummaryPanel() {
  const outcome = currentTeacherAgentState().outcomeEvaluation || {};
  const metrics = outcome.metrics || {};
  const statusLabel = metrics.actionCount ? `${metrics.actionCount} 个老师动作` : "等待老师动作";
  const summary = outcome.summary ||
    "等待后续信号：老师批准消息、材料或短跟进后，这里会比较学生后续提问、卡点、提交和 Check-in。";
  const nextAction = (outcome.nextTeacherActions || [])[0];
  const nextText = nextAction
    ? `${nextAction.studentAlias}: ${nextAction.detail || nextAction.recommendation || "等待学生后续学习信号。"}`
    : "先批准一个老师动作，再等待学生端出现新的学习信号。";

  return `
    <section class="panel analysis-outcome-summary">
      <div class="panel-header">
        <div>
          <p class="mini-label">成效回流</p>
          <h3>老师动作后的学生新信号</h3>
        </div>
        <span class="status-pill">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="outcome-summary-layout">
        <div class="outcome-summary-copy">
          <p>${escapeHtml(summary)}</p>
          <strong>${escapeHtml(nextText)}</strong>
        </div>
        <div class="outcome-summary-metrics">
          ${agentOutcomeMetric("已改善", metrics.improvedCount || 0)}
          ${agentOutcomeMetric("仍需跟进", metrics.needsFollowupCount || 0)}
          ${agentOutcomeMetric("继续观察", metrics.monitoringCount || 0)}
          ${agentOutcomeMetric("等待信号", metrics.waitingSignalCount || 0)}
        </div>
      </div>
      <div class="action-row">
        <button class="secondary-button" type="button" data-detail-type="outcome">查看详细回流</button>
      </div>
    </section>
  `;
}

function outcomeDetailContent() {
  const outcome = currentTeacherAgentState().outcomeEvaluation || {};
  const metrics = outcome.metrics || {};
  const evaluations = outcome.evaluations || [];
  return `
    <header class="modal-title-block">
      <p class="mini-label">成效回流详情</p>
      <h3 id="teacher-detail-title">老师动作与后续学生信号</h3>
      <span class="status-pill">${escapeHtml(metrics.actionCount ? `${metrics.actionCount} 个动作已纳入复盘` : "等待后续信号")}</span>
    </header>
    <div class="agent-outcome-grid modal-outcome-grid">
      ${agentOutcomeMetric("已改善", metrics.improvedCount || 0)}
      ${agentOutcomeMetric("仍需跟进", metrics.needsFollowupCount || 0)}
      ${agentOutcomeMetric("继续观察", metrics.monitoringCount || 0)}
      ${agentOutcomeMetric("等待信号", metrics.waitingSignalCount || 0)}
    </div>
    <article class="modal-note-box">
      <strong>系统判断边界</strong>
      <p>${escapeHtml(outcome.summary || "现在还没有老师动作后的学生新信号，所以系统只显示等待，不会提前判断干预是否有效。")}</p>
    </article>
    <div class="agent-outcome-list modal-outcome-list">
      ${evaluations.length ? evaluations.map(agentOutcomeItem).join("") : `
        <article>
          <strong>等待后续信号</strong>
          <span>老师批准消息、材料或短跟进后，系统会把之后的学生提问、卡点、提交和 Check-in 与动作时间线对齐。</span>
        </article>
      `}
    </div>
  `;
}

function teacherAgentPanel() {
  const agentState = currentTeacherAgentState();
  const answer = teacherAgentAnswer || window.TeachFlowDualAgentEngine.answerTeacherQuestion(teacherAgentQuestion, agentState);

  return `
    <section class="teacher-agent-console">
      <div class="panel teacher-agent-main">
        <div class="panel-header">
          <div><p class="mini-label">老师 Agent</p><h3>AI 教学分析助手</h3></div>
          <span class="status-pill">${teacherAgentBriefingSource === "api" ? "总 API 已连接" : "本地总控预览"}</span>
        </div>
        <p class="agent-summary">${agentState.summary}</p>
        <div class="agent-insight-grid">
          ${agentInsight("主要卡点", agentState.insight.mainNeed)}
          ${agentInsight("需支持学生", `${agentState.insight.urgentCount} 人`)}
          ${agentInsight("原句证据", `${agentState.insight.evidenceCount} 条`)}
          ${agentInsight("Level 1", `${agentState.insight.levelOneCount} 人`)}
        </div>
        <div class="agent-source-strip">
          ${(agentState.sourceSignals || []).map(agentSourceChip).join("")}
        </div>
        ${teacherOutcomePanel(agentState)}
        <form id="teacher-agent-form" class="agent-question-form">
          <textarea id="teacher-agent-input" placeholder="问老师 Agent，例如：这节课先处理什么？哪些学生要优先看？">${escapeAttr(teacherAgentQuestion)}</textarea>
          <button class="primary-button" type="submit">问老师 Agent</button>
        </form>
        <article class="agent-answer-box">
          <span>Agent 回答</span>
          <p>${escapeHtml(answer)}</p>
        </article>
      </div>

      <aside class="panel teacher-agent-side">
        <div class="panel-header">
          <div><p class="mini-label">行动队列</p><h3>建议，但不自动发布</h3></div>
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
        <div class="agent-guardrail-box">
          <p class="mini-label">边界</p>
          <ul>
            ${agentState.guardrails.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      </aside>
    </section>
  `;
}

function teacherOutcomePanel(agentState) {
  const outcome = agentState.outcomeEvaluation || {};
  const metrics = outcome.metrics || {};
  const evaluations = outcome.evaluations || [];
  return `
    <section class="agent-outcome-panel">
      <div class="agent-outcome-header">
        <div><p class="mini-label">成效回流</p><strong>老师动作后的学生信号</strong></div>
        <span class="status-pill">${metrics.actionCount ? `${metrics.actionCount} 个动作` : "等待动作"}</span>
      </div>
      <p>${escapeHtml(outcome.summary || "还没有可复盘的老师动作。")}</p>
      <div class="agent-outcome-grid">
        ${agentOutcomeMetric("已改善", metrics.improvedCount || 0)}
        ${agentOutcomeMetric("仍需跟进", metrics.needsFollowupCount || 0)}
        ${agentOutcomeMetric("继续观察", metrics.monitoringCount || 0)}
        ${agentOutcomeMetric("等待信号", metrics.waitingSignalCount || 0)}
      </div>
      <div class="agent-outcome-list">
        ${evaluations.length ? evaluations.slice(0, 3).map(agentOutcomeItem).join("") : `
          <article>
            <strong>暂无成效记录</strong>
            <span>老师批准消息、材料或短跟进后，这里会比较学生后续提问、卡点、提交和 Check-in。</span>
          </article>
        `}
      </div>
    </section>
  `;
}

function agentOutcomeMetric(label, value) {
  return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function agentOutcomeItem(item) {
  const statusClass = item.status === "needs_followup" ? " warn" : item.status === "improved" ? " ok" : "";
  return `
    <article class="agent-outcome-item${statusClass}">
      <div>
        <strong>${escapeHtml(item.studentAlias)} · ${escapeHtml(item.statusLabel)}</strong>
        <span>${escapeHtml(item.summary)}</span>
      </div>
      ${agentOutcomeTimeline(item)}
      <em>${escapeHtml(item.recommendation)}</em>
    </article>
  `;
}

function agentOutcomeTimeline(item) {
  const evidenceItems = (item.evidence || []).slice(0, 3);
  const studentState = teacherActionStudentState(item);
  return `
    <ul class="agent-outcome-timeline">
      <li><strong>老师动作</strong><span>${escapeHtml(item.actionTitle || item.actionLabel)} · ${formatMessageTime(item.createdAt)}</span></li>
      <li><strong>阅读状态</strong><span>${escapeHtml(studentState)}</span></li>
      ${evidenceItems.length ? evidenceItems.map((evidence) => `
        <li>
          <strong>${escapeHtml(evidence.relation === "linked" ? "学生回应" : "后续信号")}</strong>
          <span>${escapeHtml(evidence.label)} · ${formatMessageTime(evidence.createdAt)} · ${escapeHtml(evidence.quote)}</span>
        </li>
      `).join("") : `
        <li><strong>学生回应</strong><span>等待学生提交、提问、回复或再次发送卡点。</span></li>
      `}
    </ul>
  `;
}

function teacherActionStudentState(item) {
  if (item.studentResponseAt) return `学生已回应：${teacherResponseTypeLabel(item.studentResponseType)}`;
  if (item.studentReadAt) return "学生已读，等待反馈";
  if (item.studentVisible === false) return "教师内部动作";
  return "学生未读";
}

function teacherResponseTypeLabel(type) {
  if (type === "improved") return "有帮助";
  if (type === "still_stuck") return "仍卡住";
  return "已同步";
}

function teacherAgentActionCards(agentState) {
  const topFocus = agentState.studentFocus?.[0] || null;
  const messageDraft = agentState.messageDrafts?.[0] || null;
  const materialDraft = agentState.materialDrafts?.[0] || null;
  const alias = messageDraft?.studentAlias || topFocus?.studentAlias || selectedMessageAlias;

  if (!topFocus && !messageDraft && !materialDraft) {
    return `
      <div class="agent-action-stack">
        <article class="agent-action-card muted">
          <span>行动建议</span>
          <strong>暂无需要老师批准的动作</strong>
          <p>继续等待学生提交作业、提问或分享卡点后，老师 Agent 会重新生成可执行建议。</p>
        </article>
      </div>
    `;
  }

  return `
    <div class="agent-action-stack">
      ${messageDraft ? `
        <article class="agent-action-card">
          <span>消息 · ${escapeHtml(messageDraft.studentAlias)}</span>
          <strong>批准并发送支持消息</strong>
          <p>${escapeHtml(messageDraft.text)}</p>
          <button class="primary-button" type="button" data-agent-action="send_message" data-agent-alias="${escapeAttr(messageDraft.studentAlias)}" data-agent-source-id="${escapeAttr(messageDraft.id)}">批准发送</button>
        </article>
      ` : ""}
      ${materialDraft && alias ? `
        <article class="agent-action-card">
          <span>材料 · ${escapeHtml(alias)}</span>
          <strong>${escapeHtml(materialDraft.title)}</strong>
          <p>${escapeHtml(materialDraft.goal || materialDraft.type)}</p>
          <button class="secondary-button" type="button" data-agent-action="assign_material" data-agent-alias="${escapeAttr(alias)}" data-agent-source-id="${escapeAttr(materialDraft.id)}">布置给学生</button>
        </article>
      ` : ""}
      ${topFocus ? `
        <article class="agent-action-card compact">
          <span>跟进 · ${escapeHtml(topFocus.studentAlias)}</span>
          <strong>${escapeHtml(topFocus.mainNeed)}</strong>
          <p>${escapeHtml(topFocus.recommendedAction)}</p>
          <div class="agent-action-row">
            <button class="secondary-button" type="button" data-agent-action="schedule_followup" data-agent-alias="${escapeAttr(topFocus.studentAlias)}" data-agent-source-id="${escapeAttr(topFocus.studentAlias)}">安排短跟进</button>
            <button class="plain-button" type="button" data-agent-action="dismiss" data-agent-alias="${escapeAttr(topFocus.studentAlias)}" data-agent-source-id="${escapeAttr(topFocus.studentAlias)}">标记已处理</button>
          </div>
        </article>
      ` : ""}
    </div>
  `;
}

function teacherAgentHistory(agentState) {
  const history = (agentState.actionHistory || currentTeacherAgentActions()).slice(0, 4);
  return `
    <div class="agent-history-box">
      <p class="mini-label">最近执行</p>
      ${history.length ? `
        <ul>
          ${history.map((item) => `
            <li>
              <strong>${escapeHtml(teacherAgentActionLabel(item.type))}${item.studentAlias ? ` · ${escapeHtml(item.studentAlias)}` : ""}</strong>
              <span>${escapeHtml(item.title || item.detail || "已记录老师动作")} · ${formatMessageTime(item.createdAt)}</span>
              <em class="teacher-action-read-state">${escapeHtml(teacherActionStudentState(item))}</em>
            </li>
          `).join("")}
        </ul>
      ` : "<p>还没有执行记录。老师批准动作后会出现在这里。</p>"}
    </div>
  `;
}

function currentTeacherAgentActions() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, TEACHER_CONTEXT);
  return (scoped.teacherAgentActions || [])
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function teacherAgentActionLabel(type) {
  if (type === "send_message") return "支持消息";
  if (type === "assign_material") return "学习材料";
  if (type === "schedule_followup") return "短跟进";
  if (type === "dismiss") return "已处理";
  return "老师动作";
}

function agentInsight(label, value) {
  return `<article><span>${label}</span><strong>${value}</strong></article>`;
}

function agentSourceChip(item) {
  return `<span><strong>${escapeHtml(item.count)}</strong>${escapeHtml(item.label)}</span>`;
}

function analysisStep(number, title, detail, status) {
  return `
    <article class="analysis-step">
      <span>${number}</span>
      <strong>${title}</strong>
      <p>${detail}</p>
      <em>${status}</em>
    </article>
  `;
}

function misconceptionCard(title, value, detail, alias) {
  return `
    <article class="misconception-card">
      <div class="progress-top"><strong>${title}</strong><span>${value}%</span></div>
      <div class="progress-bar"><span style="width: ${value}%"></span></div>
      <p>${detail}</p>
      <button class="plain-button" type="button" data-detail-type="diagnosis" data-detail-id="${escapeAttr(title)}">看 ${alias} 证据</button>
    </article>
  `;
}

function analysisAction(title, detail, action, targetChannel) {
  const actionAttribute = channels[targetChannel]
    ? `data-jump-channel="${escapeAttr(targetChannel)}"`
    : `data-detail-type="${escapeAttr(targetChannel)}"`;
  return `
    <article class="analysis-action">
      <div>
        <strong>${title}</strong>
        <p>${detail}</p>
      </div>
      <button class="secondary-button" type="button" ${actionAttribute}>${action}</button>
    </article>
  `;
}

function interventionLane(level, title, detail, students) {
  return `
    <article class="intervention-lane">
      <span class="status-pill">${level}</span>
      <strong>${title}</strong>
      <p>${detail}</p>
      <small>适用学生：${students}</small>
    </article>
  `;
}

function analysisStudent(student) {
  return `
    <button class="analysis-student-card" type="button" data-detail-type="student" data-student-id="${escapeAttr(student.id)}">
      <span class="student-avatar-circle">${escapeHtml(student.short)}</span>
      <div>
        <strong>${escapeHtml(student.id)} · ${escapeHtml(student.status)}</strong>
        <p>${escapeHtml(student.stuck)} · ${escapeHtml(student.next)}</p>
      </div>
    </button>
  `;
}

function selectedStudent() {
  return studentRoster.find((student) => student.id === selectedStudentId) || studentRoster[0];
}

function studentAvatar(student) {
  const isActive = student.id === selectedStudentId ? " active" : "";
  return `
    <button class="student-avatar-button${isActive}" type="button" data-student-id="${escapeAttr(student.id)}">
      <span class="student-avatar-circle">${escapeHtml(student.short)}</span>
      <strong>${escapeHtml(student.id)}</strong>
      <small>${escapeHtml(student.status)}</small>
    </button>
  `;
}

function studentProfile(student) {
  return `
    <div class="panel-header">
      <div><p class="mini-label">学生详情</p><h3>${escapeHtml(student.id)} 的学习信息</h3></div>
      <span class="status-pill ${student.status === "需要支持" ? "hot" : ""}">${escapeHtml(student.level)}</span>
    </div>
    <div class="student-profile-grid">
      ${studentProfileItem("当前状态", student.status)}
      ${studentProfileItem("主要卡点", student.stuck)}
      ${studentProfileItem("下一步", student.next)}
      ${studentProfileItem("学习记忆", student.memory)}
    </div>
    <div class="student-evidence-box">
      <p class="mini-label">学生原句证据</p>
      <blockquote>${escapeHtml(student.evidence)}</blockquote>
    </div>
    ${studentSupportProfile(student)}
  `;
}

function studentSupportProfile(student) {
  const checkIn = latestSharedCheckIn(student.id);
  const stateLabel = checkIn?.stateLabel || student.status;
  const wellbeingLabel = checkIn?.wellbeingLabel || "暂无共享学习情绪信号";
  const recommendedAction = checkIn?.recommendedTeacherAction || "继续根据理解诊断给出学习支持；如学生分享求助草稿，再生成个体支持建议。";
  const sharedQuestion = checkIn?.teacherHelpDraft || "学生暂未同意共享新的求助问题。";
  const evidenceQuote = checkIn?.evidenceQuote || student.evidence;

  return `
    <section class="student-support-profile">
      <div class="support-profile-grid">
        ${supportProfileItem("A. 学习状态", `当前主题：${window.TeachFlowWorkspaceState.getState().topic}；理解状态：${student.level} / ${stateLabel}；主要卡点：${student.stuck}`)}
        ${supportProfileItem("B. 情绪/动力信号", `${wellbeingLabel}。这是临时学习状态语言，不是心理诊断。`)}
        ${supportProfileItem("C. 推荐老师行动", recommendedAction)}
        ${supportProfileItem("D. 学生同意共享的问题", sharedQuestion)}
      </div>
      <div class="support-evidence-box">
        <span>学习相关证据</span>
        <blockquote>${escapeHtml(evidenceQuote)}</blockquote>
      </div>
    </section>
  `;
}

function supportProfileItem(label, value) {
  return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function studentProfileItem(label, value) {
  return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function row(cells) {
  return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
}

function progress(label, value) {
  return `
    <div class="progress-item">
      <div class="progress-top"><span>${label}</span><span>${value}%</span></div>
      <div class="progress-bar"><span style="width: ${value}%"></span></div>
    </div>
  `;
}

function column(title, cards) {
  return `
    <section class="kanban-column">
      <h4>${title}</h4>
      ${cards.map(([cardTitle, body]) => `<article class="mini-card"><strong>${cardTitle}</strong><p>${body}</p></article>`).join("")}
    </section>
  `;
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

setChannel(channelFromLocation());
window.scrollTo(0, 0);

window.addEventListener("hashchange", () => {
  const nextChannel = channelFromLocation();
  if (nextChannel !== activeTeacherChannelId) setChannel(nextChannel);
});

setInterval(() => {
  if (isTeacherMessageDraftActive()) return;
  syncTeacherWorkspace(activeTeacherChannelId);
}, 5000);
