import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'color_schemes.dart';

/// Inter typography scale matching Google Stitch specifications
class PulseTypography {
  PulseTypography._();

  static TextTheme get textTheme {
    return GoogleFonts.interTextTheme(
      const TextTheme(
        // Headline XL (40px / 48px / Bold / -0.02em)
        displayLarge: TextStyle(
          fontSize: 40,
          fontWeight: FontWeight.w700,
          height: 48 / 40,
          letterSpacing: -0.8,
          color: PulseColors.onSurface,
        ),
        // Headline LG (32px / 40px / SemiBold / -0.01em)
        headlineLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.w600,
          height: 40 / 32,
          letterSpacing: -0.32,
          color: PulseColors.onSurface,
        ),
        // Headline MD / Headline LG Mobile (24px / 32px / SemiBold)
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          height: 32 / 24,
          color: PulseColors.onSurface,
        ),
        // Title MD (18px / 24px / SemiBold)
        titleMedium: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          height: 24 / 18,
          color: PulseColors.onSurface,
        ),
        // Body LG (16px / 24px / Regular)
        bodyLarge: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w400,
          height: 24 / 16,
          color: PulseColors.onSurface,
        ),
        // Body MD (14px / 20px / Regular)
        bodyMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          height: 20 / 14,
          color: PulseColors.onSurface,
        ),
        // Label MD (12px / 16px / Medium / 0.05em)
        labelMedium: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          height: 16 / 12,
          letterSpacing: 0.6,
          color: PulseColors.onSurfaceVariant,
        ),
      ),
    );
  }
}

class AppTheme {
  AppTheme._();

  static ThemeData get lightTheme {
    final colorScheme = ColorScheme.light(
      primary: PulseColors.primary,
      onPrimary: PulseColors.onPrimary,
      primaryContainer: PulseColors.primaryContainer,
      onPrimaryContainer: PulseColors.onPrimaryContainer,
      secondary: PulseColors.secondary,
      onSecondary: PulseColors.onSecondary,
      secondaryContainer: PulseColors.secondaryContainer,
      onSecondaryContainer: PulseColors.onSecondaryContainer,
      tertiary: PulseColors.tertiary,
      onTertiary: PulseColors.onTertiary,
      tertiaryContainer: PulseColors.tertiaryContainer,
      onTertiaryContainer: PulseColors.onTertiaryContainer,
      error: PulseColors.error,
      onError: PulseColors.onError,
      errorContainer: PulseColors.errorContainer,
      onErrorContainer: PulseColors.onErrorContainer,
      surface: PulseColors.surface,
      onSurface: PulseColors.onSurface,
      surfaceContainerLowest: PulseColors.surfaceContainerLowest,
      surfaceContainerLow: PulseColors.surfaceContainerLow,
      surfaceContainer: PulseColors.surfaceContainer,
      surfaceContainerHigh: PulseColors.surfaceContainerHigh,
      surfaceContainerHighest: PulseColors.surfaceContainerHighest,
      outline: PulseColors.outline,
      outlineVariant: PulseColors.outlineVariant,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: PulseColors.background,
      textTheme: PulseTypography.textTheme,
      appBarTheme: const AppBarTheme(
        backgroundColor: PulseColors.surface,
        foregroundColor: PulseColors.primary,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
      ),
      cardTheme: CardTheme(
        color: PulseColors.surfaceContainerLowest,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: PulseColors.outlineVariant, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: PulseColors.primaryContainer,
          foregroundColor: PulseColors.onPrimary,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w600,
            fontSize: 16,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: PulseColors.surfaceContainerLowest,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: PulseColors.outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: PulseColors.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: PulseColors.primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
