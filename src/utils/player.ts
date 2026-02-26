import type { TelegramUser } from "../telegram";

export const OPPONENT_NAME = "соперник";
export const OPPONENT_PROFILE_AVATAR: string | null = null;

const discoveredSlippers = import.meta.glob("../assets/slippers/*.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  import: "default"
}) as Record<string, string>;

const discoveredSlipperUrls = Object.values(discoveredSlippers);

function findDiscoveredSlipperByFilename(filename: string): string | null {
  const lowerFilename = filename.toLowerCase();
  const found = discoveredSlipperUrls.find((slipperUrl) =>
    slipperUrl.toLowerCase().includes(`/${lowerFilename}.`)
  );

  return found || null;
}

export const DEFAULT_PLAYER_SLIPPER =
  findDiscoveredSlipperByFilename("green") ||
  discoveredSlipperUrls[0] ||
  "/green.png";

export const DEFAULT_OPPONENT_SLIPPER =
  findDiscoveredSlipperByFilename("pink") ||
  discoveredSlipperUrls[1] ||
  DEFAULT_PLAYER_SLIPPER;

const fallbackSlippers = [DEFAULT_PLAYER_SLIPPER, DEFAULT_OPPONENT_SLIPPER];

export const OPPONENT_SLIPPER = DEFAULT_OPPONENT_SLIPPER;

const AVAILABLE_SLIPPERS = Array.from(
  new Set([...Object.values(discoveredSlippers), ...fallbackSlippers])
);

const availableSlipperSet = new Set(AVAILABLE_SLIPPERS);

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
  return user?.photo_url || DEFAULT_PLAYER_SLIPPER;
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

function pickRandomSlipper(exclude?: string): string {
  if (AVAILABLE_SLIPPERS.length === 0) {
    return fallbackSlippers[0];
  }

  const pool =
    exclude && AVAILABLE_SLIPPERS.length > 1
      ? AVAILABLE_SLIPPERS.filter((slipper) => slipper !== exclude)
      : AVAILABLE_SLIPPERS;

  if (pool.length === 0) {
    return exclude || fallbackSlippers[0];
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] || fallbackSlippers[0];
}

function setPlayerSlipper(user: TelegramUser | null | undefined, slipper: string) {
  const playerId = getLocalPlayerId(user);
  const slipperMap = getStoredSlipperMap();
  slipperMap[playerId] = slipper;
  saveStoredSlipperMap(slipperMap);
}

export function rerollPlayerSlipper(user?: TelegramUser | null): string {
  const currentSlipper = getOrAssignPlayerSlipper(user);
  const nextSlipper = pickRandomSlipper(currentSlipper);
  setPlayerSlipper(user, nextSlipper);
  return nextSlipper;
}

function pickInitialRandomSlipper(): string {
  const randomIndex = Math.floor(Math.random() * AVAILABLE_SLIPPERS.length);
  return AVAILABLE_SLIPPERS[randomIndex] || fallbackSlippers[0];
}

function normalizeLegacySlipperPath(slipper: string): string | null {
  if (availableSlipperSet.has(slipper)) {
    return slipper;
  }

  const fileName = slipper.split("/").pop();
  if (!fileName) return null;

  const candidate = discoveredSlipperUrls.find((slipperUrl) =>
    slipperUrl.toLowerCase().endsWith(`/${fileName.toLowerCase()}`)
  );

  return candidate || null;
}

export function getOrAssignPlayerSlipper(user?: TelegramUser | null): string {
  const playerId = getLocalPlayerId(user);
  const slipperMap = getStoredSlipperMap();

  if (slipperMap[playerId]) {
    const normalized = normalizeLegacySlipperPath(slipperMap[playerId]);
    if (normalized) {
      if (normalized !== slipperMap[playerId]) {
        slipperMap[playerId] = normalized;
        saveStoredSlipperMap(slipperMap);
      }
      return normalized;
    }
  }

  const assigned = pickInitialRandomSlipper();
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