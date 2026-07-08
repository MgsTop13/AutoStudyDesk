const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURAÇÕES
// ==========================================
const CONFIG = {
  credenciais: {
    ra: "SEURA",
    digito: "SEUDIGITO",
    senha: "SUASENHA"
  },
  urls: {
    login: 'https://saladofuturo.educacao.sp.gov.br/login-alunos',
    tarefas: 'https://saladofuturo.educacao.sp.gov.br/tarefas'
  },
  browser: {
    headless: true,  // Mude para false se quiser ver o navegador
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    timeout: 30000
  }
};

chromium.use(stealth);

// ==========================================
// FUNÇÃO PARA LIMPAR HTML
// ==========================================
function limparHTML(texto) {
  if (!texto) return '';
  return texto
    .replace(/<[^>]*>/g, '')           // Remove tags HTML
    .replace(/&nbsp;/g, ' ')           // Substitui &nbsp;
    .replace(/&amp;/g, '&')            // Substitui &amp;
    .replace(/&lt;/g, '<')             // Substitui &lt;
    .replace(/&gt;/g, '>')             // Substitui &gt;
    .replace(/&quot;/g, '"')           // Substitui &quot;
    .replace(/&#39;/g, "'")            // Substitui &#39;
    .replace(/\s+/g, ' ')              // Remove espaços múltiplos
    .replace(/^>\s*/, '')              // Remove ">" do início
    .trim();
}

// ==========================================
// FUNÇÃO PRINCIPAL
// ==========================================
(async () => {
  console.log('🎓 SALA DO FUTURO - EXTRATOR DE ATIVIDADES\n');
  console.log(`👤 Aluno: ${CONFIG.credenciais.ra}-${CONFIG.credenciais.digito}\n`);

  // Criar pasta output
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: CONFIG.browser.headless,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: CONFIG.browser.viewport,
    userAgent: CONFIG.browser.userAgent
  });

  const page = await context.newPage();

  // ==========================================
  // ARMAZENAR DADOS
  // ==========================================
  let listaTarefas = [];
  let detalhesTarefaAtual = null;
  let respostaAtual = null;

  // Capturar respostas da API
  page.on('response', async (response) => {
    const url = response.url();
    
    // Lista de tarefas
    if (url.includes('/tms/task/todo') && !url.includes('/count')) {
      try {
        const body = await response.json();
        if (Array.isArray(body) && body.length > 0 && body[0].title) {
          listaTarefas = body;
          console.log(`📋 ${body.length} tarefas encontradas na API`);
        }
      } catch (e) {}
    }
    
    // Detalhes da tarefa (questões)
    if (url.includes('/tms/task/') && !url.includes('/todo') && !url.includes('/count') && response.request().method() === 'GET') {
      try {
        const body = await response.json();
        if (body && body.questions) {
          detalhesTarefaAtual = body;
        }
      } catch (e) {}
    }
    
    // Respostas do aluno
    if (url.includes('/tms/answer') && response.request().method() === 'GET') {
      try {
        const body = await response.json();
        if (body && (body.answers || body.id)) {
          respostaAtual = body;
        }
      } catch (e) {}
    }
  });

  // ==========================================
  // LOGIN
  // ==========================================
  console.log('🔐 Fazendo login...');
  
  await page.goto(CONFIG.urls.login, {
    waitUntil: 'domcontentloaded',
    timeout: CONFIG.browser.timeout
  });

  await page.waitForTimeout(3000);

  await page.locator('input[type="text"]').first().fill(CONFIG.credenciais.ra);
  await page.locator('input[type="text"]').nth(1).fill(CONFIG.credenciais.digito);
  await page.locator('input[type="password"]').first().fill(CONFIG.credenciais.senha);
  
  await page.locator('button:has-text("Acessar"), button[type="submit"]').first().click();

  console.log('⏳ Aguardando login...');
  await page.waitForTimeout(10000);

  // ==========================================
  // NAVEGAR PARA TAREFAS
  // ==========================================
  console.log('🧭 Indo para /tarefas...');
  
  await page.goto(CONFIG.urls.tarefas, {
    waitUntil: 'domcontentloaded',
    timeout: CONFIG.browser.timeout
  });

  await page.waitForTimeout(10000);

  // ==========================================
  // PROCESSAR CADA TAREFA
  // ==========================================
  const atividades = [];

  for (let i = 0; i < listaTarefas.length; i++) {
    const tarefa = listaTarefas[i];
    const tarefaId = tarefa.id;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📖 [${i + 1}/${listaTarefas.length}] ${tarefa.title}`);
    console.log(`   ID: ${tarefaId}`);
    
    // Resetar
    detalhesTarefaAtual = null;
    respostaAtual = null;
    
    // Acessar atividade
    const atividadeUrl = `https://saladofuturo.educacao.sp.gov.br/atividade/${tarefaId}`;
    
    try {
      await page.goto(atividadeUrl, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.browser.timeout
      });
      
      console.log('⏳ Carregando questões e respostas...');
      await page.waitForTimeout(10000);
      
      if (detalhesTarefaAtual && detalhesTarefaAtual.questions) {
        const todasQuestoes = detalhesTarefaAtual.questions;
        
        // Filtrar apenas questões reais (ignorar "info")
        const questoesReais = todasQuestoes.filter(q => q.type !== 'info');
        
        console.log(`✅ ${questoesReais.length} questões carregadas`);
        
        // Processar questões
        const questoes = questoesReais.map(q => {
          // Dados básicos da questão
          const questao = {
            id: q.id,
            ordem: q.order,
            tipo: q.type, // "single", "true-false", "text_ai"
            pergunta: limparHTML(q.statement),
            respostaAluno: null,
            alternativas: []
          };
          
          // Processar alternativas (se existirem)
          if (q.options) {
            if (q.type === 'single') {
              // Múltipla escolha
              questao.alternativas = Object.entries(q.options).map(([indice, opt]) => ({
                letra: String.fromCharCode(65 + parseInt(indice)),
                id: opt.id,
                texto: limparHTML(opt.statement)
              }));
            } else if (q.type === 'true-false') {
              // Verdadeiro/Falso
              questao.alternativas = Object.entries(q.options).map(([indice, opt]) => ({
                letra: String.fromCharCode(65 + parseInt(indice)),
                id: opt.id,
                texto: limparHTML(opt.statement),
                tipo: 'Verdadeiro/Falso'
              }));
            }
          }
          
          // Buscar resposta do aluno
          if (respostaAtual?.answers) {
            const resp = respostaAtual.answers.find(a => a.question_id === q.id);
            
            if (resp) {
              if (q.type === 'single') {
                // Encontrar qual alternativa foi selecionada
                const opcaoEscolhida = Object.entries(q.options).find(([indice, opt]) => 
                  opt.id === resp.answer
                );
                
                if (opcaoEscolhida) {
                  questao.respostaAluno = {
                    letra: String.fromCharCode(65 + parseInt(opcaoEscolhida[0])),
                    id: opcaoEscolhida[1].id,
                    texto: limparHTML(opcaoEscolhida[1].statement)
                  };
                }
              } else if (q.type === 'true-false') {
                // Verdadeiro/Falso
                questao.respostaAluno = Object.entries(q.options).map(([indice, opt]) => {
                  const valor = resp.answer?.[opt.id];
                  return {
                    letra: String.fromCharCode(65 + parseInt(indice)),
                    id: opt.id,
                    texto: limparHTML(opt.statement).substring(0, 100),
                    resposta: valor === true ? 'VERDADEIRO' : 
                              valor === false ? 'FALSO' : 'NÃO_RESPONDIDO'
                  };
                });
              } else if (q.type === 'text_ai') {
                // Dissertativa
                questao.respostaAluno = {
                  texto: resp.answer || '',
                  palavrasChave: q.options?.ai_grading_keywords || []
                };
              }
            }
          }
          
          return questao;
        });
        
        // Status da atividade
        let status = 'PENDENTE';
        if (respostaAtual) {
          if (respostaAtual.status === 'finished') status = 'ENTREGUE';
          else if (respostaAtual.status === 'draft') status = 'RASCUNHO';
        }
        
        // Montar objeto da atividade
        const atividade = {
          id: tarefaId,
          nome: tarefa.title,
          descricao: tarefa.description ? limparHTML(tarefa.description) : '',
          tipo: tarefa.is_essay ? 'DISSERTATIVA' : 'OBJETIVA',
          status: status,
          prazo: tarefa.expire_at,
          dataEntrega: respostaAtual?.delivered_at || null,
          totalQuestoes: questoes.length,
          questoes: questoes
        };
        
        atividades.push(atividade);
        
        // Log resumido
        const respondidas = atividade.questoesRespondidas;
        const pendentes = atividade.totalQuestoes - respondidas;
        console.log(`📊 ${respondidas} respondidas | ${pendentes} pendentes | Status: ${status}`);
        
      } else {
        console.log('   ❌ Questões não carregaram');
        atividades.push({
          id: tarefaId,
          nome: tarefa.title || 'Sem título',
          descricao: '',
          tipo: 'OBJETIVA',
          status: 'ERRO',
          pontuacaoTotal: 0,
          pontuacaoAluno: null,
          prazo: null,
          dataEntrega: null,
          dataGabarito: null,
          totalQuestoes: 0,
          questoesRespondidas: 0,
          questoes: []
        });
      }
      
    } catch (e) {
      console.log(`   ❌ Erro: ${e.message}`);
      atividades.push({
        id: tarefaId,
        nome: tarefa.title || 'Sem título',
        descricao: '',
        tipo: 'OBJETIVA',
        status: 'ERRO',
        pontuacaoTotal: 0,
        pontuacaoAluno: null,
        prazo: null,
        dataEntrega: null,
        dataGabarito: null,
        totalQuestoes: 0,
        questoesRespondidas: 0,
        questoes: []
      });
    }
  }

  // ==========================================
  // SALVAR RESULTADO
  // ==========================================
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const resultado = {
    dataExtracao: new Date().toISOString(),
    aluno: {
      ra: CONFIG.credenciais.ra,
      digito: CONFIG.credenciais.digito
    },
    resumo: {
      totalAtividades: atividades.length,
      totalQuestoes: atividades.reduce((s, a) => s + a.totalQuestoes, 0),
      atividadesEntregues: atividades.filter(a => a.status === 'ENTREGUE').length,
      atividadesPendentes: atividades.filter(a => a.status === 'PENDENTE' || a.status === 'RASCUNHO').length
    },
    atividades: atividades
  };

  // Salvar JSON
  const filename = `atividades-${timestamp}.json`;
  fs.writeFileSync(
    path.join(outputDir, filename),
    JSON.stringify(resultado, null, 2)
  );

  // ==========================================
  // RELATÓRIO FINAL
  // ==========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL');
  console.log('='.repeat(60));
  console.log(`📚 Total de atividades: ${resultado.resumo.totalAtividades}`);
  console.log(`✅ Entregues: ${resultado.resumo.atividadesEntregues}`);
  console.log(`❌ Pendentes: ${resultado.resumo.atividadesPendentes}`);
  console.log(`📝 Total de questões: ${resultado.resumo.totalQuestoes}`);
  console.log(`\n💾 Arquivo salvo: output/${filename}`);

  // Detalhamento
  atividades.forEach((atv, i) => {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`${i + 1}. ${atv.nome}`);
    console.log(`   🆔 ID: ${atv.id}`);
    console.log(`   📌 Status: ${atv.status}`);
    console.log(`   📝 Questões: ${atv.totalQuestoes} (${atv.questoesRespondidas} respondidas)`);
    console.log(`   🏆 Pontuação: ${atv.pontuacaoAluno || 'N/A'}/${atv.pontuacaoTotal}`);
    
    if (atv.prazo) {
      console.log(`   ⏰ Prazo: ${new Date(atv.prazo).toLocaleString('pt-BR')}`);
    }
    
    if (atv.questoes.length > 0) {
      console.log(`\n   📋 Questões:`);
      atv.questoes.forEach(q => {
        const temResposta = q.respostaAluno !== null ? '✅' : '❌';
        console.log(`   ${temResposta} Q${q.ordem} [${q.tipo}] ${q.pergunta.substring(0, 80)}...`);
        
        if (q.respostaAluno) {
          if (Array.isArray(q.respostaAluno)) {
            // True-false
            q.respostaAluno.forEach(r => {
              console.log(`      ${r.letra}) ${r.resposta}: ${r.texto.substring(0, 60)}...`);
            });
          } else if (q.respostaAluno.texto) {
            // Dissertativa
            console.log(`      ✍️ ${q.respostaAluno.texto.substring(0, 100)}...`);
          } else {
            // Múltipla escolha
            console.log(`      🎯 ${q.respostaAluno.letra}) ${q.respostaAluno.texto.substring(0, 80)}...`);
          }
        }
      });
    }
  });

  console.log('\n✅ Extração concluída com sucesso!');
})();