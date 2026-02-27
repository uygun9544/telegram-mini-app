import LobbyScreenLayout from "../components/LobbyScreenLayout";

interface HomeProps {
  onTraining: () => void;
  onPlay: () => void;
  onLeaders: () => void;
  onPrevSlipper: () => void;
  onNextSlipper: () => void;
  slipperSrc: string;
  balance: number | null;
  searchingPlayersCount: number | null;
}

export default function Home({
  onTraining,
  onPlay,
  onLeaders,
  onPrevSlipper,
  onNextSlipper,
  slipperSrc,
  balance,
  searchingPlayersCount
}: HomeProps) {
  return (
    <LobbyScreenLayout
      screenClassName="home-screen"
      balance={balance}
      searchingPlayersCount={searchingPlayersCount}
      slipperSrc={slipperSrc}
      onTraining={onTraining}
      onLeaders={onLeaders}
      onPrevSlipper={onPrevSlipper}
      onNextSlipper={onNextSlipper}
      bottomContent={(
        <button className="main-btn" onClick={onPlay}>
          Играть
        </button>
      )}
    />
  );
}