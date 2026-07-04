(function (global) {
  const DEFAULT_TOPIC = "current topic";

  function buildStudentBriefing(input, options) {
    const state = input || {};
    const context = options?.context || state.session || {};
    const student = Array.isArray(state.students) ? state.students[0] : null;
    const alias = context.studentAlias || student?.id || "S001";
    const topic = state.topic || student?.topic || DEFAULT_TOPIC;
    const assignmentStatus = state.assignments?.[alias] || "draft not submitted";
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
      name: "AI learning assistant",
      role: "Student Learning Agent",
      generatedAt: new Date().toISOString(),
      studentAlias: alias,
      className: state.accessBoundary?.className || state.className || "",
      topic,
      summary: `You are currently learning ${topic}. Your main stuck point is ${profile.stuckType}, and your assignment status is ${assignmentStatus}. Start with: ${nextPlan[0]?.action || "review teacher material"}.`,
      profile,
      nextPlan,
      teacherSignaldraft: stuckDraft.teachersummary,
      sharedraft: stuckDraft,
      sourceSignals: [
        { type: "assignment", label: "assignment status", count: assignmentStatus ? 1 : 0 },
        { type: "questions", label: "questions", count: questions.length },
        { type: "stuck_signals", label: "stuck signal log", count: stuckSignals.length },
        { type: "check_ins", label: "learning check-ins", count: checkIns.length },
        { type: "teacher_messages", label: "teacher replies", count: messages.filter((item) => item.senderRole === "teacher").length }
      ],
      memory: buildMemory(profile, latestStuck, latestCheckIn, latestTeacherMessage),
      privacynotes: [
        "Your learning agent only uses your own workspace.",
        "Your ordinary chat stays private by default.",
        "Only when you tap Share will the teacher see a short stuck-signal summary.",
        "The agent gives hints, small steps and help-request drafts, not final assignment answers."
      ],
      allowedData: [
        "your assignment status",
        "your questions",
        "your stuck signal log",
        "your check-ins",
        "teacher messages sent to you",
        "teacher-approved materials"
      ],
      blockedData: [
        "other pupils' work",
        "teacher-only class insights",
        "school-admin aggregate data",
        "teacher approval drafts before publishing"
      ]
    };
  }

  function answerStudentquestion(question, briefingInput) {
    const text = clean(question, 600);
    const briefing = briefingInput || buildStudentBriefing({});

    if (!text) {
      return response("You can ask something specific, for example: How should I read this diagram? What does this symbol mean? What is my next small step?", briefing);
    }

    if (/answer|complete my homework|do my homework|write the assignment/i.test(text)) {
      return response(
        "I cannot complete the assignment for you, but I can help you break it down. Start with one sentence: what do you know, what is uncertain, and what example would help?",
        briefing,
        "Write one honest sentence about where you are stuck."
      );
    }

    if (/teacher|share|help request/i.test(text)) {
      return response(
        `You can share this with your teacher after you confirm it: ${briefing.teacherSignaldraft}`,
        briefing,
        "Check the summary, then tap Share with teacher if you want the teacher to see it."
      );
    }

    if (/next step|start|first/i.test(text)) {
      const first = briefing.nextPlan[0];
      return response(`Suggested first step: ${first.action}. ${first.detail}`, briefing, first.action);
    }

    if (/diagram|left|right|waveform|frequency graph|visual/i.test(text)) {
      return response(
        "Look at the diagram first, without the formula. The left-hand side shows the signal changing over time; the right-hand side breaks the same signal into simple frequencies. Find those two parts before doing any calculation.",
        briefing,
        "Circle the complex waveform on the left and the simple frequencies on the right."
      );
    }

    if (/formula|symbol|equation/i.test(text)) {
      return response(
        "Turn the formula into words before using it. For each symbol, write what it represents in the physical situation, then ask which symbol is still unclear.",
        briefing,
        "Translate each symbol into one plain sentence."
      );
    }

    if (/frequency domain|time domain|time|frequency/i.test(text)) {
      return response(
        "The time domain shows how a signal changes over time. The frequency domain shows which repeating frequencies make up that same signal. It is one signal viewed in two useful ways.",
        briefing,
        "Write one sentence comparing time domain and frequency domain."
      );
    }

    return response(
      `Let's make this smaller. For ${briefing.topic}, write one sentence starting with: I understand..., I am unsure about..., I need an example of...`,
      briefing,
      "Write one sentence about the exact unclear point."
    );
  }

  function draftStuckSignal(input, briefingInput) {
    const text = clean(input?.text || input?.note || input?.question || "", 500);
    const profile = briefingInput?.profile || {};
    const topic = briefingInput?.topic || DEFAULT_TOPIC;
    const stuckType = input?.stuckType || inferNeedFromText(text || profile.stuckType || "");
    const specific = text || sentenceForNeed(stuckType);
    const teachersummary = `In ${topic}, this pupil is stuck on ${stuckType}: ${specific}`;
    return {
      id: `stuck-draft-${slugFor(stuckType)}`,
      stuckType,
      studentText: specific,
      studentFacing: `Stuck signal draft: ${teachersummary}`,
      teachersummary,
      nextStep: nextStepForNeed(stuckType),
      teacherVisiblePreview: teachersummary,
      consentRequired: true,
      source: "student_agent"
    };
  }

  function response(answer, briefing, nextStep) {
    const sharedraft = draftStuckSignal({ text: answer, stuckType: briefing.profile?.stuckType }, briefing);
    return {
      answer,
      nextStep: nextStep || briefing.nextPlan?.[0]?.action || "Take one small learning step.",
      sharedraft,
      usedSources: briefing.sourceSignals || [],
      privacyNote: "This response is private to you by default. Only when you tap Share will a short stuck-signal summary go to the teacher."
    };
  }

  function buildProfile(context) {
    const supportText = `${context.student?.status || ""} ${context.student?.level || ""} ${context.currentNeed || ""}`;
    const hasSubmitted = /submitted|turned in|complete/i.test(context.assignmentStatus);
    return {
      alias: context.alias,
      topic: context.topic,
      level: /Level 1|needs support|stuck/i.test(supportText) ? "needs accessible support" : "building understanding",
      stuckType: context.currentNeed || "unconfirmed stuck point",
      assignmentstatus: context.assignmentStatus,
      confidence: hasSubmitted ? "assignment submitted; ready for feedback" : "draft not finished; start with a low-pressure draft",
      chatCount: context.questions.length + context.messages.filter((item) => item.senderRole === "student").length,
      teachermessageCount: context.messages.filter((item) => item.senderRole === "teacher").length,
      checkInState: context.checkIns[0]?.stateLabel || "no check-in yet"
    };
  }

  function buildNextPlan(profile, latestCheckIn, latestTeacherMessage) {
    const plan = [];
    plan.push({
      action: actionForNeed(profile.stuckType),
      detail: nextStepForNeed(profile.stuckType)
    });

    if (!/submitted|turned in|complete/i.test(profile.assignmentstatus)) {
      plan.push({
        action: "Finish the assignment draft",
        detail: "Write three sentences first: what I know, what I am unsure about, and which example I need."
      });
    } else {
      plan.push({
        action: "Use teacher feedback",
        detail: "If the teacher has replied, follow the first small step before asking a new question."
      });
    }

    plan.push({
      action: latestTeacherMessage ? "Reply to the teacher" : "Share the stuck point if needed",
      detail: latestTeacherMessage
        ? `Teacher reply: ${clean(latestTeacherMessage.text, 120)}`
        : "Only after you confirm sharing will the teacher see a short stuck-point summary."
    });

    if (latestCheckIn?.nextLearningStep) {
      plan.push({
        action: "Use your check-in next step",
        detail: latestCheckIn.nextLearningStep
      });
    }

    return plan.slice(0, 3);
  }

  function buildMemory(profile, latestStuck, latestCheckIn, latestTeacherMessage) {
    return [
      `current topic: ${profile.topic}`,
      `current stuck point: ${profile.stuckType}`,
      `assignment status: ${profile.assignmentstatus}`,
      latestStuck ? `latest stuck note: ${clean(latestStuck.note || latestStuck.stuckType, 120)}` : "no stuck note yet",
      latestCheckIn ? `latest learning check-in: ${latestCheckIn.stateLabel || latestCheckIn.state}` : "no learning check-in yet",
      latestTeacherMessage ? `latest teacher reply: ${clean(latestTeacherMessage.text, 120)}` : "no teacher reply yet"
    ];
  }

  function recentForAlias(items, alias) {
    return (Array.isArray(items) ? items : [])
      .filter((item) => item.studentAlias === alias)
      .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));
  }

  function inferNeedFromText(text) {
    const value = String(text || "");
    if (/diagram|left|right|waveform|frequency graph|graph|visual/i.test(value)) return "diagram mapping";
    if (/formula|symbol|equation/i.test(value)) return "formula meaning";
    if (/definition|concept|what is|meaning/i.test(value)) return "concept definition";
    if (/example|transfer|apply/i.test(value)) return "example transfer";
    return "one specific question";
  }

  function actionForNeed(need) {
    if (/diagram/i.test(need)) return "Break it into one small diagram question";
    if (/formula|symbol/i.test(need)) return "Translate one formula symbol";
    if (/definition|concept/i.test(need)) return "Write one plain definition";
    if (/example|transfer/i.test(need)) return "Compare one worked example";
    return "Break it into one small question";
  }

  function nextStepForNeed(need) {
    if (/diagram/i.test(need)) return "Write the one part of the diagram that does not line up yet.";
    if (/formula|symbol/i.test(need)) return "Choose one symbol and write what it means in the situation.";
    if (/definition|concept/i.test(need)) return "Write the concept in plain language before using technical words.";
    if (/example|transfer/i.test(need)) return "Compare the worked example with the new question and mark the first difference.";
    return "Write the sentence you are least sure about, then ask the learning partner to make it smaller.";
  }

  function sentenceForNeed(need) {
    if (/diagram/i.test(need)) return "I cannot see how the two parts of the diagram match.";
    if (/formula|symbol/i.test(need)) return "I do not know what one symbol in the formula means.";
    if (/definition|concept/i.test(need)) return "I need the concept explained in simpler words.";
    if (/example|transfer/i.test(need)) return "I can follow the example but cannot transfer it yet.";
    return "I cannot turn this into a specific question yet.";
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
    answerStudentquestion,
    draftStuckSignal
  };

  global.TeachFlowStudentAgentOrchestrator = api;

  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
