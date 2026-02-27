import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Home from "./screens/Home";
import Searching from "./screens/Searching";
import Found from "./screens/Found";
import Game from "./screens/Game";
import Winner from "./screens/Winner";
import Leaders from "./screens/Leaders";
import type { GameMode } from "./game/types";
import { startTrainingBotConfigAutoRefresh } from "./game/trainingConfig";
import type { PlayerProfile, RoundPlan } from "./online/types";
import { onlineClient } from "./online/client";
import { getTelegramUser } from "./telegram";
import {
  buildOnlinePlayerProfile,
  cyclePlayerSlipper,
} from "./utils/player";

type Screen = "home" | "searching" | "game" | "winner" | "leaders";

function getInitialScreen(): Screen {
  if (typeof window === "undefined") return "home";

  const screen = new URLSearchParams(window.location.search).get("screen");
  if (screen === "leaders") {
    return "leaders";
  }

  return "home";
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const [, forcePlayerProfileRefresh] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("training");
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [onlineOpponent, setOnlineOpponent] = useState<PlayerProfile | null>(null);
  const [onlineInitialRoundPlan, setOnlineInitialRoundPlan] = useState<RoundPlan | null>(null);
  const [acceptedPlayerIds, setAcceptedPlayerIds] = useState<string[]>([]);
  const startGameTimeoutRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const screenRef = useRef<Screen>("home");
  const onlineRoomIdRef = useRef<string | null>(null);
  const lastSelfMatchCancelAtRef = useRef<number>(0);
  const telegramUser = getTelegramUser();
  const playerProfile = buildOnlinePlayerProfile(telegramUser);
  const playerProfileId = playerProfile.playerId;
  const playerProfileName = playerProfile.name;
  const playerProfileAvatarUrl = playerProfile.avatarUrl;
  const playerProfileSlipper = playerProfile.slipper;

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
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    onlineRoomIdRef.current = onlineRoomId;
  }, [onlineRoomId]);

  useEffect(() => {
    const stopTrainingConfigRefresh = startTrainingBotConfigAutoRefresh();

    return () => {
      stopTrainingConfigRefresh();
    };
  }, []);

  function showToast(message: string) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }

    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 3000);
  }

  useEffect(() => {
    onlineClient.syncBalance({
      playerId: playerProfileId,
      name: playerProfileName,
      avatarUrl: playerProfileAvatarUrl,
      slipper: playerProfileSlipper,
    }).catch(() => {
      // keep current local balance if sync is temporarily unavailable
    });
  }, [playerProfileId, playerProfileName, playerProfileAvatarUrl, playerProfileSlipper]);

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
      lastSelfMatchCancelAtRef.current = Date.now();
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
      if (payload.playerId === playerProfileId) {
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
      const currentRoomId = onlineRoomIdRef.current;
      if (!currentRoomId || payload.roomId !== currentRoomId) return;
      setAcceptedPlayerIds(payload.acceptedPlayerIds);
    });

    const unsubMatchReady = onlineClient.on("matchReady", (payload) => {
      clearStartGameTimeout();
      setOnlineRoomId(payload.roomId);
      setOnlineOpponent(payload.opponent);
      setOnlineInitialRoundPlan(payload.roundPlan);
      setAcceptedPlayerIds([playerProfileId, payload.opponent.playerId]);
      startGameTimeoutRef.current = window.setTimeout(() => {
        setScreen("game");
      }, 1000);
    });

    const unsubMatchCancelled = onlineClient.on("matchCancelled", () => {
      const cancelledBySelf = Date.now() - lastSelfMatchCancelAtRef.current < 2000;
      if (cancelledBySelf) {
        lastSelfMatchCancelAtRef.current = 0;
      }

      clearStartGameTimeout();
      resetOnlineMatchState();
      setScreen("home");

      if (!cancelledBySelf) {
        showToast("Игра была прервана соперником");
      }
    });

    const unsubOpponentLeft = onlineClient.on("opponentLeft", () => {
      clearStartGameTimeout();
      resetOnlineMatchState();
      setScreen("home");
      showToast("Игра была прервана соперником");
    });

    const unsubDisconnected = onlineClient.on("disconnected", () => {
      const inGame = screenRef.current === "game";
      if (!inGame && !onlineRoomIdRef.current) return;

      clearStartGameTimeout();
      resetOnlineMatchState();
      setScreen("home");
      showToast("Игра была прервана соперником");
    });

    return () => {
      clearStartGameTimeout();
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
      unsubMatchFound();
      unsubBalanceUpdate();
      unsubMatchAcceptUpdate();
      unsubMatchReady();
      unsubMatchCancelled();
      unsubOpponentLeft();
      unsubDisconnected();
    };
  }, [playerProfileId]);

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

  function handlePrevSlipper() {
    cyclePlayerSlipper(telegramUser, "prev");
    forcePlayerProfileRefresh((value) => value + 1);
  }

  function handleNextSlipper() {
    cyclePlayerSlipper(telegramUser, "next");
    forcePlayerProfileRefresh((value) => value + 1);
  }

  function startTrainingNow() {
    clearStartGameTimeout();

    if (onlineRoomId) {
      lastSelfMatchCancelAtRef.current = Date.now();
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
      if (prev.includes(playerProfileId)) return prev;
      return [...prev, playerProfileId];
    });
    onlineClient.acceptMatch(onlineRoomId);
  }

  let screenContent: ReactNode = null;

  if (screen === "home") {
    screenContent = (
      <Home
        slipperSrc={playerProfileSlipper}
        balance={balance}
        onTraining={startTrainingNow}
        onLeaders={() => setScreen("leaders")}
        onPrevSlipper={handlePrevSlipper}
        onNextSlipper={handleNextSlipper}
        onPlay={handlePlay}
      />
    );
  } else if (screen === "searching") {
    screenContent = (
      <>
        <Searching
          slipperSrc={playerProfileSlipper}
          balance={balance}
          onTraining={startTrainingNow}
          onLeaders={() => setScreen("leaders")}
          onPrevSlipper={handlePrevSlipper}
          onNextSlipper={handleNextSlipper}
          isFound={Boolean(onlineRoomId && onlineOpponent)}
          onCancel={() => leaveSearchingToHome("queue")}
        />

        {onlineRoomId && onlineOpponent ? (
          <Found
            onAccept={handleAcceptFound}
            onClose={() => leaveSearchingToHome("match")}
            playerName={playerProfileName}
            playerProfileAvatar={playerProfileAvatarUrl ?? undefined}
            playerSlipper={playerProfileSlipper}
            opponentName={onlineOpponent.name}
            opponentAvatar={onlineOpponent.avatarUrl ?? undefined}
            opponentSlipper={onlineOpponent.slipper}
            playerAccepted={acceptedPlayerIds.includes(playerProfileId)}
            opponentAccepted={acceptedPlayerIds.includes(onlineOpponent.playerId)}
          />
        ) : null}
      </>
    );
  } else if (screen === "game") {
    screenContent = (
      <Game
        mode={gameMode}
        onExitHome={() => setScreen("home")}
        onlineRoomId={onlineRoomId ?? undefined}
        onlineOpponentName={onlineOpponent?.name}
        onlineOpponentAvatar={onlineOpponent?.avatarUrl ?? undefined}
        onlineOpponentSlipper={onlineOpponent?.slipper}
        onlineOpponentPlayerId={onlineOpponent?.playerId}
        playerId={playerProfileId}
        playerSlipper={playerProfileSlipper}
        initialOnlineRoundPlan={onlineInitialRoundPlan ?? undefined}
        user={telegramUser}
        onExitToWinner={(data: WinnerPayload) => {
          setWinnerData(data);
          setScreen("winner");
        }}
      />
    );
  } else if (screen === "winner" && winnerData) {
    screenContent = (
      <Winner
        winner={winnerData.winner}
        playerName={winnerData.name}
        playerAvatar={winnerData.avatar}
        playerProfileAvatar={winnerData.profileAvatar}
        reward={winnerData.reward}
        onExit={() => setScreen("home")}
      />
    );
  } else if (screen === "leaders") {
    screenContent = <Leaders onHome={() => setScreen("home")} />;
  }

  if (!screenContent) return null;

  return (
    <>
      {screenContent}
      {toastMessage ? (
        <div className="app-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}
    </>
  );
}