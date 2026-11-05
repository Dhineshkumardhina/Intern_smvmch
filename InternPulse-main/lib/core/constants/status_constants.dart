import 'package:flutter/material.dart';

/// Standard Status System for InternPulse
/// 
/// Supported statuses:
/// - onTrack
/// - inProgress
/// - delayed
/// - blocked
/// - inactive
/// - completed
enum InternshipStatus {
  onTrack,
  inProgress,
  delayed,
  blocked,
  inactive,
  completed;

  String get label {
    switch (this) {
      case InternshipStatus.onTrack:
        return 'On Track';
      case InternshipStatus.inProgress:
        return 'In Progress';
      case InternshipStatus.delayed:
        return 'Delayed';
      case InternshipStatus.blocked:
        return 'Blocked';
      case InternshipStatus.inactive:
        return 'Inactive';
      case InternshipStatus.completed:
        return 'Completed';
    }
  }

  IconData get icon {
    switch (this) {
      case InternshipStatus.onTrack:
        return Icons.check_circle_outline;
      case InternshipStatus.inProgress:
        return Icons.play_arrow_rounded;
      case InternshipStatus.delayed:
        return Icons.schedule_rounded;
      case InternshipStatus.blocked:
        return Icons.error_outline_rounded;
      case InternshipStatus.inactive:
        return Icons.bedtime_outlined;
      case InternshipStatus.completed:
        return Icons.task_alt_rounded;
    }
  }

  Color get color {
    switch (this) {
      case InternshipStatus.onTrack:
        return const Color(0xFF0D9488); // Emerald / Teal
      case InternshipStatus.inProgress:
        return const Color(0xFF3F51B5); // Primary Container Indigo
      case InternshipStatus.delayed:
        return const Color(0xFFD97706); // Amber / Warm Orange
      case InternshipStatus.blocked:
        return const Color(0xFFDC2626); // Error Red
      case InternshipStatus.inactive:
        return const Color(0xFF6B7280); // Slate / Grey
      case InternshipStatus.completed:
        return const Color(0xFF10B981); // Bright Emerald
    }
  }

  Color get backgroundColor {
    switch (this) {
      case InternshipStatus.onTrack:
        return const Color(0xFFCCFBF1);
      case InternshipStatus.inProgress:
        return const Color(0xFFD5E3FC);
      case InternshipStatus.delayed:
        return const Color(0xFFFEF3C7);
      case InternshipStatus.blocked:
        return const Color(0xFFFFDAD6);
      case InternshipStatus.inactive:
        return const Color(0xFFE3E1EA);
      case InternshipStatus.completed:
        return const Color(0xFFD1FAE5);
    }
  }

  String get semanticDescription {
    switch (this) {
      case InternshipStatus.onTrack:
        return 'Work is progressing steadily according to planned timeline with regular updates.';
      case InternshipStatus.inProgress:
        return 'Work is actively underway on assigned tasks.';
      case InternshipStatus.delayed:
        return 'Task completion or daily update is behind scheduled delivery threshold.';
      case InternshipStatus.blocked:
        return 'Student cannot proceed due to technical, organizational, or approval blocker.';
      case InternshipStatus.inactive:
        return 'No daily progress update has been logged for consecutive monitoring days.';
      case InternshipStatus.completed:
        return 'All task criteria or milestone objectives have been successfully fulfilled.';
    }
  }

  static InternshipStatus fromString(String? value) {
    if (value == null) return InternshipStatus.onTrack;
    switch (value.toLowerCase().replaceAll('_', '').replaceAll('-', '')) {
      case 'ontrack':
        return InternshipStatus.onTrack;
      case 'inprogress':
      case 'active':
        return InternshipStatus.inProgress;
      case 'delayed':
        return InternshipStatus.delayed;
      case 'blocked':
        return InternshipStatus.blocked;
      case 'inactive':
        return InternshipStatus.inactive;
      case 'completed':
      case 'done':
        return InternshipStatus.completed;
      default:
        return InternshipStatus.onTrack;
    }
  }
}
