import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner@2.0.3";
import type { AnimationScenarioOption } from "../types/animation";
import type { LightSettings } from "../types/userProfile";

interface AnimationControlProps {
  scenarios: AnimationScenarioOption[];
  selectedScenario: number;
  onScenarioChange: (scenario: number) => void;
  currentSettings: LightSettings;
  onSend: () => void | Promise<void>;
}

export function AnimationControl({
  scenarios,
  selectedScenario,
  onScenarioChange,
  currentSettings,
  onSend,
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
        description: `${selectedScenarioName} with RGB(${currentSettings.red}, ${currentSettings.green}, ${currentSettings.blue})`,
        duration: 2000,
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

            return (
              <button
                key={scenario.id}
                onClick={() => onScenarioChange(scenario.id)}
                className={`
                  relative p-6 rounded-lg border-2 transition-all
                  ${isSelected
                    ? 'border-primary bg-primary/5 scale-105'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`
                    p-3 rounded-full bg-gradient-to-r ${scenario.gradient}
                    ${isSelected ? 'shadow-lg' : ''}
                  `}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-center font-medium">{scenario.name}</span>
                  {scenario.sourceId && (
                    <span className="text-xs font-medium uppercase tracking-wide text-primary">
                      Purchased
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        onClick={handleSend}
        className="w-full relative overflow-hidden"
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
