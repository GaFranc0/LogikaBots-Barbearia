import 'package:flutter/material.dart';

class Gerenciarperfil extends StatefulWidget {
  const Gerenciarperfil({super.key});

  @override
  State<Gerenciarperfil> createState() => _GerenciarperfilState();
}

class _GerenciarperfilState extends State<Gerenciarperfil> {
  bool _obscureText = true;
  TextEditingController _nomeController = TextEditingController();
  TextEditingController _userController = TextEditingController();
  TextEditingController _passwordController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    double alturaDispositivo = MediaQuery.of(context).size.height;
    double larguraDispositivo = MediaQuery.of(context).size.width;

    Color emerald = const Color(0xFF10B981);
    Color emeraldBlur = const Color(0xFF10B981).withValues(alpha: 0.15);
    Color purpleBlur = const Color(0xFFA855F7).withValues(alpha: 0.15);
    Color corFundo = const Color(0xFF050B1A);

    return Scaffold(
      backgroundColor: corFundo,
      body: Center(
        child: SingleChildScrollView(
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
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 8,
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment
                                        .spaceBetween,
                                    children: [

                                      Row(
                                        children: [

                                          Container(
                                            width: 50,
                                            height: 50,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: Colors.white.withValues(
                                                alpha: 0.1,
                                              ),
                                            ),
                                            child: Center(
                                              child: Icon(
                                                Icons.people_outline_sharp,
                                                color: emerald,
                                                size: larguraDispositivo * 0.08,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(
                                            width: 12,
                                          ),
                                          Text(
                                            "Meu perfil",
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontSize:
                                                  larguraDispositivo * 0.04,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),

                                      IconButton(
                                        icon: const Icon(
                                          Icons.arrow_back,
                                          color: Colors.white,
                                        ),
                                        onPressed: () {
                                          Navigator.of(
                                            context,
                                          ).pop();
                                        },
                                      ),
                                    ],
                                  ),
                                ),

                                const SizedBox(height: 15),
                                Container(
                                  height: 1,
                                  width: larguraDispositivo * 0.8,
                                  color: Colors.white24,
                                ),
                                const SizedBox(height: 15),
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: Text(
                                    "Digite seu novo nome",
                                    style: TextStyle(
                                      color: Colors.white70,
                                      fontSize: larguraDispositivo * 0.03,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                SizedBox(
                                  width: double.infinity,
                                  child: TextField(
                                    controller: _nomeController,
                                    style: const TextStyle(color: Colors.white),
                                    decoration: InputDecoration(
                                      hintText: "Nome",
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
                                      contentPadding:
                                          const EdgeInsets.symmetric(
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
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: Text(
                                    "Digite seu novo usuário",
                                    style: TextStyle(
                                      color: Colors.white70,
                                      fontSize: larguraDispositivo * 0.03,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
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
                                      contentPadding:
                                          const EdgeInsets.symmetric(
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
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: Text(
                                    "Digite sua nova senha",
                                    style: TextStyle(
                                      color: Colors.white70,
                                      fontSize: larguraDispositivo * 0.03,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
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
                                      contentPadding:
                                          const EdgeInsets.symmetric(
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
                                Text(
                                  "* Para alterar apenas um campo, deixe os outros em branco",
                                  style: TextStyle(
                                    color: Colors.white30,
                                    fontSize: larguraDispositivo * 0.03,
                                  ),
                                ),
                                SizedBox(height: 20),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(
                                      0xFF10B981,
                                    ),
                                    foregroundColor:
                                        Colors.white,
                                    minimumSize: const Size(
                                      double.infinity,
                                      50,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    elevation: 0,
                                  ),
                                  onPressed: () {},
                                  child: Text('Confirmar'),
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
      ),
    );
  }
}
