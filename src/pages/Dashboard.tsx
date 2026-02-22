import { useState } from "react";
import { toast } from "sonner";
import { Lock, Monitor, Gamepad2, Upload } from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useGameStore } from "@/stores/useGameStore";
import { useDragDrop } from "@/hooks/useDragDrop";
import GameCard from "@/components/GameCard";
import BlockDialog from "@/components/BlockDialog";
import ConfirmChain from "@/components/confirm/ConfirmChain";
import type { Game } from "@/types";

export default function Dashboard() {
  const { games, addGame, removeGame, blockGame, restoreGame } = useGameStore();
  const [loading, setLoading] = useState(false);

  // Block dialog
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // Restore confirm chain
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreTargetGame, setRestoreTargetGame] = useState<Game | null>(null);

  // Remove confirm
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removeTargetGame, setRemoveTargetGame] = useState<Game | null>(null);

  const activeGames = games.filter((g) => g.status === "active");
  const blockedGames = games.filter((g) => g.status === "blocked");

  async function handleFilesDropped(paths: string[]) {
    setLoading(true);
    for (const path of paths) {
      try {
        const game = await addGame(path);
        toast.success(`已添加: ${game.name}`);
      } catch (e) {
        toast.error(`${e}`);
      }
    }
    setLoading(false);
  }

  const { isDragging } = useDragDrop(handleFilesDropped);

  function showBlockDialog(game: Game) {
    setSelectedGame(game);
    setBlockDialogOpen(true);
  }

  async function handleBlock(
    blockType: "timed" | "permanent",
    durationMinutes?: number
  ) {
    if (!selectedGame) return;
    try {
      await blockGame({
        game_id: selectedGame.id,
        block_type: blockType,
        duration_minutes: durationMinutes,
      });
      toast.success("已封锁");
      setBlockDialogOpen(false);
    } catch (e) {
      toast.error(`封锁失败: ${e}`);
    }
  }

  function showRestoreDialog(game: Game) {
    setRestoreTargetGame(game);
    setRestoreDialogOpen(true);
  }

  async function handleRestoreConfirmed() {
    if (!restoreTargetGame) return;
    try {
      await restoreGame(restoreTargetGame.id);
      toast.success("已恢复");
    } catch (e) {
      toast.error(`恢复失败: ${e}`);
    }
  }

  function handleRemove(game: Game) {
    setRemoveTargetGame(game);
    setRemoveDialogOpen(true);
  }

  async function confirmRemove() {
    if (!removeTargetGame) return;
    await removeGame(removeTargetGame.id);
    toast.success("已移除");
    setRemoveDialogOpen(false);
  }

  return (
    <div className="w-full relative min-h-full">
      {/* Drag overlay - covers entire area */}
      {isDragging && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-jie-bg/80 border-2 border-dashed border-primary rounded-lg backdrop-blur-sm">
          <Upload size={40} className="text-primary" />
          <p className="mt-3 text-sm font-medium text-primary">
            松开以添加游戏
          </p>
          <p className="mt-1 text-xs text-jie-text-secondary">
            支持 .lnk 和 .exe 文件
          </p>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-jie-overlay z-40 flex items-center justify-center rounded-lg">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Blocked Games */}
      {blockedGames.length > 0 && (
        <section className="mb-6">
          <h3 className="flex items-center gap-1.5 text-base font-semibold mb-3 text-jie-text">
            <Lock size={18} />
            已封锁 ({blockedGames.length})
          </h3>
          {blockedGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onRestore={showRestoreDialog}
              onRemove={handleRemove}
            />
          ))}
        </section>
      )}

      {/* Active Games */}
      {activeGames.length > 0 && (
        <section className="mb-6">
          <h3 className="flex items-center gap-1.5 text-base font-semibold mb-3 text-jie-text">
            <Monitor size={18} />
            游戏列表 ({activeGames.length})
          </h3>
          {activeGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onBlock={showBlockDialog}
              onRemove={handleRemove}
            />
          ))}
        </section>
      )}

      {/* Empty State */}
      {games.length === 0 && !loading && (
        <div className="py-16 text-center">
          <Gamepad2 size={64} className="mx-auto text-jie-border" />
          <p className="mt-4 text-sm text-jie-text-secondary">
            还没有添加任何游戏
          </p>
          <p className="mt-2 text-xs text-jie-hint">
            拖入游戏快捷方式或 .exe 文件到窗口即可添加
          </p>
        </div>
      )}

      {/* Block Dialog */}
      <BlockDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        game={selectedGame}
        onConfirm={handleBlock}
      />

      {/* Restore Confirm Chain */}
      {restoreTargetGame && (
        <ConfirmChain
          open={restoreDialogOpen}
          onOpenChange={setRestoreDialogOpen}
          game={restoreTargetGame}
          onConfirmed={handleRestoreConfirmed}
        />
      )}

      {/* Remove Confirm Dialog */}
      <AlertDialog.Root
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] bg-jie-card-bg rounded-xl p-5 z-50 shadow-xl">
            <AlertDialog.Title className="text-lg font-bold">
              提示
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-sm text-jie-text-secondary">
              确定要从列表中移除 "{removeTargetGame?.name}" 吗？
            </AlertDialog.Description>
            <div className="flex justify-end gap-3 mt-6">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 text-sm rounded-lg border border-jie-border hover:bg-jie-hover">
                  取消
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  className="px-4 py-2 text-sm rounded-lg bg-warning text-white hover:bg-warning/90"
                  onClick={confirmRemove}
                >
                  确定
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
