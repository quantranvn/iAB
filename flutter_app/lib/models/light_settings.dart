import 'package:flutter/material.dart';

/// Represents the adjustable RGB and intensity values for a scooter light.
class LightSettings {
  const LightSettings({
    required this.red,
    required this.green,
    required this.blue,
    required this.intensity,
  });

  /// Creates a [LightSettings] instance from JSON data.
  factory LightSettings.fromJson(Map<String, dynamic> json) {
    return LightSettings(
      red: json['red'] as int? ?? 0,
      green: json['green'] as int? ?? 0,
      blue: json['blue'] as int? ?? 0,
      intensity: json['intensity'] as int? ?? 0,
    );
  }

  /// The red channel value (0-255).
  final int red;

  /// The green channel value (0-255).
  final int green;

  /// The blue channel value (0-255).
  final int blue;

  /// The output intensity percentage (0-100).
  final int intensity;

  /// Returns the Flutter [Color] represented by the RGB channels.
  Color toColor() => Color.fromARGB(255, red, green, blue);

  /// Copies this instance with optional overrides.
  LightSettings copyWith({
    int? red,
    int? green,
    int? blue,
    int? intensity,
  }) {
    return LightSettings(
      red: red ?? this.red,
      green: green ?? this.green,
      blue: blue ?? this.blue,
      intensity: intensity ?? this.intensity,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'red': red,
      'green': green,
      'blue': blue,
      'intensity': intensity,
    };
  }
}
