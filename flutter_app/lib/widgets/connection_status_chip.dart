import 'package:flutter/material.dart';

class ConnectionStatusChip extends StatelessWidget {
  const ConnectionStatusChip({
    super.key,
    required this.isConnected,
    required this.onConnect,
    required this.onDisconnect,
  });

  final bool isConnected;
  final VoidCallback onConnect;
  final VoidCallback onDisconnect;

  @override
  Widget build(BuildContext context) {
    if (isConnected) {
      return FilledButton.icon(
        onPressed: onDisconnect,
        icon: const Icon(Icons.bluetooth_disabled_outlined),
        label: const Text('Disconnect'),
      );
    }

    return OutlinedButton.icon(
      onPressed: onConnect,
      icon: const Icon(Icons.bluetooth_searching),
      label: const Text('Connect'),
    );
  }
}
