import { useEffect, useState } from "react";
import MatchPlayerCard from "../components/MatchPlayerCard";

interface WinnerProps {
  winner: "player" | "enemy";
  playerName: string;
  playerAvatar: string;
  playerProfileAvatar?: string | null;
  reward: number;
  onExit: () => void;
}

export default function Winner({
  winner,
  playerName,
  playerAvatar,
  playerProfileAvatar,
  reward,
  onExit,
}: WinnerProps) {
  const [isWinnerTopVisible, setIsWinnerTopVisible] = useState(false);

  const isYouWinner = winner === "player";

  const resultTitle = isYouWinner ? "Вы выиграли" : "Вы проиграли";
  const rewardBadge = isYouWinner ? `+${reward}⭐` : `-${reward}⭐`;

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsWinnerTopVisible(true);
    }, 900);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  return (
    <div className="winner-screen">
      <img
        src={playerAvatar}
        className={`winner-hit-slipper ${isYouWinner ? "player" : "enemy"}`}
      />

      {isWinnerTopVisible ? (
        <div className="winner-top">
          <h4 className="winner-heading">
            <span className="winner-heading-line">Победитель 👑</span>
          </h4>

          <MatchPlayerCard
            slipperSrc={playerAvatar}
            name={playerName}
            avatarSrc={playerProfileAvatar}
            className="winner-player-card"
          />
        </div>
      ) : null}

      <div className="winner-bottom">
        <div className={`result-block ${isYouWinner ? "win" : "lose"}`}>
          <div className="result-title">{resultTitle}</div>
          <div className="result-reward">{rewardBadge}</div>
        </div>

        <button className="main-btn" onClick={onExit}>
          В главное меню
        </button>
      </div>
    </div>
  );
}