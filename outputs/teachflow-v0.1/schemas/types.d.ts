export interface Teacher {
  id: string;
  display_name: string;
  role: "Teacher" | "Tutor" | "TA";
}

export interface Course {
  id: string;
  title: string;
}

export interface Topic {
  id: string;
  title: string;
  course_id?: string;
}

export interface LearningObjective {
  id: string;
  topic_id: string;
  text: string;
}

export interface LessonMaterial {
  id: string;
  topic_id: string;
  body: string;
  source_type: "paste" | "upload" | "manual";
}

export type StudentAlias = `S${number}`;

export type StudentLevel = "confused" | "partially_understood" | "ready_to_apply";

export interface QuizResponse {
  student_alias: StudentAlias;
  answer: string;
  confidence?: number;
}

export interface AnalysisRun {
  analysis_run_id: string;
  topic: string;
  class_understanding_summary: string;
  student_levels: {
    confused: StudentAlias[];
    partially_understood: StudentAlias[];
    ready_to_apply: StudentAlias[];
  };
  misconceptions: Misconception[];
  teacher_summary: string;
}

export interface Misconception {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  affected_students: StudentAlias[];
  evidence_quotes: EvidenceQuote[];
  likely_root_cause: string;
  teaching_need: string;
  recommended_next_action: string;
}

export interface EvidenceQuote {
  student_alias: StudentAlias;
  quote: string;
  why_it_matters: string;
}

export interface TeacherApproval {
  id: string;
  status: "Workspace Draft" | "Diagnosis Ready" | "Teacher Editing" | "Approved" | "Rejected" | "Rolled Back";
  version: number;
  approved_by: string | null;
  approved_at: string | null;
}

export interface Intervention {
  intervention_id: string;
  source_analysis_run_id: string;
  topic: string;
  status?: InterventionStatus;
  intervention_summary: string;
  target_misconceptions: string[];
  revised_teaching_plan: RevisedTeachingPlan;
  differentiated_materials: {
    level_1_confused: LevelOneMaterial;
    level_2_partially_understood: LevelTwoMaterial;
    level_3_ready_to_apply: LevelThreeMaterial;
  };
  visual_aid: VisualAidPrompt;
  video_storyboard: VideoStoryboardScene[];
  micro_quiz: MicroQuizQuestion[];
  teacher_notes: TeacherNote[];
  student_facing_material: StudentFacingMaterial;
  export_markdown: string;
}

export type InterventionStatus = "draft" | "under_review" | "edited" | "approved" | "rejected" | "exported" | "published" | "rolled_back";

export interface RevisedTeachingPlan {
  rationale: string;
  steps: RevisedTeachingPlanStep[];
}

export interface RevisedTeachingPlanStep {
  step_number: number;
  title: string;
  teacher_action: string;
  student_action: string;
  linked_misconception_ids: string[];
}

export interface LevelOneMaterial {
  target_students: StudentAlias[];
  goal: string;
  explanation: string;
  analogy: string;
  task: string;
  linked_misconception_ids: string[];
}

export interface LevelTwoMaterial {
  target_students: StudentAlias[];
  goal: string;
  explanation: string;
  concept_bridge: string;
  task: string;
  linked_misconception_ids: string[];
}

export interface LevelThreeMaterial {
  target_students: StudentAlias[];
  goal: string;
  challenge: string;
  cross_domain_connections: string[];
  linked_misconception_ids: string[];
}

export interface VisualAidPrompt {
  image_prompt: string;
  diagram_description: string;
  labels: string[];
  linked_misconception_ids: string[];
}

export interface VideoStoryboardScene {
  scene_number: number;
  description: string;
  narration: string;
}

export interface MicroQuizQuestion {
  question: string;
  purpose: string;
  expected_understanding: string;
  linked_misconception_ids: string[];
}

export interface TeacherNote {
  note: string;
  why_it_matters: string;
  linked_misconception_ids: string[];
}

export interface StudentFacingMaterial {
  title: string;
  audience: "student";
  body: string;
  practice_prompt: string;
  linked_misconception_ids: string[];
}

export interface InterventionApproval {
  id: string;
  status: InterventionStatus;
  version: number;
  approved_by: string | null;
  approved_at: string | null;
}

export interface InterventionVersion {
  version_id: string;
  intervention_id: string;
  version_number: number;
  created_by: "ai" | "teacher" | "system";
  created_at: string;
  change_summary: string;
  section_key: string | null;
  status: InterventionStatus;
  content_snapshot: Intervention;
}

export interface SectionApproval {
  section_key: string;
  label: string;
  status: "not_generated" | "draft" | "under_review" | "edited" | "approved" | "needs_edit";
  approved_by: string | null;
  approved_at: string | null;
  updated_at: string;
}

export interface TeacherEdit {
  edit_id: string;
  intervention_id: string;
  section_key: string;
  edited_by: string;
  edited_at: string;
  change_summary: string;
}

export interface ExportPackage {
  export_id: string;
  intervention_id: string;
  format: "markdown";
  created_at: string;
  status_at_export: InterventionStatus;
  content: string;
}

export interface RollbackEvent {
  rollback_id: string;
  restored_version_id: string;
  created_at: string;
  actor: "teacher";
  details: string;
}

export interface StudentMemory {
  id: string;
  topic_id: string;
  student_alias: StudentAlias;
  current_level: StudentLevel;
  understood: string[];
  weak_points: string[];
  misconception_ids: string[];
  preferred_explanation_style?: "visual" | "analogy" | "formula" | "example" | "application";
  recommended_next_action: string;
  last_updated_at: string;
}

export interface FollowupStudentUpdate {
  student_alias: StudentAlias;
  new_level: StudentLevel;
  evidence: string;
  understood: string[];
  remaining_weak_points: string[];
  recommended_next_action: string;
}

export interface FollowupAnalysis {
  followup_summary: string;
  student_updates: FollowupStudentUpdate[];
  next_teaching_recommendation: string;
  student_memories: StudentMemory[];
}

export interface StudentMaterialAssignment {
  id: string;
  intervention_id: string;
  topic_id: string;
  student_alias: StudentAlias;
  material_level: StudentLevel;
  assigned_at: string;
  completed_at?: string | null;
}

export interface StudentReflection {
  id: string;
  topic_id: string;
  student_alias: StudentAlias;
  prompt: string;
  response: string;
  created_at: string;
}

export interface StudentMicroQuizAttempt {
  id: string;
  intervention_id: string;
  topic_id: string;
  student_alias: StudentAlias;
  answers: Array<{
    question_id: string;
    answer: string;
  }>;
  submitted_at: string;
}

export type StudentStuckType = "definition" | "diagram" | "formula_meaning" | "example_transfer" | "relevance" | "application";

export interface StudentStuckSignal {
  id: string;
  topic_id: string;
  student_alias: StudentAlias;
  stuck_type: StudentStuckType;
  free_text?: string;
  created_at: string;
}

export type StudentCheckInState = "understand" | "partly_understand" | "stuck" | "frustrated" | "want_teacher_help";
export type StudentCheckInShareChoice = "private" | "teacher_summary" | "ask_ai_first";
export type LearningSupportSignal = "normal_learning_check_in" | "learning_support_needed" | "low_confidence" | "sustained_learning_pressure" | "safeguarding_review";
export type StudentCheckInPrivacyLevel = "private_student_only" | "teacher_visible_summary_only" | "safeguarding_review_required";

export interface SafeguardingFlag {
  required: boolean;
  reason?: string;
}

export interface StudentCheckIn {
  id: string;
  studentAlias: StudentAlias;
  topic: string;
  state: StudentCheckInState;
  stateLabel: string;
  note: string;
  shareChoice: StudentCheckInShareChoice;
  privateReflection: string;
  nextLearningStep: string;
  teacherHelpDraft: string;
  learningSupportSignal: LearningSupportSignal;
  wellbeingLevel: 0 | 1 | 2 | 3;
  wellbeingLabel: string;
  summaryForTeacher: string;
  recommendedTeacherAction: string;
  evidenceQuote: string;
  privacyLevel: StudentCheckInPrivacyLevel;
  teacherVisible: boolean;
  safeguardingFlag: SafeguardingFlag;
  createdAt: string;
}

export interface LearningSupportSignalForTeacher {
  id: string;
  studentAlias: StudentAlias;
  topic: string;
  state: StudentCheckInState;
  stateLabel: string;
  learningSupportSignal: LearningSupportSignal;
  wellbeingLevel: 0 | 1 | 2 | 3;
  wellbeingLabel: string;
  summaryForTeacher: string;
  recommendedTeacherAction: string;
  teacherHelpDraft: string;
  evidenceQuote: string;
  privacyLevel: "teacher_visible_summary_only";
  teacherVisible: true;
  safeguardingFlag: Pick<SafeguardingFlag, "required">;
  createdAt: string;
}

export type UnderstandingMapStatus = "understood" | "needs_support" | "not_yet_assessed";

export interface UnderstandingMapNode {
  id: string;
  topic_id: string;
  student_alias: StudentAlias;
  concept: string;
  status: UnderstandingMapStatus;
  evidence: string[];
  recommended_action: string;
  preferred_explanation_style?: "visual" | "analogy" | "formula" | "example" | "application";
  updated_at: string;
}

export interface AuditLog {
  audit_log_id: string;
  timestamp: string;
  actor: "teacher" | "ai_system" | "system" | "student";
  action: string;
  target_type: "analysis" | "intervention" | "material" | "export" | "rollback" | "memory" | "understanding_map";
  target_id: string;
  details: string;
  time: string;
  text: string;
}
