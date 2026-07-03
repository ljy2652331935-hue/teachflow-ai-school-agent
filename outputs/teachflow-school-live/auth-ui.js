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

  window.TeachFlowSessionPromise = initAuth();

  async function initAuth() {
    document.body.classList.add("auth-checking");
    const session = await fetchJson("/api/session").catch(() => ({ authenticated: false }));
    window.TeachFlowSession = session.authenticated ? session : null;
    window.dispatchEvent(new CustomEvent("teachflow-session-ready", { detail: window.TeachFlowSession }));

    if (isLoginPage) {
      if (session.authenticated) {
        window.location.replace(ROLE_PAGES[session.account.role] || "teacher-prototype.html");
        return session;
      }
      await renderLoginPage(null);
      return session;
    }

    if (!session.authenticated || isWrongRole(session)) {
      await renderAuthGate(session.authenticated ? session : null);
      return session;
    }

    document.body.classList.remove("auth-checking");
    document.body.classList.add("auth-ready");
    enhanceRolePortal(session);
    return session;
  }

  function isWrongRole(session) {
    if (!expectedRole) return false;
    return session.account.role !== expectedRole;
  }

  async function renderLoginPage(session) {
    const root = document.getElementById("login-root");
    if (!root) return;
    const accountsData = await fetchJson("/api/session/accounts");
    const inviteToken = joinTokenFromUrl();
    const invite = inviteToken
      ? await fetchJson(`/api/session/invite?token=${encodeURIComponent(inviteToken)}`).catch(() => null)
      : null;

    root.innerHTML = loginMarkup(accountsData, {
      title: inviteToken ? "加入课堂" : "创建你的 TeachFlow 课堂",
      subtitle: inviteToken
        ? "填写一个课堂显示名，系统会为你分配匿名学习别名。"
        : "老师先创建课堂，再把课堂链接发给学生加入。",
      session,
      inviteToken,
      invite
    });
    bindLoginActions(root);
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
    bindLoginActions(gate);
    bindLogoutButton(gate);
    document.body.classList.remove("auth-checking");
    document.body.classList.add("auth-gate-open");
  }

  function authGateSubtitle(session) {
    if (!session) return "当前页面需要登录后访问。";
    const current = ROLE_LABELS[session.account.role] || session.account.role;
    const required = ROLE_LABELS[expectedRole] || expectedRole;
    return `当前是 ${current} 身份；这个页面需要 ${required} 身份。`;
  }

  function loginMarkup(accountsData, options) {
    const accounts = accountsData.accounts || [];
    const schoolName = accountsData.school?.name || "TeachFlow School";
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
        ${options.inviteToken ? studentJoinMarkup(options.inviteToken, options.invite) : teacherRegisterMarkup()}
        ${existingAccountsMarkup(accounts)}
        <p class="login-privacy-note">请使用课堂昵称或角色名，不要填写真实学号、邮箱、密钥或其他敏感信息。</p>
      </section>
    `;
  }

  function teacherRegisterMarkup() {
    return `
      <form class="register-card" data-register-teacher>
        <div class="register-card-header">
          <span>老师注册</span>
          <strong>创建一个空课堂</strong>
          <small>创建后会自动生成课堂链接，学生可通过链接加入。</small>
        </div>
        <div class="register-field-grid">
          ${field("displayName", "老师显示名", "例如：林老师", true)}
          ${field("schoolName", "学校/试用空间", "例如：TeachFlow School", false)}
          ${field("className", "课堂名称", "例如：高二物理 A 班", true)}
          ${field("course", "课程", "例如：物理", false)}
          ${field("topic", "当前主题", "例如：傅里叶变换", false)}
        </div>
        <button class="register-submit" type="submit">创建老师账号和课堂</button>
      </form>
    `;
  }

  function studentJoinMarkup(inviteToken, invite) {
    if (!invite) {
      return `
        <section class="register-card">
          <div class="register-card-header">
            <span>课堂链接</span>
            <strong>这个课堂链接不可用</strong>
            <small>请让老师重新复制课堂链接发送给你。</small>
          </div>
        </section>
      `;
    }

    return `
      <form class="register-card" data-register-student>
        <input type="hidden" name="inviteToken" value="${escapeAttr(inviteToken)}">
        <div class="register-card-header">
          <span>学生加入</span>
          <strong>${escapeHtml(invite.className)}</strong>
          <small>${escapeHtml(invite.course || "课程未设置")} · ${escapeHtml(invite.topic || "主题未设置")}</small>
        </div>
        <div class="register-field-grid one-column">
          ${field("displayName", "你的课堂显示名", "例如：学生A 或 小组1成员", true)}
        </div>
        <button class="register-submit" type="submit">加入课堂</button>
      </form>
    `;
  }

  function existingAccountsMarkup(accounts) {
    if (!accounts.length) {
      return `
        <section class="existing-account-section">
          <div class="section-heading-row">
            <span>已有账号</span>
            <small>当前还没有账号。请先由老师创建课堂。</small>
          </div>
        </section>
      `;
    }

    return `
      <section class="existing-account-section">
        <div class="section-heading-row">
          <span>已有账号</span>
          <small>测试时可以从这里快速进入已创建的老师或学生账号。</small>
        </div>
        <div class="login-account-grid">
          ${accounts.map(accountCard).join("")}
        </div>
      </section>
    `;
  }

  function field(name, label, placeholder, required) {
    return `
      <label class="register-field">
        <span>${escapeHtml(label)}</span>
        <input name="${escapeAttr(name)}" type="text" placeholder="${escapeAttr(placeholder)}" ${required ? "required" : ""}>
      </label>
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
        <em>${escapeHtml(firstClass.topic || "课堂空间")}</em>
      </button>
    `;
  }

  function bindLoginActions(root) {
    bindLoginButtons(root);
    bindRegisterTeacher(root);
    bindRegisterStudent(root);
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

  function bindRegisterTeacher(root) {
    const form = root.querySelector("[data-register-teacher]");
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await submitRegistration(form, "/api/session/register-teacher");
    });
  }

  function bindRegisterStudent(root) {
    const form = root.querySelector("[data-register-student]");
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await submitRegistration(form, "/api/session/register-student");
    });
  }

  async function submitRegistration(form, url) {
    const button = form.querySelector("button[type='submit']");
    const originalText = button?.textContent || "";
    if (button) {
      button.disabled = true;
      button.textContent = "正在创建...";
    }

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const session = await fetchJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      window.location.replace(ROLE_PAGES[session.account.role] || "teacher-prototype.html");
    } catch (error) {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
      form.insertAdjacentHTML("beforeend", `<p class="register-error">${escapeHtml(error.message || "创建失败，请稍后重试。")}</p>`);
    }
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

  function joinTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("join") || params.get("token") || "";
  }

  function fetchJson(url, options) {
    return fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...(options || {})
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      return payload;
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
