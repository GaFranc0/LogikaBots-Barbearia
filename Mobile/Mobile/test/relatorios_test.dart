import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_application_1/Screens/relatorios.dart';
import 'package:flutter_application_1/Screens/telaPrincipal.dart';
import 'package:flutter_application_1/services/session.dart';

void main() {
  tearDown(Session.encerrar);

  testWidgets('Usuário comum não acessa relatório nem vê opção no menu', (
    tester,
  ) async {
    Session.iniciar(
      id: 1,
      idBarbearia: 1,
      usuario: 'teste',
      nivelAcesso: 'barbeiro',
    );
    await tester.pumpWidget(const MaterialApp(home: RelatoriosScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Acesso restrito a administradores.'), findsOneWidget);
    expect(find.text('Desempenho da Loja'), findsNothing);
    await tester.pumpWidget(const MaterialApp(home: TelaPrincipal()));
    await tester.pumpAndSettle();
    expect(find.text('Relatórios'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Admin vê opção de relatórios sem erro de animação', (
    tester,
  ) async {
    Session.iniciar(
      id: 1,
      idBarbearia: 1,
      usuario: 'teste',
      nivelAcesso: 'admin',
      tokenAcesso: 'token-teste',
    );
    await tester.pumpWidget(const MaterialApp(home: TelaPrincipal()));
    await tester.pumpAndSettle();
    expect(find.text('Relatórios'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  for (final width in [360.0, 1200.0]) {
    testWidgets('Relatórios carregam, mudam mês e respondem em $width px', (
      tester,
    ) async {
      tester.view.physicalSize = Size(width, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      Session.iniciar(
        id: 1,
        idBarbearia: 1,
        usuario: 'teste',
        nivelAcesso: 'admin',
        tokenAcesso: 'token-teste',
      );
      var gets = 0;
      final client = MockClient((request) async {
        expect(request.headers['Authorization'], 'Bearer token-teste');
        if (request.method == 'POST') {
          expect(jsonDecode(request.body)['pergunta'], 'Quanto faturei?');
          return http.Response(
            jsonEncode({'resposta': 'O faturamento foi de R\$ 120,00.'}),
            200,
          );
        }
        gets++;
        return http.Response(
          jsonEncode({
            'metricas': {
              'faturamento': 120,
              'atendimentos': 3,
              'novos_clientes': 2,
              'ticket_medio': 40,
              'taxa_ocupacao': 15,
              'variacao_faturamento': null,
              'variacao_ticket': 0,
            },
            'faturamento_por_dia_semana': [
              for (final day in [
                'Dom',
                'Seg',
                'Ter',
                'Qua',
                'Qui',
                'Sex',
                'Sáb',
              ])
                {'dia': day, 'faturamento': day == 'Seg' ? 120 : 0},
            ],
            'top_servicos': [
              {
                'nome_servico': 'Corte',
                'quantidade': 3,
                'faturamento': 120,
                'percentual': 100,
              },
            ],
            'insight': 'Divulgue os serviços.',
            'observacoes': ['Preços atuais.'],
          }),
          200,
        );
      });
      await http.runWithClient(() async {
        await tester.pumpWidget(const MaterialApp(home: RelatoriosScreen()));
        await tester.pumpAndSettle();
        expect(find.text('R\$ 120,00'), findsOneWidget);
        expect(find.text('Faturamento por Dia da Semana'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.tap(find.byType(DropdownButton<int>).first);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Janeiro').last);
        await tester.pumpAndSettle();
        expect(gets, 2);
        await tester.ensureVisible(find.byType(TextField));
        await tester.enterText(find.byType(TextField), 'Quanto faturei?');
        await tester.ensureVisible(find.text('Perguntar'));
        await tester.tap(find.text('Perguntar'));
        await tester.pumpAndSettle();
        expect(find.text('O faturamento foi de R\$ 120,00.'), findsOneWidget);
        expect(tester.takeException(), isNull);
      }, () => client);
    });
  }
}
