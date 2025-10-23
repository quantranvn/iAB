import { ChangeEvent, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Car,
  Download,
  Save,
  Store,
  Trash2,
  User,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

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

interface VehicleProfile {
  id: string;
  presets: Preset[];
}

interface UserProfile {
  userId: string;
  username: string;
  vehicles: VehicleProfile[];
}

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
  appStoreConnected: boolean;
  onToggleAppStoreConnection: () => void;
}

const initialProfile: UserProfile = {
  userId: "rider-001",
  username: "Night Rider",
  vehicles: [
    {
      id: "SCT-042",
      presets: [
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
      ],
    },
    {
      id: "SCT-099",
      presets: [
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
      ],
    },
  ],
};

export function UserProfileManager({
  currentSettings,
  onLoadPreset,
  appStoreConnected,
  onToggleAppStoreConnection,
}: UserProfileManagerProps) {
  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfile);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    initialProfile.vehicles[0]?.id ?? ""
  );
  const [newVehicleId, setNewVehicleId] = useState("");
  const [presetName, setPresetName] = useState("");

  const selectedVehicle = useMemo(() => {
    return userProfile.vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  }, [selectedVehicleId, userProfile.vehicles]);

  const handleUpdateProfileField = (field: "userId" | "username") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setUserProfile((prev) => ({ ...prev, [field]: value }));
    };

  const handleAddVehicle = () => {
    const vehicleId = newVehicleId.trim();
    if (!vehicleId) {
      toast.error("Please enter a vehicle ID");
      return;
    }

    if (userProfile.vehicles.some((vehicle) => vehicle.id === vehicleId)) {
      toast.error("Vehicle ID already exists");
      return;
    }

    const updatedVehicles = [
      ...userProfile.vehicles,
      { id: vehicleId, presets: [] },
    ];

    setUserProfile((prev) => ({
      ...prev,
      vehicles: updatedVehicles,
    }));
    setSelectedVehicleId(vehicleId);
    setNewVehicleId("");
    toast.success(`Vehicle ${vehicleId} added`);
  };

  const handleRemoveVehicle = (vehicleId: string) => {
    if (userProfile.vehicles.length === 1) {
      toast.error("At least one vehicle is required");
      return;
    }

    const updatedVehicles = userProfile.vehicles.filter(
      (vehicle) => vehicle.id !== vehicleId
    );

    setUserProfile((prev) => ({
      ...prev,
      vehicles: updatedVehicles,
    }));

    if (selectedVehicleId === vehicleId) {
      setSelectedVehicleId(updatedVehicles[0]?.id ?? "");
    }

    toast.success(`Vehicle ${vehicleId} removed`);
  };

  const handleSavePreset = () => {
    if (!selectedVehicle) {
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
      ...currentSettings,
      timestamp: Date.now(),
    };

    setUserProfile((prev) => ({
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

    setUserProfile((prev) => ({
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

  return (
    <div className="space-y-8">
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

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5" />
          <h3>AppStore Connection</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Link your profile to the Scooter AppStore to discover curated animation
          packs.
        </p>
        <Button
          variant={appStoreConnected ? "default" : "outline"}
          onClick={onToggleAppStoreConnection}
        >
          <Store className="w-4 h-4 mr-2" />
          {appStoreConnected ? "Connected to AppStore" : "Connect to AppStore"}
        </Button>
      </section>
    </div>
  );
}
