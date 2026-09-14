-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: bots_mysql_bd:3306
-- Generation Time: Sep 12, 2026 at 04:31 PM
-- Server version: 9.7.2
-- PHP Version: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `schema_barbearia`
--

-- --------------------------------------------------------

--
-- Table structure for table `agendamentos`
--

CREATE TABLE `agendamentos` (
  `id_agendamento` bigint UNSIGNED NOT NULL,
  `id_barbearia` bigint UNSIGNED NOT NULL,
  `id_cliente` bigint UNSIGNED NOT NULL,
  `id_barbeiro` bigint UNSIGNED NOT NULL,
  `id_servico` bigint UNSIGNED NOT NULL,
  `data_agendamento` date NOT NULL,
  `horario_inicio` time NOT NULL,
  `horario_fim` time NOT NULL,
  `lembrete_enviado` tinyint(1) DEFAULT '0',
  `status_agendamento` enum('agendado','concluido','cancelado') DEFAULT 'agendado',
  `data_criacao` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `barbearias`
--

CREATE TABLE `barbearias` (
  `id_barbearia` bigint UNSIGNED NOT NULL,
  `nome` varchar(100) NOT NULL,
  `telefone_whatsapp` varchar(25) NOT NULL,
  `horario_funcionamento_inicio` time NOT NULL,
  `horario_funcionamento_fim` time NOT NULL,
  `localizacao` varchar(150) DEFAULT NULL,
  `dia_inicio` int NOT NULL DEFAULT '2',
  `dia_fim` int NOT NULL DEFAULT '6',
  `id_instance` varchar(100) NOT NULL,
  `token_evolution` varchar(50) NOT NULL,
  `timezone` varchar(50) DEFAULT 'America/Sao_Paulo',
  `data_cadastro` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `barbeiros`
--

CREATE TABLE `barbeiros` (
  `id_barbeiro` bigint UNSIGNED NOT NULL,
  `id_barbearia` bigint UNSIGNED NOT NULL,
  `nome` varchar(100) NOT NULL,
  `situacao` enum('ativo','inativo') DEFAULT 'ativo',
  `almoco_inicio` time DEFAULT NULL,
  `almoco_fim` time DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bloqueios_agenda`
--

CREATE TABLE `bloqueios_agenda` (
  `id_bloqueio` bigint UNSIGNED NOT NULL,
  `id_barbearia` bigint UNSIGNED NOT NULL,
  `id_barbeiro` bigint UNSIGNED NOT NULL,
  `data_inicio` datetime NOT NULL,
  `data_fim` datetime NOT NULL,
  `motivo` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `clientes`
--

CREATE TABLE `clientes` (
  `id_cliente` bigint UNSIGNED NOT NULL,
  `id_barbearia` bigint UNSIGNED NOT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `telefone` varchar(30) DEFAULT NULL,
  `remoteJid` varchar(50) NOT NULL,
  `data_cadastro` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `controle_bot`
--

CREATE TABLE `controle_bot` (
  `id_controle` bigint UNSIGNED NOT NULL,
  `id_cliente` bigint UNSIGNED DEFAULT NULL,
  `id_barbearia` bigint UNSIGNED DEFAULT NULL,
  `processando` tinyint(1) DEFAULT NULL,
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `disponibilidade_barbeiro`
--

CREATE TABLE `disponibilidade_barbeiro` (
  `id_disponibilidade` bigint UNSIGNED NOT NULL,
  `id_barbearia` bigint UNSIGNED NOT NULL,
  `id_barbeiro` bigint UNSIGNED NOT NULL,
  `dia_semana` enum('seg','ter','qua','qui','sex','sab','dom') NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fim` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `duvidas_frequentes`
--

CREATE TABLE `duvidas_frequentes` (
  `id_duvida` bigint UNSIGNED NOT NULL,
  `id_barbearia` bigint UNSIGNED DEFAULT NULL,
  `duvida_titulo` varchar(150) DEFAULT NULL,
  `duvida_resposta` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `horarios_atendimento`
--

CREATE TABLE `horarios_atendimento` (
  `id_horario` bigint UNSIGNED NOT NULL,
  `id_barbearia` bigint UNSIGNED NOT NULL,
  `horario` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `servicos`
--

CREATE TABLE `servicos` (
  `id_servico` bigint UNSIGNED NOT NULL,
  `id_barbearia` bigint UNSIGNED NOT NULL,
  `nome_servico` varchar(50) NOT NULL,
  `preco` decimal(10,2) NOT NULL,
  `tempo` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessoes_bot`
--

CREATE TABLE `sessoes_bot` (
  `id_sessao` bigint UNSIGNED NOT NULL,
  `id_cliente` bigint UNSIGNED NOT NULL,
  `id_barbearia` bigint UNSIGNED NOT NULL,
  `etapa` varchar(50) DEFAULT NULL,
  `dados_contexto` json DEFAULT NULL,
  `bot_ativo` tinyint(1) DEFAULT '1',
  `id_session` varchar(50) DEFAULT NULL,
  `pausado_em` datetime DEFAULT NULL,
  `remoteJid` varchar(50) NOT NULL,
  `ultima_interacao` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `usuarios_admin`
--

CREATE TABLE `usuarios_admin` (
  `id_usuario` bigint UNSIGNED NOT NULL,
  `id_barbearia` bigint UNSIGNED NOT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `usuario` varchar(50) NOT NULL,
  `senha_hash` varchar(255) NOT NULL,
  `nivel` enum('admin','gerente','atendente') DEFAULT 'admin',
  `ativo` tinyint(1) DEFAULT '1',
  `data_criacao` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for table `agendamentos`
--
ALTER TABLE `agendamentos`
  ADD PRIMARY KEY (`id_agendamento`),
  ADD UNIQUE KEY `ux_agendamento_barbeiro_horario` (`id_barbearia`,`id_barbeiro`,`data_agendamento`,`horario_inicio`),
  ADD KEY `id_cliente` (`id_cliente`),
  ADD KEY `id_barbeiro` (`id_barbeiro`),
  ADD KEY `id_servico` (`id_servico`),
  ADD KEY `idx_agendamentos_data` (`data_agendamento`,`id_barbeiro`);

--
-- Indexes for table `barbearias`
--
ALTER TABLE `barbearias`
  ADD PRIMARY KEY (`id_barbearia`),
  ADD UNIQUE KEY `id_instance` (`id_instance`),
  ADD UNIQUE KEY `token_evolution` (`token_evolution`),
  ADD KEY `idx_barbearias_instance` (`id_instance`);

--
-- Indexes for table `barbeiros`
--
ALTER TABLE `barbeiros`
  ADD PRIMARY KEY (`id_barbeiro`),
  ADD KEY `id_barbearia` (`id_barbearia`);

--
-- Indexes for table `bloqueios_agenda`
--
ALTER TABLE `bloqueios_agenda`
  ADD PRIMARY KEY (`id_bloqueio`),
  ADD KEY `id_barbearia` (`id_barbearia`),
  ADD KEY `id_barbeiro` (`id_barbeiro`);

--
-- Indexes for table `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id_cliente`),
  ADD UNIQUE KEY `remoteJid` (`remoteJid`),
  ADD UNIQUE KEY `remoteJid_2` (`remoteJid`,`id_barbearia`),
  ADD KEY `id_barbearia` (`id_barbearia`),
  ADD KEY `idx_clientes_remotejid` (`remoteJid`,`id_barbearia`);

--
-- Indexes for table `controle_bot`
--
ALTER TABLE `controle_bot`
  ADD PRIMARY KEY (`id_controle`),
  ADD KEY `id_cliente` (`id_cliente`),
  ADD KEY `id_barbearia` (`id_barbearia`);

--
-- Indexes for table `disponibilidade_barbeiro`
--
ALTER TABLE `disponibilidade_barbeiro`
  ADD PRIMARY KEY (`id_disponibilidade`),
  ADD KEY `id_barbearia` (`id_barbearia`),
  ADD KEY `id_barbeiro` (`id_barbeiro`);

--
-- Indexes for table `duvidas_frequentes`
--
ALTER TABLE `duvidas_frequentes`
  ADD PRIMARY KEY (`id_duvida`),
  ADD KEY `id_barbearia` (`id_barbearia`);

--
-- Indexes for table `horarios_atendimento`
--
ALTER TABLE `horarios_atendimento`
  ADD PRIMARY KEY (`id_horario`),
  ADD UNIQUE KEY `id_barbearia` (`id_barbearia`,`horario`);

--
-- Indexes for table `servicos`
--
ALTER TABLE `servicos`
  ADD PRIMARY KEY (`id_servico`),
  ADD KEY `id_barbearia` (`id_barbearia`);

--
-- Indexes for table `sessoes_bot`
--
ALTER TABLE `sessoes_bot`
  ADD PRIMARY KEY (`id_sessao`),
  ADD UNIQUE KEY `id_cliente` (`id_cliente`,`id_barbearia`),
  ADD KEY `remoteJid` (`remoteJid`),
  ADD KEY `id_barbearia` (`id_barbearia`),
  ADD KEY `idx_sessoes_etapa` (`etapa`);

--
-- Indexes for table `usuarios_admin`
--
ALTER TABLE `usuarios_admin`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `usuario` (`usuario`),
  ADD KEY `id_barbearia` (`id_barbearia`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `agendamentos`
--
ALTER TABLE `agendamentos`
  MODIFY `id_agendamento` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `barbearias`
--
ALTER TABLE `barbearias`
  MODIFY `id_barbearia` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `barbeiros`
--
ALTER TABLE `barbeiros`
  MODIFY `id_barbeiro` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `bloqueios_agenda`
--
ALTER TABLE `bloqueios_agenda`
  MODIFY `id_bloqueio` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id_cliente` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `controle_bot`
--
ALTER TABLE `controle_bot`
  MODIFY `id_controle` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `disponibilidade_barbeiro`
--
ALTER TABLE `disponibilidade_barbeiro`
  MODIFY `id_disponibilidade` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `duvidas_frequentes`
--
ALTER TABLE `duvidas_frequentes`
  MODIFY `id_duvida` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `horarios_atendimento`
--
ALTER TABLE `horarios_atendimento`
  MODIFY `id_horario` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `servicos`
--
ALTER TABLE `servicos`
  MODIFY `id_servico` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `sessoes_bot`
--
ALTER TABLE `sessoes_bot`
  MODIFY `id_sessao` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `usuarios_admin`
--
ALTER TABLE `usuarios_admin`
  MODIFY `id_usuario` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `agendamentos`
--
ALTER TABLE `agendamentos`
  ADD CONSTRAINT `agendamentos_ibfk_1` FOREIGN KEY (`id_barbearia`) REFERENCES `barbearias` (`id_barbearia`) ON DELETE CASCADE,
  ADD CONSTRAINT `agendamentos_ibfk_2` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE,
  ADD CONSTRAINT `agendamentos_ibfk_3` FOREIGN KEY (`id_barbeiro`) REFERENCES `barbeiros` (`id_barbeiro`) ON DELETE CASCADE,
  ADD CONSTRAINT `agendamentos_ibfk_4` FOREIGN KEY (`id_servico`) REFERENCES `servicos` (`id_servico`) ON DELETE CASCADE;

--
-- Constraints for table `barbeiros`
--
ALTER TABLE `barbeiros`
  ADD CONSTRAINT `barbeiros_ibfk_1` FOREIGN KEY (`id_barbearia`) REFERENCES `barbearias` (`id_barbearia`) ON DELETE CASCADE;

--
-- Constraints for table `bloqueios_agenda`
--
ALTER TABLE `bloqueios_agenda`
  ADD CONSTRAINT `bloqueios_agenda_ibfk_1` FOREIGN KEY (`id_barbearia`) REFERENCES `barbearias` (`id_barbearia`) ON DELETE CASCADE,
  ADD CONSTRAINT `bloqueios_agenda_ibfk_2` FOREIGN KEY (`id_barbeiro`) REFERENCES `barbeiros` (`id_barbeiro`) ON DELETE CASCADE;

--
-- Constraints for table `clientes`
--
ALTER TABLE `clientes`
  ADD CONSTRAINT `clientes_ibfk_1` FOREIGN KEY (`id_barbearia`) REFERENCES `barbearias` (`id_barbearia`) ON DELETE CASCADE;

--
-- Constraints for table `controle_bot`
--
ALTER TABLE `controle_bot`
  ADD CONSTRAINT `controle_bot_ibfk_1` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE,
  ADD CONSTRAINT `controle_bot_ibfk_2` FOREIGN KEY (`id_barbearia`) REFERENCES `barbearias` (`id_barbearia`) ON DELETE CASCADE;

--
-- Constraints for table `disponibilidade_barbeiro`
--
ALTER TABLE `disponibilidade_barbeiro`
  ADD CONSTRAINT `disponibilidade_barbeiro_ibfk_1` FOREIGN KEY (`id_barbearia`) REFERENCES `barbearias` (`id_barbearia`) ON DELETE CASCADE,
  ADD CONSTRAINT `disponibilidade_barbeiro_ibfk_2` FOREIGN KEY (`id_barbeiro`) REFERENCES `barbeiros` (`id_barbeiro`) ON DELETE CASCADE;

--
-- Constraints for table `duvidas_frequentes`
--
ALTER TABLE `duvidas_frequentes`
  ADD CONSTRAINT `duvidas_frequentes_ibfk_1` FOREIGN KEY (`id_barbearia`) REFERENCES `barbearias` (`id_barbearia`) ON DELETE CASCADE;

--
-- Constraints for table `horarios_atendimento`
--
ALTER TABLE `horarios_atendimento`
  ADD CONSTRAINT `horarios_atendimento_ibfk_1` FOREIGN KEY (`id_barbearia`) REFERENCES `barbearias` (`id_barbearia`) ON DELETE CASCADE;

--
-- Constraints for table `servicos`
--
ALTER TABLE `servicos`
  ADD CONSTRAINT `servicos_ibfk_1` FOREIGN KEY (`id_barbearia`) REFERENCES `barbearias` (`id_barbearia`) ON DELETE CASCADE;

--
-- Constraints for table `sessoes_bot`
--
ALTER TABLE `sessoes_bot`
  ADD CONSTRAINT `sessoes_bot_ibfk_1` FOREIGN KEY (`remoteJid`) REFERENCES `clientes` (`remoteJid`) ON DELETE CASCADE,
  ADD CONSTRAINT `sessoes_bot_ibfk_2` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE,
  ADD CONSTRAINT `sessoes_bot_ibfk_3` FOREIGN KEY (`id_barbearia`) REFERENCES `barbearias` (`id_barbearia`) ON DELETE CASCADE;

--
-- Constraints for table `usuarios_admin`
--
ALTER TABLE `usuarios_admin`
  ADD CONSTRAINT `usuarios_admin_ibfk_1` FOREIGN KEY (`id_barbearia`) REFERENCES `barbearias` (`id_barbearia`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
