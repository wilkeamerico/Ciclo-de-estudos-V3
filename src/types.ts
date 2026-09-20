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
  teoria?: boolean;
  revisao?: boolean;
  questoes?: boolean;
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
  dataProva?: string;
  dataProvas?: string;
  metaAcertosPorcentagem?: number;
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

export interface CadernoDisciplinaMapeada {
  nome: string;
  questoesCount: number;
  faixaQuestoes: string;
  pesoSugerido?: number;
  principaisTemas?: string[];
}

export interface CadernoConteudoCobrado {
  disciplina: string;
  assunto: string;
  incidencia: "ALTA" | "MÉDIA" | "BAIXA";
  frequenciaQuestoes: number;
  questoesNumeros?: number[];
  resumoCobranca?: string;
}

export interface CadernoTopicoCritico {
  disciplina: string;
  assunto: string;
  motivo: string;
  recomendacaoEstudo: string;
  prioridade: "URGENTE" | "ALTA" | "MÉDIA";
}

export interface CadernoAjusteCarga {
  disciplina: string;
  acaoRecomendada: string;
  justificativa: string;
}

export interface CadernoDiagnostico {
  resumoGeral: string;
  topicosCriticosMelhorar: CadernoTopicoCritico[];
  sugestaoAjusteCargaHoraria: CadernoAjusteCarga[];
  orientacoesSessoesEstudo: string[];
}

export interface CadernoAnalysisResult {
  totalQuestoes: number;
  tipoProva: string;
  disciplinasMapeadas: CadernoDisciplinaMapeada[];
  conteudosCobradosNoEdital: CadernoConteudoCobrado[];
  diagnosticoProximosCiclos: CadernoDiagnostico;
  classificacoes?: { assunto: string; incidencia: string; motivo?: string }[];
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

// ----------------------------------------------------
// Tipos e Interfaces do Conferir-provas (SIMULADO IA)
// ----------------------------------------------------

export interface ExamFile {
  name: string;
  size: number;
  type: string;
  mimeType: string;
  data?: string; // base64 payload
  text?: string; // extracted or raw text
}

export type QuestionStatus = 'CORRECT' | 'WRONG' | 'BLANK' | 'ANNULLED';
export type QuestionDifficulty = 'FÁCIL' | 'MÉDIA' | 'DIFÍCIL';
export type PriorityLevel = 'ALTA' | 'MÉDIA' | 'CRÍTICA';
export type StudyStatus = 'A_REVISAR' | 'EM_ANDAMENTO' | 'DOMINADO';

export interface QuestionAnalysis {
  questionNumber: number;
  discipline: string;
  topic: string;
  difficulty: QuestionDifficulty;
  candidateAnswer: string | null;
  officialAnswer: string;
  status: QuestionStatus;
  explanation: string;
  editalReference?: string;
  canAppeal?: boolean;
  appealReason?: string;
}

export interface DisciplineAnalysis {
  discipline: string;
  weight: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  blankCount?: number;
  accuracyPercentage: number;
  diagnosis: string;
  recommendedAction: string;
}

export interface CriticalWeakness {
  topic: string;
  discipline: string;
  missedCount: number;
  priority: PriorityLevel;
  actionGuide: string;
  status?: StudyStatus;
}

export interface WeeklyCycle {
  week: number;
  title: string;
  primaryFocus: string;
  disciplinesToReview: string[];
  actionSteps: string[];
  milestoneGoal?: string;
}

export interface StudyPlan {
  overallStrategy: string;
  recommendedDailyHours?: number;
  weeklyCycles: WeeklyCycle[];
  smartTips: string[];
}

export interface ExamSummary {
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  totalBlank: number;
  totalAnnulled: number;
  scorePercentage: number;
  weightedScore?: number;
  estimatedCutoffScore?: number;
  performanceTier: string;
  generalDiagnosis: string;
}

export interface ExamResult {
  id: string;
  date?: string;
  createdAt?: string;
  examTitle: string;
  summary: ExamSummary;
  disciplines: DisciplineAnalysis[];
  questions: QuestionAnalysis[];
  criticalWeaknesses: CriticalWeakness[];
  studyPlan: StudyPlan;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface PracticeQuestion {
  statement: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface TopicStudyMaterial {
  topic: string;
  discipline: string;
  flashSummary: string;
  mnemonics?: string[];
  commonTraps?: string[];
  flashcards: Flashcard[];
  practiceQuestions: PracticeQuestion[];
}


