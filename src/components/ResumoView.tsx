import React, { useState, useMemo, useEffect } from "react";
import { StudyState, Edital, ResumoExecutivoData, CargoResumoExecutivo, VagasLocalidadeItem } from "../types";
import { 
  FileText, Calendar, Award, CheckCircle2, Search, Filter, Clock, 
  MapPin, Shield, ChevronRight, Building2, DollarSign,
  ExternalLink, GraduationCap, Check, Users, FileCheck, Briefcase, ListChecks, Sparkles
} from "lucide-react";
import EditalScanModal from "./EditalScanModal";

interface ResumoViewProps {
  state: StudyState;
  updateState: (newState: StudyState) => void;
  darkMode: boolean;
}

// ---------------------------------------------------------------------------
// DATA FALLBACK CATALOG (Concurso Dataprev 2026 - 13 Perfis + Edital Generico)
// ---------------------------------------------------------------------------
function vagasRow(localidade: string, aI: number, pI: number, ppI: number, piI: number, pqI: number, aR: number, pR: number, ppR: number, piR: number, pqR: number): VagasLocalidadeItem {
  const totI = aI + pI + ppI + piI + pqI;
  const totR = aR + pR + ppR + piR + pqR;
  return {
    localidade,
    vagasImediatas: { ampla: aI, pcd: pI, negros: ppI, indigenas: piI, quilombolas: pqI, subtotal: totI },
    cadastroReserva: { ampla: aR, pcd: pR, negros: ppR, indigenas: piR, quilombolas: pqR, subtotal: totR },
    totalGeral: totI + totR
  };
}

const FALLBACK_GERAIS = [
  { materia: "Língua Portuguesa", topicos: ["Compreensão e interpretação de textos de gêneros variados", "Reconhecimento de tipos e gêneros textuais", "Ortografia oficial e acentuação gráfica", "Mecanismos de coesão textual (referenciação, substituição, repetição, conectores)", "Emprego de tempos e modos verbais", "Estrutura morfossintática do período (classes de palavras, coordenação, subordinação)", "Pontuação, regência verbal/nominal e crase", "Colocação pronominal", "Reescrita de frases e parágrafos (significação de palavras, níveis de formalidade)"] },
  { materia: "Língua Inglesa", topicos: ["Compreensão de textos em língua inglesa e vocabulário técnico", "Itens gramaticais relevantes para o entendimento de sentidos do texto"] },
  { materia: "Raciocínio Lógico Matemático", topicos: ["Estruturas lógicas e lógica de argumentação (analogias, inferências, deduções)", "Lógica sentencial/proposicional (tabelas-verdade, equivalências, diagramas lógicos)", "Lógica de primeira ordem", "Problemas aritméticos, geométricos e matriciais"] },
  { materia: "Atualidades e Inteligência Artificial", topicos: ["Tópicos atuais de segurança, economia, sociedade, saúde, cultura e tecnologia", "Inteligência Artificial: fundamentos, aprendizado de máquina, modelos generativos e LLMs", "Ética, governança e privacidade em IA"] },
  { materia: "Legislação de Segurança da Informação e Proteção de Dados", topicos: ["Lei nº 12.527/2011 (LAI - Lei de Acesso à Informação, Dec. 7.724 e 7.845)", "Lei nº 12.737/2012 (Delitos Informáticos)", "Lei nº 12.965/2014 (Marco Civil da Internet)", "Lei nº 13.709/2018 (LGPD - Lei Geral de Proteção de Dados Pessoais)"] }
];

const FULL_CATALOG_CARGOS: CargoResumoExecutivo[] = [
  {
    cargoName: "Análise de Negócios de TI",
    grupo: "Analista de Tecnologia da Informação",
    visaoGeral: {
      orgao: "DATAPREV S/A",
      banca: "FGV",
      cargoAnalisado: "Analista de TI - Análise de Negócios de TI",
      escolaridadeRequisitos: "Graduação em Tecnologia da Informação; ou qualquer graduação + pós-graduação (mín. 360h) em TI reconhecida pelo MEC.",
      cargaHoraria: "40h semanais",
      remuneracaoInicial: "R$ 10.685,44 (Salário nominal R$ 9.423,30 + Adicional R$ 1.262,14)"
    },
    inscricoesIsencao: {
      valorTaxa: "R$ 110,00",
      siteBanca: "https://conhecimento.fgv.br/concursos/dataprev26",
      regrasIsencao: "Exclusiva para inscritos no CadÚnico (Decreto nº 6.593/2008) e doadores de medula óssea em entidades credenciadas pelo Ministério da Saúde (Lei nº 13.656/2018)."
    },
    vagasCR: {
      vagasAmpla: "3 vagas imediatas",
      vagasReservadas: "2 vagas reservadas (PCD / Pretos / Pardos / Indígenas)",
      vagasCR: "72 vagas em Cadastro de Reserva",
      totalConvocaveis: "77 convocáveis totais"
    },
    vagasPorLocalidade: [
      vagasRow("Brasília/DF", 3, 1, 1, 0, 0, 32, 2, 13, 2, 1),
      vagasRow("Rio de Janeiro/RJ", 0, 0, 0, 0, 0, 6, 1, 2, 0, 0),
      vagasRow("São Paulo/SP", 0, 0, 0, 0, 0, 6, 1, 2, 0, 0),
      vagasRow("Fortaleza/CE", 0, 0, 0, 0, 0, 6, 1, 2, 0, 0),
      vagasRow("João Pessoa/PB", 0, 0, 0, 0, 0, 6, 1, 2, 0, 0),
      vagasRow("Natal/RN", 0, 0, 0, 0, 0, 6, 1, 2, 0, 0),
      vagasRow("Florianópolis/SC", 0, 0, 0, 0, 0, 6, 1, 2, 0, 0)
    ],
    atribuicoes: {
      sumaria: "Análise de oportunidades de negócio, modelagem de soluções tecnológicas, gestão do portfólio de soluções, negociação, planejamento de demanda do cliente, gestão comercial do relacionamento e aferição de faturamento.",
      tarefas: [
        "Modelar soluções tecnológicas tendo como escopo as oportunidades de negócio mapeadas e a estratégia da Empresa.",
        "Elaborar propostas de manutenção de negócios para subsidiar a área comercial.",
        "Revisar os desenhos de solução, modelos de negócio e preços de produtos e serviços existentes.",
        "Manter o Portfólio de soluções da Dataprev atualizado.",
        "Promover o relacionamento institucional e comercial junto aos clientes, utilizando o portfólio de soluções."
      ]
    },
    remuneraDetalhada: {
      salarioNominal: "R$ 9.423,30",
      adicionalAtividade: "R$ 1.262,14",
      totalInicial: "R$ 10.685,44",
      cargaHoraria: "40 horas semanais",
      beneficios: [
        "Ticket alimentação/refeição: R$ 1.357,20/mês",
        "Auxílio pré-escolar/escolar: até R$ 1.758,35/mês",
        "Auxílio tratamento especializado (filhos PcD): até R$ 1.230,00",
        "Seguro de vida em grupo e Assistência à saúde",
        "Previdência complementar (Prevdata) e PLR"
      ]
    },
    provaObjetiva: {
      dataHorarioTurno: "11/10/2026 - Das 13h às 17h (Turno da Tarde)",
      estruturaQuestoes: "70 questões de múltipla escolha com 5 alternativas (A, B, C, D, E)",
      penalidadeErro: "Sem desconto por erro (cada acerto pontua integralmente)",
      distribuicaoDisciplinas: [
        { disciplinaOuBloco: "Módulo I: Língua Portuguesa", numQuestoes: "12", peso: "1", pontuacaoMaxima: "12", notaMinimaOuCorte: "Não zerar" },
        { disciplinaOuBloco: "Módulo I: Língua Inglesa", numQuestoes: "12", peso: "1", pontuacaoMaxima: "12", notaMinimaOuCorte: "Não zerar" },
        { disciplinaOuBloco: "Módulo I: Raciocínio Lógico Matemático", numQuestoes: "5", peso: "1", pontuacaoMaxima: "5", notaMinimaOuCorte: "Não zerar" },
        { disciplinaOuBloco: "Módulo I: Atualidades e IA", numQuestoes: "6", peso: "1", pontuacaoMaxima: "6", notaMinimaOuCorte: "Não zerar" },
        { disciplinaOuBloco: "Módulo I: Legislação & LGPD", numQuestoes: "5", peso: "1", pontuacaoMaxima: "5", notaMinimaOuCorte: "Não zerar" },
        { disciplinaOuBloco: "Módulo II: Conhecimentos Específicos", numQuestoes: "30", peso: "2.5", pontuacaoMaxima: "75", notaMinimaOuCorte: "Mínimo 50% na prova total" }
      ],
      criteriosEliminacao: "Nota mínima total de 57,5 pontos (50% de 115) e não zerar nenhuma disciplina do Módulo I."
    },
    provaDiscursiva: {
      temDiscursiva: false,
      formato: "Não haverá prova discursiva para este cargo.",
      extensao: "N/A",
      numDiscursivasCorrigidas: "N/A",
      criteriosPontuacao: "N/A",
      notaMinimaAprovacao: "N/A"
    },
    etapasDesempate: {
      outrasEtapas: "Avaliação de títulos para os candidatos convocados (apenas caráter classificatório).",
      criteriosDesempate: [
        "Idade igual ou superior a 60 anos completos até o último dia de inscrição.",
        "Maior nota obtida na prova de Conhecimentos Específicos.",
        "Maior nota obtida na disciplina de Língua Portuguesa.",
        "Maior nota obtida na disciplina de Língua Inglesa.",
        "Exercício efetivo da função de Jurado.",
        "Maior idade entre os candidatos empatados."
      ]
    },
    conteudoProgramatico: {
      conhecimentosGerais: FALLBACK_GERAIS,
      conhecimentosEspecificos: [
        { materia: "Análise de Negócios e Processos", topicos: ["Análise de negócios e gestão por processos (BPM CBOK v4.0)", "Notação BPMN e automação BPMS", "Hierarquia e reengenharia de processos", "Gestão Ágil de Projetos (Scrum, Kanban)", "COBIT 2019 e ITIL v4"] },
        { materia: "Engenharia de Software e Arquitetura", topicos: ["Elicitação e gestão de requisitos", "UX/UI, histórias de usuário e acessibilidade", "Design Thinking, Prototipação e MVP", "Data mining e modelagem de negócios"] },
        { materia: "Arquitetura e Análise de Dados", topicos: ["Modelagem conceitual, lógica e física (relacional e NoSQL/MongoDB)", "SQL, DDL e DML", "Conceitos de BI, Data Warehouse e Data Lakes", "Dashboards interativos e ferramentas OLAP"] },
        { materia: "Negociação Comercial e Contratos", topicos: ["Comunicação assertiva e estilos de negociação", "Gestão de contratos e precificação de serviços de TI", "Big Data e Inteligência Artificial no contexto comercial"] }
      ]
    }
  },
  {
    cargoName: "Arquitetura, Engenharia e Sustentação Tecnológica",
    grupo: "Analista de Tecnologia da Informação",
    visaoGeral: {
      orgao: "DATAPREV S/A",
      banca: "FGV",
      cargoAnalisado: "Analista de TI - Arquitetura, Engenharia e Sustentação",
      escolaridadeRequisitos: "Graduação em TI, Eng. Computação, Eng. Elétrica, Eletrônica, Redes ou Telecomunicações + Pós-graduação (mín. 360h) em TI.",
      cargaHoraria: "40h semanais",
      remuneracaoInicial: "R$ 10.685,44 (Salário nominal R$ 9.423,30 + Adicional R$ 1.262,14)"
    },
    inscricoesIsencao: {
      valorTaxa: "R$ 110,00",
      siteBanca: "https://conhecimento.fgv.br/concursos/dataprev26",
      regrasIsencao: "Exclusiva para CadÚnico e doadores de medula óssea credenciados."
    },
    vagasCR: {
      vagasAmpla: "18 vagas imediatas",
      vagasReservadas: "12 vagas reservadas",
      vagasCR: "116 vagas em Cadastro de Reserva",
      totalConvocaveis: "146 convocáveis totais"
    },
    vagasPorLocalidade: [
      vagasRow("Brasília/DF", 6, 1, 3, 0, 0, 32, 2, 12, 2, 1),
      vagasRow("Rio de Janeiro/RJ", 6, 1, 3, 0, 0, 32, 2, 12, 2, 1),
      vagasRow("São Paulo/SP", 6, 1, 3, 0, 0, 32, 2, 12, 2, 1),
      vagasRow("Fortaleza/CE", 0, 0, 0, 0, 0, 5, 1, 3, 0, 0),
      vagasRow("João Pessoa/PB", 0, 0, 0, 0, 0, 5, 1, 3, 0, 0),
      vagasRow("Natal/RN", 0, 0, 0, 0, 0, 5, 1, 3, 0, 0),
      vagasRow("Florianópolis/SC", 0, 0, 0, 0, 0, 5, 1, 3, 0, 0)
    ],
    atribuicoes: {
      sumaria: "Arquitetura/engenharia de solução, ciclo de vida de tecnologia, prospecção tecnológica, infraestrutura de TIC, computação em nuvem e suporte técnico de Data Center.",
      tarefas: [
        "Acompanhar e monitorar disponibilidade e desempenho de rede e Data Center.",
        "Administrar infraestrutura virtualizada VMware, Kubernetes e Docker.",
        "Operar ferramentas de backup, restauração e observabilidade de serviços de TIC."
      ]
    },
    remuneraDetalhada: {
      salarioNominal: "R$ 9.423,30",
      adicionalAtividade: "R$ 1.262,14",
      totalInicial: "R$ 10.685,44",
      cargaHoraria: "40 horas semanais",
      beneficios: ["Ticket refeição R$ 1.357,20", "Auxílio creche R$ 1.758,35", "Prevdata", "PLR"]
    },
    provaObjetiva: {
      dataHorarioTurno: "11/10/2026 - Das 13h às 17h",
      estruturaQuestoes: "70 questões de múltipla escolha (A, B, C, D, E)",
      penalidadeErro: "Sem desconto por erro",
      distribuicaoDisciplinas: [
        { disciplinaOuBloco: "Módulo I: Conhecimentos Gerais", numQuestoes: "40", peso: "1", pontuacaoMaxima: "40", notaMinimaOuCorte: "Não zerar" },
        { disciplinaOuBloco: "Módulo II: Conhecimentos Específicos", numQuestoes: "30", peso: "2.5", pontuacaoMaxima: "75", notaMinimaOuCorte: "Mín. 57.5 pontos no total" }
      ],
      criteriosEliminacao: "Aprovação com 50% de acertos totais e não zerar qualquer disciplina do Módulo I."
    },
    provaDiscursiva: { temDiscursiva: false, formato: "Não haverá prova discursiva.", extensao: "N/A", numDiscursivasCorrigidas: "N/A", criteriosPontuacao: "N/A", notaMinimaAprovacao: "N/A" },
    etapasDesempate: { outrasEtapas: "Prova de títulos classificatória.", criteriosDesempate: ["Idade >= 60", "Nota em Conhecimentos Específicos", "Nota em Português", "Maior Idade"] },
    conteudoProgramatico: {
      conhecimentosGerais: FALLBACK_GERAIS,
      conhecimentosEspecificos: [
        { materia: "Redes de Computadores", topicos: ["Modelo OSI e Arquitetura TCP/IP (IPv4, IPv6, BGP, OSPF)", "Switches, Roteadores, VLANs e Cabeamento Estruturado", "Padrões IEEE 802.11 e Protocolos DNS, DHCP, HTTP/HTTPS, SSH"] },
        { materia: "Bancos de Dados & Big Data", topicos: ["Oracle 19c, PostgreSQL, MySQL e MongoDB", "SQL ANSI, Backup/Recovery e tuning de consultas", "Hadoop, Spark e Data Lakes"] },
        { materia: "Computação em Nuvem & Virtualização", topicos: ["VMware (vSphere, vCenter, NSX), KVM e Docker/Kubernetes", "Infraestrutura como Código (Terraform, Ansible)", "Nuvem pública AWS, Azure e GCP"] }
      ]
    }
  },
  {
    cargoName: "Desenvolvimento de Software",
    grupo: "Analista de Tecnologia da Informação",
    visaoGeral: {
      orgao: "DATAPREV S/A",
      banca: "FGV",
      cargoAnalisado: "Analista de TI - Desenvolvimento de Software",
      escolaridadeRequisitos: "Graduação em TI; ou qualquer graduação + pós-graduação (mín. 360h) em TI.",
      cargaHoraria: "40h semanais",
      remuneracaoInicial: "R$ 10.685,44 (Salário nominal R$ 9.423,30 + Adicional R$ 1.262,14)"
    },
    inscricoesIsencao: { valorTaxa: "R$ 110,00", siteBanca: "https://conhecimento.fgv.br/concursos/dataprev26", regrasIsencao: "CadÚnico e doadores de medula." },
    vagasCR: {
      vagasAmpla: "52 vagas imediatas",
      vagasReservadas: "28 vagas reservadas",
      vagasCR: "241 vagas em Cadastro de Reserva",
      totalConvocaveis: "321 convocáveis totais"
    },
    vagasPorLocalidade: [
      vagasRow("Fortaleza/CE", 13, 1, 5, 1, 0, 52, 4, 20, 2, 2),
      vagasRow("João Pessoa/PB", 13, 1, 5, 1, 0, 52, 4, 20, 2, 2),
      vagasRow("Natal/RN", 13, 1, 5, 1, 0, 52, 4, 20, 2, 2),
      vagasRow("Florianópolis/SC", 13, 1, 5, 1, 0, 52, 4, 20, 2, 2),
      vagasRow("Brasília/DF", 0, 0, 0, 0, 0, 11, 1, 4, 1, 0),
      vagasRow("Rio de Janeiro/RJ", 0, 0, 0, 0, 0, 11, 1, 4, 1, 0),
      vagasRow("São Paulo/SP", 0, 0, 0, 0, 0, 11, 1, 4, 1, 0)
    ],
    atribuicoes: {
      sumaria: "Codificação de software transacional, analítico e APIs, testes automatizados, CI/CD, arquitetura de microsserviços e desenvolvimento seguro.",
      tarefas: ["Codificar softwares em Java/Spring Boot e React/Angular.", "Implementar testes unitários e de integração.", "Automatizar esteiras DevOps (GitLab CI, SonarQube)."]
    },
    remuneraDetalhada: { salarioNominal: "R$ 9.423,30", adicionalAtividade: "R$ 1.262,14", totalInicial: "R$ 10.685,44", cargaHoraria: "40 horas semanais", beneficios: ["Ticket R$ 1.357,20", "Auxílio creche R$ 1.758,35"] },
    provaObjetiva: { dataHorarioTurno: "11/10/2026 - 13h às 17h", estruturaQuestoes: "70 questões (5 alternativas)", penalidadeErro: "Sem desconto", distribuicaoDisciplinas: [{ disciplinaOuBloco: "Módulo I: Gerais", numQuestoes: "40", peso: "1", pontuacaoMaxima: "40", notaMinimaOuCorte: "Não zerar" }, { disciplinaOuBloco: "Módulo II: Específicos", numQuestoes: "30", peso: "2.5", pontuacaoMaxima: "75", notaMinimaOuCorte: "50%" }], criteriosEliminacao: "Mínimo 57.5 pontos totais." },
    provaDiscursiva: { temDiscursiva: false, formato: "Não haverá prova discursiva.", extensao: "N/A", numDiscursivasCorrigidas: "N/A", criteriosPontuacao: "N/A", notaMinimaAprovacao: "N/A" },
    etapasDesempate: { outrasEtapas: "Títulos", criteriosDesempate: ["Idade >= 60", "Nota em Específicos"] },
    conteudoProgramatico: {
      conhecimentosGerais: FALLBACK_GERAIS,
      conhecimentosEspecificos: [
        { materia: "Linguagens & Frameworks", topicos: ["Java 17+, Jakarta EE, Spring Boot e Spring Cloud", "TypeScript, React.js, Vue.js e HTML5/CSS3", "REST APIs, GraphQL, Swagger/OpenAPI e Mensageria (Kafka, RabbitMQ)"] },
        { materia: "DevOps & Arquitetura", topicos: ["Git, GitLab CI/CD, Docker e Kubernetes", "Clean Code, Design Patterns (GoF) e Arquitetura Hexagonal", "SonarQube, OWASP Top 10 e DevSecOps"] },
        { materia: "Testes & Qualidade", topicos: ["JUnit 5, Mockito, Cypress e Selenium", "TDD e BDD (Cucumber)", "Métricas de código e cobertura"] }
      ]
    }
  },
  {
    cargoName: "Inteligência da Informação",
    grupo: "Analista de Tecnologia da Informação",
    visaoGeral: { orgao: "DATAPREV S/A", banca: "FGV", cargoAnalisado: "Analista de TI - Inteligência da Informação", escolaridadeRequisitos: "Graduação em Estatística, Ciências Atuárias, Ciência de Dados, IA ou pós na área.", cargaHoraria: "40h semanais", remuneracaoInicial: "R$ 10.685,44" },
    inscricoesIsencao: { valorTaxa: "R$ 110,00", siteBanca: "https://conhecimento.fgv.br/concursos/dataprev26", regrasIsencao: "CadÚnico e doadores de medula." },
    vagasCR: { vagasAmpla: "15 vagas imediatas", vagasReservadas: "10 vagas reservadas", vagasCR: "118 vagas em CR", totalConvocaveis: "143 convocáveis" },
    vagasPorLocalidade: [
      vagasRow("Brasília/DF", 3, 1, 1, 0, 0, 15, 1, 6, 1, 1),
      vagasRow("Rio de Janeiro/RJ", 0, 0, 0, 0, 0, 15, 2, 6, 1, 1),
      vagasRow("Fortaleza/CE", 6, 1, 3, 0, 0, 32, 2, 12, 2, 1)
    ],
    atribuicoes: { sumaria: "Análise de dados, ciência de dados, modelos preditivos, machine learning e estatística aplicada à Seguridade Social.", tarefas: ["Construir modelos de Machine Learning em Python e R.", "Elaborar algoritmos de IA sobre Big Data e Data Lakes."] },
    remuneraDetalhada: { salarioNominal: "R$ 9.423,30", adicionalAtividade: "R$ 1.262,14", totalInicial: "R$ 10.685,44", cargaHoraria: "40 horas semanais", beneficios: ["Ticket alimentação R$ 1.357,20", "Auxílio educação R$ 1.758,35"] },
    provaObjetiva: { dataHorarioTurno: "11/10/2026 - 13h às 17h", estruturaQuestoes: "70 questões", penalidadeErro: "Sem desconto", distribuicaoDisciplinas: [{ disciplinaOuBloco: "Gerais", numQuestoes: "40", peso: "1", pontuacaoMaxima: "40", notaMinimaOuCorte: "Não zerar" }, { disciplinaOuBloco: "Específicos", numQuestoes: "30", peso: "2.5", pontuacaoMaxima: "75", notaMinimaOuCorte: "50%" }], criteriosEliminacao: "Mínimo 57.5 pontos totais." },
    provaDiscursiva: { temDiscursiva: false, formato: "Não haverá prova discursiva.", extensao: "N/A", numDiscursivasCorrigidas: "N/A", criteriosPontuacao: "N/A", notaMinimaAprovacao: "N/A" },
    etapasDesempate: { outrasEtapas: "Títulos", criteriosDesempate: ["Idade >= 60", "Nota em Específicos"] },
    conteudoProgramatico: {
      conhecimentosGerais: FALLBACK_GERAIS,
      conhecimentosEspecificos: [
        { materia: "Estatística e Matemática", topicos: ["Probabilidade, Distribuições e Testes de Hipótese", "Álgebra Linear, Matrizes e Cálculo Diferencial/Integral"] },
        { materia: "Machine Learning & Python/R", topicos: ["Algoritmos Supervisionados (Regressão, Random Forest, XGBoost)", "Deep Learning, Redes Neurais e PLN", "Pandas, Scikit-learn, TensorFlow e PyTorch"] }
      ]
    }
  },
  {
    cargoName: "Segurança Cibernética e Proteção de Dados",
    grupo: "Analista de Tecnologia da Informação",
    visaoGeral: { orgao: "DATAPREV S/A", banca: "FGV", cargoAnalisado: "Analista de TI - Segurança Cibernética", escolaridadeRequisitos: "Graduação em TI, Segurança, Engenharia de Redes ou Pós-graduação na área.", cargaHoraria: "40h semanais", remuneracaoInicial: "R$ 10.685,44" },
    inscricoesIsencao: { valorTaxa: "R$ 110,00", siteBanca: "https://conhecimento.fgv.br/concursos/dataprev26", regrasIsencao: "CadÚnico e doadores de medula." },
    vagasCR: { vagasAmpla: "10 vagas imediatas", vagasReservadas: "5 vagas reservadas", vagasCR: "51 vagas em CR", totalConvocaveis: "66 convocáveis" },
    vagasPorLocalidade: [
      vagasRow("Brasília/DF", 3, 1, 1, 0, 0, 12, 1, 5, 1, 1),
      vagasRow("Rio de Janeiro/RJ", 3, 1, 1, 0, 0, 12, 1, 5, 1, 1),
      vagasRow("São Paulo/SP", 3, 1, 1, 0, 0, 12, 1, 5, 1, 1)
    ],
    atribuicoes: { sumaria: "Gestão do SOC, pentest, forense computacional, resposta a incidentes, normas ISO 27001/27002 e LGPD.", tarefas: ["Conduzir análises de vulnerabilidade e testes de invasão.", "Gerenciar incidentes cibernéticos no SOC."] },
    remuneraDetalhada: { salarioNominal: "R$ 9.423,30", adicionalAtividade: "R$ 1.262,14", totalInicial: "R$ 10.685,44", cargaHoraria: "40 horas semanais", beneficios: ["Ticket R$ 1.357,20", "Prevdata", "PLR"] },
    provaObjetiva: { dataHorarioTurno: "11/10/2026 - 13h às 17h", estruturaQuestoes: "70 questões", penalidadeErro: "Sem desconto", distribuicaoDisciplinas: [{ disciplinaOuBloco: "Gerais", numQuestoes: "40", peso: "1", pontuacaoMaxima: "40", notaMinimaOuCorte: "Não zerar" }, { disciplinaOuBloco: "Específicos", numQuestoes: "30", peso: "2.5", pontuacaoMaxima: "75", notaMinimaOuCorte: "50%" }], criteriosEliminacao: "Mínimo 57.5 pontos." },
    provaDiscursiva: { temDiscursiva: false, formato: "Não haverá prova discursiva.", extensao: "N/A", numDiscursivasCorrigidas: "N/A", criteriosPontuacao: "N/A", notaMinimaAprovacao: "N/A" },
    etapasDesempate: { outrasEtapas: "Títulos", criteriosDesempate: ["Idade >= 60", "Nota em Específicos"] },
    conteudoProgramatico: {
      conhecimentosGerais: FALLBACK_GERAIS,
      conhecimentosEspecificos: [
        { materia: "Segurança Operacional & SOC", topicos: ["SIEM, EDR, WAF, Firewalls e VPNs", "Pentest, OWASP Top 10 e Metasploit/Burp Suite", "ISO 27001:2022, ISO 27002 e NIST Framework"] }
      ]
    }
  },
  {
    cargoName: "Gestão de Serviços de TIC",
    grupo: "Analista de Tecnologia da Informação",
    visaoGeral: { orgao: "DATAPREV S/A", banca: "FGV", cargoAnalisado: "Analista de TI - Gestão de Serviços", escolaridadeRequisitos: "Graduação em TI, Engenharia, Administração ou Tecnólogo em TI.", cargaHoraria: "40h semanais", remuneracaoInicial: "R$ 10.685,44" },
    inscricoesIsencao: { valorTaxa: "R$ 110,00", siteBanca: "https://conhecimento.fgv.br/concursos/dataprev26", regrasIsencao: "CadÚnico e doadores de medula." },
    vagasCR: { vagasAmpla: "23 vagas imediatas", vagasReservadas: "12 vagas reservadas", vagasCR: "104 vagas em CR", totalConvocaveis: "139 convocáveis" },
    vagasPorLocalidade: [
      vagasRow("Brasília/DF", 3, 1, 1, 0, 0, 28, 2, 11, 2, 1),
      vagasRow("Rio de Janeiro/RJ", 10, 1, 4, 0, 0, 38, 3, 15, 2, 2),
      vagasRow("São Paulo/SP", 10, 1, 4, 0, 0, 38, 3, 15, 2, 2)
    ],
    atribuicoes: { sumaria: "Governança ITIL v4, SLAs, gestão de fornecedores, disponibilidade e continuidade de serviços.", tarefas: ["Gerenciar catálogo de serviços e incidentes.", "Supervisionar SLAs contratuais."] },
    remuneraDetalhada: { salarioNominal: "R$ 9.423,30", adicionalAtividade: "R$ 1.262,14", totalInicial: "R$ 10.685,44", cargaHoraria: "40 horas semanais", beneficios: ["Ticket R$ 1.357,20", "Prevdata"] },
    provaObjetiva: { dataHorarioTurno: "11/10/2026 - 13h às 17h", estruturaQuestoes: "70 questões", penalidadeErro: "Sem desconto", distribuicaoDisciplinas: [{ disciplinaOuBloco: "Gerais", numQuestoes: "40", peso: "1", pontuacaoMaxima: "40", notaMinimaOuCorte: "Não zerar" }, { disciplinaOuBloco: "Específicos", numQuestoes: "30", peso: "2.5", pontuacaoMaxima: "75", notaMinimaOuCorte: "50%" }], criteriosEliminacao: "Mínimo 57.5 pontos." },
    provaDiscursiva: { temDiscursiva: false, formato: "Não haverá prova discursiva.", extensao: "N/A", numDiscursivasCorrigidas: "N/A", criteriosPontuacao: "N/A", notaMinimaAprovacao: "N/A" },
    etapasDesempate: { outrasEtapas: "Títulos", criteriosDesempate: ["Idade >= 60", "Nota em Específicos"] },
    conteudoProgramatico: {
      conhecimentosGerais: FALLBACK_GERAIS,
      conhecimentosEspecificos: [{ materia: "Governança & ITIL", topicos: ["ITIL v4, COBIT 2019, ISO 20.000", "BPMN, Gestão de SLAs e IN SGD nº 1/2019"] }]
    }
  },
  {
    cargoName: "Advocacia",
    grupo: "Analista de Tecnologia da Informação",
    visaoGeral: { orgao: "DATAPREV S/A", banca: "FGV", cargoAnalisado: "Analista de TI - Advocacia", escolaridadeRequisitos: "Graduação em Direito reconhecida pelo MEC e inscrição na OAB.", cargaHoraria: "40h semanais", remuneracaoInicial: "R$ 10.685,44" },
    inscricoesIsencao: { valorTaxa: "R$ 110,00", siteBanca: "https://conhecimento.fgv.br/concursos/dataprev26", regrasIsencao: "CadÚnico e doadores de medula." },
    vagasCR: { vagasAmpla: "0 vagas imediatas", vagasReservadas: "0 vagas", vagasCR: "33 vagas em CR", totalConvocaveis: "33 convocáveis" },
    vagasPorLocalidade: [
      vagasRow("Brasília/DF", 0, 0, 0, 0, 0, 18, 2, 7, 1, 1),
      vagasRow("Rio de Janeiro/RJ", 0, 0, 0, 0, 0, 15, 2, 6, 1, 1)
    ],
    atribuicoes: { sumaria: "Assessoria jurídica, pareceres, contencioso judicial/extrajudicial e Direito Digital.", tarefas: ["Elaborar peças processuais e pareceres em licitações da Lei 13.303/2016."] },
    remuneraDetalhada: { salarioNominal: "R$ 9.423,30", adicionalAtividade: "R$ 1.262,14", totalInicial: "R$ 10.685,44", cargaHoraria: "40 horas semanais", beneficios: ["Ticket R$ 1.357,20", "Auxílio creche"] },
    provaObjetiva: { dataHorarioTurno: "11/10/2026 - 13h às 17h", estruturaQuestoes: "70 questões", penalidadeErro: "Sem desconto", distribuicaoDisciplinas: [{ disciplinaOuBloco: "Gerais", numQuestoes: "40", peso: "1", pontuacaoMaxima: "40", notaMinimaOuCorte: "Não zerar" }, { disciplinaOuBloco: "Específicos", numQuestoes: "30", peso: "2.5", pontuacaoMaxima: "75", notaMinimaOuCorte: "50%" }], criteriosEliminacao: "Mínimo 57.5 pontos." },
    provaDiscursiva: { temDiscursiva: false, formato: "Não haverá prova discursiva.", extensao: "N/A", numDiscursivasCorrigidas: "N/A", criteriosPontuacao: "N/A", notaMinimaAprovacao: "N/A" },
    etapasDesempate: { outrasEtapas: "Títulos", criteriosDesempate: ["Idade >= 60", "Nota em Específicos"] },
    conteudoProgramatico: {
      conhecimentosGerais: FALLBACK_GERAIS,
      conhecimentosEspecificos: [{ materia: "Direito Constitucional, Administrativo & Digital", topicos: ["Lei nº 13.303/2016 (Estatais) e Licitações", "Marco Civil da Internet e LGPD", "Direito Trabalhista e Processo Civil"] }]
    }
  },
  {
    cargoName: "Contabilidade",
    grupo: "Analista de Tecnologia da Informação",
    visaoGeral: { orgao: "DATAPREV S/A", banca: "FGV", cargoAnalisado: "Analista de TI - Contabilidade", escolaridadeRequisitos: "Graduação em Ciências Contábeis e registro no CRC.", cargaHoraria: "40h semanais", remuneracaoInicial: "R$ 10.685,44" },
    inscricoesIsencao: { valorTaxa: "R$ 110,00", siteBanca: "https://conhecimento.fgv.br/concursos/dataprev26", regrasIsencao: "CadÚnico e doadores de medula." },
    vagasCR: { vagasAmpla: "0 vagas imediatas", vagasReservadas: "0 vagas", vagasCR: "25 vagas em CR", totalConvocaveis: "25 convocáveis" },
    vagasPorLocalidade: [vagasRow("Rio de Janeiro/RJ", 0, 0, 0, 0, 0, 15, 2, 6, 1, 1)],
    atribuicoes: { sumaria: "Demonstrações contábeis, apuração tributária e conciliação bancária/societária.", tarefas: ["Elaborar DRE, Balanço Patrimonial e DFC conforme pronunciamentos do CPC."] },
    remuneraDetalhada: { salarioNominal: "R$ 9.423,30", adicionalAtividade: "R$ 1.262,14", totalInicial: "R$ 10.685,44", cargaHoraria: "40 horas semanais", beneficios: ["Ticket R$ 1.357,20"] },
    provaObjetiva: { dataHorarioTurno: "11/10/2026 - 13h às 17h", estruturaQuestoes: "70 questões", penalidadeErro: "Sem desconto", distribuicaoDisciplinas: [{ disciplinaOuBloco: "Gerais", numQuestoes: "40", peso: "1", pontuacaoMaxima: "40", notaMinimaOuCorte: "Não zerar" }, { disciplinaOuBloco: "Específicos", numQuestoes: "30", peso: "2.5", pontuacaoMaxima: "75", notaMinimaOuCorte: "50%" }], criteriosEliminacao: "Mínimo 57.5 pontos." },
    provaDiscursiva: { temDiscursiva: false, formato: "Não haverá prova discursiva.", extensao: "N/A", numDiscursivasCorrigidas: "N/A", criteriosPontuacao: "N/A", notaMinimaAprovacao: "N/A" },
    etapasDesempate: { outrasEtapas: "Títulos", criteriosDesempate: ["Idade >= 60", "Nota em Específicos"] },
    conteudoProgramatico: { conhecimentosGerais: FALLBACK_GERAIS, conhecimentosEspecificos: [{ materia: "Contabilidade Societária & CPCs", topicos: ["Pronunciamentos CPC e Lei nº 6.404/1976", "Apuração de IRPJ, CSLL e PIS/COFINS"] }] }
  },
  {
    cargoName: "Comunicação Social",
    grupo: "Analista de Tecnologia da Informação",
    visaoGeral: { orgao: "DATAPREV S/A", banca: "FGV", cargoAnalisado: "Analista de TI - Comunicação Social", escolaridadeRequisitos: "Graduação em Jornalismo, Relações Públicas, Publicidade ou Design Gráfico.", cargaHoraria: "40h semanais", remuneracaoInicial: "R$ 10.685,44" },
    inscricoesIsencao: { valorTaxa: "R$ 110,00", siteBanca: "https://conhecimento.fgv.br/concursos/dataprev26", regrasIsencao: "CadÚnico e doadores de medula." },
    vagasCR: { vagasAmpla: "0 vagas imediatas", vagasReservadas: "0 vagas", vagasCR: "18 vagas em CR", totalConvocaveis: "18 convocáveis" },
    vagasPorLocalidade: [vagasRow("Brasília/DF", 0, 0, 0, 0, 0, 5, 1, 3, 0, 0), vagasRow("Rio de Janeiro/RJ", 0, 0, 0, 0, 0, 5, 1, 3, 0, 0)],
    atribuicoes: { sumaria: "Assessoria de imprensa, endomarketing, gestão de redes sociais e design gráfico.", tarefas: ["Elaborar press releases, notícias e peças institucionais."] },
    remuneraDetalhada: { salarioNominal: "R$ 9.423,30", adicionalAtividade: "R$ 1.262,14", totalInicial: "R$ 10.685,44", cargaHoraria: "40 horas semanais", beneficios: ["Ticket R$ 1.357,20"] },
    provaObjetiva: { dataHorarioTurno: "11/10/2026 - 13h às 17h", estruturaQuestoes: "70 questões", penalidadeErro: "Sem desconto", distribuicaoDisciplinas: [{ disciplinaOuBloco: "Gerais", numQuestoes: "40", peso: "1", pontuacaoMaxima: "40", notaMinimaOuCorte: "Não zerar" }, { disciplinaOuBloco: "Específicos", numQuestoes: "30", peso: "2.5", pontuacaoMaxima: "75", notaMinimaOuCorte: "50%" }], criteriosEliminacao: "Mínimo 57.5 pontos." },
    provaDiscursiva: { temDiscursiva: false, formato: "Não haverá prova discursiva.", extensao: "N/A", numDiscursivasCorrigidas: "N/A", criteriosPontuacao: "N/A", notaMinimaAprovacao: "N/A" },
    etapasDesempate: { outrasEtapas: "Títulos", criteriosDesempate: ["Idade >= 60", "Nota em Específicos"] },
    conteudoProgramatico: { conhecimentosGerais: FALLBACK_GERAIS, conhecimentosEspecificos: [{ materia: "Comunicação Pública & Mídias Digitais", topicos: ["Jornalismo institucional, gestão de crise e redes sociais"] }] }
  },
  {
    cargoName: "Gestão Econômico-Financeira",
    grupo: "Analista de Tecnologia da Informação",
    visaoGeral: { orgao: "DATAPREV S/A", banca: "FGV", cargoAnalisado: "Analista de TI - Gestão Econômico-Financeira", escolaridadeRequisitos: "Graduação em Administração, Economia, Engenharia, Contabilidade ou Finanças.", cargaHoraria: "40h semanais", remuneracaoInicial: "R$ 10.685,44" },
    inscricoesIsencao: { valorTaxa: "R$ 110,00", siteBanca: "https://conhecimento.fgv.br/concursos/dataprev26", regrasIsencao: "CadÚnico e doadores de medula." },
    vagasCR: { vagasAmpla: "0 vagas imediatas", vagasReservadas: "0 vagas", vagasCR: "29 vagas em CR", totalConvocaveis: "29 convocáveis" },
    vagasPorLocalidade: [vagasRow("Rio de Janeiro/RJ", 0, 0, 0, 0, 0, 18, 2, 7, 1, 1)],
    atribuicoes: { sumaria: "Planejamento orçamentário, fluxo de caixa, precificação de serviços e análise de investimentos.", tarefas: ["Projetar receitas, custos e orçamento de investimentos."] },
    remuneraDetalhada: { salarioNominal: "R$ 9.423,30", adicionalAtividade: "R$ 1.262,14", totalInicial: "R$ 10.685,44", cargaHoraria: "40 horas semanais", beneficios: ["Ticket R$ 1.357,20"] },
    provaObjetiva: { dataHorarioTurno: "11/10/2026 - 13h às 17h", estruturaQuestoes: "70 questões", penalidadeErro: "Sem desconto", distribuicaoDisciplinas: [{ disciplinaOuBloco: "Gerais", numQuestoes: "40", peso: "1", pontuacaoMaxima: "40", notaMinimaOuCorte: "Não zerar" }, { disciplinaOuBloco: "Específicos", numQuestoes: "30", peso: "2.5", pontuacaoMaxima: "75", notaMinimaOuCorte: "50%" }], criteriosEliminacao: "Mínimo 57.5 pontos." },
    provaDiscursiva: { temDiscursiva: false, formato: "Não haverá prova discursiva.", extensao: "N/A", numDiscursivasCorrigidas: "N/A", criteriosPontuacao: "N/A", notaMinimaAprovacao: "N/A" },
    etapasDesempate: { outrasEtapas: "Títulos", criteriosDesempate: ["Idade >= 60", "Nota em Específicos"] },
    conteudoProgramatico: { conhecimentosGerais: FALLBACK_GERAIS, conhecimentosEspecificos: [{ materia: "Finanças Corporativas & VPL/TIR", topicos: ["Valuation, VPL, TIR, Payback e Fluxo de Caixa"] }] }
  },
  {
    cargoName: "Administração e Governança",
    grupo: "Analista de Tecnologia da Informação",
    visaoGeral: { orgao: "DATAPREV S/A", banca: "FGV", cargoAnalisado: "Analista de TI - Administração e Governança", escolaridadeRequisitos: "Graduação em Administração, Engenharia de Produção, Direito, Economia ou Pós na área.", cargaHoraria: "40h semanais", remuneracaoInicial: "R$ 10.685,44" },
    inscricoesIsencao: { valorTaxa: "R$ 110,00", siteBanca: "https://conhecimento.fgv.br/concursos/dataprev26", regrasIsencao: "CadÚnico e doadores de medula." },
    vagasCR: { vagasAmpla: "0 vagas imediatas", vagasReservadas: "0 vagas", vagasCR: "134 vagas em CR", totalConvocaveis: "134 convocáveis" },
    vagasPorLocalidade: [
      vagasRow("Brasília/DF", 0, 0, 0, 0, 0, 18, 2, 7, 1, 1),
      vagasRow("Rio de Janeiro/RJ", 0, 0, 0, 0, 0, 26, 2, 10, 1, 1),
      vagasRow("São Paulo/SP", 0, 0, 0, 0, 0, 18, 2, 7, 1, 1),
      vagasRow("Fortaleza/CE", 0, 0, 0, 0, 0, 18, 2, 7, 1, 1)
    ],
    atribuicoes: { sumaria: "Planejamento estratégico, gestão de riscos, governança corporativa e integridade.", tarefas: ["Conduzir a gestão de processos, Riscos (COSO) e Governança."] },
    remuneraDetalhada: { salarioNominal: "R$ 9.423,30", adicionalAtividade: "R$ 1.262,14", totalInicial: "R$ 10.685,44", cargaHoraria: "40 horas semanais", beneficios: ["Ticket R$ 1.357,20"] },
    provaObjetiva: { dataHorarioTurno: "11/10/2026 - 13h às 17h", estruturaQuestoes: "70 questões", penalidadeErro: "Sem desconto", distribuicaoDisciplinas: [{ disciplinaOuBloco: "Gerais", numQuestoes: "40", peso: "1", pontuacaoMaxima: "40", notaMinimaOuCorte: "Não zerar" }, { disciplinaOuBloco: "Específicos", numQuestoes: "30", peso: "2.5", pontuacaoMaxima: "75", notaMinimaOuCorte: "50%" }], criteriosEliminacao: "Mínimo 57.5 pontos." },
    provaDiscursiva: { temDiscursiva: false, formato: "Não haverá prova discursiva.", extensao: "N/A", numDiscursivasCorrigidas: "N/A", criteriosPontuacao: "N/A", notaMinimaAprovacao: "N/A" },
    etapasDesempate: { outrasEtapas: "Títulos", criteriosDesempate: ["Idade >= 60", "Nota em Específicos"] },
    conteudoProgramatico: { conhecimentosGerais: FALLBACK_GERAIS, conhecimentosEspecificos: [{ materia: "Governança Corporativa & COSO", topicos: ["Lei nº 13.303/2016, COSO ERM, Compliance e Lei 14.133/2021"] }] }
  },
  {
    cargoName: "Engenharia",
    grupo: "Analista de Tecnologia da Informação",
    visaoGeral: { orgao: "DATAPREV S/A", banca: "FGV", cargoAnalisado: "Analista de TI - Engenharia", escolaridadeRequisitos: "Graduação em Engenharia e registro no CREA.", cargaHoraria: "40h semanais", remuneracaoInicial: "R$ 10.685,44" },
    inscricoesIsencao: { valorTaxa: "R$ 110,00", siteBanca: "https://conhecimento.fgv.br/concursos/dataprev26", regrasIsencao: "CadÚnico e doadores de medula." },
    vagasCR: { vagasAmpla: "0 vagas imediatas", vagasReservadas: "0 vagas", vagasCR: "35 vagas em CR", totalConvocaveis: "35 convocáveis" },
    vagasPorLocalidade: [vagasRow("Brasília/DF", 0, 0, 0, 0, 0, 5, 1, 3, 0, 0), vagasRow("Rio de Janeiro/RJ", 0, 0, 0, 0, 0, 5, 1, 3, 0, 0)],
    atribuicoes: { sumaria: "Fiscalização de obras, manutenção predial, projetos de eficiência energética e infraestrutura crítica de Data Center.", tarefas: ["Acompanhar instalações elétricas e climatização TIER III de Data Centers."] },
    remuneraDetalhada: { salarioNominal: "R$ 9.423,30", adicionalAtividade: "R$ 1.262,14", totalInicial: "R$ 10.685,44", cargaHoraria: "40 horas semanais", beneficios: ["Ticket R$ 1.357,20"] },
    provaObjetiva: { dataHorarioTurno: "11/10/2026 - 13h às 17h", estruturaQuestoes: "70 questões", penalidadeErro: "Sem desconto", distribuicaoDisciplinas: [{ disciplinaOuBloco: "Gerais", numQuestoes: "40", peso: "1", pontuacaoMaxima: "40", notaMinimaOuCorte: "Não zerar" }, { disciplinaOuBloco: "Específicos", numQuestoes: "30", peso: "2.5", pontuacaoMaxima: "75", notaMinimaOuCorte: "50%" }], criteriosEliminacao: "Mínimo 57.5 pontos." },
    provaDiscursiva: { temDiscursiva: false, formato: "Não haverá prova discursiva.", extensao: "N/A", numDiscursivasCorrigidas: "N/A", criteriosPontuacao: "N/A", notaMinimaAprovacao: "N/A" },
    etapasDesempate: { outrasEtapas: "Títulos", criteriosDesempate: ["Idade >= 60", "Nota em Específicos"] },
    conteudoProgramatico: { conhecimentosGerais: FALLBACK_GERAIS, conhecimentosEspecificos: [{ materia: "Engenharia & Data Centers TIER", topicos: ["TIA-942-B, Climatização de Precisão, No-Breaks e Geradores"] }] }
  },
  {
    cargoName: "Analista de Processamento",
    grupo: "Analista de Processamento",
    visaoGeral: { orgao: "DATAPREV S/A", banca: "FGV", cargoAnalisado: "Analista de Processamento", escolaridadeRequisitos: "Graduação em TI ou qualquer área com pós (mín. 360h) em TI.", cargaHoraria: "30h semanais", remuneracaoInicial: "R$ 8.273,94 (Salário nominal R$ 7.011,80 + Adicional R$ 1.262,14)" },
    inscricoesIsencao: { valorTaxa: "R$ 110,00", siteBanca: "https://conhecimento.fgv.br/concursos/dataprev26", regrasIsencao: "CadÚnico e doadores de medula." },
    vagasCR: { vagasAmpla: "0 vagas imediatas", vagasReservadas: "0 vagas", vagasCR: "30 vagas em CR", totalConvocaveis: "30 convocáveis" },
    vagasPorLocalidade: [
      vagasRow("Brasília/DF", 0, 0, 0, 0, 0, 6, 1, 3, 0, 0),
      vagasRow("Rio de Janeiro/RJ", 0, 0, 0, 0, 0, 6, 1, 3, 0, 0),
      vagasRow("São Paulo/SP", 0, 0, 0, 0, 0, 6, 1, 3, 0, 0)
    ],
    atribuicoes: { sumaria: "Operação de mainframe, rotinas de produção, sustentação de Data Center, automação de jobs e segurança operacional.", tarefas: ["Operar sistemas Linux/Windows Server e batch jobs."] },
    remuneraDetalhada: { salarioNominal: "R$ 7.011,80", adicionalAtividade: "R$ 1.262,14", totalInicial: "R$ 8.273,94", cargaHoraria: "30 horas semanais", beneficios: ["Ticket R$ 1.357,20", "Prevdata", "PLR"] },
    provaObjetiva: { dataHorarioTurno: "11/10/2026 - 13h às 17h", estruturaQuestoes: "70 questões", penalidadeErro: "Sem desconto", distribuicaoDisciplinas: [{ disciplinaOuBloco: "Gerais", numQuestoes: "40", peso: "1", pontuacaoMaxima: "40", notaMinimaOuCorte: "Não zerar" }, { disciplinaOuBloco: "Específicos", numQuestoes: "30", peso: "2.5", pontuacaoMaxima: "75", notaMinimaOuCorte: "50%" }], criteriosEliminacao: "Mínimo 57.5 pontos." },
    provaDiscursiva: { temDiscursiva: false, formato: "Não haverá prova discursiva.", extensao: "N/A", numDiscursivasCorrigidas: "N/A", criteriosPontuacao: "N/A", notaMinimaAprovacao: "N/A" },
    etapasDesempate: { outrasEtapas: "Títulos", criteriosDesempate: ["Idade >= 60", "Nota em Específicos"] },
    conteudoProgramatico: { conhecimentosGerais: FALLBACK_GERAIS, conhecimentosEspecificos: [{ materia: "Sistemas Operacionais & Shell Script", topicos: ["Linux Red Hat, Windows Server, PowerShell, Docker e ITIL v4"] }] }
  }
];

// Get resumo data strictly for the active edital without leaking cargos from other contests
function getResumoData(edital: Edital): ResumoExecutivoData {
  let scannedCargos: CargoResumoExecutivo[] = [];
  if (edital.resumoExecutivo && edital.resumoExecutivo.cargos && edital.resumoExecutivo.cargos.length > 0) {
    scannedCargos = edital.resumoExecutivo.cargos;
  } else if (edital.orgao && edital.cargo) {
    // Generate a dynamic single cargo card for manual entry without leaking old DATAPREV cargos
    const dynamicCargoName = edital.cargo;
    const dynamicOrgao = edital.orgao;
    const dynamicBanca = edital.banca || "A Definir";

    scannedCargos = [
      {
        cargoName: dynamicCargoName,
        grupo: dynamicOrgao,
        visaoGeral: {
          orgao: dynamicOrgao,
          banca: dynamicBanca,
          cargoAnalisado: dynamicCargoName,
          escolaridadeRequisitos: "A consultar no edital oficial",
          cargaHoraria: "40h semanais",
          remuneracaoInicial: "A consultar no edital oficial"
        },
        inscricoesIsencao: {
          valorTaxa: "A consultar",
          siteBanca: `https://${dynamicBanca.toLowerCase().replace(/[^a-z0-9]/g, "")}.org.br`,
          regrasIsencao: "Regras de isenção conforme edital oficial"
        },
        vagasCR: {
          vagasAmpla: "A consultar",
          vagasReservadas: "A consultar",
          vagasCR: "A consultar",
          totalConvocaveis: "A consultar"
        },
        vagasPorLocalidade: [],
        atribuicoes: {
          sumaria: "Atribuições do cargo descritas no edital oficial.",
          tarefas: ["Consultar o edital oficial para atribuições detalhadas."]
        },
        remuneraDetalhada: {
          salarioNominal: "A consultar",
          adicionalAtividade: "A consultar",
          totalInicial: "A consultar",
          cargaHoraria: "40 horas semanais",
          beneficios: ["Conforme legislação do órgão"]
        },
        provaObjetiva: {
          dataHorarioTurno: "A consultar no edital",
          estruturaQuestoes: "Conforme edital",
          penalidadeErro: "Sem desconto",
          distribuicaoDisciplinas: [],
          criteriosEliminacao: "Conforme edital"
        },
        provaDiscursiva: {
          temDiscursiva: edital.discursivaInfo?.hasDiscursiva || false,
          formato: edital.discursivaInfo?.detalhes || "Conforme edital",
          extensao: "N/A",
          numDiscursivasCorrigidas: "N/A",
          criteriosPontuacao: edital.discursivaInfo?.criteriosAvaliacao || "N/A",
          notaMinimaAprovacao: "N/A"
        },
        etapasDesempate: {
          outrasEtapas: "Conforme edital",
          criteriosDesempate: ["Idade", "Pontuação nas provas"]
        },
        conteudoProgramatico: {
          conhecimentosGerais: edital.categorias.map(cat => ({
            materia: cat.nome,
            topicos: cat.disciplinas.flatMap(d => d.assuntos.map(a => a.nome))
          })),
          conhecimentosEspecificos: []
        }
      }
    ];
  } else {
    scannedCargos = edital.orgao?.toUpperCase().includes("DATAPREV") ? FULL_CATALOG_CARGOS : [];
  }

  const calendario = (edital.resumoExecutivo?.calendario && edital.resumoExecutivo.calendario.length > 0)
    ? edital.resumoExecutivo.calendario
    : [
        { evento: "Abertura das inscrições", dataStr: "A consultar", detalhes: `Inscrições no site oficial da banca ${edital.banca || "organizadora"}` },
        { evento: "Data da Prova Objetiva", dataStr: "A consultar", detalhes: "Consulta individual no cartão de confirmação" }
      ];

  return { calendario, cargos: scannedCargos };
}

// Date parser helper for Calendar dynamic status
function parseDateString(dataStr: string): { startDate: Date | null; endDate: Date | null } {
  if (!dataStr || dataStr === "Informação não consta no edital") {
    return { startDate: null, endDate: null };
  }
  const dateMatches = dataStr.match(/\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/g);
  if (!dateMatches || dateMatches.length === 0) {
    return { startDate: null, endDate: null };
  }

  const parseSingle = (s: string) => {
    if (s.includes("-")) {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const [d, m, y] = s.split("/").map(Number);
    return new Date(y, m - 1, d);
  };

  const dates = dateMatches.map(parseSingle).filter((d) => !isNaN(d.getTime()));
  if (dates.length === 0) return { startDate: null, endDate: null };

  const startDate = dates[0];
  const endDate = dates.length > 1 ? dates[dates.length - 1] : startDate;
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

function getEventStatus(dataStr: string) {
  const { startDate, endDate } = parseDateString(dataStr);
  if (!startDate || !endDate) {
    return { label: "A CONSULTAR", cor: "AMARELO", badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today < startDate) {
    return { label: "A INICIAR (VERDE)", cor: "VERDE", badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
  } else if (today >= startDate && today <= endDate) {
    return { label: "NA DATA INDICADA (AMARELO)", cor: "AMARELO", badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
  } else {
    return { label: "PASSOU DA DATA (VERMELHO)", cor: "VERMELHO", badgeClass: "bg-red-500/10 text-red-500 border-red-500/20" };
  }
}

// Calculate grand totals for Cargo
function calcCargoTotals(cargo: CargoResumoExecutivo) {
  if (cargo.vagasPorLocalidade && cargo.vagasPorLocalidade.length > 0) {
    const im = cargo.vagasPorLocalidade.reduce((s, v) => s + (v.vagasImediatas?.subtotal || 0), 0);
    const cr = cargo.vagasPorLocalidade.reduce((s, v) => s + (v.cadastroReserva?.subtotal || 0), 0);
    const locs = cargo.vagasPorLocalidade.filter((v) => (v.totalGeral || 0) > 0).length;
    return { imediatas: im, cr, total: im + cr, locs };
  }
  const im = parseInt(cargo.vagasCR?.vagasAmpla || "0") || 0;
  const cr = parseInt(cargo.vagasCR?.vagasCR || "0") || 0;
  return { imediatas: im, cr, total: im + cr, locs: 0 };
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT: ResumoView (Dossiê do Candidato)
// ---------------------------------------------------------------------------
export function ResumoView({ state, updateState, darkMode }: ResumoViewProps) {
  const edital = state.edital;
  const [showScanModal, setShowScanModal] = useState(false);

  const handleScanSuccess = (scannedEdital: Edital) => {
    const newState: StudyState = {
      ...state,
      edital: scannedEdital,
    };
    updateState(newState);
    setShowScanModal(false);
  };

  // Active ResumoExecutivoData with all cargos
  const resumoData = useMemo(() => getResumoData(edital), [edital]);

  // Selected cargo index
  const [selectedCargoIdx, setSelectedCargoIdx] = useState<number>(0);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>("visao");

  // Tracked study topics state for Section 8 (Conteúdo Programático Verticalizado - Checkbox tachado)
  const [checkedTopics, setCheckedTopics] = useState<{ [key: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem("resumo_checked_topics");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleTopic = (topicKey: string) => {
    setCheckedTopics((prev) => {
      const updated = { ...prev, [topicKey]: !prev[topicKey] };
      try {
        localStorage.setItem("resumo_checked_topics", JSON.stringify(updated));
      } catch {
        // ignore storage quota issues
      }
      return updated;
    });
  };

  // Currently selected cargo object
  const currentCargo = useMemo(() => {
    return resumoData.cargos[selectedCargoIdx] || resumoData.cargos[0];
  }, [resumoData.cargos, selectedCargoIdx]);

  const totals = useMemo(() => calcCargoTotals(currentCargo), [currentCargo]);

  // Calculate completion progress for current cargo topics
  const topicStats = useMemo(() => {
    let total = 0;
    let done = 0;
    const cg = currentCargo.conteudoProgramatico.conhecimentosGerais || [];
    const ce = currentCargo.conteudoProgramatico.conhecimentosEspecificos || [];

    cg.forEach((mat) => {
      mat.topicos.forEach((top) => {
        total++;
        const key = `${currentCargo.cargoName}_CG_${mat.materia}_${top}`;
        if (checkedTopics[key]) done++;
      });
    });

    ce.forEach((mat) => {
      mat.topicos.forEach((top) => {
        total++;
        const key = `${currentCargo.cargoName}_CE_${mat.materia}_${top}`;
        if (checkedTopics[key]) done++;
      });
    });

    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, percent };
  }, [currentCargo, checkedTopics]);

  const renderValue = (val?: string) => {
    if (!val || val.trim() === "" || val === "N/A") return "Informação não consta no edital";
    return val;
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* ------------------------------------------------------------------- */}
      {/* HEADER CARD */}
      {/* ------------------------------------------------------------------- */}
      <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400">
              Edital {edital.orgao || "001/2026"} · Banca {edital.banca || "FGV"}
            </span>
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6 text-blue-500 shrink-0" />
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
                Dossiê do Candidato & Resumo do Edital
              </h2>
            </div>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} leading-relaxed max-w-3xl`}>
              Painel interativo do concurso público — consulte requisitos, cronograma, vagas e conteúdo programático correspondentes ao seu cargo.
            </p>
          </div>

          <button
            onClick={() => setShowScanModal(true)}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer shrink-0"
            title="Escanear edital PDF ou colar texto para atualizar este resumo e as matérias via IA"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Escanear Edital por IA</span>
          </button>
        </div>

        {/* CARGO SELECTOR & BADGE BAR */}
        <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-gray-200/10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <Briefcase className="w-4 h-4 shrink-0" />
            <span>Cargo Cadastrado:</span>
            <span className="text-gray-900 dark:text-white font-extrabold ml-1">
              {currentCargo.cargoName}
            </span>
          </div>

          {resumoData.cargos.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-medium mr-1">Alternar cargo:</span>
              {resumoData.cargos.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCargoIdx(idx)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                    selectedCargoIdx === idx
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : darkMode
                      ? "bg-[#162447] text-gray-300 border-[#22335c] hover:border-blue-500"
                      : "bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {c.cargoName}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* CARGO SUMMARY METRICS CARD */}
      {/* ------------------------------------------------------------------- */}
      <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
      }`}>
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-500">
            Grupo: {currentCargo.grupo || currentCargo.visaoGeral.orgao}
          </span>
          <h3 className={`text-lg font-black tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
            {currentCargo.cargoName}
          </h3>
          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-1`}>
            <strong>Requisitos:</strong> {currentCargo.visaoGeral.escolaridadeRequisitos}
          </p>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          <div className={`p-3.5 rounded-xl border text-center ${darkMode ? "bg-[#162447] border-[#22335c]" : "bg-slate-50 border-gray-200"}`}>
            <div className="text-2xl font-black text-blue-500">{totals.imediatas}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">Vagas Imediatas</div>
          </div>
          <div className={`p-3.5 rounded-xl border text-center ${darkMode ? "bg-[#162447] border-[#22335c]" : "bg-slate-50 border-gray-200"}`}>
            <div className="text-2xl font-black text-indigo-500">{totals.cr}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">Cadastro Reserva</div>
          </div>
          <div className={`p-3.5 rounded-xl border text-center ${darkMode ? "bg-[#162447] border-[#22335c]" : "bg-slate-50 border-gray-200"}`}>
            <div className="text-2xl font-black text-emerald-500">{totals.total}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">Total Geral</div>
          </div>
          <div className={`p-3.5 rounded-xl border text-center ${darkMode ? "bg-[#162447] border-[#22335c]" : "bg-slate-50 border-gray-200"}`}>
            <div className="text-sm font-black text-amber-500 mt-1">{currentCargo.visaoGeral.cargaHoraria}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">Carga Horária</div>
          </div>
          <div className={`p-3.5 rounded-xl border text-center ${darkMode ? "bg-[#162447] border-[#22335c]" : "bg-slate-50 border-gray-200"}`}>
            <div className="text-xs font-black text-emerald-400 mt-1 leading-tight">{currentCargo.visaoGeral.remuneracaoInicial}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">Remuneração</div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* NAVIGATION TABS */}
      {/* ------------------------------------------------------------------- */}
      <div className={`flex items-center gap-2 overflow-x-auto p-1.5 rounded-2xl border ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
      }`}>
        {[
          { id: "visao", label: "Visão Geral & Dados" },
          { id: "cronograma", label: "Cronograma do Concurso" },
          { id: "prova", label: "Prova & Critérios de Aprovação" },
          { id: "conteudo", label: `Conteúdo Verticalizado (${topicStats.percent}%)` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : darkMode
                ? "text-gray-400 hover:text-white hover:bg-white/5"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* TAB 1: VISÃO GERAL */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "visao" && (
        <div className="space-y-6 animate-fade-in">
          {/* Identificação do certame */}
          <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
              <Building2 className="w-5 h-5 text-blue-500" />
              Identificação do Certame & Dados do Concurso
            </h3>
            
            <div className={`overflow-x-auto rounded-xl border ${darkMode ? "border-[#1e2d4d]" : "border-gray-200"}`}>
              <table className="w-full text-xs text-left">
                <tbody className={`divide-y ${darkMode ? "divide-[#1e2d4d]" : "divide-gray-100"}`}>
                  <tr className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50/50"}>
                    <td className={`py-3 px-4 font-bold w-52 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Órgão / Entidade</td>
                    <td className={`py-3 px-4 ${darkMode ? "text-gray-200" : "text-gray-900"}`}>{renderValue(currentCargo.visaoGeral.orgao)}</td>
                  </tr>
                  <tr className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50/50"}>
                    <td className={`py-3 px-4 font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Banca Organizadora</td>
                    <td className={`py-3 px-4 ${darkMode ? "text-gray-200" : "text-gray-900"}`}>{renderValue(currentCargo.visaoGeral.banca)}</td>
                  </tr>
                  <tr className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50/50"}>
                    <td className={`py-3 px-4 font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Cargo Analisado</td>
                    <td className={`py-3 px-4 ${darkMode ? "text-gray-200" : "text-gray-900"}`}>{renderValue(currentCargo.visaoGeral.cargoAnalisado)}</td>
                  </tr>
                  <tr className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50/50"}>
                    <td className={`py-3 px-4 font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Escolaridade / Requisitos</td>
                    <td className={`py-3 px-4 ${darkMode ? "text-gray-200" : "text-gray-900"}`}>{renderValue(currentCargo.visaoGeral.escolaridadeRequisitos)}</td>
                  </tr>
                  <tr className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50/50"}>
                    <td className={`py-3 px-4 font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Carga Horária Semanal</td>
                    <td className={`py-3 px-4 ${darkMode ? "text-gray-200" : "text-gray-900"}`}>{renderValue(currentCargo.visaoGeral.cargaHoraria)}</td>
                  </tr>
                  <tr className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50/50"}>
                    <td className={`py-3 px-4 font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Remuneração Inicial</td>
                    <td className="py-3 px-4 font-bold text-emerald-500">{renderValue(currentCargo.visaoGeral.remuneracaoInicial)}</td>
                  </tr>
                  <tr className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50/50"}>
                    <td className={`py-3 px-4 font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Total de Vagas (Perfil)</td>
                    <td className={`py-3 px-4 ${darkMode ? "text-gray-200" : "text-gray-900"}`}>
                      {totals.imediatas} imediatas + {totals.cr} em cadastro de reserva = <strong className="text-blue-500">{totals.total} vagas totais</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Inscrições e Isenção */}
          <div className={`p-6 rounded-2xl border transition-colors space-y-3 ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
              <DollarSign className="w-5 h-5 text-amber-500" />
              Inscrições & Isenção de Taxa
            </h3>
            <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${darkMode ? "bg-[#162447] border-[#22335c] text-gray-300" : "bg-slate-50 border-gray-200 text-gray-700"}`}>
              <p><strong>Taxa de Inscrição:</strong> <span className="font-mono text-amber-500 font-bold">{currentCargo.inscricoesIsencao.valorTaxa}</span></p>
              <p><strong>Site Oficial da Banca:</strong> <a href={currentCargo.inscricoesIsencao.siteBanca.startsWith("http") ? currentCargo.inscricoesIsencao.siteBanca : "#"} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-medium inline-flex items-center gap-1">{currentCargo.inscricoesIsencao.siteBanca} <ExternalLink className="w-3 h-3" /></a></p>
              <p><strong>Regras de Isenção:</strong> {currentCargo.inscricoesIsencao.regrasIsencao}</p>
            </div>
          </div>

          {/* Reserva de Vagas (Cotas Globais) */}
          <div className={`p-6 rounded-2xl border transition-colors space-y-3 ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
              <Shield className="w-5 h-5 text-indigo-500" />
              Reserva de Vagas (Cotas Globais)
            </h3>
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${darkMode ? "bg-[#162447] border-[#22335c] text-gray-300" : "bg-slate-50 border-gray-200 text-gray-700"}`}>
              <p>Do total de vagas ofertadas: <strong>5% no mínimo</strong> para pessoas com deficiência (PcD) e <strong>30%</strong> para negros (pretos e pardos), indígenas e quilombolas conforme legislação federal vigente.</p>
              <p className="text-gray-400 italic">Candidatos de cotas concorrem simultaneamente às vagas reservadas e à ampla concorrência.</p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 2: CRONOGRAMA */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "cronograma" && (
        <div className="space-y-6 animate-fade-in">
          <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/10 pb-3">
              <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                <Calendar className="w-5 h-5 text-blue-500" />
                Calendário Completo do Certame
              </h3>
              <div className="flex items-center gap-3 text-[10px] font-mono font-bold">
                <span className="text-emerald-500">● VERDE: Não iniciou</span>
                <span className="text-amber-500">● AMARELO: Na data</span>
                <span className="text-red-500">● VERMELHO: Passou</span>
              </div>
            </div>

            <div className="space-y-2">
              <ul className={`divide-y text-xs ${darkMode ? "divide-[#1e2d4d]" : "divide-gray-100"}`}>
                {resumoData.calendario.map((ev, idx) => {
                  const st = getEventStatus(ev.dataStr);
                  return (
                    <li key={idx} className={`py-3.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl transition-colors ${darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"}`}>
                      <div className="space-y-1">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${st.badgeClass} mb-1`}>
                          {st.cor}
                        </span>
                        <p className={`font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{ev.evento}</p>
                        {ev.detalhes && <p className={`text-[11px] ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{ev.detalhes}</p>}
                      </div>
                      <span className="font-mono font-bold text-blue-500 text-xs shrink-0">{ev.dataStr}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 3: PROVA & APROVAÇÃO */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "prova" && (
        <div className="space-y-6 animate-fade-in">
          {/* Estrutura da Prova Objetiva */}
          <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
              Estrutura da Prova Objetiva
            </h3>
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${darkMode ? "bg-[#162447] border-[#22335c] text-gray-300" : "bg-slate-50 border-gray-200 text-gray-700"}`}>
              <p><strong>Data & Horário:</strong> {currentCargo.provaObjetiva.dataHorarioTurno}</p>
              <p><strong>Formato:</strong> {currentCargo.provaObjetiva.estruturaQuestoes}</p>
              <p><strong>Penalidade por Erro:</strong> {currentCargo.provaObjetiva.penalidadeErro}</p>
              <p><strong>Critérios de Eliminação:</strong> {currentCargo.provaObjetiva.criteriosEliminacao}</p>
            </div>
          </div>

          {/* Distribuição de Disciplinas */}
          <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
              <Award className="w-5 h-5 text-indigo-500" />
              Distribuição de Disciplinas e Pontuação
            </h3>
            <div className={`overflow-x-auto rounded-xl border ${darkMode ? "border-[#1e2d4d]" : "border-gray-200"}`}>
              <table className="w-full text-xs text-left">
                <thead className={`uppercase font-mono text-[10px] ${darkMode ? "bg-[#162447] text-gray-300" : "bg-gray-100 text-gray-700"}`}>
                  <tr>
                    <th className="py-3 px-4">Disciplina / Módulo</th>
                    <th className="py-3 px-4 text-center">Nº Questões</th>
                    <th className="py-3 px-4 text-center">Peso</th>
                    <th className="py-3 px-4 text-center">Pontuação Máx</th>
                    <th className="py-3 px-4">Corte / Mínimo</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? "divide-[#1e2d4d]" : "divide-gray-100"}`}>
                  {currentCargo.provaObjetiva.distribuicaoDisciplinas.map((d, i) => (
                    <tr key={i} className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50/50"}>
                      <td className={`py-3 px-4 font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{d.disciplinaOuBloco}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-blue-500">{d.numQuestoes}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-purple-500">{d.peso}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-500">{d.pontuacaoMaxima}</td>
                      <td className="py-3 px-4 font-semibold text-amber-500">{d.notaMinimaOuCorte}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Prova Discursiva section */}
          {currentCargo.provaDiscursiva.temDiscursiva && (
            <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${
              darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
            }`}>
              <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                <FileCheck className="w-5 h-5 text-emerald-500" />
                Prova Discursiva / Redação
              </h3>
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${darkMode ? "bg-[#162447] border-[#22335c] text-gray-300" : "bg-slate-50 border-gray-200 text-gray-700"}`}>
                <p><strong>Formato:</strong> {currentCargo.provaDiscursiva.formato}</p>
                <p><strong>Extensão:</strong> {currentCargo.provaDiscursiva.extensao}</p>
                <p><strong>Discursivas Corrigidas:</strong> {currentCargo.provaDiscursiva.numDiscursivasCorrigidas}</p>
                <p><strong>Critérios de Avaliação:</strong> {currentCargo.provaDiscursiva.criteriosPontuacao}</p>
                <p><strong>Nota Mínima:</strong> {currentCargo.provaDiscursiva.notaMinimaAprovacao}</p>
              </div>
            </div>
          )}

          {/* Critérios de Desempate */}
          <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
              <ListChecks className="w-5 h-5 text-blue-500" />
              Critérios de Desempate (Ordem de Prioridade)
            </h3>
            <ol className={`list-decimal list-inside text-xs space-y-2 p-4 rounded-xl border ${darkMode ? "bg-[#162447] border-[#22335c] text-gray-300" : "bg-slate-50 border-gray-200 text-gray-700"}`}>
              {currentCargo.etapasDesempate.criteriosDesempate.map((crit, i) => (
                <li key={i} className="font-medium leading-relaxed">{crit}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 4: CONTEÚDO PROGRAMÁTICO VERTICALIZADO (Checkbox tachado) */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "conteudo" && (
        <div className="space-y-6 animate-fade-in">
          <div className={`p-6 rounded-2xl border transition-colors space-y-6 ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/10 pb-4">
              <div>
                <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                  <ListChecks className="w-5 h-5 text-blue-500" />
                  Conteúdo Programático Verticalizado
                </h3>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
                  Marque as caixas de seleção para tachar os tópicos já estudados.
                </p>
              </div>

              {/* Progress counter pill */}
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-bold text-xs shrink-0">
                <span>Progresso do Cargo:</span>
                <span className="text-emerald-400 text-sm font-black">{topicStats.done} / {topicStats.total} ({topicStats.percent}%)</span>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="space-y-1.5">
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${topicStats.percent}%` }}
                />
              </div>
            </div>

            {/* Conhecimentos Gerais */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-500 flex items-center gap-2 border-b border-gray-200/10 pb-2">
                <span>• Conhecimentos Gerais</span>
              </h4>
              {currentCargo.conteudoProgramatico.conhecimentosGerais.map((mat, idx) => (
                <div key={idx} className={`p-4 rounded-xl border space-y-3 ${darkMode ? "bg-[#162447] border-[#22335c]" : "bg-slate-50 border-gray-200"}`}>
                  <h5 className="font-bold text-xs text-amber-500 uppercase tracking-wider">
                    {mat.materia}
                  </h5>
                  <div className="space-y-2.5">
                    {mat.topicos.map((topico, i) => {
                      const key = `${currentCargo.cargoName}_CG_${mat.materia}_${topico}`;
                      const isChecked = !!checkedTopics[key];
                      return (
                        <label
                          key={i}
                          onClick={() => toggleTopic(key)}
                          className="flex items-start gap-3 text-xs cursor-pointer select-none group"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                          />
                          <span className={`transition-all leading-relaxed ${isChecked ? "line-through text-gray-400 dark:text-gray-500 opacity-60 font-normal" : darkMode ? "text-gray-200 font-medium group-hover:text-blue-400" : "text-gray-800 font-medium group-hover:text-blue-600"}`}>
                            {topico}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Conhecimentos Específicos */}
            <div className="space-y-4 pt-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-blue-500 flex items-center gap-2 border-b border-gray-200/10 pb-2">
                <span>• Conhecimentos Específicos — {currentCargo.cargoName}</span>
              </h4>
              {currentCargo.conteudoProgramatico.conhecimentosEspecificos.map((mat, idx) => (
                <div key={idx} className={`p-4 rounded-xl border space-y-3 ${darkMode ? "bg-[#162447] border-[#22335c]" : "bg-slate-50 border-gray-200"}`}>
                  <h5 className="font-bold text-xs text-blue-500 uppercase tracking-wider">
                    {mat.materia}
                  </h5>
                  <div className="space-y-2.5">
                    {mat.topicos.map((topico, i) => {
                      const key = `${currentCargo.cargoName}_CE_${mat.materia}_${topico}`;
                      const isChecked = !!checkedTopics[key];
                      return (
                        <label
                          key={i}
                          onClick={() => toggleTopic(key)}
                          className="flex items-start gap-3 text-xs cursor-pointer select-none group"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                          />
                          <span className={`transition-all leading-relaxed ${isChecked ? "line-through text-gray-400 dark:text-gray-500 opacity-60 font-normal" : darkMode ? "text-gray-200 font-medium group-hover:text-blue-400" : "text-gray-800 font-medium group-hover:text-blue-600"}`}>
                            {topico}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className={`p-4 rounded-xl border text-xs font-mono flex flex-col sm:flex-row justify-between gap-2 ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d] text-gray-400" : "bg-white border-gray-200 text-gray-500"
      }`}>
        <span>Fonte: Edital {edital.orgao || "001/2026"} — Concurso Público {edital.orgao || "Dataprev"}/{edital.banca || "FGV"}.</span>
        <span>Exibindo cargo: {currentCargo.cargoName}</span>
      </div>

      {/* SCAN MODAL */}
      <EditalScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onScanSuccess={handleScanSuccess}
        initialOrgao={edital.orgao}
        initialCargo={edital.cargo}
        darkMode={darkMode}
        title="Escanear Edital por IA para Resumo & Ciclo"
      />
    </div>
  );
}

export default ResumoView;
