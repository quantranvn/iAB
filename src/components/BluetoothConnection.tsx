import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  AlertCircle,
  Bluetooth,
  BluetoothConnected,
  Loader2,
  Plug,
  Settings,
} from "lucide-react";
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

  if (isConnected) {
    return (
      <div className="space-y-10 pb-8">
        <section className="space-y-6 rounded-2xl border bg-card p-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">Connected Device</h2>
            <p className="text-sm text-muted-foreground">
              Linked to {connectedName ?? "your scooter"}. You can now send lighting commands.
            </p>
          </div>
          <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
            <p className="text-sm font-medium text-primary">
              Linked to {connectedName ?? "your scooter"}.
            </p>
            <p className="mt-1 text-xs text-primary/80">
              You can now send commands and manage lighting presets.
            </p>
          </div>
          {statusMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
              <Plug className="h-4 w-4" />
              <span>{statusMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}
          <Button
            onClick={() => {
              setStatusMessage("Disconnected");
              Promise.resolve(onDisconnect()).catch((error) => {
                console.error("Failed to disconnect from device:", error);
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Unable to close the current connection. Please try again."
                );
              });
            }}
            variant="destructive"
            size="lg"
            className="relative w-full overflow-hidden py-6 flex flex-col items-center gap-1 text-center"
          >
            <span className="flex items-center gap-2 text-base font-semibold">
              <BluetoothConnected className="h-4 w-4" />
              Disconnect
            </span>
            <span className="text-xs font-medium text-destructive-foreground opacity-80">
              End the current scooter session
            </span>
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-8">
      <section className="space-y-6 rounded-2xl border bg-card p-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Connection Method</h2>
          <p className="text-sm text-muted-foreground">
            Choose how you want to link to your scooter's lighting controller.
          </p>
        </div>

        <RadioGroup
          value={connectionType}
          onValueChange={(value) => setConnectionType(value as ConnectionType)}
          className="grid gap-3 sm:grid-cols-2"
        >
          <Label
            htmlFor="connection-ble"
            className={`flex h-full cursor-pointer flex-col gap-3 rounded-lg border p-4 transition-colors ${
              connectionType === "ble"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="ble" id="connection-ble" className="mt-1" />
              <div>
                <p className="font-medium">BLE Module</p>
                <p className="text-xs text-muted-foreground">
                  Pair through the Web Bluetooth API with BLE module such as HM-10.
                </p>
              </div>
            </div>
          </Label>
          <Label
            htmlFor="connection-serial"
            className={`flex h-full cursor-pointer flex-col gap-3 rounded-lg border p-4 transition-colors ${
              connectionType === "serial"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="serial" id="connection-serial" className="mt-1" />
              <div>
                <p className="font-medium">HC-05 Serial</p>
                <p className="text-xs text-muted-foreground">
                  Use the Web Serial API after pairing the Serial module such as HC-05.
                </p>
              </div>
            </div>
          </Label>
        </RadioGroup>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Settings className="h-5 w-5" />
          <h3 className="text-lg font-semibold text-foreground">Configuration</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {connectionType === "ble"
            ? "Update service details if your BLE controller uses custom UUIDs."
            : "Set the baud rate that matches your scooter's HC-05 module."}
        </p>

        {connectionType === "ble" ? (
          <div className="grid gap-3">
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
        ) : (
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
              onChange={(event) =>
                setBaudRate(Number(event.target.value) || DEFAULT_BAUD_RATE)
              }
            />
            <p className="text-xs text-muted-foreground">
              Default is 9600 bps. Make sure it matches your module configuration.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-6 rounded-2xl border bg-card p-6">


        {errorMessage ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        ) : statusMessage ? (
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
            <Bluetooth className="h-4 w-4" />
            <span>{statusMessage}</span>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Waiting to connect to a scooter.
          </div>
        )}

        <Button
          onClick={requestDevice}
          disabled={isConnecting}
          size="lg"
          className="relative w-full overflow-y-auto px-5 py-3 flex flex-col items-center gap-1 text-center"
        >
          <span className="flex items-center gap-2 text-base font-semibold">
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bluetooth className="h-4 w-4" />
            )}
            {isConnecting ? "Connecting..." : "Connect to Device"}
          </span>

          <span className="flex items-center gap-2 text-xs font-medium text-primary-foreground opacity-80">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isConnecting ? "bg-amber-300 animate-pulse" : "bg-destructive"
              }`}
            />
            {isConnecting ? "Attempting link" : "No active connection"}
          </span>

          {isConnecting && (
            <div className="absolute inset-0 animate-pulse bg-primary/15" />
          )}
        </Button>
      </section>
    </div>
  );
}
