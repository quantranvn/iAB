import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/bluetooth_command_generator.dart';

class CommandLogList extends StatelessWidget {
  CommandLogList({super.key, required this.entries});

  final List<CommandLogEntry> entries;
  final DateFormat formatter = DateFormat('HH:mm:ss');

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) {
      return Center(
        child: Text(
          'No commands have been generated yet. Adjust a light or animation to begin.',
          style: Theme.of(context).textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
      );
    }

    return ListView.builder(
      itemCount: entries.length,
      itemBuilder: (context, index) {
        final entry = entries[index];
        return ListTile(
          dense: true,
          title: Text(entry.description),
          subtitle: Text('${formatter.format(entry.timestamp)} · ${entry.hexString}'),
          leading: const Icon(Icons.memory_outlined),
        );
      },
    );
  }
}
