import { useComputedColorScheme } from "@mantine/core";

export function OrbitMark({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const scheme = useComputedColorScheme("dark", { getInitialValueInEffect: false });

  return (
    <img
      src={chrome.runtime.getURL(
        scheme === "dark" ? "da-ai-dark-mode.png" : "da-ai-light-mode.png",
      )}
      alt=""
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        display: "block",
        flexShrink: 0,
        objectFit: "cover",
      }}
    />
  );
}
