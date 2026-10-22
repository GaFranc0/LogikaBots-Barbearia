import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_application_1/services/api_service.dart';
import 'package:flutter_application_1/services/session.dart';

class BloqueioAgenda {
  String id;
  final TextEditingController motivoCtrl;
  String? barbeiroId;
  String profissional;
  DateTime? dataInicio;
  TimeOfDay? horaInicio;
  DateTime? dataFim;
  TimeOfDay? horaFim;

  BloqueioAgenda({
    this.id = '',
    String? motivo,
    this.barbeiroId,
    this.profissional = 'Todos os Profissionais',
    this.dataInicio,
    this.horaInicio,
    this.dataFim,
    this.horaFim,
  }) : motivoCtrl = TextEditingController(text: motivo);

  void dispose() {
    motivoCtrl.dispose();
  }

  DateTime? get _dataHoraInicio => dataInicio == null
      ? null
      : DateTime(
          dataInicio!.year,
          dataInicio!.month,
          dataInicio!.day,
          horaInicio?.hour ?? 0,
          horaInicio?.minute ?? 0,
        );

  DateTime? get _dataHoraFim => dataFim == null
      ? null
      : DateTime(
          dataFim!.year,
          dataFim!.month,
          dataFim!.day,
          horaFim?.hour ?? 0,
          horaFim?.minute ?? 0,
        );

  bool get dadosCompletos =>
      dataInicio != null &&
      horaInicio != null &&
      dataFim != null &&
      horaFim != null;

  bool get todosProfissionais =>
      barbeiroId == null || barbeiroId!.trim().isEmpty;

  Map<String, dynamic> toJson() {
    return {
      'motivo': motivoCtrl.text,
      'barbeiro_id': todosProfissionais ? 'todos' : barbeiroId!.trim(),
      'dataInicio': _dataHoraInicio?.toIso8601String(),
      'dataFim': _dataHoraFim?.toIso8601String(),
    };
  }

  factory BloqueioAgenda.fromJson(Map<String, dynamic> json) {
    final inicio = json['data_inicio'] != null
        ? DateTime.tryParse(json['data_inicio'])
        : null;
    final fim = json['data_fim'] != null
        ? DateTime.tryParse(json['data_fim'])
        : null;

    return BloqueioAgenda(
      id: json['id'].toString(),
      motivo: json['motivo'] ?? '',
      barbeiroId: json['barbeiro_id']?.toString().trim().isEmpty == false
          ? json['barbeiro_id'].toString().trim()
          : null,
      profissional: json['profissional'] ?? 'Todos os Profissionais',
      dataInicio: inicio != null
          ? DateTime(inicio.year, inicio.month, inicio.day)
          : null,
      horaInicio: inicio != null
          ? TimeOfDay(hour: inicio.hour, minute: inicio.minute)
          : null,
      dataFim: fim != null ? DateTime(fim.year, fim.month, fim.day) : null,
      horaFim: fim != null
          ? TimeOfDay(hour: fim.hour, minute: fim.minute)
          : null,
    );
  }
}

class BloqueioController extends ChangeNotifier {
  static final BloqueioController instance = BloqueioController._internal();
  factory BloqueioController() => instance;
  BloqueioController._internal();

  final List<BloqueioAgenda> bloqueios = [];
  final Set<BloqueioAgenda> alterados = {};
  final Set<String> idsRemovidos = {};
  List<Map<String, String>> barbeirosDisponiveis = [];
  bool carregado = false;
  bool salvando = false;
  String? erro;

  bool get temAlteracoes => alterados.isNotEmpty || idsRemovidos.isNotEmpty;

  Future<void> carregarBloqueios() async {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null) return;

    try {
      final profissionaisJson = await ApiService.getProfissionais(barbeariaId);
      final profissionaisPorId = <String, Map<String, String>>{};
      for (final profissional in profissionaisJson) {
        final id = profissional['id'].toString().trim();
        if (id.isEmpty || id == 'todos') continue;
        profissionaisPorId[id] = {
          'id': id,
          'nome': profissional['nome'].toString(),
        };
      }
      barbeirosDisponiveis = profissionaisPorId.values.toList();

      final lista = await ApiService.getBloqueios(barbeariaId);
      for (final antigo in bloqueios) {
        antigo.dispose();
      }
      bloqueios.clear();
      alterados.clear();
      idsRemovidos.clear();
      for (var item in lista) {
        final bloqueio = BloqueioAgenda.fromJson(item);
        bloqueio.motivoCtrl.addListener(() => marcarAlterado(bloqueio));
        bloqueios.add(bloqueio);
      }
      erro = null;
      carregado = true;
      notifyListeners();
    } catch (e) {
      erro = e.toString();
      carregado = true;
      notifyListeners();
    }
  }

  void marcarAlterado(BloqueioAgenda bloqueio) {
    alterados.add(bloqueio);
    erro = null;
    notifyListeners();
  }

  Future<void> _persistirBloqueio(
    int barbeariaId,
    BloqueioAgenda bloqueio,
  ) async {
    if (!bloqueio.dadosCompletos) {
      throw ApiException(
        'Preencha as datas e os horários de todos os bloqueios',
      );
    }

    final inicio = bloqueio._dataHoraInicio!;
    final fim = bloqueio._dataHoraFim!;
    if (!fim.isAfter(inicio)) {
      throw ApiException('A data final deve ser posterior à data inicial');
    }

    if (bloqueio.todosProfissionais) {
      if (bloqueio.id.isNotEmpty) {
        await ApiService.removerBloqueio(bloqueio.id);
      }
      await ApiService.criarBloqueioParaTodos(barbeariaId, bloqueio.toJson());
    } else if (bloqueio.id.isEmpty) {
      bloqueio.id = await ApiService.criarBloqueio(
        barbeariaId,
        bloqueio.toJson(),
      );
    } else {
      await ApiService.atualizarBloqueio(bloqueio.id, bloqueio.toJson());
    }
  }

  Future<void> confirmarAlteracoes() async {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null || salvando) return;
    salvando = true;
    notifyListeners();

    try {
      for (final id in idsRemovidos.toList()) {
        await ApiService.removerBloqueio(id);
        idsRemovidos.remove(id);
      }
      for (final bloqueio in alterados.toList()) {
        await _persistirBloqueio(barbeariaId, bloqueio);
        alterados.remove(bloqueio);
      }
      erro = null;
      await carregarBloqueios();
    } catch (e) {
      erro = e.toString();
    } finally {
      salvando = false;
      notifyListeners();
    }
  }

  void adicionar() {
    final barbeariaId = Session.barbeariaId;
    if (barbeariaId == null) return;
    if (barbeirosDisponiveis.isEmpty) {
      erro = 'Cadastre um profissional antes de criar um bloqueio';
      notifyListeners();
      return;
    }

    final primeiroBarbeiro = barbeirosDisponiveis.first;
    final novo = BloqueioAgenda(
      barbeiroId: primeiroBarbeiro['id'],
      profissional: primeiroBarbeiro['nome'] ?? '',
    );
    erro = null;
    novo.motivoCtrl.addListener(() => marcarAlterado(novo));
    bloqueios.add(novo);
    alterados.add(novo);
    notifyListeners();
  }

  void remover(int index) {
    final bloqueio = bloqueios[index];
    if (bloqueio.id.isNotEmpty) idsRemovidos.add(bloqueio.id);
    alterados.remove(bloqueio);
    bloqueio.dispose();
    bloqueios.removeAt(index);
    notifyListeners();
  }
}

class Bloqueio extends StatefulWidget {
  const Bloqueio({super.key});

  @override
  State<Bloqueio> createState() => _BloqueioState();
}

class _BloqueioState extends State<Bloqueio> {
  final controller = BloqueioController.instance;

  final Color vermelho = const Color.fromARGB(255, 255, 72, 0);
  final Color vermelhoClaro = const Color.fromARGB(255, 255, 0, 0);
  final Color corFundo = const Color(0xFF030712);
  final Color cardBg = const Color(0xFF0F172A);
  final Color inputBg = const Color(0xFF0B1329);
  final Color borderColor = const Color(0xFF1E293B);

  @override
  void initState() {
    super.initState();
    controller.addListener(_atualizarTela);
    controller.carregarBloqueios();
  }

  @override
  void dispose() {
    controller.removeListener(_atualizarTela);
    super.dispose();
  }

  void _atualizarTela() {
    if (mounted) setState(() {});
  }

  Future<void> _confirmarAlteracoes() async {
    await controller.confirmarAlteracoes();
    if (!mounted || controller.erro != null) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Bloqueios salvos com sucesso'),
        backgroundColor: Color(0xFF10B981),
      ),
    );
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
          'Bloqueio de Agenda',
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
                  color: vermelho.withValues(alpha: 0.12),
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
                  if (controller.erro != null) ...[
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: vermelho.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: vermelho.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Text(
                        controller.erro!,
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                  ],
                  Container(
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: vermelho.withValues(alpha: 0.5),
                        width: 1.2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: vermelho.withValues(alpha: 0.1),
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
                                    color: const Color(0xFF3A1313),
                                    width: 1.5,
                                  ),
                                ),
                                child: Icon(
                                  Icons.event_busy_rounded,
                                  color: vermelhoClaro,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Bloqueios de Agenda',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Escolha datas onde a barbearia não vai funcionar',
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
                                onPressed: controller.adicionar,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: vermelho.withValues(
                                    alpha: 0.1,
                                  ),
                                  foregroundColor: vermelhoClaro,
                                  elevation: 0,
                                  side: BorderSide(
                                    color: vermelho.withValues(alpha: 0.4),
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
                                  'Novo Bloqueio',
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
                        if (!controller.carregado)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 48),
                            child: Center(
                              child: CircularProgressIndicator(
                                color: Color.fromARGB(255, 255, 72, 0),
                              ),
                            ),
                          )
                        else if (controller.bloqueios.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              vertical: 48,
                              horizontal: 24,
                            ),
                            child: Center(
                              child: Column(
                                children: [
                                  Icon(
                                    Icons.event_available_outlined,
                                    color: Colors.white.withValues(alpha: 0.2),
                                    size: 40,
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    'Nenhum bloqueio cadastrado ainda.\nToque em "Novo Bloqueio" para iniciar.',
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
                              children: List.generate(
                                controller.bloqueios.length,
                                (index) {
                                  return _BloqueioCard(
                                    key: ValueKey(controller.bloqueios[index]),
                                    bloqueio: controller.bloqueios[index],
                                    onRemover: () => controller.remover(index),
                                    vermelho: vermelho,
                                    vermelhoClaro: vermelhoClaro,
                                    inputBg: inputBg,
                                    borderColor: borderColor,
                                  );
                                },
                              ),
                            ),
                          ),
                        const Divider(color: Color(0xFF1E293B), height: 1),
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed:
                                  controller.temAlteracoes &&
                                      !controller.salvando
                                  ? _confirmarAlteracoes
                                  : null,
                              icon: controller.salvando
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
                                controller.salvando
                                    ? 'Salvando...'
                                    : 'Confirmar alterações',
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: vermelho,
                                foregroundColor: Colors.white,
                                disabledBackgroundColor: vermelho.withValues(
                                  alpha: 0.14,
                                ),
                                disabledForegroundColor: vermelhoClaro
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

class _BloqueioCard extends StatefulWidget {
  final BloqueioAgenda bloqueio;
  final VoidCallback onRemover;
  final Color vermelho;
  final Color vermelhoClaro;
  final Color inputBg;
  final Color borderColor;

  const _BloqueioCard({
    super.key,
    required this.bloqueio,
    required this.onRemover,
    required this.vermelho,
    required this.vermelhoClaro,
    required this.inputBg,
    required this.borderColor,
  });

  @override
  State<_BloqueioCard> createState() => _BloqueioCardState();
}

class _BloqueioCardState extends State<_BloqueioCard> {
  String _formatarData(DateTime? data) {
    if (data == null) return 'dd/mm/aaaa';
    return '${data.day.toString().padLeft(2, '0')}/${data.month.toString().padLeft(2, '0')}/${data.year}';
  }

  String _formatarHora(TimeOfDay? hora) {
    if (hora == null) return '--:--';
    return '${hora.hour.toString().padLeft(2, '0')}:${hora.minute.toString().padLeft(2, '0')}';
  }

  Future<void> _selecionarData(bool inicio) async {
    final selecionada = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: ColorScheme.dark(
            primary: widget.vermelho,
            surface: const Color(0xFF0F172A),
          ),
        ),
        child: child!,
      ),
    );
    if (selecionada != null) {
      setState(() {
        if (inicio) {
          widget.bloqueio.dataInicio = selecionada;
        } else {
          widget.bloqueio.dataFim = selecionada;
        }
      });
      BloqueioController.instance.marcarAlterado(widget.bloqueio);
    }
  }

  Future<void> _selecionarHora(bool inicio) async {
    final selecionada = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      initialEntryMode: TimePickerEntryMode.inputOnly,
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: ColorScheme.dark(
            primary: widget.vermelho,
            surface: const Color(0xFF0F172A),
            onSurface: Colors.white,
          ),
          timePickerTheme: TimePickerThemeData(
            hourMinuteColor: const Color(0xFF0B1329),
            hourMinuteTextColor: Colors.white,
            inputDecorationTheme: InputDecorationTheme(
              enabledBorder: OutlineInputBorder(
                borderSide: BorderSide(color: widget.vermelho),
                borderRadius: BorderRadius.circular(8),
              ),
              focusedBorder: OutlineInputBorder(
                borderSide: BorderSide(color: widget.vermelho, width: 2),
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
          child: child!,
        ),
      ),
    );
    if (selecionada != null) {
      setState(() {
        if (inicio) {
          widget.bloqueio.horaInicio = selecionada;
        } else {
          widget.bloqueio.horaFim = selecionada;
        }
      });
      BloqueioController.instance.marcarAlterado(widget.bloqueio);
    }
  }

  Widget _rotulo(String texto) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 2),
      child: Text(
        texto,
        style: TextStyle(
          color: Colors.white.withValues(alpha: 0.45),
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.6,
        ),
      ),
    );
  }

  BoxDecoration _caixaDecoracao() {
    return BoxDecoration(
      color: widget.inputBg,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: widget.borderColor, width: 1),
    );
  }

  Widget _campoData(String rotulo, DateTime? valor, VoidCallback onTap) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _rotulo(rotulo),
          InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: _caixaDecoracao(),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _formatarData(valor),
                    style: TextStyle(
                      color: valor == null
                          ? Colors.white.withValues(alpha: 0.35)
                          : Colors.white,
                      fontSize: 14,
                    ),
                  ),
                  Icon(
                    Icons.calendar_today_rounded,
                    color: Colors.white.withValues(alpha: 0.3),
                    size: 16,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _campoHora(String rotulo, TimeOfDay? valor, VoidCallback onTap) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _rotulo(rotulo),
          InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: _caixaDecoracao(),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _formatarHora(valor),
                    style: TextStyle(
                      color: valor == null
                          ? Colors.white.withValues(alpha: 0.35)
                          : Colors.white,
                      fontSize: 14,
                    ),
                  ),
                  Icon(
                    Icons.access_time_rounded,
                    color: Colors.white.withValues(alpha: 0.3),
                    size: 16,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final barbeiros = BloqueioController.instance.barbeirosDisponiveis;
    final barbeiroSelecionado = widget.bloqueio.barbeiroId?.trim();
    final valorDropdown =
        barbeiroSelecionado != null &&
            barbeiroSelecionado.isNotEmpty &&
            barbeiros.any((b) => b['id'] == barbeiroSelecionado)
        ? barbeiroSelecionado
        : 'todos';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF090D1A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: widget.borderColor.withValues(alpha: 0.5),
          width: 1,
        ),
      ),
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
                  color: widget.vermelho.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: widget.vermelho.withValues(alpha: 0.4),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.lock_rounded,
                      color: widget.vermelhoClaro,
                      size: 14,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'BLOQUEIO',
                      style: TextStyle(
                        color: widget.vermelhoClaro,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: widget.onRemover,
                icon: Icon(
                  Icons.close_rounded,
                  color: Colors.white.withValues(alpha: 0.5),
                  size: 20,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _rotulo('PROFISSIONAL'),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: _caixaDecoracao(),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: valorDropdown,
                isExpanded: true,
                dropdownColor: const Color(0xFF0F172A),
                icon: Icon(
                  Icons.keyboard_arrow_down_rounded,
                  color: Colors.white.withValues(alpha: 0.4),
                ),
                style: const TextStyle(color: Colors.white, fontSize: 14),
                items: [
                  const DropdownMenuItem(
                    value: 'todos',
                    child: Text('Todos os Profissionais'),
                  ),
                  ...barbeiros.map(
                    (b) => DropdownMenuItem(
                      value: b['id'],
                      child: Text(b['nome'] ?? ''),
                    ),
                  ),
                ],
                onChanged: (valor) {
                  if (valor == null) return;
                  setState(() {
                    if (valor == 'todos') {
                      widget.bloqueio.barbeiroId = null;
                      widget.bloqueio.profissional = 'Todos os Profissionais';
                    } else {
                      final barbeiro = barbeiros.firstWhere(
                        (b) => b['id'] == valor,
                        orElse: () => {'id': valor, 'nome': ''},
                      );
                      widget.bloqueio.barbeiroId = valor;
                      widget.bloqueio.profissional = barbeiro['nome'] ?? '';
                    }
                  });
                  BloqueioController.instance.marcarAlterado(widget.bloqueio);
                },
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _campoData(
                'DATA INÍCIO',
                widget.bloqueio.dataInicio,
                () => _selecionarData(true),
              ),
              const SizedBox(width: 12),
              _campoHora(
                'HORA INÍCIO',
                widget.bloqueio.horaInicio,
                () => _selecionarHora(true),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _campoData(
                'DATA FIM',
                widget.bloqueio.dataFim,
                () => _selecionarData(false),
              ),
              const SizedBox(width: 12),
              _campoHora(
                'HORA FIM',
                widget.bloqueio.horaFim,
                () => _selecionarHora(false),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _rotulo('MOTIVO'),
          TextField(
            controller: widget.bloqueio.motivoCtrl,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Ex: Férias, Viagem...',
              hintStyle: TextStyle(
                color: Colors.white.withValues(alpha: 0.3),
                fontSize: 14,
              ),
              filled: true,
              fillColor: widget.inputBg,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 14,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: widget.borderColor, width: 1),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: widget.vermelho, width: 1.5),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
