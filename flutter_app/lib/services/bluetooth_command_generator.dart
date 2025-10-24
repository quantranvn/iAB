import 'dart:math';
import 'dart:typed_data';

import '../models/light_settings.dart';

/// Utility class that mirrors the Bluetooth command generation logic from the
/// React reference implementation.
class BluetoothCommandGenerator {
  const BluetoothCommandGenerator._();

  /// Converts the UI intensity (0-100) to the command scale (0-20) using 5%
  /// increments. The resulting values are clamped within the expected range.
  static int convertIntensity(int intensity) {
    final normalized = intensity.clamp(0, 100);
    return (normalized / 5).round();
  }

  /// Clamps the provided color channel to a byte value between 0 and 255.
  static int clampColor(int value) => value.clamp(0, 255);

  static Uint8List _createCommand(int commandId, int commandType, LightSettings settings) {
    final red = clampColor(settings.red);
    final green = clampColor(settings.green);
    final blue = clampColor(settings.blue);
    final intensity = convertIntensity(settings.intensity);

    return Uint8List.fromList(<int>[
      commandId,
      commandType,
      red,
      green,
      blue,
      intensity,
      0x0D,
      0x0A,
    ]);
  }

  /// Generates a color command where [type] corresponds to the light channel.
  static Uint8List generateColorCommand(int type, LightSettings settings) {
    return _createCommand(0, type, settings);
  }

  /// Generates an animation command for the specified [scenario].
  static Uint8List generateAnimationCommand(int scenario, LightSettings settings) {
    return _createCommand(1, scenario, settings);
  }

  /// Converts the raw command bytes to a hexadecimal string representation.
  static String toHexString(Uint8List command) {
    final buffer = StringBuffer();
    for (var i = 0; i < command.length; i++) {
      buffer.write(command[i].toRadixString(16).padLeft(2, '0').toUpperCase());
      if (i != command.length - 1) {
        buffer.write(' ');
      }
    }
    return buffer.toString();
  }

  /// Formats a verbose description of the command for the history log.
  static String describeCommand({
    required String label,
    required int commandId,
    required int type,
    required LightSettings settings,
  }) {
    final intensityLevel = (settings.intensity / 5).round();
    final name = commandId == 0 ? 'Cmd 0x00' : 'Cmd 0x01';
    final typeHex = type.toRadixString(16).padLeft(2, '0');
    return '$label ($name, Type 0x$typeHex): RGB(${settings.red}, ${settings.green}, ${settings.blue}), '
        'Intensity: ${settings.intensity}% (Level $intensityLevel)';
  }

  /// Provides a pseudo-random identifier for mock commands when we are not
  /// connected to a real device.
  static String generateMockId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = Random(timestamp).nextInt(0xFFFF);
    return 'CMD-${timestamp.toRadixString(16)}-${random.toRadixString(16)}';
  }
}

/// Holds information about a generated command for display in the UI.
class CommandLogEntry {
  CommandLogEntry({
    required this.timestamp,
    required this.hexString,
    required this.bytes,
    required this.description,
  });

  final DateTime timestamp;
  final String hexString;
  final List<int> bytes;
  final String description;
}
