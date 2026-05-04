"use client";

import { Check, Mic, Volume2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SessionUser } from "@/lib/auth";
import type { AssignmentItem, AttemptItem } from "@/lib/types";

const slideVariants = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -60, opacity: 0 },
};

/* ─── browser TTS fallback ─── */
function browserSpeak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  // try Cantonese first, then Chinese
  const voices = speechSynthesis.getVoices();
  const cantonese = voices.find((v) => v.lang.startsWith("zh-HK") || v.lang.startsWith("yue"));
  const chinese = voices.find((v) => v.lang.startsWith("zh"));
  if (cantonese) utterance.voice = cantonese;
  else if (chinese) utterance.voice = chinese;
  utterance.lang = "zh-HK";
  utterance.rate = 0.85;
  speechSynthesis.speak(utterance);
}

export default function PracticeFlow({ assignmentId }: { assignmentId: string; user: SessionUser }) {
  const [assignment, setAssignment] = useState<{ title: string; ncs_assignment_items: AssignmentItem[] } | null>(null);
  const [attemptId, setAttemptId] = useState("");
  const [attemptItems, setAttemptItems] = useState<AttemptItem[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"practice" | "assessment" | "done">("practice");
  const [message, setMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [hwDone, setHwDone] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(true);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    async function load() {
      const assignmentResult = await fetch(`/api/student/assignment/${assignmentId}`).then((res) => res.json());
      setAssignment(assignmentResult.assignment);
      const attemptResult = await fetch("/api/student/attempt/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      }).then((res) => res.json());
      setAttemptId(attemptResult.attempt.id);
      setAttemptItems(attemptResult.attemptItems ?? []);
    }
    load().catch((error) => setMessage(error.message));
  }, [assignmentId]);

  const items = useMemo(() => [...(assignment?.ncs_assignment_items ?? [])].sort((a, b) => a.order_index - b.order_index), [assignment]);
  const item = items[index];
  const attemptItem = attemptItems.find((row) => row.assignment_item_id === item?.id);

  /* ─── auto-mark handwriting ─── */
  useEffect(() => {
    if (hwDone && attemptItem && !attemptItem.handwriting_correct) {
      updateAttempt({ handwriting_correct: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hwDone]);

  async function updateAttempt(patch: Partial<AttemptItem> & Record<string, unknown>) {
    if (!attemptItem) return;
    const result = await fetch("/api/student/attempt/item/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptItemId: attemptItem.id, patch }),
    }).then((res) => res.json());
    setAttemptItems((current) => current.map((row) => (row.id === attemptItem.id ? result.attemptItem : row)));
  }

  async function playTts() {
    if (!item) return;
    setMessage("");

    // Try Google TTS first
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: item.traditional_text }),
    });

    if (response.status === 501) {
      // Google not configured — use browser speech
      setGoogleAvailable(false);
      browserSpeak(item.traditional_text);
      setMessage("ℹ️ 使用瀏覽器語音（Google TTS 未設定）");
      return;
    }

    if (!response.ok) {
      const result = await response.json();
      setMessage(result.error || "朗讀失敗");
      return;
    }

    const blob = await response.blob();
    new Audio(URL.createObjectURL(blob)).play();
  }

  async function startRecording() {
    if (!googleAvailable) return;
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      
      // Select supported mime type
      let mimeType = "";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mimeType = "audio/webm;codecs=opus";
      else if (MediaRecorder.isTypeSupported("audio/webm")) mimeType = "audio/webm";
      else if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
      
      const options = mimeType ? { mimeType } : undefined;
      recorder.current = new MediaRecorder(stream, options);
      
      recorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      recorder.current.onstop = () => stream.getTracks().forEach((track) => track.stop());
      recorder.current.start();
      setRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      setMessage("❌ 無法存取麥克風，請檢查瀏覽器權限。");
    }
  }

  async function stopRecording() {
    const active = recorder.current;
    if (!active || !item) return;
    active.stop();
    setRecording(false);
    
    // Wait slightly for the last chunks
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    if (chunks.current.length === 0) {
      setMessage("❌ 錄音失敗：未擷取到語音數據。");
      return;
    }

    const blob = new Blob(chunks.current, { type: active.mimeType });
    if (blob.size < 100) {
      setMessage("❌ 錄音時間太短，請按住說話。");
      return;
    }

    const form = new FormData();
    form.append("audio", blob, "recording.audio");
    form.append("expectedText", item.traditional_text);
    const response = await fetch("/api/stt", { method: "POST", body: form });
    const result = await response.json();

    if (response.status === 501) {
      setGoogleAvailable(false);
      setMessage(`ℹ️ ${result.error || "Google STT 未設定，請使用下方按鈕自我評估。"}`);
      return;
    }

    if (!response.ok) {
      setMessage(result.error || "語音辨識失敗");
      return;
    }
    const scoreText = typeof result.score === "number" ? `相似度：${result.score}%` : "";
    if (phase === "practice") {
      await updateAttempt({ speech_transcript: result.transcript, speech_correct: result.correct });
      setMessage(result.correct ? `✅ 讀音通過 ${scoreText}` : `❌ 請再試一次：${result.transcript || "未能辨識"} ${scoreText}`);
    } else {
      await updateAttempt({ assessment_transcript: result.transcript, assessment_correct: result.correct });
      setMessage(result.correct ? `✅ 評估通過 ${scoreText}` : `❌ 答案未通過：${result.transcript || "未能辨識"} ${scoreText}`);
    }
  }

  /* ─── self-assess (when Google STT not available) ─── */
  async function selfAssess(correct: boolean) {
    if (phase === "practice") {
      await updateAttempt({ speech_transcript: "(self-assessed)", speech_correct: correct });
      setMessage(correct ? "✅ 已標記為通過" : "已標記為未通過，請再練習");
    } else {
      await updateAttempt({ assessment_transcript: "(self-assessed)", assessment_correct: correct });
      setMessage(correct ? "✅ 已標記為通過" : "已標記為未通過");
    }
  }

  async function next() {
    if (phase === "practice") {
      if (index < items.length - 1) {
        setIndex(index + 1);
        setHwDone(false);
        setMessage("");
        return;
      }
      setPhase("assessment");
      setIndex(0);
      setHwDone(false);
      setMessage("進入小評估");
      return;
    }
    if (index < items.length - 1) {
      setIndex(index + 1);
      setHwDone(false);
      setMessage("");
      return;
    }
    const result = await fetch("/api/student/attempt/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId }),
    }).then((res) => res.json());
    setPhase("done");
    setMessage(`完成！總分 ${result.score}/5`);
  }

  if (!item) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0d0f1d] p-6 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
          <p className="text-sm text-slate-400">載入練習中...</p>
        </div>
      </main>
    );
  }

  // Use local hwDone (resets on each new question) so stale DB data cannot
  // enable the button before the user actually completes the handwriting step.
  const canNext =
    phase === "practice"
      ? hwDone && !!attemptItem?.speech_correct
      : !!attemptItem?.assessment_correct;

  /* ─── progress ─── */
  const totalSteps = items.length * 2;
  const currentStep = phase === "practice" ? index + 1 : items.length + index + 1;
  const progressPercent = phase === "done" ? 100 : (currentStep / totalSteps) * 100;

  if (phase === "done") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0d0f1d] p-6 text-slate-100">
        <motion.section
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-full max-w-md rounded-3xl bg-white/10 p-8 text-center"
        >
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <Sparkles className="mx-auto text-yellow-300" size={56} />
          </motion.div>
          <h1 className="mt-4 text-3xl font-black">🎉 練習完成</h1>
          <p className="mt-3 text-slate-300">{message}</p>
          <a href="/student" className="mt-6 block rounded-xl bg-teal-500 px-5 py-3 font-bold transition-colors hover:bg-teal-400">返回學生首頁</a>
        </motion.section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0f1d] p-4 text-slate-100">
      {/* ─── Progress bar ─── */}
      <div className="mx-auto mb-4 max-w-xl">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-slate-500">
          {phase === "practice" ? "互動練習" : "課後評估"} {index + 1}/{items.length}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={`${phase}-${index}`}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="mx-auto max-w-xl"
        >
          {/* ─── Item card ─── */}
          <div className="rounded-2xl bg-emerald-950 p-5">
            <p className="text-sm font-bold text-yellow-300">{phase === "practice" ? "互動練習" : "課後小評估"} · {index + 1} / {items.length}</p>
            {phase === "practice" ? (
              <>
                <h1 className="mt-3 text-6xl font-black">{item.traditional_text}</h1>
                <p className="mt-3 text-2xl font-bold">{item.jyutping}</p>
              </>
            ) : null}
            <p className="mt-3 text-xl text-yellow-100">{item.english_meaning}</p>
            {phase === "practice" ? (
              <button onClick={playTts} className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl bg-amber-400 px-5 font-bold text-slate-950 transition-transform hover:scale-[1.03]">
                <Volume2 size={20} /> 朗讀
              </button>
            ) : null}
          </div>

          {/* ─── Handwriting with hanzi-writer ─── */}
          {phase === "practice" ? (
            <section className="mt-4 rounded-2xl bg-white/10 p-5">
              <h2 className="font-black">手寫練習</h2>
              <p className="mt-1 text-sm text-slate-400">在下方方格中，用滑鼠或手指逐筆畫書寫。</p>
              <HanziCanvas key={`${phase}-${index}`} text={item.traditional_text} onComplete={() => setHwDone(true)} />
              {hwDone ? (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-center text-sm font-bold text-emerald-300"
                >
                  <Check className="mr-1 inline" size={16} /> 手寫完成！
                </motion.p>
              ) : (
                <p className="mt-3 text-center text-xs text-slate-500">寫錯 2 次會自動提示正確筆畫</p>
              )}
            </section>
          ) : null}

          {/* ─── Speech ─── */}
          <section className="mt-4 rounded-2xl bg-white/10 p-5">
            <h2 className="font-black">{phase === "practice" ? "讀音練習" : "用粵語說出答案"}</h2>

            {googleAvailable ? (
              <>
                <button
                  onPointerDown={startRecording}
                  onPointerUp={stopRecording}
                  onPointerLeave={recording ? stopRecording : undefined}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
                  className={`mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl font-black select-none touch-none transition-all ${
                    recording
                      ? "bg-rose-500 scale-[1.02] shadow-lg shadow-rose-500/30"
                      : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  <Mic size={20} className={recording ? "animate-pulse" : ""} />
                  {recording ? "放手送出" : "按住說話"}
                </button>
                <p className="mt-3 text-sm text-slate-400">按住錄音，放開後由 Google STT 檢查粵語讀音。</p>
              </>
            ) : (
              <>
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/30 p-4">
                  <p className="text-sm text-amber-200">
                    ⚠️ Google 語音辨識未設定。請大聲朗讀後自我評估：
                  </p>
                  <p className="mt-2 text-center text-2xl font-black text-amber-100">
                    {phase === "assessment" ? item.traditional_text : `請讀出「${item.traditional_text}」`}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => selfAssess(true)}
                    className="h-12 rounded-xl bg-emerald-600 font-bold transition-colors hover:bg-emerald-500"
                  >
                    ✅ 我讀對了
                  </button>
                  <button
                    onClick={() => selfAssess(false)}
                    className="h-12 rounded-xl bg-slate-600 font-bold transition-colors hover:bg-slate-500"
                  >
                    ❌ 再試一次
                  </button>
                </div>
              </>
            )}
          </section>

          {/* ─── Message ─── */}
          <AnimatePresence>
            {message ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 rounded-xl p-4 text-sm ${
                  message.startsWith("✅")
                    ? "bg-emerald-500/15 text-emerald-200"
                    : message.startsWith("❌")
                    ? "bg-rose-500/15 text-rose-200"
                    : message.startsWith("ℹ️")
                    ? "bg-amber-500/15 text-amber-200"
                    : "bg-white/10 text-cyan-100"
                }`}
              >
                {message}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <button
            disabled={!canNext}
            onClick={next}
            className="mt-4 h-14 w-full rounded-xl bg-teal-500 font-black transition-all hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-400"
          >
            {phase === "practice"
              ? index < items.length - 1
                ? "下一題"
                : "進入評估"
              : index < items.length - 1
              ? "下一題"
              : "提交評估"}
          </button>
        </motion.section>
      </AnimatePresence>
    </main>
  );
}

/* ─── Self-contained Hanzi Writer component ─── */
function HanziCanvas({ text, onComplete }: { text: string; onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Stabilise the callback so the effect only re-runs when `text` changes
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chars = Array.from(text.trim());
    let currentCharIndex = 0;
    let cancelled = false;

    async function initChar() {
      if (cancelled || !container || currentCharIndex >= chars.length) {
        if (!cancelled) onCompleteRef.current();
        return;
      }

      const HanziWriter = (await import("hanzi-writer")).default;
      if (cancelled) return;

      container.innerHTML = "";
      const writer = HanziWriter.create(container, chars[currentCharIndex], {
        width: 280,
        height: 280,
        padding: 20,
        showOutline: true,
        strokeAnimationSpeed: 1.5,
        delayBetweenStrokes: 200,
        strokeColor: "#334155",
        radicalColor: "#6366f1",
        outlineColor: "#e2e8f0",
        drawingColor: "#38bdf8",
        showHintAfterMisses: 2,
        highlightOnComplete: true,
        highlightColor: "#34d399",
        charDataLoader: (char: string) =>
          fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2/${char}.json`).then((r) => r.json()),
      });

      if (cancelled) return;

      writer.quiz({
        onComplete: () => {
          if (cancelled) return;
          currentCharIndex++;
          if (currentCharIndex < chars.length) {
            setTimeout(initChar, 400);
          } else {
            onCompleteRef.current();
          }
        },
      });
    }

    initChar();

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [text]); // ← only re-run when the character changes, NOT on every render

  return (
    <div className="mt-4 flex justify-center">
      <div
        ref={containerRef}
        className="rounded-xl bg-white shadow-inner"
        style={{ width: 280, height: 280 }}
      />
    </div>
  );
}
