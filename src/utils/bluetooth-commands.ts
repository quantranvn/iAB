import { BluetoothConnectionTransport } from "./bluetooth-types";

/**
 * AT Command Generator for Scooter Smart Lights
 * Based on the protocol specification:
 * - Request Basic Light: [0, Type(1-4), Red, Green, Blue, Intensity, 0x0D, 0x0A]
 * - Request Animation:   [1, Type(1-4), Red, Green, Blue, Intensity, 0x0D, 0x0A]
 */

interface LightSettings {
  red: number;       // 0-255
  green: number;     // 0-255
  blue: number;      // 0-255
  intensity: number; // 0-100 (will be converted to 0-20 in 5% steps)
}

export class BluetoothCommandGenerator {
  /**
   * Convert intensity from UI scale (0-100) to AT command scale (0-20)
   * using 5% increments.
   */
  private static convertIntensity(intensity: number): number {
    const normalized = Math.max(0, Math.min(100, intensity));
    return Math.round(normalized / 5);
  }

  private static clampColor(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  private static createCommand(
    commandId: number,
    commandType: number,
    settings: LightSettings
  ): Uint8Array {
    const red = this.clampColor(settings.red);
    const green = this.clampColor(settings.green);
    const blue = this.clampColor(settings.blue);
    const intensity = this.convertIntensity(settings.intensity);

    return new Uint8Array([
      commandId,           // Cmd (0 = basic light, 1 = animation)
      commandType,         // Type (specific light/animation mapping)
      red,                 // Red (0-255)
      green,               // Green (0-255)
      blue,                // Blue (0-255)
      intensity,           // Intensity (0-20, 5% steps)
      0x0D,                // End Byte 1 (CR)
      0x0A                 // End Byte 2 (LF)
    ]);
  }

  /**
   * Generate AT command for basic light requests
   * Format: [0, Type(1-4), Red, Green, Blue, Intensity, 0x0D, 0x0A]
   */
  static generateColorCommand(type: number, settings: LightSettings): Uint8Array {
    return this.createCommand(0, type, settings);
  }

  /**
   * Generate AT command for animation requests
   * Format: [1, Type(1-4), Red, Green, Blue, Intensity, 0x0D, 0x0A]
   */
  static generateAnimationCommand(
    scenario: number,
    settings: LightSettings
  ): Uint8Array {
    return this.createCommand(1, scenario, settings);
  }

  /**
   * Convert Uint8Array to hex string for debugging
   */
  static commandToHexString(command: Uint8Array): string {
    return Array.from(command)
      .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  }

  /**
   * Send command via Web Bluetooth (BLE) or Web Serial (HC-05) depending on the active transport.
   * Falls back to logging-only mode when no active connection is available.
   */
  static async sendCommand(
    transport: BluetoothConnectionTransport | null,
    command: Uint8Array
  ): Promise<void> {
    if (!transport) {
      console.log('[Mock] AT Command (not sent - no connection):', this.commandToHexString(command));
      return;
    }

    if (transport.type === "ble") {
      const { characteristic, device } = transport;
      const service = characteristic.service;
      const gattServer = device.gatt ?? null;

      if (!service || !gattServer) {
        console.warn('[BLE] Missing GATT context for characteristic, falling back to mock log.');
        console.log('[Mock] AT Command (no GATT context):', this.commandToHexString(command));
        return;
      }

      try {
        if (!gattServer.connected) {
          await gattServer.connect();
        }

        if (typeof characteristic.writeValueWithoutResponse === 'function') {
          await characteristic.writeValueWithoutResponse(command);
        } else if (typeof characteristic.writeValueWithResponse === 'function') {
          await characteristic.writeValueWithResponse(command);
        } else if (typeof characteristic.writeValue === 'function') {
          await characteristic.writeValue(command);
        } else {
          throw new Error('Bluetooth characteristic does not support writing');
        }

        console.log('[BLE] Sending AT Command:', this.commandToHexString(command));
        console.log('[BLE] Command bytes:', Array.from(command));
      } catch (error) {
        console.error('Failed to send command via BLE:', error);
        throw error;
      }

      return;
    }

    try {
      await transport.writer.write(command);
      console.log('[Serial] Sending AT Command:', this.commandToHexString(command));
      console.log('[Serial] Command bytes:', Array.from(command));
    } catch (error) {
      console.error('Failed to send command via serial:', error);
      throw error;
    }
  }
}

/**
 * Example usage:
 * 
 * // For basic light control (e.g., Low Beam)
 * const colorCmd = BluetoothCommandGenerator.generateColorCommand(1, {
 *   red: 255,
 *   green: 165,
 *   blue: 0,
 *   intensity: 100
 * });
 *
 * // For animation control
 * const animCmd = BluetoothCommandGenerator.generateAnimationCommand(1, {
 *   red: 128,
 *   green: 0,
 *   blue: 255,
 *   intensity: 80
 * });
 */
