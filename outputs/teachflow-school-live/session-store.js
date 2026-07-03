const crypto = require("crypto");

const COOKIE_NAME = "teachflow_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map();

function listAccounts(state) {
  const classes = Array.isArray(state.classes) ? state.classes : [];
  return (state.accounts || []).map((account) => ({
    id: account.id,
    role: account.role,
    displayName: account.displayName,
    studentAlias: account.studentAlias || null,
    classIds: account.classIds || [],
    classes: (account.classIds || []).map((classId) => {
      const classRecord = classes.find((item) => item.id === classId);
      return {
        id: classId,
        name: classRecord?.name || classId,
        course: classRecord?.course || "",
        topic: classRecord?.topic || ""
      };
    })
  }));
}

function createSession(state, input) {
  const accountId = input?.accountId;
  const account = (state.accounts || []).find((item) => item.id === accountId);
  if (!account) throwAuth("Unknown account", 401);

  const classId = input?.classId || account.classIds?.[0];
  if (!classId || !account.classIds?.includes(classId)) {
    throwAuth("Account cannot access requested class", 403);
  }

  const classRecord = (state.classes || []).find((item) => item.id === classId);
  if (!classRecord) throwAuth("Unknown class", 403);

  const context = {
    role: account.role,
    userId: account.id,
    classId
  };

  if (account.role === "student") {
    context.studentAlias = account.studentAlias;
  }

  const session = {
    token: crypto.randomBytes(32).toString("hex"),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    account: publicAccount(account),
    class: publicClass(classRecord),
    context
  };

  sessions.set(session.token, session);
  return session;
}

function getSessionFromRequest(request, state) {
  const token = parseCookies(request.headers.cookie || "")[COOKIE_NAME];
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;

  if (Date.parse(session.expiresAt) <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return refreshSessionFromState(session, state);
}

function destroySessionFromRequest(request) {
  const token = parseCookies(request.headers.cookie || "")[COOKIE_NAME];
  if (!token) return null;
  const session = sessions.get(token) || null;
  sessions.delete(token);
  return session;
}

function publicSession(session) {
  if (!session) return { authenticated: false };
  return {
    authenticated: true,
    account: session.account,
    class: session.class,
    context: session.context,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt
  };
}

function sessionCookie(session) {
  return [
    `${COOKIE_NAME}=${session.token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  ].join("; ");
}

function expiredSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function parseCookies(header) {
  return String(header || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf("=");
      if (separator === -1) return cookies;
      const key = part.slice(0, separator);
      const value = part.slice(separator + 1);
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function refreshSessionFromState(session, state) {
  const account = (state.accounts || []).find((item) => item.id === session.context.userId);
  const classRecord = (state.classes || []).find((item) => item.id === session.context.classId);
  if (!account || !classRecord || !account.classIds?.includes(session.context.classId)) {
    sessions.delete(session.token);
    return null;
  }

  session.account = publicAccount(account);
  session.class = publicClass(classRecord);
  return session;
}

function publicAccount(account) {
  return {
    id: account.id,
    role: account.role,
    displayName: account.displayName,
    studentAlias: account.studentAlias || null,
    classIds: account.classIds || [],
    permissions: account.permissions || []
  };
}

function publicClass(classRecord) {
  return {
    id: classRecord.id,
    name: classRecord.name,
    course: classRecord.course,
    topic: classRecord.topic,
    status: classRecord.status
  };
}

function throwAuth(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

module.exports = {
  COOKIE_NAME,
  listAccounts,
  createSession,
  getSessionFromRequest,
  destroySessionFromRequest,
  publicSession,
  sessionCookie,
  expiredSessionCookie
};
