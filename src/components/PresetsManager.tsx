import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Save, Download, Trash2 } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface LightSettings {
  red: number;
  green: number;
  blue: number;
  intensity: number;
}

interface Preset {
  id: string;
  name: string;
  turnIndicator: LightSettings;
  lowBeam: LightSettings;
  highBeam: LightSettings;
  brakeLight: LightSettings;
  animation: LightSettings;
  animationScenario: number;
  timestamp: number;
}

interface PresetsManagerProps {
  currentSettings: {
    turnIndicator: LightSettings;
    lowBeam: LightSettings;
    highBeam: LightSettings;
    brakeLight: LightSettings;
    animation: LightSettings;
    animationScenario: number;
  };
  onLoadPreset: (preset: Preset) => void;
}

export function PresetsManager({
  currentSettings,
  onLoadPreset,
}: PresetsManagerProps) {
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<Preset[]>([
    {
      id: "1",
      name: "Night Mode",
      turnIndicator: { red: 255, green: 140, blue: 0, intensity: 80 },
      lowBeam: { red: 255, green: 255, blue: 180, intensity: 60 },
      highBeam: { red: 255, green: 255, blue: 255, intensity: 90 },
      brakeLight: { red: 200, green: 0, blue: 0, intensity: 100 },
      animation: { red: 100, green: 100, blue: 255, intensity: 70 },
      animationScenario: 3,
      timestamp: Date.now() - 86400000,
    },
    {
      id: "2",
      name: "Racing",
      turnIndicator: { red: 255, green: 50, blue: 0, intensity: 100 },
      lowBeam: { red: 255, green: 255, blue: 255, intensity: 100 },
      highBeam: { red: 255, green: 255, blue: 255, intensity: 100 },
      brakeLight: { red: 255, green: 0, blue: 0, intensity: 100 },
      animation: { red: 255, green: 0, blue: 0, intensity: 100 },
      animationScenario: 2,
      timestamp: Date.now() - 172800000,
    },
  ]);

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }

    const newPreset: Preset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      ...currentSettings,
      timestamp: Date.now(),
    };

    setPresets([newPreset, ...presets]);
    setPresetName("");
    toast.success(`Preset "${newPreset.name}" saved`);
  };

  const handleDeletePreset = (id: string) => {
    const preset = presets.find((p) => p.id === id);
    setPresets(presets.filter((p) => p.id !== id));
    toast.success(`Preset "${preset?.name}" deleted`);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Save Current Settings */}
      <div className="space-y-3">
        <h4>Save Current Settings</h4>
        <div className="flex gap-2">
          <Input
            placeholder="Enter preset name..."
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
          />
          <Button onClick={handleSavePreset}>
            <Save className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Saved Presets */}
      <div className="space-y-3">
        <h4>Saved Presets</h4>
        
        {presets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No saved presets yet
          </div>
        ) : (
          <div className="space-y-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="p-4 rounded-lg bg-card border border-border"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h4>{preset.name}</h4>
                    <p className="text-muted-foreground">
                      {formatDate(preset.timestamp)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onLoadPreset(preset);
                        toast.success(`Loaded preset "${preset.name}"`);
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeletePreset(preset.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
