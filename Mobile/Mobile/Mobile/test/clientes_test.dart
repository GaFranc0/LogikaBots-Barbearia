import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_application_1/Screens/clientes.dart';
import 'package:flutter_application_1/Screens/telaPrincipal.dart';
import 'package:flutter_application_1/services/session.dart';

void main() {
  tearDown(Session.encerrar);
  void login([String role = 'admin']) => Session.iniciar(
    id: 2,
    idBarbearia: 2,
    usuario: 'teste',
    nivelAcesso: role,
    tokenAcesso: 'token-teste',
  );

  testWidgets('Página e menu negados a não administradores', (tester) async {
    login('barbeiro');
    await tester.pumpWidget(const MaterialApp(home: ClientesScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Acesso restrito a administradores.'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
    await tester.pumpWidget(const MaterialApp(home: TelaPrincipal()));
    await tester.pumpAndSettle();
    expect(find.text('Clientes'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Admin vê Clientes no menu', (tester) async {
    login();
    await tester.pumpWidget(const MaterialApp(home: TelaPrincipal()));
    await tester.pumpAndSettle();
    expect(find.text('Clientes'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('WhatsApp usa telefone e não confunde @lid com número', (
    tester,
  ) async {
    login();
    String? launched;
    const channel = MethodChannel('plugins.flutter.io/url_launcher');
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(channel, (
      call,
    ) async {
      if (call.method == 'launch') {
        launched = (call.arguments as Map)['url'] as String;
      }
      return true;
    });
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        channel,
        null,
      ),
    );
    await http.runWithClient(
      () async {
        await tester.pumpWidget(const MaterialApp(home: ClientesScreen()));
        await tester.pumpAndSettle();
        final buttons = find.widgetWithText(OutlinedButton, 'WhatsApp');
        expect(tester.widget<OutlinedButton>(buttons.last).onPressed, isNull);
        await tester.ensureVisible(buttons.first);
        await tester.tap(buttons.first);
        await tester.pumpAndSettle();
        expect(launched, 'https://wa.me/551999990001');
        expect(find.byType(AlertDialog), findsNothing);
      },
      () => MockClient(
        (_) async => http.Response(
          jsonEncode({
            'metricas': {'total': 2, 'novos_hoje': 0, 'novos_semana': 0},
            'clientes': [
              {
                'id_cliente': 1,
                'id_barbearia': 2,
                'nome': 'Ana',
                'telefone': '(19) 9999-0001',
              },
              {
                'id_cliente': 2,
                'id_barbearia': 2,
                'nome': 'Bruno',
                'remoteJid': '123456789@lid',
              },
            ],
          }),
          200,
        ),
      ),
    );
  });

  for (final width in [360.0, 850.0, 1280.0]) {
    testWidgets('Clientes, busca, detalhes e atualização em $width px', (
      tester,
    ) async {
      tester.view.physicalSize = Size(width, 1100);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      login();
      var requests = 0;
      await http.runWithClient(
        () async {
          await tester.pumpWidget(const MaterialApp(home: ClientesScreen()));
          await tester.pumpAndSettle();
          expect(find.text('2 clientes encontrados'), findsOneWidget);
          expect(find.text('TOTAL DE CLIENTES'), findsOneWidget);
          expect(tester.takeException(), isNull);
          await tester.ensureVisible(find.byType(TextField));
          await tester.enterText(find.byType(TextField), 'Ana');
          await tester.pumpAndSettle();
          expect(find.text('1 clientes encontrados'), findsOneWidget);
          expect(find.text('Bruno'), findsNothing);
          await tester.ensureVisible(find.text('Ana Silva'));
          await tester.tap(find.text('Ana Silva'));
          await tester.pumpAndSettle();
          expect(find.text('Identificador WhatsApp'), findsOneWidget);
          expect(find.text('551999990001@s.whatsapp.net'), findsOneWidget);
          await tester.tap(find.text('Fechar'));
          await tester.pumpAndSettle();
          await tester.enterText(find.byType(TextField), '(19) 9999-0001');
          await tester.pumpAndSettle();
          expect(find.text('1 clientes encontrados'), findsOneWidget);
          await tester.enterText(find.byType(TextField), 'Inexistente');
          await tester.pumpAndSettle();
          expect(
            find.text('Nenhum cliente encontrado para esta busca.'),
            findsOneWidget,
          );
          await tester.tap(find.byTooltip('Limpar busca'));
          await tester.pumpAndSettle();
          expect(find.text('2 clientes encontrados'), findsOneWidget);
          await tester.tap(find.byTooltip('Atualizar clientes'));
          await tester.pumpAndSettle();
          expect(requests, 2);
          expect(tester.takeException(), isNull);
        },
        () => MockClient((request) async {
          requests++;
          expect(request.headers['Authorization'], 'Bearer token-teste');
          expect(request.url.queryParameters['route'], '/clientes');
          expect(
            request.url.queryParameters.containsKey('id_barbearia'),
            isFalse,
          );
          return http.Response(
            jsonEncode({
              'id_barbearia': 2,
              'metricas': {'total': 2, 'novos_hoje': 0, 'novos_semana': 1},
              'clientes': [
                {
                  'id_cliente': 20,
                  'id_barbearia': 2,
                  'nome': 'Ana Silva',
                  'telefone': '+55 (19) 9999-0001',
                  'remoteJid': '551999990001@s.whatsapp.net',
                  'data_cadastro': '2026-10-01 10:00:00',
                },
                {
                  'id_cliente': 21,
                  'id_barbearia': 2,
                  'nome': 'Bruno',
                  'telefone': null,
                  'remoteJid': '123456789@lid',
                  'data_cadastro': null,
                },
              ],
            }),
            200,
          );
        }),
      );
    });
  }

  testWidgets('API indisponível mostra erro e permite tentar novamente', (
    tester,
  ) async {
    login();
    var fail = true;
    await http.runWithClient(
      () async {
        await tester.pumpWidget(const MaterialApp(home: ClientesScreen()));
        await tester.pumpAndSettle();
        expect(find.text('Sessão expirada.'), findsOneWidget);
        fail = false;
        await tester.tap(find.text('Tentar novamente'));
        await tester.pumpAndSettle();
        expect(
          find.text('Nenhum cliente cadastrado nesta barbearia.'),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      },
      () => MockClient(
        (_) async => fail
            ? http.Response(jsonEncode({'error': 'Sessão expirada.'}), 401)
            : http.Response(
                jsonEncode({
                  'metricas': {'total': 0, 'novos_hoje': 0, 'novos_semana': 0},
                  'clientes': [],
                }),
                200,
              ),
      ),
    );
  });
}
