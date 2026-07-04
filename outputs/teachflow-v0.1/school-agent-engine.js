(function (global) {
  function evaluateSystemState(input) {
    const analysis = input.analysis;
    const intervention = input.intervention;
    const memories = input.student_memories || [];
    const assignments = input.student_assignments || [];
    const mapNodes = input.understanding_map_nodes || [];
    const stuckSignals = input.stuck_signals || [];
    const audit = input.audit || [];
    const exportPackages = input.export_packages || [];
    const priorities = buildPriorities({
      analysis,
      intervention,
      interventionStatus: input.intervention_status || "draft",
      memories,
      assignments,
      mapNodes,
      stuckSignals,
      audit,
      exportPackages
    });

    return {
      agent_id: "teachflow-school-agent",
      mode: "学校试用 Copilot",
      generated_at: new Date().toISOString(),
      readiness_level: readinessLevel(input),
      summary: summaryFor(input, priorities),
      priorities,
      guardrails: [
        "AI 输出在教师批准前始终只是草稿。",
        "学生数据只使用别名。",
        "理解地图是临时学习状态，不是成绩。",
        "学生门户不提供开放式聊天机器人。",
        "学校层面的洞察在管理使用前应先做聚合处理。"
      ],
      next_best_action: priorities[0]?.next_step || "再收集一个课堂学习信号。"
    };
  }

  function buildMorningBrief(input) {
    const state = evaluateSystemState(input);
    const lines = [
      `TeachFlow Agent 简报 - ${state.readiness_level}`,
      "",
      state.summary,
      "",
      "最高优先级：",
      ...state.priorities.slice(0, 4).map((item, index) => `${index + 1}. [${item.lane}] ${item.action} - ${item.next_step}`),
      "",
      "安全边界：",
      ...state.guardrails.map((item) => `- ${item}`)
    ];

    return lines.join("\n");
  }

  function readinessLevel(input) {
    if (!input.analysis) return "setup";
    if (!input.intervention) return "diagnosis_ready";
    if (!["approved", "exported", "published"].includes(input.intervention_status)) return "teacher_review";
    if (!(input.student_assignments || []).length) return "approved_materials";
    if (!(input.understanding_map_nodes || []).length) return "student_support_ready";
    return "pilot_ready";
  }

  function summaryFor(input, priorities) {
    const className = input.workspace?.class?.name || "这个班级";
    const topic = input.workspace?.topic?.title || input.intervention?.topic || input.analysis?.topic || "当前主题";
    const aliasCount = new Set([
      ...((input.student_memories || []).map((item) => item.student_alias)),
      ...((input.student_assignments || []).map((item) => item.student_alias))
    ]).size;
    const mainPriority = priorities[0]?.action || "收集下一个学习信号。";
    return `${className} 正在为 ${topic} 做试用准备。目前有 ${aliasCount} 个匿名别名拥有学习状态数据。Agent 主要建议：${mainPriority}`;
  }

  function buildPriorities(context) {
    const priorities = [];

    if (!context.analysis) {
      priorities.push(priority("teacher_workflow", "high", "运行误解诊断", "还没有生成分析。", "前往“学生回答”，分析匿名回答。"));
    }

    if (context.analysis && !context.intervention) {
      priorities.push(priority("teacher_workflow", "high", "生成分层干预", "已有诊断，但还没有干预草稿。", "打开“干预生成器”，生成教学材料。"));
    }

    if (context.intervention && !["approved", "exported", "published"].includes(context.interventionStatus)) {
      priorities.push(priority("teacher_control", "high", "批准或编辑干预", `当前干预状态为 ${context.interventionStatus}。`, "在发布给学生前使用“复核与审批工作台”。"));
    }

    if (["approved"].includes(context.interventionStatus) && context.exportPackages.length === 0) {
      priorities.push(priority("teacher_control", "medium", "准备导出包", "已批准内容还没有导出。", "准备 Markdown 导出，供教师复核和复用。"));
    }

    if (["exported"].includes(context.interventionStatus) && context.assignments.length === 0) {
      priorities.push(priority("student_support", "high", "向学生发布已批准材料", "还没有学生门户任务。", "批准并导出后发布到学生门户 Lite。"));
    }

    if (context.memories.length > 0 && context.mapNodes.length === 0) {
      priorities.push(priority("student_support", "high", "建立学生理解地图", "已有学生记忆，但还没有生成地图节点。", "打开“理解地图”，建立别名级支持地图。"));
    }

    const needsSupportCount = context.mapNodes.filter((node) => node.status === "needs_support").length;
    if (needsSupportCount > 0) {
      priorities.push(priority("student_support", "medium", "为需支持节点分配下一步", `${needsSupportCount} 个理解地图节点需要支持。`, "使用班级地图为选定别名分配下一步行动。"));
    }

    if (context.stuckSignals.length > 0) {
      priorities.push(priority("student_voice", "medium", "复核学生卡点信号", `已提交 ${context.stuckSignals.length} 个卡点信号。`, "使用卡点信号选择替代表达和下一步行动。"));
    }

    const hasPrivacyAudit = context.audit.some((entry) => /alias|anonym|别名|匿名/i.test(`${entry.details || ""} ${entry.text || ""}`));
    if (!hasPrivacyAudit) {
      priorities.push(priority("pilot_safety", "low", "检查隐私措辞", "最近的审计项没有明确提到别名或匿名安全边界。", "确认试用说明仍写明只用别名、不使用个人数据。"));
    }

    if (priorities.length === 0) {
      priorities.push(priority("pilot_readiness", "low", "进行真实班级彩排", "核心流程在演示状态下看起来已经就绪。", "使用一个匿名真实班级样本，并记录教师反馈。"));
    }

    return priorities;
  }

  function priority(lane, severity, action, evidence, nextStep) {
    return {
      id: `priority-${lane}-${String(action).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "item"}`,
      lane,
      severity,
      action,
      evidence,
      next_step: nextStep
    };
  }

  const api = {
    evaluateSystemState,
    buildMorningBrief
  };

  global.TeachFlowSchoolAgentEngine = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
