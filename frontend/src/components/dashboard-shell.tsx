"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  BookOpen, 
  CheckSquare, 
  Calendar, 
  Clock, 
  Bell, 
  UserCheck, 
  BarChart3, 
  Bug,
  HelpCircle,
  Power,
  Menu, 
  X, 
  Sparkles,
  Code2,
  MapPin,
  GraduationCap,
  Loader2
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { authStorage, User } from "@/lib/auth";
import { api, Course } from "@/lib/api";

interface DashboardShellProps {
  children: React.ReactNode;
  role: "student" | "instructor" | "admin";
  title?: string;
  isClassroom?: boolean;
}

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  isRed?: boolean;
  isAi?: boolean;
}

function DashboardShellContent({ children, role, title, isClassroom = false }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams?.get("view") || "";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<Course[]>([]);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const activeUser = authStorage.getUser();
    const tokens = authStorage.getTokens();

    if (!activeUser || !tokens) {
      router.push(role === "instructor" ? "/login/instructor" : "/login/student");
      return;
    }

    if (role === "instructor" && activeUser.role !== "instructor" && activeUser.role !== "admin") {
      router.push("/dashboard/student");
      return;
    }

    if (role === "student" && activeUser.role === "instructor") {
      router.push("/dashboard/instructor");
      return;
    }

    setUser(activeUser);
    setAuthorized(true);

    api.getCourses({ all: false })
      .then((courses) => setEnrolledClasses(courses.slice(0, 6)))
      .catch(() => {});
  }, [role, router]);

  const handleLogout = () => {
    authStorage.clearSession();
    router.push("/");
  };

  const dashBase = role === "instructor" ? "/dashboard/instructor" : "/dashboard/student";

  // Sidebar navigation with Quicknow AI
  const mainNavItems: NavItem[] = [
    { name: "Classes", href: role === "instructor" ? "/dashboard/instructor" : "/classes", icon: BookOpen },
    { name: "To-do", href: `${dashBase}?view=todo`, icon: CheckSquare },
    { name: "Calendar", href: `${dashBase}?view=calendar`, icon: Calendar },
    { name: "Timetable", href: `${dashBase}?view=timetable`, icon: Clock },
    { name: "Notifications", href: `${dashBase}?view=notifications`, icon: Bell },
    ...(role !== "instructor" ? [{ name: "My attendance", href: `${dashBase}?view=attendance`, icon: UserCheck }] : []),
    { name: role === "instructor" ? "Student progress" : "My progress", href: `${dashBase}?view=progress`, icon: BarChart3 },
    { name: "Quicknow AI", href: `${dashBase}?view=ai`, icon: Sparkles, isAi: true },
  ];

  const supportItems: NavItem[] = [
    { name: "Bug / Suggestion", href: `${dashBase}?view=feedback`, icon: Bug },
    { name: "Help desk", href: `${dashBase}?view=help`, icon: HelpCircle },
  ];

  const isItemActive = (item: NavItem) => {
    if (item.name === "Classes") {
      return (pathname === "/classes" || pathname === dashBase) && !currentView;
    }
    if (item.href.includes("?view=")) {
      const viewParam = item.href.split("?view=")[1];
      return currentView === viewParam;
    }
    return pathname === item.href;
  };

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="flex flex-col h-full select-none text-[13px]">
      {/* Main Nav Items */}
      <nav className="space-y-0.5">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all duration-150 ${
                active
                  ? "bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-sky-400 font-semibold shadow-xs"
                  : item.isRed
                  ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon 
                className={`w-[18px] h-[18px] flex-shrink-0 ${
                  active 
                    ? "text-sky-600 dark:text-sky-400" 
                    : item.isRed 
                    ? "text-red-500 dark:text-red-400" 
                    : item.isAi
                    ? "text-purple-500 dark:text-purple-400"
                    : "text-slate-500 dark:text-slate-400"
                }`} 
              />
              <span className="truncate">{item.name}</span>
              {item.isAi && (
                <span className="ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
                  RAG
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* MY CLASSES / SWITCH CLASS Section */}
      <div className="mt-6 flex-1 overflow-y-auto min-h-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-2">
          {isClassroom ? "Switch Class" : "My Classes"}
        </div>
        <div className="space-y-0.5">
          {enrolledClasses.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full inline-block bg-emerald-500 mr-2" />
              Loading classes...
            </div>
          ) : (
            enrolledClasses.map((cls) => {
              const isCurrentClass = pathname === `/classes/${cls.id}`;
              return (
                <Link
                  key={cls.id}
                  href={`/classes/${cls.id}`}
                  onClick={onLinkClick}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isCurrentClass
                      ? "text-sky-700 dark:text-sky-400 font-semibold bg-sky-50 dark:bg-slate-800"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cls.cover_color || "#10b981" }}
                  />
                  <span className="truncate max-w-[140px]">{cls.title}</span>
                </Link>
              );
            })
          )}
          <Link
            href="/classes"
            onClick={onLinkClick}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
          >
            All classes →
          </Link>
        </div>
      </div>

      {/* Support & Dev Team Card at Bottom */}
      <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-800 space-y-0.5 flex-shrink-0">
        {supportItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                active 
                  ? "bg-sky-50 text-sky-700 dark:bg-slate-800 dark:text-sky-400 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Join dev team card */}
        <div className="mt-3 p-3 rounded-xl bg-slate-100 dark:bg-[#1f2229] border border-slate-200 dark:border-[#2b2e37]">
          <div className="flex items-center gap-2 mb-1">
            <Code2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Join our dev team</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            XCEED invites developers to join the team.
          </p>
        </div>
      </div>
    </div>
  );

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#111318] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  const displayName = user?.first_name 
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : (role === "instructor" ? "Faculty" : "Student");

  const userInitials = user?.first_name 
    ? `${user.first_name[0]}${user.last_name?.[0] || ""}`.toUpperCase()
    : (role === "instructor" ? "FAC" : "STU");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#111318] flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar matching Image 1 & 2 */}
      <header className="sticky top-0 z-30 h-14 bg-white dark:bg-[#16171c] border-b border-slate-200 dark:border-[#22242a] flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle navigation drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <Link href="/classes" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-sm">XCEED Learning</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">Classes, coursework &amp; AI study material</p>
            </div>
          </Link>
        </div>

        {/* Right Nav Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Bell with Badge 1 */}
          <Link
            href={`${dashBase}?view=notifications`}
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 text-[9px] font-bold text-white bg-red-500 rounded-full">
              1
            </span>
          </Link>

          {/* XCEED dark badge */}
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-black dark:bg-[#252830] text-white border border-slate-700/40">
            [XCEED]
          </span>

          {/* Location pin */}
          <button
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Campus"
          >
            <MapPin className="w-[18px] h-[18px]" />
          </button>

          {/* Theme Toggle Button (Moon / Sun) */}
          <ThemeToggle />

          {/* User profile avatar & name */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold tracking-tight shadow-xs">
              {userInitials}
            </div>
            <span className="hidden md:inline-block text-xs font-semibold text-slate-900 dark:text-slate-100">
              {displayName}
            </span>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title="Logout"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-56 border-r border-slate-200 dark:border-[#22242a] bg-white dark:bg-[#16171c] py-3.5 px-2.5 shrink-0 overflow-y-auto">
          <SidebarContent />
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden bg-slate-950/60 backdrop-blur-xs flex">
            <div className="w-64 bg-white dark:bg-[#16171c] h-full p-4 flex flex-col shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white text-sm">Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent onLinkClick={() => setMobileMenuOpen(false)} />
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Dashboard Main Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-[#111318]">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function DashboardShell(props: DashboardShellProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-[#111318] flex items-center justify-center text-xs text-slate-400 font-semibold">
          Loading workspace...
        </div>
      }
    >
      <DashboardShellContent {...props} />
    </Suspense>
  );
}

