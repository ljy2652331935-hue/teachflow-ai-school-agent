(function (global) {
  const STUCK_TYPES = [
    "definition",
    "diagram",
    "formula_meaning",
    "example_transfer",
    "relevance",
    "application"
  ];

  function createUnderstandingMap(input) {
    const memories = input.student_memories || [];
    const topicId = input.topic_id || input.analysis?.topic || "topic-demo";
    const reflections = input.reflections || [];
    const attempts = input.micro_quiz_attempts || [];
    const stuckSignals = input.stuck_signals || [];
    const now = new Date().toISOString();

    return memories.flatMap((memory) => {
      const understoodNodes = (memory.understood || []).map((concept, index) => createNode({
        topicId,
        memory,
        concept,
        status: "understood",
        evidence: evidenceFor(memory, concept, reflections, attempts, stuckSignals, "understood"),
        recommendedAction: index === 0
          ? "让学生在一个简短应用任务中使用这个想法。"
          : "请学生把这个想法连接回本主题。",
        now
      }));

      const supportNodes = (memory.weak_points || []).map((concept) => createNode({
        topicId,
        memory,
        concept,
        status: "needs_support",
        evidence: evidenceFor(memory, concept, reflections, attempts, stuckSignals, "needs_support"),
        recommendedAction: actionForSupport(memory, concept, stuckSignals),
        now
      }));

      if (understoodNodes.length === 0 && supportNodes.length === 0) {
        return [createNode({
          topicId,
          memory,
          concept: "当前理解",
          status: "not_yet_assessed",
          evidence: ["目前还没有收集到足够的学生证据。"],
          recommendedAction: "请学生用自己的话做一个简短解释。",
          now
        })];
      }

      return [...understoodNodes, ...supportNodes];
    });
  }

  function createStuckSignal(input) {
    const stuckType = STUCK_TYPES.includes(input.stuck_type) ? input.stuck_type : "definition";
    return {
      id: `stuck-${Date.now()}-${input.student_alias}`,
      topic_id: input.topic_id,
      student_alias: input.student_alias,
      stuck_type: stuckType,
      free_text: input.free_text || "",
      created_at: new Date().toISOString()
    };
  }

  function summariseClassMap(input) {
    const nodes = input.nodes || [];
    const stuckSignals = input.stuck_signals || [];
    const aliases = [...new Set(nodes.map((node) => node.student_alias))].sort();

    return aliases.map((studentAlias) => {
      const studentNodes = nodes.filter((node) => node.student_alias === studentAlias);
      const latestStuck = stuckSignals.filter((signal) => signal.student_alias === studentAlias).slice(-1)[0];
      return {
        student_alias: studentAlias,
        understood_count: studentNodes.filter((node) => node.status === "understood").length,
        needs_support_count: studentNodes.filter((node) => node.status === "needs_support").length,
        not_yet_assessed_count: studentNodes.filter((node) => node.status === "not_yet_assessed").length,
        latest_stuck_type: latestStuck?.stuck_type || "",
        recommended_next_action: strongestAction(studentNodes)
      };
    });
  }

  function createAlternateExplanation(input) {
    const memory = input.memory || {};
    const assigned = input.assigned_material || {};
    const latestStuck = input.latest_stuck_signal;
    const stuckType = latestStuck?.stuck_type || "definition";
    const style = memory.preferred_explanation_style || "example";
    const base = assigned.material?.explanation || assigned.student_facing_material?.body || "可以把核心想法、可视化模型和一个具体例子连接起来学习这个概念。";

    const templates = {
      definition: `先从普通定义开始：${base}`,
      diagram: "从左到右看图。杂乱的信号是一种视图；分离出来的成分是同一个信号的另一种视图。",
      formula_meaning: "先把公式看成一个想法的压缩描述。每个符号都在帮助说明每种频率成分出现了多少。",
      example_transfer: "换一个新例子：一首歌听起来像一个混合声音，但它包含可以分开讨论的音符和频率。",
      relevance: "先看用途：很多真实系统在我们知道复杂信号内部成分时，会变得更容易理解。",
      application: assigned.material?.challenge || assigned.student_facing_material?.practice_prompt || "选择一个真实信号，并解释频域视图可能揭示什么。"
    };

    return {
      student_alias: memory.student_alias,
      style,
      stuck_type: stuckType,
      explanation: templates[stuckType],
      next_prompt: "用一句话写下你的理解发生了什么变化。"
    };
  }

  function createNode(input) {
    return {
      id: `map-${input.topicId}-${input.memory.student_alias}-${slug(input.concept)}-${input.status}`,
      topic_id: input.topicId,
      student_alias: input.memory.student_alias,
      concept: input.concept,
      status: input.status,
      evidence: unique(input.evidence).slice(0, 4),
      recommended_action: input.recommendedAction,
      preferred_explanation_style: input.memory.preferred_explanation_style || "example",
      updated_at: input.now
    };
  }

  function evidenceFor(memory, concept, reflections, attempts, stuckSignals, status) {
    const studentReflections = reflections.filter((item) => item.student_alias === memory.student_alias);
    const studentAttempts = attempts.filter((item) => item.student_alias === memory.student_alias);
    const studentStuckSignals = stuckSignals.filter((item) => item.student_alias === memory.student_alias);
    const latestReflection = studentReflections.slice(-1)[0];
    const latestAttempt = studentAttempts.slice(-1)[0];
    const latestStuck = studentStuckSignals.slice(-1)[0];
    const evidence = [];

    if (status === "understood") {
      evidence.push(`记忆显示该学生已经可以使用：${concept}。`);
    } else if (status === "needs_support") {
      evidence.push(`记忆显示该学生仍需要支持：${concept}。`);
    }

    if (latestReflection?.response) {
      evidence.push(`最新反思：${latestReflection.response}`);
    }

    if (latestAttempt?.answers?.length) {
      evidence.push(`最新微型测验：${latestAttempt.answers.map((answer) => answer.answer).join(" | ")}`);
    }

    if (latestStuck) {
      evidence.push(`学生卡点信号：${labelForStuckType(latestStuck.stuck_type)}${latestStuck.free_text ? ` - ${latestStuck.free_text}` : ""}`);
    }

    return evidence.length ? evidence : ["当前地图基于诊断和教师批准的学习记忆。"];
  }

  function actionForSupport(memory, concept, stuckSignals) {
    const latestStuck = stuckSignals.filter((signal) => signal.student_alias === memory.student_alias).slice(-1)[0];
    if (latestStuck?.stuck_type === "diagram") {
      return "再次展示可视化图示，并请学生标注每一部分。";
    }
    if (latestStuck?.stuck_type === "formula_meaning") {
      return "把想法桥接到公式中的一个符号，不要从完整方程开始。";
    }
    if (latestStuck?.stuck_type === "relevance") {
      return "从一个实际用例开始，再回到概念。";
    }
    if (concept.includes("application") || concept.includes("应用")) {
      return "使用一个具体应用，并询问学生这个概念在其中为什么重要。";
    }
    return memory.recommended_next_action || "给出一段简短支持性解释，然后请学生用一句话复述。";
  }

  function strongestAction(nodes) {
    const needsSupport = nodes.find((node) => node.status === "needs_support");
    if (needsSupport) return needsSupport.recommended_action;
    const notAssessed = nodes.find((node) => node.status === "not_yet_assessed");
    if (notAssessed) return notAssessed.recommended_action;
    return nodes[0]?.recommended_action || "再收集一条学生解释。";
  }

  function labelForStuckType(stuckType) {
    const labels = {
      definition: "定义",
      diagram: "图示",
      formula_meaning: "公式含义",
      example_transfer: "例题迁移",
      relevance: "重要性",
      application: "应用"
    };
    return labels[stuckType] || stuckType;
  }

  function slug(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "concept";
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  const api = {
    STUCK_TYPES,
    createUnderstandingMap,
    createStuckSignal,
    summariseClassMap,
    createAlternateExplanation
  };

  global.TeachFlowUnderstandingMapEngine = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
