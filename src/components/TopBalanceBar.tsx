interface TopBalanceBarProps {
  onTraining: () => void;
  balance: number;
}

export default function TopBalanceBar({ onTraining, balance }: TopBalanceBarProps) {
  return (
    <div className="balance balance-row">
      <span>Баланс: {balance} ⭐</span>
      <button className="mode-toggle" onClick={onTraining}>Тренировка</button>
    </div>
  );
}
