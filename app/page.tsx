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

export default function Page() {
  const [mode, setMode] = useState<Mode>("Ambitious");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi love — I’m the Get Zen AF Coach. Pick Ambitious, Mom, or Reset mode, choose a quick action, or tell me what you want support with." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(prompt?: string) {
    const text = (prompt ?? input).trim();
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
      setMessages((m) => [...m, { role: "assistant", content: "I hit a snag. Try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  }

  async function createMp3FromLastAssistant() {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return alert("No assistant message to convert.");
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
    } catch (e) {
      alert("Could not create audio right now. Please try again.");
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto auto 1fr auto", height: "100dvh" }}>
      <header style={{ padding: "12px 16px", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <strong>Get Zen AF Coach</strong>
          <div style={{ display: "flex", gap: 8 }}>
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
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>Mode tunes the coaching tone and guidance.</div>
      </header>

      <section style={{ padding: "10px 16px", borderBottom: "1px solid #f1f1f1" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              onClick={() => send(qa.prompt)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
            >
              {qa.label}
            </button>
          ))}
        </div>
      </section>

      <div ref={listRef} style={{ overflowY: "auto", padding: 16, background: "#fafafa" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ margin: "8px 0", display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
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

      <footer style={{ padding: 12, borderTop: "1px solid #eee" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 8 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder="Ask for coaching, belief work, goals, or a custom ritual…"
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd", resize: "none" }}
          />
          <button onClick={() => send()} disabled={loading} style={{ padding: "0 16px", borderRadius: 8, border: "1px solid #222", background: "#111", color: "#fff" }}>
            Send
          </button>
          <button onClick={createMp3FromLastAssistant} style={{ padding: "0 16px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}>
            Create MP3
          </button>
        </div>
        <div style={{ maxWidth: 760, margin: "6px auto 0", fontSize: 12, opacity: 0.7 }}>
          Tip: “Create MP3” converts the latest assistant message to audio.
        </div>
      </footer>
    </div>
  );
}
