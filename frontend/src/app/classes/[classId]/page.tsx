"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  BookOpen, 
  Users, 
  Clock, 
  MapPin, 
  KeyRound, 
  Copy, 
  Check, 
  FileText, 
  Sparkles, 
  UploadCloud, 
  Plus, 
  MessageSquare, 
  CheckSquare, 
  GraduationCap, 
  Calendar, 
  SlidersHorizontal, 
  Search, 
  Download, 
  Trash2, 
  Edit3, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Bot, 
  Terminal, 
  HelpCircle, 
  Trophy, 
  Video, 
  Send,
  Pin,
  Play,
  RotateCcw,
  Star,
  Award,
  Eye,
  BarChart3,
  Code2,
  Bell,
  UserCheck,
  Layers,
  Target,
  ExternalLink,
  ImageIcon,
  Film,
  Link2
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { 
  api, 
  Course, 
  CourseMaterial, 
  Announcement, 
  Assignment, 
  Quiz, 
  CodingProblem, 
  ForumTopic, 
  ShortActivity 
} from "@/lib/api";
import { authStorage, User } from "@/lib/auth";
import { askQuicknowAI } from "@/lib/quicknow-ai";

export default function CourseWorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm font-semibold text-slate-500">Loading course workspace...</div>}>
      <CourseWorkspaceContent />
    </Suspense>
  );
}

function CourseWorkspaceContent() {
  const params = useParams();
  const classId = params.classId as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");

  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [codingProblems, setCodingProblems] = useState<CodingProblem[]>([]);
  const [forumTopics, setForumTopics] = useState<ForumTopic[]>([]);
  const [shorts, setShorts] = useState<ShortActivity[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [gradebookData, setGradebookData] = useState<any>(null);
  const [anonymousFeedbacks, setAnonymousFeedbacks] = useState<any>(null);
  const [aiDrafts, setAiDrafts] = useState<any[]>([]);
  const [participants, setParticipants] = useState<{ instructor: User; students: any[] } | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      return authStorage.getUser();
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    return initialTab || "stream";
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // 11. Attendance Taking State
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [attendanceTopic, setAttendanceTopic] = useState<string>("");
  const [attendanceStatusMap, setAttendanceStatusMap] = useState<Record<string, "present" | "absent" | "late" | "excused">>({});
  const [attendanceRemarksMap, setAttendanceRemarksMap] = useState<Record<string, string>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState<string | null>(null);
  const [attendanceErrorMsg, setAttendanceErrorMsg] = useState<string | null>(null);
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "present" | "absent">("all");
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState("");
  // Student Attendance Summary (Per-day attendance records & real-time metrics)
  const [studentAttendanceSummary, setStudentAttendanceSummary] = useState<any | null>(null);

  // Instructor Assignment Creation State
  const [createAssignmentModalOpen, setCreateAssignmentModalOpen] = useState(false);
  const [newAssignTitle, setNewAssignTitle] = useState("");
  const [newAssignDesc, setNewAssignDesc] = useState("");
  const [newAssignType, setNewAssignType] = useState<"assignment" | "lab" | "project" | "quiz">("assignment");
  const [newAssignFormat, setNewAssignFormat] = useState<"both" | "file" | "text">("both");
  const [newAssignDueDate, setNewAssignDueDate] = useState("");
  const [newAssignMaxScore, setNewAssignMaxScore] = useState<number>(100);
  const [newAssignAttachment, setNewAssignAttachment] = useState<File | null>(null);
  const [creatingAssignment, setCreatingAssignment] = useState(false);

  // Instructor Check Submissions Modal State
  const [viewSubmissionsAssignment, setViewSubmissionsAssignment] = useState<Assignment | null>(null);
  const [assignmentSubmissionsData, setAssignmentSubmissionsData] = useState<any | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionFilter, setSubmissionFilter] = useState<"all" | "submitted" | "late" | "missing">("all");
  const [inlineGradingId, setInlineGradingId] = useState<string | null>(null);
  const [inlineScore, setInlineScore] = useState<number>(100);
  const [inlineFeedback, setInlineFeedback] = useState<string>("");
  const [savingInlineGrade, setSavingInlineGrade] = useState(false);

  // Instructor Quiz Creation State
  const [createQuizModalOpen, setCreateQuizModalOpen] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizDesc, setNewQuizDesc] = useState("");
  const [newQuizDuration, setNewQuizDuration] = useState<number>(30);
  const [newQuizDue, setNewQuizDue] = useState("");
  const [newQuizReleaseResults, setNewQuizReleaseResults] = useState(true);
  const [newQuizQuestions, setNewQuizQuestions] = useState<Array<{
    question_text: string;
    options: string[];
    correct_answer: string;
    marks: number;
  }>>([
    {
      question_text: "",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct_answer: "Option A",
      marks: 5,
    },
  ]);
  const [creatingQuiz, setCreatingQuiz] = useState(false);

  // Instructor Check Quiz Attempts Modal State
  const [viewAttemptsQuiz, setViewAttemptsQuiz] = useState<Quiz | null>(null);
  const [quizAttemptsData, setQuizAttemptsData] = useState<any | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [attemptFilter, setAttemptFilter] = useState<"all" | "attempted" | "late" | "missing">("all");

  // Modals & Active Interaction States
  // 1. Material Upload & Resource Sharing
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [matTitle, setMatTitle] = useState("");
  const [matTopic, setMatTopic] = useState("Unit 1: Fundamentals");
  const [matDescription, setMatDescription] = useState("");
  const [matType, setMatType] = useState("document");
  const [matLinkUrl, setMatLinkUrl] = useState("");
  const [matVideoUrl, setMatVideoUrl] = useState("");
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matUploading, setMatUploading] = useState(false);
  const [matError, setMatError] = useState<string | null>(null);
  const [materialFilterTopic, setMaterialFilterTopic] = useState<string>("all");
  const [materialFilterType, setMaterialFilterType] = useState<string>("all");
  const [materialSearch, setMaterialSearch] = useState<string>("");
  const [previewNotebook, setPreviewNotebook] = useState<any | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ type: "image" | "video"; url: string; title: string } | null>(null);

  // 2. Announcement post
  const [announcementText, setAnnouncementText] = useState("");
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  // 3. Assignment Submit Modal
  const [submitModalAssignment, setSubmitModalAssignment] = useState<Assignment | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);

  // 4. Faculty Grade Modal
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(100);
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);

  // 5. Quiz Taking Modal
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResultReceipt, setQuizResultReceipt] = useState<any | null>(null);

  // 6. Coding Lab State
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);
  const [studentCode, setStudentCode] = useState<string>("# Write your Python solution here\nimport sys\n\ndef solve():\n    # Read input from standard input\n    data = sys.stdin.read().split()\n    if not data:\n        return\n    # Process data...\n    print(len(data))\n\nif __name__ == '__main__':\n    solve()\n");
  const [judgingCode, setJudgingCode] = useState(false);
  const [judgeOutcome, setJudgeOutcome] = useState<any | null>(null);

  // 7. Anonymous Feedback Submission
  const [fbCategory, setFbCategory] = useState("pacing");
  const [fbRating, setFbRating] = useState(5);
  const [fbText, setFbText] = useState("");
  const [submittingFb, setSubmittingFb] = useState(false);
  const [fbSuccessMsg, setFbSuccessMsg] = useState<string | null>(null);

  // 8. Forum New Thread & Reply
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicContent, setNewTopicContent] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // 9. AI Studio State
  const [aiDraftType, setAiDraftType] = useState("quiz_question");
  const [aiDraftPrompt, setAiDraftPrompt] = useState("");
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any | null>(null);

  // 10. Quicknow AI Course Chatbot State
  interface CourseChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    sources?: string[];
    model?: string;
    timestamp: string;
  }
  const [playgroundPrompt, setPlaygroundPrompt] = useState("");
  const [runningPlayground, setRunningPlayground] = useState(false);
  const [courseAiMessages, setCourseAiMessages] = useState<CourseChatMessage[]>([]); // Starts empty, no default fake response!
  const courseChatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    courseChatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [courseAiMessages, runningPlayground]);

  // Load course data
  const loadCourseData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [courseData, mats, anncs, assgns, qzs, cProblems] = await Promise.all([
        api.getCourseDetail(classId),
        api.getMaterials({ course_id: classId }).catch(() => []),
        api.getAnnouncements(classId).catch(() => []),
        api.getAssignments(classId).catch(() => []),
        api.getQuizzes(classId).catch(() => []),
        api.getCodingProblems(classId).catch(() => []),
      ]);

      setCourse(courseData);
      setMaterials(mats);
      setAnnouncements(anncs);
      setAssignments(assgns);
      setQuizzes(qzs);
      setCodingProblems(cProblems);
      if (cProblems.length > 0) {
        setSelectedProblem(cProblems[0]);
      }

      // Load participants & tab data
      api.getCourseParticipants(classId)
        .then(data => {
          setParticipants({
            instructor: data.instructor,
            students: data.students || [],
          });
        })
        .catch(() => {
          setParticipants(null);
        });

      api.getAttendanceSessions(classId).then(setAttendanceSessions).catch(() => {});
      api.getMyAttendanceSummary(classId).then((res: any) => {
        const myCourse = res?.courses?.find((c: any) => c.course_id === classId) || res?.courses?.[0];
        setStudentAttendanceSummary(myCourse || null);
      }).catch(() => {});

      const u = authStorage.getUser();
      if (u?.role === "instructor" || u?.role === "admin") {
        api.getAnonymousFeedback(classId).then(setAnonymousFeedbacks).catch(() => {});
      }

      api.getForumTopics(classId).then(setForumTopics).catch(() => {});
      api.getShorts(classId).then(setShorts).catch(() => {});
      api.getCourseLeaderboard(classId).then(setLeaderboardData).catch(() => {});
      api.getCourseGradebook(classId).then(setGradebookData).catch(() => {});
    } catch (err: any) {
      setError(err.message || "Failed to load course workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = authStorage.getUser();
    setCurrentUser(user);
    if (initialTab) {
      setActiveTab(initialTab);
    }
    if (classId) {
      loadCourseData();
    }
  }, [classId, initialTab]);

  const isInstructor = Boolean(
    currentUser?.role === "instructor" ||
    currentUser?.role === "admin" ||
    (currentUser && course && (currentUser.email === course.instructor?.email || currentUser.id === course.instructor?.id))
  );

  const handleCopyCode = () => {
    if (course?.join_code) {
      navigator.clipboard.writeText(course.join_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // 1. Material Actions
  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim()) return;

    if (matType === "link" && !matLinkUrl.trim()) {
      setMatError("Please provide a destination URL / link for this resource.");
      return;
    }

    if (matType === "video" && !matFile && !matVideoUrl.trim()) {
      setMatError("Please either upload a video file or enter a video stream/YouTube link.");
      return;
    }

    if (!matFile && !matLinkUrl.trim() && !matVideoUrl.trim() && matType !== "notes") {
      setMatError("Please attach a file or provide a link/video URL.");
      return;
    }

    setMatUploading(true);
    setMatError(null);

    try {
      const formData = new FormData();
      formData.append("course", classId);
      formData.append("title", matTitle.trim());
      formData.append("topic", matTopic.trim() || "General");
      formData.append("description", matDescription.trim());
      formData.append("material_type", matType);
      formData.append("is_published", "true");
      if (matLinkUrl.trim()) {
        formData.append("link_url", matLinkUrl.trim());
      }
      if (matVideoUrl.trim()) {
        formData.append("video_url", matVideoUrl.trim());
      }
      if (matFile) {
        formData.append("file", matFile);
      }

      await api.uploadMaterial(formData);
      setUploadModalOpen(false);
      setMatTitle("");
      setMatDescription("");
      setMatLinkUrl("");
      setMatVideoUrl("");
      setMatFile(null);
      setMatType("document");
      const refreshed = await api.getMaterials({ course_id: classId });
      setMaterials(refreshed);
    } catch (err: any) {
      setMatError(err.message || "Failed to upload material.");
    } finally {
      setMatUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("Are you sure you want to remove this resource from the course vault?")) return;
    try {
      await api.deleteMaterial(id);
      setMaterials(materials.filter(m => m.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete material.");
    }
  };

  const handleIndexMaterial = async (id: string) => {
    try {
      await api.indexMaterialRAG(id);
      setMaterials(materials.map(m => m.id === id ? { ...m, ai_indexed: true } : m));
    } catch (err: any) {
      alert(err.message || "Failed to trigger vector index.");
    }
  };

  // 2. Announcements
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    setPostingAnnouncement(true);
    try {
      const annc = await api.createAnnouncement(classId, {
        content: announcementText.trim(),
        is_pinned: false,
      });
      setAnnouncements([annc, ...announcements]);
      setAnnouncementText("");
    } catch (err: any) {
      alert(err.message || "Failed to publish announcement.");
    } finally {
      setPostingAnnouncement(false);
    }
  };

  // 3. Assignment Submission Action
  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitModalAssignment) return;

    setSubmittingWork(true);
    try {
      const res = await api.submitAssignment(submitModalAssignment.id, {
        content: submissionContent,
        file: submissionFile || undefined,
      });
      const receipt = res.data?.receipt_id || res.receipt_id || "SUB-OK";
      setLastReceipt(receipt);
      // Refresh assignments
      const refAssgns = await api.getAssignments(classId);
      setAssignments(refAssgns);
      const updated = refAssgns.find((a: Assignment) => a.id === submitModalAssignment.id);
      if (updated) {
        setSubmitModalAssignment(updated);
      }
      alert(`Assignment submitted successfully!\nOfficial Receipt: ${receipt}`);
    } catch (err: any) {
      alert(err.message || "Failed to submit assignment.");
    } finally {
      setSubmittingWork(false);
    }
  };

  const handleOpenAssignmentSubmissions = async (assignment: Assignment) => {
    setViewSubmissionsAssignment(assignment);
    setLoadingSubmissions(true);
    setSubmissionFilter("all");
    try {
      const data = await api.getAssignmentSubmissions(assignment.id);
      setAssignmentSubmissionsData(data.data || data);
    } catch (err: any) {
      alert(err.message || "Failed to load submissions.");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleOpenQuizAttempts = async (quiz: Quiz) => {
    setViewAttemptsQuiz(quiz);
    setLoadingAttempts(true);
    setAttemptFilter("all");
    try {
      const data = await api.getQuizAttempts(quiz.id);
      setQuizAttemptsData(data.data || data);
    } catch (err: any) {
      alert(err.message || "Failed to load quiz attempts.");
    } finally {
      setLoadingAttempts(false);
    }
  };

  const handleInlineGradeSubmit = async (submissionId: string) => {
    if (!submissionId) return;
    setSavingInlineGrade(true);
    try {
      await api.gradeSubmission(submissionId, inlineScore, inlineFeedback);
      setInlineGradingId(null);
      if (viewSubmissionsAssignment) {
        const data = await api.getAssignmentSubmissions(viewSubmissionsAssignment.id);
        setAssignmentSubmissionsData(data.data || data);
      }
      const refGb = await api.getCourseGradebook(classId);
      setGradebookData(refGb);
      alert("Grade and feedback saved successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to save grade.");
    } finally {
      setSavingInlineGrade(false);
    }
  };

  // 4. Grade Submission Action
  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmissionId) return;

    setSavingGrade(true);
    try {
      await api.gradeSubmission(gradingSubmissionId, gradeScore, gradeFeedback);
      setGradingSubmissionId(null);
      const refGb = await api.getCourseGradebook(classId);
      setGradebookData(refGb);
      alert("Grade and feedback saved successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to save grade.");
    } finally {
      setSavingGrade(false);
    }
  };

  // 5. Quiz Submission Action
  const handleQuizSubmit = async () => {
    if (!activeQuiz) return;
    setSubmittingQuiz(true);
    try {
      const res = await api.takeQuizAttempt(activeQuiz.id, quizAnswers);
      setQuizResultReceipt(res);
      const refQzs = await api.getQuizzes(classId);
      setQuizzes(refQzs);
    } catch (err: any) {
      alert(err.message || "Quiz submission failed.");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // 6. Coding Sandboxed Judge Action
  const handleJudgeCode = async () => {
    if (!selectedProblem) return;
    setJudgingCode(true);
    setJudgeOutcome(null);
    try {
      const res = await api.submitCodingProblem(selectedProblem.id, studentCode, "python");
      setJudgeOutcome(res);
    } catch (err: any) {
      alert(err.message || "Code execution failed.");
    } finally {
      setJudgingCode(false);
    }
  };

  // 7. Anonymous Feedback Submit
  const handleAnonymousFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbText.trim()) return;

    setSubmittingFb(true);
    try {
      await api.submitAnonymousFeedback(classId, fbCategory, fbRating, fbText.trim());
      setFbSuccessMsg("Your feedback has been recorded safely with mathematical server-side anonymity.");
      setFbText("");
      setTimeout(() => setFbSuccessMsg(null), 5000);
      if (isInstructor) {
        const refFb = await api.getAnonymousFeedback(classId);
        setAnonymousFeedbacks(refFb);
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit anonymous feedback.");
    } finally {
      setSubmittingFb(false);
    }
  };

  // 8. Forum New Topic & Reply
  const handleCreateForumTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !newTopicContent.trim()) return;
    setCreatingTopic(true);
    try {
      const created = await api.createForumTopic(classId, newTopicTitle.trim(), newTopicContent.trim());
      setForumTopics([created, ...forumTopics]);
      setNewTopicTitle("");
      setNewTopicContent("");
    } catch (err: any) {
      alert(err.message || "Failed to post discussion topic.");
    } finally {
      setCreatingTopic(false);
    }
  };

  const handleReplyForumTopic = async (topicId: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      await api.replyForumTopic(topicId, replyText.trim());
      const updated = await api.getForumTopicDetail(topicId);
      setSelectedTopic(updated);
      setReplyText("");
      const refTopics = await api.getForumTopics(classId);
      setForumTopics(refTopics);
    } catch (err: any) {
      alert(err.message || "Failed to reply to topic.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleAcceptAnswer = async (replyId: string) => {
    try {
      await api.acceptForumAnswer(replyId);
      if (selectedTopic) {
        const updated = await api.getForumTopicDetail(selectedTopic.id);
        setSelectedTopic(updated);
      }
      const refTopics = await api.getForumTopics(classId);
      setForumTopics(refTopics);
    } catch (err: any) {
      alert(err.message || "Failed to accept answer.");
    }
  };

  // 9. AI Studio Generate Draft
  const handleGenerateAIDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiDraftPrompt.trim()) return;
    setGeneratingDraft(true);
    try {
      const draft = await api.generateAIDraft(classId, aiDraftType, aiDraftPrompt.trim());
      setAiDrafts([draft, ...aiDrafts]);
      setSelectedDraft(draft);
      setAiDraftPrompt("");
    } catch (err: any) {
      alert(err.message || "AI draft generation failed.");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleApproveAIDraft = async (draftId: string) => {
    try {
      await api.updateAIDraft(draftId, { is_approved: true });
      await api.publishAIDraft(draftId);
      alert("Draft approved by faculty and converted into live course resource!");
      loadCourseData();
    } catch (err: any) {
      alert(err.message || "Approval failed.");
    }
  };

  // 10. Quicknow AI Runner
  const handleRunPlayground = async (e: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToRun = customQuery || playgroundPrompt;
    if (!queryToRun.trim()) return;

    const userMessage: CourseChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: queryToRun.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setCourseAiMessages((prev) => [...prev, userMessage]);
    if (!customQuery) setPlaygroundPrompt("");
    setRunningPlayground(true);

    try {
      const res = await askQuicknowAI(queryToRun.trim(), {
        user: currentUser ? {
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          role: currentUser.role,
          email: currentUser.email,
        } : undefined,
        courses: course ? [course] : [],
        materials: materials,
        assignments: assignments,
        attendance: attendanceSessions.length > 0 ? {
          total_sessions: attendanceSessions.length,
          attended_sessions: attendanceSessions.length,
          overall_percentage: 100,
          status: "Active",
        } : undefined,
        role: isInstructor ? "instructor" : "student",
      });

      const botMessage: CourseChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: res.text,
        sources: res.sources,
        model: res.model || "Gemini Flash-Lite (via Quicknow AI)",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setCourseAiMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const botError: CourseChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: "assistant",
        text: `⚠️ **Unable to process query**: ${err.message || "Failed to contact Quicknow AI"}.\n\nPlease check your Gemini API key or connection.`,
        sources: ["Quicknow AI System"],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setCourseAiMessages((prev) => [...prev, botError]);
    } finally {
      setRunningPlayground(false);
    }
  };

  const isStudentLateEntry = (st: any, dateStr: string) => {
    if (!st?.enrolled_at) return false;
    try {
      const enrollDate = new Date(st.enrolled_at).toISOString().split("T")[0];
      return enrollDate > dateStr;
    } catch {
      return false;
    }
  };

  const eligibleStudentsForDate = (participants?.students || []).filter(
    (st) => !isStudentLateEntry(st, attendanceDate)
  );
  const lateStudentsForDate = (participants?.students || []).filter(
    (st) => isStudentLateEntry(st, attendanceDate)
  );
  const presentCountForDate = eligibleStudentsForDate.filter(
    (st) => (attendanceStatusMap[st.id] || "present") === "present"
  ).length;
  const absentCountForDate = eligibleStudentsForDate.filter(
    (st) => attendanceStatusMap[st.id] === "absent"
  ).length;
  const realTimeTurnoutPct = eligibleStudentsForDate.length > 0
    ? Math.round((presentCountForDate / eligibleStudentsForDate.length) * 100)
    : 100;

  const handleSetStudentStatus = (studentId: string, statusVal: "present" | "absent") => {
    setAttendanceStatusMap((prev) => ({
      ...prev,
      [studentId]: statusVal,
    }));
  };

  const markAllStudentsPresent = () => {
    const newMap: Record<string, "present" | "absent"> = {};
    eligibleStudentsForDate.forEach((st) => {
      newMap[st.id] = "present";
    });
    setAttendanceStatusMap((prev) => ({ ...prev, ...newMap }));
  };

  const markAllStudentsAbsent = () => {
    const newMap: Record<string, "present" | "absent"> = {};
    eligibleStudentsForDate.forEach((st) => {
      newMap[st.id] = "absent";
    });
    setAttendanceStatusMap((prev) => ({ ...prev, ...newMap }));
  };

  const handleSaveAttendance = async () => {
    if (!classId) return;
    setSavingAttendance(true);
    setAttendanceSuccessMsg(null);
    setAttendanceErrorMsg(null);

    const enrolledStudents = participants?.students || [];
    if (enrolledStudents.length === 0) {
      setAttendanceErrorMsg("No students currently enrolled to mark attendance.");
      setSavingAttendance(false);
      return;
    }

    try {
      const sessionRes: any = await api.createAttendanceSession({
        course: classId,
        date: attendanceDate,
        topic: attendanceTopic.trim() || `Lecture Session - ${attendanceDate}`,
      });
      const session = sessionRes?.id ? sessionRes : (sessionRes?.data || sessionRes);

      const records = eligibleStudentsForDate.map((st) => ({
        student_id: st.id,
        status: attendanceStatusMap[st.id] || "present",
        remarks: attendanceRemarksMap[st.id] || "",
      }));

      if (session?.id && records.length > 0) {
        await api.submitAttendanceRollCall(session.id, records);
      }

      const refSessions = await api.getAttendanceSessions(classId).catch(() => []);
      setAttendanceSessions(refSessions);

      // Refresh student summary as well if loaded
      api.getMyAttendanceSummary(classId).then((res: any) => {
        const myCourse = res?.courses?.find((c: any) => c.course_id === classId) || res?.courses?.[0];
        setStudentAttendanceSummary(myCourse || null);
      }).catch(() => {});

      setAttendanceSuccessMsg(
        `Attendance recorded and saved for ${attendanceDate}! (${presentCountForDate} Present, ${absentCountForDate} Absent, ${lateStudentsForDate.length} Late Entries)`
      );
      setTimeout(() => setAttendanceSuccessMsg(null), 6000);
    } catch (err: any) {
      setAttendanceErrorMsg(err.message || "Failed to save attendance.");
      setTimeout(() => setAttendanceErrorMsg(null), 6000);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSelectPastSession = (s: any) => {
    setAttendanceDate(s.date);
    setAttendanceTopic(s.topic || "");
    const newStatus: Record<string, "present" | "absent"> = {};
    const newRemarks: Record<string, string> = {};
    if (s.records && Array.isArray(s.records)) {
      s.records.forEach((r: any) => {
        const sid = r.student?.id || r.student_id;
        if (sid) {
          newStatus[sid] = r.status === "absent" ? "absent" : "present";
          if (r.remarks) newRemarks[sid] = r.remarks;
        }
      });
    }
    setAttendanceStatusMap(newStatus);
    setAttendanceRemarksMap(newRemarks);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignTitle.trim()) return;
    setCreatingAssignment(true);
    try {
      if (newAssignAttachment) {
        const formData = new FormData();
        formData.append("course", classId);
        formData.append("title", newAssignTitle.trim());
        formData.append("description", newAssignDesc.trim());
        formData.append("assessment_type", newAssignType);
        formData.append("submission_format", newAssignFormat);
        if (newAssignDueDate) {
          formData.append("due_date", new Date(newAssignDueDate).toISOString());
        }
        formData.append("max_score", String(Number(newAssignMaxScore) || 100));
        formData.append("status", "published");
        formData.append("is_published", "true");
        formData.append("attachment", newAssignAttachment);
        await api.createAssignment(formData);
      } else {
        await api.createAssignment({
          course: classId,
          title: newAssignTitle.trim(),
          description: newAssignDesc.trim(),
          assessment_type: newAssignType as any,
          submission_format: newAssignFormat as any,
          due_date: newAssignDueDate ? new Date(newAssignDueDate).toISOString() : undefined,
          max_score: Number(newAssignMaxScore) || 100,
          status: "published" as any,
          is_published: true,
        });
      }
      setCreateAssignmentModalOpen(false);
      setNewAssignTitle("");
      setNewAssignDesc("");
      setNewAssignDueDate("");
      setNewAssignMaxScore(100);
      setNewAssignAttachment(null);
      const refAssgns = await api.getAssignments(classId);
      setAssignments(refAssgns);
    } catch (err: any) {
      alert(err.message || "Failed to create assignment.");
    } finally {
      setCreatingAssignment(false);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) return;
    setCreatingQuiz(true);
    try {
      const validQuestions = newQuizQuestions
        .filter((q) => q.question_text.trim())
        .map((q, idx) => ({
          question_text: q.question_text.trim(),
          question_type: "mcq",
          options: q.options.filter((o) => o.trim()),
          correct_answer: q.correct_answer || q.options[0] || "",
          marks: Number(q.marks) || 5,
          order: idx,
        }));

      await api.createQuiz({
        course: classId,
        title: newQuizTitle.trim(),
        description: newQuizDesc.trim(),
        duration_minutes: Number(newQuizDuration) || 30,
        due_date: newQuizDue ? new Date(newQuizDue).toISOString() : undefined,
        release_results: newQuizReleaseResults,
        is_published: true,
        questions: validQuestions,
      });
      setCreateQuizModalOpen(false);
      setNewQuizTitle("");
      setNewQuizDesc("");
      setNewQuizDuration(30);
      setNewQuizDue("");
      setNewQuizQuestions([
        {
          question_text: "",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correct_answer: "Option A",
          marks: 5,
        },
      ]);
      const refQzs = await api.getQuizzes(classId);
      setQuizzes(refQzs);
    } catch (err: any) {
      alert(err.message || "Failed to create quiz.");
    } finally {
      setCreatingQuiz(false);
    }
  };

  const handleAddQuestion = () => {
    setNewQuizQuestions((prev) => [
      ...prev,
      {
        question_text: "",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct_answer: "Option A",
        marks: 5,
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setNewQuizQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx: number, field: string, val: any) => {
    setNewQuizQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: val } : q))
    );
  };

  const handleOptionChange = (qIdx: number, optIdx: number, val: string) => {
    setNewQuizQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOpts = [...q.options];
        const oldVal = newOpts[optIdx];
        newOpts[optIdx] = val;
        const newCorrect = q.correct_answer === oldVal ? val : q.correct_answer;
        return { ...q, options: newOpts, correct_answer: newCorrect };
      })
    );
  };

  // Filtered Students for Attendance Roster
  const filteredStudents = (participants?.students || []).filter((st: any) => {
    const isPresent = (attendanceStatusMap[st.id] || "present") === "present";
    if (attendanceFilter === "present" && !isPresent) return false;
    if (attendanceFilter === "absent" && isPresent) return false;
    if (attendanceSearchQuery.trim()) {
      const q = attendanceSearchQuery.toLowerCase();
      const name = `${st.first_name || ""} ${st.last_name || ""}`.toLowerCase();
      const roll = (st.institution_id || "").toLowerCase();
      const branch = (st.department || "").toLowerCase();
      return name.includes(q) || roll.includes(q) || branch.includes(q);
    }
    return true;
  });

  // Tabs list with Stream and Material appearing first
  const tabs: { id: string; label: string; icon: any; count?: number; badge?: string }[] = isInstructor
    ? [
        { id: "stream", label: "Stream", icon: MessageSquare },
        { id: "material", label: "Material", icon: FileText, count: materials.length },
        { id: "assignments", label: "Assignments", icon: CheckSquare, count: assignments.length },
        { id: "quizzes", label: "Quizzes", icon: Clock, count: quizzes.length },
        { id: "attendance", label: "Take Attendance", icon: UserCheck, count: participants?.students?.length },
        { id: "feedback", label: "Anonymous Feedback", icon: HelpCircle },
        { id: "leaderboard", label: "Leaderboard", icon: Trophy },
        { id: "ai_playground", label: "Quicknow AI", icon: Bot },
        { id: "people", label: "People", icon: Users, count: participants?.students?.length },
      ]
    : [
        { id: "stream", label: "Stream", icon: MessageSquare },
        { id: "material", label: "Material", icon: FileText, count: materials.length },
        { id: "assignments", label: "Assignments", icon: CheckSquare, count: assignments.length },
        { id: "quizzes", label: "Quizzes", icon: Clock, count: quizzes.length },
        { id: "attendance", label: "Attendance", icon: UserCheck },
        { id: "feedback", label: "Anonymous Feedback", icon: HelpCircle },
        { id: "leaderboard", label: "Leaderboard", icon: Trophy },
        { id: "ai_playground", label: "Quicknow AI", icon: Bot },
        { id: "people", label: "People", icon: Users, count: participants?.students?.length },
      ];

  if (loading) {
    return (
      <DashboardShell role={isInstructor ? "instructor" : "student"} title="Loading Classroom...">
        <div className="py-24 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Connecting to course workspace...
          </p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !course) {
    return (
      <DashboardShell role={isInstructor ? "instructor" : "student"} title="Error">
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Failed to Load Classroom</h2>
          <p className="text-xs text-slate-500 mt-1">{error || "Course does not exist or access is forbidden."}</p>
          <Link
            href="/classes"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Classes
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const distinctTopics = Array.from(new Set(materials.map(m => m.topic).filter(Boolean)));
  const filteredMaterials = materials.filter(m => {
    if (materialFilterTopic !== "all" && m.topic !== materialFilterTopic) return false;
    if (materialFilterType !== "all") {
      if (materialFilterType === "document") {
        if (!["document", "syllabus", "lab_manual"].includes(m.material_type)) return false;
      } else if (m.material_type !== materialFilterType) {
        return false;
      }
    }
    if (materialSearch.trim()) {
      const q = materialSearch.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.topic && m.topic.toLowerCase().includes(q)) ||
        (m.file_name && m.file_name.toLowerCase().includes(q)) ||
        (m.link_url && m.link_url.toLowerCase().includes(q)) ||
        (m.video_url && m.video_url.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <DashboardShell role={isInstructor ? "instructor" : "student"} title={course.code}>
      {/* Back button & quick navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/classes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Classes
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            Academic Term: {course.semester}
          </span>
        </div>
      </div>

      {/* Classroom Hero Card matching Image 2 */}
      <div 
        className="rounded-2xl p-5 sm:p-6 text-white shadow-sm"
        style={{
          backgroundColor: course.cover_color || '#059669',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {course.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-white/90 font-medium">
                {course.section} · {course.code}
              </span>
              {course.join_code && (
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-white text-[11px] font-mono font-semibold backdrop-blur-xs transition"
                  title="Click to copy class join code for students"
                >
                  <KeyRound className="w-3 h-3" />
                  Join Code: {course.join_code}
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3 opacity-80" />}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-white/85">
              <span>{course.instructor?.first_name ? `${course.instructor.first_name} ${course.instructor.last_name || ""}`.trim() : "Faculty"}</span>
              <span>·</span>
              <span>{materials.length} items</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isInstructor && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("material");
                  setUploadModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-slate-900 hover:bg-white/90 text-xs font-bold shadow-sm transition"
              >
                <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                Upload Material
              </button>
            )}
            <button
              onClick={() => setActiveTab("people")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-xs transition"
            >
              <Users className="w-3.5 h-3.5" />
              People · {participants?.students.length || 59}
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-xs transition"
            >
              <Trophy className="w-3.5 h-3.5" />
              Leaderboard
            </button>
            <button
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs backdrop-blur-xs transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Attendance strip banner matching Image 2 */}
      <div 
        onClick={() => setActiveTab("attendance")}
        className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] text-xs font-medium text-slate-600 dark:text-slate-400 shadow-xs cursor-pointer hover:border-emerald-500/50 transition"
      >
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-500" />
          <span>
            <strong className="text-slate-800 dark:text-slate-200">Attendance:</strong>{" "}
            {attendanceSessions.length > 0
              ? `${attendanceSessions.length} roll-call session(s) recorded`
              : "No attendance recorded yet for this subject"}
          </span>
        </div>
        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          {isInstructor ? "Take Attendance →" : "View Attendance →"}
        </span>
      </div>

      {/* Tabs Navigation Bar matching Image 2 */}
      <div className="border-b border-slate-200 dark:border-[#262832] overflow-x-auto no-scrollbar">
        <nav className="flex space-x-2 min-w-max pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold transition border-b-2 -mb-[2px] whitespace-nowrap ${
                  isActive
                    ? "border-sky-500 text-sky-600 dark:text-sky-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive
                        ? "bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.2 text-[9px] font-bold rounded uppercase bg-amber-400/20 text-amber-500 border border-amber-400/30">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB CONTENT: 1. STREAM & ANNOUNCEMENTS */}
      {activeTab === "stream" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {isInstructor && (
              <form 
                onSubmit={handlePostAnnouncement}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                    {currentUser?.first_name?.[0] || "F"}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Announce something to your classroom stream
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Share updates, exam notices, or lab milestones..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Generates instant stream notification for all enrolled students
                  </span>
                  <button
                    type="submit"
                    disabled={postingAnnouncement || !announcementText.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    {postingAnnouncement ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Post Announcement
                  </button>
                </div>
              </form>
            )}

            {announcements.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
                <MessageSquare className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No announcements yet
                </p>
                <p className="text-[11px] text-slate-500">
                  Course notices and faculty posts will appear here.
                </p>
              </div>
            ) : (
              announcements.map((annc) => (
                <div 
                  key={annc.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                        {annc.author?.first_name?.[0] || "P"}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block leading-none">
                          {annc.author?.first_name} {annc.author?.last_name}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block leading-none">
                          {new Date(annc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {annc.is_pinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                  </div>
                  {annc.title && (
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                      {annc.title}
                    </h4>
                  )}
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {annc.content}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Right Sidebar: Upcoming Deadlines & Attendance Status */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Upcoming Deadlines
              </h3>
              {assignments.length === 0 ? (
                <p className="text-xs text-slate-500">No active assignment deadlines.</p>
              ) : (
                <div className="space-y-3">
                  {assignments.slice(0, 3).map((a) => (
                    <div key={a.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {a.title}
                      </span>
                      <span className="text-[11px] text-amber-600 font-medium block mt-0.5">
                        Due {a.due_date ? new Date(a.due_date).toLocaleDateString() : "TBA"} • {a.max_score} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                Attendance Status
              </h3>
              <p className="text-xl font-bold text-emerald-600">93.8%</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Audited records established. Good institutional academic standing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. MATERIAL */}
      {activeTab === "material" && (
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  placeholder="Search resources, documents, links, videos..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Topic Filter */}
              {distinctTopics.length > 0 && (
                <select
                  value={materialFilterTopic}
                  onChange={(e) => setMaterialFilterTopic(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">All Topics & Units</option>
                  {distinctTopics.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}

              {/* Type Filter */}
              <select
                value={materialFilterType}
                onChange={(e) => setMaterialFilterType(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Types (All Files & Links)</option>
                <option value="document">Documents (PDF, Word, PPT, Excel, Text)</option>
                <option value="video">Videos & Lectures</option>
                <option value="image">Images & Diagrams</option>
                <option value="link">Web Links & Resources</option>
                <option value="slides">Lecture Slides</option>
                <option value="notes">Notes</option>
                <option value="notebook">Jupyter Notebooks (.ipynb)</option>
              </select>
            </div>

            {isInstructor && (
              <button
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                Share Material (Links, Video, Image, Docs)
              </button>
            )}
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 space-y-2">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-1" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No materials found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isInstructor
                  ? "Share links, upload video lectures, images, slides, or documents for your enrolled students."
                  : "Your instructor has not shared any materials for this category yet."}
              </p>
              {isInstructor && (
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Material
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMaterials.map((mat) => {
                const isVideo = mat.material_type === "video" || !!mat.video_url || mat.file_type?.startsWith("video/") || mat.file_name?.match(/\.(mp4|webm|mov|mkv)$/i);
                const isImage = mat.material_type === "image" || mat.file_type?.startsWith("image/") || mat.file_name?.match(/\.(png|jpe?g|webp|gif|svg)$/i);
                const isLink = mat.material_type === "link" || !!mat.link_url;

                return (
                  <div
                    key={mat.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div>
                      {/* Top Header: Topic + Type Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            {mat.topic}
                          </span>
                          {/* Type Badge */}
                          {isVideo ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              <Video className="w-3 h-3" /> Video
                            </span>
                          ) : isImage ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <ImageIcon className="w-3 h-3" /> Image
                            </span>
                          ) : isLink ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              <Link2 className="w-3 h-3" /> Web Link
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                              <FileText className="w-3 h-3" /> {mat.material_type.replace("_", " ")}
                            </span>
                          )}
                        </div>

                        {mat.ai_indexed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                            <Sparkles className="w-3 h-3" /> Indexed in RAG
                          </span>
                        ) : (
                          isInstructor && (
                            <button
                              onClick={() => handleIndexMaterial(mat.id)}
                              className="text-[10px] font-semibold text-indigo-600 hover:underline"
                            >
                              + Index for AI
                            </button>
                          )
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2.5">
                        {mat.title}
                      </h4>
                      {mat.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {mat.description}
                        </p>
                      )}

                      {/* Image Preview Thumbnail */}
                      {isImage && mat.file_url && (
                        <div
                          onClick={() => setPreviewMedia({ type: "image", url: mat.file_url!, title: mat.title })}
                          className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-40 bg-slate-100 dark:bg-slate-800 cursor-pointer group"
                        >
                          <img
                            src={mat.file_url}
                            alt={mat.title}
                            className="w-full h-36 object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
                            <Eye className="w-4 h-4" /> Click to enlarge
                          </div>
                        </div>
                      )}

                      {/* Video Player / Stream Thumbnail Banner */}
                      {isVideo && (
                        <div
                          onClick={() => setPreviewMedia({ type: "video", url: (mat.video_url || mat.file_url)!, title: mat.title })}
                          className="mt-3 p-4 rounded-xl bg-gradient-to-r from-purple-900/10 to-indigo-900/10 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-900/50 flex items-center justify-between cursor-pointer hover:border-purple-400 transition group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-purple-600 group-hover:scale-110 text-white flex items-center justify-center shadow-md transition">
                              <Play className="w-4 h-4 ml-0.5" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                {mat.video_url ? "Online Video Lecture" : "Attached Video Lecture"}
                              </span>
                              <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium truncate block max-w-xs">
                                {mat.video_url || mat.file_name}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 group-hover:translate-x-1 transition">
                            Watch →
                          </span>
                        </div>
                      )}

                      {/* Web Link Preview Card */}
                      {isLink && mat.link_url && (
                        <a
                          href={mat.link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 flex items-center justify-between hover:border-sky-400 transition block text-xs group"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Link2 className="w-4 h-4 text-sky-600 shrink-0" />
                            <span className="text-sky-700 dark:text-sky-300 font-medium truncate">
                              {mat.link_url}
                            </span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-sky-500 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                        </a>
                      )}

                      {/* File Details */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        {mat.file_name && (
                          <>
                            <span className="font-medium text-slate-500 dark:text-slate-400">{mat.file_name}</span>
                            <span>•</span>
                          </>
                        )}
                        {mat.file_size > 0 && (
                          <>
                            <span>{Math.round(mat.file_size / 1024)} KB</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{new Date(mat.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium capitalize">
                        {mat.material_type.replace("_", " ")}
                      </span>

                      <div className="flex items-center gap-2">
                        {isInstructor && (
                          <button
                            onClick={() => handleDeleteMaterial(mat.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                            title="Delete Material"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {mat.notebook_content && (
                          <button
                            onClick={() => setPreviewNotebook(mat)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 transition"
                          >
                            <BookOpen className="w-3.5 h-3.5" /> Preview Notebook
                          </button>
                        )}

                        {/* Video Watch Button */}
                        {isVideo && (mat.video_url || mat.file_url) && (
                          <button
                            onClick={() => setPreviewMedia({ type: "video", url: (mat.video_url || mat.file_url)!, title: mat.title })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition"
                          >
                            <Play className="w-3.5 h-3.5" /> Watch Video
                          </button>
                        )}

                        {/* Image View Button */}
                        {isImage && (mat.file_url || mat.link_url) && (
                          <button
                            onClick={() => setPreviewMedia({ type: "image", url: (mat.file_url || mat.link_url)!, title: mat.title })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Image
                          </button>
                        )}

                        {/* Link Open Button */}
                        {mat.link_url && (
                          <a
                            href={mat.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 text-xs font-semibold border border-sky-200 dark:border-sky-800 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open Link
                          </a>
                        )}

                        {/* Document / File Download or View Button */}
                        {mat.file_url && !isVideo && !isImage && (
                          <a
                            href={mat.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-xs font-semibold text-slate-800 dark:text-slate-200 transition"
                          >
                            <Download className="w-3.5 h-3.5" /> View / Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 3. ASSIGNMENTS & SUBMISSIONS */}
      {/* TAB CONTENT: 3. ASSIGNMENTS */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Assignments & Problem Sets
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Coursework submissions, lab projects, and assessment milestones.
              </p>
            </div>
            {isInstructor && (
              <button
                type="button"
                onClick={() => setCreateAssignmentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Create Assignment
              </button>
            )}
          </div>
          {assignments.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <CheckSquare className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-500">No assignments currently scheduled for this module.</p>
              {isInstructor && (
                <button
                  type="button"
                  onClick={() => setCreateAssignmentModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Create First Assignment
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map(a => (
                <div key={a.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      {a.assessment_type}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">{a.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-xl">{a.description}</p>
                    
                    {(a.attachment_url || a.attachment) && (
                      <div className="mt-2.5">
                        <a
                          href={a.attachment_url || (a.attachment as string)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-semibold border border-blue-200 dark:border-blue-800 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Assignment File {a.attachment_name ? `(${a.attachment_name})` : ""}
                        </a>
                      </div>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-amber-600 font-semibold">
                        Due: {a.due_date ? new Date(a.due_date).toLocaleString() : "TBA"} • {a.max_score} Total Points
                      </span>
                      {a.my_submission && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                          <Check className="w-3 h-3" /> Receipt: {a.my_submission.receipt_id}
                          {a.my_submission.is_late && <span className="text-amber-600 ml-1 font-semibold">⏰ Late</span>}
                          {a.my_submission.score !== null && a.my_submission.score !== undefined && ` (${a.my_submission.score} pts)`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    {!isInstructor ? (
                      <button
                        onClick={() => {
                          setSubmitModalAssignment(a);
                          setSubmissionContent(a.my_submission?.content || "");
                          setSubmissionFile(null);
                          setLastReceipt(a.my_submission?.receipt_id || null);
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shrink-0"
                      >
                        {a.my_submission ? "View / Update Submission" : "Submit Coursework"}
                      </button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAssignmentSubmissions(a)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Check Student Submissions
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("grades")}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          Gradebook
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 4. QUIZZES */}
      {activeTab === "quizzes" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Classroom Quizzes & Timed Assessments
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated grading for MCQ & True/False with answer integrity protection.
              </p>
            </div>
            {isInstructor && (
              <button
                type="button"
                onClick={() => setCreateQuizModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Create Quiz
              </button>
            )}
          </div>
          {quizzes.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-500">No quizzes scheduled currently.</p>
              {isInstructor && (
                <button
                  type="button"
                  onClick={() => setCreateQuizModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                >
                  Create First Quiz
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map(q => (
                <div key={q.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {q.duration_minutes ? `${q.duration_minutes} Mins Timer` : "Untimed"}
                      </span>
                      {q.release_results && (
                        <span className="text-[10px] text-emerald-600 font-semibold">Results Released</span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2">{q.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{q.description}</p>
                    <div className="mt-3 text-xs text-slate-400">
                      <span>Max Attempts: {q.max_attempts}</span> • <span>Questions: {q.questions_count}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {isInstructor ? (
                        <span className="text-purple-600 dark:text-purple-400 font-bold">Faculty Assessment</span>
                      ) : (
                        q.my_attempt ? `Score: ${q.my_attempt.score}/${q.my_attempt.max_score}` : "Not Attempted"
                      )}
                    </span>
                    {!isInstructor ? (
                      <button
                        onClick={() => {
                          setActiveQuiz(q);
                          setQuizAnswers({});
                          setQuizResultReceipt(null);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition"
                      >
                        {q.my_attempt ? "Retake Quiz" : "Start Quiz"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenQuizAttempts(q)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Check Student Attempts
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 5. CODING LABS (REMOVED) */}
      {false && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Coding Challenges ({codingProblems.length})
            </h3>
            {codingProblems.map(cp => (
              <div
                key={cp.id}
                onClick={() => setSelectedProblem(cp)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  selectedProblem?.id === cp.id
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-600">
                    {cp.difficulty}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">{cp.max_score} pts</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cp.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-1 mt-1">{cp.description}</p>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {selectedProblem ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedProblem?.title}
                  </h3>
                  <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {selectedProblem?.description}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Sample Input</span>
                    <pre className="text-slate-800 dark:text-slate-200">{selectedProblem?.sample_input || "(None)"}</pre>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Expected Output</span>
                    <pre className="text-slate-800 dark:text-slate-200">{selectedProblem?.sample_output || "(None)"}</pre>
                  </div>
                </div>

                {/* Code Editor Area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-purple-600" /> Python 3 Sandboxed Environment
                    </span>
                    <span className="text-[11px] text-slate-400">Strict CPU & memory timeout active</span>
                  </div>
                  <textarea
                    rows={10}
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    className="w-full p-4 font-mono text-xs rounded-xl bg-slate-950 text-emerald-400 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Evaluates sample test cases and hidden test cases
                  </span>
                  <button
                    onClick={handleJudgeCode}
                    disabled={judgingCode}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
                  >
                    {judgingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Run & Submit Tests
                  </button>
                </div>

                {/* Evaluation Result Banner */}
                {judgeOutcome && (
                  <div className={`p-4 rounded-xl border text-xs ${
                    judgeOutcome.outcome === "accepted"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                      : "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200"
                  }`}>
                    <div className="flex items-center justify-between font-bold text-sm mb-1">
                      <span>Outcome: {judgeOutcome.outcome?.toUpperCase()}</span>
                      <span>Passed: {judgeOutcome.passed_tests} / {judgeOutcome.total_tests} Tests ({judgeOutcome.score} pts)</span>
                    </div>
                    <p className="text-[11px] opacity-80 mb-2">Execution time: {judgeOutcome.execution_time_ms} ms</p>
                    {judgeOutcome.output_log && (
                      <pre className="p-2 rounded bg-black/20 font-mono text-[11px] whitespace-pre-wrap">{judgeOutcome.output_log}</pre>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Select a problem to begin coding.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 6. GRADES & CONSOLIDATED GRADEBOOK (REMOVED) */}
      {false && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isInstructor ? "Consolidated Classroom Gradebook Matrix" : "My Graded Coursework & Progress"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isInstructor ? "View all student submissions, enter marks, and identify missing coursework." : "Review verified marks and teacher feedback."}
              </p>
            </div>
          </div>

          {isInstructor && gradebookData ? (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Institution ID</th>
                    {gradebookData.assignments?.map((a: any) => (
                      <th key={a.id} className="p-3 text-center">{a.title} ({a.max_score})</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {gradebookData.matrix?.map((st: any) => (
                    <tr key={st.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{st.name}</td>
                      <td className="p-3 font-mono text-slate-500">{st.institution_id || st.email}</td>
                      {st.assignments?.map((item: any) => (
                        <td key={item.assignment_id} className="p-3 text-center">
                          {item.submission_id ? (
                            <button
                              onClick={() => {
                                setGradingSubmissionId(item.submission_id);
                                setGradeScore(item.score !== null ? item.score : item.max_score);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold hover:underline"
                            >
                              {item.score !== null ? `${item.score} pts` : "Grade"}
                            </button>
                          ) : (
                            <span className="text-amber-500 font-semibold">Missing</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map(a => (
                <div key={a.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{a.title}</h4>
                    <p className="text-slate-500 mt-0.5">Max Score: {a.max_score} pts</p>
                    {a.my_submission?.feedback && (
                      <p className="text-purple-600 mt-1 italic font-medium">Faculty Feedback: &quot;{a.my_submission.feedback}&quot;</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-blue-600">
                      {a.my_submission?.score !== null && a.my_submission?.score !== undefined ? `${a.my_submission.score} / ${a.max_score}` : "Pending Evaluation"}
                    </span>
                    <span className="block text-[10px] text-slate-400 capitalize">{a.my_submission?.status || "Not submitted"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 7. TUTORIALS & NOTEBOOKS (REMOVED) */}
      {false && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Guided Tutorials & Jupyter Notebooks (.ipynb)
          </h3>
          <p className="text-xs text-slate-500">
            Interactive notebook walkthroughs with code explanations and worked examples.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.filter(m => m.material_type === "notebook" || m.notebook_content).map(nb => (
              <div key={nb.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center gap-2 text-purple-600 font-bold text-xs">
                  <Terminal className="w-4 h-4" /> Jupyter Notebook
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{nb.title}</h4>
                <p className="text-xs text-slate-500">{nb.description}</p>
                <button
                  onClick={() => setPreviewNotebook(nb)}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition"
                >
                  Open Notebook Viewer
                </button>
              </div>
            ))}
          </div>

          {/* Interactive Notebook Preview Modal */}
          {previewNotebook && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <div className="relative w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-600" /> {previewNotebook.title}
                  </h3>
                  <button onClick={() => setPreviewNotebook(null)} className="text-slate-400 font-bold">✕</button>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  {previewNotebook.notebook_content?.cells ? (
                    previewNotebook.notebook_content.cells.map((cell: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                        <span className="text-[10px] text-slate-400 block font-sans font-bold uppercase mb-1">
                          [{cell.cell_type}] Cell {idx + 1}
                        </span>
                        <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{cell.source}</pre>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">Notebook structure rendered safely.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 8. FORUM & SHORTS (REMOVED) */}
      {false && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Course Discussion Forum
              </h3>
            </div>

            {/* Create Topic Form */}
            <form onSubmit={handleCreateForumTopic} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Ask a Question / Start Topic</span>
              <input
                type="text"
                placeholder="Topic Title (e.g. Question on Election Timers)"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <textarea
                rows={2}
                placeholder="Describe what you are wondering about or need help with..."
                value={newTopicContent}
                onChange={(e) => setNewTopicContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs resize-none"
              />
              <div className="text-right">
                <button
                  type="submit"
                  disabled={creatingTopic || !newTopicTitle.trim()}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingTopic ? "Posting..." : "Post Question"}
                </button>
              </div>
            </form>

            {/* Topics List */}
            {forumTopics.map(t => (
              <div key={t.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t.title}</h4>
                  {t.is_resolved && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">Resolved</span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{t.content}</p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Author: {t.author?.first_name} {t.author?.last_name}</span>
                  <button
                    onClick={() => setSelectedTopic(t)}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    View Replies ({t.replies_count || 0})
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Right Sidebar: Shorts / Classroom Quick Polls */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Shorts & Quick Polls
            </h3>
            {shorts.map(s => (
              <div key={s.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
                <span className="text-[10px] uppercase font-bold text-purple-600">{s.title}</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{s.prompt}</p>
                <div className="space-y-1.5">
                  {s.options?.map((opt: string) => (
                    <button
                      key={opt}
                      onClick={async () => {
                        await api.respondShort(s.id, opt);
                        const refShorts = await api.getShorts(classId);
                        setShorts(refShorts);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left border transition ${
                        s.my_response === opt
                          ? "bg-purple-50 dark:bg-purple-950 border-purple-500 text-purple-700 dark:text-purple-300 font-bold"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      {opt} {s.response_stats?.[opt] !== undefined && `(${s.response_stats[opt]} votes)`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 9. ANONYMOUS FEEDBACK */}
      {activeTab === "feedback" && (
        <div className="max-w-3xl mx-auto space-y-6">
          {isInstructor ? (
            /* INSTRUCTOR VIEW: Received Student Feedback Inbox */
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-indigo-600" />
                    Student Anonymous Feedback Inbox
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Direct feedback from students with server-side identity protection. Instructors receive feedback and cannot submit.
                  </p>
                </div>

                <div className="flex items-center gap-3 self-stretch sm:self-auto">
                  <div className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center min-w-[100px]">
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Avg Rating</span>
                    <span className="text-base font-extrabold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      {anonymousFeedbacks?.average_rating !== undefined ? anonymousFeedbacks.average_rating : "5.0"}
                    </span>
                  </div>
                  <div className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center min-w-[100px]">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">Reviews</span>
                    <span className="text-base font-extrabold text-indigo-700 dark:text-indigo-300">
                      {anonymousFeedbacks?.total_submissions || anonymousFeedbacks?.feedbacks?.length || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Feedbacks List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Feedback Submissions
                  </h4>
                  <span className="text-xs text-slate-400">
                    {anonymousFeedbacks?.feedbacks?.length || 0} Total Received
                  </span>
                </div>

                {!anonymousFeedbacks?.feedbacks || anonymousFeedbacks.feedbacks.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">
                      No student feedback has been submitted yet for this course.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      When enrolled students submit anonymous reviews on lecture pacing, exams, or difficulty, they will appear here.
                    </p>
                  </div>
                ) : (
                  anonymousFeedbacks.feedbacks.map((fb: any, idx: number) => {
                    const categoryLabels: Record<string, string> = {
                      pacing: "Lecture Pacing & Speed",
                      difficulty: "Course Difficulty",
                      materials: "Notes & Slides Clarity",
                      exams: "Assessments & Quizzes",
                      general: "General Classroom Feedback",
                    };
                    return (
                      <div
                        key={fb.id || idx}
                        className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {categoryLabels[fb.category] || fb.category}
                          </span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  fb.rating >= s
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-200 dark:text-slate-700"
                                }`}
                              />
                            ))}
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">
                              {fb.rating}.0
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          "{fb.feedback_text}"
                        </p>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Verified Enrolled Student (Identity mathematically anonymized)</span>
                          <span>
                            {fb.created_at ? new Date(fb.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* STUDENT VIEW: Anonymous Feedback Submission Form */
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-600" />
                  Institutional Anonymous Feedback
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Zero correlation between your user record and this feedback. Enforced mathematically in PostgreSQL.
                </p>
              </div>

              {fbSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-300 dark:border-emerald-800">
                  {fbSuccessMsg}
                </div>
              )}

              <form onSubmit={handleAnonymousFeedbackSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Feedback Category
                  </label>
                  <select
                    value={fbCategory}
                    onChange={(e) => setFbCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="pacing">Lecture Pacing & Speed</option>
                    <option value="difficulty">Course Difficulty</option>
                    <option value="materials">Clarity of Notes & Slides</option>
                    <option value="exams">Assessments & Quizzes</option>
                    <option value="general">General Classroom Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Rating: {fbRating} / 5 Stars
                  </label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFbRating(val)}
                        className={`p-2 rounded-xl text-xs font-bold transition ${
                          fbRating >= val
                            ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                        }`}
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Your Honest Thoughts
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={fbText}
                    onChange={(e) => setFbText(e.target.value)}
                    placeholder="Share constructive insights on lecture quality or assignment clarity..."
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingFb || !fbText.trim()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
                >
                  {submittingFb ? "Securing and Submitting..." : "Submit Anonymous Review"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 10. LEADERBOARD */}
      {activeTab === "leaderboard" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Classroom Academic Standings & Achievement Points
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated from timely submissions, quiz performance, and verified lab pass outcomes.
              </p>
            </div>
          </div>

          {leaderboardData?.leaderboard ? (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 w-16 text-center">Rank</th>
                    <th className="p-3">Student</th>
                    <th className="p-3 text-center">Points</th>
                    <th className="p-3 text-center">Quizzes Done</th>
                    <th className="p-3 text-center">Coding Labs</th>
                    <th className="p-3">Badges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaderboardData.leaderboard.map((entry: any) => (
                    <tr key={entry.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 text-center font-bold text-amber-600">#{entry.rank}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{entry.name}</td>
                      <td className="p-3 text-center font-extrabold text-blue-600">{entry.points} pts</td>
                      <td className="p-3 text-center font-medium">{entry.quizzes_completed}</td>
                      <td className="p-3 text-center font-medium">{entry.accepted_labs}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {entry.badges?.map((b: string) => (
                            <span key={b} className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 border border-amber-300 dark:border-amber-800">
                              {b}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Loading standings...</p>
          )}
        </div>
      )}

      {/* TAB CONTENT: 11. AI STUDIO (REMOVED) */}
      {false && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Faculty AI Studio — Assessment & Learning Material Generator
              </h3>
              <p className="text-xs text-slate-500">
                Generate questions, lab problems, or study guides. Explicit faculty review and approval is required before publishing.
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerateAIDraft} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Target Draft Type</label>
                <select
                  value={aiDraftType}
                  onChange={(e) => setAiDraftType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="quiz_question">Quiz Question Bank</option>
                  <option value="coding_challenge">Coding Lab Problem</option>
                  <option value="lesson_summary">Lesson Concept Summary</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Topic or Concept Prompt</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed snapshot algorithms & Chandy-Lamport"
                  value={aiDraftPrompt}
                  onChange={(e) => setAiDraftPrompt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={generatingDraft || !aiDraftPrompt.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition disabled:opacity-50"
            >
              {generatingDraft ? "Synthesizing Draft..." : "Generate AI Draft for Review"}
            </button>
          </form>

          {/* Drafts Review Area */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Generated Drafts</h4>
            {aiDrafts.map(d => (
              <div key={d.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{d.title}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    d.is_approved ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {d.is_approved ? "Faculty Approved" : "Pending Approval"}
                  </span>
                </div>
                <pre className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 font-sans whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {d.edited_content || d.generated_content}
                </pre>
                {!d.is_approved && isInstructor && (
                  <button
                    onClick={() => handleApproveAIDraft(d.id)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Certify & Publish to Course
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 12. QUICKNOW AI */}
      {activeTab === "ai_playground" && (
        <div className="space-y-6">
          {/* Header block for Quicknow AI */}
          <div className="text-center py-6 sm:py-8 max-w-2xl mx-auto space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400 mb-3 shadow-xs">
              <Bot className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Quicknow AI
              </h1>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                CLASS DATA NAVIGATOR
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
              Instant assistant for this course: locate documents (like Motion.pdf), check active assignments and submission deadlines, and verify attendance records.
            </p>
          </div>

          {/* Main Course Chatbot Interface */}
          <div className="rounded-2xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] overflow-hidden shadow-sm flex flex-col h-[650px]">
            {/* Chatbot Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#262832] flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Quicknow AI Course Assistant</h2>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Course Records Examiner
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Grounded in {course?.code || "Course"} syllabus, materials, assignments, and attendance roll-call
                  </p>
                </div>
              </div>

              {courseAiMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCourseAiMessages([])}
                  className="text-xs font-semibold text-slate-400 hover:text-red-500 transition px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Clear Chat
                </button>
              )}
            </div>

            {/* Chat Message Scroll Area */}
            <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
              {/* EMPTY STATE: Shown when no messages yet (No default response!) */}
              {courseAiMessages.length === 0 && (
                <div className="h-full flex flex-col justify-center items-center py-6 text-center space-y-6 max-w-2xl mx-auto">
                  <div className="space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400 shadow-sm">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Ask Quicknow AI anything about this course
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      Locate files like <strong className="text-slate-800 dark:text-slate-200">Motion.pdf</strong>, check assignments, and verify attendance records. (Quiz generation is disabled.)
                    </p>
                  </div>

                  {/* DEFAULT QUESTIONS TO ASK (Tap to execute) */}
                  <div className="w-full space-y-2.5 text-left">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
                      Default Questions to Ask (Tap any to examine page):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleRunPlayground({ preventDefault: () => {} } as any, "Where is Motion.pdf in this course?")}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-emerald-500/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 text-left transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">📄</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            Where is Motion.pdf?
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Find Motion.pdf or search specific slide decks and PDFs in this class.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRunPlayground({ preventDefault: () => {} } as any, "List all available course materials and files for this class")}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-purple-500/60 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 text-left transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">📚</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            Course Materials &amp; Files
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Index of all {materials.length} uploaded files, external links, and lectures.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRunPlayground({ preventDefault: () => {} } as any, "What assignments are due in this class and what are their deadlines?")}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500/60 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-left transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">⏰</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            Assignments &amp; Deadlines
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Check active homework, submission deadlines, and maximum score rubrics.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRunPlayground({ preventDefault: () => {} } as any, "What is the attendance record and session count for this class?")}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-amber-500/60 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 text-left transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">📊</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            Course Attendance Record
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Review recorded roll-call sessions, attendance rates, and criteria.
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CHAT MESSAGES CONVERSATION FLOW */}
              {courseAiMessages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  {msg.role === "user" ? (
                    /* User Message Bubble */
                    <div className="flex flex-col items-end">
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs sm:text-sm leading-relaxed shadow-sm">
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-400 px-1 pt-1">{msg.timestamp}</span>
                    </div>
                  ) : (
                    /* Bot Message Bubble */
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="max-w-[90%] sm:max-w-[85%] space-y-2">
                        <div className="p-4 rounded-2xl rounded-tl-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed shadow-2xs space-y-2">
                          {msg.model && (
                            <div className="flex items-center gap-1.5 pb-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 border-b border-slate-200/60 dark:border-slate-700/60">
                              <Sparkles className="w-3 h-3" />
                              <span>{msg.model}</span>
                            </div>
                          )}
                          <div className="whitespace-pre-line">{msg.text}</div>

                          {msg.sources && msg.sources.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-1.5">
                              {msg.sources.map((src, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                                >
                                  Ref: {src}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 px-1">{msg.timestamp}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Bot Analyzing Indicator */}
              {runningPlayground && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 flex items-center justify-center shrink-0 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"></span>
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                    <span>Examining course documents, materials &amp; deadlines...</span>
                  </div>
                </div>
              )}

              <div ref={courseChatBottomRef} />
            </div>

            {/* QUICK SUGGESTION CHIPS (Above input) */}
            <div className="px-4 py-2 border-t border-slate-200/80 dark:border-[#262832] bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Quick ask:</span>
              <button
                type="button"
                onClick={() => handleRunPlayground({ preventDefault: () => {} } as any, "Where is Motion.pdf in this course?")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-700 dark:text-slate-300 shrink-0 transition"
              >
                📄 Motion.pdf
              </button>
              <button
                type="button"
                onClick={() => handleRunPlayground({ preventDefault: () => {} } as any, "List all available course materials and files for this class")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-700 dark:text-slate-300 shrink-0 transition"
              >
                📚 Course Materials
              </button>
              <button
                type="button"
                onClick={() => handleRunPlayground({ preventDefault: () => {} } as any, "What assignments are due in this class and what are their deadlines?")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-700 dark:text-slate-300 shrink-0 transition"
              >
                ⏰ Due Deadlines
              </button>
              <button
                type="button"
                onClick={() => handleRunPlayground({ preventDefault: () => {} } as any, "What is the attendance record and session count for this class?")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-700 dark:text-slate-300 shrink-0 transition"
              >
                📊 Attendance Record
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleRunPlayground} className="p-3 border-t border-slate-200 dark:border-[#262832] flex gap-2 bg-white dark:bg-[#18191f]">
              <input
                type="text"
                value={playgroundPrompt}
                onChange={(e) => setPlaygroundPrompt(e.target.value)}
                placeholder="Ask anything about this course: 'where is Motion.pdf', 'what assignments are due'..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={runningPlayground || !playgroundPrompt.trim()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Ask Quicknow
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ATTENDANCE & ROLL-CALL */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {isInstructor ? (
            /* ========================================================================= */
            /* INSTRUCTOR ATTENDANCE ROLL-CALL WORKSPACE                                 */
            /* ========================================================================= */
            <div className="space-y-6">
              {/* Header Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="w-5 h-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Take Course Attendance
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mark daily student roll-call. Turnout and percentages calculate live in real time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Real-time Quick Metrics for Instructor */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-center min-w-[70px]">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Enrolled</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {participants?.students?.length || 0}
                    </span>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center min-w-[70px]">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Present</span>
                    <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                      {presentCountForDate}
                    </span>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-center min-w-[70px]">
                    <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 block">Absent</span>
                    <span className="text-base font-extrabold text-red-700 dark:text-red-300">
                      {absentCountForDate}
                    </span>
                  </div>
                  {lateStudentsForDate.length > 0 && (
                    <div className="px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-center min-w-[70px]">
                      <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 block">Late Entry</span>
                      <span className="text-base font-extrabold text-sky-700 dark:text-sky-300">
                        {lateStudentsForDate.length}
                      </span>
                    </div>
                  )}
                  <div className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-center min-w-[70px]">
                    <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block">Turnout</span>
                    <span className="text-base font-extrabold text-purple-700 dark:text-purple-300">
                      {realTimeTurnoutPct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Feedback messages */}
              {attendanceSuccessMsg && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{attendanceSuccessMsg}</span>
                </div>
              )}
              {attendanceErrorMsg && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-center gap-2 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{attendanceErrorMsg}</span>
                </div>
              )}

              {/* Instructor Roll-Call Action Controls */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Session Date
                      </label>
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Lecture Topic / Remarks (Optional)
                      </label>
                      <input
                        type="text"
                        value={attendanceTopic}
                        onChange={(e) => setAttendanceTopic(e.target.value)}
                        placeholder="e.g. Lecture 14: Consensus & Fault Tolerance"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={markAllStudentsPresent}
                      className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> All Present
                    </button>
                    <button
                      type="button"
                      onClick={markAllStudentsAbsent}
                      className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      All Absent
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAttendance}
                      disabled={savingAttendance}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
                    >
                      {savingAttendance ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                      {savingAttendance ? "Saving..." : "Save Attendance"}
                    </button>
                  </div>
                </div>

                {/* Search & Filter Roster */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={attendanceSearchQuery}
                      onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                      placeholder="Search by student name, roll no, or branch..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 text-[11px] font-semibold mr-1">Filter:</span>
                    <button
                      onClick={() => setAttendanceFilter("all")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        attendanceFilter === "all" ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      All ({participants?.students?.length || 0})
                    </button>
                    <button
                      onClick={() => setAttendanceFilter("present")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        attendanceFilter === "present" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "text-slate-500 hover:text-emerald-600"
                      }`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => setAttendanceFilter("absent")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        attendanceFilter === "absent" ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300" : "text-slate-500 hover:text-red-600"
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              </div>

              {/* Student Roster Table for Selected Session Date */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Roll No</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4 text-center">Attendance Status</th>
                        <th className="py-3 px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No students match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((st: any, idx: number) => {
                          const isLateEntry = isStudentLateEntry(st, attendanceDate);
                          const isPresent = (attendanceStatusMap[st.id] || "present") === "present";
                          return (
                            <tr
                              key={st.id || idx}
                              className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                            >
                              <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs shrink-0">
                                    {st.first_name?.[0] || st.name?.[0] || "S"}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-white block">
                                      {st.first_name ? `${st.first_name} ${st.last_name || ""}` : st.name || st.email}
                                    </span>
                                    <span className="text-[11px] text-slate-400">{st.email}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                                {st.institution_id || `2026-CS-${100 + idx + 1}`}
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                                {st.department || "Computer Science & Engineering"}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {isLateEntry ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                    ⏰ Late Entry (Joined {st.enrolled_at ? new Date(st.enrolled_at).toLocaleDateString() : "later"})
                                  </span>
                                ) : (
                                  <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                                    <button
                                      type="button"
                                      onClick={() => handleSetStudentStatus(st.id, "present")}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                        isPresent
                                          ? "bg-emerald-600 text-white shadow-xs"
                                          : "text-slate-500 hover:text-emerald-600"
                                      }`}
                                    >
                                      <Check className="w-3 h-3" /> Present
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetStudentStatus(st.id, "absent")}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                        !isPresent
                                          ? "bg-red-600 text-white shadow-xs"
                                          : "text-slate-500 hover:text-red-600"
                                      }`}
                                    >
                                      ✕ Absent
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {isLateEntry ? (
                                  <span className="text-[11px] text-slate-400 italic">Enrolled after class date</span>
                                ) : (
                                  <input
                                    type="text"
                                    value={attendanceRemarksMap[st.id] || ""}
                                    onChange={(e) =>
                                      setAttendanceRemarksMap({
                                        ...attendanceRemarksMap,
                                        [st.id]: e.target.value,
                                      })
                                    }
                                    placeholder="Optional remark..."
                                    className="w-full max-w-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Past Sessions History with Load Roll-Call capability */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Recorded Attendance Sessions ({attendanceSessions.length})
                  </h3>
                  <span className="text-xs text-slate-400">Click any session to review or update marks</span>
                </div>

                {attendanceSessions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No past attendance records yet for this course. Take your first roll-call using the panel above!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {attendanceSessions.map((s) => (
                      <div
                        key={s.id}
                        className={`p-4 rounded-xl border transition text-xs space-y-2 ${
                          attendanceDate === s.date
                            ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-900 dark:text-white">
                            {new Date(s.date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                            {s.total_marked || s.records?.length || 0} Marked
                          </span>
                        </div>
                        {s.topic && <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-1">{s.topic}</p>}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            Saved by Date
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectPastSession(s)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs"
                          >
                            Load / Edit Roll-Call
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* STUDENT VIEW: ONLY MY DAILY ATTENDANCE & REAL-TIME PERCENTAGE             */
            /* ========================================================================= */
            <div className="space-y-6">
              {/* Header Card with Real-Time Percentage & Status */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="w-5 h-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        My Course Attendance
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Your personal attendance track record and daily lecture presence status.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Real-time Percentage Badge & Summary Cards */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center min-w-[90px]">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Attendance</span>
                    <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                      {studentAttendanceSummary?.percentage || "100%"}
                    </span>
                  </div>

                  <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-center min-w-[80px]">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Attended</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {studentAttendanceSummary?.attended ?? 0} / {studentAttendanceSummary?.eligible_sessions ?? 0}
                    </span>
                  </div>

                  <div className="px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-center min-w-[70px]">
                    <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 block">Missed</span>
                    <span className="text-base font-extrabold text-red-700 dark:text-red-300">
                      {studentAttendanceSummary?.absent ?? 0}
                    </span>
                  </div>

                  {studentAttendanceSummary?.late_entry_count > 0 && (
                    <div className="px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-center min-w-[80px]">
                      <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 block">Late Entries</span>
                      <span className="text-base font-extrabold text-sky-700 dark:text-sky-300">
                        {studentAttendanceSummary.late_entry_count}
                      </span>
                    </div>
                  )}

                  <div className="px-3 py-2 rounded-xl text-center">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      (studentAttendanceSummary?.percentage_num ?? 100) >= 75
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : (studentAttendanceSummary?.percentage_num ?? 100) >= 65
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                    }`}>
                      {studentAttendanceSummary?.status_tag || "Safe"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notice regarding late enrollment */}
              {studentAttendanceSummary?.late_entry_count > 0 && (
                <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    You enrolled after {studentAttendanceSummary.late_entry_count} initial lectures were conducted. These are recorded as <strong>Late Entries</strong> and do not penalize your attendance percentage.
                  </span>
                </div>
              )}

              {/* Student Daily Attendance History Table */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    My Daily Roll-Call History
                  </h3>
                  <span className="text-xs text-slate-400">
                    {studentAttendanceSummary?.history?.length || 0} Lectures Conducted
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Topic / Session</th>
                        <th className="py-3 px-4 text-center">My Status</th>
                        <th className="py-3 px-4">Remarks / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {!studentAttendanceSummary?.history || studentAttendanceSummary.history.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No attendance records logged yet for this subject.
                          </td>
                        </tr>
                      ) : (
                        studentAttendanceSummary.history.map((rec: any, idx: number) => (
                          <tr
                            key={rec.session_id || idx}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                              {rec.date_display || rec.date}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                              {rec.topic || "Regular Lecture"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {rec.is_late_entry || rec.status === "late_entry" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                                  ⏰ Late Entry
                                </span>
                              ) : rec.status === "present" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  ✓ Present
                                </span>
                              ) : rec.status === "absent" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                                  ✕ Absent
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  ⚪ Unmarked
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {rec.remarks || (rec.is_late_entry ? "Enrolled after lecture date (no penalty)" : "—")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 13. PEOPLE */}
      {activeTab === "people" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Course Instructor & Faculty
            </h3>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-sm">
                {course.instructor?.first_name?.[0] || "P"}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Prof. {course.instructor?.first_name} {course.instructor?.last_name}
                </h4>
                <p className="text-xs text-slate-500">{course.instructor?.email} • {course.instructor?.department || "Faculty of Computing"}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Enrolled Classmates ({participants?.students.length || 0})
            </h3>
            {participants?.students.length === 0 ? (
              <p className="text-xs text-slate-500">No other students enrolled yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {participants?.students.map((st: any) => (
                  <div key={st.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {st.first_name?.[0] || "S"}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {st.first_name} {st.last_name}
                        </span>
                        <span className="text-[11px] text-slate-400">{st.institution_id || st.email}</span>
                      </div>
                    </div>
                    <span className="text-slate-400 text-[11px]">Enrolled Student</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Create Assignment (Instructor) */}
      {createAssignmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" /> Create New Assignment
              </h3>
              <button
                type="button"
                onClick={() => setCreateAssignmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Problem Set 3: B-Tree Index Implementation"
                  value={newAssignTitle}
                  onChange={(e) => setNewAssignTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Instructions & Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe task requirements, deliverables, grading rubrics..."
                  value={newAssignDesc}
                  onChange={(e) => setNewAssignDesc(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assessment Type
                  </label>
                  <select
                    value={newAssignType}
                    onChange={(e: any) => setNewAssignType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="lab">Laboratory Exercise</option>
                    <option value="project">Term Project</option>
                    <option value="quiz">Quiz Task</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Submission Format
                  </label>
                  <select
                    value={newAssignFormat}
                    onChange={(e: any) => setNewAssignFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="both">Text or File Upload</option>
                    <option value="file">File Upload Only</option>
                    <option value="text">Online Text Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newAssignDueDate}
                    onChange={(e) => setNewAssignDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Maximum Score
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={newAssignMaxScore}
                    onChange={(e) => setNewAssignMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Attach Assignment Material / Question Paper / Starter Code (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setNewAssignAttachment(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
                />
                {newAssignAttachment && (
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Attached: {newAssignAttachment.name} ({(newAssignAttachment.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateAssignmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAssignment || !newAssignTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creatingAssignment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {creatingAssignment ? "Publishing..." : "Publish Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Quiz (Instructor) */}
      {createQuizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" /> Create New Quiz
              </h3>
              <button
                type="button"
                onClick={() => setCreateQuizModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuiz} className="space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quiz Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midterm Assessment: SQL & Concurrency"
                    value={newQuizTitle}
                    onChange={(e) => setNewQuizTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description & Rules
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Instructions on timers, negative marking, attempt limits..."
                    value={newQuizDesc}
                    onChange={(e) => setNewQuizDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Timer Duration (Minutes, 0 = untimed)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={300}
                      value={newQuizDuration}
                      onChange={(e) => setNewQuizDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Due Date & Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={newQuizDue}
                      onChange={(e) => setNewQuizDue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="releaseResultsCheckbox"
                    checked={newQuizReleaseResults}
                    onChange={(e) => setNewQuizReleaseResults(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="releaseResultsCheckbox" className="font-semibold text-slate-700 dark:text-slate-300">
                    Release answers and correct scores to students after completion
                  </label>
                </div>
              </div>

              {/* Questions Section */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Questions ({newQuizQuestions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Question
                  </button>
                </div>

                {newQuizQuestions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Question #{qIdx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">Marks:</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={q.marks}
                            onChange={(e) => handleQuestionChange(qIdx, "marks", Number(e.target.value))}
                            className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-bold"
                          />
                        </div>
                        {newQuizQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remove Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Which normal form removes transitive functional dependency?"
                        value={q.question_text}
                        onChange={(e) => handleQuestionChange(qIdx, "question_text", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">
                        Options & Correct Answer
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="w-5 text-center font-bold text-slate-400 font-mono text-[11px]">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <input
                              type="text"
                              required
                              value={opt}
                              onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        <span className="text-slate-500 font-semibold text-[11px]">Correct Answer:</span>
                        <select
                          value={q.correct_answer}
                          onChange={(e) => handleQuestionChange(qIdx, "correct_answer", e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold"
                        >
                          {q.options.map((opt, optIdx) => (
                            <option key={optIdx} value={opt}>
                              Option {String.fromCharCode(65 + optIdx)}: {opt || `(Empty)`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateQuizModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingQuiz || !newQuizTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creatingQuiz ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {creatingQuiz ? "Creating..." : "Publish Quiz"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Assignment Submission */}
      {submitModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Submit: {submitModalAssignment.title}
                </h3>
                <span className="text-xs text-slate-500">Max Score: {submitModalAssignment.max_score} pts • Format: {submitModalAssignment.submission_format}</span>
              </div>
              <button onClick={() => setSubmitModalAssignment(null)} className="text-slate-400 font-bold hover:text-slate-600 dark:hover:text-white">✕</button>
            </div>

            {/* If assignment has reference material */}
            {(submitModalAssignment.attachment_url || submitModalAssignment.attachment) && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Instructor Reference Material</p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300">{submitModalAssignment.attachment_name || "Coursework Assignment Brief"}</p>
                </div>
                <a
                  href={submitModalAssignment.attachment_url || (submitModalAssignment.attachment as string)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            )}

            {/* Existing submission status */}
            {submitModalAssignment.my_submission && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Previous Submission Status:</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    Receipt: {submitModalAssignment.my_submission.receipt_id}
                  </span>
                </div>
                {submitModalAssignment.my_submission.is_late && (
                  <p className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Submitted after deadline (Late Submission)
                  </p>
                )}
                {submitModalAssignment.my_submission.score !== null && submitModalAssignment.my_submission.score !== undefined && (
                  <p className="text-emerald-700 dark:text-emerald-300 font-bold">
                    Marks Awarded: {submitModalAssignment.my_submission.score} / {submitModalAssignment.max_score} pts
                    {submitModalAssignment.my_submission.feedback && (
                      <span className="block text-slate-500 font-normal mt-0.5">Faculty Feedback: &quot;{submitModalAssignment.my_submission.feedback}&quot;</span>
                    )}
                  </p>
                )}
                {submitModalAssignment.my_submission.file_url && (
                  <div className="pt-1">
                    <a
                      href={submitModalAssignment.my_submission.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      <Download className="w-3 h-3" /> Download Your Submitted File ({submitModalAssignment.my_submission.file_name || "Attachment"})
                    </a>
                  </div>
                )}
              </div>
            )}

            {lastReceipt && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-300 dark:border-emerald-800 font-mono">
                Official Submission Receipt: {lastReceipt}
              </div>
            )}

            <form onSubmit={handleSubmitAssignment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Solution Text / Code</label>
                <textarea
                  rows={4}
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  placeholder="Paste your solution summary, code, or answers here..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Attach Solution File (PDF, ZIP, DOCX, PY, SQL, etc.)</label>
                <input
                  type="file"
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
                />
                {submissionFile && (
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Selected: {submissionFile.name} ({(submissionFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubmitModalAssignment(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submittingWork}
                  className="px-5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingWork && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {submittingWork ? "Submitting..." : (submitModalAssignment.my_submission ? "Update Submission" : "Transmit Submission")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Faculty Check Assignment Submissions */}
      {viewSubmissionsAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                  Submissions: {viewSubmissionsAssignment.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Due: {viewSubmissionsAssignment.due_date ? new Date(viewSubmissionsAssignment.due_date).toLocaleString() : "TBA"} • Max Score: {viewSubmissionsAssignment.max_score} pts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewSubmissionsAssignment(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {loadingSubmissions ? (
              <div className="py-12 flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                Loading enrolled students and coursework submissions...
              </div>
            ) : assignmentSubmissionsData ? (
              <div className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <p className="text-[11px] text-slate-500">Total Enrolled</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {assignmentSubmissionsData.stats.total_enrolled}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Submitted</p>
                    <p className="text-xl font-bold text-emerald-600 mt-0.5">
                      {assignmentSubmissionsData.stats.submitted_count}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">⏰ Late Submissions</p>
                    <p className="text-xl font-bold text-amber-600 mt-0.5">
                      {assignmentSubmissionsData.stats.late_count}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60">
                    <p className="text-[11px] text-red-700 dark:text-red-300">✕ Missing / Overdue</p>
                    <p className="text-xl font-bold text-red-600 mt-0.5">
                      {assignmentSubmissionsData.stats.missing_count}
                    </p>
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-xs">
                  <button
                    onClick={() => setSubmissionFilter("all")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${submissionFilter === "all" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  >
                    All Students ({assignmentSubmissionsData.students.length})
                  </button>
                  <button
                    onClick={() => setSubmissionFilter("submitted")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${submissionFilter === "submitted" ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  >
                    Submitted ({assignmentSubmissionsData.stats.submitted_count})
                  </button>
                  <button
                    onClick={() => setSubmissionFilter("late")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${submissionFilter === "late" ? "bg-amber-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  >
                    ⏰ Late Submissions ({assignmentSubmissionsData.stats.late_count})
                  </button>
                  <button
                    onClick={() => setSubmissionFilter("missing")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${submissionFilter === "missing" ? "bg-red-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  >
                    Missing ({assignmentSubmissionsData.stats.missing_count})
                  </button>
                </div>

                {/* Students list */}
                <div className="space-y-3">
                  {assignmentSubmissionsData.students
                    .filter((st: any) => {
                      if (submissionFilter === "submitted") return st.has_submitted;
                      if (submissionFilter === "late") return st.is_late;
                      if (submissionFilter === "missing") return st.status === "missing";
                      return true;
                    })
                    .map((st: any) => (
                      <div
                        key={st.student_id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 text-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                              {st.name[0] || "S"}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{st.name}</p>
                              <p className="text-[11px] text-slate-400">{st.roll_no} • {st.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {st.status === "submitted" && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                ✓ Submitted
                              </span>
                            )}
                            {st.status === "late" && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                                ⏰ Late Submission
                              </span>
                            )}
                            {st.status === "missing" && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                ✕ Missing / Overdue
                              </span>
                            )}
                            {st.status === "pending" && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                ⚪ Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {st.submission && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                              <span>Submitted: {new Date(st.submission.submitted_at).toLocaleString()}</span>
                              <span className="font-mono">Receipt: {st.submission.receipt_id}</span>
                            </div>

                            {st.submission.content && (
                              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <p className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-0.5">Student Text Solution:</p>
                                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{st.submission.content}</p>
                              </div>
                            )}

                            {st.submission.file_url && (
                              <div>
                                <a
                                  href={st.submission.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-semibold"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Download Attached File ({st.submission.file_name || "Submission File"})
                                </a>
                              </div>
                            )}

                            {/* Inline grading */}
                            {inlineGradingId === st.submission.id ? (
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 space-y-2.5">
                                <p className="font-bold text-slate-900 dark:text-white">Enter Grade & Feedback</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[11px] text-slate-500 mb-1">Score (out of {viewSubmissionsAssignment.max_score})</label>
                                    <input
                                      type="number"
                                      value={inlineScore}
                                      onChange={(e) => setInlineScore(Number(e.target.value))}
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-slate-500 mb-1">Teacher Feedback</label>
                                    <input
                                      type="text"
                                      value={inlineFeedback}
                                      onChange={(e) => setInlineFeedback(e.target.value)}
                                      placeholder="Feedback notes..."
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setInlineGradingId(null)}
                                    className="px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingInlineGrade}
                                    onClick={() => handleInlineGradeSubmit(st.submission.id)}
                                    className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                                  >
                                    {savingInlineGrade ? "Saving..." : "Save Grade"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between pt-1">
                                <div>
                                  {st.submission.score !== null ? (
                                    <span className="font-bold text-emerald-600">
                                      Score: {st.submission.score} / {viewSubmissionsAssignment.max_score} pts
                                      {st.submission.feedback && <span className="text-slate-400 ml-2 font-normal">Feedback: &quot;{st.submission.feedback}&quot;</span>}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">Ungraded</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineGradingId(st.submission.id);
                                    setInlineScore(st.submission.score !== null ? st.submission.score : viewSubmissionsAssignment.max_score);
                                    setInlineFeedback(st.submission.feedback || "");
                                  }}
                                  className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-semibold"
                                >
                                  {st.submission.score !== null ? "Edit Grade" : "Enter Grade"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No submission records found.</p>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Faculty Check Quiz Attempts */}
      {viewAttemptsQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Quiz Attempts: {viewAttemptsQuiz.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Due: {viewAttemptsQuiz.due_date ? new Date(viewAttemptsQuiz.due_date).toLocaleString() : "TBA"} • Total Marks: {viewAttemptsQuiz.total_marks || "N/A"} • Duration: {viewAttemptsQuiz.duration_minutes ? `${viewAttemptsQuiz.duration_minutes} Mins` : "Untimed"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewAttemptsQuiz(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {loadingAttempts ? (
              <div className="py-12 flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                Loading enrolled students and quiz attempts...
              </div>
            ) : quizAttemptsData ? (
              <div className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <p className="text-[11px] text-slate-500">Enrolled</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {quizAttemptsData.stats.total_enrolled}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
                    <p className="text-[11px] text-purple-700 dark:text-purple-300">Attempted</p>
                    <p className="text-xl font-bold text-purple-600 mt-0.5">
                      {quizAttemptsData.stats.attempted_count}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">⏰ Late Attempts</p>
                    <p className="text-xl font-bold text-amber-600 mt-0.5">
                      {quizAttemptsData.stats.late_count}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60">
                    <p className="text-[11px] text-red-700 dark:text-red-300">Missing</p>
                    <p className="text-xl font-bold text-red-600 mt-0.5">
                      {quizAttemptsData.stats.missing_count}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Average Score</p>
                    <p className="text-xl font-bold text-emerald-600 mt-0.5">
                      {quizAttemptsData.stats.avg_score}
                    </p>
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-xs">
                  <button
                    onClick={() => setAttemptFilter("all")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${attemptFilter === "all" ? "bg-purple-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  >
                    All Students ({quizAttemptsData.students.length})
                  </button>
                  <button
                    onClick={() => setAttemptFilter("attempted")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${attemptFilter === "attempted" ? "bg-purple-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  >
                    Attempted ({quizAttemptsData.stats.attempted_count})
                  </button>
                  <button
                    onClick={() => setAttemptFilter("late")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${attemptFilter === "late" ? "bg-amber-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  >
                    ⏰ Late Attempts ({quizAttemptsData.stats.late_count})
                  </button>
                  <button
                    onClick={() => setAttemptFilter("missing")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${attemptFilter === "missing" ? "bg-red-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  >
                    Not Attempted ({quizAttemptsData.stats.missing_count})
                  </button>
                </div>

                {/* Students list */}
                <div className="space-y-3">
                  {quizAttemptsData.students
                    .filter((st: any) => {
                      if (attemptFilter === "attempted") return st.has_attempted;
                      if (attemptFilter === "late") return st.is_late;
                      if (attemptFilter === "missing") return st.status === "missing";
                      return true;
                    })
                    .map((st: any) => (
                      <div
                        key={st.student_id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                              {st.name[0] || "S"}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{st.name}</p>
                              <p className="text-[11px] text-slate-400">{st.roll_no} • {st.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {st.status === "completed" && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                ✓ Attempted
                              </span>
                            )}
                            {st.status === "late" && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                                ⏰ Late Attempt
                              </span>
                            )}
                            {st.status === "missing" && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                ✕ Not Attempted / Overdue
                              </span>
                            )}
                            {st.status === "pending" && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                ⚪ Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {st.attempt && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-slate-600 dark:text-slate-300">
                              <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                                Score: {st.attempt.score} / {st.attempt.max_score} ({st.attempt.percentage}%)
                              </span>
                              <span className="text-slate-400 ml-2">Attempt #{st.attempt.attempt_number}</span>
                            </div>
                            {st.attempt.completed_at && (
                              <span className="text-[11px] text-slate-400">
                                Completed: {new Date(st.attempt.completed_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No attempt records found.</p>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Faculty Grade Submission */}
      {gradingSubmissionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Assign Marks & Feedback
            </h3>
            <form onSubmit={handleGradeSubmission} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Marks Assigned</label>
                <input
                  type="number"
                  required
                  value={gradeScore}
                  onChange={(e) => setGradeScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Evaluation Feedback</label>
                <textarea
                  rows={3}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="Feedback for the student..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGradingSubmissionId(null)}
                  className="px-4 py-1.5 rounded-xl text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGrade}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold"
                >
                  {savingGrade ? "Saving..." : "Save Grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Take Quiz */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeQuiz.title}
                </h3>
                <span className="text-xs text-slate-500">
                  Timer: {activeQuiz.duration_minutes} Mins • Max Attempts: {activeQuiz.max_attempts}
                </span>
              </div>
              <button onClick={() => setActiveQuiz(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            {quizResultReceipt ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Quiz Evaluated Successfully!</h4>
                <p className="text-sm font-semibold text-blue-600">
                  Score: {quizResultReceipt.score} / {quizResultReceipt.max_score}
                </p>
                <button
                  onClick={() => setActiveQuiz(null)}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {activeQuiz.questions?.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span>Question {idx + 1} ({q.marks} pts)</span>
                      <span className="uppercase text-[10px] text-slate-400">{q.question_type}</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{q.question_text}</p>
                    <div className="space-y-1.5 pt-1">
                      {q.options?.map(opt => (
                        <label key={opt} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name={`quiz-q-${q.id}`}
                            value={opt}
                            checked={quizAnswers[q.id] === opt}
                            onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt })}
                            className="text-purple-600"
                          />
                          <span className="text-slate-700 dark:text-slate-300">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setActiveQuiz(null)}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuizSubmit}
                    disabled={submittingQuiz}
                    className="px-5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-50"
                  >
                    {submittingQuiz ? "Auto-Grading..." : "Submit Quiz"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Upload Material */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Upload Course Material
              </h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            {matError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs text-red-600">
                {matError}
              </div>
            )}

            <form onSubmit={handleUploadMaterial} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Material Title</label>
                <input
                  type="text"
                  required
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  placeholder="e.g. Unit 2: Consensus Specification"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Topic / Unit</label>
                <input
                  type="text"
                  value={matTopic}
                  onChange={(e) => setMatTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Resource Category</label>
                <select
                  value={matType}
                  onChange={(e) => setMatType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="document">Document (PDF, Word, PPT, Excel, Text)</option>
                  <option value="video">Video Lecture / Recording (Upload or Video Link)</option>
                  <option value="image">Image / Diagram / Infographic</option>
                  <option value="link">Web Link / Online Resource (URL, GitHub, Google Drive)</option>
                  <option value="slides">Lecture Slides</option>
                  <option value="notes">Lecture Notes</option>
                  <option value="syllabus">Course Syllabus / Outline</option>
                  <option value="lab_manual">Lab Manual / Handout</option>
                  <option value="notebook">Jupyter Notebook (.ipynb)</option>
                  <option value="other">Code, Archive, or Any Other File (.py, .java, .cpp, .zip, etc.)</option>
                </select>
              </div>

              {/* Web Link Input */}
              {matType === "link" && (
                <div>
                  <label className="block text-xs font-semibold mb-1 flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5 text-sky-600" />
                    Web Link / URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={matLinkUrl}
                    onChange={(e) => setMatLinkUrl(e.target.value)}
                    placeholder="https://... (e.g. documentation, articles, GitHub, Google Drive)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Students will be able to visit this external resource directly</span>
                </div>
              )}

              {/* Video URL Input */}
              {matType === "video" && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1 flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-purple-600" />
                      Video Stream URL / YouTube Link (Optional if uploading file)
                    </label>
                    <input
                      type="url"
                      value={matVideoUrl}
                      onChange={(e) => setMatVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or direct MP4/stream URL"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Or Upload Video File (MP4, WebM, MOV, MKV)
                    </label>
                    <input
                      type="file"
                      accept="video/*,.mp4,.webm,.mov,.mkv,.avi"
                      onChange={(e) => setMatFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 dark:file:bg-purple-950 dark:file:text-purple-300"
                    />
                  </div>
                </div>
              )}

              {/* Image Input */}
              {matType === "image" && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                      Attach Image File (PNG, JPG, JPEG, WebP, SVG, GIF)
                    </label>
                    <input
                      type="file"
                      accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg"
                      onChange={(e) => setMatFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Or Image Web Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={matLinkUrl}
                      onChange={(e) => setMatLinkUrl(e.target.value)}
                      placeholder="https://example.com/diagram.png"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Document / Slides / Notes / Syllabus / Lab Manual / Notebook Input */}
              {matType !== "link" && matType !== "video" && matType !== "image" && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      Attach File (Any file type: PDF, Word, PPT, Excel, Code, ZIP, Text, etc.)
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setMatFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 dark:file:bg-purple-950 dark:file:text-purple-300 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Optional Document Link (Google Docs, OneDrive, or Web Reference)
                    </label>
                    <input
                      type="url"
                      value={matLinkUrl}
                      onChange={(e) => setMatLinkUrl(e.target.value)}
                      placeholder="https://docs.google.com/document/d/..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1">Description / Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={matDescription}
                  onChange={(e) => setMatDescription(e.target.value)}
                  placeholder="Provide context, chapter reference, or reading instructions..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={matUploading}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {matUploading ? "Saving Resource..." : "Share Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Media Preview (Video Player / Image Lightbox) */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {previewMedia.type === "video" ? (
                  <Video className="w-4 h-4 text-purple-600" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                )}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-md">
                  {previewMedia.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewMedia.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5 inline mr-1" /> Open Original
                </a>
                <button
                  onClick={() => setPreviewMedia(null)}
                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center bg-black/10 dark:bg-black/40 rounded-xl p-2 min-h-[300px]">
              {previewMedia.type === "image" ? (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.title}
                  className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-sm"
                />
              ) : (
                (() => {
                  const ytMatch = previewMedia.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                  const vimeoMatch = previewMedia.url.match(/vimeo\.com\/(\d+)/);
                  if (ytMatch) {
                    return (
                      <iframe
                        src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`}
                        title={previewMedia.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full aspect-video rounded-xl"
                      />
                    );
                  }
                  if (vimeoMatch) {
                    return (
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`}
                        title={previewMedia.title}
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        className="w-full aspect-video rounded-xl"
                      />
                    );
                  }
                  return (
                    <video
                      controls
                      autoPlay
                      src={previewMedia.url}
                      className="max-h-[75vh] w-full rounded-xl"
                    />
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Jupyter Notebook Preview */}
      {previewNotebook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" /> {previewNotebook.title}
              </h3>
              <button onClick={() => setPreviewNotebook(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              {previewNotebook.notebook_content?.cells ? (
                previewNotebook.notebook_content.cells.map((cell: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <span className="text-[10px] text-slate-400 block font-sans font-bold uppercase mb-1">
                      [{cell.cell_type}] Cell {idx + 1}
                    </span>
                    <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{cell.source}</pre>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">Notebook structure rendered safely.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
