const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {spawn} = require("child_process");

const projectRoot = path.join(__dirname, "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "teachflow-school-live-"));
const port = 6100 + Math.floor(Math.random() * 500);
const stateFile = path.join(tempDir, "workspace-state.json");

const child = spawn(process.execPath, ["server.js", `--port=${port}`], {cwd: projectRoot,
 env: {...process.env,
 TEACHFLOW_AI_MODE: "local",
 TEACHFLOW_WORKSPACE_FILE: stateFile},
 stdio: ["ignore", "pipe", "pipe"]});

let output = "";
child.stdout.on("data", (chunk) => {output += chunk.toString();});
child.stderr.on("data", (chunk) => {output += chunk.toString();});

(async () => {try {await waitForServer();

 const emptyAccounts = await request("GET", "/api/session/accounts");
 assert.strictEqual(emptyAccounts.body.accounts.length, 0);

 const teacherRegistration = await request("POST", "/api/session/register-teacher", {displayName: "Pilotteacher",
 schoolName: "TeachFlow school",
 className: "AI class Pilot",
 course: "Physics",
 topic: "Waves and frequency"});
 const teacherCookie = cookieFrom(teacherRegistration);
 assert.strictEqual(teacherRegistration.body.authenticated, true);
 assert.strictEqual(teacherRegistration.body.account.role, "teacher");
 assert.ok(teacherRegistration.body.invite.token);
 assert.ok(teacherRegistration.body.invite.joinUrl.includes("/login.html?join="));

 const invite = await request("GET", `/api/session/invite?token=${encodeURIComponent(teacherRegistration.body.invite.token)}`);
 assert.strictEqual(invite.body.className, "AI class Pilot");
 assert.strictEqual(invite.body.topic, "Waves and frequency");

 let teacherState = await request("GET", "/api/workspace", null, teacherCookie);
 assert.strictEqual(teacherState.body.students.length, 0);
 assert.strictEqual(teacherState.body.classes.length, 1);
 assert.ok(teacherState.body.inviteLinks.some((item) => item.token === teacherRegistration.body.invite.token));

 const studentRegistration = await request("POST", "/api/session/register-student", {inviteToken: teacherRegistration.body.invite.token,
 displayName: "pupil A"});
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

 const secondStudentRegistration = await request("POST", "/api/session/register-student", {inviteToken: teacherRegistration.body.invite.token,
 displayName: "Student B"});
 const secondStudentCookie = cookieFrom(secondStudentRegistration);
 assert.strictEqual(secondStudentRegistration.body.context.studentAlias, "S002");

 const updatedclass = await request("POST", "/api/workspace/class-settings", {className: "AI class Pilot",
 course: "Physics",
 topic: "Lesson 1: introduction to waves and frequency"}, teacherCookie);
 assert.strictEqual(updatedclass.body.topic, "Lesson 1: introduction to waves and frequency");
 assert.ok(updatedclass.body.auditEvents.some((event) => event.action === "update_class_settings"));

 const studentAfterTopicupdate = await request("GET", "/api/workspace", null, studentCookie);
 assert.strictEqual(studentAfterTopicupdate.body.topic, "Lesson 1: introduction to waves and frequency");

 const studentquestion = await request("POST", "/api/workspace/questions", {studentAlias: "S001",
 text: "I do not understand how to read the frequency graph."}, studentCookie);
 assert.strictEqual(studentquestion.body.questions[0].studentAlias, "S001");

 const teacherAfterquestion = await request("GET", "/api/workspace", null, teacherCookie);
 assert.strictEqual(teacherAfterquestion.body.questions[0].text, "I do not understand how to read the frequency graph.");

 const teacherBriefing = await request("GET", "/api/teacher-agent/briefing", null, teacherCookie);
 assert.strictEqual(teacherBriefing.body.agentId, "teacher-agent-orchestrator");
 assert.strictEqual(teacherBriefing.body.session.role, "teacher");
 assert.ok(teacherBriefing.body.studentFocus.some((item) => item.studentAlias === "S001"));

 const materialdraft = await request("POST", "/api/ai/material-generator", {materialType: "Handout",
 topic: "Lesson 1: introduction to waves and frequency",
 targetLevel: "Level 1 confused pupils",
 prompt: "generate an accessible class handout."}, teacherCookie);
 assert.strictEqual(materialdraft.body.agent, "material-generator");
 assert.strictEqual(materialdraft.body.saveddraft.kind, "handout");
 assert.strictEqual(materialdraft.body.saveddraft.type, "Handout");
 assert.strictEqual(materialdraft.body.saveddraft.classId, teacherRegistration.body.context.classId);
 assert.ok(materialdraft.body.state.draftmaterials.some((item) => item.id === materialdraft.body.saveddraft.id));

 const exercisedraft = await request("POST", "/api/ai/material-generator", {materialType: "practice",
 topic: "Lesson 1: introduction to waves and frequency",
 targetLevel: "Level 1 confused pupils",
 prompt: "generate two accessible class practice questions."}, teacherCookie);
 assert.strictEqual(exercisedraft.body.saveddraft.type, "practice");
 assert.strictEqual(exercisedraft.body.saveddraft.kind, "exercise");
 assert.ok(exercisedraft.body.saveddraft.exercises.length >= 1);

 const imagedraft = await request("POST", "/api/ai/material-generator", {materialType: "visual",
 topic: "Lesson 1: introduction to waves and frequency",
 targetLevel: "Level 1 confused pupils",
 prompt: "generate a diagram that helps pupils understand the relationship between crests, troughs and frequency."}, teacherCookie);
 assert.strictEqual(imagedraft.body.saveddraft.type, "visual");
 assert.strictEqual(imagedraft.body.saveddraft.kind, "image");
 assert.ok(imagedraft.body.saveddraft.imagePrompt);

 const teacherAftermaterialdraft = await request("GET", "/api/workspace", null, teacherCookie);
 assert.ok(teacherAftermaterialdraft.body.draftmaterials.some((item) => item.id === materialdraft.body.saveddraft.id));

 const editedmaterial = await request("POST", "/api/workspace/material-drafts", {id: materialdraft.body.saveddraft.id,
 title: "Edited class handout",
 type: "Handout",
 topic: "Lesson 1: introduction to waves and frequency",
 targetLevel: "Level 1 confused pupils",
 goal: "pupilfirst learning of learningfrequency.",
 outline: ["learning", "learning", "class task"],
 teachernotes: "class learningfirstaskpupil viewlearning, then learning.",
 studentTask: "learningone sentencelearningfrequencylearning.",
 reviewChecklist: ["learning is learningsimple", "learning is learningThis class"]}, teacherCookie);
 assert.strictEqual(editedmaterial.body.saveddraft.title, "Edited class handout");
 assert.strictEqual(editedmaterial.body.saveddraft.version, 2);

 const teacherAftermaterialEdit = await request("GET", "/api/workspace", null, teacherCookie);
 assert.ok(teacherAftermaterialEdit.body.draftmaterials.some((item) => {return item.id === materialdraft.body.saveddraft.id && item.title === "Edited class handout";}));

 const publishedmaterial = await request("POST", "/api/workspace/material-drafts/publish", {id: materialdraft.body.saveddraft.id,
 studentAliases: ["S001"]}, teacherCookie);
 assert.strictEqual(publishedmaterial.body.publishedmaterial.status, "published");
 assert.strictEqual(publishedmaterial.body.publishedmaterial.sourcedraftId, materialdraft.body.saveddraft.id);
 assert.deepStrictEqual(publishedmaterial.body.publishedmaterial.publishedToAliases, ["S001"]);
 assert.ok(publishedmaterial.body.state.approvedmaterials.some((item) => item.id === publishedmaterial.body.publishedmaterial.id));
 assert.ok(!publishedmaterial.body.state.draftmaterials.some((item) => item.id === materialdraft.body.saveddraft.id));
 assert.strictEqual(publishedmaterial.body.assignedActions.length, 1);
 assert.ok(publishedmaterial.body.assignedActions.some((item) => item.studentAlias === "S001"));

 const studentAfterpublish = await request("GET", "/api/workspace", null, studentCookie);
 assert.ok(studentAfterpublish.body.approvedmaterials.some((item) => item.id === publishedmaterial.body.publishedmaterial.id));
 assert.ok(studentAfterpublish.body.teacherAgentActions.some((item) => {return item.type === "assign_material" && item.material?.id === publishedmaterial.body.publishedmaterial.id;}));
 assert.strictEqual(studentAfterpublish.body.draftmaterials.length, 0);

 const secondStudentAfterpublish = await request("GET", "/api/workspace", null, secondStudentCookie);
 assert.ok(!secondStudentAfterpublish.body.approvedmaterials.some((item) => item.id === publishedmaterial.body.publishedmaterial.id));
 assert.ok(!secondStudentAfterpublish.body.teacherAgentActions.some((item) => item.material?.id === publishedmaterial.body.publishedmaterial.id));

 let studentteacherAgentBlocked = false;
 try {await request("GET", "/api/teacher-agent/briefing", null, studentCookie);} catch (error) {studentteacherAgentBlocked = /HTTP 403/.test(error.message);}
 assert.strictEqual(studentteacherAgentBlocked, true);

 const persisted = JSON.parse(fs.readFileSync(stateFile, "utf8"));
 assert.strictEqual(persisted.students.length, 2);
 assert.strictEqual(persisted.students[0].id, "S001");
 assert.strictEqual(persisted.students[1].id, "S002");
 assert.ok(!JSON.stringify(persisted).includes("class-physics-a"));
 assert.ok(!JSON.stringify(persisted).includes("test-student-s002"));

 console.log("school live registration tests passed");} finally {child.kill();}})().catch((error) => {child.kill();
 console.error(output);
 console.error(error);
 process.exit(1);});

function waitForServer() {const deadline = Date.now() + 5000;
 return new Promise((resolve, reject) => {const attempt = () => {request("GET", "/api/session/accounts").then(resolve).catch((error) => {if (Date.now() > deadline) {reject(new Error(`Server did not start: ${error.message}\n${output}`));
 return;}
 setTimeout(attempt, 100);});};
 attempt();});}

function request(method, route, body, cookie) {const payload = body? JSON.stringify(body): null;
 const headers = {Accept: "application/json"};
 if (payload) {headers["Content-Type"] = "application/json";
 headers["Content-Length"] = Buffer.byteLength(payload);}
 if (cookie) headers.Cookie = cookie;

 return new Promise((resolve, reject) => {const req = require("http").request({method,
 hostname: "127.0.0.1",
 port,
 path: route,
 headers}, (res) => {let raw = "";
 res.on("data", (chunk) => {raw += chunk.toString();});
 res.on("end", () => {const parsed = raw? JSON.parse(raw): {};
 if (res.statusCode >= 400) {reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
 return;}
 resolve({statusCode: res.statusCode, headers: res.headers, body: parsed});});});
 req.on("error", reject);
 if (payload) req.write(payload);
 req.end();});}

function cookieFrom(response) {const value = response.headers["set-cookie"]?.[0] || "";
 return value.split(";")[0];}
