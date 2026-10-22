import 'package:flutter/material.dart';
import 'package:flutter_application_1/services/api_service.dart';
import 'package:flutter_application_1/services/session.dart';

class Profissional {
  String id;
  String nome;
  Map<String, DiaJornada> jornada;
  TimeOfDay inicioAlmoco;
  TimeOfDay fimAlmoco;
  double? comissaoPercentual;

  Profissional({
    required this.id,
    required this.nome,
    required this.jornada,
    required this.inicioAlmoco,
    required this.fimAlmoco,
    this.comissaoPercentual = 0,
  });

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> jornadaMap = {};
    jornada.forEach((key, value) {
      jornadaMap[key] = value.toJson();
    });

    return {
      'id': id,
      'nome': nome,
      'comissao_percentual': comissaoPercentual,
      'inicioAlmocoHour': inicioAlmoco.hour,
      'inicioAlmocoMinute': inicioAlmoco.minute,
      'fimAlmocoHour': fimAlmoco.hour,
      'fimAlmocoMinute': fimAlmoco.minute,
      'jornada': jornadaMap,
    };
  }

  factory Profissional.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> rawJornada = json['jornada'] ?? {};
    final Map<String, DiaJornada> parsedJornada = {};

    rawJornada.forEach((key, value) {
      parsedJornada[key] = DiaJornada.fromJson(
        Map<String, dynamic>.from(value),
      );
    });

    return Profissional(
      id: json['id'],
      nome: json['nome'],
      comissaoPercentual:
          double.tryParse((json['comissao_percentual'] ?? 0).toString()) ?? 0,
      inicioAlmoco: TimeOfDay(
        hour: json['inicioAlmocoHour'],
        minute: json['inicioAlmocoMinute'],
      ),
      fimAlmoco: TimeOfDay(
        hour: json['fimAlmocoHour'],
        minute: json['fimAlmocoMinute'],
      ),
      jornada: parsedJornada,
    );
  }
}

class DiaJornada {
  bool ativo;
  TimeOfDay entrada;
  TimeOfDay saida;

  DiaJornada({required this.ativo, required this.entrada, required this.saida});

  Map<String, dynamic> toJson() {
    return {
      'ativo': ativo,
      'entradaHour': entrada.hour,
      'entradaMinute': entrada.minute,
      'saidaHour': saida.hour,
      'saidaMinute': saida.minute,
    };
  }

  factory DiaJornada.fromJson(Map<String, dynamic> json) {
    return DiaJornada(
      ativo: json['ativo'],
      entrada: TimeOfDay(
        hour: json['entradaHour'],
        minute: json['entradaMinute'],
      ),
      saida: TimeOfDay(hour: json['saidaHour'], minute: json['saidaMinute']),
    );
  }
}

class Profissionais extends StatefulWidget {
  const Profissionais({super.key});

  @override
  State<Profissionais> createState() => _ProfissionaisState();
}

class _ProfissionaisState extends State<Profissionais> {
  final TextEditingController _searchController = TextEditingController();
  String _filtroBusca = '';
  List<Profissional> _listaProfissionais = [];
  final Set<Profissional> _alterados = {};
  final Set<String> _idsRemovidos = {};
  bool _carregando = true;
  bool _salvando = false;

  @override
  void initState() {
    super.initState();
    _carregarDadosSalvos();
  }

  Future<void> _carregarDadosSalvos() async {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null) {
      setState(() => _carregando = false);
      return;
    }

    try {
      final lista = await ApiService.getProfissionais(barbeariaId);
      if (lista.isEmpty) {
        await _carregarListaPadrao();
        return;
      }
      setState(() {
        _listaProfissionais = lista
            .map((item) => Profissional.fromJson(item))
            .toList();
        _carregando = false;
      });
    } catch (e) {
      setState(() => _carregando = false);
      _mostrarErro(e.toString());
    }
  }

  void _salvarDados(Profissional prof) {
    setState(() => _alterados.add(prof));
  }

  Future<void> _confirmarAlteracoes() async {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null || _salvando) return;
    for (final profissional in _alterados) {
      final comissao = profissional.comissaoPercentual;
      if (comissao == null ||
          !comissao.isFinite ||
          comissao < 0 ||
          comissao > 100) {
        _mostrarErro(
          'Informe uma comissão entre 0 e 100% para ${profissional.nome}.',
        );
        return;
      }
    }
    setState(() => _salvando = true);
    try {
      for (final id in _idsRemovidos) {
        await ApiService.removerProfissional(id);
      }
      for (final profissional in _alterados.toList()) {
        if (profissional.nome.trim().isEmpty) {
          throw ApiException('Informe o nome de todos os profissionais');
        }
        if (profissional.id.isEmpty) {
          profissional.id = await ApiService.criarProfissional(
            barbeariaId,
            profissional.toJson(),
          );
        } else {
          await ApiService.atualizarProfissional(
            profissional.id,
            profissional.toJson(),
          );
        }
      }
      if (!mounted) return;
      setState(() {
        _idsRemovidos.clear();
        _alterados.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profissionais salvos com sucesso'),
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

  Future<void> _carregarListaPadrao() async {
    final padrao = Profissional(
      id: '',
      nome: 'Nome do Profissional',
      inicioAlmoco: const TimeOfDay(hour: 12, minute: 0),
      fimAlmoco: const TimeOfDay(hour: 13, minute: 0),
      jornada: {
        'Seg': DiaJornada(
          ativo: true,
          entrada: const TimeOfDay(hour: 8, minute: 0),
          saida: const TimeOfDay(hour: 18, minute: 0),
        ),
        'Ter': DiaJornada(
          ativo: true,
          entrada: const TimeOfDay(hour: 8, minute: 0),
          saida: const TimeOfDay(hour: 18, minute: 0),
        ),
        'Qua': DiaJornada(
          ativo: true,
          entrada: const TimeOfDay(hour: 8, minute: 0),
          saida: const TimeOfDay(hour: 18, minute: 0),
        ),
        'Qui': DiaJornada(
          ativo: true,
          entrada: const TimeOfDay(hour: 8, minute: 0),
          saida: const TimeOfDay(hour: 18, minute: 0),
        ),
        'Sex': DiaJornada(
          ativo: true,
          entrada: const TimeOfDay(hour: 8, minute: 0),
          saida: const TimeOfDay(hour: 18, minute: 0),
        ),
        'Sáb': DiaJornada(
          ativo: false,
          entrada: const TimeOfDay(hour: 8, minute: 0),
          saida: const TimeOfDay(hour: 18, minute: 0),
        ),
        'Dom': DiaJornada(
          ativo: false,
          entrada: const TimeOfDay(hour: 8, minute: 0),
          saida: const TimeOfDay(hour: 18, minute: 0),
        ),
      },
    );

    setState(() {
      _listaProfissionais = [padrao];
      _carregando = false;
    });
  }

  void _adicionarProfissional() {
    final TextEditingController nomeController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF131722),
          title: const Text(
            'Novo Profissional',
            style: TextStyle(color: Colors.white, fontSize: 16),
          ),
          content: TextField(
            controller: nomeController,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Digite o nome...',
              hintStyle: const TextStyle(color: Colors.grey),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF2A2E3D)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFFA855F7)),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text(
                'Cancelar',
                style: TextStyle(color: Colors.grey),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFA855F7),
              ),
              onPressed: () {
                if (nomeController.text.trim().isEmpty) return;
                final barbeariaId = Session.barbeariaId;
                if (barbeariaId == null) return;

                final novo = Profissional(
                  id: '',
                  nome: nomeController.text.trim(),
                  inicioAlmoco: const TimeOfDay(hour: 12, minute: 0),
                  fimAlmoco: const TimeOfDay(hour: 13, minute: 0),
                  jornada: {
                    'Seg': DiaJornada(
                      ativo: true,
                      entrada: const TimeOfDay(hour: 8, minute: 0),
                      saida: const TimeOfDay(hour: 18, minute: 0),
                    ),
                    'Ter': DiaJornada(
                      ativo: true,
                      entrada: const TimeOfDay(hour: 8, minute: 0),
                      saida: const TimeOfDay(hour: 18, minute: 0),
                    ),
                    'Qua': DiaJornada(
                      ativo: true,
                      entrada: const TimeOfDay(hour: 8, minute: 0),
                      saida: const TimeOfDay(hour: 18, minute: 0),
                    ),
                    'Qui': DiaJornada(
                      ativo: true,
                      entrada: const TimeOfDay(hour: 8, minute: 0),
                      saida: const TimeOfDay(hour: 18, minute: 0),
                    ),
                    'Sex': DiaJornada(
                      ativo: true,
                      entrada: const TimeOfDay(hour: 8, minute: 0),
                      saida: const TimeOfDay(hour: 18, minute: 0),
                    ),
                    'Sáb': DiaJornada(
                      ativo: false,
                      entrada: const TimeOfDay(hour: 8, minute: 0),
                      saida: const TimeOfDay(hour: 12, minute: 0),
                    ),
                    'Dom': DiaJornada(
                      ativo: false,
                      entrada: const TimeOfDay(hour: 8, minute: 0),
                      saida: const TimeOfDay(hour: 12, minute: 0),
                    ),
                  },
                );

                setState(() {
                  _listaProfissionais.add(novo);
                  _alterados.add(novo);
                });
                if (context.mounted) Navigator.pop(context);
              },
              child: const Text(
                'Adicionar',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        );
      },
    );
  }

  Future<void> _editarNomeProfissional(Profissional profissional) async {
    final nomeController = TextEditingController(text: profissional.nome);

    final novoNome = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: const Color(0xFF131722),
        title: const Text(
          'Alterar nome',
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
        content: TextField(
          controller: nomeController,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            labelText: 'Nome do profissional',
            labelStyle: const TextStyle(color: Colors.grey),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFF2A2E3D)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFFA855F7)),
            ),
          ),
          onSubmitted: (valor) {
            if (valor.trim().isNotEmpty)
              Navigator.pop(dialogContext, valor.trim());
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFA855F7),
            ),
            onPressed: () {
              final nome = nomeController.text.trim();
              if (nome.isNotEmpty) Navigator.pop(dialogContext, nome);
            },
            child: const Text('Alterar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    nomeController.dispose();
    if (novoNome == null || !mounted) return;
    setState(() {
      profissional.nome = novoNome;
      _alterados.add(profissional);
    });
  }

  String _formatTime(TimeOfDay time) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  Future<TimeOfDay?> _selecionarHorario(TimeOfDay horarioAtual) async {
    return await showTimePicker(context: context, initialTime: horarioAtual);
  }

  @override
  Widget build(BuildContext context) {
    if (_carregando) {
      return const Scaffold(
        backgroundColor: Color(0xFF090C15),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFFA855F7)),
        ),
      );
    }

    final profissionaisFiltrados = _listaProfissionais
        .where((p) => p.nome.toLowerCase().contains(_filtroBusca.toLowerCase()))
        .toList();

    return Scaffold(
      backgroundColor: const Color(0xFF090C15),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090C15),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Profissionais',
          style: TextStyle(color: Colors.white),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF101421),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFFA855F7).withValues(alpha: 0.45),
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFA855F7).withValues(alpha: 0.08),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final bool isMobile = constraints.maxWidth < 560;

                        final tituloBloco = Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E1B4B),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(
                                Icons.people_alt_outlined,
                                color: Color(0xFFA855F7),
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Profissionais',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  Text(
                                    'Equipe e horários.',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        );

                        final buscaCampo = SizedBox(
                          height: 38,
                          child: TextField(
                            controller: _searchController,
                            onChanged: (val) =>
                                setState(() => _filtroBusca = val),
                            style: const TextStyle(
                              fontSize: 13,
                              color: Colors.white,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Buscar...',
                              hintStyle: const TextStyle(
                                color: Colors.grey,
                                fontSize: 13,
                              ),
                              prefixIcon: const Icon(
                                Icons.search,
                                color: Colors.grey,
                                size: 18,
                              ),
                              filled: true,
                              fillColor: const Color(0xFF131722),
                              contentPadding: EdgeInsets.zero,
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(
                                  color: Color(0xFF2A2E3D),
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(
                                  color: Color(0xFFA855F7),
                                ),
                              ),
                            ),
                          ),
                        );

                        final botaoAdd = SizedBox(
                          height: 38,
                          child: ElevatedButton.icon(
                            onPressed: _adicionarProfissional,
                            icon: const Icon(
                              Icons.person_add_outlined,
                              size: 16,
                            ),
                            label: const Text(
                              'Adicionar',
                              style: TextStyle(fontSize: 13),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF1E1B4B),
                              foregroundColor: const Color(0xFFA855F7),
                              side: const BorderSide(color: Color(0xFF3B1F60)),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        );

                        if (isMobile) {
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              tituloBloco,
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(child: buscaCampo),
                                  const SizedBox(width: 8),
                                  botaoAdd,
                                ],
                              ),
                            ],
                          );
                        }

                        return Row(
                          children: [
                            Expanded(child: tituloBloco),
                            const SizedBox(width: 12),
                            SizedBox(width: 220, child: buscaCampo),
                            const SizedBox(width: 12),
                            botaoAdd,
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 16),

                    profissionaisFiltrados.isEmpty
                        ? const Padding(
                            padding: EdgeInsets.symmetric(vertical: 32.0),
                            child: Center(
                              child: Text(
                                'Nenhum profissional encontrado.',
                                style: TextStyle(color: Colors.grey),
                              ),
                            ),
                          )
                        : ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: profissionaisFiltrados.length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: 16),
                            itemBuilder: (context, index) {
                              final prof = profissionaisFiltrados[index];
                              return _buildProfissionalCard(prof);
                            },
                          ),
                    const SizedBox(height: 20),
                    SizedBox(
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
                          _salvando ? 'Salvando...' : 'Confirmar alterações',
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
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfissionalCard(Profissional prof) {
    return Container(
      key: ObjectKey(prof),
      decoration: BoxDecoration(
        color: const Color(0xFF131722),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1F2433)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(width: 4, color: const Color(0xFFA855F7)),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const CircleAvatar(
                            radius: 16,
                            backgroundColor: Color(0xFF1E1B4B),
                            child: Icon(
                              Icons.person_outline,
                              color: Color(0xFFA855F7),
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              prof.nome,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          IconButton(
                            tooltip: 'Alterar nome',
                            icon: const Icon(
                              Icons.edit_outlined,
                              color: Colors.grey,
                              size: 20,
                            ),
                            onPressed: () => _editarNomeProfissional(prof),
                            constraints: const BoxConstraints(
                              minWidth: 32,
                              minHeight: 32,
                            ),
                            padding: EdgeInsets.zero,
                          ),
                          IconButton(
                            tooltip: 'Excluir profissional',
                            icon: const Icon(
                              Icons.delete_outline,
                              color: Colors.grey,
                              size: 20,
                            ),
                            onPressed: () {
                              setState(() {
                                if (prof.id.isNotEmpty)
                                  _idsRemovidos.add(prof.id);
                                _alterados.remove(prof);
                                _listaProfissionais.remove(prof);
                              });
                            },
                            constraints: const BoxConstraints(
                              minWidth: 32,
                              minHeight: 32,
                            ),
                            padding: EdgeInsets.zero,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        initialValue: (prof.comissaoPercentual ?? 0)
                            .toStringAsFixed(2)
                            .replaceAll('.', ','),
                        enabled: !_salvando,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                        ),
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        decoration: InputDecoration(
                          labelText: 'Comissão do profissional',
                          labelStyle: const TextStyle(color: Color(0xFFC084FC)),
                          suffixText: '%',
                          suffixStyle: const TextStyle(
                            color: Color(0xFFC084FC),
                          ),
                          prefixIcon: const Icon(
                            Icons.percent_rounded,
                            color: Color(0xFFA855F7),
                          ),
                          helperText: 'Percentual entre 0 e 100',
                          helperStyle: const TextStyle(color: Colors.grey),
                          filled: true,
                          fillColor: const Color(0xFF0D1019),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: const BorderSide(
                              color: Color(0xFF2A2E3D),
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: const BorderSide(
                              color: Color(0xFFA855F7),
                            ),
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        validator: (texto) {
                          final valor = double.tryParse(
                            (texto ?? '').trim().replaceAll(',', '.'),
                          );
                          return valor == null ||
                                  !valor.isFinite ||
                                  valor < 0 ||
                                  valor > 100
                              ? 'Informe um valor entre 0 e 100%'
                              : null;
                        },
                        onChanged: (texto) {
                          prof.comissaoPercentual = double.tryParse(
                            texto.trim().replaceAll(',', '.'),
                          );
                          _salvarDados(prof);
                        },
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0D1019),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFF1F2433)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'JORNADA DE TRABALHO',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 10),
                            ...prof.jornada.keys.map((dia) {
                              final diaInfo = prof.jornada[dia]!;
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8.0),
                                child: Row(
                                  children: [
                                    SizedBox(
                                      width: 80,
                                      child: InkWell(
                                        onTap: () {
                                          setState(() {
                                            diaInfo.ativo = !diaInfo.ativo;
                                          });
                                          _salvarDados(prof);
                                        },
                                        child: Row(
                                          children: [
                                            SizedBox(
                                              width: 20,
                                              height: 20,
                                              child: Checkbox(
                                                value: diaInfo.ativo,
                                                activeColor: const Color(
                                                  0xFFA855F7,
                                                ),
                                                checkColor: Colors.white,
                                                shape: RoundedRectangleBorder(
                                                  borderRadius:
                                                      BorderRadius.circular(4),
                                                ),
                                                side: const BorderSide(
                                                  color: Color(0xFF3B4155),
                                                ),
                                                onChanged: (val) {
                                                  setState(() {
                                                    diaInfo.ativo =
                                                        val ?? false;
                                                  });
                                                  _salvarDados(prof);
                                                },
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              dia,
                                              style: TextStyle(
                                                color: diaInfo.ativo
                                                    ? Colors.white
                                                    : Colors.grey.shade600,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: TimeBox(
                                        time: _formatTime(diaInfo.entrada),
                                        enabled: diaInfo.ativo,
                                        onTap: () async {
                                          if (!diaInfo.ativo) return;
                                          final novo = await _selecionarHorario(
                                            diaInfo.entrada,
                                          );
                                          if (novo != null) {
                                            setState(
                                              () => diaInfo.entrada = novo,
                                            );
                                            _salvarDados(prof);
                                          }
                                        },
                                      ),
                                    ),
                                    const Padding(
                                      padding: EdgeInsets.symmetric(
                                        horizontal: 6.0,
                                      ),
                                      child: Text(
                                        '-',
                                        style: TextStyle(
                                          color: Colors.grey,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      child: TimeBox(
                                        time: _formatTime(diaInfo.saida),
                                        enabled: diaInfo.ativo,
                                        onTap: () async {
                                          if (!diaInfo.ativo) return;
                                          final novo = await _selecionarHorario(
                                            diaInfo.saida,
                                          );
                                          if (novo != null) {
                                            setState(
                                              () => diaInfo.saida = novo,
                                            );
                                            _salvarDados(prof);
                                          }
                                        },
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),

                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0D1019),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFF1F2433)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(
                                  Icons.free_breakfast_outlined,
                                  size: 14,
                                  color: Color(0xFFA855F7),
                                ),
                                SizedBox(width: 6),
                                Text(
                                  'HORÁRIO DE ALMOÇO',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFFA855F7),
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Expanded(
                                  child: TimeBox(
                                    time: _formatTime(prof.inicioAlmoco),
                                    enabled: true,
                                    onTap: () async {
                                      final novo = await _selecionarHorario(
                                        prof.inicioAlmoco,
                                      );
                                      if (novo != null) {
                                        setState(
                                          () => prof.inicioAlmoco = novo,
                                        );
                                        _salvarDados(prof);
                                      }
                                    },
                                  ),
                                ),
                                const Padding(
                                  padding: EdgeInsets.symmetric(
                                    horizontal: 6.0,
                                  ),
                                  child: Text(
                                    '-',
                                    style: TextStyle(
                                      color: Colors.grey,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                                Expanded(
                                  child: TimeBox(
                                    time: _formatTime(prof.fimAlmoco),
                                    enabled: true,
                                    onTap: () async {
                                      final novo = await _selecionarHorario(
                                        prof.fimAlmoco,
                                      );
                                      if (novo != null) {
                                        setState(() => prof.fimAlmoco = novo);
                                        _salvarDados(prof);
                                      }
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
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

class TimeBox extends StatelessWidget {
  final String time;
  final bool enabled;
  final VoidCallback onTap;

  const TimeBox({
    super.key,
    required this.time,
    required this.enabled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 32,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: const Color(0xFF131722),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: enabled ? const Color(0xFF2A2E3D) : const Color(0xFF1A1D27),
          ),
        ),
        child: Text(
          time,
          style: TextStyle(
            color: enabled ? Colors.white : Colors.grey.shade700,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
