import type { ReactNode } from "react";

interface SlipperCardProps {
  title?: string;
  imageSrc?: string;
  imageAlt?: string;
  footer?: ReactNode;
}

export default function SlipperCard({
  title = "Твой тапок",
  imageSrc = "/green.png",
  imageAlt = "Тапок",
  footer,
}: SlipperCardProps) {
  return (
    <div className="home-main-block">
      <h1 className="title text-2 home-title">{title}</h1>

      <div className="home-card">
        <img src={imageSrc} alt={imageAlt} className="home-card-image" />
        {footer ? <div className="home-card-footer">{footer}</div> : null}
      </div>
    </div>
  );
}