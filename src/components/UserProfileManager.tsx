import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Car, Download, Save, Trash2, User, Plus } from "lucide-react";
import { toast } from "sonner@2.0.3";

import {
  FALLBACK_USER_PROFILE,
  type LightSettings,
  type Preset,
  type UserProfile,
  type VehicleProfile,
} from "../types/userProfile";
import {
  getActiveUserId,
  isFirebaseConfigured,
  loadUserProfile,
  saveUserProfile,
} from "../utils/firebase";

interface UserProfileManagerProps {
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

const cloneLightSettings = (settings: LightSettings): LightSettings => ({
  ...settings,
});

const clonePreset = (preset: Preset): Preset => ({
  ...preset,
  turnIndicator: cloneLightSettings(preset.turnIndicator),
  lowBeam: cloneLightSettings(preset.lowBeam),
  highBeam: cloneLightSettings(preset.highBeam),
  brakeLight: cloneLightSettings(preset.brakeLight),
  animation: cloneLightSettings(preset.animation),
});

const cloneVehicle = (vehicle: VehicleProfile): VehicleProfile => ({
  ...vehicle,
  presets: vehicle.presets.map(clonePreset),
});

const buildFallbackProfile = (userId: string): UserProfile => ({
  ...FALLBACK_USER_PROFILE,
  userId,
  ownedAnimations: [...FALLBACK_USER_PROFILE.ownedAnimations],
  vehicles: FALLBACK_USER_PROFILE.vehicles.map(cloneVehicle),
});

export function UserProfileManager({
  currentSettings,
  onLoadPreset,
}: UserProfileManagerProps) {
  const activeUserId = getActiveUserId();
  const fallbackProfile = useMemo(
    () => buildFallbackProfile(activeUserId),
    [activeUserId]
  );

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [newVehicleId, setNewVehicleId] = useState("");
  const [presetName, setPresetName] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        if (!isFirebaseConfigured()) {
          if (!isMounted) return;
          setUserProfile(fallbackProfile);
          setSelectedVehicleId(fallbackProfile.vehicles[0]?.id ?? "");
          return;
        }

        const profile = await loadUserProfile(activeUserId);

        if (!isMounted) {
          return;
        }

        if (profile) {
          setUserProfile(profile);
          setSelectedVehicleId(profile.vehicles[0]?.id ?? "");
        } else {
          await saveUserProfile(fallbackProfile, activeUserId);
          setUserProfile(fallbackProfile);
          setSelectedVehicleId(fallbackProfile.vehicles[0]?.id ?? "");
        }
      } catch (error) {
        console.error("Failed to load user profile", error);
        toast.error("Unable to load your profile from the cloud. Using local data.");
        if (isMounted) {
          setUserProfile(fallbackProfile);
          setSelectedVehicleId(fallbackProfile.vehicles[0]?.id ?? "");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [activeUserId, fallbackProfile]);

  const persistProfile = async (profile: UserProfile) => {
    if (!isFirebaseConfigured()) {
      return;
    }

    setSyncing(true);
    try {
      await saveUserProfile(profile, activeUserId);
    } catch (error) {
      console.error("Failed to sync user profile", error);
      toast.error("Unable to sync your changes to Firebase");
    } finally {
      setSyncing(false);
    }
  };

  const updateProfile = (updater: (prev: UserProfile) => UserProfile) => {
    setUserProfile((prev) => {
      if (!prev) {
        return prev;
      }

      const updatedProfile = updater(prev);
      void persistProfile(updatedProfile);
      return updatedProfile;
    });
  };

  const selectedVehicle = useMemo(() => {
    return userProfile?.vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  }, [selectedVehicleId, userProfile]);

  const handleUpdateProfileField = (field: "userId" | "username") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      updateProfile((prev) => ({ ...prev, [field]: value }));
    };

  const handleAddVehicle = () => {
    const vehicleId = newVehicleId.trim();
    if (!vehicleId) {
      toast.error("Please enter a vehicle ID");
      return;
    }

    if (userProfile?.vehicles.some((vehicle) => vehicle.id === vehicleId)) {
      toast.error("Vehicle ID already exists");
      return;
    }

    updateProfile((prev) => ({
      ...prev,
      vehicles: [
        ...prev.vehicles,
        { id: vehicleId, presets: [] },
      ],
    }));
    setSelectedVehicleId(vehicleId);
    setNewVehicleId("");
    toast.success(`Vehicle ${vehicleId} added`);
  };

  const handleRemoveVehicle = (vehicleId: string) => {
    if (!userProfile) {
      return;
    }

    if (userProfile.vehicles.length === 1) {
      toast.error("At least one vehicle is required");
      return;
    }

    updateProfile((prev) => ({
      ...prev,
      vehicles: prev.vehicles.filter((vehicle) => vehicle.id !== vehicleId),
    }));

    if (selectedVehicleId === vehicleId) {
      const remainingVehicles = userProfile.vehicles.filter(
        (vehicle) => vehicle.id !== vehicleId
      );
      setSelectedVehicleId(remainingVehicles[0]?.id ?? "");
    }

    toast.success(`Vehicle ${vehicleId} removed`);
  };

  const handleSavePreset = () => {
    if (!selectedVehicle || !userProfile) {
      toast.error("Please select a vehicle before saving");
      return;
    }

    if (!presetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }

    const newPreset: Preset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      turnIndicator: { ...currentSettings.turnIndicator },
      lowBeam: { ...currentSettings.lowBeam },
      highBeam: { ...currentSettings.highBeam },
      brakeLight: { ...currentSettings.brakeLight },
      animation: { ...currentSettings.animation },
      animationScenario: currentSettings.animationScenario,
      timestamp: Date.now(),
    };

    updateProfile((prev) => ({
      ...prev,
      vehicles: prev.vehicles.map((vehicle) =>
        vehicle.id === selectedVehicle.id
          ? { ...vehicle, presets: [newPreset, ...vehicle.presets] }
          : vehicle
      ),
    }));

    setPresetName("");
    toast.success(`Preset "${newPreset.name}" saved for ${selectedVehicle.id}`);
  };

  const handleDeletePreset = (presetId: string) => {
    if (!selectedVehicle) {
      return;
    }

    const preset = selectedVehicle.presets.find((p) => p.id === presetId);

    updateProfile((prev) => ({
      ...prev,
      vehicles: prev.vehicles.map((vehicle) =>
        vehicle.id === selectedVehicle.id
          ? {
              ...vehicle,
              presets: vehicle.presets.filter((p) => p.id !== presetId),
            }
          : vehicle
      ),
    }));

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

  if (loading || !userProfile) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
        Loading profile data...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {syncing && (
        <p className="text-xs text-muted-foreground">
          Syncing changes with Firebase...
        </p>
      )}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5" />
          <h3>User Profile</h3>
        </div>
        <div className="grid gap-4">
          <div>
            <label className="text-sm font-medium">User ID</label>
            <Input
              value={userProfile.userId}
              onChange={handleUpdateProfileField("userId")}
              placeholder="Enter user ID"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Username</label>
            <Input
              value={userProfile.username}
              onChange={handleUpdateProfileField("username")}
              placeholder="Enter username"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Car className="w-5 h-5" />
          <h3>Vehicles</h3>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add vehicle ID"
            value={newVehicleId}
            onChange={(event) => setNewVehicleId(event.target.value)}
          />
          <Button onClick={handleAddVehicle}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {userProfile.vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                selectedVehicleId === vehicle.id
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <button
                type="button"
                className="text-left flex-1"
                onClick={() => setSelectedVehicleId(vehicle.id)}
              >
                <p className="font-medium">{vehicle.id}</p>
                <p className="text-sm text-muted-foreground">
                  {vehicle.presets.length} saved presets
                </p>
              </button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemoveVehicle(vehicle.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Save className="w-5 h-5" />
          <h3>Animation Presets</h3>
        </div>
        {selectedVehicle ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Save current settings for {selectedVehicle.id}
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter preset name..."
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                />
                <Button onClick={handleSavePreset}>
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {selectedVehicle.presets.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                No presets saved for this vehicle yet
              </div>
            ) : (
              <div className="space-y-2">
                {selectedVehicle.presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
                  >
                    <div className="flex-1">
                      <h4>{preset.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Saved {formatDate(preset.timestamp)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onLoadPreset(preset);
                          toast.success(
                            `Loaded preset "${preset.name}" for ${selectedVehicle.id}`
                          );
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
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            Add a vehicle to start saving presets
          </div>
        )}
      </section>

    </div>
  );
}
