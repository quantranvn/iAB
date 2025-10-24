import 'package:flutter/material.dart';

class ConnectionStatusChip extends StatelessWidget {
  const ConnectionStatusChip({
    super.key,
    required this.isConnected,
    this.isBusy = false,
    required this.onConnect,
    required this.onDisconnect,
  });

  final bool isConnected;
  final bool isBusy;
  final VoidCallback onConnect;
  final VoidCallback onDisconnect;

  @override
  Widget build(BuildContext context) {
    if (isConnected) {
      return FilledButton.icon(
        onPressed: isBusy ? null : onDisconnect,
        icon: const Icon(Icons.bluetooth_disabled_outlined),
        label: const Text('Disconnect'),
      );
    }

    return OutlinedButton.icon(
      onPressed: isBusy ? null : onConnect,
      icon: isBusy
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.bluetooth_searching),
      label: Text(isBusy ? 'Connecting…' : 'Connect'),
    );
  }
}
