import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Bluetooth, BluetoothConnected, Loader2 } from "lucide-react";

export interface BluetoothConnectionResult {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

interface BluetoothConnectionProps {
  isConnected: boolean;
  connectedDevice: BluetoothDevice | null;
  onConnect: (result: BluetoothConnectionResult) => void;
  onDisconnect: () => void;
}

const DEFAULT_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
const DEFAULT_CHARACTERISTIC_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";

export function BluetoothConnection({
  isConnected,
  connectedDevice,
  onConnect,
  onDisconnect,
}: BluetoothConnectionProps) {
  const [serviceUuid, setServiceUuid] = useState<string>(DEFAULT_SERVICE_UUID);
  const [characteristicUuid, setCharacteristicUuid] = useState<string>(DEFAULT_CHARACTERISTIC_UUID);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) {
      setStatusMessage(null);
    }
  }, [isConnected]);

  const requestDevice = async () => {
    if (!("bluetooth" in navigator)) {
      setErrorMessage("Web Bluetooth API is not supported in this browser.");
      return;
    }

    const trimmedService = serviceUuid.trim();
    const trimmedCharacteristic = characteristicUuid.trim();

    if (!trimmedService || !trimmedCharacteristic) {
      setErrorMessage("Service and characteristic UUIDs are required.");
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [trimmedService],
      });

      setStatusMessage(`Connecting to ${device.name ?? "device"}...`);

      const gattServer = await device.gatt?.connect();

      if (!gattServer) {
        throw new Error("Unable to open GATT server on the selected device.");
      }

      const service = await gattServer.getPrimaryService(trimmedService as BluetoothServiceUUID);
      const characteristic = await service.getCharacteristic(trimmedCharacteristic as BluetoothCharacteristicUUID);

      onConnect({ device, characteristic });
      setStatusMessage(`Connected to ${device.name ?? "Bluetooth device"}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect to Bluetooth device.";
      setErrorMessage(message);
      setStatusMessage(null);
    } finally {
      setIsConnecting(false);
    }
  };

  if (isConnected && connectedDevice) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <BluetoothConnected className="w-8 h-8 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <h4 className="text-green-600 dark:text-green-400">Connected</h4>
            <p className="text-muted-foreground">{connectedDevice.name ?? connectedDevice.id}</p>
            {statusMessage && <p className="text-xs text-muted-foreground mt-1">{statusMessage}</p>}
          </div>
        </div>

        <Button
          onClick={() => {
            setStatusMessage('Disconnected');
            onDisconnect();
          }}
          variant="destructive"
          className="w-full"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          Use the Web Bluetooth API to pair with your scooter's lighting controller. Update the UUIDs if your device uses a
          different service or characteristic.
        </p>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ble-service">Service UUID</Label>
            <Input
              id="ble-service"
              value={serviceUuid}
              onChange={(event) => setServiceUuid(event.target.value)}
              placeholder="e.g. 0000ffe0-0000-1000-8000-00805f9b34fb"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ble-characteristic">Characteristic UUID</Label>
            <Input
              id="ble-characteristic"
              value={characteristicUuid}
              onChange={(event) => setCharacteristicUuid(event.target.value)}
              placeholder="e.g. 0000ffe1-0000-1000-8000-00805f9b34fb"
            />
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive">
          {errorMessage}
        </div>
      )}

      {statusMessage && !errorMessage && (
        <div className="p-3 text-sm rounded-md border border-primary/20 bg-primary/10 text-primary-foreground/80">
          {statusMessage}
        </div>
      )}

      <Button onClick={requestDevice} disabled={isConnecting} className="w-full">
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Bluetooth className="w-4 h-4 mr-2" />
            Connect to Device
          </>
        )}
      </Button>
    </div>
  );
}
