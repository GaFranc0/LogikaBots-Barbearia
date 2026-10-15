import 'package:flutter/material.dart';
import 'package:flutter_application_1/services/api_service.dart';
import 'package:flutter_application_1/services/session.dart';

class Agendamento {
  final int id;
  final String cliente;
  final String horario;
  final DateTime data;
  final String profissional;
  final String servico;
  final double valor;
  String status;
  final Map<String, dynamic> clienteDados;

  Agendamento({
    required this.id,
    required this.cliente,
    required this.horario,
    required this.data,
    required this.profissional,
    required this.servico,
    required this.valor,
    this.status = 'Agendado',
    this.clienteDados = const {},
  });

  factory Agendamento.fromJson(Map<String, dynamic> json) {
    return Agendamento(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      cliente: json['cliente'] ?? '',
      clienteDados: Map<String, dynamic>.from(json['cliente_dados'] ?? {}),
      horario: json['horario'] ?? '',
      data: DateTime.tryParse(json['data'].toString()) ?? DateTime.now(),
      profissional: json['profissional'] ?? '',
      servico: json['servico'] ?? '',
      valor: double.tryParse(json['valor'].toString()) ?? 0.0,
      status: json['status'] ?? 'Agendado',
    );
  }
}

class VerAgendamentos extends StatefulWidget {
  const VerAgendamentos({super.key});

  @override
  State<VerAgendamentos> createState() => _VerAgendamentosState();
}

class _VerAgendamentosState extends State<VerAgendamentos> {
  int _filtroFiltroData = 0;
  String _barbeiroSelecionado = 'Todos os Barbeiros';
  final TextEditingController _buscaCtrl = TextEditingController();

  final Color _bgDark = const Color(0xFF030712);
  final Color _cardBg = const Color(0xFF090D1A);
  final Color _innerCardBg = const Color(0xFF0F172A);
  final Color _borderColor = const Color(0xFF1E293B);

  List<String> _listaBarbeiros = ['Todos os Barbeiros'];
  List<Map<String, String>> _profissionais = [];
  List<String> _horariosAtendimento = [];

  List<Agendamento> _agendamentos = [];
  bool _carregando = true;
  String? _erroCarregamento;
  final Set<int> _statusEmAtualizacao = {};

  @override
  void initState() {
    super.initState();
    _carregarDados();

    _buscaCtrl.addListener(() {
      setState(() {});
    });
  }

  Future<void> _carregarDados() async {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null) {
      setState(() {
        _carregando = false;
        _erroCarregamento = 'Sessão expirada. Faça login novamente.';
      });
      return;
    }

    try {
      final resultados = await Future.wait([
        ApiService.getAgendamentos(barbeariaId),
        ApiService.getProfissionais(barbeariaId),
        ApiService.getHorario(barbeariaId),
      ]);

      final listaAgendamentos = resultados[0] as List<dynamic>;
      final listaProfissionais = resultados[1] as List<dynamic>;
      final horario = resultados[2] as Map<String, dynamic>;

      final profissionais = listaProfissionais
          .map((p) => {'id': p['id'].toString(), 'nome': p['nome'].toString()})
          .toList();

      if (!mounted) return;
      setState(() {
        _agendamentos = listaAgendamentos
            .map((json) => Agendamento.fromJson(json))
            .toList();
        _profissionais = profissionais;
        _listaBarbeiros = <String>{
          'Todos os Barbeiros',
          ...profissionais.map((p) => p['nome']!),
        }.toList();
        if (!_listaBarbeiros.contains(_barbeiroSelecionado)) {
          _barbeiroSelecionado = 'Todos os Barbeiros';
        }
        _horariosAtendimento = (horario['horarios'] as List<dynamic>? ?? [])
            .map((item) => item.toString())
            .toList();
        _carregando = false;
        _erroCarregamento = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _carregando = false;
        _erroCarregamento = e.toString();
      });
      _mostrarErro(e.toString());
    }
  }

  void _mostrarErro(String mensagem) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(mensagem)));
  }

  void _verInformacoesCliente(Agendamento item) {
    final dados = item.clienteDados;
    final cadastro = DateTime.tryParse(
      dados['data_cadastro']?.toString() ?? '',
    );
    final campos = <String, String>{
      'Nome': dados['nome']?.toString() ?? item.cliente,
      'Telefone': dados['telefone']?.toString() ?? '',
      'Identificador WhatsApp': dados['remoteJid']?.toString() ?? '',
      'Cadastro': cadastro == null
          ? ''
          : '${cadastro.day.toString().padLeft(2, '0')}/${cadastro.month.toString().padLeft(2, '0')}/${cadastro.year} '
                '${cadastro.hour.toString().padLeft(2, '0')}:${cadastro.minute.toString().padLeft(2, '0')}',
      'Código do cliente': dados['id_cliente']?.toString() ?? '',
      'Código da barbearia': dados['id_barbearia']?.toString() ?? '',
    };
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: _innerCardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(
            color: const Color(0xFF10B981).withValues(alpha: 0.4),
          ),
        ),
        title: const Text(
          'Informações do cliente',
          style: TextStyle(color: Colors.white),
        ),
        content: SizedBox(
          width: 420,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: campos.entries
                  .map(
                    (campo) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            campo.key,
                            style: const TextStyle(
                              color: Color(0xFF34D399),
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 4),
                          SelectableText(
                            campo.value.trim().isEmpty
                                ? 'Não informado'
                                : campo.value,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text(
              'Fechar',
              style: TextStyle(color: Color(0xFF34D399)),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _atualizarStatus(Agendamento item, String novoStatus) async {
    if (_statusEmAtualizacao.contains(item.id) || item.status == novoStatus) {
      return;
    }
    setState(() => _statusEmAtualizacao.add(item.id));
    try {
      await ApiService.atualizarStatusAgendamento(item.id, novoStatus);
      if (!mounted) return;
      setState(() => item.status = novoStatus);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Agendamento atualizado: $novoStatus')),
      );
    } catch (e) {
      _mostrarErro(e.toString());
    } finally {
      if (mounted) setState(() => _statusEmAtualizacao.remove(item.id));
    }
  }

  @override
  void dispose() {
    _buscaCtrl.dispose();
    super.dispose();
  }

  List<Agendamento> get _agendamentosFiltrados {
    final hoje = DateTime.now();
    final inicioHoje = DateTime(hoje.year, hoje.month, hoje.day);

    return _agendamentos.where((ag) {
      if (_barbeiroSelecionado != 'Todos os Barbeiros' &&
          ag.profissional != _barbeiroSelecionado) {
        return false;
      }

      if (_buscaCtrl.text.trim().isNotEmpty &&
          !ag.cliente.toLowerCase().contains(
            _buscaCtrl.text.trim().toLowerCase(),
          )) {
        return false;
      }

      final dataAgendamento = DateTime(
        ag.data.year,
        ag.data.month,
        ag.data.day,
      );
      if (_filtroFiltroData == 0) {
        return dataAgendamento.isAtSameMomentAs(inicioHoje);
      } else if (_filtroFiltroData == 1) {
        final amanha = inicioHoje.add(const Duration(days: 1));
        return dataAgendamento.isAtSameMomentAs(amanha);
      } else if (_filtroFiltroData == 2) {
        final fimSemana = inicioHoje.add(const Duration(days: 7));
        return dataAgendamento.isAfter(
              inicioHoje.subtract(const Duration(seconds: 1)),
            ) &&
            dataAgendamento.isBefore(fimSemana);
      }

      return true;
    }).toList();
  }

  int get _totalCortes =>
      _agendamentosFiltrados.where((a) => a.status != 'Cancelado').length;

  double get _faturamentoTotal {
    return _agendamentosFiltrados
        .where((a) => a.status != 'Cancelado')
        .fold(0.0, (sum, item) => sum + item.valor);
  }

  double get _ticketMedio =>
      _totalCortes > 0 ? _faturamentoTotal / _totalCortes : 0.0;

  Color _corStatus(String status) {
    if (status == 'Concluído') return Colors.green;
    if (status == 'Cancelado') return Colors.red;
    return Colors.orange;
  }

  List<Agendamento> _agendamentosDoHorario(String horario) =>
      _agendamentosFiltrados.where((ag) => ag.horario == horario).toList();

  void _exibirAgendamentosDoHorario(String horario) {
    final itens = _agendamentosDoHorario(horario);
    final periodo = _filtroFiltroData == 0
        ? 'Hoje'
        : _filtroFiltroData == 1
        ? 'Amanhã'
        : 'Próximos 7 dias';
    showModalBottomSheet(
      context: context,
      backgroundColor: _cardBg,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return Container(
          padding: const EdgeInsets.all(20),
          height: MediaQuery.of(sheetContext).size.height * 0.65,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Cortes às $horario',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '$periodo • ${itens.length} ${itens.length == 1 ? 'agendamento' : 'agendamentos'}',
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.grey),
                    onPressed: () => Navigator.pop(sheetContext),
                  ),
                ],
              ),
              const Divider(color: Color(0xFF1E293B)),
              Expanded(
                child: itens.isEmpty
                    ? const Center(
                        child: Text(
                          'Nenhum corte agendado neste horário.',
                          style: TextStyle(color: Colors.grey),
                        ),
                      )
                    : ListView.separated(
                        itemCount: itens.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final item = itens[index];
                          final corStatus = _corStatus(item.status);
                          return Material(
                            color: _innerCardBg,
                            borderRadius: BorderRadius.circular(10),
                            clipBehavior: Clip.antiAlias,
                            child: InkWell(
                              onTap: () => _verInformacoesCliente(item),
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: _borderColor),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            item.cliente,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 14,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                        Text(
                                          item.status,
                                          style: TextStyle(
                                            color: corStatus,
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      '${item.data.day.toString().padLeft(2, '0')}/${item.data.month.toString().padLeft(2, '0')}/${item.data.year} • ${item.profissional}',
                                      style: const TextStyle(
                                        color: Color(0xFF94A3B8),
                                        fontSize: 12,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            item.servico,
                                            style: const TextStyle(
                                              color: Color(0xFF94A3B8),
                                              fontSize: 12,
                                            ),
                                          ),
                                        ),
                                        Text(
                                          'R\$ ${item.valor.toStringAsFixed(2)}',
                                          style: const TextStyle(
                                            color: Color(0xFF34D399),
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _exibirTodosHorariosModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: _cardBg,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(20),
          height: MediaQuery.of(context).size.height * 0.75,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Text(
                      'Horários de atendimento',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.grey),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const Divider(color: Color(0xFF1E293B)),
              Expanded(
                child: _horariosAtendimento.isEmpty
                    ? const Center(
                        child: Text(
                          'Nenhum horário de atendimento configurado.',
                          style: TextStyle(color: Colors.grey),
                        ),
                      )
                    : LayoutBuilder(
                        builder: (context, constraints) {
                          final colunas = constraints.maxWidth >= 700
                              ? 5
                              : constraints.maxWidth >= 420
                              ? 3
                              : 2;
                          return GridView.builder(
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: colunas,
                                  crossAxisSpacing: 10,
                                  mainAxisSpacing: 10,
                                  childAspectRatio: 2.2,
                                ),
                            itemCount: _horariosAtendimento.length,
                            itemBuilder: (context, index) {
                              final horario = _horariosAtendimento[index];
                              final quantidade = _agendamentosDoHorario(
                                horario,
                              ).length;
                              final ocupado = quantidade > 0;
                              return Material(
                                color: ocupado
                                    ? const Color(
                                        0xFF10B981,
                                      ).withValues(alpha: 0.1)
                                    : _innerCardBg,
                                borderRadius: BorderRadius.circular(10),
                                clipBehavior: Clip.antiAlias,
                                child: InkWell(
                                  onTap: () =>
                                      _exibirAgendamentosDoHorario(horario),
                                  child: Container(
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                        color: ocupado
                                            ? const Color(
                                                0xFF10B981,
                                              ).withValues(alpha: 0.5)
                                            : _borderColor,
                                      ),
                                    ),
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          horario,
                                          style: const TextStyle(
                                            color: Color(0xFF93C5FD),
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        if (ocupado)
                                          Text(
                                            quantidade == 1
                                                ? '1 corte'
                                                : '$quantidade cortes',
                                            style: const TextStyle(
                                              color: Color(0xFF34D399),
                                              fontSize: 10,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _exibirBloquearHorarioModal() async {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null) {
      _mostrarErro('Sessão inválida. Faça login novamente.');
      return;
    }
    if (_profissionais.isEmpty) {
      _mostrarErro('Cadastre um profissional antes de bloquear um horário.');
      return;
    }

    DateTime dataBloqueio = DateTime.now();
    TimeOfDay horaInicio = const TimeOfDay(hour: 12, minute: 0);
    TimeOfDay horaFim = const TimeOfDay(hour: 13, minute: 0);
    final TextEditingController motivoCtrl = TextEditingController(
      text: 'Almoço / Intervalo',
    );
    String barbeiroId = 'todos';
    bool salvando = false;

    await showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: _cardBg,
              title: const Text(
                'Bloquear Horário na Agenda',
                style: TextStyle(color: Colors.white, fontSize: 16),
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Profissional:',
                      style: TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: barbeiroId,
                      dropdownColor: _innerCardBg,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        enabledBorder: OutlineInputBorder(
                          borderSide: BorderSide(color: _borderColor),
                        ),
                        focusedBorder: const OutlineInputBorder(
                          borderSide: BorderSide(color: Color(0xFFF87171)),
                        ),
                      ),
                      items: [
                        const DropdownMenuItem(
                          value: 'todos',
                          child: Text('Todos os profissionais'),
                        ),
                        ..._profissionais.map(
                          (profissional) => DropdownMenuItem(
                            value: profissional['id'],
                            child: Text(profissional['nome']!),
                          ),
                        ),
                      ],
                      onChanged: salvando
                          ? null
                          : (valor) {
                              if (valor != null) {
                                setModalState(() => barbeiroId = valor);
                              }
                            },
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Selecione a Data:',
                      style: TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                    const SizedBox(height: 6),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: _borderColor),
                      ),
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: dataBloqueio,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(
                            const Duration(days: 365),
                          ),
                        );
                        if (picked != null) {
                          setModalState(() => dataBloqueio = picked);
                        }
                      },
                      icon: const Icon(
                        Icons.calendar_today,
                        color: Colors.amber,
                        size: 16,
                      ),
                      label: Text(
                        '${dataBloqueio.day}/${dataBloqueio.month}/${dataBloqueio.year}',
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Hora Início:',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 12,
                                ),
                              ),
                              TextButton(
                                onPressed: () async {
                                  final t = await showTimePicker(
                                    context: context,
                                    initialTime: horaInicio,
                                  );
                                  if (t != null) {
                                    setModalState(() => horaInicio = t);
                                  }
                                },
                                child: Text(
                                  horaInicio.format(context),
                                  style: const TextStyle(
                                    color: Color(0xFF60A5FA),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Hora Fim:',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 12,
                                ),
                              ),
                              TextButton(
                                onPressed: () async {
                                  final t = await showTimePicker(
                                    context: context,
                                    initialTime: horaFim,
                                  );
                                  if (t != null) {
                                    setModalState(() => horaFim = t);
                                  }
                                },
                                child: Text(
                                  horaFim.format(context),
                                  style: const TextStyle(
                                    color: Color(0xFF60A5FA),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: motivoCtrl,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        labelText: 'Motivo do Bloqueio',
                        labelStyle: const TextStyle(color: Colors.grey),
                        enabledBorder: OutlineInputBorder(
                          borderSide: BorderSide(color: _borderColor),
                        ),
                        focusedBorder: const OutlineInputBorder(
                          borderSide: BorderSide(color: Color(0xFFF87171)),
                        ),
                      ),
                    ),
                  ],
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
                    backgroundColor: const Color(0xFF7F1D1D),
                  ),
                  onPressed: salvando
                      ? null
                      : () async {
                          final inicio = DateTime(
                            dataBloqueio.year,
                            dataBloqueio.month,
                            dataBloqueio.day,
                            horaInicio.hour,
                            horaInicio.minute,
                          );
                          final fim = DateTime(
                            dataBloqueio.year,
                            dataBloqueio.month,
                            dataBloqueio.day,
                            horaFim.hour,
                            horaFim.minute,
                          );
                          if (!fim.isAfter(inicio)) {
                            _mostrarErro(
                              'O horário final deve ser posterior ao inicial.',
                            );
                            return;
                          }
                          if (motivoCtrl.text.trim().isEmpty) {
                            _mostrarErro('Informe o motivo do bloqueio.');
                            return;
                          }

                          setModalState(() => salvando = true);
                          final dados = {
                            'barbeiro_id': barbeiroId,
                            'motivo': motivoCtrl.text.trim(),
                            'dataInicio': inicio.toIso8601String(),
                            'dataFim': fim.toIso8601String(),
                          };
                          try {
                            if (barbeiroId == 'todos') {
                              await ApiService.criarBloqueioParaTodos(
                                barbeariaId,
                                dados,
                              );
                            } else {
                              await ApiService.criarBloqueio(
                                barbeariaId,
                                dados,
                              );
                            }
                            if (!mounted || !context.mounted) return;
                            Navigator.pop(context);
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  'Horário bloqueado com sucesso para ${dataBloqueio.day}/${dataBloqueio.month}!',
                                ),
                                backgroundColor: const Color(0xFF7F1D1D),
                              ),
                            );
                          } catch (e) {
                            if (context.mounted) {
                              setModalState(() => salvando = false);
                            }
                            _mostrarErro(e.toString());
                          }
                        },
                  child: salvando
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text(
                          'Confirmar Bloqueio',
                          style: TextStyle(color: Colors.white),
                        ),
                ),
              ],
            );
          },
        );
      },
    );
    motivoCtrl.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final listagem = _agendamentosFiltrados;

    if (_carregando) {
      return Scaffold(
        backgroundColor: _bgDark,
        body: const Center(
          child: CircularProgressIndicator(color: Colors.deepPurpleAccent),
        ),
      );
    }

    return Scaffold(
      backgroundColor: _bgDark,
      appBar: AppBar(
        backgroundColor: _bgDark,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Agendamentos',
          style: TextStyle(color: Colors.white),
        ),
        actions: [
          IconButton(
            tooltip: 'Atualizar agenda',
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF34D399)),
            onPressed: () {
              setState(() => _carregando = true);
              _carregarDados();
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_erroCarregamento != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(
                    _erroCarregamento!,
                    style: const TextStyle(color: Color(0xFFF87171)),
                  ),
                ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0D9488).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.edit_calendar_rounded,
                      color: Color(0xFF10B981),
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Agendamentos',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Gerencie todos os agendamentos do seu salão',
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              LayoutBuilder(
                builder: (context, constraints) {
                  double cardWidth = (constraints.maxWidth - 24) / 3;
                  if (constraints.maxWidth < 700) {
                    cardWidth = constraints.maxWidth;
                  }
                  return Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      _buildMetricCard(
                        width: cardWidth,
                        title: _filtroFiltroData == 0
                            ? 'CORTES HOJE'
                            : 'TOTAL CORTES',
                        value: '$_totalCortes',
                        icon: Icons.event_available_rounded,
                        glowColor: const Color(0xFF3B82F6),
                        valueColor: Colors.white,
                      ),
                      _buildMetricCard(
                        width: cardWidth,
                        title: 'FATURAMENTO',
                        value: 'R\$ ${_faturamentoTotal.toStringAsFixed(2)}',
                        icon: Icons.attach_money_rounded,
                        glowColor: const Color(0xFF10B981),
                        valueColor: const Color(0xFF34D399),
                      ),
                      _buildMetricCard(
                        width: cardWidth,
                        title: 'TICKET MÉDIO',
                        value: 'R\$ ${_ticketMedio.toStringAsFixed(2)}',
                        icon: Icons.trending_up_rounded,
                        glowColor: const Color(0xFFA855F7),
                        valueColor: const Color(0xFFC084FC),
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 20),

              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _cardBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFF10B981).withValues(alpha: 0.35),
                  ),
                ),
                child: Column(
                  children: [
                    Wrap(
                      alignment: WrapAlignment.start,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: _innerCardBg,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: _borderColor),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _buildTabItem(0, 'Hoje'),
                              _buildTabItem(1, 'Amanhã'),
                              _buildTabItem(2, 'Semana'),
                            ],
                          ),
                        ),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            OutlinedButton.icon(
                              onPressed: _exibirTodosHorariosModal,
                              style: OutlinedButton.styleFrom(
                                backgroundColor: const Color(
                                  0xFF1E293B,
                                ).withValues(alpha: 0.3),
                                side: const BorderSide(
                                  color: Color(0xFF334155),
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              icon: const Icon(
                                Icons.calendar_month_outlined,
                                color: Color(0xFF60A5FA),
                                size: 15,
                              ),
                              label: const Text(
                                'Ver Todos Horários',
                                style: TextStyle(
                                  color: Color(0xFF93C5FD),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            OutlinedButton.icon(
                              onPressed: _exibirBloquearHorarioModal,
                              style: OutlinedButton.styleFrom(
                                backgroundColor: const Color(
                                  0xFF451A03,
                                ).withValues(alpha: 0.2),
                                side: const BorderSide(
                                  color: Color(0xFF7F1D1D),
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              icon: const Icon(
                                Icons.block_rounded,
                                color: Color(0xFFF87171),
                                size: 15,
                              ),
                              label: const Text(
                                'Bloquear Horário',
                                style: TextStyle(
                                  color: Color(0xFFF87171),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    LayoutBuilder(
                      builder: (context, constraints) {
                        final bool isMobile = constraints.maxWidth < 550;

                        final dropdown = Container(
                          height: 42,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: _innerCardBg,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: _borderColor),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _barbeiroSelecionado,
                              isExpanded: true,
                              icon: const Icon(
                                Icons.keyboard_arrow_down_rounded,
                                color: Color(0xFF64748B),
                              ),
                              dropdownColor: _innerCardBg,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                              ),
                              items: _listaBarbeiros.map((String item) {
                                return DropdownMenuItem<String>(
                                  value: item,
                                  child: Row(
                                    children: [
                                      const Icon(
                                        Icons.person_outline_rounded,
                                        color: Color(0xFF64748B),
                                        size: 16,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(item),
                                    ],
                                  ),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  setState(() => _barbeiroSelecionado = val);
                                }
                              },
                            ),
                          ),
                        );

                        final searchField = SizedBox(
                          height: 42,
                          child: TextField(
                            controller: _buscaCtrl,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Buscar cliente...',
                              hintStyle: const TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 13,
                              ),
                              prefixIcon: const Icon(
                                Icons.search_rounded,
                                color: Color(0xFF64748B),
                                size: 18,
                              ),
                              filled: true,
                              fillColor: _innerCardBg,
                              contentPadding: EdgeInsets.zero,
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: _borderColor),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(
                                  color: Color(0xFF3B82F6),
                                ),
                              ),
                            ),
                          ),
                        );

                        if (isMobile) {
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              dropdown,
                              const SizedBox(height: 10),
                              searchField,
                            ],
                          );
                        }

                        return Row(
                          children: [
                            Expanded(child: dropdown),
                            const SizedBox(width: 12),
                            Expanded(child: searchField),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 20),

                    LayoutBuilder(
                      builder: (context, constraints) {
                        if (constraints.maxWidth < 900) {
                          return _buildListaResponsiva(listagem);
                        }
                        return SizedBox(
                          width: constraints.maxWidth,
                          child: Column(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                  horizontal: 16,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(
                                    0xFF0F172A,
                                  ).withValues(alpha: 0.6),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  children: [
                                    SizedBox(
                                      width: 130,
                                      child: Text(
                                        'CLIENTE',
                                        style: _headerStyle,
                                      ),
                                    ),
                                    SizedBox(
                                      width: 80,
                                      child: Text(
                                        'HORÁRIO',
                                        style: _headerStyle,
                                      ),
                                    ),
                                    SizedBox(
                                      width: 90,
                                      child: Text('DATA', style: _headerStyle),
                                    ),
                                    SizedBox(
                                      width: 120,
                                      child: Text(
                                        'PROFISSIONAL',
                                        style: _headerStyle,
                                      ),
                                    ),
                                    SizedBox(
                                      width: 130,
                                      child: Text(
                                        'SERVIÇO',
                                        style: _headerStyle,
                                      ),
                                    ),
                                    SizedBox(
                                      width: 80,
                                      child: Text('VALOR', style: _headerStyle),
                                    ),
                                    SizedBox(
                                      width: 90,
                                      child: Text(
                                        'STATUS',
                                        style: _headerStyle,
                                      ),
                                    ),
                                    Expanded(
                                      child: Text(
                                        'AÇÕES',
                                        textAlign: TextAlign.right,
                                        style: _headerStyle,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              listagem.isEmpty
                                  ? Padding(
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 60,
                                      ),
                                      child: Column(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.all(16),
                                            decoration: BoxDecoration(
                                              color: const Color(
                                                0xFF1E293B,
                                              ).withValues(alpha: 0.3),
                                              borderRadius:
                                                  BorderRadius.circular(12),
                                            ),
                                            child: const Icon(
                                              Icons.calendar_today_outlined,
                                              color: Color(0xFF475569),
                                              size: 32,
                                            ),
                                          ),
                                          const SizedBox(height: 16),
                                          const Text(
                                            'Nenhum agendamento encontrado',
                                            style: TextStyle(
                                              color: Color(0xFF64748B),
                                              fontSize: 14,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ],
                                      ),
                                    )
                                  : ListView.separated(
                                      shrinkWrap: true,
                                      physics:
                                          const NeverScrollableScrollPhysics(),
                                      itemCount: listagem.length,
                                      separatorBuilder: (_, _) => const Divider(
                                        color: Color(0xFF1E293B),
                                        height: 1,
                                      ),
                                      itemBuilder: (context, index) {
                                        final item = listagem[index];
                                        return InkWell(
                                          onTap: () =>
                                              _verInformacoesCliente(item),
                                          child: Padding(
                                            padding: const EdgeInsets.symmetric(
                                              vertical: 12,
                                              horizontal: 16,
                                            ),
                                            child: Row(
                                              children: [
                                                SizedBox(
                                                  width: 130,
                                                  child: Text(
                                                    item.cliente,
                                                    style: const TextStyle(
                                                      color: Colors.white,
                                                      fontSize: 13,
                                                      fontWeight:
                                                          FontWeight.bold,
                                                    ),
                                                  ),
                                                ),
                                                SizedBox(
                                                  width: 80,
                                                  child: Text(
                                                    item.horario,
                                                    style: const TextStyle(
                                                      color: Color(0xFF94A3B8),
                                                      fontSize: 13,
                                                    ),
                                                  ),
                                                ),
                                                SizedBox(
                                                  width: 90,
                                                  child: Text(
                                                    '${item.data.day}/${item.data.month}',
                                                    style: const TextStyle(
                                                      color: Color(0xFF94A3B8),
                                                      fontSize: 13,
                                                    ),
                                                  ),
                                                ),
                                                SizedBox(
                                                  width: 120,
                                                  child: Text(
                                                    item.profissional,
                                                    style: const TextStyle(
                                                      color: Color(0xFF94A3B8),
                                                      fontSize: 13,
                                                    ),
                                                  ),
                                                ),
                                                SizedBox(
                                                  width: 130,
                                                  child: Text(
                                                    item.servico,
                                                    style: const TextStyle(
                                                      color: Color(0xFF94A3B8),
                                                      fontSize: 13,
                                                    ),
                                                  ),
                                                ),
                                                SizedBox(
                                                  width: 80,
                                                  child: Text(
                                                    'R\$ ${item.valor.toStringAsFixed(2)}',
                                                    style: const TextStyle(
                                                      color: Color(0xFF34D399),
                                                      fontSize: 13,
                                                      fontWeight:
                                                          FontWeight.bold,
                                                    ),
                                                  ),
                                                ),
                                                SizedBox(
                                                  width: 90,
                                                  child: Text(
                                                    item.status,
                                                    style: TextStyle(
                                                      color:
                                                          item.status ==
                                                              'Concluído'
                                                          ? Colors.green
                                                          : item.status ==
                                                                'Cancelado'
                                                          ? Colors.red
                                                          : Colors.orange,
                                                      fontSize: 12,
                                                      fontWeight:
                                                          FontWeight.bold,
                                                    ),
                                                  ),
                                                ),
                                                Expanded(
                                                  child: Row(
                                                    mainAxisAlignment:
                                                        MainAxisAlignment.end,
                                                    children: [
                                                      IconButton(
                                                        icon: const Icon(
                                                          Icons
                                                              .check_circle_outline,
                                                          color: Colors.green,
                                                          size: 18,
                                                        ),
                                                        onPressed: () =>
                                                            _atualizarStatus(
                                                              item,
                                                              'Concluído',
                                                            ),
                                                      ),
                                                      IconButton(
                                                        icon: const Icon(
                                                          Icons.cancel_outlined,
                                                          color: Colors.red,
                                                          size: 18,
                                                        ),
                                                        onPressed: () =>
                                                            _atualizarStatus(
                                                              item,
                                                              'Cancelado',
                                                            ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                            ],
                          ),
                        );
                      },
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

  Widget _buildListaResponsiva(List<Agendamento> listagem) {
    if (listagem.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 8),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(
                Icons.event_note_rounded,
                color: Color(0xFF34D399),
                size: 32,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Nenhum agendamento encontrado',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFFCBD5E1),
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Experimente outro período ou ajuste os filtros.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: listagem.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final item = listagem[index];
        final corStatus = item.status == 'Concluído'
            ? Colors.green
            : item.status == 'Cancelado'
            ? Colors.red
            : Colors.orange;
        return Material(
          color: _innerCardBg,
          borderRadius: BorderRadius.circular(10),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => _verInformacoesCliente(item),
            borderRadius: BorderRadius.circular(10),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.cliente,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Text(
                        item.horario,
                        style: const TextStyle(
                          color: Color(0xFF93C5FD),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${item.data.day}/${item.data.month}/${item.data.year} • ${item.profissional}',
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.servico,
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'R\$ ${item.valor.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: Color(0xFF34D399),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Text(
                        item.status,
                        style: TextStyle(
                          color: corStatus,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        tooltip: 'Concluir',
                        visualDensity: VisualDensity.compact,
                        icon: const Icon(
                          Icons.check_circle_outline,
                          color: Colors.green,
                          size: 20,
                        ),
                        onPressed:
                            _statusEmAtualizacao.contains(item.id) ||
                                item.status == 'Concluído'
                            ? null
                            : () => _atualizarStatus(item, 'Concluído'),
                      ),
                      IconButton(
                        tooltip: 'Cancelar',
                        visualDensity: VisualDensity.compact,
                        icon: const Icon(
                          Icons.cancel_outlined,
                          color: Colors.red,
                          size: 20,
                        ),
                        onPressed:
                            _statusEmAtualizacao.contains(item.id) ||
                                item.status == 'Cancelado'
                            ? null
                            : () => _atualizarStatus(item, 'Cancelado'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  static const TextStyle _headerStyle = TextStyle(
    color: Color(0xFF64748B),
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  );

  Widget _buildMetricCard({
    required double width,
    required String title,
    required String value,
    required IconData icon,
    required Color glowColor,
    required Color valueColor,
  }) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Color.alphaBlend(glowColor.withValues(alpha: 0.06), _cardBg),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: glowColor.withValues(alpha: 0.4), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: glowColor.withValues(alpha: 0.05),
            blurRadius: 15,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                value,
                style: TextStyle(
                  color: valueColor,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: glowColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: glowColor.withValues(alpha: 0.2)),
            ),
            child: Icon(icon, color: glowColor, size: 20),
          ),
        ],
      ),
    );
  }

  Widget _buildTabItem(int index, String label) {
    final bool isSelected = _filtroFiltroData == index;
    return InkWell(
      onTap: () => setState(() => _filtroFiltroData = index),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF164E43) : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : const Color(0xFF64748B),
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
