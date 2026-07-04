const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.join(__dirname, "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "teachflow-workspace-api-"));
const port = 5900 + Math.floor(Math.random() * 500);
const stateFile = path.join(tempDir, "workspace-state.json");

const child = spawn(process.execPath, ["server.js", `--port=${port}`], {
  cwd: projectRoot,
  env: {
    ...process.env,
    TEACHFLOW_AI_MODE: "local",
    TEACHFLOW_WORKSPACE_FILE: stateFile
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
child.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
child.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

(async () => {
  try {
    await waitForServer();

    let unauthenticated = false;
    try {
      await request("GET", "/api/workspace");
    } catch (error) {
      unauthenticated = /HTTP 401/.test(error.message);
    }
    assert.strictEqual(unauthenticated, true);

    let unauthenticatedTeacherAgent = false;
    try {
      await request("GET", "/api/teacher-agent/briefing");
    } catch (error) {
      unauthenticatedTeacherAgent = /HTTP 401/.test(error.message);
    }
    assert.strictEqual(unauthenticatedTeacherAgent, true);

    let unauthenticatedStudentAgent = false;
    try {
      await request("GET", "/api/student-agent/briefing");
    } catch (error) {
      unauthenticatedStudentAgent = /HTTP 401/.test(error.message);
    }
    assert.strictEqual(unauthenticatedStudentAgent, true);

    const accountsResponse = await request("GET", "/api/session/accounts");
    assert.ok(accountsResponse.body.accounts.some((account) => account.id === "teacher-lin"));
    assert.ok(accountsResponse.body.accounts.some((account) => account.id === "student-s002"));

    const teacherLogin = await request("POST", "/api/session/login", {
      accountId: "teacher-lin",
      classId: "class-physics-a"
    });
    const teacherCookie = cookieFrom(teacherLogin);
    assert.strictEqual(teacherLogin.body.authenticated, true);
    assert.strictEqual(teacherLogin.body.account.role, "teacher");
    let teacherState = await request("GET", "/api/workspace", null, teacherCookie);
    assert.ok(teacherState.body.auditEvents.some((event) => event.action === "session_login"));

    let state = await request("POST", "/api/workspace/reset", {}, teacherCookie);
    assert.ok(state.body.students.some((student) => student.id === "S002"));
    assert.ok(state.body.auditEvents.some((event) => event.action === "reset_workspace"));

    const teacherBriefing = await request("GET", "/api/teacher-agent/briefing", null, teacherCookie);
    assert.strictEqual(teacherBriefing.body.agentId, "teacher-agent-orchestrator");
    assert.strictEqual(teacherBriefing.body.session.role, "teacher");
    assert.ok(teacherBriefing.body.priorityTasks.length >= 1);
    assert.strictEqual(teacherBriefing.body.canAutoPublish, false);

    const aiStatus = await request("GET", "/api/ai/status", null, teacherCookie);
    assert.strictEqual(aiStatus.body.provider, "openai");
    assert.strictEqual(aiStatus.body.mode, "local");
    assert.ok(aiStatus.body.routes.some((route) => route.includes("/api/ai/teacher-agent")));

    const teacherAiChat = await request("POST", "/api/ai/teacher-agent", {
      question: "这节课先处理什么？"
    }, teacherCookie);
    assert.strictEqual(teacherAiChat.body.agent, "teacher-agent");
    assert.strictEqual(teacherAiChat.body.mode, "local");
    assert.ok(teacherAiChat.body.answer);

    const aiMaterialDraft = await request("POST", "/api/ai/material-generator", {
      materialType: "讲义",
      topic: "傅里叶变换"
    }, teacherCookie);
    assert.strictEqual(aiMaterialDraft.body.agent, "material-generator");
    assert.strictEqual(aiMaterialDraft.body.mode, "local");
    assert.ok(aiMaterialDraft.body.draft.title);

    let teacherStudentAgentBlocked = false;
    try {
      await request("GET", "/api/student-agent/briefing", null, teacherCookie);
    } catch (error) {
      teacherStudentAgentBlocked = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(teacherStudentAgentBlocked, true);

    const studentLogin = await request("POST", "/api/session/login", {
      accountId: "student-s002",
      classId: "class-physics-a"
    });
    const studentCookie = cookieFrom(studentLogin);
    assert.strictEqual(studentLogin.body.authenticated, true);
    assert.strictEqual(studentLogin.body.context.studentAlias, "S002");

    const studentView = await request("GET", "/api/workspace", null, studentCookie);
    assert.strictEqual(studentView.body.students.length, 1);
    assert.strictEqual(studentView.body.students[0].id, "S002");
    assert.ok(studentView.body.auditEvents.every((event) => {
      return event.actorId === "student-s002" || event.studentAlias === "S002";
    }));

    state = await request("POST", "/api/teacher-agent/actions", {
      type: "send_message",
      studentAlias: "S002",
      text: "API test: Teacher Agent approved this support message."
    }, teacherCookie);
    assert.strictEqual(state.body.teacherAgentActions[0].type, "send_message");
    assert.strictEqual(state.body.messages[0].kind, "teacher_agent_action");
    assert.ok(state.body.auditEvents.some((event) => event.action === "teacher_agent_action"));

    state = await request("POST", "/api/teacher-agent/actions", {
      type: "assign_material",
      studentAlias: "S002",
      material: {
        id: "api-material-draft",
        title: "API test material",
        type: "讲义 + 图示",
        topic: "傅里叶变换",
        targetLevel: "Level 2",
        goal: "Use one diagram to match wave shape and frequency bars."
      }
    }, teacherCookie);
    assert.strictEqual(state.body.teacherAgentActions[0].type, "assign_material");

    const studentAfterTeacherAgentAction = await request("GET", "/api/workspace", null, studentCookie);
    assert.ok(studentAfterTeacherAgentAction.body.messages.some((message) => message.text.includes("Teacher Agent approved")));
    assert.strictEqual(studentAfterTeacherAgentAction.body.teacherAgentActions[0].material.title, "API test material");
    const apiTeacherActionId = studentAfterTeacherAgentAction.body.teacherAgentActions[0].id;

    state = await request("POST", "/api/workspace/teacher-actions/read", {
      studentAlias: "S002",
      actionId: apiTeacherActionId
    }, studentCookie);
    assert.strictEqual(state.body.teacherAgentActions[0].id, apiTeacherActionId);
    assert.ok(state.body.teacherAgentActions[0].studentReadAt);
    assert.ok(state.body.auditEvents.some((event) => event.action === "teacher_agent_action_read"));

    let teacherReadImpersonationBlocked = false;
    try {
      await request("POST", "/api/workspace/teacher-actions/read", {
        studentAlias: "S002",
        actionId: apiTeacherActionId
      }, teacherCookie);
    } catch (error) {
      teacherReadImpersonationBlocked = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(teacherReadImpersonationBlocked, true);

    let studentTeacherActionBlocked = false;
    try {
      await request("POST", "/api/teacher-agent/actions", {
        type: "send_message",
        studentAlias: "S002",
        text: "Student should not be able to approve teacher actions."
      }, studentCookie);
    } catch (error) {
      studentTeacherActionBlocked = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(studentTeacherActionBlocked, true);

    const studentBriefing = await request("GET", "/api/student-agent/briefing", null, studentCookie);
    assert.strictEqual(studentBriefing.body.agentId, "student-agent-orchestrator");
    assert.strictEqual(studentBriefing.body.studentAlias, "S002");
    assert.ok(studentBriefing.body.nextPlan.length >= 1);
    assert.ok(studentBriefing.body.blockedData.some((item) => item.includes("其他学生")));

    const studentAgentChat = await request("POST", "/api/student-agent/chat", {
      question: "这张图怎么看？"
    }, studentCookie);
    assert.strictEqual(studentAgentChat.body.mode, "local");
    assert.ok(studentAgentChat.body.answer.includes("左边"));
    assert.ok(studentAgentChat.body.privacyNote.includes("默认只给你自己看"));

    const studentAiChat = await request("POST", "/api/ai/student-agent", {
      question: "这张图怎么看？"
    }, studentCookie);
    assert.strictEqual(studentAiChat.body.agent, "student-agent");
    assert.strictEqual(studentAiChat.body.mode, "local");
    assert.ok(studentAiChat.body.answer);

    let studentMaterialBlocked = false;
    try {
      await request("POST", "/api/ai/material-generator", {
        materialType: "讲义"
      }, studentCookie);
    } catch (error) {
      studentMaterialBlocked = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(studentMaterialBlocked, true);

    const studentAgentDraft = await request("POST", "/api/student-agent/stuck-draft", {
      stuckType: "图示没懂",
      text: "API test: I cannot match the left wave to the right frequency bars."
    }, studentCookie);
    assert.strictEqual(studentAgentDraft.body.stuckType, "图示没懂");
    assert.strictEqual(studentAgentDraft.body.consentRequired, true);

    state = await request("POST", "/api/student-agent/share-to-teacher", {
      stuckType: "图示没懂",
      text: "API test: I cannot match the left wave to the right frequency bars."
    }, studentCookie);
    assert.ok(state.body.draft.teacherSummary.includes("图示没懂"));
    assert.strictEqual(state.body.state.stuckSignals[0].studentAlias, "S002");
    assert.ok(state.body.state.auditEvents.some((event) => event.action === "student_agent_share_to_teacher"));

    const teacherAfterStudentAgentShare = await request("GET", "/api/workspace", null, teacherCookie);
    assert.strictEqual(teacherAfterStudentAgentShare.body.stuckSignals[0].studentAlias, "S002");
    assert.ok(teacherAfterStudentAgentShare.body.stuckSignals[0].note.includes("API test"));

    const teacherBriefingAfterStudentShare = await request("GET", "/api/teacher-agent/briefing", null, teacherCookie);
    assert.ok(teacherBriefingAfterStudentShare.body.sourceSignals.some((item) => item.type === "stuck_signals" && item.count >= 1));

    const impersonationAttempt = await request(
      "GET",
      "/api/workspace?role=teacher&userId=teacher-lin&classId=class-physics-a",
      null,
      studentCookie
    );
    assert.strictEqual(impersonationAttempt.body.session.role, "student");
    assert.strictEqual(impersonationAttempt.body.students.length, 1);

    let studentResetBlocked = false;
    try {
      await request("POST", "/api/workspace/reset", {}, studentCookie);
    } catch (error) {
      studentResetBlocked = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(studentResetBlocked, true);

    let studentWriteBlocked = false;
    try {
      await request("PUT", "/api/workspace", { students: [] }, studentCookie);
    } catch (error) {
      studentWriteBlocked = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(studentWriteBlocked, true);

    let studentTeacherAgentBlocked = false;
    try {
      await request("GET", "/api/teacher-agent/briefing", null, studentCookie);
    } catch (error) {
      studentTeacherAgentBlocked = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(studentTeacherAgentBlocked, true);

    state = await request("POST", "/api/workspace/stuck-signals", {
      studentAlias: "S002",
      stuckType: "公式没懂",
      note: "API test: I cannot connect symbols to the diagram."
    }, studentCookie);
    assert.strictEqual(state.body.stuckSignals[0].studentAlias, "S002");
    assert.strictEqual(state.body.stuckSignals[0].stuckType, "公式没懂");
    assert.ok(state.body.auditEvents.some((event) => event.action === "record_stuck_signal"));

    state = await request("POST", "/api/workspace/check-ins", {
      studentAlias: "S002",
      state: "frustrated",
      note: "API test: I feel frustrated but want a learning step.",
      shareChoice: "private"
    }, studentCookie);
    assert.strictEqual(state.body.checkIns[0].teacherVisible, false);
    assert.ok(state.body.checkIns[0].privateReflection);

    state = await request("POST", "/api/workspace/check-ins", {
      studentAlias: "S002",
      state: "want_teacher_help",
      note: "API test: I do not understand why frequency matters.",
      shareChoice: "teacher_summary"
    }, studentCookie);
    assert.strictEqual(state.body.checkIns[0].teacherVisible, true);
    assert.ok(state.body.auditEvents.some((event) => event.action === "record_check_in"));

    state = await request("POST", "/api/workspace/assignment", {
      studentAlias: "S002",
      status: "已提交"
    }, studentCookie);
    assert.ok(state.body.auditEvents.some((event) => event.action === "update_assignment"));

    state = await request("POST", "/api/workspace/messages", {
      studentAlias: "S002",
      text: "API test: 老师，我想确认频率图怎么读。"
    }, studentCookie);
    assert.strictEqual(state.body.messages[0].senderRole, "student");
    assert.strictEqual(state.body.messages[0].studentAlias, "S002");
    assert.ok(state.body.auditEvents.some((event) => event.action === "record_message"));

    state = await request("POST", "/api/workspace/messages", {
      studentAlias: "S002",
      text: "API test: 先看最高的两个频率柱，再回到左边波形。"
    }, teacherCookie);
    assert.strictEqual(state.body.messages[0].senderRole, "teacher");
    assert.strictEqual(state.body.messages[0].studentAlias, "S002");

    state = await request("GET", "/api/workspace", null, teacherCookie);
    assert.strictEqual(state.body.stuckSignals[0].note, "API test: I cannot connect symbols to the diagram.");
    assert.ok(state.body.checkIns[0].summaryForTeacher.includes("API test"));
    assert.ok(state.body.messages.some((message) => message.text.includes("频率图")));
    assert.strictEqual(state.body.checkIns[0].note, undefined);
    assert.strictEqual(state.body.checkIns[0].privateReflection, undefined);
    assert.ok(state.body.auditEvents.some((event) => event.action === "session_login"));
    assert.ok(state.body.auditEvents.some((event) => event.action === "record_stuck_signal"));
    assert.ok(state.body.auditEvents.some((event) => event.action === "record_check_in"));
    assert.ok(state.body.auditEvents.some((event) => event.action === "update_assignment"));

    let teacherQuestionBlocked = false;
    try {
      await request("POST", "/api/workspace/questions", {
        studentAlias: "S002",
        text: "Teacher should not impersonate a student question."
      }, teacherCookie);
    } catch (error) {
      teacherQuestionBlocked = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(teacherQuestionBlocked, true);

    let forbidden = false;
    try {
      await request("POST", "/api/workspace/questions", {
        studentAlias: "S009",
        text: "This should be blocked."
      }, studentCookie);
    } catch (error) {
      forbidden = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(forbidden, true);

    let messageForbidden = false;
    try {
      await request("POST", "/api/workspace/messages", {
        studentAlias: "S009",
        text: "This should be blocked."
      }, studentCookie);
    } catch (error) {
      messageForbidden = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(messageForbidden, true);

    const persisted = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    assert.strictEqual(persisted.stuckSignals[0].studentAlias, "S002");
    assert.strictEqual(persisted.messages[0].senderRole, "teacher");
    assert.ok(persisted.auditEvents.some((event) => event.action === "access_denied"));

    const adminLogin = await request("POST", "/api/session/login", {
      accountId: "school-admin-demo",
      classId: "class-physics-a"
    });
    const adminCookie = cookieFrom(adminLogin);
    const adminView = await request("GET", "/api/workspace", null, adminCookie);
    assert.strictEqual(adminView.body.students.length, 0);
    assert.strictEqual(adminView.body.stuckSignals.length, 0);
    assert.strictEqual(adminView.body.checkIns.length, 0);
    assert.strictEqual(adminView.body.messages.length, 0);
    assert.ok(adminView.body.schoolAggregate);
    assert.strictEqual(adminView.body.schoolAggregate.classCount, 3);
    assert.ok(adminView.body.schoolAggregate.studentAliasCount >= 20);
    assert.ok(adminView.body.schoolAggregate.stuckSignalCount >= 6);
    assert.ok(adminView.body.schoolAggregate.checkInCount >= 3);
    assert.ok(adminView.body.schoolAggregate.comparison.highestSupportClass);
    assert.ok(adminView.body.schoolAggregate.comparison.mostActiveClass);
    assert.ok(adminView.body.schoolAggregate.classes.some((item) => item.id === "class-physics-a"));
    assert.ok(adminView.body.schoolAggregate.classes.some((item) => item.id === "class-mechanics-b"));
    assert.ok(adminView.body.schoolAggregate.classes.some((item) => item.id === "class-ap-electric"));

    let adminWriteBlocked = false;
    try {
      await request("PUT", "/api/workspace", { students: [] }, adminCookie);
    } catch (error) {
      adminWriteBlocked = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(adminWriteBlocked, true);

    console.log("workspace api tests passed");
  } finally {
    child.kill();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  child.kill();
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.error(output);
  console.error(error);
  process.exit(1);
});

function waitForServer() {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      request("GET", "/api/session/accounts")
        .then(resolve)
        .catch((error) => {
          if (Date.now() - startedAt > 5000) {
            reject(error);
            return;
          }
          setTimeout(tick, 100);
        });
    };
    tick();
  });
}

function request(method, route, body, cookie) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : "";
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    };
    if (cookie) headers.Cookie = cookie;

    const req = http.request({
      hostname: "127.0.0.1",
      port,
      method,
      path: route,
      headers
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => {
        raw += chunk;
      });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
          return;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: raw ? JSON.parse(raw) : null
        });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function cookieFrom(response) {
  const setCookie = response.headers["set-cookie"];
  assert.ok(setCookie && setCookie[0]);
  return setCookie[0].split(";")[0];
}
