// ============================================================
// Check-in.ao — Página de Evento com Integração de Checkout
// ============================================================
// ATENÇÃO: Antes de ir a produção, actualiza o campo `productId`
// de cada bilhete abaixo com os IDs reais da tua plataforma.
// ============================================================

import{i as e,n as t,r as n,t as r}from"./index-DLeEhvFr.js";
var i=e(n()),a=t();

// ── Configuração de bilhetes ──────────────────────────────────
// productId = UUID real de cada produto na plataforma interna
const TICKETS = [
  {
    id: 4426,
    productId: "c20ab80c-65ce-4b10-8dda-96dfebdb0a21", // ingresso30 — 30 000 Kz
    title: "Box 10 Pax",
    note: "Inclui: Bebidas Frescas + Sessão de Fotos",
    price: 30000,
    max: 10,
    availability: "Resta 12",
    limited: true,
  },
  {
    id: 4425,
    productId: "d62e816e-6d42-4123-a255-ce5f8ef90cc8", // ingresso15 — 15 000 Kz
    title: "Vip Frente de Palco",
    note: "Vip Frente de Palco",
    price: 15000,
    max: 10,
    availability: "Disponível",
    limited: false,
  },
  {
    id: 4424,
    productId: "0c97d960-2bd9-4bb5-bd95-eba341959a33", // ingresso10 — 10 000 Kz
    title: "Normal",
    note: "Área Normal",
    price: 10000,
    max: 10,
    availability: "Disponível",
    limited: false,
  },
  {
    id: 4423,
    productId: "20a382ac-9795-4818-ad08-9b10fdcd7d4a", // ingresso5  —  5 000 Kz
    title: "Promocional",
    note: "Bilhete promocional",
    price: 5000,
    max: 10,
    availability: "Disponível",
    limited: false,
  },
];

// ── Dados de pagamento Multicaixa ─────────────────────────────
const ENTIDADE   = "10116";
const REFERENCIA = "951504994";

// ── Endpoint da plataforma interna ───────────────────────────
const API_URL = "https://venderatesangrar2.vercel.app/api/external/checkout";

// ── Formatação de moeda (Kwanzas) ─────────────────────────────
const fmt = (v) =>
  `${v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;

// ════════════════════════════════════════════════════════════
// Componente principal
// ════════════════════════════════════════════════════════════
export function c() {
  // Quantidades seleccionadas { ticketId: qty }
  const [quantities, setQuantities] = (0, i.useState)({});
  // Drawer de resumo mobile
  const [mobileOpen, setMobileOpen] = (0, i.useState)(false);

  // Passo do modal:  null | "form" | "loading" | "ref"
  const [step, setStep] = (0, i.useState)(null);

  // Dados do formulário do comprador
  const [form, setForm] = (0, i.useState)({ name: "", phone: "", email: "" });
  const [errors, setErrors] = (0, i.useState)({});

  // Estado da API
  const [apiError, setApiError] = (0, i.useState)(null);

  // Campo copiado (feedback visual)
  const [copied, setCopied] = (0, i.useState)(null);

  // Comprovativo de pagamento
  const [comprovativo, setComprovativo] = (0, i.useState)(null);

  // Refs
  const fileRef   = (0, i.useRef)(null);
  const copyTimer = (0, i.useRef)(null);

  // Cleanup de timers ao desmontar
  (0, i.useEffect)(() => () => {
    copyTimer.current && clearTimeout(copyTimer.current);
  }, []);

  // ── Totais calculados ─────────────────────────────────────
  const { total, count } = (0, i.useMemo)(() => {
    let total = 0, count = 0;
    for (const t of TICKETS) {
      const qty = quantities[t.id] ?? 0;
      total += qty * t.price;
      count += qty;
    }
    return { total, count };
  }, [quantities]);

  // ── Ajusta quantidade de um bilhete ──────────────────────
  function adjust(ticket, delta) {
    setQuantities((prev) => {
      const next = Math.min(ticket.max, Math.max(0, (prev[ticket.id] ?? 0) + delta));
      return { ...prev, [ticket.id]: next };
    });
  }

  // ── Copia texto para clipboard ────────────────────────────
  async function copyText(field, text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.top = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(field);
      copyTimer.current && clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  // ── Validação do formulário ───────────────────────────────
  function validate() {
    const errs = {};
    if (!form.name.trim())  errs.name  = "Nome obrigatório";
    if (!form.phone.trim()) errs.phone = "Telefone obrigatório";
    return errs;
  }

  // ── Submissão: chama API e avança para referência ─────────
  async function handleSubmit(ev) {
    ev.preventDefault();

    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setApiError(null);
    setStep("loading");

    // Bilhetes com quantidade > 0
    const selected = TICKETS.filter((t) => (quantities[t.id] ?? 0) > 0);

    for (const ticket of selected) {
      const qty = quantities[ticket.id];
      const payload = {
        productId:  ticket.productId,
        buyerName:  form.name.trim(),
        buyerPhone: form.phone.trim(),
        buyerEmail: form.email.trim() || null,
        amount:     qty * ticket.price,   // valor inteiro em Kz
        quantity:   qty,
      };

      try {
        const res  = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!data.success) {
          setApiError(data.error || "Erro ao registar a venda. Tente novamente.");
          setStep("form");
          return;
        }
        // data.saleId está disponível se necessário: console.log("saleId:", data.saleId);
      } catch {
        setApiError("Erro de rede. Verifique a sua ligação e tente novamente.");
        setStep("form");
        return;
      }
    }

    // Tudo OK → mostra referência de pagamento
    setStep("ref");
  }

  // ── Fecha e reseta o modal completamente ──────────────────
  function closeModal() {
    setStep(null);
    setApiError(null);
    setCopied(null);
    setComprovativo(null);
    setForm({ name: "", phone: "", email: "" });
    setErrors({});
  }

  // ── Abre o modal de pagamento ─────────────────────────────
  function openPayment() {
    if (count === 0) return;
    setStep("form");
  }

  // ════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════
  return (0, a.jsxs)("div", {
    className: "min-h-screen bg-background pb-40 lg:pb-16",
    children: [

      // ─── Header ───────────────────────────────────────────
      (0, a.jsx)("header", {
        className: "sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur",
        children: (0, a.jsxs)("div", {
          className: "mx-auto flex h-14 max-w-6xl items-center justify-between px-4",
          children: [
            (0, a.jsxs)("span", {
              className: "text-lg font-extrabold tracking-tight text-primary",
              children: [
                "Check-in",
                (0, a.jsx)("span", { className: "text-foreground", children: ".ao" }),
              ],
            }),
            (0, a.jsxs)("nav", {
              className: "hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex",
              children: [
                (0, a.jsx)("span", { className: "text-primary", children: "Eventos" }),
                (0, a.jsx)("span", { children: "Loja" }),
                (0, a.jsx)("span", { children: "Carrinho" }),
              ],
            }),
            (0, a.jsx)("button", {
              className: "rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground",
              children: "Entrar",
            }),
          ],
        }),
      }),

      // ─── Main ─────────────────────────────────────────────
      (0, a.jsxs)("main", {
        className: "mx-auto max-w-6xl px-4 py-6",
        children: [
          (0, a.jsxs)("div", {
            className: "grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]",
            children: [

              // Coluna esquerda
              (0, a.jsxs)("div", {
                className: "space-y-6",
                children: [

                  // Título + data
                  (0, a.jsxs)("div", {
                    children: [
                      (0, a.jsx)("h1", {
                        className: "text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl",
                        children: "Grande Show Anderson Mário",
                      }),
                      (0, a.jsxs)("div", {
                        className: "mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground",
                        children: [
                          (0, a.jsx)("time", {
                            dateTime: "2026-09-26 21:00",
                            children: "26 set 2026 · 21:00 – 27 set 2026 · 01:00",
                          }),
                          (0, a.jsx)("span", {
                            className: "rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground",
                            children: "Show",
                          }),
                        ],
                      }),
                    ],
                  }),

                  // Cartaz
                  (0, a.jsx)("figure", {
                    className: "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
                    children: (0, a.jsx)("img", {
                      src: r,
                      alt: "Cartaz do Grande Show Anderson Mário",
                      className: "w-full object-cover",
                      loading: "eager",
                    }),
                  }),

                  // Resumo
                  (0, a.jsxs)("section", {
                    className: "rounded-2xl border border-border bg-card p-4 shadow-sm",
                    children: [
                      (0, a.jsx)("h2", { className: "text-base font-bold text-foreground", children: "Resumo" }),
                      (0, a.jsxs)("div", {
                        className: "mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground",
                        children: [
                          (0, a.jsx)("p", { children: "Grande Show Anderson Mário e convidados." }),
                          (0, a.jsx)("p", { children: "Com a participação de: Yasmine, Pérola, Calema E Chelsea Dinorath" }),
                        ],
                      }),
                    ],
                  }),

                  // Localização
                  (0, a.jsxs)("section", {
                    className: "rounded-2xl border border-border bg-card p-4 shadow-sm",
                    children: [
                      (0, a.jsx)("h2", { className: "text-base font-bold text-foreground", children: "Localização" }),
                      (0, a.jsx)("p", { className: "mt-2 text-sm font-medium text-foreground", children: "Espaço Restinga - Ilha de Luanda" }),
                      (0, a.jsx)("p", { className: "text-sm text-muted-foreground", children: "Luanda, Luanda - Angola" }),
                      (0, a.jsx)("div", {
                        className: "mt-3 overflow-hidden rounded-xl border border-border",
                        children: (0, a.jsx)("iframe", {
                          src: "https://maps.google.com/maps?q=-8.801431%2C13.222501&z=15&output=embed",
                          title: "Localização do evento",
                          loading: "lazy",
                          className: "h-64 w-full",
                          referrerPolicy: "no-referrer-when-downgrade",
                        }),
                      }),
                    ],
                  }),
                ],
              }),

              // ─── Coluna direita — painel de bilhetes ──────
              (0, a.jsx)("aside", {
                className: "lg:sticky lg:top-20 lg:self-start",
                children: (0, a.jsxs)("section", {
                  className: "rounded-2xl border border-border bg-card p-4 shadow-sm",
                  children: [

                    (0, a.jsxs)("div", {
                      className: "flex items-baseline justify-between",
                      children: [
                        (0, a.jsx)("h2", { className: "text-base font-bold text-foreground", children: "Bilhetes" }),
                        (0, a.jsx)("span", { className: "text-sm font-semibold text-primary", children: "A partir de 5 000,00 Kz" }),
                      ],
                    }),

                    // Lista de bilhetes
                    (0, a.jsx)("div", {
                      className: "mt-4 space-y-3",
                      children: TICKETS.map((ticket) =>
                        (0, a.jsxs)("article", {
                          className: "rounded-xl border border-border p-3 transition-colors hover:border-primary/40",
                          children: [
                            (0, a.jsx)("h3", { className: "text-sm font-bold text-foreground", children: ticket.title }),
                            (0, a.jsx)("p", { className: "text-xs text-muted-foreground", children: ticket.note }),
                            (0, a.jsxs)("div", {
                              className: "mt-2 flex items-center gap-2 text-xs",
                              children: [
                                (0, a.jsx)("span", { className: "font-semibold text-foreground", children: fmt(ticket.price) }),
                                (0, a.jsx)("span", {
                                  className: ticket.limited
                                    ? "rounded-full bg-warning/15 px-2 py-0.5 font-medium text-warning"
                                    : "rounded-full bg-success/15 px-2 py-0.5 font-medium text-success",
                                  children: ticket.availability,
                                }),
                              ],
                            }),
                            (0, a.jsxs)("div", {
                              className: "mt-3 flex items-center justify-between",
                              children: [
                                (0, a.jsxs)("div", {
                                  className: "flex items-center gap-3",
                                  children: [
                                    (0, a.jsx)(QtyBtn, { onClick: () => adjust(ticket, -1), label: "Diminuir", children: "−" }),
                                    (0, a.jsx)("span", { className: "w-5 text-center text-sm font-semibold", children: quantities[ticket.id] ?? 0 }),
                                    (0, a.jsx)(QtyBtn, { onClick: () => adjust(ticket, 1),  label: "Aumentar", children: "+" }),
                                  ],
                                }),
                                (0, a.jsx)("strong", {
                                  className: "text-sm text-foreground",
                                  children: fmt((quantities[ticket.id] ?? 0) * ticket.price),
                                }),
                              ],
                            }),
                          ],
                        }, ticket.id)
                      ),
                    }),

                    // Resumo de preços
                    (0, a.jsxs)("div", {
                      className: "mt-4 space-y-1.5 border-t border-border pt-4 text-sm",
                      children: [
                        (0, a.jsx)(SummaryRow, { label: "Bilhetes",   value: fmt(total) }),
                        (0, a.jsx)(SummaryRow, { label: "Extras",     value: fmt(0) }),
                        (0, a.jsx)(SummaryRow, { label: "Adicionais", value: fmt(0) }),
                        (0, a.jsxs)("div", {
                          className: "flex items-center justify-between border-t border-border pt-2 text-base font-bold",
                          children: [
                            (0, a.jsx)("span", { children: "Total" }),
                            (0, a.jsx)("span", { children: fmt(total) }),
                          ],
                        }),
                      ],
                    }),

                    // Botão principal
                    (0, a.jsx)("button", {
                      onClick: openPayment,
                      disabled: count === 0,
                      className: "mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
                      children: "Gerar Pagamento",
                    }),
                  ],
                }),
              }),
            ],
          }),

          // Detalhes do evento
          (0, a.jsx)("section", {
            className: "mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm",
            children: (0, a.jsxs)("dl", {
              className: "grid grid-cols-1 gap-4 text-sm sm:grid-cols-3",
              children: [
                (0, a.jsx)(DetailItem, { label: "Duração",        value: "240 min" }),
                (0, a.jsx)(DetailItem, { label: "Classificação",  value: "M/12" }),
                (0, a.jsx)(DetailItem, { label: "Organizador",    value: "LS Republicano e Aurio Gama" }),
              ],
            }),
          }),
        ],
      }),

      // ─── Barra flutuante mobile ────────────────────────────
      count > 0 && (0, a.jsxs)("aside", {
        className: "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] lg:hidden",
        children: [
          (0, a.jsxs)("button", {
            onClick: () => setMobileOpen((v) => !v),
            className: "flex w-full items-center justify-between text-left",
            children: [
              (0, a.jsxs)("span", {
                children: [
                  (0, a.jsx)("span", { className: "block text-sm font-semibold text-foreground", children: "Resumo da compra" }),
                  (0, a.jsxs)("small", { className: "text-xs text-muted-foreground", children: [count, " Bilhetes"] }),
                ],
              }),
              (0, a.jsx)("strong", { className: "text-sm text-foreground", children: fmt(total) }),
            ],
          }),
          mobileOpen && (0, a.jsx)("div", {
            className: "mt-3 space-y-1 border-t border-border pt-3 text-sm",
            children: TICKETS
              .filter((t) => (quantities[t.id] ?? 0) > 0)
              .map((t) =>
                (0, a.jsx)(SummaryRow, {
                  label: `${quantities[t.id]} × ${t.title}`,
                  value: fmt((quantities[t.id] ?? 0) * t.price),
                }, t.id)
              ),
          }),
          (0, a.jsx)("button", {
            onClick: openPayment,
            className: "mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground",
            children: "Gerar Pagamento",
          }),
        ],
      }),

      // ════════════════════════════════════════════════════
      // Modal de pagamento
      // ════════════════════════════════════════════════════
      step !== null && (0, a.jsx)("div", {
        className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
        role: "dialog",
        "aria-modal": "true",
        children: (0, a.jsx)("div", {
          className: "w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl",
          children:

            // ── Passo: a carregar ──────────────────────────
            step === "loading" ? (
              (0, a.jsxs)("div", {
                className: "flex flex-col items-center py-8 text-center",
                children: [
                  (0, a.jsx)("span", {
                    "aria-hidden": "true",
                    className: "h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary",
                  }),
                  (0, a.jsx)("p", { className: "mt-4 text-sm font-semibold text-foreground",    children: "A registar a venda…" }),
                  (0, a.jsx)("p", { className: "mt-1 text-xs text-muted-foreground",             children: "Aguarde um momento." }),
                ],
              })

            // ── Passo: formulário do comprador ────────────
            ) : step === "form" ? (
              (0, a.jsxs)("form", {
                onSubmit: handleSubmit,
                noValidate: true,
                children: [
                  (0, a.jsx)("h2", { className: "text-base font-bold text-foreground",       children: "Dados do comprador" }),
                  (0, a.jsx)("p",  { className: "mt-1 text-sm text-muted-foreground",         children: "Preenche os teus dados para gerar o pagamento." }),

                  // Campo: Nome
                  (0, a.jsxs)("div", {
                    className: "mt-4",
                    children: [
                      (0, a.jsx)("label", {
                        style: { display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px", color: "var(--foreground)" },
                        children: "Nome completo *",
                      }),
                      (0, a.jsx)("input", {
                        type: "text",
                        value: form.name,
                        onChange: (ev) => setForm((f) => ({ ...f, name: ev.target.value })),
                        placeholder: "Ex: João Manuel Silva",
                        style: {
                          width: "100%",
                          borderRadius: "var(--radius)",
                          border: `1px solid ${errors.name ? "var(--destructive)" : "var(--border)"}`,
                          backgroundColor: "var(--background)",
                          padding: "8px 12px",
                          fontSize: "0.875rem",
                          color: "var(--foreground)",
                          outline: "none",
                          boxSizing: "border-box",
                        },
                        onFocus: (ev) => { ev.target.style.boxShadow = "0 0 0 2px color-mix(in oklab, var(--primary) 30%, transparent)"; },
                        onBlur:  (ev) => { ev.target.style.boxShadow = "none"; },
                      }),
                      errors.name && (0, a.jsx)("p", {
                        style: { marginTop: "4px", fontSize: "0.75rem", color: "var(--destructive)" },
                        children: errors.name,
                      }),
                    ],
                  }),

                  // Campo: Telefone
                  (0, a.jsxs)("div", {
                    className: "mt-3",
                    children: [
                      (0, a.jsx)("label", {
                        style: { display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px", color: "var(--foreground)" },
                        children: "Número de telefone *",
                      }),
                      (0, a.jsx)("input", {
                        type: "tel",
                        value: form.phone,
                        onChange: (ev) => setForm((f) => ({ ...f, phone: ev.target.value })),
                        placeholder: "Ex: 900 000 000",
                        style: {
                          width: "100%",
                          borderRadius: "var(--radius)",
                          border: `1px solid ${errors.phone ? "var(--destructive)" : "var(--border)"}`,
                          backgroundColor: "var(--background)",
                          padding: "8px 12px",
                          fontSize: "0.875rem",
                          color: "var(--foreground)",
                          outline: "none",
                          boxSizing: "border-box",
                        },
                        onFocus: (ev) => { ev.target.style.boxShadow = "0 0 0 2px color-mix(in oklab, var(--primary) 30%, transparent)"; },
                        onBlur:  (ev) => { ev.target.style.boxShadow = "none"; },
                      }),
                      errors.phone && (0, a.jsx)("p", {
                        style: { marginTop: "4px", fontSize: "0.75rem", color: "var(--destructive)" },
                        children: errors.phone,
                      }),
                    ],
                  }),

                  // Campo: Email (opcional)
                  (0, a.jsxs)("div", {
                    className: "mt-3",
                    children: [
                      (0, a.jsx)("label", {
                        style: { display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px", color: "var(--foreground)" },
                        children: "Email (opcional)",
                      }),
                      (0, a.jsx)("input", {
                        type: "email",
                        value: form.email,
                        onChange: (ev) => setForm((f) => ({ ...f, email: ev.target.value })),
                        placeholder: "Ex: joao@gmail.com",
                        style: {
                          width: "100%",
                          borderRadius: "var(--radius)",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--background)",
                          padding: "8px 12px",
                          fontSize: "0.875rem",
                          color: "var(--foreground)",
                          outline: "none",
                          boxSizing: "border-box",
                        },
                        onFocus: (ev) => { ev.target.style.boxShadow = "0 0 0 2px color-mix(in oklab, var(--primary) 30%, transparent)"; },
                        onBlur:  (ev) => { ev.target.style.boxShadow = "none"; },
                      }),
                    ],
                  }),

                  // Resumo do pedido
                  (0, a.jsxs)("div", {
                    style: {
                      marginTop: "16px",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                      backgroundColor: "color-mix(in oklab, var(--muted) 40%, transparent)",
                      padding: "12px",
                      fontSize: "0.875rem",
                    },
                    children: [
                      ...TICKETS.filter((t) => (quantities[t.id] ?? 0) > 0).map((t) =>
                        (0, a.jsxs)("div", {
                          style: { display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "var(--muted-foreground)" },
                          children: [
                            (0, a.jsxs)("span", { children: [quantities[t.id], " × ", t.title] }),
                            (0, a.jsx)("span", { style: { fontWeight: 600, color: "var(--foreground)" }, children: fmt((quantities[t.id] ?? 0) * t.price) }),
                          ],
                        }, t.id)
                      ),
                      (0, a.jsxs)("div", {
                        style: {
                          display: "flex",
                          justifyContent: "space-between",
                          borderTop: "1px solid var(--border)",
                          paddingTop: "8px",
                          marginTop: "4px",
                          fontWeight: 700,
                          color: "var(--foreground)",
                        },
                        children: [
                          (0, a.jsx)("span", { children: "Total" }),
                          (0, a.jsx)("span", { children: fmt(total) }),
                        ],
                      }),
                    ],
                  }),

                  // Erro da API
                  apiError && (0, a.jsx)("p", {
                    style: {
                      marginTop: "12px",
                      borderRadius: "var(--radius)",
                      border: "1px solid color-mix(in oklab, var(--destructive) 40%, transparent)",
                      backgroundColor: "color-mix(in oklab, var(--destructive) 10%, transparent)",
                      padding: "10px 12px",
                      fontSize: "0.75rem",
                      color: "var(--destructive)",
                    },
                    children: apiError,
                  }),

                  // Botões
                  (0, a.jsxs)("div", {
                    className: "mt-4 flex gap-2",
                    children: [
                      (0, a.jsx)("button", {
                        type: "button",
                        onClick: closeModal,
                        className: "flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary",
                        children: "Cancelar",
                      }),
                      (0, a.jsx)("button", {
                        type: "submit",
                        className: "flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90",
                        children: "Gerar Pagamento",
                      }),
                    ],
                  }),
                ],
              })

            // ── Passo: referência de pagamento Multicaixa ──
            ) : (
              (0, a.jsxs)(a.Fragment, {
                children: [
                  (0, a.jsx)("h2", { className: "text-base font-bold text-foreground",   children: "Referência de pagamento" }),
                  (0, a.jsx)("p",  { className: "mt-1 text-sm text-muted-foreground",    children: "Use os dados abaixo para pagar por referência Multicaixa." }),

                  (0, a.jsxs)("dl", {
                    className: "mt-4 space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm",
                    children: [
                      (0, a.jsx)(CopyRow, {
                        label: "Entidade",
                        value: ENTIDADE,
                        copied: copied === "entity",
                        onCopy: () => copyText("entity", ENTIDADE),
                      }),
                      (0, a.jsx)(CopyRow, {
                        label: "Referência",
                        value: REFERENCIA,
                        copied: copied === "ref",
                        onCopy: () => copyText("ref", REFERENCIA),
                      }),
                      (0, a.jsxs)("div", {
                        className: "flex items-center justify-between border-t border-border pt-3",
                        children: [
                          (0, a.jsx)("dt", { className: "text-muted-foreground", children: "Valor" }),
                          (0, a.jsx)("dd", { className: "text-lg font-bold text-primary", children: fmt(total) }),
                        ],
                      }),
                    ],
                  }),

                  // Copiar todos os dados
                  (0, a.jsx)("button", {
                    onClick: () =>
                      copyText(
                        "all",
                        `Dados de pagamento Check-in.ao\nEntidade: ${ENTIDADE}\nReferência: ${REFERENCIA}\nValor: ${fmt(total)}`
                      ),
                    className: "mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary",
                    children: copied === "all" ? "Dados copiados ✓" : "Copiar todos os dados",
                  }),

                  (0, a.jsxs)("p", {
                    className: "mt-3 text-xs text-muted-foreground",
                    children: [
                      count, " bilhete", count === 1 ? "" : "s",
                      " seleccionado", count === 1 ? "" : "s", ".",
                    ],
                  }),

                  // Anexar comprovativo
                  (0, a.jsx)("input", {
                    ref: fileRef,
                    type: "file",
                    accept: "image/*,.pdf",
                    className: "hidden",
                    onChange: (ev) => setComprovativo(ev.target.files?.[0] ?? null),
                  }),
                  (0, a.jsx)("button", {
                    onClick: () => fileRef.current?.click(),
                    className: "mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90",
                    children: comprovativo ? comprovativo.name : "Anexar comprovativo",
                  }),
                  comprovativo && (0, a.jsx)("p", {
                    className: "mt-1.5 text-center text-xs font-medium text-success",
                    children: "Comprovativo anexado",
                  }),

                  // Concluído
                  (0, a.jsx)("button", {
                    onClick: closeModal,
                    className: "mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90",
                    children: "Concluído",
                  }),
                ],
              })
            ),
        }),
      }),

    ],
  });
}

// ════════════════════════════════════════════════════════════
// Sub-componentes
// ════════════════════════════════════════════════════════════

function DetailItem({ label, value }) {
  return (0, a.jsxs)("div", {
    children: [
      (0, a.jsx)("dt", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: label }),
      (0, a.jsx)("dd", { className: "mt-0.5 font-medium text-foreground",                   children: value }),
    ],
  });
}

function SummaryRow({ label, value }) {
  return (0, a.jsxs)("div", {
    className: "flex items-center justify-between text-muted-foreground",
    children: [
      (0, a.jsx)("span",   { children: label }),
      (0, a.jsx)("strong", { className: "font-semibold text-foreground", children: value }),
    ],
  });
}

function QtyBtn({ onClick, label, children }) {
  return (0, a.jsx)("button", {
    type: "button",
    "aria-label": label,
    onClick,
    className: "flex h-8 w-8 items-center justify-center rounded-lg border border-border text-base font-semibold text-foreground transition-colors hover:border-primary hover:text-primary",
    children,
  });
}

function CopyRow({ label, value, copied, onCopy }) {
  return (0, a.jsxs)("div", {
    className: "flex items-center justify-between gap-3",
    children: [
      (0, a.jsx)("dt", { className: "shrink-0 text-muted-foreground", children: label }),
      (0, a.jsxs)("dd", {
        className: "flex min-w-0 items-center gap-2",
        children: [
          (0, a.jsx)("span", { className: "text-lg font-bold tracking-widest text-foreground", children: value }),
          (0, a.jsx)("button", {
            type: "button",
            onClick: onCopy,
            "aria-label": `Copiar ${label.toLowerCase()}`,
            className: copied
              ? "shrink-0 rounded-lg bg-success/15 px-2.5 py-1 text-xs font-semibold text-success"
              : "shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary",
            children: copied ? "Copiado ✓" : "Copiar",
          }),
        ],
      }),
    ],
  });
}

export { c as component };