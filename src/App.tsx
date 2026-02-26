import { useEffect, useRef, useState } from "react";
import Home from "./screens/Home";
import Searching from "./screens/Searching";
import Found from "./screens/Found";
import Game from "./screens/Game";
import Winner from "./screens/Winner";
import type { GameMode } from "./game/types";
import { startTrainingBotConfigAutoRefresh } from "./game/trainingConfig";
import type { PlayerProfile, RoundPlan } from "./online/types";
import { onlineClient, ONLINE_WS_URL } from "./online/client";
import { getTelegramUser } from "./telegram";
import {
  buildOnlinePlayerProfile,
  rerollPlayerSlipper,
} from "./utils/player";

type Screen = "home" | "searching" | "game" | "winner";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [, forcePlayerProfileRefresh] = useState(0);
  const [balance, setBalance] = useState(300);
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
    const stopTrainingConfigRefresh = startTrainingBotConfigAutoRefresh();

    return () => {
      stopTrainingConfigRefresh();
    };
  }, []);

  function clearStartGameTimeout() {
    if (startGameTimeoutRef.current) {
      clearTimeout(startGameTimeoutRef.current);
      startGameTimeoutRef.current = null;
    }
  }

  function resetOnlineMatchState() {
    setOnlineOpponent(null);
    setOnlineInitialRoundPlan(null);
    setOnlineRoomId(null);
    setAcceptedPlayerIds([]);
  }

  function leaveSearchingToHome(cancelType: "queue" | "match") {
    clearStartGameTimeout();

    if (cancelType === "match" && onlineRoomId) {
      onlineClient.cancelMatch(onlineRoomId);
    }

    if (cancelType === "queue") {
      onlineClient.cancelQueue();
    }

    resetOnlineMatchState();
    setScreen("home");
  }

  useEffect(() => {
    const unsubBalanceUpdate = onlineClient.on("balanceUpdate", (payload) => {
      if (payload.playerId === playerProfile.playerId) {
        setBalance(payload.balance);
      }
    });

    const unsubMatchFound = onlineClient.on("matchFound", (payload) => {
      clearStartGameTimeout();
      setOnlineRoomId(payload.roomId);
      setOnlineOpponent(payload.opponent);
      setAcceptedPlayerIds([]);
      setScreen("searching");
    });

    const unsubMatchAcceptUpdate = onlineClient.on("matchAcceptUpdate", (payload) => {
      if (!onlineRoomId || payload.roomId !== onlineRoomId) return;
      setAcceptedPlayerIds(payload.acceptedPlayerIds);
    });

    const unsubMatchReady = onlineClient.on("matchReady", (payload) => {
      clearStartGameTimeout();
      setOnlineRoomId(payload.roomId);
      setOnlineOpponent(payload.opponent);
      setOnlineInitialRoundPlan(payload.roundPlan);
      setAcceptedPlayerIds([playerProfile.playerId, payload.opponent.playerId]);
      startGameTimeoutRef.current = window.setTimeout(() => {
        setScreen("game");
      }, 1000);
    });

    const unsubMatchCancelled = onlineClient.on("matchCancelled", () => {
      clearStartGameTimeout();
      resetOnlineMatchState();
      setScreen("home");
    });

    const unsubOpponentLeft = onlineClient.on("opponentLeft", () => {
      clearStartGameTimeout();
      resetOnlineMatchState();
      setScreen("home");
    });

    return () => {
      clearStartGameTimeout();
      unsubMatchFound();
      unsubBalanceUpdate();
      unsubMatchAcceptUpdate();
      unsubMatchReady();
      unsubMatchCancelled();
      unsubOpponentLeft();
    };
  }, [onlineRoomId, playerProfile.playerId]);

  async function handlePlay() {
    setGameMode("online");
    resetOnlineMatchState();

    try {
      await onlineClient.joinQueue(playerProfile);
      setScreen("searching");
    } catch {
      setScreen("home");
    }
  }

  function handleChangeSlipper() {
    rerollPlayerSlipper(telegramUser);
    forcePlayerProfileRefresh((value) => value + 1);
  }

  function startTrainingNow() {
    clearStartGameTimeout();

    if (onlineRoomId) {
      onlineClient.cancelMatch(onlineRoomId);
    } else {
      onlineClient.cancelQueue();
    }

    setGameMode("training");
    resetOnlineMatchState();
    setScreen("game");
  }

  function handleAcceptFound() {
    if (!onlineRoomId) return;

    setAcceptedPlayerIds((prev) => {
      if (prev.includes(playerProfile.playerId)) return prev;
      return [...prev, playerProfile.playerId];
    });
    onlineClient.acceptMatch(onlineRoomId);
  }

  if (screen === "home")
    return (
      <Home
        onlineWsUrl={ONLINE_WS_URL}
        slipperSrc={playerProfile.slipper}
        balance={balance}
        onTraining={startTrainingNow}
        onChangeSlipper={handleChangeSlipper}
        onPlay={handlePlay}
      />
    );

  if (screen === "searching")
    return (
      <>
        <Searching
          slipperSrc={playerProfile.slipper}
          balance={balance}
          onTraining={startTrainingNow}
          onChangeSlipper={handleChangeSlipper}
          onlineWsUrl={ONLINE_WS_URL}
          isFound={Boolean(onlineRoomId && onlineOpponent)}
          onCancel={() => leaveSearchingToHome("queue")}
        />

        {onlineRoomId && onlineOpponent ? (
          <Found
            onAccept={handleAcceptFound}
            onClose={() => leaveSearchingToHome("match")}
            playerName={playerProfile.name}
            playerProfileAvatar={playerProfile.avatarUrl ?? undefined}
            playerSlipper={playerProfile.slipper}
            opponentName={onlineOpponent.name}
            opponentAvatar={onlineOpponent.avatarUrl ?? undefined}
            opponentSlipper={onlineOpponent.slipper}
            playerAccepted={acceptedPlayerIds.includes(playerProfile.playerId)}
            opponentAccepted={acceptedPlayerIds.includes(onlineOpponent.playerId)}
          />
        ) : null}
      </>
    );

  if (screen === "game")
    return (
      <Game
        mode={gameMode}
        onlineRoomId={onlineRoomId ?? undefined}
        onlineOpponentName={onlineOpponent?.name}
        onlineOpponentAvatar={onlineOpponent?.avatarUrl ?? undefined}
        onlineOpponentSlipper={onlineOpponent?.slipper}
        onlineOpponentPlayerId={onlineOpponent?.playerId}
        playerId={playerProfile.playerId}
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