const ROLES = {
  superadmin: {
    name: "Nicolas · Admin sistema",
    description: "Puede habilitar/apagar el programa y entrar a la gestion completa.",
  },
  owner: {
    name: "Duenio · Admin negocio",
    description: "Puede cargar prestamos, registrar cobros y ver toda la gestion.",
  },
};

// El login sigue pidiendo un "usuario" corto por compatibilidad con la UI,
// pero por debajo autentica contra Supabase Auth con el email real de esa cuenta.
const LOGIN_EMAILS = {
  nicolas: "nicodiax22@gmail.com",
  duenio: "duenio@creditosimple.demo",
};

const DB_ROLE_TO_APP_ROLE = {
  system_admin: "superadmin",
  owner_admin: "owner",
};

const PAYMENT_PROOF_STORAGE_KEY = "credito-simple-payment-proofs-v1";

let state = {
  role: null,
  programEnabled: true,
  clients: [],
  payments: [],
  people: [],
  lastLoanId: null,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const statusClass = {
  "al dia": "good",
  "vence hoy": "warn",
  atrasado: "danger",
  cancelado: "good",
  incobrable: "danger",
};

function showToast(message, tone = "info") {
  const root = document.querySelector("#toastRoot");
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  root.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

function showConfirm(message, { danger = false, confirmLabel = "Confirmar" } = {}) {
  return new Promise((resolve) => {
    const root = document.querySelector("#modalRoot");
    root.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-box" role="alertdialog" aria-modal="true">
          <p>${message}</p>
          <div class="modal-actions">
            <button type="button" class="ghost-button" data-action="cancel">Cancelar</button>
            <button type="button" class="primary-button ${danger ? "danger" : ""}" data-action="confirm">${confirmLabel}</button>
          </div>
        </div>
      </div>
    `;

    const close = (result) => {
      root.innerHTML = "";
      resolve(result);
    };

    root.querySelector('[data-action="cancel"]').addEventListener("click", () => close(false));
    root.querySelector('[data-action="confirm"]').addEventListener("click", () => close(true));
    root.querySelector(".modal-backdrop").addEventListener("click", (event) => {
      if (event.target.classList.contains("modal-backdrop")) {
        close(false);
      }
    });
  });
}

function debtorLink(token) {
  const url = new URL("cuenta.html", window.location.href);
  url.searchParams.set("token", token);
  return url.toString();
}

function loadPaymentProofs() {
  try {
    return JSON.parse(localStorage.getItem(PAYMENT_PROOF_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function savePaymentProof(paymentId, proof) {
  if (!paymentId || !proof) {
    return;
  }

  const proofs = loadPaymentProofs();
  proofs[paymentId] = proof;
  localStorage.setItem(PAYMENT_PROOF_STORAGE_KEY, JSON.stringify(proofs));
}

async function setButtonBusy(button, busyLabel, task) {
  if (!button) {
    return task();
  }

  const originalLabel = button.textContent;
  const originalDisabled = button.disabled;
  button.disabled = true;
  button.textContent = busyLabel;

  try {
    return await task();
  } finally {
    if (button.isConnected) {
      button.disabled = originalDisabled;
      button.textContent = originalLabel;
    }
  }
}

function mapLoanRow(row) {
  const person = row.clients ?? {};
  return {
    id: row.id,
    clientId: row.client_id,
    name: person.full_name,
    dni: person.dni,
    phone: person.phone,
    zone: person.zone,
    status: row.status,
    amount: Number(row.amount),
    rate: Number(row.interest_percent),
    installments: row.installment_count,
    paid: row.installments_paid,
    dueDay: row.due_day,
    firstDue: row.first_due_date,
    publicToken: row.public_token,
    createdAt: row.created_at,
  };
}

function mapPaymentRow(row) {
  const proofs = loadPaymentProofs();
  return {
    id: row.id,
    clientId: row.loan_id,
    amount: Number(row.amount),
    installment: row.installment_number,
    date: row.payment_date,
    proof: proofs[row.id] ?? null,
  };
}

async function fetchState() {
  const [{ data: loanRows, error: loanError }, { data: paymentRows }, { data: peopleRows }, { data: settingsRow }] = await Promise.all([
    sb.from("loans").select("*, clients(full_name, dni, phone, zone)").order("id", { ascending: false }),
    sb.from("payments").select("*").order("payment_date", { ascending: false }),
    sb.from("clients").select("id, full_name, dni, phone, zone, created_at").order("full_name"),
    sb.from("settings").select("program_enabled").eq("id", 1).single(),
  ]);

  if (loanError) {
    console.error(loanError);
  }

  state.clients = (loanRows ?? []).map(mapLoanRow);
  state.payments = (paymentRows ?? []).map(mapPaymentRow);
  state.people = peopleRows ?? [];
  state.programEnabled = settingsRow?.program_enabled ?? true;
}

async function loadSessionRole() {
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    state.role = null;
    return;
  }

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  state.role = profile ? DB_ROLE_TO_APP_ROLE[profile.role] ?? null : null;
}

function activeClients() {
  return state.clients;
}

function totalToReturn(client) {
  const rate = Number(client.rate ?? 100);
  return client.amount + client.amount * (rate / 100);
}

function installmentValue(client) {
  return totalToReturn(client) / client.installments;
}

function pendingInstallments(client) {
  return Math.max(client.installments - client.paid, 0);
}

function pendingAmount(client) {
  return installmentValue(client) * pendingInstallments(client);
}

function paidAmount(client) {
  return installmentValue(client) * client.paid;
}

function principalPerInstallment(client) {
  return client.amount / client.installments;
}

function interestPerInstallment(client) {
  return installmentValue(client) - principalPerInstallment(client);
}

function profitCollected(client) {
  return interestPerInstallment(client) * client.paid;
}

function unrecoveredCapital(client) {
  return principalPerInstallment(client) * pendingInstallments(client);
}

function pendingProfit(client) {
  return interestPerInstallment(client) * pendingInstallments(client);
}

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function canOperate() {
  return state.role !== null && (state.programEnabled || state.role === "superadmin");
}

function isLoggedIn() {
  return state.role !== null;
}

function updateRoleUi() {
  if (state.role && state.role !== "superadmin" && !state.programEnabled) {
    state.role = null;
    sb.auth.signOut();
    document.querySelector("#loginError").textContent = "El sistema fue desactivado. Volve a ingresar cuando el administrador lo reactive.";
  }

  const role = ROLES[state.role] ?? {
    name: "Sin usuario",
    description: "Elegir un perfil de prueba para entrar al sistema.",
  };
  document.querySelector("#roleName").textContent = role.name;
  document.querySelector("#roleDescription").textContent = role.description;
  document.querySelector("#accessPanel").classList.toggle("hidden", isLoggedIn());
  document.querySelectorAll(".view, .mobile-tabs, .topbar-actions").forEach((item) => {
    item.classList.toggle("auth-hidden", !isLoggedIn());
  });
  document.querySelectorAll(".super-only").forEach((item) => {
    item.classList.toggle("hidden", state.role !== "superadmin");
  });
  document.querySelector("#systemState").textContent = state.programEnabled
    ? "Programa activo"
    : "Programa apagado para el duenio";
  document.querySelector("#systemState").classList.toggle("danger-text", !state.programEnabled);
  document.querySelector("#programEnabled").checked = state.programEnabled;
  document.querySelector("#adminNote").textContent = state.programEnabled
    ? "El duenio puede operar normalmente."
    : "El duenio vera el panel bloqueado hasta que vuelvas a activar el programa.";
  document.querySelectorAll("#loanForm input, #loanForm select, #loanForm button").forEach((field) => {
    field.disabled = !canOperate();
  });
  document.querySelector("#openClientModal").disabled = !canOperate();

  if (!canOperate()) {
    switchView("dashboard");
  }
}

function renderMetrics() {
  const clients = activeClients();
  const activeLoans = clients.filter((client) => client.status !== "cancelado" && client.status !== "incobrable");
  const writtenOff = clients.filter((client) => client.status === "incobrable");

  const activeCapital = activeLoans.reduce((sum, client) => sum + client.amount, 0);
  const investedCapital = clients.reduce((sum, client) => sum + client.amount, 0);
  const paid = clients.reduce((sum, client) => sum + paidAmount(client), 0);
  const profitCollectedTotal = clients.reduce((sum, client) => sum + profitCollected(client), 0);
  const lostCapital = writtenOff.reduce((sum, client) => sum + unrecoveredCapital(client), 0);
  const netProfit = profitCollectedTotal - lostCapital;
  const projectedProfit = activeLoans.reduce((sum, client) => sum + pendingProfit(client), 0);
  const late = clients
    .filter((client) => client.status === "atrasado")
    .reduce((sum, client) => sum + installmentValue(client), 0);
  const roi = investedCapital > 0 ? (netProfit / investedCapital) * 100 : 0;

  const metrics = [
    {
      label: "Capital activo colocado",
      value: currency.format(activeCapital),
      note: `${activeLoans.length} de ${clients.length} prestamos activos`,
    },
    {
      label: "Cobrado historico",
      value: currency.format(paid),
      note: `${state.payments.length} cobros registrados`,
    },
    {
      label: "Ganancia neta",
      value: currency.format(netProfit),
      note: investedCapital > 0 ? `${roi.toFixed(1)}% sobre capital invertido` : "Sin capital invertido",
      tone: netProfit >= 0 ? "positive" : "negative",
    },
    {
      label: "Ganancia proyectada",
      value: currency.format(projectedProfit),
      note: "Interes pendiente si se cobra todo a tiempo",
    },
    {
      label: "Perdida por incobrables",
      value: currency.format(lostCapital),
      note: `${writtenOff.length} prestamos dados de baja`,
      tone: lostCapital > 0 ? "negative" : "",
    },
    {
      label: "Monto en mora",
      value: currency.format(late),
      note: "Cuota vencida de clientes atrasados",
    },
  ];

  document.querySelector("#metrics").innerHTML = metrics
    .map(
      ({ label, value, note, tone }) => `
        <article class="metric">
          <span>${label}</span>
          <strong class="${tone ?? ""}">${value}</strong>
          <small>${note}</small>
        </article>
      `,
    )
    .join("");
}

function renderDueList() {
  const due = activeClients()
    .filter((client) => !["al dia", "cancelado", "incobrable"].includes(client.status))
    .sort((a, b) => (b.status === "atrasado") - (a.status === "atrasado"));
  document.querySelector("#dueList").innerHTML = due.length
    ? due
        .slice(0, 7)
        .map(
          (client) => `
            <article class="due-item">
              <div>
                <div class="item-title">${client.name}</div>
                <div class="item-subtitle">${client.zone} · ${client.phone}</div>
              </div>
              <div>
                <div class="item-subtitle">Cuota mensual</div>
                <strong>${currency.format(installmentValue(client))}</strong>
              </div>
              <div>
                <div class="item-subtitle">Pendiente</div>
                <strong>${currency.format(pendingAmount(client))}</strong>
              </div>
              <span class="status ${statusClass[client.status]}">${client.status}</span>
            </article>
          `,
        )
        .join("")
    : `<div class="empty-state">No hay cuotas vencidas ni pendientes para hoy.</div>`;
}

function renderRiskList() {
  const late = activeClients().filter((client) => client.status === "atrasado");
  document.querySelector("#riskList").innerHTML = late.length
    ? late
        .map(
          (client) => `
            <article class="risk-item">
              <div>
                <div class="item-title">${client.name}</div>
                <div class="item-subtitle">Vencia dia ${client.dueDay}</div>
              </div>
              <strong>${currency.format(installmentValue(client))}</strong>
            </article>
          `,
        )
        .join("")
    : `<div class="empty-state">Sin clientes atrasados.</div>`;
}

function loanStatusLabel(client) {
  if (client.status === "cancelado") {
    return "Prestamo cancelado";
  }

  if (client.status === "incobrable") {
    return "Prestamo incobrable";
  }

  return "Prestamo activo";
}

function latestLoanForPerson(personId) {
  return activeClients().find((loan) => loan.clientId === personId) ?? null;
}

function renderClients(list = state.people) {
  document.querySelector("#clientsTitle").textContent = `${state.people.length} clientes cargados`;
  document.querySelector("#clientGrid").innerHTML = list
    .map((person) => {
      const loan = latestLoanForPerson(person.id);
      const status = loan?.status ?? "al dia";
      const loanSummary = loan
        ? `<strong>${currency.format(loan.amount)} -> ${currency.format(totalToReturn(loan))}</strong>`
        : `<strong>Sin prestamo activo</strong>`;
      const progress = loan ? (loan.paid / loan.installments) * 100 : 0;
      const installmentText = loan ? `Cuotas pagas: ${loan.paid}/${loan.installments}` : "Cliente disponible para nuevo prestamo";

      return `
        <article class="client-card">
          <header>
            <h3>${escapeHtml(person.full_name)}</h3>
            <span class="status ${statusClass[status]}">${status}</span>
          </header>
          <div class="client-data">
            <span>DNI ${escapeHtml(person.dni ?? "Sin DNI")}</span>
            <span>${escapeHtml(person.phone ?? "Sin telefono")}</span>
            <span>${escapeHtml(person.zone ?? "Sin zona")}</span>
          </div>
          <div>
            <div class="item-subtitle">${loan ? loanStatusLabel(loan) : "Sin prestamo activo"}</div>
            ${loanSummary}
          </div>
          <div class="progress">
            <span style="width: ${progress}%"></span>
          </div>
          <div class="item-subtitle">${installmentText}</div>
          <div class="card-actions">
            <button class="ghost-button small" data-edit-client="${person.id}" type="button" ${!canOperate() ? "disabled" : ""}>Editar</button>
            <button class="ghost-button small danger" data-delete-client="${person.id}" type="button" ${!canOperate() ? "disabled" : ""}>Eliminar</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderClientDirectory() {
  const query = document.querySelector("#clientSearch").value.toLowerCase().trim();
  const list = query
    ? state.people.filter((person) =>
        [person.full_name, person.dni, person.phone, person.zone].some((value) => String(value ?? "").toLowerCase().includes(query)),
      )
    : state.people;
  renderClients(list);
}

function renderCollections() {
  const collectible = activeClients().filter((client) => client.status !== "cancelado" && client.status !== "incobrable");
  const rows = collectible
    .map(
      (client) => `
        <article class="collection-row">
          <div>
            <div class="item-title">${client.name}</div>
            <div class="item-subtitle">${client.zone} · cuota ${Math.min(client.paid + 1, client.installments)}/${client.installments}</div>
          </div>
          <div>
            <div class="item-subtitle">Valor cuota</div>
            <strong>${currency.format(installmentValue(client))}</strong>
          </div>
          <div>
            <div class="item-subtitle">Avance</div>
            <strong>${client.paid}/${client.installments}</strong>
          </div>
          <span class="status ${statusClass[client.status]}">${client.status}</span>
          <div class="row-actions">
            <button class="ghost-button collect-button" data-collect="${client.id}" type="button" ${!canOperate() ? "disabled" : ""}>
              Cobrar cuota
            </button>
            ${
              client.status === "atrasado"
                ? `<button class="ghost-button danger writeoff-button" data-writeoff="${client.id}" type="button" ${!canOperate() ? "disabled" : ""}>
                    Marcar incobrable
                  </button>`
                : ""
            }
          </div>
        </article>
      `,
    )
    .join("");

  document.querySelector("#collectionsTable").innerHTML = canOperate()
    ? rows || `<div class="empty-state">No quedan cuotas por cobrar.</div>`
    : `<div class="locked-state">Programa apagado. El duenio no puede registrar cobros hasta que Nicolas lo active.</div>`;

  const writtenOff = activeClients().filter((client) => client.status === "incobrable");
  document.querySelector("#writeOffList").innerHTML = writtenOff.length
    ? writtenOff
        .map(
          (client) => `
            <article class="writeoff-row">
              <div>
                <div class="item-title">${client.name}</div>
                <div class="item-subtitle">${client.zone}</div>
              </div>
              <div>
                <div class="item-subtitle">Capital no recuperado</div>
                <strong>${currency.format(unrecoveredCapital(client))}</strong>
              </div>
            </article>
          `,
        )
        .join("")
    : `<div class="empty-state">No hay prestamos dados de baja.</div>`;
}

function renderPaymentHistory() {
  document.querySelector("#paymentsHistory").innerHTML = state.payments.length
    ? state.payments
        .slice(0, 8)
        .map((payment) => {
          const loan = state.clients.find((item) => item.id === payment.clientId);
          const proof = payment.proof?.dataUrl
            ? `<button class="proof-thumb" type="button" data-proof="${payment.id}" aria-label="Ver comprobante de ${escapeHtml(loan?.name ?? "cliente")}">
                <img src="${payment.proof.dataUrl}" alt="Comprobante adjunto" />
              </button>`
            : `<span class="item-subtitle">Sin imagen</span>`;

          return `
            <article class="payment-history-row">
              <div>
                <div class="item-title">${escapeHtml(loan?.name ?? "Prestamo eliminado")}</div>
                <div class="item-subtitle">${new Date(payment.date).toLocaleString("es-AR")} · cuota ${payment.installment}</div>
              </div>
              <strong>${currency.format(payment.amount)}</strong>
              <div>
                <div class="item-subtitle">Comprobante</div>
                ${proof}
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">Todavia no hay cobros registrados.</div>`;
}

function renderLoanHistory() {
  const rows = activeClients()
    .map((client) => {
      const nextInstallment = Math.min(client.paid + 1, client.installments);
      const highlight = state.lastLoanId === client.id ? " new-loan" : "";

      return `
        <article class="loan-history-row${highlight}">
          <div>
            <div class="item-title">${client.name}</div>
            <div class="item-subtitle">Vence dia ${client.dueDay} · primera cuota ${formatDate(client.firstDue)}</div>
          </div>
          <div>
            <div class="item-subtitle">Prestado</div>
            <strong>${currency.format(client.amount)}</strong>
          </div>
          <div>
            <div class="item-subtitle">A devolver</div>
            <strong>${currency.format(totalToReturn(client))}</strong>
          </div>
          <div>
            <div class="item-subtitle">Ganancia cobrada</div>
            <strong>${currency.format(profitCollected(client))}</strong>
          </div>
          <div>
            <div class="item-subtitle">Cuotas</div>
            <strong>${client.paid}/${client.installments}</strong>
            <span class="item-subtitle">proxima ${nextInstallment}/${client.installments}</span>
          </div>
          <span class="status ${statusClass[client.status]}">${client.status}</span>
        </article>
      `;
    })
    .join("");

  document.querySelector("#loanHistory").innerHTML = rows;
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  document.querySelector("#loanFirstDue").value = date.toISOString().slice(0, 10);
}

function populateLoanClients() {
  document.querySelector("#loanClient").innerHTML = state.people
    .map((person) => `<option value="${person.id}">${person.full_name}</option>`)
    .join("");
}

function updateSimulator() {
  const amount = Number(document.querySelector("#loanAmount").value) || 0;
  const rate = Number(document.querySelector("#loanRate").value) || 0;
  const installments = Number(document.querySelector("#loanInstallments").value) || 1;
  const firstDue = document.querySelector("#loanFirstDue").value;
  const total = amount + amount * (rate / 100);
  const installment = total / installments;

  document.querySelector("#resultTotal").textContent = currency.format(total);
  document.querySelector("#resultInstallment").textContent = currency.format(installment);
  document.querySelector("#resultProfit").textContent = currency.format(total - amount);

  const startDate = firstDue ? new Date(`${firstDue}T00:00:00`) : new Date();
  const rows = Array.from({ length: installments }, (_, index) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + index);
    return `
      <article class="schedule-row">
        <strong>${index + 1}</strong>
        <span>${date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</span>
        <strong>${currency.format(installment)}</strong>
      </article>
    `;
  });

  document.querySelector("#schedule").innerHTML = rows.join("");
}

async function createLoan(event) {
  event.preventDefault();
  if (!canOperate()) {
    return;
  }

  const clientId = Number(document.querySelector("#loanClient").value);
  const selectedPerson = state.people.find((person) => person.id === clientId);
  if (!selectedPerson) {
    return;
  }

  const firstDue = document.querySelector("#loanFirstDue").value;
  const payload = {
    client_id: clientId,
    amount: Number(document.querySelector("#loanAmount").value) || 0,
    interest_percent: Number(document.querySelector("#loanRate").value) || 100,
    installment_count: Number(document.querySelector("#loanInstallments").value) || 1,
    installments_paid: 0,
    status: document.querySelector("#loanStatus").value,
    due_day: firstDue ? new Date(`${firstDue}T00:00:00`).getDate() : 15,
    first_due_date: firstDue || null,
  };

  const submitButton = document.querySelector("#loanSubmit");

  await setButtonBusy(submitButton, "Registrando...", async () => {
    const { data, error } = await sb.from("loans").insert(payload).select("id, public_token").single();
    if (error) {
      console.error(error);
      showToast("No se pudo registrar el prestamo. Intenta de nuevo.", "danger");
      return;
    }

    state.lastLoanId = data.id;
    await fetchState();
    renderAll();

    const link = debtorLink(data.public_token);
    document.querySelector("#loanSuccess").innerHTML = `
      <p>Prestamo registrado para ${selectedPerson.full_name}. Compartile este link para que vea el estado de su cuenta:</p>
      <div class="loan-link-row">
        <input type="text" readonly value="${link}" id="loanLinkInput" />
        <button type="button" class="ghost-button small" id="copyLoanLink">Copiar link</button>
      </div>
    `;
    document.querySelector("#copyLoanLink").addEventListener("click", async () => {
      await navigator.clipboard.writeText(link);
      showToast("Link copiado al portapapeles.", "good");
    });
    switchView("prestamos");
  });
}

function showClientForm(person = null) {
  return new Promise((resolve) => {
    const root = document.querySelector("#modalRoot");
    root.innerHTML = `
      <div class="modal-backdrop">
        <form class="modal-box wide client-modal-form" role="dialog" aria-modal="true">
          <div class="modal-title-row">
            <div>
              <p class="eyebrow">Gestion de cliente</p>
              <h2>${person ? "Editar cliente" : "Nuevo cliente"}</h2>
            </div>
            <button type="button" class="ghost-button small" data-action="cancel">Cerrar</button>
          </div>
          <div class="form-grid">
            <label>
              Nombre completo
              <input name="full_name" type="text" value="${escapeHtml(person?.full_name ?? "")}" required />
            </label>
            <label>
              DNI
              <input name="dni" type="text" value="${escapeHtml(person?.dni ?? "")}" required />
            </label>
            <label>
              Telefono
              <input name="phone" type="tel" value="${escapeHtml(person?.phone ?? "")}" required />
            </label>
            <label>
              Zona
              <input name="zone" type="text" value="${escapeHtml(person?.zone ?? "")}" required />
            </label>
          </div>
          <p class="login-error" data-error aria-live="polite"></p>
          <div class="modal-actions">
            <button type="button" class="ghost-button" data-action="cancel">Cancelar</button>
            <button type="submit" class="primary-button">Guardar cliente</button>
          </div>
        </form>
      </div>
    `;

    const close = (result) => {
      root.innerHTML = "";
      resolve(result);
    };

    const form = root.querySelector("form");
    form.querySelector("input").focus();
    root.querySelectorAll('[data-action="cancel"]').forEach((button) => button.addEventListener("click", () => close(null)));
    root.querySelector(".modal-backdrop").addEventListener("click", (event) => {
      if (event.target.classList.contains("modal-backdrop")) {
        close(null);
      }
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {
        full_name: String(formData.get("full_name") ?? "").trim(),
        dni: String(formData.get("dni") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        zone: String(formData.get("zone") ?? "").trim(),
      };

      if (!payload.full_name || !payload.dni || !payload.phone || !payload.zone) {
        form.querySelector("[data-error]").textContent = "Completa nombre, DNI, telefono y zona.";
        return;
      }

      close(payload);
    });
  });
}

async function openClientModal(personId = null) {
  if (!canOperate()) {
    return;
  }

  const person = personId ? state.people.find((item) => item.id === personId) : null;
  if (personId && !person) {
    return;
  }

  const payload = await showClientForm(person);
  if (!payload) {
    return;
  }

  const request = person
    ? sb.from("clients").update(payload).eq("id", person.id)
    : sb.from("clients").insert(payload);
  const { error } = await request;
  if (error) {
    console.error(error);
    showToast("No se pudo guardar el cliente. Revisa permisos o intenta de nuevo.", "danger");
    return;
  }

  await fetchState();
  renderAll();
  showToast(person ? "Cliente actualizado." : "Cliente creado.", "good");
}

async function deleteClient(personId) {
  if (!canOperate()) {
    return;
  }

  const person = state.people.find((item) => item.id === personId);
  if (!person) {
    return;
  }

  const hasLoans = state.clients.some((loan) => loan.clientId === personId);
  const confirmed = await showConfirm(
    hasLoans
      ? `Eliminar a <strong>${person.full_name}</strong>? Tambien se eliminaran sus prestamos y cobros asociados. Esta accion no se puede deshacer.`
      : `Eliminar a <strong>${person.full_name}</strong>? Esta accion no se puede deshacer.`,
    { danger: true, confirmLabel: "Eliminar cliente" },
  );
  if (!confirmed) {
    return;
  }

  const { error } = await sb.from("clients").delete().eq("id", personId);
  if (error) {
    console.error(error);
    showToast("No se pudo eliminar el cliente. Revisa permisos o intenta de nuevo.", "danger");
    return;
  }

  await fetchState();
  renderAll();
  showToast("Cliente eliminado.", "danger");
}

function openPaymentQrPage(client) {
  const amount = currency.format(installmentValue(client));
  const accountLink = client.publicToken ? debtorLink(client.publicToken) : window.location.href;
  const qrSeed = `${client.id}-${client.paid + 1}-${Math.round(installmentValue(client))}`;
  const dots = Array.from({ length: 81 }, (_, index) => {
    const active = (qrSeed.charCodeAt(index % qrSeed.length) + index * 7) % 3 !== 0;
    return `<span class="${active ? "active" : ""}"></span>`;
  }).join("");
  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>QR de cobro - ${escapeHtml(client.name)}</title>
        <style>
          body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f7f9; font-family: Inter, Arial, sans-serif; color: #17202a; }
          main { width: min(420px, calc(100vw - 32px)); padding: 24px; border: 1px solid #dce4ea; border-radius: 8px; background: #fff; box-shadow: 0 18px 50px rgba(18,32,44,.12); text-align: center; }
          h1 { margin: 0 0 6px; font-size: 24px; }
          p { margin: 0 0 16px; color: #62717f; }
          .qr { width: min(260px, 76vw); aspect-ratio: 1; display: grid; grid-template-columns: repeat(9, 1fr); gap: 5px; margin: 18px auto; padding: 16px; border: 8px solid #17202a; background: #fff; }
          .qr span { border-radius: 3px; background: #fff; }
          .qr span.active { background: #17202a; }
          strong { display: block; font-size: 28px; }
          small { display: block; margin-top: 10px; color: #62717f; word-break: break-all; }
        </style>
      </head>
      <body>
        <main>
          <h1>${escapeHtml(client.name)}</h1>
          <p>Cuota ${client.paid + 1}/${client.installments}</p>
          <div class="qr">${dots}</div>
          <strong>${amount}</strong>
          <small>${escapeHtml(accountLink)}</small>
        </main>
      </body>
    </html>
  `;
  const qrWindow = window.open("", "_blank", "width=480,height=680");
  if (qrWindow) {
    qrWindow.document.write(html);
    qrWindow.document.close();
  }
}

function showPaymentConfirm(client) {
  return new Promise((resolve) => {
    const root = document.querySelector("#modalRoot");
    let proof = null;
    root.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-box payment-modal" role="alertdialog" aria-modal="true">
          <div class="modal-title-row">
            <div>
              <p class="eyebrow">Confirmacion requerida</p>
              <h2>Confirmar cobro</h2>
            </div>
          </div>
          <p class="warning-copy">Vas a validar un pago y actualizar la cuota del cliente. Esta accion no se puede deshacer.</p>
          <div class="payment-summary">
            <div><span>Cliente</span><strong>${escapeHtml(client.name)}</strong></div>
            <div><span>Cuota</span><strong>${client.paid + 1}/${client.installments}</strong></div>
            <div><span>Monto</span><strong>${currency.format(installmentValue(client))}</strong></div>
          </div>
          <div class="payment-proof-box">
            <div>
              <strong>Comprobante QR</strong>
              <p>Adjunta una imagen o saca una foto al QR/pago del cliente antes de confirmar.</p>
            </div>
            <div class="payment-proof-actions">
              <button class="ghost-button" type="button" data-action="open-qr">Abrir QR</button>
              <label class="ghost-button file-button" for="paymentProofInput">Adjuntar foto</label>
              <input id="paymentProofInput" type="file" accept="image/*" capture="environment" />
            </div>
            <div class="payment-proof-preview empty" data-proof-preview>Sin imagen adjunta</div>
            <p class="payment-proof-error" data-proof-error aria-live="polite"></p>
          </div>
          <div class="modal-actions">
            <button type="button" class="ghost-button" data-action="cancel">Cancelar</button>
            <button type="button" class="primary-button danger" data-action="confirm">Confirmar pago</button>
          </div>
        </div>
      </div>
    `;

    const close = (result) => {
      root.innerHTML = "";
      resolve(result);
    };
    const preview = root.querySelector("[data-proof-preview]");
    const error = root.querySelector("[data-proof-error]");

    root.querySelector('[data-action="open-qr"]').addEventListener("click", () => openPaymentQrPage(client));
    root.querySelector("#paymentProofInput").addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        proof = null;
        preview.className = "payment-proof-preview empty";
        preview.textContent = "Sin imagen adjunta";
        return;
      }

      if (!file.type.startsWith("image/")) {
        error.textContent = "El comprobante tiene que ser una imagen.";
        return;
      }

      if (file.size > 2.5 * 1024 * 1024) {
        error.textContent = "La imagen es muy pesada para guardar en esta demo.";
        event.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        proof = {
          name: file.name || "foto-qr.jpg",
          type: file.type,
          dataUrl: reader.result,
          capturedAt: new Date().toISOString(),
        };
        error.textContent = "";
        preview.className = "payment-proof-preview";
        preview.innerHTML = `
          <img src="${proof.dataUrl}" alt="Comprobante seleccionado" />
          <span>${escapeHtml(proof.name)}</span>
        `;
      });
      reader.readAsDataURL(file);
    });
    root.querySelector('[data-action="cancel"]').addEventListener("click", () => close({ confirmed: false }));
    root.querySelector('[data-action="confirm"]').addEventListener("click", () => close({ confirmed: true, proof }));
    root.querySelector(".modal-backdrop").addEventListener("click", (event) => {
      if (event.target.classList.contains("modal-backdrop")) {
        close({ confirmed: false });
      }
    });
  });
}

async function collectInstallment(clientId, button) {
  if (!canOperate()) {
    return;
  }

  const client = state.clients.find((item) => item.id === clientId);
  if (!client || client.paid >= client.installments || client.status === "incobrable") {
    return;
  }

  const confirmation = await showPaymentConfirm(client);
  if (!confirmation.confirmed) {
    return;
  }

  await setButtonBusy(button, "Cobrando...", async () => {
    const newPaid = client.paid + 1;
    const newStatus = newPaid >= client.installments ? "cancelado" : "al dia";

    const { error: updateError } = await sb
      .from("loans")
      .update({ installments_paid: newPaid, status: newStatus })
      .eq("id", clientId);
    if (updateError) {
      console.error(updateError);
      showToast("No se pudo registrar el cobro. Intenta de nuevo.", "danger");
      return;
    }

    const { data: paymentData, error: paymentError } = await sb
      .from("payments")
      .insert({
        loan_id: clientId,
        amount: installmentValue(client),
        installment_number: newPaid,
      })
      .select("id")
      .single();
    if (paymentError) {
      console.error(paymentError);
    } else {
      savePaymentProof(paymentData?.id, confirmation.proof);
    }

    await fetchState();
    renderAll();
    showToast(`Cuota ${newPaid}/${client.installments} cobrada a ${client.name}.`, "good");
  });
}

async function markUncollectible(clientId, button) {
  if (!canOperate()) {
    return;
  }

  const client = state.clients.find((item) => item.id === clientId);
  if (!client || client.status === "cancelado" || client.status === "incobrable") {
    return;
  }

  const confirmed = await showConfirm(
    `Marcar a <strong>${client.name}</strong> como incobrable? El capital pendiente (${currency.format(unrecoveredCapital(client))}) se contabilizara como perdida.`,
    { danger: true, confirmLabel: "Marcar incobrable" },
  );
  if (!confirmed) {
    return;
  }

  await setButtonBusy(button, "Marcando...", async () => {
    const { error } = await sb.from("loans").update({ status: "incobrable" }).eq("id", clientId);
    if (error) {
      console.error(error);
      showToast("No se pudo marcar el prestamo como incobrable.", "danger");
      return;
    }

    await fetchState();
    renderAll();
    showToast(`${client.name} quedo marcado como incobrable.`, "danger");
  });
}

async function resetDemo(button) {
  if (state.role !== "superadmin") {
    return;
  }

  const confirmed = await showConfirm("Reiniciar la demo? Se perderan los prestamos y cobros cargados.", {
    danger: true,
    confirmLabel: "Reiniciar demo",
  });
  if (!confirmed) {
    return;
  }

  await setButtonBusy(button, "Reiniciando...", async () => {
    const { error } = await sb.rpc("reset_demo");
    if (error) {
      console.error(error);
      showToast(`No se pudo reiniciar la demo: ${error.message}`, "danger");
      return;
    }

    state.lastLoanId = null;
    await fetchState();
    renderAll();
    showToast("La demo se reinicio con los datos originales.", "good");
  });
}

function switchView(viewId) {
  if (!isLoggedIn()) {
    return;
  }

  if (viewId === "sistema" && state.role !== "superadmin") {
    return;
  }

  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".nav-item, .tab").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewId);
  });
}

function renderAll() {
  updateRoleUi();
  renderMetrics();
  renderDueList();
  renderRiskList();
  renderClientDirectory();
  renderCollections();
  renderPaymentHistory();
  renderLoanHistory();
  populateLoanClients();
  updateSimulator();
}

async function login(event) {
  event.preventDefault();
  const user = document.querySelector("#loginUser").value.trim().toLowerCase();
  const password = document.querySelector("#loginPassword").value;
  const email = LOGIN_EMAILS[user];
  const submitButton = document.querySelector("#loginForm button[type=submit]");

  document.querySelector("#loginError").textContent = "";

  if (!email) {
    document.querySelector("#loginError").textContent = "Usuario o contrasena incorrectos.";
    return;
  }

  await setButtonBusy(submitButton, "Ingresando...", async () => {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      document.querySelector("#loginError").textContent = "Usuario o contrasena incorrectos.";
      return;
    }

    await loadSessionRole();

    if (!state.role) {
      document.querySelector("#loginError").textContent = "Esta cuenta no tiene un rol asignado en el sistema.";
      await sb.auth.signOut();
      return;
    }

    await fetchState();

    if (state.role !== "superadmin" && !state.programEnabled) {
      document.querySelector("#loginError").textContent = "El sistema esta desactivado. Contacta al administrador para reactivarlo.";
      await sb.auth.signOut();
      state.role = null;
      renderAll();
      return;
    }

    document.querySelector("#loginForm").reset();
    renderAll();
    switchView("dashboard");
  });
}

async function logout() {
  await sb.auth.signOut();
  state.role = null;
  renderAll();
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelector("#loginForm").addEventListener("submit", login);
document.querySelector("#logoutUser").addEventListener("click", logout);
document.querySelector("#logoutUserTop").addEventListener("click", logout);

document.querySelector("#programEnabled").addEventListener("change", async (event) => {
  const enabled = event.target.checked;
  event.target.disabled = true;
  const { error } = await sb.from("settings").update({ program_enabled: enabled, updated_at: new Date().toISOString() }).eq("id", 1);
  event.target.disabled = false;
  if (error) {
    console.error(error);
    event.target.checked = state.programEnabled;
    showToast("No se pudo actualizar el estado del programa.", "danger");
    return;
  }

  state.programEnabled = enabled;
  renderAll();
  showToast(enabled ? "Programa activado." : "Programa desactivado.", enabled ? "good" : "danger");
});

document.querySelector("#openLoan").addEventListener("click", () => switchView("prestamos"));
document.querySelector("#openClientModal").addEventListener("click", () => openClientModal());

document.querySelector("#clientSearch").addEventListener("input", (event) => {
  renderClientDirectory();
});

document.querySelectorAll("#loanForm input, #loanForm select").forEach((input) => {
  input.addEventListener("input", updateSimulator);
});

document.querySelector("#loanForm").addEventListener("submit", createLoan);
document.querySelector("#resetDemo").addEventListener("click", (event) => resetDemo(event.currentTarget));
document.querySelector("#clientGrid").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-client]");
  if (editButton) {
    openClientModal(Number(editButton.dataset.editClient));
    return;
  }

  const deleteButton = event.target.closest("[data-delete-client]");
  if (deleteButton) {
    deleteClient(Number(deleteButton.dataset.deleteClient));
  }
});
document.querySelector("#collectionsTable").addEventListener("click", (event) => {
  const collectButton = event.target.closest("[data-collect]");
  if (collectButton) {
    collectInstallment(Number(collectButton.dataset.collect), collectButton);
    return;
  }

  const writeoffButton = event.target.closest("[data-writeoff]");
  if (writeoffButton) {
    markUncollectible(Number(writeoffButton.dataset.writeoff), writeoffButton);
  }
});
document.querySelector("#paymentsHistory").addEventListener("click", (event) => {
  const button = event.target.closest("[data-proof]");
  if (!button) {
    return;
  }

  const payment = state.payments.find((item) => item.id === Number(button.dataset.proof));
  if (payment?.proof?.dataUrl) {
    window.open(payment.proof.dataUrl, "_blank");
  }
});

async function init() {
  setDefaultDate();

  const {
    data: { session },
  } = await sb.auth.getSession();

  if (session) {
    await loadSessionRole();
    if (state.role) {
      await fetchState();
    }
  }

  renderAll();
}

init();
