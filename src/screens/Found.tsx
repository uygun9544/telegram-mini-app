import SlipperCard from "../components/SlipperCard";
import MatchPlayerCard from "../components/MatchPlayerCard";
import TopBalanceBar from "../components/TopBalanceBar";
import {
  OPPONENT_NAME,
  OPPONENT_SLIPPER,
} from "../utils/player";

interface FoundProps {
  onAccept: () => void;
  onClose: () => void;
  playerName: string;
  playerProfileAvatar?: string;
  playerSlipper: string;
  opponentName?: string;
  opponentAvatar?: string;
  opponentSlipper?: string;
  playerAccepted: boolean;
  opponentAccepted: boolean;
  onTraining: () => void;
}

export default function Found({
  onAccept,
  onClose,
  playerName,
  playerProfileAvatar,
  playerSlipper,
  opponentName,
  opponentAvatar,
  opponentSlipper,
  playerAccepted,
  opponentAccepted,
  onTraining,
}: FoundProps) {
  return (
    <>
      <div className="screen searching-screen found-underlay">
        <TopBalanceBar onTraining={onTraining} />
        <SlipperCard imageSrc={playerSlipper} />

        <div className="search-row">
          <div className="search-box">Идёт поиск игры</div>
          <button className="cancel-btn" disabled>
            ✕
          </button>
        </div>
      </div>

      <div className="screen modal-screen">
        <div className="modal">
          <h3>Игра найдена</h3>
          <h1>Примите игру</h1>

          <div className="players">
            <MatchPlayerCard
              slipperSrc={playerSlipper}
              name={playerName}
              avatarSrc={playerProfileAvatar}
              isAccepted={playerAccepted}
            />

            <div className="players-vs">VS</div>

            <MatchPlayerCard
              slipperSrc={opponentSlipper || OPPONENT_SLIPPER}
              name={opponentName || OPPONENT_NAME}
              avatarSrc={opponentAvatar}
              isAccepted={opponentAccepted}
            />
          </div>

          <div className="search-row modal-action-row">
            <button
              className={`main-btn modal-main-btn ${playerAccepted ? "accepted" : ""}`}
              onClick={onAccept}
              disabled={playerAccepted}
            >
              {playerAccepted ? "Игра принята" : "Принять игру"}
            </button>

            <button
              className="cancel-btn"
              onClick={onClose}
              aria-label="Отменить игру"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </>
  );
}