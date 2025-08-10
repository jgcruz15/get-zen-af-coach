import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function systemPromptFor(mode: string) {
  const base =
    "You are the Get Zen AF Coach. You coach ambitious women/founders to master mindset, regulate their nervous system, and align ambition without burnout. Avoid negative phrasing in subconscious work. Offer concise, compassionate guidance with concrete micro-actions.";
  const byMode: Record<string, string> = {
    Ambitious: "Tone: strategic, empowering, direct. Offer weekly CEO rituals and performance routines.",
    Mom: "Tone: deeply compassionate and time-efficient. Offer micro-rituals (2–5 min) and context-switching support.",
    Reset: "Tone: calm and regulating. Focus on breath cues, gentle EFT, and nervous-system downshifts."
  };
  return `${base}\n${byMode[mode] ?? ""}`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, mode } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages" }, { status: 400 });
    }

    const system = { role: "system", content: systemPromptFor(mode || "Ambitious") };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        messages: [system, ...messages],
        max_tokens: 700
      })
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || "OpenAI error" }, { status: 500 });
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "I couldn’t generate a reply just now.";
    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
