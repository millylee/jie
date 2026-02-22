import { useState, useEffect, useRef } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export function useDragDrop(onFilesDropped: (paths: string[]) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const callbackRef = useRef(onFilesDropped);

  useEffect(() => {
    callbackRef.current = onFilesDropped;
  }, [onFilesDropped]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const appWindow = getCurrentWebviewWindow();
      const fn = await appWindow.onDragDropEvent((event) => {
        if (event.payload.type === "over") {
          setIsDragging(true);
        } else if (event.payload.type === "drop") {
          setIsDragging(false);
          const paths = event.payload.paths;
          if (paths && paths.length > 0) {
            const validPaths = paths.filter((p: string) => {
              const lower = p.toLowerCase();
              return lower.endsWith(".exe") || lower.endsWith(".lnk");
            });
            if (validPaths.length > 0) {
              callbackRef.current(validPaths);
            }
          }
        } else {
          setIsDragging(false);
        }
      });

      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return { isDragging };
}
