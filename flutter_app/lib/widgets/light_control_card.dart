import 'package:flutter/material.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';

import '../models/light_settings.dart';
import '../services/bluetooth_command_generator.dart';

typedef LightChangedCallback = void Function(LightSettings settings);
typedef CommandGeneratedCallback = void Function(CommandLogEntry entry);

class LightControlCard extends StatelessWidget {
  const LightControlCard({
    super.key,
    required this.title,
    required this.icon,
    required this.initialSettings,
    required this.commandType,
    required this.onChanged,
    required this.onCommandGenerated,
  });

  final String title;
  final IconData icon;
  final LightSettings initialSettings;
  final int commandType;
  final LightChangedCallback onChanged;
  final CommandGeneratedCallback onCommandGenerated;

  @override
  Widget build(BuildContext context) {
    return _LightControlCardBody(
      title: title,
      icon: icon,
      commandType: commandType,
      initialSettings: initialSettings,
      onChanged: onChanged,
      onCommandGenerated: onCommandGenerated,
    );
  }
}

class _LightControlCardBody extends StatefulWidget {
  const _LightControlCardBody({
    required this.title,
    required this.icon,
    required this.initialSettings,
    required this.commandType,
    required this.onChanged,
    required this.onCommandGenerated,
  });

  final String title;
  final IconData icon;
  final LightSettings initialSettings;
  final int commandType;
  final LightChangedCallback onChanged;
  final CommandGeneratedCallback onCommandGenerated;

  @override
  State<_LightControlCardBody> createState() => _LightControlCardBodyState();
}

class _LightControlCardBodyState extends State<_LightControlCardBody> {
  late LightSettings _settings;

  @override
  void initState() {
    super.initState();
    _settings = widget.initialSettings;
  }

  @override
  void didUpdateWidget(covariant _LightControlCardBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialSettings != widget.initialSettings) {
      _settings = widget.initialSettings;
    }
  }

  void _emitCommand() {
    final bytes = BluetoothCommandGenerator.generateColorCommand(widget.commandType, _settings);
    final hexString = BluetoothCommandGenerator.toHexString(bytes);
    final description = BluetoothCommandGenerator.describeCommand(
      label: widget.title,
      commandId: 0,
      type: widget.commandType,
      settings: _settings,
    );

    widget.onCommandGenerated(
      CommandLogEntry(
        timestamp: DateTime.now(),
        hexString: hexString,
        bytes: bytes.toList(),
        description: description,
      ),
    );
  }

  Future<void> _showColorPicker() async {
    final Color currentColor = _settings.toColor();
    Color tempColor = currentColor;
    await showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('Select ${widget.title} Color'),
          content: SingleChildScrollView(
            child: BlockPicker(
              pickerColor: currentColor,
              onColorChanged: (value) => tempColor = value,
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                setState(() {
                  _settings = _settings.copyWith(
                    red: tempColor.red,
                    green: tempColor.green,
                    blue: tempColor.blue,
                  );
                });
                widget.onChanged(_settings);
                _emitCommand();
                Navigator.of(context).pop();
              },
              child: const Text('Apply'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildSlider({
    required String label,
    required int value,
    required int max,
    required ValueChanged<double> onChanged,
    int divisions = 255,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: <Widget>[
            Text(label, style: Theme.of(context).textTheme.bodyMedium),
            Text(value.toString(), style: Theme.of(context).textTheme.labelMedium),
          ],
        ),
        Slider(
          value: value.toDouble(),
          min: 0,
          max: max.toDouble(),
          divisions: divisions,
          label: '$value',
          onChanged: onChanged,
          onChangeEnd: (_) {
            widget.onChanged(_settings);
            _emitCommand();
          },
        ),
      ],
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
                Icon(widget.icon, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _settings.toColor(),
                    border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: _showColorPicker,
                  icon: const Icon(Icons.palette_outlined),
                  label: const Text('Color'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildSlider(
              label: 'Red',
              value: _settings.red,
              max: 255,
              onChanged: (value) {
                setState(() {
                  _settings = _settings.copyWith(red: value.round());
                });
              },
            ),
            _buildSlider(
              label: 'Green',
              value: _settings.green,
              max: 255,
              onChanged: (value) {
                setState(() {
                  _settings = _settings.copyWith(green: value.round());
                });
              },
            ),
            _buildSlider(
              label: 'Blue',
              value: _settings.blue,
              max: 255,
              onChanged: (value) {
                setState(() {
                  _settings = _settings.copyWith(blue: value.round());
                });
              },
            ),
            _buildSlider(
              label: 'Intensity (%)',
              value: _settings.intensity,
              max: 100,
              divisions: 20,
              onChanged: (value) {
                setState(() {
                  _settings = _settings.copyWith(intensity: value.round());
                });
              },
            ),
          ],
        ),
      ),
    );
  }
}
