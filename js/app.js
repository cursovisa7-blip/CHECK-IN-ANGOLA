(() => {
  const tickets = [
    { title: "Box 10 Pax", price: 30000, max: 10 },
    { title: "Vip Frente de Palco", price: 15000, max: 10 },
    { title: "Normal", price: 10000, max: 10 },
    { title: "Promocional", price: 5000, max: 10 },
  ];
  const quantities = [0, 0, 0, 0];
  const money = value => `${value.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;
  const buttons = [...document.querySelectorAll("aside article")].map(article => [...article.querySelectorAll("button")]);
  const totalNodes = [...document.querySelectorAll("aside strong")];

  function total() { return quantities.reduce((sum, quantity, i) => sum + quantity * tickets[i].price, 0); }
  function refresh() {
    const value = total();
    buttons.forEach((pair, i) => {
      pair[0].nextElementSibling.textContent = quantities[i];
      pair[0].closest("article").querySelector("strong").textContent = money(quantities[i] * tickets[i].price);
      pair[0].disabled = quantities[i] === 0;
      pair[1].disabled = quantities[i] === tickets[i].max;
    });
    totalNodes.forEach(node => { if (node.closest("aside")) node.textContent = money(value); });
    document.querySelectorAll("aside button").forEach(button => {
      if (button.textContent.trim() === "Gerar Pagamento") button.disabled = value === 0;
    });
  }
  function modal() {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.5)";
    wrapper.innerHTML = `<div style="width:100%;max-width:400px;border-radius:16px;background:var(--card,#fff);padding:20px;box-shadow:0 20px 50px #0004"><h2 style="margin:0 0 6px">Dados do comprador</h2><p style="margin:0 0 16px;color:var(--muted-foreground)">Preencha os dados para gerar o pagamento.</p><form><label>Nome completo *<input name="name" required style="display:block;width:100%;box-sizing:border-box;margin:5px 0 12px;padding:10px;border:1px solid var(--border);border-radius:8px"></label><label>Telefone *<input name="phone" required type="tel" style="display:block;width:100%;box-sizing:border-box;margin:5px 0 12px;padding:10px;border:1px solid var(--border);border-radius:8px"></label><label>Email (opcional)<input name="email" type="email" style="display:block;width:100%;box-sizing:border-box;margin:5px 0 16px;padding:10px;border:1px solid var(--border);border-radius:8px"></label><p class="checkout-error" style="color:var(--destructive);font-size:12px"></p><div style="display:flex;gap:8px"><button type="button" class="cancel" style="flex:1;padding:10px">Cancelar</button><button type="submit" style="flex:1;padding:10px;background:var(--primary);color:var(--primary-foreground);border:0;border-radius:8px">Gerar Pagamento</button></div></form></div>`;
    document.body.appendChild(wrapper);
    wrapper.querySelector(".cancel").onclick = () => wrapper.remove();
    wrapper.querySelector("form").onsubmit = async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const submit = event.currentTarget.querySelector("[type=submit]");
      submit.disabled = true; submit.textContent = "A registar...";
      try {
        const selected = tickets.map((ticket, i) => ({ ticket, quantity: quantities[i] })).filter(item => item.quantity);
        for (const item of selected) {
          const response = await fetch("https://venderatesangrar2.vercel.app/api/external/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: ["c20ab80c-65ce-4b10-8dda-96dfebdb0a21", "d62e816e-6d42-4123-a255-ce5f8ef90cc8", "0c97d960-2bd9-4bb5-bd95-eba341959a33", "20a382ac-9795-4818-ad08-9b10fdcd7d4a"][tickets.indexOf(item.ticket)], buyerName: form.get("name"), buyerPhone: form.get("phone"), buyerEmail: form.get("email") || null, amount: item.quantity * item.ticket.price, quantity: item.quantity }) });
          const result = await response.json();
          if (!result.success) throw new Error(result.error || "Não foi possível registar a venda.");
        }
        wrapper.querySelector("div").innerHTML = `<h2>Referência de pagamento</h2><p>Use os dados abaixo no Multicaixa Express ou ATM.</p><div style="padding:14px;border:1px solid var(--border);border-radius:10px"><p>Entidade: <strong>10116</strong></p><p>Referência: <strong>951504994</strong></p><p>Valor: <strong>${money(total())}</strong></p></div><button class="copy" style="width:100%;margin-top:12px;padding:10px">Copiar dados</button><button class="done" style="width:100%;margin-top:8px;padding:10px">Concluído</button>`;
        wrapper.querySelector(".copy").onclick = () => navigator.clipboard?.writeText(`Entidade: 10116\nReferência: 951504994\nValor: ${money(total())}`);
        wrapper.querySelector(".done").onclick = () => wrapper.remove();
      } catch (error) { submit.disabled = false; submit.textContent = "Gerar Pagamento"; wrapper.querySelector(".checkout-error").textContent = error.message || "Erro de rede. Tente novamente."; }
    };
  }
  buttons.forEach((pair, i) => { pair[0].onclick = () => { quantities[i] = Math.max(0, quantities[i] - 1); refresh(); }; pair[1].onclick = () => { quantities[i] = Math.min(tickets[i].max, quantities[i] + 1); refresh(); }; });
  document.querySelectorAll("aside button").forEach(button => { if (button.textContent.trim() === "Gerar Pagamento") button.onclick = modal; });
  refresh();
})();
