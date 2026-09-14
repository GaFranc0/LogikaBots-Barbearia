import 'package:flutter/material.dart';

class Gerenciarbot extends StatefulWidget {
  const Gerenciarbot({super.key});

  @override
  State<Gerenciarbot> createState() => _GerenciarbotState();
}

class _GerenciarbotState extends State<Gerenciarbot> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late List<Animation<double>> _fadeAnimations;
  late List<Animation<Offset>> _slideAnimations;

  late List<_MenuOption> _opcoes;

  static const Color _corFundo = Color(0xFF050B1A);
  static const Color _corFundoCard = Color(0xFF0D1526);
  static const Color _corFundoCard2 = Color(0xFF0F1A2E);
  static const Color _emerald = Color(0xFF10B981);
  static const Color _emeraldGlow = Color(0x2010B981);
  static const Color _borderColor = Color(0xFF1E2D45);
  static const Color _textSecondary = Color(0xFF8899AA);

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _opcoes = [
      _MenuOption(
        titulo: 'Horários de Funcionamento',
        subtitulo: 'Configure os horários e dias de atendimento',
        icone: Icons.settings,
        cor: const Color(0xFF3B82F6),
        onTap: () => Navigator.pushNamed(context, '/horarioFuncionamento'),
      ),
      _MenuOption(
        titulo: 'Catálogo',
        subtitulo: 'Gerencie os serviços oferecidos',
        icone: Icons.content_cut,
        cor: const Color(0xFF10B981),
        onTap: () => Navigator.pushNamed(context, '/catalogo'),
      ),
      _MenuOption(
        titulo: 'Gerenciar Profissionais',
        subtitulo: 'Gerencie a equipe e seus horários',
        icone: Icons.people_outline,
        cor: const Color(0xFF8B5CF6),
        onTap: () => Navigator.pushNamed(context, '/profissionais'),
      ),
      _MenuOption(
        titulo: 'Bloqueio de Agenda',
        subtitulo: 'Escolha datas onde a barbearia não vai funcionar',
        icone: Icons.event_busy,
        cor: Colors.red,
        onTap: () => Navigator.pushNamed(context, '/bloqueio'),
      ),
      _MenuOption(
        titulo: 'Localização',
        subtitulo: 'Configure a mensagem de localização para seus clientes',
        icone: Icons.location_on,
        cor: const Color(0xFF06B6D4),
        onTap: () => Navigator.pushNamed(context, '/localizacao'),
      ),
      _MenuOption(
        titulo: 'Dúvidas Frequentes',
        subtitulo: 'Crie perguntas e respostas para seus clientes',
        icone: Icons.question_answer,
        cor: const Color(0xFF8B5CF6),
        onTap: () => Navigator.pushNamed(context, '/duvidas'),
      ),
    ];

    _fadeAnimations = List.generate(
      9,
      (i) => Tween<double>(begin: 0, end: 1).animate(
        CurvedAnimation(
          parent: _animationController,
          curve: Interval(
            i * 0.08,
            (i * 0.08 + 0.4).clamp(0.0, 1.0),
            curve: Curves.easeOut,
          ),
        ),
      ),
    );

    _slideAnimations = List.generate(
      9,
      (i) => Tween<Offset>(
        begin: const Offset(0, 0.3),
        end: Offset.zero,
      ).animate(
        CurvedAnimation(
          parent: _animationController,
          curve: Interval(
            i * 0.08,
            (i * 0.08 + 0.4).clamp(0.0, 1.0),
            curve: Curves.easeOutCubic,
          ),
        ),
      ),
    );

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Widget _buildAnimated({required int index, required Widget child}) {
    final safeIndex = index.clamp(0, _fadeAnimations.length - 1);
    return FadeTransition(
      opacity: _fadeAnimations[safeIndex],
      child: SlideTransition(
        position: _slideAnimations[safeIndex],
        child: child,
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            color: _emeraldGlow,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: _emerald.withValues(alpha: 0.4), width: 1.5),
          ),
          child: const Center(
            child: Text(
              'L',
              style: TextStyle(
                color: _emerald,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text(
                    'Admin',
                    style: TextStyle(
                      color: _emerald,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 7,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: _emeraldGlow,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'PAINEL',
                      style: TextStyle(
                        color: _emerald,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 3),
              const Text(
                'Configure seu Bot de Atendimento',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              const Text(
                'Gerencie seu atendimento',
                style: TextStyle(
                  color: _textSecondary,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: _corFundoCard2,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _borderColor),
          ),
          child: const Icon(
            Icons.notifications_none_rounded,
            color: _textSecondary,
            size: 20,
          ),
        ),
      ],
    );
  }

  Widget _buildMenuCard(_MenuOption opcao) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: opcao.onTap,
        borderRadius: BorderRadius.circular(16),
        splashColor: opcao.cor.withValues(alpha: 0.08),
        highlightColor: opcao.cor.withValues(alpha: 0.04),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
          decoration: BoxDecoration(
            color: _corFundoCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _borderColor),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: opcao.cor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(
                  opcao.icone,
                  color: opcao.cor,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      opcao.titulo,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      opcao.subtitulo,
                      style: const TextStyle(
                        color: _textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: _textSecondary.withValues(alpha: 0.5),
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFooter() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.arrow_back_rounded, size: 15, color: _textSecondary),
        const SizedBox(width: 6),
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text(
            'Voltar',
            style: TextStyle(
              color: _textSecondary,
              fontSize: 13,
            ),
          ),
        )
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _corFundo,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 32),
                _buildAnimated(
                  index: 0,
                  child: _buildHeader(),
                ),
                const SizedBox(height: 36),
                _buildAnimated(
                  index: 1,
                  child: Text(
                    'O que deseja fazer?',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                ...List.generate(_opcoes.length, (i) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _buildAnimated(
                      index: i + 2,
                      child: _buildMenuCard(_opcoes[i]),
                    ),
                  );
                }),
                const SizedBox(height: 24),
                _buildAnimated(
                  index: _opcoes.length + 2,
                  child: _buildFooter(),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MenuOption {
  final String titulo;
  final String subtitulo;
  final IconData icone;
  final Color cor;
  final VoidCallback onTap;

  const _MenuOption({
    required this.titulo,
    required this.subtitulo,
    required this.icone,
    required this.cor,
    required this.onTap,
  });
}