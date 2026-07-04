(function () {
  const ROLE_PAGES = {
    teacher: "teacher-prototype.html",
    student: "student-prototype.html",
    school_admin: "school-admin-prototype.html"
  };

  const ROLE_LABELS = {
    teacher: "老师",
    student: "学生",
    school_admin: "学校管理"
  };

  const isLoginPage = /login\.html$/.test(window.location.pathname);
  const expectedRole = document.body.dataset.expectedRole || "";

  initAuth();

  async function initAuth() {
    document.body.classList.add("auth-checking");
    const session = await fetchJson("/api/session").catch(() => ({ authenticated: false }));
    window.TeachFlowSession = session.authenticated ? session : null;

    if (isLoginPage) {
      if (session.authenticated) {
        window.location.replace(ROLE_PAGES[session.account.role] || "teacher-prototype.html");
        return;
      }
      renderLoginPage(null);
      return;
    }

    if (!session.authenticated || isWrongRole(session)) {
      renderAuthGate(session.authenticated ? session : null);
      return;
    }

    document.body.classList.remove("auth-checking");
    document.body.classList.add("auth-ready");
    enhanceRolePortal(session);
  }

  function isWrongRole(session) {
    if (!expectedRole) return false;
    return session.account.role !== expectedRole;
  }

  async function renderLoginPage(session) {
    const root = document.getElementById("login-root");
    if (!root) return;
    const accountsData = await fetchJson("/api/session/accounts");
    root.innerHTML = loginMarkup(accountsData, {
      title: "选择一个试用身份",
      subtitle: "TeachFlow 会用本地 Session 记住当前账号、角色和班级。",
      session
    });
    bindLoginButtons(root);
    document.body.classList.remove("auth-checking");
  }

  async function renderAuthGate(session) {
    const accountsData = await fetchJson("/api/session/accounts");
    const gate = document.createElement("div");
    gate.className = "auth-gate";
    gate.innerHTML = `
      <div class="auth-gate-card">
        ${loginMarkup(accountsData, {
          title: session ? "需要切换身份" : "请先登录",
          subtitle: authGateSubtitle(session),
          session
        })}
      </div>
    `;
    document.body.appendChild(gate);
    bindLoginButtons(gate);
    bindLogoutButton(gate);
    document.body.classList.remove("auth-checking");
    document.body.classList.add("auth-gate-open");
  }

  function authGateSubtitle(session) {
    if (!session) return "当前页面需要登录后的本地试用 Session。";
    const current = ROLE_LABELS[session.account.role] || session.account.role;
    const required = ROLE_LABELS[expectedRole] || expectedRole;
    return `当前是${current}身份；这个页面需要${required}身份。`;
  }

  function loginMarkup(accountsData, options) {
    const accounts = accountsData.accounts || [];
    const schoolName = accountsData.school?.name || "TeachFlow 试用学校";
    return `
      <section class="login-panel">
        <div class="login-brand-row">
          <div class="role-portal-mark">TF</div>
          <div>
            <p>TeachFlow</p>
            <h1>${escapeHtml(options.title)}</h1>
            <span>${escapeHtml(schoolName)}</span>
          </div>
        </div>
        <p class="login-subtitle">${escapeHtml(options.subtitle)}</p>
        ${options.session ? currentSessionMarkup(options.session) : ""}
        <div class="login-account-grid">
          ${accounts.map(accountCard).join("")}
        </div>
        <p class="login-privacy-note">只使用匿名学生 alias 和本地 demo 账号；不要输入真实姓名、邮箱、学号或密钥。</p>
      </section>
    `;
  }

  function currentSessionMarkup(session) {
    return `
      <div class="current-session-box">
        <span>当前 Session</span>
        <strong>${escapeHtml(session.account.displayName)} · ${escapeHtml(ROLE_LABELS[session.account.role] || session.account.role)}</strong>
        <small>${escapeHtml(session.class.name)}</small>
        <button class="session-link-button" type="button" data-auth-logout>退出当前身份</button>
      </div>
    `;
  }

  function accountCard(account) {
    const firstClass = account.classes?.[0] || { id: account.classIds?.[0] || "", name: "未选择班级", topic: "" };
    const role = ROLE_LABELS[account.role] || account.role;
    const note = account.role === "student" ? `Alias ${account.studentAlias}` : firstClass.name;
    return `
      <button class="login-account-card" type="button" data-login-account="${escapeAttr(account.id)}" data-login-class="${escapeAttr(firstClass.id)}">
        <span>${escapeHtml(role)}</span>
        <strong>${escapeHtml(account.displayName)}</strong>
        <small>${escapeHtml(note)}</small>
        <em>${escapeHtml(firstClass.topic || "TeachFlow 试用空间")}</em>
      </button>
    `;
  }

  function bindLoginButtons(root) {
    root.querySelectorAll("[data-login-account]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        const session = await fetchJson("/api/session/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: button.dataset.loginAccount,
            classId: button.dataset.loginClass
          })
        });
        window.location.replace(ROLE_PAGES[session.account.role] || "teacher-prototype.html");
      });
    });
  }

  function bindLogoutButton(root) {
    root.querySelectorAll("[data-auth-logout]").forEach((button) => {
      button.addEventListener("click", async () => {
        await fetchJson("/api/session/logout", { method: "POST" }).catch(() => null);
        window.location.replace("login.html");
      });
    });
  }

  function enhanceRolePortal(session) {
    const meta = document.querySelector(".role-portal-meta");
    if (!meta) return;
    meta.innerHTML = `
      <span>${escapeHtml(session.account.displayName)}</span>
      <span>${escapeHtml(ROLE_LABELS[session.account.role] || session.account.role)}</span>
      <span>${escapeHtml(session.class.name)}</span>
      <button class="role-session-button" type="button" data-auth-switch>切换身份</button>
    `;
    meta.querySelector("[data-auth-switch]").addEventListener("click", async () => {
      await fetchJson("/api/session/logout", { method: "POST" }).catch(() => null);
      window.location.replace("login.html");
    });
  }

  function fetchJson(url, options) {
    return fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...(options || {})
    }).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
