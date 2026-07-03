let STUDENT_ALIAS = readStudentAlias();
let STUDENT_CONTEXT = readStudentContext();
let initialStudentState = window.TeachFlowWorkspaceState.getStudent(STUDENT_ALIAS);
let initialStudentSignal = window.TeachFlowWorkspaceState.latestStuckSignal(STUDENT_ALIAS);
let assignmentStatus = window.TeachFlowWorkspaceState.getAssignment(STUDENT_ALIAS);
let lastStuckType = initialStudentSignal?.stuckType || initialStudentState?.stuck || "图示没懂";
let activeStudentChannelId = "home";
let selectedCheckInState = "partly_understand";
let checkInStatusMessage = "";
let lastTeacherMessageId = "";
let studentMessageDockMinimized = readStudentMessageDockMinimized();
let studentAgentBriefing = null;
let studentAgentBriefingSource = "local";
let lastStudentAgentDraft = null;
let studentAgentStatusMessage = "";

function readStudentAlias() {
  return window.TeachFlowSession?.context?.studentAlias || "S001";
}

function readStudentContext() {
  const sessionContext = window.TeachFlowSession?.context || {};
  return window.TeachFlowWorkspaceState.getStudentContext(sessionContext.studentAlias || STUDENT_ALIAS || "S001", {
    userId: sessionContext.userId,
    classId: sessionContext.classId,
    studentAlias: sessionContext.studentAlias || STUDENT_ALIAS || "S001"
  });
}

function refreshStudentContext() {
  STUDENT_ALIAS = readStudentAlias();
  STUDENT_CONTEXT = readStudentContext();
  initialStudentState = window.TeachFlowWorkspaceState.getStudent(STUDENT_ALIAS);
  initialStudentSignal = window.TeachFlowWorkspaceState.latestStuckSignal(STUDENT_ALIAS);
  assignmentStatus = window.TeachFlowWorkspaceState.getAssignment(STUDENT_ALIAS);
  renderStudentShellMeta();
}

function renderStudentShellMeta() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, STUDENT_CONTEXT);
  const brand = document.querySelector(".student-brand");
  const identity = document.querySelector(".identity-card");
  if (brand) {
    const shortAlias = STUDENT_ALIAS.replace(/^S/i, "S");
    const avatar = brand.querySelector(".student-avatar");
    const title = brand.querySelector("h1");
    if (avatar) avatar.textContent = shortAlias.replace(/^S0*/, "S") || STUDENT_ALIAS;
    if (title) title.textContent = `${STUDENT_ALIAS} 学习空间`;
  }
  if (identity) {
    identity.innerHTML = `
      <span>当前主题</span>
      <strong>${escapeHtml(scoped.topic || "待设置主题")}</strong>
      <small>${escapeHtml(scoped.className || "当前课堂")} · 老师已创建课堂</small>
    `;
  }
}

const chatMessages = [
  {
    role: "assistant",
    text: "你好，我可以帮你理解老师已经发布的材料。你可以问：频域是什么？为什么不是把时间变没了？这张图应该怎么看？"
  }
];

const wellbeingMessages = [
  {
    role: "assistant",
    text: "我在。这里可以聊学习压力、跟不上、害怕提问、觉得挫败这些感受。我不是心理医生，也不会给你做诊断；我会帮你把当下状态整理成一个小小的下一步。"
  }
];

let wellbeingStatusMessage = "关怀聊天默认只给你自己看；需要老师帮助时，可以用右侧 check-in 分享学习摘要。";

function studentHomeChannel() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, STUDENT_CONTEXT);
  const teacherActions = scoped.teacherAgentActions || [];
  const questionCount = scoped.questions?.length || 0;
  const stuckCount = scoped.stuckSignals?.length || 0;
  return `
    <section class="overview-grid">
      <div class="panel">
        <div class="panel-header">
          <div><p class="small-label">我的课堂</p><h3>${escapeHtml(scoped.className || "当前课堂")}</h3></div>
          <span class="status-pill">${escapeHtml(STUDENT_ALIAS)}</span>
        </div>
        <ul class="task-stack">
          ${task("1. 查看老师材料", teacherActions.length ? "老师批准的新安排会出现在这里。" : "老师还没有发布专属材料。", teacherActions.length ? "有新安排" : "等待")}
          ${task("2. 提交作业", "完成微型测试或写下自己的解释。", assignmentStatus || "未提交")}
          ${task("3. 遇到问题就提问", questionCount || stuckCount ? `已记录 ${questionCount} 个问题、${stuckCount} 个卡点` : "可以随时向学习 Agent 或老师提问", "可随时做")}
        </ul>
      </div>
      <div class="panel hero-material">
        <div class="hero-material-body">
          <p class="small-label">当前主题</p>
          <h3>${escapeHtml(scoped.topic || "待设置主题")}</h3>
          <p>这个课堂从真实学习记录开始。你的作业、问题、卡点和老师回复会写入自己的匿名学习空间。</p>
        </div>
      </div>
    </section>
    ${studentTeacherActionNotice()}
    ${studentBoundaryNotice()}
  `;
}

function studentMaterialChannel() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, STUDENT_CONTEXT);
  const materialActions = (scoped.teacherAgentActions || []).filter((item) => item.type === "assign_material" && item.material);
  return `
    ${studentAssignedMaterialPanel()}
    <section class="two-column">
      <div class="panel">
        <div class="panel-header">
          <div><p class="small-label">学习材料</p><h3>${escapeHtml(scoped.topic || "待设置主题")}</h3></div>
          <span class="status-pill">${materialActions.length ? `${materialActions.length} 项` : "等待老师发布"}</span>
        </div>
        ${materialActions.length ? `
          <ul class="record-list">
            ${materialActions.map((action) => record(action.material.type || "材料", action.material.title || action.title)).join("")}
          </ul>
        ` : `
          <article class="student-empty-card">
            <strong>还没有发布材料</strong>
            <span>老师批准材料后会出现在这里。你也可以先在问题窗口问学习 Agent。</span>
          </article>
        `}
      </div>
      <div class="panel">
        <div class="panel-header">
          <div><p class="small-label">学习建议</p><h3>先从自己的问题开始</h3></div>
        </div>
        <ul class="record-list">
          ${record("作业", assignmentStatus || "未提交")}
          ${record("问题窗口", "可以问具体题目、概念或下一步怎么学。")}
          ${record("我卡住了", "需要老师帮助时，可以把学习摘要发送给老师。")}
        </ul>
      </div>
    </section>
  `;
}

const studentChannels = {
  home: {
    kicker: "我的首页",
    title: "今天先完成这三件事",
    html: () => studentHomeChannel(),
    legacyHtml: () => `
      <section class="overview-grid">
        <div class="panel">
          <div class="panel-header">
            <div><p class="small-label">今日任务</p><h3>按顺序完成，不需要一次做完</h3></div>
            <span class="status-pill warn">约 15 分钟</span>
          </div>
          <ul class="task-stack">
            ${task("1. 阅读老师讲义", "先看“同一个信号的两种表示”这一段。", "已开始")}
            ${task("2. 提交作业", "完成微型测试，并提交一段自己的解释。", assignmentStatus)}
            ${task("3. 有问题就提问", "在问题窗口里问具体问题，或在学习支持里标记卡点。", "可随时做")}
          </ul>
        </div>
        <div class="panel hero-material">
          <img src="assets/fourier-prism.png" alt="傅里叶变换学习材料图">
          <div class="hero-material-body">
            <p class="small-label">当前学习材料</p>
            <h3>把复杂信号拆成简单频率</h3>
            <p>今天先理解一件事：同一个信号，可以从时间变化看，也可以从频率成分看。</p>
          </div>
        </div>
      </section>
      ${studentTeacherActionNotice()}
      ${studentBoundaryNotice()}
    `
  },
  material: {
    kicker: "学习材料",
    title: "老师批准后发布给你的内容",
    html: () => studentMaterialChannel(),
    legacyHtml: () => `
      ${studentAssignedMaterialPanel()}
      <section class="two-column">
        <div class="panel">
          <div class="panel-header">
            <div><p class="small-label">讲义</p><h3>傅里叶变换的核心想法</h3></div>
            <span class="status-pill">Level 2</span>
          </div>
          <div class="concept-card-grid">
            ${concept("时域", "从时间顺序看信号如何变化，就像看一段声音波形。")}
            ${concept("频域", "从组成成分看信号里有哪些频率，就像看声音里有哪些音高。")}
            ${concept("同一个信号", "不是把信号变成另一个东西，而是换一种方式观察它。")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div><p class="small-label">学习提示</p><h3>看图时先抓这三个点</h3></div>
          </div>
          <ul class="record-list">
            ${record("左边复杂波形", "它表示信号随时间变化。")}
            ${record("中间转换", "它代表换一种观察方式。")}
            ${record("右边简单频率", "它表示这个信号内部包含哪些成分。")}
          </ul>
        </div>
      </section>
    `
  },
  assignment: {
    kicker: "提交作业",
    title: "微型测试和作业一起提交",
    html: () => `
      <section class="assignment-layout">
        <div class="panel">
          <div class="panel-header">
            <div><p class="small-label">微型测试</p><h3>先用自己的话回答两个问题</h3></div>
            <span id="assignment-status" class="status-pill warn">${assignmentStatus}</span>
          </div>
          <div class="quiz-card">
            <label>
              <strong>1. 为什么说频域不是“把时间变没了”？</strong>
              <textarea id="quiz-answer-1" placeholder="用你自己的话回答..."></textarea>
            </label>
            <label>
              <strong>2. 一个复杂声音为什么可以拆成几个频率？</strong>
              <textarea id="quiz-answer-2" placeholder="可以用音乐、波形或图示来解释..."></textarea>
            </label>
          </div>
        </div>

        <aside class="panel">
          <div class="panel-header">
            <div><p class="small-label">作业提交</p><h3>把你的完整解释交给老师</h3></div>
          </div>
          <div class="submit-box">
            <label>
              <span>作业标题</span>
              <input id="homework-title" value="傅里叶变换：我对时域和频域的理解">
            </label>
            <label>
              <span>作业内容</span>
              <textarea id="homework-body" placeholder="把你的理解写在这里，也可以说明哪里还不确定。"></textarea>
            </label>
            <label class="upload-zone">
              <span>上传附件</span>
              <input type="file" aria-label="上传作业附件">
              <small>原型阶段只展示入口，暂不真正上传文件。</small>
            </label>
            <div class="button-row">
              <button class="secondary-button" type="button" data-action="save-assignment">保存草稿</button>
              <button class="primary-button" type="button" data-action="submit-assignment">提交作业</button>
            </div>
            <p id="assignment-note" class="inline-note">提交后老师会看到你的微型测试答案、作业内容和卡点信号。</p>
          </div>
        </aside>
      </section>
    `
  },
  ask: {
    kicker: "问题窗口",
    title: "像 GPT 一样问你想问的题",
    html: () => `
      <section class="chat-layout">
        <div class="panel chat-panel">
          <div class="panel-header">
            <div><p class="small-label">学习问答</p><h3>围绕当前材料提问</h3></div>
            <span class="status-pill">受控学习助手</span>
          </div>
          <div id="chat-thread" class="chat-thread">
            ${chatMessages.map(renderMessage).join("")}
          </div>
          <form id="question-form" class="question-form">
            <textarea id="question-input" placeholder="输入你想问的问题，例如：为什么右边几条波能表示左边那个复杂波？"></textarea>
            <button class="primary-button" type="submit">发送问题</button>
          </form>
        </div>

        <aside class="panel">
          <div class="panel-header">
            <div><p class="small-label">推荐问题</p><h3>不知道问什么时可以点这些</h3></div>
          </div>
          <div class="prompt-list">
            ${promptButton("频域到底是什么？")}
            ${promptButton("为什么不是把时间变成频率？")}
            ${promptButton("这张傅里叶图应该从哪里开始看？")}
            ${promptButton("我记得公式，但不知道符号是什么意思。")}
          </div>
        </aside>
      </section>
    `
  },
  messages: {
    kicker: "老师消息",
    title: "和老师对话：消息、提醒和记录",
    html: () => studentTeacherMessagesChannel()
  },
  support: {
    kicker: "AI 学习支持",
    title: "你的专属学习 Agent：分析、提问、卡点支持",
    html: () => `
      <section class="support-layout agent-support-layout">
        <div class="panel agent-analysis-panel">
          <div class="panel-header">
            <div><p class="small-label">AI 分析窗口</p><h3>它会记录并整理你的学习状态</h3></div>
            <span class="status-pill">专属学习 Agent</span>
          </div>

          <div class="agent-summary-grid">
            ${agentStat("理解状态", currentStudentAgentState().profile.level, currentStudentAgentState().summary)}
            ${agentStat("当前卡点", currentStudentAgentState().profile.stuckType, currentAgentAdvice())}
            ${agentStat("作业状态", currentStudentAgentState().profile.assignmentStatus, currentStudentAgentState().profile.confidence)}
            ${agentStat("对话记忆", `${currentStudentAgentState().profile.chatCount} 条`, "学习助手会把你的提问和卡点作为后续解释的背景。")}
          </div>
          <div class="student-agent-source-strip">
            <span class="status-pill">${studentAgentBriefingSource === "api" ? "学生 Agent API 已连接" : "本地 Agent 预览"}</span>
            ${(currentStudentAgentState().sourceSignals || []).map(studentAgentSourceChip).join("")}
          </div>

          <div class="learning-memory-panel">
            <div class="panel-header compact-header">
              <div><p class="small-label">学习记忆</p><h3>它已经帮你记下这些学习线索</h3></div>
            </div>
            <ul class="learning-memory-list">
              ${learningMemory("学习材料", "已阅读傅里叶变换图示讲义。")}
              ${learningMemory("小测与作业", assignmentStatus)}
              ${learningMemory("最近卡点", lastStuckType)}
              ${learningMemory("可继续追踪", "问题、作业、卡点和老师反馈都会进入同一个学习画像。")}
            </ul>
          </div>

          ${studentAgentPlanPanel()}
          ${studentAgentSharePreview()}

          <div class="map-board compact agent-map">
            ${mapColumn("我已经理解", [
              ["同一个信号", "可以用不止一种方式表示。"],
              ["频率成分", "复杂信号里面可能包含多个简单频率。"]
            ])}
            ${mapColumn("下一步支持", [
              ["图示转换", "用一张图把左边波形和右边频率逐步对应。"],
              ["公式含义", "先解释符号在说什么，再回到完整公式。"]
            ])}
          </div>
        </div>

        <aside class="support-side-stack">
          <section class="panel support-agent-chat">
            <div class="panel-header">
              <div><p class="small-label">问你的学习 Agent</p><h3>像聊天一样问任何学习问题</h3></div>
              <span class="status-pill">会参考你的记录</span>
            </div>
            <div id="support-chat-thread" class="chat-thread support-chat-thread">
              ${chatMessages.map(renderMessage).join("")}
            </div>
            <form id="support-question-form" class="question-form support-question-form">
              <textarea id="support-question-input" placeholder="例如：根据我现在的卡点，下一步应该先补哪一块？"></textarea>
              <button class="primary-button" type="submit">问学习助手</button>
            </form>
            <div class="support-prompt-row" aria-label="推荐追问">
              ${supportPromptButton("根据我的记录，下一步该先补什么？")}
              ${supportPromptButton("把我卡住的地方换个例子讲一遍。")}
              ${supportPromptButton("帮我整理成可以交给老师的问题。")}
            </div>
          </section>

          <section class="panel reflection-box">
            <div class="panel-header">
              <div><p class="small-label">我卡住了</p><h3>给 Agent 和老师一个明确的信号</h3></div>
              <span id="stuck-status" class="status-pill warn">${lastStuckType}</span>
            </div>
            <div class="stuck-options">
              ${stuck("定义没懂", "我不知道这个概念到底是什么意思")}
              ${stuck("图示没懂", "我看不懂图里的左右关系")}
              ${stuck("公式没懂", "我记得公式，但不知道符号含义")}
              ${stuck("例题迁移", "我能跟例题，但自己做不会")}
            </div>
            <label class="stuck-note">
              <span>补充说明</span>
              <textarea id="stuck-note" placeholder="例如：我不明白为什么右边几条波加起来就是左边那个复杂波。"></textarea>
            </label>
            <div class="button-row">
              <button class="secondary-button" type="button" data-action="ask-from-stuck">让 Agent 分析这个卡点</button>
              <button class="primary-button" type="button" data-action="send-stuck">发送给老师</button>
            </div>
            <p id="student-agent-status" class="inline-note">${escapeHtml(studentAgentStatusMessage || "学生 Agent 会先整理卡点；只有你点击发送，老师才会看到摘要。")}</p>
          </section>
        </aside>
      </section>
    `
  },
  checkin: {
    kicker: "学习关怀",
    title: "AI 学习关怀助手：把压力变成可解决的学习问题",
    html: () => {
      const latest = latestStudentCheckIn();
      const draft = checkInDraft(selectedCheckInState, latest?.note || "");
      return `
        <section class="checkin-layout">
          <div class="panel checkin-panel">
            <div class="panel-header">
              <div><p class="small-label">Student Check-in</p><h3>你现在的学习状态是什么？</h3></div>
              <span class="status-pill warn">不是心理医生</span>
            </div>
            <div class="wellbeing-boundary">
              <strong>AI 学习关怀助手可以听你说学习压力和卡点，但不会做心理诊断。</strong>
              <span>默认情况下，完整私密内容不会直接展示给老师。你选择分享时，老师只看到学习相关摘要、求助草稿和临时学习支持指标。</span>
            </div>
            <div class="checkin-state-grid" aria-label="选择当前学习状态">
              ${checkInOption("understand", "我懂了", "我可以继续做练习")}
              ${checkInOption("partly_understand", "有点懂但不确定", "我需要一个小例子确认")}
              ${checkInOption("stuck", "完全卡住", "我需要换一种讲法")}
              ${checkInOption("frustrated", "很挫败", "我需要低压力入口")}
              ${checkInOption("want_teacher_help", "我想让老师知道", "帮我整理求助草稿")}
            </div>
            <label class="checkin-note">
              <span>一句话写下你的状态或卡点</span>
              <textarea id="checkin-note" placeholder="例如：我不理解为什么傅里叶变换对物理有用。">${escapeHtml(latest?.shareChoice === "private" ? "" : latest?.evidenceQuote || "")}</textarea>
            </label>
            <div class="button-row">
              <button class="secondary-button" type="button" data-action="keep-checkin-private">保留私密</button>
              <button class="secondary-button" type="button" data-action="ask-ai-checkin">先让 AI 解释</button>
              <button class="primary-button" type="button" data-action="share-checkin">分享学习摘要给老师</button>
            </div>
            <p id="checkin-status" class="inline-note">${escapeHtml(checkInStatusMessage || "你可以先保留私密；需要老师帮助时再分享学习摘要。")}</p>
          </div>

          <aside class="panel checkin-preview">
            <div class="panel-header">
              <div><p class="small-label">AI 整理结果</p><h3>不会把你贴上永久标签</h3></div>
              <span class="status-pill">临时学习状态</span>
            </div>
            <div class="checkin-preview-stack">
              ${checkInPreviewItem("给自己的下一步", draft.next)}
              ${checkInPreviewItem("给老师的求助草稿", draft.teacherDraft)}
              ${checkInPreviewItem("老师可见边界", "只有你点击分享时，老师才会看到学习相关摘要；不是心理诊断，也不是完整对话。")}
              ${checkInPreviewItem("安全提醒", "如果内容涉及伤害自己或他人的风险，AI 会建议联系可信任成年人，并按学校安全流程交给真人。")}
            </div>
            ${latest ? latestCheckInPanel(latest) : emptyCheckInPanel()}
          </aside>
        </section>
      `;
    }
  },
  progress: {
    kicker: "学习记录",
    title: "我的提交和老师反馈",
    html: () => `
      <section class="two-column">
        <div class="panel">
          <div class="panel-header">
            <div><p class="small-label">进度</p><h3>本主题学习状态</h3></div>
          </div>
          <div class="progress-strip">
            ${progress("学习材料", 100)}
            ${progress("提交作业", assignmentStatus === "已提交" ? 100 : 45)}
            ${progress("问题窗口", chatMessages.length > 1 ? 80 : 20)}
            ${progress("AI 学习支持", chatMessages.length > 1 ? 85 : 70)}
            ${progress("学习关怀", latestStudentCheckIn() ? 80 : 20)}
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div><p class="small-label">时间线</p><h3>最近记录</h3></div>
          </div>
          <ul class="record-list">
            ${record("今天 10:32", "打开学习材料并阅读图示讲解。")}
            ${record("今天 10:38", `${assignmentStatus === "已提交" ? "提交了作业。" : "保存了作业草稿。"}`)}
            ${record("今天 10:41", `当前卡点：${lastStuckType}。`)}
            ${record("学习关怀", latestStudentCheckIn() ? `${latestStudentCheckIn().stateLabel} · ${latestStudentCheckIn().privacyLevel}` : "还没有提交 check-in。")}
          </ul>
        </div>
      </section>
      ${studentTeacherActionTimeline()}
    `
  }
};

const studentButtons = Array.from(document.querySelectorAll("[data-channel]"));
const studentContent = document.getElementById("student-content");
const studentTitle = document.getElementById("student-title");
const studentKicker = document.getElementById("student-kicker");

studentButtons.forEach((button) => {
  button.addEventListener("click", () => setStudentChannel(button.dataset.channel));
});

document.querySelectorAll("[data-top-action]").forEach((button) => {
  button.addEventListener("click", () => setStudentChannel(button.dataset.topAction));
});

function setStudentChannel(channelId, options) {
  activeStudentChannelId = studentChannels[channelId] ? channelId : "home";
  refreshStudentWorkspaceState();
  const channel = studentChannels[channelId] || studentChannels.home;
  studentButtons.forEach((button) => button.classList.toggle("active", button.dataset.channel === activeStudentChannelId));
  studentTitle.textContent = channel.title;
  studentKicker.textContent = channel.kicker;
  studentContent.innerHTML = channel.html();
  ensureStudentMessageDock();
  renderStudentMessageDock();
  bindDynamicInteractions();
  compactStudentPanels();
  if (!options?.skipReadSync) syncVisibleTeacherActionReads(activeStudentChannelId);
  if (!options?.skipAgentSync) syncStudentAgentBriefing(activeStudentChannelId);
}

function refreshStudentWorkspaceState() {
  refreshStudentContext();
  const latestStudent = window.TeachFlowWorkspaceState.getStudent(STUDENT_ALIAS);
  const latestSignal = window.TeachFlowWorkspaceState.latestStuckSignal(STUDENT_ALIAS);
  assignmentStatus = window.TeachFlowWorkspaceState.getAssignment(STUDENT_ALIAS);
  lastStuckType = latestSignal?.stuckType || latestStudent?.stuck || lastStuckType;
}

function studentTeacherActions() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, STUDENT_CONTEXT);
  return (scoped.teacherAgentActions || [])
    .filter((item) => item.studentAlias === STUDENT_ALIAS && item.studentVisible !== false)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function studentAssignedMaterials() {
  return studentTeacherActions().filter((item) => item.type === "assign_material" && item.material);
}

function studentTeacherActionNotice() {
  const actions = studentTeacherActions().slice(0, 2);
  if (!actions.length) return "";
  return `
    <section class="panel student-teacher-action-notice">
      <div class="panel-header compact-header">
        <div><p class="small-label">老师新安排</p><h3>来自老师批准后的学习动作</h3></div>
        <button class="ghost-button" type="button" data-open-student-messages>查看消息</button>
      </div>
      <div class="student-action-card-list">
        ${actions.map(studentTeacherActionCard).join("")}
      </div>
    </section>
  `;
}

function studentAssignedMaterialPanel() {
  const materials = studentAssignedMaterials();
  if (!materials.length) return "";
  return `
    <section class="panel student-assigned-materials">
      <div class="panel-header compact-header">
        <div><p class="small-label">老师布置</p><h3>专门发给你的材料</h3></div>
        <span class="status-pill">${materials.length} 项</span>
      </div>
      <div class="student-action-card-list">
        ${materials.map((item) => `
          <article class="student-teacher-action-card">
            <span>${escapeHtml(item.material.type || "学习材料")} · ${formatStudentTime(item.createdAt)}</span>
            <strong>${escapeHtml(item.material.title)}</strong>
            <p>${escapeHtml(item.material.goal || item.detail || "老师已把这份材料布置给你。")}</p>
            <small>${escapeHtml(item.material.targetLevel || "按自己的节奏完成")}</small>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function studentTeacherActionTimeline() {
  const actions = studentTeacherActions().slice(0, 4);
  if (!actions.length) return "";
  return `
    <section class="panel student-teacher-action-timeline">
      <div class="panel-header compact-header">
        <div><p class="small-label">老师跟进</p><h3>已同步给你的学习安排</h3></div>
      </div>
      <ul class="record-list">
        ${actions.map((item) => record(formatStudentTime(item.createdAt), `${studentTeacherActionLabel(item.type)}：${item.title || item.detail}`)).join("")}
      </ul>
    </section>
  `;
}

function studentTeacherActionCard(item) {
  return `
    <article class="student-teacher-action-card">
      <span>${escapeHtml(studentTeacherActionLabel(item.type))} · ${formatStudentTime(item.createdAt)}</span>
      <strong>${escapeHtml(item.title || "老师已更新学习安排")}</strong>
      <p>${escapeHtml(item.detail || item.material?.goal || "请按老师安排继续学习。")}</p>
      <div class="student-action-response-row">
        <button class="ghost-button" type="button" data-respond-teacher-action="${escapeAttr(item.id)}" data-response-type="improved">有帮助，我懂了</button>
        <button class="ghost-button warn" type="button" data-respond-teacher-action="${escapeAttr(item.id)}" data-response-type="still_stuck">我还是卡住</button>
      </div>
    </article>
  `;
}

function studentTeacherActionLabel(type) {
  if (type === "send_message") return "老师消息";
  if (type === "assign_material") return "学习材料";
  if (type === "schedule_followup") return "短跟进";
  return "学习安排";
}

function studentTeacherActionStatus(item) {
  if (item.studentResponseAt) {
    return {
      label: `已回应：${studentResponseTypeLabel(item.studentResponseType)}`,
      className: "responded"
    };
  }
  if (item.studentReadAt) return { label: "已读，等待反馈", className: "read" };
  return { label: "新安排", className: "unread" };
}

function studentResponseTypeLabel(type) {
  if (type === "improved") return "有帮助";
  if (type === "still_stuck") return "仍卡住";
  return "已同步";
}

function studentTeacherActionCard(item) {
  const status = studentTeacherActionStatus(item);
  const hasResponded = Boolean(item.studentResponseAt);
  return `
    <article class="student-teacher-action-card">
      <span>${escapeHtml(studentTeacherActionLabel(item.type))} · ${formatStudentTime(item.createdAt)}</span>
      <span class="student-action-read-state ${escapeAttr(status.className)}">${escapeHtml(status.label)}</span>
      <strong>${escapeHtml(item.title || "老师已更新学习安排")}</strong>
      <p>${escapeHtml(item.detail || item.material?.goal || "请按老师安排继续学习。")}</p>
      <div class="student-action-response-row">
        <button class="ghost-button" type="button" data-respond-teacher-action="${escapeAttr(item.id)}" data-response-type="improved" ${hasResponded ? "disabled" : ""}>有帮助，我懂了</button>
        <button class="ghost-button warn" type="button" data-respond-teacher-action="${escapeAttr(item.id)}" data-response-type="still_stuck" ${hasResponded ? "disabled" : ""}>我还是卡住</button>
      </div>
    </article>
  `;
}

function syncStudentAgentBriefing(channelId) {
  if (!canUseWorkspaceApi()) return;
  fetch("/api/student-agent/briefing", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Student Agent API ${response.status}`);
      return response.json();
    })
    .then((briefing) => {
      studentAgentBriefing = briefing;
      studentAgentBriefingSource = "api";
      if (channelId !== activeStudentChannelId) return;
      if (document.activeElement?.tagName === "TEXTAREA") return;
      if (["home", "support", "progress"].includes(activeStudentChannelId)) {
        setStudentChannel(activeStudentChannelId, { skipAgentSync: true });
      }
    })
    .catch(() => {
      studentAgentBriefingSource = "local";
    });
}

function syncVisibleTeacherActionReads(channelId) {
  const unreadActions = studentTeacherActions().filter((item) => !item.studentReadAt);
  if (!unreadActions.length) return;
  Promise.all(unreadActions.map((item) => postStudentTeacherActionRead(item.id)))
    .then(() => {
      if (channelId === activeStudentChannelId) {
        setStudentChannel(activeStudentChannelId, { skipAgentSync: true, skipReadSync: true });
      }
    })
    .catch(() => {});
}

async function postStudentTeacherActionRead(actionId) {
  const payload = {
    studentAlias: STUDENT_ALIAS,
    actionId
  };

  if (!canUseWorkspaceApi()) {
    return window.TeachFlowWorkspaceState.markTeacherAgentActionRead(STUDENT_ALIAS, actionId, {
      context: STUDENT_CONTEXT
    });
  }

  try {
    const response = await fetch("/api/workspace/teacher-actions/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Workspace API ${response.status}`);
    const state = await response.json();
    return window.TeachFlowWorkspaceState.setState(state);
  } catch (error) {
    return window.TeachFlowWorkspaceState.markTeacherAgentActionRead(STUDENT_ALIAS, actionId, {
      context: STUDENT_CONTEXT
    });
  }
}

function bindDynamicInteractions() {
  const form = document.getElementById("question-form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitQuestion();
    });
  }

  const supportForm = document.getElementById("support-question-form");
  if (supportForm) {
    supportForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitSupportQuestion();
    });
  }

  const teacherMessageForm = document.getElementById("student-teacher-message-form");
  if (teacherMessageForm) {
    teacherMessageForm.addEventListener("submit", (event) => {
      event.preventDefault();
      sendStudentTeacherMessage();
    });
  }

  document.querySelectorAll("[data-open-student-messages]").forEach((button) => {
    button.addEventListener("click", () => setStudentChannel("messages"));
  });

  document.querySelectorAll("[data-respond-teacher-action]").forEach((button) => {
    button.addEventListener("click", () => {
      respondToTeacherAction(button.dataset.respondTeacherAction, button.dataset.responseType);
    });
  });

  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById("question-input");
      if (input) {
        input.value = button.dataset.prompt;
        input.focus();
      }
    });
  });

  document.querySelectorAll("[data-support-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById("support-question-input");
      if (input) {
        input.value = button.dataset.supportPrompt;
        input.focus();
      }
    });
  });

  document.querySelectorAll(".stuck-option").forEach((button) => {
    button.addEventListener("click", () => {
      lastStuckType = button.querySelector("strong")?.textContent || "卡点";
      const status = document.getElementById("stuck-status");
      if (status) status.textContent = lastStuckType;
      document.querySelectorAll(".stuck-option").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });

  const saveButton = document.querySelector("[data-action='save-assignment']");
  if (saveButton) saveButton.addEventListener("click", () => updateAssignment("已保存草稿"));

  const submitButton = document.querySelector("[data-action='submit-assignment']");
  if (submitButton) submitButton.addEventListener("click", () => updateAssignment("已提交"));

  const askFromStuck = document.querySelector("[data-action='ask-from-stuck']");
  if (askFromStuck) {
    askFromStuck.addEventListener("click", () => {
      const note = document.getElementById("stuck-note")?.value.trim() || "";
      chatMessages.push({
        role: "user",
        text: `我卡在“${lastStuckType}”。${note || "能不能换一种方式解释？"}`
      });
      draftStudentStuckSignal(note).then((draft) => {
        lastStudentAgentDraft = draft;
        studentAgentStatusMessage = "已整理成卡点草稿。你确认后可以发送给老师。";
        chatMessages.push({
          role: "assistant",
          text: `${draft.studentFacing} 下一步：${draft.nextStep}`
        });
        setStudentChannel("support");
      });
    });
  }

  const sendStuck = document.querySelector("[data-action='send-stuck']");
  if (sendStuck) {
    sendStuck.addEventListener("click", () => {
      const note = document.getElementById("stuck-note")?.value.trim() || "";
      const status = document.getElementById("stuck-status");
      shareStudentAgentSignal(note).then((result) => {
        if (status) status.textContent = "已同步给老师";
        studentAgentStatusMessage = "已分享学习卡点摘要给老师。老师看到的是整理后的学习信号，不是完整私密对话。";
        lastStudentAgentDraft = result?.draft || lastStudentAgentDraft;
        setStudentChannel("support");
      });
    });
  }

  document.querySelectorAll("[data-checkin-state]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCheckInState = button.dataset.checkinState || "partly_understand";
      document.querySelectorAll("[data-checkin-state]").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });

  const privateCheckIn = document.querySelector("[data-action='keep-checkin-private']");
  if (privateCheckIn) privateCheckIn.addEventListener("click", () => submitCheckIn("private"));

  const shareCheckIn = document.querySelector("[data-action='share-checkin']");
  if (shareCheckIn) shareCheckIn.addEventListener("click", () => submitCheckIn("teacher_summary"));

  const askAiCheckIn = document.querySelector("[data-action='ask-ai-checkin']");
  if (askAiCheckIn) askAiCheckIn.addEventListener("click", () => submitCheckIn("ask_ai_first"));
}

function compactStudentPanels() {
  makeStudentCompactDisclosure(".learning-memory-panel", "查看学习记忆", "记录");
  makeStudentCompactDisclosure(".agent-map", "查看理解地图", "详情");
  makeStudentCompactDisclosure(".checkin-preview-stack", "查看 AI 整理结果", "预览");
}

function makeStudentCompactDisclosure(selector, title, meta) {
  document.querySelectorAll(selector).forEach((node) => {
    if (node.closest("details") || node.dataset.compacted === "true") return;
    const details = document.createElement("details");
    details.className = "student-compact-disclosure compacted-detail";
    details.dataset.compacted = "true";
    details.innerHTML = `
      <summary><span>${escapeHtml(title)}</span><em>${escapeHtml(meta || "详情")}</em></summary>
      <div class="student-compact-body">${node.innerHTML}</div>
    `;
    node.replaceWith(details);
  });
}

function updateAssignment(status) {
  assignmentStatus = status;
  window.TeachFlowWorkspaceState.updateAssignment(STUDENT_ALIAS, status);
  const statusNode = document.getElementById("assignment-status");
  const note = document.getElementById("assignment-note");
  if (statusNode) {
    statusNode.textContent = status;
    statusNode.classList.toggle("warn", status !== "已提交");
  }
  if (note) note.textContent = status === "已提交" ? "已提交给老师。老师会看到你的答案、作业内容和附件入口。" : "草稿已保存。你可以继续修改后再提交。";
}

function submitQuestion() {
  const input = document.getElementById("question-input");
  const text = input?.value.trim();
  if (!text) return;

  chatMessages.push({ role: "user", text });
  window.TeachFlowWorkspaceState.recordQuestion(STUDENT_ALIAS, text);
  if (input) input.value = "";
  askStudentAgent(text).then((reply) => {
    lastStudentAgentDraft = reply.shareDraft || lastStudentAgentDraft;
    chatMessages.push({ role: "assistant", text: reply.answer || String(reply) });
    setStudentChannel("ask");
  });
}

function submitSupportQuestion() {
  const input = document.getElementById("support-question-input");
  const text = input?.value.trim();
  if (!text) return;

  chatMessages.push({ role: "user", text });
  if (input) input.value = "";
  askStudentAgent(text).then((reply) => {
    lastStudentAgentDraft = reply.shareDraft || lastStudentAgentDraft;
    studentAgentStatusMessage = reply.mode === "live"
      ? "真实 AI 学习助手已回答；默认只给你自己看，分享后老师才会看到整理摘要。"
      : "本地学习助手已回答；真实 AI 不可用时会自动兜底。";
    chatMessages.push({
      role: "assistant",
      text: reply.answer || String(reply)
    });
    setStudentChannel("support");
  });
}

async function askStudentAgent(question) {
  if (!canUseWorkspaceApi()) {
    return localStudentAgentAnswer(question);
  }

  try {
    const response = await fetch("/api/student-agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });
    if (!response.ok) throw new Error(`Student Agent API ${response.status}`);
    return response.json();
  } catch (error) {
    return localStudentAgentAnswer(question);
  }
}

async function draftStudentStuckSignal(note) {
  const payload = {
    stuckType: lastStuckType,
    text: note || `我卡在“${lastStuckType}”。`
  };

  if (!canUseWorkspaceApi()) {
    return localStudentAgentDraft(payload);
  }

  try {
    const response = await fetch("/api/student-agent/stuck-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Student Agent API ${response.status}`);
    return response.json();
  } catch (error) {
    return localStudentAgentDraft(payload);
  }
}

async function shareStudentAgentSignal(note) {
  const payload = {
    stuckType: lastStuckType,
    text: note || lastStudentAgentDraft?.studentText || `我卡在“${lastStuckType}”。`
  };

  if (!canUseWorkspaceApi()) {
    const draft = localStudentAgentDraft(payload);
    const state = window.TeachFlowWorkspaceState.recordStuckSignal(STUDENT_ALIAS, draft.stuckType, draft.teacherSummary);
    return { draft, state };
  }

  try {
    const response = await fetch("/api/student-agent/share-to-teacher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Student Agent API ${response.status}`);
    const result = await response.json();
    if (result.state) window.TeachFlowWorkspaceState.setState(result.state);
    return result;
  } catch (error) {
    const draft = localStudentAgentDraft(payload);
    const state = window.TeachFlowWorkspaceState.recordStuckSignal(STUDENT_ALIAS, draft.stuckType, draft.teacherSummary);
    return { draft, state };
  }
}

function localStudentAgentAnswer(question) {
  if (window.TeachFlowStudentAgentOrchestrator?.answerStudentQuestion) {
    return window.TeachFlowStudentAgentOrchestrator.answerStudentQuestion(question, currentStudentAgentState());
  }
  return {
    answer: window.TeachFlowDualAgentEngine.answerStudentQuestion(question, currentStudentAgentState()),
    nextStep: "先做一个小步骤",
    privacyNote: "本地预览回答。"
  };
}

function localStudentAgentDraft(payload) {
  if (window.TeachFlowStudentAgentOrchestrator?.draftStuckSignal) {
    return window.TeachFlowStudentAgentOrchestrator.draftStuckSignal(payload, currentStudentAgentState());
  }
  return {
    stuckType: payload.stuckType || lastStuckType,
    studentText: payload.text || "",
    studentFacing: "我已经帮你整理成一个可以发给老师的卡点。",
    teacherSummary: payload.text || `我卡在“${payload.stuckType || lastStuckType}”。`,
    nextStep: "先写一句最不确定的地方。",
    consentRequired: true,
    source: "student_agent"
  };
}

function submitCheckIn(shareChoice) {
  const note = document.getElementById("checkin-note")?.value.trim() || "";
  const state = window.TeachFlowWorkspaceState.recordCheckIn(STUDENT_ALIAS, {
    topic: "傅里叶变换",
    state: selectedCheckInState,
    note,
    shareChoice
  });
  const latest = state.checkIns.find((item) => item.studentAlias === STUDENT_ALIAS);
  const status = document.getElementById("checkin-status");
  if (status && latest?.safeguardingFlag?.required) {
    checkInStatusMessage = "这可能需要真人支持。请联系可信任成年人、老师或学校指定负责人。";
  } else if (status && shareChoice === "teacher_summary") {
    checkInStatusMessage = "已分享学习摘要给老师。老师不会看到你的完整私密对话。";
  } else if (status && shareChoice === "ask_ai_first") {
    checkInStatusMessage = "已先保留为私密记录，并让 AI 帮你解释。";
  } else if (status) {
    checkInStatusMessage = "已保留为你的私密学习记录。老师端不会显示这条内容。";
  }
  if (status) status.textContent = checkInStatusMessage;

  if (shareChoice === "ask_ai_first") {
    chatMessages.push({ role: "user", text: note || "我现在学习状态不太确定，可以先帮我拆解一下吗？" });
    chatMessages.push({
      role: "assistant",
      text: `${latest?.privateReflection || "先把问题拆小。"} ${latest?.nextLearningStep || "我们先从一个低压力例子开始。"}`
    });
    setStudentChannel("support");
    return;
  }

  setStudentChannel("checkin");
}

function studentTeacherMessagesChannel() {
  const messages = messagesForStudent();
  const latestTeacher = latestTeacherMessage();
  return `
    <section class="student-teams-layout">
      <div class="panel student-teams-chat">
        <div class="student-teams-header">
          <div class="student-avatar">师</div>
          <div>
            <p class="small-label">Teacher Chat</p>
            <h3>和老师的学习对话</h3>
            <span>这里适合发具体学习问题、卡点和老师回复；AI 问答仍在“问题窗口”。</span>
          </div>
          <span class="status-pill">${latestTeacher ? "有老师回复" : "等待回复"}</span>
        </div>
        <div class="student-teams-thread" aria-live="polite">
          ${messages.length ? messages.map(studentTeacherMessageBubble).join("") : `
            <article class="student-teams-empty"><strong>还没有和老师对话</strong><span>你可以先发一个具体卡点，老师端会收到右下角提醒。</span></article>
          `}
        </div>
        <form id="student-teacher-message-form" class="student-teams-form">
          <textarea id="student-teacher-message-input" placeholder="给老师发消息，例如：老师，我看不懂右边频率图和左边波形怎么对应。"></textarea>
          <button class="primary-button" type="submit">发送给老师</button>
        </form>
      </div>

      <aside class="panel student-teams-records">
        <div class="panel-header">
          <div><p class="small-label">消息记录</p><h3>最近同步</h3></div>
          <span class="status-pill">Teams 风格</span>
        </div>
        <ul class="record-list">
          ${record("当前别名", STUDENT_ALIAS)}
          ${record("老师最近回复", latestTeacher ? `${formatStudentTime(latestTeacher.createdAt)} · ${latestTeacher.text}` : "还没有新的老师回复。")}
          ${record("帮助请求", lastStuckType)}
          ${record("记录边界", "老师看到的是学习相关对话和你主动发出的求助，不是 AI 私密草稿。")}
        </ul>
      </aside>
    </section>
  `;
}

function messagesForStudent() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  return (workspace.messages || [])
    .filter((message) => message.studentAlias === STUDENT_ALIAS)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

function latestTeacherMessage() {
  return [...messagesForStudent()]
    .reverse()
    .find((message) => message.senderRole === "teacher") || null;
}

function studentTeacherMessageBubble(message) {
  const roleClass = message.senderRole === "teacher" ? "from-teacher" : message.senderRole === "system" ? "from-system" : "from-student";
  const label = message.senderRole === "teacher" ? "老师" : message.senderRole === "system" ? "系统提醒" : "我";
  return `
    <article class="student-teams-message ${roleClass}">
      <span>${label} · ${formatStudentTime(message.createdAt)}</span>
      <p>${escapeHtml(message.text)}</p>
    </article>
  `;
}

function sendStudentTeacherMessage() {
  const input = document.getElementById("student-teacher-message-input");
  const text = input?.value.trim();
  if (!text) return;
  postStudentTeacherMessage(text).then(() => {
    if (input) input.value = "";
    setStudentChannel("messages");
  });
  return;
  window.TeachFlowWorkspaceState.recordMessage(STUDENT_ALIAS, {
    text,
    senderRole: "student",
    senderId: STUDENT_CONTEXT.userId,
    senderLabel: STUDENT_ALIAS,
    kind: "chat",
    context: STUDENT_CONTEXT
  });
  if (input) input.value = "";
  setStudentChannel("messages");
}

function respondToTeacherAction(actionId, responseType) {
  const action = studentTeacherActions().find((item) => item.id === actionId);
  if (!action) return;

  if (responseType === "still_stuck") {
    const note = `回应老师动作“${action.title || studentTeacherActionLabel(action.type)}”：我还是卡住，需要再换一种讲法。`;
    postStudentActionStuck(action, note).then(() => {
      studentAgentStatusMessage = "已把这次反馈同步给老师，老师端成效回流会显示仍需跟进。";
      lastStuckType = "老师动作后仍有卡点";
      setStudentChannel("support");
    });
    return;
  }

  const text = `回应老师动作“${action.title || studentTeacherActionLabel(action.type)}”：这一步有帮助，我现在更清楚了。`;
  postStudentTeacherMessage(text, {
    kind: "teacher_action_response",
    linkedTeacherActionId: action.id,
    responseType: "improved"
  }).then(() => {
    studentAgentStatusMessage = "已把积极反馈同步给老师，老师端成效回流会显示改善信号。";
    setStudentChannel("progress");
  });
}

async function postStudentTeacherMessage(text, options = {}) {
  const payload = {
    studentAlias: STUDENT_ALIAS,
    text,
    kind: options.kind || "chat",
    linkedTeacherActionId: options.linkedTeacherActionId || null,
    responseType: options.responseType || null
  };

  if (!canUseWorkspaceApi()) {
    return window.TeachFlowWorkspaceState.recordMessage(STUDENT_ALIAS, {
      ...payload,
      senderRole: "student",
      senderId: STUDENT_CONTEXT.userId,
      senderLabel: STUDENT_ALIAS,
      context: STUDENT_CONTEXT
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
    return window.TeachFlowWorkspaceState.recordMessage(STUDENT_ALIAS, {
      ...payload,
      senderRole: "student",
      senderId: STUDENT_CONTEXT.userId,
      senderLabel: STUDENT_ALIAS,
      context: STUDENT_CONTEXT
    });
  }
}

async function postStudentActionStuck(action, note) {
  const payload = {
    studentAlias: STUDENT_ALIAS,
    stuckType: "老师动作后仍有卡点",
    note,
    linkedTeacherActionId: action.id,
    responseType: "still_stuck"
  };

  if (!canUseWorkspaceApi()) {
    return window.TeachFlowWorkspaceState.recordStuckSignal(STUDENT_ALIAS, payload.stuckType, payload.note, payload);
  }

  try {
    const response = await fetch("/api/workspace/stuck-signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Workspace API ${response.status}`);
    const state = await response.json();
    return window.TeachFlowWorkspaceState.setState(state);
  } catch (error) {
    return window.TeachFlowWorkspaceState.recordStuckSignal(STUDENT_ALIAS, payload.stuckType, payload.note, payload);
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

function ensureStudentMessageDock() {
  if (document.getElementById("student-message-dock")) return;
  const dock = document.createElement("aside");
  dock.id = "student-message-dock";
  dock.className = "student-message-dock";
  dock.setAttribute("aria-live", "polite");
  document.body.appendChild(dock);
}

function renderStudentMessageDock() {
  const dock = document.getElementById("student-message-dock");
  if (!dock) return;
  const latest = latestTeacherMessage();
  if (latest?.id) lastTeacherMessageId = latest.id;
  dock.classList.toggle("is-minimized", studentMessageDockMinimized);
  if (studentMessageDockMinimized) {
    dock.innerHTML = `
      <button class="student-dock-minimized-button" type="button" data-student-dock-minimize="false" aria-label="展开老师消息提醒">
        <span>${latest ? "老师有回复" : "老师消息"}</span>
        <strong>${latest ? "1" : "0"}</strong>
      </button>
    `;
    bindStudentMessageDockControls(dock);
    return;
  }
  dock.innerHTML = `
    <div class="student-dock-header">
      <div><p class="small-label">消息</p><strong>${latest ? "老师有回复" : "老师消息"}</strong></div>
      <div class="student-dock-actions">
        <button class="ghost-button" type="button" data-student-dock-minimize="true">最小化</button>
        <button class="ghost-button" type="button" data-open-student-messages>打开</button>
      </div>
    </div>
    <button class="student-dock-card" type="button" data-open-student-messages>
      <strong>${latest ? `老师 · ${formatStudentTime(latest.createdAt)}` : "等待老师回复"}</strong>
      <span>${escapeHtml(latest?.text || "你发送给老师的学习问题会保留在这里。")}</span>
    </button>
  `;
  bindStudentMessageDockControls(dock);
}

function bindStudentMessageDockControls(dock) {
  dock.querySelectorAll("[data-open-student-messages]").forEach((button) => {
    button.addEventListener("click", () => setStudentChannel("messages"));
  });
  dock.querySelectorAll("[data-student-dock-minimize]").forEach((button) => {
    button.addEventListener("click", () => {
      studentMessageDockMinimized = button.dataset.studentDockMinimize === "true";
      rememberStudentMessageDockMinimized(studentMessageDockMinimized);
      renderStudentMessageDock();
    });
  });
}

function readStudentMessageDockMinimized() {
  try {
    return window.localStorage?.getItem("teachflow.studentMessageDockMinimized") === "true";
  } catch (error) {
    return false;
  }
}

function rememberStudentMessageDockMinimized(isMinimized) {
  try {
    window.localStorage?.setItem("teachflow.studentMessageDockMinimized", isMinimized ? "true" : "false");
  } catch (error) {
    // Ignore storage failures; minimization still works for the current page.
  }
}

function formatStudentTime(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function responseForQuestion(question) {
  if (/图|看|左|右|波/.test(question)) {
    return "可以先从左边看：左边是随时间变化的复杂波形；再看右边：右边把它拆成几个简单频率。重点不是两个不同信号，而是同一个信号的两种观察方式。";
  }
  if (/公式|符号/.test(question)) {
    return "先不要从完整公式开始。你可以先把公式理解成一个压缩说明：它在描述每种频率成分在信号里有多少。等这个直觉清楚后，再回到符号。";
  }
  if (/频域|时间|时域/.test(question)) {
    return "频域不是让时间消失，而是换一个角度看同一个信号。时域看“什么时候发生什么变化”，频域看“里面有哪些频率成分”。";
  }
  return "我会先把你的问题连接到老师发布的材料：先找同一个信号，再区分时域和频域，最后用一个具体例子解释。你也可以把卡住的句子原样发给老师。";
}

function renderMessage(message) {
  return `
    <article class="chat-message ${message.role === "user" ? "from-user" : "from-assistant"}">
      <span>${message.role === "user" ? "你" : "学习助手"}</span>
      <p>${escapeHtml(message.text)}</p>
    </article>
  `;
}

function promptButton(text) {
  return `<button class="prompt-button" type="button" data-prompt="${escapeAttr(text)}">${escapeHtml(text)}</button>`;
}

function supportPromptButton(text) {
  return `<button class="prompt-button compact-prompt" type="button" data-support-prompt="${escapeAttr(text)}">${escapeHtml(text)}</button>`;
}

function latestStudentCheckIn() {
  return window.TeachFlowWorkspaceState.latestCheckIn(STUDENT_ALIAS);
}

function checkInOption(id, title, body) {
  const selected = id === selectedCheckInState ? " selected" : "";
  return `
    <button class="checkin-option${selected}" type="button" data-checkin-state="${escapeAttr(id)}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(body)}</span>
    </button>
  `;
}

function checkInDraft(state, note) {
  if (state === "understand") {
    return {
      next: "做一道微型判断题，确认自己能迁移。",
      teacherDraft: "我基本理解了，想确认自己能不能换一个例子解释。"
    };
  }
  if (state === "frustrated") {
    return {
      next: "先看 Level 1 图像解释，再做一个低压力判断题。",
      teacherDraft: "我现在对这个主题信心比较低，可以先用一个生活例子或图示帮我进入吗？"
    };
  }
  if (state === "want_teacher_help") {
    return {
      next: "把求助草稿发给老师，并请求一个 5 分钟低压力任务。",
      teacherDraft: note ? `我想请老师帮我确认：${note}` : "我想请老师帮我确认一个具体卡点。"
    };
  }
  if (state === "stuck") {
    return {
      next: "把卡点改写成一个具体问题，再让学习助手换例子解释。",
      teacherDraft: note ? `我卡在：${note}` : "我卡住了，需要换一种讲法。"
    };
  }
  return {
    next: "先复习老师批准的 Level 1 材料，再写一句仍不确定的地方。",
    teacherDraft: note ? `我有点懂但不确定：${note}` : "我有点懂但不确定，想用一个简单例子确认。"
  };
}

function checkInPreviewItem(title, body) {
  return `<article class="checkin-preview-item"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></article>`;
}

function latestCheckInPanel(item) {
  return `
    <div class="latest-checkin-card">
      <span>最近一次 check-in</span>
      <strong>${escapeHtml(item.stateLabel)} · ${escapeHtml(item.wellbeingLabel)}</strong>
      <p>${escapeHtml(item.shareChoice === "teacher_summary" ? "已分享学习摘要给老师" : "保留在你的学习空间")}</p>
      <small>${escapeHtml(item.nextLearningStep)}</small>
    </div>
  `;
}

function emptyCheckInPanel() {
  return `
    <div class="latest-checkin-card">
      <span>最近一次 check-in</span>
      <strong>还没有记录</strong>
      <p>你可以先保留私密，也可以在需要时分享学习摘要给老师。</p>
    </div>
  `;
}

function studentBoundaryNotice() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, STUDENT_CONTEXT);
  return `
    <section class="panel">
      <div class="panel-header">
        <div><p class="small-label">账号 / 角色 / 班级边界</p><h3>你只看到自己的学习空间</h3></div>
        <span class="status-pill">学生视图</span>
      </div>
      <ul class="record-list">
        ${record("当前别名", STUDENT_CONTEXT.studentAlias)}
        ${record("当前班级", scoped.accessBoundary.className)}
        ${record("可见范围", scoped.accessBoundary.visibleData)}
      </ul>
    </section>
  `;
}

function currentStudentAgentState() {
  if (studentAgentBriefing) return studentAgentBriefing;
  const workspace = window.TeachFlowWorkspaceState.getState();
  const scopedWorkspace = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, STUDENT_CONTEXT);
  if (window.TeachFlowStudentAgentOrchestrator?.buildStudentBriefing) {
    return window.TeachFlowStudentAgentOrchestrator.buildStudentBriefing(scopedWorkspace, { context: STUDENT_CONTEXT });
  }
  return window.TeachFlowDualAgentEngine.buildStudentAgentState({
    topic: "傅里叶变换",
    stuckType: lastStuckType,
    assignmentStatus,
    chatCount: Math.max(chatMessages.length - 1, 0)
  });
}

function studentAgentSourceChip(item) {
  return `<span class="student-agent-source-chip"><strong>${escapeHtml(item.count)}</strong>${escapeHtml(item.label)}</span>`;
}

function studentAgentSharePreview() {
  const draft = lastStudentAgentDraft || currentStudentAgentState().shareDraft;
  if (!draft) return "";
  return `
    <section class="student-agent-share-preview">
      <div class="panel-header compact-header">
        <div><p class="small-label">可分享学习摘要</p><h3>发给老师前可以先确认</h3></div>
        <span class="status-pill warn">需你确认</span>
      </div>
      <p>${escapeHtml(draft.teacherVisiblePreview || draft.teacherSummary)}</p>
      <small>${escapeHtml(draft.nextStep || "先做一个最小可完成步骤。")}</small>
    </section>
  `;
}

function agentStat(label, value, body) {
  return `
    <article class="agent-stat">
      <span>${label}</span>
      <strong>${value}</strong>
      <p>${body}</p>
    </article>
  `;
}

function studentAgentPlanPanel() {
  const agentState = currentStudentAgentState();
  return `
    <section class="student-agent-plan">
      <div class="panel-header compact-header">
        <div><p class="small-label">个人 Agent 计划</p><h3>它建议你现在按这三步走</h3></div>
        <span class="status-pill">老师批准内容内</span>
      </div>
      <div class="student-agent-plan-list">
        ${agentState.nextPlan.map((item, index) => `
          <article>
            <span>${index + 1}</span>
            <div><strong>${item.action}</strong><p>${item.detail}</p></div>
          </article>
        `).join("")}
      </div>
      <div class="teacher-signal-draft">
        <span>可以发给老师</span>
        <p>${escapeHtml(agentState.teacherSignalDraft)}</p>
      </div>
    </section>
  `;
}

function learningMemory(label, body) {
  return `<li><strong>${label}</strong><span>${body}</span></li>`;
}

function currentAgentAdvice() {
  return currentStudentAgentState().nextPlan[0].detail;
}

function task(title, detail, status) {
  return `<li class="task-item"><strong>${title}</strong><span>${detail}</span><em class="status-pill">${status}</em></li>`;
}

function concept(title, body) {
  return `<article class="concept-card"><strong>${title}</strong><p>${body}</p></article>`;
}

function record(time, body) {
  return `<li class="record-item"><strong>${time}</strong><span>${body}</span></li>`;
}

function mapColumn(title, items) {
  return `
    <section class="map-column">
      <h4>${title}</h4>
      <ul class="map-list">
        ${items.map(([itemTitle, body]) => `<li class="map-item"><strong>${itemTitle}</strong><span>${body}</span></li>`).join("")}
      </ul>
    </section>
  `;
}

function stuck(title, body) {
  return `<button class="stuck-option" type="button"><strong>${title}</strong><span>${body}</span></button>`;
}

function progress(label, value) {
  return `
    <div class="progress-row">
      <div class="progress-top"><span>${label}</span><span>${value}%</span></div>
      <div class="progress-bar"><span style="width: ${value}%"></span></div>
    </div>
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

function studentMaterialChannel() {
  const workspace = window.TeachFlowWorkspaceState.getState();
  const scoped = window.TeachFlowWorkspaceState.scopedStateForContext(workspace, STUDENT_CONTEXT);
  const materials = studentPublishedMaterials(scoped);
  return `
    <section class="two-column">
      <div class="panel">
        <div class="panel-header">
          <div><p class="small-label">学习材料</p><h3>${escapeHtml(scoped.topic || "待设置主题")}</h3></div>
          <span class="status-pill">${materials.length ? `${materials.length} 份` : "等待老师发布"}</span>
        </div>
        ${materials.length ? `
          <div class="student-material-card-list">
            ${materials.map(studentPublishedMaterialCard).join("")}
          </div>
        ` : `
          <article class="student-empty-card">
            <strong>还没有发布材料</strong>
            <span>老师在审批导出页点击发布后，讲义、图片或练习会出现在这里。</span>
          </article>
        `}
      </div>
      <div class="panel">
        <div class="panel-header">
          <div><p class="small-label">学习建议</p><h3>先从老师发布的材料开始</h3></div>
        </div>
        <ul class="record-list">
          ${record("作业", assignmentStatus || "未提交")}
          ${record("问题窗口", "可以问具体题目、概念或下一步怎么学。")}
          ${record("我卡住了", "需要老师帮助时，可以把学习摘要发送给老师。")}
        </ul>
      </div>
    </section>
  `;
}

studentChannels.support = {
  kicker: "AI 学习支持",
  title: "学习分析与卡点支持：不再重复聊天",
  html: () => `
    <section class="support-layout agent-support-layout">
      <div class="panel agent-analysis-panel">
        <div class="panel-header">
          <div><p class="small-label">AI 分析窗口</p><h3>它会整理你的学习状态和下一步</h3></div>
          <span class="status-pill">专属学习 Agent</span>
        </div>

        <div class="agent-summary-grid">
          ${agentStat("理解状态", currentStudentAgentState().profile.level, currentStudentAgentState().summary)}
          ${agentStat("当前卡点", currentStudentAgentState().profile.stuckType, currentAgentAdvice())}
          ${agentStat("作业状态", currentStudentAgentState().profile.assignmentStatus, currentStudentAgentState().profile.confidence)}
          ${agentStat("对话记忆", `${currentStudentAgentState().profile.chatCount} 条`, "学习问答统一放在“问题窗口”；这里负责整理记录和卡点。")}
        </div>

        <div class="student-agent-source-strip">
          <span class="status-pill">${studentAgentBriefingSource === "api" ? "学生 Agent API 已连接" : "本地 Agent 预览"}</span>
          ${(currentStudentAgentState().sourceSignals || []).map(studentAgentSourceChip).join("")}
        </div>

        <div class="learning-memory-panel">
          <div class="panel-header compact-header">
            <div><p class="small-label">学习记忆</p><h3>它已经帮你记下这些学习线索</h3></div>
          </div>
          <ul class="learning-memory-list">
            ${learningMemory("学习材料", "老师批准的讲义、图片和练习会进入这里。")}
            ${learningMemory("小测与作业", assignmentStatus)}
            ${learningMemory("最近卡点", lastStuckType)}
            ${learningMemory("可继续追踪", "问题、作业、卡点和老师反馈会进入同一个学习画像。")}
          </ul>
        </div>

        ${studentAgentPlanPanel()}
        ${studentAgentSharePreview()}
      </div>

      <aside class="support-side-stack">
        <section class="panel reflection-box">
          <div class="panel-header">
            <div><p class="small-label">我卡住了</p><h3>给 Agent 和老师一个明确的学习信号</h3></div>
            <span id="stuck-status" class="status-pill warn">${escapeHtml(lastStuckType)}</span>
          </div>
          <div class="stuck-options">
            ${stuck("定义没懂", "我不知道这个概念到底是什么意思")}
            ${stuck("图示没懂", "我看不懂图里的左右关系")}
            ${stuck("公式没懂", "我记得公式，但不知道符号含义")}
            ${stuck("例题迁移", "我能跟例题，但自己做不会")}
          </div>
          <label class="stuck-note">
            <span>补充说明</span>
            <textarea id="stuck-note" placeholder="例如：我还是不知道电子到底是什么，能不能换一种图片解释？"></textarea>
          </label>
          <div class="button-row">
            <button class="secondary-button" type="button" data-action="ask-from-stuck">让 Agent 分析这个卡点</button>
            <button class="primary-button" type="button" data-action="send-stuck">发送给老师</button>
          </div>
          <p id="student-agent-status" class="inline-note">${escapeHtml(studentAgentStatusMessage || "学生 Agent 会先整理卡点；只有你点击发送，老师才会看到摘要。")}</p>
        </section>
      </aside>
    </section>
  `
};

studentChannels.checkin = {
  kicker: "学习关怀",
  title: "AI 学生关怀助手：聊压力，也保护边界",
  html: () => studentWellbeingChannel()
};

function studentWellbeingChannel() {
  const latest = latestStudentCheckIn();
  const draft = checkInDraft(selectedCheckInState, latest?.note || "");
  return `
    <section class="checkin-layout wellbeing-chat-layout">
      <div class="panel wellbeing-chat-panel">
        <div class="panel-header">
          <div><p class="small-label">AI Wellbeing Coach</p><h3>你可以把学习压力直接说出来</h3></div>
          <span class="status-pill warn">不是心理医生</span>
        </div>
        <div class="wellbeing-boundary">
          <strong>它可以做学习压力支持，但不会做心理诊断或治疗。</strong>
          <span>普通关怀聊天默认只给你自己看；如果你选择分享，老师只会看到学习相关摘要和求助草稿。</span>
        </div>
        <div id="wellbeing-chat-thread" class="chat-thread wellbeing-chat-thread">
          ${wellbeingMessages.map(renderMessage).join("")}
        </div>
        <form id="wellbeing-chat-form" class="question-form wellbeing-chat-form">
          <textarea id="wellbeing-chat-input" placeholder="例如：我有点跟不上，感觉问老师很丢脸，可以先帮我整理一下吗？"></textarea>
          <button class="primary-button" type="submit">发送给关怀助手</button>
        </form>
        <div class="wellbeing-prompt-row" aria-label="关怀提示">
          ${wellbeingPromptButton("我觉得自己跟不上，先怎么做？")}
          ${wellbeingPromptButton("帮我把压力整理成可以告诉老师的一句话。")}
          ${wellbeingPromptButton("我现在很烦躁，先做一个 1 分钟的小步骤。")}
        </div>
        <p id="wellbeing-status" class="inline-note">${escapeHtml(wellbeingStatusMessage)}</p>
      </div>

      <aside class="wellbeing-side-stack">
        <section class="panel checkin-panel">
          <div class="panel-header">
            <div><p class="small-label">Student Check-in</p><h3>现在的学习状态是什么？</h3></div>
            <span class="status-pill">可选择是否分享</span>
          </div>
          <div class="checkin-state-grid" aria-label="选择当前学习状态">
            ${checkInOption("understand", "我懂了", "我可以继续做练习")}
            ${checkInOption("partly_understand", "有点懂但不确定", "我需要一个小例子确认")}
            ${checkInOption("stuck", "完全卡住", "我需要换一种讲法")}
            ${checkInOption("frustrated", "很挫败", "我需要低压力入口")}
            ${checkInOption("want_teacher_help", "我想让老师知道", "帮我整理求助草稿")}
          </div>
          <label class="checkin-note">
            <span>一句话写下你的状态或卡点</span>
            <textarea id="checkin-note" placeholder="例如：我不理解为什么电子会和电流联系起来。">${escapeHtml(latest?.shareChoice === "private" ? "" : latest?.evidenceQuote || "")}</textarea>
          </label>
          <div class="button-row">
            <button class="secondary-button" type="button" data-action="keep-checkin-private">保留私密</button>
            <button class="secondary-button" type="button" data-action="ask-ai-checkin">先让 AI 解释</button>
            <button class="primary-button" type="button" data-action="share-checkin">分享学习摘要给老师</button>
          </div>
          <p id="checkin-status" class="inline-note">${escapeHtml(checkInStatusMessage || "你可以先保留私密；需要老师帮助时再分享学习摘要。")}</p>
        </section>

        <section class="panel checkin-preview">
          <div class="panel-header">
            <div><p class="small-label">AI 整理结果</p><h3>只整理学习支持，不贴标签</h3></div>
            <span class="status-pill">临时学习状态</span>
          </div>
          <div class="checkin-preview-stack">
            ${checkInPreviewItem("给自己的下一步", draft.next)}
            ${checkInPreviewItem("给老师的求助草稿", draft.teacherDraft)}
            ${checkInPreviewItem("安全提醒", "如果你担心自己或别人会受伤，请立刻联系老师、家长、学校支持人员或当地紧急服务。")}
          </div>
          ${latest ? latestCheckInPanel(latest) : emptyCheckInPanel()}
        </section>
      </aside>
    </section>
  `;
}

function wellbeingPromptButton(text) {
  return `<button class="prompt-button compact-prompt" type="button" data-wellbeing-prompt="${escapeAttr(text)}">${escapeHtml(text)}</button>`;
}

function bindWellbeingInteractions() {
  const form = document.getElementById("wellbeing-chat-form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitWellbeingMessage();
    });
  }

  document.querySelectorAll("[data-wellbeing-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById("wellbeing-chat-input");
      if (input) {
        input.value = button.dataset.wellbeingPrompt || "";
        input.focus();
      }
    });
  });
}

async function submitWellbeingMessage() {
  const input = document.getElementById("wellbeing-chat-input");
  const text = input?.value.trim();
  if (!text) return;

  wellbeingMessages.push({ role: "user", text });
  if (input) input.value = "";
  wellbeingStatusMessage = "关怀助手正在整理你的状态。";
  setStudentChannel("checkin", { skipAgentSync: true });

  const reply = await askWellbeingCoach(text);
  const answer = [reply.answer, reply.copingStep ? `下一步：${reply.copingStep}` : "", reply.safetyNote ? `提醒：${reply.safetyNote}` : ""]
    .filter(Boolean)
    .join("\n\n");
  wellbeingMessages.push({ role: "assistant", text: answer });
  wellbeingStatusMessage = reply.mode === "live"
    ? "真实 AI 关怀助手已回复；这段对话默认只给你自己看。"
    : "本地关怀助手已回复；真实 AI 不可用时会自动兜底。";
  setStudentChannel("checkin", { skipAgentSync: true });
}

async function askWellbeingCoach(message) {
  if (!canUseWorkspaceApi()) {
    return localWellbeingCoachAnswer(message);
  }

  try {
    const response = await fetch("/api/student-agent/wellbeing-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    if (!response.ok) throw new Error(`Wellbeing API ${response.status}`);
    return response.json();
  } catch (error) {
    return localWellbeingCoachAnswer(message);
  }
}

function localWellbeingCoachAnswer(message) {
  const text = String(message || "");
  if (/自杀|不想活|伤害自己|伤害别人|kill myself|suicide|self harm|die/i.test(text)) {
    return {
      mode: "local",
      answer: "谢谢你说出来。这个情况不适合只靠 AI 处理，请你现在立刻找一位可信任的成年人，比如老师、家长、学校支持人员，或联系当地紧急服务。",
      copingStep: "现在先找身边一个真人，说：我现在不安全，需要你陪我。",
      safetyNote: "涉及伤害自己或他人的风险时，需要马上联系真人。"
    };
  }
  return {
    mode: "local",
    answer: "我听到了。你现在可能不是“不努力”，而是压力和卡点混在一起了。先不要一次解决所有问题，我们只把它拆成一个最小步骤。",
    copingStep: "写下一句话：我现在最卡的是哪一个词、哪一张图、还是哪一步推理？",
    safetyNote: "如果压力强到影响安全，请找老师、家长或学校支持人员。"
  };
}

const baseBindDynamicInteractions = bindDynamicInteractions;
bindDynamicInteractions = function bindDynamicInteractionsWithWellbeing() {
  baseBindDynamicInteractions();
  bindWellbeingInteractions();
};

function studentPublishedMaterials(scoped) {
  const fromApproved = (scoped?.approvedMaterials || [])
    .filter((item) => item.status === "published")
    .map((item) => ({ ...item, _sourceSort: item.publishedAt || item.createdAt || "" }));
  const fromActions = studentAssignedMaterials()
    .map((item) => item.material ? {
      ...item.material,
      status: "published",
      publishedAt: item.createdAt,
      _sourceSort: item.createdAt || ""
    } : null)
    .filter(Boolean);
  const byId = new Map();
  [...fromApproved, ...fromActions].forEach((item) => {
    const key = item.id || item.sourceDraftId || `${item.title}-${item.publishedAt || ""}`;
    if (!byId.has(key)) byId.set(key, item);
  });
  return Array.from(byId.values())
    .sort((a, b) => String(b._sourceSort || "").localeCompare(String(a._sourceSort || "")));
}

function studentPublishedMaterialCard(material) {
  const kind = String(material.kind || "").trim() || materialKindForStudent(material.type);
  return `
    <article class="student-published-material-card">
      <span>${escapeHtml(material.type || "学习材料")} · ${escapeHtml(formatStudentTime(material.publishedAt || material.createdAt))}</span>
      <strong>${escapeHtml(material.title || "老师发布的学习材料")}</strong>
      <p>${escapeHtml(material.goal || material.studentTask || "按老师的安排完成这份材料。")}</p>
      ${kind === "image" ? studentImageMaterial(material) : ""}
      ${kind === "exercise" ? studentExerciseMaterial(material) : studentHandoutMaterial(material)}
    </article>
  `;
}

function studentImageMaterial(material) {
  if (!material.imageUrl) return "";
  return `<img class="student-material-image" src="${escapeAttr(material.imageUrl)}" alt="${escapeAttr(material.title || "学习图片")}">`;
}

function studentHandoutMaterial(material) {
  const sections = Array.isArray(material.sections) ? material.sections : [];
  const keyPoints = materialArrayForStudent(material.keyPoints || material.outline);
  if (!sections.length && !keyPoints.length && !material.content) return "";
  return `
    <div class="student-material-detail">
      ${sections.slice(0, 4).map((item) => `
        <section>
          <strong>${escapeHtml(item.heading || "讲义段落")}</strong>
          <p>${escapeHtml(item.body || item.content || "")}</p>
        </section>
      `).join("")}
      ${keyPoints.length ? `<ul>${keyPoints.slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      ${material.content ? `<p>${escapeHtml(material.content)}</p>` : ""}
    </div>
  `;
}

function studentExerciseMaterial(material) {
  const exercises = Array.isArray(material.exercises) ? material.exercises : [];
  if (!exercises.length) return "";
  return `
    <div class="student-material-detail">
      ${exercises.slice(0, 6).map((item) => `
        <section>
          <strong>${escapeHtml(item.id || "练习")} ${escapeHtml(item.level || "")}</strong>
          <p>${escapeHtml(item.question || "")}</p>
          ${item.hint ? `<small>${escapeHtml(item.hint)}</small>` : ""}
        </section>
      `).join("")}
    </div>
  `;
}

function materialKindForStudent(type) {
  const text = String(type || "");
  if (/图片|图示|image|diagram|鍥剧墖|鍥剧ず/i.test(text)) return "image";
  if (/练习|习题|测验|exercise|quiz|缁冧範/i.test(text)) return "exercise";
  return "handout";
}

function materialArrayForStudent(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === "object") return [item.heading, item.body, item.question].filter(Boolean).join("：");
      return String(item || "").trim();
    }).filter(Boolean);
  }
  if (value && typeof value === "object") return Object.values(value).map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "").split(/\n+|；|;/).map((item) => item.trim()).filter(Boolean);
}

setStudentChannel("home");

if (window.TeachFlowSessionPromise) {
  window.TeachFlowSessionPromise.then(() => {
    refreshStudentContext();
    setStudentChannel(activeStudentChannelId);
  }).catch(() => null);
}

if (typeof window.TeachFlowWorkspaceState.syncFromServer === "function") {
  window.TeachFlowWorkspaceState.syncFromServer(STUDENT_CONTEXT).then(() => {
    setStudentChannel(activeStudentChannelId);
  });
}

setInterval(() => {
  if (document.activeElement?.tagName === "TEXTAREA") return;
  if (typeof window.TeachFlowWorkspaceState.syncFromServer !== "function") return;
  window.TeachFlowWorkspaceState.syncFromServer(STUDENT_CONTEXT).then(() => {
    setStudentChannel(activeStudentChannelId);
  });
}, 5000);
