import { Monitor } from "lucide-react";
import type { Game } from "@/types";

interface GameCardProps {
  game: Game;
  onBlock?: (game: Game) => void;
  onRestore?: (game: Game) => void;
  onRemove?: (game: Game) => void;
}

export default function GameCard({
  game,
  onBlock,
  onRestore,
  onRemove,
}: GameCardProps) {
  const isBlocked = game.status === "blocked";

  const blockedDays = (() => {
    if (!game.blocked_at) return 0;
    const diff = Date.now() - new Date(game.blocked_at).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  })();

  const blockLabel = (() => {
    if (!isBlocked) return "";
    if (game.block_type === "permanent") return "永久封锁";
    if (game.block_until) {
      const until = new Date(game.block_until);
      const now = new Date();
      if (until <= now) return "即将解封";
      const hours = Math.ceil(
        (until.getTime() - now.getTime()) / (1000 * 60 * 60)
      );
      if (hours < 24) return `剩余 ${hours} 小时`;
      return `剩余 ${Math.ceil(hours / 24)} 天`;
    }
    return "封锁中";
  })();

  return (
    <div
      className={`mb-3 rounded-[10px] bg-jie-card-bg p-4 shadow-sm hover:shadow-md transition-all ${
        isBlocked ? "border-l-[3px] border-l-danger" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="w-12 h-12 flex items-center justify-center shrink-0">
          {game.icon_base64 ? (
            <img
              src={`data:image/png;base64,${game.icon_base64}`}
              alt="icon"
              className="w-10 h-10 object-contain"
            />
          ) : (
            <Monitor size={40} className="text-jie-text-secondary" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate">{game.name}</div>
          <div className="mt-1 flex items-center gap-1.5">
            {isBlocked ? (
              <>
                <span className="inline-block px-2 py-0.5 text-xs rounded bg-danger/10 text-danger">
                  {blockLabel}
                </span>
                {blockedDays > 0 && (
                  <span className="text-xs text-jie-text-secondary">
                    已封锁 {blockedDays} 天
                  </span>
                )}
              </>
            ) : (
              <span className="inline-block px-2 py-0.5 text-xs rounded bg-success/10 text-success">
                正常
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex gap-1">
          {!isBlocked ? (
            <>
              <button
                className="px-3 py-1.5 text-sm rounded bg-danger text-white hover:bg-danger/90 transition-colors"
                onClick={() => onBlock?.(game)}
              >
                封锁
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded text-jie-text-secondary hover:bg-jie-hover transition-colors"
                onClick={() => onRemove?.(game)}
              >
                移除
              </button>
            </>
          ) : (
            <button
              className="px-3 py-1.5 text-sm rounded bg-warning text-white hover:bg-warning/90 transition-colors"
              onClick={() => onRestore?.(game)}
            >
              恢复
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
