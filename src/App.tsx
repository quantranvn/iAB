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
  SunMedium,
  MoonStar,
  CarFront,
  Clock,
  BatteryCharging,
  GaugeCircle,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { TurnSignalIcon, LowBeamIcon, HighBeamIcon, BrakeLightIcon } from "./components/icons/AutomotiveIcons";
import { BluetoothCommandGenerator } from "./utils/bluetooth-commands";
import { CommandLog, CommandLogEntry } from "./components/CommandLog";
import { toast } from "sonner@2.0.3";
import { BluetoothConnectionTransport } from "./utils/bluetooth-types";
import { AppStoreDialogContent } from "./components/AppStore";

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
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") {
        return stored;
      }
    }

    if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
      return "dark";
    }

    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    return "light";
  });
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [bluetoothDialogOpen, setBluetoothDialogOpen] = useState(false);
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [presetsDialogOpen, setPresetsDialogOpen] = useState(false);
  const [connectionTransport, setConnectionTransport] = useState<BluetoothConnectionTransport | null>(null);
  const [commandHistory, setCommandHistory] = useState<CommandLogEntry[]>([]);
  const [appStoreOpen, setAppStoreOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

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

  const batteryLevel = 100;
  const estimatedRangeKm = 556;

  // Send AT command when settings change
  const isBluetoothConnected = connectionTransport !== null;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? "dark" : "light");
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler);
      return () => {
        media.removeEventListener("change", handler);
      };
    }

    if (typeof media.addListener === "function") {
      media.addListener(handler);
      return () => {
        media.removeListener(handler);
      };
    }

    return undefined;
  }, []);

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

    setLastUpdated(new Date());

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

    setLastUpdated(new Date());

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

  const formattedLastUpdated = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(lastUpdated);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200 px-4 py-8 text-slate-950 transition-colors dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100 sm:px-6">
      <Toaster />
      <InstallPrompt />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-300/60 bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70">
              <CarFront className="h-3.5 w-3.5" />
              Vehicle Control
            </span>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Scooter Smart Lights</h1>
            <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
              Monitor your scooter and fine-tune every light zone with precision controls, Bluetooth connectivity, and saved rider profiles.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] shadow-sm transition-colors ${
              isBluetoothConnected
                ? "border-emerald-500/40 bg-emerald-100/80 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-slate-300/60 bg-white/70 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
            }`}>
              {isBluetoothConnected ? <Bluetooth className="h-3.5 w-3.5" /> : <BluetoothOff className="h-3.5 w-3.5" />}
              {isBluetoothConnected ? "Connected" : "Not Connected"}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full border-slate-300/70 bg-white/70 shadow-sm backdrop-blur transition-colors hover:border-primary/50 hover:bg-primary/10 dark:border-white/10 dark:bg-white/5"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <SunMedium className="h-5 w-5" />
              ) : (
                <MoonStar className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-slate-900 text-white shadow-2xl transition-colors dark:border-white/10 dark:bg-slate-950">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_55%)]" />
          <div className="flex flex-col gap-10 p-8 sm:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-white/80 shadow-sm transition hover:bg-white/20"
                >
                  Check Status
                </button>
                <div>
                  <p className="text-sm uppercase tracking-[0.6em] text-white/60">System Health</p>
                  <h2 className="mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">All Good</h2>
                </div>
                <p className="max-w-md text-sm leading-relaxed text-white/70">
                  Every lighting zone is synchronized and ready. Customize presets, check Bluetooth status, and push new commands instantly.
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 scale-[1.15] rounded-[3rem] bg-gradient-to-br from-white/15 via-white/5 to-transparent blur-2xl" aria-hidden />
                <div className="relative flex h-40 w-[18rem] items-center justify-center rounded-[3rem] border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/70 shadow-lg">
                  <svg
                    viewBox="0 0 400 180"
                    className="h-32 w-[15rem] text-white/80"
                    role="presentation"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient id="car-body" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="60%" stopColor="rgba(255,255,255,0.35)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M30 120c10-40 40-70 110-80h120c48 8 76 30 92 80H30Z"
                      fill="url(#car-body)"
                    />
                    <path
                      d="M70 120a32 32 0 1 0 64 0 32 32 0 1 0-64 0Zm196 0a32 32 0 1 0 64 0 32 32 0 1 0-64 0Z"
                      fill="rgba(0,0,0,0.65)"
                    />
                    <path
                      d="M90 120a20 20 0 1 0 40 0 20 20 0 1 0-40 0Zm196 0a20 20 0 1 0 40 0 20 20 0 1 0-40 0Z"
                      fill="rgba(255,255,255,0.7)"
                    />
                    <rect x="140" y="65" width="120" height="20" rx="10" fill="rgba(255,255,255,0.55)" />
                    <rect x="118" y="88" width="164" height="24" rx="12" fill="rgba(0,0,0,0.55)" />
                    <rect x="126" y="92" width="148" height="16" rx="8" fill="rgba(255,255,255,0.6)" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-xs uppercase tracking-[0.3em] text-white/70 shadow-inner backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-[11px] font-medium">
                  <Clock className="h-4 w-4 text-white/70" />
                  Updated from scooter on {formattedLastUpdated}
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <BatteryCharging className="h-5 w-5 text-white" />
                    <div className="space-y-1 text-left normal-case tracking-normal">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">State of Charge</p>
                      <div className="flex items-baseline gap-2 text-white">
                        <span className="text-xl font-semibold">{batteryLevel}%</span>
                        <span className="text-sm text-white/70">/ {estimatedRangeKm} km</span>
                      </div>
                      <div className="h-1.5 w-44 rounded-full bg-white/20">
                        <div
                          className="h-full rounded-full bg-white"
                          style={{ width: `${batteryLevel}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <GaugeCircle className="h-5 w-5 text-white" />
                    <div className="space-y-1 text-left normal-case tracking-normal">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Active Scene</p>
                      <p className="text-base font-semibold text-white">
                        {buttonLabelForScenario(animationScenario)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Dialog open={presetsDialogOpen} onOpenChange={setPresetsDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100 dark:from-white/10" />
                <div className="relative flex h-full flex-col gap-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm dark:bg-white/10">
                    <Bookmark className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-white/60">Profiles</p>
                    <h3 className="text-lg font-semibold">Rider Library</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Load saved lighting combinations or build presets for each rider in seconds.
                    </p>
                  </div>
                  <span className="mt-auto inline-flex items-center text-sm font-medium text-primary">Manage</span>
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto px-6 pb-6">
              <DialogHeader>
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
            </DialogContent>
          </Dialog>

          <Dialog open={connectionDialogOpen} onOpenChange={setConnectionDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100 dark:from-white/10" />
                <div className="relative flex h-full flex-col gap-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm dark:bg-white/10">
                    {isBluetoothConnected ? <Bluetooth className="h-5 w-5" /> : <BluetoothOff className="h-5 w-5" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-white/60">Connections</p>
                    <h3 className="text-lg font-semibold">Link Center</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Pair a new scooter, review connected devices, or inspect the latest command history.
                    </p>
                  </div>
                  <span className="mt-auto inline-flex items-center text-sm font-medium text-primary">Open Hub</span>
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="space-y-4 sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Connection Center</DialogTitle>
                <DialogDescription>
                  Review your scooter links and access Bluetooth controls.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-dashed border-slate-200/60 bg-muted/40 p-4 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5">
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
              <button
                type="button"
                className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100 dark:from-white/10" />
                <div className="relative flex h-full flex-col gap-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm dark:bg-white/10">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-white/60">Extensions</p>
                    <h3 className="text-lg font-semibold">Lighting AppStore</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Discover new ambient packs, effects, and OTA upgrades tailored to your scooter model.
                    </p>
                  </div>
                  <span className="mt-auto inline-flex items-center text-sm font-medium text-primary">Browse</span>
                </div>
              </button>
            </DialogTrigger>
            <AppStoreDialogContent />
          </Dialog>
        </section>

        <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm transition dark:border-white/10 dark:bg-white/5 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-white/60">Lighting Zones</p>
              <h2 className="text-xl font-semibold sm:text-2xl">Live Control Center</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tap any zone to fine tune colors, intensity, and animations in real time.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lightButtons.map((button) => {
              const Icon = button.icon;

              return (
                <Sheet key={button.id}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${button.gradient} opacity-0 transition group-hover:opacity-40`}
                        aria-hidden
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100 dark:from-white/10" />
                      <div className="relative flex h-full flex-col gap-4">
                        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${button.gradient} text-white shadow-lg`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-lg font-semibold">{button.title}</h3>
                              {button.settings && (
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-white/50">
                                  RGB {button.settings.red}/{button.settings.green}/{button.settings.blue}
                                </p>
                              )}
                            </div>
                            {button.isAnimation && (
                              <span className="inline-flex items-center rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.3em] text-white shadow-sm dark:bg-white/10">
                                Scene {animationScenario}
                              </span>
                            )}
                          </div>
                          {button.settings && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                                <span className="uppercase tracking-[0.3em]">Intensity</span>
                                <span className="font-medium">{button.settings.intensity}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-200/80 dark:bg-white/10">
                                <div
                                  className="h-full rounded-full bg-slate-900 dark:bg-white"
                                  style={{ width: `${button.settings.intensity}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="mt-auto inline-flex items-center text-sm font-medium text-primary">
                          Adjust
                        </span>
                      </div>
                    </button>
                  </SheetTrigger>

                  <SheetContent
                    side="bottom"
                    className="max-h-[85vh] w-full overflow-y-auto rounded-t-[2rem] border border-border bg-background px-2 pb-6 sm:max-w-3xl sm:px-6"
                  >
                    <SheetHeader className="pb-4">
                      <SheetTitle className="flex items-center gap-3 text-lg sm:text-xl">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${button.gradient}`}>
                          <Icon className="h-6 w-6 text-white" />
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
        </section>
      </div>
    </div>
  );
}

function buttonLabelForScenario(scenario: number) {
  const names = ["Idle", "Rainbow Flow", "Lightning Pulse", "Ocean Wave", "Starlight"];
  return names[scenario] ?? `Scenario ${scenario}`;
}
