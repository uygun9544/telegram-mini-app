import { useEffect, useState, useRef } from "react";
import type { MouseEvent } from "react";
import type { TelegramUser } from "../telegram";
import {
  getTelegramPlayerAvatar,
  getTelegramPlayerName,
  OPPONENT_NAME,
  OPPONENT_PROFILE_AVATAR,
  OPPONENT_SLIPPER,
} from "../utils/player";

type ColorItem = {
  name: string;
  emoji: string;
};

type PlayerState = "success" | "miss" | "none" | null;

type Position = {
  top: number;
  left: number;
};

type ClickMarker = {
  id: number;
  owner: "player" | "enemy";
  top: number;
  left: number;
};

interface GameProps {
  user?: TelegramUser | null;
  onExitToWinner: (data: {
    winner: "player" | "enemy";
    name: string;
    avatar: string;
    profileAvatar?: string | null;
    reward: number;
  }) => void;
}

type RoundRefType = {
  playerStep: number;
  playerState: PlayerState;
  playerTime: number | null;
  playerFinished: boolean;
  enemyState: PlayerState;
  enemyTime: number | null;
  enemyFinished: boolean;
};

const COLORS: ColorItem[] = [
  { name: "blue", emoji: "🟦" },
  { name: "red", emoji: "🟥" },
  { name: "yellow", emoji: "🟨" },
  { name: "green", emoji: "🟩" }
];

function getRandomPair(): [ColorItem, ColorItem] {
  const shuffled = [...COLORS].sort(() => 0.5 - Math.random());
  return [shuffled[0], shuffled[1]];
}

function randomDelay(): number {
  return Math.floor(Math.random() * 6000) + 2000;
}

function generatePositions(): [Position, Position] {
  let p1: Position = {
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

export default function Game({ onExitToWinner, user }: GameProps) {
  const [round, setRound] = useState(1);
  const [playerWins, setPlayerWins] = useState(0);
  const [enemyWins, setEnemyWins] = useState(0);

  const [pair, setPair] = useState<[ColorItem, ColorItem]>(getRandomPair());
  const [order, setOrder] = useState<ColorItem[]>([]);
  const [positions, setPositions] = useState<[Position, Position] | []>([]);
  const [visible, setVisible] = useState(false);

  const [timer, setTimer] = useState(0);
  const [winnerText, setWinnerText] = useState<string | null>(null);

  const [uiPlayerState, setUiPlayerState] = useState<PlayerState>(null);
  const [uiEnemyState, setUiEnemyState] = useState<PlayerState>(null);
  const [uiPlayerTime, setUiPlayerTime] = useState<number | null>(null);
  const [uiEnemyTime, setUiEnemyTime] = useState<number | null>(null);
  const [clickMarkers, setClickMarkers] = useState<ClickMarker[]>([]);

  const roundRef = useRef<RoundRefType | null>(null);
  const uiTimerRef = useRef<number | null>(null);
  const actionTimeoutRef = useRef<number | null>(null);
  const revealTimeoutRef = useRef<number | null>(null);
  const enemyTimeoutRef = useRef<number | null>(null);
  const nextRoundTimeoutRef = useRef<number | null>(null);
  const roundTokenRef = useRef(0);
  const squareAppearTimeRef = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);
  const markerIdRef = useRef(0);

  const playerName = getTelegramPlayerName(user);
  const playerAvatar = getTelegramPlayerAvatar(user);

  useEffect(() => {
    startRound();
  }, [round]);

  useEffect(() => {
    return () => {
      clearRoundTimers();
    };
  }, []);

  function clearRoundTimers() {
    if (uiTimerRef.current) clearInterval(uiTimerRef.current);
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    if (enemyTimeoutRef.current) clearTimeout(enemyTimeoutRef.current);
    if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);

    uiTimerRef.current = null;
    actionTimeoutRef.current = null;
    revealTimeoutRef.current = null;
    enemyTimeoutRef.current = null;
    nextRoundTimeoutRef.current = null;
  }

  function startRound() {
    clearRoundTimers();
    const currentRoundToken = ++roundTokenRef.current;

    const newPair = getRandomPair();
    setPair(newPair);
    setOrder([newPair[0], newPair[1]]);
    setPositions(generatePositions());
    setVisible(false);

    setWinnerText(null);
    setUiPlayerState(null);
    setUiEnemyState(null);
    setUiPlayerTime(null);
    setUiEnemyTime(null);
    setClickMarkers([]);

    roundRef.current = {
      playerStep: 0,
      playerState: null,
      playerTime: null,
      playerFinished: false,
      enemyState: null,
      enemyTime: null,
      enemyFinished: false
    };

    const roundStart = Date.now();
    setTimer(0);

    uiTimerRef.current = window.setInterval(() => {
      setTimer(Math.floor((Date.now() - roundStart) / 1000));
    }, 1000);

    const delay = randomDelay();

    revealTimeoutRef.current = window.setTimeout(() => {
      if (currentRoundToken !== roundTokenRef.current) return;

      setVisible(true);
      squareAppearTimeRef.current = Date.now();

      actionTimeoutRef.current = window.setTimeout(() => {
        if (currentRoundToken !== roundTokenRef.current) return;
        forceFinish();
      }, 20000);
    }, delay);
  }

  function tryResolve() {
    const r = roundRef.current;
    if (r && r.playerFinished && r.enemyFinished) {
      resolveRound();
    }
  }

  function addClickMarker(owner: "player" | "enemy", top: number, left: number) {
    const id = markerIdRef.current++;
    setClickMarkers(prev => [...prev, { id, owner, top, left }]);
  }

  function addPlayerClickMarker(e: MouseEvent<HTMLDivElement>) {
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;

    const rect = gameArea.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
    const relativeY = ((e.clientY - rect.top) / rect.height) * 100;

    const left = Math.min(Math.max(relativeX, 0), 100);
    const top = Math.min(Math.max(relativeY, 0), 100);

    addClickMarker("player", top, left);
  }

  function addEnemyRandomClickMarker() {
    const top = Math.random() * 88 + 6;
    const left = Math.random() * 88 + 6;
    addClickMarker("enemy", top, left);
  }

  function addEnemyClickMarkerByPosition(position: Position) {
    addClickMarker("enemy", position.top + 6, position.left + 6);
  }

  function handleSquareClick(
    color: string,
    e: MouseEvent<HTMLDivElement>
  ) {
    e.stopPropagation();
    if (!visible || winnerText) return;

    const r = roundRef.current;
    if (!r || r.playerFinished) return;

    addPlayerClickMarker(e);

    if (r.playerStep === 0) {
      if (color === order[0].name) {
        r.playerStep = 1;
      } else {
        r.playerState = "miss";
        r.playerFinished = true;
        setUiPlayerState("miss");
        simulateEnemy();
      }
      return;
    }

    if (r.playerStep === 1) {
      if (color === order[1].name) {
        r.playerState = "success";
        r.playerTime = Date.now() - squareAppearTimeRef.current;
        r.playerFinished = true;
        setUiPlayerState("success");
        setUiPlayerTime(r.playerTime);
      } else {
        r.playerState = "miss";
        r.playerFinished = true;
        setUiPlayerState("miss");
      }

      simulateEnemy();
    }
  }

  function handleMissClick(e: MouseEvent<HTMLDivElement>) {
    if (!visible || winnerText) return;
    const r = roundRef.current;
    if (!r || r.playerFinished) return;

    addPlayerClickMarker(e);

    r.playerState = "miss";
    r.playerFinished = true;
    setUiPlayerState("miss");
    simulateEnemy();
  }

  function simulateEnemy() {
    const r = roundRef.current;
    if (!r || r.enemyFinished) return;

    const currentRoundToken = roundTokenRef.current;

    if (enemyTimeoutRef.current) clearTimeout(enemyTimeoutRef.current);

    enemyTimeoutRef.current = window.setTimeout(() => {
      if (currentRoundToken !== roundTokenRef.current) return;

      if (Math.random() < 0.25) {
        r.enemyState = "miss";
        addEnemyRandomClickMarker();
      } else {
        r.enemyState = "success";
        r.enemyTime = Math.floor(300 + Math.random() * 500);

        if (positions.length === 2) {
          addEnemyClickMarkerByPosition(positions[0]);
          window.setTimeout(() => addEnemyClickMarkerByPosition(positions[1]), 180);
        }
      }

      r.enemyFinished = true;
      setUiEnemyState(r.enemyState);
      setUiEnemyTime(r.enemyTime ?? null);
      tryResolve();
    }, 1200);
  }

  function forceFinish() {
    const r = roundRef.current;
    if (!r) return;

    if (!r.playerFinished) {
      r.playerState = "none";
      r.playerFinished = true;
    }

    if (!r.enemyFinished) {
      r.enemyState = "none";
      r.enemyFinished = true;
    }

    tryResolve();
  }

  function resolveRound() {
    if (uiTimerRef.current) clearInterval(uiTimerRef.current);
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);

    const r = roundRef.current;
    if (!r) return;

    const currentRoundToken = roundTokenRef.current;

    let result: "player" | "enemy" | "draw" = "draw";

    if (r.playerState === "success" && r.enemyState === "success") {
      result =
        (r.playerTime ?? 0) <= (r.enemyTime ?? 0)
          ? "player"
          : "enemy";
    } else if (r.playerState === "success") {
      result = "player";
    } else if (r.enemyState === "success") {
      result = "enemy";
    }

    if (result === "player") {
      setPlayerWins(prev => {
        const updated = prev + 1;
        if (updated === 3) {
          setTimeout(() => {
            onExitToWinner({
              winner: "player",
              name: playerName,
              avatar: playerAvatar,
              profileAvatar: user?.photo_url,
              reward: 5
            });
          }, 1000);
        }
        return updated;
      });
      setWinnerText(`${playerName} выиграл`);
    }

    else if (result === "enemy") {
      setEnemyWins(prev => {
        const updated = prev + 1;
        if (updated === 3) {
          setTimeout(() => {
            onExitToWinner({
              winner: "enemy",
              name: OPPONENT_NAME,
              avatar: OPPONENT_SLIPPER,
              profileAvatar: OPPONENT_PROFILE_AVATAR,
              reward: 5
            });
          }, 1000);
        }
        return updated;
      });
      setWinnerText(`${OPPONENT_NAME} выиграл`);
    }

    else {
      setWinnerText("Ничья");
    }

    nextRoundTimeoutRef.current = window.setTimeout(() => {
      if (currentRoundToken !== roundTokenRef.current) return;
      setRound(r => r + 1);
    }, 1500);
  }

  function formatTime(seconds: number) {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  const playerResultText =
    uiPlayerState === "miss"
      ? "Мимо"
      : uiPlayerState === "none"
        ? "Время вышло"
        : uiPlayerState === "success" && uiPlayerTime !== null
          ? `Твоё время: ${uiPlayerTime} мс`
          : "\u00A0";

  const enemyResultText =
    uiEnemyState === "miss"
      ? `${OPPONENT_NAME} не попал`
      : uiEnemyState === "none"
        ? `Время ${OPPONENT_NAME} вышло`
        : uiEnemyState === "success" && uiEnemyTime !== null
          ? `Время ${OPPONENT_NAME}: ${uiEnemyTime} мс`
          : "\u00A0";

  return (
    <div className="game-screen">
      <div className="top-bar">
        <div className="player-half">
          <img   src="/green.png" className="mini"
          />
         
          <div className="slots">
            {[0, 1, 2].map(i => (
              <div key={i} className={`slot ${i < playerWins ? "win" : ""}`} />
            ))}
          </div>
        </div>

        <div className="player-half right">
          <div className="slots">
            {[0, 1, 2].map(i => (
              <div key={i} className={`slot ${i < enemyWins ? "win" : ""}`} />
            ))}
          </div>
          <img src="/pink.png" className="mini" />
        </div>
      </div>

      <div className="round-box">
        <h2>Раунд {round}</h2>
        <p>Нажмите в порядке</p>
        <div className="big-order order-preview">
          <span
            className={`square order-square ${order[0]?.name || ""}`}
          />
          <span className="order-arrow">→</span>
          <span
            className={`square order-square ${order[1]?.name || ""}`}
          />
        </div>
      </div>

      <div className="main-timer">{formatTime(timer)}</div>

      {winnerText && (
        <div className="winner-popup">{winnerText}</div>
      )}

      <div className="game-area" ref={gameAreaRef} onClick={handleMissClick}>
        {clickMarkers.map((marker) => (
          <div
            key={marker.id}
            className={`click-marker ${marker.owner}`}
            style={{ top: `${marker.top}%`, left: `${marker.left}%` }}
          />
        ))}

        {visible && positions.length === 2 && (
          <>
            <div
              className={`square ${pair[0].name} ${
                roundRef.current?.playerFinished ? "faded" : ""
              }`}
              style={{
                top: positions[0].top + "%",
                left: positions[0].left + "%"
              }}
              onClick={(e) =>
                handleSquareClick(pair[0].name, e)
              }
            />
            <div
              className={`square ${pair[1].name} ${
                roundRef.current?.playerFinished ? "faded" : ""
              }`}
              style={{
                top: positions[1].top + "%",
                left: positions[1].left + "%"
              }}
              onClick={(e) =>
                handleSquareClick(pair[1].name, e)
              }
            />
          </>
        )}
      </div>

      <div className="time-display">{playerResultText}</div>

      <div className="time-display enemy">{enemyResultText}</div>
    </div>
  );
}
