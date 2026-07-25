export interface RegistroQuestao {
  id: string;
  data: string; // formato DD/MM/AAAA ou YYYY-MM-DD
  acertos: number;
  erros: number;
  total: number;
}

export interface Assunto {
  id: string;
  nome: string;
  registros: RegistroQuestao[];
  status?: "NÃO ESTUDADO" | "ESTUDADO" | "REVISADO";
  incidencia?: "ALTA" | "MÉDIA" | "BAIXA";
}

export interface Disciplina {
  id: string;
  nome: string;
  questoes: number;
  peso: number;
  cor: string;
  assuntos: Assunto[];
  // Planejamento (Guia Planejamento)
  horasTotais?: number;      // Calculado ou editado
  horasPorCiclo?: number;    // Ex: 1h, 1.5h, 2h por bloco
  ciclosTotais?: number;     // HorasTotais / HorasPorCiclo
}

export interface Categoria {
  id: string;
  nome: string;
  disciplinas: Disciplina[];
}

export interface Edital {
  banca: string;
  orgao: string;
  cargo: string;
  categorias: Categoria[];
  discursivaInfo?: {
    hasDiscursiva: boolean;
    detalhes: string;
    criteriosAvaliacao: string;
  };
  resumoExecutivo?: ResumoExecutivoData;
}

export interface CalendarioItem {
  evento: string;
  dataStr: string;
  dataISO?: string;
  detalhes?: string;
}

export interface DisciplinaTabelaItem {
  disciplinaOuBloco: string;
  numQuestoes: string;
  peso: string;
  pontuacaoMaxima: string;
  notaMinimaOuCorte: string;
}

export interface VagasLocalidadeItem {
  localidade: string;
  vagasImediatas: {
    ampla: number;
    pcd: number;
    negros: number;
    indigenas: number;
    quilombolas: number;
    subtotal: number;
  };
  cadastroReserva: {
    ampla: number;
    pcd: number;
    negros: number;
    indigenas: number;
    quilombolas: number;
    subtotal: number;
  };
  totalGeral: number;
}

export interface CargoResumoExecutivo {
  cargoName: string;
  grupo?: string;
  visaoGeral: {
    orgao: string;
    banca: string;
    cargoAnalisado: string;
    escolaridadeRequisitos: string;
    cargaHoraria: string;
    remuneracaoInicial: string;
  };
  inscricoesIsencao: {
    valorTaxa: string;
    siteBanca: string;
    regrasIsencao: string;
  };
  vagasCR: {
    vagasAmpla: string;
    vagasReservadas: string;
    vagasCR: string;
    totalConvocaveis: string;
  };
  vagasPorLocalidade?: VagasLocalidadeItem[];
  atribuicoes?: {
    sumaria: string;
    tarefas: string[];
  };
  remuneraDetalhada?: {
    salarioNominal: string;
    adicionalAtividade: string;
    totalInicial: string;
    cargaHoraria: string;
    beneficios: string[];
  };
  provaObjetiva: {
    dataHorarioTurno: string;
    estruturaQuestoes: string;
    penalidadeErro: string;
    distribuicaoDisciplinas: DisciplinaTabelaItem[];
    criteriosEliminacao: string;
  };
  provaDiscursiva: {
    temDiscursiva: boolean;
    formato: string;
    extensao: string;
    numDiscursivasCorrigidas: string;
    criteriosPontuacao: string;
    notaMinimaAprovacao: string;
  };
  etapasDesempate: {
    outrasEtapas: string;
    criteriosDesempate: string[];
  };
  conteudoProgramatico: {
    conhecimentosGerais: { materia: string; topicos: string[] }[];
    conhecimentosEspecificos: { materia: string; topicos: string[] }[];
  };
}

export interface ResumoExecutivoData {
  calendario: CalendarioItem[];
  cargos: CargoResumoExecutivo[];
}

export interface Metas {
  horasDisponiveis: { [key: string]: number }; // '0' (Dom) a '6' (Sáb)
  dataInicial: string; // YYYY-MM-DD
  dataFinal: string; // YYYY-MM-DD
  diasImprodutivos: string[]; // datas em formato YYYY-MM-DD
  calendarOverrides: { [dateStr: string]: { productive: boolean; hours: number } }; // overrides manuais no calendário
}

export interface StudySession {
  id: string;
  disciplinaId: string;
  disciplinaNome: string;
  data: string; // YYYY-MM-DD
  duracaoMinutos: number;
  questoesAcertos: number;
  questoesErros: number;
  ciclo: number;
}

export interface RegistroDiscursiva {
  id: string;
  data: string; // formato DD/MM/AAAA ou YYYY-MM-DD
  banca: string;
  tema: string;
  notasCriterios: { [key: string]: number };
  notaTotal: number;
  observacoes: string;
  textoAluno?: string;
  pontosFortes?: string[];
  pontosMelhoria?: string[];
  revisaoGramatical?: string;
  respostaSugerida?: string;
}

export interface SimuladoMateriaNota {
  disciplinaId: string;
  disciplinaNome: string;
  questoesRespondidas: number;
  acertos: number;
  erros: number;
  anuladas?: number;
  peso: number;
  pontuacao: number;
  pontuacaoMaxima: number;
  aproveitamento: number; // % (0-100)
}

export interface SimuladoItem {
  id: string;
  data: string; // YYYY-MM-DD
  nome: string; // e.g. "SIMULADO 01"
  cargo: string;
  orgao: string;
  pontuacaoTotal: number;
  pontuacaoMaximaTotal: number;
  aproveitamentoGeral: number; // % (0-100)
  totalAcertos: number;
  totalQuestoes: number;
  detalhesMaterias: SimuladoMateriaNota[];
  observacoes?: string;
}

export interface SimuladoState {
  historico: SimuladoItem[];
  metaAproveitamento: number; // e.g. 80 (%)
  criteriosPorCargo?: {
    [cargoKey: string]: {
      penalidadePorErro: number; // e.g. 1.0 para Cebraspe (certo/errado), 0.0 para múltipla escolha sem penalidade
      criterioClassificacao: string;
      criterioEliminacao: string;
    };
  };
}

export interface StudyState {
  edital: Edital;
  metas: Metas;
  currentCycle: number;
  sessions: StudySession[];
  discursivas?: RegistroDiscursiva[];
  simulados?: SimuladoState;
}

export interface CicloEstudo {
  id: string;
  orgao: string;
  cargoDesejado: string;
  nivel: "Médio" | "Técnico" | "Superior";
  state: StudyState;
}

