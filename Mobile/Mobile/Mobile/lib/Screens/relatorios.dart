import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_application_1/services/api_service.dart';
import 'package:flutter_application_1/services/session.dart';

class RelatoriosScreen extends StatefulWidget {
  const RelatoriosScreen({super.key});

  @override
  State<RelatoriosScreen> createState() => _RelatoriosScreenState();
}

class _RelatoriosScreenState extends State<RelatoriosScreen> {
  static const _green = Color(0xFF42D6A1);
  static const _muted = Color(0xFF94A3B8);
  static const _months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  final _question = TextEditingController();
  DateTime _period = DateTime(DateTime.now().year, DateTime.now().month);
  Map<String, dynamic>? _data;
  String? _error;
  String? _answer;
  bool _loading = true;
  bool _asking = false;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    if (Session.ehAdmin) _load();
  }

  @override
  void dispose() {
    _question.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!Session.ehAdmin) return;
    final request = ++_request;
    setState(() {
      _loading = true;
      _error = null;
      _data = null;
      _answer = null;
    });
    try {
      final data = await ApiService.getRelatorio(_period.year, _period.month);
      if (mounted && request == _request) setState(() => _data = data);
    } catch (e) {
      if (mounted && request == _request) setState(() => _error = e.toString());
    } finally {
      if (mounted && request == _request) setState(() => _loading = false);
    }
  }

  Future<void> _ask() async {
    final question = _question.text.trim();
    if (question.isEmpty || _asking || !Session.ehAdmin) return;
    final request = _request;
    setState(() {
      _asking = true;
      _answer = null;
    });
    try {
      final result = await ApiService.perguntarRelatorio(
        _period.year,
        _period.month,
        question,
      );
      if (mounted && request == _request) {
        setState(
          () => _answer =
              result['resposta']?.toString() ??
              'Não foi possível responder à pergunta.',
        );
      }
    } catch (e) {
      if (mounted && request == _request) {
        setState(() => _answer = e.toString());
      }
    } finally {
      if (mounted) setState(() => _asking = false);
    }
  }

  static double _number(dynamic value) =>
      value is num ? value.toDouble() : double.tryParse('$value') ?? 0;
  static String _money(dynamic value) {
    final parts = _number(value).toStringAsFixed(2).split('.');
    final reais = parts[0].replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]}.',
    );
    return 'R\$ $reais,${parts[1]}';
  }

  String _variation(dynamic value) => value == null
      ? 'Sem base no mês anterior'
      : '${_number(value) > 0 ? '+' : ''}${_number(value).toStringAsFixed(1).replaceAll('.', ',')}% vs. mês anterior';

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: ThemeData.dark(useMaterial3: true).copyWith(
        scaffoldBackgroundColor: const Color(0xFF060A17),
        colorScheme: ColorScheme.fromSeed(
          seedColor: _green,
          brightness: Brightness.dark,
        ),
      ),
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Relatórios'),
          backgroundColor: const Color(0xFF060A17),
          actions: [
            if (Session.ehAdmin)
              IconButton(
                onPressed: _loading ? null : _load,
                tooltip: 'Atualizar relatório',
                icon: const Icon(Icons.refresh, color: _green),
              ),
          ],
        ),
        body: !Session.ehAdmin
            ? const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    'Acesso restrito a administradores.',
                    textAlign: TextAlign.center,
                  ),
                ),
              )
            : SafeArea(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 1200),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Admin  ›  Relatórios',
                            style: TextStyle(color: _green, fontSize: 12),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Desempenho da Loja',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 16,
                            runSpacing: 12,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              const Text(
                                'Resumo consolidado do período selecionado.',
                                style: TextStyle(color: _muted),
                              ),
                              _periodPicker(),
                            ],
                          ),
                          const SizedBox(height: 24),
                          if (_loading)
                            const Padding(
                              padding: EdgeInsets.all(50),
                              child: Center(child: CircularProgressIndicator()),
                            ),
                          if (_error != null)
                            _panel(
                              child: Column(
                                children: [
                                  Text(_error!, textAlign: TextAlign.center),
                                  const SizedBox(height: 12),
                                  OutlinedButton.icon(
                                    onPressed: _load,
                                    icon: const Icon(Icons.refresh),
                                    label: const Text('Tentar novamente'),
                                  ),
                                ],
                              ),
                            ),
                          if (!_loading && _data != null) ..._dashboard(),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
      ),
    );
  }

  Widget _periodPicker() => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      DropdownButton<int>(
        value: _period.month,
        underline: const SizedBox.shrink(),
        items: List.generate(
          12,
          (i) => DropdownMenuItem(value: i + 1, child: Text(_months[i])),
        ),
        onChanged: _asking
            ? null
            : (month) {
                if (month == null) return;
                _period = DateTime(_period.year, month);
                _load();
              },
      ),
      const SizedBox(width: 12),
      DropdownButton<int>(
        value: _period.year,
        underline: const SizedBox.shrink(),
        items: List.generate(
          101,
          (i) => DropdownMenuItem(value: 2000 + i, child: Text('${2000 + i}')),
        ),
        onChanged: _asking
            ? null
            : (year) {
                if (year == null) return;
                _period = DateTime(year, _period.month);
                _load();
              },
      ),
    ],
  );

  List<Widget> _dashboard() {
    final metrics = _data!['metricas'] as Map<String, dynamic>;
    final cards = [
      _metric(
        'FATURAMENTO TOTAL',
        _money(metrics['faturamento']),
        _variation(metrics['variacao_faturamento']),
        Icons.account_balance_wallet_outlined,
        _green,
      ),
      _metric(
        'ATENDIMENTOS REALIZADOS',
        '${metrics['atendimentos']}',
        '${metrics['novos_clientes']} novos clientes no período',
        Icons.content_cut,
        const Color(0xFF6096FF),
      ),
      _metric(
        'TICKET MÉDIO',
        _money(metrics['ticket_medio']),
        _variation(metrics['variacao_ticket']),
        Icons.receipt_long_outlined,
        const Color(0xFFB482FF),
      ),
      _metric(
        'TAXA DE OCUPAÇÃO',
        '${_number(metrics['taxa_ocupacao']).toStringAsFixed(1).replaceAll('.', ',')}%',
        'Estimativa • Meta: 85%',
        Icons.schedule,
        const Color(0xFFF6C453),
      ),
    ];
    return [
      LayoutBuilder(
        builder: (context, constraints) {
          final columns = constraints.maxWidth >= 1000
              ? 4
              : constraints.maxWidth >= 560
              ? 2
              : 1;
          final width = (constraints.maxWidth - (columns - 1) * 14) / columns;
          return Wrap(
            spacing: 14,
            runSpacing: 14,
            children: cards
                .map((card) => SizedBox(width: width, child: card))
                .toList(),
          );
        },
      ),
      const SizedBox(height: 22),
      LayoutBuilder(
        builder: (context, constraints) {
          final side = Column(
            children: [
              _services(),
              const SizedBox(height: 16),
              _panel(
                color: const Color(0xFFF6C453),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(
                          Icons.auto_awesome,
                          color: Color(0xFFF6C453),
                          size: 18,
                        ),
                        SizedBox(width: 8),
                        Text(
                          'INSIGHT',
                          style: TextStyle(
                            color: Color(0xFFF6C453),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '${_data!['insight']}',
                      style: const TextStyle(height: 1.5),
                    ),
                  ],
                ),
              ),
            ],
          );
          if (constraints.maxWidth < 850) {
            return Column(
              children: [_chart(), const SizedBox(height: 16), side],
            );
          }
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(flex: 2, child: _chart()),
              const SizedBox(width: 18),
              Expanded(child: side),
            ],
          );
        },
      ),
      const SizedBox(height: 22),
      _panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _heading(Icons.auto_awesome, 'Pergunte aos seus dados'),
            const SizedBox(height: 6),
            const Text(
              'Consulte atendimentos, faturamento, clientes, barbeiros e serviços.',
              style: TextStyle(color: _muted, fontSize: 12),
            ),
            const SizedBox(height: 18),
            TextField(
              controller: _question,
              maxLength: 300,
              minLines: 1,
              maxLines: 3,
              enabled: !_asking,
              decoration: InputDecoration(
                hintText: 'Ex.: Qual barbeiro faturou mais neste mês?',
                filled: true,
                fillColor: const Color(0xFF1C2436),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: _asking ? null : _ask,
                style: FilledButton.styleFrom(
                  backgroundColor: _green,
                  foregroundColor: const Color(0xFF061A14),
                ),
                icon: _asking
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.auto_awesome, size: 18),
                label: Text(_asking ? 'Consultando…' : 'Perguntar'),
              ),
            ),
            if (_answer != null)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: SelectableText(
                  _answer!,
                  style: const TextStyle(height: 1.6),
                ),
              ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      const Text(
        'Sobre os cálculos',
        style: TextStyle(color: _muted, fontWeight: FontWeight.bold),
      ),
      const SizedBox(height: 6),
      for (final note in (_data!['observacoes'] as List? ?? []))
        Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Text(
            '• $note',
            style: const TextStyle(color: _muted, fontSize: 12, height: 1.5),
          ),
        ),
    ];
  }

  Widget _panel({required Widget child, Color? color}) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: const Color(0xFF0F1425),
      borderRadius: BorderRadius.circular(18),
      border: Border.all(
        color: color?.withValues(alpha: 0.3) ?? const Color(0xFF242C40),
      ),
    ),
    child: child,
  );

  Widget _heading(IconData icon, String title) => Row(
    children: [
      Icon(icon, size: 20, color: _green),
      const SizedBox(width: 10),
      Expanded(
        child: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
    ],
  );

  Widget _metric(
    String title,
    String value,
    String caption,
    IconData icon,
    Color color,
  ) => _panel(
    color: color,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  color: _muted,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: .6,
                ),
              ),
            ),
            Icon(icon, size: 25, color: color),
          ],
        ),
        const SizedBox(height: 14),
        Text(
          value,
          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Text(caption, style: TextStyle(color: color, fontSize: 11)),
      ],
    ),
  );

  Widget _chart() {
    final days = _data!['faturamento_por_dia_semana'] as List;
    final maximum = days.fold<double>(
      0,
      (value, day) => math.max(value, _number(day['faturamento'])),
    );
    return _panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _heading(Icons.bar_chart, 'Faturamento por Dia da Semana'),
          const SizedBox(height: 8),
          const Text(
            'Receita dos atendimentos concluídos no período.',
            style: TextStyle(color: _muted, fontSize: 12),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 210,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (final day in days)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Tooltip(
                        message: '${day['dia']}: ${_money(day['faturamento'])}',
                        child: Column(
                          children: [
                            Expanded(
                              child: Container(
                                decoration: BoxDecoration(
                                  color: const Color(0xFF171D31),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                alignment: Alignment.bottomCenter,
                                child: FractionallySizedBox(
                                  widthFactor: 1,
                                  heightFactor: maximum == 0
                                      ? .015
                                      : math.max(
                                          .015,
                                          _number(day['faturamento']) / maximum,
                                        ),
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: _green,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              '${day['dia']}',
                              style: const TextStyle(
                                color: _muted,
                                fontSize: 10,
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
          if (maximum == 0)
            const Padding(
              padding: EdgeInsets.only(top: 16),
              child: Text(
                'Nenhum atendimento concluído neste período.',
                style: TextStyle(color: _muted, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }

  Widget _services() {
    final services = _data!['top_servicos'] as List;
    return _panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _heading(Icons.workspace_premium_outlined, 'Top Serviços'),
          const SizedBox(height: 20),
          if (services.isEmpty)
            const Text(
              'Nenhum atendimento concluído neste período.',
              style: TextStyle(color: _muted, height: 1.5),
            ),
          for (final service in services)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${service['nome_servico']}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${service['quantidade']} atendimentos • ${_money(service['faturamento'])}',
                    style: const TextStyle(color: _muted, fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: (_number(service['percentual']) / 100).clamp(0, 1),
                    color: _green,
                    backgroundColor: const Color(0xFF242C40),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
