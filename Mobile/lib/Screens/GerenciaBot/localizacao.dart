import 'package:flutter/material.dart';

class LocalizacaoScreen extends StatefulWidget {
  const LocalizacaoScreen({super.key});

  @override
  State<LocalizacaoScreen> createState() => _LocalizacaoScreenState();
}

class _LocalizacaoScreenState extends State<LocalizacaoScreen> {
  final TextEditingController _mensagemController = TextEditingController(
    text: "Exemplo:\n"
        "📍 Endereço: Rua das Flores, 123 - Centro\n\n"
        "🚗 Referência: Em frente à Praça Central\n\n"
        "🗺️ Google Maps: https://maps.google.com/...",
  );

  @override
  void dispose() {
    _mensagemController.dispose();
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
        title: const Text('Localização', style: TextStyle(color: Colors.white)),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(12.0),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 640),
              padding: const EdgeInsets.all(12.0),
              decoration: BoxDecoration(
                color: const Color(0xFF0B101D),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF1B2336)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [

                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F2636),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.location_on_outlined,
                          color: Color(0xFF38BDF8),
                          size: 16,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Localização',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Configure a mensagem para seus clientes',
                              style: TextStyle(
                                fontSize: 10,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1C1A0E),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF423B15)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: const [
                            Icon(
                              Icons.error_outline,
                              color: Color(0xFFEAB308),
                              size: 13,
                            ),
                            SizedBox(width: 5),
                            Expanded(
                              child: Text(
                                'Atenção Importante',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFFEAB308),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 5),
                        RichText(
                          text: const TextSpan(
                            style: TextStyle(
                              fontSize: 10,
                              color: Color(0xFFFDE047),
                              height: 1.3,
                            ),
                            children: [
                              TextSpan(
                                text: 'A mensagem que você escrever aqui será enviada ',
                              ),
                              TextSpan(
                                text: 'exatamente como digitada',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              TextSpan(
                                text: ' para o cliente quando ele solicitar a localização.',
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),

                  RichText(
                    text: const TextSpan(
                      style: TextStyle(fontSize: 11),
                      children: [
                        TextSpan(
                          text: 'Mensagem de Localização ',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                        TextSpan(
                          text: '(endereço, referência, link do Maps, etc.)',
                          style: TextStyle(color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6),

                  TextField(
                    controller: _mensagemController,
                    maxLines: 5,
                    style: const TextStyle(
                      color: Color(0xFFCBD5E1),
                      fontSize: 12,
                      height: 1.4,
                    ),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: const Color(0xFF0F172A),
                      contentPadding: const EdgeInsets.all(10),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFF1E293B)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFF38BDF8)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),

                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        '💡',
                        style: TextStyle(fontSize: 10),
                      ),
                      SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          'Dica: você pode usar emojis, quebras de linha e formatação.',
                          style: TextStyle(
                            fontSize: 10,
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
        ),
      ),
    );
  }
}
