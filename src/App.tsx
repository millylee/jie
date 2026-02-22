import { useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Settings, Sun, Moon } from "lucide-react";
import { useGameStore } from "@/stores/useGameStore";
import { useThemeStore } from "@/stores/useThemeStore";
import Dashboard from "@/pages/Dashboard";
import SettingsPage from "@/pages/Settings";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const games = useGameStore((s) => s.games);
  const loadGames = useGameStore((s) => s.loadGames);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const blockedCount = games.filter((g) => g.status === "blocked").length;
  const totalGames = games.length;
  const isSettings = location.pathname === "/settings";

  function toggleSettings() {
    navigate(isSettings ? "/" : "/settings");
  }

  return (
    <div className="flex flex-col h-screen">
      <header
        className="flex items-center justify-between px-5 py-3 bg-jie-card-bg border-b border-jie-border shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center">
          <span className="text-xl font-bold tracking-wider">戒</span>
          {totalGames > 0 && (
            <span className="ml-4 text-sm text-jie-text-secondary">
              已管理 {totalGames} 款游戏，封锁中 {blockedCount} 款
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-full transition-colors hover:bg-jie-hover text-jie-text-secondary"
            title={theme === "dark" ? "切换到亮色模式" : "切换到暗色模式"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={toggleSettings}
            className={`p-1.5 rounded-full transition-colors ${
              isSettings
                ? "bg-primary text-white"
                : "hover:bg-jie-hover text-jie-text-secondary"
            }`}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5 app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
