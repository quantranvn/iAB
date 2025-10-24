import 'package:flutter/material.dart';

import 'models/light_settings.dart';
import 'widgets/animation_control_card.dart';
import 'widgets/command_log.dart';
import 'widgets/connection_status_chip.dart';
import 'widgets/light_control_card.dart';

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
  final List<CommandLogEntry> _commandHistory = <CommandLogEntry>[];

  @override
  void initState() {
    super.initState();
    _lightSettings = <String, LightSettings>{
      'Turn Indicator': const LightSettings(red: 255, green: 165, blue: 0, intensity: 100),
      'Low Beam': const LightSettings(red: 255, green: 255, blue: 200, intensity: 80),
      'High Beam': const LightSettings(red: 255, green: 255, blue: 255, intensity: 100),
      'Brake Light': const LightSettings(red: 255, green: 0, blue: 0, intensity: 100),
    };
  }

  void _handleCommand(CommandLogEntry entry) {
    setState(() {
      _commandHistory.insert(0, entry);
      if (_commandHistory.length > 50) {
        _commandHistory.removeLast();
      }
    });
  }

  void _mockConnect() {
    setState(() => _connected = true);
    final entry = CommandLogEntry(
      timestamp: DateTime.now(),
      hexString: '---',
      bytes: const <int>[],
      description: 'Connected to mock scooter lighting controller.',
    );
    _handleCommand(entry);
  }

  void _mockDisconnect() {
    setState(() => _connected = false);
    final entry = CommandLogEntry(
      timestamp: DateTime.now(),
      hexString: '---',
      bytes: const <int>[],
      description: 'Disconnected from controller.',
    );
    _handleCommand(entry);
  }

  void _sendMockCommand(CommandLogEntry entry) {
    if (!_connected) {
      final mockEntry = CommandLogEntry(
        timestamp: entry.timestamp,
        hexString: entry.hexString,
        bytes: entry.bytes,
        description: '[Mock] ${entry.description}',
      );
      _handleCommand(mockEntry);
      return;
    }

    _handleCommand(entry);
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
            onConnect: _mockConnect,
            onDisconnect: _mockDisconnect,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _connected ? 'Connected to mock device' : 'Not connected',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
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
          onCommandGenerated: _sendMockCommand,
        );
      }),
      AnimationControlCard(
        initialSettings: _animationSettings,
        onSettingsChanged: (settings) {
          setState(() => _animationSettings = settings);
        },
        onCommandGenerated: _sendMockCommand,
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
