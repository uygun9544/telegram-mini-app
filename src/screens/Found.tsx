import SlipperCard from "../components/SlipperCard";
import MatchPlayerCard from "../components/MatchPlayerCard";
import {
  OPPONENT_NAME,
  OPPONENT_PROFILE_AVATAR,
  OPPONENT_SLIPPER,
} from "../utils/player";

interface FoundProps {
  onAccept: () => void;
  onClose: () => void;
  playerName: string;
  playerProfileAvatar?: string;
  opponentName?: string;
}

export default function Found({
  onAccept,
  onClose,
  playerName,
  playerProfileAvatar,
  opponentName,
}: FoundProps) {
  return (
    <>
      <div className="screen searching-screen found-underlay">
        <div className="balance">Баланс: 300 ⭐</div>
        <SlipperCard />

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
              slipperSrc="/green.png"
              name={playerName}
              avatarSrc={playerProfileAvatar}
            />

            <div className="players-vs">VS</div>

            <MatchPlayerCard
              slipperSrc={OPPONENT_SLIPPER}
              name={opponentName || OPPONENT_NAME}
              avatarSrc={OPPONENT_PROFILE_AVATAR}
            />
          </div>

          <div className="search-row modal-action-row">
            <button className="main-btn modal-main-btn" onClick={onAccept}>
              Принять игру
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