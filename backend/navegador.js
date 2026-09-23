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

    this.authToken = null;
    this.sedToken = null;
    this.pubTargets = [];
    this.codigoAluno = null;
    this.aluno = null;
    this.sedCookies = "";
    this.userAgent = "";

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
    this.page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.includes("dynatrace") || url.includes("google-analytics") || url.includes("clarity")) {
        route.abort();
      } else {
        route.continue();
      }
    });

    this.page.on("response", async (response) => {
      const url = response.url();

      if (url.includes("LoginCompletoToken") || url.includes("/login")) {
        try {
          const body = await response.json();
          this._processarLogin(body);
          if (this._promessaLogin) this._promessaLogin(body);
        } catch (e) { }
      }

      if (url.includes("/tms/task/todo") && !url.includes("/count")) {
        try {
          const body = await response.json();
          if (Array.isArray(body) && body[0]?.title) {
            this.listaTarefas = body;
            if (this._promessaTarefas) this._promessaTarefas(body);
          }
        } catch (e) { }
      }

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
    if (body.token) this.authToken = body.token;
    if (body.sedToken) this.sedToken = body.sedToken;
    if (body.sedCookies) this.sedCookies = body.sedCookies;
    if (body.codigoAluno) this.codigoAluno = body.codigoAluno;
    if (body.pubTargets) this.pubTargets = body.pubTargets;

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
    const promessaTarefas = new Promise((resolve) => {
      this._promessaTarefas = resolve;
    });

    await this.page.goto("https://saladofuturo.educacao.sp.gov.br/tarefas", {
      waitUntil: "domcontentloaded",
      timeout: 50000
    });

    await Promise.race([
      promessaTarefas,
      new Promise(r => setTimeout(r, 10000))
    ]);

    return this.listaTarefas;
  }

  async abrirTarefa(tarefaId) {
    this.questoesAPI = null;
    this.captchaAtual = null;

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

    // Espera o <img> com src blob carregar
    await this.page.waitForFunction(() => {
      const img = document.querySelector('img.MuiCardMedia-img');
      return img && img.src.startsWith('blob:') && img.complete && img.naturalWidth > 0;
    }, { timeout: 20000 });

    // Lê o blob como base64
    const imagemBase64 = await this.page.evaluate(async () => {
      const img = document.querySelector('img.MuiCardMedia-img');
      if (!img) return null;

      const resp = await fetch(img.src);
      const blob = await resp.blob();

      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    });

    if (!imagemBase64) throw new Error("Captcha não encontrado na tela");

    this.captchaAtual = { imagem: imagemBase64 };
    return this.captchaAtual;
  }

  async pegarCaptcha() {
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

  // ==========================================
  // PREENCHER RESPOSTAS
  // ==========================================
  async preencherRespostas(respostas) {
    const resultados = [];

    for (const r of respostas) {
      const questao = this.questoesAPI.questions.find(q => q.id === r.id);
      if (!questao) {
        resultados.push({ id: r.id, ok: false, motivo: "questao_nao_encontrada" });
        continue;
      }

      try {
        const container = this.page.locator(`[chave*="${r.id}"]`).first();

        // ==========================================
        // SINGLE (radio, value = índice)
        // ==========================================
        if (r.tipo === 'single') {
          const idx = r.valor.charCodeAt(0) - 65;
          const radio = container.locator(`input[type="radio"][value="${idx}"]`);

          if (await radio.count() > 0) {
            await radio.first().check({ force: true });
            await this.page.waitForTimeout(200);
            resultados.push({ id: r.id, ok: true });
            console.log(`✅ Q${questao.order} (single) → ${r.valor}`);
          } else {
            resultados.push({ id: r.id, ok: false, motivo: `radio_${idx}_nao_encontrado` });
            console.log(`❌ Q${questao.order}: radio não encontrado`);
          }
        }

        // ==========================================
        // MULTI (checkbox, ID = índice) ← CORRIGIDO
        // ==========================================
        else if (r.tipo === 'multi') {
          const letras = Array.isArray(r.valor) ? r.valor : [r.valor];

          for (const letra of letras) {
            const idx = letra.charCodeAt(0) - 65;

            // ✅ MUI Checkbox: ID do input é o índice
            const checkbox = container.locator(`input[type="checkbox"]#${idx}`);

            if (await checkbox.count() > 0) {
              await checkbox.first().check({ force: true });
              await this.page.waitForTimeout(200);
              console.log(`   ✓ ${letra} marcada`);
            } else {
              // Fallback: tenta por value
              const cbFallback = container.locator(`input[type="checkbox"][value="${idx}"]`);
              if (await cbFallback.count() > 0) {
                await cbFallback.first().check({ force: true });
                await this.page.waitForTimeout(200);
                console.log(`   ✓ ${letra} marcada (fallback)`);
              } else {
                console.log(`   ❌ Checkbox ${letra} (id=${idx}) não encontrado`);
              }
            }
          }
          resultados.push({ id: r.id, ok: true });
          console.log(`✅ Q${questao.order} (multi) → ${letras.join(',')}`);
        }

        // ==========================================
        // TRUE-FALSE (radio, value = true/false)
        // ==========================================
        else if (r.tipo === 'true-false') {
          const valores = r.valor;
          const grupos = await container.locator('[role="radiogroup"]').all();

          for (let i = 0; i < Math.min(grupos.length, valores.length); i++) {
            const valor = valores[i];
            const radio = grupos[i].locator(`input[type="radio"][value="${valor}"]`);

            if (await radio.count() > 0) {
              await radio.first().check({ force: true });
              await this.page.waitForTimeout(150);
            }
          }
          resultados.push({ id: r.id, ok: true });
          console.log(`✅ Q${questao.order} (true-false) → ${valores.join(',')}`);
        }

        // ==========================================
        // TEXT_AI (textarea)
        // ==========================================
        else if (r.tipo === 'text_ai') {
          const textarea = container.locator('textarea[placeholder="Responder"]').first();

          if (await textarea.count() > 0) {
            await textarea.fill(r.valor);
            resultados.push({ id: r.id, ok: true });
            console.log(`✅ Q${questao.order} (text_ai) → ${r.valor.substring(0, 50)}...`);
          } else {
            resultados.push({ id: r.id, ok: false, motivo: "textarea_nao_encontrado" });
          }
        }

        // ==========================================
        // FILL-WORDS (MUI Select + data-value)
        // ==========================================
        else if (r.tipo === 'fill-words') {
          const palavras = r.valor;
          const combos = await container.locator('[role="combobox"]').all();

          console.log(`📝 Q${questao.order} fill-words: ${combos.length} lacunas, ${palavras.length} palavras`);

          for (let i = 0; i < Math.min(combos.length, palavras.length); i++) {
            const palavra = palavras[i];

            // 1. Clica no combobox
            await combos[i].click();
            await this.page.waitForTimeout(500);

            // 2. Clica na opção pelo data-value
            const opcao = this.page.locator(`li[role="option"][data-value="${palavra}"]`).first();

            if (await opcao.count() > 0) {
              await opcao.click();
              await this.page.waitForTimeout(300);
            } else {
              console.log(`   ⚠️ Opção "${palavra}" não achada por data-value, tentando texto`);
              const opcaoTexto = this.page.locator(`li[role="option"]:has-text("${palavra}")`).first();
              if (await opcaoTexto.count() > 0) {
                await opcaoTexto.click();
                await this.page.waitForTimeout(300);
              }
            }
          }
          resultados.push({ id: r.id, ok: true });
          console.log(`✅ Q${questao.order} (fill-words) → ${palavras.join(', ')}`);
        }

        // ==========================================
        // ORDER-SENTENCES (TODO)
        // ==========================================
        else if (r.tipo === 'order-sentences') {
          console.log(`⚠️ Q${questao.order}: order-sentences ainda não implementado`);
          resultados.push({ id: r.id, ok: false, motivo: "nao_implementado" });
        }

      } catch (e) {
        console.log(`❌ Erro na Q${questao.order}:`, e.message);
        resultados.push({ id: r.id, ok: false, motivo: e.message });
      }
    }

    return resultados;
  }

  async fechar() {
    if (this.browser) await this.browser.close();
  }
}

export default Navegador;