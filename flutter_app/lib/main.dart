import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

import 'models/light_settings.dart';
import 'widgets/animation_control_card.dart';
import 'widgets/command_log.dart';
import 'widgets/connection_status_chip.dart';
import 'widgets/light_control_card.dart';
import 'services/bluetooth_connection_manager.dart';

void main() {
  runApp(const IntelligentAmbientBeamApp());
}

class IntelligentAmbientBeamApp extends StatelessWidget {
  const IntelligentAmbientBeamApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Intelligent Ambient Beam',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.orangeAccent),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const Map<String, int> basicLightTypes = <String, int>{
    'Turn Indicator': 3,
    'Low Beam': 1,
    'High Beam': 2,
    'Brake Light': 4,
  };

  late Map<String, LightSettings> _lightSettings;
  LightSettings _animationSettings = const LightSettings(red: 128, green: 0, blue: 255, intensity: 100);
  bool _connected = false;
  bool _isConnecting = false;
  String? _connectedName;
  String? _connectionStatus;
  String? _connectionError;
  late final BluetoothConnectionManager _connectionManager;
  late final TextEditingController _serviceController;
  late final TextEditingController _characteristicController;
  final List<CommandLogEntry> _commandHistory = <CommandLogEntry>[];

  @override
  void initState() {
    super.initState();
    _connectionManager = BluetoothConnectionManager();
    _serviceController = TextEditingController(text: BluetoothConnectionManager.defaultServiceUuid);
    _characteristicController = TextEditingController(text: BluetoothConnectionManager.defaultCharacteristicUuid);
    _lightSettings = <String, LightSettings>{
      'Turn Indicator': const LightSettings(red: 255, green: 165, blue: 0, intensity: 100),
      'Low Beam': const LightSettings(red: 255, green: 255, blue: 200, intensity: 80),
      'High Beam': const LightSettings(red: 255, green: 255, blue: 255, intensity: 100),
      'Brake Light': const LightSettings(red: 255, green: 0, blue: 0, intensity: 100),
    };
  }

  @override
  void dispose() {
    unawaited(_connectionManager.disconnect());
    _serviceController.dispose();
    _characteristicController.dispose();
    super.dispose();
  }

  void _handleCommand(CommandLogEntry entry) {
    setState(() {
      _commandHistory.insert(0, entry);
      if (_commandHistory.length > 50) {
        _commandHistory.removeLast();
      }
    });
  }

  Future<void> _connectToDevice() async {
    final selected = await showModalBottomSheet<ScanResult>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return _DevicePickerSheet(
          manager: _connectionManager,
          serviceController: _serviceController,
          characteristicController: _characteristicController,
        );
      },
    );

    if (!mounted || selected == null) {
      return;
    }

    final label = _connectionManager.labelForResult(selected);
    final serviceUuid = _serviceController.text.trim().isEmpty
        ? BluetoothConnectionManager.defaultServiceUuid
        : _serviceController.text.trim();
    final characteristicUuid = _characteristicController.text.trim().isEmpty
        ? BluetoothConnectionManager.defaultCharacteristicUuid
        : _characteristicController.text.trim();

    setState(() {
      _isConnecting = true;
      _connectionError = null;
      _connectionStatus = 'Connecting to $label...';
      _connected = false;
      _connectedName = null;
    });

    _handleCommand(
      CommandLogEntry(
        timestamp: DateTime.now(),
        hexString: '---',
        bytes: const <int>[],
        description: 'Attempting to connect to $label (service $serviceUuid, characteristic $characteristicUuid).',
      ),
    );

    try {
      await _connectionManager.connect(
        selected,
        serviceUuid: serviceUuid,
        characteristicUuid: characteristicUuid,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _connected = true;
        _isConnecting = false;
        _connectedName = _connectionManager.connectedDeviceLabel ?? label;
        _connectionStatus = 'Connected to ${_connectedName ?? label}.';
      });

      _handleCommand(
        CommandLogEntry(
          timestamp: DateTime.now(),
          hexString: '---',
          bytes: const <int>[],
          description: 'Connected to ${_connectedName ?? label}. Ready to stream lighting commands.',
        ),
      );
    } catch (error) {
      final message = error is StateError ? error.message : error.toString();

      if (!mounted) {
        return;
      }

      setState(() {
        _connected = false;
        _isConnecting = false;
        _connectedName = null;
        _connectionStatus = null;
        _connectionError = message;
      });

      _handleCommand(
        CommandLogEntry(
          timestamp: DateTime.now(),
          hexString: '---',
          bytes: const <int>[],
          description: 'Failed to connect to $label: $message',
        ),
      );
    }
  }

  Future<void> _disconnectDevice() async {
    await _connectionManager.disconnect();

    if (!mounted) {
      return;
    }

    setState(() {
      _connected = false;
      _connectedName = null;
      _connectionStatus = 'Disconnected from lighting controller.';
      _connectionError = null;
    });

    _handleCommand(
      CommandLogEntry(
        timestamp: DateTime.now(),
        hexString: '---',
        bytes: const <int>[],
        description: 'Disconnected from lighting controller.',
      ),
    );
  }

  Future<void> _sendCommand(CommandLogEntry entry) async {
    if (!_connectionManager.isConnected) {
      _handleCommand(
        CommandLogEntry(
          timestamp: entry.timestamp,
          hexString: entry.hexString,
          bytes: entry.bytes,
          description: '[Not sent] ${entry.description} (no active connection).',
        ),
      );
      return;
    }

    try {
      await _connectionManager.send(Uint8List.fromList(entry.bytes));
      _handleCommand(
        CommandLogEntry(
          timestamp: entry.timestamp,
          hexString: entry.hexString,
          bytes: entry.bytes,
          description: "${entry.description} → Sent to ${_connectedName ?? 'device'}."
        ),
      );
    } catch (error) {
      final message = error is StateError ? error.message : error.toString();
      _handleCommand(
        CommandLogEntry(
          timestamp: DateTime.now(),
          hexString: entry.hexString,
          bytes: entry.bytes,
          description: '[Error] ${entry.description} (Failed: $message)',
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Intelligent Ambient Beam'),
        actions: <Widget>[
          IconButton(
            tooltip: 'App Store',
            onPressed: () {
              showAboutDialog(
                context: context,
                applicationName: 'Intelligent Ambient Beam',
                applicationVersion: '0.1.0',
                applicationIcon: const Icon(Icons.bolt),
                children: const <Widget>[
                  Text('A Flutter port of the scooter lighting controller prototype.'),
                ],
              );
            },
            icon: const Icon(Icons.storefront_outlined),
          ),
          IconButton(
            tooltip: 'Usage Guide',
            icon: const Icon(Icons.menu_book_outlined),
            onPressed: () {
              showModalBottomSheet<void>(
                context: context,
                showDragHandle: true,
                builder: (context) {
                  return Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: const <Widget>[
                        Text('Usage Tips', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        SizedBox(height: 12),
                        Text('• Connect to your scooter via Bluetooth before adjusting the lights.'),
                        Text('• Each adjustment emits an AT command compatible with the original app.'),
                        Text('• Use the command log to debug values and share presets.'),
                      ],
                    ),
                  );
                },
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth > 900;
          final controls = _buildControls(context, isWide);
          final log = _buildCommandLog();

          if (isWide) {
            return Row(
              children: <Widget>[
                Expanded(flex: 3, child: controls),
                const VerticalDivider(width: 1),
                Expanded(flex: 2, child: log),
              ],
            );
          }

          return Column(
            children: <Widget>[
              Expanded(flex: 3, child: controls),
              const Divider(height: 1),
              Expanded(flex: 2, child: log),
            ],
          );
        },
      ),
    );
  }

  Widget _buildControls(BuildContext context, bool isWide) {
    final children = <Widget>[
      Row(
        children: <Widget>[
          ConnectionStatusChip(
            isConnected: _connected,
            isBusy: _isConnecting,
            onConnect: () {
              _connectToDevice();
            },
            onDisconnect: () {
              _disconnectDevice();
            },
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _connected
                  ? "Connected to ${_connectedName ?? 'lighting controller'}"
                  : 'Not connected',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
      if (_connectionStatus != null) ...<Widget>[
        const SizedBox(height: 8),
        Row(
          children: <Widget>[
            const Icon(Icons.check_circle_outline, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _connectionStatus!,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ],
      if (_connectionError != null) ...<Widget>[
        const SizedBox(height: 8),
        Row(
          children: <Widget>[
            const Icon(Icons.error_outline, size: 18, color: Colors.redAccent),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _connectionError!,
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: Theme.of(context).colorScheme.error),
              ),
            ),
          ],
        ),
      ],
      const SizedBox(height: 16),
      ...basicLightTypes.entries.map((entry) {
        final settings = _lightSettings[entry.key]!;
        return LightControlCard(
          title: entry.key,
          icon: _resolveIcon(entry.key),
          initialSettings: settings,
          commandType: entry.value,
          onChanged: (updated) {
            setState(() => _lightSettings[entry.key] = updated);
          },
          onCommandGenerated: (entryLog) {
            _sendCommand(entryLog);
          },
        );
      }),
      AnimationControlCard(
        initialSettings: _animationSettings,
        onSettingsChanged: (settings) {
          setState(() => _animationSettings = settings);
        },
        onCommandGenerated: (entryLog) {
          _sendCommand(entryLog);
        },
      ),
      const SizedBox(height: 24),
    ];

    return SingleChildScrollView(
      padding: EdgeInsets.symmetric(
        vertical: 24,
        horizontal: isWide ? 32 : 16,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _buildCommandLog() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(Icons.history_outlined),
              const SizedBox(width: 8),
              Text('Command Log', style: Theme.of(context).textTheme.titleMedium),
              const Spacer(),
              IconButton(
                tooltip: 'Clear history',
                onPressed: () {
                  setState(() => _commandHistory.clear());
                },
                icon: const Icon(Icons.delete_outline),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Expanded(
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: CommandLogList(entries: _commandHistory),
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _resolveIcon(String key) {
    switch (key) {
      case 'Turn Indicator':
        return Icons.turn_right_outlined;
      case 'Low Beam':
        return Icons.light_mode_outlined;
      case 'High Beam':
        return Icons.highlight_outlined;
      case 'Brake Light':
        return Icons.stop_circle_outlined;
      default:
        return Icons.lightbulb_outline;
    }
  }
}

class _DevicePickerSheet extends StatefulWidget {
  const _DevicePickerSheet({
    required this.manager,
    required this.serviceController,
    required this.characteristicController,
  });

  final BluetoothConnectionManager manager;
  final TextEditingController serviceController;
  final TextEditingController characteristicController;

  @override
  State<_DevicePickerSheet> createState() => _DevicePickerSheetState();
}

class _DevicePickerSheetState extends State<_DevicePickerSheet> {
  List<ScanResult> _results = <ScanResult>[];
  bool _isScanning = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() {
      _isScanning = true;
      _errorMessage = null;
    });

    try {
      final results = await widget.manager.scanForDevices();
      if (!mounted) {
        return;
      }

      setState(() {
        _results = results;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _results = <ScanResult>[];
        _errorMessage = error.toString();
      });
    } finally {
      if (!mounted) {
        return;
      }

      setState(() {
        _isScanning = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(16, 16, 16, bottomInset + 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Center(
              child: Container(
                width: 48,
                height: 4,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Select Bluetooth Device',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Choose the HM-10/HC-05 compatible controller you want to pair with.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 260,
              child: _buildScanResults(context),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: widget.serviceController,
              decoration: const InputDecoration(
                labelText: 'Service UUID',
                helperText: 'Defaults to 0000ffe0-0000-1000-8000-00805f9b34fb',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: widget.characteristicController,
              decoration: const InputDecoration(
                labelText: 'Characteristic UUID',
                helperText: 'Defaults to 0000ffe1-0000-1000-8000-00805f9b34fb',
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: <Widget>[
                OutlinedButton.icon(
                  onPressed: _isScanning ? null : _refresh,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Scan again'),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScanResults(BuildContext context) {
    if (_isScanning) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Text(
          _errorMessage!,
          textAlign: TextAlign.center,
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: Theme.of(context).colorScheme.error),
        ),
      );
    }

    if (_results.isEmpty) {
      return Center(
        child: Text(
          'No Bluetooth controllers found nearby. Try scanning again or adjust the UUIDs below.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      );
    }

    return ListView.separated(
      itemCount: _results.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final result = _results[index];
        final label = widget.manager.labelForResult(result);
        final identifier = result.device.remoteId.str;
        return ListTile(
          leading: const Icon(Icons.bluetooth),
          title: Text(label),
          subtitle: Text(identifier),
          trailing: Text('${result.rssi} dBm'),
          onTap: () => Navigator.of(context).pop(result),
        );
      },
    );
  }
}
