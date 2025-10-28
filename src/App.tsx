import type { Dispatch, SetStateAction, CSSProperties } from "react";
import { useState, useEffect, useMemo } from "react";
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
  Zap,
  Waves,
  Star,
  User,
  Bluetooth,
  BluetoothOff,
  Store,
  ScrollText,
  Crown,
  Gem,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { TurnSignalIcon, LowBeamIcon, HighBeamIcon, BrakeLightIcon } from "./components/icons/AutomotiveIcons";
import { BluetoothCommandGenerator } from "./utils/bluetooth-commands";
import { CommandLog, CommandLogEntry } from "./components/CommandLog";
import { toast } from "sonner@2.0.3";
import { BluetoothConnectionTransport } from "./utils/bluetooth-types";
import { AppStoreDialogContent, FALLBACK_OWNED_ANIMATIONS } from "./components/AppStore";
import { ModeToggle } from "./components/ModeToggle";
import {
  fetchStoreAnimations,
  getActiveUserId,
  isFirebaseConfigured,
  loadUserProfile,
  type StoreAnimation,
} from "./utils/firebase";
import { FALLBACK_USER_PROFILE } from "./types/userProfile";
import type { AnimationScenarioOption } from "./types/animation";

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

const BASE_ANIMATION_SCENARIOS: AnimationScenarioOption[] = [
  { id: 1, name: "Rainbow Flow", icon: Sparkles, gradient: "from-red-500 to-purple-500" },
  { id: 2, name: "Lightning Pulse", icon: Zap, gradient: "from-yellow-400 to-orange-500" },
  { id: 3, name: "Ocean Wave", icon: Waves, gradient: "from-blue-400 to-cyan-500" },
  { id: 4, name: "Starlight", icon: Star, gradient: "from-indigo-400 to-pink-500" },
];

const PURCHASED_SCENARIO_ICONS = [Crown, Gem];
const DEFAULT_PURCHASED_GRADIENTS = [
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-rose-500 via-purple-500 to-indigo-500",
];

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
  green: 179,
  blue: 0,
  intensity: 100,
});

const [lowBeam, setLowBeam] = useState<LightSettings>({
  red: 0,
  green: 210,
  blue: 80,
  intensity: 90,
});

const [highBeam, setHighBeam] = useState<LightSettings>({
  red: 50,
  green: 130,
  blue: 255,
  intensity: 100,
});

const [brakeLight, setBrakeLight] = useState<LightSettings>({
  red: 255,
  green: 36,
  blue: 36,
  intensity: 100,
});

const [animation, setAnimation] = useState<LightSettings>({
  red: 122,
  green: 0,
  blue: 255,
  intensity: 90,
});

  const [animationScenario, setAnimationScenario] = useState(1);
  const [ownedAnimationOptions, setOwnedAnimationOptions] = useState<StoreAnimation[]>(
    FALLBACK_OWNED_ANIMATIONS
  );

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const lightenChannel = (value: number) => Math.min(255, Math.round(value + (255 - value) * 0.35));
  const darkenChannel = (value: number) => Math.max(0, Math.round(value * 0.65));

  const getButtonGradientStyle = (settings?: LightSettings): CSSProperties | undefined => {
    if (!settings) {
      return undefined;
    }

    const alpha = clamp(settings.intensity / 100, 0.25, 1);
    const start = `rgba(${lightenChannel(settings.red)}, ${lightenChannel(settings.green)}, ${lightenChannel(
      settings.blue
    )}, ${clamp(alpha + 0.15, 0.35, 1)})`;
    const end = `rgba(${darkenChannel(settings.red)}, ${darkenChannel(settings.green)}, ${darkenChannel(
      settings.blue
    )}, ${alpha})`;

    return {
      backgroundColor: end,
      backgroundImage: `linear-gradient(135deg, ${start}, ${end})`,
    };
  };

  // Send AT command when settings change
  const isBluetoothConnected = connectionTransport !== null;

  useEffect(() => {
    let isMounted = true;

    const loadOwnedAnimations = async () => {
      if (!isFirebaseConfigured()) {
        setOwnedAnimationOptions(FALLBACK_OWNED_ANIMATIONS);
        return;
      }

      try {
        const [storeAnimations, profile] = await Promise.all([
          fetchStoreAnimations(),
          loadUserProfile(getActiveUserId()),
        ]);

        if (!isMounted) {
          return;
        }

        const ownedIds = new Set(
          profile?.ownedAnimations?.length
            ? profile.ownedAnimations
            : FALLBACK_USER_PROFILE.ownedAnimations
        );

        if (ownedIds.size === 0) {
          setOwnedAnimationOptions(FALLBACK_OWNED_ANIMATIONS);
          return;
        }

        const catalog = [...storeAnimations, ...FALLBACK_OWNED_ANIMATIONS];
        const catalogMap = new Map(catalog.map((animation) => [animation.id, animation]));
        const ownedAnimations = Array.from(ownedIds)
          .map((id) => catalogMap.get(id))
          .filter((animation): animation is StoreAnimation => Boolean(animation));

        setOwnedAnimationOptions(
          ownedAnimations.length > 0 ? ownedAnimations : FALLBACK_OWNED_ANIMATIONS
        );
      } catch (error) {
        console.error("Failed to load owned animations", error);
        if (isMounted) {
          setOwnedAnimationOptions(FALLBACK_OWNED_ANIMATIONS);
        }
      }
    };

    loadOwnedAnimations();

    return () => {
      isMounted = false;
    };
  }, []);

  const purchasedScenarioOptions = useMemo<AnimationScenarioOption[]>(() =>
    ownedAnimationOptions.slice(0, 2).map((animation, index) => ({
      id: BASE_ANIMATION_SCENARIOS.length + index + 1,
      name: animation.name,
      icon: PURCHASED_SCENARIO_ICONS[index % PURCHASED_SCENARIO_ICONS.length],
      gradient:
        animation.gradient ??
        DEFAULT_PURCHASED_GRADIENTS[index % DEFAULT_PURCHASED_GRADIENTS.length],
      sourceId: animation.id,
    })),
  [ownedAnimationOptions]);

  const animationScenarioOptions = useMemo(
    () => [...BASE_ANIMATION_SCENARIOS, ...purchasedScenarioOptions],
    [purchasedScenarioOptions]
  );

  const selectedAnimationOption = useMemo(
    () => animationScenarioOptions.find((option) => option.id === animationScenario),
    [animationScenarioOptions, animationScenario]
  );

  useEffect(() => {
    if (!selectedAnimationOption && animationScenarioOptions.length > 0) {
      setAnimationScenario(animationScenarioOptions[0].id);
    }
  }, [selectedAnimationOption, animationScenarioOptions]);

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
    const scenarioName =
      animationScenarioOptions.find((option) => option.id === scenario)?.name ??
      `Scenario ${scenario}`;

    // Add to command history
    setCommandHistory(prev => [{
      timestamp: new Date(),
      type: "animation",
      hexString,
      bytes: Array.from(command),
      description: `${scenarioName} (Cmd 0x01, Type 0x${scenario.toString(16).padStart(2, "0")}): RGB(${settings.red}, ${settings.green}, ${settings.blue}), Intensity: ${settings.intensity}% (Level ${intensityLevel})`
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

  const AnimationIcon = selectedAnimationOption?.icon ?? Sparkles;
  const lightButtons = [
    {
      id: "animation",
      title: "Animation",
      icon: AnimationIcon,
      gradient: selectedAnimationOption?.gradient ?? "from-purple-500 to-pink-500",
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

        {/* Header */}
        <div className="space-y-2 text-center">
          <h1>Scooter Smart Lights</h1>
          <p className="text-muted-foreground">Control your light animations</p>
        </div>

        {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* Profile */}
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => setPresetsDialogOpen(true)}
              aria-label="Profile"
              title="Profile"
            >
              <User className="w-4 h-4" />
            </Button>
          
            {/* Connection (dialog trigger) */}
            <Dialog open={connectionDialogOpen} onOpenChange={setConnectionDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl"
                  aria-label="Connection"
                  title="Connection"
                >
                  {isBluetoothConnected ? (
                    <Bluetooth className="w-4 h-4" />
                  ) : (
                    <BluetoothOff className="w-4 h-4" />
                  )}
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
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl"
                aria-label="App Store"
                title="App Store"
              >
                <Store className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <AppStoreDialogContent />
          </Dialog>

          <ModeToggle />
        </div>

        {/* Main Control Buttons */}
        <div className="space-y-4">
          {lightButtons.map((button) => {
            const Icon = button.icon;
            const previewStyle = getButtonGradientStyle(button.settings);

            return (
              <Sheet key={button.id}>
                <SheetTrigger asChild>
                  <button
                    className="w-full p-6 rounded-xl bg-card border-2 border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md active:scale-98"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-4 rounded-lg shadow-lg ${
                          previewStyle ? "" : `bg-gradient-to-r ${button.gradient}`
                        }`}
                        style={previewStyle}
                      >
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
                            {selectedAnimationOption?.name ?? `Scenario ${animationScenario}`}
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
                      <div
                        className={`p-3 rounded-lg ${
                          previewStyle ? "" : `bg-gradient-to-r ${button.gradient}`
                        }`}
                        style={previewStyle}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      {button.title}
                    </SheetTitle>
                    <SheetDescription>
                      {button.isAnimation
                        ? "Choose an animation effect, including premium App Store purchases."
                        : "Adjust RGB color channels and intensity level"
                      }
                    </SheetDescription>
                  </SheetHeader>

                  {button.isAnimation ? (
                    <AnimationControl
                      scenarios={animationScenarioOptions}
                      selectedScenario={animationScenario}
                      onScenarioChange={setAnimationScenario}
                      currentSettings={animation}
                      onRedChange={(value) => updateLightSetting(setAnimation, "red", value)}
                      onGreenChange={(value) => updateLightSetting(setAnimation, "green", value)}
                      onBlueChange={(value) => updateLightSetting(setAnimation, "blue", value)}
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

      <Dialog open={presetsDialogOpen} onOpenChange={setPresetsDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto px-6 pb-6">
          <div className="space-y-4">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle>User Profile</DialogTitle>
              <DialogDescription>
                Manage your rider identity, motorbikes, and lighting presets.
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
