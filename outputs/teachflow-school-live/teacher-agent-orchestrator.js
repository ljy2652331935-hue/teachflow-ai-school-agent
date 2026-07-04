(function (global) {
  const DEFAULT_CLASS_NAME = "current class";
  const DEFAULT_TOPIC = "current topic";
  const outcomeEvaluationEngine = loadOutcomeEvaluationEngine(global);

  function buildteacherBriefing(input, options) {
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
    const studentFocus = buildStudentFocus({ students, assignments, stuckSignals, questions, checkIns, messages })
      .map((item) => ({
        ...item,
        lastteacherAgentAction: teacherAgentActions.find((action) => action.studentAlias === item.studentAlias) || null
      }))
      .filter((item) => !handledAliases.has(item.studentAlias));
    const outcomeEvaluation = outcomeEvaluationEngine?.buildOutcomeEvaluation
      ? outcomeEvaluationEngine.buildOutcomeEvaluation(state, { context })
      : emptyOutcomeEvaluation(context, state);
    const sourceSignals = buildSourceSignals(students, assignments, questions, stuckSignals, checkIns, messages, teacherAgentActions, outcomeEvaluation);
    const insight = buildInsight(students, assignments, misconceptionClusters, studentFocus, sourceSignals);
    const interventions = buildInterventions(misconceptionClusters, studentFocus);
    const messagedrafts = buildmessagedrafts(studentFocus, topic);
    const materialdrafts = buildmaterialdrafts(misconceptionClusters, topic);
    const priorityTasks = buildPriorityTasks({
      insight,
      studentFocus,
      misconceptionClusters,
      interventions,
      messagedrafts,
      materialdrafts,
      sourceSignals,
      outcomeEvaluation
    });
    const safetynotes = [
      "Use pupil aliases and learning evidence only. Do not expose real names, emails, student IDs or private account data.",
      "Messages, materials and interventions are drafts until a teacher approves them.",
      "Pupil check-ins give teachers only a short learning summary. Private reflections remain private.",
      "The teacher Agent prioritises learning support. It is not a clinical, grading or disciplinary tool."
    ];

    return {
      agentId: "teacher-agent-orchestrator",
      name: "AI teaching copilot coordinator",
      role: "Teacher Copilot Orchestrator",
      generatedAt: new Date().toISOString(),
      className,
      topic,
      session: {
        role: context.role || "teacher",
        classId: context.classId || state.activeclassId || null,
        userId: context.userId || null
      },
      summary: buildsummary(className, topic, insight, priorityTasks),
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
      messagedrafts,
      materialdrafts,
      actionHistory: teacherAgentActions.slice(0, 8),
      outcomeEvaluation,
      approvalQueue: [
        ...messagedrafts.map((item) => ({
          id: `approval-message-${item.studentAlias}`,
          type: "student_message",
          title: `Reply draft for ${item.studentAlias}`,
          target: item.studentAlias,
          status: "teacher_review_required"
        })),
        ...materialdrafts.map((item) => ({
          id: `approval-material-${item.id}`,
          type: "material",
          title: item.title,
          target: item.targetLevel,
          status: "teacher_review_required"
        }))
      ],
      sourceSignals,
      toolCalls: [
        toolCall("getClassContext", "Read the current teacher session, class, topic and pupil aliases."),
        toolCall("getStudentSignals", "Summarise assignments, questions, stuck signals, check-ins and message history."),
        toolCall("runMisconceptionDiagnosis", "Cluster stuck signals and evidence into learning needs."),
        toolCall("generateInterventionPlan", "Turn learning needs into interventions and material drafts."),
        toolCall("draftTeacherActions", "Prepare teacher-approved next actions, replies and material suggestions."),
        toolCall("evaluateLearningOutcomes", "Compare teacher-approved actions with later pupil learning signals."),
        toolCall("applySafetyAndPrivacyRules", "Keep alias-only data, teacher approval and private reflections protected.")
      ],
      safetynotes,
      guardrails: safetynotes,
      canAutopublish: false
    };
  }

  function answerteacherAgentquestion(question, briefingInput) {
    const text = String(question || "").trim();
    const briefing = briefingInput || buildteacherBriefing({});
    if (!text) {
      return "You can ask: Which pupils should I review first? What material should I create? What message should I send first?";
    }

    if (/pupil|priority|follow-up|support/i.test(text)) {
      const focus = briefing.studentFocus.slice(0, 3);
      if (!focus.length) return "No urgent pupil signal yet. Keep monitoring assignments, questions and stuck signals.";
      return `Review these pupils first: ${focus.map((item) => `${item.studentAlias} (${item.mainNeed}, ${item.priorityLabel})`).join(", ")}. Open details, review evidence, then approve a support message or targeted material.`;
    }

    if (/material|visual|ppt|handout|practice|create/i.test(text)) {
      const material = briefing.materialdrafts[0];
      if (!material) return "There is not enough stuck-signal evidence to suggest a material yet. Ask for a question or stuck signal first.";
      return `Create ${material.title}. Goal: ${material.goal}. Target: ${material.targetLevel}. Review and approve before publishing.`;
    }

    if (/message|reply|chat/i.test(text)) {
      const draft = briefing.messagedrafts[0];
      if (!draft) return "No priority pupil message draft yet. A draft will appear after a question, stuck signal or shared check-in.";
      return `Suggested reply to ${draft.studentAlias}: ${draft.text}`;
    }

    if (/evidence|data|source/i.test(text)) {
      const sources = briefing.sourceSignals.map((item) => `${item.label}: ${item.count}`).join(", ");
      return `Unified data layer: ${sources}. The coordinator only uses alias-based evidence from the teacher's current class.`;
    }

    if (/outcome|effect|improved|follow-up/i.test(text)) {
      const outcome = briefing.outcomeEvaluation;
      const next = outcome?.nextteacherActions?.[0];
      if (!outcome || !outcome.metrics?.actionCount) return "Outcome evaluation will appear after teacher-approved messages, materials or follow-ups create later pupil signals.";
      return `${outcome.summary}${next ? ` Next suggested action: ${next.title}. ${next.detail}` : " No urgent follow-up signal yet."}`;
    }

    if (/privacy|safety|guardrail/i.test(text)) return briefing.safetynotes.join(" ");

    const firstTask = briefing.priorityTasks[0];
    if (!firstTask) return briefing.summary;
    return `${briefing.summary} Suggested first action: ${firstTask.title}. ${firstTask.nextStep}`;
  }

  function buildInsight(students, assignments, clusters, focus, sourceSignals) {
    const submittedCount = students.filter((student) => statusLookssubmitted(assignments[student.id])).length;
    const levelOneCount = students.filter((student) => student.level === "Level 1").length;
    const urgentCount = focus.filter((item) => item.priorityScore >= 5).length;
    const evidenceCount = sourceSignals.reduce((sum, item) => sum + item.count, 0);
    return {
      mainNeed: clusters[0]?.name || "no stuck signal yet",
      urgentCount,
      levelOneCount,
      evidenceCount,
      submittedCount,
      totalStudents: students.length,
      submittedRate: students.length ? Math.round((submittedCount / students.length) * 100) : 0,
      topStudentAlias: focus[0]?.studentAlias || null
    };
  }

  function buildsummary(className, topic, insight, priorityTasks) {
    const mainTask = priorityTasks[0]?.title || "Continue collecting evidence";
    return `${className} is working on ${topic}. The main learning need is ${insight.mainNeed}. ${insight.urgentCount} pupil aliases need priority review, and ${insight.submittedRate}% have submitted work. Suggested first teacher action: ${mainTask}.`;
  }

  function buildMisconceptionClusters(students, stuckSignals, questions) {
    const clusterMap = new Map();
    students.forEach((student) => {
      addClusterevidence(clusterMap, student.stuck || "pending evidence", {
        studentAlias: student.id,
        source: "student_profile",
        quote: student.evidence || student.memory || "",
        level: student.level || "",
        nextStep: student.next || ""
      });
    });
    stuckSignals.forEach((signal) => {
      addClusterevidence(clusterMap, signal.stuckType || "stuck signal", {
        studentAlias: signal.studentAlias,
        source: "stuck_signal",
        quote: signal.note || "",
        createdAt: signal.createdAt || null
      });
    });
    questions.forEach((question) => {
      addClusterevidence(clusterMap, inferNeedFromText(question.text || "student question"), {
        studentAlias: question.studentAlias,
        source: "student_question",
        quote: question.text || "",
        createdAt: question.createdAt || null
      });
    });

    return Array.from(clusterMap.entries()).map(([name, evidence]) => {
      const aliases = Array.from(new Set(evidence.map((item) => item.studentAlias).filter(Boolean)));
      return {
        id: slugFor(name),
        name,
        studentAliases: aliases,
        count: aliases.length,
        evidenceCount: evidence.filter((item) => item.quote).length,
        representativeevidence: evidence.find((item) => item.quote)?.quote || "",
        evidence: evidence.slice(0, 5),
        severity: aliases.length >= 3 ? "high" : aliases.length >= 2 ? "medium" : "low"
      };
    }).sort((a, b) => b.count - a.count || b.evidenceCount - a.evidenceCount);
  }

  function buildStudentFocus(context) {
    return context.students.map((student) => {
      const assignmentstatus = context.assignments[student.id] || "";
      const signals = context.stuckSignals.filter((item) => item.studentAlias === student.id);
      const questions = context.questions.filter((item) => item.studentAlias === student.id);
      const checkIns = context.checkIns.filter((item) => item.studentAlias === student.id);
      const messages = context.messages.filter((item) => item.studentAlias === student.id);
      const lastStudentmessage = messages.find((item) => item.senderRole === "student" || item.kind === "help_request");
      const score = priorityScore(student, assignmentstatus, signals, questions, checkIns, lastStudentmessage);
      const evidence = [
        evidenceItem("pupil profile", student.evidence || student.memory),
        evidenceItem("latest stuck signal", signals[0]?.note || signals[0]?.stuckType),
        evidenceItem("pupil question", questions[0]?.text),
        evidenceItem("learning check-in", checkIns[0]?.summaryForteacher),
        evidenceItem("message", lastStudentmessage?.text)
      ].filter((item) => item?.quote);
      return {
        studentAlias: student.id,
        priorityScore: score,
        priorityLabel: score >= 6 ? "priority" : score >= 3 ? "needs follow-up" : "monitor",
        level: student.level || "",
        status: student.status || "",
        mainNeed: signals[0]?.stuckType || student.stuck || inferNeedFromText(questions[0]?.text || ""),
        assignmentstatus,
        evidence,
        recommendedAction: recommendedActionFor(student, signals[0], checkIns[0]),
        targetChannel: "analysis"
      };
    }).filter((item) => item.priorityScore > 0).sort((a, b) => b.priorityScore - a.priorityScore || a.studentAlias.localeCompare(b.studentAlias));
  }

  function priorityScore(student, assignmentstatus, signals, questions, checkIns, lastStudentmessage) {
    let score = 0;
    const statusText = `${student.status || ""} ${student.level || ""} ${student.stuck || ""}`;
    if (/needs support|stuck|support/i.test(statusText)) score += 3;
    if (student.level === "Level 1") score += 2;
    if (signals.length) score += 2;
    if (questions.length) score += 1;
    if (checkIns.length) score += checkIns[0]?.wellbeingLevel >= 2 ? 3 : 2;
    if (lastStudentmessage) score += lastStudentmessage.kind === "help_request" ? 2 : 1;
    if (!statusLookssubmitted(assignmentstatus)) score += 1;
    return score;
  }

  function buildInterventions(clusters, focus) {
    return clusters.slice(0, 3).map((cluster) => {
      const focusedAliases = focus.filter((item) => cluster.studentAliases.includes(item.studentAlias)).slice(0, 5).map((item) => item.studentAlias);
      const targetLevel = levelForCluster(cluster, focus);
      return {
        id: `intervention-${cluster.id}`,
        misconceptionId: cluster.id,
        targetNeed: cluster.name,
        targetLevel,
        targetAliases: focusedAliases.length ? focusedAliases : cluster.studentAliases.slice(0, 5),
        strategy: strategyForNeed(cluster.name, targetLevel),
        teacherAction: "Review evidence, then approve a support message, targeted material or follow-up.",
        approvalRequired: true
      };
    });
  }

  function buildmessagedrafts(focus, topic) {
    return focus.slice(0, 3).map((item) => ({
      id: `message-draft-${item.studentAlias}`,
      studentAlias: item.studentAlias,
      tone: "calm, specific, one small step",
      text: `${item.studentAlias}, I can see the current stuck point is ${item.mainNeed}. Try this first: ${item.recommendedAction}. If it still does not make sense, send me the exact sentence that feels unclear.`,
      sourceevidence: item.evidence[0]?.quote || "",
      approvalRequired: true,
      topic
    }));
  }

  function buildmaterialdrafts(clusters, topic) {
    return clusters.slice(0, 3).map((cluster, index) => ({
      id: `material-draft-${cluster.id}`,
      title: `${cluster.name}: ${index === 0 ? "5 minute explainer" : "practice draft"}`,
      type: index === 0 ? "Handout + diagram" : "practice",
      topic,
      targetLevel: cluster.severity === "high" ? "Level 1 / Level 2" : "Level 2",
      goal: `Help pupils turn the ${cluster.name} stuck point into one completed learning step.`,
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
      tasks.push(task("outcome", "high", `Follow up with ${topOutcome.studentAlias}`, `${topOutcome.studentAlias} still has a stuck point or help signal after the teacher action.`, topOutcome.recommendation, "view details"));
    }

    if (topFocus) {
      tasks.push(task("student_support", "high", `Priority follow-up: ${topFocus.studentAlias}`, `${topFocus.studentAlias} has the highest current learning-support priority. Main need: ${topFocus.mainNeed}.`, "Open pupil details, review evidence, then approve a message or material.", "view pupils"));
    }

    if (topCluster) {
      tasks.push(task("diagnosis", topCluster.severity === "high" ? "high" : "medium", `Review ${topCluster.name} evidence`, `${topCluster.count} aliases share this learning need, with ${topCluster.evidenceCount} evidence items.`, "Confirm whether this is a class-level misconception before creating an intervention.", "view evidence"));
    }

    if (context.materialdrafts[0]) {
      tasks.push(task("material", "medium", `Create ${context.materialdrafts[0].title}`, `Draft material for the highest-volume learning need: ${context.materialdrafts[0].title}.`, "Open the content hub, generate a draft, then review before approval.", "Content hub"));
    }

    if (context.messagedrafts.length) {
      tasks.push(task("message", "medium", `Review ${context.messagedrafts.length} pupil reply drafts`, "Draft replies are based on stuck signals, questions or shared check-ins.", "Check tone and accuracy, then send through messages.", "messages"));
    }

    if (!tasks.length) {
      tasks.push(task("monitoring", "low", "Continue monitoring signals", "No priority stuck signal or message yet.", "Wait for assignments, questions, stuck signals or check-ins.", "Continue"));
    }

    return tasks;
  }

  function buildSourceSignals(students, assignments, questions, stuckSignals, checkIns, messages, teacherAgentActions, outcomeEvaluation) {
    const submitted = students.filter((student) => statusLookssubmitted(assignments[student.id])).length;
    return [
      { type: "students", label: "pupils", count: students.length },
      { type: "assignments", label: "submitted assignments", count: submitted },
      { type: "questions", label: "pupil questions", count: questions.length },
      { type: "stuck_signals", label: "stuck signals", count: stuckSignals.length },
      { type: "check_ins", label: "teacher-visible check-ins", count: checkIns.length },
      { type: "messages", label: "messages", count: messages.length },
      { type: "teacher_actions", label: "teacher actions", count: teacherAgentActions.length },
      { type: "outcomes", label: "outcome evaluations", count: outcomeEvaluation?.metrics?.actionCount || 0 }
    ];
  }

  function recommendedActionFor(student, signal, checkIn) {
    if (checkIn?.recommendedteacherAction) return checkIn.recommendedteacherAction;
    const need = signal?.stuckType || student.stuck || "";
    if (/diagram|graph|visual|waveform/i.test(need)) return "Use one accessible diagram, then ask the pupil to name the single part that still does not line up.";
    if (/formula|symbol|definition|concept/i.test(need)) return "Translate one symbol or definition into a plain sentence before doing a calculation.";
    if (/example|transfer|apply/i.test(need)) return "Use one near-transfer example before asking for a full problem.";
    return student.next || "Give one small completed step.";
  }

  function strategyForNeed(need, targetLevel) {
    if (/diagram|graph|visual|waveform/i.test(need)) return `${targetLevel}: compare the left and right parts of the diagram before calculation.`;
    if (/formula|symbol|definition|concept/i.test(need)) return `${targetLevel}: translate the key symbol or concept into plain language first.`;
    if (/example|transfer|apply/i.test(need)) return `${targetLevel}: move from a worked example to one near-transfer question.`;
    return `${targetLevel}: start with one specific question, then one short practice step.`;
  }

  function levelForCluster(cluster, focus) {
    const related = focus.filter((item) => cluster.studentAliases.includes(item.studentAlias));
    if (related.some((item) => item.level === "Level 1")) return "Level 1";
    if (related.some((item) => item.level === "Level 2")) return "Level 2";
    return cluster.severity === "high" ? "Level 1 / Level 2" : "Level 2";
  }

  function addClusterevidence(map, rawName, evidence) {
    const name = String(rawName || "pending evidence").trim() || "pending evidence";
    if (!map.has(name)) map.set(name, []);
    map.get(name).push({ ...evidence, quote: cleanText(evidence.quote) });
  }

  function inferNeedFromText(text) {
    const value = String(text || "");
    if (/diagram|graph|visual|frequency|waveform/i.test(value)) return "diagram mapping";
    if (/formula|symbol|definition|concept|meaning/i.test(value)) return "formula or concept meaning";
    if (/example|transfer|apply/i.test(value)) return "example transfer";
    return "student question";
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
    return (Array.isArray(items) ? items : []).filter((item) => !item.studentAlias || aliases.has(item.studentAlias));
  }

  function handledAliasesFromActions(actions) {
    const seen = new Set();
    const handled = new Set();
    (actions || []).forEach((action) => {
      if (!action.studentAlias || seen.has(action.studentAlias)) return;
      seen.add(action.studentAlias);
      if (action.type === "dismiss" || action.status === "handled") handled.add(action.studentAlias);
    });
    return handled;
  }

  function filterByAlias(items, aliases) {
    return (Array.isArray(items) ? items : []).filter((item) => aliases.has(item.studentAlias));
  }

  function sortRecent(items) {
    return [...items].sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));
  }

  function statusLookssubmitted(status) {
    return /submitted|turned in|complete/i.test(String(status || ""));
  }

  function slugFor(value) {
    return String(value || "item").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 48) || "item";
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
      classId: context.classId || state.activeclassId || null,
      summary: "Outcome engine is waiting for teacher-approved actions and later pupil signals.",
      metrics: {
        actionCount: 0,
        improvedCount: 0,
        needsFollowupCount: 0,
        monitoringCount: 0,
        waitingSignalCount: 0
      },
      evaluations: [],
      nextteacherActions: [],
      sourceSignals: [],
      guardrails: []
    };
  }

  const api = {
    buildteacherBriefing,
    answerteacherAgentquestion
  };

  global.TeachFlowteacherAgentOrchestrator = api;

  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
