import type { TelegramUser } from "../telegram";

export const OPPONENT_NAME = "соперник";
export const OPPONENT_SLIPPER = "/pink.png";
export const OPPONENT_PROFILE_AVATAR: string | null = null;

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