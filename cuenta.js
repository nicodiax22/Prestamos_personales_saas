const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const STATUS_COPY = {
  "al dia": { label: "Al dia", tone: "good" },
  "vence hoy": { label: "Vence hoy", tone: "warn" },
  atrasado: { label: "Cuota atrasada", tone: "danger" },
  cancelado: { label: "Prestamo saldado", tone: "good" },
  incobrable: { label: "En revision", tone: "danger" },
};

function getToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  return token && token.trim() ? token.trim() : null;
}

function showOnly(id) {
  ["gateCard", "invalidCard", "accountView", "loadingCard"].forEach((cardId) => {
    document.querySelector(`#${cardId}`).hidden = cardId !== id;
  });
}

function totalToReturn(loan) {
  return loan.amount + loan.amount * (loan.interest_percent / 100);
}

function installmentValue(loan) {
  return totalToReturn(loan) / loan.installment_count;
}

function formatDate(value) {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function nextDueDate(dueDay) {
  const today = new Date();
  const due = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (today.getDate() > dueDay) {
    due.setMonth(due.getMonth() + 1);
  }
  return due;
}

function renderAccount(loan) {
  const copy = STATUS_COPY[loan.status] ?? { label: loan.status, tone: "" };
  const value = installmentValue(loan);
  const pending = value * (loan.installment_count - loan.installments_paid);
  const isOpen = loan.status !== "cancelado" && loan.status !== "incobrable";

  document.querySelector("#clientName").textContent = loan.client_name ? `, ${loan.client_name.split(" ")[0]}` : "";
  document.querySelector("#statusPill").textContent = copy.label;
  document.querySelector("#statusPill").className = `status-pill ${copy.tone}`;
  document.querySelector("#pendingAmount").textContent = currency.format(Math.max(pending, 0));
  document.querySelector("#nextDueNote").textContent = isOpen
    ? `Proximo vencimiento: dia ${loan.due_day} (aprox. ${formatDate(nextDueDate(loan.due_day))})`
    : "No tenes cuotas pendientes en este prestamo.";

  document.querySelector("#statAmount").textContent = currency.format(loan.amount);
  document.querySelector("#statTotal").textContent = currency.format(totalToReturn(loan));
  document.querySelector("#statInstallment").textContent = currency.format(value);

  document.querySelector("#progressLabel").textContent = `${loan.installments_paid} de ${loan.installment_count} cuotas pagas`;
  const pct = loan.installment_count > 0 ? (loan.installments_paid / loan.installment_count) * 100 : 0;
  document.querySelector("#progressFill").style.width = `${pct}%`;

  const paymentsByInstallment = new Map(loan.payments.map((p) => [p.installment_number, p]));
  const nextInstallment = loan.installments_paid + 1;

  const items = Array.from({ length: loan.installment_count }, (_, index) => {
    const number = index + 1;
    const payment = paymentsByInstallment.get(number);
    const isPaid = number <= loan.installments_paid;
    const isNext = isOpen && number === nextInstallment;

    let stateLabel = "Pendiente";
    let detail = currency.format(value);
    if (isPaid) {
      stateLabel = "Pagada";
      detail = payment ? `${currency.format(payment.amount)} · ${formatDate(payment.payment_date)}` : currency.format(value);
    } else if (isNext) {
      stateLabel = "Proxima";
    }

    return `
      <li class="timeline-item ${isPaid ? "is-paid" : ""} ${isNext ? "is-next" : ""}">
        <span class="timeline-dot"></span>
        <div class="timeline-body">
          <div class="timeline-top">
            <strong>Cuota ${number}</strong>
            <span class="timeline-state">${stateLabel}</span>
          </div>
          <span class="timeline-detail">${detail}</span>
        </div>
      </li>
    `;
  }).join("");

  document.querySelector("#timeline").innerHTML = items;
  showOnly("accountView");
}

async function checkAccount(event) {
  event.preventDefault();
  const token = getToken();
  const dni = document.querySelector("#dniInput").value.trim();
  const errorEl = document.querySelector("#gateError");
  const submitBtn = document.querySelector("#gateSubmit");

  errorEl.textContent = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "Verificando...";

  const { data, error } = await sb.rpc("get_loan_by_token", { p_token: token, p_dni: dni });

  submitBtn.disabled = false;
  submitBtn.textContent = "Ver mi cuenta";

  if (error || !data) {
    errorEl.textContent = "No pudimos verificar tus datos. Revisa el DNI e intenta de nuevo.";
    return;
  }

  renderAccount(data);
}

document.querySelector("#gateForm").addEventListener("submit", checkAccount);

(function init() {
  const token = getToken();
  if (!token) {
    showOnly("invalidCard");
    return;
  }
  showOnly("gateCard");
})();
