interface TopBalanceBarProps {
  onTraining: () => void;
}

export default function TopBalanceBar({ onTraining }: TopBalanceBarProps) {
  return (
    <div className="balance balance-row">
      <span>Баланс: 300 ⭐</span>
      <button className="mode-toggle" onClick={onTraining}>Тренировка</button>
    </div>
  );
}
