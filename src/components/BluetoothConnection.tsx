import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Bluetooth, BluetoothConnected, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { BluetoothConnectionTransport } from "../utils/bluetooth-types";

type ConnectionType = "ble" | "serial";

interface BluetoothConnectionProps {
  transport: BluetoothConnectionTransport | null;
  onConnect: (transport: BluetoothConnectionTransport) => void;
  onDisconnect: () => void | Promise<void>;
}

const DEFAULT_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
const DEFAULT_CHARACTERISTIC_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
const DEFAULT_BAUD_RATE = 9600;

export function BluetoothConnection({ transport, onConnect, onDisconnect }: BluetoothConnectionProps) {
  const [serviceUuid, setServiceUuid] = useState<string>(DEFAULT_SERVICE_UUID);
  const [characteristicUuid, setCharacteristicUuid] = useState<string>(DEFAULT_CHARACTERISTIC_UUID);
  const [connectionType, setConnectionType] = useState<ConnectionType>("ble");
  const [baudRate, setBaudRate] = useState<number>(DEFAULT_BAUD_RATE);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!transport) {
      setStatusMessage(null);
    }
  }, [transport]);

  useEffect(() => {
    if (transport) {
      setConnectionType(transport.type);

      if (transport.type === "serial") {
        setBaudRate(transport.baudRate);
      }
    }
  }, [transport]);

  const isConnected = useMemo(() => Boolean(transport), [transport]);

  const connectedName = useMemo(() => {
    if (!transport) {
      return null;
    }

    if (transport.type === "ble") {
      return transport.device.name ?? transport.device.id;
    }

    return transport.label;
  }, [transport]);

  const requestDevice = async () => {
    setIsConnecting(true);
    setErrorMessage(null);

    try {
      if (connectionType === "serial") {
        if (!("serial" in navigator)) {
          throw new Error("Web Serial API is not supported in this browser.");
        }

        if (!baudRate || Number.isNaN(baudRate)) {
          throw new Error("Enter a valid baud rate to connect to the HC-05 module.");
        }

        const serialNavigator = navigator as Navigator & { serial: { requestPort: () => Promise<SerialPort> } };
        const port = await serialNavigator.serial.requestPort();
        await port.open({ baudRate });

        if (!port.writable) {
          throw new Error("Selected serial port is not writable.");
        }

        const writer = port.writable.getWriter() as WritableStreamDefaultWriter<Uint8Array>;
        const info = typeof port.getInfo === "function" ? port.getInfo() : undefined;
        const label = info && "usbVendorId" in info && "usbProductId" in info && info.usbVendorId && info.usbProductId
          ? `Serial device ${info.usbVendorId.toString(16).padStart(4, "0").toUpperCase()}:${info.usbProductId
              .toString(16)
              .padStart(4, "0")
              .toUpperCase()}`
          : "HC-05 Serial Port";

        onConnect({
          type: "serial",
          port,
          writer,
          label,
          baudRate,
        });

        setStatusMessage(`Connected to ${label}.`);
        return;
      }

      if (!("bluetooth" in navigator)) {
        throw new Error("Web Bluetooth API is not supported in this browser.");
      }

      const trimmedService = serviceUuid.trim();
      const trimmedCharacteristic = characteristicUuid.trim();

      if (!trimmedService || !trimmedCharacteristic) {
        throw new Error("Service and characteristic UUIDs are required.");
      }

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

      onConnect({ type: "ble", device, characteristic });
      setStatusMessage(`Connected to ${device.name ?? "Bluetooth device"}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect to Bluetooth device.";
      setErrorMessage(message);
      setStatusMessage(null);
    } finally {
      setIsConnecting(false);
    }
  };

  if (isConnected && connectedName) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <BluetoothConnected className="w-8 h-8 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <h4 className="text-green-600 dark:text-green-400">Connected</h4>
            <p className="text-muted-foreground">{connectedName}</p>
            {statusMessage && <p className="text-xs text-muted-foreground mt-1">{statusMessage}</p>}
          </div>
        </div>

        <Button
          onClick={() => {
            setStatusMessage('Disconnected');
            Promise.resolve(onDisconnect()).catch((error) => {
              console.error('Failed to disconnect from device:', error);
              setErrorMessage(
                error instanceof Error ? error.message : 'Unable to close the current connection. Please try again.'
              );
            });
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
        <Label>Connection Type</Label>
        <RadioGroup
          value={connectionType}
          onValueChange={(value) => setConnectionType(value as ConnectionType)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <Label
            htmlFor="connection-ble"
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              connectionType === "ble" ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <RadioGroupItem value="ble" id="connection-ble" className="mt-1" />
            <div>
              <p className="font-medium">BLE Module</p>
              <p className="text-xs text-muted-foreground">
                Use the Web Bluetooth API with BLE modules like the HM-10.
              </p>
            </div>
          </Label>
          <Label
            htmlFor="connection-serial"
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              connectionType === "serial" ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <RadioGroupItem value="serial" id="connection-serial" className="mt-1" />
            <div>
              <p className="font-medium">HC-05 Serial</p>
              <p className="text-xs text-muted-foreground">
                Connect to a classic Bluetooth module (HC-05) via the Web Serial API after pairing with your OS.
              </p>
            </div>
          </Label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        {connectionType === "ble" ? (
          <>
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
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              Connect to an HC-05 or other classic Bluetooth serial module. Pair the module with your computer first, then
              select the exposed serial port. The default baud rate is 9600 bps.
            </p>

            <div className="space-y-1">
              <Label htmlFor="serial-baud">Baud rate</Label>
              <Input
                id="serial-baud"
                type="number"
                inputMode="numeric"
                min={1200}
                max={230400}
                step={100}
                value={baudRate}
                onChange={(event) => setBaudRate(Number(event.target.value) || DEFAULT_BAUD_RATE)}
              />
            </div>
          </>
        )}
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
