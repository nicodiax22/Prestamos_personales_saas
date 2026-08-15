const clients = [
  { name: "Martin Acosta", dni: "31.456.908", phone: "11 5842-0194", zone: "San Justo", status: "al dia", amount: 120000, installments: 4, paid: 2, dueDay: 15 },
  { name: "Carolina Benitez", dni: "28.334.710", phone: "11 6039-2218", zone: "Ramos Mejia", status: "vence hoy", amount: 85000, installments: 3, paid: 1, dueDay: 15 },
  { name: "Sergio Cabrera", dni: "34.882.109", phone: "11 5091-7730", zone: "Lomas del Mirador", status: "atrasado", amount: 200000, installments: 5, paid: 2, dueDay: 8 },
  { name: "Julieta Duarte", dni: "37.115.492", phone: "11 6274-9042", zone: "Moron", status: "al dia", amount: 150000, installments: 6, paid: 4, dueDay: 22 },
  { name: "Pablo Espindola", dni: "30.918.227", phone: "11 5438-6811", zone: "Haedo", status: "atrasado", amount: 100000, installments: 4, paid: 1, dueDay: 5 },
  { name: "Romina Ferreyra", dni: "39.221.084", phone: "11 6021-4488", zone: "Ituzaingo", status: "al dia", amount: 70000, installments: 2, paid: 1, dueDay: 28 },
  { name: "Gaston Gimenez", dni: "27.881.940", phone: "11 5983-7265", zone: "Castelar", status: "vence hoy", amount: 180000, installments: 6, paid: 3, dueDay: 15 },
  { name: "Natalia Herrera", dni: "35.604.218", phone: "11 6110-3329", zone: "Ciudadela", status: "al dia", amount: 95000, installments: 3, paid: 2, dueDay: 20 },
  { name: "Federico Ibarra", dni: "32.440.673", phone: "11 5304-8702", zone: "Merlo", status: "atrasado", amount: 250000, installments: 8, paid: 3, dueDay: 1 },
  { name: "Soledad Juarez", dni: "40.078.133", phone: "11 5694-1108", zone: "Moreno", status: "al dia", amount: 60000, installments: 2, paid: 1, dueDay: 18 },
  { name: "Diego Ledesma", dni: "29.712.554", phone: "11 5900-7341", zone: "Padua", status: "vence hoy", amount: 130000, installments: 4, paid: 2, dueDay: 15 },
  { name: "Melina Molina", dni: "38.902.417", phone: "11 6518-9033", zone: "Tapiales", status: "al dia", amount: 110000, installments: 5, paid: 2, dueDay: 26 },
  { name: "Hector Navarro", dni: "26.193.775", phone: "11 5489-3340", zone: "Villa Luzuriaga", status: "atrasado", amount: 90000, installments: 3, paid: 0, dueDay: 9 },
  { name: "Paula Ojeda", dni: "36.337.992", phone: "11 6200-4419", zone: "La Tablada", status: "al dia", amount: 170000, installments: 6, paid: 5, dueDay: 24 },
  { name: "Leonel Paredes", dni: "33.840.661", phone: "11 5772-8107", zone: "Isidro Casanova", status: "al dia", amount: 50000, installments: 2, paid: 1, dueDay: 17 },
  { name: "Marina Quiroga", dni: "41.225.380", phone: "11 6304-1175", zone: "Moron", status: "vence hoy", amount: 210000, installments: 7, paid: 4, dueDay: 15 },
  { name: "Rodrigo Rojas", dni: "30.552.196", phone: "11 5980-6509", zone: "San Justo", status: "al dia", amount: 140000, installments: 4, paid: 3, dueDay: 27 },
  { name: "Valeria Silva", dni: "37.846.701", phone: "11 6122-7540", zone: "Haedo", status: "atrasado", amount: 300000, installments: 10, paid: 4, dueDay: 3 },
  { name: "Emanuel Torres", dni: "28.991.450", phone: "11 5366-2901", zone: "Ramos Mejia", status: "al dia", amount: 75000, installments: 3, paid: 2, dueDay: 19 },
  { name: "Luciana Vega", dni: "39.665.308", phone: "11 6461-0874", zone: "Castelar", status: "al dia", amount: 160000, installments: 6, paid: 3, dueDay: 23 },
];

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const statusClass = {
  "al dia": "good",
  "vence hoy": "warn",
  atrasado: "danger",
};

function totalToReturn(client) {
  return client.amount * 2;
}

function installmentValue(client) {
  return totalToReturn(client) / client.installments;
}

function pendingAmount(client) {
  return installmentValue(client) * (client.installments - client.paid);
}

function renderMetrics() {
  const activeCapital = clients.reduce((sum, client) => sum + client.amount, 0);
  const totalReturn = clients.reduce((sum, client) => sum + totalToReturn(client), 0);
  const dueToday = clients
    .filter((client) => client.status === "vence hoy")
    .reduce((sum, client) => sum + installmentValue(client), 0);
  const late = clients
    .filter((client) => client.status === "atrasado")
    .reduce((sum, client) => sum + installmentValue(client), 0);

  const metrics = [
    ["Capital colocado", currency.format(activeCapital), "20 prestamos activos"],
    ["Total a devolver", currency.format(totalReturn), "Con interes base 100%"],
    ["Cobranza de hoy", currency.format(dueToday), "4 cuotas programadas"],
    ["Monto en mora", currency.format(late), "5 clientes atrasados"],
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
  const due = clients.filter((client) => client.status !== "al dia");
  document.querySelector("#dueList").innerHTML = due
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
    .join("");
}

function renderRiskList() {
  const late = clients.filter((client) => client.status === "atrasado");
  document.querySelector("#riskList").innerHTML = late
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
    .join("");
}

function renderClients(list = clients) {
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
            <strong>${currency.format(client.amount)} → ${currency.format(totalToReturn(client))}</strong>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderCollections() {
  const rows = clients
    .filter((client) => client.status !== "al dia")
    .map(
      (client) => `
        <article class="collection-row">
          <div>
            <div class="item-title">${client.name}</div>
            <div class="item-subtitle">${client.zone} · cuota ${client.paid + 1}/${client.installments}</div>
          </div>
          <strong>${currency.format(installmentValue(client))}</strong>
          <span class="status ${statusClass[client.status]}">${client.status}</span>
          <button class="ghost-button" type="button">Cobrar</button>
        </article>
      `,
    )
    .join("");

  document.querySelector("#collectionsTable").innerHTML = rows;
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  document.querySelector("#loanFirstDue").value = date.toISOString().slice(0, 10);
}

function populateLoanClients() {
  document.querySelector("#loanClient").innerHTML = clients
    .map((client) => `<option>${client.name}</option>`)
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

function switchView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".nav-item, .tab").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewId);
  });
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelector("#openLoan").addEventListener("click", () => switchView("prestamos"));

document.querySelector("#clientSearch").addEventListener("input", (event) => {
  const query = event.target.value.toLowerCase().trim();
  const filtered = clients.filter((client) =>
    [client.name, client.dni, client.phone, client.zone].some((value) => value.toLowerCase().includes(query)),
  );
  renderClients(filtered);
});

document.querySelectorAll("#loanForm input, #loanForm select").forEach((input) => {
  input.addEventListener("input", updateSimulator);
});

setDefaultDate();
populateLoanClients();
renderMetrics();
renderDueList();
renderRiskList();
renderClients();
renderCollections();
updateSimulator();
