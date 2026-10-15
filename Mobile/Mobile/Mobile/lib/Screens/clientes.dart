import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_application_1/services/api_service.dart';
import 'package:flutter_application_1/services/session.dart';

class ClientesScreen extends StatefulWidget {
  const ClientesScreen({super.key});

  @override
  State<ClientesScreen> createState() => _ClientesScreenState();
}

class _ClientesScreenState extends State<ClientesScreen> {
  static const _green = Color(0xFF42D6A1);
  static const _muted = Color(0xFF94A3B8);
  static const _border = Color(0xFF242C40);
  final _search = TextEditingController();
  Map<String, dynamic>? _data;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    if (Session.ehAdmin) _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!Session.ehAdmin) return;
    setState(() {
      _loading = true;
      _error = null;
      _data = null;
    });
    try {
      final data = await ApiService.getClientes();
      if (mounted) setState(() => _data = data);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _name(Map<String, dynamic> client) =>
      '${client['nome'] ?? ''}'.trim().isEmpty
      ? 'Cliente sem nome'
      : '${client['nome']}';

  String _date(dynamic value) {
    final date = DateTime.tryParse('$value');
    if (date == null) return 'Não informado';
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(date.day)}/${two(date.month)}/${date.year} ${two(date.hour)}:${two(date.minute)}';
  }

  String? _phone(Map<String, dynamic> client) {
    var raw = '${client['telefone'] ?? ''}'.trim();
    final jid = '${client['remoteJid'] ?? ''}';
    if (raw.isEmpty && jid.endsWith('@s.whatsapp.net')) {
      raw = jid.split('@').first;
    }
    var digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.length == 10 || digits.length == 11) digits = '55$digits';
    return digits.length >= 12 && digits.length <= 15 ? digits : null;
  }

  Future<void> _whatsapp(Map<String, dynamic> client) async {
    final phone = _phone(client);
    if (phone == null) return;
    try {
      if (await launchUrl(
        Uri.https('wa.me', '/$phone'),
        mode: LaunchMode.externalApplication,
      )) {
        return;
      }
    } catch (_) {
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível abrir o WhatsApp.')),
      );
    }
  }

  void _details(Map<String, dynamic> client) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF0F1425),
        title: Text(_name(client)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final entry in {
                'Código': '#${client['id_cliente']}',
                'Barbearia': '${client['id_barbearia']}',
                'Telefone': '${client['telefone'] ?? 'Não informado'}',
                'Identificador WhatsApp':
                    '${client['remoteJid'] ?? 'Não informado'}',
                'Cadastrado em': _date(client['data_cadastro']),
              }.entries)
                Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry.key,
                        style: const TextStyle(color: _muted, fontSize: 12),
                      ),
                      const SizedBox(height: 4),
                      SelectableText(entry.value),
                    ],
                  ),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Theme(
    data: ThemeData.dark(useMaterial3: true).copyWith(
      scaffoldBackgroundColor: const Color(0xFF060A17),
      colorScheme: ColorScheme.fromSeed(
        seedColor: _green,
        brightness: Brightness.dark,
      ),
    ),
    child: Scaffold(
      appBar: AppBar(
        title: const Text('Clientes'),
        backgroundColor: const Color(0xFF060A17),
        actions: [
          if (Session.ehAdmin)
            IconButton(
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh, color: _green),
              tooltip: 'Atualizar clientes',
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
                        const Row(
                          children: [
                            Icon(Icons.people_outline, color: _green, size: 30),
                            SizedBox(width: 12),
                            Text(
                              'Clientes',
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Todos os clientes cadastrados na sua barbearia • Loja ${Session.barbeariaId}',
                          style: const TextStyle(color: _muted),
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
                        if (!_loading && _data != null) ...[
                          _metrics(),
                          const SizedBox(height: 22),
                          _directory(),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
    ),
  );

  Widget _panel({required Widget child, Color? color}) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: const Color(0xFF0F1425),
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: color?.withValues(alpha: .5) ?? _border),
    ),
    child: child,
  );

  Widget _metrics() {
    final stats = _data!['metricas'] as Map<String, dynamic>;
    final cards = [
      _metric(
        'TOTAL DE CLIENTES',
        stats['total'],
        Icons.people_outline,
        _green,
      ),
      _metric(
        'NOVOS HOJE',
        stats['novos_hoje'],
        Icons.person_add_alt,
        const Color(0xFF6096FF),
      ),
      Tooltip(
        message: 'Semana atual, de segunda-feira a domingo.',
        child: _metric(
          'NOVOS ESSA SEMANA',
          stats['novos_semana'],
          Icons.trending_up,
          const Color(0xFFB482FF),
        ),
      ),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 720 ? 3 : 1;
        final width = (constraints.maxWidth - (columns - 1) * 14) / columns;
        return Wrap(
          spacing: 14,
          runSpacing: 14,
          children: cards
              .map((card) => SizedBox(width: width, child: card))
              .toList(),
        );
      },
    );
  }

  Widget _metric(String title, dynamic value, IconData icon, Color color) =>
      _panel(
        color: color,
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: _muted,
                      fontSize: 11,
                      letterSpacing: .6,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    '$value',
                    style: TextStyle(
                      color: color,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: .1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: color.withValues(alpha: .25)),
              ),
              child: Icon(icon, color: color),
            ),
          ],
        ),
      );

  Widget _directory() {
    final all = (_data!['clientes'] as List).cast<Map<String, dynamic>>();
    final query = _search.text.trim().toLowerCase();
    final digits = query.replaceAll(RegExp(r'\D'), '');
    final clients = all
        .where(
          (client) =>
              query.isEmpty ||
              _name(client).toLowerCase().contains(query) ||
              '${client['telefone'] ?? ''}'.toLowerCase().contains(query) ||
              (digits.isNotEmpty &&
                  RegExp(r'^[\d\s()+.\-]+$').hasMatch(query) &&
                  (_phone(client) ?? '').contains(digits)),
        )
        .toList();
    final search = TextField(
      controller: _search,
      onChanged: (_) => setState(() {}),
      decoration: InputDecoration(
        hintText: 'Buscar por nome ou telefone…',
        prefixIcon: const Icon(Icons.search, color: _muted),
        suffixIcon: query.isEmpty
            ? null
            : IconButton(
                tooltip: 'Limpar busca',
                icon: const Icon(Icons.close),
                onPressed: () => setState(_search.clear),
              ),
        filled: true,
        fillColor: const Color(0xFF080D1D),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: _border),
        ),
      ),
    );
    return _panel(
      child: LayoutBuilder(
        builder: (context, constraints) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (constraints.maxWidth < 650) ...[
                Text(
                  '${clients.length} clientes encontrados',
                  style: const TextStyle(color: _muted),
                ),
                const SizedBox(height: 12),
                search,
              ] else
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${clients.length} clientes encontrados',
                        style: const TextStyle(color: _muted),
                      ),
                    ),
                    SizedBox(width: 310, child: search),
                  ],
                ),
              const SizedBox(height: 18),
              if (clients.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 54),
                  child: Center(
                    child: Column(
                      children: [
                        const Icon(
                          Icons.people_outline,
                          color: _muted,
                          size: 42,
                        ),
                        const SizedBox(height: 14),
                        Text(
                          query.isEmpty
                              ? 'Nenhum cliente cadastrado nesta barbearia.'
                              : 'Nenhum cliente encontrado para esta busca.',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: _muted),
                        ),
                      ],
                    ),
                  ),
                )
              else if (constraints.maxWidth >= 760)
                _table(clients, constraints.maxWidth)
              else
                for (final client in clients) _card(client),
            ],
          );
        },
      ),
    );
  }

  Widget _contact(Map<String, dynamic> client) => OutlinedButton.icon(
    onPressed: _phone(client) == null ? null : () => _whatsapp(client),
    style: OutlinedButton.styleFrom(
      foregroundColor: _green,
      backgroundColor: _green.withValues(alpha: .07),
      side: BorderSide(color: _green.withValues(alpha: .25)),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    ),
    icon: const Icon(Icons.chat_bubble_outline, size: 15),
    label: const Text('WhatsApp', style: TextStyle(fontSize: 12)),
  );

  Widget _avatar(Map<String, dynamic> client) => CircleAvatar(
    radius: 18,
    backgroundColor: _green.withValues(alpha: .12),
    child: Text(
      _name(client).characters.first.toUpperCase(),
      style: const TextStyle(color: _green, fontSize: 14),
    ),
  );

  Widget _card(Map<String, dynamic> client) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Material(
      color: const Color(0xFF111A2D),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: () => _details(client),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _avatar(client),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _name(client),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  const Icon(Icons.chevron_right, size: 20, color: _muted),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Telefone: ${client['telefone'] ?? 'Não informado'}',
                style: const TextStyle(color: _muted),
              ),
              const SizedBox(height: 6),
              Text(
                'Cadastro: ${_date(client['data_cadastro'])}',
                style: const TextStyle(color: _muted, fontSize: 12),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 12,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    '#${client['id_cliente']}',
                    style: const TextStyle(color: _muted, fontSize: 12),
                  ),
                  _contact(client),
                ],
              ),
            ],
          ),
        ),
      ),
    ),
  );

  Widget _table(List<Map<String, dynamic>> clients, double width) => SizedBox(
    width: width,
    child: DataTable(
      columnSpacing: 20,
      horizontalMargin: 12,
      dataRowMinHeight: 64,
      dataRowMaxHeight: 76,
      showCheckboxColumn: false,
      headingTextStyle: const TextStyle(
        color: _muted,
        fontSize: 11,
        fontWeight: FontWeight.bold,
      ),
      headingRowColor: const WidgetStatePropertyAll(Color(0xFF141A2C)),
      columns: const [
        DataColumn(label: Text('#')),
        DataColumn(label: Text('CLIENTE')),
        DataColumn(label: Text('TELEFONE')),
        DataColumn(label: Text('CADASTRADO EM')),
        DataColumn(label: Text('AÇÕES')),
      ],
      rows: [
        for (final client in clients)
          DataRow(
            onSelectChanged: (_) => _details(client),
            cells: [
              DataCell(
                Text(
                  '#${client['id_cliente']}',
                  style: const TextStyle(color: _muted, fontSize: 12),
                ),
              ),
              DataCell(
                SizedBox(
                  width: (width * .23).clamp(100, 260),
                  child: Row(
                    children: [
                      _avatar(client),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _name(client),
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              DataCell(
                SizedBox(
                  width: (width * .17).clamp(100, 180),
                  child: Text(
                    '${client['telefone'] ?? 'Não informado'}',
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: _muted, fontSize: 12),
                  ),
                ),
              ),
              DataCell(
                Text(
                  _date(client['data_cadastro']),
                  style: const TextStyle(color: _muted, fontSize: 12),
                ),
              ),
              DataCell(_contact(client)),
            ],
          ),
      ],
    ),
  );
}
