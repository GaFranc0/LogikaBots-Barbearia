import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_application_1/Screens/GerenciaBot/servico.dart';
import 'package:flutter_application_1/services/api_service.dart';
import 'package:flutter_application_1/services/session.dart';

class Catalogo extends StatefulWidget {
  const Catalogo({super.key});

  @override
  State<Catalogo> createState() => _CatalogoState();
}

class _CatalogoState extends State<Catalogo> {
  final List<Servico> _servicos = [];
  final Set<Servico> _alterados = {};
  final Set<int> _idsRemovidos = {};
  bool _carregando = true;
  bool _salvando = false;
  String? _erroCarregamento;

  final Color emerald = const Color(0xFF10B981);
  final Color emeraldLight = const Color(0xFF26E6A4);
  final Color corFundo = const Color(0xFF030712);
  final Color cardBg = const Color(0xFF0F172A);
  final Color inputBg = const Color(0xFF0B1329);
  final Color borderColor = const Color(0xFF1E293B);

  @override
  void initState() {
    super.initState();
    _carregarServicos();
  }

  Future<void> _carregarServicos() async {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null) {
      setState(() {
        _carregando = false;
        _erroCarregamento = 'Sessão inválida. Faça login novamente.';
      });
      return;
    }

    try {
      final lista = await ApiService.getServicos(barbeariaId);
      if (!mounted) return;
      for (final servico in _servicos) {
        servico.dispose();
      }
      setState(() {
        _servicos.clear();
        _servicos.addAll(lista.map((json) => Servico.fromJson(json)));
        _carregando = false;
        _erroCarregamento = null;
      });
      for (final s in _servicos) {
        _adicionarListeners(s);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _carregando = false;
        _erroCarregamento = e.toString();
      });
      _mostrarErro(e.toString());
    }
  }

  void _adicionarListeners(Servico s) {
    void escutar() {
      if (mounted) setState(() => _alterados.add(s));
    }

    s.nomeCtrl.addListener(escutar);
    s.valorCtrl.addListener(escutar);
    s.minutosCtrl.addListener(escutar);
  }

  Future<void> _persistirServico(Servico s) async {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null) throw ApiException('Sessão inválida');
    if (s.nome.trim().isEmpty)
      throw ApiException('Informe o nome de todos os serviços');
    if (s.valor <= 0) throw ApiException('Informe um preço maior que zero');
    if (s.minutos <= 0)
      throw ApiException('Informe uma duração maior que zero');

    if (s.id == null) {
      s.id = await ApiService.criarServico(
        barbeariaId,
        s.nome,
        s.valor,
        s.minutos,
      );
    } else {
      await ApiService.atualizarServico(s.id!, s.nome, s.valor, s.minutos);
    }
  }

  Future<void> _confirmarAlteracoes() async {
    if (_salvando) return;
    setState(() => _salvando = true);
    try {
      for (final id in _idsRemovidos) {
        await ApiService.removerServico(id);
      }
      for (final servico in _alterados.toList()) {
        await _persistirServico(servico);
      }
      if (!mounted) return;
      setState(() {
        _idsRemovidos.clear();
        _alterados.clear();
      });
      await _carregarServicos();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Catálogo salvo com sucesso'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
    } catch (e) {
      _mostrarErro(e.toString());
    } finally {
      if (mounted) setState(() => _salvando = false);
    }
  }

  void _mostrarErro(String mensagem) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(mensagem)));
  }

  void _adicionarServico() {
    final novo = Servico();
    _adicionarListeners(novo);
    setState(() {
      _servicos.add(novo);
      _alterados.add(novo);
    });
  }

  void _removerServico(int index) {
    final s = _servicos[index];

    setState(() {
      if (s.id != null) _idsRemovidos.add(s.id!);
      _alterados.remove(s);
      s.dispose();
      _servicos.removeAt(index);
    });
  }

  @override
  void dispose() {
    for (final s in _servicos) {
      s.dispose();
    }
    super.dispose();
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
        title: const Text(
          'Catálogo de Serviços',
          style: TextStyle(color: Colors.white),
        ),
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
                      border: Border.all(
                        color: emerald.withValues(alpha: 0.5),
                        width: 1.2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: emerald.withValues(alpha: 0.1),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
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
                                        color: Colors.white.withValues(
                                          alpha: 0.45,
                                        ),
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              ElevatedButton.icon(
                                onPressed: _adicionarServico,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: emerald.withValues(
                                    alpha: 0.1,
                                  ),
                                  foregroundColor: emeraldLight,
                                  elevation: 0,
                                  side: BorderSide(
                                    color: emerald.withValues(alpha: 0.4),
                                  ),
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

                        if (_carregando)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 48),
                            child: Center(
                              child: CircularProgressIndicator(
                                color: Color(0xFF10B981),
                              ),
                            ),
                          )
                        else if (_erroCarregamento != null)
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              vertical: 48,
                              horizontal: 24,
                            ),
                            child: Center(
                              child: Text(
                                _erroCarregamento!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: Color(0xFFF87171),
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          )
                        else if (_servicos.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              vertical: 48,
                              horizontal: 24,
                            ),
                            child: Center(
                              child: Column(
                                children: [
                                  Icon(
                                    Icons.layers_clear_outlined,
                                    color: Colors.white.withValues(alpha: 0.2),
                                    size: 40,
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    'Nenhum serviço cadastrado para esta barbearia.\nToque em "Adicionar" e depois em "Confirmar alterações".',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: Colors.white.withValues(
                                        alpha: 0.35,
                                      ),
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
                              children: List.generate(_servicos.length, (
                                index,
                              ) {
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
                        const Divider(color: Color(0xFF1E293B), height: 1),
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed:
                                  (_alterados.isNotEmpty ||
                                          _idsRemovidos.isNotEmpty) &&
                                      !_salvando
                                  ? _confirmarAlteracoes
                                  : null,
                              icon: _salvando
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(Icons.check_rounded),
                              label: Text(
                                _salvando
                                    ? 'Salvando...'
                                    : 'Confirmar alterações',
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: emerald,
                                foregroundColor: Colors.white,
                                disabledBackgroundColor: emerald.withValues(
                                  alpha: 0.14,
                                ),
                                disabledForegroundColor: emeraldLight
                                    .withValues(alpha: 0.55),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                            ),
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

  InputDecoration _inputDec(
    String label, {
    String? prefixText,
    Widget? prefixIcon,
  }) {
    return InputDecoration(
      labelText: label,
      labelStyle: TextStyle(
        color: Colors.white.withValues(alpha: 0.4),
        fontSize: 13,
      ),
      floatingLabelStyle: TextStyle(
        color: emeraldLight,
        fontSize: 12,
        fontWeight: FontWeight.w500,
      ),
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
              prefixIcon: Icon(
                Icons.bookmark_border_rounded,
                color: Colors.white.withValues(alpha: 0.3),
                size: 20,
              ),
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
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[\d,.]')),
                  ],
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
                    prefixIcon: Icon(
                      Icons.access_time_rounded,
                      color: Colors.white.withValues(alpha: 0.3),
                      size: 18,
                    ),
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
