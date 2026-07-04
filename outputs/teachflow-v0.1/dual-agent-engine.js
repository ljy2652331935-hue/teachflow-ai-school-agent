(function (global) {
  const DEFAULT_TOPIC = "傅里叶变换";

  function buildTeacherAgentState(input) {
    const students = input.students || [];
    const topic = input.topic || DEFAULT_TOPIC;
    const className = input.className || "当前班级";
    const groups = groupStudentsByNeed(students);
    const urgentStudents = students.filter((student) => student.status === "需要支持");
    const levelOneCount = students.filter((student) => student.level === "Level 1").length;
    const draftMaterials = input.draftMaterials || ["图示讲义", "分层练习", "课堂 PPT"];
    const approvedMaterials = input.approvedMaterials || ["学生讲义", "视觉讲解图"];

    return {
      agentId: "teacher-agent",
      name: "老师 Agent",
      role: "教学分析助手",
      className,
      topic,
      summary: `${className} 在“${topic}”上最需要处理的是：${dominantNeed(groups)}。建议先完成图示支持和 Level 1 学生跟进，再审批发布分层材料。`,
      insight: {
        mainNeed: dominantNeed(groups),
        urgentCount: urgentStudents.length,
        levelOneCount,
        evidenceCount: students.filter((student) => student.evidence).length
      },
      priorities: [
        teacherPriority("先处理高风险卡点", `优先看 ${urgentStudents.map((student) => student.id).join("、") || "暂无"} 的原句证据。`, "学生跟进"),
        teacherPriority("制作图示支持材料", "把时域和频域的左右对应关系做成一张低门槛图片。", "制作材料"),
        teacherPriority("审批分层干预", `已有 ${draftMaterials.length} 份草稿，发布前需要老师确认。`, "审批导出")
      ],
      materialPipeline: [
        { status: "已批准", title: approvedMaterials.join("、") },
        { status: "待审批", title: draftMaterials.join("、") },
        { status: "建议新增", title: `${dominantNeed(groups)} 的 5 分钟补救材料` }
      ],
      followUps: urgentStudents.slice(0, 3).map((student) => ({
        id: student.id,
        reason: student.stuck,
        next: student.next
      })),
      guardrails: [
        "不能绕过老师直接发布材料。",
        "只使用学生别名，不展示真实身份。",
        "诊断结论必须保留学生原句证据。",
        "分层建议是教学支持，不是成绩判断。"
      ]
    };
  }

  function answerTeacherQuestion(question, state) {
    const text = String(question || "").trim();
    const agentState = state || buildTeacherAgentState({});
    if (!text) return "你可以问：这节课先处理什么？哪些学生要优先看？我该制作什么材料？";

    if (/学生|跟进|谁|优先/.test(text)) {
      const followUps = agentState.followUps.map((item) => `${item.id}：${item.reason}，下一步 ${item.next}`).join("；");
      return followUps ? `建议先看这些学生：${followUps}。` : "目前没有高优先级学生，建议继续观察下一次作业和卡点信号。";
    }

    if (/材料|制作|PPT|讲义|图片|练习/.test(text)) {
      return `建议先做“${agentState.insight.mainNeed}”的低门槛图示材料，再生成 Level 2 的短练习。所有草稿都进入审批导出，老师确认后再发给学生。`;
    }

    if (/审批|发布|导出/.test(text)) {
      return "当前建议是：先复核学生原句证据，再审批图示讲义和分层练习。发布前保留版本记录，方便回滚。";
    }

    return `我建议这节课先做三步：1. 复核“${agentState.insight.mainNeed}”证据；2. 制作对应补救材料；3. 跟进 Level 1 学生并等待下一轮反馈。`;
  }

  function buildStudentAgentState(input) {
    const stuckType = input.stuckType || "图示没懂";
    const assignmentStatus = input.assignmentStatus || "草稿未提交";
    const chatCount = input.chatCount || 0;
    const topic = input.topic || DEFAULT_TOPIC;
    const profile = profileFor(stuckType, assignmentStatus, chatCount);

    return {
      agentId: "student-agent",
      name: "学生 Agent",
      role: "个人学习助手",
      topic,
      profile,
      summary: `我记得你现在学习“${topic}”，当前卡点是“${stuckType}”，作业状态是“${assignmentStatus}”。下一步先做一个小而具体的动作。`,
      nextPlan: planFor(stuckType, assignmentStatus),
      memory: [
        `当前主题：${topic}`,
        `最近卡点：${stuckType}`,
        `作业状态：${assignmentStatus}`,
        `对话记录：${chatCount} 条学习互动`
      ],
      teacherSignalDraft: `我现在主要卡在“${stuckType}”，希望老师给我一个更具体的例子或图示。`,
      guardrails: [
        "只解释老师批准的学习内容。",
        "不会看到其他学生的信息。",
        "不会替你直接完成作业，只给提示和下一步。",
        "卡点可以整理后发送给老师。"
      ]
    };
  }

  function answerStudentQuestion(question, state) {
    const text = String(question || "").trim();
    const agentState = state || buildStudentAgentState({});
    if (!text) return "你可以问：我下一步该学什么？这张图怎么看？怎么把问题发给老师？";

    if (/图|左|右|波|看/.test(text) || /图示/.test(agentState.profile.stuckType)) {
      return "我们先只看图，不碰公式：左边是同一个信号随时间变化的样子，右边是把它拆成几个简单频率。你下一步可以做的是：在图上圈出“复杂波形”和“简单频率”各在哪里。";
    }

    if (/公式|符号/.test(text) || /公式/.test(agentState.profile.stuckType)) {
      return "先把公式当成一句话：它在问“每种频率在这个信号里有多少”。你不用先背完整公式，先把每个符号翻译成中文意思。";
    }

    if (/作业|提交|怎么写/.test(text)) {
      return `你的作业状态是“${agentState.profile.assignmentStatus}”。建议先写三句话：1. 时域看变化；2. 频域看成分；3. 我还不确定图的哪一部分。`;
    }

    if (/老师|发送|求助|卡住/.test(text)) {
      return `可以这样发给老师：${agentState.teacherSignalDraft}`;
    }

    return `${agentState.summary} 我建议你先完成：${agentState.nextPlan[0].action}。`;
  }

  function groupStudentsByNeed(students) {
    return students.reduce((groups, student) => {
      const key = student.stuck || "观察中";
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {});
  }

  function dominantNeed(groups) {
    const entries = Object.entries(groups);
    if (!entries.length) return "图示转换";
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  function teacherPriority(title, detail, target) {
    return { title, detail, target };
  }

  function profileFor(stuckType, assignmentStatus, chatCount) {
    return {
      level: stuckType.includes("公式") || stuckType.includes("定义") ? "需要概念支架" : "正在建立理解",
      stuckType,
      assignmentStatus,
      chatCount,
      confidence: assignmentStatus === "已提交" ? "中等" : "需要继续整理"
    };
  }

  function planFor(stuckType, assignmentStatus) {
    const plan = [];

    if (stuckType.includes("图示")) {
      plan.push({ action: "先看图示对应", detail: "圈出左边复杂波形，再圈出右边简单频率。" });
    } else if (stuckType.includes("公式")) {
      plan.push({ action: "先翻译公式符号", detail: "把每个符号写成一句中文解释。" });
    } else if (stuckType.includes("定义")) {
      plan.push({ action: "先建立生活例子", detail: "用声音里的不同音高理解频率成分。" });
    } else {
      plan.push({ action: "先做一个变式题", detail: "把例题里的信号换成另一个简单信号。" });
    }

    plan.push({
      action: assignmentStatus === "已提交" ? "等待老师反馈并追问" : "补完作业草稿",
      detail: assignmentStatus === "已提交" ? "把不确定的句子复制到问题窗口继续问。" : "先写三句话，不追求一次写完。"
    });
    plan.push({ action: "发送卡点信号", detail: "如果还是卡住，把一句原话发给老师。" });

    return plan;
  }

  const api = {
    buildTeacherAgentState,
    answerTeacherQuestion,
    buildStudentAgentState,
    answerStudentQuestion
  };

  global.TeachFlowDualAgentEngine = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
