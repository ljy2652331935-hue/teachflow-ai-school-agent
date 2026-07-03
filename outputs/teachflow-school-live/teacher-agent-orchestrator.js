(function (global) {
  const DEFAULT_CLASS_NAME = "当前班级";
  const DEFAULT_TOPIC = "当前主题";
  const outcomeEvaluationEngine = loadOutcomeEvaluationEngine(global);

  function buildTeacherBriefing(input, options) {
    const state = input || {};
    const context = options?.context || state.session || {};
    const students = Array.isArray(state.students) ? state.students : [];
    const assignments = state.assignments || {};
    const aliases = new Set(students.map((student) => student.id));
    const questions = sortRecent(filterByAlias(state.questions, aliases));
    const stuckSignals = sortRecent(filterByAlias(state.stuckSignals, aliases));
    const checkIns = sortRecent(filterByAlias(state.checkIns, aliases));
    const messages = sortRecent(filterByAlias(state.messages, aliases));
    const teacherAgentActions = sortRecent(filterActionsByAlias(state.teacherAgentActions, aliases));
    const className = state.className || state.accessBoundary?.className || DEFAULT_CLASS_NAME;
    const topic = state.topic || DEFAULT_TOPIC;
    const misconceptionClusters = buildMisconceptionClusters(students, stuckSignals, questions);
    const handledAliases = handledAliasesFromActions(teacherAgentActions);
    const studentFocus = buildStudentFocus({
      students,
      assignments,
      stuckSignals,
      questions,
      checkIns,
      messages
    })
      .map((item) => ({
        ...item,
        lastTeacherAgentAction: teacherAgentActions.find((action) => action.studentAlias === item.studentAlias) || null
      }))
      .filter((item) => !handledAliases.has(item.studentAlias));
    const outcomeEvaluation = outcomeEvaluationEngine?.buildOutcomeEvaluation
      ? outcomeEvaluationEngine.buildOutcomeEvaluation(state, { context })
      : emptyOutcomeEvaluation(context, state);
    const sourceSignals = buildSourceSignals(students, assignments, questions, stuckSignals, checkIns, messages, teacherAgentActions, outcomeEvaluation);
    const insight = buildInsight(students, assignments, misconceptionClusters, studentFocus, sourceSignals);
    const interventions = buildInterventions(misconceptionClusters, studentFocus);
    const messageDrafts = buildMessageDrafts(studentFocus, topic);
    const materialDrafts = buildMaterialDrafts(misconceptionClusters, topic);
    const priorityTasks = buildPriorityTasks({
      insight,
      studentFocus,
      misconceptionClusters,
      interventions,
      messageDrafts,
      materialDrafts,
      sourceSignals,
      outcomeEvaluation
    });
    const safetyNotes = [
      "只使用学生别名和学习证据，不写入真实姓名、邮箱、学号或私密账号信息。",
      "所有消息、材料和干预方案都是草稿，必须由老师确认后再发送或发布。",
      "学生 Check-in 只返回老师可见的学习摘要，不暴露完整私密反思。",
      "教师 Agent 做教学支持优先级判断，不做心理诊断、成绩定性或自动处分。"
    ];

    return {
      agentId: "teacher-agent-orchestrator",
      name: "AI 教学助教总控",
      role: "Teacher Copilot Orchestrator",
      generatedAt: new Date().toISOString(),
      className,
      topic,
      session: {
        role: context.role || "teacher",
        classId: context.classId || state.activeClassId || null,
        userId: context.userId || null
      },
      summary: buildSummary(className, topic, insight, priorityTasks),
      insight,
      priorityTasks,
      priorities: priorityTasks.slice(0, 4).map((task) => ({
        title: task.title,
        detail: task.reason,
        target: task.targetLabel
      })),
      misconceptions: misconceptionClusters,
      studentFocus,
      interventions,
      messageDrafts,
      materialDrafts,
      actionHistory: teacherAgentActions.slice(0, 8),
      outcomeEvaluation,
      approvalQueue: [
        ...messageDrafts.map((item) => ({
          id: `approval-message-${item.studentAlias}`,
          type: "student_message",
          title: `给 ${item.studentAlias} 的回复草稿`,
          target: item.studentAlias,
          status: "teacher_review_required"
        })),
        ...materialDrafts.map((item) => ({
          id: `approval-material-${item.id}`,
          type: "material",
          title: item.title,
          target: item.targetLevel,
          status: "teacher_review_required"
        }))
      ],
      sourceSignals,
      toolCalls: [
        toolCall("getClassContext", "读取当前老师 Session 绑定的班级、主题和学生别名范围。"),
        toolCall("getStudentSignals", "汇总作业、提问、卡点、Check-in 和消息记录。"),
        toolCall("runMisconceptionDiagnosis", "按卡点和证据聚类形成主要理解问题。"),
        toolCall("generateInterventionPlan", "把主要问题映射成分层干预和材料草稿。"),
        toolCall("draftTeacherActions", "生成老师下一步任务队列、学生回复和材料制作建议。"),
        toolCall("evaluateLearningOutcomes", "比较老师已批准动作和学生后续学习信号，生成成效回流结论。"),
        toolCall("applySafetyAndPrivacyRules", "检查别名、老师审批、私密反思和非诊断边界。")
      ],
      safetyNotes,
      guardrails: safetyNotes,
      canAutoPublish: false
    };
  }

  function answerTeacherAgentQuestion(question, briefingInput) {
    const text = String(question || "").trim();
    const briefing = briefingInput || buildTeacherBriefing({});
    if (!text) {
      return "你可以问：这节课先处理什么？哪些学生要优先看？应该制作什么材料？有哪些消息可以先回复？";
    }

    if (/学生|优先|跟进|谁|帮助/.test(text)) {
      const focus = briefing.studentFocus.slice(0, 3);
      if (!focus.length) return "目前没有高优先级学生信号，建议继续观察下一轮作业、提问和卡点。";
      return `建议先看 ${focus.map((item) => `${item.studentAlias}（${item.mainNeed}，${item.priorityLabel}）`).join("、")}。先打开学生详情复核证据，再决定是否发送支持消息或材料。`;
    }

    if (/材料|图片|PPT|讲义|练习|制作/.test(text)) {
      const material = briefing.materialDrafts[0];
      if (!material) return "目前还没有足够集中卡点来生成材料建议，可以先收集更多作业或卡点信号。";
      return `建议先做「${material.title}」。目标是 ${material.goal}，适合 ${material.targetLevel}，完成后进入审批导出，不自动发给学生。`;
    }

    if (/消息|回复|聊天|怎么说/.test(text)) {
      const draft = briefing.messageDrafts[0];
      if (!draft) return "目前没有需要优先回复的学生消息。可以等学生提交新的卡点、提问或 Check-in 后再生成草稿。";
      return `可以先给 ${draft.studentAlias} 发送草稿：${draft.text}`;
    }

    if (/依据|数据|为什么|来源/.test(text)) {
      const sources = briefing.sourceSignals.map((item) => `${item.label} ${item.count}`).join("、");
      return `这个简报来自统一数据层：${sources}。总控 Agent 只读取老师当前班级范围内的匿名学习证据。`;
    }

    if (/成效|回流|效果|复盘|改善|有没有用/.test(text)) {
      const outcome = briefing.outcomeEvaluation;
      const next = outcome?.nextTeacherActions?.[0];
      if (!outcome || !outcome.metrics?.actionCount) return "目前还没有老师批准后的动作，所以暂时没有可复盘的学习成效。";
      return `${outcome.summary}${next ? ` 下一步建议：${next.title}，${next.detail}` : " 暂时没有需要立刻处理的回流风险。"} `;
    }

    if (/隐私|安全|边界|自动/.test(text)) {
      return briefing.safetyNotes.join(" ");
    }

    const firstTask = briefing.priorityTasks[0];
    if (!firstTask) return briefing.summary;
    return `${briefing.summary} 我建议第一步先做「${firstTask.title}」：${firstTask.nextStep}`;
  }

  function buildInsight(students, assignments, clusters, focus, sourceSignals) {
    const submittedCount = students.filter((student) => statusLooksSubmitted(assignments[student.id])).length;
    const levelOneCount = students.filter((student) => student.level === "Level 1").length;
    const urgentCount = focus.filter((item) => item.priorityScore >= 5).length;
    const evidenceCount = sourceSignals.reduce((sum, item) => sum + item.count, 0);
    return {
      mainNeed: clusters[0]?.name || "暂无集中卡点",
      urgentCount,
      levelOneCount,
      evidenceCount,
      submittedCount,
      totalStudents: students.length,
      submittedRate: students.length ? Math.round((submittedCount / students.length) * 100) : 0,
      topStudentAlias: focus[0]?.studentAlias || null
    };
  }

  function buildSummary(className, topic, insight, priorityTasks) {
    const mainTask = priorityTasks[0]?.title || "继续收集学习证据";
    return `${className} 正在学习「${topic}」。总控 Agent 看到的主要卡点是「${insight.mainNeed}」，当前有 ${insight.urgentCount} 个优先关注别名，作业提交率约 ${insight.submittedRate}%。建议老师先处理「${mainTask}」，所有输出保持草稿状态。`;
  }

  function buildMisconceptionClusters(students, stuckSignals, questions) {
    const clusterMap = new Map();

    students.forEach((student) => {
      addClusterEvidence(clusterMap, student.stuck || "待观察", {
        studentAlias: student.id,
        source: "student_profile",
        quote: student.evidence || student.memory || "",
        level: student.level || "",
        nextStep: student.next || ""
      });
    });

    stuckSignals.forEach((signal) => {
      addClusterEvidence(clusterMap, signal.stuckType || "学生卡点", {
        studentAlias: signal.studentAlias,
        source: "stuck_signal",
        quote: signal.note || "",
        createdAt: signal.createdAt || null
      });
    });

    questions.forEach((question) => {
      addClusterEvidence(clusterMap, inferNeedFromText(question.text || "学生提问"), {
        studentAlias: question.studentAlias,
        source: "student_question",
        quote: question.text || "",
        createdAt: question.createdAt || null
      });
    });

    return Array.from(clusterMap.entries())
      .map(([name, evidence]) => {
        const aliases = Array.from(new Set(evidence.map((item) => item.studentAlias).filter(Boolean)));
        return {
          id: slugFor(name),
          name,
          studentAliases: aliases,
          count: aliases.length,
          evidenceCount: evidence.filter((item) => item.quote).length,
          representativeEvidence: evidence.find((item) => item.quote)?.quote || "",
          evidence: evidence.slice(0, 5),
          severity: aliases.length >= 3 ? "high" : aliases.length >= 2 ? "medium" : "low"
        };
      })
      .sort((a, b) => b.count - a.count || b.evidenceCount - a.evidenceCount);
  }

  function buildStudentFocus(context) {
    return context.students
      .map((student) => {
        const assignmentStatus = context.assignments[student.id] || "";
        const signals = context.stuckSignals.filter((item) => item.studentAlias === student.id);
        const questions = context.questions.filter((item) => item.studentAlias === student.id);
        const checkIns = context.checkIns.filter((item) => item.studentAlias === student.id);
        const messages = context.messages.filter((item) => item.studentAlias === student.id);
        const lastStudentMessage = messages.find((item) => item.senderRole === "student" || item.kind === "help_request");
        const score = priorityScore(student, assignmentStatus, signals, questions, checkIns, lastStudentMessage);
        const evidence = [
          evidenceItem("学生画像", student.evidence || student.memory),
          evidenceItem("最新卡点", signals[0]?.note || signals[0]?.stuckType),
          evidenceItem("学生提问", questions[0]?.text),
          evidenceItem("共享 Check-in", checkIns[0]?.summaryForTeacher),
          evidenceItem("消息", lastStudentMessage?.text)
        ].filter((item) => item?.quote);
        return {
          studentAlias: student.id,
          priorityScore: score,
          priorityLabel: score >= 6 ? "高优先级" : score >= 3 ? "需要跟进" : "观察",
          level: student.level || "",
          status: student.status || "",
          mainNeed: signals[0]?.stuckType || student.stuck || inferNeedFromText(questions[0]?.text || ""),
          assignmentStatus,
          evidence,
          recommendedAction: recommendedActionFor(student, signals[0], checkIns[0]),
          targetChannel: "analysis"
        };
      })
      .filter((item) => item.priorityScore > 0)
      .sort((a, b) => b.priorityScore - a.priorityScore || a.studentAlias.localeCompare(b.studentAlias));
  }

  function priorityScore(student, assignmentStatus, signals, questions, checkIns, lastStudentMessage) {
    let score = 0;
    const statusText = `${student.status || ""} ${student.level || ""} ${student.stuck || ""}`;
    if (/需要支持|闇|support/i.test(statusText)) score += 3;
    if (student.level === "Level 1") score += 2;
    if (signals.length) score += 2;
    if (questions.length) score += 1;
    if (checkIns.length) score += checkIns[0]?.wellbeingLevel >= 2 ? 3 : 2;
    if (lastStudentMessage) score += lastStudentMessage.kind === "help_request" ? 2 : 1;
    if (!statusLooksSubmitted(assignmentStatus)) score += 1;
    return score;
  }

  function buildInterventions(clusters, focus) {
    return clusters.slice(0, 3).map((cluster) => {
      const focusedAliases = focus
        .filter((item) => cluster.studentAliases.includes(item.studentAlias))
        .slice(0, 5)
        .map((item) => item.studentAlias);
      const targetLevel = levelForCluster(cluster, focus);
      return {
        id: `intervention-${cluster.id}`,
        misconceptionId: cluster.id,
        targetNeed: cluster.name,
        targetLevel,
        targetAliases: focusedAliases.length ? focusedAliases : cluster.studentAliases.slice(0, 5),
        strategy: strategyForNeed(cluster.name, targetLevel),
        teacherAction: "老师复核证据后，可把该干预送入材料制作或消息草稿。",
        approvalRequired: true
      };
    });
  }

  function buildMessageDrafts(focus, topic) {
    return focus.slice(0, 3).map((item) => ({
      id: `message-draft-${item.studentAlias}`,
      studentAlias: item.studentAlias,
      tone: "低压力、具体、只给下一步",
      text: `${item.studentAlias}，我看到你现在主要卡在「${item.mainNeed}」。先不用一次做完整题，先完成一个小动作：${item.recommendedAction}。如果还有一句最不确定的地方，可以继续发给我。`,
      sourceEvidence: item.evidence[0]?.quote || "",
      approvalRequired: true,
      topic
    }));
  }

  function buildMaterialDrafts(clusters, topic) {
    return clusters.slice(0, 3).map((cluster, index) => ({
      id: `material-draft-${cluster.id}`,
      title: `${cluster.name}：${index === 0 ? "5 分钟补救材料" : "短练习草稿"}`,
      type: index === 0 ? "讲义 + 图示" : "分层练习",
      topic,
      targetLevel: cluster.severity === "high" ? "Level 1 / Level 2" : "Level 2",
      goal: `帮助学生把「${cluster.name}」从模糊卡点变成一个可完成的小步骤。`,
      evidenceCount: cluster.evidenceCount,
      approvalRequired: true
    }));
  }

  function buildPriorityTasks(context) {
    const tasks = [];
    const topOutcome = context.outcomeEvaluation?.evaluations?.find((item) => item.status === "needs_followup");
    const topFocus = context.studentFocus[0];
    const topCluster = context.misconceptionClusters[0];

    if (topOutcome) {
      tasks.push(task(
        "outcome",
        "high",
        `复盘 ${topOutcome.studentAlias} 的支持效果`,
        `${topOutcome.studentAlias} 在老师动作后仍有后续卡点或求助信号。`,
        topOutcome.recommendation,
        "看回流"
      ));
    }

    if (topFocus) {
      tasks.push(task(
        "student_support",
        "high",
        `优先跟进 ${topFocus.studentAlias}`,
        `${topFocus.studentAlias} 当前聚合分数最高，主要卡点是「${topFocus.mainNeed}」。`,
        `打开学生详情，复核证据后决定是否发送消息草稿。`,
        "看学生"
      ));
    }

    if (topCluster) {
      tasks.push(task(
        "diagnosis",
        topCluster.severity === "high" ? "high" : "medium",
        `复核「${topCluster.name}」证据`,
        `${topCluster.count} 个别名与该卡点相关，已有 ${topCluster.evidenceCount} 条证据。`,
        "确认它是否真的是本节课最需要处理的共同误解。",
        "看证据"
      ));
    }

    if (context.materialDrafts[0]) {
      tasks.push(task(
        "material",
        "medium",
        `制作 ${context.materialDrafts[0].title}`,
        `材料草稿来自最高频卡点「${context.materialDrafts[0].title}」。`,
        "进入制作材料页，生成后送到审批导出。",
        "制作材料"
      ));
    }

    if (context.messageDrafts.length) {
      tasks.push(task(
        "message",
        "medium",
        `审批 ${context.messageDrafts.length} 条学生回复草稿`,
        "这些草稿来自学生卡点、提问或老师可见 Check-in 摘要。",
        "老师确认语气和内容后，再从消息中心发送。",
        "消息中心"
      ));
    }

    if (!tasks.length) {
      tasks.push(task(
        "monitoring",
        "low",
        "继续观察下一轮信号",
        "当前没有高优先级卡点或消息。",
        "等待学生提交作业、提问、卡点或 Check-in。",
        "继续观察"
      ));
    }

    return tasks;
  }

  function buildSourceSignals(students, assignments, questions, stuckSignals, checkIns, messages, teacherAgentActions, outcomeEvaluation) {
    const submitted = students.filter((student) => statusLooksSubmitted(assignments[student.id])).length;
    return [
      { type: "students", label: "学生画像", count: students.length },
      { type: "assignments", label: "作业提交", count: submitted },
      { type: "questions", label: "学生提问", count: questions.length },
      { type: "stuck_signals", label: "卡点信号", count: stuckSignals.length },
      { type: "check_ins", label: "老师可见 Check-in", count: checkIns.length },
      { type: "messages", label: "师生消息", count: messages.length },
      { type: "teacher_actions", label: "老师动作", count: teacherAgentActions.length },
      { type: "outcomes", label: "成效回流", count: outcomeEvaluation?.metrics?.actionCount || 0 }
    ];
  }

  function recommendedActionFor(student, signal, checkIn) {
    if (checkIn?.recommendedTeacherAction) return checkIn.recommendedTeacherAction;
    const need = signal?.stuckType || student.stuck || "";
    if (/图|图示|graph|visual/i.test(need)) return "先给一张低门槛图示，再让学生只标出两个对应关系";
    if (/公式|符号|definition|定义/i.test(need)) return "先把每个符号翻译成一句话，再做一道低压力判断题";
    if (/迁移|应用|transfer/i.test(need)) return "给一个同构变式题，不要求一次完成完整解答";
    return student.next || "先给一个最小可完成步骤";
  }

  function strategyForNeed(need, targetLevel) {
    if (/图|图示|graph|visual/i.test(need)) return `${targetLevel}：用左右对应图把抽象关系降到可观察。`;
    if (/公式|符号|definition|定义/i.test(need)) return `${targetLevel}：先做符号翻译，再进入公式计算。`;
    if (/迁移|应用|transfer/i.test(need)) return `${targetLevel}：用同构例题桥接到真实情境。`;
    return `${targetLevel}：先给一个具体例子，再给一个最小练习。`;
  }

  function levelForCluster(cluster, focus) {
    const related = focus.filter((item) => cluster.studentAliases.includes(item.studentAlias));
    if (related.some((item) => item.level === "Level 1")) return "Level 1";
    if (related.some((item) => item.level === "Level 2")) return "Level 2";
    return cluster.severity === "high" ? "Level 1 / Level 2" : "Level 2";
  }

  function addClusterEvidence(map, rawName, evidence) {
    const name = String(rawName || "待观察").trim() || "待观察";
    if (!map.has(name)) map.set(name, []);
    map.get(name).push({
      ...evidence,
      quote: cleanText(evidence.quote)
    });
  }

  function inferNeedFromText(text) {
    const value = String(text || "");
    if (/图|图示|graph|visual|频率图|波形/.test(value)) return "图示转换";
    if (/公式|符号|单位|definition|定义/.test(value)) return "公式含义";
    if (/应用|迁移|例题|换/.test(value)) return "迁移应用";
    return "学生提问";
  }

  function task(lane, severity, title, reason, nextStep, targetLabel) {
    return {
      id: `task-${lane}-${slugFor(title)}`,
      lane,
      severity,
      title,
      reason,
      nextStep,
      targetLabel,
      teacherApprovalRequired: true
    };
  }

  function evidenceItem(source, quote) {
    const clean = cleanText(quote);
    return clean ? { source, quote: clean } : null;
  }

  function toolCall(name, purpose) {
    return { name, purpose, status: "completed" };
  }

  function filterActionsByAlias(items, aliases) {
    return (Array.isArray(items) ? items : []).filter((item) => {
      return !item.studentAlias || aliases.has(item.studentAlias);
    });
  }

  function handledAliasesFromActions(actions) {
    const seen = new Set();
    const handled = new Set();
    (actions || []).forEach((action) => {
      if (!action.studentAlias || seen.has(action.studentAlias)) return;
      seen.add(action.studentAlias);
      if (action.type === "dismiss" || action.status === "handled") {
        handled.add(action.studentAlias);
      }
    });
    return handled;
  }

  function filterByAlias(items, aliases) {
    return (Array.isArray(items) ? items : []).filter((item) => aliases.has(item.studentAlias));
  }

  function sortRecent(items) {
    return [...items].sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));
  }

  function statusLooksSubmitted(status) {
    return /已提交|submitted|宸叉彁浜/i.test(String(status || ""));
  }

  function slugFor(value) {
    return String(value || "item")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "item";
  }

  function cleanText(value) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, 240);
  }

  function loadOutcomeEvaluationEngine(globalRef) {
    if (globalRef.TeachFlowOutcomeEvaluationEngine) return globalRef.TeachFlowOutcomeEvaluationEngine;
    if (typeof require !== "undefined") {
      try {
        return require("./outcome-evaluation-engine.js");
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function emptyOutcomeEvaluation(context, state) {
    return {
      engineId: "outcome-evaluation-engine",
      generatedAt: new Date().toISOString(),
      classId: context.classId || state.activeClassId || null,
      summary: "成效回流引擎暂未加载。",
      metrics: {
        actionCount: 0,
        improvedCount: 0,
        needsFollowupCount: 0,
        monitoringCount: 0,
        waitingSignalCount: 0
      },
      evaluations: [],
      nextTeacherActions: [],
      sourceSignals: [],
      guardrails: []
    };
  }

  const api = {
    buildTeacherBriefing,
    answerTeacherAgentQuestion
  };

  global.TeachFlowTeacherAgentOrchestrator = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
