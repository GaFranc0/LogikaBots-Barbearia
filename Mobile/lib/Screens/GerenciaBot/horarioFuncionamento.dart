import 'package:flutter/material.dart';

class HorarioFuncionamentoScreen extends StatefulWidget {
  const HorarioFuncionamentoScreen({super.key});

  @override
  State<HorarioFuncionamentoScreen> createState() => _HorarioFuncionamentoScreenState();
}

class _HorarioFuncionamentoScreenState extends State<HorarioFuncionamentoScreen> {
  TimeOfDay horarioAbertura = const TimeOfDay(hour: 12, minute: 0);
  TimeOfDay horarioFechamento = const TimeOfDay(hour: 19, minute: 0);

  String primeiroDia = 'Segunda-feira';
  String ultimoDia = 'Sexta-feira';
  String intervalo = '40 minutos';

  final List<String> diasDaSemana = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo',
  ];

  final List<String> opcoesIntervalo = [
    '15 minutos',
    '30 minutos',
    '40 minutos',
    '60 minutos',
  ];

  Future<void> _selecionarHorario(BuildContext context, bool isAbertura) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: isAbertura ? horarioAbertura : horarioFechamento,
      initialEntryMode: TimePickerEntryMode.inputOnly,
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: Colors.blueAccent,
            surface: Color(0xFF0F172A),
            onSurface: Colors.white,
          ),
          timePickerTheme: TimePickerThemeData(
            hourMinuteColor: const Color(0xFF0B132B),
            hourMinuteTextColor: Colors.white,
            inputDecorationTheme: InputDecorationTheme(
              enabledBorder: OutlineInputBorder(
                borderSide: const BorderSide(color: Color(0xFF1E293B)),
                borderRadius: BorderRadius.circular(8),
              ),
              focusedBorder: OutlineInputBorder(
                borderSide: const BorderSide(color: Colors.blueAccent, width: 2),
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
    if (picked != null) {
      setState(() {
        if (isAbertura) {
          horarioAbertura = picked;
        } else {
          horarioFechamento = picked;
        }
      });
    }
  }

  String _formatTimeOfDay(TimeOfDay time) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  @override
  Widget build(BuildContext context) {
    const backgroundColor = Color(0xFF090D16);
    const cardColor = Color(0xFF0F172A);
    const borderColor = Color(0xFF1E293B);
    const fieldColor = Color(0xFF0B132B);

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: backgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Horário de Funcionamento', style: TextStyle(color: Colors.white)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Container(
          padding: const EdgeInsets.all(20.0),
          decoration: BoxDecoration(
            color: cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.settings, color: Colors.blueAccent),
                  ),
                  const SizedBox(width: 12),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Geral',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      Text(
                        'Configure os horários e dias de atendimento',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),

              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildLabel('Horário de Abertura'),
                        _buildTimePickerField(
                          context: context,
                          value: _formatTimeOfDay(horarioAbertura),
                          icon: Icons.access_time,
                          fieldColor: fieldColor,
                          borderColor: borderColor,
                          onTap: () => _selecionarHorario(context, true),
                        ),
                        const SizedBox(height: 16),
                        _buildLabel('Horário de Fechamento'),
                        _buildTimePickerField(
                          context: context,
                          value: _formatTimeOfDay(horarioFechamento),
                          icon: Icons.access_time_filled,
                          fieldColor: fieldColor,
                          borderColor: borderColor,
                          onTap: () => _selecionarHorario(context, false),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),

                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildLabel('Primeiro Dia de Atendimento'),
                        _buildDropdownField(
                          value: primeiroDia,
                          items: diasDaSemana,
                          icon: Icons.calendar_today,
                          fieldColor: fieldColor,
                          borderColor: borderColor,
                          onChanged: (val) => setState(() => primeiroDia = val!),
                        ),
                        const SizedBox(height: 16),
                        _buildLabel('Último Dia de Atendimento'),
                        _buildDropdownField(
                          value: ultimoDia,
                          items: diasDaSemana,
                          icon: Icons.calendar_month,
                          fieldColor: fieldColor,
                          borderColor: borderColor,
                          onChanged: (val) => setState(() => ultimoDia = val!),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              _buildLabel('Intervalo entre Agendamentos'),
              _buildDropdownField(
                value: intervalo,
                items: opcoesIntervalo,
                icon: Icons.timer,
                fieldColor: fieldColor,
                borderColor: borderColor,
                onChanged: (val) => setState(() => intervalo = val!),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        text,
        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
      ),
    );
  }

  Widget _buildTimePickerField({
    required BuildContext context,
    required String value,
    required IconData icon,
    required Color fieldColor,
    required Color borderColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: fieldColor,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: borderColor),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.grey, size: 18),
            Expanded(
              child: Text(
                value,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDropdownField({
    required String value,
    required List<String> items,
    required IconData icon,
    required Color fieldColor,
    required Color borderColor,
    required ValueChanged<String?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: fieldColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: borderColor),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          icon: const Icon(Icons.keyboard_arrow_down, color: Colors.grey),
          dropdownColor: fieldColor,
          isExpanded: true,
          style: const TextStyle(color: Colors.white),
          onChanged: onChanged,
          items: items.map((String item) {
            return DropdownMenuItem<String>(
              value: item,
              child: Row(
                children: [
                  Icon(icon, color: Colors.grey, size: 18),
                  const SizedBox(width: 12),
                  Text(item),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}