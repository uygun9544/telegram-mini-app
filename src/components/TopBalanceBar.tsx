interface TopBalanceBarProps {
  onTraining: () => void;
  balance: number | null;
}

export default function TopBalanceBar({ onTraining, balance }: TopBalanceBarProps) {
  const isBalanceLoading = balance === null;

  return (
    <div className="balance balance-row">
      <span>
        Баланс:{" "}
        {isBalanceLoading ? <span className="balance-skeleton" /> : `${balance} ⭐`}
      </span>
      <button className="mode-toggle" onClick={onTraining}>Тренировка</button>
    </div>
  );
}
