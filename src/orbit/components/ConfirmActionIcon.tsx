import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { Check } from "lucide-react";

const CONFIRM_MS = 1600;

export function ConfirmActionIcon({
  label,
  icon,
  onAction,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onAction: () => Promise<string | null> | string | null | void;
  disabled?: boolean;
}) {
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const run = async () => {
    const result = await onAction();
    if (!result) return;
    setConfirmation(result);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setConfirmation(null), CONFIRM_MS);
  };

  return (
    <Tooltip label={confirmation ?? label} withArrow opened={confirmation ? true : undefined}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        radius="xl"
        onClick={() => void run()}
        disabled={disabled}
        aria-label={label}
      >
        {confirmation ? <Check size={13} /> : icon}
      </ActionIcon>
    </Tooltip>
  );
}
