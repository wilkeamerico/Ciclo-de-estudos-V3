import React, { useState, useMemo, useEffect } from "react";
import { StudyState, Disciplina } from "../types";
import { Settings, RefreshCw, Save, Clock, BookOpen, AlertCircle, Info } from "lucide-react";
import { calcularSomaPontos, calcularPesoPercentual, calcularResumoMetas } from "../utils/studyHelpers";

interface PlanningViewProps {
  state: StudyState;
  updateState: (newState: StudyState) => void;
  darkMode: boolean;
}

export default function PlanningView({ state, updateState, darkMode }: PlanningViewProps) {
  const { edital, metas } = state;

  // Calcula soma total de pontos e resumo de horas metas em tempo real
  const somaPontos = useMemo(() => calcularSomaPontos(edital), [edital]);
  const resume = useMemo(() => calcularResumoMetas(metas), [metas]);
  const metaHorasTotal = resume.metaHorasTotal;

  // Real-time calculations for "Cálculo de Horas Totais da Preparação"
  const preparationStats = useMemo(() => {
    const { dataInicial, dataFinal, diasImprodutivos, calendarOverrides, horasDisponiveis } = metas;
    
    // Helper to calculate date range
    const obterDatas = (inicioStr: string, fimStr: string) => {
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
    };

    const datas = obterDatas(dataInicial, dataFinal);
    const totalDias = datas.length;
    let diasImprodutivosCount = 0;
    let folgasSemanaisCount = 0;
    let horasTotaisLiquidas = 0;

    datas.forEach((dateStr) => {
      const dataObj = new Date(dateStr + "T00:00:00");
      const diaSemana = dataObj.getDay().toString(); // '0' (Dom) a '6' (Sáb)

      const override = calendarOverrides[dateStr];
      const isImprodutivo = diasImprodutivos.includes(dateStr);

      if (isImprodutivo) {
        diasImprodutivosCount++;
      } else if (override) {
        if (override.productive) {
          horasTotaisLiquidas += override.hours;
        } else {
          folgasSemanaisCount++;
        }
      } else {
        const horasPadrao = horasDisponiveis[diaSemana] || 0;
        if (horasPadrao > 0) {
          horasTotaisLiquidas += horasPadrao;
        } else {
          folgasSemanaisCount++;
        }
      }
    });

    return {
      totalDias,
      diasImprodutivosCount,
      folgasSemanaisCount,
      horasTotaisLiquidas
    };
  }, [metas]);

  // Flattened list of disciplines with local fields for edits
  const [localDisciplinas, setLocalDisciplinas] = useState<Disciplina[]>([]);

  // Somatória de quantidade de horas por ciclo (bloco)
  const somatoriaHorasPorCiclo = useMemo(() => {
    return localDisciplinas.reduce((acc, d) => acc + (d.horasPorCiclo || 0), 0);
  }, [localDisciplinas]);

  // Quantidade total de ciclos de estudos da preparação
  const qtdeTotalCiclos = useMemo(() => {
    if (somatoriaHorasPorCiclo <= 0) return 0;
    return parseFloat((preparationStats.horasTotaisLiquidas / somatoriaHorasPorCiclo).toFixed(1));
  }, [preparationStats.horasTotaisLiquidas, somatoriaHorasPorCiclo]);

  // Carrega e preenche os campos locais calculados
  useEffect(() => {
    const list: Disciplina[] = [];
    edital.categorias.forEach((cat) => {
      cat.disciplinas.forEach((d) => {
        // Lógica 1: Multiplicar a quantidade de horas totais pela porcentagem de peso por disciplina
        const pesoPercentual = calcularPesoPercentual(d, somaPontos);
        const horasTotaisCalculadas = Math.round(metaHorasTotal * (pesoPercentual / 100));

        // Se já houver um valor salvo, mantém, senão joga o calculado automaticamente
        const horasTotais = d.horasTotais || horasTotaisCalculadas;
        
        // Horas por ciclo padrão (se não configurado, joga 1.5h padrão ou usa a divisão de proporção)
        // Lógica 2: Dividir a quantidade de horas totais dadas pela quantidade de horas totais por disciplina para dar um valor sugerido
        const divisorSugerido = horasTotais > 0 ? parseFloat((metaHorasTotal / horasTotais).toFixed(2)) : 1.5;
        const horasPorCiclo = d.horasPorCiclo || (divisorSugerido > 0 && divisorSugerido < 4 ? divisorSugerido : 1.5);

        // Lógica 3: Calcular a quantidade de ciclos totais
        const ciclosTotais = Math.max(1, Math.round(horasTotais / horasPorCiclo));

        list.push({
          ...d,
          horasTotais,
          horasPorCiclo: parseFloat(horasPorCiclo.toFixed(2)),
          ciclosTotais
        });
      });
    });
    setLocalDisciplinas(list);
  }, [edital, somaPontos, metaHorasTotal]);

  // Atualiza um campo local e recalcula os outros de forma automatizada
  const handleUpdateLocalField = (
    discId: string,
    field: "horasTotais" | "horasPorCiclo",
    val: number
  ) => {
    setLocalDisciplinas((prev) =>
      prev.map((d) => {
        if (d.id === discId) {
          const updated = { ...d, [field]: val };
          
          // Se mudou horasTotais ou horasPorCiclo, recalcula os ciclos totais de forma automatizada
          const hTotais = field === "horasTotais" ? val : (d.horasTotais || 0);
          const hCiclo = field === "horasPorCiclo" ? val : (d.horasPorCiclo || 1.5);
          
          updated.ciclosTotais = hCiclo > 0 ? Math.max(1, Math.round(hTotais / hCiclo)) : 1;
          return updated;
        }
        return d;
      })
    );
  };

  // --- SAVE & SYNC TO OTHER VIEWS ---
  const handleSavePlanning = () => {
    // Sincroniza de volta para a estrutura de Edital global
    const updatedCategorias = edital.categorias.map((cat) => {
      return {
        ...cat,
        disciplinas: cat.disciplinas.map((d) => {
          const localMatch = localDisciplinas.find((ld) => ld.id === d.id);
          if (localMatch) {
            return {
              ...d,
              horasTotais: localMatch.horasTotais,
              horasPorCiclo: localMatch.horasPorCiclo,
              ciclosTotais: localMatch.ciclosTotais
            };
          }
          return d;
        })
      };
    });

    updateState({
      ...state,
      edital: {
        ...edital,
        categorias: updatedCategorias
      }
    });

    alert("Planejamento de blocos e ciclos sincronizado com sucesso para todas as guias!");
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* CÁLCULO DE HORAS TOTAIS DA PREPARAÇÃO */}
      <div className={`p-6 rounded-2xl border transition-colors space-y-5 ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
      }`}>
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 mb-2">
            Sugestão Automática Por Período
          </span>
          <h3 className={`text-lg font-black tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
            Cálculo de Horas Totais da Preparação
          </h3>
          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
            Calculado automaticamente cruzando os dias de estudo, folgas e datas improdutivas indicadas no painel Metas
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Período de estudos */}
          <div className={`p-4 rounded-xl border ${
            darkMode ? "bg-[#16223f] border-[#20325d]" : "bg-gray-50 border-gray-100"
          }`}>
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Período de Estudos
            </span>
            <div className="flex items-baseline mt-1 space-x-1">
              <span className="text-2xl font-black text-blue-500">{preparationStats.totalDias}</span>
              <span className={`text-xs font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>dias</span>
            </div>
          </div>

          {/* Dias improdutivos */}
          <div className={`p-4 rounded-xl border ${
            darkMode ? "bg-[#16223f] border-[#20325d]" : "bg-gray-50 border-gray-100"
          }`}>
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Dias Improdutivos
            </span>
            <div className="flex items-baseline mt-1 space-x-1">
              <span className="text-2xl font-black text-rose-500">{preparationStats.diasImprodutivosCount}</span>
              <span className={`text-xs font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>dias</span>
            </div>
          </div>

          {/* Folgas semanais */}
          <div className={`p-4 rounded-xl border ${
            darkMode ? "bg-[#16223f] border-[#20325d]" : "bg-gray-50 border-gray-100"
          }`}>
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Folgas Semanais
            </span>
            <div className="flex items-baseline mt-1 space-x-1">
              <span className="text-2xl font-black text-amber-500">{preparationStats.folgasSemanaisCount}</span>
              <span className={`text-xs font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>dias</span>
            </div>
          </div>

          {/* Horas totais líquidas */}
          <div className={`p-4 rounded-xl border ${
            darkMode ? "bg-[#16223f] border-[#20325d]" : "bg-[#effaf5] border-emerald-100"
          }`}>
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-emerald-800"}`}>
              Horas Totais Líquidas
            </span>
            <div className="flex items-baseline mt-1 space-x-1">
              <span className="text-2xl font-black text-emerald-500">{preparationStats.horasTotaisLiquidas}</span>
              <span className={`text-xs font-semibold ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>h</span>
            </div>
          </div>

          {/* Quantidade total de ciclos de estudos */}
          <div className={`p-4 rounded-xl border ${
            darkMode ? "bg-[#16223f] border-[#20325d]" : "bg-[#f5f3ff] border-violet-100"
          }`}>
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-violet-800"}`}>
              Total de Ciclos de Estudos
            </span>
            <div className="flex items-baseline mt-1 space-x-1">
              <span className="text-2xl font-black text-violet-500">{qtdeTotalCiclos}</span>
              <span className={`text-xs font-semibold ${darkMode ? "text-violet-400" : "text-violet-600"}`}>ciclos</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRADE DE DISTRIBUIÇÃO */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d] text-white" : "bg-white border-gray-200 shadow-sm text-gray-800"
      }`}>
        <div className="border-b border-gray-100/10 pb-3 mb-4 flex justify-between items-center">
          <h4 className="text-sm font-extrabold uppercase tracking-widest text-blue-500">
            Grade de Distribuição de Carga Horária
          </h4>
          
          <span className={`text-[10px] font-black px-2 py-1 rounded bg-blue-500/10 text-blue-400`}>
            Meta Geral: {metaHorasTotal} Horas Líquidas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[10px] uppercase font-bold tracking-wider border-b border-gray-100/10 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}>
                <th className="py-2.5 px-3">Disciplina / Bloco</th>
                <th className="py-2.5 px-3 text-center">Peso de Pontos (%)</th>
                <th className="py-2.5 px-3 text-center">Disciplina - Em Horas</th>
                <th className="py-2.5 px-3 text-center">Horas por Ciclo (Bloco)</th>
                <th className="py-2.5 px-3 text-center">Ciclos Totais (Dashboard)</th>
              </tr>
            </thead>
            <tbody>
              {localDisciplinas.map((d) => {
                const pesoPercentual = calcularPesoPercentual(d, somaPontos);
                
                return (
                  <tr
                    key={d.id}
                    className={`border-b border-gray-100/5 transition-colors ${
                      darkMode ? "hover:bg-[#152345]/35" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.cor }} />
                        <span className="font-bold text-xs">{d.nome}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center text-xs font-semibold text-gray-400">
                      {pesoPercentual.toFixed(1)}%
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={d.horasTotais || 0}
                        onChange={(e) =>
                          handleUpdateLocalField(d.id, "horasTotais", Math.max(1, parseInt(e.target.value) || 0))
                        }
                        className={`w-20 text-center py-1.5 rounded border text-xs font-bold outline-none ${
                          darkMode
                            ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                            : "bg-white border-gray-200 text-gray-800 focus:border-blue-600"
                        }`}
                      />
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="6"
                        value={d.horasPorCiclo || 1.5}
                        onChange={(e) =>
                          handleUpdateLocalField(d.id, "horasPorCiclo", Math.max(0.5, parseFloat(e.target.value) || 0))
                        }
                        className={`w-20 text-center py-1.5 rounded border text-xs font-bold outline-none ${
                          darkMode
                            ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                            : "bg-white border-gray-200 text-gray-800 focus:border-blue-600"
                        }`}
                      />
                    </td>

                    <td className="py-3 px-3 text-center text-xs font-black text-amber-500">
                      {d.ciclosTotais} ciclos
                    </td>
                  </tr>
                );
              })}

              {localDisciplinas.length === 0 && (
                <tr>
                  <td colSpan={5} className={`text-center py-8 text-xs italic ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Nenhuma disciplina cadastrada na aba Edital para realizar o planejamento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Botão de sincronização */}
        <div className="flex justify-end pt-5 border-t border-gray-100/10">
          <button
            onClick={handleSavePlanning}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/10 transition-all cursor-pointer"
            id="btn-salvar-planejamento"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sincronizar Planejamento</span>
          </button>
        </div>

      </div>

    </div>
  );
}
