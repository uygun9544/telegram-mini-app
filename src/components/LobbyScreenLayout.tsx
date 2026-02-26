import type { ReactNode } from "react";
import SlipperCard from "./SlipperCard";
import TopBalanceBar from "./TopBalanceBar";

interface LobbyScreenLayoutProps {
  screenClassName: string;
  balance: number;
  onlineWsUrl: string;
  slipperSrc: string;
  onTraining: () => void;
  onChangeSlipper: () => void;
  isChangeSlipperDisabled?: boolean;
  bottomContent: ReactNode;
}

export default function LobbyScreenLayout({
  screenClassName,
  balance,
  onlineWsUrl,
  slipperSrc,
  onTraining,
  onChangeSlipper,
  isChangeSlipperDisabled = false,
  bottomContent
}: LobbyScreenLayoutProps) {
  return (
    <div className={`screen ${screenClassName}`}>
      <TopBalanceBar onTraining={onTraining} balance={balance} />
      <div className="debug-ws">WS: {onlineWsUrl}</div>

      <SlipperCard
        imageSrc={slipperSrc}
        middleAction={<button className="mode-toggle" onClick={onChangeSlipper} disabled={isChangeSlipperDisabled}>Поменять</button>}
      />

      {bottomContent}
    </div>
  );
}
