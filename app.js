// ===============================
// Helpers generales
// ===============================
const $ = (s) => document.querySelector(s);
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
const PIN_OK = /^\d{4}$/;           // Validación de 4 dígitos
const DEMO_OWNER = 'Ash Ketchum';
const DEMO_ACC = '001-234-567';

let state = loadState() || {
  ownerName: DEMO_OWNER,
  accountNumber: DEMO_ACC,
  balance: 0,
  moves: [] // {date, type, detail, amount}
};

function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { }
}
function loadState() {
  try { return JSON.parse(localStorage.getItem(STATE_KEY)); } catch { return null; }
}

// ===============================
// Interfaz Gráfica
// ===============================
function renderUser() {
  if (sessionStorage.getItem('logged') === '1') {
    $('#ownerName').textContent = state.ownerName;
    $('#accountNumber').textContent = state.accountNumber;
    $('#userInfo').classList.remove('d-none');
  } else {
    $('#ownerName').textContent = '';
    $('#accountNumber').textContent = '';
    $('#userInfo').classList.add('d-none');
  }
}
function renderSaldo() {
  $('#saldoActual').textContent = fmt(state.balance);
  $('#saldoSidebar').textContent = fmt(state.balance);
}

// Renderiza tabla del panel y tabla de la vista (si existen)
function renderHistorial() {
  const renderInto = (tbodyId) => {
    const tbody = document.getElementById(tbodyId);
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
  };
  renderInto('tablaHistorial');
  renderInto('tablaHistorial2');
}
// Soporte

function showSoporteView() {
  hide('#view-login');
  hide('#view-dashboard');
  hide('#view-history');
  hide('#view-chart');
  show('#view-soporte');
}


document.addEventListener('DOMContentLoaded', () => {
 renderUser(); 
  ensureLogged();

  $('#soporteLink')?.addEventListener('click', showSoporteView);

  $('#frmSoporte')?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('¡Gracias por enviar tu problema! Nos pondremos en contacto pronto.');
    $('#problema').value = '';
  });

  $('#btnSalirSoporte')?.addEventListener('click', () => {
    hide('#view-soporte');
    show('#view-login');
    $('#pin').value = '';
    sessionStorage.removeItem('logged');
  });

  // ===============================
  // Botón escapista del login 😅
  // ===============================
  const btnLogin = document.getElementById('btnLogin');
  const pinInput = document.getElementById('pin');

btnLogin?.addEventListener('mousemove', () => {
  const pinVal = pinInput.value.trim();
  if (!PIN_OK.test(pinVal)) {
    const offsetX = (Math.random() * 500) - 250;
    const offsetY = (Math.random() * 150) - 75;
    btnLogin.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  }
});


  pinInput?.addEventListener('input', () => {
    if (PIN_OK.test(pinInput.value.trim())) {
      btnLogin.style.transform = 'translateX(0)';
    }
  });
});

document.addEventListener('DOMContentLoaded', function () {
  const frmLogin = document.getElementById('frmLogin');
  const pinInput = document.getElementById('pin');
  const loginMsg = document.getElementById('loginMsg');
  const viewLogin = document.getElementById('view-login');
  const viewDashboard = document.getElementById('view-dashboard');

  frmLogin.addEventListener('submit', function (e) {
    e.preventDefault();
    const pin = pinInput.value.trim();
    if (pin === '1234') {
      viewLogin.classList.add('d-none');
      viewDashboard.classList.remove('d-none');
      loginMsg.classList.add('d-none');
    } else {
      loginMsg.classList.remove('d-none');
      pinInput.classList.add('is-invalid');
    }
  });

  pinInput.addEventListener('input', function () {
    pinInput.classList.remove('is-invalid');
    loginMsg.classList.add('d-none');
  });
});


// ===============================
// Gráfica de totales por tipo (Chart.js)
// ===============================
let chartTipos = null;
let chartTiposVista = null;

function getTotalsByType() {
  let deps = 0, rets = 0, pays = 0;
  for (const m of state.moves) {
    const amt = Number(m.amount) || 0;
    if (m.type === 'Depósito') deps += Math.max(0, amt);
    if (m.type === 'Retiro') rets += Math.abs(Math.min(0, amt));
    if (m.type === 'Pago') pays += Math.abs(Math.min(0, amt));
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
      datasets: [{ label: 'Total por tipo', data, borderWidth: 1 }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => ` $${Number(c.parsed.y).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => `$${Number(v).toLocaleString('en-US')}` } }
      }
    }
  });
}

function renderChartVista() {
  const el = document.getElementById('chartTiposVista');
  if (!el || typeof Chart === 'undefined') return;

  const [deps, rets, pays] = getTotalsByType();
  const data = [deps, rets, pays];

  if (chartTiposVista) {
    chartTiposVista.data.datasets[0].data = data;
    chartTiposVista.update();
    return;
  }

  chartTiposVista = new Chart(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Depósitos', 'Retiros', 'Pagos'],
      datasets: [{ label: 'Total por tipo', data, borderWidth: 1 }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => ` $${Number(c.parsed.y).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => `$${Number(v).toLocaleString('en-US')}` } }
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
  renderSaldo(); renderHistorial(); renderChart(); renderChartVista();
}

function withdraw(amount) {
  if (amount > state.balance) {
    alert('Saldo insuficiente.');
    return false;
  }
  state.balance -= amount;
  addMove('Retiro', '', -amount);
  saveState();
  renderSaldo(); renderHistorial(); renderChart(); renderChartVista();
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
  renderSaldo(); renderHistorial(); renderChart(); renderChartVista();
  return true;
}

// Borrar historial (con confirm nativo para evitar dependencias)
function clearHistory() {
  if (!state.moves.length) { alert('No hay movimientos.'); return; }
  if (!confirm('¿Borrar el historial? Esta acción no se puede deshacer.')) return;
  state.moves = [];
  saveState();
  renderHistorial(); renderChart(); renderChartVista();
  alert('Historial borrado.');
}

// Exportar a PDF con jsPDF
async function exportHistoryPDF() {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) { alert('jsPDF no está cargado.'); return; }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = margin;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('Historial de transacciones', margin, y); y += 20;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);

  if (!state.moves.length) {
    doc.text('Sin movimientos', margin, y);
  } else {
    // Encabezados
    doc.text('Fecha', margin, y);
    doc.text('Tipo', margin + 180, y);
    doc.text('Detalle', margin + 280, y);
    doc.text('Monto', margin + 460, y, { align: 'right' });
    y += 14;
    doc.setLineWidth(0.5); doc.line(margin, y, 555, y); y += 10;

    state.moves.forEach(m => {
      const monto = `${m.amount < 0 ? '-' : ''}$${Math.abs(Number(m.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      doc.text(String(m.date), margin, y);
      doc.text(String(m.type), margin + 180, y);
      doc.text(String(m.detail || '-'), margin + 280, y);
      doc.text(monto, margin + 460, y, { align: 'right' });
      y += 14;
      if (y > 780) { doc.addPage(); y = margin; }
    });
  }
  doc.save('historial.pdf');
}

// ===============================
// Navegación / inicio
// ===============================
function showLogin() { swap('#view-dashboard', '#view-login'); }
function showDashboard() {
  swap('#view-login', '#view-dashboard');
 // renderUser();
  renderSaldo();
  renderHistorial();
  renderChart();
  renderChartVista();
}

function showHistoryView() {
  hide('#view-dashboard'); hide('#view-chart'); show('#view-history');
  renderHistorial();
}
function showChartView() {
  hide('#view-dashboard'); hide('#view-history'); show('#view-chart');
  renderChartVista();
}
function backToDashboard() {
  hide('#view-history'); hide('#view-chart'); show('#view-dashboard');
  renderHistorial(); renderChart(); renderChartVista();
}

function ensureLogged() {
  if (sessionStorage.getItem('logged') === '1') showDashboard();
  else showLogin();
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
    if (pinVal !== '1234') {
      $('#loginMsg').classList.remove('d-none');
      return;
    }
    $('#loginMsg').classList.add('d-none');
    sessionStorage.setItem('logged', '1');
    renderUser(); 
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

  // --- Consulta (registra movimiento 0) ---
  $$('#tabsAcciones a[data-toggle="tab"]').forEach(a => {
    a.addEventListener('shown.bs.tab', (ev) => {
      if (ev.target.getAttribute('href') === '#tabConsulta') {
        addMove('Consulta', 'Saldo', 0);
        renderHistorial(); renderChart(); renderChartVista();
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

  // --- Paneles del dashboard ---
 $('#btnVerHistorial')?.addEventListener('click', () => { 
  renderHistorial(); 
  $('#panelHistorial').classList.toggle('d-none');
  document.getElementById('panelHistorial')?.scrollIntoView({ behavior: 'smooth' });
});
  
  $('#btnVerGrafico')?.addEventListener('click', () => {
    renderChart();
    $('#panelGrafico').classList.toggle('d-none');
    document.getElementById('panelGrafico')?.scrollIntoView({ behavior: 'smooth' });
  });

  // --- Vistas dedicadas ---
  $('#btnAbrirHistorialVista')?.addEventListener('click', showHistoryView);
  $('#btnAbrirGraficoVista')?.addEventListener('click', showChartView);
  $('#btnVolverDashboard1')?.addEventListener('click', backToDashboard);
  $('#btnVolverDashboard2')?.addEventListener('click', backToDashboard);

  // --- Borrar historial & Exportar PDF ---
  $('#btnBorrarHistorial')?.addEventListener('click', clearHistory);
  $('#btnExportarPDF')?.addEventListener('click', exportHistoryPDF);
  $('#btnExportarPDFTop')?.addEventListener('click', exportHistoryPDF);

  // --- Salir ---
  $('#btnSalir')?.addEventListener('click', () => {
    sessionStorage.removeItem('logged');
    showLogin();
    $('#pin').value = '';
    renderUser(); // Oculta usuario y número de cuenta
  });
});