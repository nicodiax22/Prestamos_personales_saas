const seedClients = [
  { id: 1, name: "Martin Acosta", dni: "31.456.908", phone: "11 5842-0194", zone: "San Justo", status: "al dia", amount: 120000, rate: 100, installments: 4, paid: 2, dueDay: 15 },
  { id: 2, name: "Carolina Benitez", dni: "28.334.710", phone: "11 6039-2218", zone: "Ramos Mejia", status: "vence hoy", amount: 85000, rate: 100, installments: 3, paid: 1, dueDay: 15 },
  { id: 3, name: "Sergio Cabrera", dni: "34.882.109", phone: "11 5091-7730", zone: "Lomas del Mirador", status: "atrasado", amount: 200000, rate: 100, installments: 5, paid: 2, dueDay: 8 },
  { id: 4, name: "Julieta Duarte", dni: "37.115.492", phone: "11 6274-9042", zone: "Moron", status: "al dia", amount: 150000, rate: 100, installments: 6, paid: 4, dueDay: 22 },
  { id: 5, name: "Pablo Espindola", dni: "30.918.227", phone: "11 5438-6811", zone: "Haedo", status: "atrasado", amount: 100000, rate: 100, installments: 4, paid: 1, dueDay: 5 },
  { id: 6, name: "Romina Ferreyra", dni: "39.221.084", phone: "11 6021-4488", zone: "Ituzaingo", status: "al dia", amount: 70000, rate: 100, installments: 2, paid: 1, dueDay: 28 },
  { id: 7, name: "Gaston Gimenez", dni: "27.881.940", phone: "11 5983-7265", zone: "Castelar", status: "vence hoy", amount: 180000, rate: 100, installments: 6, paid: 3, dueDay: 15 },
  { id: 8, name: "Natalia Herrera", dni: "35.604.218", phone: "11 6110-3329", zone: "Ciudadela", status: "al dia", amount: 95000, rate: 100, installments: 3, paid: 2, dueDay: 20 },
  { id: 9, name: "Federico Ibarra", dni: "32.440.673", phone: "11 5304-8702", zone: "Merlo", status: "atrasado", amount: 250000, rate: 100, installments: 8, paid: 3, dueDay: 1 },
  { id: 10, name: "Soledad Juarez", dni: "40.078.133", phone: "11 5694-1108", zone: "Moreno", status: "al dia", amount: 60000, rate: 100, installments: 2, paid: 1, dueDay: 18 },
  { id: 11, name: "Diego Ledesma", dni: "29.712.554", phone: "11 5900-7341", zone: "Padua", status: "vence hoy", amount: 130000, rate: 100, installments: 4, paid: 2, dueDay: 15 },
  { id: 12, name: "Melina Molina", dni: "38.902.417", phone: "11 6518-9033", zone: "Tapiales", status: "al dia", amount: 110000, rate: 100, installments: 5, paid: 2, dueDay: 26 },
  { id: 13, name: "Hector Navarro", dni: "26.193.775", phone: "11 5489-3340", zone: "Villa Luzuriaga", status: "atrasado", amount: 90000, rate: 100, installments: 3, paid: 0, dueDay: 9 },
  { id: 14, name: "Paula Ojeda", dni: "36.337.992", phone: "11 6200-4419", zone: "La Tablada", status: "al dia", amount: 170000, rate: 100, installments: 6, paid: 5, dueDay: 24 },
  { id: 15, name: "Leonel Paredes", dni: "33.840.661", phone: "11 5772-8107", zone: "Isidro Casanova", status: "al dia", amount: 50000, rate: 100, installments: 2, paid: 1, dueDay: 17 },
  { id: 16, name: "Marina Quiroga", dni: "41.225.380", phone: "11 6304-1175", zone: "Moron", status: "vence hoy", amount: 210000, rate: 100, installments: 7, paid: 4, dueDay: 15 },
  { id: 17, name: "Rodrigo Rojas", dni: "30.552.196", phone: "11 5980-6509", zone: "San Justo", status: "al dia", amount: 140000, rate: 100, installments: 4, paid: 3, dueDay: 27 },
  { id: 18, name: "Valeria Silva", dni: "37.846.701", phone: "11 6122-7540", zone: "Haedo", status: "atrasado", amount: 300000, rate: 100, installments: 10, paid: 4, dueDay: 3 },
  { id: 19, name: "Emanuel Torres", dni: "28.991.450", phone: "11 5366-2901", zone: "Ramos Mejia", status: "al dia", amount: 75000, rate: 100, installments: 3, paid: 2, dueDay: 19 },
  { id: 20, name: "Luciana Vega", dni: "39.665.308", phone: "11 6461-0874", zone: "Castelar", status: "al dia", amount: 160000, rate: 100, installments: 6, paid: 3, dueDay: 23 },
];

const STORAGE_KEY = "credito-simple-demo-v2";
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

let state = loadState();

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
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }

  return {
    role: null,
    programEnabled: true,
    clients: seedClients,
    payments: [],
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function canOperate() {
  return state.role !== null && (state.programEnabled || state.role === "superadmin");
}

function updateRoleUi() {
  const role = ROLES[state.role] ?? {
    name: "Sin usuario",
    description: "Elegir un perfil de prueba para entrar al sistema.",
  };
  document.querySelector("#roleName").textContent = role.name;
  document.querySelector("#roleDescription").textContent = role.description;
  document.querySelector("#accessPanel").classList.toggle("hidden", state.role !== null);
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

  if (!canOperate()) {
    switchView("dashboard");
  }
}

function renderMetrics() {
  const clients = activeClients();
  const activeCapital = clients.reduce((sum, client) => sum + client.amount, 0);
  const totalReturn = clients.reduce((sum, client) => sum + totalToReturn(client), 0);
  const dueToday = clients
    .filter((client) => client.status === "vence hoy")
    .reduce((sum, client) => sum + installmentValue(client), 0);
  const late = clients
    .filter((client) => client.status === "atrasado")
    .reduce((sum, client) => sum + installmentValue(client), 0);
  const paid = clients.reduce((sum, client) => sum + paidAmount(client), 0);

  const metrics = [
    ["Capital colocado", currency.format(activeCapital), `${clients.length} prestamos activos`],
    ["Total a devolver", currency.format(totalReturn), "Interes editable por prestamo"],
    ["Ya cobrado", currency.format(paid), `${state.payments.length} cobros registrados`],
    ["Monto en mora", currency.format(late), "Clientes atrasados"],
  ];

  document.querySelector("#metrics").innerHTML = metrics
    .map(
      ([label, value, note]) => `
        <article class="metric">
          <span>${label}</span>
          <strong>${value}</strong>
          <small>${note}</small>
        </article>
      `,
    )
    .join("");
}

function renderDueList() {
  const due = activeClients().filter((client) => client.status !== "al dia" && client.status !== "cancelado");
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

function renderClients(list = activeClients()) {
  document.querySelector("#clientsTitle").textContent = `${activeClients().length} clientes cargados`;
  document.querySelector("#clientGrid").innerHTML = list
    .map(
      (client) => `
        <article class="client-card">
          <header>
            <h3>${client.name}</h3>
            <span class="status ${statusClass[client.status]}">${client.status}</span>
          </header>
          <div class="client-data">
            <span>DNI ${client.dni}</span>
            <span>${client.phone}</span>
            <span>${client.zone}</span>
          </div>
          <div>
            <div class="item-subtitle">Prestamo activo</div>
            <strong>${currency.format(client.amount)} -> ${currency.format(totalToReturn(client))}</strong>
          </div>
          <div class="progress">
            <span style="width: ${(client.paid / client.installments) * 100}%"></span>
          </div>
          <div class="item-subtitle">Cuotas pagas: ${client.paid}/${client.installments}</div>
        </article>
      `,
    )
    .join("");
}

function renderCollections() {
  const rows = activeClients()
    .filter((client) => client.status !== "cancelado")
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
          <button class="ghost-button collect-button" data-collect="${client.id}" type="button" ${!canOperate() ? "disabled" : ""}>
            Cobrar cuota
          </button>
        </article>
      `,
    )
    .join("");

  document.querySelector("#collectionsTable").innerHTML = canOperate()
    ? rows
    : `<div class="locked-state">Programa apagado. El duenio no puede registrar cobros hasta que Nicolas lo active.</div>`;
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  document.querySelector("#loanFirstDue").value = date.toISOString().slice(0, 10);
}

function populateLoanClients() {
  document.querySelector("#loanClient").innerHTML = activeClients()
    .map((client) => `<option value="${client.id}">${client.name}</option>`)
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

function createLoan(event) {
  event.preventDefault();
  if (!canOperate()) {
    return;
  }

  const selectedClient = activeClients().find((client) => client.id === Number(document.querySelector("#loanClient").value));
  const firstDue = document.querySelector("#loanFirstDue").value;
  const newClient = {
    ...selectedClient,
    id: Date.now(),
    amount: Number(document.querySelector("#loanAmount").value) || 0,
    rate: Number(document.querySelector("#loanRate").value) || 100,
    installments: Number(document.querySelector("#loanInstallments").value) || 1,
    paid: 0,
    status: document.querySelector("#loanStatus").value,
    dueDay: firstDue ? new Date(`${firstDue}T00:00:00`).getDate() : 15,
  };

  state.clients = [newClient, ...state.clients];
  saveState();
  renderAll();
  switchView("cobranzas");
}

function collectInstallment(clientId) {
  if (!canOperate()) {
    return;
  }

  const client = state.clients.find((item) => item.id === clientId);
  if (!client || client.paid >= client.installments) {
    return;
  }

  client.paid += 1;
  client.status = client.paid >= client.installments ? "cancelado" : "al dia";
  state.payments.unshift({
    id: Date.now(),
    clientId,
    amount: installmentValue(client),
    installment: client.paid,
    date: new Date().toISOString(),
  });
  saveState();
  renderAll();
}

function resetDemo() {
  state.clients = seedClients;
  state.payments = [];
  state.programEnabled = true;
  saveState();
  renderAll();
}

function switchView(viewId) {
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
  renderClients();
  renderCollections();
  populateLoanClients();
  updateSimulator();
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelectorAll("[data-role]").forEach((button) => {
  button.addEventListener("click", () => {
    state.role = button.dataset.role;
    saveState();
    renderAll();
  });
});

document.querySelector("#switchUser").addEventListener("click", () => {
  state.role = state.role === "superadmin" ? "owner" : "superadmin";
  saveState();
  renderAll();
});

document.querySelector("#switchUserTop").addEventListener("click", () => {
  state.role = state.role === "superadmin" ? "owner" : "superadmin";
  saveState();
  renderAll();
});

document.querySelector("#programEnabled").addEventListener("change", (event) => {
  state.programEnabled = event.target.checked;
  saveState();
  renderAll();
});

document.querySelector("#openLoan").addEventListener("click", () => switchView("prestamos"));

document.querySelector("#clientSearch").addEventListener("input", (event) => {
  const query = event.target.value.toLowerCase().trim();
  const filtered = activeClients().filter((client) =>
    [client.name, client.dni, client.phone, client.zone].some((value) => value.toLowerCase().includes(query)),
  );
  renderClients(filtered);
});

document.querySelectorAll("#loanForm input, #loanForm select").forEach((input) => {
  input.addEventListener("input", updateSimulator);
});

document.querySelector("#loanForm").addEventListener("submit", createLoan);
document.querySelector("#resetDemo").addEventListener("click", resetDemo);
document.querySelector("#collectionsTable").addEventListener("click", (event) => {
  const button = event.target.closest("[data-collect]");
  if (button) {
    collectInstallment(Number(button.dataset.collect));
  }
});

setDefaultDate();
renderAll();
