import { BluetoothConnectionTransport } from "./bluetooth-types";

/**
 * AT Command Generator for Scooter Smart Lights
 * Based on the protocol specification:
 * - Request Color: [0, 1, Red, Green, Blue, Intensity, 0x0D, 0x0A]
 * - Request Animation: [Scenario(1-4), 2, Red, Green, Blue, Intensity, 0x0D, 0x0A]
 */

interface LightSettings {
  red: number;      // 0-255
  green: number;    // 0-255
  blue: number;     // 0-255
  intensity: number; // 0-100 (will be converted to 0-20)
}

export class BluetoothCommandGenerator {
  /**
   * Convert intensity from UI scale (0-100) to AT command scale (0-20)
   */
  private static convertIntensity(intensity: number): number {
    return Math.round((intensity / 100) * 20);
  }

  /**
   * Generate AT command for color request
   * Format: [0, 1, Red, Green, Blue, Intensity, 0x0D, 0x0A]
   */
  static generateColorCommand(settings: LightSettings): Uint8Array {
    const intensity = this.convertIntensity(settings.intensity);
    return new Uint8Array([
      0,                    // Type Ani (0 for color)
      1,                    // Type (Color/Ani)
      settings.red,         // Red (0-255)
      settings.green,       // Green (0-255)
      settings.blue,        // Blue (0-255)
      intensity,            // Intensity (0-20)
      0x0D,                 // End Byte 1 (CR)
      0x0A                  // End Byte 2 (LF)
    ]);
  }

  /**
   * Generate AT command for animation request
   * Format: [Scenario(1-4), 2, Red, Green, Blue, Intensity, 0x0D, 0x0A]
   */
  static generateAnimationCommand(
    scenario: number,
    settings: LightSettings
  ): Uint8Array {
    const intensity = this.convertIntensity(settings.intensity);
    return new Uint8Array([
      scenario,             // Type Ani (1-4 for animation scenario)
      2,                    // Type (Color/Ani)
      settings.red,         // Red (0-255)
      settings.green,       // Green (0-255)
      settings.blue,        // Blue (0-255)
      intensity,            // Intensity (0-20)
      0x0D,                 // End Byte 1 (CR)
      0x0A                  // End Byte 2 (LF)
    ]);
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
 * // For color control (e.g., Turn Indicator)
 * const colorCmd = BluetoothCommandGenerator.generateColorCommand({
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
