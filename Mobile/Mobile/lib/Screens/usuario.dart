class Usuario {

  String _user;
  String _password;

  Usuario({required String user, required String password})
      : _user = user,
        _password = password;

  String get user => _user;
  String get password => _password;

  set user(String novoUser) {
    if (novoUser.isNotEmpty) {
      _user = novoUser;
    }
  }

  set password(String novaSenha) {
    if (novaSenha.length >= 6) {
      _password = novaSenha;
    } else {
      print('A senha deve ter pelo menos 6 caracteres!');
    }
  }
}