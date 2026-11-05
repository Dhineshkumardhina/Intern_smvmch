import 'dart:async';
import '../models/task_model.dart';
import 'base_repository.dart';

abstract class TaskRepository extends BaseRepository<TaskModel> {
  /// Stream all tasks for a specific student's internship
  Stream<List<TaskModel>> watchTasksForStudent(String studentId);

  /// Stream all tasks for an internship
  Stream<List<TaskModel>> watchTasksForInternship(String internshipId);

  /// Update task status and completion progress
  Future<void> updateTaskProgress({
    required String taskId,
    required double progress,
    required TaskStatus status,
    String? blockerReason,
  });
}
