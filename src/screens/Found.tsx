type FoundProps = {
  onAccept: () => void;
  onClose: () => void;
  playerName: string;
  playerProfileAvatar?: string;
  playerSlipper: string;
  opponentName: string;
  opponentAvatar?: string;
  opponentSlipper: string;
  playerAccepted: boolean;
  opponentAccepted: boolean;
};

function PlayerCard({
  name,
  avatar,
  slipper,
  accepted,
}: {
  name: string;
  avatar?: string;
  slipper: string;
  accepted: boolean;
}) {
  return (
    <div className="found-player-card">
      <p>{name}</p>
      {avatar ? <img src={avatar} alt={name} /> : null}
      <img src={slipper} alt={`${name} slipper`} />
      <p>{accepted ? "Accepted" : "Waiting..."}</p>
    </div>
  );
}

export default function Found({
  onAccept,
  onClose,
  playerName,
  playerProfileAvatar,
  playerSlipper,
  opponentName,
  opponentAvatar,
  opponentSlipper,
  playerAccepted,
  opponentAccepted,
}: FoundProps) {
  return (
    <div className="found-modal">
      <h2>Match found</h2>

      <PlayerCard
        name={playerName}
        avatar={playerProfileAvatar}
        slipper={playerSlipper}
        accepted={playerAccepted}
      />

      <PlayerCard
        name={opponentName}
        avatar={opponentAvatar}
        slipper={opponentSlipper}
        accepted={opponentAccepted}
      />

      <button onClick={onAccept} disabled={playerAccepted}>
        {playerAccepted ? "Accepted" : "Accept"}
      </button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
