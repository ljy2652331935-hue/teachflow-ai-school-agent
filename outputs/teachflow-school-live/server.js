const http = require("http");
const fs = require("fs");
const path = require("path");
const {spawn} = require("child_process");
const {loadLocalEnv} = require("./env-loader.js");
const sessionStore = require("./session-store.js");
const workspaceStore = require("./workspace-store.js");

const root = __dirname;
loadLocalEnv(root);
const explicitPortArg = process.argv.find((arg) => arg.startsWith("--port="));
const parsedPort = Number(explicitPortArg? explicitPortArg.slice("--port=".length): process.env.PORT || 5174);
const port = Number.isFinite(parsedPort) && parsedPort > 0? parsedPort: 5174;
const host = process.env.HOST || (process.env.PORT? "0.0.0.0": "127.0.0.1");

if (process.argv.includes("--daemon")) {const logPath = path.join(root, "teachflow-server.log");
 const logStream = fs.openSync(logPath, "a");
 const child = spawn(process.execPath, [__filename, `--port=${port}`], {cwd: root,
 detached: true,
 stdio: ["ignore", logStream, logStream],
 windowsHide: true});

 child.unref();
 console.log(`TeachFlow is starting in the background at http://127.0.0.1:${port}`);
 console.log(`Log file: ${logPath}`);
 process.exit(0);}

const contentTypes = {".html": "text/html; charset=utf-8",
 ".css": "text/css; charset=utf-8",
 ".js": "text/javascript; charset=utf-8",
 ".json": "application/json; charset=utf-8",
 ".md": "text/markdown; charset=utf-8",
 ".svg": "image/svg+xml; charset=utf-8",
 ".png": "image/png",
 ".ts": "text/plain; charset=utf-8"};

const server = http.createServer((request, response) => {const requestUrl = new URL(request.url, `http://${request.headers.host}`);

 if (requestUrl.pathname.startsWith("/api/session")) {handleSessionApi(request, response, requestUrl).catch((error) => {sendJson(response, error.statusCode || 500, {error: error.message || "Session API error"});});
 return;}

 if (requestUrl.pathname.startsWith("/api/workspace")) {handleWorkspaceApi(request, response, requestUrl).catch((error) => {sendJson(response, error.statusCode || 500, {error: error.message || "Workspace API error"});});
 return;}

 if (requestUrl.pathname.startsWith("/api/ai")) {handleAiApi(request, response, requestUrl).catch((error) => {sendJson(response, error.statusCode || 500, {error: error.message || "AI API error"});});
 return;}

 if (requestUrl.pathname.startsWith("/api/teacher-agent")) {handleteacherAgentApi(request, response, requestUrl).catch((error) => {sendJson(response, error.statusCode || 500, {error: error.message || "teacher Agent API error"});});
 return;}

 if (requestUrl.pathname.startsWith("/api/student-agent")) {handleStudentAgentApi(request, response, requestUrl).catch((error) => {sendJson(response, error.statusCode || 500, {error: error.message || "Student Agent API error"});});
 return;}

 const requestedPath = requestUrl.pathname === "/"? "/index.html": requestUrl.pathname;
 const filePath = path.resolve(root, `.${decodeURIComponent(requestedPath)}`);

 if (!filePath.startsWith(root)) {response.writeHead(403, {"Content-Type": "text/plain; charset=utf-8"});
 response.end("Forbidden");
 return;}

 fs.readFile(filePath, (error, content) => {if (error) {response.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
 response.end("Not found");
 return;}

 const extension = path.extname(filePath).toLowerCase();
 response.writeHead(200, {"Content-Type": contentTypes[extension] || "application/octet-stream",
 "Cache-Control": "no-store"});
 response.end(content);});});

async function handleSessionApi(request, response, requestUrl) {const route = requestUrl.pathname.replace(/\/$/, "");
 const state = workspaceStore.getRawState();

 if (request.method === "GET" && route === "/api/session/accounts") {sendJson(response, 200, {accounts: sessionStore.listAccounts(state),
 school: state.school || null});
 return;}

 if (request.method === "GET" && route === "/api/session/invite") {const invite = workspaceStore.getInviteByToken(requestUrl.searchParams.get("token"));
 if (!invite) {sendJson(response, 404, {error: "Invite not found"});
 return;}
 sendJson(response, 200, withInviteUrl(invite, request));
 return;}

 if (request.method === "GET" && route === "/api/session") {const session = sessionStore.getSessionFromRequest(request, state);
 sendJson(response, 200, sessionStore.publicSession(session));
 return;}

 if (request.method === "POST" && route === "/api/session/login") {const session = sessionStore.createSession(state, await readJsonBody(request));
 workspaceStore.recordAuditEvent({action: "session_login",
 actorId: session.context.userId,
 role: session.context.role,
 classId: session.context.classId,
 studentAlias: session.context.studentAlias || null,
 targetType: "session",
 targetId: session.account.id,
 details: {displayName: session.account.displayName,
 className: session.class.name}});
 sendJson(response, 200, sessionStore.publicSession(session), {"Set-Cookie": sessionStore.sessionCookie(session)});
 return;}

 if (request.method === "POST" && route === "/api/session/register-teacher") {const registration = workspaceStore.registerteacher(await readJsonBody(request));
 const session = sessionStore.createSession(registration.state, {accountId: registration.account.id,
 classId: registration.classRecord.id});
 sendJson(response, 201, {...sessionStore.publicSession(session),
 invite: withInviteUrl(registration.invite, request)}, {"Set-Cookie": sessionStore.sessionCookie(session)});
 return;}

 if (request.method === "POST" && route === "/api/session/register-student") {const registration = workspaceStore.registerStudentWithInvite(await readJsonBody(request));
 const session = sessionStore.createSession(registration.state, {accountId: registration.account.id,
 classId: registration.classRecord.id});
 sendJson(response, 201, {...sessionStore.publicSession(session),
 student: registration.student,
 invite: withInviteUrl(registration.invite, request)}, {"Set-Cookie": sessionStore.sessionCookie(session)});
 return;}

 if (request.method === "POST" && route === "/api/session/logout") {const session = sessionStore.destroySessionFromRequest(request);
 if (session) {workspaceStore.recordAuditEvent({action: "session_logout",
 actorId: session.context.userId,
 role: session.context.role,
 classId: session.context.classId,
 studentAlias: session.context.studentAlias || null,
 targetType: "session",
 targetId: session.account.id,
 details: {displayName: session.account.displayName}});}
 sendJson(response, 200, {authenticated: false}, {"Set-Cookie": sessionStore.expiredSessionCookie()});
 return;}

 sendJson(response, 404, {error: "Session API route not found"});}

async function handleWorkspaceApi(request, response, requestUrl) {const route = requestUrl.pathname.replace(/\/$/, "");
 const session = sessionStore.getSessionFromRequest(request, workspaceStore.getRawState());
 if (!session) {workspaceStore.recordAuditEvent({action: "access_denied",
 actorId: "anonymous",
 role: "anonymous",
 classId: null,
 targetType: "workspace",
 targetId: route || "/api/workspace",
 details: {reason: "Missing session"}});
 sendJson(response, 401, {error: "Authentication required"});
 return;}
 const queryContext = session.context;

 if (request.method === "GET" && route === "/api/workspace") {sendJson(response, 200, workspaceStore.getState(queryContext));
 return;}

 if (request.method === "PUT" && route === "/api/workspace") {sendJson(response, 200, workspaceStore.setState(withContext(await readJsonBody(request), queryContext)));
 return;}

 if (request.method === "POST" && route === "/api/workspace/reset") {sendJson(response, 200, workspaceStore.resetState(queryContext));
 return;}

 if (request.method === "POST" && route === "/api/workspace/assignment") {sendJson(response, 200, workspaceStore.updateassignment(withContext(await readJsonBody(request), queryContext)));
 return;}

 if (request.method === "POST" && route === "/api/workspace/class-settings") {sendJson(response, 200, workspaceStore.updateclasssettings(withContext(await readJsonBody(request), queryContext)));
 return;}

 if (request.method === "POST" && route === "/api/workspace/material-drafts") {sendJson(response, 200, workspaceStore.updatematerialdraft(withContext(await readJsonBody(request), queryContext)));
 return;}

 if (request.method === "POST" && route === "/api/workspace/material-drafts/publish") {sendJson(response, 200, workspaceStore.publishmaterialdraft(withContext(await readJsonBody(request), queryContext)));
 return;}

 if (request.method === "POST" && route === "/api/workspace/questions") {sendJson(response, 200, workspaceStore.recordquestion(withContext(await readJsonBody(request), queryContext)));
 return;}

 if (request.method === "POST" && route === "/api/workspace/stuck-signals") {sendJson(response, 200, workspaceStore.recordStuckSignal(withContext(await readJsonBody(request), queryContext)));
 return;}

 if (request.method === "POST" && route === "/api/workspace/check-ins") {sendJson(response, 200, workspaceStore.recordCheckIn(withContext(await readJsonBody(request), queryContext)));
 return;}

 if (request.method === "POST" && route === "/api/workspace/messages") {sendJson(response, 200, workspaceStore.recordmessage(withContext(await readJsonBody(request), queryContext)));
 return;}

 if (request.method === "POST" && route === "/api/workspace/teacher-actions/read") {sendJson(response, 200, workspaceStore.markteacherActionRead(withContext(await readJsonBody(request), queryContext)));
 return;}

 sendJson(response, 404, {error: "Workspace API route not found"});}

async function handleteacherAgentApi(request, response, requestUrl) {const route = requestUrl.pathname.replace(/\/$/, "");
 const session = sessionStore.getSessionFromRequest(request, workspaceStore.getRawState());
 if (!session) {workspaceStore.recordAuditEvent({action: "access_denied",
 actorId: "anonymous",
 role: "anonymous",
 classId: null,
 targetType: "teacher_agent",
 targetId: route || "/api/teacher-agent",
 details: {reason: "Missing session"}});
 sendJson(response, 401, {error: "Authentication required"});
 return;}

 if (request.method === "GET" && route === "/api/teacher-agent/briefing") {sendJson(response, 200, workspaceStore.getteacherAgentBriefing(session.context));
 return;}

 if (request.method === "POST" && route === "/api/teacher-agent/chat") {sendJson(response, 200, await workspaceStore.answerteacherAgentChat(withContext(await readJsonBody(request), session.context)));
 return;}

 if (request.method === "POST" && route === "/api/teacher-agent/actions") {sendJson(response, 200, workspaceStore.applyteacherAgentAction(withContext(await readJsonBody(request), session.context)));
 return;}

 sendJson(response, 404, {error: "teacher Agent API route not found"});}

async function handleStudentAgentApi(request, response, requestUrl) {const route = requestUrl.pathname.replace(/\/$/, "");
 const session = sessionStore.getSessionFromRequest(request, workspaceStore.getRawState());
 if (!session) {workspaceStore.recordAuditEvent({action: "access_denied",
 actorId: "anonymous",
 role: "anonymous",
 classId: null,
 targetType: "student_agent",
 targetId: route || "/api/student-agent",
 details: {reason: "Missing session"}});
 sendJson(response, 401, {error: "Authentication required"});
 return;}

 if (request.method === "GET" && route === "/api/student-agent/briefing") {sendJson(response, 200, workspaceStore.getStudentAgentBriefing(session.context));
 return;}

 if (request.method === "POST" && route === "/api/student-agent/chat") {sendJson(response, 200, await workspaceStore.answerStudentAgentChatLive(withContext(await readJsonBody(request), session.context)));
 return;}

 if (request.method === "POST" && route === "/api/student-agent/wellbeing-chat") {sendJson(response, 200, await workspaceStore.answerStudentWellbeingChatLive(withContext(await readJsonBody(request), session.context)));
 return;}

 if (request.method === "POST" && route === "/api/student-agent/stuck-draft") {sendJson(response, 200, workspaceStore.draftStudentAgentStuckSignal(withContext(await readJsonBody(request), session.context)));
 return;}

 if (request.method === "POST" && route === "/api/student-agent/share-to-teacher") {sendJson(response, 200, workspaceStore.shareStudentAgentSignal(withContext(await readJsonBody(request), session.context)));
 return;}

 sendJson(response, 404, {error: "Student Agent API route not found"});}

async function handleAiApi(request, response, requestUrl) {const route = requestUrl.pathname.replace(/\/$/, "");
 const session = sessionStore.getSessionFromRequest(request, workspaceStore.getRawState());
 if (!session) {workspaceStore.recordAuditEvent({action: "access_denied",
 actorId: "anonymous",
 role: "anonymous",
 classId: null,
 targetType: "ai",
 targetId: route || "/api/ai",
 details: {reason: "Missing session"}});
 sendJson(response, 401, {error: "Authentication required"});
 return;}

 if (request.method === "GET" && route === "/api/ai/status") {sendJson(response, 200, workspaceStore.getAistatus(session.context));
 return;}

 if (request.method === "POST" && route === "/api/ai/teacher-agent") {sendJson(response, 200, await workspaceStore.answerteacherAgentChat(withContext(await readJsonBody(request), session.context)));
 return;}

 if (request.method === "POST" && route === "/api/ai/student-agent") {sendJson(response, 200, await workspaceStore.answerStudentAgentChatLive(withContext(await readJsonBody(request), session.context)));
 return;}

 if (request.method === "POST" && route === "/api/ai/student-wellbeing") {sendJson(response, 200, await workspaceStore.answerStudentWellbeingChatLive(withContext(await readJsonBody(request), session.context)));
 return;}

 if (request.method === "POST" && route === "/api/ai/material-generator") {sendJson(response, 200, await workspaceStore.generateAimaterial(withContext(await readJsonBody(request), session.context)));
 return;}

 if (request.method === "POST" && route === "/api/ai/message-draft") {sendJson(response, 200, await workspaceStore.draftAiteachermessage(withContext(await readJsonBody(request), session.context)));
 return;}

 sendJson(response, 404, {error: "AI API route not found"});}

function contextFromQuery(requestUrl) {const role = requestUrl.searchParams.get("role");
 if (!role) return null;
 return {role,
 userId: requestUrl.searchParams.get("userId") || undefined,
 classId: requestUrl.searchParams.get("classId") || undefined,
 studentAlias: requestUrl.searchParams.get("studentAlias") || undefined};}

function withContext(body, context) {if (!context) return body;
 return {...(body || {}),
 context: {...((body && body.context) || {}),...context}};}

function withInviteUrl(invite, request) {return {...(invite || {}),
 joinUrl: `${publicBaseUrl(request)}/login.html?join=${encodeURIComponent(invite?.token || "")}`};}

function publicBaseUrl(request) {const forwardedProto = String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim();
 const protocol = forwardedProto || (request.socket?.encrypted? "https": "http");
 const forwardedHost = String(request.headers["x-forwarded-host"] || "").split(",")[0].trim();
 const host = forwardedHost || request.headers.host || `127.0.0.1:${port}`;
 return `${protocol}://${host}`;}

function readJsonBody(request) {return new Promise((resolve, reject) => {let raw = "";
 request.on("data", (chunk) => {raw += chunk;
 if (raw.length > 1024 * 1024) {request.destroy();
 reject(new Error("Request body is too large"));}});
 request.on("end", () => {if (!raw.trim()) {resolve({});
 return;}
 try {resolve(JSON.parse(raw));} catch (error) {reject(new Error("Invalid JSON body"));}});
 request.on("error", reject);});}

function sendJson(response, status, payload, headers) {response.writeHead(status, {"Content-Type": "application/json; charset=utf-8",
 "Cache-Control": "no-store",...(headers || {})});
 response.end(JSON.stringify(payload));}

server.on("error", (error) => {if (error.code === "EADDRINUSE") {console.error(`Port ${port} is already in use. Try: node server.js --port=5175`);
 process.exit(1);}

 console.error(error);
 process.exit(1);});

server.listen(port, host, () => {const visibleHost = host === "0.0.0.0"? "127.0.0.1": host;
 console.log(`TeachFlow v0.3 running at http://${visibleHost}:${port}`);});
