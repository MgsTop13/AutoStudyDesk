const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');
const path = require('path');

// CONFIGURAÇÕES
const RA = "SEURA";
const DIGITO = "SEUDIGITO";
const SENHA = "SUASENHA";

chromium.use(stealth);

function limparHTML(texto) {
  if (!texto) return '';
  return texto.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

(async () => {
  console.log('🚀 Iniciando extração...\n');

  // Criar pasta output
  if (!fs.existsSync('./output')) fs.mkdirSync('./output');

  const browser = await chromium.launch({
    headless: false, //False para ver o navegador
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();

  // ==========================================
  // ARMAZENAR DADOS
  // ==========================================
  let tarefas = [];
  let questaoAtual = null;
  let respostaAtual = null;

  // Capturar APIs
  page.on('response', async (response) => {
    const url = response.url();
    
    // Lista de tarefas
    if (url.includes('/tms/task/todo') && !url.includes('/count')) {
      try {
        const body = await response.json();
        if (Array.isArray(body) && body[0]?.title) tarefas = body;
      } catch (e) {}
    }
    
    // Questões da tarefa
    if (url.includes('/tms/task/') && !url.includes('/todo') && !url.includes('/count')) {
      try {
        const body = await response.json();
        if (body?.questions) questaoAtual = body;
      } catch (e) {}
    }
    
    // Respostas
    if (url.includes('/tms/answer')) {
      try {
        const body = await response.json();
        if (body?.answers || body?.id) respostaAtual = body;
      } catch (e) {}
    }
  });

  // ==========================================
  // LOGIN
  // ==========================================
  await page.goto('https://saladofuturo.educacao.sp.gov.br/login-alunos');
  await page.waitForTimeout(3000);

  await page.locator('input[type="text"]').first().fill(RA);
  await page.locator('input[type="text"]').nth(1).fill(DIGITO);
  await page.locator('input[type="password"]').first().fill(SENHA);
  await page.locator('button:has-text("Acessar")').first().click();
  
  await page.waitForTimeout(8000);

  // ==========================================
  // IR PARA TAREFAS
  // ==========================================
  await page.goto('https://saladofuturo.educacao.sp.gov.br/tarefas');
  await page.waitForTimeout(8000);

  // ==========================================
  // PROCESSAR CADA TAREFA
  // ==========================================
  const atividades = [];

  for (const tarefa of tarefas) {
    questaoAtual = null;
    respostaAtual = null;

    // Acessar atividade
    await page.goto(`https://saladofuturo.educacao.sp.gov.br/atividade/${tarefa.id}`);
    await page.waitForTimeout(8000);

    if (!questaoAtual?.questions) continue;

    // Filtrar só questões reais
    const questoesReais = questaoAtual.questions.filter(q => q.type !== 'info');

    // Processar questões
    const questoes = questoesReais.map(q => {
      const questao = {
        id: q.id,
        tipo: q.type,
        pergunta: limparHTML(q.statement),
        alternativas: []
      };

      // Alternativas
      if (q.options) {
        questao.alternativas = Object.entries(q.options).map(([i, opt]) => ({
          letra: String.fromCharCode(65 + parseInt(i)),
          id: opt.id,
          texto: limparHTML(opt.statement)
        }));
      }
      return questao;
    });

    // Status
    let status = 'PENDENTE';
    if (respostaAtual?.status === 'finished') status = 'ENTREGUE';
    else if (respostaAtual?.status === 'draft') status = 'RASCUNHO';

    atividades.push({
      id: tarefa.id,
      nome: tarefa.title,
      status: status,
      prazo: tarefa.expire_at,
      totalQuestoes: questoes.length,
      questoes: questoes
    });

    console.log(`✅ ${tarefa.title} - ${questoes.length} questões`);
  }

  // ==========================================
  // SALVAR
  // ==========================================
  const resultado = {
    data: new Date().toISOString(),
    aluno: { ra: RA, digito: DIGITO },
    totalAtividades: atividades.length,
    atividades: atividades
  };

  const filename = `output/atividades-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(resultado, null, 2));

  console.log(`\n💾 Salvo em: ${filename}`);
  console.log(`📊 ${atividades.length} atividades extraídas`);

  await browser.close();
})();