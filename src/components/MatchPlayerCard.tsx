interface MatchPlayerCardProps {
  slipperSrc: string;
  name: string;
  avatarSrc?: string | null;
}

export default function MatchPlayerCard({
  slipperSrc,
  name,
  avatarSrc,
}: MatchPlayerCardProps) {
  const safeAvatarSrc = avatarSrc ?? undefined;
  const hasAvatar = Boolean(safeAvatarSrc);

  return (
    <div className="player-card">
      <img src={slipperSrc} className="player-card-slipper" />
      <div className={`player-name-row ${hasAvatar ? "" : "no-avatar"}`}>
        {hasAvatar ? <img src={safeAvatarSrc} className="player-mini-avatar" /> : null}
        <span className={`player-name-text ${hasAvatar ? "with-avatar" : ""}`}>
          {name}
        </span>
      </div>
    </div>
  );
}