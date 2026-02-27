import { useEffect, useRef, useState, type ReactNode } from "react";
import TopBalanceBar from "./TopBalanceBar";
import chevronLeftIcon from "../assets/chevron_left_20.svg";
import chevronRightIcon from "../assets/chevron_right_20.svg";

interface LobbyScreenLayoutProps {
  screenClassName: string;
  balance: number | null;
  onlinePlayersCount?: number | null;
  slipperSrc: string;
  onTraining: () => void;
  onLeaders?: () => void;
  onPrevSlipper: () => void;
  onNextSlipper: () => void;
  isChangeSlipperDisabled?: boolean;
  bottomContent: ReactNode;
}

export default function LobbyScreenLayout({
  screenClassName,
  balance,
  onlinePlayersCount,
  slipperSrc,
  onTraining,
  onLeaders,
  onPrevSlipper,
  onNextSlipper,
  isChangeSlipperDisabled = false,
  bottomContent
}: LobbyScreenLayoutProps) {
  const ANIMATION_DURATION_MS = 280;
  const SWIPE_THRESHOLD_PX = 40;
  const [displayedSrc, setDisplayedSrc] = useState(slipperSrc);
  const [incomingSrc, setIncomingSrc] = useState<string | null>(null);
  const [direction, setDirection] = useState<"prev" | "next">("next");
  const [isAnimating, setIsAnimating] = useState(false);
  const pendingDirectionRef = useRef<"prev" | "next">("next");
  const swipeStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (slipperSrc === displayedSrc) return;

    const nextDirection = pendingDirectionRef.current;
    setDirection(nextDirection);
    setIncomingSrc(slipperSrc);
    setIsAnimating(true);
    pendingDirectionRef.current = "next";

    const timer = window.setTimeout(() => {
      setDisplayedSrc(slipperSrc);
      setIncomingSrc(null);
      setIsAnimating(false);
    }, ANIMATION_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [ANIMATION_DURATION_MS, displayedSrc, slipperSrc]);

  function triggerChange(nextDirection: "prev" | "next") {
    if (isChangeSlipperDisabled || isAnimating) return;
    pendingDirectionRef.current = nextDirection;

    if (nextDirection === "prev") {
      onPrevSlipper();
      return;
    }

    onNextSlipper();
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    swipeStartXRef.current = event.clientX;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const startX = swipeStartXRef.current;
    swipeStartXRef.current = null;
    if (startX === null) return;

    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;

    if (deltaX < 0) {
      triggerChange("prev");
      return;
    }

    triggerChange("next");
  }

  function handlePointerCancel() {
    swipeStartXRef.current = null;
  }

  return (
    <div className={`screen ${screenClassName}`}>
      <TopBalanceBar onTraining={onTraining} balance={balance} onLeaders={onLeaders} />
      {typeof onlinePlayersCount === "number" ? (
        <p className="lobby-online-count text-3">Игроков онлайн: {onlinePlayersCount}</p>
      ) : null}

      <div className="lobby-content">
        <div className="lobby-main-area lobby-main-area-centered">
          <div className="lobby-main-block">
            <h1 className="title text-2 home-title">Твой тапок</h1>

            <div
              className="lobby-card-viewport"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              <div
                className={`lobby-card-layer ${
                  isAnimating
                    ? direction === "next"
                      ? "lobby-card-exit-next"
                      : "lobby-card-exit-prev"
                    : ""
                }`}
              >
                <div className="home-card">
                  <img src={displayedSrc} alt="Тапок" className="home-card-image" />
                </div>
              </div>

              {incomingSrc ? (
                <div
                  className={`lobby-card-layer ${
                    direction === "next" ? "lobby-card-enter-next" : "lobby-card-enter-prev"
                  }`}
                >
                  <div className="home-card">
                    <img src={incomingSrc} alt="Тапок" className="home-card-image" />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="slipper-nav-row">
              <button
                className="slipper-nav-btn"
                onClick={() => triggerChange("prev")}
                disabled={isChangeSlipperDisabled}
                aria-label="Предыдущий тапок"
              >
                <img src={chevronLeftIcon} alt="" className="slipper-nav-icon" aria-hidden="true" />
              </button>

              <button
                className="slipper-nav-btn"
                onClick={() => triggerChange("next")}
                disabled={isChangeSlipperDisabled}
                aria-label="Следующий тапок"
              >
                <img src={chevronRightIcon} alt="" className="slipper-nav-icon" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="lobby-bottom-content">{bottomContent}</div>
      </div>
    </div>
  );
}
