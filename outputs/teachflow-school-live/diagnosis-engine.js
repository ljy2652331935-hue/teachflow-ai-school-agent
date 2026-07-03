(function (global) {
  function parseQuizResponses(raw) {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.toLowerCase().startsWith("student"))
      .map(parseCsvLine)
      .filter(Boolean)
      .filter((response) => /^S\d{3}$/.test(response.student_alias));
  }

  function parseCsvLine(line) {
    const cells = [];
    let cell = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cells.push(cell.trim());
        cell = "";
      } else {
        cell += char;
      }
    }

    cells.push(cell.trim());

    if (cells.length < 2) return null;

    return {
      student_alias: cells[0],
      answer: cells[1],
      confidence: cells[2] ? Number(cells[2]) : undefined
    };
  }

  function diagnoseUnderstanding(input) {
    const responses = input.quiz_responses || [];
    const topic = input.topic || "未命名主题";
    const misconceptions = buildMisconceptions(responses);
    const studentLevels = classifyStudentLevels(responses);

    return {
      analysis_run_id: `analysis-${Date.now()}`,
      topic,
      class_understanding_summary: buildClassSummary(topic, responses, misconceptions),
      student_levels: studentLevels,
      misconceptions,
      teacher_summary: buildTeacherSummary(misconceptions)
    };
  }

  function buildMisconceptions(responses) {
    const definitions = [
      {
        id: "formula-only",
        title: "把傅里叶变换只理解成公式",
        description: "学生似乎记得公式或方程，但还没有把傅里叶变换理解成一种表示方式的转换。",
        severity: "high",
        match: (answer) => /\bformula\b|\bequation\b|\bremember\b|公式|方程|记得/i.test(answer),
        why: "这说明学生可能在回忆符号，但还没有形成概念模型。",
        likely_root_cause: "学生可能在建立视觉直觉或表示转换直觉之前，先接触了形式化方程。",
        teaching_need: "把傅里叶变换解释成表示方式的转换，而不只是数学公式。",
        recommended_next_action: "先使用棱镜类比和波形分解图，再回到方程。"
      },
      {
        id: "time-frequency-without-intuition",
        title: "知道时域到频域，但缺少直觉",
        description: "学生使用了转换语言，但还没有解释频域视图到底揭示了什么。",
        severity: "medium",
        match: (answer) => /time.*frequency|frequency.*time|changes? a signal|another signal|don't know why|dont know why|时间.*频率|时域.*频域|变成|另一个信号|不知道为什么/i.test(answer),
        why: "这个回答说出了转换，但没有解释它的目的或意义。",
        likely_root_cause: "学生知道术语，但还不能想象这种转换能揭示信号内部的什么信息。",
        teaching_need: "展示复杂信号如何分解成更简单的频率成分。",
        recommended_next_action: "使用音乐例子：一首歌听起来像一个整体信号，但里面包含许多音符和频率。"
      },
      {
        id: "relevance-gap",
        title: "看不出傅里叶变换为什么重要",
        description: "学生还没有把频率表示和真实科学或工程应用连接起来。",
        severity: "medium",
        match: (answer) => /why.*matters?|matters?.*why|relevance|physics|useful|application|为什么重要|有什么关系|物理|应用|有用/i.test(answer),
        why: "这个回答直接质疑了概念的价值或应用场景。",
        likely_root_cause: "课程可能还没有把概念连接到学生熟悉的应用。",
        teaching_need: "把傅里叶变换连接到音乐、MRI、图像压缩、信号处理和量子力学等应用。",
        recommended_next_action: "展示一个具体应用，让学生看到频域表示能揭示时域信号隐藏的信息。"
      }
    ];

    return definitions
      .map((definition) => {
        const matches = responses.filter((response) => definition.match(response.answer));
        if (matches.length === 0) return null;

        return {
          id: definition.id,
          title: definition.title,
          description: definition.description,
          severity: definition.severity,
          affected_students: matches.map((response) => response.student_alias),
          evidence_quotes: matches.map((response) => ({
            student_alias: response.student_alias,
            quote: response.answer,
            why_it_matters: definition.why
          })),
          likely_root_cause: definition.likely_root_cause,
          teaching_need: definition.teaching_need,
          recommended_next_action: definition.recommended_next_action
        };
      })
      .filter(Boolean);
  }

  function classifyStudentLevels(responses) {
    const levels = {
      confused: [],
      partially_understood: [],
      ready_to_apply: []
    };

    responses.forEach((response) => {
      const answer = response.answer.toLowerCase();
      const confidence = Number(response.confidence || 0);
      const hasStrongFrequencyIdea = /frequency domain|frequencies are inside|splitting music|different frequencies|频域|信号里面有哪些频率|不同频率|拆成不同频率/.test(answer);
      const hasPartialIdea = /frequency|decomposes|simple waves|notes|time|频率|分解|简单波|音符|时间|时域/.test(answer);
      const flagsConfusion = /just a formula|don't understand|dont understand|don't know why|dont know why|changes a signal|matters|只是.*公式|不理解|不知道为什么|另一个信号|有什么关系/.test(answer);

      if (hasStrongFrequencyIdea && confidence >= 4 && !flagsConfusion) {
        levels.ready_to_apply.push(response.student_alias);
      } else if (hasPartialIdea && confidence >= 3 && !/just a formula/.test(answer)) {
        levels.partially_understood.push(response.student_alias);
      } else {
        levels.confused.push(response.student_alias);
      }
    });

    return levels;
  }

  function buildClassSummary(topic, responses, misconceptions) {
    const total = responses.length;
    const misconceptionCount = misconceptions.length;
    const evidenceCount = misconceptions.reduce((sum, item) => sum + item.evidence_quotes.length, 0);

    if (total === 0) {
      return `还没有为 ${topic} 提供匿名学生回答。`;
    }

    return `这个班级对 ${topic} 已经有部分理解。${total} 份匿名回答中有 ${evidenceCount} 份提供了证据，指向 ${misconceptionCount} 类误解模式。部分学生能把概念和频率联系起来，但仍需要更清晰的“表示方式转换”心智模型。`;
  }

  function buildTeacherSummary(misconceptions) {
    if (misconceptions.length === 0) {
      return "当前回答中没有检测到强误解模式。建议先查看个别回答，并在设计教学干预前补充更多学生回答。";
    }

    const highest = misconceptions.find((item) => item.severity === "high") || misconceptions[0];
    return `建议先处理“${highest.title}”。备课时使用下方证据原句，再选择推荐的下一步教学动作，然后生成分层材料。`;
  }

  function validateAnalysis(analysis, sourceResponses) {
    const quotes = new Set(sourceResponses.map((response) => response.answer));
    const issues = [];

    analysis.misconceptions.forEach((misconception) => {
      if (!misconception.evidence_quotes || misconception.evidence_quotes.length === 0) {
        issues.push(`${misconception.id} 没有证据原句。`);
      }

      misconception.evidence_quotes.forEach((evidence) => {
        if (!quotes.has(evidence.quote)) {
          issues.push(`${misconception.id} 包含的证据不是学生原句。`);
        }
      });
    });

    return {
      valid: issues.length === 0,
      issues
    };
  }

  const api = {
    parseQuizResponses,
    diagnoseUnderstanding,
    validateAnalysis
  };

  global.TeachFlowDiagnosisEngine = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
