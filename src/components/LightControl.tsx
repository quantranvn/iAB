import { useState } from "react";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface LightControlProps {
  lightType: string;
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

export function LightControl({
  lightType,
  red,
  green,
  blue,
  intensity,
  onRedChange,
  onGreenChange,
  onBlueChange,
  onIntensityChange,
  onSend,
}: LightControlProps) {
  const [isSending, setIsSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

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

    // Simulate sending delay for better UX
    setTimeout(() => {
      setIsSending(false);
      setJustSent(true);

      // Show success toast
      toast.success(`${lightType} settings sent!`, {
        description: `RGB(${red}, ${green}, ${blue}) at ${intensity}% intensity`,
        duration: 2000,
      });

      // Reset success state after animation
      setTimeout(() => setJustSent(false), 2000);
    }, 400);
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{lightType} Preview</h2>
          <p className="text-sm text-muted-foreground">
            See how your scooter light will glow in real time.
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 p-4 text-center">
          <div
            className="mx-auto h-24 w-full rounded-lg border border-border/70 shadow-inner"
            style={{ backgroundColor: previewColor }}
          />
          <p className="mt-3 text-sm text-muted-foreground">Live preview</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">Color Controls</h2>
          <p className="text-sm text-muted-foreground">
            Adjust individual channel intensity and overall brightness.
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-red-500">Red</Label>
              <span className="text-sm text-muted-foreground">{red}</span>
            </div>
            <Slider
              value={[red]}
              onValueChange={onRedChange}
              max={255}
              step={1}
              className="px-1 sm:px-2 [&_[role=slider]]:border-red-600 [&_[role=slider]]:bg-red-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-green-500">Green</Label>
              <span className="text-sm text-muted-foreground">{green}</span>
            </div>
            <Slider
              value={[green]}
              onValueChange={onGreenChange}
              max={255}
              step={1}
              className="px-1 sm:px-2 [&_[role=slider]]:border-green-600 [&_[role=slider]]:bg-green-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-blue-500">Blue</Label>
              <span className="text-sm text-muted-foreground">{blue}</span>
            </div>
            <Slider
              value={[blue]}
              onValueChange={onBlueChange}
              max={255}
              step={1}
              className="px-1 sm:px-2 [&_[role=slider]]:border-blue-600 [&_[role=slider]]:bg-blue-500"
            />
          </div>

          <div className="space-y-2">
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
              className="px-1 sm:px-2"
            />
          </div>
        </div>

        <Button
          onClick={handleSend}
          className="relative w-full overflow-hidden"
          size="lg"
          disabled={isSending}
        >
          {isSending ? (
            <>
              <Send className="mr-2 h-4 w-4 animate-pulse" />
              Sending...
            </>
          ) : justSent ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Sent!
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send to Scooter
            </>
          )}
          {isSending && (
            <div className="absolute inset-0 animate-pulse bg-primary/20" />
          )}
        </Button>
      </div>
    </div>
  );
}
