"use client";

import { useState } from "react";
import {
  Plus,
  X,
  KeyRound,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  ShieldCheck
} from "lucide-react";
import { api, Course } from "@/lib/api";

interface JoinClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (course: Course) => void;
}

export function JoinClassModal({ isOpen, onClose, onSuccess }: JoinClassModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await api.joinCourseByCode(code.trim());
      setSuccess(`Joined ${res.course.code} — ${res.course.title}!`);
      setTimeout(() => {
        onSuccess(res.course);
        setCode("");
        setSuccess(null);
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || "Failed to join class. Verify code and enrollment status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Join a Classroom
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your instructor-provided class code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hint */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-800 dark:text-white block mb-0.5">Tip:</span>
          Enter either the <span className="font-semibold text-slate-700 dark:text-slate-200">Course Code</span> (e.g. <code className="font-mono font-bold">CS-0240</code>) or the <span className="font-semibold text-slate-700 dark:text-slate-200">6 to 8-character Join Code</span> provided by your instructor.
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Class Code
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. DATA-305 or ARX-7K9P"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tracking-wider text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1.5 transition"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Enroll & Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
