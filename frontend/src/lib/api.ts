import { authStorage, User } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export interface Course {
  id: string;
  code: string;
  title: string;
  description?: string;
  section: string;
  semester: string;
  year?: number;
  instructor: User;
  status: "active" | "completed" | "archived";
  is_active?: boolean;
  join_code?: string;
  allow_code_join?: boolean;
  max_students?: number;
  cover_color: string;
  schedule_info: string;
  room_location?: string;
  enrollment_count: number;
  is_enrolled?: boolean;
  my_enrollment_status?: string | null;
  enable_leaderboard?: boolean;
  created_at?: string;
}

export interface CourseMaterial {
  id: string;
  course: string;
  course_code: string;
  course_title: string;
  uploader?: User;
  title: string;
  description: string;
  topic: string;
  material_type: string;
  file?: string | null;
  file_url?: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  notebook_content?: any;
  video_url?: string;
  link_url?: string;
  is_published: boolean;
  ai_indexed: boolean;
  ai_indexed_at?: string | null;
  page_count: number;
  created_at: string;
}

export interface Announcement {
  id: string;
  course: string;
  author: User;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

export interface Assignment {
  id: string;
  course: string;
  course_code: string;
  course_title: string;
  title: string;
  description: string;
  assessment_type: string;
  submission_format: string;
  due_date: string | null;
  max_score: number;
  late_submissions_allowed: boolean;
  status?: string;
  is_published: boolean;
  attachment?: string | null;
  attachment_name?: string;
  attachment_url?: string | null;
  my_submission?: {
    id: string;
    receipt_id: string;
    submitted_at: string;
    score?: number | null;
    feedback?: string;
    status: string;
    is_late: boolean;
    content?: string;
    file?: string | null;
    file_url?: string | null;
    file_name?: string;
  } | null;
  submissions_count?: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: "mcq" | "true_false" | "short_answer";
  options: string[];
  marks: number;
  order: number;
  correct_answer?: string;
  explanation?: string;
}

export interface Quiz {
  id: string;
  course: string;
  course_code: string;
  title: string;
  description: string;
  duration_minutes: number;
  max_attempts: number;
  due_date?: string | null;
  total_marks?: number;
  is_published: boolean;
  release_results: boolean;
  questions_count: number;
  my_attempt?: {
    id: string;
    attempt_number: number;
    score: number | string;
    max_score: number;
    completed_at: string;
  } | null;
  questions?: QuizQuestion[];
  created_at: string;
}

export interface CodingProblem {
  id: string;
  course: string;
  course_code: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  time_limit_sec: number;
  memory_limit_mb: number;
  sample_input: string;
  sample_output: string;
  max_score: number;
  supported_languages: string[];
  due_date?: string | null;
  my_submission?: {
    id: string;
    outcome: string;
    passed_tests: number;
    total_tests: number;
    score: number;
    execution_time_ms: number;
    output_log: string;
    submitted_at: string;
  } | null;
}

export interface ForumReply {
  id: string;
  topic: string;
  author: User;
  content: string;
  is_accepted_answer: boolean;
  created_at: string;
}

export interface ForumTopic {
  id: string;
  course: string;
  author: User;
  title: string;
  content: string;
  is_pinned: boolean;
  is_resolved: boolean;
  is_locked: boolean;
  replies_count: number;
  replies?: ForumReply[];
  created_at: string;
}

export interface ShortActivity {
  id: string;
  course: string;
  author: User;
  title: string;
  prompt: string;
  options: string[];
  is_active: boolean;
  response_stats: Record<string, number>;
  has_responded: boolean;
  my_response?: string | null;
  created_at: string;
}

export interface AnonymousFeedback {
  id: string;
  course: string;
  category: string;
  rating: number;
  feedback_text: string;
  created_at: string;
}

export interface TimetableSlot {
  id: string;
  course?: string;
  course_code: string;
  course_title: string;
  instructor_name?: string;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
  building: string;
}

export interface CalendarEvent {
  id: string;
  course?: string | null;
  course_code?: string;
  title: string;
  description: string;
  event_type: "class" | "deadline" | "exam" | "holiday" | "workshop";
  start_time: string;
  end_time?: string;
  location?: string;
}

export interface AttendanceRecord {
  id: string;
  student: User;
  status: "present" | "absent" | "late" | "excused";
  remarks: string;
  marked_at: string;
  modified_by?: User | null;
  audit_note?: string;
}

export interface AttendanceSession {
  id: string;
  course: string;
  date: string;
  topic: string;
  created_by: User;
  total_marked: number;
  records?: AttendanceRecord[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link?: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export interface HelpDeskTicket {
  id: string;
  user: User;
  ticket_type: "bug" | "suggestion" | "help" | string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | string;
  resolution_notes?: string;
  created_at: string;
}

export interface DashboardSummary {
  role?: "student" | "instructor";
  total_classes?: number;
  active_classes?: number;
  pending_work_count?: number;
  due_this_week_count?: number;
  attendance_rate?: string;
  upcoming_deadlines?: Array<{
    id: string;
    title: string;
    course_code: string;
    course_title?: string;
    due_date: string;
    type: string;
    max_score: number;
  }>;
  recent_materials?: Array<{
    id: string;
    title: string;
    course_code: string;
    topic: string;
    file_type: string;
    created_at: string;
    ai_indexed: boolean;
  }>;
  classes?: Course[];
  my_courses_count?: number;
  total_enrolled_students?: number;
  pending_grading_count?: number;
  indexed_materials_count?: number;
  courses?: Course[];
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const tokens = authStorage.getTokens();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (tokens?.access) {
    headers["Authorization"] = `Bearer ${tokens.access}`;
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error?.message || data.detail || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data.data !== undefined ? data.data : data;
}

export const api = {
  // Courses
  getCourses: async (params?: { status?: string; search?: string; all?: boolean }): Promise<Course[]> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.all) searchParams.set("all", "true");
    const query = searchParams.toString();
    return request<Course[]>(`/courses/${query ? `?${query}` : ""}`);
  },

  getCourseDetail: async (id: string): Promise<Course> => {
    return request<Course>(`/courses/${id}/`);
  },

  createCourse: async (courseData: Partial<Course>): Promise<Course> => {
    return request<Course>("/courses/", {
      method: "POST",
      body: JSON.stringify(courseData),
    });
  },

  updateCourse: async (id: string, courseData: Partial<Course>): Promise<Course> => {
    return request<Course>(`/courses/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(courseData),
    });
  },

  deleteCourse: async (id: string): Promise<void> => {
    return request<void>(`/courses/${id}/`, {
      method: "DELETE",
    });
  },

  joinCourseByCode: async (code: string): Promise<{ course: Course; enrollment_id: string }> => {
    return request<{ course: Course; enrollment_id: string }>("/courses/join/", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  getCourseParticipants: async (courseId: string): Promise<{
    instructor: User;
    student_count: number;
    students: Array<User & { enrolled_at: string }>;
  }> => {
    return request(`/courses/${courseId}/participants/`);
  },

  getCourseLeaderboard: async (courseId: string): Promise<{
    enabled: boolean;
    course_code: string;
    leaderboard: Array<{
      rank: number;
      student_id: string;
      name: string;
      points: number;
      submissions: number;
      quizzes_completed: number;
      accepted_labs: number;
      badges: string[];
    }>;
  }> => {
    return request(`/courses/${courseId}/leaderboard/`);
  },

  getCourseAnalytics: async (courseId: string): Promise<any> => {
    return request(`/courses/${courseId}/analytics/`);
  },

  // Announcements
  getAnnouncements: async (courseId: string): Promise<Announcement[]> => {
    return request<Announcement[]>(`/courses/${courseId}/announcements/`);
  },

  createAnnouncement: async (courseId: string, payload: { title?: string; content: string; is_pinned?: boolean }): Promise<Announcement> => {
    return request<Announcement>(`/courses/${courseId}/announcements/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Materials & Notebooks
  getMaterials: async (params?: { course_id?: string; topic?: string; search?: string }): Promise<CourseMaterial[]> => {
    const searchParams = new URLSearchParams();
    if (params?.course_id) searchParams.set("course_id", params.course_id);
    if (params?.topic) searchParams.set("topic", params.topic);
    if (params?.search) searchParams.set("search", params.search);
    const query = searchParams.toString();
    return request<CourseMaterial[]>(`/materials/${query ? `?${query}` : ""}`);
  },

  uploadMaterial: async (formData: FormData): Promise<CourseMaterial> => {
    return request<CourseMaterial>("/materials/", {
      method: "POST",
      body: formData,
    });
  },

  updateMaterial: async (id: string, payload: Partial<CourseMaterial>): Promise<CourseMaterial> => {
    return request<CourseMaterial>(`/materials/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteMaterial: async (id: string): Promise<void> => {
    return request<void>(`/materials/${id}/`, {
      method: "DELETE",
    });
  },

  indexMaterialRAG: async (id: string): Promise<{ id: string; ai_indexed: boolean }> => {
    return request<{ id: string; ai_indexed: boolean }>(`/materials/${id}/index/`, {
      method: "POST",
    });
  },

  // Assignments & Submissions
  getAssignments: async (courseId?: string): Promise<Assignment[]> => {
    return request<Assignment[]>(`/assessments/${courseId ? `?course_id=${courseId}` : ""}`);
  },

  createAssignment: async (payload: Partial<Assignment> | FormData): Promise<Assignment> => {
    if (payload instanceof FormData) {
      return request<Assignment>("/assessments/", {
        method: "POST",
        body: payload,
      });
    }
    return request<Assignment>("/assessments/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getAssignmentSubmissions: async (assignmentId: string): Promise<any> => {
    return request(`/assessments/${assignmentId}/submissions/`);
  },

  getQuizAttempts: async (quizId: string): Promise<any> => {
    return request(`/assessments/quizzes/${quizId}/attempts/`);
  },

  getMyProgressSummary: async (courseId?: string): Promise<any> => {
    return request(`/assessments/my-progress/${courseId ? `?course_id=${courseId}` : ""}`);
  },

  submitAssignment: async (id: string, data: { content?: string; file?: File }): Promise<any> => {
    if (data.file) {
      const formData = new FormData();
      if (data.content) formData.append("content", data.content);
      formData.append("file", data.file);
      return request(`/assessments/${id}/submit/`, {
        method: "POST",
        body: formData,
      });
    }
    return request(`/assessments/${id}/submit/`, {
      method: "POST",
      body: JSON.stringify({ content: data.content }),
    });
  },

  gradeSubmission: async (submissionId: string, score: number, feedback: string): Promise<any> => {
    return request(`/assessments/submissions/${submissionId}/grade/`, {
      method: "POST",
      body: JSON.stringify({ score, feedback }),
    });
  },

  getCourseGradebook: async (courseId: string): Promise<any> => {
    return request(`/assessments/courses/${courseId}/gradebook/`);
  },

  // Quizzes
  getQuizzes: async (courseId?: string): Promise<Quiz[]> => {
    return request<Quiz[]>(`/assessments/quizzes/${courseId ? `?course_id=${courseId}` : ""}`);
  },

  createQuiz: async (payload: {
    course: string;
    title: string;
    description?: string;
    duration_minutes?: number;
    max_attempts?: number;
    due_date?: string;
    is_published?: boolean;
    release_results?: boolean;
    questions?: Array<{
      question_text: string;
      question_type?: string;
      options?: string[];
      correct_answer: string;
      explanation?: string;
      marks?: number;
    }>;
  }): Promise<Quiz> => {
    return request<Quiz>("/assessments/quizzes/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  takeQuizAttempt: async (quizId: string, answers: Record<string, string>): Promise<any> => {
    return request(`/assessments/quizzes/${quizId}/attempt/`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },

  // Coding Labs
  getCodingProblems: async (courseId?: string): Promise<CodingProblem[]> => {
    return request<CodingProblem[]>(`/assessments/coding/${courseId ? `?course_id=${courseId}` : ""}`);
  },

  submitCodingProblem: async (problemId: string, code: string, language: string = "python"): Promise<any> => {
    return request(`/assessments/coding/${problemId}/submit/`, {
      method: "POST",
      body: JSON.stringify({ code, language }),
    });
  },

  // Forum & Shorts
  getForumTopics: async (courseId: string, search?: string): Promise<ForumTopic[]> => {
    const q = search ? `&search=${encodeURIComponent(search)}` : "";
    return request<ForumTopic[]>(`/communication/forum/?course_id=${courseId}${q}`);
  },

  getForumTopicDetail: async (topicId: string): Promise<ForumTopic> => {
    return request<ForumTopic>(`/communication/forum/${topicId}/`);
  },

  createForumTopic: async (courseId: string, title: string, content: string): Promise<ForumTopic> => {
    return request<ForumTopic>("/communication/forum/", {
      method: "POST",
      body: JSON.stringify({ course: courseId, title, content }),
    });
  },

  replyForumTopic: async (topicId: string, content: string): Promise<ForumReply> => {
    return request<ForumReply>(`/communication/forum/${topicId}/reply/`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  acceptForumAnswer: async (replyId: string): Promise<ForumReply> => {
    return request<ForumReply>(`/communication/forum/replies/${replyId}/accept/`, {
      method: "PATCH",
    });
  },

  getShorts: async (courseId: string): Promise<ShortActivity[]> => {
    return request<ShortActivity[]>(`/communication/shorts/?course_id=${courseId}`);
  },

  respondShort: async (shortId: string, selected_option: string): Promise<any> => {
    return request(`/communication/shorts/${shortId}/respond/`, {
      method: "POST",
      body: JSON.stringify({ selected_option }),
    });
  },

  // Forms & Anonymous Feedback
  submitAnonymousFeedback: async (courseId: string, category: string, rating: number, feedback_text: string): Promise<any> => {
    return request("/communication/anonymous-feedback/", {
      method: "POST",
      body: JSON.stringify({ course: courseId, category, rating, feedback_text }),
    });
  },

  getAnonymousFeedback: async (courseId: string): Promise<any> => {
    return request(`/communication/anonymous-feedback/?course_id=${courseId}`);
  },

  // Scheduling: Timetable & Calendar
  getTimetable: async (courseId?: string): Promise<TimetableSlot[]> => {
    return request<TimetableSlot[]>(`/scheduling/timetable/${courseId ? `?course_id=${courseId}` : ""}`);
  },

  getCalendarEvents: async (): Promise<CalendarEvent[]> => {
    return request<CalendarEvent[]>("/scheduling/calendar/");
  },

  // Attendance
  getAttendanceSessions: async (courseId: string): Promise<AttendanceSession[]> => {
    return request<AttendanceSession[]>(`/attendance/sessions/?course_id=${courseId}`);
  },

  createAttendanceSession: async (payload: { course: string; date?: string; topic?: string }): Promise<any> => {
    return request("/attendance/sessions/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  submitAttendanceRollCall: async (sessionId: string, records: Array<{ student_id: string; status: string; remarks?: string }>): Promise<any> => {
    return request(`/attendance/sessions/${sessionId}/roll-call/`, {
      method: "POST",
      body: JSON.stringify({ records }),
    });
  },

  correctAttendanceRecord: async (recordId: string, statusVal: string, audit_note: string): Promise<any> => {
    return request(`/attendance/records/${recordId}/correct/`, {
      method: "PATCH",
      body: JSON.stringify({ status: statusVal, audit_note }),
    });
  },

  getMyAttendanceSummary: async (courseId?: string): Promise<any> => {
    return request(`/attendance/my-summary/${courseId ? `?course_id=${courseId}` : ""}`);
  },

  // Notifications
  getNotifications: async (): Promise<{ unread_count: number; notifications: NotificationItem[] }> => {
    return request("/communication/notifications/");
  },

  markNotificationRead: async (id: string): Promise<any> => {
    return request(`/communication/notifications/${id}/read/`, {
      method: "PATCH",
    });
  },

  markAllNotificationsRead: async (): Promise<any> => {
    return request("/communication/notifications/read-all/", {
      method: "POST",
    });
  },

  // Platform Support & Help Desk
  getTickets: async (): Promise<HelpDeskTicket[]> => {
    return request<HelpDeskTicket[]>("/communication/tickets/");
  },

  createTicket: async (payload: { ticket_type: string; subject: string; description: string }): Promise<HelpDeskTicket> => {
    return request<HelpDeskTicket>("/communication/tickets/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // AI Studio & AI Playground
  getAIDrafts: async (courseId?: string): Promise<any[]> => {
    return request<any[]>(`/ai/studio/${courseId ? `?course_id=${courseId}` : ""}`);
  },

  generateAIDraft: async (courseId: string, draft_type: string, prompt: string, title?: string): Promise<any> => {
    return request("/ai/studio/", {
      method: "POST",
      body: JSON.stringify({ course: courseId, draft_type, prompt, title }),
    });
  },

  updateAIDraft: async (draftId: string, payload: any): Promise<any> => {
    return request(`/ai/studio/${draftId}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  publishAIDraft: async (draftId: string): Promise<any> => {
    return request(`/ai/studio/${draftId}/publish/`, {
      method: "POST",
    });
  },

  runAIPlayground: async (user_prompt: string, model_name?: string, system_prompt?: string): Promise<any> => {
    return request("/ai/playground/", {
      method: "POST",
      body: JSON.stringify({ user_prompt, model_name, system_prompt }),
    });
  },

  // Dashboard
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    return request<DashboardSummary>("/courses/dashboard-summary/");
  },
};
