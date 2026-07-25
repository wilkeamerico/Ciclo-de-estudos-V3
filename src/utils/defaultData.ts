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
                registros: [
                  { id: "reg_p1_1", data: "05/07/2026", acertos: 15, erros: 5, total: 20 },
                  { id: "reg_p1_2", data: "08/07/2026", acertos: 18, erros: 2, total: 20 }
                ]
              },
              {
                id: "ass_port_2",
                nome: "02 - Sintaxe do Período Simples e Composto",
                registros: [
                  { id: "reg_p2_1", data: "06/07/2026", acertos: 12, erros: 5, total: 17 }
                ]
              },
              {
                id: "ass_port_3",
                nome: "03 - Regência Nominal e Verbal",
                registros: [
                  { id: "reg_p3_1", data: "07/07/2026", acertos: 8, erros: 4, total: 12 }
                ]
              },
              {
                id: "ass_port_4",
                nome: "04 - Concordância Nominal e Verbal",
                registros: [
                  { id: "reg_p4_1", data: "09/07/2026", acertos: 15, erros: 1, total: 16 }
                ]
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
                registros: [
                  { id: "reg_i1_1", data: "04/07/2026", acertos: 9, erros: 1, total: 10 }
                ]
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
                registros: [
                  { id: "reg_b1_1", data: "02/07/2026", acertos: 25, erros: 5, total: 30 }
                ]
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
                registros: [
                  { id: "reg_b2_1", data: "03/07/2026", acertos: 14, erros: 6, total: 20 }
                ]
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
                registros: [
                  { id: "reg_b3_1", data: "01/07/2026", acertos: 12, erros: 3, total: 15 }
                ]
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
    dataInicial: "2026-07-10",
    dataFinal: "2026-10-14",
    diasImprodutivos: ["2026-09-07", "2026-10-12"],
    calendarOverrides: {}
  },
  currentCycle: 2,
  sessions: [
    { id: "s1", disciplinaId: "disc_portugues", disciplinaNome: "Língua Portuguesa", data: "2026-07-05", duracaoMinutos: 60, questoesAcertos: 15, questoesErros: 5, ciclo: 1 },
    { id: "s2", disciplinaId: "disc_portugues", disciplinaNome: "Língua Portuguesa", data: "2026-07-08", duracaoMinutos: 45, questoesAcertos: 18, questoesErros: 2, ciclo: 1 },
    { id: "s3", disciplinaId: "disc_portugues", disciplinaNome: "Língua Portuguesa", data: "2026-07-06", duracaoMinutos: 90, questoesAcertos: 12, questoesErros: 5, ciclo: 1 },
    { id: "s4", disciplinaId: "disc_portugues", disciplinaNome: "Língua Portuguesa", data: "2026-07-07", duracaoMinutos: 60, questoesAcertos: 8, questoesErros: 4, ciclo: 2 },
    { id: "s5", disciplinaId: "disc_portugues", disciplinaNome: "Língua Portuguesa", data: "2026-07-09", duracaoMinutos: 120, questoesAcertos: 15, questoesErros: 1, ciclo: 2 },
    { id: "s6", disciplinaId: "disc_ingles", disciplinaNome: "Língua Inglesa", data: "2026-07-04", duracaoMinutos: 60, questoesAcertos: 9, questoesErros: 1, ciclo: 1 },
    { id: "s7", disciplinaId: "disc_bloco1", disciplinaNome: "Bloco 1", data: "2026-07-02", duracaoMinutos: 120, questoesAcertos: 25, questoesErros: 5, ciclo: 1 },
    { id: "s8", disciplinaId: "disc_bloco2", disciplinaNome: "Bloco 2", data: "2026-07-03", duracaoMinutos: 90, questoesAcertos: 14, questoesErros: 6, ciclo: 1 },
    { id: "s9", disciplinaId: "disc_bloco3", disciplinaNome: "Bloco 3", data: "2026-07-01", duracaoMinutos: 90, questoesAcertos: 12, questoesErros: 3, ciclo: 1 }
  ]
};

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
