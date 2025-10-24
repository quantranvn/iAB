import { ThemeProvider as NextThemesProvider } from "next-themes@0.4.6";
import type { ThemeProviderProps } from "next-themes@0.4.6/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
