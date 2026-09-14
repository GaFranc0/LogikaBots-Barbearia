
import 'package:flutter/material.dart';
import 'package:flutter_application_1/Screens/usuario.dart';

class Login extends StatefulWidget {
  const Login({super.key});

  @override
  State<Login> createState() => _LoginState();
}

class _LoginState extends State<Login> {
  List<Usuario> usuarios = [
    Usuario(user: 'Admin', password: 'Admin'),
    Usuario(user: 'Teste', password: 'senha123'),
  ];

  bool _obscureText = true;
  TextEditingController _userController = TextEditingController();
  TextEditingController _passwordController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    double alturaDispositivo = MediaQuery.of(context).size.height;
    double larguraDispositivo = MediaQuery.of(context).size.width;

    Color emeraldBlur = const Color(0xFF10B981).withValues(alpha: 0.15);
    Color purpleBlur = const Color(0xFFA855F7).withValues(alpha: 0.15);
    Color corFundo = const Color(0xFF050B1A);

    return Scaffold(
      backgroundColor: corFundo,
      body: SingleChildScrollView(
        child: SizedBox(
          height: alturaDispositivo,
          width: larguraDispositivo,
          child: Stack(
            children: [
              Positioned(
                top: -alturaDispositivo * 0.1,
                left: -larguraDispositivo * 0.1,
                child: Container(
                  width: 250,
                  height: 250,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [emeraldBlur, emeraldBlur.withValues(alpha: 0)],
                    ),
                  ),
                ),
              ),

              Positioned(
                bottom: -alturaDispositivo * 0.1,
                right: -larguraDispositivo * 0.1,
                child: Container(
                  width: 300,
                  height: 300,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [purpleBlur, purpleBlur.withValues(alpha: 0)],
                    ),
                  ),
                ),
              ),

              SafeArea(
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 30),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [

                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.1),
                            ),
                          ),
                          child: Column(
                            children: [
                              Image.asset(
                                'assets/images/Logo.png',
                                width: 130,
                                height: 130,
                              ),
                              const SizedBox(height: 30),
                              Text(
                                "Bem-vindo",
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              SizedBox(height: 10),
                              Text(
                                "Faça login para continuar",
                                style: TextStyle(color: Colors.white70),
                              ),
                              SizedBox(height: 30),
                              SizedBox(
                                width: double.infinity,
                                child: TextField(
                                  controller: _userController,
                                  style: const TextStyle(color: Colors.white),
                                  decoration: InputDecoration(
                                    hintText: "Usuário",
                                    hintStyle: const TextStyle(
                                      color: Colors.white38,
                                    ),
                                    prefixIcon: const Icon(
                                      Icons.person,
                                      color: Colors.white70,
                                    ),
                                    filled: true,
                                    fillColor: Colors.white.withValues(
                                      alpha: 0.05,
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                      vertical: 20,
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(16),
                                      borderSide: BorderSide(
                                        color: Colors.white.withValues(
                                          alpha: 0.1,
                                        ),
                                      ),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(16),
                                      borderSide: const BorderSide(
                                        color: Color(0xFF10B981),
                                        width: 2,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 20),
                              SizedBox(
                                width: double.infinity,
                                child: TextField(
                                  controller: _passwordController,
                                  obscureText:
                                      _obscureText,
                                  style: const TextStyle(color: Colors.white),
                                  decoration: InputDecoration(
                                    hintText: "Senha",
                                    hintStyle: const TextStyle(
                                      color: Colors.white38,
                                    ),
                                    prefixIcon: const Icon(
                                      Icons.lock_outline,
                                      color: Colors.white70,
                                    ),

                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _obscureText
                                            ? Icons.visibility_off
                                            : Icons.visibility,
                                        color: Colors.white70,
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          _obscureText =
                                              !_obscureText;
                                        });
                                      },
                                    ),
                                    filled: true,
                                    fillColor: Colors.white.withValues(
                                      alpha: 0.05,
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                      vertical: 20,
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(16),
                                      borderSide: BorderSide(
                                        color: Colors.white.withValues(
                                          alpha: 0.1,
                                        ),
                                      ),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(16),
                                      borderSide: const BorderSide(
                                        color: Color(0xFF10B981),
                                        width: 2,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              SizedBox(height: 20),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(
                                    0xFF10B981,
                                  ),
                                  foregroundColor: Colors.white,
                                  minimumSize: const Size(
                                    double.infinity,
                                    50,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  elevation: 0,
                                ),
                                onPressed: () {
                                  String user = _userController.text;
                                  String password = _passwordController.text;

                                  bool existeUsuario = usuarios.any(
                                    (u) =>
                                        u.user == user &&
                                        u.password == password,
                                  );

                                  if (existeUsuario) {
                                    Navigator.pushNamed(context, '/inicio');
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          'Usuário ou senha incorreta',
                                          style: const TextStyle(color: Colors.white),
                                        ),
                                        backgroundColor: const Color.fromARGB(255, 12, 27, 63),
                                        duration: const Duration(seconds: 4),
                                        action: SnackBarAction(
                                          label: 'OK',
                                          textColor: Colors.white,
                                          onPressed: () {
                                            ScaffoldMessenger.of(context).hideCurrentSnackBar();
                                          },
                                        ),
                                      ),
                                    );
                                  }
                                },
                                child: Text('Entrar'),
                              ),
                            ],
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
