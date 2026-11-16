"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  BookOpen, 
  Sparkles, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  Calendar as CalendarIcon,
  FileText,
  AlertCircle,
  KeyRound,
  CheckSquare,
  UserCheck,
  BarChart3,
  Bell,
  Loader2,
  HelpCircle,
  User as UserIcon,
  Bug,
  Send,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Phone,
  Shield,
  Heart,
  Plus,
  Trash2,
  Filter,
  Check,
  Layers,
  HelpCircle as QuestionIcon,
  Target,
  FileQuestion,
  GraduationCap,
  Key,
  Settings,
  Bot
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { JoinClassModal } from "@/components/join-class-modal";
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

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs font-semibold text-slate-500">Loading student workspace...</div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}

function StudentDashboardContent() {
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "overview";

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  // Subview Data States
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Interactive To-Do List state
  const [todos, setTodos] = useState<Array<{ id: string; title: string; course: string; due: string; done: boolean; pts: number }>>([]);
  const [newTodoText, setNewTodoText] = useState("");
  const [todoFilter, setTodoFilter] = useState<"all" | "pending" | "completed">("all");

  const [attendanceData, setAttendanceData] = useState<any | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<any | null>(null);
  const [selectedProgressCourseId, setSelectedProgressCourseId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(1);
  const [tickets, setTickets] = useState<HelpDeskTicket[]>([]);

  // Forms
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketType, setTicketType] = useState("help");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Quicknow AI State & Portal Context
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [allMaterials, setAllMaterials] = useState<CourseMaterial[]>([]);

  // No default response - chatbot history starts clean
  const [aiMessages, setAiMessages] = useState<Array<{
    id: string;
    role: "user" | "assistant";
    text: string;
    sources?: string[];
    model?: string;
    timestamp: string;
  }>>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch {
      setSummary({
        total_classes: 0,
        active_classes: 0,
        pending_work_count: 0,
        due_this_week_count: 0,
        attendance_rate: "0.0%",
        classes: [],
        upcoming_deadlines: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();

    if (currentView === "timetable") {
      api.getTimetable()
        .then(data => setTimetable(data || []))
        .catch(() => setTimetable([]));
    } else if (currentView === "calendar") {
      api.getCalendarEvents()
        .then(data => setCalendarEvents(data || []))
        .catch(() => setCalendarEvents([]));
    } else if (currentView === "attendance") {
      api.getMyAttendanceSummary()
        .then((res: any) => {
          const data = res.data || res;
          setAttendanceData(data);
          if (data?.courses?.length && !expandedCourseId) {
            setExpandedCourseId(data.courses[0].course_id);
          }
        })
        .catch(() => {});
    } else if (currentView === "progress") {
      api.getMyProgressSummary()
        .then((res: any) => {
          const data = res.data || res;
          setProgressData(data);
          if (data?.courses?.length && !selectedProgressCourseId) {
            setSelectedProgressCourseId(data.courses[0].course_id);
          }
        })
        .catch(() => {});
    } else if (currentView === "notifications") {
      api.getNotifications()
        .then(res => {
          setNotifications(res?.notifications || []);
          setUnreadNotifCount(res?.unread_count || 0);
        })
        .catch(() => {
          setNotifications([]);
          setUnreadNotifCount(0);
        });
    } else if (currentView === "help" || currentView === "feedback") {
      api.getTickets().then(setTickets).catch(() => {});
    }
  }, [currentView]);

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
      alert("Ticket submitted successfully to Academic IT.");
    } catch (err: any) {
      alert(err?.message || "Failed to submit ticket. Please check connection and try again.");
    } finally {
      setSubmittingTicket(false);
    }
  };

  useEffect(() => {
    setHasGeminiKey(Boolean(getStoredGeminiKey()));
    api.getMaterials().then(mats => {
      if (mats && mats.length > 0) {
        setAllMaterials(prev => {
          const combined = [...prev];
          mats.forEach(m => {
            if (!combined.some(c => c.id === m.id || c.file_name === m.file_name)) {
              combined.push(m);
            }
          });
          return combined;
        });
      }
    }).catch(() => {});
  }, []);

  const handleSaveGeminiKey = (key: string) => {
    setStoredGeminiKey(key);
    setHasGeminiKey(Boolean(key.trim()));
    setApiKeyModalOpen(false);
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, aiLoading]);

  const handleAiQuery = async (e: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const queryToRun = customPrompt || aiQuery;
    if (!queryToRun.trim() || aiLoading) return;
    
    const userMessage = {
      id: `usr-${Date.now()}`,
      role: "user" as const,
      text: queryToRun.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setAiMessages(prev => [...prev, userMessage]);
    if (!customPrompt) setAiQuery("");
    setAiLoading(true);

    try {
      const u = authStorage.getUser();
      const res = await askQuicknowAI(queryToRun.trim(), {
        user: u ? {
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          email: u.email,
        } : { first_name: "Student", role: "student" },
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
        attendance: attendanceData?.summary ? {
          overall_percentage: parseFloat(attendanceData.summary.overall_percentage) || 91,
          attended_sessions: attendanceData.summary.attended_sessions || 20,
          total_sessions: attendanceData.summary.total_sessions || 22,
          status: attendanceData.summary.status_tag || "Eligible",
        } : (summary?.attendance_rate ? {
          overall_percentage: parseFloat(summary.attendance_rate) || 92,
          attended_sessions: 22,
          total_sessions: 24,
          status: "Good Standing",
        } : undefined),
        timetable: timetable,
        calendarEvents: calendarEvents,
        role: "student",
      });

      const assistantMessage = {
        id: `ast-${Date.now()}`,
        role: "assistant" as const,
        text: res.text,
        sources: res.sources,
        model: res.model || (res.engine === "gemini" ? "Google Gemini" : "Live Page Engine"),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setAiMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setAiMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant" as const,
          text: `⚠️ Query error: ${err.message || "Unknown error"}. Please check your connection.`,
          sources: ["Quicknow AI System"],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // ---------- CALENDAR LOGIC ----------
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const today = new Date();
  const daysInMonth = getDaysInMonth(calendarDate);
  const firstDay = getFirstDayOfMonth(calendarDate);

  const getEventsForDay = (day: number) => {
    return calendarEvents.filter(evt => {
      const evtDate = new Date(evt.start_time);
      return (
        evtDate.getDate() === day &&
        evtDate.getMonth() === calendarDate.getMonth() &&
        evtDate.getFullYear() === calendarDate.getFullYear()
      );
    });
  };

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      calendarDate.getMonth() === today.getMonth() &&
      calendarDate.getFullYear() === today.getFullYear()
    );
  };

  return (
    <DashboardShell role="student" title="Student Workspace">
      {/* ========================================================= */}
      {/* VIEW: 1. OVERVIEW (Classes - exactly matching Image 1)     */}
      {/* ========================================================= */}
      {currentView === "overview" && (
        <div className="space-y-6">
          {/* Top heading row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Your classes</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Everything you teach or are enrolled in.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => alert("Welcome to XCEED Learning! Use the sidebar to track assignments, view your schedule, and study with AI.")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18191f] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                Getting started
              </button>
              <button
                onClick={() => setJoinModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition shadow-xs"
              >
                Join class
              </button>
            </div>
          </div>

          {/* Metric stats card bar (4 columns matching Image 1) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] overflow-hidden divide-x divide-slate-200 dark:divide-[#262832] shadow-xs">
            <div className="p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Classes</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                {loading ? "..." : summary?.total_classes || 1}
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pending Work</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {loading ? "0" : summary?.pending_work_count || 0}
              </p>
              <span className="text-[11px] text-slate-400">Not turned in</span>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Badges</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">0</p>
              <span className="text-[11px] text-slate-400">This session</span>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Due This Week</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {loading ? "0" : summary?.due_this_week_count || 0}
              </p>
              <span className="text-[11px] text-slate-400">Nothing due</span>
            </div>
          </div>

          {/* Active / Completed / Archived filter pills */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-semibold">
              Active {summary?.active_classes || 1}
            </span>
            <span className="px-3 py-1 rounded-full text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
              Completed 0
            </span>
            <span className="px-3 py-1 rounded-full text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
              Archived 0
            </span>
          </div>

          {/* Enrolled course card matching Image 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(summary?.classes || []).map((c) => (
              <Link
                key={c.id}
                href={`/classes/${c.id}`}
                className="group rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Emerald green banner header */}
                <div
                  className="p-5 pb-4 relative"
                  style={{ backgroundColor: c.cover_color || "#059669" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-white max-w-[75%]">
                      <h3 className="text-sm font-bold leading-snug line-clamp-2">
                        {c.title}
                      </h3>
                      <p className="text-xs text-white/85 mt-1 font-medium">
                        {c.section} · {c.code}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-white/20 text-white backdrop-blur-xs">
                      STUDENT
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4 pt-3.5 space-y-3">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {c.instructor?.first_name ? `${c.instructor.first_name} ${c.instructor.last_name || ""}`.trim() : "Faculty"}
                  </p>
                  
                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> {c.enrollment_count ?? 0} students
                    </span>
                  </div>

                  {/* Schedule Info */}
                  {c.schedule_info && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[11px] px-2.5 py-1 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {c.schedule_info}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW: 2. TO-DO (Interactive Checklist with Filters)        */}
      {/* ========================================================= */}
      {currentView === "todo" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-6 h-6 text-blue-600" /> To-do
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Manage upcoming academic deadlines, labs, and personal study tasks.
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

          {/* Quick Add Task */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTodoText.trim()) return;
              setTodos([
                ...todos,
                {
                  id: `td-${Date.now()}`,
                  title: newTodoText.trim(),
                  course: "General",
                  due: "Self-paced",
                  done: false,
                  pts: 5
                }
              ]);
              setNewTodoText("");
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add a new academic task or assignment reminder..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18191f] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </form>

          {/* Task List */}
          <div className="space-y-3">
            {todos.filter(t => {
              if (todoFilter === "pending") return !t.done;
              if (todoFilter === "completed") return t.done;
              return true;
            }).length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832]">
                <CheckSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No tasks found</p>
                <p className="text-xs text-slate-500 mt-1">Add tasks above to organize your personal study checklist.</p>
              </div>
            ) : (
              todos
                .filter(t => {
                  if (todoFilter === "pending") return !t.done;
                  if (todoFilter === "completed") return t.done;
                  return true;
                })
                .map(t => (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] flex items-center justify-between gap-4 transition ${
                      t.done ? "opacity-60" : ""
                    }`}
                  >
                  <div className="flex items-center gap-3.5">
                    <button
                      onClick={() => {
                        setTodos(todos.map(x => x.id === t.id ? { ...x, done: !x.done } : x));
                      }}
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition border ${
                        t.done
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 dark:border-slate-600 hover:border-blue-500"
                      }`}
                    >
                      {t.done && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <p className={`text-sm font-semibold text-slate-900 dark:text-white ${t.done ? "line-through text-slate-400 dark:text-slate-500" : ""}`}>
                        {t.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="font-mono font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                          {t.course}
                        </span>
                        <span className="text-slate-400">Due: {t.due}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{t.pts} pts</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setTodos(todos.filter(x => x.id !== t.id))}
                    className="p-2 text-slate-400 hover:text-red-500 transition"
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
      {/* VIEW: 3. CALENDAR (Full Interactive Month Grid & Events)   */}
      {/* ========================================================= */}
      {currentView === "calendar" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-blue-600" /> Academic Calendar
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Monthly schedule, lecture milestones, exam windows, and lab deadlines.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18191f] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#18191f] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18191f] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCalendarDate(new Date());
                  setSelectedDay(today.getDate());
                }}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
              >
                Today
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Month Grid */}
            <div className="lg:col-span-2 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] p-5 shadow-xs">
              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {/* Empty cells before month starts */}
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dayEvents = getEventsForDay(day);
                  const isCurrentDay = isToday(day);
                  const isDaySelected = selectedDay === day;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(isDaySelected ? null : day)}
                      className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-between text-xs font-semibold relative transition-all ${
                        isCurrentDay
                          ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 ring-2 ring-blue-400"
                          : isDaySelected
                          ? "bg-sky-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500 font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800/60"
                      }`}
                    >
                      <span className="self-end pr-1 pt-0.5 text-[11px] sm:text-xs">{day}</span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-1 pb-1">
                          {dayEvents.slice(0, 3).map((evt, idx) => (
                            <span
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCurrentDay 
                                  ? "bg-white" 
                                  : evt.event_type === "exam"
                                  ? "bg-red-500"
                                  : evt.event_type === "deadline"
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day / Upcoming Events Details */}
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedDay 
                      ? `${monthNames[calendarDate.getMonth()]} ${selectedDay}, ${calendarDate.getFullYear()}`
                      : "Upcoming Milestones"}
                  </h3>
                  {selectedDay && (
                    <button
                      onClick={() => setSelectedDay(null)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View all
                    </button>
                  )}
                </div>

                {(() => {
                  const eventsToShow = selectedDay ? getEventsForDay(selectedDay) : calendarEvents;

                  if (eventsToShow.length === 0) {
                    return (
                      <div className="py-8 text-center">
                        <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          No events scheduled {selectedDay ? "on this date" : "for this month"}.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Regular lectures follow standard timetable.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {eventsToShow.map((evt) => (
                        <div
                          key={evt.id}
                          className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/40 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                evt.event_type === "exam"
                                  ? "bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300"
                                  : evt.event_type === "deadline"
                                  ? "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300"
                                  : "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
                              }`}
                            >
                              {evt.event_type}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(evt.start_time).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {evt.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {evt.description}
                          </p>
                          <p className="text-[10px] font-medium text-slate-400">
                            Location: {evt.location || "Online"}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW: 4. TIMETABLE (Weekly Lecture Schedule)               */}
      {/* ========================================================= */}
      {currentView === "timetable" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-indigo-600" /> Timetable
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Weekly class timetable, hall allocations, and lab hours.
            </p>
          </div>

          {timetable.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832]">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No timetable entries scheduled</p>
              <p className="text-xs text-slate-500 mt-1">Class schedules will appear here once announced by your faculty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {timetable.map((slot) => (
                <div
                  key={slot.id}
                  className="p-5 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                      {slot.day}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {slot.start_time} - {slot.end_time}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {slot.course_code}: {slot.course_title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Room: {slot.room} · {slot.building}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      Instructor: {slot.instructor_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW: 5. NOTIFICATIONS                                     */}
      {/* ========================================================= */}
      {currentView === "notifications" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-6 h-6 text-amber-500" /> Notifications
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Announcements, assignment posts, and grade alerts.
              </p>
            </div>
            <button
              onClick={async () => {
                await api.markAllNotificationsRead().catch(() => {});
                setNotifications(notifications.map(n => ({ ...n, is_read: true })));
                setUnreadNotifCount(0);
              }}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18191f] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
            >
              Mark all as read
            </button>
          </div>

          <div className="rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
            {notifications.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No new notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition ${
                    !n.is_read ? "bg-sky-50/50 dark:bg-sky-950/20" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {n.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-400 block pt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={async () => {
                        await api.markNotificationRead(n.id).catch(() => {});
                        setNotifications(notifications.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                        setUnreadNotifCount(Math.max(0, unreadNotifCount - 1));
                      }}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW: 6. MY ATTENDANCE                                     */}
      {/* ========================================================= */}
      {currentView === "attendance" && (() => {
        const attendanceCourses = attendanceData?.courses || [];
        const totalAttendedGlobal = attendanceCourses.reduce((sum: number, c: any) => sum + (c.attended || 0), 0);
        const totalEligibleGlobal = attendanceCourses.reduce((sum: number, c: any) => sum + (c.eligible_sessions || 0), 0);
        const aggregatePct = totalEligibleGlobal > 0 ? ((totalAttendedGlobal / totalEligibleGlobal) * 100).toFixed(1) : "100.0";
        const numAgg = parseFloat(aggregatePct);
        const eligibilityLabel = numAgg >= 75 ? "Eligible" : (numAgg >= 65 ? "Warning" : "Critical");
        const eligibilityColor = numAgg >= 75 ? "text-emerald-600" : (numAgg >= 65 ? "text-amber-500" : "text-red-600");

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-emerald-600" /> My attendance
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time subject-wise roll call attendance, percentage thresholds, and daily audit history.
              </p>
            </div>

            {/* Overall Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] shadow-xs">
                <p className="text-xs text-slate-400">Aggregate Attendance</p>
                <p className={`text-3xl font-extrabold ${eligibilityColor} mt-1`}>{aggregatePct}%</p>
                <p className="text-[11px] text-slate-500 mt-1">Institutional requirement: 75%</p>
              </div>
              <div className="p-5 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] shadow-xs">
                <p className="text-xs text-slate-400">Classes Attended</p>
                <p className="text-3xl font-extrabold text-blue-600 mt-1">
                  {totalAttendedGlobal} / {totalEligibleGlobal}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Across all enrolled subjects</p>
              </div>
              <div className="p-5 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] shadow-xs">
                <p className="text-xs text-slate-400">Eligibility Status</p>
                <p className={`text-3xl font-extrabold ${eligibilityColor} mt-1`}>{eligibilityLabel}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {numAgg >= 75 ? "Cleared for End-Sem Exam" : "At Risk — Attend upcoming lectures"}
                </p>
              </div>
            </div>

            {/* Subject Breakdown */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Enrolled Subjects ({attendanceCourses.length})</span>
                <span className="text-xs font-normal text-slate-400">Click any subject to view day-by-day attendance history</span>
              </h2>

              {attendanceCourses.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] space-y-2">
                  <UserCheck className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No attendance records found</p>
                  <p className="text-xs text-slate-500">You will see your subject-wise attendance here once instructors take roll call.</p>
                </div>
              ) : (
                attendanceCourses.map((c: any) => {
                  const isExpanded = expandedCourseId === c.course_id;
                  const cPct = c.percentage_num !== undefined ? c.percentage_num : parseFloat(c.percentage || "100");
                  const barColor = cPct >= 75 ? "bg-emerald-500" : (cPct >= 65 ? "bg-amber-500" : "bg-red-500");
                  const textColor = cPct >= 75 ? "text-emerald-600" : (cPct >= 65 ? "text-amber-500" : "text-red-600");

                  return (
                    <div
                      key={c.course_id}
                      className="rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] shadow-xs overflow-hidden transition"
                    >
                      {/* Subject Card Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedCourseId(isExpanded ? null : c.course_id)}
                        className="w-full p-5 text-left flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition cursor-pointer"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                              {c.course_code}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              {c.course_title}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Instructor: Prof. {c.instructor_name || "Faculty"}
                          </p>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden mt-3 max-w-xl">
                            <div className={`${barColor} h-2.5 rounded-full transition-all`} style={{ width: `${Math.min(cPct, 100)}%` }} />
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                              Attended: {c.attended} / {c.eligible_sessions} lectures
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium">
                              ✓ Present: {c.present}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-medium">
                              ✕ Absent: {c.absent}
                            </span>
                            {c.late_entry_count > 0 && (
                              <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium">
                                ⏰ Late Entry: {c.late_entry_count} (Exempt)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                          <div className="text-right">
                            <span className={`text-2xl font-extrabold ${textColor} block`}>{c.percentage}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cPct >= 75 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                              {c.status_tag || (cPct >= 75 ? "Safe" : "Warning")}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </button>

                      {/* Day-by-Day Attendance History (Expanded View) */}
                      {isExpanded && (
                        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Day-by-Day Attendance History ({c.history?.length || 0} Lectures)
                            </h4>
                            <span className="text-[11px] text-slate-400">Sorted most recent first</span>
                          </div>

                          {!c.history || c.history.length === 0 ? (
                            <p className="text-xs text-slate-500 py-3 text-center">No individual session records logged yet for this subject.</p>
                          ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-slate-800 overflow-hidden">
                              {c.history.map((h: any, idx: number) => (
                                <div key={h.session_id || idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {h.date_display || h.date}
                                      </span>
                                      <span className="text-slate-400">•</span>
                                      <span className="font-medium text-slate-700 dark:text-slate-300">
                                        {h.topic || "Course Lecture"}
                                      </span>
                                    </div>
                                    {h.remarks && (
                                      <p className="text-[11px] text-slate-400">
                                        Note: {h.remarks}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 self-start sm:self-auto">
                                    {h.status === "present" && (
                                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 text-xs">
                                        ✓ Present
                                      </span>
                                    )}
                                    {h.status === "absent" && (
                                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 text-xs">
                                        ✕ Absent
                                      </span>
                                    )}
                                    {h.status === "late_entry" && (
                                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 text-xs flex items-center gap-1">
                                        ⏰ Late Entry
                                      </span>
                                    )}
                                    {h.status === "late" && (
                                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 text-xs">
                                        🟡 Late
                                      </span>
                                    )}
                                    {h.status === "excused" && (
                                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 text-xs">
                                        🔵 Excused
                                      </span>
                                    )}
                                    {h.status === "pending" && (
                                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs">
                                        ⚪ Unmarked
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* VIEW: 7. MY PROGRESS                                       */}
      {/* ========================================================= */}
      {currentView === "progress" && (() => {
        const progressCourses = progressData?.courses || [];
        const selectedCourse = progressCourses.find((c: any) => c.course_id === selectedProgressCourseId) || progressCourses[0] || null;
        const aggCompletion = progressData?.aggregate?.completion_rate || "100%";
        const aggQuizzes = progressData?.aggregate?.quizzes_avg || "N/A";
        const aggCompletedItems = progressData?.aggregate?.completed_items || 0;
        const aggTotalItems = progressData?.aggregate?.total_items || 0;
        const aggBadges = progressData?.aggregate?.earned_badges || 3;

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-600" /> My progress
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Subject-wise completion rates, quiz scores, coursework submissions, and academic milestones.
              </p>
            </div>

            {/* Overall Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] shadow-xs">
                <p className="text-xs text-slate-400">Course Completion</p>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">{aggCompletion}</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] shadow-xs">
                <p className="text-xs text-slate-400">Quizzes Average</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{aggQuizzes}</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] shadow-xs">
                <p className="text-xs text-slate-400">Milestones Done</p>
                <p className="text-2xl font-extrabold text-purple-600 mt-1">{aggCompletedItems} / {aggTotalItems}</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] shadow-xs">
                <p className="text-xs text-slate-400">Earned Badges</p>
                <p className="text-2xl font-extrabold text-amber-500 mt-1">{aggBadges}</p>
              </div>
            </div>

            {/* Subject Selector Tabs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Subject-Wise Progress
                </h2>
                <span className="text-xs text-slate-400">Select any subject to view detailed breakdown</span>
              </div>

              {progressCourses.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] space-y-2">
                  <BarChart3 className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No coursework recorded</p>
                  <p className="text-xs text-slate-500">Join classroom courses to view your assignments, quizzes, and academic progress.</p>
                </div>
              ) : (
                <>
                  {/* Subject Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    {progressCourses.map((c: any) => {
                      const isSelected = selectedCourse?.course_id === c.course_id;
                      return (
                        <button
                          key={c.course_id}
                          type="button"
                          onClick={() => setSelectedProgressCourseId(c.course_id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span className="font-mono">{c.course_code}</span>
                          <span>•</span>
                          <span>{c.completion_percentage}% Done</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Subject Detailed Card */}
                  {selectedCourse && (
                    <div className="p-6 rounded-2xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] shadow-xs space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              {selectedCourse.course_code}
                            </span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                              {selectedCourse.course_title}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Instructor: Prof. {selectedCourse.instructor_name || "Faculty"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-extrabold text-indigo-600 block">
                            {selectedCourse.completion_percentage}%
                          </span>
                          <span className="text-xs text-slate-400">Module Completion</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-3 rounded-full transition-all"
                            style={{ width: `${Math.min(selectedCourse.completion_percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Subject Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                          <p className="text-slate-400">Assignments Done</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                            {selectedCourse.assignments_submitted} / {selectedCourse.assignments_total}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                          <p className="text-slate-400">Quizzes Attempted</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                            {selectedCourse.quizzes_attempted} / {selectedCourse.quizzes_total}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                          <p className="text-slate-400">Quizzes Average</p>
                          <p className="text-lg font-bold text-emerald-600 mt-0.5">
                            {selectedCourse.quizzes_avg_score || "N/A"}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                          <p className="text-slate-400">Classroom Link</p>
                          <Link
                            href={`/classes/${selectedCourse.course_id}`}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            Go to Class Workspace →
                          </Link>
                        </div>
                      </div>

                      {/* Coursework Milestones List */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Coursework &amp; Assessment Milestones ({selectedCourse.items?.length || 0})
                        </h4>

                        {!selectedCourse.items || selectedCourse.items.length === 0 ? (
                          <p className="text-xs text-slate-500 py-4 text-center">No assignments or quizzes published yet for this course.</p>
                        ) : (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 overflow-hidden">
                            {selectedCourse.items.map((item: any) => (
                              <div
                                key={item.id}
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                      item.type === "quiz"
                                        ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                        : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                    }`}>
                                      {item.type}
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {item.title}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400">
                                    Due: {item.due_date ? new Date(item.due_date).toLocaleString() : "TBA"} • Max: {item.max_score} pts
                                    {item.feedback && <span className="ml-2 text-indigo-600 dark:text-indigo-400 font-medium">Feedback: &quot;{item.feedback}&quot;</span>}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  {item.status === "graded" && (
                                    <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      ✓ Graded: {item.score} / {item.max_score} pts
                                    </span>
                                  )}
                                  {item.status === "submitted" && (
                                    <span className="px-2.5 py-1 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                      ✓ Submitted
                                    </span>
                                  )}
                                  {item.status === "completed" && (
                                    <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      ✓ Attempted: {item.score} / {item.max_score}
                                    </span>
                                  )}
                                  {item.status === "late" && (
                                    <span className="px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                                      ⏰ Late Submission
                                    </span>
                                  )}
                                  {item.status === "missing" && (
                                    <span className="px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                      ✕ Missing / Overdue
                                    </span>
                                  )}
                                  {item.status === "pending" && (
                                    <span className="px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                      ⚪ Pending
                                    </span>
                                  )}

                                  <Link
                                    href={`/classes/${selectedCourse.course_id}?tab=${item.type === "quiz" ? "quizzes" : "assignments"}`}
                                    className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition text-xs"
                                  >
                                    View →
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Badges showcase */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Achievements &amp; Badges</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Academic Scholar</h4>
                    <p className="text-[10px] text-slate-500">Active coursework completion &gt;70%</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Consistent Attendance</h4>
                    <p className="text-[10px] text-slate-500">&gt;75% institutional attendance met</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Active Submissions</h4>
                    <p className="text-[10px] text-slate-500">Timely lab and problem set submissions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* VIEW: 8. SOS (Campus & Academic Urgent Helpline)           */}
      {/* ========================================================= */}
      {currentView === "sos" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" /> SOS — Emergency &amp; Urgent Help
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Direct emergency contacts, campus security dispatch, and urgent student assistance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl bg-white dark:bg-[#18191f] border border-red-200 dark:border-red-900/40 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Campus Security (24/7)</h3>
                  <p className="text-xs text-slate-500">Immediate security dispatch and emergency rescue</p>
                </div>
              </div>
              <a
                href="tel:112"
                className="block w-full py-2.5 rounded-lg bg-red-600 text-white text-xs font-bold text-center hover:bg-red-700 transition"
              >
                Call Security Control Room (Ext: 100)
              </a>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#18191f] border border-blue-200 dark:border-blue-900/40 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">IT &amp; Examination Emergency</h3>
                  <p className="text-xs text-slate-500">Live test disruption, credential lock, lab outages</p>
                </div>
              </div>
              <Link
                href="/dashboard/student?view=help"
                className="block w-full py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold text-center hover:bg-blue-700 transition"
              >
                Open Urgent IT Helpdesk Ticket
              </Link>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#18191f] border border-emerald-200 dark:border-emerald-900/40 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Student Wellness &amp; Counseling</h3>
                  <p className="text-xs text-slate-500">Confidential mental health guidance and stress relief</p>
                </div>
              </div>
              <button
                onClick={() => alert("Campus Wellness Center: Clinic Building A, Ground Floor. Direct Contact: wellness@xceed.ac.in")}
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
              >
                Contact Counselor Hotline
              </button>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#18191f] border border-amber-200 dark:border-amber-900/40 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dean of Academic Affairs</h3>
                  <p className="text-xs text-slate-500">Urgent attendance condonation &amp; exam disputes</p>
                </div>
              </div>
              <button
                onClick={() => alert("Academic Affairs Cell: Open Mon-Fri 9:00 AM - 5:00 PM. Room 101, Main Admin Block.")}
                className="w-full py-2.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition"
              >
                Office Information &amp; Hours
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW: 9. QUICKNOW AI (LMS Data Navigator & File Finder)    */}
      {/* ========================================================= */}
      {currentView === "ai" && (
        <div className="space-y-6">
          {/* Header block for Quicknow AI */}
          <div className="text-center py-6 sm:py-8 max-w-2xl mx-auto space-y-2 relative">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400 mb-3 shadow-xs">
              <Bot className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Quicknow AI
              </h1>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                LMS DATA NAVIGATOR
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
              Your instant assistant for all platform data: find documents (like Motion.pdf), check enrolled classes, view pending assignments &amp; deadlines, and track attendance.
            </p>

            {/* Gemini API Key Bar */}
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGeminiKeyInput(getStoredGeminiKey());
                  setApiKeyModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
              >
                <Key className="w-3.5 h-3.5 text-purple-500" />
                <span>Gemini API:</span>
                {hasGeminiKey ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Connected
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                    Configure Key (Optional)
                  </span>
                )}
              </button>
            </div>
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
                  Paste your Google Gemini API key here to power Quicknow AI with Gemini 1.5 Flash.
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

          {/* Interactive Chatbot Container */}
          <div className="rounded-2xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] overflow-hidden shadow-lg flex flex-col h-[650px]">
            {/* Chatbot Top Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#262832] flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Quicknow AI Chatbot</h2>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Page Examiner Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Grounded in live course materials, assignments, deadlines, and attendance data
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
                      Ask Quicknow AI anything about this page
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      Quicknow AI inspects all your courses, locates files like <strong className="text-slate-800 dark:text-slate-200">Motion.pdf</strong>, checks assignment deadlines, and tracks attendance records.
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
                        onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "Where is Motion.pdf and how do I access it?")}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-emerald-500/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 text-left transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">📄</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            Where is Motion.pdf?
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Find Motion.pdf across your course materials &amp; get direct download steps.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "How many classes do I have and what are their details?")}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-purple-500/60 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 text-left transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">📚</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            How many classes do I have?
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Breakdown of your enrolled courses, codes, professors &amp; meeting slots.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "How many assignments do I have to do and what are their deadlines?")}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500/60 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-left transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">⏰</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            What assignments are due?
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Inspect pending submissions, impending deadlines &amp; max score rubrics.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "What is my current attendance percentage and record?")}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-amber-500/60 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 text-left transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">📊</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            What is my attendance status?
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Live attendance percentage, attended sessions &amp; exam eligibility.
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
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs sm:text-sm leading-relaxed shadow-sm">
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
              {aiLoading && (
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
                    <span>Examining all details on this page &amp; generating answer...</span>
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
                onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "Where is Motion.pdf?")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-700 dark:text-slate-300 shrink-0 transition"
              >
                📄 Motion.pdf
              </button>
              <button
                type="button"
                onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "How many classes do I have?")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-700 dark:text-slate-300 shrink-0 transition"
              >
                📚 My Classes
              </button>
              <button
                type="button"
                onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "What assignments are due and their deadline?")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-700 dark:text-slate-300 shrink-0 transition"
              >
                ⏰ Due Assignments
              </button>
              <button
                type="button"
                onClick={() => handleAiQuery({ preventDefault: () => {} } as any, "What is my attendance status?")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-700 dark:text-slate-300 shrink-0 transition"
              >
                📊 Attendance
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleAiQuery} className="p-3 sm:p-4 border-t border-slate-200 dark:border-[#262832] flex gap-2 bg-white dark:bg-[#18191f]">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask anything: 'where is Motion.pdf', 'how many classes', 'what is due'..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiQuery.trim()}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Ask Quicknow</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW: 10. BUG / SUGGESTION & HELP DESK                     */}
      {/* ========================================================= */}
      {(currentView === "help" || currentView === "feedback") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {currentView === "feedback" ? <Bug className="w-5 h-5 text-amber-500" /> : <HelpCircle className="w-5 h-5 text-blue-600" />}
              {currentView === "feedback" ? "Report a Bug or Suggestion" : "Submit Help Desk Ticket"}
            </h2>
            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="help">General Academic IT Help</option>
                  <option value="bug">Platform Bug Report</option>
                  <option value="suggestion">Feature Suggestion</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="e.g. SQAAT lab submission file upload issue"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={4}
                  required
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Detail your request or bug reproduction steps..."
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submittingTicket}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50"
              >
                {submittingTicket ? "Submitting..." : "Send to Academic IT"}
              </button>
            </form>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Support Tickets</h2>
            <div className="space-y-3">
              {tickets.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No open tickets. Everything is running smoothly.</p>
              ) : (
                tickets.map(t => (
                  <div key={t.id} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 dark:text-white">{t.subject}</span>
                      <span className="uppercase text-[9px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600">
                        {t.status}
                      </span>
                    </div>
                    <p className="text-slate-500">{t.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Join Class Modal */}
      <JoinClassModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onSuccess={() => fetchSummary()}
      />
    </DashboardShell>
  );
}
