(function (global) {
  function generateIntervention(input) {
    const analysis = input.analysis;
    const learningObjectives = input.learning_objectives || [];
    const lessonMaterial = input.lesson_material || "";
    const topic = analysis?.topic || input.topic || "Untitled topic";
    const misconceptions = analysis?.misconceptions || [];
    const levels = analysis?.student_levels || {
      confused: [],
      partially_understood: [],
      ready_to_apply: []
    };
    const targetIds = misconceptions.map((misconception) => misconception.id);

    const intervention = {
      intervention_id: `intervention-${Date.now()}`,
      source_analysis_run_id: analysis?.analysis_run_id || "analysis-not-generated",
      topic,
      intervention_summary: buildSummary(topic, misconceptions),
      target_misconceptions: targetIds,
      revised_teaching_plan: buildTeachingPlan(misconceptions),
      differentiated_materials: buildDifferentiatedMaterials(levels, misconceptions),
      visual_aid: buildVisualAid(misconceptions),
      video_storyboard: buildVideoStoryboard(topic),
      micro_quiz: buildMicroQuiz(misconceptions),
      teacher_notes: buildTeacherNotes(misconceptions, learningObjectives, lessonMaterial),
      student_facing_material: buildStudentFacingMaterial(topic, misconceptions),
      export_markdown: ""
    };

    intervention.export_markdown = buildMarkdown(intervention);
    return intervention;
  }

  function buildSummary(topic, misconceptions) {
    if (misconceptions.length === 0) {
      return `没有检测到关于 ${topic} 的强误解模式。可以把本干预作为轻量理解检查，而不是完整重教。`;
    }

    return `本干预帮助教师基于 ${topic} 的诊断结果，形成修订后的教学流程、分层学生材料、可视化提示和微型测验。`;
  }

  function buildTeachingPlan(misconceptions) {
    return {
      rationale: "原来的公式优先讲法需要调整，因为多名学生在进入形式化符号前，先需要建立“表示方式转换”的直觉。",
      steps: [
        {
          step_number: 1,
          title: "用好奇问题开场",
          teacher_action: "提问：为什么一首歌、一张图像和一个量子波都可以通过频率来研究？",
          student_action: "预测频率视角可能揭示哪些隐藏信息。",
          linked_misconception_ids: idsFor(misconceptions, ["relevance-gap", "time-frequency-without-intuition"])
        },
        {
          step_number: 2,
          title: "使用音乐和棱镜类比",
          teacher_action: "把音乐呈现为许多频率混合在一起，并用棱镜类比说明如何把复杂整体分解成组成部分。",
          student_action: "用一句话说明每个类比中被“分开”的是什么。",
          linked_misconception_ids: idsFor(misconceptions, ["formula-only", "time-frequency-without-intuition"])
        },
        {
          step_number: 3,
          title: "可视化展示波形分解",
          teacher_action: "画出一个复杂波形，并展示它可以看作多个简单正弦波的叠加。",
          student_action: "标注哪一边是时域视图，哪一边是频域视图。",
          linked_misconception_ids: idsFor(misconceptions, ["time-frequency-without-intuition"])
        },
        {
          step_number: 4,
          title: "回到形式化定义",
          teacher_action: "把傅里叶变换介绍为：用频率成分来表示同一个信号。",
          student_action: "把定义中的一个符号或术语连接回刚才的可视化模型。",
          linked_misconception_ids: idsFor(misconceptions, ["formula-only"])
        },
        {
          step_number: 5,
          title: "进行微型测验",
          teacher_action: "先用概念题而不是计算题，检查学生是否能解释表示方式的转换。",
          student_action: "先独立作答，再和同伴比较答案。",
          linked_misconception_ids: misconceptions.map((item) => item.id)
        }
      ]
    };
  }

  function buildDifferentiatedMaterials(levels, misconceptions) {
    return {
      level_1_confused: {
        target_students: levels.confused || [],
        goal: "在回到方程前，先建立具体的心智模型。",
        explanation: "一个复杂信号在时间中看起来可能像一条杂乱的波，但它可能由许多更简单、重复的波组成。傅里叶变换帮助我们用信号内部的频率成分来描述同一个信号。",
        analogy: "可以类比为棱镜把白光分成不同颜色。傅里叶变换并不是真的棱镜，但它同样帮助我们把复杂信号分解成频率成分。",
        task: "用棱镜类比解释傅里叶变换，然后说出这个类比没有覆盖到的一点。",
        linked_misconception_ids: idsFor(misconceptions, ["formula-only", "time-frequency-without-intuition"])
      },
      level_2_partially_understood: {
        target_students: levels.partially_understood || [],
        goal: "把学生熟悉的关键词连接到“改变表示方式”的核心思想。",
        explanation: "时域展示信号每一刻如何变化。频域展示哪些重复模式构成了这个信号。傅里叶变换连接了同一个信号的这两种表示方式。",
        concept_bridge: "不要说“它把时间变成频率”。更准确的说法是：它不用随时间变化的数值来表示信号，而是用频率成分表示同一个信号。",
        task: "左边画时域，右边画频域，并写出每种视图告诉了我们什么。",
        linked_misconception_ids: idsFor(misconceptions, ["time-frequency-without-intuition", "formula-only"])
      },
      level_3_ready_to_apply: {
        target_students: levels.ready_to_apply || [],
        goal: "把频率表示应用到新领域。",
        challenge: "选择 MRI、图像压缩、音乐分析或量子力学，解释哪些信息在频率表示中更容易看见。",
        cross_domain_connections: [
          "音乐分析：识别构成声音的频率。",
          "图像压缩：用模式表示图像，从而减少不重要的细节。",
          "MRI：使用与频率相关的信号重建空间信息。",
          "量子力学：用组成模式描述类似波的状态。"
        ],
        linked_misconception_ids: idsFor(misconceptions, ["relevance-gap", "time-frequency-without-intuition"])
      }
    };
  }

  function buildVisualAid(misconceptions) {
    return {
      image_prompt: "生成一张清晰的教学图：左侧是复杂波形，中间是标注为“傅里叶变换”的类比棱镜，右侧是若干简单正弦波。使用清晰箭头和少量文字。",
      diagram_description: "左侧：复杂的时域波形。中间：标注为傅里叶变换的步骤，用棱镜作为类比。右侧：分离出的正弦波，标注为频率成分。",
      labels: ["时域", "复杂信号", "傅里叶变换", "频域", "频率成分"],
      linked_misconception_ids: idsFor(misconceptions, ["formula-only", "time-frequency-without-intuition"])
    };
  }

  function buildVideoStoryboard(topic) {
    return [
      {
        scene_number: 1,
        description: "屏幕上出现一段杂乱波形，同时用可视化方式表现一小段音乐。",
        narration: `这是观察 ${topic} 的一种方式：看信号如何随时间变化。`
      },
      {
        scene_number: 2,
        description: "这个波形被分解成三个不同频率的简单正弦波。",
        narration: "同一个信号也可以用构成它的重复模式来描述。"
      },
      {
        scene_number: 3,
        description: "屏幕左侧显示时域，右侧显示频域。",
        narration: "傅里叶变换连接了同一个信号的这两种表示。"
      }
    ];
  }

  function buildMicroQuiz(misconceptions) {
    return [
      {
        question: "如果一首歌是许多音符混合在一起，傅里叶变换能帮助我们识别什么？",
        purpose: "检查学生是否理解把复杂信号分解成频率成分。",
        expected_understanding: "它能帮助识别复杂声音内部的频率或组成成分。",
        linked_misconception_ids: idsFor(misconceptions, ["time-frequency-without-intuition"])
      },
      {
        question: "为什么棱镜类比有用？为什么它只是一个类比？",
        purpose: "检查学生能否使用类比，同时不把类比当成字面事实。",
        expected_understanding: "二者都把复杂整体分解成组成部分，但傅里叶变换是数学变换，不是真实的物理棱镜。",
        linked_misconception_ids: idsFor(misconceptions, ["formula-only"])
      },
      {
        question: "时域和频域有什么区别？",
        purpose: "检查学生是否理解表示方式转换的核心思想。",
        expected_understanding: "时域显示信号如何随时间变化；频域显示哪些频率成分构成这个信号。",
        linked_misconception_ids: idsFor(misconceptions, ["time-frequency-without-intuition"])
      },
      {
        question: "陷阱题：傅里叶变换只是一个公式吗？请解释为什么。",
        purpose: "检查“只把它看成公式”的误解是否被处理。",
        expected_understanding: "不是。公式只是表示方式转换的一种形式化表达。",
        linked_misconception_ids: idsFor(misconceptions, ["formula-only"])
      }
    ];
  }

  function buildTeacherNotes(misconceptions, learningObjectives, lessonMaterial) {
    return [
      {
        note: "不要太早重新引入公式。",
        why_it_matters: "有些学生已经记得方程但缺少直觉，再次从公式开始可能会强化同一个误解。",
        linked_misconception_ids: idsFor(misconceptions, ["formula-only"])
      },
      {
        note: "持续使用“表示方式转换”的语言。",
        why_it_matters: "说“把时间变成频率”容易让学生误以为时间本身改变了。更准确的说法是：用频率成分表示同一个信号。",
        linked_misconception_ids: idsFor(misconceptions, ["time-frequency-without-intuition"])
      },
      {
        note: "在测验前连接一个真实应用。",
        why_it_matters: "关于“为什么重要”的误解需要具体应用，而不是更长的抽象定义。",
        linked_misconception_ids: idsFor(misconceptions, ["relevance-gap"])
      },
      {
        note: `保持教学干预与 ${learningObjectives.length || "已有"} 个学习目标及原始材料一致。`,
        why_it_matters: lessonMaterial ? "生成的干预应该支持原课，而不是用无关拓展替代原课。" : "生成的干预应该紧扣教师原本设定的主题和目标。",
        linked_misconception_ids: misconceptions.map((item) => item.id)
      }
    ];
  }

  function buildStudentFacingMaterial(topic, misconceptions) {
    return {
      title: `${topic}：用两种有用视角看同一个信号`,
      audience: "student",
      body: "一个信号既可以用它随时间如何变化来描述，也可以用构成它的重复频率成分来描述。傅里叶变换是一种在同一个信号的两种表示之间切换的数学方法。公式很重要，但核心思想是表示方式：一个信号，两种有用视角。",
      practice_prompt: "选择一首歌、一个脉冲或一条手绘波形。先描述时域视图显示了什么，再预测频域视图可能揭示什么。",
      linked_misconception_ids: idsFor(misconceptions, ["formula-only", "time-frequency-without-intuition", "relevance-gap"])
    };
  }

  function idsFor(misconceptions, preferredIds) {
    const ids = misconceptions
      .filter((misconception) => preferredIds.includes(misconception.id))
      .map((misconception) => misconception.id);

    return ids.length > 0 ? ids : misconceptions.map((misconception) => misconception.id).slice(0, 1);
  }

  function buildMarkdown(intervention) {
    const materials = intervention.differentiated_materials;
    const lines = [
      `# TeachFlow 教学干预：${intervention.topic}`,
      "",
      `来源诊断：${intervention.source_analysis_run_id}`,
      "",
      "## 干预摘要",
      intervention.intervention_summary,
      "",
      "## 修订后的教学计划",
      intervention.revised_teaching_plan.rationale,
      "",
      ...intervention.revised_teaching_plan.steps.flatMap((step) => [
        `### ${step.step_number}. ${step.title}`,
        `教师行动：${step.teacher_action}`,
        `学生行动：${step.student_action}`,
        `关联误解：${step.linked_misconception_ids.join(", ")}`,
        ""
      ]),
      "## Level 1：需要具体模型支持",
      `目标学生：${materials.level_1_confused.target_students.join(", ") || "无"}`,
      `目标：${materials.level_1_confused.goal}`,
      materials.level_1_confused.explanation,
      `类比：${materials.level_1_confused.analogy}`,
      `任务：${materials.level_1_confused.task}`,
      "",
      "## Level 2：部分理解",
      `目标学生：${materials.level_2_partially_understood.target_students.join(", ") || "无"}`,
      `目标：${materials.level_2_partially_understood.goal}`,
      materials.level_2_partially_understood.explanation,
      `概念桥接：${materials.level_2_partially_understood.concept_bridge}`,
      `任务：${materials.level_2_partially_understood.task}`,
      "",
      "## Level 3：准备应用",
      `目标学生：${materials.level_3_ready_to_apply.target_students.join(", ") || "无"}`,
      `目标：${materials.level_3_ready_to_apply.goal}`,
      `挑战：${materials.level_3_ready_to_apply.challenge}`,
      "跨领域连接：",
      ...materials.level_3_ready_to_apply.cross_domain_connections.map((item) => `- ${item}`),
      "",
      "## 可视化提示词",
      intervention.visual_aid.image_prompt,
      "",
      "## 视频分镜",
      ...intervention.video_storyboard.map((scene) => `${scene.scene_number}. ${scene.description} 旁白：${scene.narration}`),
      "",
      "## 微型测验",
      ...intervention.micro_quiz.map((item, index) => `${index + 1}. ${item.question}\n目的：${item.purpose}\n预期理解：${item.expected_understanding}`),
      "",
      "## 教师备注",
      ...intervention.teacher_notes.map((item) => `- ${item.note} ${item.why_it_matters}`),
      "",
      "## 学生讲义",
      intervention.student_facing_material?.body || "",
      "",
      intervention.student_facing_material?.practice_prompt ? `练习提示：${intervention.student_facing_material.practice_prompt}` : ""
    ];

    return lines.join("\n");
  }

  function validateIntervention(intervention) {
    const issues = [];
    const targetIds = new Set(intervention.target_misconceptions || []);

    if (!intervention.revised_teaching_plan?.steps?.length) {
      issues.push("Revised teaching plan has no steps.");
    }

    Object.entries(intervention.differentiated_materials || {}).forEach(([key, material]) => {
      if (!material.linked_misconception_ids?.length) {
        issues.push(`${key} is not linked to a misconception.`);
      }
    });

    intervention.micro_quiz?.forEach((question, index) => {
      if (!question.linked_misconception_ids?.length) {
        issues.push(`Micro quiz question ${index + 1} is not linked to a misconception.`);
      }
    });

    const linkedIds = collectLinkedIds(intervention);
    linkedIds.forEach((id) => {
      if (!targetIds.has(id)) {
        issues.push(`Linked misconception "${id}" is not in target_misconceptions.`);
      }
    });

    return {
      valid: issues.length === 0,
      issues
    };
  }

  function collectLinkedIds(intervention) {
    const ids = [];
    intervention.revised_teaching_plan?.steps?.forEach((step) => ids.push(...(step.linked_misconception_ids || [])));
    Object.values(intervention.differentiated_materials || {}).forEach((material) => ids.push(...(material.linked_misconception_ids || [])));
    ids.push(...(intervention.visual_aid?.linked_misconception_ids || []));
    intervention.micro_quiz?.forEach((item) => ids.push(...(item.linked_misconception_ids || [])));
    intervention.teacher_notes?.forEach((item) => ids.push(...(item.linked_misconception_ids || [])));
    ids.push(...(intervention.student_facing_material?.linked_misconception_ids || []));
    return ids;
  }

  const api = {
    generateIntervention,
    buildMarkdown,
    validateIntervention
  };

  global.TeachFlowInterventionEngine = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
