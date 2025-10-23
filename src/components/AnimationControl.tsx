import { useState } from "react";
import { Sparkles, Zap, Waves, Star, Send, CheckCircle2 } from "lucide-react";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { toast } from "sonner@2.0.3";

interface AnimationControlProps {
  selectedScenario: number;
  onScenarioChange: (scenario: number) => void;
  red: number;
  green: number;
  blue: number;
  intensity: number;
  onRedChange: (value: number[]) => void;
  onGreenChange: (value: number[]) => void;
  onBlueChange: (value: number[]) => void;
  onIntensityChange: (value: number[]) => void;
  onSend: () => void;
}

export function AnimationControl({
  selectedScenario,
  onScenarioChange,
  red,
  green,
  blue,
  intensity,
  onRedChange,
  onGreenChange,
  onBlueChange,
  onIntensityChange,
  onSend,
}: AnimationControlProps) {
  const [isSending, setIsSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const scenarios = [
    { id: 1, name: "Rainbow Flow", icon: Sparkles, color: "from-red-500 to-purple-500" },
    { id: 2, name: "Lightning Pulse", icon: Zap, color: "from-yellow-400 to-orange-500" },
    { id: 3, name: "Ocean Wave", icon: Waves, color: "from-blue-400 to-cyan-500" },
    { id: 4, name: "Starlight", icon: Star, color: "from-indigo-400 to-pink-500" },
  ];

  const previewColor = `rgba(${red}, ${green}, ${blue}, ${intensity / 100})`;
  const intensityLevel = Math.round(intensity / 5);

  const handleSend = async () => {
    setIsSending(true);
    
    // Haptic feedback (vibration on mobile)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // Call the actual send function
    await onSend();
    
    const scenarioNames = ["", "Rainbow Flow", "Lightning Pulse", "Ocean Wave", "Starlight"];
    
    // Simulate sending delay for better UX
    setTimeout(() => {
      setIsSending(false);
      setJustSent(true);
      
      // Show success toast
      toast.success(`Animation sent!`, {
        description: `${scenarioNames[selectedScenario]} with RGB(${red}, ${green}, ${blue})`,
        duration: 2000,
      });
      
      // Reset success state after animation
      setTimeout(() => setJustSent(false), 2000);
    }, 400);
  };

  const buttonState = isSending
    ? {
        icon: <Send className="h-4 w-4 animate-pulse" />,
        label: "Sending...",
        description: "Transmitting animation command",
      }
    : justSent
      ? {
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: "Sent!",
          description: "Animation delivered to scooter",
        }
      : {
          icon: <Send className="h-4 w-4" />,
          label: "Send to Scooter",
          description: "Push this animation instantly",
        };

  return (
    <div className="space-y-6 pb-6">
      <section className="space-y-6 rounded-2xl border bg-card p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Select Animation Scenario</h2>
          <p className="text-sm text-muted-foreground">
            Choose an animation effect to send to your scooter lights.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {scenarios.map((scenario) => {
            const Icon = scenario.icon;
            const isSelected = selectedScenario === scenario.id;

            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onScenarioChange(scenario.id)}
                className={`rounded-2xl border px-5 py-6 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-primary/60 hover:shadow-sm"
                }`}
              >
                <div
                  className={`rounded-full bg-gradient-to-r ${scenario.color} p-3 shadow-sm transition-transform duration-200 ${
                    isSelected ? "scale-105 ring-2 ring-primary/60" : "group-hover:scale-105"
                  }`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-base font-semibold">{scenario.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-6 rounded-2xl border bg-card p-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Base Color</h2>
          <p className="text-sm text-muted-foreground">
            Fine-tune the RGB mix and brightness for your animation.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/40 p-6 text-center">
          <div
            className="mx-auto h-24 w-full rounded-xl border border-border/70 shadow-inner"
            style={{ backgroundColor: previewColor }}
          />
          <p className="mt-4 text-sm text-muted-foreground">Live preview</p>
        </div>

        <Separator />

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-red-500">Red</Label>
              <span className="text-sm text-muted-foreground">{red}</span>
            </div>
            <Slider
              value={[red]}
              onValueChange={onRedChange}
              max={255}
              step={1}
              className="px-4 sm:px-6 [&_[role=slider]]:border-red-600 [&_[role=slider]]:bg-red-500"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-green-500">Green</Label>
              <span className="text-sm text-muted-foreground">{green}</span>
            </div>
            <Slider
              value={[green]}
              onValueChange={onGreenChange}
              max={255}
              step={1}
              className="px-4 sm:px-6 [&_[role=slider]]:border-green-600 [&_[role=slider]]:bg-green-500"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-blue-500">Blue</Label>
              <span className="text-sm text-muted-foreground">{blue}</span>
            </div>
            <Slider
              value={[blue]}
              onValueChange={onBlueChange}
              max={255}
              step={1}
              className="px-4 sm:px-6 [&_[role=slider]]:border-blue-600 [&_[role=slider]]:bg-blue-500"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Intensity</Label>
              <span className="text-sm text-muted-foreground">
                Level {intensityLevel} ({intensity}%)
              </span>
            </div>
            <Slider
              value={[intensity]}
              onValueChange={onIntensityChange}
              max={100}
              step={5}
              className="px-4 sm:px-6"
            />
          </div>
        </div>

        <Separator />

        <Button
          onClick={handleSend}
          className="relative w-full overflow-hidden py-6 flex flex-col items-center gap-1 text-center"
          size="lg"
          disabled={isSending}
        >
          <span className="flex items-center gap-2 text-base font-semibold">
            {buttonState.icon}
            {buttonState.label}
          </span>
          <span className="text-xs font-medium text-primary-foreground opacity-80">
            {buttonState.description}
          </span>
          {isSending && (
            <div className="absolute inset-0 animate-pulse bg-primary/20" />
          )}
        </Button>
      </section>
    </div>
  );
}
