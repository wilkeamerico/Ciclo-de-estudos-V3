import { Edital, Metas, Disciplina, StudyState, CicloEstudo } from "../types";

// Calcula a soma geral de pontos do edital
export function calcularSomaPontos(edital: Edital): number {
  let soma = 0;
  edital.categorias.forEach((cat) => {
    cat.disciplinas.forEach((disc) => {
      soma += (disc.questoes || 0) * (disc.peso || 0);
    });
  });
  return soma || 1; // evita divisão por zero
}

// Calcula o peso percentual de uma disciplina em relação ao total
export function calcularPesoPercentual(disc: Disciplina, somaPontos: number): number {
  const pontos = (disc.questoes || 0) * (disc.peso || 0);
  return (pontos / somaPontos) * 100;
}

// Retorna as datas entre dataInicial e dataFinal em formato YYYY-MM-DD
export function obterDatasNoPeriodo(inicioStr: string, fimStr: string): string[] {
  const datas: string[] = [];
  const inicio = new Date(inicioStr + "T00:00:00");
  const fim = new Date(fimStr + "T00:00:00");

  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return [];

  const atual = new Date(inicio);
  while (atual <= fim) {
    const ano = atual.getFullYear();
    const mes = String(atual.getMonth() + 1).padStart(2, "0");
    const dia = String(atual.getDate()).padStart(2, "0");
    datas.push(`${ano}-${mes}-${dia}`);
    atual.setDate(atual.getDate() + 1);
  }
  return datas;
}

// Calcula o resumo de horas e dias com base nas metas
export function calcularResumoMetas(metas: Metas) {
  const datas = obterDatasNoPeriodo(metas.dataInicial, metas.dataFinal);
  let diasProdutivos = 0;
  let diasFolga = 0;
  let metaHorasTotal = 0;

  datas.forEach((dateStr) => {
    const dataObj = new Date(dateStr + "T00:00:00");
    const diaSemana = dataObj.getDay().toString(); // '0' (Dom) a '6' (Sáb)

    // Verifica se há override manual para esta data
    const override = metas.calendarOverrides[dateStr];
    const isImprodutivo = metas.diasImprodutivos.includes(dateStr);

    if (override) {
      if (override.productive) {
        diasProdutivos++;
        metaHorasTotal += override.hours;
      } else {
        diasFolga++;
      }
    } else if (isImprodutivo) {
      diasFolga++;
    } else {
      // Padrão do dia de semana
      const horasPadrao = metas.horasDisponiveis[diaSemana] || 0;
      if (horasPadrao > 0) {
        diasProdutivos++;
        metaHorasTotal += horasPadrao;
      } else {
        diasFolga++;
      }
    }
  });

  return {
    diasProdutivos,
    diasFolga,
    metaHorasTotal,
  };
}

// Salva e recupera estado do LocalStorage
export const STORAGE_KEY = "CICLO_ESTUDOS_STATE";

export function salvarEstado(state: StudyState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function carregarEstado(defaultState: StudyState): StudyState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Garante retrocompatibilidade se houver novos campos
      if (parsed.edital && parsed.metas) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Erro ao carregar do localStorage:", e);
  }
  return defaultState;
}

export function salvarCiclos(ciclos: CicloEstudo[]) {
  localStorage.setItem("LISTA_CICLOS_ESTUDO", JSON.stringify(ciclos));
}

export function carregarCiclos(defaultState: StudyState): CicloEstudo[] {
  try {
    const listSaved = localStorage.getItem("LISTA_CICLOS_ESTUDO");
    if (listSaved) {
      const parsed = JSON.parse(listSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    
    // Tenta migrar do estado único anterior
    const oldSaved = localStorage.getItem(STORAGE_KEY);
    if (oldSaved) {
      const parsed = JSON.parse(oldSaved);
      if (parsed.edital && parsed.metas) {
        const migrated: CicloEstudo = {
          id: "ciclo_migrated_" + Date.now(),
          orgao: parsed.edital.orgao || "PETROBRAS",
          cargoDesejado: parsed.edital.cargo || "Operação",
          nivel: "Superior",
          state: parsed
        };
        const list = [migrated];
        salvarCiclos(list);
        localStorage.setItem("ACTIVE_CICLO_ID", migrated.id);
        return list;
      }
    }
  } catch (e) {
    console.error("Erro ao carregar lista de ciclos:", e);
  }
  
  // Retorna padrão
  const defaultCycle: CicloEstudo = {
    id: "ciclo_default",
    orgao: defaultState.edital.orgao || "PETROBRAS",
    cargoDesejado: defaultState.edital.cargo || "Operação",
    nivel: "Superior",
    state: defaultState
  };
  const list = [defaultCycle];
  salvarCiclos(list);
  localStorage.setItem("ACTIVE_CICLO_ID", defaultCycle.id);
  return list;
}

// Formata data do formato YYYY-MM-DD para DD/MM
export function formatarDataDDMM(dataStr: string): string {
  if (!dataStr) return "";
  const partes = dataStr.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}`;
  }
  // Se for DD/MM/AAAA
  const partes2 = dataStr.split("/");
  if (partes2.length === 3) {
    return `${partes2[0]}/${partes2[1]}`;
  }
  return dataStr;
}

// Converte arquivo para base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      // Remove o prefixo data:*/*;base64,
      const cleanBase64 = base64String.split(",")[1];
      resolve(cleanBase64);
    };
    reader.onerror = (error) => reject(error);
  });
}
