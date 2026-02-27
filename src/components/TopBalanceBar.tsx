interface TopBalanceBarProps {
  onTraining: () => void;
  balance: number | null;
  onLeaders?: () => void;
}

export default function TopBalanceBar({ onTraining, balance, onLeaders }: TopBalanceBarProps) {
  const isBalanceLoading = balance === null;

  return (
    <div className="balance balance-row">
      <span>
        {isBalanceLoading ? <span className="balance-skeleton" /> : `${balance} ⭐`}
      </span>

      <div className="balance-actions">
        <button className="mode-toggle" onClick={onTraining}>Тренировка</button>
        {onLeaders ? (
          <button className="mode-toggle" onClick={onLeaders}>🏆 Лидеры</button>
        ) : null}
      </div>
    </div>
  );
}
