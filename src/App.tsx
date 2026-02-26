import { useEffect, useRef, useState } from "react";
import Home from "./screens/Home";
import Searching from "./screens/Searching";
import Found from "./screens/Found";
import Game from "./screens/Game";
import Winner from "./screens/Winner";
import type { GameMode } from "./game/types";
import type { PlayerProfile, RoundPlan } from "./online/types";
import { onlineClient, ONLINE_WS_URL } from "./online/client";
import { getTelegramUser } from "./telegram";
import {
  buildOnlinePlayerProfile,
} from "./utils/player";

type Screen = "home" | "searching" | "found" | "game" | "winner";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [gameMode, setGameMode] = useState<GameMode>("training");
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [onlineOpponent, setOnlineOpponent] = useState<PlayerProfile | null>(null);
  const [onlineInitialRoundPlan, setOnlineInitialRoundPlan] = useState<RoundPlan | null>(null);
  const [acceptedPlayerIds, setAcceptedPlayerIds] = useState<string[]>([]);
  const startGameTimeoutRef = useRef<number | null>(null);
  const telegramUser = getTelegramUser();
  const playerProfile = buildOnlinePlayerProfile(telegramUser);

  const [winnerData, setWinnerData] = useState<{
    winner: "player" | "enemy";
    name: string;
    avatar: string;
    profileAvatar?: string | null;
    reward: number;
  } | null>(null);

  type WinnerPayload = {
    winner: "player" | "enemy";
    name: string;
    avatar: string;
    profileAvatar?: string | null;
    reward: number;
  };

  useEffect(() => {
    const clearStartTimeout = () => {
      if (startGameTimeoutRef.current) {
        clearTimeout(startGameTimeoutRef.current);
        startGameTimeoutRef.current = null;
      }
    };

    const unsubMatchFound = onlineClient.on("matchFound", (payload) => {
      clearStartTimeout();
      setOnlineRoomId(payload.roomId);
      setOnlineOpponent(payload.opponent);
      setAcceptedPlayerIds([]);
      setScreen("found");
    });

    const unsubMatchAcceptUpdate = onlineClient.on("matchAcceptUpdate", (payload) => {
      if (!onlineRoomId || payload.roomId !== onlineRoomId) return;
      setAcceptedPlayerIds(payload.acceptedPlayerIds);
    });

    const unsubMatchReady = onlineClient.on("matchReady", (payload) => {
      clearStartTimeout();
      setOnlineRoomId(payload.roomId);
      setOnlineOpponent(payload.opponent);
      setOnlineInitialRoundPlan(payload.roundPlan);
      setAcceptedPlayerIds([playerProfile.playerId, payload.opponent.playerId]);
      startGameTimeoutRef.current = window.setTimeout(() => {
        setScreen("game");
      }, 1000);
    });

    const unsubMatchCancelled = onlineClient.on("matchCancelled", () => {
      clearStartTimeout();
      setOnlineRoomId(null);
      setOnlineOpponent(null);
      setOnlineInitialRoundPlan(null);
      setAcceptedPlayerIds([]);
      setScreen("home");
    });

    const unsubOpponentLeft = onlineClient.on("opponentLeft", () => {
      clearStartTimeout();
      setOnlineRoomId(null);
      setOnlineOpponent(null);
      setOnlineInitialRoundPlan(null);
      setAcceptedPlayerIds([]);
      setScreen("home");
    });

    return () => {
      clearStartTimeout();
      unsubMatchFound();
      unsubMatchAcceptUpdate();
      unsubMatchReady();
      unsubMatchCancelled();
      unsubOpponentLeft();
    };
  }, [onlineRoomId, playerProfile.playerId]);

  async function handlePlay() {
    setGameMode("online");
    setOnlineOpponent(null);
    setOnlineInitialRoundPlan(null);
    setOnlineRoomId(null);
    setAcceptedPlayerIds([]);

    try {
      await onlineClient.joinQueue(playerProfile);
      setScreen("searching");
    } catch {
      setScreen("home");
    }
  }

  function startTrainingNow() {
    if (startGameTimeoutRef.current) {
      clearTimeout(startGameTimeoutRef.current);
      startGameTimeoutRef.current = null;
    }

    if (onlineRoomId) {
      onlineClient.cancelMatch(onlineRoomId);
    } else {
      onlineClient.cancelQueue();
    }

    setGameMode("training");
    setOnlineRoomId(null);
    setOnlineOpponent(null);
    setOnlineInitialRoundPlan(null);
    setAcceptedPlayerIds([]);
    setScreen("game");
  }

  if (screen === "home")
    return (
      <Home
        onlineWsUrl={ONLINE_WS_URL}
        slipperSrc={playerProfile.slipper}
        onTraining={startTrainingNow}
        onPlay={handlePlay}
      />
    );

  if (screen === "searching")
    return (
      <Searching
        autoFind={false}
        slipperSrc={playerProfile.slipper}
        onTraining={startTrainingNow}
        onCancel={() => {
          if (startGameTimeoutRef.current) {
            clearTimeout(startGameTimeoutRef.current);
            startGameTimeoutRef.current = null;
          }
          onlineClient.cancelQueue();
          setOnlineOpponent(null);
          setOnlineInitialRoundPlan(null);
          setOnlineRoomId(null);
          setAcceptedPlayerIds([]);
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
          if (startGameTimeoutRef.current) {
            clearTimeout(startGameTimeoutRef.current);
            startGameTimeoutRef.current = null;
          }
          if (onlineRoomId) {
            onlineClient.cancelMatch(onlineRoomId);
          }
          setOnlineOpponent(null);
          setOnlineInitialRoundPlan(null);
          setOnlineRoomId(null);
          setAcceptedPlayerIds([]);
          setScreen("home");
        }}
        playerName={playerProfile.name}
        playerProfileAvatar={playerProfile.avatarUrl ?? undefined}
        playerSlipper={playerProfile.slipper}
        opponentName={onlineOpponent?.name}
        opponentAvatar={onlineOpponent?.avatarUrl ?? undefined}
        opponentSlipper={onlineOpponent?.slipper}
        playerAccepted={acceptedPlayerIds.includes(playerProfile.playerId)}
        opponentAccepted={Boolean(
          onlineOpponent && acceptedPlayerIds.includes(onlineOpponent.playerId)
        )}
        onTraining={startTrainingNow}
      />
    );

  if (screen === "game")
    return (
      <Game
        mode={gameMode}
        onlineRoomId={onlineRoomId ?? undefined}
        onlineOpponentName={onlineOpponent?.name}
        onlineOpponentAvatar={onlineOpponent?.avatarUrl ?? undefined}
        onlineOpponentSlipper={onlineOpponent?.slipper}
        playerSlipper={playerProfile.slipper}
        initialOnlineRoundPlan={onlineInitialRoundPlan ?? undefined}
        user={telegramUser}
        onExitToWinner={(data: WinnerPayload) => {
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