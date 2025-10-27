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
  type MotorbikeProfile,
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

const cloneMotorbike = (motorbike: MotorbikeProfile): MotorbikeProfile => ({
  ...motorbike,
  presets: motorbike.presets.map(clonePreset),
});

const buildFallbackProfile = (userUid: string): UserProfile => ({
  ...FALLBACK_USER_PROFILE,
  uid: userUid,
  ownedAnimations: [...FALLBACK_USER_PROFILE.ownedAnimations],
  userAnimations: [...FALLBACK_USER_PROFILE.userAnimations],
  motorbikes: FALLBACK_USER_PROFILE.motorbikes.map(cloneMotorbike),
  settings: { ...FALLBACK_USER_PROFILE.settings },
  location: { ...FALLBACK_USER_PROFILE.location },
  turnIndicator: { ...FALLBACK_USER_PROFILE.turnIndicator },
  lowBeam: { ...FALLBACK_USER_PROFILE.lowBeam },
  highBeam: { ...FALLBACK_USER_PROFILE.highBeam },
  brakeLight: { ...FALLBACK_USER_PROFILE.brakeLight },
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
  const [selectedMotorbikeId, setSelectedMotorbikeId] = useState<string>("");
  const [newMotorbikeId, setNewMotorbikeId] = useState("");
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
          setSelectedMotorbikeId(fallbackProfile.motorbikes[0]?.bikeId ?? "");
          return;
        }

        const profile = await loadUserProfile(activeUserId);

        if (!isMounted) {
          return;
        }

        if (profile) {
          setUserProfile(profile);
          setSelectedMotorbikeId(profile.motorbikes[0]?.bikeId ?? "");
        } else {
          await saveUserProfile(fallbackProfile, activeUserId);
          setUserProfile(fallbackProfile);
          setSelectedMotorbikeId(fallbackProfile.motorbikes[0]?.bikeId ?? "");
        }
      } catch (error) {
        console.error("Failed to load user profile", error);
        toast.error("Unable to load your profile from the cloud. Using local data.");
        if (isMounted) {
          setUserProfile(fallbackProfile);
          setSelectedMotorbikeId(fallbackProfile.motorbikes[0]?.bikeId ?? "");
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

  const selectedMotorbike = useMemo(() => {
    return userProfile?.motorbikes.find((motorbike) => motorbike.bikeId === selectedMotorbikeId);
  }, [selectedMotorbikeId, userProfile]);

  const handleUpdateProfileField = (
    field:
      | "uid"
      | "firstName"
      | "lastName"
      | "email"
      | "phoneNumber"
      | "role"
      | "status"
      | "profileImageUrl"
  ) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      updateProfile((prev) => ({ ...prev, [field]: value }));
    };

  const handleAddMotorbike = () => {
    const motorbikeId = newMotorbikeId.trim();
    if (!motorbikeId) {
      toast.error("Please enter a motorbike ID");
      return;
    }

    if (userProfile?.motorbikes.some((motorbike) => motorbike.bikeId === motorbikeId)) {
      toast.error("Motorbike ID already exists");
      return;
    }

    updateProfile((prev) => ({
      ...prev,
      motorbikes: [
        ...prev.motorbikes,
        {
          bikeId: motorbikeId,
          brand: "Custom",
          model: "Motorbike",
          year: new Date().getFullYear(),
          licensePlate: "",
          color: "Custom",
          status: "active",
          presets: [],
        },
      ],
    }));
    setSelectedMotorbikeId(motorbikeId);
    setNewMotorbikeId("");
    toast.success(`Motorbike ${motorbikeId} added`);
  };

  const handleRemoveMotorbike = (motorbikeId: string) => {
    if (!userProfile) {
      return;
    }

    if (userProfile.motorbikes.length === 1) {
      toast.error("At least one motorbike is required");
      return;
    }

    updateProfile((prev) => ({
      ...prev,
      motorbikes: prev.motorbikes.filter((motorbike) => motorbike.bikeId !== motorbikeId),
    }));

    if (selectedMotorbikeId === motorbikeId) {
      const remainingMotorbikes = userProfile.motorbikes.filter(
        (motorbike) => motorbike.bikeId !== motorbikeId
      );
      setSelectedMotorbikeId(remainingMotorbikes[0]?.bikeId ?? "");
    }

    toast.success(`Motorbike ${motorbikeId} removed`);
  };

  const handleSavePreset = () => {
    if (!selectedMotorbike || !userProfile) {
      toast.error("Please select a motorbike before saving");
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
      motorbikes: prev.motorbikes.map((motorbike) =>
        motorbike.bikeId === selectedMotorbike.bikeId
          ? { ...motorbike, presets: [newPreset, ...motorbike.presets] }
          : motorbike
      ),
    }));

    setPresetName("");
    toast.success(`Preset "${newPreset.name}" saved for ${selectedMotorbike.bikeId}`);
  };

  const handleDeletePreset = (presetId: string) => {
    if (!selectedMotorbike) {
      return;
    }

    const preset = selectedMotorbike.presets.find((p) => p.id === presetId);

    updateProfile((prev) => ({
      ...prev,
      motorbikes: prev.motorbikes.map((motorbike) =>
        motorbike.bikeId === selectedMotorbike.bikeId
          ? {
              ...motorbike,
              presets: motorbike.presets.filter((p) => p.id !== presetId),
            }
          : motorbike
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">User UID</label>
            <Input
              value={userProfile.uid}
              onChange={handleUpdateProfileField("uid")}
              placeholder="Enter user UID"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              value={userProfile.email}
              onChange={handleUpdateProfileField("email")}
              placeholder="Enter email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">First Name</label>
            <Input
              value={userProfile.firstName}
              onChange={handleUpdateProfileField("firstName")}
              placeholder="Enter first name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name</label>
            <Input
              value={userProfile.lastName}
              onChange={handleUpdateProfileField("lastName")}
              placeholder="Enter last name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone Number</label>
            <Input
              value={userProfile.phoneNumber}
              onChange={handleUpdateProfileField("phoneNumber")}
              placeholder="Enter phone number"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Profile Image URL</label>
            <Input
              value={userProfile.profileImageUrl}
              onChange={handleUpdateProfileField("profileImageUrl")}
              placeholder="Enter profile image URL"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Input
              value={userProfile.role}
              onChange={handleUpdateProfileField("role")}
              placeholder="Enter role"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Input
              value={userProfile.status}
              onChange={handleUpdateProfileField("status")}
              placeholder="Enter status"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Car className="w-5 h-5" />
          <h3>Motorbikes</h3>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add motorbike ID"
            value={newMotorbikeId}
            onChange={(event) => setNewMotorbikeId(event.target.value)}
          />
          <Button onClick={handleAddMotorbike}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {userProfile.motorbikes.map((motorbike) => (
            <div
              key={motorbike.bikeId}
              className={`flex flex-col gap-2 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                selectedMotorbikeId === motorbike.bikeId
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <button
                type="button"
                className="text-left flex-1"
                onClick={() => setSelectedMotorbikeId(motorbike.bikeId)}
              >
                <p className="font-medium">{motorbike.bikeId}</p>
                <p className="text-sm text-muted-foreground">
                  {motorbike.brand} {motorbike.model} • {motorbike.presets.length} saved presets
                </p>
              </button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemoveMotorbike(motorbike.bikeId)}
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
        {selectedMotorbike ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Save current settings for {selectedMotorbike.bikeId}
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

            {selectedMotorbike.presets.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                No presets saved for this motorbike yet
              </div>
            ) : (
              <div className="space-y-2">
                {selectedMotorbike.presets.map((preset) => (
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
                            `Loaded preset "${preset.name}" for ${selectedMotorbike.bikeId}`
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
            Add a motorbike to start saving presets
          </div>
        )}
      </section>

    </div>
  );
}
