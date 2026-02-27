import LobbyScreenLayout from "../components/LobbyScreenLayout";

interface SearchingProps {
  onCancel: () => void;
  slipperSrc?: string;
  onTraining: () => void;
  onPrevSlipper: () => void;
  onNextSlipper: () => void;
  balance: number | null;
  isFound: boolean;
}

export default function Searching({
  onCancel,
  slipperSrc,
  onTraining,
  onPrevSlipper,
  onNextSlipper,
  balance,
  isFound
}: SearchingProps) {
  return (
    <LobbyScreenLayout
      screenClassName={`searching-screen ${isFound ? "found-underlay" : ""}`}
      balance={balance}
      slipperSrc={slipperSrc || ""}
      onTraining={onTraining}
      onPrevSlipper={onPrevSlipper}
      onNextSlipper={onNextSlipper}
      isChangeSlipperDisabled
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