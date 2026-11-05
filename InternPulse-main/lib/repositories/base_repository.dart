import 'dart:async';

/// Base Repository Interface establishing Stream-based Realtime Architecture
/// 
/// All domain repositories in InternPulse expose Stream<T> to adhere to
/// Firestore real-time snapshot listeners rather than polling.
abstract class BaseRepository<T> {
  /// Stream a single document by ID in real-time
  Stream<T?> watchById(String id);

  /// Stream all documents matching an optional filter in real-time
  Stream<List<T>> watchAll();

  /// Fetch snapshot once (cache or server)
  Future<T?> getById(String id);

  /// Create or update
  Future<void> save(T item);

  /// Delete document
  Future<void> delete(String id);
}
