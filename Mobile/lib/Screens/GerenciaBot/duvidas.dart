import 'package:flutter/material.dart';

class DuvidaModel {
  final TextEditingController perguntaController;
  final TextEditingController respostaController;

  DuvidaModel({String pergunta = '', String resposta = ''})
      : perguntaController = TextEditingController(text: pergunta),
        respostaController = TextEditingController(text: resposta);
}

class DuvidasFrequentesScreen extends StatefulWidget {
  const DuvidasFrequentesScreen({super.key});

  @override
  State<DuvidasFrequentesScreen> createState() => _DuvidasFrequentesScreenState();
}

class _DuvidasFrequentesScreenState extends State<DuvidasFrequentesScreen> {
  final List<DuvidaModel> _duvidas = [
    DuvidaModel(),
  ];

  void _adicionarDuvida() {
    setState(() {
      _duvidas.add(DuvidaModel());
    });
  }

  void _removerDuvida(int index) {
    if (_duvidas.length > 1) {
      setState(() {
        _duvidas[index].perguntaController.dispose();
        _duvidas[index].respostaController.dispose();
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
        title: const Text('Dúvidas Frequentes', style: TextStyle(color: Colors.white)),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 900),
              padding: const EdgeInsets.all(28.0),
              decoration: BoxDecoration(
                color: const Color(0xFF0B101D),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF1B2336)),
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
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFFA855F7).withAlpha(40),
                                  blurRadius: 12,
                                  spreadRadius: 1,
                                )
                              ],
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
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
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
                        label: const Text('Adicionar'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E1B4B),
                          foregroundColor: const Color(0xFFA855F7),
                          side: const BorderSide(color: Color(0xFF3B1F60)),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
                                text: 'As dúvidas e respostas que você cadastrar serão enviadas ',
                              ),
                              TextSpan(
                                text: 'exatamente como digitadas',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              TextSpan(
                                text: ' para o cliente.',
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Column(
                    children: [
                      for (int i = 0; i < _duvidas.length; i++) ...[
                        if (i > 0) const SizedBox(height: 16),
                        _DuvidaCardItem(
                          key: ObjectKey(_duvidas[i]),
                          item: _duvidas[i],
                          onDelete: () => _removerDuvida(i),
                          canDelete: _duvidas.length > 1,
                        ),
                      ],
                    ],
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
  final VoidCallback onDelete;
  final bool canDelete;

  const _DuvidaCardItem({
    super.key,
    required this.item,
    required this.onDelete,
    required this.canDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F1422),
        borderRadius: BorderRadius.circular(12),
        border: const Border(
          left: BorderSide(color: Color(0xFFA855F7), width: 4),
          top: BorderSide(color: Color(0xFF1B2336)),
          right: BorderSide(color: Color(0xFF1B2336)),
          bottom: BorderSide(color: Color(0xFF1B2336)),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E1B4B),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Row(
                    children: [
                      Icon(
                        Icons.help_outline,
                        size: 14,
                        color: Color(0xFFA855F7),
                      ),
                      SizedBox(width: 6),
                      Text(
                        'DÚVIDA FREQUENTE',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFA855F7),
                          letterSpacing: 0.6,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: Icon(
                    Icons.close,
                    size: 18,
                    color: canDelete ? const Color(0xFF64748B) : Colors.transparent,
                  ),
                  onPressed: canDelete ? onDelete : null,
                  padding: const EdgeInsets.all(4),
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  splashRadius: 18,
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'PERGUNTA',
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
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Ex: Qual o horário de funcionamento?',
                hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 14),
                filled: true,
                fillColor: const Color(0xFF090D16),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
              'RESPOSTA',
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
              style: const TextStyle(color: Colors.white, fontSize: 14),
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'Digite aqui a resposta que será enviada ao cliente...',
                hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 14),
                filled: true,
                fillColor: const Color(0xFF090D16),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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