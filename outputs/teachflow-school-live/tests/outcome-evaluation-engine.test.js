const assert = require("assert");
const workspaceState = require("../workspace-state.js");
const outcomeEvaluationEngine = require("../outcome-evaluation-engine.js");

const teacherContext = {
  role: "teacher",
  userId: "teacher-lin",
  classId: "class-physics-a"
};

const now = Date.now();
const minutesAgo = (minutes) => new Date(now - minutes * 60 * 1000).toISOString();
const minutesFromNow = (minutes) => new Date(now + minutes * 60 * 1000).toISOString();

const state = workspaceState.scopedStateForContext({
  ...workspaceState.createDefaultState(),
  activeClassId: "class-physics-a",
  className: "Outcome Test Class",
  topic: "Fourier transform",
  classes: [{
    id: "class-physics-a",
    name: "Outcome Test Class",
    course: "Physics",
    topic: "Fourier transform",
    teacherIds: ["teacher-lin"],
    studentAliases: ["S002", "S014", "S009"],
    status: "active"
  }],
  students: [
    {
      id: "S002",
      status: "部分理解",
      level: "Level 2",
      stuck: "图示没懂",
      next: "Check left and right visual match.",
      evidence: "Student replied with improved signal.",
      memory: ""
    },
    {
      id: "S014",
      status: "需要支持",
      level: "Level 1",
      stuck: "图示没懂",
      next: "Use a smaller diagram.",
      evidence: "Student still cannot read the frequency bars.",
      memory: ""
    },
    {
      id: "S009",
      status: "观察中",
      level: "Level 2",
      stuck: "公式没懂",
      next: "Wait for follow-up signal.",
      evidence: "",
      memory: ""
    }
  ],
  assignments: {
    S002: "草稿未提交",
    S014: "草稿未提交",
    S009: "已提交"
  },
  questions: [],
  stuckSignals: [
    {
      id: "stuck-after-action",
      studentAlias: "S014",
      stuckType: "图示没懂",
      note: "老师发了材料后，我还是看不懂右边频率柱。",
      createdAt: minutesAgo(5)
    },
    {
      id: "stuck-unlinked-after-linked-response",
      studentAlias: "S002",
      stuckType: "later unrelated stuck signal",
      note: "This later unlinked signal should not override the explicit teacher action response.",
      createdAt: minutesAgo(2)
    }
  ],
  checkIns: [],
  messages: [
    {
      id: "message-after-action",
      threadId: "thread-S002",
      studentAlias: "S002",
      senderRole: "student",
      senderId: "S002",
      senderLabel: "S002",
      text: "老师，我看过这个任务。",
      kind: "chat",
      linkedTeacherActionId: "teacher-action-positive",
      responseType: "improved",
      createdAt: minutesAgo(40)
    }
  ],
  teacherAgentActions: [
    {
      id: "teacher-action-positive",
      type: "send_message",
      status: "sent",
      studentAlias: "S002",
      classId: "class-physics-a",
      title: "发送支持消息给 S002",
      detail: "先看左右图示对应。",
      studentVisible: true,
      studentReadAt: minutesAgo(29),
      studentResponseAt: minutesAgo(28),
      studentResponseType: "improved",
      createdAt: minutesAgo(30)
    },
    {
      id: "teacher-action-followup",
      type: "assign_material",
      status: "assigned",
      studentAlias: "S014",
      classId: "class-physics-a",
      title: "布置图示材料给 S014",
      detail: "用一张图连接波形和频率柱。",
      material: {
        id: "material-test",
        title: "图示转换补救材料",
        type: "讲义 + 图示",
        topic: "傅里叶变换",
        targetLevel: "Level 2",
        goal: "连接左右图示。"
      },
      studentVisible: true,
      createdAt: minutesAgo(30)
    },
    {
      id: "teacher-action-waiting",
      type: "schedule_followup",
      status: "scheduled",
      studentAlias: "S009",
      classId: "class-physics-a",
      title: "短跟进 S009",
      detail: "确认公式含义是否稳定。",
      studentVisible: true,
      createdAt: minutesFromNow(1)
    }
  ],
  auditEvents: []
}, teacherContext);

const outcome = outcomeEvaluationEngine.buildOutcomeEvaluation(state, { context: teacherContext });

assert.strictEqual(outcome.engineId, "outcome-evaluation-engine");
assert.strictEqual(outcome.metrics.actionCount, 3);
assert.strictEqual(outcome.metrics.improvedCount, 1);
assert.strictEqual(outcome.metrics.needsFollowupCount, 1);
assert.strictEqual(outcome.metrics.waitingSignalCount, 1);
assert.ok(outcome.summary.includes("已追踪 3 个老师动作"));

const improved = outcome.evaluations.find((item) => item.studentAlias === "S002");
assert.strictEqual(improved.status, "improved");
assert.ok(improved.evidence.some((item) => item.source === "student_message"));
assert.ok(improved.evidence.some((item) => item.relation === "linked"));

const followup = outcome.evaluations.find((item) => item.studentAlias === "S014");
assert.strictEqual(followup.status, "needs_followup");
assert.ok(followup.recommendation.includes("建议"));
assert.ok(outcome.nextTeacherActions.some((item) => item.studentAlias === "S014"));

const waiting = outcome.evaluations.find((item) => item.studentAlias === "S009");
assert.strictEqual(waiting.status, "no_later_signal");

console.log("outcome evaluation engine tests passed");
