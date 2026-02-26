import { useEffect, useState } from "react";
import { DEFAULT_OPPONENT_SLIPPER, DEFAULT_PLAYER_SLIPPER } from "../utils/player";

interface RoundHeaderProps {
  round: number;
  order: string[];
  leftWins: number;
  rightWins: number;
  isActive: boolean;
}

export default function RoundHeader({
  round,
  order,
  leftWins,
  rightWins,
  isActive
}: RoundHeaderProps) {
  const [time, setTime] = useState<number>(0);

  useEffect(() => {
    if (!isActive) return;

    setTime(0);

    const interval = setInterval(() => {
      setTime((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, round]);

  const format = () => {
    const m = String(Math.floor(time / 60)).padStart(2, "0");
    const s = String(time % 60).padStart(2, "0");
    return `00:${m}:${s}`;
  };

  return (
    <div className="round-wrapper">
      <div className="round-bar">
        <span>Раунд {round}</span>
        <span>
          {order[0]} → {order[1]}
        </span>
        <span>{format()}</span>
      </div>

      <div className="wins-row">
        <div className="player-wins">
          <img src={DEFAULT_PLAYER_SLIPPER} className="mini" />
          <div className="slots">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`slot ${i < leftWins ? "win" : ""}`}
              />
            ))}
          </div>
        </div>

        <div className="player-wins right">
          <div className="slots">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`slot ${i < rightWins ? "win" : ""}`}
              />
            ))}
          </div>
          <img src={DEFAULT_OPPONENT_SLIPPER} className="mini" />
        </div>
      </div>
    </div>
  );
}