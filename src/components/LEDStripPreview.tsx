import type { LightSettings } from "../types/userProfile";

interface LEDStripPreviewProps {
  settings: LightSettings;
  scenarioName: string;
}

const LED_GROUPS = [
  { id: "left", count: 5, label: "Left" },
  { id: "center", count: 6, label: "Center" },
  { id: "right", count: 5, label: "Right" },
] as const;

function lightenChannel(value: number, amount: number) {
  return Math.min(255, Math.round(value + (255 - value) * amount));
}

export function LEDStripPreview({ settings, scenarioName }: LEDStripPreviewProps) {
  const { red, green, blue, intensity } = settings;
  const alpha = Math.max(intensity / 100, 0.25);
  const baseColor = `rgb(${red}, ${green}, ${blue})`;
  const highlightColor = `rgb(${lightenChannel(red, 0.45)}, ${lightenChannel(
    green,
    0.45,
  )}, ${lightenChannel(blue, 0.45)})`;
  const glowColor = `rgba(${red}, ${green}, ${blue}, ${Math.min(alpha + 0.2, 1)})`;
  const animationDuration = 2.4 - alpha;

  let ledIndex = 0;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-[0.625rem] uppercase tracking-[0.45em] text-muted-foreground">
        {LED_GROUPS.map((group) => (
          <span key={group.id}>{group.label}</span>
        ))}
      </div>
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-background/40 via-background/10 to-background/50 px-4 py-6 shadow-inner"
        role="img"
        aria-label={`${scenarioName} animation preview`}
      >
        <div className="absolute inset-x-6 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-black/40 blur-sm" aria-hidden />
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
          {LED_GROUPS.map((group) => (
            <div key={group.id} className="flex items-center gap-3">
              {Array.from({ length: group.count }).map((_, index) => {
                const delay = ledIndex * 0.14;
                ledIndex += 1;
                return (
                  <span
                    key={`${group.id}-${index}`}
                    className="relative flex h-8 w-8 items-center justify-center rounded-full bg-black/60"
                    aria-hidden
                  >
                    <span
                      className="h-6 w-6 rounded-full animate-led-pulse"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${highlightColor} 0%, ${baseColor} 60%, rgba(0, 0, 0, 0.35) 100%)`,
                        boxShadow: `0 0 18px ${glowColor}`,
                        animationDelay: `${delay}s`,
                        animationDuration: `${Math.max(1.6, animationDuration)}s`,
                        filter: `brightness(${0.85 + alpha * 0.6})`,
                        opacity: Math.max(0.65, alpha),
                      }}
                    />
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background via-background/10 to-transparent" aria-hidden />
      </div>
      <p className="text-center text-sm text-muted-foreground">Demo animation preview</p>
    </div>
  );
}
