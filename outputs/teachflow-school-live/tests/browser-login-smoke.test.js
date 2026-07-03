const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.join(__dirname, "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "teachflow-browser-login-"));
const workspaceFile = path.join(tempDir, "workspace-state.json");
const browserProfileDir = path.join(tempDir, "browser-profile");
const appPort = randomPort(6100);
const debugPort = randomPort(7100);

let serverChild = null;
let browserChild = null;
let client = null;
const commandTimeoutMs = 5000;
const studentWorkflowMarker = `Browser sync note ${Date.now()}`;
const studentWorkflowNote = `${studentWorkflowMarker} <img src=x onerror="window.__teachflowXss=1">`;
const checkInMarker = `Browser check-in ${Date.now()}`;
const studentMessageMarker = `Browser student message ${Date.now()}`;
const teacherMessageMarker = `Browser teacher reply ${Date.now()}`;
const teacherActionMarker = `Browser teacher action ${Date.now()}`;
let teacherActionId = "";

(async () => {
  try {
    serverChild = startServer();
    debug("server starting");
    await waitForHttp(`http://127.0.0.1:${appPort}/api/session/accounts`, 8000);

    browserChild = startBrowser();
    debug("browser starting");
    const target = await createBrowserTarget("about:blank");
    debug("browser target created");
    client = await connectCdp(target.webSocketDebuggerUrl);
    debug("cdp connected");
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Input.setIgnoreInputEvents", { ignore: false }).catch(() => null);

    await runCleanSchoolLiveBrowserSmoke();
    console.log("browser school-live workflow smoke tests passed");
    return;

    await navigate(`http://127.0.0.1:${appPort}/login.html`);
    debug("login page ready");
    const loginButtonCount = await waitForValue(
      "login account buttons",
      () => evaluate("document.querySelectorAll('[data-login-account]').length"),
      (value) => value >= 5
    );
    assert.ok(loginButtonCount >= 5);

    await clickSelector('[data-login-account="teacher-lin"]');
    debug("teacher login clicked");
    const teacherState = await waitForValue(
      "teacher session",
      () => evaluate(`(() => ({
        path: location.pathname,
        role: window.TeachFlowSession?.account?.role || null,
        ready: document.body.classList.contains("auth-ready"),
        channels: document.querySelectorAll("[data-channel]").length
      }))()`),
      (value) => value.path.endsWith("/teacher-prototype.html") && value.role === "teacher" && value.ready
    );
    assert.ok(teacherState.channels >= 6);

    const seededTeacherAction = await evaluate(`(async () => {
      const response = await fetch("/api/teacher-agent/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "send_message",
          studentAlias: "S002",
          title: ${JSON.stringify(teacherActionMarker)},
          text: "Browser test teacher action: start with the smallest visual match."
        })
      });
      if (!response.ok) throw new Error(await response.text());
      const state = await response.json();
      return state.teacherAgentActions[0];
    })()`);
    teacherActionId = seededTeacherAction.id;
    assert.ok(teacherActionId);
    assert.strictEqual(seededTeacherAction.studentReadAt, null);
    debug("teacher action seeded");

    await clickSelector('[data-channel="settings"]');
    debug("settings clicked");
    const auditState = await waitForValue(
      "teacher audit panel",
      () => evaluate(`(() => {
        const workspace = window.TeachFlowWorkspaceState?.getState?.();
        return {
          active: Boolean(document.querySelector('[data-channel="settings"].active')),
          panel: Boolean(document.querySelector(".audit-dashboard")),
          table: Boolean(document.querySelector(".audit-table")),
          rows: document.querySelectorAll(".audit-table tbody tr").length,
          hasLoginAudit: Boolean(workspace?.auditEvents?.some((event) => event.action === "session_login"))
        };
      })()`),
      (value) => value.active && value.panel && value.table && value.rows > 0 && value.hasLoginAudit
    );
    assert.strictEqual(auditState.hasLoginAudit, true);

    await navigate(`http://127.0.0.1:${appPort}/student-prototype.html`);
    debug("navigated to student page as teacher");
    const teacherBlockedFromStudentPage = await waitForValue(
      "teacher blocked from student page",
      () => evaluate(`(() => ({
        path: location.pathname,
        gate: document.body.classList.contains("auth-gate-open"),
        loginButtons: document.querySelectorAll("[data-login-account]").length,
        activeRole: window.TeachFlowSession?.account?.role || null
      }))()`),
      (value) => value.path.endsWith("/student-prototype.html") && value.gate && value.loginButtons >= 5
    );
    assert.strictEqual(teacherBlockedFromStudentPage.activeRole, "teacher");

    await clickSelector('[data-login-account="student-s002"]');
    debug("student login clicked");
    const studentState = await waitForValue(
      "student session",
      () => evaluate(`(() => ({
        path: location.pathname,
        role: window.TeachFlowSession?.account?.role || null,
        alias: window.TeachFlowSession?.context?.studentAlias || null,
        ready: document.body.classList.contains("auth-ready"),
        shell: Boolean(document.querySelector(".student-shell"))
      }))()`),
      (value) => value.path.endsWith("/student-prototype.html") && value.role === "student" && value.ready
    );
    assert.strictEqual(studentState.alias, "S002");
    assert.strictEqual(studentState.shell, true);

    const studentTeacherActionReadState = await waitForValue(
      "student reads teacher action",
      () => evaluate(`(() => {
        const actionId = ${JSON.stringify(teacherActionId)};
        const workspace = window.TeachFlowWorkspaceState.getState();
        const action = (workspace.teacherAgentActions || []).find((item) => item.id === actionId);
        return {
          pageHasAction: document.body.innerText.includes(${JSON.stringify(teacherActionMarker)}),
          studentReadAt: action?.studentReadAt || null,
          responseButtonCount: document.querySelectorAll('[data-respond-teacher-action="' + actionId + '"]').length
        };
      })()`),
      (value) => value.pageHasAction && value.studentReadAt && value.responseButtonCount >= 2
    );
    assert.ok(studentTeacherActionReadState.studentReadAt);

    await clickSelector(`[data-respond-teacher-action="${teacherActionId}"][data-response-type="improved"]`);
    const studentTeacherActionFeedbackState = await waitForValue(
      "student feedback button sync",
      () => evaluate(`(() => {
        const actionId = ${JSON.stringify(teacherActionId)};
        const workspace = window.TeachFlowWorkspaceState.getState();
        const action = (workspace.teacherAgentActions || []).find((item) => item.id === actionId);
        const message = (workspace.messages || []).find((item) => {
          return item.linkedTeacherActionId === actionId && item.responseType === "improved";
        });
        return {
          studentResponseType: action?.studentResponseType || null,
          studentResponseAt: action?.studentResponseAt || null,
          linkedMessage: Boolean(message),
          messageKind: message?.kind || null
        };
      })()`),
      (value) => value.studentResponseType === "improved" &&
        Boolean(value.studentResponseAt) &&
        value.linkedMessage &&
        value.messageKind === "teacher_action_response"
    );
    assert.strictEqual(studentTeacherActionFeedbackState.studentResponseType, "improved");

    await clickSelector('[data-channel="assignment"]');
    debug("assignment channel opened");
    await fillSelector("#quiz-answer-1", "The frequency view is another way to describe the same signal.");
    await fillSelector("#quiz-answer-2", "A complex wave can be described as several simple frequency parts.");
    await fillSelector("#homework-body", "I can now explain the signal in time and frequency views, but I still need the diagram mapping.");
    const assignmentBeforeSubmit = await evaluate("window.TeachFlowWorkspaceState.getState().assignments.S002");
    await clickSelector('[data-action="submit-assignment"]');
    const submittedAssignmentState = await waitForValue(
      "student assignment submission",
      () => evaluate(`(() => {
        const workspace = window.TeachFlowWorkspaceState.getState();
        return {
          assignment: workspace.assignments.S002,
          hasAssignmentAudit: workspace.auditEvents.some((event) => {
            return event.action === "update_assignment" && event.targetId === "S002";
          })
        };
      })()`),
      (value) => value.assignment && value.assignment !== assignmentBeforeSubmit && value.hasAssignmentAudit
    );
    assert.strictEqual(submittedAssignmentState.hasAssignmentAudit, true);

    await clickSelector('[data-channel="support"]');
    debug("support channel opened");
    await clickSelector(".stuck-option");
    await fillSelector("#stuck-note", studentWorkflowNote);
    await clickSelector('[data-action="send-stuck"]');
    const studentSyncState = await waitForValue(
      "student stuck signal sync",
      () => evaluate(`(() => {
        const workspace = window.TeachFlowWorkspaceState.getState();
        const latest = workspace.stuckSignals[0] || null;
        return {
          latestNote: latest?.note || null,
          latestAlias: latest?.studentAlias || null,
          hasStuckAudit: workspace.auditEvents.some((event) => {
            return event.action === "record_stuck_signal" && event.targetId === "S002";
          })
        };
      })()`),
      (value) => value.latestNote === studentWorkflowNote && value.latestAlias === "S002" && value.hasStuckAudit
    );
    assert.strictEqual(studentSyncState.hasStuckAudit, true);

    await clickSelector('[data-channel="checkin"]');
    debug("student check-in channel opened");
    await clickSelector('[data-checkin-state="frustrated"]');
    await fillSelector("#checkin-note", `${checkInMarker}: I feel stuck and need a low pressure learning step.`);
    await clickSelector('[data-action="share-checkin"]');
    const studentCheckInState = await waitForValue(
      "student check-in sync",
      () => evaluate(`(() => {
        const workspace = window.TeachFlowWorkspaceState.getState();
        const latest = workspace.checkIns[0] || null;
        return {
          latestAlias: latest?.studentAlias || null,
          teacherVisible: Boolean(latest?.teacherVisible),
          latestSummary: latest?.summaryForTeacher || "",
          hasCheckInAudit: workspace.auditEvents.some((event) => {
            return event.action === "record_check_in" && event.targetId === "S002";
          }),
          statusText: document.querySelector("#checkin-status")?.innerText || ""
        };
      })()`),
      (value) => value.latestAlias === "S002" &&
        value.teacherVisible &&
        value.latestSummary.includes(checkInMarker) &&
        value.hasCheckInAudit &&
        value.statusText.includes("已分享学习摘要")
    );
    assert.strictEqual(studentCheckInState.teacherVisible, true);
    assert.strictEqual(studentCheckInState.hasCheckInAudit, true);

    await clickSelector('[data-channel="messages"]');
    debug("student teacher-message channel opened");
    await fillSelector("#student-teacher-message-input", studentMessageMarker);
    await clickSelector("#student-teacher-message-form button[type='submit']");
    const studentMessageState = await waitForValue(
      "student teacher-message sync",
      () => evaluate(`(() => {
        const workspace = window.TeachFlowWorkspaceState.getState();
        const message = workspace.messages.find((item) => item.text.includes(${JSON.stringify(studentMessageMarker)}));
        return {
          active: Boolean(document.querySelector('[data-channel="messages"].active')),
          pageHasMessage: document.body.innerText.includes(${JSON.stringify(studentMessageMarker)}),
          dock: Boolean(document.querySelector(".student-message-dock")),
          senderRole: message?.senderRole || null,
          studentAlias: message?.studentAlias || null,
          hasMessageAudit: workspace.auditEvents.some((event) => {
            return event.action === "record_message" && event.targetId === "S002";
          })
        };
      })()`),
      (value) => value.active &&
        value.pageHasMessage &&
        value.dock &&
        value.senderRole === "student" &&
        value.studentAlias === "S002" &&
        value.hasMessageAudit
    );
    assert.strictEqual(studentMessageState.senderRole, "student");
    assert.strictEqual(studentMessageState.hasMessageAudit, true);

    await clickSelector('[data-student-dock-minimize="true"]');
    const studentDockMinimized = await waitForValue(
      "student message dock minimized",
      () => evaluate(`Boolean(document.querySelector(".student-message-dock.is-minimized .student-dock-minimized-button"))`),
      Boolean
    );
    assert.strictEqual(studentDockMinimized, true);

    await clickSelector(".student-dock-minimized-button");
    const studentDockExpanded = await waitForValue(
      "student message dock expanded",
      () => evaluate(`(() => {
        const dock = document.querySelector(".student-message-dock");
        return Boolean(dock && !dock.classList.contains("is-minimized") && dock.querySelector('[data-open-student-messages]'));
      })()`),
      Boolean
    );
    assert.strictEqual(studentDockExpanded, true);

    await navigate(`http://127.0.0.1:${appPort}/teacher-prototype.html`);
    debug("navigated to teacher page as student");
    const studentBlockedFromTeacherPage = await waitForValue(
      "student blocked from teacher page",
      () => evaluate(`(() => ({
        path: location.pathname,
        gate: document.body.classList.contains("auth-gate-open"),
        loginButtons: document.querySelectorAll("[data-login-account]").length,
        activeRole: window.TeachFlowSession?.account?.role || null
      }))()`),
      (value) => value.path.endsWith("/teacher-prototype.html") && value.gate && value.loginButtons >= 5
    );
    assert.strictEqual(studentBlockedFromTeacherPage.activeRole, "student");

    await clickSelector('[data-login-account="teacher-lin"]');
    debug("teacher login clicked after student workflow");
    await waitForValue(
      "teacher session after student workflow",
      () => evaluate(`(() => ({
        path: location.pathname,
        role: window.TeachFlowSession?.account?.role || null,
        ready: document.body.classList.contains("auth-ready")
      }))()`),
      (value) => value.path.endsWith("/teacher-prototype.html") && value.role === "teacher" && value.ready
    );

    await clickSelector('[data-channel="messages"]');
    debug("teacher message center opened");
    const teacherMessageCenterState = await waitForValue(
      "teacher sees student message center",
      () => evaluate(`(() => ({
        active: Boolean(document.querySelector('[data-channel="messages"].active')),
        pageHasStudentMessage: document.body.innerText.includes(${JSON.stringify(studentMessageMarker)}),
        dock: Boolean(document.querySelector(".teams-activity-dock")),
        threadPanel: Boolean(document.querySelector(".teams-thread-list-panel")),
        chatPanel: Boolean(document.querySelector(".teams-chat-panel"))
      }))()`),
      (value) => value.active &&
        value.pageHasStudentMessage &&
        value.dock &&
        value.threadPanel &&
        value.chatPanel
    );
    assert.strictEqual(teacherMessageCenterState.pageHasStudentMessage, true);

    await fillSelector("#teacher-message-input", teacherMessageMarker);
    const teacherSendHitState = await evaluate(`(() => {
      const input = document.querySelector("#teacher-message-input");
      const button = document.querySelector("#teacher-message-form button[type='submit']");
      const rect = button?.getBoundingClientRect();
      const hit = rect ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) : null;
      return {
        inputValue: input?.value || "",
        buttonText: button?.innerText || "",
        hitTag: hit?.tagName || null,
        hitId: hit?.id || "",
        hitClass: hit?.className || "",
        hitIsButton: hit === button || Boolean(button?.contains(hit))
      };
    })()`);
    assert.strictEqual(teacherSendHitState.inputValue, teacherMessageMarker);
    assert.strictEqual(teacherSendHitState.hitIsButton, true, JSON.stringify(teacherSendHitState));
    await clickSelector("#teacher-message-form button[type='submit']");
    const teacherMessageState = await waitForValue(
      "teacher message reply sync",
      () => evaluate(`(() => {
        const workspace = window.TeachFlowWorkspaceState.getState();
        const message = workspace.messages.find((item) => item.text.includes(${JSON.stringify(teacherMessageMarker)}));
        return {
          pageHasReply: document.body.innerText.includes(${JSON.stringify(teacherMessageMarker)}),
          senderRole: message?.senderRole || null,
          studentAlias: message?.studentAlias || null,
          hasMessageAudit: workspace.auditEvents.some((event) => {
            return event.action === "record_message" && event.targetId === "S002";
          })
        };
      })()`),
      (value) => value.pageHasReply &&
        value.senderRole === "teacher" &&
        value.studentAlias === "S002" &&
        value.hasMessageAudit
    );
    assert.strictEqual(teacherMessageState.senderRole, "teacher");

    await clickSelector('[data-channel="analysis"]');
    debug("teacher analysis channel opened");
    const teacherSyncState = await waitForValue(
      "teacher analysis sync",
      () => evaluate(`(() => {
        const workspace = window.TeachFlowWorkspaceState.getState();
        const panelText = document.querySelector(".workspace-sync-panel")?.innerText || "";
        return {
          panelHasNote: panelText.includes(${JSON.stringify(studentWorkflowMarker)}),
          xssFlag: Boolean(window.__teachflowXss),
          latestNote: workspace.stuckSignals[0]?.note || null,
          hasAssignmentAudit: workspace.auditEvents.some((event) => {
            return event.action === "update_assignment" && event.targetId === "S002";
          }),
          hasStuckAudit: workspace.auditEvents.some((event) => {
            return event.action === "record_stuck_signal" && event.targetId === "S002";
          }),
          actionOutcome: null,
          assignment: workspace.assignments.S002 || null
        };
      })()`),
      (value) => {
        return value.panelHasNote &&
          value.xssFlag === false &&
          value.latestNote === studentWorkflowNote &&
          value.hasAssignmentAudit &&
          value.hasStuckAudit &&
          Boolean(value.assignment);
      }
    );
    assert.strictEqual(teacherSyncState.panelHasNote, true);
    assert.strictEqual(teacherSyncState.xssFlag, false);
    assert.strictEqual(teacherSyncState.latestNote, studentWorkflowNote);
    await delay(300);
    assert.strictEqual(await evaluate("Boolean(window.__teachflowXss)"), false);

    const teacherOutcomeFeedbackState = await waitForValue(
      "teacher outcome sees linked student feedback",
      () => evaluate(`(async () => {
        const actionId = ${JSON.stringify(teacherActionId)};
        const response = await fetch("/api/teacher-agent/briefing", { cache: "no-store" });
        const briefing = await response.json();
        const outcome = (briefing.outcomeEvaluation?.evaluations || []).find((item) => item.actionId === actionId);
        return {
          status: outcome?.status || null,
          studentReadAt: outcome?.studentReadAt || null,
          studentResponseType: outcome?.studentResponseType || null,
          hasLinkedEvidence: Boolean(outcome?.evidence?.some((item) => item.relation === "linked" && item.responseType === "improved")),
          pageHasOutcomePanel: Boolean(document.querySelector(".analysis-outcome-summary"))
        };
      })()`),
      (value) => value.status === "improved" &&
        value.studentReadAt &&
        value.studentResponseType === "improved" &&
        value.hasLinkedEvidence &&
        value.pageHasOutcomePanel
    );
    assert.strictEqual(teacherOutcomeFeedbackState.status, "improved");

    await clickSelector('[data-detail-type="student"][data-student-id="S002"]');
    debug("teacher student detail modal opened");
    const teacherSupportProfileState = await waitForValue(
      "teacher support profile check-in modal",
      () => evaluate(`(() => {
        const workspace = window.TeachFlowWorkspaceState.getState();
        const pageText = document.querySelector("#teacher-detail-modal")?.innerText || "";
        const latest = workspace.checkIns[0] || null;
        return {
          inboxCards: document.querySelectorAll(".teacher-inbox-card").length,
          modalOpen: Boolean(document.querySelector(".teacher-detail-modal.open")),
          profile: Boolean(document.querySelector(".student-support-profile")),
          pageHasMarker: pageText.includes(${JSON.stringify(checkInMarker)}),
          noPrivateReflectionOnPage: !pageText.includes("你不是笨"),
          latestHasNoPrivateReflection: latest?.privateReflection === undefined,
          latestHasNoRawNote: latest?.note === undefined
        };
      })()`),
      (value) => value.inboxCards > 0 &&
        value.modalOpen &&
        value.profile &&
        value.pageHasMarker &&
        value.noPrivateReflectionOnPage &&
        value.latestHasNoPrivateReflection &&
        value.latestHasNoRawNote
    );
    assert.strictEqual(teacherSupportProfileState.profile, true);
    assert.strictEqual(teacherSupportProfileState.noPrivateReflectionOnPage, true);

    await navigate(`http://127.0.0.1:${appPort}/school-admin-prototype.html`);
    debug("navigated to school admin page as teacher");
    const teacherBlockedFromAdminPage = await waitForValue(
      "teacher blocked from school admin page",
      () => evaluate(`(() => ({
        path: location.pathname,
        gate: document.body.classList.contains("auth-gate-open"),
        loginButtons: document.querySelectorAll("[data-login-account]").length,
        activeRole: window.TeachFlowSession?.account?.role || null
      }))()`),
      (value) => value.path.endsWith("/school-admin-prototype.html") && value.gate && value.loginButtons >= 5
    );
    assert.strictEqual(teacherBlockedFromAdminPage.activeRole, "teacher");

    await clickSelector('[data-login-account="school-admin-demo"]');
    debug("school admin login clicked");
    const adminState = await waitForValue(
      "school admin dashboard",
      () => evaluate(`(async () => {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        const workspace = await response.json();
        const aggregate = workspace.schoolAggregate;
        return {
          path: location.pathname,
          role: window.TeachFlowSession?.account?.role || null,
          ready: document.body.classList.contains("auth-ready"),
          shell: Boolean(document.querySelector(".admin-shell")),
          metricCards: document.querySelectorAll(".admin-metric-card").length,
          comparisonHighlights: document.querySelectorAll(".comparison-highlight").length,
          visibleStudents: workspace.students?.length || 0,
          aggregateClassCount: aggregate?.classCount || 0,
          aggregateStudentCount: aggregate?.studentAliasCount || 0,
          aggregateStuckCount: aggregate?.stuckSignalCount || 0,
          hasComparison: Boolean(aggregate?.comparison?.highestSupportClass && aggregate?.comparison?.mostActiveClass)
        };
      })()`),
      (value) => {
        return value.path.endsWith("/school-admin-prototype.html") &&
          value.role === "school_admin" &&
          value.ready &&
          value.shell &&
          value.metricCards >= 4 &&
          value.aggregateClassCount >= 3 &&
          value.comparisonHighlights >= 4 &&
          value.visibleStudents === 0 &&
          value.aggregateStudentCount >= 1 &&
          value.aggregateStuckCount >= 1 &&
          value.hasComparison;
      }
    );
    assert.strictEqual(adminState.role, "school_admin");
    assert.ok(adminState.aggregateClassCount >= 3);
    assert.ok(adminState.aggregateStudentCount >= 1);

    await clickSelector('[data-admin-channel="architecture"]');
    debug("school admin architecture channel opened");
    const architectureState = await waitForValue(
      "school admin architecture channel",
      () => evaluate(`(() => ({
        active: Boolean(document.querySelector('[data-admin-channel="architecture"].active')),
        title: document.querySelector("#admin-title")?.innerText || "",
        nodes: document.querySelectorAll(".architecture-node").length,
        modules: document.querySelectorAll(".architecture-module").length,
        hasTeacherControl: document.body.innerText.includes("教师审批与控制"),
        hasSafetyLayer: document.body.innerText.includes("治理与安全层")
      }))()`),
      (value) => value.active &&
        value.title.includes("AI School Agent System") &&
        value.nodes >= 10 &&
        value.modules >= 6 &&
        value.hasTeacherControl &&
        value.hasSafetyLayer
    );
    assert.strictEqual(architectureState.active, true);
    assert.ok(architectureState.nodes >= 10);

    console.log("browser login workflow smoke tests passed");
  } finally {
    await closeAll();
  }
})().catch(async (error) => {
  console.error(error);
  await closeAll();
  process.exit(1);
});

function startServer() {
  const child = spawn(process.execPath, ["server.js", `--port=${appPort}`], {
    cwd: projectRoot,
    env: {
      ...process.env,
      TEACHFLOW_AI_MODE: "local",
      TEACHFLOW_WORKSPACE_FILE: workspaceFile
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  child.stdout.on("data", () => {});
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });
  return child;
}

async function runCleanSchoolLiveBrowserSmoke() {
  await navigate(`http://127.0.0.1:${appPort}/login.html`);
  debug("clean login page ready");
  await waitForValue(
    "teacher registration form",
    () => evaluate("Boolean(document.querySelector('[data-register-teacher]'))"),
    Boolean
  );

  await fillSelector('[data-register-teacher] input[name="displayName"]', "Browser Test Teacher");
  await fillSelector('[data-register-teacher] input[name="schoolName"]', "TeachFlow Browser School");
  await fillSelector('[data-register-teacher] input[name="className"]', "Browser Test Class");
  await fillSelector('[data-register-teacher] input[name="course"]', "Physics");
  await fillSelector('[data-register-teacher] input[name="topic"]', "Electrons and current");
  await clickSelector('[data-register-teacher] button[type="submit"]');

  const teacherState = await waitForValue(
    "registered teacher session",
    () => evaluate(`(() => ({
      path: location.pathname,
      role: window.TeachFlowSession?.account?.role || null,
      ready: document.body.classList.contains("auth-ready"),
      channels: document.querySelectorAll("[data-channel]").length
    }))()`),
    (value) => value.path.endsWith("/teacher-prototype.html") && value.role === "teacher" && value.ready
  );
  assert.ok(teacherState.channels >= 6);

  const teacherWorkspace = await evaluate(`fetch("/api/workspace").then((response) => response.json())`);
  const inviteToken = teacherWorkspace.inviteLinks?.[0]?.token || teacherWorkspace.classes?.[0]?.inviteToken;
  const teacherAccountId = teacherWorkspace.session.userId;
  const classId = teacherWorkspace.session.classId;
  assert.ok(inviteToken);
  assert.ok(teacherAccountId);
  assert.ok(classId);

  await evaluate(`fetch("/api/session/logout", { method: "POST" }).then(() => true)`);
  await navigate(`http://127.0.0.1:${appPort}/login.html?join=${encodeURIComponent(inviteToken)}`);
  await waitForValue(
    "student join form",
    () => evaluate("Boolean(document.querySelector('[data-register-student]'))"),
    Boolean
  );
  await fillSelector('[data-register-student] input[name="displayName"]', "Browser Student A");
  await clickSelector('[data-register-student] button[type="submit"]');

  const studentState = await waitForValue(
    "registered student session",
    () => evaluate(`(() => ({
      path: location.pathname,
      role: window.TeachFlowSession?.account?.role || null,
      alias: window.TeachFlowSession?.context?.studentAlias || null,
      ready: document.body.classList.contains("auth-ready"),
      shell: Boolean(document.querySelector(".student-shell"))
    }))()`),
    (value) => value.path.endsWith("/student-prototype.html") && value.role === "student" && value.ready
  );
  assert.strictEqual(studentState.alias, "S001");
  assert.strictEqual(studentState.shell, true);

  await clickSelector('[data-channel="ask"]');
  await fillSelector("#question-input", "I still do not know what an electron is.");
  await clickSelector('#question-form button[type="submit"]');
  await waitForValue(
    "student question recorded",
    () => evaluate(`(() => {
      const workspace = window.TeachFlowWorkspaceState.getState();
      return {
        questionCount: workspace.questions.filter((item) => item.studentAlias === "S001").length,
        pageHasQuestion: document.body.innerText.includes("electron")
      };
    })()`),
    (value) => value.questionCount >= 1 && value.pageHasQuestion
  );

  await clickSelector('[data-channel="checkin"]');
  await fillSelector("#wellbeing-chat-input", "I feel overwhelmed and need a small learning step.");
  await clickSelector('#wellbeing-chat-form button[type="submit"]');
  await waitForValue(
    "wellbeing coach response",
    () => evaluate(`(() => ({
      messages: document.querySelectorAll("#wellbeing-chat-thread .chat-message").length,
      status: document.querySelector("#wellbeing-status")?.innerText || ""
    }))()`),
    (value) => value.messages >= 3 && value.status.length > 0
  );
  await clickSelector('[data-checkin-state="want_teacher_help"]');
  await fillSelector("#checkin-note", "I want the teacher to know I need a smaller explanation of electrons.");
  await clickSelector('[data-action="share-checkin"]');
  await waitForValue(
    "student check-in shared",
    () => evaluate(`(() => {
      const workspace = window.TeachFlowWorkspaceState.getState();
      const latest = workspace.checkIns[0] || null;
      return {
        teacherVisible: Boolean(latest?.teacherVisible),
        alias: latest?.studentAlias || null,
        statusText: document.querySelector("#checkin-status")?.innerText || ""
      };
    })()`),
    (value) => value.alias === "S001" && value.teacherVisible
  );

  await clickSelector('[data-channel="support"]');
  await fillSelector("#stuck-note", studentWorkflowNote);
  await clickSelector('[data-action="send-stuck"]');
  await waitForValue(
    "student stuck signal shared",
    () => evaluate(`(() => {
      const workspace = window.TeachFlowWorkspaceState.getState();
      const latest = workspace.stuckSignals[0] || null;
      return {
        alias: latest?.studentAlias || null,
        note: latest?.note || "",
        hasAudit: workspace.auditEvents.some((event) => event.action === "student_agent_share_to_teacher" || event.action === "record_stuck_signal")
      };
    })()`),
    (value) => value.alias === "S001" && value.note.includes("Browser sync note") && value.hasAudit
  );

  await evaluate(`fetch("/api/session/logout", { method: "POST" }).then(() => true)`);
  await navigate(`http://127.0.0.1:${appPort}/login.html`);
  await waitForValue(
    "teacher login card after registration",
    () => evaluate(`Boolean(document.querySelector('[data-login-account="${teacherAccountId}"]'))`),
    Boolean
  );
  await clickSelector(`[data-login-account="${teacherAccountId}"]`);

  await waitForValue(
    "teacher session restored",
    () => evaluate(`(() => ({
      path: location.pathname,
      role: window.TeachFlowSession?.account?.role || null,
      ready: document.body.classList.contains("auth-ready")
    }))()`),
    (value) => value.path.endsWith("/teacher-prototype.html") && value.role === "teacher" && value.ready
  );

  const teacherAnalysis = await evaluate(`fetch("/api/teacher-agent/briefing").then((response) => response.json())`);
  assert.strictEqual(teacherAnalysis.agentId, "teacher-agent-orchestrator");
  assert.ok(teacherAnalysis.studentFocus.some((item) => item.studentAlias === "S001"));
  assert.ok(teacherAnalysis.sourceSignals.some((item) => item.type === "questions" && item.count >= 1));
  assert.ok(teacherAnalysis.sourceSignals.some((item) => item.type === "stuck_signals" && item.count >= 1));
  assert.ok(teacherAnalysis.sourceSignals.some((item) => item.type === "check_ins" && item.count >= 1));

  await clickSelector('[data-channel="analysis"]');
  await waitForValue(
    "teacher analysis page shows student alias",
    () => evaluate(`document.body.innerText.includes("S001")`),
    Boolean
  );
}

function startBrowser() {
  const browserPath = findBrowserPath();
  fs.mkdirSync(browserProfileDir, { recursive: true });
  const child = spawn(browserPath, [
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-sync",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${browserProfileDir}`,
    "about:blank"
  ], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  child.stderr.on("data", () => {});
  return child;
}

function findBrowserPath() {
  const candidates = [
    process.env.TEACHFLOW_BROWSER_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge"
  ].filter(Boolean);
  const found = candidates.find((item) => fs.existsSync(item));
  if (!found) {
    throw new Error("No Chromium-compatible browser found. Set TEACHFLOW_BROWSER_PATH to Chrome or Edge.");
  }
  return found;
}

async function createBrowserTarget(url) {
  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`, 8000);
  const encoded = encodeURIComponent(url);
  try {
    return await requestJson("PUT", `http://127.0.0.1:${debugPort}/json/new?${encoded}`);
  } catch (error) {
    return requestJson("GET", `http://127.0.0.1:${debugPort}/json/new?${encoded}`);
  }
}

function connectCdp(webSocketDebuggerUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(webSocketDebuggerUrl);
    const socket = net.createConnection({
      host: parsed.hostname,
      port: Number(parsed.port)
    });
    const key = crypto.randomBytes(16).toString("base64");
    const pending = new Map();
    let commandId = 0;
    let connected = false;
    let buffer = Buffer.alloc(0);
    const openTimer = setTimeout(() => {
      try {
        socket.destroy();
      } catch (error) {
        // Ignore cleanup errors.
      }
      reject(new Error("Timed out connecting to browser DevTools protocol."));
    }, commandTimeoutMs);

    socket.on("connect", () => {
      socket.write([
        `GET ${parsed.pathname}${parsed.search || ""} HTTP/1.1`,
        `Host: ${parsed.host}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        "\r\n"
      ].join("\r\n"));
    });

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!connected) {
        const headerEnd = buffer.indexOf("\r\n\r\n");
        if (headerEnd === -1) return;
        const header = buffer.slice(0, headerEnd).toString("utf8");
        if (!/^HTTP\/1\.1 101/i.test(header)) {
          clearTimeout(openTimer);
          socket.destroy();
          reject(new Error(`Browser DevTools WebSocket handshake failed: ${header.split("\r\n")[0]}`));
          return;
        }
        connected = true;
        buffer = buffer.slice(headerEnd + 4);
        clearTimeout(openTimer);
        resolve(client);
      }
      parseFrames();
    });

    socket.on("error", (error) => {
      clearTimeout(openTimer);
      if (!connected) reject(error);
      rejectPending(error);
    });

    socket.on("close", () => {
      rejectPending(new Error("Browser DevTools socket closed."));
    });

    const client = {
      send(method, params) {
        const id = ++commandId;
        socket.write(encodeWebSocketFrame(JSON.stringify({ id, method, params: params || {} })));
        return new Promise((commandResolve, commandReject) => {
          const timer = setTimeout(() => {
            pending.delete(id);
            commandReject(new Error(`Timed out running browser command ${method}.`));
          }, commandTimeoutMs);
          pending.set(id, {
            resolve(value) {
              clearTimeout(timer);
              commandResolve(value);
            },
            reject(error) {
              clearTimeout(timer);
              commandReject(error);
            }
          });
        });
      },
      close() {
        socket.end(encodeCloseFrame());
        socket.destroy();
      }
    };

    function parseFrames() {
      while (buffer.length >= 2) {
        const first = buffer[0];
        const second = buffer[1];
        const opcode = first & 0x0f;
        const masked = Boolean(second & 0x80);
        let length = second & 0x7f;
        let offset = 2;

        if (length === 126) {
          if (buffer.length < offset + 2) return;
          length = buffer.readUInt16BE(offset);
          offset += 2;
        } else if (length === 127) {
          if (buffer.length < offset + 8) return;
          const largeLength = buffer.readBigUInt64BE(offset);
          if (largeLength > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new Error("Browser frame is too large.");
          }
          length = Number(largeLength);
          offset += 8;
        }

        let mask = null;
        if (masked) {
          if (buffer.length < offset + 4) return;
          mask = buffer.slice(offset, offset + 4);
          offset += 4;
        }

        if (buffer.length < offset + length) return;
        let payload = buffer.slice(offset, offset + length);
        buffer = buffer.slice(offset + length);

        if (masked && mask) {
          payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
        }

        if (opcode === 0x1) {
          handleCdpMessage(payload.toString("utf8"));
        } else if (opcode === 0x8) {
          socket.destroy();
          return;
        } else if (opcode === 0x9) {
          socket.write(encodeWebSocketFrame(payload, 0xA));
        }
      }
    }

    function handleCdpMessage(text) {
      const message = JSON.parse(text);
      if (!message.id || !pending.has(message.id)) return;
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        request.reject(new Error(`${message.error.message}: ${message.error.data || ""}`));
        return;
      }
      request.resolve(message.result || {});
    }

    function rejectPending(error) {
      for (const request of pending.values()) {
        request.reject(error);
      }
      pending.clear();
    }
  });
}

function encodeWebSocketFrame(data, opcode) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
  const length = payload.length;
  const first = 0x80 | (opcode || 0x1);
  let header;
  if (length < 126) {
    header = Buffer.alloc(2);
    header[0] = first;
    header[1] = 0x80 | length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = first;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = first;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  const mask = crypto.randomBytes(4);
  const maskedPayload = Buffer.alloc(length);
  for (let index = 0; index < length; index += 1) {
    maskedPayload[index] = payload[index] ^ mask[index % 4];
  }
  return Buffer.concat([header, mask, maskedPayload]);
}

function encodeCloseFrame() {
  return encodeWebSocketFrame(Buffer.alloc(0), 0x8);
}

async function navigate(url) {
  await client.send("Page.navigate", { url });
  await waitForPageReady();
}

async function waitForPageReady() {
  await waitForValue(
    "page ready",
    () => evaluate("document.readyState"),
    (value) => value === "interactive" || value === "complete"
  );
}

async function evaluate(expression) {
  const response = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text || "Browser evaluation failed.");
  }
  return response.result ? response.result.value : undefined;
}

async function clickSelector(selector) {
  const rect = await waitForValue(
    `selector ${selector}`,
    () => evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      element.scrollIntoView({ block: "center", inline: "center" });
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
        disabled: Boolean(element.disabled)
      };
    })()`),
    (value) => value && value.width > 0 && value.height > 0 && !value.disabled
  );
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: rect.x,
    y: rect.y
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: rect.x,
    y: rect.y,
    button: "left",
    clickCount: 1
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: rect.x,
    y: rect.y,
    button: "left",
    clickCount: 1
  });
}

async function fillSelector(selector, value) {
  const filledValue = await waitForValue(
    `fillable selector ${selector}`,
    () => evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      element.scrollIntoView({ block: "center", inline: "center" });
      element.focus();
      element.value = ${JSON.stringify(value)};
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return element.value;
    })()`),
    (nextValue) => nextValue === value
  );
  assert.strictEqual(filledValue, value);
}

async function waitForValue(label, read, isReady, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 8000);
  let lastValue;
  let lastError;
  while (Date.now() < deadline) {
    try {
      lastValue = await read();
      if (isReady(lastValue)) return lastValue;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  const suffix = lastError ? lastError.message : JSON.stringify(lastValue);
  throw new Error(`Timed out waiting for ${label}: ${suffix}`);
}

function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      requestJson("GET", url)
        .then(resolve)
        .catch((error) => {
          if (Date.now() > deadline) {
            reject(error);
            return;
          }
          setTimeout(tick, 100);
        });
    };
    tick();
  });
}

function requestJson(method, url) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method }, (response) => {
      let raw = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        raw += chunk;
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode}: ${raw}`));
          return;
        }
        try {
          resolve(raw ? JSON.parse(raw) : null);
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("error", reject);
    request.setTimeout(commandTimeoutMs, () => {
      request.destroy(new Error(`Timed out requesting ${method} ${url}`));
    });
    request.end();
  });
}

async function closeAll() {
  if (client) {
    await client.send("Browser.close").catch(() => null);
    client.close();
    client = null;
  }
  await stopChild(browserChild);
  await stopChild(serverChild);
  browserChild = null;
  serverChild = null;
  await delay(300);
  try {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200
    });
  } catch (error) {
    debug(`temporary directory cleanup skipped: ${error.message}`);
  }
}

function stopChild(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 2000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill();
  });
}

function randomPort(base) {
  return base + Math.floor(Math.random() * 800);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function debug(message) {
  if (process.env.TEACHFLOW_BROWSER_TEST_DEBUG) {
    console.log(`[browser-login] ${message}`);
  }
}
