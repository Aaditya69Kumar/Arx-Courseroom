"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ShieldAlert, Users, BookOpen, Key, Activity } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <DashboardShell role="admin" title="Administration & Governance">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Institutional Administration</h1>
        <p className="mt-1 text-sm text-slate-300">
          Enforce user roles, oversee faculty credentials, approve courses, and audit system security logs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Student Directory</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">1,248 Active</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Faculty Members</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">74 Approved</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">API Health Probe</p>
              <p className="text-xl font-bold text-emerald-600">Healthy (200 OK)</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
