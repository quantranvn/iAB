import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./components/theme-provider";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Failed to initialize app: missing #root element in the document.",
  );
}

createRoot(rootElement).render(
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
  >
    <App />
  </ThemeProvider>
);
