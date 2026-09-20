import { ExamResult } from '../types';

/**
 * Formats a date string into a user-friendly PT-BR format (DD/MM/AAAA)
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('pt-BR');
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

/**
 * Escapes CSV values to handle commas, semicolons, quotes and newlines safely
 */
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports multiple simulados to a .CSV file with UTF-8 BOM for Excel / Google Sheets compatibility
 */
export function exportSimuladosToCSV(history: ExamResult[], filenamePrefix = 'Historico_Simulados'): void {
  if (!history || history.length === 0) {
    alert('Nenhum simulado disponível no histórico para exportar.');
    return;
  }

  // Define headers for Portuguese Excel standard (semicolon separated)
  const headers = [
    'Simulado',
    'Data',
    'Órgão',
    'Cargo',
    'Total Questões',
    'Total Acertos',
    'Total Erros',
    'Em Branco/Anuladas',
    'Pontuação Ponderada',
    'Aproveitamento (%)',
    'Corte Estimado (%)',
    'Nível Competitivo',
    'Detalhamento das Disciplinas',
    'Diagnóstico Geral'
  ];

  const rows: string[] = [];
  rows.push(headers.map(escapeCSV).join(';'));

  history.forEach((exam, idx) => {
    const title = exam.examTitle || `Simulado ${String(idx + 1).padStart(2, '0')}`;
    const date = formatDate(exam.createdAt || exam.date);
    const totalQ = exam.summary.totalQuestions || 0;
    const correct = exam.summary.totalCorrect || 0;
    const wrong = exam.summary.totalWrong || 0;
    const blank = (exam.summary.totalBlank || 0) + (exam.summary.totalAnnulled || 0);
    const weighted = exam.summary.weightedScore !== undefined ? exam.summary.weightedScore.toFixed(1) : correct;
    const percentage = exam.summary.scorePercentage ? exam.summary.scorePercentage.toFixed(1) + '%' : '0%';
    const cutoff = exam.summary.estimatedCutoffScore ? exam.summary.estimatedCutoffScore + '%' : '75%';
    const tier = exam.summary.performanceTier || 'Em Desenvolvimento';
    const diagnosis = exam.summary.generalDiagnosis || '';

    // Extract organ and cargo from title or fallback
    let orgao = 'Geral';
    let cargo = 'Geral';
    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      orgao = parts[0]?.trim() || 'Geral';
      cargo = parts.slice(1).join(' - ').trim() || 'Geral';
    }

    const discSummary = (exam.disciplines || []).map((d) => 
      `${d.discipline}: ${d.correctCount}/${d.totalQuestions} (${d.accuracyPercentage.toFixed(0)}% - Peso ${d.weight || 1})`
    ).join(' | ');

    const row = [
      title,
      date,
      orgao,
      cargo,
      totalQ,
      correct,
      wrong,
      blank,
      weighted,
      percentage,
      cutoff,
      tier,
      discSummary,
      diagnosis
    ];

    rows.push(row.map(escapeCSV).join(';'));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports a single simulado's detailed discipline breakdown to a .CSV file
 */
export function exportSingleExamToCSV(exam: ExamResult): void {
  if (!exam) return;

  const title = exam.examTitle || 'Simulado';
  const date = formatDate(exam.createdAt || exam.date);

  const rows: string[] = [];
  rows.push([`DETALHAMENTO DO SIMULADO - ${title}`, `Data: ${date}`].map(escapeCSV).join(';'));
  rows.push('');

  // General metrics block
  rows.push(['MÉTRICA GERAL', 'VALOR'].map(escapeCSV).join(';'));
  rows.push(['Pontuação Total', `${exam.summary.totalCorrect} / ${exam.summary.totalQuestions} pts`].map(escapeCSV).join(';'));
  rows.push(['Aproveitamento (%)', `${exam.summary.scorePercentage.toFixed(1)}%`].map(escapeCSV).join(';'));
  rows.push(['Total de Acertos', exam.summary.totalCorrect].map(escapeCSV).join(';'));
  rows.push(['Total de Erros', exam.summary.totalWrong].map(escapeCSV).join(';'));
  rows.push(['Em Branco / Anuladas', (exam.summary.totalBlank || 0) + (exam.summary.totalAnnulled || 0)].map(escapeCSV).join(';'));
  rows.push(['Nível Competitivo', exam.summary.performanceTier || 'Geral'].map(escapeCSV).join(';'));
  rows.push('');

  // Discipline breakdown table
  rows.push(['MATÉRIA / DISCIPLINA', 'PESO', 'ACERTOS', 'ERROS', 'TOTAL QUESTÕES', 'PONTUAÇÃO OBTIDA', '% APROVEITAMENTO', 'CLASSIFICAÇÃO'].map(escapeCSV).join(';'));

  (exam.disciplines || []).forEach((d) => {
    let classification = 'REGULAR';
    if (d.accuracyPercentage >= 80) classification = 'ÓTIMO';
    else if (d.accuracyPercentage >= 60) classification = 'BOM';
    else if (d.accuracyPercentage < 40) classification = 'BAIXO';

    const pts = (d.correctCount * (d.weight || 1)).toFixed(1);
    const maxPts = (d.totalQuestions * (d.weight || 1)).toFixed(1);

    rows.push([
      d.discipline,
      d.weight || 1,
      d.correctCount,
      d.wrongCount,
      d.totalQuestions,
      `${pts} / ${maxPts} pts`,
      `${d.accuracyPercentage.toFixed(1)}%`,
      classification
    ].map(escapeCSV).join(';'));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Detalhamento_${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
