import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_application_1/Screens/GerenciaBot/servico.dart';

class Catalogo extends StatefulWidget {
  const Catalogo({super.key});

  @override
  State<Catalogo> createState() => _CatalogoState();
}

class _CatalogoState extends State<Catalogo> {
  final List<Servico> _servicos = [];

  final Color emerald = const Color(0xFF10B981);
  final Color emeraldLight = const Color(0xFF26E6A4);
  final Color corFundo = const Color(0xFF030712);
  final Color cardBg = const Color(0xFF0F172A);
  final Color inputBg = const Color(0xFF0B1329);
  final Color borderColor = const Color(0xFF1E293B);

  @override
  void dispose() {
    for (final s in _servicos) {
      s.dispose();
    }
    super.dispose();
  }

  void _adicionarServico() {
    setState(() {
      _servicos.add(Servico());
    });
  }

  void _removerServico(int index) {
    setState(() {
      _servicos[index].dispose();
      _servicos.removeAt(index);
    });
  }

  @override
  Widget build(BuildContext context) {
    final double largura = MediaQuery.of(context).size.width;

    return Scaffold(
      backgroundColor: corFundo,
      appBar: AppBar(
        backgroundColor: corFundo,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Catálogo de Serviços', style: TextStyle(color: Colors.white)),
      ),
      body: SafeArea(
        child: Stack(
          children: [

            Positioned(
              top: -80,
              left: -80,
              child: Container(
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                  color: emerald.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 70, sigmaY: 70),
                  child: Container(color: Colors.transparent),
                ),
              ),
            ),

            Positioned(
              bottom: -80,
              right: -80,
              child: Container(
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                  color: const Color(0xFF8B5CF6).withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 70, sigmaY: 70),
                  child: Container(color: Colors.transparent),
                ),
              ),
            ),

            SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: largura * 0.04,
                vertical: 20,
              ),
              child: Column(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(24),
                      border: Border(
                        top: BorderSide(color: emeraldLight, width: 2.5),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        )
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [

                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Row(
                            children: [

                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF020617),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: const Color(0xFF133A2F),
                                    width: 1.5,
                                  ),
                                ),
                                child: Icon(
                                  Icons.content_cut_rounded,
                                  color: emeraldLight,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 16),

                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Catálogo',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Gerencie os serviços prestados',
                                      style: TextStyle(
                                        color: Colors.white.withValues(alpha: 0.45),
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              ElevatedButton.icon(
                                onPressed: _adicionarServico,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: emerald.withValues(alpha: 0.1),
                                  foregroundColor: emeraldLight,
                                  elevation: 0,
                                  side: BorderSide(color: emerald.withValues(alpha: 0.4)),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 12,
                                  ),
                                ),
                                icon: const Icon(Icons.add_rounded, size: 18),
                                label: const Text(
                                  'Adicionar',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const Divider(color: Color(0xFF1E293B), height: 1),

                        if (_servicos.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
                            child: Center(
                              child: Column(
                                children: [
                                  Icon(Icons.layers_clear_outlined, color: Colors.white.withValues(alpha: 0.2), size: 40),
                                  const SizedBox(height: 12),
                                  Text(
                                    'Nenhum serviço cadastrado ainda.\nToque em "Adicionar" para iniciar.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.35),
                                      fontSize: 13,
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                        else
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: List.generate(_servicos.length, (index) {
                                return _ServicoCard(
                                  servico: _servicos[index],
                                  onRemover: () => _removerServico(index),
                                  emerald: emerald,
                                  emeraldLight: emeraldLight,
                                  inputBg: inputBg,
                                  borderColor: borderColor,
                                );
                              }),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ServicoCard extends StatelessWidget {
  final Servico servico;
  final VoidCallback onRemover;
  final Color emerald;
  final Color emeraldLight;
  final Color inputBg;
  final Color borderColor;

  const _ServicoCard({
    required this.servico,
    required this.onRemover,
    required this.emerald,
    required this.emeraldLight,
    required this.inputBg,
    required this.borderColor,
  });

  InputDecoration _inputDec(String label, {String? prefixText, Widget? prefixIcon}) {
    return InputDecoration(
      labelText: label,
      labelStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 13),
      floatingLabelStyle: TextStyle(color: emeraldLight, fontSize: 12, fontWeight: FontWeight.w500),
      prefixText: prefixText,
      prefixIcon: prefixIcon,
      prefixStyle: const TextStyle(color: Colors.white70, fontSize: 14),
      filled: true,
      fillColor: inputBg,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: borderColor, width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: emerald, width: 1.5),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF090D1A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor.withValues(alpha: 0.5), width: 1),
      ),
      child: Column(
        children: [

          TextField(
            controller: servico.nomeCtrl,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: _inputDec(
              'Nome do Serviço',
              prefixIcon: Icon(Icons.bookmark_border_rounded, color: Colors.white.withValues(alpha: 0.3), size: 20),
            ),
          ),
          const SizedBox(height: 12),

          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [

              Expanded(
                flex: 4,
                child: TextField(
                  controller: servico.valorCtrl,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))],
                  decoration: _inputDec('Preço', prefixText: 'R\$ '),
                ),
              ),
              const SizedBox(width: 12),

              Expanded(
                flex: 4,
                child: TextField(
                  controller: servico.minutosCtrl,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: _inputDec(
                    'Duração',
                    prefixIcon: Icon(Icons.access_time_rounded, color: Colors.white.withValues(alpha: 0.3), size: 18),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              IconButton(
                onPressed: onRemover,
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFF1E1014),
                  foregroundColor: const Color(0xFFF87171),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: Color(0xFF451A22), width: 1),
                  ),
                  padding: const EdgeInsets.all(14),
                ),
                icon: const Icon(Icons.delete_outline_rounded, size: 22),
              ),
            ],
          ),
        ],
      ),
    );
  }
}