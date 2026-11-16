"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Search, 
  Users, 
  Loader2,
  FileText,
  UserCheck
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { JoinClassModal } from "@/components/join-class-modal";
import { api, Course } from "@/lib/api";
import { authStorage, User } from "@/lib/auth";

export default function ClassesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"active" | "completed" | "archived">("active");
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCourses({ all: false });
      setCourses(data || []);
    } catch (err: any) {
      setCourses([]);
      setError(err?.message || "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = authStorage.getUser();
    setCurrentUser(user);
    fetchCourses();
  }, []);

  const activeCourses = courses.filter(c => c.status === "active" || !c.status);
  const completedCourses = courses.filter(c => c.status === "completed");
  const archivedCourses = courses.filter(c => c.status === "archived");

  const displayedCourses = 
    activeTab === "active" ? activeCourses :
    activeTab === "completed" ? completedCourses : archivedCourses;

  return (
    <DashboardShell role={currentUser?.role === "instructor" ? "instructor" : "student"} title="Your classes">
      <div className="space-y-6">
        {/* Top Header Row matching Image 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Your classes</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Everything you teach or are enrolled in.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alert("Welcome to XCEED Learning! Access coursework, labs, syllabus, and study assistants.")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18191f] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
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

        {/* 4-Column Metric Stats Bar matching Image 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] overflow-hidden divide-x divide-slate-200 dark:divide-[#262832] shadow-xs">
          <div className="p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Classes</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              {courses.length}
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pending Work</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">0</p>
            <span className="text-[11px] text-slate-400">Not turned in</span>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Badges</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">0</p>
            <span className="text-[11px] text-slate-400">This session</span>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Due This Week</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">0</p>
            <span className="text-[11px] text-slate-400">Nothing due</span>
          </div>
        </div>

        {/* Tab Filters (Pill Style) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              activeTab === "active"
                ? "bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Active {activeCourses.length}
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              activeTab === "completed"
                ? "bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Completed {completedCourses.length}
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              activeTab === "archived"
                ? "bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Archived {archivedCourses.length}
          </button>
        </div>

        {/* Class Cards Grid matching Image 1 */}
        {loading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Loading courses...
            </p>
          </div>
        ) : displayedCourses.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832]">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No classes in this tab</h3>
            <p className="text-xs text-slate-400 mt-1">Use the Join class button above with your course code.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedCourses.map((c) => (
              <Link
                key={c.id}
                href={`/classes/${c.id}`}
                className="group rounded-xl bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Emerald Green Header Banner */}
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

                {/* Card Body */}
                <div className="p-4 pt-3.5 space-y-3">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {c.instructor?.first_name ? `${c.instructor.first_name} ${c.instructor.last_name || ""}`.trim() : "Faculty"}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> {c.enrollment_count ?? 0} students
                    </span>
                  </div>

                  {/* Schedule Pills */}
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
        )}
      </div>

      <JoinClassModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onSuccess={() => fetchCourses()}
      />
    </DashboardShell>
  );
}
