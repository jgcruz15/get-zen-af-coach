"use client";

import { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";
type Message = { role: Role; content: string };

const MODES = ["Ambitious", "Mom", "Reset"] as const;
type Mode = typeof MODES[number];

const QUICK_ACTIONS: { label: string; prompt: string; mode?: Mode }[] = [
  { label: "5-min Calm Breathwork", prompt: "Create a 5-minute calm breathwork script with clear timing cues." },
  { label: "EFT: Imposter Syndrome", prompt: "Create an EFT tapping script to dissolve imposter syndrome, include points and rounds." },
  { label: "Subliminal: Magnetic Confidence", prompt: "Write 30 short, positively phrased subliminal affirmations for magnetic confidence." }
];

// ===== Audio usage limit (1 per month, per browser) =====
const AUDIO_CAP = 1;

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getUsage() {
  const key = monthKey();
  const raw = typeof window !== "undefined" ? localStorage.getItem("gzaf_audio_usage") : null;
  const obj = raw ? JSON.parse(raw) : { month: key, count: 0 };
  if (obj.month !== key) return { month: key, count: 0 };
  return obj;
}

function bumpUsage() {
  const key = monthKey();
  const u = getUsage();
  const next = { month: key, count: u.count + 1 };
  if (typeof window !== "undefined") {
    localStorage.setItem("gzaf_audio_usage", JSON.stringify(next));
  }
  return next;
}

export default function Page() {
  const [mode, setMode] = useState<Mode>("Ambitious");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi love — I’m the Get Zen AF Coach. Choose Ambitious, Mom, or Reset mode, tap a quick action, or tell me what you want support with."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioUsed, setAudioUsed] = useState<number>(0);
  const [resetLabel, setResetLabel] = useState<string>("this month");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // init usage + nice reset label (e.g., "Sep 1")
    const u = getUsage();
    setAudioUsed(u.count);
    const d = new Date();
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    setResetLabel(nextMonth.toLocaleDateString(undefined, opts));
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(promptOverride?: string) {
    const text = (promptOverride ?? input).trim();
    if (!text) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], mode })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const assistantMsg: Message = { role: "assistant", content: data.reply };
      setMessages((m) => [...m, assistantMsg]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "I hit a snag. Try again in a moment." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function lastAssistantMessage(): Message | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return undefined;
  }

  async function createMp3FromLastAssistant() {
    const last = lastAssistantMessage();
    if (!last) return alert("No assistant message to convert yet.");

    // enforce monthly audio cap
    const u = getUsage();
    if (u.count >= AUDIO_CAP) {
      alert(`You’ve reached your monthly audio limit. Resets ${resetLabel}.`);
      return;
    }

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: last.content, mode })
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${mode.toLowerCase()}-get-zen-af.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      // success → increment usage
      const next = bumpUsage();
      setAudioUsed(next.count);
    } catch (e) {
      alert("Could not create audio right now. Please try again.");
    }
  }

  function copyLastAssistant() {
    const last = lastAssistantMessage();
    if (!last) return alert("Nothing to copy yet.");
    navigator.clipboard
      .writeText(last.content)
      .then(() => alert("Script copied to clipboard ✨"))
      .catch(() => alert("Couldn’t copy. Please try again."));
  }

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto auto 1fr auto", height: "100dvh" }}>
      {/* Header */}
      <header style={{ padding: "12px 16px", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <strong>Get Zen AF Coach</strong>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #ddd",
                  background: mode === m ? "#111" : "#fff",
                  color: mode === m ? "#fff" : "#111",
                  cursor: "pointer"
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
          Mode tunes the coaching tone and guidance.
        </div>
      </header>

      {/* Quick actions */}
      <section style={{ padding: "10px 16px", borderBottom: "1px solid #f1f1f1" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              onClick={() => send(qa.prompt)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer"
              }}
            >
              {qa.label}
            </button>
          ))}
        </div>
      </section>

      {/* Messages */}
      <div ref={listRef} style={{ overflowY: "auto", padding: 16, background: "#fafafa" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                margin: "8px 0",
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start"
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: m.role === "user" ? "#e8f0ff" : "#fff",
                  border: "1px solid #e5e5e5",
                  maxWidth: "85%",
                  whiteSpace: "pre-wrap"
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && <div style={{ fontSize: 12, opacity: 0.7 }}>Thinking…</div>}
        </div>
      </div>

      {/* Composer */}
      <footer style={{ padding: 12, borderTop: "1px solid #eee" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder="Ask for coaching, belief work, goals, or a custom ritual…"
            style={{ flex: 1, minWidth: 240, padding: 10, borderRadius: 8, border: "1px solid #ddd", resize: "none" }}
          />
          <button
            onClick={() => send()}
            disabled={loading}
            style={{ padding: "0 16px", borderRadius: 8, border: "1px solid #222", background: "#111", color: "#fff" }}
          >
            Send
          </button>
          <button
            onClick={createMp3FromLastAssistant}
            style={{ padding: "0 16px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}
          >
            Create MP3
          </button>
          <button
            onClick={copyLastAssistant}
            style={{ padding: "0 16px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}
          >
            Copy Last Script
          </button>
        </div>
        <div style={{ maxWidth: 760, margin: "6px auto 0", fontSize: 12, opacity: 0.7 }}>
          Audios this month: {audioUsed}/{AUDIO_CAP} — resets {resetLabel}. (Max ~5-min script length for audio.)
        </div>
      </footer>
    </div>
  );
}
