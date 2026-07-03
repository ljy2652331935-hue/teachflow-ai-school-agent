# AI School Agent Architecture

Last updated: 2026-07-02

This note is the long-term system architecture map for TeachFlow as an AI school agent system. It separates private student support, learning wellbeing check-ins, anonymised evidence, teacher approval, curriculum context, and school governance.

## Updated Mermaid Diagram

```mermaid
flowchart TD
    A["学生端行为<br/>提问 / 作业 / 卡点 / 抱怨 / 学习记录"] --> B["学生学习助手<br/>Student Learning Assistant"]

    B --> B1["学生私有记忆<br/>个人卡点 / 对话记忆 / 学习偏好"]
    B --> B2["个人学习建议<br/>下一步计划 / 提示 / 求助草稿"]
    B --> W["AI 学习关怀助手<br/>Wellbeing Coach<br/>倾听压力 / 整理情绪化学习卡点"]
    W --> W1["学习情绪信号分级<br/>普通抱怨 / 学习挫败 / 持续压力 / 安全风险"]
    W1 --> S["治理与安全层<br/>匿名化 / 权限 / 最小必要共享 / 风险升级"]

    B --> B3["学习信号提取器<br/>整理卡点 / 知识点 / 证据片段"]
    B3 --> S

    S --> C["班级匿名证据层<br/>学生别名 + 学习证据 + 学习情绪信号"]

    K["课程上下文<br/>Learning Objectives / 课件 / 作业 / 已批准材料 / 历史干预"] --> D

    C --> D["老师 Agent<br/>教学分析与学生支持助手"]

    D --> D1["理解诊断<br/>班级主要误解 + 学生原句证据"]
    D --> D2["个体学生建议<br/>学习卡点 + 支持方式 + 下一步任务"]
    D --> D3["分层干预建议<br/>Level 1 / Level 2 / Level 3"]
    D --> D4["Teacher Inbox<br/>学生跟进优先级 / 需要老师关注"]
    D --> D5["材料制作建议<br/>讲义 / 图片 Prompt / PPT / 练习"]
    D --> D6["效果评估<br/>干预后是否真正理解"]

    D1 --> E["教师审批与控制<br/>Edit / Approve / Reject / Export / Publish / Rollback"]
    D2 --> E
    D3 --> E
    D4 --> E
    D5 --> E
    D6 --> E

    E --> V["版本记录与审计日志<br/>Version History / Audit Log"]
    E --> F["教师批准内容库<br/>已批准讲解 / 小测 / 图解 / 任务 / 反馈"]

    F --> B

    F --> Q["学生完成后续任务<br/>micro-quiz / 反思 / 练习"]
    Q --> B3

    S -. 安全边界 .-> G["系统原则<br/>AI 不是心理医生<br/>不自动诊断<br/>不自动发布<br/>不替学生完成作业<br/>老师控制教学内容<br/>安全风险升级给真人"]
```

## Major Modules

- Student Learning Assistant: guides the student, explains concepts, records personal stuck points, and helps write a help request. It should not complete homework or provide final answers.
- AI 学习关怀助手 / Wellbeing Coach: lets students express learning frustration, stress, and reluctance, then turns that into learning support language. It is not a therapist and must not diagnose mental health conditions.
- Student Private Memory: private learning context for the student and system only. Teachers should not see the full raw conversation by default.
- Learning Signal Extractor: turns student questions, assignments, stuck notes, and shared check-ins into limited evidence: alias, topic, misconception type, evidence quote, confidence, learning support signal, and teacher-attention flag.
- Wellbeing Signal Agent: classifies temporary learning-state signals such as normal complaint, low confidence, sustained learning pressure, or safety-risk language. It outputs learning support signals, not diagnoses.
- Governance & Safety Layer: central gate for anonymisation, role-based access, minimum necessary sharing, teacher approval, audit logging, no automatic grading, no automatic publishing, no homework completion, and safeguarding escalation to humans when needed.
- Class Anonymised Evidence Layer: teacher-usable evidence for diagnosis. It contains aliases, learning evidence, and learning-relevant wellbeing summaries, not real identity or unrelated private content.
- Curriculum Context: learning objectives, lesson materials, homework, approved content, assessment criteria, and past interventions that keep the teacher Agent grounded in the actual course.
- Teacher Agent: helps the teacher diagnose misconceptions, plan differentiated interventions, create materials, maintain a Teacher Inbox, and evaluate intervention outcomes.
- Teacher Approval & Control: the teacher edits, approves, rejects, exports, publishes, rolls back, and reviews audit/version history.
- Teacher-Approved Content Library: official student-facing learning content should come from this layer whenever possible.
- Intervention Outcome Loop: published content leads to micro-quiz/reflection/practice, which creates new learning signals and updates the evidence layer.

## v0.1 Scope

Current v0.1/v0.3 prototype should stay focused on the teacher-controlled core:

- Teacher page, student page, and school-admin page.
- Alias-only student evidence.
- Student Check-in / AI 学习关怀助手 with `Keep private`, `Ask AI first`, and `Share learning summary with teacher`.
- Teacher-visible Student Support Profile and Teacher Inbox based on shared check-in summaries.
- Misconception diagnosis.
- Differentiated intervention.
- Teacher approval, version history, rollback, export, publish, and audit log.
- Student assignment, question, stuck-signal, and check-in submission.
- Student signals syncing into teacher teaching analysis and student support profiles.
- School-admin aggregate dashboard and class comparison.
- Local demo login with role/class boundaries.

## Future Scope

These belong to later versions after the core loop is stable:

- Richer student private memory and long-running personal agent state.
- Stronger Learning Signal Extractor with configurable evidence rules.
- Teacher Inbox with actionable queue items and dismiss/schedule/send-material actions.
- Dedicated safeguarding role, escalation workflow, and school-configured contacts before any real wellbeing deployment.
- Teacher-approved content library with searchable materials and publishing history.
- Intervention outcome evaluation after micro-quiz/reflection/practice.
- School-level pilot operations, readiness reports, and feedback records.
- Production identity, database, retention, CSRF, CSP, rate limiting, and real AI integration.

## Design Principle

AI drafts. Teachers decide.

Student agents guide learning, but do not complete work for students. The AI 学习关怀助手 supports learning frustration, but it is not a psychological diagnosis or therapy system. Teacher agents analyse evidence, but do not replace teacher judgment.
