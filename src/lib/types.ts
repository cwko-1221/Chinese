export type AppUser = {
  id: string;
  login_id: string;
  display_name: string;
  role: "teacher" | "student";
};

export type ClassRoom = {
  id: string;
  teacher_id: string;
  name: string;
  created_at: string;
};

export type AssignmentItem = {
  id: string;
  assignment_id: string;
  traditional_text: string;
  jyutping: string;
  english_meaning: string;
  order_index: number;
};

export type Assignment = {
  id: string;
  class_id: string;
  title: string;
  status: "draft" | "published";
  created_by: string;
  created_at: string;
  ncs_assignment_items?: AssignmentItem[];
};

export type StudentAssignment = Assignment & {
  ncs_attempts?: { id: string; status: string; score: number }[];
};

export type AttemptItem = {
  id: string;
  attempt_id: string;
  assignment_item_id: string;
  handwriting_correct: boolean;
  speech_transcript: string | null;
  speech_correct: boolean;
  speech_recording_url: string | null;
  assessment_transcript: string | null;
  assessment_correct: boolean;
  assessment_recording_url: string | null;
};

export type TeacherStudent = {
  id: string;
  classId: string;
  className: string;
  loginId: string;
  displayName: string;
  initialPassword?: string;
  attempts: number;
  correct: number;
  accuracy: number;
};

