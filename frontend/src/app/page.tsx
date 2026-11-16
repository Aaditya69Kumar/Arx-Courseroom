"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  UserCheck, 
  Layers, 
  FileText,
  ChevronRight,
  School
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col font-sans overflow-x-hidden">
      {/* Background Campus Image with Gradient Overlays */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/campus-bg.jpg"
          alt="University Campus"
          fill
          priority
          className="object-cover object-center filter brightness-[0.75] contrast-[1.05]"
        />
        {/* Soft Glass / Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/65 to-slate-950/95 backdrop-blur-[2px]" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 w-full border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <School className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Arx <span className="text-indigo-400 font-medium">CourseRoom</span>
              </span>
              <span className="block text-[10px] tracking-wider uppercase text-slate-300 font-semibold">
                Academic LMS Suite
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/login/student"
              className="text-sm font-medium text-slate-200 hover:text-white px-3 py-1.5 transition"
            >
              Student Portal
            </Link>
            <Link
              href="/login/instructor"
              className="text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-3.5 py-1.5 transition backdrop-blur-sm"
            >
              Faculty Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-6 py-12 lg:py-20 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 backdrop-blur-md text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Course RAG & Semantic PgVector
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight max-w-4xl leading-[1.15] drop-shadow-sm">
          The Intelligent Academic Operating System
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed">
          Unifying coursework, intelligent assessment, strict institutional roles, and instant teacher-verified AI retrieval for students and faculty.
        </p>

        {/* Dedicated Entry Cards (Student vs Faculty) */}
        <div className="mt-12 w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Student Card */}
          <Link
            href="/login/student"
            className="group relative p-8 rounded-2xl bg-slate-900/70 border border-white/15 hover:border-indigo-400/50 shadow-2xl backdrop-blur-xl transition duration-300 hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center mb-6 group-hover:scale-105 transition">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white group-hover:text-blue-300 transition flex items-center justify-between">
              Student Entrance
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-300 transition" />
            </h2>
            <p className="mt-2 text-sm text-slate-300 leading-normal">
              Access your enrolled classrooms, submit assignments, track grades, and consult the course AI grounded strictly in official faculty notes.
            </p>
            <div className="mt-6 inline-flex items-center text-xs font-semibold text-blue-400 gap-1">
              Sign in with institutional ID <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Instructor Card */}
          <Link
            href="/login/instructor"
            className="group relative p-8 rounded-2xl bg-slate-900/70 border border-white/15 hover:border-purple-400/50 shadow-2xl backdrop-blur-xl transition duration-300 hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-400/30 flex items-center justify-center mb-6 group-hover:scale-105 transition">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white group-hover:text-purple-300 transition flex items-center justify-between">
              Faculty & Staff
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 group-hover:text-purple-300 transition" />
            </h2>
            <p className="mt-2 text-sm text-slate-300 leading-normal">
              Manage syllabus architectures, upload course lecture PDFs for vector indexing, monitor classroom metrics, and approve evaluations.
            </p>
            <div className="mt-6 inline-flex items-center text-xs font-semibold text-purple-400 gap-1">
              Sign in with faculty credentials <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>

        {/* Academic Feature Pillars */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl">
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md text-left">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
            <h3 className="text-sm font-semibold text-white">Institutional Security</h3>
            <p className="text-xs text-slate-300 mt-1">Backend-enforced roles & zero direct database access.</p>
          </div>
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md text-left">
            <Sparkles className="w-5 h-5 text-indigo-400 mb-2" />
            <h3 className="text-sm font-semibold text-white">Curriculum RAG</h3>
            <p className="text-xs text-slate-300 mt-1">Syllabus-locked Q&A with pgvector semantic similarity.</p>
          </div>
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md text-left">
            <Layers className="w-5 h-5 text-sky-400 mb-2" />
            <h3 className="text-sm font-semibold text-white">Modular LMS</h3>
            <p className="text-xs text-slate-300 mt-1">Attendance, assessments, timetable, and materials.</p>
          </div>
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md text-left">
            <FileText className="w-5 h-5 text-amber-400 mb-2" />
            <h3 className="text-sm font-semibold text-white">Supabase Storage</h3>
            <p className="text-xs text-slate-300 mt-1">Encrypted, token-gated lecture & assignment vault.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 bg-slate-950/70 backdrop-blur-md py-6 text-center text-xs text-slate-400">
        <p>© 2026 Arx CourseRoom. Built for academic excellence and research institutions.</p>
      </footer>
    </div>
  );
}
