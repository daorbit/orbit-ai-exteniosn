import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { CodeHighlightAdapterProvider, createHighlightJsAdapter } from "@mantine/code-highlight";
import hljs from "highlight.js";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/code-highlight/styles.css";
import "@/app/tokens.css";
import { theme } from "@/app/theme";
import { App } from "./App";

const highlightJsAdapter = createHighlightJsAdapter(hljs);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <CodeHighlightAdapterProvider adapter={highlightJsAdapter}>
        <Notifications position="top-right" />
        <App />
      </CodeHighlightAdapterProvider>
    </MantineProvider>
  </StrictMode>,
);
