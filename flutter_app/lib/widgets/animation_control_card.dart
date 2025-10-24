import 'package:flutter/material.dart';

import '../models/light_settings.dart';
import '../services/bluetooth_command_generator.dart';
import 'light_control_card.dart';

class AnimationControlCard extends StatefulWidget {
  const AnimationControlCard({
    super.key,
    required this.initialSettings,
    required this.onSettingsChanged,
    required this.onCommandGenerated,
  });

  final LightSettings initialSettings;
  final LightChangedCallback onSettingsChanged;
  final CommandGeneratedCallback onCommandGenerated;

  @override
  State<AnimationControlCard> createState() => _AnimationControlCardState();
}

class _AnimationControlCardState extends State<AnimationControlCard> {
  static const List<String> scenarioLabels = <String>[
    'Off',
    'Rainbow Flow',
    'Lightning Pulse',
    'Ocean Wave',
    'Starlight',
  ];

  late LightSettings _settings;
  int _scenario = 1;

  @override
  void initState() {
    super.initState();
    _settings = widget.initialSettings;
  }

  void _emitCommand() {
    final bytes = BluetoothCommandGenerator.generateAnimationCommand(_scenario, _settings);
    final hex = BluetoothCommandGenerator.toHexString(bytes);
    final description = BluetoothCommandGenerator.describeCommand(
      label: scenarioLabels[_scenario],
      commandId: 1,
      type: _scenario,
      settings: _settings,
    );

    widget.onCommandGenerated(
      CommandLogEntry(
        timestamp: DateTime.now(),
        hexString: hex,
        bytes: bytes.toList(),
        description: description,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                const Icon(Icons.animation_outlined, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Animation Studio',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                DropdownButton<int>(
                  value: _scenario,
                  onChanged: (value) {
                    if (value == null) {
                      return;
                    }
                    setState(() {
                      _scenario = value;
                    });
                    _emitCommand();
                  },
                  items: List<DropdownMenuItem<int>>.generate(
                    scenarioLabels.length,
                    (index) => DropdownMenuItem<int>(
                      value: index,
                      child: Text(scenarioLabels[index]),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Fine tune the animation color palette and intensity. Changes will emit immediate commands to the connected controller.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            LightControlCard(
              title: 'Animation Color',
              icon: Icons.color_lens_outlined,
              initialSettings: _settings,
              commandType: _scenario,
              onChanged: (settings) {
                setState(() => _settings = settings);
                widget.onSettingsChanged(settings);
              },
              onCommandGenerated: widget.onCommandGenerated,
            ),
          ],
        ),
      ),
    );
  }
}
