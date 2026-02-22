import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as RadioGroup from "@radix-ui/react-radio-group";
import * as Select from "@radix-ui/react-select";
import { X, ChevronDown, Check } from "lucide-react";
import type { Game } from "@/types";

interface BlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: Game | null;
  onConfirm: (
    blockType: "timed" | "permanent",
    durationMinutes?: number
  ) => void;
}

const durationOptions = [
  { label: "2 小时", value: 120 },
  { label: "1 天", value: 1440 },
  { label: "3 天", value: 4320 },
  { label: "1 周", value: 10080 },
  { label: "1 个月", value: 43200 },
];

export default function BlockDialog({
  open,
  onOpenChange,
  game,
  onConfirm,
}: BlockDialogProps) {
  const [blockType, setBlockType] = useState<"timed" | "permanent">(
    "permanent"
  );
  const [duration, setDuration] = useState(1440);

  if (!game) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] bg-jie-card-bg rounded-xl p-5 z-50 shadow-xl">
          <Dialog.Title className="text-lg font-bold text-center mb-2">
            封锁游戏
          </Dialog.Title>
          <p className="text-base font-semibold text-center mb-5">
            {game.name}
          </p>

          {/* Block Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">封锁类型</label>
            <RadioGroup.Root
              value={blockType}
              onValueChange={(v) => setBlockType(v as "timed" | "permanent")}
              className="flex flex-col gap-2"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroup.Item
                  value="permanent"
                  className="w-4 h-4 rounded-full border border-jie-border data-[state=checked]:border-primary data-[state=checked]:border-4"
                />
                <span className="text-sm">永久封锁</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroup.Item
                  value="timed"
                  className="w-4 h-4 rounded-full border border-jie-border data-[state=checked]:border-primary data-[state=checked]:border-4"
                />
                <span className="text-sm">定时封锁</span>
              </label>
            </RadioGroup.Root>
          </div>

          {/* Duration */}
          {blockType === "timed" && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">封锁时长</label>
              <Select.Root
                value={String(duration)}
                onValueChange={(v) => setDuration(Number(v))}
              >
                <Select.Trigger className="inline-flex items-center justify-between w-full px-3 py-2 border border-jie-border rounded-lg text-sm bg-jie-card-bg">
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDown size={16} />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-jie-card-bg rounded-lg shadow-lg border border-jie-border z-[100] overflow-hidden">
                    <Select.Viewport>
                      {durationOptions.map((opt) => (
                        <Select.Item
                          key={opt.value}
                          value={String(opt.value)}
                          className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 data-[highlighted]:bg-primary/10 outline-none"
                        >
                          <Select.ItemText>{opt.label}</Select.ItemText>
                          <Select.ItemIndicator className="ml-auto">
                            <Check size={14} />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              className="px-4 py-2 text-sm rounded-lg border border-jie-border hover:bg-jie-hover transition-colors"
              onClick={() => onOpenChange(false)}
            >
              取消
            </button>
            <button
              className="px-4 py-2 text-sm rounded-lg bg-danger text-white hover:bg-danger/90 transition-colors"
              onClick={() =>
                onConfirm(
                  blockType,
                  blockType === "timed" ? duration : undefined
                )
              }
            >
              确认封锁
            </button>
          </div>

          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-jie-text-secondary hover:text-jie-text">
              <X size={18} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
