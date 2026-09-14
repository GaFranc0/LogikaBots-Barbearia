import 'package:flutter/material.dart';

class Servico {

  final TextEditingController nomeCtrl;
  final TextEditingController valorCtrl;
  final TextEditingController minutosCtrl;

  String get nome => nomeCtrl.text;

  double get valor => double.tryParse(valorCtrl.text) ?? 0.0;
  int get minutos => int.tryParse(minutosCtrl.text) ?? 30;

  Servico()
      : nomeCtrl = TextEditingController(),
        valorCtrl = TextEditingController(text: ''),
        minutosCtrl = TextEditingController(text: '30');

  void dispose() {
    nomeCtrl.dispose();
    valorCtrl.dispose();
    minutosCtrl.dispose();
  }
}