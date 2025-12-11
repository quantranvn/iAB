import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner@2.0.3";
import type { AnimationScenarioOption } from "../types/animation";
import type { LightSettings } from "../types/userProfile";
import { LEDStripPreview } from "./LEDStripPreview";
import type { DesignerConfig } from "../types/designer";

interface AnimationControlProps {
  scenarios: AnimationScenarioOption[];
  selectedScenario: number;
  onScenarioChange: (scenario: number) => void;
  currentSettings: LightSettings;
  selectedToolkitAnimId?: string | null;
  onSend: () => void | Promise<void>;
  onOpenAnimationLibrary?: (scenarioId: number) => void;
  designerConfig?: DesignerConfig | null;
}

export function AnimationControl({
  scenarios,
  selectedScenario,
  onScenarioChange,
  currentSettings,
  selectedToolkitAnimId,
  onSend,
  onOpenAnimationLibrary,
  designerConfig,
}: AnimationControlProps) {
  const [isSending, setIsSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const selectedScenarioName =
    scenarios.find((scenario) => scenario.id === selectedScenario)?.name ??
    `Scenario ${selectedScenario}`;

  const handleSend = async () => {
    setIsSending(true);

    // Haptic feedback (vibration on mobile)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // Call the actual send function
    await onSend();

    // Simulate sending delay for better UX
    setTimeout(() => {
      setIsSending(false);
      setJustSent(true);

      // Show success toast
      toast.success(`Animation sent!`, {
        description: `${selectedScenarioName}`,
        duration: 1500,
      });

      // Reset success state after animation
      setTimeout(() => setJustSent(false), 2000);
    }, 400);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Animation Scenario Selection */}
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Select Animation Scenario
        </p>

        <div className="grid grid-cols-2 gap-4">
          {scenarios.map((scenario) => {
            const Icon = scenario.icon;
            const isSelected = selectedScenario === scenario.id;
            const isUserScenario = Boolean(scenario.sourceId);
            const isDisabled = scenario.disabled ?? false;
            const supportsLibrarySelection = scenario.supportsLibrarySelection ?? false;
            const subtitle =
              scenario.subtitle ?? (isUserScenario ? "My animation" : undefined);

            const handleActivateScenario = () => {
              if (isDisabled) {
                return;
              }
              onScenarioChange(scenario.id);
            };

            return (
              <div
                key={scenario.id}
                role="button"
                tabIndex={isDisabled ? -1 : 0}
                aria-pressed={isDisabled ? false : isSelected}
                aria-disabled={isDisabled}
                onClick={handleActivateScenario}
                onKeyDown={(event) => {
                  if (isDisabled) {
                    return;
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleActivateScenario();
                  }
                }}
                className={`
                  relative flex flex-col gap-4 rounded-lg border-2 p-6 transition-all outline-none
                  ${isDisabled
                    ? "border-border/60 bg-muted/40 cursor-not-allowed"
                    : isSelected
                      ? "border-primary bg-primary/5 scale-105 shadow-md"
                      : "border-border hover:border-primary/50 hover:shadow-sm focus:border-primary"
                  }
                  focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                `}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div
                    className={`p-3 rounded-full bg-gradient-to-r ${scenario.gradient} ${isSelected ? "shadow-lg" : ""}`}
                  >
                    <Icon className="h-6 w-6 text-foreground" />
                  </div>
                  <span className="font-medium">{scenario.name}</span>
                  {subtitle && (
                    <span className="text-xs font-medium uppercase tracking-wide text-primary">
                      {subtitle}
                    </span>
                  )}
                </div>

                {supportsLibrarySelection && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleActivateScenario();
                      onOpenAnimationLibrary?.(scenario.id);
                    }}
                  >
                    {scenario.sourceId ? "Change animation" : "Choose animation"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <LEDStripPreview
          settings={currentSettings}
          scenarioName={selectedScenarioName}
          scenarioId={selectedScenario}
          toolkitAnimId={selectedToolkitAnimId ?? undefined}
          designerConfig={designerConfig}
        />
      </div>

      <Button
        onClick={handleSend}
        className="w-full relative overflow-y-auto"
        size="lg"
        disabled={isSending}
      >
        {isSending ? (
          <>
            <Send className="w-4 h-4 mr-2 animate-pulse" />
            Sending...
          </>
        ) : justSent ? (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Sent!
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Send to Scooter
          </>
        )}
        {isSending && (
          <div className="absolute inset-0 bg-primary/20 animate-pulse" />
        )}
      </Button>
    </div>
  );
}
