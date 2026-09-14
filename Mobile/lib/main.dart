import 'package:flutter/material.dart';

import 'package:flutter_application_1/Screens/GerenciaBot/bloqueio.dart';
import 'package:flutter_application_1/Screens/GerenciaBot/catalogo.dart';
import 'package:flutter_application_1/Screens/GerenciaBot/duvidas.dart';
import 'package:flutter_application_1/Screens/GerenciaBot/horarioFuncionamento.dart';
import 'package:flutter_application_1/Screens/GerenciaBot/localizacao.dart';
import 'package:flutter_application_1/Screens/GerenciaBot/profissionais.dart';
import 'package:flutter_application_1/Screens/busca.dart';
import 'package:flutter_application_1/Screens/gerenciarBot.dart';
import 'package:flutter_application_1/Screens/gerenciarPerfil.dart';
import 'package:flutter_application_1/Screens/login.dart';
import 'package:flutter_application_1/Screens/telaPrincipal.dart';
import 'package:flutter_application_1/Screens/verAgendamentos.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  static final Map<String, WidgetBuilder> _routes = {
    '/': (_) => Login(),
    '/inicio': (_) => TelaPrincipal(),
    '/gerenciarPerfil': (_) => Gerenciarperfil(),
    '/verAgendamentos': (_) => VerAgendamentos(),
    '/gerenciarBot': (_) => Gerenciarbot(),
    '/catalogo': (_) => Catalogo(),
    '/horarioFuncionamento': (_) => HorarioFuncionamentoScreen(),
    '/profissionais': (_) => Profissionais(),
    '/bloqueio': (_) => Bloqueio(),
    '/duvidas': (_) => DuvidasFrequentesScreen(),
    '/localizacao': (_) => LocalizacaoScreen(),
    '/busca': (_) => Busca([]),
  };

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      initialRoute: '/',
      onGenerateRoute: (settings) {
        final builder = _routes[settings.name];
        if (builder == null) return null;
        return PageRouteBuilder(
          settings: settings,
          transitionDuration: Duration.zero,
          reverseTransitionDuration: Duration.zero,
          pageBuilder: (context, animation, secondaryAnimation) => builder(context),
        );
      },
    );
  }
}