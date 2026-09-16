const { chromium } = require('playwright-extra');
const dotenv = require("dotenv");
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');

dotenv.config();

const RA = process.env.ra;
const DIGITO = process.env.digito;
const SENHA = process.env.password;

chromium.use(stealth);

function limparHTML(texto) {
  if (!texto) return '';
  return texto.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

// ==========================================
// FUNÇÃO: Resolver CAPTCHA com 2Captcha
// ==========================================
async function resolverCaptcha2Captcha(imagemBase64) {
  try {
    const API_KEY = process.env.captcha;
    
    console.log('📤 Enviando pro 2Captcha...');
    
    const formData = new URLSearchParams();
    formData.append('key', API_KEY);
    formData.append('method', 'base64');
    formData.append('body', imagemBase64);
    formData.append('json', '1');
    
    const response = await fetch('https://2captcha.com/in.php', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.status !== 1) {
      console.log('❌ Erro 2Captcha:', data.request);
      return '';
    }
    
    const taskId = data.request;
    console.log(`🆔 Task ID: ${taskId}`);
    console.log('⏳ Aguardando resolução...');
    
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 5000));
      
      const checkUrl = `https://2captcha.com/res.php?key=${API_KEY}&action=get&id=${taskId}&json=1`;
      const checkResponse = await fetch(checkUrl);
      const checkData = await checkResponse.json();
      
      if (checkData.status === 1) {
        console.log(`🤖 2Captcha leu: "${checkData.request}"`);
        return checkData.request.toLowerCase().trim();
      }
      
      if (checkData.request !== 'CAPCHA_NOT_READY') {
        console.log('❌ Erro:', checkData.request);
        return '';
      }
      
      console.log(`⏳ Aguardando... (${i + 1}/30)`);
    }
    
    console.log('❌ Timeout no 2Captcha');
    return '';
    
  } catch (e) {
    console.log('❌ Erro no 2Captcha:', e.message);
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
    
    console.log('🔐 Resolvendo CAPTCHA...');
    
    let sucesso = false;
    
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      console.log(`\n🔄 Tentativa ${tentativa + 1}/3`);

      const captcha = await pegarImagemCaptcha(page);
      if (!captcha) continue;

      const resposta = await resolverCaptcha2Captcha(captcha.imagemBase64);
      if (!resposta) continue;

      const verify = await verificarCaptcha(page, captcha.challengeId, resposta);
      if (!verify?.valid) {
        console.log('❌ CAPTCHA incorreto');
        continue;
      }
      
      console.log(`⌨️ Digitando "${resposta}" no input...`);
      
      const inputCaptcha = await page.locator('input[type="text"]').last();
      
      if (await inputCaptcha.isVisible({ timeout: 3000 }).catch(() => false)) {
        await inputCaptcha.fill(resposta);
        await page.waitForTimeout(1000);
        console.log('✅ Código digitado!');
      } else {
        console.log('⚠️ Input não encontrado! Procurando...');
        
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
      
      // Botão Avançar
      console.log('🖱️ Clicando em Avançar...');
      const avancarBtn = await page.locator('button:has-text("Avançar")').first();
      
      if (await avancarBtn.isEnabled().catch(() => false)) {
        await avancarBtn.click();
        console.log('✅ Clicou em Avançar!');
        await page.waitForTimeout(3000);
      } else {
        console.log('⏳ Botão Avançar desabilitado, aguardando...');
        await page.waitForTimeout(5000);
      }
      
      // Botão Confirmar
      const confirmarBtn = await page.locator('button:has-text("Confirmar")').first();
      
      if (await confirmarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('🖱️ Clicando em Confirmar...');
        await confirmarBtn.click();
        console.log('✅ Clicou em Confirmar!');
        await page.waitForTimeout(5000);
      }
      
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

  const filename = `output/atividades-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify({ atividades }, null, 2));
  
  console.log(`💾 ${filename}`);
  console.log(`📊 ${atividades.length} atividades`);

  await browser.close();
  console.log('✅ Finalizado!');
})();