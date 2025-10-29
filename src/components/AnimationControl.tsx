import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner@2.0.3";
import type { AnimationScenarioOption } from "../types/animation";
import type { LightSettings } from "../types/userProfile";

interface AnimationControlProps {
  scenarios: AnimationScenarioOption[];
  selectedScenario: number;
  onScenarioChange: (scenario: number) => void;
  currentSettings: LightSettings;
  onRedChange: (value: number[]) => void;
  onGreenChange: (value: number[]) => void;
  onBlueChange: (value: number[]) => void;
  onIntensityChange: (value: number[]) => void;
  onSend: () => void | Promise<void>;
}

export function AnimationControl({
  scenarios,
  selectedScenario,
  onScenarioChange,
  currentSettings,
  onRedChange,
  onGreenChange,
  onBlueChange,
  onIntensityChange,
  onSend,
}: AnimationControlProps) {
  const [isSending, setIsSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const userScenarios = scenarios.filter((scenario) => scenario.sourceId);
  const selectedUserScenario = userScenarios.find(
    (scenario) => scenario.id === selectedScenario
  );

  const selectedScenarioName =
    scenarios.find((scenario) => scenario.id === selectedScenario)?.name ??
    `Scenario ${selectedScenario}`;

  const previewColor = `rgba(${currentSettings.red}, ${currentSettings.green}, ${currentSettings.blue}, ${Math.max(
    currentSettings.intensity / 100,
    0.25,
  )})`;
  const intensityLevel = Math.round(currentSettings.intensity / 5);

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
                      My animation
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {userScenarios.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Choose from My Animations</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={selectedUserScenario ? String(selectedUserScenario.id) : undefined}
              onValueChange={(value) => onScenarioChange(Number(value))}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select an animation" />
              </SelectTrigger>
              <SelectContent>
                {userScenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={String(scenario.id)}>
                    {scenario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!selectedUserScenario) {
                  toast.info("Pick an animation from your library first");
                  return;
                }

                onScenarioChange(selectedUserScenario.id);
                toast.success(`${selectedUserScenario.name} ready to play`);
              }}
            >
              Play My Animation
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-full h-24 rounded-lg border-2 border-border shadow-inner"
            style={{ backgroundColor: previewColor }}
          />
          <p className="text-muted-foreground">Color Preview</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-red-500">Red</Label>
              <span className="text-muted-foreground">{currentSettings.red}</span>
            </div>
            <Slider
              value={[currentSettings.red]}
              onValueChange={onRedChange}
              max={255}
              step={1}
              className="[&_[role=slider]]:bg-red-500 [&_[role=slider]]:border-red-600"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-green-500">Green</Label>
              <span className="text-muted-foreground">{currentSettings.green}</span>
            </div>
            <Slider
              value={[currentSettings.green]}
              onValueChange={onGreenChange}
              max={255}
              step={1}
              className="[&_[role=slider]]:bg-green-500 [&_[role=slider]]:border-green-600"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-blue-500">Blue</Label>
              <span className="text-muted-foreground">{currentSettings.blue}</span>
            </div>
            <Slider
              value={[currentSettings.blue]}
              onValueChange={onBlueChange}
              max={255}
              step={1}
              className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-600"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Intensity</Label>
              <span className="text-muted-foreground">
                Level {intensityLevel} ({currentSettings.intensity}%)
              </span>
            </div>
            <Slider
              value={[currentSettings.intensity]}
              onValueChange={onIntensityChange}
              max={100}
              step={5}
            />
          </div>
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
