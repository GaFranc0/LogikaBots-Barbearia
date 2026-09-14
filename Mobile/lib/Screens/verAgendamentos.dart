import 'package:flutter/material.dart';

class VerAgendamentos extends StatefulWidget {
  const VerAgendamentos({super.key});

  @override
  State<VerAgendamentos> createState() => _VeAagendamentosState();
}

class _VeAagendamentosState extends State<VerAgendamentos> {
  int _filtroFiltroData = 0;
  String _barbeiroSelecionado = 'Todos os Barbeiros';
  final TextEditingController _buscaCtrl = TextEditingController();

  final Color _bgDark = const Color(0xFF030712);
  final Color _cardBg = const Color(0xFF090D1A);
  final Color _innerCardBg = const Color(0xFF0F172A);
  final Color _borderColor = const Color(0xFF1E293B);

  @override
  void dispose() {
    _buscaCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgDark,
      appBar: AppBar(
        backgroundColor: _bgDark,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Agendamentos', style: TextStyle(color: Colors.white)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [

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
                  double cardWidth = (constraints.maxWidth - 32) / 3;
                  if (constraints.maxWidth < 700) {
                    cardWidth = constraints.maxWidth;
                  }
                  return Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      _buildMetricCard(
                        width: cardWidth,
                        title: 'HOJE',
                        value: '0',
                        icon: Icons.event_available_rounded,
                        glowColor: const Color(0xFF3B82F6),
                        valueColor: Colors.white,
                      ),
                      _buildMetricCard(
                        width: cardWidth,
                        title: 'FATURAMENTO',
                        value: 'R\$ 0.00',
                        icon: Icons.attach_money_rounded,
                        glowColor: const Color(0xFF10B981),
                        valueColor: const Color(0xFF34D399),
                      ),
                      _buildMetricCard(
                        width: cardWidth,
                        title: 'TICKET MÉDIO',
                        value: 'R\$ 0.00',
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
                  border: Border.all(color: _borderColor),
                ),
                child: Column(
                  children: [

                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
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
                              onPressed: () {},
                              style: OutlinedButton.styleFrom(
                                backgroundColor: const Color(0xFF1E293B).withValues(alpha: 0.3),
                                side: const BorderSide(color: Color(0xFF334155)),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              icon: const Icon(Icons.calendar_month_outlined, color: Color(0xFF60A5FA), size: 15),
                              label: const Text(
                                'Ver Todos Horários',
                                style: TextStyle(color: Color(0xFF93C5FD), fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ),
                            OutlinedButton.icon(
                              onPressed: () {},
                              style: OutlinedButton.styleFrom(
                                backgroundColor: const Color(0xFF451A03).withValues(alpha: 0.2),
                                side: const BorderSide(color: Color(0xFF7F1D1D)),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              icon: const Icon(Icons.block_rounded, color: Color(0xFFF87171), size: 15),
                              label: const Text(
                                'Bloquear Horário',
                                style: TextStyle(color: Color(0xFFF87171), fontSize: 12, fontWeight: FontWeight.w600),
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
                              icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                              dropdownColor: _innerCardBg,
                              style: const TextStyle(color: Colors.white, fontSize: 13),
                              items: ['Todos os Barbeiros', 'Barbeiro 1', 'Barbeiro 2'].map((String item) {
                                return DropdownMenuItem<String>(
                                  value: item,
                                  child: Row(
                                    children: [
                                      const Icon(Icons.person_outline_rounded, color: Color(0xFF64748B), size: 16),
                                      const SizedBox(width: 8),
                                      Text(item),
                                    ],
                                  ),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) setState(() => _barbeiroSelecionado = val);
                              },
                            ),
                          ),
                        );

                        final searchField = SizedBox(
                          height: 42,
                          child: TextField(
                            controller: _buscaCtrl,
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                            decoration: InputDecoration(
                              hintText: 'Buscar cliente...',
                              hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                              prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF64748B), size: 18),
                              filled: true,
                              fillColor: _innerCardBg,
                              contentPadding: EdgeInsets.zero,
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: _borderColor),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(color: Color(0xFF3B82F6)),
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

                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: SizedBox(
                        width: 750,
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A).withValues(alpha: 0.6),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Row(
                                children: [
                                  SizedBox(width: 130, child: Text('CLIENTE', style: _headerStyle)),
                                  SizedBox(width: 80, child: Text('HORÁRIO', style: _headerStyle)),
                                  SizedBox(width: 80, child: Text('DATA', style: _headerStyle)),
                                  SizedBox(width: 130, child: Text('PROFISSIONAL', style: _headerStyle)),
                                  SizedBox(width: 120, child: Text('SERVIÇO', style: _headerStyle)),
                                  SizedBox(width: 80, child: Text('VALOR', style: _headerStyle)),
                                  SizedBox(width: 80, child: Text('STATUS', style: _headerStyle)),
                                  Expanded(child: Text('AÇÕES', textAlign: TextAlign.right, style: _headerStyle)),
                                ],
                              ),
                            ),

                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 60),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF1E293B).withValues(alpha: 0.3),
                                      borderRadius: BorderRadius.circular(12),
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
                            ),
                          ],
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
        color: _cardBg,
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
                  color: Color(0xFF64748B),
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
          color: isSelected ? const Color(0xFF1E293B) : Colors.transparent,
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