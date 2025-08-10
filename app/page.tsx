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

// === AUDIO USAGE LIMIT HELPERS ===
const AUDIO_CAP = 1;

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getUsage() {
  const key = monthKey();
  const raw = localStorage.getItem("gzaf_audio_usage");
  const obj = raw ? JSON.parse(raw) : { month: key, count: 0 };
  if (obj.month !== key) return { month: key, count: 0 };
  return obj;
}

function bumpUsage() {
  const key = monthKey();
  const u = getUsage();
  const next = { month: key, count: u.count + 1 };
  localStorage.setItem("gzaf_audio_usage", JSON.stringify(next));
  return next
