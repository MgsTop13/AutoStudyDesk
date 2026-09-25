// utils/limpar.js

export function limparHTML(texto) {
  if (!texto) return '';
  if (typeof texto !== 'string') texto = String(texto);
  return texto
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function limparQuestoesParaIA(questoesAPI) {
  if (!questoesAPI?.questions) return null;

  const questoesReais = questoesAPI.questions.filter(q => q.type !== 'info');

  return {
    tarefaId: questoesAPI.id,
    titulo: questoesAPI.title,
    descricao: limparHTML(questoesAPI.description) || '',
    totalQuestoes: questoesReais.length,
    questoes: questoesReais.map((q, index) => {
      const base = {
        ordem: index + 1,
        id: q.id,
        tipo: q.type,
        pontos: q.score,
        pergunta: limparHTML(q.statement)
      };

      if (q.type === 'single' && q.options) {
        base.opcoes = Object.entries(q.options).map(([idx, opt]) => ({
          letra: String.fromCharCode(65 + parseInt(idx)),
          id: opt.id,
          texto: limparHTML(opt.statement)
        }));
      }

      if (q.type === 'multi' && q.options) {
        base.opcoes = Object.entries(q.options).map(([idx, opt]) => ({
          letra: String.fromCharCode(65 + parseInt(idx)),
          id: opt.id,
          texto: limparHTML(opt.statement)
        }));
      }

      if (q.type === 'fill-words' && q.options) {
        base.banco = q.options.items;
        base.lacunas = q.options.phrase.filter(p => p.type === 'select').length;
        base.frase = q.options.phrase.map(p =>
          p.type === 'text' ? p.value : '___'
        ).join('');
      }

      if (q.type === 'order-sentences' && q.options) {
        base.frases = q.options.sentences.map((f, i) => ({
          posicao: i + 1,
          id: q.options.incorrects?.[i]?.id || null,
          texto: f
        }));
      }

      if (q.type === 'text_ai') {
        base.palavrasChave = q.options?.ai_grading_keywords || [];
        base.maxChars = q.options?.max_text_count || 2000;
      }

      return base;
    })
  };
}