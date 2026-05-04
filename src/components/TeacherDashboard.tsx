"use client";

import { BookOpen, LogOut, Plus, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SessionUser } from "@/lib/auth";
import type { TeacherStudent } from "@/lib/types";

type ClassRoom = { id: string; name: string };
type Assignment = {
  id: string;
  title: string;
  class_id: string;
  created_at: string;
};

const emptyItems = Array.from({ length: 5 }, () => ({ traditionalText: "", englishMeaning: "" }));

async function postJson(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "操作失敗");
  return result;
}

/* ─── count-up hook ─── */
function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export default function TeacherDashboard({ user }: { user: SessionUser }) {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [message, setMessage] = useState("");
  const [className, setClassName] = useState("");
  const [studentOpen, setStudentOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({ loginId: "", displayName: "", password: "" });
  const [teacherForm, setTeacherForm] = useState({ loginId: "", displayName: "", password: "" });
  const [assignmentTitle, setAssignmentTitle] = useState("五題粵語練習");
  const [items, setItems] = useState(emptyItems);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [classRes, studentRes, assignmentRes] = await Promise.all([
      fetch("/api/teacher/classes").then((res) => res.json()),
      fetch("/api/teacher/students").then((res) => res.json()),
      fetch("/api/teacher/assignments").then((res) => res.json()),
    ]);
    setClasses(classRes.classes ?? []);
    setStudents(studentRes.students ?? []);
    setAssignments(assignmentRes.assignments ?? []);
    if (!selectedClassId && classRes.classes?.[0]?.id) setSelectedClassId(classRes.classes[0].id);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((error) => {
      setMessage(error.message);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedStudent = students.find((student) => student.id === selectedStudentId);
  const stats = useMemo(() => {
    const totalAttempts = students.reduce((sum, student) => sum + student.attempts, 0);
    const totalCorrect = students.reduce((sum, student) => sum + student.correct, 0);
    const totalQuestions = totalAttempts * 5;
    return {
      totalAttempts,
      totalCorrect,
      accuracy: totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      assignments: assignments.length,
    };
  }, [assignments.length, students]);

  async function logout() {
    await postJson("/api/auth/logout");
    location.href = "/login";
  }

  async function createClass(event: React.FormEvent) {
    event.preventDefault();
    await postJson("/api/teacher/classes", { name: className });
    setClassName("");
    showToast("班級已建立");
    await load();
  }

  async function createTeacher(event: React.FormEvent) {
    event.preventDefault();
    await postJson("/api/teacher/teachers", teacherForm);
    setTeacherForm({ loginId: "", displayName: "", password: "" });
    showToast("教師帳號已建立");
  }

  async function createStudent(event: React.FormEvent) {
    event.preventDefault();
    await postJson("/api/teacher/students", { classId: selectedClassId, ...studentForm });
    setStudentOpen(false);
    setStudentForm({ loginId: "", displayName: "", password: "" });
    showToast("學生帳號已建立");
    await load();
  }

  async function publishAssignment(event: React.FormEvent) {
    event.preventDefault();
    await postJson("/api/teacher/assignments", { title: assignmentTitle, classId: selectedClassId, items });
    setItems(emptyItems);
    showToast("練習已發布");
    await load();
  }

  function showToast(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  const animatedAttempts = useCountUp(stats.totalAttempts * 5);
  const animatedAccuracy = useCountUp(stats.accuracy);
  const animatedCorrect = useCountUp(stats.totalCorrect);
  const animatedAssignments = useCountUp(stats.assignments);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0d0f1d] text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
          <p className="text-sm text-slate-400">載入儀表板...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0f1d] text-slate-100">
      <header className="border-b border-white/10 bg-[#0b0d19]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-rose-500 font-black">N</div>
            <strong className="text-lg">粵語繁中學習平台</strong>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-300 sm:inline">{user.display_name}</span>
            <button onClick={logout} className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 transition-colors hover:bg-white/15" aria-label="登出">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-6xl px-5 py-8"
      >
        <h1 className="text-3xl font-black">教師儀表板</h1>
        <p className="mt-2 text-sm text-slate-400">查看學生學習進度，管理班級、學生與練習。</p>

        {/* ─── Toast ─── */}
        <AnimatePresence>
          {message ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-6 rounded-lg border border-cyan-500/20 bg-cyan-950/40 p-4 text-sm text-cyan-100"
            >
              {message}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ─── Student picker ─── */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <span className="font-bold">選擇學生：</span>
            <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} className="h-11 flex-1 rounded-lg border border-white/10 bg-[#111423] px-3">
              <option value="">請選擇學生...</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.loginId} - {student.displayName}（答題:{student.attempts * 5}, 正確率:{student.accuracy}%）
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setStudentOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-violet-500 px-5 font-bold transition-transform hover:scale-[1.02]">
            <UserPlus size={18} /> 新增學生
          </button>
        </div>

        {/* ─── Stats ─── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <Stat label="總作答題數" value={animatedAttempts} />
          <Stat label="總正確率" value={`${animatedAccuracy}%`} />
          <Stat label="答對題數" value={animatedCorrect} />
          <Stat label="已發布練習" value={animatedAssignments} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.25fr]">
          <div className="space-y-6">
            <Panel title="建立班級" icon={<Plus size={18} />}>
              <form onSubmit={createClass} className="flex gap-3">
                <input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="例如：4B_2526" className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#191b2a] px-3 transition-colors focus:border-violet-400" />
                <button className="rounded-lg bg-teal-500 px-5 font-bold text-white transition-colors hover:bg-teal-400">新增</button>
              </form>
            </Panel>

            <Panel title="新增教師帳號" icon={<UserPlus size={18} />}>
              <form onSubmit={createTeacher} className="grid gap-3">
                <input value={teacherForm.loginId} onChange={(event) => setTeacherForm({ ...teacherForm, loginId: event.target.value })} placeholder="帳號" className="h-11 rounded-lg border border-white/10 bg-[#191b2a] px-3 transition-colors focus:border-violet-400" />
                <input value={teacherForm.displayName} onChange={(event) => setTeacherForm({ ...teacherForm, displayName: event.target.value })} placeholder="顯示名稱" className="h-11 rounded-lg border border-white/10 bg-[#191b2a] px-3 transition-colors focus:border-violet-400" />
                <input value={teacherForm.password} onChange={(event) => setTeacherForm({ ...teacherForm, password: event.target.value })} placeholder="密碼" type="password" className="h-11 rounded-lg border border-white/10 bg-[#191b2a] px-3 transition-colors focus:border-violet-400" />
                <button className="h-11 rounded-lg bg-teal-600 font-bold transition-colors hover:bg-teal-500">建立教師</button>
              </form>
            </Panel>

            <Panel title="已建立學生帳號" icon={<Users size={18} />}>
              {students.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-6 text-center">
                  <Users className="mx-auto text-slate-500" size={32} />
                  <p className="mt-2 text-sm text-slate-400">尚未新增學生，請點擊「新增學生」按鈕。</p>
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-auto text-sm">
                  {students.map((student) => (
                    <div key={student.id} className="rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10">
                      <strong>{student.loginId}</strong> - {student.displayName}
                      {student.initialPassword ? <div className="text-slate-400">初始密碼：{student.initialPassword}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <Panel title="發布 5 題練習" icon={<BookOpen size={18} />}>
            <form onSubmit={publishAssignment} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} className="h-12 rounded-lg border border-white/10 bg-[#191b2a] px-3 transition-colors focus:border-violet-400" />
                <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="h-12 rounded-lg border border-white/10 bg-[#191b2a] px-3">
                  <option value="">選擇班級</option>
                  {classes.map((classRoom) => (
                    <option key={classRoom.id} value={classRoom.id}>{classRoom.name}</option>
                  ))}
                </select>
              </div>
              {items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="grid gap-3 rounded-xl bg-white/5 p-3 sm:grid-cols-2"
                >
                  <input value={item.traditionalText} onChange={(event) => setItems(items.map((row, rowIndex) => rowIndex === index ? { ...row, traditionalText: event.target.value } : row))} placeholder={`第 ${index + 1} 題中文`} className="h-11 rounded-lg border border-white/10 bg-[#141725] px-3 transition-colors focus:border-violet-400" />
                  <input value={item.englishMeaning} onChange={(event) => setItems(items.map((row, rowIndex) => rowIndex === index ? { ...row, englishMeaning: event.target.value } : row))} placeholder="英文意思" className="h-11 rounded-lg border border-white/10 bg-[#141725] px-3 transition-colors focus:border-violet-400" />
                </motion.div>
              ))}
              <button className="h-12 w-full rounded-xl bg-rose-600 font-black transition-colors hover:bg-rose-500">發布給班級</button>
            </form>
          </Panel>
        </div>

        {selectedStudent ? <p className="mt-8 text-sm text-slate-400">目前查看：{selectedStudent.loginId} - {selectedStudent.displayName}</p> : null}
      </motion.section>

      {/* ─── New student modal ─── */}
      <AnimatePresence>
        {studentOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setStudentOpen(false); }}
          >
            <motion.form
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onSubmit={createStudent}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111423] p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-black">新增學生</h2>
              <label className="mt-5 block text-sm font-bold text-slate-300">班級</label>
              <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#191b2a] px-3">
                <option value="">選擇班級</option>
                {classes.map((classRoom) => <option key={classRoom.id} value={classRoom.id}>{classRoom.name}</option>)}
              </select>
              <label className="mt-4 block text-sm font-bold text-slate-300">學號</label>
              <input value={studentForm.loginId} onChange={(event) => setStudentForm({ ...studentForm, loginId: event.target.value })} placeholder="例如：S006" className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#191b2a] px-3" />
              <label className="mt-4 block text-sm font-bold text-slate-300">姓名</label>
              <input value={studentForm.displayName} onChange={(event) => setStudentForm({ ...studentForm, displayName: event.target.value })} placeholder="例如：新學生" className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#191b2a] px-3" />
              <label className="mt-4 block text-sm font-bold text-slate-300">登入密碼</label>
              <input value={studentForm.password} onChange={(event) => setStudentForm({ ...studentForm, password: event.target.value })} placeholder="設定初始密碼" type="password" className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#191b2a] px-3" />
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setStudentOpen(false)} className="h-12 rounded-xl border border-white/10 px-6 font-bold transition-colors hover:bg-white/10">取消</button>
                <button className="h-12 rounded-xl bg-gradient-to-r from-sky-400 to-violet-500 px-6 font-bold transition-transform hover:scale-[1.02]">確認新增</button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/10 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-black">{icon} {title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="rounded-xl border border-white/10 bg-white/10 p-5"
    >
      <div className="text-4xl font-black">{value}</div>
      <div className="mt-2 text-sm text-slate-400">{label}</div>
    </motion.div>
  );
}
