import type { Dispatch, SetStateAction, CSSProperties, FormEvent } from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
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
  Bluetooth,
  BluetoothOff,
  ScrollText,
  LogIn,
  Loader2,
  Bot,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { TurnSignalIcon, LowBeamIcon, HighBeamIcon, BrakeLightIcon } from "./components/icons/AutomotiveIcons";
import { BluetoothCommandGenerator } from "./utils/bluetooth-commands";
import { CommandLog, CommandLogEntry } from "./components/CommandLog";
import { toast } from "sonner@2.0.3";
import { BluetoothConnectionTransport } from "./utils/bluetooth-types";
import {
  AppStoreDialogContent,
  FALLBACK_USER_ANIMATIONS,
  type AnimationLibraryTab,
  ANIMATION_TOOLKIT_SLOT_ID,
} from "./components/AppStore";
import { ModeToggle } from "./components/ModeToggle";
import {
  fetchStoreAnimations,
  getActiveUserId,
  initializeFirebaseIfReady,
  isFirebaseConfigured,
  loadUserProfile,
  setActiveUserId as persistActiveUserId,
  saveUserProfile,
  type StoreAnimation,
} from "./utils/firebase";
import { FALLBACK_USER_PROFILE, type LightSettings, type Preset, type UserProfile } from "./types/userProfile";
import type { AnimationScenarioOption } from "./types/animation";
import type { DesignerConfig } from "./types/designer";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { buildFallbackProfile, normalizeUserProfile } from "./utils/profileHelpers";

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

const CUSTOM_ANIMATION_SCENARIO_ID = BASE_ANIMATION_SCENARIOS.length + 1;
const AI_PLACEHOLDER_SCENARIO_ID = BASE_ANIMATION_SCENARIOS.length + 2;

const USER_ANIMATION_GRADIENTS = [
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-rose-500 via-purple-500 to-indigo-500",
  "from-amber-400 via-orange-500 to-rose-500",
  "from-blue-400 via-sky-500 to-indigo-500",
];

export default function App() {
  const [activeUserId, setActiveUserIdState] = useState(() => getActiveUserId());
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [bluetoothDialogOpen, setBluetoothDialogOpen] = useState(false);
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [presetsDialogOpen, setPresetsDialogOpen] = useState(false);
  const [connectionTransport, setConnectionTransport] = useState<BluetoothConnectionTransport | null>(null);
  const [commandHistory, setCommandHistory] = useState<CommandLogEntry[]>([]);
  const [appStoreOpen, setAppStoreOpen] = useState(false);
  const [appStoreInitialTab, setAppStoreInitialTab] = useState<AnimationLibraryTab>("owned");
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginUserIdInput, setLoginUserIdInput] = useState(() => getActiveUserId());
  const [loginPasswordInput, setLoginPasswordInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginInProgress, setLoginInProgress] = useState(false);

  useEffect(() => {
    if (!loginDialogOpen) {
      setLoginError(null);
      setLoginPasswordInput("");
      setLoginUserIdInput(activeUserId);
    }
  }, [activeUserId, loginDialogOpen]);

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
const [customScenarioAnimationId, setCustomScenarioAnimationId] = useState<string | null>(
  FALLBACK_USER_PROFILE.customScenarioAnimationId ?? null
);
const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
const [userProfileLoading, setUserProfileLoading] = useState(true);
const [userAnimationOptions, setUserAnimationOptions] = useState<StoreAnimation[]>(
  FALLBACK_USER_ANIMATIONS
);
const [animationCatalog, setAnimationCatalog] = useState<StoreAnimation[]>([]);
const [designerConfig, setDesignerConfig] = useState<DesignerConfig | null>(null);

  const computeUserAnimations = (
    animationIds: string[],
    catalog: StoreAnimation[]
  ): StoreAnimation[] => {
    const lookup = new Map(
      [...catalog, ...FALLBACK_USER_ANIMATIONS].map((animation) => [animation.id, animation])
    );

    const resolved = animationIds
      .map((animationId) => lookup.get(animationId))
      .filter((animation): animation is StoreAnimation => Boolean(animation));

    return resolved.length > 0 ? resolved : FALLBACK_USER_ANIMATIONS;
  };

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

    const loadUserData = async () => {
      const fallbackProfile = buildFallbackProfile(
        activeUserId || FALLBACK_USER_PROFILE.uid
      );

      if (!activeUserId || !isFirebaseConfigured()) {
        if (!isMounted) {
          return;
        }

        setUserProfile(fallbackProfile);
        setUserAnimationOptions(FALLBACK_USER_ANIMATIONS);
        setAnimationCatalog(FALLBACK_USER_ANIMATIONS);
        setAnimationScenario(fallbackProfile.animationScenario);
        setCustomScenarioAnimationId(fallbackProfile.customScenarioAnimationId ?? null);
        setUserProfileLoading(false);
        return;
      }

      setUserProfileLoading(true);

      const firebaseReady = await initializeFirebaseIfReady();
      if (!isMounted) {
        return;
      }

      if (!firebaseReady) {
        setUserProfile(fallbackProfile);
        setUserAnimationOptions(FALLBACK_USER_ANIMATIONS);
        setAnimationCatalog(FALLBACK_USER_ANIMATIONS);
        setAnimationScenario(fallbackProfile.animationScenario);
        setCustomScenarioAnimationId(fallbackProfile.customScenarioAnimationId ?? null);
        setUserProfileLoading(false);
        return;
      }

      try {
        const [catalog, profile] = await Promise.all([
          fetchStoreAnimations(),
          loadUserProfile(activeUserId),
        ]);

        if (!isMounted) {
          return;
        }

        const normalizedProfile = normalizeUserProfile(profile, fallbackProfile);
        setUserProfile(normalizedProfile);
        setAnimationCatalog(catalog);
        setAnimationScenario(normalizedProfile.animationScenario);
        setCustomScenarioAnimationId(normalizedProfile.customScenarioAnimationId ?? null);

        const preferredAnimationIds =
          normalizedProfile.userAnimations.length > 0
            ? normalizedProfile.userAnimations
            : fallbackProfile.userAnimations;

        setUserAnimationOptions(computeUserAnimations(preferredAnimationIds, catalog));
      } catch (error) {
        console.error("Failed to load user data", error);
        if (isMounted) {
          setUserProfile(fallbackProfile);
          setUserAnimationOptions(FALLBACK_USER_ANIMATIONS);
          setAnimationCatalog(FALLBACK_USER_ANIMATIONS);
          setAnimationScenario(fallbackProfile.animationScenario);
          setCustomScenarioAnimationId(fallbackProfile.customScenarioAnimationId ?? null);
        }
      } finally {
        if (isMounted) {
          setUserProfileLoading(false);
        }
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [activeUserId]);

  const handleUserLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUserId = loginUserIdInput.trim();
    if (!trimmedUserId) {
      setLoginError("Please enter a user ID.");
      return;
    }

    if (!loginPasswordInput.trim()) {
      setLoginError("Please enter the demo password.");
      return;
    }

    if (!isFirebaseConfigured()) {
      setLoginError("Server connection is not configured. Using local sample data instead.");
      return;
    }

    setLoginError(null);
    setLoginInProgress(true);

    try {
      const ready = await initializeFirebaseIfReady();
      if (!ready) {
        setLoginError("Unable to connect to the server. Please try again.");
        return;
      }

      const profile = await loadUserProfile(trimmedUserId);

      if (!profile) {
        setLoginError("No profile was found for that user ID.");
        return;
      }

      persistActiveUserId(trimmedUserId);
      setActiveUserIdState(trimmedUserId);
      toast.success(`Welcome back${profile.firstName ? `, ${profile.firstName}` : ""}!`);
      setLoginDialogOpen(false);
    } catch (error) {
      console.error("Failed to sign in", error);
      setLoginError("Unable to sign in. Please try again.");
    } finally {
      setLoginInProgress(false);
    }
  };

  const handleApplyProfileSettings = (settings: {
    turnIndicator: LightSettings;
    lowBeam: LightSettings;
    highBeam: LightSettings;
    brakeLight: LightSettings;
    animation: LightSettings;
    animationScenario: number;
    customScenarioAnimationId: string | null;
  }) => {
    setTurnIndicator({ ...settings.turnIndicator });
    setLowBeam({ ...settings.lowBeam });
    setHighBeam({ ...settings.highBeam });
    setBrakeLight({ ...settings.brakeLight });
    setAnimation({ ...settings.animation });
    setAnimationScenario(settings.animationScenario);
    setCustomScenarioAnimationId(settings.customScenarioAnimationId ?? null);
  };

  const handleProfileUpdated = (profile: UserProfile) => {
    const fallback = userProfile ?? buildFallbackProfile(profile.uid);
    const normalized = normalizeUserProfile(profile, fallback);
    setUserProfile(normalized);

    const catalogSource =
      animationCatalog.length > 0 ? animationCatalog : FALLBACK_USER_ANIMATIONS;

    const preferredIds =
      normalized.userAnimations.length > 0
        ? normalized.userAnimations
        : FALLBACK_USER_PROFILE.userAnimations;

    setUserAnimationOptions(computeUserAnimations(preferredIds, catalogSource));
    setAnimationScenario(normalized.animationScenario);
    setCustomScenarioAnimationId(normalized.customScenarioAnimationId ?? null);
  };

  const animationLookup = useMemo(() => {
    const map = new Map<string, StoreAnimation>();
    [...userAnimationOptions, ...animationCatalog, ...FALLBACK_USER_ANIMATIONS].forEach((animation) => {
      if (!map.has(animation.id)) {
        map.set(animation.id, animation);
      }
    });
    return map;
  }, [userAnimationOptions, animationCatalog]);

  const persistCustomScenarioSelection = useCallback(
    async (profile: UserProfile) => {
      if (!activeUserId || !isFirebaseConfigured()) {
        return;
      }

      const ready = await initializeFirebaseIfReady();
      if (!ready) {
        return;
      }

      try {
        await saveUserProfile(profile, activeUserId);
      } catch (error) {
        console.error("Failed to persist custom scenario selection", error);
      }
    },
    [activeUserId]
  );

  const handleSelectUserAnimationById = (animationId: string) => {
    const scenarioId = userAnimationIdToScenarioId.get(animationId);

    if (scenarioId) {
      setAnimationScenario(scenarioId);

      const option = animationScenarioOptions.find((candidate) => candidate.id === scenarioId);
      if (option) {
        toast.success(`Selected ${option.name}`);
      } else {
        toast.success("Animation selected");
      }
      return;
    }

    const animation = animationLookup.get(animationId);
    if (!animation) {
      toast.error("Animation is not available yet. Sync your profile to refresh the list.");
      return;
    }

    setCustomScenarioAnimationId(animationId);
    setAnimationScenario(CUSTOM_ANIMATION_SCENARIO_ID);

    setUserProfile((prev) => {
      if (!prev) {
        return prev;
      }

      const updatedProfile: UserProfile = {
        ...prev,
        customScenarioAnimationId: animationId,
      };
      void persistCustomScenarioSelection(updatedProfile);
      return updatedProfile;
    });

    toast.success(`Selected ${animation.name}`);
  };

  const handleDesignerConfigCapture = (config: DesignerConfig) => {
    setDesignerConfig(config);
    setCustomScenarioAnimationId(ANIMATION_TOOLKIT_SLOT_ID);
    setAnimationScenario(CUSTOM_ANIMATION_SCENARIO_ID);

    setUserProfile((prev) => {
      if (!prev) {
        return prev;
      }

      const updatedProfile: UserProfile = {
        ...prev,
        customScenarioAnimationId: ANIMATION_TOOLKIT_SLOT_ID,
      };
      void persistCustomScenarioSelection(updatedProfile);
      return updatedProfile;
    });
  };

  const userAnimationScenarioData = useMemo(() => {
    const options: AnimationScenarioOption[] = [];
    const sourceToId = new Map<string, number>();
    const idToSource = new Map<number, string>();

    const customAnimation =
      customScenarioAnimationId
        ? animationLookup.get(customScenarioAnimationId) ?? null
        : null;

    options.push({
      id: CUSTOM_ANIMATION_SCENARIO_ID,
      name: customAnimation?.name ?? "Custom Scenario",
      icon: Sparkles,
      gradient:
        customAnimation?.gradient ??
        USER_ANIMATION_GRADIENTS[0],
      sourceId: customAnimation?.id,
      supportsLibrarySelection: true,
      subtitle: customAnimation ? "Custom selection" : "Select from your library",
      disabled: !customAnimation,
    });

    if (customAnimation) {
      sourceToId.set(customAnimation.id, CUSTOM_ANIMATION_SCENARIO_ID);
      idToSource.set(CUSTOM_ANIMATION_SCENARIO_ID, customAnimation.id);
    }

    options.push({
      id: AI_PLACEHOLDER_SCENARIO_ID,
      name: "AI Generated Animation",
      icon: Bot,
      gradient: "from-slate-700 via-purple-600 to-indigo-500",
      subtitle: "Coming soon",
      disabled: true,
    });

    return { options, sourceToId, idToSource };
  }, [animationLookup, customScenarioAnimationId]);

  const animationScenarioOptions = useMemo(
    () => [...BASE_ANIMATION_SCENARIOS, ...userAnimationScenarioData.options],
    [userAnimationScenarioData.options]
  );

  const userAnimationIdToScenarioId = userAnimationScenarioData.sourceToId;
  const scenarioIdToUserAnimationId = userAnimationScenarioData.idToSource;

  const selectedAnimationOption = useMemo(
    () => animationScenarioOptions.find((option) => option.id === animationScenario),
    [animationScenarioOptions, animationScenario]
  );

  const selectedUserAnimationId = useMemo(() => {
    if (animationScenario === CUSTOM_ANIMATION_SCENARIO_ID) {
      return customScenarioAnimationId;
    }

    return scenarioIdToUserAnimationId.get(animationScenario) ?? null;
  }, [animationScenario, customScenarioAnimationId, scenarioIdToUserAnimationId]);

  const selectedUserAnimation = useMemo(() => {
    if (!selectedUserAnimationId) {
      return null;
    }

    return animationLookup.get(selectedUserAnimationId) ?? null;
  }, [animationLookup, selectedUserAnimationId]);

  const usingDesignerAnimation =
    selectedUserAnimation?.id === ANIMATION_TOOLKIT_SLOT_ID && Boolean(designerConfig);
  const selectedToolkitAnimId = usingDesignerAnimation
    ? null
    : selectedUserAnimation?.toolkitAnimId ?? null;
  const designerPreviewConfig =
    selectedUserAnimation?.id === ANIMATION_TOOLKIT_SLOT_ID ? designerConfig : null;

  useEffect(() => {
    if (!customScenarioAnimationId) {
      return;
    }

    if (animationLookup.has(customScenarioAnimationId)) {
      return;
    }

    setCustomScenarioAnimationId(null);

    if (animationScenario === CUSTOM_ANIMATION_SCENARIO_ID) {
      setAnimationScenario(BASE_ANIMATION_SCENARIOS[0]?.id ?? 1);
    }
  }, [animationLookup, customScenarioAnimationId, animationScenario]);

  const profileInitials = useMemo(() => {
    const first = userProfile?.firstName?.trim().charAt(0) ?? "";
    const last = userProfile?.lastName?.trim().charAt(0) ?? "";
    const initials = `${first}${last}`.trim();
    if (initials.length > 0) {
      return initials.toUpperCase();
    }

    const fallback = userProfile?.email?.charAt(0) ?? userProfile?.uid?.charAt(0) ?? "U";
    return fallback.toUpperCase();
  }, [userProfile]);

  const profileDisplayName = useMemo(() => {
    if (userProfileLoading) {
      return "Loading profile";
    }

    if (!userProfile) {
      return "Guest Rider";
    }

    const first = userProfile.firstName?.trim();
    const last = userProfile.lastName?.trim();
    const fullName = [first, last].filter(Boolean).join(" ");
    if (fullName) {
      return fullName;
    }

    return userProfile.email || userProfile.uid;
  }, [userProfile, userProfileLoading]);

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

  const handleLoadPreset = (preset: Preset) => {
    setTurnIndicator({ ...preset.turnIndicator });
    setLowBeam({ ...preset.lowBeam });
    setHighBeam({ ...preset.highBeam });
    setBrakeLight({ ...preset.brakeLight });
    setAnimation({ ...preset.animation });
    setAnimationScenario(preset.animationScenario);
    setCustomScenarioAnimationId(preset.customScenarioAnimationId ?? null);
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
            <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl"
                  aria-label="Sign in"
                  title="Sign in"
                >
                  <LogIn className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="space-y-4 sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Sign in</DialogTitle>
                  <DialogDescription>
                    Use your rider ID and demo password to load your cloud profile from Firestore.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleUserLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="login-user-id">User ID</Label>
                    <Input
                      id="login-user-id"
                      value={loginUserIdInput}
                      onChange={(event) => setLoginUserIdInput(event.target.value)}
                      placeholder="e.g. rider-001"
                      autoComplete="username"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPasswordInput}
                      onChange={(event) => setLoginPasswordInput(event.target.value)}
                      placeholder="Enter demo password"
                      autoComplete="current-password"
                    />
                    <p className="text-xs text-muted-foreground">
                      The password is for demonstration only—any value will work.
                    </p>
                  </div>
                  <div className="space-y-2 text-sm">
                    {loginError ? (
                      <p className="text-destructive">{loginError}</p>
                    ) : (
                      <p className="text-muted-foreground">
                        Currently signed in as <span className="font-medium">{activeUserId}</span>.
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={loginInProgress}>
                    {loginInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Profile */}
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              aria-label="Profile"
              title="Profile"
              onClick={() => setPresetsDialogOpen(true)}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={userProfile?.profileImageUrl} alt={profileDisplayName} />
                <AvatarFallback>{profileInitials}</AvatarFallback>
              </Avatar>
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
            <AppStoreDialogContent
              activeUserId={activeUserId}
              onAnimationSelect={handleSelectUserAnimationById}
              selectedAnimationId={selectedUserAnimationId}
              initialTab={appStoreInitialTab}
              onTabChange={setAppStoreInitialTab}
              onDesignerConfigCapture={handleDesignerConfigCapture}
              onClose={() => setAppStoreOpen(false)}
            />
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
                  className="
                    mx-auto my-4 max-h-[85vh] overflow-y-auto
                    sm:max-w-lg sm:rounded-2xl sm:border sm:shadow-lg
                    px-6 pb-6 pt-4 bg-background
                  "                
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
                      designerConfig={designerPreviewConfig}
                      onRedChange={(value) => updateLightSetting(setAnimation, "red", value)}
                      onGreenChange={(value) => updateLightSetting(setAnimation, "green", value)}
                      onBlueChange={(value) => updateLightSetting(setAnimation, "blue", value)}
                      onIntensityChange={(value) =>
                        updateLightSetting(setAnimation, "intensity", value)
                      }
                      selectedToolkitAnimId={selectedToolkitAnimId}
                      onSend={() => sendAnimationCommand(animationScenario, animation)}
                      onOpenAnimationLibrary={() => {
                        setAppStoreInitialTab("owned");
                        setAppStoreOpen(true);
                      }}
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
              activeUserId={activeUserId}
              currentSettings={{
                turnIndicator,
                lowBeam,
                highBeam,
                brakeLight,
                animation,
                animationScenario,
                customScenarioAnimationId,
              }}
              onLoadPreset={handleLoadPreset}
              onApplyProfileSettings={handleApplyProfileSettings}
              onProfileUpdated={handleProfileUpdated}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
