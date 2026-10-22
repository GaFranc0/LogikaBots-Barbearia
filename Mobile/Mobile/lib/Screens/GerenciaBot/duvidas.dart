import 'package:flutter/material.dart';
import 'package:flutter_application_1/services/api_service.dart';
import 'package:flutter_application_1/services/session.dart';

class DuvidaModel {
  String id;
  final TextEditingController perguntaController;
  final TextEditingController respostaController;

  DuvidaModel({this.id = '', String pergunta = '', String resposta = ''})
    : perguntaController = TextEditingController(text: pergunta),
      respostaController = TextEditingController(text: resposta);

  Map<String, dynamic> toJson() {
    return {
      'pergunta': perguntaController.text,
      'resposta': respostaController.text,
    };
  }

  factory DuvidaModel.fromJson(Map<String, dynamic> json) {
    return DuvidaModel(
      id: json['id'].toString(),
      pergunta: json['pergunta'] ?? '',
      resposta: json['resposta'] ?? '',
    );
  }
}

class DuvidasFrequentesScreen extends StatefulWidget {
  const DuvidasFrequentesScreen({super.key});

  @override
  State<DuvidasFrequentesScreen> createState() =>
      _DuvidasFrequentesScreenState();
}

class _DuvidasFrequentesScreenState extends State<DuvidasFrequentesScreen> {
  List<DuvidaModel> _duvidas = [];
  final Set<DuvidaModel> _alteradas = {};
  final Set<String> _idsRemovidos = {};
  bool _isLoading = true;
  bool _salvando = false;

  @override
  void initState() {
    super.initState();
    _carregarDuvidas();
  }

  Future<void> _carregarDuvidas() async {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null) {
      setState(() => _isLoading = false);
      return;
    }

    try {
      final lista = await ApiService.getDuvidas(barbeariaId);
      setState(() {
        _duvidas = lista.map((item) => DuvidaModel.fromJson(item)).toList();
        if (_duvidas.isEmpty) _duvidas = [DuvidaModel()];
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      _mostrarErro(e.toString());
    }
  }

  void _mostrarErro(String mensagem) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(mensagem)));
  }

  void _marcarAlterada(DuvidaModel item) {
    setState(() => _alteradas.add(item));
  }

  Future<void> _persistirDuvida(DuvidaModel item) async {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null) throw ApiException('Sessão inválida');
    if (item.perguntaController.text.trim().isEmpty ||
        item.respostaController.text.trim().isEmpty) {
      throw ApiException(
        'Preencha a pergunta e a resposta de todas as dúvidas',
      );
    }

    if (item.id.isEmpty) {
      item.id = await ApiService.criarDuvida(
        barbeariaId,
        item.perguntaController.text,
        item.respostaController.text,
      );
    } else {
      await ApiService.atualizarDuvida(
        item.id,
        item.perguntaController.text,
        item.respostaController.text,
      );
    }
  }

  Future<void> _confirmarAlteracoes() async {
    if (_salvando) return;
    setState(() => _salvando = true);
    try {
      for (final id in _idsRemovidos) {
        await ApiService.removerDuvida(id);
      }
      for (final item in _alteradas.toList()) {
        await _persistirDuvida(item);
      }
      if (!mounted) return;
      setState(() {
        _idsRemovidos.clear();
        _alteradas.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Dúvidas salvas com sucesso'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
    } catch (e) {
      _mostrarErro(e.toString());
    } finally {
      if (mounted) setState(() => _salvando = false);
    }
  }

  void _adicionarDuvida() {
    final nova = DuvidaModel();
    setState(() {
      _duvidas.add(nova);
      _alteradas.add(nova);
    });
  }

  void _removerDuvida(int index) {
    final item = _duvidas[index];
    if (_duvidas.length > 1) {
      setState(() {
        if (item.id.isNotEmpty) _idsRemovidos.add(item.id);
        _alteradas.remove(item);
        item.perguntaController.dispose();
        item.respostaController.dispose();
        _duvidas.removeAt(index);
      });
    }
  }

  @override
  void dispose() {
    for (var item in _duvidas) {
      item.perguntaController.dispose();
      item.respostaController.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF060913),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060913),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Dúvidas Frequentes',
          style: TextStyle(color: Colors.white),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFFA855F7)),
            )
          : SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24.0),
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 900),
                    padding: const EdgeInsets.all(28.0),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0B101D),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: const Color(0xFFA855F7).withValues(alpha: 0.4),
                        width: 1.2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(
                            0xFFA855F7,
                          ).withValues(alpha: 0.08),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final bool isMobile = constraints.maxWidth < 560;

                            final titulo = Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF1E1B4B),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(
                                    Icons.help_outline,
                                    color: Color(0xFFA855F7),
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Dúvidas Frequentes',
                                        style: TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                        ),
                                      ),
                                      SizedBox(height: 4),
                                      Text(
                                        'Crie perguntas e respostas para seus clientes',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: Color(0xFF94A3B8),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            );

                            final botao = ElevatedButton.icon(
                              onPressed: _adicionarDuvida,
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text('Adicionar Dúvida'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF1E1B4B),
                                foregroundColor: const Color(0xFFA855F7),
                                side: const BorderSide(
                                  color: Color(0xFF3B1F60),
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            );

                            if (isMobile) {
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  titulo,
                                  const SizedBox(height: 12),
                                  botao,
                                ],
                              );
                            }

                            return Row(
                              children: [
                                Expanded(child: titulo),
                                const SizedBox(width: 16),
                                botao,
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 24),

                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1C1A0E),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFF423B15)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(
                                    Icons.error_outline,
                                    color: Color(0xFFEAB308),
                                    size: 20,
                                  ),
                                  SizedBox(width: 8),
                                  Text(
                                    'Atenção Importante',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFFEAB308),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              RichText(
                                text: const TextSpan(
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFFFDE047),
                                    height: 1.4,
                                  ),
                                  children: [
                                    TextSpan(
                                      text:
                                          'As dúvidas e respostas que você cadastrar serão enviadas ',
                                    ),
                                    TextSpan(
                                      text: 'exatamente como digitadas',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    TextSpan(text: ' para o cliente.'),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _duvidas.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 16),
                          itemBuilder: (context, index) {
                            final item = _duvidas[index];
                            return _DuvidaCardItem(
                              key: ValueKey(item),
                              item: item,
                              numeroDuvida: index + 1,
                              onDelete: () => _removerDuvida(index),
                              canDelete: _duvidas.length > 1,
                              onChanged: () => _marcarAlterada(item),
                            );
                          },
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed:
                                (_alteradas.isNotEmpty ||
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
                              backgroundColor: const Color(0xFFA855F7),
                              foregroundColor: Colors.white,
                              disabledBackgroundColor: const Color(
                                0xFFA855F7,
                              ).withValues(alpha: 0.14),
                              disabledForegroundColor: const Color(
                                0xFFC084FC,
                              ).withValues(alpha: 0.55),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}

class _DuvidaCardItem extends StatelessWidget {
  final DuvidaModel item;
  final int numeroDuvida;
  final VoidCallback onDelete;
  final bool canDelete;
  final VoidCallback onChanged;

  const _DuvidaCardItem({
    super.key,
    required this.item,
    required this.numeroDuvida,
    required this.onDelete,
    required this.canDelete,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F1422),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1B2336)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E1B4B),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.help_outline,
                        size: 14,
                        color: Color(0xFFA855F7),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'DÚVIDA #$numeroDuvida',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFA855F7),
                          letterSpacing: 0.6,
                        ),
                      ),
                    ],
                  ),
                ),
                if (canDelete)
                  IconButton(
                    icon: const Icon(
                      Icons.close,
                      size: 18,
                      color: Color(0xFF64748B),
                    ),
                    onPressed: onDelete,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
              ],
            ),
            const SizedBox(height: 16),

            const Text(
              'PERGUNTA / DÚVIDA',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Color(0xFF64748B),
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: item.perguntaController,
              onChanged: (_) => onChanged(),
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Escreva aqui a dúvida do cliente...',
                hintStyle: const TextStyle(
                  color: Color(0xFF475569),
                  fontSize: 14,
                ),
                filled: true,
                fillColor: const Color(0xFF090D16),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFF1E293B)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFFA855F7)),
                ),
              ),
            ),
            const SizedBox(height: 16),

            const Text(
              'RESPOSTA PARA A DÚVIDA',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Color(0xFF64748B),
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: item.respostaController,
              onChanged: (_) => onChanged(),
              style: const TextStyle(color: Colors.white, fontSize: 14),
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Escreva a resposta que responderá esta dúvida...',
                hintStyle: const TextStyle(
                  color: Color(0xFF475569),
                  fontSize: 14,
                ),
                filled: true,
                fillColor: const Color(0xFF090D16),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFF1E293B)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFFA855F7)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
