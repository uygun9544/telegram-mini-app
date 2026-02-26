import type { ColorItem, Position } from "./types";

const COLORS: ColorItem[] = [
  { name: "blue", emoji: "🟦" },
  { name: "red", emoji: "🟥" },
  { name: "yellow", emoji: "🟨" },
  { name: "green", emoji: "🟩" }
];

export function getRandomPair(): [ColorItem, ColorItem] {
  const shuffled = [...COLORS].sort(() => 0.5 - Math.random());
  return [shuffled[0], shuffled[1]];
}

export function randomDelay(): number {
  return Math.floor(Math.random() * 6000) + 2000;
}

export function generatePositions(): [Position, Position] {
  const p1: Position = {
    top: Math.random() * 50 + 10,
    left: Math.random() * 70 + 10
  };

  let p2: Position;

  do {
    p2 = {
      top: Math.random() * 50 + 10,
      left: Math.random() * 70 + 10
    };
  } while (
    Math.abs(p1.top - p2.top) < 20 &&
    Math.abs(p1.left - p2.left) < 20
  );

  return [p1, p2];
}

export function formatTime(totalSeconds: number): string {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function formatTimeFromMs(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  return formatTime(totalSeconds);
}

export function formatTimeWithCentiseconds(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const centiseconds = Math.floor((milliseconds % 1000) / 10);
  const base = formatTime(totalSeconds);
  return `${base}:${String(centiseconds).padStart(2, "0")}`;
}
