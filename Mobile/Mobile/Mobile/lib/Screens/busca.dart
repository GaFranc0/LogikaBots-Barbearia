import 'package:flutter/material.dart';
import 'package:flutter_application_1/Screens/GerenciaBot/servico.dart';
import 'package:flutter_application_1/services/api_service.dart';
import 'package:flutter_application_1/services/session.dart';

class Busca extends StatefulWidget {
  final List<Servico>? listaServicos;

  const Busca({this.listaServicos, super.key});

  @override
  State<Busca> createState() => _BuscaState();
}

class _BuscaState extends State<Busca> {

  List<Servico> _todosServicos = [];
  List<Servico> servicosFiltrados = [];
  bool _carregando = true;

  final TextEditingController _buscaCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();

    if (widget.listaServicos != null) {
      _todosServicos = widget.listaServicos!;
      servicosFiltrados = _todosServicos;
      _carregando = false;
    } else {
      _carregarServicos();
    }
  }

  Future<void> _carregarServicos() async {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null) {
      setState(() => _carregando = false);
      return;
    }

    try {
      final lista = await ApiService.getServicos(barbeariaId);
      setState(() {
        _todosServicos = lista.map((json) => Servico.fromJson(json)).toList();
        servicosFiltrados = _todosServicos;
        _carregando = false;
      });
    } catch (e) {
      setState(() => _carregando = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  void _filtrarServicos(String textoDigitado) {
    setState(() {
      if (textoDigitado.isEmpty) {
        servicosFiltrados = _todosServicos;
      } else {

        servicosFiltrados = _todosServicos
            .where((servico) => servico.nome
                .toLowerCase()
                .contains(textoDigitado.toLowerCase()))
            .toList();
      }
    });
  }

  @override
  void dispose() {
    _buscaCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Buscar Serviço'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [

            TextField(
              controller: _buscaCtrl,
              onChanged: _filtrarServicos,
              decoration: InputDecoration(
                labelText: 'Digite o nome do serviço',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                suffixIcon: _buscaCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _buscaCtrl.clear();
                          _filtrarServicos('');
                        },
                      )
                    : null,
              ),
            ),
            const SizedBox(height: 20),

            Expanded(
              child: _carregando
                  ? const Center(child: CircularProgressIndicator())
                  : servicosFiltrados.isEmpty
                  ? const Center(
                      child: Text('Nenhum serviço encontrado.'),
                    )
                  : ListView.builder(
                      itemCount: servicosFiltrados.length,
                      itemBuilder: (context, index) {
                        final item = servicosFiltrados[index];
                        return Card(
                          margin: const EdgeInsets.symmetric(vertical: 6),
                          child: ListTile(
                            leading: const Icon(Icons.build_circle_outlined),
                            title: Text(item.nome),
                            subtitle: Text('${item.minutos} min'),
                            trailing: Text(
                              'R\$ ${item.valor.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.green,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}