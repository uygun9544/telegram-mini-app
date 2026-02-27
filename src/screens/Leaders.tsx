import { useEffect, useState } from "react";
import { fetchTopLeaders, type LeaderboardRow } from "../online/leaderboard";

interface LeadersProps {
  onHome: () => void;
}

const MOCK_LEADERS: LeaderboardRow[] = [
  { playerId: "m1", name: "gopello1900xxxxxxxx_длинный_ник", balance: 300, wins: 12, losses: 2, matches: 14, winRate: 85.7 },
  { playerId: "m2", name: "player 2", balance: 290, wins: 11, losses: 5, matches: 16, winRate: 68.8 },
  { playerId: "m3", name: "player 3", balance: 280, wins: 10, losses: 6, matches: 16, winRate: 62.5 },
  { playerId: "m4", name: "player 4", balance: 270, wins: 9, losses: 7, matches: 16, winRate: 56.3 },
  { playerId: "m5", name: "player 5", balance: 290, wins: 9, losses: 8, matches: 17, winRate: 52.9 },
  { playerId: "m6", name: "player 6", balance: 290, wins: 8, losses: 8, matches: 16, winRate: 50 },
  { playerId: "m7", name: "player 7", balance: 290, wins: 8, losses: 9, matches: 17, winRate: 47.1 },
  { playerId: "m8", name: "player 8", balance: 290, wins: 7, losses: 9, matches: 16, winRate: 43.8 },
  { playerId: "m9", name: "player 9", balance: 290, wins: 7, losses: 10, matches: 17, winRate: 41.2 },
  { playerId: "m10", name: "player 10", balance: 285, wins: 7, losses: 11, matches: 18, winRate: 38.9 },
  { playerId: "m11", name: "player 11", balance: 282, wins: 6, losses: 10, matches: 16, winRate: 37.5 },
  { playerId: "m12", name: "player 12", balance: 278, wins: 6, losses: 11, matches: 17, winRate: 35.3 },
  { playerId: "m13", name: "player 13", balance: 276, wins: 6, losses: 12, matches: 18, winRate: 33.3 },
  { playerId: "m14", name: "player 14", balance: 274, wins: 5, losses: 11, matches: 16, winRate: 31.3 },
  { playerId: "m15", name: "player 15", balance: 272, wins: 5, losses: 12, matches: 17, winRate: 29.4 },
  { playerId: "m16", name: "player 16", balance: 270, wins: 5, losses: 13, matches: 18, winRate: 27.8 },
  { playerId: "m17", name: "player 17", balance: 268, wins: 4, losses: 12, matches: 16, winRate: 25 },
  { playerId: "m18", name: "player 18", balance: 266, wins: 4, losses: 13, matches: 17, winRate: 23.5 },
  { playerId: "m19", name: "player 19", balance: 264, wins: 4, losses: 14, matches: 18, winRate: 22.2 },
  { playerId: "m20", name: "player 20", balance: 262, wins: 3, losses: 13, matches: 16, winRate: 18.8 }
];

function getInitials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export default function Leaders({ onHome }: LeadersProps) {
  const isMockMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mockLeaders") === "1";
  const [leaders, setLeaders] = useState<LeaderboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(!isMockMode);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadLeaders() {
      try {
        if (isMockMode) {
          setLeaders(MOCK_LEADERS);
          setHasError(false);
          return;
        }

        setIsLoading(true);
        setHasError(false);
        const rows = await fetchTopLeaders(20);
        if (!isMounted) return;
        setLeaders(rows);
      } catch {
        if (!isMounted) return;
        setHasError(true);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadLeaders();

    return () => {
      isMounted = false;
    };
  }, [isMockMode]);

  return (
    <div className="screen leaders-screen">
      <div className="leaders-top-row">
        <button className="mode-toggle" onClick={onHome}>На главную</button>
      </div>

      <h1 className="leaders-title text-h2">🏆 Лидеры</h1>

      <div className="leaders-list" role="list">
        {isLoading ? (
          <div className="leaders-state text-2">Загрузка...</div>
        ) : hasError ? (
          <div className="leaders-state text-2">Не удалось загрузить лидеров</div>
        ) : leaders.length === 0 ? (
          <div className="leaders-state text-2">Пока нет игроков</div>
        ) : (
          leaders.map((leader, index) => (
            <div className="leaders-row" role="listitem" key={leader.playerId}>
              <span className="leaders-rank text-2">{index + 1}</span>

              <div className="leaders-player">
                {leader.avatarUrl ? (
                  <img src={leader.avatarUrl} alt="" className="leaders-avatar" aria-hidden="true" />
                ) : (
                  <div className="leaders-avatar leaders-avatar-fallback text-2" aria-hidden="true">
                    {getInitials(leader.name)}
                  </div>
                )}
                <span className="leaders-name text-1" title={leader.name}>{leader.name}</span>
              </div>

              <span className="leaders-balance text-1">{leader.balance} ⭐</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
