import { useEffect } from "react";
import SlipperCard from "../components/SlipperCard";

interface SearchingProps {
  onCancel: () => void;
  onFound: () => void;
  autoFind?: boolean;
}

export default function Searching({
  onCancel,
  onFound,
  autoFind = true
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
      <div className="balance">Баланс: 300 ⭐</div>
      <SlipperCard />

      <div className="search-row">
        <div className="search-box">Идёт поиск игры</div>
        <button className="cancel-btn" onClick={onCancel}>
          ✕
        </button>
      </div>
    </div>
  );
}