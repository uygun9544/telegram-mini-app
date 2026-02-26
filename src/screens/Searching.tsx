import LobbyScreenLayout from "../components/LobbyScreenLayout";

interface SearchingProps {
  onCancel: () => void;
  slipperSrc?: string;
  onTraining: () => void;
  onChangeSlipper: () => void;
  onlineWsUrl: string;
  balance: number | null;
  isFound: boolean;
}

export default function Searching({
  onCancel,
  slipperSrc,
  onTraining,
  onChangeSlipper,
  onlineWsUrl,
  balance,
  isFound
}: SearchingProps) {
  return (
    <LobbyScreenLayout
      screenClassName={`searching-screen ${isFound ? "found-underlay" : ""}`}
      balance={balance}
      onlineWsUrl={onlineWsUrl}
      slipperSrc={slipperSrc || ""}
      onTraining={onTraining}
      onChangeSlipper={onChangeSlipper}
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