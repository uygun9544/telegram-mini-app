declare global {
  interface Window {
    Telegram?: TelegramGlobal;
  }
}

interface TelegramWebApp {
  ready: () => void;
  initDataUnsafe?: {
    user?: TelegramUser;
  };
}

interface TelegramGlobal {
  WebApp?: TelegramWebApp;
}

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export function getTelegramUser(): TelegramUser | null {
  const tg = window.Telegram?.WebApp;

  if (!tg) return null;

  tg.ready();

  return tg.initDataUnsafe?.user || null;
}