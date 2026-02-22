import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Clock,
  PenLine,
  PenTool,
  CheckCircle,
} from "lucide-react";
import type { Game } from "@/types";
import { useGameStore } from "@/stores/useGameStore";

interface ConfirmChainProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: Game;
  onConfirmed: () => void;
}

export default function ConfirmChain({
  open,
  onOpenChange,
  game,
  onConfirmed,
}: ConfirmChainProps) {
  const getMathChallenge = useGameStore((s) => s.getMathChallenge);

  const [step, setStep] = useState(1);
  const [cooldownSeconds, setCooldownSeconds] = useState(10);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [mathQuestion, setMathQuestion] = useState("");
  const [mathAnswer, setMathAnswer] = useState(0);
  const [mathInput, setMathInput] = useState("");
  const [mathError, setMathError] = useState(false);

  const typingTarget =
    "我承认我的自制力不足，我选择浪费时间玩游戏而不是做更有意义的事情。";
  const [typingInput, setTypingInput] = useState("");

  const blockedDays = (() => {
    if (!game.blocked_at) return 0;
    const diff = Date.now() - new Date(game.blocked_at).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  })();

  const typingMatch = typingInput === typingTarget;

  useEffect(() => {
    if (open) {
      setStep(1);
      setMathInput("");
      setMathError(false);
      setTypingInput("");
      setCooldownSeconds(10);
    } else {
      clearTimer();
    }
  }, [open]);

  useEffect(() => {
    return () => clearTimer();
  }, []);

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function close() {
    clearTimer();
    onOpenChange(false);
  }

  function goStep2() {
    setStep(2);
    setCooldownSeconds(10);
    timerRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function goStep3() {
    try {
      const challenge = await getMathChallenge();
      setMathQuestion(challenge.question);
      setMathAnswer(challenge.answer);
    } catch {
      setMathQuestion("12 × 15 + 37 = ?");
      setMathAnswer(217);
    }
    setMathInput("");
    setMathError(false);
    setStep(3);
  }

  function checkMath() {
    if (parseInt(mathInput) === mathAnswer) {
      setStep(4);
      setTypingInput("");
    } else {
      setMathError(true);
    }
  }

  function goStep5() {
    if (typingMatch) {
      setStep(5);
    }
  }

  function finalConfirm() {
    onConfirmed();
    close();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] bg-jie-card-bg rounded-xl p-5 z-50 shadow-xl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <Dialog.Title className="sr-only">恢复确认</Dialog.Title>

          {/* Step 1: Warning */}
          {step === 1 && (
            <div className="flex flex-col items-center py-4 text-center">
              <AlertTriangle size={48} className="text-danger" />
              <h2 className="mt-3 text-lg font-bold">确定要恢复吗？</h2>
              <p className="mt-2 text-sm text-jie-text-secondary leading-relaxed">
                {blockedDays > 0 ? (
                  <>
                    你已经坚持了 <strong>{blockedDays}</strong> 天没有玩{" "}
                    <strong>{game.name}</strong>，确定要放弃吗？
                  </>
                ) : (
                  <>
                    你刚刚封锁了 <strong>{game.name}</strong>
                    ，这么快就要恢复了吗？
                  </>
                )}
              </p>
              <p className="mt-2 text-sm text-success font-medium">
                坚持就是胜利，把时间花在更有意义的事情上吧！
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  className="px-4 py-2 rounded-lg bg-success text-white hover:bg-success/90"
                  onClick={close}
                >
                  我再想想（推荐）
                </button>
                <button
                  className="px-4 py-2 rounded-lg border border-danger text-danger hover:bg-danger/10"
                  onClick={goStep2}
                >
                  我要恢复
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Cooldown */}
          {step === 2 && (
            <div className="flex flex-col items-center py-4 text-center">
              <Clock size={48} className="text-warning" />
              <h2 className="mt-3 text-lg font-bold">请冷静一下</h2>
              <p className="mt-2 text-sm text-jie-text-secondary">
                在做决定之前，请先冷静思考 10 秒...
              </p>
              {cooldownSeconds > 0 && (
                <div className="mt-5">
                  <span className="text-5xl font-bold text-warning">
                    {cooldownSeconds}
                  </span>
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  className="px-4 py-2 rounded-lg bg-success text-white hover:bg-success/90"
                  onClick={close}
                >
                  算了，不玩了
                </button>
                <button
                  className="px-4 py-2 rounded-lg border border-danger text-danger hover:bg-danger/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={cooldownSeconds > 0}
                  onClick={goStep3}
                >
                  {cooldownSeconds > 0
                    ? `等待 ${cooldownSeconds} 秒`
                    : "继续恢复"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Math Challenge */}
          {step === 3 && (
            <div className="flex flex-col items-center py-4 text-center">
              <PenLine size={48} className="text-primary" />
              <h2 className="mt-3 text-lg font-bold">数学挑战</h2>
              <p className="mt-2 text-sm text-jie-text-secondary">
                请手动计算以下题目（不许用计算器）：
              </p>
              <div className="my-3 text-xl font-bold text-primary px-4 py-2 bg-primary/5 rounded-lg">
                {mathQuestion}
              </div>
              <input
                type="text"
                value={mathInput}
                onChange={(e) => {
                  setMathInput(e.target.value);
                  setMathError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && checkMath()}
                placeholder="输入你的答案"
                className={`w-full px-3 py-2 text-center border rounded-lg text-base outline-none transition-colors ${
                  mathError
                    ? "border-danger"
                    : "border-jie-border focus:border-primary"
                }`}
              />
              {mathError && (
                <p className="mt-2 text-sm text-danger">答案错误，请重试！</p>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  className="px-4 py-2 rounded-lg bg-success text-white hover:bg-success/90"
                  onClick={close}
                >
                  算了，不玩了
                </button>
                <button
                  className="px-4 py-2 rounded-lg border border-danger text-danger hover:bg-danger/10 disabled:opacity-50"
                  disabled={!mathInput}
                  onClick={checkMath}
                >
                  提交答案
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Typing Challenge */}
          {step === 4 && (
            <div className="flex flex-col items-center py-4 text-center">
              <PenTool size={48} className="text-jie-text-secondary" />
              <h2 className="mt-3 text-lg font-bold">打字挑战</h2>
              <p className="mt-2 text-sm text-jie-text-secondary">
                请完整输入以下内容：
              </p>
              <div className="my-3 text-xs text-danger px-3 py-2 bg-danger/5 rounded-lg leading-relaxed select-none">
                "{typingTarget}"
              </div>
              <textarea
                value={typingInput}
                onChange={(e) => setTypingInput(e.target.value)}
                rows={3}
                placeholder="请在此输入上面的内容..."
                className="w-full px-4 py-2 border border-jie-border rounded-lg text-sm outline-none focus:border-primary resize-none"
              />
              <div className="mt-6 flex gap-3">
                <button
                  className="px-4 py-2 rounded-lg bg-success text-white hover:bg-success/90"
                  onClick={close}
                >
                  算了，不玩了
                </button>
                <button
                  className="px-4 py-2 rounded-lg border border-danger text-danger hover:bg-danger/10 disabled:opacity-50"
                  disabled={!typingMatch}
                  onClick={goStep5}
                >
                  提交
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Final Confirm */}
          {step === 5 && (
            <div className="flex flex-col items-center py-4 text-center">
              <CheckCircle size={48} className="text-danger" />
              <h2 className="mt-3 text-lg font-bold">最终确认</h2>
              {blockedDays > 0 ? (
                <div className="mt-3 text-sm leading-loose">
                  <p>
                    你即将恢复 <strong>{game.name}</strong>
                  </p>
                  <p>
                    你已经坚持了 <strong>{blockedDays}</strong> 天
                  </p>
                  <p className="text-danger font-semibold">
                    恢复后，你的坚持记录将被清空。
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-jie-text-secondary">
                  你即将恢复 <strong>{game.name}</strong>
                </p>
              )}
              <div className="mt-5 flex flex-col gap-2 w-full">
                <button
                  className="w-full py-2.5 rounded-lg bg-success text-white text-sm hover:bg-success/90"
                  onClick={close}
                >
                  我选择坚持！
                </button>
                <button
                  className="w-full py-2.5 rounded-lg bg-danger text-white text-sm hover:bg-danger/90"
                  onClick={finalConfirm}
                >
                  我已深思熟虑，确认恢复
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
