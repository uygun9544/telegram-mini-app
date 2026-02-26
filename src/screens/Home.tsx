import SlipperCard from "../components/SlipperCard";
import TopBalanceBar from "../components/TopBalanceBar";

interface HomeProps {
  onTraining: () => void;
  onPlay: () => void;
  onlineWsUrl: string;
  slipperSrc: string;
}

export default function Home({ onTraining, onPlay, onlineWsUrl, slipperSrc }: HomeProps) {
  return (
    <div className="screen home-screen">
      <TopBalanceBar onTraining={onTraining} />
      <div className="debug-ws">WS: {onlineWsUrl}</div>
      <SlipperCard imageSrc={slipperSrc} />

      <button className="main-btn" onClick={onPlay}>
        Играть
      </button>
    </div>
  );
}