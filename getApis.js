const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');
const path = require('path');
const config = require('./config');

chromium.use(stealth);

(async () => {
  console.log('🔍 Capturando APIs e dados...\n');

  // Criar pasta output se não existir
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: config.browser.headless,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: config.browser.viewport,
    userAgent: config.browser.userAgent
  });

  const page = await context.newPage();

  // Armazenar dados capturados
  const apisCapturadas = [];

  // Interceptar respostas
  page.on('response', async (response) => {
    const url = response.url();
    
    // Verificar se é um endpoint que queremos
    const temDados = config.endpointsDados.some(endpoint => url.includes(endpoint));
    const temTarefas = config.endpointsTarefas.some(endpoint => url.includes(endpoint));
    
    if (temDados || temTarefas) {
      try {
        const contentType = response.headers()['content-type'] || '';
        
        let body;
        if (contentType.includes('application/json')) {
          body = await response.json();
        } else {
          body = await response.text();
        }
        
        if (body && JSON.stringify(body).length > 10) {
          const nomeEndpoint = url.split('/').pop()?.split('?')[0] || 'desconhecido';
          
          apisCapturadas.push({
            endpoint: nomeEndpoint,
            url: url,
            status: response.status(),
            tipo: temTarefas ? 'tarefas' : 'dados',
            dados: body
          });
          
          console.log(`✅ ${response.status()} | ${nomeEndpoint}`);
        }
      } catch (e) {
        // Ignorar erros de parsing
      }
    }
  });

  // Login
  console.log('🔐 Fazendo login...');
  await page.goto(config.urls.login, {
    waitUntil: 'domcontentloaded',
    timeout: config.browser.timeout
  });

  await page.waitForTimeout(3000);

  await page.locator('input[type="text"]').first().fill(config.credenciais.ra);
  await page.locator('input[type="text"]').nth(1).fill(config.credenciais.digito);
  await page.locator('input[type="password"]').first().fill(config.credenciais.senha);
  
  await page.locator('button:has-text("Acessar"), button[type="submit"]').first().click();

  console.log('⏳ Aguardando carregamento dos dados...');
  await page.waitForTimeout(4500);

  // Navegar para tarefas também
  console.log('📚 Navegando para tarefas...');
  await page.goto(config.urls.tarefas, {
    waitUntil: 'domcontentloaded',
    timeout: config.browser.timeout
  }).catch(() => {});

  await page.waitForTimeout(8000);

  // Capturar cookies e localStorage
  const cookies = await context.cookies();
  const localStorage = await page.evaluate(() => {
    let items = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      items[key] = localStorage.getItem(key);
    }
    return items;
  });

    await page.waitForTimeout(25000);

  // Salvar tudo
  const resultado = {
    dataHora: new Date().toISOString(),
    totalApis: apisCapturadas.length,
    credenciais: {
      ra: config.credenciais.ra,
      digito: config.credenciais.digito
    },
    cookies: cookies,
    localStorage: localStorage,
    apis: apisCapturadas
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `apis-capturadas-${timestamp}.json`;
  
  fs.writeFileSync(
    path.join(outputDir, filename),
    JSON.stringify(resultado, null, 2)
  );

  console.log(`\n✨ Capturadas ${apisCapturadas.length} APIs`);
  console.log(`💾 Salvo em: output/${filename}`);
  
  // Listar endpoints encontrados
  console.log('\n📋 Endpoints capturados:');
  apisCapturadas.forEach((api, i) => {
    console.log(`  ${i + 1}. [${api.tipo}] ${api.endpoint} (${api.status})`);
  });

  console.log('\n✅ Finalizado!');
})();