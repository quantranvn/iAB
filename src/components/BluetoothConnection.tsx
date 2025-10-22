import { useState } from "react";
import { Button } from "./ui/button";
import { Bluetooth, BluetoothConnected, Loader2, RefreshCw } from "lucide-react";

interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number;
}

interface BluetoothConnectionProps {
  isConnected: boolean;
  onConnect: (deviceId: string) => void;
  onDisconnect: () => void;
}

export function BluetoothConnection({
  isConnected,
  onConnect,
  onDisconnect,
}: BluetoothConnectionProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([
    { id: "sc001", name: "Scooter Light Pro", rssi: -45 },
    { id: "sc002", name: "Smart Light X1", rssi: -62 },
    { id: "sc003", name: "LED Controller", rssi: -78 },
  ]);

  const handleScan = () => {
    setIsScanning(true);
    // Simulate scanning
    setTimeout(() => {
      setDevices([
        { id: "sc001", name: "Scooter Light Pro", rssi: -45 },
        { id: "sc002", name: "Smart Light X1", rssi: -62 },
        { id: "sc003", name: "LED Controller", rssi: -78 },
        { id: "sc004", name: "RGB Strip 2.4", rssi: -85 },
      ]);
      setIsScanning(false);
    }, 2000);
  };

  const getSignalStrength = (rssi: number) => {
    if (rssi > -50) return { bars: 3, label: "Excellent" };
    if (rssi > -70) return { bars: 2, label: "Good" };
    return { bars: 1, label: "Weak" };
  };

  if (isConnected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <BluetoothConnected className="w-8 h-8 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <h4 className="text-green-600 dark:text-green-400">Connected</h4>
            <p className="text-muted-foreground">Scooter Light Pro</p>
          </div>
        </div>
        
        <Button
          onClick={onDisconnect}
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
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Available Devices</p>
        <Button
          onClick={handleScan}
          disabled={isScanning}
          variant="outline"
          size="sm"
        >
          {isScanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="space-y-2">
        {devices.map((device) => {
          const signal = getSignalStrength(device.rssi);
          
          return (
            <button
              key={device.id}
              onClick={() => onConnect(device.id)}
              className="w-full p-4 rounded-lg bg-card border-2 border-border hover:border-primary/50 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <Bluetooth className="w-6 h-6 text-primary" />
                <div className="flex-1">
                  <h4>{device.name}</h4>
                  <p className="text-muted-foreground">Signal: {signal.label}</p>
                </div>
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-${(i + 1) * 2} rounded-full ${
                        i < signal.bars ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
