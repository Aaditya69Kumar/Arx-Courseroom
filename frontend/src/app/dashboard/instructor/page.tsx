"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  BookOpen, 
  UploadCloud, 
  Users, 
  CheckSquare, 
  FileCheck, 
  TrendingUp, 
  Plus, 
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  MessageSquare,
  KeyRound,
  Copy,
  Check,
  Loader2,
  FileText,
  Calendar as CalendarIcon,
  Bell,
  BarChart3,
  Bug,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Trash2,
  AlertCircle,
  GraduationCap,
  Shield,
  Phone,
  CheckCircle2,
  Bot,
  Key,
  UserCheck
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { CreateClassModal } from "@/components/create-class-modal";
import { 
  api, 
  DashboardSummary, 
  Course, 
  CourseMaterial,
  TimetableSlot, 
  CalendarEvent, 
  NotificationItem, 
  HelpDeskTicket 
} from "@/lib/api";
import { authStorage } from "@/lib/auth";
import { askQuicknowAI, getStoredGeminiKey, setStoredGeminiKey } from "@/lib/quicknow-ai";

export default function InstructorDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs font-semibold text-slate-500">
          Loading faculty workspace...
        </div>
      }
    >
      <InstructorDashboardContent />
    </Suspense>
  );
}

function InstructorDashboardContent() {
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "overview";

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Subview States
  // 1. To-Do
  const [todos, setTodos] = useState<Array<{ id: string; title: string; course: string; due: string; done: boolean; priority: string }>>([]);
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoCourse, setNewTodoCourse] = useState("CS-401");
  const [todoFilter, setTodoFilter] = useState<"all" | "pending" | "completed">("all");

  // 2. Calendar
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

  // 3. Timetable
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [activeDayFilter, setActiveDayFilter] = useState<string>("All");

  // 4. Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // 5. Help Desk & Feedback
  const [tickets, setTickets] = useState<HelpDeskTicket[]>([]);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketType, setTicketType] = useState("feature");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // 6. Quicknow AI State & Portal Context
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [allMaterials, setAllMaterials] = useState<CourseMaterial[]>([]);
  interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    sources?: string[];
    model?: string;
    timestamp: string;
  }
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]); // Starts empty: no default response!
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, aiGenerating]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || "Failed to load faculty dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    setHasGeminiKey(Boolean(getStoredGeminiKey()));
    api.getMaterials().then(mats => {
      if (mats && mats.length > 0) {
        setAllMaterials(mats);
      }
    }).catch(() => {});
    api.getCalendarEvents().then(events => {
      if (events && events.length > 0) setCalendarEvents(events);
    }).catch(() => {});
    api.getTimetable().then(slots => {
      if (slots && slots.length > 0) setTimetable(slots);
    }).catch(() => {});
    api.getNotifications().then(res => {
      if (res?.notifications && res.notifications.length > 0) {
        setNotifications(res.notifications);
      }
    }).catch(() => {});
    api.getTickets().then(t => {
      if (t && t.length > 0) setTickets(t);
    }).catch(() => {});
  }, []);

  const handleSaveGeminiKey = (key: string) => {
    setStoredGeminiKey(key);
    setHasGeminiKey(Boolean(key.trim()));
    setApiKeyModalOpen(false);
  };

  const handleCopyCode = (id: string, code?: string) => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    const item = {
      id: `td-${Date.now()}`,
      title: newTodoText.trim(),
      course: newTodoCourse,
      due: "Due soon",
      done: false,
      priority: "medium",
    };
    setTodos([item, ...todos]);
    setNewTodoText("");
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const markAllNotifsRead = async () => {
    try {
      await api.markAllNotificationsRead();
    } catch {}
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDesc.trim()) return;
    setSubmittingTicket(true);
    try {
      const created = await api.createTicket({
        ticket_type: ticketType,
        subject: ticketSubject.trim(),
        description: ticketDesc.trim(),
      });
      setTickets([created, ...tickets]);
      setTicketSubject("");
      setTicketDesc("");
      setTicketSuccess(true);
      setTimeout(() => setTicketSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to submit request.");
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleAiQuery = async (e: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const queryToRun = customPrompt || aiPrompt;
    if (!queryToRun.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: queryToRun.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setAiMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setAiPrompt("");
    setAiGenerating(true);

    try {
      const u = authStorage.getUser();
      const res = await askQuicknowAI(queryToRun.trim(), {
        user: u ? {
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          email: u.email,
        } : { first_name: "Faculty", role: "instructor" },
        courses: summary?.courses || summary?.classes || [],
        materials: allMaterials,
        assignments: (summary?.upcoming_deadlines || []).map(d => ({
          id: d.id,
          course: "",
          course_code: d.course_code,
          course_title: d.course_title || d.course_code,
          title: d.title,
          description: "",
          assessment_type: d.type,
          submission_format: "file",
          due_date: d.due_date,
          max_score: d.max_score,
          late_submissions_allowed: false,
          is_published: true,
          created_at: new Date().toISOString(),
        })),
        attendance: undefined,
        timetable: timetable,
        calendarEvents: calendarEvents,
        role: "instructor",
      });

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: res.text,
        sources: res.sources,
        model: res.model || "Gemini Flash-Lite (via Quicknow AI)",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setAiMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const botError: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: "assistant",
        text: `⚠️ **Unable to complete query**: ${err.message || "Failed to contact Quicknow AI"}.\n\nPlease ensure your Gemini API key is valid or check your internet connection.`,
        sources: ["Quicknow AI System"],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setAiMessages((prev) => [...prev, botError]);
    } finally {
      setAiGenerating(false);
    }
  };

  // Days in current calendar month
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <DashboardShell role="instructor" title="Teaching Workspace">
      {/* ========================================================= */}
      {/* 1. OVERVIEW: Academic Course Console                      */}
      {/* ========================================================= */}
      {(!currentView || currentView === "overview") && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-semibold backdrop-blur-md mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Faculty Academic Portal • Fall 2026
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Academic Course Console
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-purple-100/90 max-w-xl">
                Publish materials, take student attendance, manage classroom rosters, and evaluate submissions.
              </p>
            </div>

            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-purple-900 hover:bg-purple-50 text-xs font-bold shadow-lg transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              Create New Class
            </button>
          </div>

          {/* Real Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Enrolled</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? "..." : summary?.total_enrolled_students || 0}
              </p>
              <span className="text-[11px] text-slate-400">Across {summary?.my_courses_count || 0} active courses</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Grading</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {loading ? "..." : summary?.pending_grading_count || 0}
              </p>
              <span className="text-[11px] text-amber-500 font-medium">Submissions to score</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Indexed PDFs (RAG)</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {loading ? "..." : summary?.indexed_materials_count || 0}
              </p>
              <span className="text-[11px] text-indigo-500 font-medium">Grounded in pgvector</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Course Health</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">98.5%</p>
              <span className="text-[11px] text-emerald-500 font-medium">Syllabus pacing optimal</span>
            </div>
          </div>

          {/* Main Content: Courses Taught & Academic Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                Classrooms You Are Teaching ({summary?.courses?.length || 0})
              </h2>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                + Create Another Classroom
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 text-purple-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Querying faculty classroom database...</p>
              </div>
            ) : !summary?.courses || summary.courses.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <BookOpen className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800 dark:text-white">No courses created yet</p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold"
                >
                  Launch Your First Classroom
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {summary.courses.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                          {c.code}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5" />
                          {c.enrollment_count} Students Enrolled
                        </span>
                      </div>

                      <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                        <Link href={`/classes/${c.id}`} className="hover:underline">
                          {c.title}
                        </Link>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {c.section} • {c.semester} • {c.schedule_info}
                      </p>

                      {/* Join code display for instructor */}
                      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Class Join Code</span>
                          <span className="font-mono text-sm font-extrabold text-slate-800 dark:text-slate-200">
                            {c.join_code}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyCode(c.id, c.join_code)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center gap-1 transition"
                        >
                          {copiedCodeId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedCodeId === c.id ? "Copied" : "Copy Code"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      <Link
                        href={`/classes/${c.id}?tab=attendance`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> Take Attendance
                      </Link>
                      <Link
                        href={`/classes/${c.id}?tab=material`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Upload Material
                      </Link>
                      <Link
                        href={`/classes/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        Manage Classroom <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TO-DO (Faculty Tasks & Grading Queue)                  */}
      {/* ========================================================= */}
      {currentView === "todo" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-6 h-6 text-purple-600" /> Faculty To-do & Grading Queue
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Track pending assignment grading, question draft reviews, and administrative deadlines.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs">
              <button
                onClick={() => setTodoFilter("all")}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  todoFilter === "all" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All ({todos.length})
              </button>
              <button
                onClick={() => setTodoFilter("pending")}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  todoFilter === "pending" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Pending ({todos.filter(t => !t.done).length})
              </button>
              <button
                onClick={() => setTodoFilter("completed")}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  todoFilter === "completed" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Done ({todos.filter(t => t.done).length})
              </button>
            </div>
          </div>

          {/* Add Todo Form */}
          <form onSubmit={handleAddTodo} className="flex gap-2">
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add a new grading task or faculty note..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <select
              value={newTodoCourse}
              onChange={(e) => setNewTodoCourse(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="CS-401">CS-401</option>
              <option value="CS-601">CS-601</option>
              <option value="CS-305">CS-305</option>
              <option value="General">General</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </form>

          {/* Task List */}
          <div className="space-y-2">
            {todos.filter(t => todoFilter === "all" ? true : todoFilter === "pending" ? !t.done : t.done).length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CheckSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No tasks created</p>
                <p className="text-xs text-slate-500 mt-1">Use the input above to organize grading deadlines, lecture prep, or faculty action items.</p>
              </div>
            ) : (
              todos
                .filter(t => todoFilter === "all" ? true : todoFilter === "pending" ? !t.done : t.done)
                .map((todo) => (
                <div
                  key={todo.id}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                    todo.done
                      ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-60"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        todo.done ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300 dark:border-slate-700 hover:border-purple-500"
                      }`}
                    >
                      {todo.done && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <p className={`text-xs font-semibold ${todo.done ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>
                        {todo.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{todo.course}</span>
                        <span>•</span>
                        <span>{todo.due}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. CALENDAR: Academic & Class Schedules                   */}
      {/* ========================================================= */}
      {currentView === "calendar" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-purple-600" /> Academic & Lecture Calendar
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Lecture schedules, assignment deadlines, and department meetings for {monthNames[month]} {year}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                {monthNames[month]} {year}
              </span>
              <button
                onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Month Grid */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 pt-3">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10 sm:h-12" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected = selectedDay === dayNum;
                  const isToday = new Date().getDate() === dayNum && new Date().getMonth() === month && new Date().getFullYear() === year;
                  const hasEvents = calendarEvents.some(e => new Date(e.start_time).getDate() === dayNum);
                  return (
                    <button
                      key={dayNum}
                      onClick={() => setSelectedDay(dayNum)}
                      className={`h-10 sm:h-12 rounded-xl text-xs font-bold flex flex-col items-center justify-center relative transition ${
                        isSelected
                          ? "bg-purple-600 text-white shadow-md"
                          : isToday
                          ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-300"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <span>{dayNum}</span>
                      {hasEvents && (
                        <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-purple-500"}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Event Details Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Events for {selectedDay ? `${monthNames[month]} ${selectedDay}` : "This Month"}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                  {calendarEvents.length} Scheduled
                </span>
              </h3>

              <div className="space-y-3">
                {calendarEvents.length === 0 ? (
                  <div className="py-8 text-center">
                    <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      No events scheduled for this month.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Classroom lectures follow the standard academic timetable.
                    </p>
                  </div>
                ) : (
                  calendarEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{evt.title}</span>
                        <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          {evt.event_type}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">{evt.description}</p>
                      <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(evt.start_time).toLocaleDateString()}</span>
                        {evt.location && <span>• {evt.location}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TIMETABLE: Weekly Teaching Schedule                    */}
      {/* ========================================================= */}
      {currentView === "timetable" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-600" /> Teaching Timetable
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Weekly scheduled lectures, lab slots, and assigned classroom locations.
              </p>
            </div>

            {/* Day Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs overflow-x-auto">
              {["All", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                <button
                  key={day}
                  onClick={() => setActiveDayFilter(day)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 ${
                    activeDayFilter === day
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {timetable.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No teaching timetable entries scheduled</p>
              <p className="text-xs text-slate-500 mt-1">Classroom schedules will be synchronized once scheduled with academic departments.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {timetable
                .filter(t => activeDayFilter === "All" || t.day === activeDayFilter)
                .map((slot) => (
                  <div
                    key={slot.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-300 dark:hover:border-purple-800 transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                        {slot.course_code}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {slot.day}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {slot.course_title}
                    </h3>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400">
                        <Clock className="w-3.5 h-3.5" />
                        {slot.start_time} - {slot.end_time}
                      </span>
                      <span>{slot.room} ({slot.building})</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. NOTIFICATIONS: Alerts & Submissions                    */}
      {/* ========================================================= */}
      {currentView === "notifications" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-6 h-6 text-purple-600" /> Faculty Notifications & Alerts
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Stay updated on student submissions, course enrollments, and academic announcements.
              </p>
            </div>

            <button
              onClick={markAllNotifsRead}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
            >
              Mark all as read
            </button>
          </div>

          <div className="space-y-2.5">
            {notifications.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Bell className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No notifications</p>
                <p className="text-xs text-slate-500 mt-1">You are all caught up! New alerts and course activity will appear here.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border transition flex items-start justify-between gap-4 ${
                    notif.is_read
                      ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75"
                      : "bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/60 shadow-xs"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.is_read ? "bg-slate-300" : "bg-purple-600"}`} />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        {notif.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    {notif.notification_type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. STUDENT PROGRESS / ANALYTICS                          */}
      {/* ========================================================= */}
      {currentView === "progress" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-600" /> Student Progress & Course Analytics
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Classroom submission rates, attendance compliance, and student performance metrics across your subjects.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Class Attendance</p>
              <p className="text-3xl font-extrabold text-emerald-600">92.4%</p>
              <p className="text-xs text-slate-500 pt-1">Across 3 active course sections</p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assignment Turn-in Rate</p>
              <p className="text-3xl font-extrabold text-purple-600">88.6%</p>
              <p className="text-xs text-slate-500 pt-1">42 submissions evaluated this month</p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Course Health Score</p>
              <p className="text-3xl font-extrabold text-indigo-600">98.5%</p>
              <p className="text-xs text-slate-500 pt-1">Syllabus pacing and student feedback optimal</p>
            </div>
          </div>

          {/* Performance breakdown by course */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Classroom Performance Breakdown</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(summary?.courses || []).map((c) => (
                <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        {c.code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{c.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{c.section} • {c.enrollment_count} enrolled students</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600 block">Attendance: 94%</span>
                      <span className="text-[11px] text-slate-400">Avg Score: 86.5/100</span>
                    </div>
                    <Link
                      href={`/classes/${c.id}?tab=attendance`}
                      className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 transition"
                    >
                      Attendance & Rosters
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. QUICKNOW AI (Faculty LMS Data Navigator & Assistant)   */}
      {/* ========================================================= */}
      {currentView === "ai" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-semibold backdrop-blur-md">
                  <Bot className="w-3.5 h-3.5" />
                  Quicknow AI Faculty Navigator
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight">Quicknow AI</h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGeminiKeyInput(getStoredGeminiKey());
                  setApiKeyModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition self-start sm:self-auto"
              >
                <Key className="w-3.5 h-3.5 text-purple-300" />
                <span>Gemini API:</span>
                {hasGeminiKey ? (
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Connected
                  </span>
                ) : (
                  <span className="text-amber-300 font-bold">Configure Key</span>
                )}
              </button>
            </div>
            <p className="text-xs sm:text-sm text-purple-100/90 max-w-2xl leading-relaxed">
              Instant assistant for all your portal records: query your taught classes, locate uploaded files (like Motion.pdf), inspect assignment submission deadlines, and verify student attendance.
            </p>
          </div>

          {/* Modal for setting Gemini API Key */}
          {apiKeyModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-purple-600" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Google Gemini API Key</h3>
                  </div>
                  <button
                    onClick={() => setApiKeyModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Paste your Google Gemini API key to power Quicknow AI with Gemini 1.5 Flash.
                  For a hosted deployment, configure <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px]">GEMINI_API_KEY</code> as a server-side environment variable.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-400 block">API Key</label>
                  <input
                    type="password"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline"
                    >
                      Get a free key from Google AI Studio ↗
                    </a>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveGeminiKey("")}
                    className="px-3 py-2 rounded-lg text-slate-500 hover:text-red-500 text-xs font-medium"
                  >
                    Clear Key
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveGeminiKey(geminiKeyInput)}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    Save &amp; Activate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Chatbot Interface */}
          <div className="rounded-2xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] overflow-hidden shadow-sm flex flex-col h-[650px]">
            {/* Chatbot Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#262832] flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Quicknow AI Faculty Chatbot</h2>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Faculty Page Examiner Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Grounded in your taught courses, classroom materials, student submissions, and roll-calls
                  </p>
                </div>
              </div>

              {aiMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAiMessages([])}
                  className="text-xs font-semibold text-slate-400 hover:text-red-500 transition px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Clear Chat
                </button>
              )}
            </div>

            {/* Chat Message Scroll Area */}
            <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
              {/* EMPTY STATE: Shown when no messages yet (No default response!) */}
              {aiMessages.length === 0 && (
                <div className="h-full flex flex-col justify-center items-center py-6 text-center space-y-6 max-w-2xl mx-auto">
                  <div className="space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400 shadow-sm">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Ask Quicknow AI anything about your faculty portal
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      Quicknow AI inspects your taught classes, locates lecture resources like <strong className="text-slate-800 dark:text-slate-200">Motion.pdf</strong>, tracks assignment deadlines, and monitors roll-call attendance.
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
                        onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "Where is Motion.pdf across my course materials?")}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-emerald-500/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 text-left transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">📄</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            Where is Motion.pdf?
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Search and locate Motion.pdf or lecture notes across all your classes.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "How many classes am I teaching and what are their sections?")}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-purple-500/60 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 text-left transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">👨‍🏫</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            How many classes am I teaching?
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Breakdown of taught courses, section codes, student counts, and rooms.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "What assignments are currently active and when are their submission deadlines?")}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500/60 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-left transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">⏰</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            Active assignments &amp; deadlines
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Review published homework, due dates, submission limits, and points.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "What is the attendance summary and roll-call status across my classes?")}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-amber-500/60 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 text-left transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">📊</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            Attendance &amp; roll-call status
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Inspect class attendance averages and identify students below threshold.
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CHAT MESSAGES CONVERSATION FLOW */}
              {aiMessages.map((msg) => (
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
              {aiGenerating && (
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
                    <span>Examining faculty courses, materials &amp; roll-calls...</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* QUICK SUGGESTION CHIPS (Above input) */}
            <div className="px-4 py-2 border-t border-slate-200/80 dark:border-[#262832] bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Quick ask:</span>
              <button
                type="button"
                onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "Where is Motion.pdf across my course materials?")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-700 dark:text-slate-300 shrink-0 transition"
              >
                📄 Motion.pdf
              </button>
              <button
                type="button"
                onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "How many classes am I teaching and what are their sections?")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-700 dark:text-slate-300 shrink-0 transition"
              >
                👨‍🏫 Taught Classes
              </button>
              <button
                type="button"
                onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "What assignments are currently active and when are their submission deadlines?")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-700 dark:text-slate-300 shrink-0 transition"
              >
                ⏰ Active Deadlines
              </button>
              <button
                type="button"
                onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "What is the attendance summary and roll-call status across my classes?")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-700 dark:text-slate-300 shrink-0 transition"
              >
                📊 Attendance Summary
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleAiQuery} className="p-3 border-t border-slate-200 dark:border-[#262832] flex gap-2 bg-white dark:bg-[#18191f]">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask anything about your courses, files (like Motion.pdf), active deadlines, or attendance..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={aiGenerating || !aiPrompt.trim()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Ask Quicknow
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. BUG / SUGGESTION                                      */}
      {/* ========================================================= */}
      {currentView === "feedback" && (
        <div className="space-y-6 max-w-2xl">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Bug className="w-6 h-6 text-purple-600" /> Platform Feedback & Bug Reporting
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Submit feedback, feature suggestions, or technical bugs to the academic IT engineering team.
            </p>
          </div>

          {ticketSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Thank you! Your feedback ticket has been dispatched to IT administration.</span>
            </div>
          )}

          <form onSubmit={handleCreateTicket} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Feedback Category</label>
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="bug">Technical Bug / Issue</option>
                <option value="feature">Faculty Feature Request</option>
                <option value="feedback">Classroom Experience Suggestion</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Subject</label>
              <input
                type="text"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="e.g. Ability to export attendance sheets in CSV format"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Detailed Description</label>
              <textarea
                value={ticketDesc}
                onChange={(e) => setTicketDesc(e.target.value)}
                rows={4}
                placeholder="Please describe the steps or details..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submittingTicket}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition"
            >
              {submittingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Platform Report
            </button>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. HELP DESK                                             */}
      {/* ========================================================= */}
      {currentView === "help" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-purple-600" /> Faculty Help Desk & IT Support
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Campus academic technology support, classroom AV help, and LMS portal assistance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <Phone className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Emergency Classroom IT Helpline</h3>
              <p className="text-xs text-slate-500">For smart projector, audio, or network issues during live lectures.</p>
              <p className="text-xs font-bold text-purple-600 pt-1">+91 (011) 2659-HELP / Ext. 4004</p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Deanery Academic Portal</h3>
              <p className="text-xs text-slate-500">Official syllabus verification, grade submission approvals, and course codes.</p>
              <p className="text-xs font-bold text-indigo-600 pt-1">academic-dean@arx.edu</p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Faculty Documentation</h3>
              <p className="text-xs text-slate-500">Guides on vectorizing PDF materials, setting up automated code testing, and roll-calls.</p>
              <p className="text-xs font-bold text-emerald-600 pt-1">arx.edu/lms-docs</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      <CreateClassModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          fetchSummary();
        }}
      />
    </DashboardShell>
  );
}
