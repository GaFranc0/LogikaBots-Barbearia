import 'dart:ui';
import 'package:flutter/material.dart';

class BloqueioAgenda {
  final TextEditingController motivoCtrl;
  String profissional;
  DateTime? dataInicio;
  TimeOfDay? horaInicio;
  DateTime? dataFim;
  TimeOfDay? horaFim;

  BloqueioAgenda()
      : motivoCtrl = TextEditingController(),
        profissional = 'Todos os Profissionais';

  void dispose() {
    motivoCtrl.dispose();
  }
}

class Bloqueio extends StatefulWidget {
  const Bloqueio({super.key});

  @override
  State<Bloqueio> createState() => _BloqueioState();
}

class _BloqueioState extends State<Bloqueio> {
  final List<BloqueioAgenda> _bloqueios = [];

  final Color vermelho = const Color.fromARGB(255, 255, 72, 0);
  final Color vermelhoClaro = const Color.fromARGB(255, 255, 0, 0);
  final Color corFundo = const Color(0xFF030712);
  final Color cardBg = const Color(0xFF0F172A);
  final Color inputBg = const Color(0xFF0B1329);
  final Color borderColor = const Color(0xFF1E293B);

  @override
  void dispose() {
    for (final b in _bloqueios) {
      b.dispose();
    }
    super.dispose();
  }

  void _adicionarBloqueio() {
    setState(() {
      _bloqueios.add(BloqueioAgenda());
    });
  }

  void _removerBloqueio(int index) {
    setState(() {
      _bloqueios[index].dispose();
      _bloqueios.removeAt(index);
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
        title: const Text('Bloqueio de Agenda', style: TextStyle(color: Colors.white)),
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
                  Container(
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(24),
                      border: Border(
                        top: BorderSide(color: vermelhoClaro, width: 2.5),
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
                                        color: Colors.white.withValues(alpha: 0.45),
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              ElevatedButton.icon(
                                onPressed: _adicionarBloqueio,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: vermelho.withValues(alpha: 0.1),
                                  foregroundColor: vermelhoClaro,
                                  elevation: 0,
                                  side: BorderSide(color: vermelho.withValues(alpha: 0.4)),
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
                        if (_bloqueios.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
                            child: Center(
                              child: Column(
                                children: [
                                  Icon(Icons.event_available_outlined, color: Colors.white.withValues(alpha: 0.2), size: 40),
                                  const SizedBox(height: 12),
                                  Text(
                                    'Nenhum bloqueio cadastrado ainda.\nToque em "Novo Bloqueio" para iniciar.',
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
                              children: List.generate(_bloqueios.length, (index) {
                                return _BloqueioCard(
                                  bloqueio: _bloqueios[index],
                                  onRemover: () => _removerBloqueio(index),
                                  vermelho: vermelho,
                                  vermelhoClaro: vermelhoClaro,
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

class _BloqueioCard extends StatefulWidget {
  final BloqueioAgenda bloqueio;
  final VoidCallback onRemover;
  final Color vermelho;
  final Color vermelhoClaro;
  final Color inputBg;
  final Color borderColor;

  const _BloqueioCard({
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
          data: MediaQuery.of(context).copyWith(
            alwaysUse24HourFormat: true,
          ),
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
                      color: valor == null ? Colors.white.withValues(alpha: 0.35) : Colors.white,
                      fontSize: 14,
                    ),
                  ),
                  Icon(Icons.calendar_today_rounded, color: Colors.white.withValues(alpha: 0.3), size: 16),
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
                      color: valor == null ? Colors.white.withValues(alpha: 0.35) : Colors.white,
                      fontSize: 14,
                    ),
                  ),
                  Icon(Icons.access_time_rounded, color: Colors.white.withValues(alpha: 0.3), size: 16),
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
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF090D1A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: widget.borderColor.withValues(alpha: 0.5), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: widget.vermelho.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: widget.vermelho.withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.lock_rounded, color: widget.vermelhoClaro, size: 14),
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
                icon: Icon(Icons.close_rounded, color: Colors.white.withValues(alpha: 0.5), size: 20),
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
                value: widget.bloqueio.profissional,
                isExpanded: true,
                dropdownColor: const Color(0xFF0F172A),
                icon: Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white.withValues(alpha: 0.4)),
                style: const TextStyle(color: Colors.white, fontSize: 14),
                items: const [
                  DropdownMenuItem(value: 'Todos os Profissionais', child: Text('Todos os Profissionais')),
                  DropdownMenuItem(value: 'Profissional 1', child: Text('Profissional 1')),
                  DropdownMenuItem(value: 'Profissional 2', child: Text('Profissional 2')),
                ],
                onChanged: (valor) {
                  if (valor != null) {
                    setState(() => widget.bloqueio.profissional = valor);
                  }
                },
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _campoData('DATA INÍCIO', widget.bloqueio.dataInicio, () => _selecionarData(true)),
              const SizedBox(width: 12),
              _campoHora('HORA INÍCIO', widget.bloqueio.horaInicio, () => _selecionarHora(true)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _campoData('DATA FIM', widget.bloqueio.dataFim, () => _selecionarData(false)),
              const SizedBox(width: 12),
              _campoHora('HORA FIM', widget.bloqueio.horaFim, () => _selecionarHora(false)),
            ],
          ),
          const SizedBox(height: 16),
          _rotulo('MOTIVO'),
          TextField(
            controller: widget.bloqueio.motivoCtrl,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Ex: Férias, Viagem...',
              hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 14),
              filled: true,
              fillColor: widget.inputBg,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
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