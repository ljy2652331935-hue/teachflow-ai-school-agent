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

async function generateMaterial(input) {
  const briefing = input.briefing || {};
  const type = clean(input.type || input.materialType || "讲义", 80);
  const live = await aiProvider.generateText({
    instructions: [
      "你是 TeachFlow 的教学材料生成 Agent。",
      "用中文生成老师可审阅的材料草稿。",
      "必须保持学科解释准确、分层清晰、课堂可用。",
      "输出为 JSON，字段包括 title, type, targetLevel, goal, outline, teacherNotes, studentTask, reviewChecklist。",
      "不要自动发布给学生，所有内容等待老师审批。"
    ].join("\n"),
    input: {
      materialType: type,
      topic: input.topic || briefing.topic,
      targetLevel: input.targetLevel || "Level 1-2",
      teacherRequest: input.prompt || input.request || "",
      briefing: compactTeacherBriefing(briefing)
    },
    maxOutputTokens: 1100
  });

  if (!live.ok || !live.text) {
    return {
      agent: "material-generator",
      mode: "local",
      provider: live.provider,
      model: live.model,
      error: live.error,
      draft: localMaterialDraft(type, briefing)
    };
  }

  return {
    agent: "material-generator",
    mode: "live",
    provider: live.provider,
    model: live.model,
    draft: parseLooseJson(live.text) || { title: `${type}草稿`, type, content: live.text },
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

module.exports = {
  getStatus,
  answerTeacherQuestion,
  answerStudentQuestion,
  generateMaterial,
  draftTeacherMessage
};
