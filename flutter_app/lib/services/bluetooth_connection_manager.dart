import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_blue_plus/flutter_blue_plus.dart';

/// Handles discovery, connection and command transmission for BLE scooters.
///
/// The implementation mirrors the behaviour of the web app which talks to a
/// HM-10/HC-05 compatible module exposing a writable characteristic that
/// accepts AT-style lighting commands.
class BluetoothConnectionManager {
  BluetoothConnectionManager();

  static const String defaultServiceUuid = '0000ffe0-0000-1000-8000-00805f9b34fb';
  static const String defaultCharacteristicUuid = '0000ffe1-0000-1000-8000-00805f9b34fb';

  BluetoothDevice? _device;
  BluetoothCharacteristic? _characteristic;
  String? _connectedLabel;

  /// Returns the friendly label of the connected device, if any.
  String? get connectedDeviceLabel => _connectedLabel;

  /// Whether there is an active BLE characteristic ready to receive commands.
  bool get isConnected => _characteristic != null;

  /// Computes a user friendly label for a scan result.
  String labelForResult(ScanResult result) => _labelForResult(result);

  /// Discovers nearby BLE peripherals that expose lighting characteristics.
  Future<List<ScanResult>> scanForDevices({Duration timeout = const Duration(seconds: 6)}) async {
    final seen = <String, ScanResult>{};
    StreamSubscription<List<ScanResult>>? subscription;

    try {
      subscription = FlutterBluePlus.instance.scanResults.listen((results) {
        for (final result in results) {
          final key = result.device.remoteId.str;
          seen[key] = result;
        }
      });

      await FlutterBluePlus.instance.startScan(timeout: timeout);
      await Future<void>.delayed(timeout);
    } finally {
      await FlutterBluePlus.instance.stopScan();
      await subscription?.cancel();
    }

    final sorted = seen.values.toList()
      ..sort((a, b) {
        final nameA = _labelForResult(a).toLowerCase();
        final nameB = _labelForResult(b).toLowerCase();
        return nameA.compareTo(nameB);
      });

    return sorted;
  }

  /// Connects to the provided [result] using the supplied UUID strings.
  Future<void> connect(
    ScanResult result, {
    String serviceUuid = defaultServiceUuid,
    String characteristicUuid = defaultCharacteristicUuid,
  }) async {
    final device = result.device;

    await FlutterBluePlus.instance.stopScan();

    // Close any existing connection before opening a new one.
    if (_device != null) {
      await disconnect();
    }

    await device.connect(timeout: const Duration(seconds: 15));

    final services = await device.discoverServices();
    final serviceGuid = Guid(serviceUuid.toLowerCase());
    final characteristicGuid = Guid(characteristicUuid.toLowerCase());

    BluetoothCharacteristic? targetCharacteristic;

    for (final service in services) {
      if (service.serviceUuid == serviceGuid) {
        for (final characteristic in service.characteristics) {
          if (characteristic.characteristicUuid == characteristicGuid) {
            targetCharacteristic = characteristic;
            break;
          }
        }

        if (targetCharacteristic != null) {
          break;
        }
      }
    }

    if (targetCharacteristic == null) {
      await device.disconnect();
      throw StateError('Characteristic $characteristicUuid not found on the selected device.');
    }

    _device = device;
    _characteristic = targetCharacteristic;
    _connectedLabel = _labelForResult(result);
  }

  /// Sends the provided [command] to the connected BLE characteristic.
  Future<void> send(Uint8List command) async {
    final characteristic = _characteristic;

    if (characteristic == null) {
      throw StateError('No BLE characteristic is currently connected.');
    }

    final supportsWithoutResponse = characteristic.properties.writeWithoutResponse;
    await characteristic.write(command, withoutResponse: supportsWithoutResponse);
  }

  /// Disconnects from the active device, if any.
  Future<void> disconnect() async {
    final device = _device;

    _device = null;
    _characteristic = null;
    _connectedLabel = null;

    if (device != null) {
      await device.disconnect();
    }
  }

  /// Returns a human readable name for a scan result.
  String _labelForResult(ScanResult result) {
    final advertised = result.advertisementData.advName.trim();
    if (advertised.isNotEmpty) {
      return advertised;
    }

    final remoteId = result.device.remoteId.str;
    if (remoteId.isNotEmpty) {
      return remoteId;
    }

    return 'Unknown Device';
  }
}
