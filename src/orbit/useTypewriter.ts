import { useEffect, useRef, useState } from "react";

const CHARS_PER_SECOND = 220;
const RENDER_INTERVAL_MS = 40;

export function useTypewriter(
  text: string,
  enabled: boolean,
  onDone?: () => void,
): string {
  const [shown, setShown] = useState(enabled ? "" : text);
  const animating = useRef<string | null>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!enabled) {
      setShown(text);
      animating.current = null;
      return;
    }

    if (animating.current === text) return;
    animating.current = text;

    if (!text) {
      setShown(text);
      done.current?.();
      return;
    }

    let start: number | null = null;
    let lastRender = 0;
    let frame = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      if (start === null) start = now;

      const elapsed = (now - start) / 1000;
      const count = Math.min(text.length, Math.ceil(elapsed * CHARS_PER_SECOND));
      const finished = count >= text.length;

      if (finished || now - lastRender >= RENDER_INTERVAL_MS) {
        lastRender = now;
        setShown(text.slice(0, count));
      }

      if (finished) {
        done.current?.();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [text, enabled]);

  return shown;
}
