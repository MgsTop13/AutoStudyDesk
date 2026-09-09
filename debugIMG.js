const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');

const RA = "111675629";
const DIGITO = "8";
const SENHA = "Novobene@123";

chromium.use(stealth);

(async () => {
  console.log('🔍 MODO DEBUG - Capturando imagens do CAPTCHA\n');
  
  if (!fs.existsSync('./captchas')) fs.mkdirSync('./captchas');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();

  // Login
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
    timeout: 50000
  }).catch(() => {});
  
  await page.waitForTimeout(7000);

  // Ir para tarefas
  await page.goto('https://saladofuturo.educacao.sp.gov.br/tarefas', {
    waitUntil: 'domcontentloaded',
    timeout: 70000
  });
  await page.waitForTimeout(9000);

  // Pegar primeira tarefa
  const linkAtividade = await page.locator('a[href*="/atividade/"]').first();
  


  const idAtividade = await linkAtividade.getAttribute('href');
  console.log(`📖 Atividade: ${idAtividade}`);

  // Acessar atividade com CAPTCHA
  await page.goto(`https://saladofuturo.educacao.sp.gov.br${idAtividade}?enable_captcha=true`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(5000);

  // Clicar no "Não sou robô"
  const botao = await page.locator('text="Não sou um robô"').first();
  if (await botao.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('🖱️ Clicando no "Não sou um robô"...');
    await botao.click();
    await page.waitForTimeout(3000);
  }

  // Capturar 10 CAPTCHAs
  for (let i = 0; i < 10; i++) {
    console.log(`\n📥 CAPTCHA ${i + 1}/10`);
    
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

    const imagemBase64 = challenge.challenge.image;
    const buffer = Buffer.from(imagemBase64, 'base64');
    
    // Salvar imagem
    const filename = `captchas/captcha-${i + 1}-${Date.now()}.png`;
    fs.writeFileSync(filename, buffer);
    
    console.log(`💾 Salvo: ${filename}`);
    console.log(`🆔 Challenge ID: ${challenge.challengeId}`);
    console.log(`📊 Tamanho da imagem: ${imagemBase64.length} caracteres base64`);
    
    // Tirar screenshot da tela também
    await page.screenshot({ path: `captchas/tela-${i + 1}.png` });
    
    await page.waitForTimeout(2000);
  }

  console.log('\n✅ 10 CAPTCHAs salvos!');
  console.log('📂 Abra a pasta "captchas" e veja as imagens!');
  console.log('🔍 Me diga: as letras são legíveis? Tem cores? Distorção?');

  await browser.close();
})();