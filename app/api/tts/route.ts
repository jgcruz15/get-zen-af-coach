import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { text, mode } = await req.json();

  if (!process.env.ELEVEN_API_KEY || !process.env.ELEVEN_VOICE_ID) {
    return new Response("Missing ELEVEN_API_KEY or ELEVEN_VOICE_ID", { status: 500 });
  }
  if (!text || typeof text !== "string") {
    return new Response("Missing text", { status: 400 });
  }

  const voiceId = process.env.ELEVEN_VOICE_ID;
  const apiKey = process.env.ELEVEN_API_KEY;

  const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.3, similarity_boost: 0.9 }
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
