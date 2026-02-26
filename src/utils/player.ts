import type { TelegramUser } from "../telegram";

export const OPPONENT_NAME = "соперник";
export const OPPONENT_SLIPPER = "/pink.png";
export const OPPONENT_PROFILE_AVATAR: string | null = null;

const discoveredSlippers = import.meta.glob("../assets/slippers/*.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  import: "default"
}) as Record<string, string>;

const fallbackSlippers = ["/green.png", "/pink.png"];

const AVAILABLE_SLIPPERS = Array.from(
  new Set([...Object.values(discoveredSlippers), ...fallbackSlippers])
);

const PLAYER_SLIPPER_STORAGE_KEY = "player-slippers-v1";
const ANON_PLAYER_ID_STORAGE_KEY = "anon-player-id-v1";

export interface OnlinePlayerProfile {
  playerId: string;
  name: string;
  avatarUrl: string | null;
  slipper: string;
}

export function getTelegramPlayerName(user?: TelegramUser | null): string {
  if (!user) return "Игрок";

  if (user.username) {
    return `@${user.username}`;
  }

  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return fullName || "Игрок";
}

export function getTelegramPlayerAvatar(user?: TelegramUser | null): string {
  return user?.photo_url || "/green.png";
}

function getOrCreateAnonymousPlayerId(): string {
  if (typeof window === "undefined") {
    return "anon:server";
  }

  const existing = localStorage.getItem(ANON_PLAYER_ID_STORAGE_KEY);
  if (existing) return existing;

  const created = `anon:${crypto.randomUUID()}`;
  localStorage.setItem(ANON_PLAYER_ID_STORAGE_KEY, created);
  return created;
}

export function getLocalPlayerId(user?: TelegramUser | null): string {
  if (user?.id) {
    return `tg:${user.id}`;
  }

  return getOrCreateAnonymousPlayerId();
}

function getStoredSlipperMap(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = localStorage.getItem(PLAYER_SLIPPER_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function saveStoredSlipperMap(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAYER_SLIPPER_STORAGE_KEY, JSON.stringify(map));
}

function pickRandomSlipper(): string {
  const randomIndex = Math.floor(Math.random() * AVAILABLE_SLIPPERS.length);
  return AVAILABLE_SLIPPERS[randomIndex] || fallbackSlippers[0];
}

export function getOrAssignPlayerSlipper(user?: TelegramUser | null): string {
  const playerId = getLocalPlayerId(user);
  const slipperMap = getStoredSlipperMap();

  if (slipperMap[playerId]) {
    return slipperMap[playerId];
  }

  const assigned = pickRandomSlipper();
  slipperMap[playerId] = assigned;
  saveStoredSlipperMap(slipperMap);
  return assigned;
}

export function buildOnlinePlayerProfile(user?: TelegramUser | null): OnlinePlayerProfile {
  return {
    playerId: getLocalPlayerId(user),
    name: getTelegramPlayerName(user),
    avatarUrl: user?.photo_url || null,
    slipper: getOrAssignPlayerSlipper(user)
  };
}