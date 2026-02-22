import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import * as Switch from "@radix-ui/react-switch";
import type { AppSettings } from "@/types";

export default function Settings() {
  const [autoStart, setAutoStart] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const settings = await invoke<AppSettings>("get_settings");
        setAutoStart(settings.auto_start);
        setMinimizeToTray(settings.minimize_to_tray);
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    })();
  }, []);

  async function saveSettings(
    newAutoStart: boolean,
    newMinimizeToTray: boolean
  ) {
    setLoading(true);
    try {
      await invoke("save_settings", {
        settings: {
          auto_start: newAutoStart,
          minimize_to_tray: newMinimizeToTray,
          vault_path: "",
        },
      });
      toast.success("设置已保存");
    } catch (e) {
      toast.error(`保存失败: ${e}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoStartChange(checked: boolean) {
    setAutoStart(checked);
    try {
      if (checked) {
        await invoke("enable_autostart");
      } else {
        await invoke("disable_autostart");
      }
    } catch (e) {
      toast.error(`设置开机自启失败: ${e}`);
      setAutoStart(!checked);
      return;
    }
    saveSettings(checked, minimizeToTray);
  }

  function handleMinimizeToTrayChange(checked: boolean) {
    setMinimizeToTray(checked);
    saveSettings(autoStart, checked);
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-5">设置</h2>

      <div className="bg-jie-card-bg rounded-[10px] p-5 mb-4 shadow-sm">
        {/* Auto Start */}
        <div className="flex items-center justify-between py-3">
          <label className="text-sm font-medium">开机自启</label>
          <Switch.Root
            checked={autoStart}
            onCheckedChange={handleAutoStartChange}
            disabled={loading}
            className="w-10 h-6 bg-jie-switch rounded-full data-[state=checked]:bg-primary transition-colors relative"
          >
            <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[18px]" />
          </Switch.Root>
        </div>

        {/* Minimize to Tray */}
        <div className="flex items-center justify-between py-3 border-t border-jie-border">
          <div>
            <label className="text-sm font-medium">关闭时最小化</label>
            <p className="text-xs text-jie-text-secondary mt-1">
              关闭窗口时最小化到系统托盘
            </p>
          </div>
          <Switch.Root
            checked={minimizeToTray}
            onCheckedChange={handleMinimizeToTrayChange}
            disabled={loading}
            className="w-10 h-6 bg-jie-switch rounded-full data-[state=checked]:bg-primary transition-colors relative"
          >
            <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[18px]" />
          </Switch.Root>
        </div>
      </div>

      {/* About */}
      <div className="bg-jie-card-bg rounded-[10px] p-5 shadow-sm">
        <h3 className="text-base font-semibold mb-2">关于</h3>
        <p className="text-sm text-jie-text-secondary leading-relaxed">
          「戒」 - 帮助你远离游戏，把时间花在更有意义的事情上。
        </p>
        <p className="mt-2 text-xs text-jie-hint">版本 0.1.0</p>
      </div>
    </div>
  );
}
