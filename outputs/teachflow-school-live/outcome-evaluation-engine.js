(function (global) {
  const ACTION_LABELS = {
    send_message: "支持消息",
    assign_material: "学习材料",
    schedule_followup: "短跟进"
  };

  const STATUS_LABELS = {
    improved: "已改善",
    needs_followup: "仍需跟进",
    monitoring: "继续观察",
    no_later_signal: "等待后续信号"
  };

  function buildOutcomeEvaluation(input, options) {
    const state = input || {};
    const context = options?.context || state.session || {};
    const students = Array.isArray(state.students) ? state.students : [];
    const aliases = new Set(students.map((student) => student.id));
    const actions = sortRecent(Array.isArray(state.teacherAgentActions) ? state.teacherAgentActions : [])
      .filter((action) => {
        return action?.studentAlias &&
          aliases.has(action.studentAlias) &&
          ["send_message", "assign_material", "schedule_followup"].includes(action.type);
      });
    const evaluations = actions.map((action) => evaluateAction(action, state)).filter(Boolean);
    const metrics = buildMetrics(evaluations);

    return {
      engineId: "outcome-evaluation-engine",
      generatedAt: new Date().toISOString(),
      classId: context.classId || state.activeClassId || null,
      summary: buildSummary(metrics),
      metrics,
      evaluations,
      nextTeacherActions: buildNextTeacherActions(evaluations),
      sourceSignals: [
        { type: "teacher_agent_actions", label: "老师已批准动作", count: actions.length },
        { type: "student_followup_signals", label: "动作后学生信号", count: evaluations.reduce((sum, item) => sum + item.evidence.length, 0) }
      ],
      guardrails: [
        "成效回流只比较学习信号，不做成绩定性或心理判断。",
        "没有后续证据时显示等待信号，不推断老师动作无效。",
        "所有结果使用学生别名，不暴露真实身份。"
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
      .forEach((event) => positiveEvidence.push(evidence("assignment", "作业提交", event.details?.status || "学生已提交作业。", event.timestamp, event)));

    followupItems(state.messages, action)
      .filter((message) => message.studentAlias === alias && message.senderRole === "student")
      .forEach((message) => {
        const text = message.text || "";
        const responseType = message.responseType || "";
        if (responseType === "improved" || looksPositive(text)) {
          positiveEvidence.push(evidence("student_message", "学生回复", text, message.createdAt, message));
        } else if (responseType === "still_stuck" || looksConcern(text)) {
          concernEvidence.push(evidence("student_message", "学生回复", text, message.createdAt, message));
        } else {
          neutralEvidence.push(evidence("student_message", "学生互动", text, message.createdAt, message));
        }
      });

    followupItems(state.stuckSignals, action)
      .filter((signal) => signal.studentAlias === alias)
      .forEach((signal) => {
        concernEvidence.push(evidence("stuck_signal", signal.stuckType || "新卡点", signal.note || signal.stuckType || "学生再次发送卡点。", signal.createdAt, signal));
      });

    followupItems(state.questions, action)
      .filter((question) => question.studentAlias === alias)
      .forEach((question) => {
        const text = question.text || "";
        const target = looksPositive(text) ? positiveEvidence : concernEvidence;
        target.push(evidence("student_question", "学生提问", text, question.createdAt, question));
      });

    followupItems(state.checkIns, action)
      .filter((checkIn) => checkIn.studentAlias === alias)
      .forEach((checkIn) => {
        const quote = checkIn.summaryForTeacher || checkIn.teacherHelpDraft || checkIn.stateLabel || checkIn.state || "学生更新了学习状态。";
        if (["understand", "partly_understand"].includes(checkIn.state) && Number(checkIn.wellbeingLevel || 0) <= 1) {
          positiveEvidence.push(evidence("check_in", "学习 Check-in", quote, checkIn.createdAt, checkIn));
        } else if (["stuck", "frustrated", "want_teacher_help"].includes(checkIn.state) || Number(checkIn.wellbeingLevel || 0) >= 2) {
          concernEvidence.push(evidence("check_in", "学习 Check-in", quote, checkIn.createdAt, checkIn));
        } else {
          neutralEvidence.push(evidence("check_in", "学习 Check-in", quote, checkIn.createdAt, checkIn));
        }
      });

    const status = outcomeStatus(positiveEvidence, concernEvidence, neutralEvidence);
    const allEvidence = sortRecent([...concernEvidence, ...positiveEvidence, ...neutralEvidence]).slice(0, 5);

    return {
      id: `outcome-${action.id}`,
      actionId: action.id,
      actionType: action.type,
      actionLabel: ACTION_LABELS[action.type] || "老师动作",
      actionTitle: action.title || ACTION_LABELS[action.type] || "老师动作",
      studentAlias: alias,
      status,
      statusLabel: STATUS_LABELS[status],
      summary: outcomeSummaryFor(status, alias, action, positiveEvidence, concernEvidence, neutralEvidence),
      recommendation: recommendationFor(status, action, concernEvidence),
      evidence: allEvidence,
      positiveEvidenceCount: positiveEvidence.length,
      concernEvidenceCount: concernEvidence.length,
      neutralEvidenceCount: neutralEvidence.length,
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
    if (!metrics.actionCount) return "还没有老师批准后的动作，等待先产生消息、材料或短跟进。";
    return `已追踪 ${metrics.actionCount} 个老师动作：${metrics.improvedCount} 个出现改善信号，${metrics.needsFollowupCount} 个仍需跟进，${metrics.waitingSignalCount} 个等待学生后续信号。`;
  }

  function buildNextTeacherActions(evaluations) {
    return evaluations
      .filter((item) => item.status === "needs_followup" || item.status === "no_later_signal")
      .slice(0, 3)
      .map((item) => ({
        studentAlias: item.studentAlias,
        status: item.status,
        title: item.status === "needs_followup"
          ? `复盘 ${item.studentAlias} 的支持动作`
          : `等待 ${item.studentAlias} 的后续学习信号`,
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
    if (status === "improved") {
      return `${alias} 在「${action.title || ACTION_LABELS[action.type]}」后出现了积极学习信号。`;
    }
    if (status === "needs_followup") {
      const top = concernEvidence[0]?.label || "后续信号";
      return `${alias} 在老师动作后仍出现「${top}」，需要再次跟进。`;
    }
    if (status === "monitoring") {
      return `${alias} 已有后续互动，但证据还不足以判断是否改善。`;
    }
    return `${alias} 还没有动作后的新学习信号，暂时不判断效果。`;
  }

  function recommendationFor(status, action, concernEvidence) {
    if (status === "improved") return "保持观察，可在下一轮作业或提问中确认是否稳定。";
    if (status === "needs_followup") {
      if (concernEvidence.some((item) => /卡点|stuck/i.test(item.label))) return "建议换一种讲解材料，先让学生完成一个更小的可观察步骤。";
      return "建议老师打开学生详情，复核原句后安排一次短跟进。";
    }
    if (status === "monitoring") return "建议给一个低压力确认问题，收集更明确的理解证据。";
    if (action.type === "assign_material") return "等待学生打开材料、提交作业或发送新的问题后再评估。";
    return "等待学生回复、提交或分享新卡点后再评估。";
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
    return item?.linkedTeacherActionId ||
      item?.details?.linkedTeacherActionId ||
      item?.responseTo?.teacherActionId ||
      item?.metadata?.linkedTeacherActionId ||
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
      linkedTeacherActionId: linkedActionId(item),
      responseType: item?.responseType || item?.details?.responseType || null,
      relation: action ? evidenceRelation(item, action) : (item?.linkedTeacherActionId || item?.details?.linkedTeacherActionId ? "linked" : "later_signal"),
      createdAt: createdAt || null
    };
  }

  function looksPositive(text) {
    return /懂了|明白|清楚|可以了|会了|完成|提交|谢谢|有帮助|understand|got it|makes sense|finished|submitted/i.test(String(text || ""));
  }

  function looksConcern(text) {
    return /不懂|不会|还是|卡|困惑|看不懂|没懂|挫败|焦虑|help|stuck|confus|don't understand/i.test(String(text || ""));
  }

  function statusLooksSubmitted(status) {
    return /已提交|submitted|turn(ed)? in|complete/i.test(String(status || ""));
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

  const api = {
    buildOutcomeEvaluation
  };

  global.TeachFlowOutcomeEvaluationEngine = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
