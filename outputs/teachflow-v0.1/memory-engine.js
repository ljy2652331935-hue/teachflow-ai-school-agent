(function (global) {
  const LEVELS = ["confused", "partially_understood", "ready_to_apply"];

  function generateStudentMemories(input) {
    const analysis = input.analysis;
    const intervention = input.intervention;
    const previousMemories = input.previous_memories || [];
    const topicId = input.topic_id || analysis?.topic || "topic-demo";
    const aliases = collectAliases(analysis);
    const now = new Date().toISOString();

    return aliases.map((studentAlias) => {
      const level = levelForStudent(analysis, studentAlias);
      const misconceptions = misconceptionsForStudent(analysis, studentAlias);
      const previous = previousMemories.find((memory) => memory.student_alias === studentAlias);

      return {
        id: previous?.id || `memory-${topicId}-${studentAlias}`,
        topic_id: topicId,
        student_alias: studentAlias,
        current_level: level,
        understood: understoodFor(level, misconceptions),
        weak_points: weakPointsFor(misconceptions, level),
        misconception_ids: misconceptions.map((misconception) => misconception.id),
        preferred_explanation_style: preferredStyleFor(misconceptions),
        recommended_next_action: recommendedActionFor(level, misconceptions, intervention),
        last_updated_at: now
      };
    });
  }

  function parseMicroQuizResponses(raw) {
    if (!raw || !raw.trim()) return [];

    return raw
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => splitCsvLine(line))
      .filter((parts) => parts.length >= 2)
      .map((parts) => ({
        student_alias: parts[0].trim(),
        answer: parts.slice(1).join(",").trim().replace(/^"|"$/g, "")
      }))
      .filter((response) => /^S\d{3}$/.test(response.student_alias));
  }

  function analyseMicroQuizAnswers(input) {
    const responses = Array.isArray(input.responses) ? input.responses : parseMicroQuizResponses(input.raw_responses || "");
    const analysis = input.analysis;
    const intervention = input.intervention;
    const existingMemories = input.existing_memories || generateStudentMemories({ analysis, intervention });
    const updates = responses.map((response) => analyseSingleAnswer(response, existingMemories, analysis, intervention));
    const updateMap = new Map(updates.map((update) => [update.student_alias, update]));

    const studentMemories = existingMemories.map((memory) => {
      const update = updateMap.get(memory.student_alias);
      if (!update) return memory;

      return {
        ...memory,
        current_level: update.new_level,
        understood: unique([...memory.understood, ...update.understood]),
        weak_points: update.remaining_weak_points,
        recommended_next_action: update.recommended_next_action,
        last_updated_at: new Date().toISOString()
      };
    });

    return {
      followup_summary: buildFollowupSummary(updates),
      student_updates: updates,
      next_teaching_recommendation: nextTeachingRecommendation(updates),
      student_memories: studentMemories
    };
  }

  function collectAliases(analysis) {
    const fromLevels = LEVELS.flatMap((level) => analysis?.student_levels?.[level] || []);
    const fromMisconceptions = (analysis?.misconceptions || []).flatMap((misconception) => misconception.affected_students || []);
    return unique([...fromLevels, ...fromMisconceptions]).sort();
  }

  function levelForStudent(analysis, studentAlias) {
    return LEVELS.find((level) => (analysis?.student_levels?.[level] || []).includes(studentAlias)) || "partially_understood";
  }

  function misconceptionsForStudent(analysis, studentAlias) {
    return (analysis?.misconceptions || []).filter((misconception) => (misconception.affected_students || []).includes(studentAlias));
  }

  function understoodFor(level, misconceptions) {
    if (level === "ready_to_apply") {
      return ["频域视图可以揭示信号内部的组成成分", "傅里叶变换不只是记公式，它能帮助理解信号结构"];
    }

    if (level === "partially_understood") {
      return ["傅里叶变换与时间和频率有关", "同一个信号可以用不止一种方式表示"];
    }

    if (misconceptions.some((misconception) => misconception.id === "formula-only")) {
      return ["能识别傅里叶变换的术语和公式符号"];
    }

    return ["已经开始接触本主题的基本语言"];
  }

  function weakPointsFor(misconceptions, level) {
    const points = misconceptions.flatMap((misconception) => {
      if (misconception.id === "formula-only") return ["公式背后的意义"];
      if (misconception.id === "time-frequency-without-intuition") return ["可视化直觉", "表示方式转换"];
      if (misconception.id === "relevance-gap") return ["真实应用动机"];
      return [misconception.likely_root_cause || misconception.title];
    });

    if (points.length > 0) return unique(points);
    return level === "ready_to_apply" ? ["形式化符号连接"] : ["概念信心"];
  }

  function preferredStyleFor(misconceptions) {
    const ids = misconceptions.map((misconception) => misconception.id);
    if (ids.includes("time-frequency-without-intuition")) return "visual";
    if (ids.includes("relevance-gap")) return "application";
    if (ids.includes("formula-only")) return "analogy";
    return "example";
  }

  function recommendedActionFor(level, misconceptions, intervention) {
    const ids = misconceptions.map((misconception) => misconception.id);

    if (level === "ready_to_apply") {
      return intervention?.differentiated_materials?.level_3_ready_to_apply?.challenge || "布置一个应用挑战，让学生解释频率表示揭示了什么。";
    }

    if (ids.includes("time-frequency-without-intuition")) {
      return "使用波形分解图，让学生标注时域和频域。";
    }

    if (ids.includes("formula-only")) {
      return intervention?.differentiated_materials?.level_1_confused?.task || "先使用棱镜类比，再把类比连接回公式中的一个部分。";
    }

    if (ids.includes("relevance-gap")) {
      return "从一个具体应用开始，例如音乐分析、图像压缩、MRI 或量子力学。";
    }

    return "使用一段简短解释，然后让学生用一句话总结。";
  }

  function analyseSingleAnswer(response, existingMemories, analysis, intervention) {
    const answer = response.answer.toLowerCase();
    const previousMemory = existingMemories.find((memory) => memory.student_alias === response.student_alias);
    const usesRepresentationLanguage = /same signal|represent|representation|time domain|frequency domain|同一个信号|表示|时域|频域/.test(answer);
    const identifiesComponents = /component|frequency|frequencies|decompos|sine|notes|成分|频率|分解|正弦|音符/.test(answer);
    const application = /music|image|mri|quantum|compression|application|音乐|图像|量子|压缩|应用/.test(answer);

    let newLevel = "confused";
    if ((usesRepresentationLanguage && identifiesComponents) || (identifiesComponents && application)) {
      newLevel = "ready_to_apply";
    } else if (usesRepresentationLanguage || identifiesComponents) {
      newLevel = "partially_understood";
    }

    const remainingWeakPoints = remainingWeakPointsFor(newLevel, previousMemory);

    return {
      student_alias: response.student_alias,
      new_level: newLevel,
      evidence: response.answer,
      understood: understoodFromAnswer(response.answer, newLevel),
      remaining_weak_points: remainingWeakPoints,
      recommended_next_action: recommendedActionAfterQuiz(newLevel, remainingWeakPoints, intervention)
    };
  }

  function understoodFromAnswer(answer, level) {
    if (level === "ready_to_apply") {
      return ["能解释信号内部包含频率成分"];
    }

    if (level === "partially_understood") {
      return ["能把傅里叶变换和时间/频率语言连接起来"];
    }

    return ["需要借助具体表示方式再尝试一次"];
  }

  function remainingWeakPointsFor(level, previousMemory) {
    if (level === "ready_to_apply") return ["形式化符号"];
    if (level === "partially_understood") return (previousMemory?.weak_points || ["可视化直觉"]).slice(0, 2);
    return previousMemory?.weak_points || ["表示方式转换", "真实应用动机"];
  }

  function recommendedActionAfterQuiz(level, weakPoints, intervention) {
    if (level === "ready_to_apply") {
      return "把学生的解释连接到形式化符号中的一个符号。";
    }

    if (weakPoints.includes("visual intuition") || weakPoints.includes("可视化直觉")) {
      return "再次使用波形分解图，并让学生画出带标签的草图。";
    }

    return intervention?.student_facing_material?.practice_prompt || "使用学生讲义，并要求学生写一段简短解释。";
  }

  function buildFollowupSummary(updates) {
    if (updates.length === 0) return "还没有分析任何后续微型测验回答。";

    const readyCount = updates.filter((update) => update.new_level === "ready_to_apply").length;
    const partialCount = updates.filter((update) => update.new_level === "partially_understood").length;
    const confusedCount = updates.filter((update) => update.new_level === "confused").length;
    return `根据后续微型测验，${readyCount} 名学生已经准备应用，${partialCount} 名学生处于部分理解，${confusedCount} 名学生仍需要支持性重教。`;
  }

  function nextTeachingRecommendation(updates) {
    if (updates.length === 0) return "粘贴匿名微型测验回答，以更新学生记忆。";

    const remainingVisual = updates.some((update) => update.remaining_weak_points.includes("visual intuition") || update.remaining_weak_points.includes("可视化直觉"));
    if (remainingVisual) {
      return "用五分钟把类比重新连接到波形分解图。";
    }

    const remainingNotation = updates.some((update) => update.remaining_weak_points.includes("formal notation") || update.remaining_weak_points.includes("形式化符号"));
    if (remainingNotation) {
      return "用一个例题把学生解释桥接到形式化符号。";
    }

    return "进入一个简短应用任务，并继续从学生解释中收集证据。";
  }

  function splitCsvLine(line) {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current);
    return values;
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  const api = {
    generateStudentMemories,
    parseMicroQuizResponses,
    analyseMicroQuizAnswers
  };

  global.TeachFlowMemoryEngine = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
