import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";

chromium.use(stealth());

export class BrowserManager {
  constructor() {
    this.browser = null;
    this.page = null;
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
  }

  getPage() {
    return this.page;
  }

  async fechar() {
    if (this.browser) await this.browser.close();
  }
}