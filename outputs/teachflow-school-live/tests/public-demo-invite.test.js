const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const {spawn} = require("child_process");

const projectRoot = path.join(__dirname, "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "teachflow-public-invite-"));
const port = 6500 + Math.floor(Math.random() * 500);
const stateFile = path.join(tempDir, "workspace-state.json");

fs.writeFileSync(stateFile, JSON.stringify({version: 1,
 school: {id: "school-live", name: "TeachFlow school"},
 activeclassId: null,
 accounts: [],
 classes: [],
 students: [],
 assignments: {},
 questions: [],
 stuckSignals: [],
 checkIns: [],
 messages: [],
 teacherAgentActions: [],
 auditEvents: [],
 approvedmaterials: [],
 draftmaterials: [],
 inviteLinks: []}, null, 2), "utf8");

const child = spawn(process.execPath, ["server.js", `--port=${port}`], {cwd: projectRoot,
 env: {...process.env,
 TEACHFLOW_AI_MODE: "local",
 TEACHFLOW_WORKSPACE_FILE: stateFile},
 stdio: ["ignore", "pipe", "pipe"]});

let output = "";
child.stdout.on("data", (chunk) => {output += chunk.toString();});
child.stderr.on("data", (chunk) => {output += chunk.toString();});

(async () => {try {await waitForServer();

 const legacyToken = "join-6d37d5ced42095b94db1775a";
 const invite = await request("GET", `/api/session/invite?token=${legacyToken}`);
 assert.strictEqual(invite.body.className, "Year 12 Physics Demo");
 assert.strictEqual(invite.body.course, "Physics");
 assert.strictEqual(invite.body.topic, "Waves, frequency and signals");
 assert.strictEqual(invite.body.active, true);

 const stored = JSON.parse(fs.readFileSync(stateFile, "utf8"));
 assert.ok(stored.inviteLinks.some((item) => item.token === "join-demo" && item.stable === true));
 assert.ok(stored.inviteLinks.some((item) => item.token === legacyToken && item.stable === true));
 assert.ok(stored.inviteLinks.some((item) => item.token === "join-00c74581cd17b2cef3429fc9" && item.stable === true));
 assert.ok(stored.classes.some((item) => item.id === "class-public-demo"));
 assert.ok(stored.accounts.some((item) => item.id === "teacher-public-demo"));

 const stableInvite = await request("GET", "/api/session/invite?token=join-demo");
 assert.strictEqual(stableInvite.body.className, "Year 12 Physics Demo");

 const pupilRegistration = await request("POST", "/api/session/register-student", {inviteToken: legacyToken,
 displayName: "Judge pupil"});
 assert.strictEqual(pupilRegistration.body.authenticated, true);
 assert.strictEqual(pupilRegistration.body.account.role, "student");
 assert.strictEqual(pupilRegistration.body.context.studentAlias, "S001");

 console.log("public demo invite tests passed");} finally {child.kill();
 fs.rmSync(tempDir, {recursive: true, force: true});}})().catch((error) => {child.kill();
 fs.rmSync(tempDir, {recursive: true, force: true});
 console.error(output);
 console.error(error);
 process.exit(1);});

function waitForServer() {const deadline = Date.now() + 6000;
 return new Promise((resolve, reject) => {const attempt = () => {request("GET", "/api/session/accounts").then(resolve).catch((error) => {if (Date.now() > deadline) {reject(new Error(`Server did not start: ${error.message}\n${output}`));
 return;}
 setTimeout(attempt, 100);});};
 attempt();});}

function request(method, route, body, cookie) {const payload = body? JSON.stringify(body): "";
 const headers = {Accept: "application/json"};
 if (body) {headers["Content-Type"] = "application/json";
 headers["Content-Length"] = Buffer.byteLength(payload);}
 if (cookie) headers.Cookie = cookie;

 return new Promise((resolve, reject) => {const req = http.request({hostname: "127.0.0.1",
 port,
 method,
 path: route,
 headers}, (res) => {let raw = "";
 res.on("data", (chunk) => {raw += chunk.toString();});
 res.on("end", () => {const parsed = raw? JSON.parse(raw): {};
 if (res.statusCode < 200 || res.statusCode >= 300) {reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
 return;}
 resolve({statusCode: res.statusCode,
 headers: res.headers,
 body: parsed});});});
 req.on("error", reject);
 if (payload) req.write(payload);
 req.end();});}
