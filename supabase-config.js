// =========================================================================
// CONFIGURACIÓN DE CONEXIÓN A SUPABASE Y ESTADO BASE - UE 012: ANC-MP
// =========================================================================

const SUPABASE_CONFIG = {
  URL: 'https://qjviccudobbdqazopzqd.supabase.co',
  PUBLISHABLE_KEY: 'sb_publishable_LAUPvK1XqLvJr87WaSg01A_lFAgYXBn',
  RUC_MP: '20131370301',
  ENTIDAD: 'UE 012: Autoridad Nacional de Control del Ministerio Público'
};

// Inicialización segura del cliente Supabase
let supabaseClient = null;
if (window.supabase && typeof window.supabase.createClient === 'function') {
  supabaseClient = window.supabase.createClient(
    SUPABASE_CONFIG.URL,
    SUPABASE_CONFIG.PUBLISHABLE_KEY
  );
}

// Estado global reactivo de la aplicación (con respaldo en localStorage)
window.ANC_STATE = {
  config: {
    anio_fiscal: 2026,
    mes_actual: 'Noviembre',
    valor_uit: 5350.00,
    porcentaje_tope_caja_chica: 20.00,
    tope_comprobante_soles: 1070.00, // 20% de S/ 5,350.00
    tope_viaticos_caja_chica: 2000.00,
    tipo_cambio_usd: 3.750,
    tope_alimentos_turno: 24.00,
    tope_enseres_mensual: 700.00,
    umbral_retencion_igv: 700.00,
    tasa_retencion_igv: 3.00,
    umbral_retencion_4ta: 1500.00,
    tasa_retencion_4ta: 8.00
  },
  usuarioActivo: {
    id: 1,
    dni: '40389121',
    nombres_apellidos: 'Ruperto Enrique Castillo Bonilla',
    cargo: 'Responsable de la Unidad de Abastecimiento',
    regimen_vinculo: 'D.L. 728',
    rol_sistema: 'ADMIN'
  },
  dependenciaActiva: {
    id: 13,
    codigo: 'AP-UAB',
    tipo_sede: 'SEDE_CENTRAL',
    organo_agrupador: 'B.2 Órganos de Apoyo - Administración y Finanzas',
    nombre_dependencia: '1.4.2.1. Unidad de Abastecimiento',
    distrito_fiscal: 'LIMA CENTRO',
    presupuesto_caja_chica: 25000.00,
    presupuesto_viaticos: 20000.00,
    gastado_caja_chica: 185.00,
    gastado_viaticos: 0.00
  },
  unidadesOrganicas: [],
  tarifarioMovilidad: [],
  catalogoBienesServicios: [],
  catalogoDetracciones: [],
  escalasViaticos: [],
  rutasAereas: [],
  gastosCajaChica: [],
  solicitudesViaticos: [],
  deferredInstallPrompt: null
};

// Utilidad para mostrar notificaciones Toast institucionales
window.mostrarToast = function(mensaje, tipo = 'info') {
  const contenedor = document.getElementById('toast-container');
  if (!contenedor) return;
  const toast = document.createElement('div');
  toast.className = `toast-item toast-${tipo}`;
  toast.innerHTML = `
    <span class="toast-icon">${tipo === 'success' ? '✓' : tipo === 'error' ? '⚠' : 'ℹ'}</span>
    <span class="toast-text">${mensaje}</span>
  `;
  contenedor.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, 3600);
};

// Registro del Service Worker y captura del evento de instalación PWA
window.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker ANC-MP registrado:', reg.scope))
      .catch((err) => console.warn('Aviso SW:', err));
  }
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.ANC_STATE.deferredInstallPrompt = e;
  const btnInstall = document.getElementById('btn-instalar-pwa');
  if (btnInstall) {
    btnInstall.classList.add('pwa-ready');
  }
});
