import LobbyScreenLayout from "../components/LobbyScreenLayout";

interface SearchingProps {
  onCancel: () => void;
  slipperSrc?: string;
  onTraining: () => void;
  onLeaders: () => void;
  onPrevSlipper: () => void;
  onNextSlipper: () => void;
  balance: number | null;
  onlinePlayersCount: number | null;
  isFound: boolean;
}

export default function Searching({
  onCancel,
  slipperSrc,
  onTraining,
  onLeaders,
  onPrevSlipper,
  onNextSlipper,
  balance,
  onlinePlayersCount,
  isFound
}: SearchingProps) {
  return (
    <LobbyScreenLayout
      screenClassName={`searching-screen ${isFound ? "found-underlay" : ""}`}
      balance={balance}
      onlinePlayersCount={onlinePlayersCount}
      slipperSrc={slipperSrc || ""}
      onTraining={onTraining}
      onLeaders={onLeaders}
      onPrevSlipper={onPrevSlipper}
      onNextSlipper={onNextSlipper}
      bottomContent={(
        <div className="search-row">
          <div className="search-box">Идёт поиск игры</div>
          <button className="cancel-btn" onClick={onCancel} disabled={isFound}>
            ✕
          </button>
        </div>
      )}
    />
  );
}