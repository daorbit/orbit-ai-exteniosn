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
        scheme === "dark" ? "orbit-ai-dark.webp" : "orbit-ai-light.webp",
      )}
      alt=""
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        display: "block",
        flexShrink: 0,
        objectFit: "contain",
      }}
    />
  );
}
