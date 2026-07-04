(function () {const ROLE_PAGES = {teacher: "teacher-prototype.html",
 student: "student-prototype.html",
 school_admin: "school-admin-prototype.html"};

 const ROLE_LABELS = {teacher: "teacher",
 student: "pupil",
 school_admin: "school admin"};

 const isLoginPage = /login\.html$/.test(window.location.pathname);
 const expectedRole = document.body.dataset.expectedRole || "";
 let copyPolishQueued = false;

 installCopyPolisher();

 window.TeachFlowSessionPromise = initAuth();

 async function initAuth() {document.body.classList.add("auth-checking");
 const session = await fetchJson("/api/session").catch(() => ({authenticated: false}));
 window.TeachFlowSession = session.authenticated? session: null;
 window.dispatchEvent(new CustomEvent("teachflow-session-ready", {detail: window.TeachFlowSession}));

 if (isLoginPage) {if (session.authenticated) {window.location.replace(ROLE_PAGES[session.account.role] || "teacher-prototype.html");
 return session;}
 await renderLoginPage(null);
 return session;}

 if (!session.authenticated || isWrongRole(session)) {await renderAuthGate(session.authenticated? session: null);
 return session;}

 document.body.classList.remove("auth-checking");
 document.body.classList.add("auth-ready");
 enhanceRolePortal(session);
 return session;}

 function isWrongRole(session) {if (!expectedRole) return false;
 return session.account.role!== expectedRole;}

 async function renderLoginPage(session) {const root = document.getElementById("login-root");
 if (!root) return;
 const accountsData = await fetchJson("/api/session/accounts");
 const inviteToken = joinTokenFromUrl();
 const invite = inviteToken? await fetchJson(`/api/session/invite?token=${encodeURIComponent(inviteToken)}`).catch(() => null): null;

 root.innerHTML = loginMarkup(accountsData, {title: inviteToken? "Join class": "Create your TeachFlow class",
 subtitle: inviteToken? "entry a displayName for this class. You will receive an anonymised learning alias.": "teachers create a class first, then share the invite link with pupils.",
 session,
 inviteToken,
 invite});
 bindLoginActions(root);
 document.body.classList.remove("auth-checking");}

 async function renderAuthGate(session) {const accountsData = await fetchJson("/api/session/accounts");
 const gate = document.createElement("div");
 gate.className = "auth-gate";
 gate.innerHTML = `
 <div class="auth-gate-card">
 ${loginMarkup(accountsData, {title: session? "Switch identity": "Please sign in first",
 subtitle: authGateSubtitle(session),
 session})}
 </div>
 `;
 document.body.appendChild(gate);
 bindLoginActions(gate);
 bindLogoutButton(gate);
 document.body.classList.remove("auth-checking");
 document.body.classList.add("auth-gate-open");}

 function authGateSubtitle(session) {if (!session) return "This page requires sign-in.";
 const current = ROLE_LABELS[session.account.role] || session.account.role;
 const required = ROLE_LABELS[expectedRole] || expectedRole;
 return `You are signed in as ${current}; this page requires the ${required} role.`;}

 function loginMarkup(accountsData, options) {const accounts = accountsData.accounts || [];
 const schoolName = accountsData.school?.name || "TeachFlow school";
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
 ${options.session? currentSessionMarkup(options.session): ""}
 ${options.inviteToken? studentJoinMarkup(options.inviteToken, options.invite): teacherRegisterMarkup()}
 ${existingAccountsMarkup(accounts)}
 <p class="login-privacy-note">Use a class nickname or role label only. Do not enter real pupil IDs, email, passwords or other sensitive data.</p>
 </section>
 `;}

 function teacherRegisterMarkup() {return `
 <form class="register-card" data-register-teacher>
 <div class="register-card-header">
 <span>teacher registration</span>
 <strong>Create an empty class</strong>
 <small>An invite link is generated automatically for pupils to join.</small>
 </div>
 <div class="register-field-grid">
 ${field("displayName", "teacher displayName", "e.g. Ms Chen", true)}
 ${field("schoolName", "school / pilot space", "e.g. TeachFlow school", false)}
 ${field("className", "className", "e.g. Year 12 Physics A", true)}
 ${field("course", "Course", "e.g. Physics", false)}
 ${field("topic", "current topic", "e.g. Wave mechanics", false)}
 </div>
 <button class="register-submit" type="submit">Create teacherAccount and class</button>
 </form>
 `;}

 function studentJoinMarkup(inviteToken, invite) {if (!invite) {return `
 <section class="register-card">
 <div class="register-card-header">
 <span>class invite link</span>
 <strong>This invite link is not valid</strong>
 <small>Ask your teacher to send a fresh invite link.</small>
 </div>
 </section>
 `;}

 return `
 <form class="register-card" data-register-student>
 <input type="hidden" name="inviteToken" value="${escapeAttr(inviteToken)}">
 <div class="register-card-header">
 <span>pupil join</span>
 <strong>${escapeHtml(invite.className)}</strong>
 <small>${escapeHtml(invite.course || "Course not set")} · ${escapeHtml(invite.topic || "Topic not set")}</small>
 </div>
 <div class="register-field-grid one-column">
 ${field("displayName", "Your displayName", "e.g. pupil A or Group 1", true)}
 </div>
 <button class="register-submit" type="submit">Join class</button>
 </form>
 `;}

 function existingAccountsMarkup(accounts) {if (!accounts.length) {return `
 <section class="existing-account-section">
 <div class="section-heading-row">
 <span>Existing accounts</span>
 <small>No accounts yet. A teacher must create a class first.</small>
 </div>
 </section>
 `;}

 return `
 <section class="existing-account-section">
 <div class="section-heading-row">
 <span>Existing accounts</span>
 <small>Quick access to teacher, pupil or school admin accounts.</small>
 </div>
 <div class="login-account-grid">
 ${accounts.map(accountCard).join("")}
 </div>
 </section>
 `;}

 function field(name, label, placeholder, required) {return `
 <label class="register-field">
 <span>${escapeHtml(label)}</span>
 <input name="${escapeAttr(name)}" type="text" placeholder="${escapeAttr(placeholder)}" ${required? "required": ""}>
 </label>
 `;}

 function currentSessionMarkup(session) {return `
 <div class="current-session-box">
 <span>current Session</span>
 <strong>${escapeHtml(session.account.displayName)} · ${escapeHtml(ROLE_LABELS[session.account.role] || session.account.role)}</strong>
 <small>${escapeHtml(session.class.name)}</small>
 <button class="session-link-button" type="button" data-auth-logout>Sign out</button>
 </div>
 `;}

 function accountCard(account) {const firstclass = account.classes?.[0] || {id: account.classIds?.[0] || "", name: "No class selected", topic: ""};
 const role = ROLE_LABELS[account.role] || account.role;
 const note = account.role === "student"? `Alias ${account.studentAlias}`: firstclass.name;
 return `
 <button class="login-account-card" type="button" data-login-account="${escapeAttr(account.id)}" data-login-class="${escapeAttr(firstclass.id)}">
 <span>${escapeHtml(role)}</span>
 <strong>${escapeHtml(account.displayName)}</strong>
 <small>${escapeHtml(note)}</small>
 <em>${escapeHtml(firstclass.topic || "class space")}</em>
 </button>
 `;}

 function bindLoginActions(root) {bindLoginButtons(root);
 bindRegisterteacher(root);
 bindRegisterStudent(root);}

 function bindLoginButtons(root) {root.querySelectorAll("[data-login-account]").forEach((button) => {button.addEventListener("click", async () => {button.disabled = true;
 const session = await fetchJson("/api/session/login", {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify({accountId: button.dataset.loginAccount,
 classId: button.dataset.loginclass})});
 window.location.replace(ROLE_PAGES[session.account.role] || "teacher-prototype.html");});});}

 function bindRegisterteacher(root) {const form = root.querySelector("[data-register-teacher]");
 if (!form) return;
 form.addEventListener("submit", async (event) => {event.preventDefault();
 await submitRegistration(form, "/api/session/register-teacher");});}

 function bindRegisterStudent(root) {const form = root.querySelector("[data-register-student]");
 if (!form) return;
 form.addEventListener("submit", async (event) => {event.preventDefault();
 await submitRegistration(form, "/api/session/register-student");});}

 async function submitRegistration(form, url) {const button = form.querySelector("button[type='submit']");
 const originalText = button?.textContent || "";
 if (button) {button.disabled = true;
 button.textContent = "Creating...";}

 try {const payload = Object.fromEntries(new FormData(form).entries());
 const session = await fetchJson(url, {method: "POST",
 headers: {"Content-Type": "application/json"},
 body: JSON.stringify(payload)});
 window.location.replace(ROLE_PAGES[session.account.role] || "teacher-prototype.html");} catch (error) {if (button) {button.disabled = false;
 button.textContent = originalText;}
 form.insertAdjacentHTML("beforeend", `<p class="register-error">${escapeHtml(error.message || "Could not create account. Try again.")}</p>`);}}

 function bindLogoutButton(root) {root.querySelectorAll("[data-auth-logout]").forEach((button) => {button.addEventListener("click", async () => {await fetchJson("/api/session/logout", {method: "POST"}).catch(() => null);
 window.location.replace("login.html");});});}

 function enhanceRolePortal(session) {const meta = document.querySelector(".role-portal-meta");
 if (!meta) return;
 meta.innerHTML = `
 <span>${escapeHtml(session.account.displayName)}</span>
 <span>${escapeHtml(ROLE_LABELS[session.account.role] || session.account.role)}</span>
 <span>${escapeHtml(session.class.name)}</span>
 <button class="role-session-button" type="button" data-auth-switch>Switch account</button>
 `;
 meta.querySelector("[data-auth-switch]").addEventListener("click", async () => {await fetchJson("/api/session/logout", {method: "POST"}).catch(() => null);
 window.location.replace("login.html");});
 scheduleCopyPolish();}

 function installCopyPolisher() {window.TeachFlowCopyPolish = {clean: polishCopy,
 cleanElement: polishElement,
 schedule: scheduleCopyPolish};
 if (!document.body) {document.addEventListener("DOMContentLoaded", () => installCopyPolisher(), {once: true});
 return;}
 scheduleCopyPolish();
 const observer = new MutationObserver((mutations) => {if (mutations.some((mutation) => mutation.type === "childList" || mutation.type === "characterData")) scheduleCopyPolish();});
 observer.observe(document.body, {childList: true,
 subtree: true,
 characterData: true});}

 function scheduleCopyPolish() {if (copyPolishQueued || !document.body) return;
 copyPolishQueued = true;
 requestAnimationFrame(() => {copyPolishQueued = false;
 polishElement(document.body);});}

 function polishElement(root) {if (!root) return;
 polishTextNodes(root);
 root.querySelectorAll("[placeholder], [title], [aria-label], input, textarea, button").forEach((node) => {["placeholder", "title", "aria-label"].forEach((attr) => {if (!node.hasAttribute?.(attr)) return;
 const next = polishCopy(node.getAttribute(attr));
 if (next !== node.getAttribute(attr)) node.setAttribute(attr, next);});
 if ((node.tagName === "TEXTAREA" || node.tagName === "INPUT") && node !== document.activeElement && isBadCopy(node.value)) {node.value = polishCopy(node.value);}});}

 function polishTextNodes(root) {const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode(node) {const parent = node.parentElement;
 if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
 if (!/[\u4e00-\u9fff]/.test(node.nodeValue || "") && !isBadCopy(node.nodeValue)) return NodeFilter.FILTER_REJECT;
 return NodeFilter.FILTER_ACCEPT;}});
 const nodes = [];
 while (walker.nextNode()) nodes.push(walker.currentNode);
 nodes.forEach((node) => {const next = polishCopy(node.nodeValue);
 if (next !== node.nodeValue) node.nodeValue = next;});}

 function isBadCopy(value) {return /([\u4e00-\u9fff]|AI school System|\u8def|\u9239|\uFFFD|[a-z](learning|teacher|pupil|already|publish|submit|support|message|draft|question|visual|material|stuck|follow|action|view|sync|confirm|generate|practice|assignment|private|current|first|next)|learning[a-z]|teacher[a-z]*learning|already[A-Z]|publish[A-Z]|submit[A-Z]|draft[A-Z]|displayName|className|teacherAccount)/.test(String(value || ""));}

 function polishCopy(value) {let text = String(value || "");
 const replacements = [["\u8def", "-"],
 ["\u9239?", "\""],
 ["\uFFFD", ""],
 ["AI school System", "AI School System"],
 ["\u5148\u62c6\u6210\u4e00\u4e2a\u5c0f\u95ee\u9898", "Break it into one small question"],
 ["\u5148\u5199\u4e00\u53e5\u6700\u4e0d\u786e\u5b9a\u7684\u5730\u65b9\uff0c\u518d\u8ba9\u5b66\u4e60\u4f19\u4f34\u5e2e\u4f60\u62c6\u5c0f\u3002", "Write the sentence you are least sure about, then ask the learning partner to make it smaller."],
 ["\u8865\u5b8c\u4f5c\u4e1a\u8349\u7a3f", "Finish the assignment draft"],
 ["\u5148\u5199\u4e09\u53e5\u8bdd\uff0c\u4e0d\u8ffd\u6c42\u4e00\u6b21\u5199\u5b8c\u6574\uff1a\u6211\u77e5\u9053\u4ec0\u4e48\u3001\u6211\u4e0d\u786e\u5b9a\u4ec0\u4e48\u3001\u6211\u9700\u8981\u54ea\u4e2a\u4f8b\u5b50\u3002", "Write three sentences first: what I know, what I am unsure about, and which example I need."],
 ["\u9700\u8981\u65f6\u5206\u4eab\u5361\u70b9", "Share the stuck point if needed"],
 ["\u53ea\u6709\u4f60\u786e\u8ba4\u5206\u4eab\u540e\uff0c\u8001\u5e08\u624d\u4f1a\u770b\u5230\u6574\u7406\u540e\u7684\u5361\u70b9\u6458\u8981\u3002", "Only after you confirm sharing will the teacher see a short stuck-point summary."],
 ["\u6b63\u5728\u5efa\u7acb\u7406\u89e3", "Building understanding"],
 ["\u590d\u76d8 ", "Review "],
 [" \u7684\u652f\u6301\u6548\u679c", " support effect"],
 ["\u5728\u8001\u5e08\u52a8\u4f5c\u540e\u4ecd\u6709\u540e\u7eed\u5361\u70b9\u6216\u6c42\u52a9\u4fe1\u53f7\u3002", "still has a follow-up stuck point or help signal after the teacher action."],
 ["\u5b66\u751f\u63d0\u95ee", "student question"],
 ["\u770b\u56de\u6d41", "View outcomes"],
 ["\u4f18\u5148\u8ddf\u8fdb ", "Priority follow-up "],
 ["\u5f53\u524d\u805a\u5408\u5206\u6570\u6700\u9ad8\uff0c\u4e3b\u8981\u5361\u70b9\u662f", "has the highest priority score. Main stuck point:"],
 ["\u770b\u5b66\u751f", "View pupil"],
 ["\u590d\u6838\u300c", "Review \""],
 ["\u300d\u8bc1\u636e", "\" evidence"],
 ["\u4e2a\u522b\u540d\u4e0e\u8be5\u5361\u70b9\u76f8\u5173\uff0c\u5df2\u6709", "alias is related to this stuck point, with"],
 ["\u6761\u8bc1\u636e\u3002", "evidence items."],
 ["\u770b\u8bc1\u636e", "View evidence"],
 ["\u5236\u4f5c ", "Create "],
 ["\u5206\u949f\u8865\u6551\u6750\u6599", "minute support material"],
 ["\u6750\u6599\u8349\u7a3f\u6765\u81ea\u6700\u9ad8\u9891\u5361\u70b9", "Material draft is based on the highest-frequency stuck point"],
 ["\u5236\u4f5c\u6750\u6599", "Create material"],
 ["\u5b66\u751f\u753b\u50cf", "pupil profiles"],
 ["\u4f5c\u4e1a\u63d0\u4ea4", "assignment submissions"],
 ["\u5361\u70b9\u4fe1\u53f7", "stuck signals"],
 ["\u8001\u5e08\u53ef\u89c1 Check-in", "teacher-visible check-ins"],
 ["\u5e08\u751f\u6d88\u606f", "teacher-pupil messages"],
 ["\u8001\u5e08\u52a8\u4f5c", "teacher actions"],
 ["\u6210\u6548\u56de\u6d41", "outcome feedback"],
 ["\u5df2\u8ffd\u8e2a", "Tracking"],
 ["\u4e2a\u8001\u5e08\u52a8\u4f5c", "teacher actions"],
 ["\u4e2a\u51fa\u73b0\u6539\u5584\u4fe1\u53f7", "improved"],
 ["\u4e2a\u4ecd\u9700\u8ddf\u8fdb", "need follow-up"],
 ["\u4e2a\u7b49\u5f85\u5b66\u751f\u540e\u7eed\u4fe1\u53f7", "waiting for later pupil signals"],
 ["\u7b49\u5f85\u5b66\u751f\u6253\u5f00\u6750\u6599\u3001\u63d0\u4ea4\u4f5c\u4e1a\u6216\u53d1\u9001\u65b0\u7684\u95ee\u9898\u540e\u518d\u8bc4\u4f30\u3002", "Wait for the pupil to open the material, submit work, or send a new question before evaluating."],
 ["\u4ecd\u9700\u8ddf\u8fdb", "Needs follow-up"],
 ["\u7b49\u5f85\u540e\u7eed\u4fe1\u53f7", "Awaiting signal"],
 ["\u5b66\u751f\u56de\u590d", "Pupil reply"],
 ["\u5b66\u4e60\u4fe1\u53f7", "Learning signal"],
 ["entry a displayName", "Enter a display name"],
 ["displayName", "display name"],
 ["className", "class name"],
 ["teacherAccount", "teacher account"],
 ["After teacher actionofpupil learningsignal", "Pupil signals after teacher action"],
 ["After teacher actionofpupilsignal", "Pupil signals after teacher action"],
 ["After teacher action of pupil signal", "Pupil signals after teacher action"],
 ["Suggested, learningpublish", "Suggested actions to review"],
 ["outcomelearningDetails", "Outcome details"],
 ["outcomelearning", "Outcome"],
 ["actionlearning", "Actions"],
 ["learning API already", "API connected"],
 ["learningcoordinatorPreview", "Coordinator preview"],
 ["learningsupportpupil", "Pupils needing support"],
 ["Quoteevidence", "Quote evidence"],
 ["viewnotes", "View notes"],
 ["defaultlearning", "collapsed"],
 ["viewlearning", "View"],
 ["learningview", "View"],
 ["learningFollow-up", "Learning follow-up"],
 ["Continuelearning", "Continue learning"],
 ["waitingsignal", "Awaiting signal"],
 ["waitingaction", "Awaiting action"],
 ["actionalready", "actions tracked"],
 ["none yetoutcomeLog", "No outcome log yet"],
 ["teacher actionsand pupilsignal", "Teacher actions and pupil signals"],
 ["teacher actionofpupil signal", "teacher action and pupil signal"],
 ["nowlearningAfter teacher actionofpupil learningsignal, learningSystemonlydisplaywaiting, learningwill learnInterventionis learning.", "After a teacher action, the system waits for later pupil signals before judging impact."],
 ["teacher approvalmessage, materialor learningFollow-uplearning, Systemwillturnlearning ofpupilquestion, Stuck signal, submitand Check-in andactiontimelearning for learning.", "Teacher-approved messages, materials or follow-ups are compared with later pupil questions, stuck signals, submissions and check-ins."],
 ["teacher approvalmessage, materialor learningFollow-uplearning, learning inwill learnpupil question, Stuck signal, submitand Check-in.", "Teacher-approved messages, materials or follow-ups will be checked against later pupil questions, stuck signals, submissions and check-ins."],
 ["waitingpupilsubmit, question, replyorthen learningsendStuck signal.", "Waiting for the pupil to submit work, ask a question, reply, or send a stuck signal."],
 ["pupilalready: ", "Pupil responded: "],
 ["pupilalready, waiting", "Pupil has read it; awaiting response"],
 ["pupil learning", "Pupil learning"],
 ["learningsignal", "Learning signal"],
 ["learningsupport", "Learning support"],
 ["learningstuck", "Still stuck"],
 ["alreadySync", "Synced"],
 [" \u5728 teacher action s\u540e\u4ecd\u51fa\u73b0\u300c student question \u300d\uff0c\u9700\u8981\u518d\u6b21\u8ddf\u8fdb\u3002", " still showed a later student question after the teacher action and needs follow-up."],
 ["\u5efa\u8bae\u8001\u5e08\u6253\u5f00\u5b66\u751f\u8be6\u60c5\uff0c\u590d\u6838\u539f\u53e5\u540e\u5b89\u6392\u4e00\u6b21\u77ed\u8ddf\u8fdb\u3002", "Open the pupil detail view, review the original quote, and schedule a short follow-up."],
 ["\u4f60\u73b0\u5728\u6b63\u5728\u5b66\u4e60\u300c", "You are currently learning "],
 ["\u300d\u3002\u6211\u770b\u5230\u4f60\u7684\u4e3b\u8981\u5361\u70b9\u662f\u300c", ". Main stuck point: "],
 ["\u300d\uff0c\u4f5c\u4e1a\u72b6\u6001\u662f\u300c", ". Assignment status: "],
 ["\u300d\u3002\u4e0b\u4e00\u6b65\u5148\u505a\u4e00\u4e2a\u5c0f\u52a8\u4f5c\uff1a", ". Next step: "],
 ["\u7b49\u5f85\u8001\u5e08\u53cd\u9988\u5e76\u8ffd\u95ee", "Use teacher feedback"],
 ["\u5982\u679c\u8001\u5e08\u56de\u590d\u4e86\uff0c\u5148\u6309\u8001\u5e08\u7ed9\u7684\u4e00\u4e2a\u5c0f\u6b65\u9aa4\u505a\uff0c\u4e0d\u8981\u540c\u65f6\u5904\u7406\u592a\u591a\u95ee\u9898\u3002", "If your teacher has replied, follow one small step first before asking a new question."],
 ["\u5df2\u6709\u63d0\u4ea4\uff0c\u9002\u5408\u7b49\u5f85\u8001\u5e08\u53cd\u9988\u5e76\u7ee7\u7eed\u8ffd\u95ee", "Assignment submitted; ready for teacher feedback and follow-up questions."],
 ["teacheractionstuck point", "Still stuck after teacher action"],
 ["teacher action stuck point", "Still stuck after teacher action"],
 ["student learningsyncstuck point:", "Student shared stuck point:"],
 ["learningneedssupport:", "Needs learning support:"],
 ["learning formula, learningsymbolis learning.", "I am unsure what the formula symbols mean."],
 ["learningsymbolis learning", "formula symbol is unclear"],
 ["learning good", "I understand this part."],
 ["Learning support, learningnowlearning.", "Learning support helped; this is making more sense now."],
 ["learningnowlearning", "is making more sense now"],
 ["teacheraction\u201clearning material: learningexercise\u201d:", "After teacher action \"learning material: exercise\":"],
 ["teacher action\u201c", "After teacher action \""],
 ["learning material: learningexercise", "learning material: exercise"],
 ["learning material: learning diagramdraft", "Learning material: diagram draft"],
 ["learning diagramdraft", "diagram draft"],
 ["diagramdraft", "diagram draft"],
 ["wave frequency image smoke 2 diagram draft", "wave frequency diagram draft 2"],
 ["wave frequency image smoke diagram draft", "wave frequency diagram draft"],
 ["wave frequency image smoke diagramdraft", "wave frequency diagram draft"],
 [" image smoke ", " image "],
 ["learning isstuck, needsthen learning.", "still stuck and needs the next small step."],
 ["learning is learning", "I am still unsure"],
 ["teacher action s", "teacher actions"],
 ["supportmessage", "Support message"],
 ["Approvelearningsendsupportmessage", "Approve and send support message"],
 ["Approvesend", "Approve send"],
 ["assigntopupil", "Assign to pupil"],
 ["learningalready", "Mark handled"],
 ["actionSuggested", "Suggested action"],
 ["none yetneeds teacher approvalofaction", "No teacher-approved action yet"],
 ["Continuewaitingpupilassignments, questionorShareStuck signallearning, teacher Agent will learngeneratelearningSuggested.", "Continue waiting for pupil assignments, questions or shared stuck signals. The teacher Agent will suggest actions when there is enough evidence."],
 ["learningLog.teacher approvalactionlearningwill learnnowlearning in.", "Teacher-approved actions will appear here."],
 ["alreadyLogteacher actions", "Logged teacher action"],
 ["pupilFollow-upDetails", "Pupil follow-up details"],
 ["of learning support profile", "learning support profile"],
 ["learningsummary, learning isclinicalDiagnosis", "learning summary, not a clinical diagnosis"],
 ["current Session", "Current session"],
 ["teacher registration", "Teacher registration"],
 ["Awaiting teacherpublish", "Awaiting teacher publishing"],
 ["teacherpublish", "teacher publishing"],
 ["learningpublishmaterial", "No published material"],
 ["teacher approvalmaterialwill learnnowlearning in.learningcanfirstinAsk AIasklearning Agent.", "Teacher-approved materials will appear here. You can ask the Agent while you wait."],
 ["learningSuggested", "Suggested"],
 ["first learning ofquestionlearning", "Start with one question"],
 ["canaskspecificquestions, conceptorNext steplearning.", "Ask a specific question about a concept or next step."],
 ["learningstucklearning", "Stuck signal"],
 ["needsteachersupportlearning, canturnlearningsummarysendtoteacher.", "If you need teacher support, share a short summary with your teacher."],
 ["learningsubmitlearningquiz.", "Submit the mini quiz."],
 ["learningcannotlearning", "cannot understand"],
 ["alreadySynctoteacher", "Synced to teacher"],
 ["After teacher actionlearningStuck signal", "Still stuck after teacher action"],
 ["learningFollow-up", "Learning follow-up"],
 ["learningsupport", "Learning support"],
 ["learningmessage", "Learning message"],
 ["outcomelearning", "Outcome"],
 ["waitingsignal", "Waiting for signal"],
 ["learningview", "View"],
 ["viewlearning", "View"],
 ["generatelearningPreview", "Generate preview"],
 ["selectedlearning", "Selected"],
 ["latestdraft", "Latest draft"],
 ["waitinglearning", "Waiting"],
 ["Pendinglearning", "Pending"],
 ["alreadydraft", "Draft ready"],
 ["already generated", "Generated"],
 ["already generatedvisual", "Generated visual"],
 ["alreadyApprove", "Approved"],
 ["draftsalreadyApprove", "drafts approved"],
 ["draftsPendinglearning", "drafts pending"],
 ["alreadypublish", "Published"],
 ["publishlearning", "Publishing"],
 ["learningprivate", "Private"],
 ["Sharelearningsummarytoteacher", "Share summary with teacher"],
 ["sendtoteacher", "Send to teacher"],
 ["toteacher", "to teacher"],
 ["teacher learning", "Teacher help"],
 ["teacherreply", "Teacher reply"],
 ["waitingreply", "Waiting for reply"],
 ["SystemReminder", "System reminder"],
 ["currentAlias", "Current alias"],
 ["messageLog", "Message log"],
 ["learningSync", "Synced"],
 ["todaytask", "Today's tasks"],
 ["teacherHandout", "Teacher handout"],
 ["questionquestion", "Ask a question"],
 ["timelearning", "Timeline"],
 ["learningLog", "Learning log"],
 ["teacher approvallearningpublish", "Teacher approval required"],
 ["teacher approvallearning of action", "Teacher-approved action"],
 ["learners", "learners"]];
 replacements.forEach(([from, to]) => {text = text.split(from).join(to);});
 if (isBadCopy(text)) text = splitJoinedCopy(text);
 return finalCopyTidy(text);}

 function splitJoinedCopy(value) {let text = String(value || "").replace(/([a-z])([A-Z])/g, "$1 $2");
 const tokens = ["understanding", "assignment", "assignments", "published", "publishing", "approval", "approve", "generated", "generate", "teacher", "student", "pupil", "learning", "support", "message", "messages", "material", "materials", "practice", "question", "questions", "private", "current", "visual", "stuck", "signal", "signals", "draft", "submit", "publish", "follow", "action", "status", "reply", "review", "preview", "confirm", "first", "next", "view", "sync"];
 tokens.sort((a, b) => b.length - a.length).forEach((token) => {const reBefore = new RegExp(`([^\\s\\-_/])(${token})`, "gi");
 const reAfter = new RegExp(`(${token})([^\\s\\-_/.,:;!?\\)\\]\\}])`, "gi");
 text = text.replace(reBefore, "$1 $2").replace(reAfter, "$1 $2");});
 return text;}

 function finalCopyTidy(value) {return String(value || "")
 .replace(/\s+/g, " ")
 .replace(/\s+([.,:;!?])/g, "$1")
 .replace(/\bAI school\b/g, "AI School")
 .replace(/\bpupil s\b/g, "pupils")
 .replace(/\bmaterial s\b/g, "materials")
 .replace(/\bmessage s\b/g, "messages")
 .replace(/\bquestion s\b/g, "questions")
 .replace(/\bdraft s\b/g, "drafts")
 .replace(/\bteacher approval\b/g, "teacher approval")
 .trim();}

 function joinTokenFromUrl() {const params = new URLSearchParams(window.location.search);
 return params.get("join") || params.get("token") || "";}

 function fetchJson(url, options) {return fetch(url, {credentials: "same-origin",
 cache: "no-store",...(options || {})}).then(async (response) => {const payload = await response.json().catch(() => ({}));
 if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
 return payload;});}

 function escapeHtml(value) {return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");}

 function escapeAttr(value) {return escapeHtml(value);}})();
