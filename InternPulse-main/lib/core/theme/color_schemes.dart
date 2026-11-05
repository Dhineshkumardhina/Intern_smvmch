import 'package:flutter/material.dart';

/// Design tokens derived from Google Stitch UI/UX specifications for InternPulse
class PulseColors {
  PulseColors._();

  // Core M3 Primary & Containers
  static const Color primary = Color(0xFF24389C);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color primaryContainer = Color(0xFF3F51B5);
  static const Color onPrimaryContainer = Color(0xFFCACFFF);
  static const Color primaryFixed = Color(0xFFDEE0FF);
  static const Color primaryFixedDim = Color(0xFFBAC3FF);
  static const Color onPrimaryFixed = Color(0xFF00105C);
  static const Color onPrimaryFixedVariant = Color(0xFF293CA0);

  // Secondary
  static const Color secondary = Color(0xFF515F74);
  static const Color onSecondary = Color(0xFFFFFFFF);
  static const Color secondaryContainer = Color(0xFFD5E3FC);
  static const Color onSecondaryContainer = Color(0xFF57657A);
  static const Color secondaryFixed = Color(0xFFD5E3FC);
  static const Color secondaryFixedDim = Color(0xFFB9C7DF);
  static const Color onSecondaryFixed = Color(0xFF0D1C2E);
  static const Color onSecondaryFixedVariant = Color(0xFF3A485B);

  // Tertiary
  static const Color tertiary = Color(0xFF6C3400);
  static const Color onTertiary = Color(0xFFFFFFFF);
  static const Color tertiaryContainer = Color(0xFF8F4700);
  static const Color onTertiaryContainer = Color(0xFFFFC7A2);
  static const Color tertiaryFixed = Color(0xFFFFDCC6);
  static const Color tertiaryFixedDim = Color(0xFFFFB784);
  static const Color onTertiaryFixed = Color(0xFF301400);
  static const Color onTertiaryFixedVariant = Color(0xFF713700);

  // Surfaces & Background
  static const Color background = Color(0xFFFBF8FF);
  static const Color onBackground = Color(0xFF1A1B22);
  static const Color surface = Color(0xFFFBF8FF);
  static const Color onSurface = Color(0xFF1A1B22);
  static const Color surfaceVariant = Color(0xFFE3E1EA);
  static const Color onSurfaceVariant = Color(0xFF454652);
  static const Color surfaceDim = Color(0xFFDBD9E2);
  static const Color surfaceBright = Color(0xFFFBF8FF);
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color surfaceContainerLow = Color(0xFFF4F2FC);
  static const Color surfaceContainer = Color(0xFFEFEDF6);
  static const Color surfaceContainerHigh = Color(0xFFE9E7F0);
  static const Color surfaceContainerHighest = Color(0xFFE3E1EA);

  // Outlines & Borders
  static const Color outline = Color(0xFF757684);
  static const Color outlineVariant = Color(0xFFC5C5D4);

  // Status & Error
  static const Color error = Color(0xFFBA1A1A);
  static const Color onError = Color(0xFFFFFFFF);
  static const Color errorContainer = Color(0xFFFFDAD6);
  static const Color onErrorContainer = Color(0xFF93000A);

  // Semantic Status Tints
  static const Color success = Color(0xFF10B981);
  static const Color successContainer = Color(0xFFD1FAE5);
  static const Color warning = Color(0xFFD97706);
  static const Color warningContainer = Color(0xFFFEF3C7);
}
