import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/app.dart';
import 'core/auth/supabase_auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase Backend SDK with session persistence
  await SupabaseAuthService().initialize();

  runApp(
    const ProviderScope(
      child: InternPulseApp(),
    ),
  );
}
