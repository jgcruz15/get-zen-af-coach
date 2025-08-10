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
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    // Parse body safely
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const mode = body?.mode || "Ambitious";
    const incoming = Array.isArray(body?.messages) ? body.messages : [];

    // Ensure messages are in the expected shape
    const sanitized = incoming
      .filter((m: any) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => ({ role: m.role, content: m.content }));

    // If somehow nothing valid came through, still send a tiny prompt
    const fallbackUser = { role: "user", content: "Give me a short 4-step calming micro-ritual." };
    const finalMessages = [{ role: "system", content: systemPromptFor(mode) }, ...(sanitized.length ? sanitized : [fallbackUser])];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        messages: finalMessages,
        max_tokens: 700
      })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("OpenAI error:", text); // shows up in Vercel Logs
      // Return 502 so the client shows a friendly retry, but we keep the reason
      return NextResponse.json({ error: "Upstream error", detail: text }, { status: 502 });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "I couldn’t generate a reply just now.";
    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error("api/chat unexpected:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
