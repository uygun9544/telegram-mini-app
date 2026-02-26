import SlipperCard from "../components/SlipperCard";

interface HomeProps {
  onTraining: () => void;
  onPlay: () => void;
  onlineWsUrl: string;
}

export default function Home({ onTraining, onPlay, onlineWsUrl }: HomeProps) {
  return (
    <div className="screen home-screen">
      <div className="balance balance-row">
        <span>Баланс: 300 ⭐</span>

        <button className="mode-toggle" onClick={onTraining}>Тренировка</button>
      </div>
      <div className="debug-ws">WS: {onlineWsUrl}</div>
      <SlipperCard />

      <button className="main-btn" onClick={onPlay}>
        Играть
      </button>
    </div>
  );
}