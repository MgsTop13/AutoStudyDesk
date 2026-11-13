export class AnswersManager {
  constructor(page, getQuestoesAPI) {
    this.page = page;
    this.getQuestoesAPI = getQuestoesAPI;
  }

  async preencherRespostas(respostas) {
    const resultados = [];
    console.log("CHEGOU", respostas);
    const questoesAPI = this.getQuestoesAPI();

    for (const r of respostas) {
      const questao = questoesAPI.questions.find(q => q.id === r.id);
      if (!questao) {
        resultados.push({ id: r.id, ok: false, motivo: "questao_nao_encontrada" });
        continue;
      }

      try {
        const container = this.page.locator(`[chave*="${r.id}"]`).first();

        // SINGLE (radio, value = índice)
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

        // MULTI (checkbox, ID = índice)
        else if (r.tipo === 'multi') {
          const letras = Array.isArray(r.valor) ? r.valor : [r.valor];

          for (const letra of letras) {
            const idx = letra.charCodeAt(0) - 65;

            const checkbox = container.locator(`input[type="checkbox"][id="${idx}"]`);

            if (await checkbox.count() > 0) {
              await checkbox.first().check({ force: true });
              await this.page.waitForTimeout(200);
              console.log(`   ✓ ${letra} marcada`);
            } else {
              console.log(`   ❌ Checkbox ${letra} (id=${idx}) não encontrado`);
            }
          }
          resultados.push({ id: r.id, ok: true });
          console.log(`✅ Q${questao.order} (multi) → ${letras.join(',')}`);
        }

        // TRUE-FALSE (radio, value = true/false)
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

        // TEXT_AI (textarea)
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

        // FILL-WORDS (MUI Select + data-value)
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

        // ORDER-SENTENCES (TODO)
        else if (r.tipo === 'order-sentences') {
          console.log(`⚠️ Q${questao.order}: order-sentences ainda não implementado`);
          resultados.push({ id: r.id, ok: false, motivo: "nao_implementado" });
        }

        const avancarBtn = this.page.locator('button:has-text("Salvar Rascunho")').first();
        if (await avancarBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
          await avancarBtn.click();
          await this.page.waitForTimeout(2000);
        }

      } catch (e) {
        console.log(`❌ Erro na Q${questao.order}:`, e.message);
        resultados.push({ id: r.id, ok: false, motivo: e.message });
      }
    }

    return resultados;
  }
}