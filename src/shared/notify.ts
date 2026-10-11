import { notifications } from "@mantine/notifications";
import toastClasses from "./toast.module.css";

const DEDUPE_MS = 4000;
const recent = new Map<string, number>();

type ToastTone = "neutral" | "error";

function show(message: string, tone: ToastTone, autoClose: number) {
  const key = `${tone}|${message}`;
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < DEDUPE_MS) return;
  recent.set(key, now);

  notifications.show({
    message,
    autoClose,
    withCloseButton: false,
    classNames: {
      root: tone === "error" ? `${toastClasses.toast} ${toastClasses.error}` : toastClasses.toast,
      body: toastClasses.body,
      description: toastClasses.message,
    },
  });
}

export const notify = {
  success: (message: string) => show(message, "neutral", 3000),
  info: (message: string) => show(message, "neutral", 3000),
  error: (message: string) => show(message, "error", 5000),
};
