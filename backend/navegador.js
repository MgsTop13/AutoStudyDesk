import { TuningJobState } from "@google/genai";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";

chromium.use(stealth());

class Navegador {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.browser = null;
    this.page = null;
    this.listaTarefas = [];
    this.questoesAPI = null;
    this.captchaAtual = null;

    // Dados de sessão (preenchidos no login)
    this.authToken = null;
    this.sedToken = null;
    this.pubTargets = [];
    this.codigoAluno = null;
    this.aluno = null;
    this.sedCookies = "";
    this.userAgent = "";

    // Promises para sincronizar
    this._promessaLogin = null;
    this._promessaTarefas = null;
    this._promessaQuestoes = null;
  }

  async iniciar() {
    this.browser = await chromium.launch({
      headless: false,
      args: ["--disable-blink-features=AutomationControlled"]
    });
    this.page = await this.browser.newPage();
    this._setupListeners();
  }

  _setupListeners() {
    // Bloquear rastreadores
    this.page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.includes("dynatrace") || url.includes("google-analytics") || url.includes("clarity")) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Capturar respostas das APIs
    this.page.on("response", async (response) => {
      const url = response.url();

      // Login completo (pega token, sedToken, pubTargets)
      if (url.includes("LoginCompletoToken") || url.includes("/login")) {
        try {
          const body = await response.json();
          this._processarLogin(body);
          if (this._promessaLogin) this._promessaLogin(body);
        } catch (e) { }
      }

      // Lista de tarefas
      if (url.includes("/tms/task/todo") && !url.includes("/count")) {
        try {
          const body = await response.json();
          if (Array.isArray(body) && body[0]?.title) {
            this.listaTarefas = body;
            if (this._promessaTarefas) this._promessaTarefas(body);
          }
        } catch (e) { }
      }

      // Questões da tarefa
      if (url.includes("/tms/task/") && !url.includes("/todo") && !url.includes("/count")) {
        try {
          const body = await response.json();
          if (body?.questions) {
            this.questoesAPI = body;
            if (this._promessaQuestoes) this._promessaQuestoes(body);
          }
        } catch (e) { }
      }
    });
  }

  _processarLogin(body) {
    // Extrai dados do login
    if (body.token) this.authToken = body.token;
    if (body.sedToken) this.sedToken = body.sedToken;
    if (body.sedCookies) this.sedCookies = body.sedCookies;
    if (body.codigoAluno) this.codigoAluno = body.codigoAluno;
    if (body.pubTargets) this.pubTargets = body.pubTargets;
    console.log(body)
    // Dados do aluno (formato pode variar)
    this.aluno = body.aluno || {
      nome: body.nome,
      ra: body.ra,
      turma: body.turma,
      escola: body.escola
    };
  }


  async login(ra, digito, senha) {
    await this.page.goto("https://saladofuturo.educacao.sp.gov.br/login-alunos", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await this.page.waitForSelector('input[type="text"]', { timeout: 15000 });
    await this.page.waitForTimeout(2000);

    await this.page.locator('input[type="text"]').first().fill(ra);
    await this.page.locator('input[type="text"]').nth(1).fill(digito);
    await this.page.locator('input[type="password"]').first().fill(senha);
    await this.page.locator('button:has-text("Acessar")').first().click();

    await this.page.waitForFunction(() => !window.location.href.includes("/login"), {
      timeout: 30000
    }).catch(() => { });

    await this.page.waitForTimeout(10000);
    return { sucesso: true };
  }

  async buscarTarefas() {
    // Cria promessa que será resolvida quando a API de tarefas responder
    const promessaTarefas = new Promise((resolve) => {
      this._promessaTarefas = resolve;
    });

    await this.page.goto("https://saladofuturo.educacao.sp.gov.br/tarefas", {
      waitUntil: "domcontentloaded",
      timeout: 50000
    });

    // Espera a API responder OU timeout
    await Promise.race([
      promessaTarefas,
      new Promise(r => setTimeout(r, 10000))
    ]);

    return this.listaTarefas;
  }

  async abrirTarefa(tarefaId) {
  this.questoesAPI = null;
  this.captchaAtual = null;

  const promessaQuestoes = new Promise((resolve) => {
    this._promessaQuestoes = resolve;
  });

  await this.page.goto(
    `https://saladofuturo.educacao.sp.gov.br/atividade/${tarefaId}?enable_captcha=true`,
    { waitUntil: "domcontentloaded", timeout: 30000 }
  );

  await this.page.waitForTimeout(3000);

  const botao = this.page.locator('text="Não sou um robô"').first();
  if (await botao.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('🖱️ Clicando em "Não sou um robô"...');
    await botao.click();
  }

  // ⏳ espera o <img> com src blob aparecer E carregar
  await this.page.waitForFunction(() => {
    const img = document.querySelector('img.MuiCardMedia-img');
    return img && img.src.startsWith('blob:') && img.complete && img.naturalWidth > 0;
  }, { timeout: 20000 });

  // 📥 Lê o blob e converte pra data URL, tudo dentro do browser
  const imagemBase64 = await this.page.evaluate(async () => {
    const img = document.querySelector('img.MuiCardMedia-img');
    if (!img) return null;

    const resp = await fetch(img.src);
    const blob = await resp.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result); // "data:image/png;base64,..."
      reader.readAsDataURL(blob);
    });
  });

  if (!imagemBase64) {
    throw new Error("Captcha não encontrado na tela");
  }

  this.captchaAtual = { imagem: imagemBase64 };

  return this.captchaAtual;
}


  async pegarCaptcha() {
  // Só devolve o captcha que JÁ foi lido da tela em abrirTarefa().
  // NÃO chama API. NÃO gera novo. NÃO sobrescreve nada.
  if (!this.captchaAtual) {
    throw new Error("Nenhum captcha carregado. Chame abrirTarefa() antes.");
  }
  return this.captchaAtual;
}

  async resolverCaptcha(resposta) {
  if (!this.captchaAtual) return { sucesso: false, motivo: "sem_captcha" };

  const inputCaptcha = this.page.locator('input[type="text"]').last();
  if (await inputCaptcha.isVisible({ timeout: 2000 }).catch(() => false)) {
    await inputCaptcha.fill(resposta);
    await this.page.waitForTimeout(500);
  }

  const avancarBtn = this.page.locator('button:has-text("Avançar")').first();
  if (await avancarBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
    await avancarBtn.click();
    await this.page.waitForTimeout(2000);
  }

  const confirmarBtn = this.page.locator('button:has-text("Confirmar")').first();
  if (await confirmarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmarBtn.click();
    await this.page.waitForTimeout(2000);
  }

  const promessaQuestoes = new Promise((resolve) => {
    this._promessaQuestoes = resolve;
  });
  await Promise.race([promessaQuestoes, new Promise(r => setTimeout(r, 15000))]);

  return {
    sucesso: !!this.questoesAPI?.questions,
    questoes: this.questoesAPI
  };
}


  async fechar() {
    if (this.browser) await this.browser.close();
  }
}

export default Navegador;
