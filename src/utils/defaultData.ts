import { StudyState } from "../types";

export const DEFAULT_STUDY_STATE: StudyState = {
  edital: {
    banca: "Cebraspe",
    orgao: "Petrobras",
    cargo: "Ênfase 1: Operação",
    categorias: [
      {
        id: "cat_basicos",
        nome: "CONHECIMENTOS BÁSICOS",
        disciplinas: [
          {
            id: "disc_portugues",
            nome: "Língua Portuguesa",
            questoes: 10,
            peso: 1,
            cor: "#3b82f6", // azul
            assuntos: [
              {
                id: "ass_port_1",
                nome: "01 - Ortografia Oficial e Acentuação Gráfica",
                registros: []
              },
              {
                id: "ass_port_2",
                nome: "02 - Sintaxe do Período Simples e Composto",
                registros: []
              },
              {
                id: "ass_port_3",
                nome: "03 - Regência Nominal e Verbal",
                registros: []
              },
              {
                id: "ass_port_4",
                nome: "04 - Concordância Nominal e Verbal",
                registros: []
              },
              {
                id: "ass_port_5",
                nome: "05 - Emprego do Sinal Indicativo de Crase",
                registros: []
              }
            ],
            horasPorCiclo: 1.0
          },
          {
            id: "disc_ingles",
            nome: "Língua Inglesa",
            questoes: 10,
            peso: 1,
            cor: "#10b981", // verde
            assuntos: [
              {
                id: "ass_ing_1",
                nome: "01 - Compreensão de Textos Escritos em Língua Inglesa",
                registros: []
              },
              {
                id: "ass_ing_2",
                nome: "02 - Itens Lexicais Sistemáticos e Aspectos Gramaticais",
                registros: []
              }
            ],
            horasPorCiclo: 1.0
          }
        ]
      },
      {
        id: "cat_especificos",
        nome: "CONHECIMENTOS ESPECÍFICOS",
        disciplinas: [
          {
            id: "disc_bloco1",
            nome: "Bloco 1",
            questoes: 20,
            peso: 1,
            cor: "#f59e0b", // amarelo/laranja
            assuntos: [
              {
                id: "ass_b1_1",
                nome: "01 - Operação de Processos Químicos e Petroquímicos",
                registros: []
              },
              {
                id: "ass_b1_2",
                nome: "02 - Princípios de Transferência de Calor e Massa",
                registros: []
              }
            ],
            horasPorCiclo: 2.0
          },
          {
            id: "disc_bloco2",
            nome: "Bloco 2",
            questoes: 15,
            peso: 1,
            cor: "#ec4899", // rosa
            assuntos: [
              {
                id: "ass_b2_1",
                nome: "01 - Instrumentação e Controle de Processos",
                registros: []
              },
              {
                id: "ass_b2_2",
                nome: "02 - Segurança Operacional e Meio Ambiente",
                registros: []
              }
            ],
            horasPorCiclo: 1.5
          },
          {
            id: "disc_bloco3",
            nome: "Bloco 3",
            questoes: 15,
            peso: 1,
            cor: "#8b5cf6", // roxo
            assuntos: [
              {
                id: "ass_b3_1",
                nome: "01 - Equipamentos Dinâmicos e Estáticos",
                registros: []
              },
              {
                id: "ass_b3_2",
                nome: "02 - Manutenção Industrial de Equipamentos",
                registros: []
              }
            ],
            horasPorCiclo: 1.5
          }
        ]
      }
    ]
  },
  metas: {
    horasDisponiveis: {
      "0": 5, // Domingo
      "1": 3, // Segunda
      "2": 3, // Terça
      "3": 3, // Quarta
      "4": 3, // Quinta
      "5": 3, // Sexta
      "6": 5  // Sábado
    },
    dataInicial: new Date().toISOString().split("T")[0],
    dataFinal: "",
    diasImprodutivos: [],
    calendarOverrides: {}
  },
  currentCycle: 1,
  sessions: []
};

export function sanitizeCycleState(state: StudyState): StudyState {
  if (!state) return state;

  const MOCK_SESSION_IDS = new Set(["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9"]);
  const cleanSessions = (state.sessions || []).filter(s => !MOCK_SESSION_IDS.has(s.id));

  const MOCK_REG_IDS = new Set(["reg_p1_1", "reg_p1_2", "reg_p2_1", "reg_p3_1", "reg_p4_1", "reg_i1_1", "reg_b1_1", "reg_b2_1", "reg_b3_1"]);

  const cleanEdital = { ...state.edital };
  if (cleanEdital.categorias) {
    cleanEdital.categorias = cleanEdital.categorias.map(cat => ({
      ...cat,
      disciplinas: (cat.disciplinas || []).map(disc => ({
        ...disc,
        assuntos: (disc.assuntos || []).map(ass => ({
          ...ass,
          registros: (ass.registros || []).filter(r => !MOCK_REG_IDS.has(r.id))
        }))
      }))
    }));
  }

  return {
    ...state,
    edital: cleanEdital,
    sessions: cleanSessions
  };
}

export const EMPTY_STUDY_STATE: StudyState = {
  edital: {
    banca: "A Definir",
    orgao: "",
    cargo: "",
    categorias: []
  },
  metas: {
    horasDisponiveis: {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0
    },
    dataInicial: new Date().toISOString().split("T")[0],
    dataFinal: "",
    diasImprodutivos: [],
    calendarOverrides: {}
  },
  currentCycle: 1,
  sessions: [],
  discursivas: []
};
