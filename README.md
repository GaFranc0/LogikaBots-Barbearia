# 💈 SalonManager — Automação de Agendamentos & Dashboard Administrativo

Este projeto é uma **solução completa de automação e gestão** desenvolvida para a **Logikabots**. O ecossistema integra um **chatbot inteligente via WhatsApp** a um **painel web administrativo**, permitindo que estabelecimentos de beleza e estética operem de forma 100% autônoma no atendimento inicial e agendamento.

> [!IMPORTANT]
> **Status do Desenvolvimento:** Atualmente, a gestão de serviços e profissionais é realizada via **Dashboard Web**. O **aplicativo mobile nativo** já está em fase de desenvolvimento para oferecer ainda mais mobilidade e notificações em tempo real aos proprietários.

---

## 🎮 Demonstração Online

Você pode testar a interface do Dashboard Administrativo através do link abaixo:

👉 **[Acessar SalonManager Demo](https://gafranc0.github.io/LogikaBots-Barbearia/Tela%20Admin)**

**Credenciais de Acesso:**
* **Usuário:** `joao`
* **Senha:** `456`

---

## 🛠️ Stack Tecnológica

A arquitetura foi desenhada para ser **escalável e robusta**, utilizando as melhores tecnologias do mercado:

* **Interface Web (Dashboard):** Construída com **HTML5, CSS3, JavaScript (ES6+)** e **Tailwind CSS** para garantir uma interface **Mobile First** e ultra-responsiva.
* **Engine Conversacional:** [Typebot](https://typebot.io/) para a criação de fluxos de atendimento **humanizados e dinâmicos**.
* **Orquestração & Backend:** [n8n](https://n8n.io/) como o "cérebro" da operação, processando lógicas complexas e integrações de APIs.
* **Mensageria Profissional:** [Evolution API](https://evolution-api.com/) para uma conexão estável e segura com a **API do WhatsApp**.
* **Banco de Dados:** **MySQL** para armazenamento persistente de dados, garantindo **integridade e segurança** das informações.
* **Infraestrutura:** Servidor **VPS dedicado**, configurado para manter todo o ecossistema com **disponibilidade 24/7**.

---

## 🚀 O que a Solução Resolve?

### 🤖 Automação de Agendamentos (O Bot)
O chatbot atua como uma **secretária virtual 24h**. O cliente pode consultar serviços (corte, manicure, coloração, tratamentos, etc.), escolher o **profissional** e verificar horários disponíveis sem qualquer intervenção humana. Todo o processo é validado em **tempo real** contra o banco de dados.

### 📊 Gestão do Proprietário (O Dashboard)
O painel administrativo oferece **controle total** sobre a operação com foco em gestão baseada em dados:
* **Visualização em Tempo Real:** Tela dedicada para acompanhar agendamentos filtrados por **Hoje, Amanhã e Semana**.
* **Previsão de Faturamento:** Cálculo automático de **estimativa de caixa diário**, permitindo que o gestor saiba exatamente o valor projetado (ex: R$ 1.000,00 previstos para o dia atual).
* **Configuração Dinâmica:** Edição imediata de horários, serviços e valores que refletem no bot instantaneamente.
* **Gestão de Equipe:** Cadastro e gerenciamento de profissionais e suas agendas individuais.

---

## 📐 Arquitetura de Comunicação

O diagrama abaixo detalha o fluxo de dados entre as ferramentas hospedadas na VPS:

```mermaid
graph TD
    subgraph "Infraestrutura VPS"
        G[VPS Hosting]
    end
    
    subgraph "Serviços Hospedados"
        B(Evolution API)
        C{n8n - Workflow}
        D[Typebot]
        E[(MySQL Database)]
    end
    
    A[WhatsApp Cliente] <--> B
    B <--> C
    C <--> D
    C <--> E
    E <--> F[Dashboard Web]
    
    %% Conexões da VPS
    G --> B
    G --> C
    G --> D
    G --> E
```
## 📊 Fluxos de Automação (Visualização n8n)
#### ⚠️ Aviso de Propriedade Intelectual: As capturas de tela a seguir representam a estrutura dos fluxos no n8n. Por questões de segurança e proteção do projeto, os fluxos completos não foram disponibilizados na versão atualizada deste repositório.

| PROCESSO | DESCRIÇÃO TÉCNICA | PREVIEW |
| :--- | :---: | ---: |
| **Entrada de mensagem** | Triagem inteligente e direcionamento de fluxos via Webhooks. | <img src="img/Entrada-n8n.PNG" width="250"> |
| **Cadastro de Leads** | Verificação de existência e registro automático no **MySQL**. | <img src="img/Cadastro-n8n.PNG" width="250"> |
| **Gestão de Agenda** | Lógica de consulta (SELECT) e cancelamento (UPDATE) de horários. | <img src="img/GestaoAgendamentos-n8n.PNG" width="250"> |
| **Agendamento** | Processamento de transações e escrita no banco de dados. | <img src="img/Agendamentos-n8n.PNG" width="250"> |

## 🗂️ Estrutura do Repositório
```text
├── /Tela Admin/               # Painel administrativo do salão
│   ├── CSS/                   # Arquivos .css
│   ├── DataBase/              # Arquivos Backend
│   └── JavaScript/            # Front End
|   └── All HTML               
├── /Banco de dados/           # Schema MySQL
├── /img/                      # Galeria de capturas de tela e fluxos
├── .glitnore                  
└── README.md
```

## 💡 Diferenciais Técnicos deste Projeto
- **Sincronização em Tempo Real:** Alterações no Dashboard impactam o fluxo do Bot sem necessidade de reiniciar serviços.

- **Segurança:** Implementação de variáveis de ambiente para proteção de credenciais da API e Banco de Dados.

- **Robustez:** Tratamento de erros no n8n para evitar travamentos em respostas inesperadas do usuário.

## 🎯 Status do Projeto
✅ Dashboard Web - Concluído - Versão 1.2.0

✅ Fluxos n8n - Concluídos - Versão 1.2.0

✅ Banco de Dados - Concluído - Versão 1.2.0

✅ Tela de Relatório - Concluído - Versão 1.1.1

⚠️ App Mobile - Em desenvolvimento

🔧 Integrações - Em operação contínua

Última atualização: Setembro 2026

## 👤 Contato

### Projeto desenvolvido por:

**Gabriel Franco**
* Email: gafranco.contato@gmail.com
* Linkedin: https://www.linkedin.com/in/gabriel-franc0

**Lucas Granusso**
* Email: lucasgranuss@gmail.com
* Linkedin: https://www.linkedin.com/in/lucas-granusso/
* GitHub: https://github.com/lucasgranusso
