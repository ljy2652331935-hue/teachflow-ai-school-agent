const fs = require("fs");
const path = require("path");

const workspaceState = require("../workspace-state.js");

const root = path.join(__dirname, "..");
const stateFile = process.env.TEACHFLOW_WORKSPACE_FILE || path.join(root, "data", "workspace-state.json");
const raw = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : workspaceState.createDefaultState();
const state = workspaceState.normalizeState(raw);

const now = Date.now();
const iso = (minutesAgo) => new Date(now - minutesAgo * 60 * 1000).toISOString();
const assetDataUrl = (filename) => {
  const svg = fs.readFileSync(path.join(root, "assets", filename), "utf8");
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
const activeClassId = state.activeclassId || state.activeClassId || "class-demo-physics-a";
const teacherAccount = (state.accounts || []).find((account) => account.role === "teacher") || {
  id: "teacher-demo",
  role: "teacher",
  displayName: "Ms Carter",
  classIds: [activeClassId],
  permissions: ["read_class", "read_students", "approve_materials", "export_materials", "send_feedback"]
};
const studentAccount = (state.accounts || []).find((account) => account.role === "student") || {
  id: "student-s001-demo",
  role: "student",
  displayName: "Demo pupil S001",
  classIds: [activeClassId],
  studentAlias: "S001",
  permissions: ["read_self", "submit_assignment", "ask_agent", "send_stuck_signal", "send_check_in"]
};
const existingActiveClass = (state.classes || []).find((item) => item.id === activeClassId) || {};
const inviteToken = existingActiveClass.inviteToken || `join-demo-${Math.random().toString(16).slice(2, 12)}`;

const classes = [
  {
    id: activeClassId,
    name: "Year 12 Physics A",
    course: "Physics",
    topic: "Waves, frequency and signal diagrams",
    teacherIds: [teacherAccount.id],
    studentAliases: ["S001", "S002", "S003", "S004", "S005", "S006"],
    status: "active",
    inviteToken,
    createdAt: existingActiveClass.createdAt || iso(1440)
  },
  {
    id: "class-demo-forces-b",
    name: "Year 11 Physics B",
    course: "Physics",
    topic: "Forces and free-body diagrams",
    teacherIds: [teacherAccount.id],
    studentAliases: ["S101", "S102", "S103", "S104"],
    status: "active",
    inviteToken: "join-demo-forces-b",
    createdAt: iso(1320)
  },
  {
    id: "class-demo-fields-ap",
    name: "AP Physics",
    course: "Physics",
    topic: "Electric fields and field lines",
    teacherIds: [teacherAccount.id],
    studentAliases: ["S201", "S202", "S203", "S204"],
    status: "active",
    inviteToken: "join-demo-fields-ap",
    createdAt: iso(1260)
  }
];

const accounts = [
  {
    ...teacherAccount,
    displayName: teacherAccount.displayName && teacherAccount.displayName !== "teacher" ? teacherAccount.displayName : "Ms Carter",
    classIds: [activeClassId],
    permissions: ["read_class", "read_students", "approve_materials", "export_materials", "send_feedback"]
  },
  {
    ...studentAccount,
    displayName: studentAccount.displayName && studentAccount.displayName !== "pat" ? studentAccount.displayName : "Demo pupil S001",
    classIds: [activeClassId],
    studentAlias: "S001",
    permissions: ["read_self", "submit_assignment", "ask_agent", "send_stuck_signal", "send_check_in"]
  },
  {
    id: "school-admin-demo",
    role: "school_admin",
    displayName: "Lead coordinator",
    classIds: classes.map((item) => item.id),
    permissions: ["read_aggregate", "read_audit_log"]
  }
];

const students = [
  pupil("S001", "001", "Needs support", "Level 2", "formula symbols", "Translate f, T and lambda into one plain sentence", "I still do not know what f means in the wave equation.", "Read the teacher material and replied that the first support message helped."),
  pupil("S002", "002", "Developing", "Level 2", "diagram mapping", "Match one peak in the waveform to one frequency bar", "I can see the two diagrams but cannot tell what matches what.", "Submitted the first draft; still asks diagram questions."),
  pupil("S003", "003", "Needs support", "Level 1", "frequency-domain meaning", "Use the handout before attempting the formula", "I do not understand why the same signal can be shown two ways.", "Has not submitted the assignment yet; shared a stuck signal."),
  pupil("S004", "004", "On track", "Level 3", "transfer task", "Try one new real-world signal example", "I understand the music example but not the seismic signal yet.", "Submitted the mini quiz and is ready for extension practice."),
  pupil("S005", "005", "Needs support", "Level 1", "graph axes", "Label each axis before reading the graph", "I keep mixing up time, frequency and amplitude.", "Opened the visual material twice and asked for a smaller example."),
  pupil("S006", "006", "Developing", "Level 2", "units and scale", "Write the unit next to each symbol", "I understand the shape but I lose track of the units.", "Draft saved; needs one feedback question."),
  pupil("S101", "101", "Developing", "Level 2", "normal force direction", "Draw the contact surface first", "Must the normal force always point upward?", "Year 11 class signal for school admin comparison."),
  pupil("S102", "102", "Needs support", "Level 1", "force pair identification", "Circle the object of study first", "I do not know which forces act on the box.", "Needs teacher follow-up after free-body diagram task."),
  pupil("S103", "103", "On track", "Level 3", "resultant force", "Explain net force in one sentence", "I can add arrows but want to check the final direction.", "Submitted the practice set."),
  pupil("S104", "104", "Developing", "Level 2", "friction direction", "Compare motion and tendency to move", "I cannot decide which way friction points.", "Draft saved."),
  pupil("S201", "201", "Ready to apply", "Level 3", "field line density", "Explain density as field strength", "I can see stronger fields where lines are closer.", "AP Physics extension pupil."),
  pupil("S202", "202", "Developing", "Level 2", "field direction", "Use a positive test charge first", "Why do field arrows point away from positive charges?", "Asked one question."),
  pupil("S203", "203", "Needs support", "Level 1", "equipotential meaning", "Separate field lines from equipotential lines", "I think equipotential lines and field lines are the same.", "Needs a visual explanation."),
  pupil("S204", "204", "On track", "Level 3", "application transfer", "Try a capacitor field example", "I understand point charges and want a harder example.", "Submitted extension task.")
];

const assignments = Object.fromEntries(students.map((student) => [
  student.id,
  ["S001", "S002", "S004", "S006", "S103", "S201", "S204"].includes(student.id) ? "submitted" : "draft not submitted"
]));

const questions = [
  question("S001", "What does f mean in the wave equation?", 18),
  question("S002", "How do I match the left waveform with the frequency bars?", 34),
  question("S003", "Why can the same signal be shown in two different ways?", 47),
  question("S005", "Which axis is frequency and which axis is amplitude?", 63),
  question("S006", "Where do the units go when I calculate frequency?", 76),
  question("S102", "Which forces act on the box when it is on a slope?", 91),
  question("S203", "Are equipotential lines the same as field lines?", 118)
];

const stuckSignals = [
  stuck("S001", "formula symbols", "I can copy the equation, but I do not know what each symbol means.", 14),
  stuck("S003", "frequency-domain meaning", "I do not understand why one wave can become several frequencies.", 42),
  stuck("S005", "graph axes", "The graph labels are the part I keep mixing up.", 58),
  stuck("S102", "force pair identification", "I draw arrows but I am not sure which object they belong to.", 88),
  stuck("S203", "equipotential meaning", "I need a picture that separates field lines from equipotential lines.", 109)
];

const checkIns = [
  checkIn("S001", "partly_understand", "Partly understand", "I understand the picture more than the formula.", true, 1, 22),
  checkIn("S003", "stuck", "Stuck", "I need a smaller first example before the assignment.", true, 2, 45),
  checkIn("S005", "frustrated", "Frustrated", "I feel behind because the graphs move too fast.", true, 2, 61),
  checkIn("S006", "partly_understand", "Partly understand", "I can do the first step but need feedback on units.", false, 0, 70),
  checkIn("S102", "stuck", "Stuck", "I need help deciding the object of study.", true, 1, 92),
  checkIn("S203", "partly_understand", "Partly understand", "The field picture is clearer, but I mix up the line types.", true, 1, 112)
];

const teacherActions = [
  teacherAction("teacher-action-demo-s001-message", "send_message", "S001", "Support message for S001", "Start by writing what f, T and lambda mean in words. Do not calculate yet.", 25, {
    studentReadAt: iso(20),
    studentResponseAt: iso(12),
    studentResponseType: "still_stuck"
  }),
  teacherAction("teacher-action-demo-s003-material", "assign_material", "S003", "Assigned material: frequency-domain mini explainer", "Read the first two boxes and answer one question: what changes when we move from time to frequency?", 52, {
    material: {
      id: "material-demo-frequency-mini",
      title: "Frequency-domain mini explainer",
      type: "handout",
      topic: "Waves, frequency and signal diagrams",
      targetLevel: "Level 1",
      goal: "Help pupils see time and frequency as two views of the same signal."
    },
    studentReadAt: iso(38)
  }),
  teacherAction("teacher-action-demo-s005-followup", "schedule_followup", "S005", "Learning follow-up: S005", "Ask S005 to label the graph axes before attempting the next question.", 68, {
    dueLabel: "Before next lesson",
    studentVisible: false
  })
];

const messages = [
  message("S001", "teacher", "Ms Carter", "Start by writing what f, T and lambda mean in words. Do not calculate yet.", "teacher_agent_action", 25, "teacher-action-demo-s001-message"),
  message("S001", "student", "S001", "I understand T, but I am still stuck on f and lambda.", "teacher_action_response", 12, "teacher-action-demo-s001-message", "still_stuck"),
  message("S003", "teacher", "Ms Carter", "I assigned a short explainer. Read only the first two boxes first.", "teacher_agent_action", 51, "teacher-action-demo-s003-material"),
  message("S005", "student", "S005", "Can I get one example where the axes are already labelled?", "help_request", 57)
];

const approvedmaterials = [
  {
    id: "approved-demo-wave-map-image",
    kind: "image",
    type: "visual",
    title: "Time view vs frequency view",
    topic: "Waves, frequency and signal diagrams",
    targetLevel: "Level 1 / Level 2",
    goal: "Use the image to see that time view and frequency view describe the same signal.",
    studentTask: "Point to the time view, point to the frequency view, then write one comparison sentence.",
    imageUrl: assetDataUrl("wave-time-frequency-map.svg"),
    keyPoints: ["Same signal, two views", "Time view shows change over time", "Frequency view shows repeating parts"],
    status: "published",
    classId: activeClassId,
    targetAliases: ["S001", "S002", "S003", "S005", "S006"],
    publishedToAliases: ["S001", "S002", "S003", "S005", "S006"],
    approvedAt: iso(11),
    publishedAt: iso(10),
    createdAt: iso(15)
  },
  {
    id: "approved-demo-formula-symbols-image",
    kind: "image",
    type: "visual",
    title: "Wave formula symbol map",
    topic: "Waves, frequency and signal diagrams",
    targetLevel: "Level 2",
    goal: "Translate each symbol in the wave equation into plain language before calculating.",
    studentTask: "Choose one symbol from the image and write what it means in this situation.",
    imageUrl: assetDataUrl("wave-formula-symbols.svg"),
    keyPoints: ["v means wave speed", "f means frequency", "lambda means wavelength"],
    status: "published",
    classId: activeClassId,
    targetAliases: ["S001", "S006"],
    publishedToAliases: ["S001", "S006"],
    approvedAt: iso(12),
    publishedAt: iso(11),
    createdAt: iso(16)
  },
  {
    id: "approved-demo-axes-check-image",
    kind: "image",
    type: "visual",
    title: "Graph axes check",
    topic: "Waves, frequency and signal diagrams",
    targetLevel: "Level 1",
    goal: "Help pupils decide whether they are reading a time graph or a frequency graph.",
    studentTask: "Before solving, label the x-axis and y-axis in words.",
    imageUrl: assetDataUrl("wave-axes-check.svg"),
    keyPoints: ["Read the axis labels first", "Time axis means moment-by-moment change", "Frequency axis means repeating parts"],
    status: "published",
    classId: activeClassId,
    targetAliases: ["S002", "S003", "S005"],
    publishedToAliases: ["S002", "S003", "S005"],
    approvedAt: iso(13),
    publishedAt: iso(12),
    createdAt: iso(17)
  },
  {
    id: "approved-demo-frequency-handout",
    kind: "handout",
    type: "handout",
    title: "Two views of one wave",
    topic: "Waves, frequency and signal diagrams",
    targetLevel: "Level 1 / Level 2",
    goal: "Help pupils connect a waveform to its frequency components before using equations.",
    studentTask: "Read the two boxes, then write one sentence comparing time view and frequency view.",
    sections: [
      { heading: "Time view", body: "A time graph shows how the signal changes moment by moment." },
      { heading: "Frequency view", body: "A frequency graph shows which repeating parts make up the signal." }
    ],
    keyPoints: ["Same signal, two useful views", "Name the graph before calculating", "Explain the diagram in words first"],
    status: "published",
    classId: activeClassId,
    targetAliases: ["S001", "S002", "S003", "S005", "S006"],
    publishedToAliases: ["S001", "S002", "S003", "S005", "S006"],
    approvedAt: iso(40),
    publishedAt: iso(39),
    createdAt: iso(44)
  },
  {
    id: "approved-demo-symbol-practice",
    kind: "exercise",
    type: "practice",
    title: "Formula symbols quick check",
    topic: "Waves, frequency and signal diagrams",
    targetLevel: "Level 2",
    goal: "Check whether pupils can translate formula symbols into plain language.",
    studentTask: "Answer the three symbol questions without calculating.",
    exercises: [
      { prompt: "In the wave equation, what does f represent?", answer: "Frequency: how often the wave repeats each second." },
      { prompt: "What does lambda represent?", answer: "Wavelength: the distance between matching points on the wave." },
      { prompt: "Why should we name the symbols before calculating?", answer: "It prevents using the formula without understanding the situation." }
    ],
    status: "published",
    classId: activeClassId,
    targetAliases: ["S001", "S006"],
    publishedToAliases: ["S001", "S006"],
    approvedAt: iso(28),
    publishedAt: iso(27),
    createdAt: iso(31)
  }
];

const draftmaterials = [
  {
    id: "draft-demo-graph-axis-visual",
    kind: "image",
    type: "visual",
    title: "Graph axes visual support",
    topic: "Waves, frequency and signal diagrams",
    targetLevel: "Level 1",
    goal: "Create a simple labelled visual for pupils mixing up time, frequency and amplitude.",
    prompt: "A clean classroom diagram showing a time-domain waveform beside a frequency-domain bar chart, with axes labelled clearly.",
    notes: "Teacher should check axis labels before publishing.",
    status: "draft",
    classId: activeClassId,
    targetAliases: ["S005"],
    createdAt: iso(16)
  }
];

const auditEvents = [
  audit("demo_seeded", "system", "system", activeClassId, "workspace", "demo-content", 1),
  audit("student_question", "student-s001-demo", "student", activeClassId, "student", "S001", 18),
  audit("teacher_action", teacherAccount.id, "teacher", activeClassId, "student", "S001", 25),
  audit("check_in_shared", "student-s001-demo", "student", activeClassId, "student", "S001", 22),
  audit("pilot_class_synced", "school-admin-demo", "school_admin", "class-demo-forces-b", "class", "class-demo-forces-b", 70),
  audit("pilot_class_synced", "school-admin-demo", "school_admin", "class-demo-fields-ap", "class", "class-demo-fields-ap", 74)
];

const next = workspaceState.normalizeState({
  ...state,
  version: 1,
  school: { id: "school-live", name: "QE Learning pilot school" },
  activeClassId,
  activeclassId: activeClassId,
  accounts,
  rolePolicies: {
    teacher: {
      label: "teacher",
      canReadclass: true,
      canReadAllStudents: true,
      canWriteOwnStudentSignals: false,
      canApprove: true,
      visibleData: "Alias-only pupils in this class, learning evidence, AI suggestions and approval logs"
    },
    student: {
      label: "pupil",
      canReadclass: false,
      canReadAllStudents: false,
      canWriteOwnStudentSignals: true,
      canApprove: false,
      visibleData: "Own materials, assignment status, question log and stuck-signal log"
    },
    school_admin: {
      label: "school admin",
      canReadclass: true,
      canReadAllStudents: false,
      canWriteOwnStudentSignals: false,
      canApprove: false,
      visibleData: "Class-level aggregate trends and safety audit; no individual pupil detail"
    }
  },
  classes,
  className: classes[0].name,
  topic: classes[0].topic,
  students,
  assignments,
  questions,
  stuckSignals,
  checkIns,
  messages,
  teacherAgentActions: teacherActions,
  approvedmaterials,
  draftmaterials,
  auditEvents,
  schoolMode: "demo_seeded",
  updatedAt: new Date(now).toISOString()
});

fs.writeFileSync(stateFile, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(`Seeded demo content: ${next.classes.length} classes, ${next.students.length} pupil aliases, ${next.questions.length} questions.`);

function pupil(id, short, status, level, stuck, next, evidence, memory) {
  return { id, short, status, level, stuck, next, evidence, memory };
}

function question(studentAlias, text, minutesAgo) {
  return {
    id: `question-demo-${studentAlias.toLowerCase()}-${minutesAgo}`,
    studentAlias,
    text,
    linkedteacherActionId: null,
    responseType: null,
    createdAt: iso(minutesAgo)
  };
}

function stuck(studentAlias, stuckType, note, minutesAgo) {
  return {
    id: `stuck-demo-${studentAlias.toLowerCase()}-${minutesAgo}`,
    studentAlias,
    stuckType,
    note,
    linkedteacherActionId: null,
    responseType: null,
    createdAt: iso(minutesAgo),
    status: "sent_to_teacher"
  };
}

function checkIn(studentAlias, stateId, stateLabel, note, teacherVisible, wellbeingLevel, minutesAgo) {
  return {
    id: `checkin-demo-${studentAlias.toLowerCase()}-${minutesAgo}`,
    studentAlias,
    topic: "Waves, frequency and signal diagrams",
    state: stateId,
    stateLabel,
    note,
    shareChoice: teacherVisible ? "share_summary" : "private",
    privateReflection: "",
    nextLearningStep: "Do one small step before asking a bigger question.",
    teacherHelpdraft: teacherVisible ? `${studentAlias} shared: ${note}` : "",
    learningSupportSignal: teacherVisible ? "teacher_visible_learning_summary" : "normal_learning_check_in",
    wellbeingLevel,
    wellbeingLabel: wellbeingLevel >= 2 ? "needs support" : wellbeingLevel >= 1 ? "monitor" : "steady",
    summaryForteacher: teacherVisible ? `${stateLabel}: ${note}` : "",
    recommendedteacherAction: teacherVisible ? "Review the quote and send one short next step." : "",
    evidenceQuote: note,
    linkedteacherActionId: null,
    responseType: null,
    privacyLevel: teacherVisible ? "teacher_visible_summary" : "private_student_only",
    teacherVisible,
    safeguardingFlag: { required: false, reason: "" },
    createdAt: iso(minutesAgo)
  };
}

function message(studentAlias, senderRole, senderLabel, text, kind, minutesAgo, linkedteacherActionId, responseType) {
  return {
    id: `message-demo-${studentAlias.toLowerCase()}-${minutesAgo}`,
    threadId: `thread-${studentAlias}`,
    studentAlias,
    senderRole,
    senderId: senderRole === "teacher" ? teacherAccount.id : studentAlias,
    senderLabel,
    text,
    kind,
    linkedteacherActionId: linkedteacherActionId || null,
    responseType: responseType || null,
    createdAt: iso(minutesAgo)
  };
}

function teacherAction(id, type, studentAlias, title, detail, minutesAgo, extra) {
  const item = {
    id,
    type,
    status: type === "send_message" ? "sent" : type === "assign_material" ? "assigned" : "scheduled",
    studentAlias,
    classId: activeClassId,
    actorId: teacherAccount.id,
    title,
    detail,
    material: extra && extra.material ? extra.material : null,
    followUp: type === "schedule_followup" ? { dueLabel: extra?.dueLabel || "next lesson", note: detail } : null,
    source: "teacher_agent",
    sourceId: null,
    sourceType: "demo_seed",
    studentVisible: extra?.studentVisible === false ? false : true,
    studentReadAt: extra?.studentReadAt || null,
    studentResponseAt: extra?.studentResponseAt || null,
    studentResponseType: extra?.studentResponseType || null,
    createdAt: iso(minutesAgo)
  };
  return item;
}

function audit(action, actorId, role, classId, targetType, targetId, minutesAgo) {
  return {
    id: `audit-demo-${action}-${minutesAgo}`,
    timestamp: iso(minutesAgo),
    action,
    actorId,
    role,
    classId,
    targetType,
    targetId,
    details: {}
  };
}
