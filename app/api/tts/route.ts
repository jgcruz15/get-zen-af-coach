import { NextRequest } from "next/server";

export const runtime = "nodejs";

// ~5 minutes of spoken text ≈ 900 words
function trimToMaxWords(s: string, maxWords = 900) {
  const words = s.trim().split(/\s+/);
  if (words.length <= maxWords) return s.trim();
  const trimmed = words.slice(0, maxWords).join(" ");
  // try to end at a sentence boundary if possible
  const m = trimmed.match(/[\s\S]*?[.!?](\s|$)/);
  return m ? m[0].trim() : trimmed.trim();
}

export async function POST(req: NextRequest) {
  const { text, mode } = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return new Response("Missing OPENAI_API_KEY", { status: 500 });
  }
  if (!text || typeof text !== "string") {
    return new Response("Missing text", { status: 400 });
  }

  const model = process.env.OPENAI_TTS_MODEL || "tts-1"; // "tts-1" or "tts-1-hd"
  const voice = process.env.OPENAI_TTS_VOICE || "alloy"; // try "alloy","verse","ash","aria" etc.

  const trimmedText = trimToMaxWords(text, 900);

  // OpenAI Text-to-Speech -> MP3
  const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      voice,
      input: trimmedText,
      format: "mp3"
    })
  });

  if (!ttsRes.ok) {
    const errText = await ttsRes.text();
    return new Response(errText || "TTS failed", { status: 500 });
  }

  const mp3ArrayBuffer = await ttsRes.arrayBuffer();
  return new Response(Buffer.from(mp3ArrayBuffer), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `attachment; filename="get-zen-af-${(mode || "audio").toLowerCase()}.mp3"`
    }
  });
}
