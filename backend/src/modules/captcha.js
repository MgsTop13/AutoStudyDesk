export class CaptchaManager {
  constructor(page) {
    this.page = page;
    this.captchaAtual = null;
    this.questoesAPI = null;
    this._promessaQuestoes = null;
  }

  setPromessaQuestoes(resolve) {
    this._promessaQuestoes = resolve;
  }

  _handleQuestoesResponse(response) {
    const url = response.url();
    if (url.includes("/tms/task/") && !url.includes("/todo") && !url.includes("/count")) {
      response.json().then(body => {
        if (body?.questions) {
          this.questoesAPI = body;
          if (this._promessaQuestoes) this._promessaQuestoes(body);
        }
      }).catch(() => { });
    }
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

    const confirmarBtn = this.page.locator('button:has-text("Confirmar")').first();
    if (await confirmarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmarBtn.click();
      await this.page.waitForTimeout(2000);
    }

    const avancarBtn = this.page.locator('button:has-text("Avançar")').first();
    if (await avancarBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await avancarBtn.click();
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

  getQuestoesAPI() {
    return this.questoesAPI;
  }
}