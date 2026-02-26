import MatchPlayerCard from "../components/MatchPlayerCard";
import {
  OPPONENT_NAME,
  OPPONENT_SLIPPER,
} from "../utils/player";

type FoundProps = {
  onAccept: () => void;
  onClose: () => void;
  playerName: string;
  playerProfileAvatar?: string;
  playerSlipper: string;
  opponentName: string;
  opponentAvatar?: string;
  opponentSlipper: string;
  playerAccepted: boolean;
  opponentAccepted: boolean;
};

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
}: FoundProps) {
  return (
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
  );
}
