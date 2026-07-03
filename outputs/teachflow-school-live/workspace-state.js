(function (global) {
  const STORAGE_KEY = "teachflow.school-live.workspace.v1";
  const API_ROOT = "/api/workspace";
  const WORKSPACE_EVENT = "teachflow-workspace-updated";
  let memoryState = null;

  const DEFAULT_CLASS_ID = "class-unassigned";
  const DEFAULT_TEACHER_ID = "teacher-lin";
  const DEFAULT_STUDENT_ALIAS = "S001";

  const defaultAccounts = [
    {
      id: DEFAULT_TEACHER_ID,
      role: "teacher",
      displayName: "林老师",
      classIds: [DEFAULT_CLASS_ID],
      permissions: ["read_class", "read_students", "approve_materials", "export_materials", "send_feedback"]
    },
    {
      id: "test-teacher",
      role: "teacher",
      displayName: "测试老师",
      classIds: [DEFAULT_CLASS_ID],
      permissions: ["read_class", "read_students", "approve_materials", "export_materials", "send_feedback"]
    },
    {
      id: "student-s002",
      role: "student",
      displayName: "S002",
      classIds: [DEFAULT_CLASS_ID],
      studentAlias: DEFAULT_STUDENT_ALIAS,
      permissions: ["read_self", "submit_assignment", "ask_agent", "send_stuck_signal", "send_check_in"]
    },
    {
      id: "test-student-s002",
      role: "student",
      displayName: "测试学生 S002",
      classIds: [DEFAULT_CLASS_ID],
      studentAlias: DEFAULT_STUDENT_ALIAS,
      permissions: ["read_self", "submit_assignment", "ask_agent", "send_stuck_signal", "send_check_in"]
    },
    {
      id: "school-admin-demo",
      role: "school_admin",
      displayName: "教研负责人",
      classIds: [DEFAULT_CLASS_ID, "class-mechanics-b", "class-ap-electric"],
      permissions: ["read_aggregate", "read_audit_log"]
    }
  ];

  const defaultRolePolicies = {
    teacher: {
      label: "老师",
      canReadClass: true,
      canReadAllStudents: true,
      canWriteOwnStudentSignals: false,
      canApprove: true,
      visibleData: "本班级匿名学生、原句证据、AI 建议、审批记录"
    },
    student: {
      label: "学生",
      canReadClass: false,
      canReadAllStudents: false,
      canWriteOwnStudentSignals: true,
      canApprove: false,
      visibleData: "自己的材料、作业状态、提问记录、卡点记录"
    },
    school_admin: {
      label: "学校管理",
      canReadClass: true,
      canReadAllStudents: false,
      canWriteOwnStudentSignals: false,
      canApprove: false,
      visibleData: "班级聚合趋势与安全审计，不看个人细节"
    }
  };

  const defaultStudents = [
    {
      id: "S002",
      short: "02",
      status: "部分理解",
      level: "Level 2",
      stuck: "图示转换",
      next: "重新标注波形与频率对应关系",
      evidence: "我看不懂图里左边和右边怎么对应。",
      memory: "已阅读讲义，作业草稿未提交，主动打开过 AI 学习支持。"
    },
    {
      id: "S004",
      short: "04",
      status: "稳定推进",
      level: "Level 3",
      stuck: "应用迁移",
      next: "完成真实信号挑战题",
      evidence: "我能解释音乐例子，但换成地震信号还不确定。",
      memory: "已提交小测，理解地图显示概念较稳。"
    },
    {
      id: "S009",
      short: "09",
      status: "需要支持",
      level: "Level 1",
      stuck: "公式含义",
      next: "把每个符号翻译成一句话",
      evidence: "我记得公式，但不知道每个符号是什么意思。",
      memory: "连续两次在公式相关问题上停留较久。"
    },
    {
      id: "S014",
      short: "14",
      status: "需要支持",
      level: "Level 1",
      stuck: "图示转换",
      next: "观看低门槛图示讲解",
      evidence: "频率图和原来的波形之间关系看不出来。",
      memory: "小测答案引用了图，但没有说明左右对应。"
    },
    {
      id: "S018",
      short: "18",
      status: "准备应用",
      level: "Level 3",
      stuck: "应用迁移",
      next: "尝试解释医学成像场景",
      evidence: "我知道频域有用，但不知道现实里怎么用。",
      memory: "已完成基础题，正在进入拓展任务。"
    },
    {
      id: "S021",
      short: "21",
      status: "部分理解",
      level: "Level 2",
      stuck: "例题迁移",
      next: "做一个同构变式题",
      evidence: "我能跟例题，但换一个信号就不会了。",
      memory: "AI 学习支持建议先做一步式变式。"
    },
    {
      id: "S026",
      short: "26",
      status: "稳定推进",
      level: "Level 2",
      stuck: "概念表达",
      next: "用自己的话复述时域与频域",
      evidence: "我大概懂了，但说不清楚。",
      memory: "已提交作业，等待老师一句话反馈。"
    },
    {
      id: "S031",
      short: "31",
      status: "观察中",
      level: "Level 2",
      stuck: "定义没懂",
      next: "补一个生活化定义例子",
      evidence: "频域到底是什么，我还没有画面感。",
      memory: "刚开始阅读讲义，尚未提交小测。"
    }
  ];

  function multiClassDemoStudents() {
    return [
      demoStudent("S101", "01", "稳定推进", "Level 3", "受力图迁移", "完成变式题并解释摩擦方向", "我能画出重力和支持力，摩擦力还要再确认。", "高一物理 B 班学生，已提交第一次力学小测。"),
      demoStudent("S104", "04", "需要支持", "Level 1", "受力图遗漏", "重新画隔离体受力图", "我总是忘记把支持力画出来。", "高一物理 B 班学生，需要老师给一个低门槛图示。"),
      demoStudent("S108", "08", "部分理解", "Level 2", "牛顿第二定律符号", "把 F=ma 翻译成一句话", "我知道公式，但是不知道什么时候用合力。", "高一物理 B 班学生，正在建立公式含义。"),
      demoStudent("S113", "13", "观察中", "Level 2", "题意建模", "先圈出研究对象", "换成斜面题以后我不知道先看谁。", "高一物理 B 班学生，已保存草稿。"),
      demoStudent("S119", "19", "稳定推进", "Level 3", "应用迁移", "尝试解释电梯加速场景", "电梯例子我能说出来，但是还想再练一道。", "高一物理 B 班学生，完成度较高。"),
      demoStudent("S126", "26", "需要支持", "Level 1", "合力方向", "用箭头合成两个力", "我不确定两个力加起来往哪里。", "高一物理 B 班学生，需要图形化支持。"),
      demoStudent("S201", "01", "准备应用", "Level 3", "电场线解释", "解释点电荷周围的电场线", "我能看懂电场线密的地方场强更大。", "AP Physics 班学生，已进入应用题。"),
      demoStudent("S204", "04", "部分理解", "Level 2", "电势与电场混淆", "区分能量视角和力的视角", "我经常把电势和电场方向混在一起。", "AP Physics 班学生，概念边界仍需澄清。"),
      demoStudent("S207", "07", "稳定推进", "Level 3", "图像解释", "完成等势线挑战题", "等势线和电场线垂直这个关系我能用。", "AP Physics 班学生，适合挑战任务。"),
      demoStudent("S212", "12", "需要支持", "Level 1", "单位和量纲", "先整理每个物理量单位", "题里单位一多我就乱了。", "AP Physics 班学生，需要单位表支持。"),
      demoStudent("S218", "18", "观察中", "Level 2", "公式选择", "判断先用库仑定律还是电势能", "我能算，但第一步常常选错公式。", "AP Physics 班学生，需要决策树。"),
      demoStudent("S223", "23", "部分理解", "Level 2", "场景迁移", "把带电粒子运动拆成受力和运动两步", "我会单独算力，但不会接到运动上。", "AP Physics 班学生，正在做跨主题连接。")
    ];
  }

  function demoStudent(id, short, status, level, stuck, next, evidence, memory) {
    return { id, short, status, level, stuck, next, evidence, memory };
  }

  function demoClasses(students) {
    return [
      {
        id: DEFAULT_CLASS_ID,
        name: "高二物理 A 班",
        course: "物理",
        topic: "傅里叶变换",
        teacherIds: [DEFAULT_TEACHER_ID],
        studentAliases: defaultStudents.map((student) => student.id),
        status: "试点中"
      },
      {
        id: "class-mechanics-b",
        name: "高一物理 B 班",
        course: "物理",
        topic: "牛顿运动定律",
        teacherIds: ["teacher-mei"],
        studentAliases: students.filter((student) => /^S1/.test(student.id)).map((student) => student.id),
        status: "扩大样本"
      },
      {
        id: "class-ap-electric",
        name: "AP Physics",
        course: "AP Physics",
        topic: "Electric Fields",
        teacherIds: ["teacher-chen"],
        studentAliases: students.filter((student) => /^S2/.test(student.id)).map((student) => student.id),
        status: "高阶试点"
      }
    ];
  }

  function demoAssignments() {
    return {
      S002: "草稿未提交",
      S004: "已提交",
      S009: "草稿未提交",
      S014: "草稿未提交",
      S018: "已提交",
      S021: "已提交",
      S026: "已提交",
      S031: "草稿未提交",
      S101: "已提交",
      S104: "草稿未提交",
      S108: "已提交",
      S113: "已保存草稿",
      S119: "已提交",
      S126: "草稿未提交",
      S201: "已提交",
      S204: "已提交",
      S207: "已提交",
      S212: "草稿未提交",
      S218: "已保存草稿",
      S223: "已提交"
    };
  }

  function demoQuestions() {
    return [
      demoQuestion("S104", "受力图里支持力一定垂直接触面吗？", 52),
      demoQuestion("S204", "电势高是不是代表电场一定强？", 44),
      demoQuestion("S212", "为什么电场单位可以写成 N/C？", 31),
      demoQuestion("S108", "合力和单个力在公式里怎么区分？", 18)
    ];
  }

  function demoStuckSignals() {
    return [
      demoSignal("S104", "受力图遗漏", "我画图的时候不知道哪些力必须画。", 56),
      demoSignal("S126", "合力方向", "两个箭头合起来的方向我总是判断错。", 47),
      demoSignal("S204", "电势与电场混淆", "我不知道电势和电场哪个是方向。", 39),
      demoSignal("S212", "单位和量纲", "单位一换我就不知道公式还能不能用。", 26),
      demoSignal("S014", "图示转换", "频率图和原来的波形之间关系看不出来。", 12)
    ];
  }

  function demoCheckIns() {
    return [
      createCheckInRecord("S002", {
        topic: "傅里叶变换",
        state: "partly_understand",
        note: "我知道 Fourier Transform 和 frequency 有关，但不理解为什么它有用。",
        shareChoice: "teacher_summary"
      }, offsetIso(16)),
      createCheckInRecord("S009", {
        topic: "傅里叶变换",
        state: "frustrated",
        note: "我一看到公式就觉得自己学不会。",
        shareChoice: "teacher_summary"
      }, offsetIso(24)),
      createCheckInRecord("S014", {
        topic: "傅里叶变换",
        state: "stuck",
        note: "我不理解频率图和原来的波形怎么对应。",
        shareChoice: "teacher_summary"
      }, offsetIso(31))
    ];
  }

  function demoMessages() {
    return [
      createMessageRecord("S002", {
        senderRole: "teacher",
        senderId: DEFAULT_TEACHER_ID,
        senderLabel: "林老师",
        text: "我看到你对图示转换还有一点不确定。先看 Level 2 的左/右对应图，再把不懂的句子发给我。",
        kind: "teacher_reply"
      }, offsetIso(14)),
      createMessageRecord("S002", {
        senderRole: "student",
        senderId: "student-s002",
        senderLabel: "S002",
        text: "老师，我能理解时域，但右边频率图还是对应不上。",
        kind: "chat"
      }, offsetIso(18)),
      createMessageRecord("S014", {
        senderRole: "system",
        senderId: "system",
        senderLabel: "需要帮助",
        text: "S014 发送了图示转换卡点：频率图和原来的波形之间关系看不出来。",
        kind: "help_request"
      }, offsetIso(12))
    ];
  }

  function demoQuestion(studentAlias, text, minutesAgo) {
    return {
      id: `question-demo-${studentAlias}`,
      studentAlias,
      text,
      createdAt: offsetIso(minutesAgo)
    };
  }

  function demoSignal(studentAlias, stuckType, note, minutesAgo) {
    return {
      id: `stuck-demo-${studentAlias}`,
      studentAlias,
      stuckType,
      note,
      createdAt: offsetIso(minutesAgo),
      status: "sent_to_teacher"
    };
  }

  function demoAuditEvents() {
    return [
      demoAudit("pilot_class_synced", "school-admin-demo", "school_admin", "class-ap-electric", "class", "class-ap-electric", 65),
      demoAudit("pilot_class_synced", "school-admin-demo", "school_admin", "class-mechanics-b", "class", "class-mechanics-b", 60),
      demoAudit("teacher_material_review", "teacher-mei", "teacher", "class-mechanics-b", "class", "class-mechanics-b", 42),
      demoAudit("teacher_material_review", "teacher-chen", "teacher", "class-ap-electric", "class", "class-ap-electric", 34)
    ];
  }

  function demoAudit(action, actorId, role, classId, targetType, targetId, minutesAgo) {
    return {
      id: `audit-demo-${action}-${classId}-${minutesAgo}`,
      timestamp: offsetIso(minutesAgo),
      action,
      actorId,
      role,
      classId,
      studentAlias: null,
      targetType,
      targetId,
      details: {}
    };
  }

  function offsetIso(minutesAgo) {
    return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
  }

  function defaultState() {
    return {
      version: 1,
      school: {
        id: "school-live",
        name: "TeachFlow School"
      },
      activeClassId: null,
      accounts: [],
      rolePolicies: clone(defaultRolePolicies),
      classes: [],
      className: "",
      topic: "",
      students: [],
      assignments: {},
      questions: [],
      stuckSignals: [],
      checkIns: [],
      messages: [],
      teacherAgentActions: [],
      auditEvents: [],
      approvedMaterials: [],
      draftMaterials: [],
      inviteLinks: [],
      schoolMode: "live_empty",
      updatedAt: null
    };
  }

  function createDefaultState() {
    return clone(defaultState());
  }

  function getState() {
    const stored = readStoredState();
    const state = normalizeState(stored || defaultState());
    if (!stored) writeState(state);
    return clone(state);
  }

  function setState(nextState) {
    const state = normalizeState(nextState);
    state.updatedAt = new Date().toISOString();
    writeState(state);
    emitWorkspaceUpdate(state);
    return clone(state);
  }

  function resetState() {
    const state = defaultState();
    state.updatedAt = new Date().toISOString();
    writeState(state);
    emitWorkspaceUpdate(state);
    persistMutation("/reset", {});
    return clone(state);
  }

  function getStudents() {
    return getState().students;
  }

  function getStudentsForContext(context) {
    return scopedStateForContext(getState(), context).students;
  }

  function getStudent(alias) {
    return getState().students.find((student) => student.id === alias) || null;
  }

  function getAssignment(alias) {
    return getState().assignments[alias] || "草稿未提交";
  }

  function updateAssignment(alias, status, input) {
    const meta = input || {};
    const state = getState();
    const linkedTeacherActionId = cleanLinkId(meta.linkedTeacherActionId);
    const responseType = cleanResponseType(meta.responseType);
    state.assignments[alias] = status;
    state.students = state.students.map((student) => {
      if (student.id !== alias) return student;
      return {
        ...student,
        memory: status === "已提交" ? "学生端已提交作业，等待老师反馈。" : "学生端已保存作业草稿，仍可继续修改。"
      };
    });
    updateTeacherActionStudentSignal(state, alias, linkedTeacherActionId, {
      responseType,
      responseAt: new Date().toISOString()
    });
    const nextState = setState(state);
    persistMutation("/assignment", {
      studentAlias: alias,
      status,
      linkedTeacherActionId,
      responseType
    }, nextState);
    return nextState;
  }

  function recordQuestion(alias, question, input) {
    const text = String(question || "").trim();
    if (!text) return getState();
    const meta = input || {};
    const state = getState();
    const linkedTeacherActionId = cleanLinkId(meta.linkedTeacherActionId);
    const responseType = cleanResponseType(meta.responseType);
    const createdAt = new Date().toISOString();
    state.questions.unshift({
      id: `question-${Date.now()}`,
      studentAlias: alias,
      text,
      linkedTeacherActionId,
      responseType,
      createdAt
    });
    state.questions = state.questions.slice(0, 20);
    updateTeacherActionStudentSignal(state, alias, linkedTeacherActionId, {
      responseType,
      responseAt: createdAt
    });
    const nextState = setState(state);
    persistMutation("/questions", {
      studentAlias: alias,
      text,
      linkedTeacherActionId,
      responseType
    }, nextState);
    return nextState;
  }

  function recordStuckSignal(alias, stuckType, note, input) {
    const meta = input || {};
    const signal = {
      id: `stuck-${Date.now()}`,
      studentAlias: alias,
      stuckType: stuckType || "卡点",
      note: String(note || "").trim(),
      linkedTeacherActionId: cleanLinkId(meta.linkedTeacherActionId),
      responseType: cleanResponseType(meta.responseType),
      createdAt: new Date().toISOString(),
      status: "sent_to_teacher"
    };
    const state = getState();
    state.stuckSignals.unshift(signal);
    state.stuckSignals = state.stuckSignals.slice(0, 20);
    state.messages = [
      createMessageRecord(alias, {
        senderRole: "student",
        senderId: alias,
        senderLabel: alias,
        text: `我需要帮助：${signal.stuckType}${signal.note ? `。${signal.note}` : ""}`,
        kind: "help_request",
        linkedTeacherActionId: signal.linkedTeacherActionId,
        responseType: signal.responseType || "still_stuck"
      }, signal.createdAt),
      ...(Array.isArray(state.messages) ? state.messages : [])
    ].slice(0, 100);
    state.students = state.students.map((student) => {
      if (student.id !== alias) return student;
      return {
        ...student,
        status: supportStatusFor(signal.stuckType),
        level: levelFor(signal.stuckType),
        stuck: signal.stuckType,
        next: nextStepFor(signal.stuckType),
        evidence: signal.note || `学生端发送卡点：${signal.stuckType}`,
        memory: `学生端刚刚同步卡点：${signal.stuckType}。${signal.note ? `补充：${signal.note}` : "等待老师查看。"}` 
      };
    });
    updateTeacherActionStudentSignal(state, alias, signal.linkedTeacherActionId, {
      responseType: signal.responseType || "still_stuck",
      responseAt: signal.createdAt
    });
    const nextState = setState(state);
    persistMutation("/stuck-signals", {
      studentAlias: alias,
      stuckType: signal.stuckType,
      note: signal.note,
      linkedTeacherActionId: signal.linkedTeacherActionId,
      responseType: signal.responseType
    }, nextState);
    return nextState;
  }

  function recordCheckIn(alias, input) {
    const checkIn = createCheckInRecord(alias, input || {});
    const state = getState();
    state.checkIns = [checkIn, ...(Array.isArray(state.checkIns) ? state.checkIns : [])].slice(0, 40);
    if (checkIn.teacherVisible) {
      state.messages = [
        createMessageRecord(alias, {
          senderRole: "student",
          senderId: alias,
          senderLabel: alias,
          text: `我想让老师知道：${checkIn.teacherHelpDraft}`,
          kind: "help_request",
          linkedTeacherActionId: checkIn.linkedTeacherActionId,
          responseType: checkIn.responseType || "check_in"
        }, checkIn.createdAt),
        ...(Array.isArray(state.messages) ? state.messages : [])
      ].slice(0, 100);
      state.students = state.students.map((student) => {
        if (student.id !== alias) return student;
        return {
          ...student,
          status: supportStatusForCheckIn(checkIn),
          level: levelForCheckIn(checkIn),
          stuck: checkIn.learningSupportSignal,
          next: checkIn.nextLearningStep,
          evidence: checkIn.evidenceQuote || checkIn.summaryForTeacher,
          memory: `学生分享了学习关怀 check-in：${checkIn.summaryForTeacher}`
        };
      });
    }
    updateTeacherActionStudentSignal(state, alias, checkIn.linkedTeacherActionId, {
      responseType: checkIn.responseType,
      responseAt: checkIn.createdAt
    });
    const nextState = setState(state);
    persistMutation("/check-ins", {
      studentAlias: alias,
      state: checkIn.state,
      topic: checkIn.topic,
      note: checkIn.note,
      shareChoice: checkIn.shareChoice,
      linkedTeacherActionId: checkIn.linkedTeacherActionId,
      responseType: checkIn.responseType
    }, nextState);
    return nextState;
  }

  function recordMessage(alias, input) {
    const text = String(input?.text || input?.message || "").trim().slice(0, 800);
    if (!text) return getState();
    const context = normalizeContext(input?.context || {});
    const state = getState();
    const message = createMessageRecord(alias, {
      ...input,
      text,
      senderRole: input?.senderRole || context.role,
      senderId: input?.senderId || context.userId,
      senderLabel: input?.senderLabel || senderLabelFor(input?.senderRole || context.role, alias)
    });
    state.messages = [message, ...(Array.isArray(state.messages) ? state.messages : [])].slice(0, 100);
    if (message.senderRole === "student") {
      updateTeacherActionStudentSignal(state, alias, message.linkedTeacherActionId, {
        responseType: message.responseType,
        responseAt: message.createdAt
      });
    }
    const nextState = setState(state);
    persistMutation("/messages", {
      studentAlias: alias,
      text: message.text,
      senderRole: message.senderRole,
      senderId: message.senderId,
      senderLabel: message.senderLabel,
      kind: message.kind,
      linkedTeacherActionId: message.linkedTeacherActionId,
      responseType: message.responseType,
      context: input?.context
    }, nextState);
    return nextState;
  }

  function markTeacherAgentActionRead(alias, actionId, input) {
    const state = getState();
    const readAt = input?.readAt || new Date().toISOString();
    const updated = updateTeacherActionStudentSignal(state, alias, cleanLinkId(actionId || input?.actionId), {
      readAt
    });
    if (!updated) return state;
    const nextState = setState(state);
    persistMutation("/teacher-actions/read", {
      studentAlias: alias,
      actionId: cleanLinkId(actionId || input?.actionId),
      readAt,
      context: input?.context
    }, nextState);
    return nextState;
  }

  function getMessagesForAlias(alias) {
    return getState().messages
      .filter((message) => message.studentAlias === alias)
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }

  function recordTeacherAgentAction(input) {
    const context = normalizeContext(input?.context || {});
    const action = createTeacherAgentActionRecord(input || {}, context);
    const state = getState();
    state.teacherAgentActions = [action, ...(Array.isArray(state.teacherAgentActions) ? state.teacherAgentActions : [])].slice(0, 100);

    if (action.type === "send_message" && action.studentAlias && action.detail) {
      state.messages = [
        createMessageRecord(action.studentAlias, {
          senderRole: "teacher",
          senderId: context.userId || DEFAULT_TEACHER_ID,
          senderLabel: input?.senderLabel || "老师",
          text: action.detail,
          kind: "teacher_agent_action"
        }, action.createdAt),
        ...(Array.isArray(state.messages) ? state.messages : [])
      ].slice(0, 100);
    }

    return setState(state);
  }

  function updateTeacherActionStudentSignal(state, alias, actionId, input) {
    const linkedId = cleanLinkId(actionId);
    if (!linkedId || !Array.isArray(state.teacherAgentActions)) return false;
    let changed = false;
    state.teacherAgentActions = state.teacherAgentActions.map((action) => {
      if (!action || action.id !== linkedId || action.studentAlias !== alias) return action;
      changed = true;
      const responseType = cleanResponseType(input?.responseType);
      const readAt = input?.readAt || action.studentReadAt || input?.responseAt || null;
      return {
        ...action,
        studentReadAt: action.studentReadAt || readAt || null,
        studentResponseAt: input?.responseAt || action.studentResponseAt || null,
        studentResponseType: responseType || action.studentResponseType || null
      };
    });
    return changed;
  }

  function latestStuckSignal(alias) {
    return getState().stuckSignals.find((signal) => signal.studentAlias === alias) || null;
  }

  function latestCheckIn(alias) {
    return getState().checkIns.find((item) => item.studentAlias === alias) || null;
  }

  function getContext(role, overrides) {
    return normalizeContext({ role, ...(overrides || {}) });
  }

  function getTeacherContext(overrides) {
    return getContext("teacher", overrides);
  }

  function getStudentContext(alias, overrides) {
    return getContext("student", { studentAlias: alias || DEFAULT_STUDENT_ALIAS, ...(overrides || {}) });
  }

  function getAccount(accountId) {
    return getState().accounts.find((account) => account.id === accountId) || null;
  }

  function getActiveClass() {
    const state = getState();
    return state.classes.find((item) => item.id === state.activeClassId) || state.classes[0] || null;
  }

  function scopedStateForContext(state, context) {
    const normalized = normalizeState(state);
    const nextContext = normalizeContext(context);
    const activeClass = getClassById(normalized, nextContext.classId);
    const studentAliases = new Set(activeClass?.studentAliases || normalized.students.map((student) => student.id));
    let students = normalized.students.filter((student) => studentAliases.has(student.id));
    let questions = normalized.questions.filter((item) => studentAliases.has(item.studentAlias));
    let stuckSignals = normalized.stuckSignals.filter((item) => studentAliases.has(item.studentAlias));
    let checkIns = normalized.checkIns.filter((item) => studentAliases.has(item.studentAlias));
    let messages = normalized.messages.filter((item) => studentAliases.has(item.studentAlias));
    let teacherAgentActions = normalized.teacherAgentActions.filter((item) => {
      const inClass = !item.classId || item.classId === activeClass?.id;
      const inAliasScope = !item.studentAlias || studentAliases.has(item.studentAlias);
      return inClass && inAliasScope;
    });
    let approvedMaterials = (normalized.approvedMaterials || []).filter((item) => {
      return !item.classId || item.classId === activeClass?.id;
    });
    let draftMaterials = (normalized.draftMaterials || []).filter((item) => {
      return !item.classId || item.classId === activeClass?.id;
    });
    let auditEvents = normalized.auditEvents.filter((item) => !item.classId || item.classId === activeClass?.id);
    const schoolAggregate = buildSchoolAggregate(normalized);

    if (nextContext.role === "student") {
      students = students.filter((student) => student.id === nextContext.studentAlias);
      questions = questions.filter((item) => item.studentAlias === nextContext.studentAlias);
      stuckSignals = stuckSignals.filter((item) => item.studentAlias === nextContext.studentAlias);
      checkIns = checkIns.filter((item) => item.studentAlias === nextContext.studentAlias);
      messages = messages.filter((item) => item.studentAlias === nextContext.studentAlias);
      teacherAgentActions = teacherAgentActions.filter((item) => {
        return item.studentAlias === nextContext.studentAlias && item.studentVisible !== false;
      });
      approvedMaterials = approvedMaterials.filter((item) => {
        const targets = Array.isArray(item.publishedToAliases) ? item.publishedToAliases : [];
        return item.status === "published" && (!targets.length || targets.includes(nextContext.studentAlias));
      });
      draftMaterials = [];
      auditEvents = auditEvents.filter((item) => {
        return item.actorId === nextContext.userId || item.studentAlias === nextContext.studentAlias;
      });
    } else if (nextContext.role === "teacher") {
      checkIns = checkIns
        .filter((item) => item.teacherVisible)
        .map(teacherVisibleCheckIn);
    }

    if (nextContext.role === "school_admin") {
      students = [];
      questions = [];
      stuckSignals = [];
      checkIns = [];
      messages = [];
      teacherAgentActions = [];
      draftMaterials = [];
      auditEvents = auditEvents.map((item) => ({
        id: item.id,
        timestamp: item.timestamp,
        action: item.action,
        role: item.role,
        classId: item.classId,
        targetType: item.targetType,
        targetId: item.targetId
      }));
    }

    return {
      ...normalized,
      activeClassId: activeClass?.id || normalized.activeClassId,
      className: activeClass?.name || normalized.className,
      topic: activeClass?.topic || normalized.topic,
      students,
      questions,
      stuckSignals,
      checkIns,
      messages,
      teacherAgentActions,
      approvedMaterials,
      draftMaterials,
      auditEvents,
      schoolAggregate,
      session: nextContext,
      accessBoundary: accessBoundaryFor(nextContext, activeClass)
    };
  }

  function buildSchoolAggregate(state) {
    const classes = state.classes.map((classItem) => aggregateClass(state, classItem));
    const totals = classes.reduce((next, item) => ({
      studentAliasCount: next.studentAliasCount + item.studentAliasCount,
      submittedCount: next.submittedCount + item.submittedCount,
      needsSupportCount: next.needsSupportCount + item.needsSupportCount,
      questionCount: next.questionCount + item.questionCount,
      stuckSignalCount: next.stuckSignalCount + item.stuckSignalCount,
      checkInCount: next.checkInCount + item.checkInCount,
      sharedCheckInCount: next.sharedCheckInCount + item.sharedCheckInCount,
      frustrationSignalCount: next.frustrationSignalCount + item.frustrationSignalCount
    }), {
      studentAliasCount: 0,
      submittedCount: 0,
      needsSupportCount: 0,
      questionCount: 0,
      stuckSignalCount: 0,
      checkInCount: 0,
      sharedCheckInCount: 0,
      frustrationSignalCount: 0
    });
    return {
      generatedAt: new Date().toISOString(),
      schoolName: state.school?.name || "TeachFlow 试用学校",
      classCount: classes.length,
      ...totals,
      submittedRate: totals.studentAliasCount ? Math.round((totals.submittedCount / totals.studentAliasCount) * 100) : 0,
      supportRate: totals.studentAliasCount ? Math.round((totals.needsSupportCount / totals.studentAliasCount) * 100) : 0,
      classes,
      comparison: buildClassComparison(classes),
      auditByAction: aggregateAuditByAction(state.auditEvents),
      latestAudit: state.auditEvents.slice(0, 8).map((event) => ({
        id: event.id,
        timestamp: event.timestamp,
        action: event.action,
        role: event.role,
        classId: event.classId,
        targetType: event.targetType
      }))
    };
  }

  function aggregateClass(state, classItem) {
    const aliases = new Set(classItem.studentAliases || []);
    const classStudents = state.students.filter((student) => aliases.has(student.id));
    const classQuestions = state.questions.filter((item) => aliases.has(item.studentAlias));
    const classSignals = state.stuckSignals.filter((item) => aliases.has(item.studentAlias));
    const classCheckIns = state.checkIns.filter((item) => aliases.has(item.studentAlias));
    const sharedCheckIns = classCheckIns.filter((item) => item.teacherVisible);
    const frustrationSignalCount = sharedCheckIns.filter((item) => item.wellbeingLevel >= 1).length;
    const submittedCount = classStudents.filter((student) => state.assignments[student.id] === "已提交").length;
    const needsSupportCount = classStudents.filter((student) => {
      return student.level === "Level 1" || /需要支持/.test(student.status || "");
    }).length;
    const levelCounts = classStudents.reduce((counts, student) => {
      const level = student.level || "未分层";
      counts[level] = (counts[level] || 0) + 1;
      return counts;
    }, {});
    const topNeeds = Object.entries(classStudents.reduce((counts, student) => {
      const key = student.stuck || "观察中";
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {}))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({ label, count }));
    const submittedRate = classStudents.length ? Math.round((submittedCount / classStudents.length) * 100) : 0;
    const supportRate = classStudents.length ? Math.round((needsSupportCount / classStudents.length) * 100) : 0;
    const activityScore = Math.min(100, (classQuestions.length * 8) + (classSignals.length * 12) + submittedRate);
    const attentionScore = Math.min(100, Math.round((supportRate * 0.65) + ((100 - submittedRate) * 0.25) + (classSignals.length * 5)));

    return {
      id: classItem.id,
      name: classItem.name,
      course: classItem.course,
      topic: classItem.topic,
      status: classItem.status,
      studentAliasCount: classStudents.length,
      submittedCount,
      needsSupportCount,
      questionCount: classQuestions.length,
      stuckSignalCount: classSignals.length,
      checkInCount: classCheckIns.length,
      sharedCheckInCount: sharedCheckIns.length,
      frustrationSignalCount,
      submittedRate,
      supportRate,
      activityScore,
      attentionScore,
      readinessLabel: readinessLabelFor(submittedRate, supportRate, classSignals.length),
      dominantNeed: topNeeds[0]?.label || "观察中",
      levelCounts,
      topNeeds
    };
  }

  function buildClassComparison(classes) {
    return {
      highestSupportClass: pickClass(classes, (item) => item.supportRate, "desc"),
      lowestSubmissionClass: pickClass(classes, (item) => item.submittedRate, "asc"),
      mostActiveClass: pickClass(classes, (item) => item.activityScore, "desc"),
      mostReadyClass: pickClass(classes, (item) => item.submittedRate - item.supportRate, "desc")
    };
  }

  function pickClass(classes, scoreFor, direction) {
    const sorted = [...classes].sort((a, b) => {
      const diff = scoreFor(a) - scoreFor(b);
      return direction === "asc" ? diff : -diff;
    });
    const item = sorted[0];
    return item ? {
      id: item.id,
      name: item.name,
      topic: item.topic,
      submittedRate: item.submittedRate,
      supportRate: item.supportRate,
      attentionScore: item.attentionScore,
      activityScore: item.activityScore,
      dominantNeed: item.dominantNeed
    } : null;
  }

  function readinessLabelFor(submittedRate, supportRate, signalCount) {
    if (submittedRate >= 75 && supportRate <= 25) return "可扩大";
    if (signalCount >= 2 || supportRate >= 30) return "需跟进";
    if (submittedRate < 50) return "需推动";
    return "稳定试点";
  }

  function aggregateAuditByAction(auditEvents) {
    return auditEvents.reduce((counts, event) => {
      counts[event.action] = (counts[event.action] || 0) + 1;
      return counts;
    }, {});
  }

  function normalizeContext(context) {
    const requested = context || {};
    const role = requested.role || "teacher";
    const accountFallback = {};
    const userId = requested.userId || requested.accountId || accountFallback.id || `${role}-local`;
    const studentAlias = requested.studentAlias || accountFallback.studentAlias || DEFAULT_STUDENT_ALIAS;
    const classId = requested.classId || accountFallback.classIds?.[0] || DEFAULT_CLASS_ID;
    return {
      role,
      userId,
      classId,
      studentAlias,
      permissions: clone(defaultRolePolicies[role] || defaultRolePolicies.teacher)
    };
  }

  function accessBoundaryFor(context, activeClass) {
    const policy = defaultRolePolicies[context.role] || defaultRolePolicies.teacher;
    return {
      role: context.role,
      classId: activeClass?.id || context.classId,
      className: activeClass?.name || "未选择班级",
      studentAlias: context.role === "student" ? context.studentAlias : null,
      visibleData: policy.visibleData,
      canApprove: Boolean(policy.canApprove),
      canReadAllStudents: Boolean(policy.canReadAllStudents)
    };
  }

  function getClassById(state, classId) {
    return state.classes.find((item) => item.id === classId) || state.classes[0] || null;
  }

  function syncFromServer(context) {
    if (!canUseRemote()) return Promise.resolve(getState());
    return global.fetch(`${API_ROOT}${contextQuery(context)}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Workspace API ${response.status}`);
        return response.json();
      })
      .then(applyRemoteState)
      .catch(() => getState());
  }

  function persistMutation(path, payload, fallbackState) {
    if (!canUseRemote()) return Promise.resolve(fallbackState || getState());
    const requestPayload = {
      ...(payload || {}),
      context: payload?.context || contextFromPayload(payload || {})
    };
    return global.fetch(`${API_ROOT}${path}${contextQuery(requestPayload.context)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload)
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Workspace API ${response.status}`);
        return response.json();
      })
      .then(applyRemoteState)
      .catch(() => fallbackState || getState());
  }

  function applyRemoteState(state) {
    const normalized = normalizeState(state);
    writeState(normalized);
    emitWorkspaceUpdate(normalized);
    return clone(normalized);
  }

  function canUseRemote() {
    return Boolean(
      typeof window !== "undefined" &&
      global.fetch &&
      global.location &&
      /^https?:$/.test(global.location.protocol)
    );
  }

  function emitWorkspaceUpdate(state) {
    if (typeof global.dispatchEvent !== "function" || typeof global.CustomEvent !== "function") return;
    global.dispatchEvent(new global.CustomEvent(WORKSPACE_EVENT, { detail: clone(state) }));
  }

  function contextFromPayload(payload) {
    if (payload.studentAlias) return getStudentContext(payload.studentAlias);
    return getTeacherContext();
  }

  function contextQuery(context) {
    const nextContext = normalizeContext(context);
    const params = new URLSearchParams({
      role: nextContext.role,
      userId: nextContext.userId,
      classId: nextContext.classId
    });
    if (nextContext.studentAlias) params.set("studentAlias", nextContext.studentAlias);
    return `?${params.toString()}`;
  }

  function supportStatusFor(stuckType) {
    if (/公式|定义|图示/.test(stuckType)) return "需要支持";
    if (/例题|迁移/.test(stuckType)) return "部分理解";
    return "观察中";
  }

  function levelFor(stuckType) {
    if (/公式|定义/.test(stuckType)) return "Level 1";
    if (/图示|例题|迁移/.test(stuckType)) return "Level 2";
    return "Level 2";
  }

  function nextStepFor(stuckType) {
    if (/图示/.test(stuckType)) return "观看低门槛图示讲解";
    if (/公式/.test(stuckType)) return "把每个符号翻译成一句话";
    if (/定义/.test(stuckType)) return "补一个生活化定义例子";
    if (/例题|迁移/.test(stuckType)) return "做一个同构变式题";
    return "等待老师给出下一步支持";
  }

  function cleanLinkId(value) {
    const text = String(value || "").trim();
    return text ? text.slice(0, 120) : null;
  }

  function cleanResponseType(value) {
    const text = String(value || "").trim();
    return text ? text.slice(0, 60) : null;
  }

  function createMessageRecord(alias, input, createdAt) {
    const senderRole = ["teacher", "student", "system"].includes(input.senderRole) ? input.senderRole : "student";
    const text = String(input.text || "").trim().slice(0, 800);
    return {
      id: input.id || `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      threadId: `thread-${alias}`,
      studentAlias: alias,
      senderRole,
      senderId: input.senderId || (senderRole === "student" ? alias : DEFAULT_TEACHER_ID),
      senderLabel: input.senderLabel || senderLabelFor(senderRole, alias),
      text,
      kind: input.kind || "chat",
      linkedTeacherActionId: cleanLinkId(input.linkedTeacherActionId),
      responseType: cleanResponseType(input.responseType),
      createdAt: createdAt || new Date().toISOString()
    };
  }

  function createTeacherAgentActionRecord(input, context, createdAt) {
    const type = normalizeTeacherAgentActionType(input.type || input.actionType);
    const studentAlias = String(input.studentAlias || input.alias || "").trim() || null;
    const material = input.material && typeof input.material === "object" ? {
      id: String(input.material.id || input.sourceId || `material-${Date.now()}`),
      title: String(input.material.title || input.title || "老师布置的学习材料").trim().slice(0, 120),
      type: String(input.material.type || "学习材料").trim().slice(0, 80),
      topic: String(input.material.topic || input.topic || "").trim().slice(0, 120),
      targetLevel: String(input.material.targetLevel || input.targetLevel || "").trim().slice(0, 80),
      goal: String(input.material.goal || input.detail || "").trim().slice(0, 500)
    } : null;
    const title = String(input.title || defaultTeacherAgentActionTitle(type, studentAlias, material)).trim().slice(0, 160);
    const detail = String(input.detail || input.text || input.message || material?.goal || "").trim().slice(0, 800);
    const statusByType = {
      send_message: "sent",
      assign_material: "assigned",
      schedule_followup: "scheduled",
      dismiss: "handled"
    };

    return {
      id: input.id || `teacher-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      status: input.status || statusByType[type] || "completed",
      studentAlias,
      classId: context?.classId || input.classId || DEFAULT_CLASS_ID,
      actorId: context?.userId || input.actorId || DEFAULT_TEACHER_ID,
      title,
      detail,
      material,
      followUp: type === "schedule_followup" ? {
        dueLabel: String(input.dueLabel || "下一节课前 3 分钟").trim().slice(0, 80),
        note: detail
      } : null,
      source: "teacher_agent",
      sourceId: input.sourceId || null,
      sourceType: input.sourceType || "teacher_agent_recommendation",
      studentVisible: input.studentVisible === false || type === "dismiss" ? false : true,
      studentReadAt: input.studentReadAt || null,
      studentResponseAt: input.studentResponseAt || null,
      studentResponseType: cleanResponseType(input.studentResponseType || input.responseType),
      createdAt: createdAt || new Date().toISOString()
    };
  }

  function normalizeTeacherAgentActionType(value) {
    const type = String(value || "").trim();
    if (["send_message", "assign_material", "schedule_followup", "dismiss"].includes(type)) return type;
    return "dismiss";
  }

  function defaultTeacherAgentActionTitle(type, studentAlias, material) {
    if (type === "send_message") return `发送支持消息${studentAlias ? `给 ${studentAlias}` : ""}`;
    if (type === "assign_material") return material?.title || `布置学习材料${studentAlias ? `给 ${studentAlias}` : ""}`;
    if (type === "schedule_followup") return `安排短跟进${studentAlias ? `：${studentAlias}` : ""}`;
    return `标记已处理${studentAlias ? `：${studentAlias}` : ""}`;
  }

  function senderLabelFor(senderRole, alias) {
    if (senderRole === "teacher") return "老师";
    if (senderRole === "system") return "系统提醒";
    return alias;
  }

  function createCheckInRecord(alias, input, createdAt) {
    const mood = checkInStateFor(input.state || input.mood || "partly_understand");
    const note = String(input.note || "").trim().slice(0, 500);
    const shareChoice = shareChoiceFor(input.shareChoice || input.visibility || "private");
    const signal = wellbeingSignalFor(mood.id, note);
    const safeguardingRequired = signal.level === 3;
    const teacherVisible = shareChoice === "teacher_summary" && !safeguardingRequired;
    const summaryForTeacher = summaryForTeacherFor(mood, note, signal);
    const nextLearningStep = nextLearningStepFor(mood.id, note);
    const recommendedTeacherAction = recommendedTeacherActionFor(mood.id, signal);

    return {
      id: input.id || `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studentAlias: alias,
      topic: String(input.topic || "傅里叶变换").trim() || "当前主题",
      state: mood.id,
      stateLabel: mood.label,
      note,
      shareChoice,
      privateReflection: privateReflectionFor(mood.id, note),
      nextLearningStep,
      teacherHelpDraft: teacherHelpDraftFor(mood.id, note),
      learningSupportSignal: signal.type,
      wellbeingLevel: signal.level,
      wellbeingLabel: signal.label,
      summaryForTeacher,
      recommendedTeacherAction,
      evidenceQuote: teacherVisible ? note : "",
      linkedTeacherActionId: cleanLinkId(input.linkedTeacherActionId),
      responseType: cleanResponseType(input.responseType),
      privacyLevel: safeguardingRequired
        ? "safeguarding_review_required"
        : (teacherVisible ? "teacher_visible_summary_only" : "private_student_only"),
      teacherVisible,
      safeguardingFlag: {
        required: safeguardingRequired,
        reason: safeguardingRequired ? "Student language may indicate a safety risk. Follow school safeguarding policy and involve a trusted adult or designated lead." : ""
      },
      createdAt: createdAt || new Date().toISOString()
    };
  }

  function checkInStateFor(value) {
    const states = {
      understand: { id: "understand", label: "我懂了" },
      partly_understand: { id: "partly_understand", label: "有点懂但不确定" },
      stuck: { id: "stuck", label: "完全卡住" },
      frustrated: { id: "frustrated", label: "很挫败" },
      want_teacher_help: { id: "want_teacher_help", label: "我想让老师知道" }
    };
    return states[value] || states.partly_understand;
  }

  function shareChoiceFor(value) {
    const allowed = ["private", "teacher_summary", "ask_ai_first"];
    return allowed.includes(value) ? value : "private";
  }

  function wellbeingSignalFor(state, note) {
    const text = `${state} ${note}`.toLowerCase();
    if (/自伤|伤害自己|伤害别人|不想活|suicide|self-harm|kill myself|hurt others|abuse|bully|被欺凌|虐待/.test(text)) {
      return { level: 3, label: "安全风险", type: "safeguarding_review" };
    }
    if (/睡不好|一直|害怕上课|不敢问|压力很大|panic|fear|stress|anxious/.test(text)) {
      return { level: 2, label: "持续压力影响学习", type: "sustained_learning_pressure" };
    }
    if (/很挫败|学不会|很笨|慌|没用|不想学|frustrated|dumb|stupid|give up/.test(text) || state === "frustrated") {
      return { level: 1, label: "低信心学习信号", type: "low_confidence" };
    }
    if (state === "stuck" || state === "want_teacher_help") {
      return { level: 1, label: "需要学习支持", type: "learning_support_needed" };
    }
    return { level: 0, label: "普通学习状态", type: "normal_learning_check_in" };
  }

  function privateReflectionFor(state, note) {
    if (state === "understand") return "你已经有了基本理解。下一步可以用自己的话解释一次，再做一个小题确认。";
    if (state === "frustrated") return "你不是笨，而是现在卡在学习入口上。先把问题拆小，先处理一个最具体的点。";
    if (state === "stuck") return "先不要追求整题做完。把卡住的句子圈出来，再用一个图或例子重新进入。";
    if (state === "want_teacher_help") return "你可以把问题整理成一段给老师看的求助草稿，老师会更容易给到具体帮助。";
    return note ? "你已经说清楚了一个不确定点。下一步先找一个低压力例子验证自己的理解。" : "先写一句你最不确定的地方，会更容易得到帮助。";
  }

  function nextLearningStepFor(state, note) {
    if (state === "understand") return "做一道微型判断题，确认自己能迁移。";
    if (state === "frustrated") return "先看 Level 1 图像解释，再只完成一个低压力判断题。";
    if (state === "stuck") return "把卡点改写成一个具体问题，再让学习助手换例子解释。";
    if (state === "want_teacher_help") return "把求助草稿发给老师，并请求一个 5 分钟低压力任务。";
    if (/图|波形|频率图/.test(note)) return "先看图示转换材料，再标出左边波形和右边频率的对应关系。";
    if (/公式|符号/.test(note)) return "先把公式里的每个符号翻译成一句话。";
    return "先复习老师批准的 Level 1 材料，再写一句仍不确定的地方。";
  }

  function teacherHelpDraftFor(state, note) {
    const base = note || "我对当前主题还有一个具体不确定点。";
    if (state === "frustrated") return `我现在对这个主题信心比较低。${base} 可以先用低压力例子或图示帮我进入吗？`;
    if (state === "want_teacher_help") return `我想请老师帮我确认：${base}`;
    return `我想请老师帮我看一下：${base}`;
  }

  function summaryForTeacherFor(mood, note, signal) {
    const topicText = note ? `学生同意分享的学习表述：${note}` : "学生提交了学习状态 check-in。";
    return `${mood.label}；${signal.label}。${topicText}`;
  }

  function recommendedTeacherActionFor(state, signal) {
    if (signal.level === 3) return "不要让 AI 独自处理；请按照学校 safeguarding 流程交给指定真人。";
    if (signal.level === 2) return "先给学生一个低压力回应，并建议其联系可信任成年人或学校支持人员。";
    if (state === "frustrated") return "先发送支持性短消息，再发布 Level 1 图像解释和一个低压力任务。";
    if (state === "stuck") return "用图示或生活例子重新解释，并给一个最小可完成步骤。";
    if (state === "want_teacher_help") return "查看学生求助草稿，安排一次短反馈或发送定向材料。";
    return "维持当前学习节奏，给一个简短确认或拓展任务。";
  }

  function teacherVisibleCheckIn(item) {
    return {
      id: item.id,
      studentAlias: item.studentAlias,
      topic: item.topic,
      state: item.state,
      stateLabel: item.stateLabel,
      learningSupportSignal: item.learningSupportSignal,
      wellbeingLevel: item.wellbeingLevel,
      wellbeingLabel: item.wellbeingLabel,
      summaryForTeacher: item.summaryForTeacher,
      recommendedTeacherAction: item.recommendedTeacherAction,
      teacherHelpDraft: item.teacherHelpDraft,
      evidenceQuote: item.evidenceQuote,
      linkedTeacherActionId: item.linkedTeacherActionId || null,
      responseType: item.responseType || null,
      privacyLevel: item.privacyLevel,
      teacherVisible: true,
      safeguardingFlag: {
        required: Boolean(item.safeguardingFlag?.required)
      },
      createdAt: item.createdAt
    };
  }

  function supportStatusForCheckIn(checkIn) {
    if (checkIn.wellbeingLevel >= 2) return "需要支持";
    if (checkIn.wellbeingLevel >= 1 || checkIn.state === "stuck") return "需要支持";
    if (checkIn.state === "understand") return "稳定推进";
    return "部分理解";
  }

  function levelForCheckIn(checkIn) {
    if (checkIn.wellbeingLevel >= 2 || checkIn.state === "frustrated") return "Level 1";
    if (checkIn.state === "stuck" || checkIn.state === "partly_understand") return "Level 2";
    return "Level 3";
  }

  function normalizeState(state) {
    const fallback = defaultState();
    const classes = mergeById(fallback.classes, Array.isArray(state?.classes) ? state.classes : []);
    const accounts = mergeById(fallback.accounts, Array.isArray(state?.accounts) ? state.accounts : []);
    const students = mergeById(fallback.students, Array.isArray(state?.students) ? state.students : []);
    const activeClassId = state?.activeClassId || classes[0]?.id || fallback.activeClassId;
    const collection = (key) => {
      if (state?.testMode?.enabled && Array.isArray(state?.[key])) return clone(state[key]);
      return mergeById(fallback[key], Array.isArray(state?.[key]) ? state[key] : []);
    };
    const normalized = {
      ...fallback,
      ...(state || {}),
      school: {
        ...fallback.school,
        ...((state && state.school) || {})
      },
      activeClassId,
      accounts,
      rolePolicies: {
        ...fallback.rolePolicies,
        ...((state && state.rolePolicies) || {})
      },
      classes,
      assignments: {
        ...fallback.assignments,
        ...((state && state.assignments) || {})
      },
      students,
      questions: collection("questions"),
      stuckSignals: collection("stuckSignals"),
      checkIns: collection("checkIns"),
      messages: collection("messages"),
      teacherAgentActions: collection("teacherAgentActions"),
      auditEvents: collection("auditEvents"),
      approvedMaterials: Array.isArray(state?.approvedMaterials) ? state.approvedMaterials : fallback.approvedMaterials,
      draftMaterials: Array.isArray(state?.draftMaterials) ? state.draftMaterials : fallback.draftMaterials
    };
    normalized.classes = normalized.classes.map((item) => ({
      ...item,
      studentAliases: Array.isArray(item.studentAliases)
        ? item.studentAliases
        : normalized.students.map((student) => student.id)
    }));
    return normalized;
  }

  function mergeById(defaultItems, nextItems) {
    const byId = new Map();
    (nextItems || []).forEach((item) => {
      if (item && item.id) byId.set(item.id, clone(item));
    });
    (defaultItems || []).forEach((item) => {
      if (item && item.id && !byId.has(item.id)) byId.set(item.id, clone(item));
    });
    return Array.from(byId.values());
  }

  function readStoredState() {
    try {
      if (global.localStorage) {
        const raw = global.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      }
    } catch (error) {
      return memoryState;
    }
    return memoryState;
  }

  function writeState(state) {
    const next = clone(state);
    memoryState = next;
    try {
      if (global.localStorage) {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    } catch (error) {
      memoryState = next;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  const api = {
    getState,
    setState,
    resetState,
    getStudents,
    getStudentsForContext,
    getStudent,
    getAssignment,
    updateAssignment,
    recordQuestion,
    recordStuckSignal,
    recordCheckIn,
    recordMessage,
    markTeacherAgentActionRead,
    recordTeacherAgentAction,
    getMessagesForAlias,
    latestStuckSignal,
    latestCheckIn,
    syncFromServer,
    createDefaultState,
    normalizeState,
    getContext,
    getTeacherContext,
    getStudentContext,
    getAccount,
    getActiveClass,
    scopedStateForContext
  };

  global.TeachFlowWorkspaceState = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
