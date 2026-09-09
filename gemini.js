const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const RA = "111675629";
const DIGITO = "8";
const SENHA = "Novobene@123";

// ==========================================
// CONFIGURAÇÃO DO GEMINI (GRÁTIS)
// ==========================================
const GEMINI_API_KEY = 'KAKAAKKAKKAK'; // Pegar em: https://aistudio.google.com

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });


chromium.use(stealth);

function limparHTML(texto) {
  if (!texto) return '';
  return texto.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

// ==========================================
// FUNÇÃO: Resolver CAPTCHA via Gemini
// ==========================================
async function resolverCaptchaGemini(imagemBase64) {
  try {
    const prompt = 'Leia os caracteres desta imagem de CAPTCHA. Responda SOMENTE com os caracteres, sem espaços, sem explicações.';
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: imagemBase64
        }
      }
    ]);
    
    const resposta = result.response.text().toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    console.log(`🤖 Gemini leu: "${resposta}"`);
    return resposta;
  } catch (e) {
    console.log('❌ Erro no Gemini:', e.message);
    return '';
  }
}

async function pegarImagemCaptcha(page) {
  try {
    console.log('📥 Solicitando CAPTCHA...');
    
    const challenge = await page.evaluate(async () => {
      const response = await fetch('https://edusp-api.ip.tv/captcha/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://saladofuturo.educacao.sp.gov.br',
          'Referer': 'https://saladofuturo.educacao.sp.gov.br/'
        },
        body: JSON.stringify({ type: 'image', realm: 'edusp' })
      });
      return await response.json();
    });
    
    return {
      challengeId: challenge.challengeId,
      imagemBase64: challenge.challenge.image
    };
  } catch (e) {
    console.log('❌ Erro:', e.message);
    return null;
  }
}

async function verificarCaptcha(page, challengeId, resposta) {
  try {
    const verify = await page.evaluate(async ({ challengeId, resposta }) => {
      const response = await fetch('https://edusp-api.ip.tv/captcha/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://saladofuturo.educacao.sp.gov.br',
          'Referer': 'https://saladofuturo.educacao.sp.gov.br/'
        },
        body: JSON.stringify({
          realm: 'edusp',
          type: 'image',
          payload: {
            challengeId: challengeId,
            answer: resposta
          }
        })
      });
      return await response.json();
    }, { challengeId, resposta });
    
    return verify;
  } catch (e) {
    return null;
  }
}


// ==========================================
// FUNÇÃO PRINCIPAL
// ==========================================
(async () => {
  console.log('🚀 Iniciando...\n');
  if (!fs.existsSync('./output')) fs.mkdirSync('./output');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();

  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('dynatrace') || url.includes('google-analytics')) {
      route.abort();
    } else {
      route.continue();
    }
  });

  let listaTarefas = [];
  let questoesAPI = null;

  page.on('response', async (response) => {
    const url = response.url();
    
    if (url.includes('/tms/task/todo') && !url.includes('/count')) {
      try {
        const body = await response.json();
        if (Array.isArray(body) && body[0]?.title) listaTarefas = body;
      } catch (e) {}
    }
    
    if (url.includes('/tms/task/') && !url.includes('/todo') && !url.includes('/count')) {
      try {
        const body = await response.json();
        if (body?.questions) questoesAPI = body;
      } catch (e) {}
    }
  });

  console.log('🔐 Login...');
  
  await page.goto('https://saladofuturo.educacao.sp.gov.br/login-alunos', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForSelector('input[type="text"]', { timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.locator('input[type="text"]').first().fill(RA);
  await page.locator('input[type="text"]').nth(1).fill(DIGITO);
  await page.locator('input[type="password"]').first().fill(SENHA);
  await page.locator('button:has-text("Acessar")').first().click();

  await page.waitForFunction(() => !window.location.href.includes('/login'), {
    timeout: 30000
  }).catch(() => {});
  
  await page.waitForTimeout(6000);

  console.log('🧭 Indo para /tarefas...');
  
  await page.goto('https://saladofuturo.educacao.sp.gov.br/tarefas', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  
  await page.waitForTimeout(10000);

  if (listaTarefas.length === 0) {
    console.log('❌ Nenhuma tarefa!');
    await browser.close();
    return;
  }

  const atividades = [];

  for (const tarefa of listaTarefas) {
    questoesAPI = null;
    
    console.log(`\n📖 ${tarefa.title}`);
    
    const urlAtividade = `https://saladofuturo.educacao.sp.gov.br/atividade/${tarefa.id}?enable_captcha=true`;
    
    await page.goto(urlAtividade, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await page.waitForTimeout(5000);
    
const botao = await page.locator('text="Não sou um robô"').first();
    if (await botao.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('🖱️ Clicando no "Não sou um robô"...');
      await botao.click();
      await page.waitForTimeout(3000);
    }
    
    // ==========================================
    // FLUXO COMPLETO DO CAPTCHA
    // ==========================================
    console.log('🔐 Resolvendo CAPTCHA...');
    
    let sucesso = false;
    
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      console.log(`\n🔄 Tentativa ${tentativa + 1}/3`);
      
      // 1. Pegar imagem do CAPTCHA
      const captcha = await pegarImagemCaptcha(page);
      if (!captcha) continue;
      
      // 2. Resolver com Gemini
      const resposta = await resolverCaptchaGemini(captcha.imagemBase64);
      if (!resposta) continue;
      
      // 3. DIGITAR NO INPUT
      console.log(`⌨️ Digitando "${resposta}" no input...`);
      
      const inputCaptcha = await page.locator('input[type="text"]').last();
      
      if (await inputCaptcha.isVisible({ timeout: 3000 }).catch(() => false)) {
        await inputCaptcha.fill(resposta);
        await page.waitForTimeout(1000);
        console.log('✅ Código digitado!');
      } else {
        console.log('⚠️ Input não encontrado! Procurando...');
        
        // Tentar outros seletores
        const inputs = await page.locator('input').all();
        for (const input of inputs) {
          const type = await input.getAttribute('type');
          if (type === 'text' || type === 'password') {
            await input.fill(resposta);
            await page.waitForTimeout(1000);
            console.log('✅ Código digitado!');
            break;
          }
        }
      }
      
      // 4. Clicar em Avançar
      console.log('🖱️ Clicando em Avançar...');
      
      const avancarBtn = await page.locator('button:has-text("Confirmar")').first();
      
      if (await avancarBtn.isEnabled().catch(() => false)) {
        await avancarBtn.click();
        console.log('✅ Clicou em Avançar!');
        await page.waitForTimeout(3000);
      } else {
        console.log('⏳ Botão Avançar desabilitado, aguardando...');
        await page.waitForTimeout(5000);
      }
      
      // 5. Clicar em Confirmar (se aparecer)
      const confirmarBtn = await page.locator('button:has-text("Avançar")').first();
      
      if (await confirmarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('🖱️ Clicando em Confirmar...');
        await confirmarBtn.click();
        console.log('✅ Clicou em Confirmar!');
        await page.waitForTimeout(5000);
      }
      
      // 6. Verificar se carregou as questões
      if (questoesAPI?.questions) {
        sucesso = true;
        break;
      }
      
      console.log('⚠️ Ainda não carregou, tentando novamente...');
      await page.waitForTimeout(2000);
    }
    
    if (!sucesso) {
      console.log('   ❌ Falha no CAPTCHA após 3 tentativas\n');
      continue;
    }
    
    await page.waitForTimeout(10000);
    
    if (!questoesAPI?.questions) {
      console.log('   ⚠️ Questões não carregaram\n');
      continue;
    }

    const questoes = questoesAPI.questions
      .filter(q => q.type !== 'info')
      .map(q => ({
        id: q.id,
        ordem: q.order,
        tipo: q.type,
        pergunta: limparHTML(q.statement),
        alternativas: q.options ? Object.entries(q.options).map(([i, opt]) => ({
          letra: String.fromCharCode(65 + parseInt(i)),
          id: opt.id,
          texto: limparHTML(opt.statement)
        })) : []
      }));

    atividades.push({
      materia: tarefa.tags?.[1] || '',
      nome: tarefa.title,
      id: tarefa.id,
      questoes
    });

    console.log(`   ✅ ${questoes.length} questões\n`);
  }

  const resultado = { atividades };
  const filename = `output/atividades-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(resultado, null, 2));
  
  console.log(`💾 ${filename}`);
  console.log(`📊 ${atividades.length} atividades`);

  await browser.close();
  console.log('✅ Finalizado!');
})();