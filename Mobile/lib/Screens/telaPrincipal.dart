import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class TelaPrincipal extends StatefulWidget {
  const TelaPrincipal({super.key});

  @override
  State<TelaPrincipal> createState() => _TelaPrincipalState();
}

class _TelaPrincipalState extends State<TelaPrincipal>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late List<Animation<double>> _fadeAnimations;
  late List<Animation<Offset>> _slideAnimations;

  late final List<_MenuOption> _opcoes;

  static const Color _corFundo = Color(0xFF050B1A);
  static const Color _corFundoCard = Color(0xFF0D1526);
  static const Color _corFundoCard2 = Color(0xFF0F1A2E);
  static const Color _emerald = Color(0xFF10B981);
  static const Color _emeraldGlow = Color(0x2010B981);
  static const Color _borderColor = Color(0xFF1E2D45);
  static const Color _textSecondary = Color(0xFF8899AA);

  Future<void> _abrirUrl(String url) async {
  final uri = Uri.parse(url);
  if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível abrir o link.')),
      );
    }
  }
}

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    _opcoes = [
      _MenuOption(
        titulo: 'Gerenciar Bot',
        subtitulo: 'Configure mensagens e fluxos',
        icone: Icons.smart_toy_outlined,
        cor: const Color(0xFF10B981),
        onTap: () => Navigator.pushNamed(context, '/gerenciarBot'),
      ),
      _MenuOption(
        titulo: 'Ver Agendamentos',
        subtitulo: 'Consulte e gerencie horários',
        icone: Icons.calendar_month_outlined,
        cor: const Color(0xFF3B82F6),
        onTap: () => Navigator.pushNamed(context, '/verAgendamentos'),
      ),
      _MenuOption(
        titulo: 'Gerenciar Perfil',
        subtitulo: 'Barbearia, serviços e equipe',
        icone: Icons.store_outlined,
        cor: const Color(0xFF8B5CF6),
        onTap: () => Navigator.pushNamed(context, '/gerenciarPerfil'),
      ),
      _MenuOption(
        titulo: 'Como Usar',
        subtitulo: 'Guia passo a passo',
        icone: Icons.play_circle_outline,
        cor: const Color(0xFFF59E0B),
        onTap: () => _abrirUrl('https://logikabarbearia.netlify.app/tutorial'),
      ),
      _MenuOption(
        titulo: 'Central de Ajuda',
        subtitulo: 'Suporte e documentação',
        icone: Icons.help_outline_rounded,
        cor: const Color(0xFF06B6D4),
        onTap: () => _abrirUrl('https://api.whatsapp.com/send/?phone=19997920862&text&type=phone_number&app_absent=0'),
      ),
    ];
  }

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _fadeAnimations = List.generate(
      7,
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
      7,
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
                      color: Colors.white.withOpacity(0.9),
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
                  index: 6,
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
            border: Border.all(color: _emerald.withOpacity(0.4), width: 1.5),
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
                  Text(
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
                      'PANEL',
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
                'Configure sua Barbearia',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
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
          child: Icon(
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
        splashColor: opcao.cor.withValues(alpha: .08),
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
                  color: opcao.cor.withOpacity(0.12),
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
                      style: TextStyle(
                        color: _textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: _textSecondary.withOpacity(0.5),
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
        Icon(Icons.logout_rounded, size: 15, color: _textSecondary),
        const SizedBox(width: 6),
        TextButton(
          onPressed: () => Navigator.pushNamed(context, '/'),
          child:
          Text('Sair da conta',
          style: TextStyle(
            color: _textSecondary,
            fontSize: 13,
          ),
        ),
        )
      ],
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