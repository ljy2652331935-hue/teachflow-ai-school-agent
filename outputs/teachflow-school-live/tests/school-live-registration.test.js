const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.join(__dirname, "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "teachflow-school-live-"));
const port = 6100 + Math.floor(Math.random() * 500);
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
      displayName: "试用老师",
      schoolName: "TeachFlow School",
      className: "AI 课堂试用班",
      course: "物理",
      topic: "波与频率"
    });
    const teacherCookie = cookieFrom(teacherRegistration);
    assert.strictEqual(teacherRegistration.body.authenticated, true);
    assert.strictEqual(teacherRegistration.body.account.role, "teacher");
    assert.ok(teacherRegistration.body.invite.token);
    assert.ok(teacherRegistration.body.invite.joinUrl.includes("/login.html?join="));

    const invite = await request("GET", `/api/session/invite?token=${encodeURIComponent(teacherRegistration.body.invite.token)}`);
    assert.strictEqual(invite.body.className, "AI 课堂试用班");
    assert.strictEqual(invite.body.topic, "波与频率");

    let teacherState = await request("GET", "/api/workspace", null, teacherCookie);
    assert.strictEqual(teacherState.body.students.length, 0);
    assert.strictEqual(teacherState.body.classes.length, 1);
    assert.ok(teacherState.body.inviteLinks.some((item) => item.token === teacherRegistration.body.invite.token));

    const studentRegistration = await request("POST", "/api/session/register-student", {
      inviteToken: teacherRegistration.body.invite.token,
      displayName: "学生A"
    });
    const studentCookie = cookieFrom(studentRegistration);
    assert.strictEqual(studentRegistration.body.authenticated, true);
    assert.strictEqual(studentRegistration.body.account.role, "student");
    assert.strictEqual(studentRegistration.body.context.studentAlias, "S001");

    const studentState = await request("GET", "/api/workspace", null, studentCookie);
    assert.strictEqual(studentState.body.students.length, 1);
    assert.strictEqual(studentState.body.students[0].id, "S001");
    assert.strictEqual(studentState.body.accessBoundary.canReadAllStudents, false);
    assert.ok(studentState.body.students.every((student) => student.id === "S001"));

    teacherState = await request("GET", "/api/workspace", null, teacherCookie);
    assert.strictEqual(teacherState.body.students.length, 1);
    assert.strictEqual(teacherState.body.students[0].id, "S001");
    assert.ok(teacherState.body.auditEvents.some((event) => event.action === "teacher_register"));
    assert.ok(teacherState.body.auditEvents.some((event) => event.action === "student_join_class"));

    const secondStudentRegistration = await request("POST", "/api/session/register-student", {
      inviteToken: teacherRegistration.body.invite.token,
      displayName: "Student B"
    });
    const secondStudentCookie = cookieFrom(secondStudentRegistration);
    assert.strictEqual(secondStudentRegistration.body.context.studentAlias, "S002");

    const updatedClass = await request("POST", "/api/workspace/class-settings", {
      className: "AI 课堂试用班",
      course: "物理",
      topic: "第一节：波与频率入门"
    }, teacherCookie);
    assert.strictEqual(updatedClass.body.topic, "第一节：波与频率入门");
    assert.ok(updatedClass.body.auditEvents.some((event) => event.action === "update_class_settings"));

    const studentAfterTopicUpdate = await request("GET", "/api/workspace", null, studentCookie);
    assert.strictEqual(studentAfterTopicUpdate.body.topic, "第一节：波与频率入门");

    const studentQuestion = await request("POST", "/api/workspace/questions", {
      studentAlias: "S001",
      text: "我不理解频率图怎么读。"
    }, studentCookie);
    assert.strictEqual(studentQuestion.body.questions[0].studentAlias, "S001");

    const teacherAfterQuestion = await request("GET", "/api/workspace", null, teacherCookie);
    assert.strictEqual(teacherAfterQuestion.body.questions[0].text, "我不理解频率图怎么读。");

    const teacherBriefing = await request("GET", "/api/teacher-agent/briefing", null, teacherCookie);
    assert.strictEqual(teacherBriefing.body.agentId, "teacher-agent-orchestrator");
    assert.strictEqual(teacherBriefing.body.session.role, "teacher");
    assert.ok(teacherBriefing.body.studentFocus.some((item) => item.studentAlias === "S001"));

    const materialDraft = await request("POST", "/api/ai/material-generator", {
      materialType: "讲义",
      topic: "第一节：波与频率入门",
      targetLevel: "Level 1 困惑学生",
      prompt: "生成一份低门槛课堂讲义。"
    }, teacherCookie);
    assert.strictEqual(materialDraft.body.agent, "material-generator");
    assert.strictEqual(materialDraft.body.savedDraft.kind, "handout");
    assert.strictEqual(materialDraft.body.savedDraft.type, "讲义");
    assert.strictEqual(materialDraft.body.savedDraft.classId, teacherRegistration.body.context.classId);
    assert.ok(materialDraft.body.state.draftMaterials.some((item) => item.id === materialDraft.body.savedDraft.id));

    const exerciseDraft = await request("POST", "/api/ai/material-generator", {
      materialType: "练习",
      topic: "第一节：波与频率入门",
      targetLevel: "Level 1 困惑学生",
      prompt: "生成两道低门槛课堂练习。"
    }, teacherCookie);
    assert.strictEqual(exerciseDraft.body.savedDraft.type, "练习");
    assert.strictEqual(exerciseDraft.body.savedDraft.kind, "exercise");
    assert.ok(exerciseDraft.body.savedDraft.exercises.length >= 1);

    const imageDraft = await request("POST", "/api/ai/material-generator", {
      materialType: "图片",
      topic: "第一节：波与频率入门",
      targetLevel: "Level 1 困惑学生",
      prompt: "生成一张帮助学生理解波峰、波谷和频率关系的图。"
    }, teacherCookie);
    assert.strictEqual(imageDraft.body.savedDraft.type, "图片");
    assert.strictEqual(imageDraft.body.savedDraft.kind, "image");
    assert.ok(imageDraft.body.savedDraft.imagePrompt);

    const teacherAfterMaterialDraft = await request("GET", "/api/workspace", null, teacherCookie);
    assert.ok(teacherAfterMaterialDraft.body.draftMaterials.some((item) => item.id === materialDraft.body.savedDraft.id));

    const editedMaterial = await request("POST", "/api/workspace/material-drafts", {
      id: materialDraft.body.savedDraft.id,
      title: "修改后的课堂讲义",
      type: "讲义",
      topic: "第一节：波与频率入门",
      targetLevel: "Level 1 困惑学生",
      goal: "让学生先用自己的话解释频率。",
      outline: ["直觉解释", "一个生活例子", "课堂小任务"],
      teacherNotes: "课堂上先问学生看到什么，再引入术语。",
      studentTask: "用一句话写下频率代表什么。",
      reviewChecklist: ["语言是否足够简单", "例子是否贴近本班"]
    }, teacherCookie);
    assert.strictEqual(editedMaterial.body.savedDraft.title, "修改后的课堂讲义");
    assert.strictEqual(editedMaterial.body.savedDraft.version, 2);

    const teacherAfterMaterialEdit = await request("GET", "/api/workspace", null, teacherCookie);
    assert.ok(teacherAfterMaterialEdit.body.draftMaterials.some((item) => {
      return item.id === materialDraft.body.savedDraft.id && item.title === "修改后的课堂讲义";
    }));

    const publishedMaterial = await request("POST", "/api/workspace/material-drafts/publish", {
      id: materialDraft.body.savedDraft.id,
      studentAliases: ["S001"]
    }, teacherCookie);
    assert.strictEqual(publishedMaterial.body.publishedMaterial.status, "published");
    assert.strictEqual(publishedMaterial.body.publishedMaterial.sourceDraftId, materialDraft.body.savedDraft.id);
    assert.deepStrictEqual(publishedMaterial.body.publishedMaterial.publishedToAliases, ["S001"]);
    assert.ok(publishedMaterial.body.state.approvedMaterials.some((item) => item.id === publishedMaterial.body.publishedMaterial.id));
    assert.ok(!publishedMaterial.body.state.draftMaterials.some((item) => item.id === materialDraft.body.savedDraft.id));
    assert.strictEqual(publishedMaterial.body.assignedActions.length, 1);
    assert.ok(publishedMaterial.body.assignedActions.some((item) => item.studentAlias === "S001"));

    const studentAfterPublish = await request("GET", "/api/workspace", null, studentCookie);
    assert.ok(studentAfterPublish.body.approvedMaterials.some((item) => item.id === publishedMaterial.body.publishedMaterial.id));
    assert.ok(studentAfterPublish.body.teacherAgentActions.some((item) => {
      return item.type === "assign_material" && item.material?.id === publishedMaterial.body.publishedMaterial.id;
    }));
    assert.strictEqual(studentAfterPublish.body.draftMaterials.length, 0);

    const secondStudentAfterPublish = await request("GET", "/api/workspace", null, secondStudentCookie);
    assert.ok(!secondStudentAfterPublish.body.approvedMaterials.some((item) => item.id === publishedMaterial.body.publishedMaterial.id));
    assert.ok(!secondStudentAfterPublish.body.teacherAgentActions.some((item) => item.material?.id === publishedMaterial.body.publishedMaterial.id));

    let studentTeacherAgentBlocked = false;
    try {
      await request("GET", "/api/teacher-agent/briefing", null, studentCookie);
    } catch (error) {
      studentTeacherAgentBlocked = /HTTP 403/.test(error.message);
    }
    assert.strictEqual(studentTeacherAgentBlocked, true);

    const persisted = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    assert.strictEqual(persisted.students.length, 2);
    assert.strictEqual(persisted.students[0].id, "S001");
    assert.strictEqual(persisted.students[1].id, "S002");
    assert.ok(!JSON.stringify(persisted).includes("class-physics-a"));
    assert.ok(!JSON.stringify(persisted).includes("test-student-s002"));

    console.log("school live registration tests passed");
  } finally {
    child.kill();
  }
})().catch((error) => {
  child.kill();
  console.error(output);
  console.error(error);
  process.exit(1);
});

function waitForServer() {
  const deadline = Date.now() + 5000;
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
  const payload = body ? JSON.stringify(body) : null;
  const headers = {
    Accept: "application/json"
  };
  if (payload) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(payload);
  }
  if (cookie) headers.Cookie = cookie;

  return new Promise((resolve, reject) => {
    const req = require("http").request({
      method,
      hostname: "127.0.0.1",
      port,
      path: route,
      headers
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => {
        raw += chunk.toString();
      });
      res.on("end", () => {
        const parsed = raw ? JSON.parse(raw) : {};
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
          return;
        }
        resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function cookieFrom(response) {
  const value = response.headers["set-cookie"]?.[0] || "";
  return value.split(";")[0];
}
