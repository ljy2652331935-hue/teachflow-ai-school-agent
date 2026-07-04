(function (global) {
  const DEFAULT_TOPIC = "当前主题";

  function buildStudentBriefing(input, options) {
    const state = input || {};
    const context = options?.context || state.session || {};
    const student = Array.isArray(state.students) ? state.students[0] : null;
    const alias = context.studentAlias || student?.id || "S002";
    const topic = state.topic || student?.topic || DEFAULT_TOPIC;
    const assignmentStatus = state.assignments?.[alias] || "草稿未提交";
    const questions = recentForAlias(state.questions, alias);
    const stuckSignals = recentForAlias(state.stuckSignals, alias);
    const checkIns = recentForAlias(state.checkIns, alias);
    const messages = recentForAlias(state.messages, alias);
    const latestStuck = stuckSignals[0];
    const latestCheckIn = checkIns[0];
    const latestTeacherMessage = messages.find((item) => item.senderRole === "teacher") || null;
    const currentNeed = latestStuck?.stuckType || student?.stuck || inferNeedFromText(questions[0]?.text || student?.evidence || "");
    const profile = buildProfile({
      student,
      alias,
      topic,
      assignmentStatus,
      currentNeed,
      questions,
      stuckSignals,
      checkIns,
      messages
    });
    const nextPlan = buildNextPlan(profile, latestCheckIn, latestTeacherMessage);
    const stuckDraft = draftStuckSignal({
      text: latestStuck?.note || questions[0]?.text || student?.evidence || "",
      stuckType: currentNeed
    }, { profile, topic });

    return {
      agentId: "student-agent-orchestrator",
      name: "AI 学习伙伴",
      role: "Student Learning Agent",
      generatedAt: new Date().toISOString(),
      studentAlias: alias,
      className: state.accessBoundary?.className || state.className || "",
      topic,
      summary: `你现在正在学习「${topic}」。我看到你的主要卡点是「${profile.stuckType}」，作业状态是「${assignmentStatus}」。下一步先做一个小动作：${nextPlan[0]?.action || "复习老师材料"}。`,
      profile,
      nextPlan,
      teacherSignalDraft: stuckDraft.teacherSummary,
      shareDraft: stuckDraft,
      sourceSignals: [
        { type: "assignment", label: "作业状态", count: assignmentStatus ? 1 : 0 },
        { type: "questions", label: "学习提问", count: questions.length },
        { type: "stuck_signals", label: "卡点记录", count: stuckSignals.length },
        { type: "check_ins", label: "学习状态", count: checkIns.length },
        { type: "teacher_messages", label: "老师回复", count: messages.filter((item) => item.senderRole === "teacher").length }
      ],
      memory: buildMemory(profile, latestStuck, latestCheckIn, latestTeacherMessage),
      privacyNotes: [
        "学生 Agent 只能读取你自己的学习空间，不能看到其他学生。",
        "普通学习解释不会自动发送给老师。",
        "只有你点击分享，整理后的卡点摘要才会进入老师端教学分析和消息中心。",
        "它不会替你完成作业，只会给解释、提示、下一步和求助草稿。"
      ],
      allowedData: [
        "自己的作业状态",
        "自己的学习提问",
        "自己的卡点记录",
        "自己的 Check-in",
        "老师发给自己的消息",
        "老师批准的学习材料"
      ],
      blockedData: [
        "其他学生信息",
        "老师端完整教学分析",
        "学校管理端聚合数据",
        "老师未批准的材料草稿"
      ]
    };
  }

  function answerStudentQuestion(question, briefingInput) {
    const text = clean(question, 600);
    const briefing = briefingInput || buildStudentBriefing({});
    if (!text) {
      return response("你可以问：这张图怎么看？公式里的符号是什么意思？我下一步应该先补哪里？", briefing);
    }

    if (/答案|直接写|帮我写|代写|complete my homework|do my homework/i.test(text)) {
      return response(
        "我不能直接替你完成作业，但可以帮你把题目拆成第一步。先写一句：这题在问同一个信号的哪一种表示？然后我可以继续帮你检查思路。",
        briefing,
        "先写出自己的第一句话"
      );
    }

    if (/老师|分享|发给|求助/.test(text)) {
      return response(
        `可以整理成这样发给老师：${briefing.teacherSignalDraft}`,
        briefing,
        "确认后点击“分享给老师”"
      );
    }

    if (/下一步|先补|计划|怎么学/.test(text)) {
      const first = briefing.nextPlan[0];
      return response(
        `建议先做「${first.action}」：${first.detail}`,
        briefing,
        first.action
      );
    }

    if (/图|图示|左|右|波形|频率图|看/.test(text)) {
      return response(
        "先只看图，不碰公式：左边是同一个信号随时间变化的样子；右边是把它拆成几个简单频率。你现在只需要做一件事：在图上找出“复杂波形”和“简单频率”分别在哪里。",
        briefing,
        "圈出左右两边的对应关系"
      );
    }

    if (/公式|符号|单位|积分/.test(text)) {
      return response(
        "先把公式当成一句话：它在问“每一种频率在这个信号里有多少”。你不用先背完整公式，可以先把每个符号翻译成一句中文。",
        briefing,
        "把一个符号翻译成一句话"
      );
    }

    if (/频域|时域|时间|频率/.test(text)) {
      return response(
        "频域不是把时间变没了，而是换一个角度看同一个信号。时域看“什么时候怎么变化”，频域看“里面有哪些频率成分”。",
        briefing,
        "用自己的话写出时域和频域的区别"
      );
    }

    return response(
      `我会把你的问题先连接到老师发布的主题「${briefing.topic}」。先找关键词，再用一个小例子验证。你现在可以先写出最不确定的一句话，我再帮你拆小。`,
      briefing,
      "写出最不确定的一句话"
    );
  }

  function draftStuckSignal(input, briefingInput) {
    const text = clean(input?.text || input?.note || input?.question || "", 500);
    const profile = briefingInput?.profile || {};
    const topic = briefingInput?.topic || DEFAULT_TOPIC;
    const stuckType = input?.stuckType || inferNeedFromText(text || profile.stuckType || "");
    const specific = text || sentenceForNeed(stuckType);
    const teacherSummary = `我在「${topic}」里主要卡在「${stuckType}」：${specific}`;
    return {
      id: `stuck-draft-${slugFor(stuckType)}`,
      stuckType,
      studentText: specific,
      studentFacing: `我帮你整理成了一个更清楚的卡点：${teacherSummary}`,
      teacherSummary,
      nextStep: nextStepForNeed(stuckType),
      teacherVisiblePreview: teacherSummary,
      consentRequired: true,
      source: "student_agent"
    };
  }

  function response(answer, briefing, nextStep) {
    const shareDraft = draftStuckSignal({ text: answer, stuckType: briefing.profile?.stuckType }, briefing);
    return {
      answer,
      nextStep: nextStep || briefing.nextPlan?.[0]?.action || "先做一个小步骤",
      shareDraft,
      usedSources: briefing.sourceSignals || [],
      privacyNote: "这次回答默认只给你自己看；只有你点击分享，卡点摘要才会发给老师。"
    };
  }

  function buildProfile(context) {
    const supportText = `${context.student?.status || ""} ${context.student?.level || ""} ${context.currentNeed || ""}`;
    const confidence = /已提交|submitted|宸叉彁浜/i.test(context.assignmentStatus)
      ? "已有提交，适合等待老师反馈并继续追问"
      : "还在整理，适合先完成一个低压力草稿";
    return {
      alias: context.alias,
      topic: context.topic,
      level: /Level 1|需要支持|闇/i.test(supportText) ? "需要低门槛支持" : "正在建立理解",
      stuckType: context.currentNeed || "待确认卡点",
      assignmentStatus: context.assignmentStatus,
      confidence,
      chatCount: context.questions.length + context.messages.filter((item) => item.senderRole === "student").length,
      teacherMessageCount: context.messages.filter((item) => item.senderRole === "teacher").length,
      checkInState: context.checkIns[0]?.stateLabel || "未记录"
    };
  }

  function buildNextPlan(profile, latestCheckIn, latestTeacherMessage) {
    const plan = [];
    plan.push({
      action: actionForNeed(profile.stuckType),
      detail: nextStepForNeed(profile.stuckType)
    });
    if (!/已提交|submitted|宸叉彁浜/i.test(profile.assignmentStatus)) {
      plan.push({
        action: "补完作业草稿",
        detail: "先写三句话，不追求一次写完整：我知道什么、我不确定什么、我需要哪个例子。"
      });
    } else {
      plan.push({
        action: "等待老师反馈并追问",
        detail: "如果老师回复了，先按老师给的一个小步骤做，不要同时处理太多问题。"
      });
    }
    plan.push({
      action: latestTeacherMessage ? "阅读老师回复" : "需要时分享卡点",
      detail: latestTeacherMessage
        ? `老师最近说：${clean(latestTeacherMessage.text, 120)}`
        : "只有你确认分享后，老师才会看到整理后的卡点摘要。"
    });
    if (latestCheckIn?.nextLearningStep) {
      plan.push({
        action: "使用 Check-in 下一步",
        detail: latestCheckIn.nextLearningStep
      });
    }
    return plan.slice(0, 3);
  }

  function buildMemory(profile, latestStuck, latestCheckIn, latestTeacherMessage) {
    return [
      `当前主题：${profile.topic}`,
      `当前卡点：${profile.stuckType}`,
      `作业状态：${profile.assignmentStatus}`,
      latestStuck ? `最近卡点说明：${clean(latestStuck.note || latestStuck.stuckType, 120)}` : "还没有新的卡点说明。",
      latestCheckIn ? `最近学习状态：${latestCheckIn.stateLabel || latestCheckIn.state}` : "还没有学习状态记录。",
      latestTeacherMessage ? `老师最近回复：${clean(latestTeacherMessage.text, 120)}` : "还没有新的老师回复。"
    ];
  }

  function recentForAlias(items, alias) {
    return (Array.isArray(items) ? items : [])
      .filter((item) => item.studentAlias === alias)
      .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));
  }

  function inferNeedFromText(text) {
    const value = String(text || "");
    if (/图|图示|左|右|波形|频率图|graph|visual/.test(value)) return "图示没懂";
    if (/公式|符号|单位|积分|symbol|formula/.test(value)) return "公式没懂";
    if (/定义|概念|是什么|到底/.test(value)) return "定义没懂";
    if (/例题|迁移|应用|换一个|自己做/.test(value)) return "例题迁移";
    return "图示没懂";
  }

  function actionForNeed(need) {
    if (/图/.test(need)) return "先看图示对应";
    if (/公式|符号/.test(need)) return "先翻译公式符号";
    if (/定义|概念/.test(need)) return "先建立生活例子";
    if (/例题|迁移/.test(need)) return "先做同构小题";
    return "先拆成一个小问题";
  }

  function nextStepForNeed(need) {
    if (/图/.test(need)) return "只圈出左边复杂波形和右边简单频率，不急着解释完整公式。";
    if (/公式|符号/.test(need)) return "把公式里的一个符号翻译成一句中文，再问下一个符号。";
    if (/定义|概念/.test(need)) return "用声音或音乐的例子解释一次，再回到物理概念。";
    if (/例题|迁移/.test(need)) return "先做一个和例题结构一样、数字或场景稍微变化的小题。";
    return "先写一句最不确定的地方，再让学习伙伴帮你拆小。";
  }

  function sentenceForNeed(need) {
    if (/图/.test(need)) return "我看不出左边波形和右边频率图怎么对应。";
    if (/公式|符号/.test(need)) return "我记得公式，但不知道每个符号在说什么。";
    if (/定义|概念/.test(need)) return "我不知道这个概念到底是什么意思。";
    if (/例题|迁移/.test(need)) return "我能跟例题，但换一个题就不知道第一步。";
    return "我还不能把问题说清楚，需要先整理卡点。";
  }

  function slugFor(value) {
    return String(value || "item")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "item";
  }

  function clean(value, maxLength) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength || 240);
  }

  const api = {
    buildStudentBriefing,
    answerStudentQuestion,
    draftStuckSignal
  };

  global.TeachFlowStudentAgentOrchestrator = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
