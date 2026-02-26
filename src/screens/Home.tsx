import LobbyScreenLayout from "../components/LobbyScreenLayout";

interface HomeProps {
  onTraining: () => void;
  onPlay: () => void;
  onChangeSlipper: () => void;
  onlineWsUrl: string;
  slipperSrc: string;
  balance: number;
}

export default function Home({
  onTraining,
  onPlay,
  onChangeSlipper,
  onlineWsUrl,
  slipperSrc,
  balance
}: HomeProps) {
  return (
    <LobbyScreenLayout
      screenClassName="home-screen"
      balance={balance}
      onlineWsUrl={onlineWsUrl}
      slipperSrc={slipperSrc}
      onTraining={onTraining}
      onChangeSlipper={onChangeSlipper}
      bottomContent={(
        <button className="main-btn" onClick={onPlay}>
          Играть
        </button>
      )}
    />
  );
}