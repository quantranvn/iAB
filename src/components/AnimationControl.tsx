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

  return (
    <div className="space-y-6 pb-6">
      {/* Animation Scenario Selection */}
      <div className="space-y-4">
        <p className="text-muted-foreground">Select Animation Scenario</p>
        
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
                    p-3 rounded-full bg-gradient-to-r ${scenario.color}
                    ${isSelected ? 'shadow-lg' : ''}
                  `}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-center">{scenario.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Color Controls */}
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div 
            className="w-full h-24 rounded-lg border-2 border-border shadow-inner"
            style={{ backgroundColor: previewColor }}
          />
          <p className="text-muted-foreground">Base Color</p>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-red-500">Red</Label>
              <span className="text-muted-foreground">{red}</span>
            </div>
            <Slider
              value={[red]}
              onValueChange={onRedChange}
              max={255}
              step={1}
              className="[&_[role=slider]]:bg-red-500 [&_[role=slider]]:border-red-600"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-green-500">Green</Label>
              <span className="text-muted-foreground">{green}</span>
            </div>
            <Slider
              value={[green]}
              onValueChange={onGreenChange}
              max={255}
              step={1}
              className="[&_[role=slider]]:bg-green-500 [&_[role=slider]]:border-green-600"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-blue-500">Blue</Label>
              <span className="text-muted-foreground">{blue}</span>
            </div>
            <Slider
              value={[blue]}
              onValueChange={onBlueChange}
              max={255}
              step={1}
              className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-600"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Intensity</Label>
              <span className="text-muted-foreground">
                Level {intensityLevel} ({intensity}%)
              </span>
            </div>
            <Slider
              value={[intensity]}
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
