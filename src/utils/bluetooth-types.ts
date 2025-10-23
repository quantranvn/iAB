export type BluetoothConnectionTransport =
  | {
      type: "ble";
      device: BluetoothDevice;
      characteristic: BluetoothRemoteGATTCharacteristic;
    }
  | {
      type: "serial";
      port: SerialPort;
      writer: WritableStreamDefaultWriter<Uint8Array>;
      label: string;
      baudRate: number;
    };
