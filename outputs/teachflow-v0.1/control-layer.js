(function (global) {
  const INTERVENTION_STATUSES = [
    "draft",
    "under_review",
    "edited",
    "approved",
    "rejected",
    "exported",
    "published",
    "rolled_back"
  ];

  const SECTION_DEFINITIONS = [
    {
      key: "revised_teaching_plan",
      label: "修订后的教学计划",
      targetType: "intervention_section",
      path: ["revised_teaching_plan"]
    },
    {
      key: "level_1_material",
      label: "Level 1 材料",
      targetType: "material",
      path: ["differentiated_materials", "level_1_confused"]
    },
    {
      key: "level_2_material",
      label: "Level 2 材料",
      targetType: "material",
      path: ["differentiated_materials", "level_2_partially_understood"]
    },
    {
      key: "level_3_material",
      label: "Level 3 材料",
      targetType: "material",
      path: ["differentiated_materials", "level_3_ready_to_apply"]
    },
    {
      key: "visual_aid_prompt",
      label: "可视化提示词",
      targetType: "material",
      path: ["visual_aid"]
    },
    {
      key: "video_storyboard",
      label: "视频分镜",
      targetType: "material",
      path: ["video_storyboard"]
    },
    {
      key: "micro_quiz",
      label: "微型测验",
      targetType: "material",
      path: ["micro_quiz"]
    },
    {
      key: "teacher_notes",
      label: "教师备注",
      targetType: "material",
      path: ["teacher_notes"]
    },
    {
      key: "student_facing_material",
      label: "学生材料",
      targetType: "material",
      path: ["student_facing_material"]
    }
  ];

  let auditCounter = 0;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createSectionApprovals(intervention) {
    const createdAt = nowIso();
    return SECTION_DEFINITIONS.reduce((approvals, section) => {
      approvals[section.key] = {
        section_key: section.key,
        label: section.label,
        status: intervention ? "draft" : "not_generated",
        approved_by: null,
        approved_at: null,
        updated_at: createdAt
      };
      return approvals;
    }, {});
  }

  function getSectionDefinition(sectionKey) {
    return SECTION_DEFINITIONS.find((section) => section.key === sectionKey) || SECTION_DEFINITIONS[0];
  }

  function getSectionContent(intervention, sectionKey) {
    const section = getSectionDefinition(sectionKey);
    return section.path.reduce((value, pathKey) => value?.[pathKey], intervention);
  }

  function replaceSectionContent(intervention, sectionKey, content) {
    const section = getSectionDefinition(sectionKey);
    const updated = clone(intervention);
    let target = updated;
    section.path.slice(0, -1).forEach((pathKey) => {
      target = target[pathKey];
    });
    target[section.path[section.path.length - 1]] = clone(content);
    return updated;
  }

  function createVersion({ intervention, versionNumber, createdBy, changeSummary, sectionKey = null, status = "draft" }) {
    return {
      version_id: `version-${String(versionNumber).padStart(3, "0")}`,
      intervention_id: intervention.intervention_id,
      version_number: versionNumber,
      created_by: createdBy,
      created_at: nowIso(),
      change_summary: changeSummary,
      section_key: sectionKey,
      status,
      content_snapshot: clone(intervention)
    };
  }

  function createAuditEntry({ actor, action, targetType, targetId, details }) {
    auditCounter += 1;
    const timestamp = nowIso();
    return {
      audit_log_id: `audit-${Date.now()}-${auditCounter}`,
      timestamp,
      actor,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      time: new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: details
    };
  }

  function createExportPackage({ intervention, analysis, workspace, status, sectionApprovals, versionHistory }) {
    const content = buildExportMarkdown({ intervention, analysis, workspace, status, sectionApprovals, versionHistory });
    return {
      export_id: `export-${Date.now()}`,
      intervention_id: intervention.intervention_id,
      format: "markdown",
      created_at: nowIso(),
      status_at_export: status,
      content
    };
  }

  function buildExportMarkdown({ intervention, analysis, workspace, status, sectionApprovals, versionHistory }) {
    const materials = intervention.differentiated_materials;
    const sectionStatusLines = SECTION_DEFINITIONS.map((section) => {
      const approval = sectionApprovals?.[section.key];
      return `- ${section.label}: ${formatStatus(approval?.status || "draft")}`;
    });

    const misconceptionLines = (analysis?.misconceptions || []).flatMap((misconception, index) => [
      `### ${index + 1}. ${misconception.title}`,
      `严重程度：${misconception.severity}`,
      `涉及学生：${misconception.affected_students.join(", ")}`,
      `教学需要：${misconception.teaching_need}`,
      ""
    ]);

    return [
      `# TeachFlow 教师已批准教学干预：${intervention.topic}`,
      "",
      `课程：${workspace?.course?.title || "未命名课程"}`,
      `班级：${workspace?.class?.name || "未命名班级"}`,
      `状态：${formatStatus(status)}`,
      `版本：${versionHistory?.length || 1}`,
      "",
      "## 班级理解摘要",
      analysis?.class_understanding_summary || "暂无诊断摘要。",
      "",
      "## 误解地图",
      ...misconceptionLines,
      "## 章节审批状态",
      ...sectionStatusLines,
      "",
      "## 干预摘要",
      intervention.intervention_summary,
      "",
      "## 修订后的教学计划",
      intervention.revised_teaching_plan.rationale,
      "",
      ...intervention.revised_teaching_plan.steps.flatMap((step) => [
        `### ${step.step_number}. ${step.title}`,
        `教师行动：${step.teacher_action}`,
        `学生行动：${step.student_action}`,
        `关联误解：${step.linked_misconception_ids.join(", ")}`,
        ""
      ]),
      "## Level 1 材料",
      `目标学生：${materials.level_1_confused.target_students.join(", ") || "无"}`,
      `目标：${materials.level_1_confused.goal}`,
      materials.level_1_confused.explanation,
      `类比：${materials.level_1_confused.analogy}`,
      `任务：${materials.level_1_confused.task}`,
      "",
      "## Level 2 材料",
      `目标学生：${materials.level_2_partially_understood.target_students.join(", ") || "无"}`,
      `目标：${materials.level_2_partially_understood.goal}`,
      materials.level_2_partially_understood.explanation,
      `概念桥接：${materials.level_2_partially_understood.concept_bridge}`,
      `任务：${materials.level_2_partially_understood.task}`,
      "",
      "## Level 3 材料",
      `目标学生：${materials.level_3_ready_to_apply.target_students.join(", ") || "无"}`,
      `目标：${materials.level_3_ready_to_apply.goal}`,
      `挑战：${materials.level_3_ready_to_apply.challenge}`,
      "连接：",
      ...materials.level_3_ready_to_apply.cross_domain_connections.map((item) => `- ${item}`),
      "",
      "## 可视化提示词",
      intervention.visual_aid.image_prompt,
      "",
      "## 视频分镜",
      ...intervention.video_storyboard.map((scene) => `${scene.scene_number}. ${scene.description} 旁白：${scene.narration}`),
      "",
      "## 微型测验",
      ...intervention.micro_quiz.map((item, index) => `${index + 1}. ${item.question}\n目的：${item.purpose}\n预期理解：${item.expected_understanding}`),
      "",
      "## 教师备注",
      ...intervention.teacher_notes.map((item) => `- ${item.note} ${item.why_it_matters}`),
      "",
      "## 学生讲义",
      intervention.student_facing_material?.body || "暂无学生材料。",
      "",
      intervention.student_facing_material?.practice_prompt ? `练习提示：${intervention.student_facing_material.practice_prompt}` : "",
      "",
      "## 版本历史",
      ...(versionHistory || []).map((version) => `- 版本 ${version.version_number}: ${version.change_summary} (${version.created_by})`)
    ].join("\n");
  }

  function formatStatus(status) {
    const labels = {
      draft: "草稿",
      not_generated: "未生成",
      under_review: "审核中",
      edited: "已编辑",
      approved: "已批准",
      rejected: "已拒绝",
      exported: "已导出",
      published: "已发布",
      rolled_back: "已回滚",
      needs_edit: "需要修改",
      confused: "需要具体支持",
      partially_understood: "部分理解",
      ready_to_apply: "准备应用"
    };
    return labels[status] || String(status || "草稿");
  }

  function restoreVersion(version) {
    return clone(version.content_snapshot);
  }

  const api = {
    INTERVENTION_STATUSES,
    SECTION_DEFINITIONS,
    createSectionApprovals,
    getSectionDefinition,
    getSectionContent,
    replaceSectionContent,
    createVersion,
    createAuditEntry,
    createExportPackage,
    buildExportMarkdown,
    restoreVersion,
    formatStatus,
    clone
  };

  global.TeachFlowControlLayer = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
