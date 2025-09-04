// ===============================
// Helpers generales
// ===============================
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const fmt = (n) => {
  const num = Number(n) || 0;
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function show(sel) { $(sel)?.classList.remove('d-none'); }
function hide(sel) { $(sel)?.classList.add('d-none'); }
function swap(hideSel, showSel) { hide(hideSel); show(showSel); }

// ===============================
// Estado 
// ===============================
const STATE_KEY = 'bank_state_v1';
const PIN_OK    = /^\d{4}$/;           // Validación de 4 dígitos
const DEMO_OWNER = 'Ash Ketchum';
const DEMO_ACC   = '001-234-567';

let state = loadState() || {
  ownerName: DEMO_OWNER,
  accountNumber: DEMO_ACC,
  balance: 0,
  moves: [] // {date, type, detail, amount}
};

function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch {}
}
function loadState() {
  try { return JSON.parse(localStorage.getItem(STATE_KEY)); } catch { return null; }
}

// ===============================
// Interfaz Gráfica
// ===============================
function renderUser() {
  $('#ownerName').textContent     = state.ownerName;
  $('#accountNumber').textContent = state.accountNumber;
  $('#userInfo').classList.remove('d-none');
}

function renderSaldo() {
  $('#saldoActual').textContent  = fmt(state.balance);
  $('#saldoSidebar').textContent = fmt(state.balance);
}

function renderHistorial() {
  const tbody = $('#tablaHistorial');
  if (!tbody) return;

  if (!state.moves.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Sin movimientos</td></tr>`;
    return;
  }

  tbody.innerHTML = state.moves.map(m => {
    const cls = m.amount < 0 ? 'text-danger' : (m.amount > 0 ? 'text-success' : 'text-muted');
    return `
      <tr>
        <td>${m.date}</td>
        <td>${m.type}</td>
        <td>${m.detail || '-'}</td>
        <td class="text-right ${cls}">${fmt(m.amount)}</td>
      </tr>
    `;
  }).join('');
}

// ===============================
// Gráfica de totales por tipo (Chart.js)
// ===============================
let chartTipos = null;

function getTotalsByType() {
  let deps = 0, rets = 0, pays = 0;
  for (const m of state.moves) {
    const amt = Number(m.amount) || 0;
    if (m.type === 'Depósito') deps += Math.max(0,  amt);
    if (m.type === 'Retiro')   rets += Math.abs(Math.min(0, amt));
    if (m.type === 'Pago')     pays += Math.abs(Math.min(0, amt));
  }
  return [deps, rets, pays];
}

function renderChart() {
  const el = document.getElementById('chartTipos');
  if (!el || typeof Chart === 'undefined') return;

  const [deps, rets, pays] = getTotalsByType();
  const data = [deps, rets, pays];

  if (chartTipos) {
    chartTipos.data.datasets[0].data = data;
    chartTipos.update();
    return;
  }

  chartTipos = new Chart(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Depósitos', 'Retiros', 'Pagos'],
      datasets: [{
        label: 'Total por tipo',
        data,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` $${Number(ctx.parsed.y).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => `$${Number(v).toLocaleString('en-US')}`
          }
        }
      }
    }
  });
}

// ===============================
// Lógica de negocio
// ===============================
function addMove(type, detail, signedAmount) {
  state.moves.unshift({
    date: new Date().toLocaleString(),
    type,
    detail,
    amount: signedAmount
  });
  saveState();
}

function deposit(amount) {
  state.balance += amount;
  addMove('Depósito', '', +amount);
  saveState();
  renderSaldo();
  renderHistorial();
  renderChart(); // ← actualizar gráfica
}

function withdraw(amount) {
  if (amount > state.balance) {
    alert('Saldo insuficiente.');
    return false;
  }
  state.balance -= amount;
  addMove('Retiro', '', -amount);
  saveState();
  renderSaldo();
  renderHistorial();
  renderChart(); // ← actualizar gráfica
  return true;
}

function payService(service, amount) {
  if (amount > state.balance) {
    alert('Saldo insuficiente.');
    return false;
  }
  state.balance -= amount;
  addMove('Pago', service, -amount);
  saveState();
  renderSaldo();
  renderHistorial();
  renderChart(); // ← actualizar gráfica
  return true;
}

// ===============================
// Navegación / inicio
// ===============================
function showLogin()     { swap('#view-dashboard', '#view-login'); }
function showDashboard() {
  swap('#view-login', '#view-dashboard');
  renderUser();
  renderSaldo();
  renderHistorial();
  renderChart(); // ← inicializar/actualizar al entrar
}

function ensureLogged() {
  if (sessionStorage.getItem('logged') === '1') {
    showDashboard();
  } else {
    showLogin();
  }
}

// ===============================
// Eventos
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  ensureLogged();

  // --- Login ---
  $('#frmLogin')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const pinVal = $('#pin').value.trim();
    if (!PIN_OK.test(pinVal)) {
      $('#loginMsg').classList.remove('d-none');
      return;
    }
    $('#loginMsg').classList.add('d-none');
    sessionStorage.setItem('logged', '1');
    showDashboard();
  });

  // --- Depósito ---
  $('#frmDeposito')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = Number($('#montoDeposito').value);
    if (!Number.isFinite(val) || val <= 0) return;
    deposit(val);
    $('#montoDeposito').value = '';
  });

  // --- Retiro ---
  $('#frmRetiro')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = Number($('#montoRetiro').value);
    if (!Number.isFinite(val) || val <= 0) return;
    if (withdraw(val)) $('#montoRetiro').value = '';
  });

  // --- Consulta de saldo (registra movimiento 0) ---
  $$('#tabsAcciones a[data-toggle="tab"]').forEach(a => {
    a.addEventListener('shown.bs.tab', (ev) => {
      if (ev.target.getAttribute('href') === '#tabConsulta') {
        addMove('Consulta', 'Saldo', 0);
        renderHistorial();
        renderChart(); // ← actualizar gráfica también
      }
    });
  });

  // --- Pago de servicios ---
  $('#frmPagoServicios')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const servicio = $('#servicio').value;
    const val = Number($('#montoServicio').value);
    if (!Number.isFinite(val) || val <= 0) return;
    if (payService(servicio, val)) $('#montoServicio').value = '';
  });

  // --- Paneles laterales ---
  $('#btnVerHistorial')?.addEventListener('click', () => {
    renderHistorial();
    $('#panelHistorial').classList.toggle('d-none');
  });

  $('#btnVerGrafico')?.addEventListener('click', () => {
    renderChart(); // ← aseguramos que esté actualizado al abrir
    $('#panelGrafico').classList.toggle('d-none');
  });

  // --- Salir ---
  $('#btnSalir')?.addEventListener('click', () => {
    sessionStorage.removeItem('logged');
    showLogin();
    $('#pin').value = '';
  });
});