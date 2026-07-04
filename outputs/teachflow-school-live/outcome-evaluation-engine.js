(function (global) {
  const ACTION_LABELS = {
    send_message: "support message",
    assign_material: "assigned material",
    schedule_followup: "scheduled follow-up"
  };

  const STATUS_LABELS = {
    improved: "Improved",
    needs_followup: "Needs follow-up",
    monitoring: "Monitor",
    no_later_signal: "Awaiting signal"
  };

  function buildOutcomeEvaluation(input, options) {
    const state = input || {};
    const context = options?.context || state.session || {};
    const students = Array.isArray(state.students) ? state.students : [];
    const aliases = new Set(students.map((student) => student.id));
    const actions = sortRecent(Array.isArray(state.teacherAgentActions) ? state.teacherAgentActions : [])
      .filter((action) => action?.studentAlias && aliases.has(action.studentAlias) && ["send_message", "assign_material", "schedule_followup"].includes(action.type));
    const evaluations = actions.map((action) => evaluateAction(action, state)).filter(Boolean);
    const metrics = buildMetrics(evaluations);

    return {
      engineId: "outcome-evaluation-engine",
      generatedAt: new Date().toISOString(),
      classId: context.classId || state.activeclassId || null,
      summary: buildSummary(metrics),
      metrics,
      evaluations,
      nextteacherActions: buildNextteacherActions(evaluations),
      sourceSignals: [
        { type: "teacher_agent_actions", label: "teacher-approved actions", count: actions.length },
        { type: "student_followup_signals", label: "student follow-up signals", count: evaluations.reduce((sum, item) => sum + item.evidence.length, 0) }
      ],
      guardrails: [
        "Outcome evaluation only compares learning signals; it is not a grade or clinical judgement.",
        "Evidence is shown only when it follows a teacher-approved action.",
        "Use pupil aliases only; do not expose real identities."
      ]
    };
  }

  function evaluateAction(action, state) {
    const alias = action.studentAlias;
    const positiveEvidence = [];
    const concernEvidence = [];
    const neutralEvidence = [];

    followupItems(state.auditEvents, action)
      .filter((event) => event.action === "update_assignment" && matchesAlias(event, alias) && statusLooksSubmitted(event.details?.status))
      .forEach((event) => positiveEvidence.push(evidence("assignment", "assignment submitted", event.details?.status || "Pupil submitted assignment.", event.timestamp, event)));

    followupItems(state.messages, action)
      .filter((message) => message.studentAlias === alias && message.senderRole === "student")
      .forEach((message) => {
        const text = message.text || "";
        const responseType = message.responseType || "";
        if (responseType === "improved" || looksPositive(text)) {
          positiveEvidence.push(evidence("student_message", "pupil reply", text, message.createdAt, message));
        } else if (responseType === "still_stuck" || looksConcern(text)) {
          concernEvidence.push(evidence("student_message", "pupil reply", text, message.createdAt, message));
        } else {
          neutralEvidence.push(evidence("student_message", "pupil note", text, message.createdAt, message));
        }
      });

    followupItems(state.stuckSignals, action)
      .filter((signal) => signal.studentAlias === alias)
      .forEach((signal) => {
        concernEvidence.push(evidence("stuck_signal", signal.stuckType || "stuck signal", signal.note || signal.stuckType || "Pupil sent another stuck signal.", signal.createdAt, signal));
      });

    followupItems(state.questions, action)
      .filter((question) => question.studentAlias === alias)
      .forEach((question) => {
        const text = question.text || "";
        const target = looksPositive(text) ? positiveEvidence : concernEvidence;
        target.push(evidence("student_question", "pupil question", text, question.createdAt, question));
      });

    followupItems(state.checkIns, action)
      .filter((checkIn) => checkIn.studentAlias === alias)
      .forEach((checkIn) => {
        const quote = checkIn.summaryForteacher || checkIn.teacherHelpdraft || checkIn.stateLabel || checkIn.state || "Pupil updated learning status.";
        if (["understand", "partly_understand"].includes(checkIn.state) && Number(checkIn.wellbeingLevel || 0) <= 1) {
          positiveEvidence.push(evidence("check_in", "learning check-in", quote, checkIn.createdAt, checkIn));
        } else if (["stuck", "frustrated", "want_teacher_help"].includes(checkIn.state) || Number(checkIn.wellbeingLevel || 0) >= 2) {
          concernEvidence.push(evidence("check_in", "learning check-in", quote, checkIn.createdAt, checkIn));
        } else {
          neutralEvidence.push(evidence("check_in", "learning check-in", quote, checkIn.createdAt, checkIn));
        }
      });

    const status = outcomeStatus(positiveEvidence, concernEvidence, neutralEvidence);
    const allEvidence = sortRecent([...concernEvidence, ...positiveEvidence, ...neutralEvidence]).slice(0, 5);

    return {
      id: `outcome-${action.id}`,
      actionId: action.id,
      actionType: action.type,
      actionLabel: ACTION_LABELS[action.type] || "teacher action",
      actionTitle: action.title || ACTION_LABELS[action.type] || "teacher action",
      studentAlias: alias,
      status,
      statusLabel: STATUS_LABELS[status],
      summary: outcomeSummaryFor(status, alias, action, positiveEvidence, concernEvidence, neutralEvidence),
      recommendation: recommendationFor(status, action, concernEvidence),
      evidence: allEvidence,
      positiveevidenceCount: positiveEvidence.length,
      concernevidenceCount: concernEvidence.length,
      neutralevidenceCount: neutralEvidence.length,
      studentReadAt: action.studentReadAt || null,
      studentResponseAt: action.studentResponseAt || null,
      studentResponseType: action.studentResponseType || null,
      latestSignalAt: allEvidence[0]?.createdAt || action.createdAt || null,
      createdAt: action.createdAt || null
    };
  }

  function buildMetrics(evaluations) {
    const metrics = {
      actionCount: evaluations.length,
      improvedCount: 0,
      needsFollowupCount: 0,
      monitoringCount: 0,
      waitingSignalCount: 0
    };
    evaluations.forEach((item) => {
      if (item.status === "improved") metrics.improvedCount += 1;
      if (item.status === "needs_followup") metrics.needsFollowupCount += 1;
      if (item.status === "monitoring") metrics.monitoringCount += 1;
      if (item.status === "no_later_signal") metrics.waitingSignalCount += 1;
    });
    return metrics;
  }

  function buildSummary(metrics) {
    if (!metrics.actionCount) return "No teacher-approved actions yet. Outcome evidence will appear after messages, materials or follow-ups are sent.";
    return `Tracking ${metrics.actionCount} teacher actions: ${metrics.improvedCount} improved, ${metrics.needsFollowupCount} need follow-up, ${metrics.waitingSignalCount} are waiting for later pupil signals.`;
  }

  function buildNextteacherActions(evaluations) {
    return evaluations
      .filter((item) => item.status === "needs_followup" || item.status === "no_later_signal")
      .slice(0, 3)
      .map((item) => ({
        studentAlias: item.studentAlias,
        status: item.status,
        title: item.status === "needs_followup" ? `Follow up with ${item.studentAlias}` : `Wait for ${item.studentAlias}'s next signal`,
        detail: item.recommendation
      }));
  }

  function outcomeStatus(positiveEvidence, concernEvidence, neutralEvidence) {
    if (concernEvidence.length && concernEvidence.length >= positiveEvidence.length) return "needs_followup";
    if (positiveEvidence.length) return "improved";
    if (neutralEvidence.length) return "monitoring";
    return "no_later_signal";
  }

  function outcomeSummaryFor(status, alias, action, positiveEvidence, concernEvidence, neutralEvidence) {
    if (status === "improved") return `${alias} showed an improved learning signal after ${action.title || ACTION_LABELS[action.type]}.`;
    if (status === "needs_followup") {
      const top = concernEvidence[0]?.label || "learning signal";
      return `${alias} still has a follow-up stuck point or help signal after the teacher action (${top}).`;
    }
    if (status === "monitoring") return `${alias} has later evidence, but it is not enough to judge the effect yet.`;
    return `${alias} has no later pupil signal after this teacher action yet.`;
  }

  function recommendationFor(status, action, concernEvidence) {
    if (status === "improved") return "Keep monitoring. Confirm the understanding with one short assignment or question.";
    if (status === "needs_followup") {
      if (concernEvidence.some((item) => /stuck/i.test(item.label))) return "Send a smaller explanation or targeted material, then ask the pupil to complete one tiny step.";
      return "Open the pupil detail modal, review the quote, and send a short follow-up.";
    }
    if (status === "monitoring") return "Ask one low-stress confirmation question before deciding the next intervention.";
    if (action.type === "assign_material") return "Wait for the pupil to open the material, submit work, or send a question.";
    return "Wait for a pupil reply, submission, or shared stuck signal.";
  }

  function followupItems(items, action) {
    const actionTime = timeValue(action.createdAt);
    const actionHasExplicitResponse = Boolean(action.studentResponseAt || action.studentResponseType);
    return (Array.isArray(items) ? items : []).filter((item) => {
      if (isLinkedToAction(item, action)) return true;
      if (linkedActionId(item)) return false;
      if (actionHasExplicitResponse) return false;
      const itemTime = timeValue(item.createdAt || item.timestamp);
      return itemTime && itemTime > actionTime;
    });
  }

  function isLinkedToAction(item, action) {
    const linkedId = linkedActionId(item);
    return Boolean(linkedId && action?.id && linkedId === action.id);
  }

  function linkedActionId(item) {
    return item?.linkedteacherActionId ||
      item?.details?.linkedteacherActionId ||
      item?.responseTo?.teacherActionId ||
      item?.metadata?.linkedteacherActionId ||
      null;
  }

  function evidenceRelation(item, action) {
    return isLinkedToAction(item, action) ? "linked" : "later_signal";
  }

  function matchesAlias(event, alias) {
    return event.studentAlias === alias || event.targetId === alias || event.details?.studentAlias === alias;
  }

  function evidence(source, label, quote, createdAt, item, action) {
    return {
      source,
      label,
      quote: cleanText(quote),
      linkedteacherActionId: linkedActionId(item),
      responseType: item?.responseType || item?.details?.responseType || null,
      relation: action ? evidenceRelation(item, action) : (item?.linkedteacherActionId || item?.details?.linkedteacherActionId ? "linked" : "later_signal"),
      createdAt: createdAt || null
    };
  }

  function looksPositive(text) {
    return /understand|got it|makes sense|finished|submitted|helped|clear|i get it|completed/i.test(String(text || ""));
  }

  function looksConcern(text) {
    return /still|stuck|confus|don't understand|do not understand|help|lost|unclear|not sure|cannot/i.test(String(text || ""));
  }

  function statusLooksSubmitted(status) {
    return /submitted|turned in|complete/i.test(String(status || ""));
  }

  function sortRecent(items) {
    return [...items].sort((a, b) => timeValue(b.createdAt || b.timestamp) - timeValue(a.createdAt || a.timestamp));
  }

  function timeValue(value) {
    const time = new Date(value || 0).getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  function cleanText(value) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, 260);
  }

  const api = { buildOutcomeEvaluation };

  global.TeachFlowOutcomeEvaluationEngine = api;

  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
