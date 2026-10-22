import 'package:flutter/material.dart';

class Servico {

  int? id;
  final TextEditingController nomeCtrl;
  final TextEditingController valorCtrl;
  final TextEditingController minutosCtrl;

  String get nome => nomeCtrl.text;

  double get valor => double.tryParse(valorCtrl.text.replaceAll(',', '.')) ?? 0.0;
  int get minutos => int.tryParse(minutosCtrl.text) ?? 30;

  Servico({this.id, String nome = '', String valor = '', String minutos = '30'})
      : nomeCtrl = TextEditingController(text: nome),
        valorCtrl = TextEditingController(text: valor),
        minutosCtrl = TextEditingController(text: minutos);

  factory Servico.fromJson(Map<String, dynamic> json) {
    return Servico(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()),
      nome: json['nome'] ?? '',
      valor: json['valor']?.toString() ?? '0',
      minutos: json['minutos']?.toString() ?? '30',
    );
  }

  void dispose() {
    nomeCtrl.dispose();
    valorCtrl.dispose();
    minutosCtrl.dispose();
  }
}
