import { useEffect } from "react";
import SlipperCard from "../components/SlipperCard";
import TopBalanceBar from "../components/TopBalanceBar";

interface SearchingProps {
  onCancel: () => void;
  onFound: () => void;
  autoFind?: boolean;
  slipperSrc?: string;
  onTraining: () => void;
}

export default function Searching({
  onCancel,
  onFound,
  autoFind = true,
  slipperSrc,
  onTraining
}: SearchingProps) {
  useEffect(() => {
    if (!autoFind) return;

    const timer = setTimeout(() => {
      onFound();
    }, 2000);

    return () => clearTimeout(timer);
  }, [autoFind, onFound]);

  return (
    <div className="screen searching-screen">
      <TopBalanceBar onTraining={onTraining} />
      <SlipperCard imageSrc={slipperSrc} />

      <div className="search-row">
        <div className="search-box">Идёт поиск игры</div>
        <button className="cancel-btn" onClick={onCancel}>
          ✕
        </button>
      </div>
    </div>
  );
}