import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { LightControl } from "./components/LightControl";
import { AnimationControl } from "./components/AnimationControl";
import { BluetoothConnection } from "./components/BluetoothConnection";
import { PresetsManager } from "./components/PresetsManager";
import { InstallPrompt } from "./components/InstallPrompt";
import { Toaster } from "./components/ui/sonner";
import { 
  Sparkles,
  Bookmark,
  Bluetooth,
  BluetoothOff
} from "lucide-react";
import { Button } from "./components/ui/button";
import { TurnSignalIcon, LowBeamIcon, HighBeamIcon, BrakeLightIcon } from "./components/icons/AutomotiveIcons";
import { BluetoothCommandGenerator } from "./utils/bluetooth-commands";
import { CommandLog, CommandLogEntry } from "./components/CommandLog";
import { toast } from "sonner@2.0.3";
import { Terminal } from "lucide-react";
import { BluetoothConnectionTransport } from "./utils/bluetooth-types";

interface LightSettings {
  red: number;
  green: number;
  blue: number;
  intensity: number;
}

export default function App() {
  const [bluetoothDialogOpen, setBluetoothDialogOpen] = useState(false);
  const [presetsDialogOpen, setPresetsDialogOpen] = useState(false);
  const [commandLogOpen, setCommandLogOpen] = useState(false);
  const [connectionTransport, setConnectionTransport] = useState<BluetoothConnectionTransport | null>(null);
  const [commandHistory, setCommandHistory] = useState<CommandLogEntry[]>([]);

  const [turnIndicator, setTurnIndicator] = useState<LightSettings>({
    red: 255,
    green: 165,
    blue: 0,
    intensity: 100,
  });

  const [lowBeam, setLowBeam] = useState<LightSettings>({
    red: 255,
    green: 255,
    blue: 200,
    intensity: 80,
  });

  const [highBeam, setHighBeam] = useState<LightSettings>({
    red: 255,
    green: 255,
    blue: 255,
    intensity: 100,
  });

  const [brakeLight, setBrakeLight] = useState<LightSettings>({
    red: 255,
    green: 0,
    blue: 0,
    intensity: 100,
  });

  const [animation, setAnimation] = useState<LightSettings>({
    red: 128,
    green: 0,
    blue: 255,
    intensity: 100,
  });

  const [animationScenario, setAnimationScenario] = useState(1);

  // Send AT command when settings change
  const isBluetoothConnected = connectionTransport !== null;

  const sendColorCommand = async (settings: LightSettings, description: string = "Color update") => {
    const command = BluetoothCommandGenerator.generateColorCommand(settings);
    const hexString = BluetoothCommandGenerator.commandToHexString(command);
    
    // Add to command history
    setCommandHistory(prev => [{
      timestamp: new Date(),
      type: "color",
      hexString,
      bytes: Array.from(command),
      description: `${description}: RGB(${settings.red}, ${settings.green}, ${settings.blue}), Intensity: ${settings.intensity}%`
    }, ...prev].slice(0, 50)); // Keep last 50 commands
    
    // Only send via Bluetooth if connected
    if (isBluetoothConnected) {
      try {
        await BluetoothCommandGenerator.sendCommand(connectionTransport, command);
      } catch (error) {
        console.error('Failed to send color command:', error);
      }
    }
  };

  const sendAnimationCommand = async (scenario: number, settings: LightSettings) => {
    const command = BluetoothCommandGenerator.generateAnimationCommand(scenario, settings);
    const hexString = BluetoothCommandGenerator.commandToHexString(command);
    
    const scenarioNames = ["", "Rainbow Flow", "Lightning Pulse", "Ocean Wave", "Starlight"];
    
    // Add to command history
    setCommandHistory(prev => [{
      timestamp: new Date(),
      type: "animation",
      hexString,
      bytes: Array.from(command),
      description: `${scenarioNames[scenario]}: RGB(${settings.red}, ${settings.green}, ${settings.blue}), Intensity: ${settings.intensity}%`
    }, ...prev].slice(0, 50)); // Keep last 50 commands
    
    // Only send via Bluetooth if connected
    if (isBluetoothConnected) {
      try {
        await BluetoothCommandGenerator.sendCommand(connectionTransport, command);
      } catch (error) {
        console.error('Failed to send animation command:', error);
      }
    }
  };

  const updateLightSetting = (
    setter: React.Dispatch<React.SetStateAction<LightSettings>>,
    key: keyof LightSettings,
    value: number[]
  ) => {
    setter((prev) => ({ ...prev, [key]: value[0] }));
  };

  const handleBluetoothConnect = (transport: BluetoothConnectionTransport) => {
    setConnectionTransport(transport);
    setBluetoothDialogOpen(false);
    const label = transport.type === "ble"
      ? transport.device.name ?? "Bluetooth device"
      : transport.label ?? "Serial device";
    toast.success(`Connected to ${label}`);
  };

  const handleBluetoothDisconnect = async () => {
    try {
      if (!connectionTransport) {
        return;
      }

      if (connectionTransport.type === "ble") {
        const device = connectionTransport.device;

        if (device.gatt?.connected) {
          device.gatt.disconnect();
        }
      } else {
        const { writer, port } = connectionTransport;

        try {
          await writer.close();
        } catch (error) {
          console.error('Error closing serial writer:', error);
        } finally {
          try {
            writer.releaseLock();
          } catch (releaseError) {
            console.error('Error releasing serial writer lock:', releaseError);
          }
        }

        try {
          await port.close();
        } catch (error) {
          console.error('Error closing serial port:', error);
        }
      }
    } catch (error) {
      console.error('Error while disconnecting Bluetooth device:', error);
    } finally {
      setConnectionTransport(null);
      toast.message('Bluetooth connection closed');
    }
  };

  useEffect(() => {
    if (!connectionTransport || connectionTransport.type !== 'ble') {
      return;
    }

    const device = connectionTransport.device;

    const handleDisconnect = () => {
      setConnectionTransport(null);
      toast.warning(`${device.name ?? "Bluetooth device"} disconnected`);
    };

    device.addEventListener('gattserverdisconnected', handleDisconnect);

    return () => {
      device.removeEventListener('gattserverdisconnected', handleDisconnect);
    };
  }, [connectionTransport]);

  const handleLoadPreset = (preset: any) => {
    setTurnIndicator(preset.turnIndicator);
    setLowBeam(preset.lowBeam);
    setHighBeam(preset.highBeam);
    setBrakeLight(preset.brakeLight);
    setAnimation(preset.animation);
    setAnimationScenario(preset.animationScenario);
    setPresetsDialogOpen(false);
  };

  const lightButtons = [
    {
      id: "animation",
      title: "Animation",
      icon: Sparkles,
      gradient: "from-purple-500 to-pink-500",
      isAnimation: true,
      settings: animation,
      setter: setAnimation,
    },
    {
      id: "turnIndicator",
      title: "Turn Indicator",
      icon: TurnSignalIcon,
      gradient: "from-orange-500 to-yellow-500",
      settings: turnIndicator,
      setter: setTurnIndicator,
    },
    {
      id: "lowBeam",
      title: "Low Beam",
      icon: LowBeamIcon,
      gradient: "from-yellow-300 to-yellow-500",
      settings: lowBeam,
      setter: setLowBeam,
    },
    {
      id: "highBeam",
      title: "High Beam",
      icon: HighBeamIcon,
      gradient: "from-white to-blue-100",
      settings: highBeam,
      setter: setHighBeam,
    },
    {
      id: "brakeLight",
      title: "Brake Light",
      icon: BrakeLightIcon,
      gradient: "from-red-500 to-red-700",
      settings: brakeLight,
      setter: setBrakeLight,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-6">
      <Toaster />
      <InstallPrompt />
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4 pt-4 pb-2">
          <h1>Scooter Smart Lights</h1>
          <p className="text-muted-foreground">Control your light animations</p>
          
          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            <Dialog open={presetsDialogOpen} onOpenChange={setPresetsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Presets
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Light Presets</DialogTitle>
                  <DialogDescription>
                    Save and load your favorite light configurations
                  </DialogDescription>
                </DialogHeader>
                <PresetsManager
                  currentSettings={{
                    turnIndicator,
                    lowBeam,
                    highBeam,
                    brakeLight,
                    animation,
                    animationScenario,
                  }}
                  onLoadPreset={handleLoadPreset}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={bluetoothDialogOpen} onOpenChange={setBluetoothDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  {isBluetoothConnected ? (
                    <Bluetooth className="w-4 h-4 mr-2" />
                  ) : (
                    <BluetoothOff className="w-4 h-4 mr-2" />
                  )}
                  Bluetooth
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bluetooth Connection</DialogTitle>
                  <DialogDescription>
                    Connect to your scooter's smart light system
                  </DialogDescription>
                </DialogHeader>
                <BluetoothConnection
                  transport={connectionTransport}
                  onConnect={handleBluetoothConnect}
                  onDisconnect={handleBluetoothDisconnect}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={commandLogOpen} onOpenChange={setCommandLogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Terminal className="w-4 h-4 mr-2" />
                  Commands
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>AT Command Log</DialogTitle>
                  <DialogDescription>
                    View commands sent to your scooter's smart light system
                  </DialogDescription>
                </DialogHeader>
                <CommandLog
                  entries={commandHistory}
                  onClear={() => setCommandHistory([])}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main Control Buttons */}
        <div className="space-y-4">
          {lightButtons.map((button) => {
            const Icon = button.icon;
            
            return (
              <Sheet key={button.id}>
                <SheetTrigger asChild>
                  <button
                    className="w-full p-6 rounded-xl bg-card border-2 border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md active:scale-98"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-lg bg-gradient-to-r ${button.gradient} shadow-lg`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3>{button.title}</h3>
                        {button.settings && (
                          <p className="text-muted-foreground">
                            RGB({button.settings.red}, {button.settings.green}, {button.settings.blue})
                          </p>
                        )}
                        {button.isAnimation && (
                          <p className="text-muted-foreground">
                            Scenario {animationScenario}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </SheetTrigger>

                <SheetContent side="bottom" className="h-[85vh] overflow-y-auto px-2 pb-6">
                  <SheetHeader className="pb-6">
                    <SheetTitle className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${button.gradient}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      {button.title}
                    </SheetTitle>
                    <SheetDescription>
                      {button.isAnimation 
                        ? "Choose an animation effect and adjust base colors"
                        : "Adjust RGB color channels and intensity level"
                      }
                    </SheetDescription>
                  </SheetHeader>

                  {button.isAnimation ? (
                    <AnimationControl
                      selectedScenario={animationScenario}
                      onScenarioChange={setAnimationScenario}
                      red={animation.red}
                      green={animation.green}
                      blue={animation.blue}
                      intensity={animation.intensity}
                      onRedChange={(value) =>
                        updateLightSetting(setAnimation, "red", value)
                      }
                      onGreenChange={(value) =>
                        updateLightSetting(setAnimation, "green", value)
                      }
                      onBlueChange={(value) =>
                        updateLightSetting(setAnimation, "blue", value)
                      }
                      onIntensityChange={(value) =>
                        updateLightSetting(setAnimation, "intensity", value)
                      }
                      onSend={() => sendAnimationCommand(animationScenario, animation)}
                    />
                  ) : button.settings && button.setter ? (
                    <LightControl
                      lightType={button.title}
                      red={button.settings.red}
                      green={button.settings.green}
                      blue={button.settings.blue}
                      intensity={button.settings.intensity}
                      onRedChange={(value) =>
                        updateLightSetting(button.setter!, "red", value)
                      }
                      onGreenChange={(value) =>
                        updateLightSetting(button.setter!, "green", value)
                      }
                      onBlueChange={(value) =>
                        updateLightSetting(button.setter!, "blue", value)
                      }
                      onIntensityChange={(value) =>
                        updateLightSetting(button.setter!, "intensity", value)
                      }
                      onSend={() => sendColorCommand(button.settings!, button.title)}
                    />
                  ) : null}
                </SheetContent>
              </Sheet>
            );
          })}
        </div>

        {/* Status Footer */}
        <div className="text-center pt-4">
          <button
            onClick={() => setBluetoothDialogOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all hover:scale-105"
            style={{
              backgroundColor: isBluetoothConnected ? 'rgb(34 197 94 / 0.1)' : 'rgb(239 68 68 / 0.1)',
              borderColor: isBluetoothConnected ? 'rgb(34 197 94 / 0.2)' : 'rgb(239 68 68 / 0.2)',
            }}
          >
            <div 
              className={`w-2 h-2 rounded-full ${isBluetoothConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
            />
            <span className={isBluetoothConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {isBluetoothConnected ? 'Connected' : 'Disconnected'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
