class Session {
  static int? usuarioId;
  static int? barbeariaId;
  static String? user;
  static String? nome;
  static String? nivel;
  static String? token;

  static void iniciar({
    required int id,
    required int idBarbearia,
    required String usuario,
    String? nomeCompleto,
    String? nivelAcesso,
    String? tokenAcesso,
  }) {
    usuarioId = id;
    barbeariaId = idBarbearia;
    user = usuario;
    nome = nomeCompleto;
    nivel = nivelAcesso;
    token = tokenAcesso;
  }

  static void encerrar() {
    usuarioId = null;
    barbeariaId = null;
    user = null;
    nome = null;
    nivel = null;
    token = null;
  }

  static bool get estaLogado => usuarioId != null;
  static bool get ehAdmin => estaLogado && nivel == 'admin';
}
