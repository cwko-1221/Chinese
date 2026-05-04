"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(result.error || "登入失敗");
      return;
    }
    router.push(result.user.role === "teacher" ? "/teacher" : "/student");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#281d5f,#0b0d1b_55%,#070914)] px-5 py-10 text-slate-100">
      <Link href="/" className="fixed left-5 top-5 text-xl transition-transform hover:scale-110" aria-label="返回首頁">
        ←
      </Link>
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        <motion.form
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          onSubmit={submit}
          className="w-full rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl shadow-violet-950/40 backdrop-blur"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}
            className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-rose-500 text-2xl font-black"
          >
            NCS
          </motion.div>
          <h1 className="text-center text-3xl font-black">系統登入</h1>
          <p className="mt-3 text-center text-sm text-slate-300">請輸入您的學號或教師帳號</p>
          <label className="mt-8 block text-sm font-bold text-slate-300">
            帳號
            <input
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              className="mt-3 h-14 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-base text-white outline-none transition-colors focus:border-violet-400 focus:bg-white/10"
              placeholder="例如：T001 或 S001"
              autoComplete="username"
            />
          </label>
          <label className="mt-5 block text-sm font-bold text-slate-300">
            密碼
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-3 h-14 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-base text-white outline-none transition-colors focus:border-violet-400 focus:bg-white/10"
              type="password"
              placeholder="請輸入密碼"
              autoComplete="current-password"
            />
          </label>
          {error ? (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-4 rounded-xl bg-rose-500/15 p-3 text-sm text-rose-200"
            >
              {error}
            </motion.p>
          ) : null}
          <button
            disabled={loading}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-violet-500 text-lg font-black text-white shadow-lg shadow-violet-950/40 transition-all hover:scale-[1.01] hover:shadow-xl disabled:opacity-60 disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                登入中...
              </>
            ) : (
              "登入"
            )}
          </button>
          <p className="mt-6 text-center text-xs text-slate-400">教師預設可用 T001 / 123456；學生由教師新增。</p>
        </motion.form>
      </section>
    </main>
  );
}
