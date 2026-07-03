const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.join(__dirname, "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "teachflow-system-integrity-"));
const port = 6300 + Math.floor(Math.random() * 500);
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

    const emptyAccounts = await request("GET", "/api/session/accounts");
    assert.strictEqual(emptyAccounts.body.accounts.length, 0);

    const teacherRegistration = await request("POST", "/api/session/register-teacher", {
      displayName: "System Test Teacher",
      schoolName: "TeachFlow System Test School",
      className: "System Test Class",
      course: "Physics",
      topic: "Electrons and current"
    });
    const teacherCookie = cookieFrom(teacherRegistration);
    const classId = teacherRegistration.body.context.classId;
    const inviteToken = teacherRegistration.body.invite.token;
    assert.strictEqual(teacherRegistration.body.account.role, "teacher");
    assert.ok(classId);
    assert.ok(inviteToken);

    const firstStudentRegistration = await request("POST", "/api/session/register-student", {
      inviteToken,
      displayName: "Student A"
    });
    const firstStudentCookie = cookieFrom(firstStudentRegistration);
    assert.strictEqual(firstStudentRegistration.body.context.studentAlias, "S001");

    const secondStudentRegistration = await request("POST", "/api/session/register-student", {
      inviteToken,
      displayName: "Student B"
    });
    const secondStudentCookie = cookieFrom(secondStudentRegistration);
    assert.strictEqual(secondStudentRegistration.body.context.studentAlias, "S002");

    let teacherWorkspace = await request("GET", "/api/workspace", null, teacherCookie);
    assert.strictEqual(teacherWorkspace.body.students.length, 2);
    assert.ok(teacherWorkspace.body.students.some((student) => student.id === "S001"));
    assert.ok(teacherWorkspace.body.students.some((student) => student.id === "S002"));

    const questionText = "I still do not know what an electron is.";
    await request("POST", "/api/workspace/questions", {
      studentAlias: "S001",
      text: questionText
    }, firstStudentCookie);

    const privateCheckInMarker = `PRIVATE CHECKIN ${Date.now()}`;
    await request("POST", "/api/workspace/check-ins", {
      studentAlias: "S001",
      state: "frustrated",
      note: privateCheckInMarker,
      shareChoice: "private"
    }, firstStudentCookie);

    teacherWorkspace = await request("GET", "/api/workspace", null, teacherCookie);
    assert.ok(!JSON.stringify(teacherWorkspace.body.checkIns).includes(privateCheckInMarker));

    const wellbeingMarker = `PRIVATE WELLBEING ${Date.now()}`;
    const wellbeingChat = await request("POST", "/api/student-agent/wellbeing-chat", {
      message: `I feel overwhelmed by science class. ${wellbeingMarker}`
    }, firstStudentCookie);
    assert.strictEqual(wellbeingChat.body.agent, "student-wellbeing-coach");
    assert.strictEqual(wellbeingChat.body.mode, "local");
    assert.ok(wellbeingChat.body.answer);
    assert.ok(wellbeingChat.body.copingStep);
    assert.ok(wellbeingChat.body.safetyNote);

    const rawAfterWellbeing = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    assert.ok(rawAfterWellbeing.auditEvents.some((event) => event.action === "student_wellbeing_chat"));
    assert.ok(!JSON.stringify(rawAfterWellbeing.messages || []).includes(wellbeingMarker));
    assert.ok(!JSON.stringify(rawAfterWellbeing.stuckSignals || []).includes(wellbeingMarker));
    assert.ok(!JSON.stringify(rawAfterWellbeing.checkIns || []).includes(wellbeingMarker));

    const sharedCheckInText = "I want the teacher to know I need a smaller explanation of electrons.";
    await request("POST", "/api/workspace/check-ins", {
      studentAlias: "S001",
      state: "want_teacher_help",
      note: sharedCheckInText,
      shareChoice: "teacher_summary"
    }, firstStudentCookie);

    const studentAgentChat = await request("POST", "/api/student-agent/chat", {
      question: "Can you explain electrons with a simple picture idea?"
    }, firstStudentCookie);
    assert.strictEqual(studentAgentChat.body.mode, "local");
    assert.ok(studentAgentChat.body.answer);
    assert.ok(studentAgentChat.body.shareDraft);

    await request("POST", "/api/student-agent/share-to-teacher", {
      stuckType: "definition_gap",
      text: questionText
    }, firstStudentCookie);

    await request("POST", "/api/workspace/assignment", {
      studentAlias: "S001",
      status: "submitted"
    }, firstStudentCookie);

    await request("POST", "/api/workspace/messages", {
      studentAlias: "S001",
      text: "Teacher, I need a smaller step about electrons and current."
    }, firstStudentCookie);

    const studentBriefing = await request("GET", "/api/student-agent/briefing", null, firstStudentCookie);
    assert.strictEqual(studentBriefing.body.agentId, "student-agent-orchestrator");
    assert.strictEqual(studentBriefing.body.studentAlias, "S001");
    assert.ok(studentBriefing.body.nextPlan.length >= 1);
    assert.ok(sourceCount(studentBriefing.body.sourceSignals, "questions") >= 1);
    assert.ok(sourceCount(studentBriefing.body.sourceSignals, "stuck_signals") >= 1);
    assert.ok(sourceCount(studentBriefing.body.sourceSignals, "check_ins") >= 1);

    teacherWorkspace = await request("GET", "/api/workspace", null, teacherCookie);
    assert.ok(teacherWorkspace.body.questions.some((item) => item.studentAlias === "S001" && item.text === questionText));
    assert.ok(teacherWorkspace.body.stuckSignals.some((item) => item.studentAlias === "S001" && item.note.includes("electron")));
    assert.ok(teacherWorkspace.body.checkIns.some((item) => item.studentAlias === "S001" && item.summaryForTeacher.includes("smaller explanation")));
    assert.ok(!JSON.stringify(teacherWorkspace.body.checkIns).includes(privateCheckInMarker));

    const teacherBriefing = await request("GET", "/api/teacher-agent/briefing", null, teacherCookie);
    assert.strictEqual(teacherBriefing.body.agentId, "teacher-agent-orchestrator");
    assert.ok(teacherBriefing.body.studentFocus.some((item) => item.studentAlias === "S001"));
    assert.ok(sourceCount(teacherBriefing.body.sourceSignals, "questions") >= 1);
    assert.ok(sourceCount(teacherBriefing.body.sourceSignals, "stuck_signals") >= 1);
    assert.ok(sourceCount(teacherBriefing.body.sourceSignals, "check_ins") >= 1);
    assert.ok(teacherBriefing.body.misconceptions.length >= 1);

    const teacherAgentAnswer = await request("POST", "/api/ai/teacher-agent", {
      question: "Which student should I support first and why?"
    }, teacherCookie);
    assert.strictEqual(teacherAgentAnswer.body.agent, "teacher-agent");
    assert.ok(teacherAgentAnswer.body.answer);

    const teacherActionState = await request("POST", "/api/teacher-agent/actions", {
      type: "send_message",
      studentAlias: "S001",
      title: "Small electron step",
      text: "Start with this: an electron is a tiny charged particle. We will connect it to current one step at a time."
    }, teacherCookie);
    const teacherAction = teacherActionState.body.teacherAgentActions[0];
    assert.strictEqual(teacherAction.type, "send_message");
    assert.strictEqual(teacherAction.studentAlias, "S001");
    assert.ok(teacherAction.id);

    const firstStudentAfterAction = await request("GET", "/api/workspace", null, firstStudentCookie);
    assert.ok(firstStudentAfterAction.body.teacherAgentActions.some((item) => item.id === teacherAction.id));
    assert.ok(firstStudentAfterAction.body.messages.some((item) => item.text.includes("tiny charged particle")));

    const secondStudentAfterAction = await request("GET", "/api/workspace", null, secondStudentCookie);
    assert.ok(!secondStudentAfterAction.body.teacherAgentActions.some((item) => item.id === teacherAction.id));
    assert.ok(!secondStudentAfterAction.body.messages.some((item) => item.text.includes("tiny charged particle")));

    await request("POST", "/api/workspace/teacher-actions/read", {
      studentAlias: "S001",
      actionId: teacherAction.id
    }, firstStudentCookie);

    await request("POST", "/api/workspace/stuck-signals", {
      studentAlias: "S001",
      stuckType: "definition_gap",
      note: "I still need a smaller step after the teacher message.",
      linkedTeacherActionId: teacherAction.id,
      responseType: "still_stuck"
    }, firstStudentCookie);

    const teacherBriefingAfterOutcome = await request("GET", "/api/teacher-agent/briefing", null, teacherCookie);
    const outcome = teacherBriefingAfterOutcome.body.outcomeEvaluation;
    assert.ok(outcome);
    assert.ok(outcome.metrics.actionCount >= 1);
    assert.ok(outcome.metrics.needsFollowupCount >= 1);
    assert.ok(outcome.evaluations.some((item) => item.actionId === teacherAction.id && item.status === "needs_followup"));
    assert.ok(outcome.nextTeacherActions.some((item) => item.studentAlias === "S001"));

    const materialDraft = await request("POST", "/api/ai/material-generator", {
      materialType: "讲义",
      topic: "Electrons and current",
      targetLevel: "Level 1",
      prompt: "Create a short handout for one student who does not know what an electron is.",
      studentAliases: ["S001"]
    }, teacherCookie);
    assert.strictEqual(materialDraft.body.agent, "material-generator");
    assert.strictEqual(materialDraft.body.savedDraft.classId, classId);
    assert.deepStrictEqual(materialDraft.body.savedDraft.targetAliases, ["S001"]);

    const publishedMaterial = await request("POST", "/api/workspace/material-drafts/publish", {
      id: materialDraft.body.savedDraft.id,
      studentAliases: ["S001"]
    }, teacherCookie);
    assert.strictEqual(publishedMaterial.body.publishedMaterial.status, "published");
    assert.deepStrictEqual(publishedMaterial.body.publishedMaterial.publishedToAliases, ["S001"]);
    assert.strictEqual(publishedMaterial.body.assignedActions.length, 1);

    const firstStudentAfterMaterial = await request("GET", "/api/workspace", null, firstStudentCookie);
    assert.ok(firstStudentAfterMaterial.body.approvedMaterials.some((item) => item.id === publishedMaterial.body.publishedMaterial.id));
    assert.ok(firstStudentAfterMaterial.body.teacherAgentActions.some((item) => item.material?.id === publishedMaterial.body.publishedMaterial.id));

    const secondStudentAfterMaterial = await request("GET", "/api/workspace", null, secondStudentCookie);
    assert.ok(!secondStudentAfterMaterial.body.approvedMaterials.some((item) => item.id === publishedMaterial.body.publishedMaterial.id));
    assert.ok(!secondStudentAfterMaterial.body.teacherAgentActions.some((item) => item.material?.id === publishedMaterial.body.publishedMaterial.id));

    let studentTeacherAgentBlocked = false;
    try {
      await request("GET", "/api/teacher-agent/briefing", null, firstStudentCookie);
    } catch (error) {
      studentTeacherAgentBlocked = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(studentTeacherAgentBlocked, true);

    let teacherWellbeingBlocked = false;
    try {
      await request("POST", "/api/student-agent/wellbeing-chat", {
        message: "Teacher should not use the student wellbeing coach."
      }, teacherCookie);
    } catch (error) {
      teacherWellbeingBlocked = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(teacherWellbeingBlocked, true);

    const persisted = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    assert.ok(persisted.auditEvents.some((event) => event.action === "teacher_register"));
    assert.ok(persisted.auditEvents.some((event) => event.action === "student_join_class"));
    assert.ok(persisted.auditEvents.some((event) => event.action === "student_wellbeing_chat"));
    assert.ok(persisted.auditEvents.some((event) => event.action === "record_check_in"));
    assert.ok(persisted.auditEvents.some((event) => event.action === "student_agent_share_to_teacher"));
    assert.ok(persisted.auditEvents.some((event) => event.action === "teacher_agent_action"));
    assert.ok(persisted.auditEvents.some((event) => event.action === "material_draft_publish"));
    assert.ok(!JSON.stringify(persisted.messages || []).includes(wellbeingMarker));
    assert.ok(!JSON.stringify(persisted.stuckSignals || []).includes(wellbeingMarker));
    assert.ok(!JSON.stringify(persisted.checkIns || []).includes(wellbeingMarker));

    console.log("school live system integrity tests passed");
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

function sourceCount(items, type) {
  const item = (items || []).find((entry) => entry.type === type);
  return item ? Number(item.count || 0) : 0;
}

function waitForServer() {
  const deadline = Date.now() + 6000;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      request("GET", "/api/session/accounts")
        .then(resolve)
        .catch((error) => {
          if (Date.now() > deadline) {
            reject(new Error(`Server did not start: ${error.message}\n${output}`));
            return;
          }
          setTimeout(attempt, 100);
        });
    };
    attempt();
  });
}

function request(method, route, body, cookie) {
  const payload = body ? JSON.stringify(body) : "";
  const headers = {
    Accept: "application/json"
  };
  if (body) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(payload);
  }
  if (cookie) headers.Cookie = cookie;

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      method,
      path: route,
      headers
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => {
        raw += chunk.toString();
      });
      res.on("end", () => {
        const parsed = raw ? JSON.parse(raw) : {};
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
          return;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
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
