import 'package:flutter/material.dart';
import 'package:flutter_application_1/services/api_service.dart';
import 'package:flutter_application_1/services/session.dart';

class LocalizacaoScreen extends StatefulWidget {
  const LocalizacaoScreen({super.key});

  @override
  State<LocalizacaoScreen> createState() => _LocalizacaoScreenState();
}

class _LocalizacaoScreenState extends State<LocalizacaoScreen> {
  final TextEditingController _mensagemController = TextEditingController();
  bool _carregando = true;
  bool _salvando = false;
  bool _alterado = false;

  @override
  void initState() {
    super.initState();
    _carregarLocalizacao();
    _mensagemController.addListener(_marcarAlterado);
  }

  Future<void> _carregarLocalizacao() async {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null) {
      setState(() => _carregando = false);
      return;
    }

    try {
      final mensagem = await ApiService.getLocalizacao(barbeariaId);
      setState(() {
        _mensagemController.text = mensagem.isNotEmpty
            ? mensagem
            : "Exemplo:\n"
                  "📍 Endereço: Rua das Flores, 123 - Centro\n\n"
                  "🚗 Referência: Em frente à Praça Central\n\n"
                  "🗺️ Google Maps: https://maps.google.com/...";
        _carregando = false;
      });
    } catch (e) {
      setState(() => _carregando = false);
      _mostrarErro(e.toString());
    }
  }

  void _mostrarErro(String mensagem) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(mensagem)));
  }

  void _marcarAlterado() {
    if (_carregando) return;
    if (mounted) setState(() => _alterado = true);
  }

  Future<void> _salvarLocalizacao() async {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null || _salvando) return;

    setState(() => _salvando = true);

    try {
      await ApiService.salvarLocalizacao(barbeariaId, _mensagemController.text);
      if (!mounted) return;
      setState(() => _alterado = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Localização salva com sucesso'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
    } catch (e) {
      _mostrarErro(e.toString());
    } finally {
      if (mounted) setState(() => _salvando = false);
    }
  }

  @override
  void dispose() {
    _mensagemController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_carregando) {
      return const Scaffold(
        backgroundColor: Color(0xFF060913),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF38BDF8)),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF060913),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060913),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Localização', style: TextStyle(color: Colors.white)),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              Expanded(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20.0),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0B101D),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFF38BDF8).withValues(alpha: 0.4),
                      width: 1.2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF38BDF8).withValues(alpha: 0.08),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F2636),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.location_on_outlined,
                              color: Color(0xFF38BDF8),
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Localização',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Configure a mensagem para seus clientes',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF94A3B8),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
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
                                  size: 16,
                                ),
                                SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'Atenção Importante',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFFEAB308),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            RichText(
                              text: const TextSpan(
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFFFDE047),
                                  height: 1.3,
                                ),
                                children: [
                                  TextSpan(
                                    text:
                                        'A mensagem que você escrever aqui será enviada ',
                                  ),
                                  TextSpan(
                                    text: 'exatamente como digitada',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  TextSpan(
                                    text:
                                        ' para o cliente quando ele solicitar a localização.',
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),

                      RichText(
                        text: const TextSpan(
                          style: TextStyle(fontSize: 13),
                          children: [
                            TextSpan(
                              text: 'Mensagem de Localização ',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                            TextSpan(
                              text:
                                  '(endereço, referência, link do Maps, etc.)',
                              style: TextStyle(color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),

                      Expanded(
                        child: TextField(
                          controller: _mensagemController,
                          maxLines: null,
                          expands: true,
                          textAlignVertical: TextAlignVertical.top,
                          style: const TextStyle(
                            color: Color(0xFFCBD5E1),
                            fontSize: 14,
                            height: 1.5,
                          ),
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: const Color(0xFF0F172A),
                            contentPadding: const EdgeInsets.all(16),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(
                                color: Color(0xFF1E293B),
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(
                                color: Color(0xFF38BDF8),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _alterado && !_salvando
                              ? _salvarLocalizacao
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
                            _salvando ? 'Salvando...' : 'Confirmar alterações',
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF38BDF8),
                            foregroundColor: const Color(0xFF04131C),
                            disabledBackgroundColor: const Color(
                              0xFF38BDF8,
                            ).withValues(alpha: 0.14),
                            disabledForegroundColor: const Color(
                              0xFF7DD3FC,
                            ).withValues(alpha: 0.55),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      const Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('💡', style: TextStyle(fontSize: 12)),
                          SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Dica: você pode usar emojis, quebras de linha e formatação.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
