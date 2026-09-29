import { createTheme, rem, ThemeIcon } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 5 },
  fontFamily: "'Inter Variable', Inter, system-ui, -apple-system, sans-serif",
  fontFamilyMonospace: "ui-monospace, 'SF Mono', Menlo, monospace",
  headings: {
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
    fontWeight: "700",
    sizes: {
      h1: { fontSize: rem(30), lineHeight: "1.2" },
      h2: { fontSize: rem(23), lineHeight: "1.25" },
      h3: { fontSize: rem(18), lineHeight: "1.3" },
    },
  },
  defaultRadius: "md",
  cursorType: "pointer",
  colors: {
    brand: [
      "#f0fdfa", "#ccfbf1", "#99f6e4", "#5eead4", "#2dd4bf",
      "#14b8a6", "#0d9488", "#0f766e", "#115e59", "#134e4a",
    ],
    dark: [
      "#f5f5f5", "#d4d4d4", "#a3a3a3", "#737373", "#3a3a3a",
      "#292929", "#1c1c1c", "#161616", "#111111", "#000000",
    ],
  },
  shadows: {
    md: "0 8px 24px -8px rgba(0,0,0,0.45)",
    lg: "0 16px 40px -12px rgba(0,0,0,0.55)",
  },
  components: {
    Loader: { defaultProps: { type: "oval" } },
    Skeleton: { defaultProps: { className: "skeleton-shimmer" } },
    Badge: {
      vars: () => ({
        root: {
          "--badge-bg": "transparent",
          "--badge-bd": "none",
          "--badge-radius": "0",
        },
      }),
      styles: {
        root: {
          paddingInline: 0,
          textTransform: "none",
          fontWeight: 650,
          height: "auto",
          lineHeight: 1.35,
          letterSpacing: "0.01em",
          fontVariantNumeric: "tabular-nums",
        },
      },
    },
    Switch: {
      vars: () => ({
        root: {
          "--switch-bg": "var(--surface-2)",
          "--switch-bd": "1px solid var(--border)",
          "--switch-thumb-bg": "var(--text)",
        },
      }),
    },
    Checkbox: {
      vars: () => ({
        root: {
          "--checkbox-bd": "1px solid var(--border)",
          "--checkbox-icon-color": "var(--accent-contrast)",
        },
      }),
    },
    Radio: {
      vars: () => ({
        root: {
          "--radio-bd": "1px solid var(--border)",
          "--radio-icon-color": "var(--accent-contrast)",
        },
      }),
    },
    ThemeIcon: ThemeIcon.extend({
      vars: (_theme, props) =>
        props.variant === "filled"
          ? { root: { "--ti-color": "var(--accent-contrast)" } }
          : { root: {} },
    }),
    Card: { defaultProps: { radius: "md" } },
    Button: { defaultProps: { radius: "md" } },
    Paper: { defaultProps: { radius: "md" } },
    Input: { defaultProps: { radius: 8 } },
    TextInput: { defaultProps: { radius: 8 } },
    PasswordInput: { defaultProps: { radius: 8 } },
    Select: { defaultProps: { radius: 8 } },
  },
});
