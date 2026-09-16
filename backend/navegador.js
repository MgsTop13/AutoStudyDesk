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

    // Cria promessa que será resolvida quando as questões vierem
    const promessaQuestoes = new Promise((resolve) => {
      this._promessaQuestoes = resolve;
    });

    await this.page.goto(
      `https://saladofuturo.educacao.sp.gov.br/atividade/${tarefaId}?enable_captcha=true`,
      { waitUntil: "domcontentloaded", timeout: 30000 }
    );

    // ✅ Espera a página carregar e o botão aparecer
    await this.page.waitForTimeout(3000);

    // ✅ Clica em "Não sou um robô" e ESPERA ele sumir
    const botao = await this.page.locator('text="Não sou um robô"').first();
    if (await botao.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('🖱️ Clicando em "Não sou um robô"...');
      await botao.click();

      // ✅ Espera o input do CAPTCHA aparecer (ou o botão sumir)
      await this.page.waitForSelector('input[type="text"]', { timeout: 10000 }).catch(() => { });
      await this.page.waitForTimeout(2000);
    }

    // ✅ Agora sim, pega o CAPTCHA específico da atividade
    await this.pegarCaptcha();
  }


  async pegarCaptcha() {
    // ✅ Pega o CAPTCHA que já está na tela (não gera um novo!)
    const challenge = await this.page.evaluate(async () => {
      const response = await fetch("https://edusp-api.ip.tv/captcha/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "https://saladofuturo.educacao.sp.gov.br",
          "Referer": "https://saladofuturo.educacao.sp.gov.br/"
        },
        body: JSON.stringify({ type: "image", realm: "edusp" })
      });
      return await response.json();
    });

    this.captchaAtual = {
      challengeId: challenge.challengeId,
      imagem: challenge.challenge.image
    };

    return this.captchaAtual;
  }

  async resolverCaptcha(resposta) {
    if (!this.captchaAtual) {
      return { sucesso: false, motivo: "sem_captcha" };
    }

    // ✅ Digita no input (o último input de texto da tela)
    const inputCaptcha = await this.page.locator('input[type="text"]').last();
    if (await inputCaptcha.isVisible({ timeout: 2000 }).catch(() => false)) {
      await inputCaptcha.fill(resposta);
      await this.page.waitForTimeout(500);
    }

    // ✅ Clica em "Avançar"
    const avancarBtn = await this.page.locator('button:has-text("Avançar")').first();
    if (await avancarBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await avancarBtn.click();
      await this.page.waitForTimeout(2000);
    }

    // ✅ Clica em "Confirmar" se aparecer
    const confirmarBtn = await this.page.locator('button:has-text("Confirmar")').first();
    if (await confirmarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmarBtn.click();
      await this.page.waitForTimeout(2000);
    }

    const avancarBtn2 = await this.page.locator('button:has-text("Avançar")').first();
    if (await avancarBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await avancarBtn.click();
      await this.page.waitForTimeout(2000);
    }

    // Espera a API de questões chegar
    const promessaQuestoes = new Promise((resolve) => {
      this._promessaQuestoes = resolve;
    });
    await Promise.race([
      promessaQuestoes,
      new Promise(r => setTimeout(r, 15000))
    ]);

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
