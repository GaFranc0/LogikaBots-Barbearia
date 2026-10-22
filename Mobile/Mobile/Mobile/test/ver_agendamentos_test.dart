import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/Screens/verAgendamentos.dart';
import 'package:flutter_application_1/services/session.dart';

void main() {
  for (final largura in [390.0, 1024.0]) {
    testWidgets('Agenda e controles sem overflow em $largura px', (tester) async {
      tester.view.physicalSize = Size(largura, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      Session.encerrar();
      await tester.pumpWidget(const MaterialApp(home: VerAgendamentos()));
      await tester.pumpAndSettle();
      expect(find.text('Sessão expirada. Faça login novamente.'), findsOneWidget);
      final amanha = find.text('Amanhã');
      await tester.ensureVisible(amanha);
      await tester.tap(amanha);
      await tester.pumpAndSettle();
      expect(find.text('TOTAL CORTES'), findsOneWidget);
      final todos = find.text('Todos');
      await tester.ensureVisible(todos);
      await tester.tap(todos);
      await tester.pumpAndSettle();
      expect(find.text('TOTAL CORTES'), findsOneWidget);
      final horarios = find.text('Ver Todos Horários');
      await tester.ensureVisible(horarios);
      await tester.tap(horarios);
      await tester.pumpAndSettle();
      expect(find.text('Horários de atendimento'), findsOneWidget);
      expect(find.text('Nenhum horário de atendimento configurado.'), findsOneWidget);
      await tester.tap(find.byIcon(Icons.close));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  }
}
