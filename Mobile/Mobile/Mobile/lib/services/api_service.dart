import 'dart:convert';
import 'package:http/http.dart' as http;
import 'session.dart';

class ApiException implements Exception {
  final String mensagem;
  final bool sessaoExpirada;
  ApiException(this.mensagem, {this.sessaoExpirada = false});

  @override
  String toString() => mensagem;
}

class ApiService {
  static const String baseUrl = 'http://localhost:8000/api';

  static Map<String, String> get _reportHeaders => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${Session.token ?? ''}',
  };

  static Future<Map<String, dynamic>> getRelatorio(int ano, int mes) async {
    final resposta = await http.get(
      Uri.parse('$baseUrl/public/index.php').replace(queryParameters: {
        'route': '/relatorios/dashboard', 'ano': '$ano', 'mes': '$mes',
      }), headers: _reportHeaders,
    ).timeout(const Duration(seconds: 40));
    return _decode(resposta);
  }

  static Future<Map<String, dynamic>> getClientes() async {
    final resposta = await http.get(
      Uri.parse('$baseUrl/public/index.php?route=/clientes'),
      headers: _reportHeaders,
    ).timeout(const Duration(seconds: 20));
    return _decode(resposta);
  }

  static Future<Map<String, dynamic>> perguntarRelatorio(int ano, int mes, String pergunta) async {
    final resposta = await http.post(
      Uri.parse('$baseUrl/public/index.php?route=/ia/perguntar'),
      headers: _reportHeaders,
      body: jsonEncode({'ano': ano, 'mes': mes, 'pergunta': pergunta}),
    ).timeout(const Duration(seconds: 60));
    return _decode(resposta);
  }

  static Future<void> logout() async {
    if (Session.token == null) return;
    try {
      await http.post(Uri.parse('$baseUrl/public/index.php?route=/auth/logout'),
        headers: _reportHeaders, body: '{}').timeout(const Duration(seconds: 5));
    } catch (_) {
    }
  }

  static dynamic _corpo(http.Response resposta) {
    if (resposta.body.isEmpty) return null;
    try {
      return jsonDecode(resposta.body);
    } catch (_) {
      return null;
    }
  }

  static ApiException _erro(http.Response resposta, dynamic corpo) {
    final mensagem = corpo is Map
        ? (corpo['erro'] ?? corpo['error'] ?? 'Erro inesperado (${resposta.statusCode})').toString()
        : 'Erro inesperado (${resposta.statusCode})';
    final autenticada = resposta.request?.url.queryParameters.containsKey('route') ?? false;
    return ApiException(mensagem, sessaoExpirada: autenticada && resposta.statusCode == 401);
  }

  static Map<String, dynamic> _decode(http.Response resposta) {
    final corpo = _corpo(resposta);
    if (resposta.statusCode >= 200 && resposta.statusCode < 300) {
      return corpo is Map<String, dynamic> ? corpo : {'dados': corpo};
    }
    throw _erro(resposta, corpo);
  }

  static List<dynamic> _decodeList(http.Response resposta) {
    final corpo = _corpo(resposta);
    if (resposta.statusCode >= 200 && resposta.statusCode < 300) {
      return corpo is List ? corpo : [];
    }
    throw _erro(resposta, corpo);
  }

  static Future<Map<String, dynamic>> login(String user, String password) async {
    final resposta = await http.post(
      Uri.parse('$baseUrl/usuarios.php?acao=login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'user': user, 'password': password}),
    );
    return _decode(resposta);
  }

  static Future<Map<String, dynamic>> getPerfil(int usuarioId) async {
    final resposta = await http.get(Uri.parse('$baseUrl/usuarios.php?acao=perfil&usuario_id=$usuarioId'));
    return _decode(resposta);
  }

  static Future<void> atualizarPerfil(int usuarioId, {String? nome, String? user, String? password}) async {
    final resposta = await http.put(
      Uri.parse('$baseUrl/usuarios.php?acao=perfil'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'usuario_id': usuarioId,
        if (nome != null) 'nome': nome,
        if (user != null) 'user': user,
        if (password != null) 'password': password,
      }),
    );
    final token = _decode(resposta)['token'];
    if (token is String) Session.token = token;
  }

  static Future<List<dynamic>> getServicos(int barbeariaId) async {
    final resposta = await http
        .get(Uri.parse('$baseUrl/servicos.php?id_barbearia=$barbeariaId'))
        .timeout(const Duration(seconds: 20));
    return _decodeList(resposta);
  }

  static Future<int> criarServico(int barbeariaId, String nome, double valor, int minutos) async {
    final resposta = await http.post(
      Uri.parse('$baseUrl/servicos.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'id_barbearia': barbeariaId, 'nome': nome, 'valor': valor, 'minutos': minutos}),
    ).timeout(const Duration(seconds: 20));
    final id = _decode(resposta)['id'];
    if (id is! num) throw ApiException('Resposta inválida do servidor.');
    return id.toInt();
  }

  static Future<void> atualizarServico(int id, String nome, double valor, int minutos) async {
    final resposta = await http.put(
      Uri.parse('$baseUrl/servicos.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'id': id, 'nome': nome, 'valor': valor, 'minutos': minutos}),
    ).timeout(const Duration(seconds: 20));
    _decode(resposta);
  }

  static Future<void> removerServico(int id) async {
    final resposta = await http
        .delete(Uri.parse('$baseUrl/servicos.php?id=$id'))
        .timeout(const Duration(seconds: 20));
    _decode(resposta);
  }

  static Future<List<dynamic>> getProfissionais(int barbeariaId) async {
    final resposta = await http.get(Uri.parse('$baseUrl/profissionais.php?id_barbearia=$barbeariaId'));
    return _decodeList(resposta);
  }

  static Future<String> criarProfissional(int barbeariaId, Map<String, dynamic> dados) async {
    final resposta = await http.post(
      Uri.parse('$baseUrl/profissionais.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'id_barbearia': barbeariaId, ...dados}),
    );
    final corpo = _decode(resposta);
    return corpo['id'].toString();
  }

  static Future<void> atualizarProfissional(String id, Map<String, dynamic> dados) async {
    final resposta = await http.put(
      Uri.parse('$baseUrl/profissionais.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'id': id, ...dados}),
    );
    _decode(resposta);
  }

  static Future<void> removerProfissional(String id) async {
    final resposta = await http.delete(Uri.parse('$baseUrl/profissionais.php?id=$id'));
    _decode(resposta);
  }

  static Future<List<dynamic>> getBloqueios(int barbeariaId) async {
    final resposta = await http.get(Uri.parse('$baseUrl/bloqueios.php?id_barbearia=$barbeariaId'));
    return _decodeList(resposta);
  }

  static Future<String> criarBloqueio(int barbeariaId, Map<String, dynamic> dados) async {
    final resposta = await http.post(
      Uri.parse('$baseUrl/bloqueios.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'id_barbearia': barbeariaId, ...dados}),
    );
    final corpo = _decode(resposta);
    return corpo['id'].toString();
  }

  static Future<List<String>> criarBloqueioParaTodos(int barbeariaId, Map<String, dynamic> dados) async {
    final resposta = await http.post(
      Uri.parse('$baseUrl/bloqueios.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'id_barbearia': barbeariaId, ...dados}),
    );
    final corpo = _decode(resposta);
    final ids = corpo['ids'] as List<dynamic>? ?? [];
    return ids.map((e) => e.toString()).toList();
  }

  static Future<void> atualizarBloqueio(String id, Map<String, dynamic> dados) async {
    final resposta = await http.put(
      Uri.parse('$baseUrl/bloqueios.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'id': id, ...dados}),
    );
    _decode(resposta);
  }

  static Future<void> removerBloqueio(String id) async {
    final resposta = await http.delete(Uri.parse('$baseUrl/bloqueios.php?id=$id'));
    _decode(resposta);
  }

  static Future<List<dynamic>> getDuvidas(int barbeariaId) async {
    final resposta = await http.get(Uri.parse('$baseUrl/duvidas.php?id_barbearia=$barbeariaId'));
    return _decodeList(resposta);
  }

  static Future<String> criarDuvida(int barbeariaId, String pergunta, String resposta) async {
    final respostaHttp = await http.post(
      Uri.parse('$baseUrl/duvidas.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'id_barbearia': barbeariaId, 'pergunta': pergunta, 'resposta': resposta}),
    );
    final corpo = _decode(respostaHttp);
    return corpo['id'].toString();
  }

  static Future<void> atualizarDuvida(String id, String pergunta, String resposta) async {
    final respostaHttp = await http.put(
      Uri.parse('$baseUrl/duvidas.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'id': id, 'pergunta': pergunta, 'resposta': resposta}),
    );
    _decode(respostaHttp);
  }

  static Future<void> removerDuvida(String id) async {
    final resposta = await http.delete(Uri.parse('$baseUrl/duvidas.php?id=$id'));
    _decode(resposta);
  }

  static Future<Map<String, dynamic>> getHorario(int barbeariaId) async {
    final resposta = await http.get(Uri.parse('$baseUrl/horario.php?id_barbearia=$barbeariaId'));
    return _decode(resposta);
  }

  static Future<Map<String, dynamic>> salvarHorario(int barbeariaId, Map<String, dynamic> dados) async {
    final resposta = await http.post(
      Uri.parse('$baseUrl/horario.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'id_barbearia': barbeariaId, ...dados}),
    );
    return _decode(resposta);
  }

  static Future<String> getLocalizacao(int barbeariaId) async {
    final resposta = await http.get(Uri.parse('$baseUrl/localizacao.php?id_barbearia=$barbeariaId'));
    final corpo = _decode(resposta);
    return corpo['mensagem'] ?? '';
  }

  static Future<void> salvarLocalizacao(int barbeariaId, String mensagem) async {
    final resposta = await http.post(
      Uri.parse('$baseUrl/localizacao.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'id_barbearia': barbeariaId, 'mensagem': mensagem}),
    );
    _decode(resposta);
  }

  static Future<List<dynamic>> getAgendamentos(int barbeariaId) async {
    final resposta = await http.get(Uri.parse('$baseUrl/agendamentos.php?id_barbearia=$barbeariaId'));
    return _decodeList(resposta);
  }

  static Future<void> atualizarStatusAgendamento(int id, String status) async {
    final resposta = await http.put(
      Uri.parse('$baseUrl/agendamentos.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'id': id, 'status': status}),
    );
    _decode(resposta);
  }
}
