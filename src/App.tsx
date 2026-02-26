import { useEffect, useState } from "react";
import Home from "./screens/Home";
import Searching from "./screens/Searching";
import Found from "./screens/Found";
import Game from "./screens/Game";
import Winner from "./screens/Winner";
import type { GameMode } from "./game/types";
import { onlineClient, ONLINE_WS_URL } from "./online/client";
import { getTelegramUser } from "./telegram";
import {
  getTelegramPlayerName,
} from "./utils/player";

type Screen = "home" | "searching" | "found" | "game" | "winner";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [gameMode, setGameMode] = useState<GameMode>("training");
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [onlineOpponentName, setOnlineOpponentName] = useState<string | null>(null);
  const telegramUser = getTelegramUser();
  const playerName = getTelegramPlayerName(telegramUser);
  const playerProfileAvatar = telegramUser?.photo_url;

  const [winnerData, setWinnerData] = useState<{
    winner: "player" | "enemy";
    name: string;
    avatar: string;
    profileAvatar?: string | null;
    reward: number;
  } | null>(null);

  useEffect(() => {
    const unsubMatchFound = onlineClient.on("matchFound", (payload) => {
      setOnlineRoomId(payload.roomId);
      setOnlineOpponentName(payload.opponentName);
      setScreen("found");
    });

    const unsubMatchReady = onlineClient.on("matchReady", (payload) => {
      setOnlineRoomId(payload.roomId);
      setOnlineOpponentName(payload.opponentName);
      setScreen("game");
    });

    const unsubMatchCancelled = onlineClient.on("matchCancelled", () => {
      setOnlineRoomId(null);
      setOnlineOpponentName(null);
      setScreen("home");
    });

    const unsubOpponentLeft = onlineClient.on("opponentLeft", () => {
      setOnlineRoomId(null);
      setOnlineOpponentName(null);
      setScreen("home");
    });

    return () => {
      unsubMatchFound();
      unsubMatchReady();
      unsubMatchCancelled();
      unsubOpponentLeft();
    };
  }, []);

  async function handlePlay() {
    setGameMode("online");

    try {
      await onlineClient.joinQueue(playerName);
      setScreen("searching");
    } catch {
      setScreen("home");
    }
  }

  if (screen === "home")
    return (
      <Home
        onlineWsUrl={ONLINE_WS_URL}
        onTraining={() => {
          setGameMode("training");
          setOnlineRoomId(null);
          setOnlineOpponentName(null);
          setScreen("game");
        }}
        onPlay={handlePlay}
      />
    );

  if (screen === "searching")
    return (
      <Searching
        autoFind={false}
        onCancel={() => {
          onlineClient.cancelQueue();
          setScreen("home");
        }}
        onFound={() => setScreen("found")}
      />
    );

  if (screen === "found")
    return (
      <Found
        onAccept={() => {
          if (onlineRoomId) {
            onlineClient.acceptMatch(onlineRoomId);
            return;
          }

          setScreen("game");
        }}
        onClose={() => {
          if (onlineRoomId) {
            onlineClient.cancelMatch(onlineRoomId);
          }
          setScreen("home");
        }}
        playerName={playerName}
        playerProfileAvatar={playerProfileAvatar}
        opponentName={onlineOpponentName ?? undefined}
      />
    );

  if (screen === "game")
    return (
      <Game
        mode={gameMode}
        onlineRoomId={onlineRoomId ?? undefined}
        onlineOpponentName={onlineOpponentName ?? undefined}
        user={telegramUser}
        onExitToWinner={(data) => {
          setWinnerData(data);
          setScreen("winner");
        }}
      />
    );

  if (screen === "winner" && winnerData)
    return (
      <Winner
        winner={winnerData.winner}
        playerName={winnerData.name}
        playerAvatar={winnerData.avatar}
        playerProfileAvatar={winnerData.profileAvatar}
        reward={winnerData.reward}
        onExit={() => setScreen("home")}
      />
    );

  return null;
}