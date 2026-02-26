import type { ReactNode } from "react";
import { DEFAULT_PLAYER_SLIPPER } from "../utils/player";

interface SlipperCardProps {
  title?: string;
  imageSrc?: string;
  imageAlt?: string;
  middleAction?: ReactNode;
  footer?: ReactNode;
}

export default function SlipperCard({
  title = "Твой тапок",
  imageSrc = DEFAULT_PLAYER_SLIPPER,
  imageAlt = "Тапок",
  middleAction,
  footer,
}: SlipperCardProps) {
  return (
    <div className="home-main-block">
      <h1 className="title text-2 home-title">{title}</h1>

      {middleAction ? <div className="home-middle-action">{middleAction}</div> : null}

      <div className="home-card">
        <img src={imageSrc} alt={imageAlt} className="home-card-image" />
        {footer ? <div className="home-card-footer">{footer}</div> : null}
      </div>
    </div>
  );
}