import type { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { LightControl } from "./components/LightControl";
import { AnimationControl } from "./components/AnimationControl";
import { BluetoothConnection } from "./components/BluetoothConnection";
import { UserProfileManager } from "./components/UserProfileManager";
import { InstallPrompt } from "./components/InstallPrompt";
import { Toaster } from "./components/ui/sonner";
import {
  Sparkles,
  Bookmark,
  Bluetooth,
  BluetoothOff,
  Store,
  ScrollText,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { TurnSignalIcon, LowBeamIcon, HighBeamIcon, BrakeLightIcon } from "./components/icons/AutomotiveIcons";
import { BluetoothCommandGenerator } from "./utils/bluetooth-commands";
import { CommandLog, CommandLogEntry } from "./components/CommandLog";
import { toast } from "sonner@2.0.3";
import { BluetoothConnectionTransport } from "./utils/bluetooth-types";
import { AppStoreDialogContent } from "./components/AppStore";
import { ModeToggle } from "./components/ModeToggle";

interface LightSettings {
  red: number;
  green: number;
  blue: number;
  intensity: number;
}

const BASIC_LIGHT_TYPES = {
  lowBeam: 1,
  highBeam: 2,
  turnLight: 3,
  brakeLight: 4,
} as const;

const ANIMATION_SCENARIO_NAMES = ["", "Rainbow Flow", "Lightning Pulse", "Ocean Wave", "Starlight"];

export default function App() {
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [bluetoothDialogOpen, setBluetoothDialogOpen] = useState(false);
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [presetsDialogOpen, setPresetsDialogOpen] = useState(false);
  const [connectionTransport, setConnectionTransport] = useState<BluetoothConnectionTransport | null>(null);
  const [commandHistory, setCommandHistory] = useState<CommandLogEntry[]>([]);
  const [appStoreOpen, setAppStoreOpen] = useState(false);

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

  const sendBasicLightCommand = async (
    type: number,
    settings: LightSettings,
    description: string
  ) => {
    const command = BluetoothCommandGenerator.generateColorCommand(type, settings);
    const hexString = BluetoothCommandGenerator.commandToHexString(command);
    const intensityLevel = Math.round(settings.intensity / 5);

    // Add to command history
    setCommandHistory(prev => [{
      timestamp: new Date(),
      type: "color",
      hexString,
      bytes: Array.from(command),
      description: `${description} (Cmd 0x00, Type 0x${type.toString(16).padStart(2, "0")}): RGB(${settings.red}, ${settings.green}, ${settings.blue}), Intensity: ${settings.intensity}% (Level ${intensityLevel})`
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
    const intensityLevel = Math.round(settings.intensity / 5);

    // Add to command history
    setCommandHistory(prev => [{
      timestamp: new Date(),
      type: "animation",
      hexString,
      bytes: Array.from(command),
      description: `${ANIMATION_SCENARIO_NAMES[scenario]} (Cmd 0x01, Type 0x${scenario.toString(16).padStart(2, "0")}): RGB(${settings.red}, ${settings.green}, ${settings.blue}), Intensity: ${settings.intensity}% (Level ${intensityLevel})`
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
    setter: Dispatch<SetStateAction<LightSettings>>,
    key: keyof LightSettings,
    value: number[]
  ) => {
    setter((prev) => ({ ...prev, [key]: value[0] }));
  };

  const handleBluetoothConnect = (transport: BluetoothConnectionTransport) => {
    setConnectionTransport(transport);
    setCommandDialogOpen(false);
    setBluetoothDialogOpen(false);
    setConnectionDialogOpen(false);
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

  useEffect(() => {
    if (!connectionDialogOpen) {
      setBluetoothDialogOpen(false);
      setCommandDialogOpen(false);
    }
  }, [connectionDialogOpen]);

  useEffect(() => {
    if (!bluetoothDialogOpen) {
      setCommandDialogOpen(false);
    }
  }, [bluetoothDialogOpen]);

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
      id: "lowBeam",
      title: "Low Beam",
      icon: LowBeamIcon,
      gradient: "from-yellow-300 to-yellow-500",
      settings: lowBeam,
      setter: setLowBeam,
      commandType: BASIC_LIGHT_TYPES.lowBeam,
    },
    {
      id: "highBeam",
      title: "High Beam",
      icon: HighBeamIcon,
      gradient: "from-white to-blue-100",
      settings: highBeam,
      setter: setHighBeam,
      commandType: BASIC_LIGHT_TYPES.highBeam,
    },
    {
      id: "turnIndicator",
      title: "Turn Indicator",
      icon: TurnSignalIcon,
      gradient: "from-orange-500 to-yellow-500",
      settings: turnIndicator,
      setter: setTurnIndicator,
      commandType: BASIC_LIGHT_TYPES.turnLight,
    },
    {
      id: "brakeLight",
      title: "Brake Light",
      icon: BrakeLightIcon,
      gradient: "from-red-500 to-red-700",
      settings: brakeLight,
      setter: setBrakeLight,
      commandType: BASIC_LIGHT_TYPES.brakeLight,
    },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background to-muted/20 px-4 pt-6 pb-32 sm:px-6">
      <Toaster />
      <InstallPrompt />
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-start">
          <ModeToggle />
        </div>

        {/* Header */}
        <div className="space-y-2 text-center">
          <h1>Scooter Smart Lights</h1>
          <p className="text-muted-foreground">Control your light animations</p>
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

                <SheetContent
                  side="bottom"
                  className="max-h-[85vh] w-full overflow-y-auto px-2 pb-6 sm:max-w-3xl sm:px-4"
                >
                  <SheetHeader className="pb-4">
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
                      onSend={() =>
                        sendBasicLightCommand(
                          button.commandType!,
                          button.settings!,
                          button.title
                        )
                      }
                    />
                  ) : null}
                </SheetContent>
              </Sheet>
            );
          })}
        </div>

      </div>

<div className="sticky bottom-0 z-[100] px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
  <div className="mx-auto max-w-md pointer-events-none">
    <div className="pointer-events-auto flex items-center gap-4 bg-background/80 shadow-md backdrop-blur p-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 justify-center gap-2"
              onClick={() => setPresetsDialogOpen(true)}
            >
              <Bookmark className="w-4 h-4" />
              Profile
            </Button>

            <Dialog open={connectionDialogOpen} onOpenChange={setConnectionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 justify-center gap-2">
                  {isBluetoothConnected ? (
                    <Bluetooth className="w-4 h-4" />
                  ) : (
                    <BluetoothOff className="w-4 h-4" />
                  )}
                  Connection
                </Button>
              </DialogTrigger>
              <DialogContent className="space-y-4 sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Connection Center</DialogTitle>
                  <DialogDescription>
                    Review your scooter links and access Bluetooth controls.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  {isBluetoothConnected
                    ? "A Bluetooth device is currently connected."
                    : "No active Bluetooth connections."}
                </div>
                <Dialog open={bluetoothDialogOpen} onOpenChange={setBluetoothDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full justify-center gap-2" variant="outline">
                      {isBluetoothConnected ? (
                        <Bluetooth className="w-4 h-4" />
                      ) : (
                        <BluetoothOff className="w-4 h-4" />
                      )}
                      Bluetooth Controls
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Bluetooth Controls</DialogTitle>
                      <DialogDescription>
                        Pair with your scooter or manage the active Bluetooth link.
                      </DialogDescription>
                    </DialogHeader>
                    <BluetoothConnection
                      transport={connectionTransport}
                      onConnect={handleBluetoothConnect}
                      onDisconnect={handleBluetoothDisconnect}
                    />
                    <Dialog open={commandDialogOpen} onOpenChange={setCommandDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full justify-center gap-2" variant="outline">
                          <ScrollText className="h-4 w-4" />
                          Command Log
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Command Log</DialogTitle>
                          <DialogDescription>
                            Review the most recent lighting commands sent to your scooter.
                          </DialogDescription>
                        </DialogHeader>
                        <CommandLog
                          entries={commandHistory}
                          onClear={() => setCommandHistory([])}
                        />
                      </DialogContent>
                    </Dialog>
                  </DialogContent>
                </Dialog>
              </DialogContent>
            </Dialog>

            <Dialog open={appStoreOpen} onOpenChange={setAppStoreOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 justify-center gap-2">
                  <Store className="h-4 w-4" />
                  AppStore
                </Button>
              </DialogTrigger>
              <AppStoreDialogContent />
            </Dialog>
          </div>
        </div>
      </div>

      <Dialog open={presetsDialogOpen} onOpenChange={setPresetsDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto px-6 pb-6">
          <div className="space-y-4">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle>User Profile</DialogTitle>
              <DialogDescription>
                Manage your rider identity, vehicles, and lighting presets.
              </DialogDescription>
            </DialogHeader>
            <UserProfileManager
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
