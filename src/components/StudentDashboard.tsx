"use client";

import { LogOut, Play, BookOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SessionUser } from "@/lib/auth";
import type { StudentAssignment } from "@/lib/types";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function StudentDashboard({ user }: { user: SessionUser }) {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/student/assignments")
      .then((res) => res.json())
      .then((result) => {
        setAssignments(result.assignments ?? []);
        setLoading(false);
      })
      .catch((error) => {
        setMessage(error.message);
        setLoading(false);
      });
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-[#0d0f1d] text-slate-100">
      <header className="border-b border-white/10 bg-[#0b0d19]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-rose-500 font-black text-sm">
              NCS
            </div>
            <strong className="text-lg">粵語繁中學習平台</strong>
          </div>
          <button
            onClick={logout}
            className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 transition-colors hover:bg-white/15"
            aria-label="登出"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-4xl px-5 py-8"
      >
        <p className="text-sm font-bold text-cyan-300">學生端</p>
        <h1 className="text-3xl font-black">{user.display_name}，開始練習</h1>

        {message ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5 rounded-lg bg-rose-500/15 p-4 text-sm text-rose-200"
          >
            {message}
          </motion.p>
        ) : null}

        {loading ? (
          <div className="mt-12 flex flex-col items-center gap-4 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
            <p className="text-sm">載入練習中...</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="mt-8 grid gap-4"
          >
            <AnimatePresence>
              {assignments.map((assignment) => {
                const attempt = assignment.ncs_attempts?.[0];
                const isCompleted = attempt?.status === "completed";
                return (
                  <motion.div key={assignment.id} variants={itemVariants} layout>
                    <Link
                      href={`/student/practice/${assignment.id}`}
                      className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 p-5 transition-all hover:bg-white/15 hover:border-white/20 hover:shadow-lg hover:shadow-violet-950/20"
                    >
                      <div>
                        <h2 className="text-xl font-black group-hover:text-cyan-200 transition-colors">
                          {assignment.title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                          {assignment.ncs_assignment_items?.length ?? 5} 題
                          {attempt
                            ? ` · ${isCompleted ? "已完成" : "進行中"} · ${attempt.score}/5`
                            : " · 未開始"}
                        </p>
                      </div>
                      <div
                        className={`grid h-12 w-12 place-items-center rounded-xl transition-transform group-hover:scale-110 ${
                          isCompleted
                            ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                            : "bg-gradient-to-r from-sky-400 to-violet-500"
                        }`}
                      >
                        {isCompleted ? <BookOpen size={20} /> : <Play size={20} />}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {assignments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center"
              >
                <BookOpen className="mx-auto text-slate-500" size={40} />
                <p className="mt-3 text-slate-400">暫時未有練習，請等待老師發布。</p>
              </motion.div>
            ) : null}
          </motion.div>
        )}
      </motion.section>
    </main>
  );
}
