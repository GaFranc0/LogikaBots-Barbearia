import 'package:flutter/material.dart';

class Profissionais extends StatelessWidget {
  const Profissionais({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090C15),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090C15),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Profissionais', style: TextStyle(color: Colors.white)),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Column(
            children: [

              LayoutBuilder(
                builder: (context, constraints) {
                  final bool isMobile = constraints.maxWidth < 560;

                  final titulo = Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E1B4B),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.people_alt_outlined, color: Color(0xFFA855F7), size: 20),
                      ),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Profissionais',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            Text(
                              'Equipe e horários.',
                              style: TextStyle(fontSize: 11, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );

                  final busca = SizedBox(
                    height: 38,
                    child: TextField(
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Buscar...',
                        hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
                        prefixIcon: const Icon(Icons.search, color: Colors.grey, size: 18),
                        filled: true,
                        fillColor: const Color(0xFF131722),
                        contentPadding: EdgeInsets.zero,
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
                  );

                  final botao = SizedBox(
                    height: 38,
                    child: ElevatedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.person_add_outlined, size: 16),
                      label: const Text('Adicionar', style: TextStyle(fontSize: 13)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E1B4B),
                        foregroundColor: const Color(0xFFA855F7),
                        side: const BorderSide(color: Color(0xFF3B1F60)),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  );

                  if (isMobile) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        titulo,
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(child: busca),
                            const SizedBox(width: 8),
                            botao,
                          ],
                        ),
                      ],
                    );
                  }

                  return Row(
                    children: [
                      Expanded(child: titulo),
                      const SizedBox(width: 12),
                      SizedBox(width: 220, child: busca),
                      const SizedBox(width: 12),
                      botao,
                    ],
                  );
                },
              ),
              const SizedBox(height: 12),

              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF131722),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF1F2433)),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [

                        Container(width: 4, color: const Color(0xFFA855F7)),

                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.all(10.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [

                                Row(
                                  children: [
                                    const CircleAvatar(
                                      radius: 16,
                                      backgroundColor: Color(0xFF1E1B4B),
                                      child: Icon(Icons.person_outline, color: Color(0xFFA855F7), size: 18),
                                    ),
                                    const SizedBox(width: 10),
                                    const Expanded(
                                      child: Text(
                                        'Nome do Profissional',
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white),
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, color: Colors.grey, size: 20),
                                      onPressed: () {},
                                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                      padding: EdgeInsets.zero,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),

                                Expanded(
                                  child: LayoutBuilder(
                                    builder: (context, constraints) {
                                      final jornada = Container(
                                        padding: const EdgeInsets.all(8),
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
                                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5),
                                            ),
                                            const SizedBox(height: 6),
                                            Expanded(
                                              child: ListView(
                                                children: const [
                                                  WorkDayRow(day: 'Seg', isChecked: true, start: '12:00', end: '19:00'),
                                                  WorkDayRow(day: 'Ter', isChecked: true, start: '12:00', end: '19:00'),
                                                  WorkDayRow(day: 'Qua', isChecked: true, start: '12:00', end: '19:00'),
                                                  WorkDayRow(day: 'Qui', isChecked: true, start: '12:00', end: '19:00'),
                                                  WorkDayRow(day: 'Sex', isChecked: true, start: '12:00', end: '19:00'),
                                                  WorkDayRow(day: 'Sáb', isChecked: false, start: '12:00', end: '19:00', isOff: true),
                                                  WorkDayRow(day: 'Dom', isChecked: false, start: '12:00', end: '19:00', isOff: true),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      );

                                      final almoco = Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF0D1019),
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(color: const Color(0xFF1F2433)),
                                        ),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Row(
                                              children: const [
                                                Icon(Icons.free_breakfast_outlined, size: 13, color: Color(0xFFA855F7)),
                                                SizedBox(width: 5),
                                                Expanded(
                                                  child: Text(
                                                    'HORÁRIO DE ALMOÇO',
                                                    overflow: TextOverflow.ellipsis,
                                                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFFA855F7), letterSpacing: 0.4),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 8),
                                            const Row(
                                              children: [
                                                Expanded(child: TimeBox(time: '12:00')),
                                                Padding(
                                                  padding: EdgeInsets.symmetric(horizontal: 4.0),
                                                  child: Text('-', style: TextStyle(color: Colors.grey, fontSize: 11)),
                                                ),
                                                Expanded(child: TimeBox(time: '13:00')),
                                              ],
                                            ),
                                          ],
                                        ),
                                      );

                                      if (constraints.maxWidth < 560) {
                                        return Column(
                                          crossAxisAlignment: CrossAxisAlignment.stretch,
                                          children: [
                                            Expanded(flex: 3, child: jornada),
                                            const SizedBox(height: 8),
                                            almoco,
                                          ],
                                        );
                                      }

                                      return Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Expanded(flex: 6, child: SizedBox(height: constraints.maxHeight, child: jornada)),
                                          const SizedBox(width: 8),
                                          Expanded(flex: 4, child: almoco),
                                        ],
                                      );
                                    },
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
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class WorkDayRow extends StatelessWidget {
  final String day;
  final bool isChecked;
  final String start;
  final String end;
  final bool isOff;

  const WorkDayRow({
    super.key,
    required this.day,
    required this.isChecked,
    required this.start,
    required this.end,
    this.isOff = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3.0),
      child: Row(
        children: [

          Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(
              color: isChecked ? const Color(0xFFA855F7) : Colors.transparent,
              borderRadius: BorderRadius.circular(4),
              border: Border.all(
                color: isChecked ? const Color(0xFFA855F7) : const Color(0xFF2A2E3D),
              ),
            ),
            child: isChecked ? const Icon(Icons.check, size: 10, color: Colors.white) : null,
          ),
          const SizedBox(width: 6),

          SizedBox(
            width: 26,
            child: Text(
              day,
              style: TextStyle(
                color: isOff ? Colors.grey.shade600 : Colors.white,
                fontWeight: FontWeight.w500,
                fontSize: 11,
              ),
            ),
          ),
          const Spacer(),

          Expanded(
            flex: 3,
            child: TimeBox(time: start, isDisabled: isOff),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 3.0),
            child: Text('-', style: TextStyle(color: Colors.grey, fontSize: 11)),
          ),
          Expanded(
            flex: 3,
            child: TimeBox(time: end, isDisabled: isOff),
          ),
        ],
      ),
    );
  }
}

class TimeBox extends StatelessWidget {
  final String time;
  final bool isDisabled;

  const TimeBox({super.key, required this.time, this.isDisabled = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 28,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFF131722),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF2A2E3D)),
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          time,
          style: TextStyle(
            color: isDisabled ? Colors.grey.shade700 : Colors.white,
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
