const aiProvider = require("./ai-provider.js");
const teacherAgentOrchestrator = require("./teacher-agent-orchestrator.js");
const studentAgentOrchestrator = require("./student-agent-orchestrator.js");

function getStatus() {
  return {
    ...aiProvider.status(),
    routes: [
      "GET /api/ai/status",
      "POST /api/ai/teacher-agent",
      "POST /api/ai/student-agent",
      "POST /api/ai/student-wellbeing",
      "POST /api/ai/material-generator",
      "POST /api/ai/message-draft"
    ],
    guardrails: [
      "AI 输出只作为草稿，老师确认后才执行",
      "学生端只读取自己的学习空间",
      "不发送真实姓名、邮箱、学号、密钥或生产隐私数据",
      "模型不可替代心理诊断、处分或最终教学决定"
    ]
  };
}

async function answerTeacherQuestion(input) {
  const briefing = input.briefing || {};
  const question = clean(input.question || "", 700);
  const fallbackAnswer = teacherAgentOrchestrator.answerTeacherAgentQuestion(question, briefing);
  const live = await aiProvider.generateText({
    instructions: [
      "你是 TeachFlow 的老师总助教 Agent。",
      "用中文回答，语气专业、简洁、可执行。",
      "只能使用匿名学生别名和学习证据，不要编造真实身份信息。",
      "所有建议都是草稿，必须由老师确认后才可发送、布置或导出。",
      "不要做心理诊断、成绩定性、处分建议或越权承诺。",
      "回答应包含：优先处理什么、依据是什么、老师下一步怎么做。"
    ].join("\n"),
    input: {
      question,
      briefing: compactTeacherBriefing(briefing)
    },
    maxOutputTokens: 800
  });

  if (!live.ok || !live.text) {
    return liveFallback("teacher-agent", fallbackAnswer, live);
  }

  return {
    agent: "teacher-agent",
    mode: "live",
    provider: live.provider,
    model: live.model,
    answer: clean(live.text, 1800),
    fallbackAnswer,
    generatedAt: new Date().toISOString()
  };
}

async function answerStudentQuestion(input) {
  const briefing = input.briefing || {};
  const question = clean(input.question || "", 700);
  const fallback = studentAgentOrchestrator.answerStudentQuestion(question, briefing);
  const live = await aiProvider.generateText({
    instructions: [
      "你是 TeachFlow 的学生专属学习助手。",
      "用中文回答，温和、具体、一步一步帮学生理解。",
      "只读取当前学生自己的学习空间，不要提其他学生。",
      "不要直接代写作业或给最终答案；给提示、拆步骤、提问和下一步。",
      "普通解释默认只给学生自己看；只有学生主动分享，老师才看到整理后的卡点摘要。",
      "如果学生表达强烈危机、伤害自己或他人等安全风险，建议立刻联系老师、家长或可信赖成年人，不做诊断。"
    ].join("\n"),
    input: {
      question,
      briefing: compactStudentBriefing(briefing),
      responseShape: {
        answer: "给学生看的回答",
        nextStep: "一个很小的下一步",
        teacherVisiblePreview: "如果学生选择分享，老师可以看到的学习卡点摘要"
      }
    },
    maxOutputTokens: 700
  });

  if (!live.ok || !live.text) {
    return {
      ...fallback,
      agent: "student-agent",
      mode: "local",
      provider: live.provider,
      model: live.model,
      aiError: live.error
    };
  }

  const parsed = parseLooseJson(live.text);
  const answer = clean(parsed?.answer || live.text, 1600);
  const nextStep = clean(parsed?.nextStep || fallback.nextStep, 220);
  const teacherVisiblePreview = clean(parsed?.teacherVisiblePreview || fallback.shareDraft?.teacherSummary || "", 500);
  return {
    ...fallback,
    agent: "student-agent",
    mode: "live",
    provider: live.provider,
    model: live.model,
    answer,
    nextStep,
    shareDraft: {
      ...(fallback.shareDraft || {}),
      studentFacing: answer,
      teacherSummary: teacherVisiblePreview || fallback.shareDraft?.teacherSummary,
      teacherVisiblePreview: teacherVisiblePreview || fallback.shareDraft?.teacherVisiblePreview
    },
    generatedAt: new Date().toISOString()
  };
}

async function answerStudentWellbeing(input) {
  const briefing = input.briefing || {};
  const message = clean(input.message || input.question || input.text || "", 800);
  const fallback = localStudentWellbeingReply(message, briefing);
  const live = await aiProvider.generateText({
    instructions: [
      "你是 TeachFlow 的 AI 学生关怀助手，不是心理医生、治疗师或危机热线。",
      "用中文回答，语气温和、稳定、具体，先接住学生感受，再把压力拆成一个很小的下一步。",
      "只提供学习压力、情绪整理、求助表达和自我照顾建议；不要做心理诊断、病名判断、治疗方案或药物建议。",
      "不要承诺保密到超过系统边界。说明普通关怀聊天默认只给学生自己看，学生主动分享时老师只看到学习相关摘要。",
      "如果学生表达可能伤害自己、伤害他人、被伤害或处于紧急危险，必须建议立刻联系可信任成年人、老师、家长、学校支持人员或当地紧急服务。",
      "输出 JSON，字段包括 answer, copingStep, safetyNote。"
    ].join("\n"),
    input: {
      message,
      briefing: compactStudentBriefing(briefing),
      responseShape: {
        answer: "给学生看的关怀回复",
        copingStep: "一个很小、现在就能做的下一步",
        safetyNote: "必要时的真人求助提醒"
      }
    },
    maxOutputTokens: 700
  });

  if (!live.ok || !live.text) {
    return {
      ...fallback,
      mode: "local",
      provider: live.provider,
      model: live.model,
      aiError: live.error
    };
  }

  const parsed = parseLooseJson(live.text);
  const answer = clean(parsed?.answer || live.text, 1600);
  const copingStep = clean(parsed?.copingStep || fallback.copingStep, 240);
  const safetyNote = clean(parsed?.safetyNote || fallback.safetyNote, 360);
  return {
    agent: "student-wellbeing-coach",
    mode: "live",
    provider: live.provider,
    model: live.model,
    answer,
    copingStep,
    safetyNote,
    generatedAt: new Date().toISOString()
  };
}

async function generateMaterial(input) {
  const briefing = input.briefing || {};
  const type = normalizeMaterialType(input.type || input.materialType || "讲义");
  const kind = materialKind(type);

  if (kind === "image") return generateImageMaterial(input, briefing, type);
  if (kind === "exercise") return generateExerciseMaterial(input, briefing, type);
  return generateHandoutMaterial(input, briefing, type);
}

async function generateHandoutMaterial(input, briefing, type) {
  const live = await aiProvider.generateText({
    instructions: [
      "你是 TeachFlow 的讲义生成 Agent。",
      "用中文生成老师可审阅、学生可阅读的讲义草稿。",
      "必须保持学科解释准确、低门槛、课堂可用。",
      "输出 JSON，字段包括 kind, title, type, targetLevel, goal, sections, keyPoints, teacherNotes, studentTask, reviewChecklist。",
      "sections 是数组，每项包含 heading 和 body。",
      "不要自动发布给学生，所有内容等待老师审批。"
    ].join("\n"),
    input: {
      materialType: type,
      topic: input.topic || briefing.topic,
      targetLevel: input.targetLevel || "Level 1-2",
      teacherRequest: input.prompt || input.request || "",
      briefing: compactTeacherBriefing(briefing)
    },
    maxOutputTokens: 1300
  });

  if (!live.ok || !live.text) {
    return {
      agent: "material-generator",
      mode: "local",
      provider: live.provider,
      model: live.model,
      error: live.error,
      draft: localHandoutDraft(type, briefing)
    };
  }

  return {
    agent: "material-generator",
    mode: "live",
    provider: live.provider,
    model: live.model,
    draft: { kind: "handout", type, ...(parseLooseJson(live.text) || { title: `${type}草稿`, content: live.text }) },
    generatedAt: new Date().toISOString()
  };
}

async function generateExerciseMaterial(input, briefing, type) {
  const live = await aiProvider.generateText({
    instructions: [
      "你是 TeachFlow 的练习生成 Agent。",
      "用中文生成老师可审阅的课堂练习草稿。",
      "题目要围绕当前主题，适合分层教学，不要泄露学生隐私。",
      "输出 JSON，字段包括 kind, title, type, targetLevel, goal, exercises, answerKey, teacherNotes, studentTask, reviewChecklist。",
      "exercises 是数组，每项包含 id, level, question, expectedAnswer, hint。",
      "answerKey 是教师用答案与讲评要点。",
      "不要自动发布给学生，所有内容等待老师审批。"
    ].join("\n"),
    input: {
      materialType: type,
      topic: input.topic || briefing.topic,
      targetLevel: input.targetLevel || "Level 1-2",
      teacherRequest: input.prompt || input.request || "",
      briefing: compactTeacherBriefing(briefing)
    },
    maxOutputTokens: 1500
  });

  if (!live.ok || !live.text) {
    return {
      agent: "material-generator",
      mode: "local",
      provider: live.provider,
      model: live.model,
      error: live.error,
      draft: localExerciseDraft(type, briefing)
    };
  }

  return {
    agent: "material-generator",
    mode: "live",
    provider: live.provider,
    model: live.model,
    draft: { kind: "exercise", type, ...(parseLooseJson(live.text) || { title: `${type}草稿`, exercises: [{ id: "Q1", level: "Level 1", question: live.text }] }) },
    generatedAt: new Date().toISOString()
  };
}

async function generateImageMaterial(input, briefing, type) {
  const topic = clean(input.topic || briefing.topic || "当前主题", 160);
  const teacherRequest = clean(input.prompt || input.request || "", 800);
  const title = `${topic} 图示`;
  const imagePrompt = [
    "生成一张高中课堂可用的中文教学图示。",
    `主题：${topic}`,
    `教师目标：${teacherRequest || "帮助学生建立直观理解。"}`,
    "画面要求：干净、明亮、少文字、概念结构清楚，适合作为课堂投影。",
    "如果包含中文文字，请保持短句，不要出现真实学生姓名、邮箱、学号或任何隐私信息。",
    "风格：现代教育信息图，白色背景，清晰线条，适度颜色区分。"
  ].join("\n");

  const live = await aiProvider.generateImage({
    prompt: imagePrompt,
    size: input.imageSize || "1024x1024",
    quality: input.imageQuality || "medium"
  });

  if (!live.ok || !live.imageBase64) {
    return {
      agent: "material-generator",
      mode: "local",
      provider: live.provider,
      model: live.model,
      error: live.error,
      draft: localImageDraft(type, briefing, topic, imagePrompt)
    };
  }

  return {
    agent: "material-generator",
    mode: "live",
    provider: live.provider,
    model: live.model,
    draft: {
      kind: "image",
      type,
      title,
      topic,
      targetLevel: input.targetLevel || "Level 1-2",
      goal: teacherRequest || "用图示帮助学生建立直观理解。",
      imagePrompt,
      imageBase64: live.imageBase64,
      revisedPrompt: live.revisedPrompt,
      teacherNotes: "请老师检查图示是否符合课堂事实、是否需要补充口头说明。",
      studentTask: "看图后，用一句话说明图中最关键的关系。",
      reviewChecklist: ["图示是否准确", "文字是否过多", "是否适合投影", "是否需要配套讲解"]
    },
    generatedAt: new Date().toISOString()
  };
}

async function draftTeacherMessage(input) {
  const briefing = input.briefing || {};
  const studentAlias = clean(input.studentAlias || input.alias || "", 30);
  const live = await aiProvider.generateText({
    instructions: [
      "你是 TeachFlow 的老师消息草稿 Agent。",
      "用中文为老师写一条短消息草稿。",
      "语气鼓励、具体、低压力；避免贴标签和诊断。",
      "只使用学生别名和学习证据，不能编造真实身份信息。",
      "输出 JSON：studentAlias, message, reason, teacherReviewChecklist。"
    ].join("\n"),
    input: {
      studentAlias,
      purpose: input.purpose || input.prompt || "学习支持回复",
      briefing: compactTeacherBriefing(briefing)
    },
    maxOutputTokens: 550
  });

  if (!live.ok || !live.text) {
    const draft = (briefing.messageDrafts || []).find((item) => item.studentAlias === studentAlias) || briefing.messageDrafts?.[0] || {};
    return {
      agent: "message-draft",
      mode: "local",
      provider: live.provider,
      model: live.model,
      error: live.error,
      draft: {
        studentAlias: studentAlias || draft.studentAlias || "",
        message: draft.text || "我看到你卡在一个具体学习点上。先不用急，我们先处理一个小步骤。",
        reason: "本地规则兜底生成",
        teacherReviewChecklist: ["确认语气合适", "确认学习证据准确", "确认是否需要布置材料"]
      }
    };
  }

  return {
    agent: "message-draft",
    mode: "live",
    provider: live.provider,
    model: live.model,
    draft: parseLooseJson(live.text) || { studentAlias, message: live.text },
    generatedAt: new Date().toISOString()
  };
}

function liveFallback(agent, answer, live) {
  return {
    agent,
    mode: "local",
    provider: live.provider,
    model: live.model,
    answer,
    aiError: live.error,
    generatedAt: new Date().toISOString()
  };
}

function localStudentWellbeingReply(message, briefing) {
  const text = clean(message, 800);
  const riskPattern = /自杀|不想活|伤害自己|伤害别人|kill myself|suicide|self harm|die/i;
  if (riskPattern.test(text)) {
    return {
      agent: "student-wellbeing-coach",
      answer: "谢谢你把这么重要的事说出来。这个情况不适合只靠 AI 处理。请你现在立刻联系一位可信任的成年人，比如老师、家长、学校支持人员，或当地紧急服务。如果你身边已经有危险，请优先离开危险环境并寻求真人帮助。",
      copingStep: "现在先找一个身边可信任的人，说：我现在不安全，需要你陪我。",
      safetyNote: "AI 不能替代真人危机支持；涉及伤害自己或他人的风险时，需要马上联系真人。",
      generatedAt: new Date().toISOString()
    };
  }

  const topic = briefing.topic || briefing.profile?.topic || "当前学习内容";
  const need = briefing.profile?.stuckType || "现在最困扰你的点";
  const answer = text
    ? `我听到了：你现在不只是有一道题不会，而是有一点压力卡在心里。我们先不急着证明自己“会不会”，先把它变小。和“${topic}”有关的部分，可以先写成一句话：我现在卡在“${need}”，我希望有人换一种说法讲。`
    : "我在。你可以把学习压力、害怕问问题、跟不上、觉得自己很笨这些感受直接写出来。我不会给你贴标签，只会帮你把它整理成一个可以处理的小步骤。";
  return {
    agent: "student-wellbeing-coach",
    answer,
    copingStep: "先做 30 秒停顿：吸气、呼气，然后只写下一句“我现在最需要别人帮我解释的是……”。",
    safetyNote: "如果压力已经强到让你担心自己或别人安全，请马上找老师、家长、学校支持人员或当地紧急服务。",
    generatedAt: new Date().toISOString()
  };
}

function compactTeacherBriefing(briefing) {
  return {
    className: briefing.className,
    topic: briefing.topic,
    summary: briefing.summary,
    insight: briefing.insight,
    priorities: first(briefing.priorities, 4),
    priorityTasks: first(briefing.priorityTasks, 4).map((item) => pick(item, ["title", "reason", "targetLabel", "nextStep"])),
    misconceptions: first(briefing.misconceptions, 4).map((item) => pick(item, ["name", "count", "severity", "representativeEvidence"])),
    studentFocus: first(briefing.studentFocus, 6).map((item) => pick(item, ["studentAlias", "priorityLabel", "mainNeed", "assignmentStatus", "recommendedAction"])),
    messageDrafts: first(briefing.messageDrafts, 4),
    materialDrafts: first(briefing.materialDrafts, 4),
    outcomeEvaluation: briefing.outcomeEvaluation
      ? pick(briefing.outcomeEvaluation, ["summary", "metrics", "nextTeacherActions"])
      : null,
    safetyNotes: briefing.safetyNotes || briefing.guardrails || []
  };
}

function compactStudentBriefing(briefing) {
  return {
    studentAlias: briefing.studentAlias,
    className: briefing.className,
    topic: briefing.topic,
    summary: briefing.summary,
    profile: briefing.profile,
    nextPlan: first(briefing.nextPlan, 3),
    sourceSignals: briefing.sourceSignals,
    memory: first(briefing.memory, 5),
    privacyNotes: briefing.privacyNotes
  };
}

function localMaterialDraft(type, briefing) {
  const firstCluster = briefing.misconceptions?.[0] || {};
  return {
    title: `${briefing.topic || "当前主题"} ${type}草稿`,
    type,
    targetLevel: firstCluster.severity === "high" ? "Level 1-2" : "Level 2-3",
    goal: firstCluster.name ? `帮助学生处理「${firstCluster.name}」` : "帮助学生完成一个可理解的小步骤",
    outline: ["核心概念", "低门槛例子", "学生练习", "教师复核点"],
    teacherNotes: "本地规则兜底生成，建议老师审批后再使用。",
    studentTask: "写出自己最不确定的一句话。",
    reviewChecklist: ["是否符合本班进度", "是否避免泄露隐私", "是否需要降低语言难度"]
  };
}

function parseLooseJson(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    return JSON.parse(candidate);
  } catch (error) {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch (innerError) {
        return null;
      }
    }
    return null;
  }
}

function first(items, count) {
  return (Array.isArray(items) ? items : []).slice(0, count);
}

function pick(value, keys) {
  const result = {};
  keys.forEach((key) => {
    if (value && value[key] !== undefined) result[key] = value[key];
  });
  return result;
}

function clean(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return max ? text.slice(0, max) : text;
}

async function generateMaterial(input) {
  const briefing = input.briefing || {};
  const type = normalizeMaterialType(input.type || input.materialType || "讲义");
  const kind = materialKind(type);

  if (kind === "image") return generateImageMaterial(input, briefing, type);
  if (kind === "exercise") return generateExerciseMaterial(input, briefing, type);
  return generateHandoutMaterial(input, briefing, type);
}

async function generateHandoutMaterial(input, briefing, type) {
  const topic = materialTopic(input, briefing);
  const targetLevel = clean(input.targetLevel || "Level 1-2", 80);
  const teacherRequest = clean(input.prompt || input.request || "", 900);
  const live = await aiProvider.generateText({
    instructions: [
      "你是 TeachFlow 的课堂讲义生成 Agent。",
      "请用中文生成一份老师可审阅、学生可阅读的讲义草稿。",
      "输出必须是 JSON，不要输出 Markdown 代码块之外的解释。",
      "JSON 字段：kind, title, type, targetLevel, goal, sections, keyPoints, teacherNotes, studentTask, reviewChecklist。",
      "sections 是数组，每项包含 heading 和 body。",
      "所有内容都只是草稿，必须等待老师审批后才能发布。"
    ].join("\n"),
    input: {
      materialType: type,
      topic,
      targetLevel,
      teacherRequest,
      briefing: compactTeacherBriefing(briefing)
    },
    maxOutputTokens: 1400
  });

  if (!live.ok || !live.text) {
    return localMaterialResult("handout", live, localHandoutDraft(type, briefing, topic, targetLevel, teacherRequest));
  }

  const parsed = parseLooseJson(live.text);
  return {
    agent: "material-generator",
    mode: "live",
    provider: live.provider,
    model: live.model,
    draft: {
      kind: "handout",
      type,
      title: `${topic} 讲义草稿`,
      targetLevel,
      goal: teacherRequest || "帮助学生建立低门槛理解。",
      ...(parsed || { content: live.text })
    },
    generatedAt: new Date().toISOString()
  };
}

async function generateExerciseMaterial(input, briefing, type) {
  const topic = materialTopic(input, briefing);
  const targetLevel = clean(input.targetLevel || "Level 1-2", 80);
  const teacherRequest = clean(input.prompt || input.request || "", 900);
  const live = await aiProvider.generateText({
    instructions: [
      "你是 TeachFlow 的课堂练习生成 Agent。",
      "请用中文生成一组老师可审阅的分层练习题草稿。",
      "输出必须是 JSON，不要输出 Markdown 代码块之外的解释。",
      "JSON 字段：kind, title, type, targetLevel, goal, exercises, answerKey, teacherNotes, studentTask, reviewChecklist。",
      "exercises 是数组，每项包含 id, level, question, expectedAnswer, hint。",
      "answerKey 是教师用答案与讲评要点。",
      "不要替学生完成作业，练习必须等待老师审批后才能发布。"
    ].join("\n"),
    input: {
      materialType: type,
      topic,
      targetLevel,
      teacherRequest,
      briefing: compactTeacherBriefing(briefing)
    },
    maxOutputTokens: 1600
  });

  if (!live.ok || !live.text) {
    return localMaterialResult("exercise", live, localExerciseDraft(type, briefing, topic, targetLevel, teacherRequest));
  }

  const parsed = parseLooseJson(live.text);
  return {
    agent: "material-generator",
    mode: "live",
    provider: live.provider,
    model: live.model,
    draft: {
      kind: "exercise",
      type,
      title: `${topic} 练习草稿`,
      targetLevel,
      goal: teacherRequest || "帮助学生通过小题暴露并修正理解卡点。",
      ...(parsed || {
        exercises: [{ id: "Q1", level: targetLevel, question: live.text, expectedAnswer: "", hint: "" }]
      })
    },
    generatedAt: new Date().toISOString()
  };
}

async function generateImageMaterial(input, briefing, type) {
  const topic = materialTopic(input, briefing);
  const targetLevel = clean(input.targetLevel || "Level 1-2", 80);
  const teacherRequest = clean(input.prompt || input.request || "", 900);
  const imagePrompt = [
    "Create a clean classroom teaching diagram for high-school students.",
    `Topic: ${topic}`,
    `Teacher goal: ${teacherRequest || "help students build intuitive understanding"}`,
    "Style: modern educational infographic, white background, crisp lines, restrained colors, clear visual hierarchy.",
    "Use very little text. If Chinese labels are necessary, keep them short and simple.",
    "Do not include real student names, email addresses, school IDs, faces, or private information."
  ].join("\n");

  const live = await aiProvider.generateImage({
    prompt: imagePrompt,
    size: input.imageSize || "1024x1024",
    quality: input.imageQuality || "medium"
  });

  const baseDraft = {
    kind: "image",
    type,
    title: `${topic} 图示草稿`,
    topic,
    targetLevel,
    goal: teacherRequest || "用一张图帮助学生建立直观理解。",
    imagePrompt,
    teacherNotes: "请老师检查图示是否科学准确、是否适合投影，以及是否需要配套口头说明。",
    studentTask: "看图后，用一句话说明图中最关键的关系。",
    reviewChecklist: ["图示是否准确", "文字是否过多", "是否适合课堂投影", "是否需要配套讲解"]
  };

  if (!live.ok || !live.imageBase64) {
    return localMaterialResult("image", live, localImageDraft(type, briefing, topic, targetLevel, teacherRequest, imagePrompt));
  }

  return {
    agent: "material-generator",
    mode: "live",
    provider: live.provider,
    model: live.model,
    draft: {
      ...baseDraft,
      imageBase64: live.imageBase64,
      revisedPrompt: live.revisedPrompt || ""
    },
    generatedAt: new Date().toISOString()
  };
}

function normalizeMaterialType(value) {
  const text = clean(value, 80);
  if (/图片|图示|image|diagram|鍥剧墖|鍥剧ず/i.test(text)) return "图片";
  if (/练习|习题|测验|exercise|quiz|缁冧範/i.test(text)) return "练习";
  return "讲义";
}

function materialKind(type) {
  if (type === "图片") return "image";
  if (type === "练习") return "exercise";
  return "handout";
}

function materialTopic(input, briefing) {
  return clean(input.topic || briefing.topic || "当前课程主题", 160);
}

function localMaterialResult(kind, live, draft) {
  return {
    agent: "material-generator",
    mode: "local",
    provider: live.provider,
    model: live.model,
    error: live.error,
    draft: { kind, ...draft },
    generatedAt: new Date().toISOString()
  };
}

function localHandoutDraft(type, briefing, topic, targetLevel, teacherRequest) {
  const firstCluster = briefing.misconceptions?.[0] || {};
  return {
    kind: "handout",
    title: `${topic} 讲义草稿`,
    type,
    topic,
    targetLevel: targetLevel || (firstCluster.severity === "high" ? "Level 1-2" : "Level 2-3"),
    goal: teacherRequest || (firstCluster.name ? `帮助学生处理“${firstCluster.name}”。` : "帮助学生完成一个可理解的小步骤。"),
    sections: [
      { heading: "核心概念", body: "用一句低门槛语言解释本节课最重要的概念。" },
      { heading: "生活化例子", body: "用一个学生熟悉的例子连接抽象概念。" },
      { heading: "课堂小任务", body: "让学生写下自己最不确定的一句话。" }
    ],
    keyPoints: ["先建立直观理解", "再引入术语", "最后用一个小题检查理解"],
    teacherNotes: "本地规则兜底生成，建议老师审批后再使用。",
    studentTask: "写出自己最不确定的一句话。",
    reviewChecklist: ["是否符合本班进度", "是否避免隐私信息", "是否需要降低语言难度"]
  };
}

function localExerciseDraft(type, briefing, topic, targetLevel, teacherRequest) {
  return {
    kind: "exercise",
    title: `${topic} 练习草稿`,
    type,
    topic,
    targetLevel,
    goal: teacherRequest || "用三道小题帮助学生检查理解。",
    exercises: [
      { id: "Q1", level: "Level 1", question: "用自己的话解释这个概念是什么意思。", expectedAnswer: "能说出核心关系即可。", hint: "先不用公式，先说现象。" },
      { id: "Q2", level: "Level 2", question: "判断一个常见例子是否符合这个概念，并说明理由。", expectedAnswer: "能用关键词给出理由。", hint: "找出变化量和对应关系。" },
      { id: "Q3", level: "Level 3", question: "把这个概念应用到一个新情境中。", expectedAnswer: "能迁移到新情境。", hint: "先画出已知量和未知量。" }
    ],
    answerKey: ["Q1：关注学生是否能说出核心关系。", "Q2：关注理由是否和概念对应。", "Q3：关注迁移过程，不只看最终答案。"],
    teacherNotes: "本地规则兜底生成，建议老师审批后再使用。",
    studentTask: "先独立完成 Q1，再选择 Q2 或 Q3。",
    reviewChecklist: ["题目是否贴合课堂目标", "答案是否清晰", "是否适合当前层级"]
  };
}

function localImageDraft(type, briefing, topic, targetLevel, teacherRequest, imagePrompt) {
  return {
    kind: "image",
    title: `${topic} 图示草稿`,
    type,
    topic,
    targetLevel,
    goal: teacherRequest || "用图示帮助学生建立直观理解。",
    imagePrompt,
    teacherNotes: "图片接口不可用时生成了图示说明草稿。请恢复图片接口后重新生成真实图片。",
    studentTask: "看图后，用一句话说明图中最关键的关系。",
    reviewChecklist: ["图示是否准确", "是否适合投影", "是否需要配套讲解"]
  };
}

module.exports = {
  getStatus,
  answerTeacherQuestion,
  answerStudentQuestion,
  answerStudentWellbeing,
  generateMaterial,
  draftTeacherMessage
};
