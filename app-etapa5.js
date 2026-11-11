// =========================================================================
// ETAPA 5: MÓDULO DE CAJA CHICA Y EVALUADOR INTERACTIVO DE REQUERIMIENTOS
// DIRECTIVA CAJA CHICA V.08 (OGFIN/DIR-01) Y DIRECTIVA DE ENCARGOS V.06
// UE 012: AUTORIDAD NACIONAL DE CONTROL DEL MINISTERIO PÚBLICO (ANC-MP)
// =========================================================================

// Estado reactivo local para Caja Chica y Registro Rápido
window.CAJA_CHICA_STATE = {
  gastos: [],
  filtroCategoria: 'TODOS',
  gastoEnEdicion: {
    montoUnitario: 0.00,
    cantidad: 1,
    montoTotalBruto: 0.00,
    tipoComprobante: 'Factura',
    categoriaIcono: 'Materiales',
    rubroSeleccionadoId: null,
    rubroCodigo: 'CC-MAT-01',
    especificaGasto: '2.3.1.5.1.2',
    detalleMotivo: '',
    rucDniProveedor: '',
    razonSocialProveedor: '',
    serieNumero: '',
    esBuenContribuyente: false,
    aplicaRetencionIGV: false,
    montoRetencionIGV: 0.00,
    aplicaRetencion4ta: false,
    montoRetencion4ta: 0.00,
    codigoDetraccion: '000',
    tasaDetraccion: 0.00,
    montoDetraccion: 0.00,
    netoPagadoEfectivo: 0.00,
    pecosaSinStock: '',
    placaVehiculo: '',
    kmVehiculo: '',
    distritoMovilidadId: null,
    horarioMovilidad: 'DIA',
    vbTecnico: false,
    registroHorasAdicionales: false
  }
};

// Inicialización del módulo
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Inicializando Etapa 5: Caja Chica y Evaluador Normativo ANC-MP...');
  await cargarGastosCajaChica();
  renderizarVistaCajaChica();
  renderizarVistaEvaluador();
});

// Cargar catálogo de gastos desde Supabase con fallback local
async function cargarGastosCajaChica() {
  const dep = window.ANC_STATE.dependenciaActiva;
  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('gastos_caja_chica')
        .select('*')
        .eq('unidad_organica_id', dep.id)
        .order('numero_correlativo', { ascending: false });

      if (!error && data && data.length > 0) {
        window.CAJA_CHICA_STATE.gastos = data;
        calcularTotalGastadoDep();
        return;
      }
    }
  } catch (err) {
    console.warn('Carga de gastos en modo offline o local:', err);
  }

  // Fallback inicial con registro de demostración
  if (!window.CAJA_CHICA_STATE.gastos || window.CAJA_CHICA_STATE.gastos.length === 0) {
    window.CAJA_CHICA_STATE.gastos = [
      {
        id: 1,
        numero_correlativo: 1,
        fecha_comprobante: new Date().toISOString().split('T')[0],
        tipo_comprobante: 'Factura',
        serie_numero_comprobante: 'F001-0004582',
        ruc_dni_proveedor: '20512345678',
        razon_social_proveedor: 'DISTRIBUIDORA DE ÚTILES LIMA S.A.C.',
        detalle_motivo_gasto: 'Adquisición urgente de papel bond 80g y archivadores para despacho de control',
        especifica_gasto: '2.3.1.5.1.2',
        cantidad: 1,
        precio_unitario: 185.00,
        importe_total_bruto: 185.00,
        aplica_retencion_igv: false,
        monto_retencion_igv: 0.00,
        aplica_retencion_4ta: false,
        monto_retencion_4ta: 0.00,
        codigo_detraccion: '000',
        monto_detraccion: 0.00,
        neto_pagado_efectivo: 185.00,
        nro_pecosa_sin_stock: 'PECOSA-2026-0089',
        estado_auditoria: 'APROBADO'
      }
    ];
    calcularTotalGastadoDep();
  }
}

function calcularTotalGastadoDep() {
  const dep = window.ANC_STATE.dependenciaActiva;
  const suma = window.CAJA_CHICA_STATE.gastos.reduce((acc, g) => acc + (parseFloat(g.neto_pagado_efectivo) || 0), 0);
  dep.gastado_caja_chica = suma;
  if (typeof actualizarHeaderInstitucional === 'function') {
    actualizarHeaderInstitucional('Caja Chica');
  }
}

// =========================================================================
// 1. RENDERIZADO DE LA VISTA PRINCIPAL DE CAJA CHICA
// =========================================================================
function renderizarVistaCajaChica() {
  const vista = document.getElementById('vista-caja-chica');
  if (!vista) return;

  const dep = window.ANC_STATE.dependenciaActiva;
  const cfg = window.ANC_STATE.config;
  const gastos = window.CAJA_CHICA_STATE.gastos;

  const asignado = dep.presupuesto_caja_chica || 10700.00;
  const gastado = dep.gastado_caja_chica || 0.00;
  const disponible = Math.max(0, asignado - gastado);
  const porcentajeUso = Math.min(100, (gastado / asignado) * 100).toFixed(1);

  vista.innerHTML = `
    <!-- Tarjeta Superior: Estado Financiero del Fondo de Caja Chica -->
    <div class="section-card-white" style="border-top: 5px solid var(--anc-emerald);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.8rem;">🧾</span>
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 900; color: var(--anc-navy-main);">Gestión de Caja Chica</h2>
            <p style="font-size: 0.85rem; color: var(--anc-text-secondary); font-weight: 600;">
              [${dep.codigo}] ${dep.nombre_dependencia}
            </p>
          </div>
        </div>

        <div style="text-align: right;">
          <span style="font-size: 0.75rem; font-weight: 800; color: var(--anc-text-secondary); text-transform: uppercase;">
            Tope Comprobante (20% UIT):
          </span>
          <div style="font-size: 1.15rem; font-weight: 900; color: var(--anc-gold-deep);">
            S/ ${(cfg.valor_uit * 0.20).toFixed(2)}
          </div>
        </div>
      </div>

      <!-- Métricas de Saldo en Tarjetas -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 12px;">
        <div style="background: #F8FAFC; border: 1.5px solid var(--anc-border-light); border-radius: 12px; padding: 12px;">
          <span style="font-size: 0.72rem; font-weight: 800; color: var(--anc-text-secondary); text-transform: uppercase;">Fondo Asignado:</span>
          <div style="font-size: 1.3rem; font-weight: 900; color: var(--anc-navy-main);">
            S/ ${asignado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style="background: #FEF2F2; border: 1.5px solid #FECACA; border-radius: 12px; padding: 12px;">
          <span style="font-size: 0.72rem; font-weight: 800; color: #991B1B; text-transform: uppercase;">Total Ejecutado:</span>
          <div style="font-size: 1.3rem; font-weight: 900; color: var(--anc-crimson);">
            S/ ${gastado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style="background: var(--anc-emerald-soft); border: 2px solid var(--anc-emerald); border-radius: 12px; padding: 12px;">
          <span style="font-size: 0.72rem; font-weight: 800; color: var(--anc-emerald-dark); text-transform: uppercase;">Saldo Disponible:</span>
          <div style="font-size: 1.3rem; font-weight: 900; color: var(--anc-emerald-dark);">
            S/ ${disponible.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <!-- Barra de Progreso de Ejecución Mensual -->
      <div style="background: #E2E8F0; border-radius: 999px; height: 10px; overflow: hidden; margin-bottom: 6px;">
        <div style="background: ${porcentajeUso > 80 ? 'var(--anc-crimson)' : 'var(--anc-emerald)'}; width: ${porcentajeUso}%; height: 100%;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.76rem; font-weight: 700; color: var(--anc-text-secondary);">
        <span>Ejecución del fondo: ${porcentajeUso}%</span>
        <span>${gastos.length} comprobante(s) registrado(s)</span>
      </div>
    </div>

    <!-- SECCIÓN ERGONÓMICA DE REGISTRO RÁPIDO (ESTILO CAPTURA 1) -->
    <div class="section-card-white" style="border: 2px solid var(--anc-gold-metallic);">
      <div class="add-circle-wrapper">
        <button type="button" class="btn-circle-plus" onclick="abrirModalRegistroGasto()" title="Registrar nuevo gasto de Caja Chica">
          +
        </button>
        <p class="add-circle-caption">
          Toca el círculo (+) para adicionar un nuevo comprobante o gasto de Caja Chica
        </p>
      </div>

      <!-- LISTA DE GASTOS REGISTRADOS -->
      <div style="margin-top: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <h3 style="font-size: 1.1rem; font-weight: 900; color: var(--anc-navy-main);">
            📋 Rendición Documentaria de Caja Chica (${gastos.length})
          </h3>
          <button type="button" class="chip-btn active" onclick="generarRendicionCajaChicaPDF()">
            🖨️ Imprimir Formato Rendición (Anexo 13)
          </button>
        </div>

        <div style="overflow-x: auto; border: 1.5px solid var(--anc-border-light); border-radius: 14px;">
          <table class="anc-list-table">
            <thead class="anc-list-thead">
              <tr>
                <th style="width: 45px; text-align: center;">N°</th>
                <th>FECHA / COMPROBANTE</th>
                <th>PROVEEDOR (RUC / RAZÓN SOCIAL)</th>
                <th>DETALLE / ESPECÍFICA</th>
                <th style="text-align: right;">TOTAL BRUTO</th>
                <th style="text-align: right;">RETENCIONES</th>
                <th style="text-align: right;">NETO EFECTIVO</th>
                <th style="text-align: center;">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              ${generarFilasGastosCajaChica(gastos)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function generarFilasGastosCajaChica(lista) {
  if (!lista || lista.length === 0) {
    return `
      <tr>
        <td colspan="8" style="text-align: center; padding: 26px; color: var(--anc-text-secondary); font-weight: 600;">
          No hay gastos registrados en este periodo. Toca el botón <strong>(+)</strong> para añadir el primer comprobante.
        </td>
      </tr>
    `;
  }

  return lista.map((g, idx) => {
    const totalRet = (parseFloat(g.monto_retencion_igv) || 0) + (parseFloat(g.monto_retencion_4ta) || 0) + (parseFloat(g.monto_detraccion) || 0);
    return `
      <tr class="anc-list-row">
        <td style="text-align: center; font-weight: 800; color: var(--anc-navy-main);">${g.numero_correlativo || (lista.length - idx)}</td>
        <td>
          <span class="badge-pill" style="background: #E2E8F0; color: var(--anc-navy-main); font-size: 0.74rem;">
            ${g.tipo_comprobante}
          </span><br />
          <strong style="color: var(--anc-navy-main); font-size: 0.88rem;">${g.serie_numero_comprobante}</strong><br />
          <span style="font-size: 0.72rem; color: var(--anc-text-secondary);">${g.fecha_comprobante}</span>
        </td>
        <td>
          <strong style="font-size: 0.85rem; color: var(--anc-navy-main);">${g.razon_social_proveedor}</strong><br />
          <span style="font-size: 0.74rem; color: var(--anc-text-secondary);">RUC/DNI: ${g.ruc_dni_proveedor}</span>
        </td>
        <td>
          <span style="font-size: 0.82rem; color: var(--anc-navy-main);">${g.detalle_motivo_gasto}</span><br />
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--anc-cobalt-blue);">Esp: ${g.especifica_gasto}</span>
          ${g.nro_pecosa_sin_stock ? `<span style="font-size:0.7rem; color:#059669; font-weight:700;"> • PECOSA: ${g.nro_pecosa_sin_stock}</span>` : ''}
          ${g.placa_vehiculo ? `<span style="font-size:0.7rem; color:#D97706; font-weight:700;"> • Placa: ${g.placa_vehiculo}</span>` : ''}
        </td>
        <td style="text-align: right; font-weight: 800; color: var(--anc-text-secondary);">
          S/ ${parseFloat(g.importe_total_bruto).toFixed(2)}
        </td>
        <td style="text-align: right; font-size: 0.78rem; color: var(--anc-crimson); font-weight: 700;">
          ${totalRet > 0 ? `- S/ ${totalRet.toFixed(2)}` : 'S/ 0.00'}
        </td>
        <td style="text-align: right; font-size: 1rem; font-weight: 900; color: var(--anc-emerald-dark);">
          S/ ${parseFloat(g.neto_pagado_efectivo).toFixed(2)}
        </td>
        <td style="text-align: center;">
          <span class="badge-pill semaforo-verde" style="font-size: 0.72rem;">
            ${g.estado_auditoria || 'APROBADO'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// =========================================================================
// 2. MODAL DE INGRESO RÁPIDO ESTILO CAPTURA 4 (CALCULADORA INTEGRADA)
// =========================================================================
window.abrirModalRegistroGasto = function() {
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  const cfg = window.ANC_STATE.config;
  const st = window.CAJA_CHICA_STATE.gastoEnEdicion;
  const nroCorrelativo = window.CAJA_CHICA_STATE.gastos.length + 1;

  modalContainer.innerHTML = `
    <div class="modal-backdrop open" id="modal-registro-caja">
      <div class="modal-sheet" style="max-width: 520px;">
        
        <!-- Cabecera Oscura con Contador #XX (Captura 4) -->
        <div class="modal-sheet-header">
          <button type="button" class="btn-modal-back" onclick="cerrarModalRegistroGasto()">←</button>
          <span class="modal-sheet-title">Añadir Comprobante o Gasto</span>
          <span class="modal-badge-counter">#${nroCorrelativo}</span>
        </div>

        <div class="modal-sheet-body">
          <form onsubmit="guardarGastoCajaChica(event)">
            
            <!-- TARJETA CALCULADORA OSCURA (DISEÑO EXACTO CAPTURA 4) -->
            <div class="calc-dark-card" style="border-color: var(--anc-gold-metallic);">
              <div class="calc-top-label">PRECIO / MONTO POR UNIDAD</div>
              
              <div class="calc-amount-row">
                <input type="number" step="0.01" id="calc-precio-unitario" class="calc-amount-input has-value" value="${st.montoUnitario || ''}" placeholder="0.00" oninput="recalcularMontosGasto()" required />
                <div class="calc-currency-badge">
                  <span>PEN</span>
                  <span>/ S/</span>
                  <span style="cursor:pointer;" onclick="abrirCalculadoraTeclado()" title="Calculadora rápida">⌨️</span>
                </div>
              </div>

              <!-- CHIPS DE TIPO DE COMPROBANTE -->
              <div class="calc-subbox">
                <div class="calc-subbox-label">TIPO DE COMPROBANTE DE PAGO:</div>
                <div class="chips-row">
                  <button type="button" class="chip-btn ${st.tipoComprobante === 'Factura' ? 'active' : ''}" onclick="setTipoComprobante('Factura')">Factura</button>
                  <button type="button" class="chip-btn ${st.tipoComprobante === 'Boleta' ? 'active' : ''}" onclick="setTipoComprobante('Boleta')">Boleta</button>
                  <button type="button" class="chip-btn ${st.tipoComprobante === 'Ticket' ? 'active' : ''}" onclick="setTipoComprobante('Ticket')">Ticket</button>
                  <button type="button" class="chip-btn ${st.tipoComprobante === 'DJ Movilidad' ? 'active' : ''}" onclick="setTipoComprobante('DJ Movilidad')">DJ Movilidad</button>
                  <button type="button" class="chip-btn ${st.tipoComprobante === 'Recibo Honorarios' ? 'active' : ''}" onclick="setTipoComprobante('Recibo Honorarios')">R. Honorarios (Locador)</button>
                </div>
              </div>

              <!-- CANTIDAD Y TOTAL CALCULADO (STEPPER - CAPTURA 4) -->
              <div class="calc-bottom-grid">
                <div class="calc-subbox" style="margin-bottom:0;">
                  <div class="calc-subbox-label">CANTIDAD / DÍAS:</div>
                  <div class="stepper-control">
                    <button type="button" class="btn-stepper" onclick="cambiarCantidadGasto(-1)">-</button>
                    <span id="label-cantidad-gasto" style="font-size:1.4rem; font-weight:900; color:#FFFFFF;">${st.cantidad}</span>
                    <button type="button" class="btn-stepper" onclick="cambiarCantidadGasto(1)">+</button>
                  </div>
                </div>

                <div class="calc-subbox" style="margin-bottom:0;">
                  <div class="calc-subbox-label">TOTAL BRUTO (S/):</div>
                  <div id="label-total-bruto" style="font-size:1.55rem; font-weight:900; color:var(--anc-gold-bright); text-align:right; margin-top:4px;">
                    S/ 0.00
                  </div>
                </div>
              </div>

            </div>

            <!-- SELECTOR CIRCULAR DE CATEGORÍAS (CAPTURA 4) -->
            <div style="font-size: 0.8rem; font-weight: 800; color: var(--anc-navy-main); text-transform: uppercase; margin-bottom: 6px;">
              CATEGORÍA DE GASTO: <span id="label-categoria-activa" style="color:var(--anc-gold-deep);">Materiales y Útiles</span>
            </div>

            <div class="category-circles-grid">
              <div class="cat-circle-item selected" data-cat="Materiales" onclick="seleccionarCategoriaGasto('Materiales')">
                <div class="cat-circle-icon">📦</div>
                <span class="cat-circle-label">Materiales</span>
              </div>
              <div class="cat-circle-item" data-cat="Alimentos" onclick="seleccionarCategoriaGasto('Alimentos')">
                <div class="cat-circle-icon" style="background:#F59E0B;">🍎</div>
                <span class="cat-circle-label">Alimentos</span>
              </div>
              <div class="cat-circle-item" data-cat="Combustible" onclick="seleccionarCategoriaGasto('Combustible')">
                <div class="cat-circle-icon" style="background:#EF4444;">⛽</div>
                <span class="cat-circle-label">Combustible</span>
              </div>
              <div class="cat-circle-item" data-cat="Mantenimiento" onclick="seleccionarCategoriaGasto('Mantenimiento')">
                <div class="cat-circle-icon" style="background:#3B82F6;">🔧</div>
                <span class="cat-circle-label">Mantenim.</span>
              </div>
              <div class="cat-circle-item" data-cat="Movilidad" onclick="seleccionarCategoriaGasto('Movilidad')">
                <div class="cat-circle-icon" style="background:#10B981;">🚕</div>
                <span class="cat-circle-label">Movilidad</span>
              </div>
              <div class="cat-circle-item" data-cat="Servicios" onclick="seleccionarCategoriaGasto('Servicios')">
                <div class="cat-circle-icon" style="background:#6366F1;">📄</div>
                <span class="cat-circle-label">Servicios</span>
              </div>
              <div class="cat-circle-item" data-cat="Enseres" onclick="seleccionarCategoriaGasto('Enseres')">
                <div class="cat-circle-icon" style="background:#EC4899;">☕</div>
                <span class="cat-circle-label">Enseres</span>
              </div>
              <div class="cat-circle-item" data-cat="Mas" onclick="seleccionarCategoriaGasto('Mas')">
                <div class="cat-circle-icon" style="background:#475569;">➕</div>
                <span class="cat-circle-label">Otros</span>
              </div>
            </div>

            <!-- RUBRO NORMATIVO ESPECÍFICO SEGÚN LA CATEGORÍA -->
            <div style="margin-bottom: 14px;">
              <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">
                CONCEPTO / CLASIFICADOR DEL GASTO:
              </label>
              <select id="modal-rubro-select" class="anc-select-styled" onchange="actualizarRubroSeleccionado(this.value)">
                ${generarOpcionesRubrosPorCategoria('Materiales')}
              </select>
            </div>

            <!-- CAMPOS CONDICIONALES INTELIGENTES -->
            <div id="caja-campos-condicionales" style="margin-bottom: 14px;"></div>

            <!-- DETALLE DEL GASTO Y COMPROBANTE -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
              <div>
                <label style="display:block; font-size:0.74rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">N° SERIE - NÚMERO (*)</label>
                <input type="text" id="m-gasto-serie" class="anc-input-styled" placeholder="Ej: F001-002341" required />
              </div>
              <div>
                <label style="display:block; font-size:0.74rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">FECHA COMPROBANTE (*)</label>
                <input type="date" id="m-gasto-fecha" class="anc-input-styled" value="${new Date().toISOString().split('T')[0]}" required />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1.6fr; gap: 10px; margin-bottom: 12px;">
              <div>
                <label style="display:block; font-size:0.74rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">RUC / DNI PROVEEDOR (*)</label>
                <input type="text" id="m-gasto-ruc" class="anc-input-styled" placeholder="11 dígitos (RUC)" maxlength="11" required />
              </div>
              <div>
                <label style="display:block; font-size:0.74rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">RAZÓN SOCIAL / NOMBRE (*)</label>
                <input type="text" id="m-gasto-razon" class="anc-input-styled" placeholder="Nombre comercial o locador" required />
              </div>
            </div>

            <div style="margin-bottom: 14px;">
              <label style="display:block; font-size:0.74rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">MOTIVO DETALLADO DEL GASTO (*)</label>
              <textarea id="m-gasto-motivo" class="anc-input-styled" rows="2" placeholder="Describir necesidad no programable y urgente..." required></textarea>
            </div>

            <!-- LIQUIDACIÓN TRIBUTARIA: RETENCIONES, DETRACCIÓN Y NETO -->
            <div id="caja-liquidacion-tributaria" style="background:#F8FAFC; border:1.5px solid var(--anc-border-light); border-radius:14px; padding:12px; margin-bottom:18px;">
              <!-- Se actualiza dinámicamente -->
            </div>

            <!-- BOTÓN DE CONFIRMACIÓN -->
            <button type="submit" id="btn-guardar-gasto" class="btn-anc-primary">
              ✓ Registrar Gasto en Caja Chica
            </button>
          </form>
        </div>

      </div>
    </div>
  `;

  // Inicializar vista de campos y montos
  actualizarCamposCondicionales('Materiales');
  recalcularMontosGasto();
};

window.cerrarModalRegistroGasto = function() {
  const modal = document.getElementById('modal-registro-caja');
  if (modal) modal.remove();
};

// Controladores del Modal de Registro
window.setTipoComprobante = function(tipo) {
  window.CAJA_CHICA_STATE.gastoEnEdicion.tipoComprobante = tipo;
  const chips = document.querySelectorAll('.chip-btn');
  chips.forEach(c => {
    if (c.textContent.trim().startsWith(tipo)) c.classList.add('active');
    else c.classList.remove('active');
  });
  recalcularMontosGasto();
};

window.cambiarCantidadGasto = function(delta) {
  const st = window.CAJA_CHICA_STATE.gastoEnEdicion;
  st.cantidad = Math.max(1, (st.cantidad || 1) + delta);
  const lbl = document.getElementById('label-cantidad-gasto');
  if (lbl) lbl.textContent = st.cantidad;
  recalcularMontosGasto();
};

window.seleccionarCategoriaGasto = function(cat) {
  window.CAJA_CHICA_STATE.gastoEnEdicion.categoriaIcono = cat;
  const items = document.querySelectorAll('.cat-circle-item');
  items.forEach(it => {
    if (it.getAttribute('data-cat') === cat) it.classList.add('selected');
    else it.classList.remove('selected');
  });

  const lblCat = document.getElementById('label-categoria-activa');
  if (lblCat) lblCat.textContent = cat;

  const selRubro = document.getElementById('modal-rubro-select');
  if (selRubro) {
    selRubro.innerHTML = generarOpcionesRubrosPorCategoria(cat);
    actualizarRubroSeleccionado(selRubro.value);
  }

  actualizarCamposCondicionales(cat);
  recalcularMontosGasto();
};

function generarOpcionesRubrosPorCategoria(cat) {
  const catalogo = window.ANC_STATE.catalogoBienesServicios || [];
  const filtrados = catalogo.filter(c => c.categoria_icono.toLowerCase() === cat.toLowerCase() || cat === 'Mas');

  if (filtrados.length === 0) {
    return `<option value="CC-MAT-01" data-esp="2.3.1.5.1.2">Materiales y útiles de oficina urgentes (2.3.1.5.1.2)</option>`;
  }

  return filtrados.map(r => `
    <option value="${r.codigo_rubro}" data-esp="${r.clasificador_gasto}" data-det="${r.codigo_detraccion_sugerido}">
      [${r.semaforo}] ${r.nombre_concepto} (${r.clasificador_gasto})
    </option>
  `).join('');
}

window.actualizarRubroSeleccionado = function(codRubro) {
  const sel = document.getElementById('modal-rubro-select');
  const opt = sel ? sel.options[sel.selectedIndex] : null;
  const esp = opt ? opt.getAttribute('data-esp') : '2.3.1.5.1.2';
  const det = opt ? opt.getAttribute('data-det') : '000';

  window.CAJA_CHICA_STATE.gastoEnEdicion.rubroCodigo = codRubro;
  window.CAJA_CHICA_STATE.gastoEnEdicion.especificaGasto = esp;
  window.CAJA_CHICA_STATE.gastoEnEdicion.codigoDetraccion = det;

  recalcularMontosGasto();
};

// Renderizar campos condicionales normativos (PECOSA, Placa, Tarifario, etc.)
function actualizarCamposCondicionales(cat) {
  const box = document.getElementById('caja-campos-condicionales');
  if (!box) return;

  if (cat === 'Materiales') {
    box.innerHTML = `
      <div style="background:#FFFBEB; border:1px solid #FCD34D; border-radius:10px; padding:10px;">
        <label style="display:block; font-size:0.74rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">
          N° PECOSA ALMACÉN SIN STOCK (*) (Directiva 5.2.1.1.4 y 5.2.1.3.3)
        </label>
        <input type="text" id="m-gasto-pecosa" class="anc-input-styled" placeholder="Ej: PECOSA-2026-0045" value="${window.CAJA_CHICA_STATE.gastoEnEdicion.pecosaSinStock || ''}" required />
        <small style="color:var(--anc-gold-deep); font-size:0.72rem; font-weight:700;">
          Obligatorio acreditar falta de disponibilidad en el Almacén de la ANC-MP.
        </small>
      </div>
    `;
  } else if (cat === 'Combustible' || cat === 'Mantenimiento') {
    box.innerHTML = `
      <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px; padding:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div>
          <label style="display:block; font-size:0.74rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">PLACA VEHÍCULO (*)</label>
          <input type="text" id="m-gasto-placa" class="anc-input-styled" placeholder="Ej: EGI-823" value="${window.CAJA_CHICA_STATE.gastoEnEdicion.placaVehiculo || ''}" required />
        </div>
        <div>
          <label style="display:block; font-size:0.74rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">KILOMETRAJE (*)</label>
          <input type="text" id="m-gasto-km" class="anc-input-styled" placeholder="Ej: 45,210 km" value="${window.CAJA_CHICA_STATE.gastoEnEdicion.kmVehiculo || ''}" required />
        </div>
      </div>
    `;
  } else if (cat === 'Movilidad') {
    const tarifario = window.ANC_STATE.tarifarioMovilidad || [];
    let opts = tarifario.map(t => `<option value="${t.id}" data-dia="${t.tarifa_dia}" data-noche="${t.tarifa_noche}">${t.distrito} (Día: S/ ${t.tarifa_dia} | Noche: S/ ${t.tarifa_noche})</option>`).join('');
    box.innerHTML = `
      <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:10px;">
        <label style="display:block; font-size:0.74rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">DISTRITO TARIFARIO ÚNICO (ANEXO 09):</label>
        <select id="m-gasto-distrito" class="anc-select-styled" onchange="aplicarTarifaMovilidad(this)">
          ${opts}
        </select>
        <div style="margin-top:6px; display:flex; gap:12px; font-size:0.78rem; font-weight:800; color:var(--anc-navy-main);">
          <label><input type="radio" name="horario_mov" value="DIA" checked onchange="aplicarTarifaMovilidad()" /> Tarifa Día</label>
          <label><input type="radio" name="horario_mov" value="NOCHE" onchange="aplicarTarifaMovilidad()" /> Tarifa Noche (≥ 19:00 hrs)</label>
        </div>
      </div>
    `;
  } else if (cat === 'Alimentos') {
    box.innerHTML = `
      <div style="background:#FFFBEB; border:1px solid #FCD34D; border-radius:10px; padding:10px;">
        <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:800; color:var(--anc-navy-main); cursor:pointer;">
          <input type="checkbox" id="m-gasto-horas-ext" checked onchange="recalcularMontosGasto()" />
          <span>Servidor administrativo con +4h adicionales a su jornada laboral (Tope S/ 24.00)</span>
        </label>
        <small style="display:block; color:#991B1B; font-size:0.72rem; margin-top:4px;">
          Prohibido para Fiscales con gastos operativos (Res. 190-2022-MP-FN) y para locadores o proveedores de servicios.
        </small>
      </div>
    `;
  } else {
    box.innerHTML = '';
  }
}

window.aplicarTarifaMovilidad = function() {
  const sel = document.getElementById('m-gasto-distrito');
  if (!sel) return;
  const opt = sel.options[sel.selectedIndex];
  const esNoche = document.querySelector('input[name="horario_mov"]:checked')?.value === 'NOCHE';
  const tarifa = esNoche ? parseFloat(opt.getAttribute('data-noche')) : parseFloat(opt.getAttribute('data-dia'));

  const inputP = document.getElementById('calc-precio-unitario');
  if (inputP) {
    inputP.value = tarifa.toFixed(2);
    recalcularMontosGasto();
  }
};

// Recalcular montos, retenciones y detracciones en vivo
window.recalcularMontosGasto = function() {
  const cfg = window.ANC_STATE.config;
  const inputP = document.getElementById('calc-precio-unitario');
  const precioUnit = parseFloat(inputP?.value) || 0.00;
  const cantidad = window.CAJA_CHICA_STATE.gastoEnEdicion.cantidad || 1;
  const tipoComp = window.CAJA_CHICA_STATE.gastoEnEdicion.tipoComprobante;
  const cat = window.CAJA_CHICA_STATE.gastoEnEdicion.categoriaIcono;

  const totalBruto = precioUnit * cantidad;
  const lblTotal = document.getElementById('label-total-bruto');
  if (lblTotal) lblTotal.textContent = `S/ ${totalBruto.toFixed(2)}`;

  // Validar Tope 20% de la UIT (S/ 1,070.00)
  const topeComprobante = cfg.valor_uit * 0.20;
  const superaTopeCaja = totalBruto > topeComprobante;

  // 1. Retención IGV (3% en Facturas > S/ 700.00)
  let montoRetIGV = 0.00;
  let aplicaRetIGV = false;
  if (tipoComp === 'Factura' && totalBruto > (cfg.umbral_retencion_igv || 700.00)) {
    aplicaRetIGV = true;
    montoRetIGV = totalBruto * (cfg.tasa_retencion_igv / 100);
  }

  // 2. Retención Cuarta Categoría (8% en Recibos por Honorarios > S/ 1,500.00)
  let montoRet4ta = 0.00;
  let aplicaRet4ta = false;
  if (tipoComp === 'Recibo Honorarios' && totalBruto > (cfg.umbral_retencion_4ta || 1500.00)) {
    aplicaRet4ta = true;
    montoRet4ta = totalBruto * (cfg.tasa_retencion_4ta / 100);
  }

  // 3. Detracción (Anexo 03 si supera S/ 700.00)
  let montoDetraccion = 0.00;
  const codDet = window.CAJA_CHICA_STATE.gastoEnEdicion.codigoDetraccion || '000';
  const catalogoDet = window.ANC_STATE.catalogoDetracciones || [];
  const detInfo = catalogoDet.find(d => d.codigo === codDet);
  const tasaDet = detInfo ? parseFloat(detInfo.tasa_porcentaje) : 0.00;

  if (tasaDet > 0 && totalBruto > 700.00) {
    montoDetraccion = totalBruto * (tasaDet / 100);
  }

  const netoEfectivo = Math.max(0, totalBruto - montoRetIGV - montoRet4ta - montoDetraccion);

  // Actualizar estado
  window.CAJA_CHICA_STATE.gastoEnEdicion.montoUnitario = precioUnit;
  window.CAJA_CHICA_STATE.gastoEnEdicion.montoTotalBruto = totalBruto;
  window.CAJA_CHICA_STATE.gastoEnEdicion.montoRetencionIGV = montoRetIGV;
  window.CAJA_CHICA_STATE.gastoEnEdicion.montoRetencion4ta = montoRet4ta;
  window.CAJA_CHICA_STATE.gastoEnEdicion.montoDetraccion = montoDetraccion;
  window.CAJA_CHICA_STATE.gastoEnEdicion.netoPagadoEfectivo = netoEfectivo;

  // Renderizar bloque de Liquidación Tributaria
  const boxLiq = document.getElementById('caja-liquidacion-tributaria');
  if (boxLiq) {
    boxLiq.innerHTML = `
      <div style="font-size: 0.76rem; font-weight: 800; color: var(--anc-navy-main); text-transform: uppercase; margin-bottom: 8px;">
        💵 Liquidación Tributaria y Desembolso Neto:
      </div>

      <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
        <span>Importe Bruto del Comprobante:</span>
        <strong style="color:var(--anc-navy-main);">S/ ${totalBruto.toFixed(2)}</strong>
      </div>

      ${aplicaRetIGV ? `
        <div style="display:flex; justify-content:space-between; font-size:0.82rem; color:var(--anc-crimson); margin-bottom:3px;">
          <span>Retención IGV 3% (SUNAT Factura > S/ 700):</span>
          <strong>- S/ ${montoRetIGV.toFixed(2)}</strong>
        </div>
      ` : ''}

      ${aplicaRet4ta ? `
        <div style="display:flex; justify-content:space-between; font-size:0.82rem; color:var(--anc-crimson); margin-bottom:3px;">
          <span>Retención 4ta Categoría 8% (R.H. > S/ 1,500):</span>
          <strong>- S/ ${montoRet4ta.toFixed(2)}</strong>
        </div>
      ` : ''}

      ${montoDetraccion > 0 ? `
        <div style="display:flex; justify-content:space-between; font-size:0.82rem; color:#D97706; margin-bottom:3px;">
          <span>Detracción ${tasaDet}% (Banco de la Nación - Cód ${codDet}):</span>
          <strong>- S/ ${montoDetraccion.toFixed(2)}</strong>
        </div>
      ` : ''}

      <div style="display:flex; justify-content:space-between; font-size:1.05rem; font-weight:900; color:var(--anc-emerald-dark); border-top:1.5px solid var(--anc-border-light); padding-top:6px; margin-top:6px;">
        <span>NETO A DESEMBOLSAR EN EFECTIVO:</span>
        <span>S/ ${netoEfectivo.toFixed(2)}</span>
      </div>

      ${superaTopeCaja ? `
        <div style="margin-top:8px; padding:8px; background:var(--anc-crimson-soft); border-left:4px solid var(--anc-crimson); color:#991B1B; font-size:0.78rem; font-weight:700;">
          ⚠️ ALERTA: Supera el 20% de la UIT (S/ ${topeComprobante.toFixed(2)}). Por Caja Chica está PROHIBIDO. Si es para eventos, talleres o mantenimiento, consulte el Evaluador de Encargos.
        </div>
      ` : ''}
    `;
  }
};

// Guardar gasto en Supabase y actualizar balance
window.guardarGastoCajaChica = async function(e) {
  e.preventDefault();
  const st = window.CAJA_CHICA_STATE.gastoEnEdicion;
  const cfg = window.ANC_STATE.config;
  const dep = window.ANC_STATE.dependenciaActiva;
  const usr = window.ANC_STATE.usuarioActivo;

  const topeComprobante = cfg.valor_uit * 0.20;
  if (st.montoTotalBruto > topeComprobante) {
    if (!confirm(`El monto total (S/ ${st.montoTotalBruto.toFixed(2)}) supera el tope del 20% de la UIT (S/ ${topeComprobante.toFixed(2)}). ¿Desea guardarlo de forma excepcional bajo observación de auditoría?`)) {
      return;
    }
  }

  const serie = document.getElementById('m-gasto-serie').value.trim();
  const fecha = document.getElementById('m-gasto-fecha').value;
  const ruc = document.getElementById('m-gasto-ruc').value.trim();
  const razon = document.getElementById('m-gasto-razon').value.trim();
  const motivo = document.getElementById('m-gasto-motivo').value.trim();
  const pecosa = document.getElementById('m-gasto-pecosa')?.value.trim() || null;
  const placa = document.getElementById('m-gasto-placa')?.value.trim() || null;
  const km = document.getElementById('m-gasto-km')?.value.trim() || null;

  const nroCorrelativo = window.CAJA_CHICA_STATE.gastos.length + 1;

  const nuevoGasto = {
    numero_correlativo: nroCorrelativo,
    anio_fiscal: cfg.anio_fiscal || 2026,
    mes_ejecucion: cfg.mes_actual || 'Noviembre',
    fecha_comprobante: fecha,
    unidad_organica_id: dep.id,
    usuario_registro_id: usr.id,
    modalidad_ejecucion: 'CAJA_CHICA',
    tipo_comprobante: st.tipoComprobante,
    serie_numero_comprobante: serie,
    ruc_dni_proveedor: ruc,
    razon_social_proveedor: razon,
    detalle_motivo_gasto: motivo,
    especifica_gasto: st.especificaGasto || '2.3.1.5.1.2',
    cantidad: st.cantidad || 1,
    precio_unitario: st.montoUnitario,
    importe_total_bruto: st.montoTotalBruto,
    aplica_retencion_igv: st.montoRetencionIGV > 0,
    monto_retencion_igv: st.montoRetencionIGV,
    aplica_retencion_4ta: st.montoRetencion4ta > 0,
    monto_retencion_4ta: st.montoRetencion4ta,
    codigo_detraccion: st.codigoDetraccion || '000',
    monto_detraccion: st.montoDetraccion,
    neto_pagado_efectivo: st.netoPagadoEfectivo,
    nro_pecosa_sin_stock: pecosa,
    placa_vehiculo: placa,
    kilometraje_vehiculo: km,
    estado_auditoria: st.montoTotalBruto > topeComprobante ? 'OBSERVADO' : 'APROBADO'
  };

  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('gastos_caja_chica').insert([nuevoGasto]).select();
      if (!error && data && data.length > 0) {
        nuevoGasto.id = data[0].id;
      }
    }
  } catch (err) {
    console.warn('Gasto guardado localmente:', err);
  }

  window.CAJA_CHICA_STATE.gastos.unshift(nuevoGasto);
  calcularTotalGastadoDep();

  cerrarModalRegistroGasto();
  renderizarVistaCajaChica();
  mostrarToast(`✓ Comprobante ${serie} registrado exitosamente.`, 'success');
};

// Generador de Rendición de Caja Chica en PDF (Formato Anexo 13)
window.generarRendicionCajaChicaPDF = function() {
  const dep = window.ANC_STATE.dependenciaActiva;
  const cfg = window.ANC_STATE.config;
  const gastos = window.CAJA_CHICA_STATE.gastos;

  if (!gastos || gastos.length === 0) {
    alert('No existen gastos registrados para emitir la rendición.');
    return;
  }

  const codRendicion = `REND-CC-${cfg.anio_fiscal}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  const totalRendido = gastos.reduce((acc, g) => acc + (parseFloat(g.neto_pagado_efectivo) || 0), 0);

  const htmlDoc = `
    <div style="font-family: Arial, sans-serif; font-size: 10.5px; color: #000; padding: 18px; line-height: 1.3;">
      <table style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px;">
        <tr>
          <td style="width: 55px; vertical-align: middle;">
            <img src="./escudo-anc.png" style="height: 48px; width: auto;" alt="Escudo" />
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <div style="font-size: 12px; font-weight: 900;">MINISTERIO PÚBLICO - FISCALÍA DE LA NACIÓN</div>
            <div style="font-size: 11.5px; font-weight: 800; color: #0E2C52;">AUTORIDAD NACIONAL DE CONTROL (ANC-MP)</div>
            <div style="font-size: 9.5px; font-weight: 700;">UNIDAD EJECUTORA 012: ANC-MP • RUC: 20131370301</div>
          </td>
          <td style="width: 100px; text-align: right; font-size: 9.5px; vertical-align: top;">
            <strong>${codRendicion}</strong><br />
            Anexo 13 (V.08)<br />
            ${cfg.mes_actual} ${cfg.anio_fiscal}
          </td>
        </tr>
      </table>

      <div style="text-align: center; background: #E2E8F0; border: 1px solid #64748B; padding: 4px; font-size: 11px; font-weight: 900; margin-bottom: 10px;">
        ANEXO 13: FORMATO DE RENDICIÓN DE LA CAJA CHICA DE LA SEDE CENTRAL / ADC
      </div>

      <table style="width: 100%; margin-bottom: 10px; font-size: 10px;">
        <tr>
          <td style="width: 20%; font-weight: bold;">Dependencia Solicitante:</td>
          <td style="width: 50%; border-bottom: 1px dotted #888;">[${dep.codigo}] ${dep.nombre_dependencia}</td>
          <td style="width: 15%; font-weight: bold;">Distrito Fiscal:</td>
          <td style="width: 15%; border-bottom: 1px dotted #888;">${dep.distrito_fiscal || 'LIMA CENTRO'}</td>
        </tr>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9px;" border="1" cellpadding="3">
        <thead>
          <tr style="background: #0E2C52; color: #FFF; text-align: center;">
            <th style="width: 20px;">N°</th>
            <th>FECHA</th>
            <th>COMPROBANTE</th>
            <th>RUC</th>
            <th>PROVEEDOR</th>
            <th>DETALLE DEL GASTO</th>
            <th>ESP.</th>
            <th>BRUTO S/</th>
            <th>RET/DET S/</th>
            <th>NETO S/</th>
          </tr>
        </thead>
        <tbody>
          ${gastos.map((g, i) => `
            <tr>
              <td style="text-align: center;">${i + 1}</td>
              <td>${g.fecha_comprobante}</td>
              <td>${g.tipo_comprobante} ${g.serie_numero_comprobante}</td>
              <td>${g.ruc_dni_proveedor}</td>
              <td>${g.razon_social_proveedor}</td>
              <td>${g.detalle_motivo_gasto}</td>
              <td style="text-align: center;">${g.especifica_gasto}</td>
              <td style="text-align: right;">S/ ${parseFloat(g.importe_total_bruto).toFixed(2)}</td>
              <td style="text-align: right;">S/ ${((parseFloat(g.monto_retencion_igv) || 0) + (parseFloat(g.monto_retencion_4ta) || 0) + (parseFloat(g.monto_detraccion) || 0)).toFixed(2)}</td>
              <td style="text-align: right; font-weight: bold;">S/ ${parseFloat(g.neto_pagado_efectivo).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr style="background: #F8FAFC; font-weight: bold;">
            <td colspan="9" style="text-align: right;">IMPORTE TOTAL DE LA PRESENTE RENDICIÓN (S/):</td>
            <td style="text-align: right; color: #0E2C52; font-size: 10.5px;">S/ ${totalRendido.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <table style="width: 100%; text-align: center; font-size: 9px; margin-top: 30px;">
        <tr>
          <td style="width: 33%; border-top: 1px solid #000; padding-top: 4px;">
            <strong>Encargado Único de Caja Chica</strong><br />
            Firma y Sello
          </td>
          <td style="width: 33%; border-top: 1px solid #000; padding-top: 4px;">
            <strong>Responsable de la Unidad / ADC</strong><br />
            V°B° Conformidad
          </td>
          <td style="width: 33%; border-top: 1px solid #000; padding-top: 4px;">
            <strong>Oficina de Tesorería / OAF</strong><br />
            Revisión y Reposición
          </td>
        </tr>
      </table>
    </div>
  `;

  const opt = {
    margin: [8, 8, 8, 8],
    filename: `${codRendicion}_ANC_MP.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  const container = document.getElementById('area-impresion-pdf');
  if (container && window.html2pdf) {
    container.innerHTML = htmlDoc;
    container.style.display = 'block';
    window.html2pdf().set(opt).from(container).save().then(() => {
      container.style.display = 'none';
      mostrarToast(`✓ Rendición ${codRendicion}.pdf generada con éxito.`, 'success');
    });
  } else {
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${codRendicion}</title></head><body>${htmlDoc}</body></html>`);
    win.document.close();
    win.print();
  }
};

// =========================================================================
// 3. EVALUADOR INTERACTIVO DE REQUERIMIENTOS Y ENCARGOS
// =========================================================================
function renderizarVistaEvaluador() {
  const vista = document.getElementById('vista-evaluador');
  if (!vista) return;

  const cfg = window.ANC_STATE.config;
  const catalogo = window.ANC_STATE.catalogoBienesServicios || [];

  vista.innerHTML = `
    <!-- Tarjeta Principal del Evaluador Normativo -->
    <div class="section-card-white" style="border-top: 5px solid var(--anc-cobalt-blue);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.8rem;">🚦</span>
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 900; color: var(--anc-navy-main);">Evaluador de Requerimientos y Encargos</h2>
            <p style="font-size: 0.85rem; color: var(--anc-text-secondary); font-weight: 600;">
              Consulta rápida: ¿En qué puedo gastar? • Caja Chica V.08 vs. Encargos V.06
            </p>
          </div>
        </div>

        <!-- Buscador en Tiempo Real -->
        <input type="text" id="buscador-evaluador" class="anc-input-styled" placeholder="🔍 Buscar bien, servicio o regla..." style="max-width: 260px;" oninput="filtrarEvaluador(this.value)" />
      </div>

      <!-- SIMULADOR INTERACTIVO "CAJA CHICA VS. ENCARGOS" -->
      <div style="background: var(--anc-blue-tint); border: 2px solid var(--anc-royal-blue); border-radius: 16px; padding: 14px; margin-bottom: 18px;">
        <div style="font-size: 0.84rem; font-weight: 900; color: var(--anc-navy-main); text-transform: uppercase; margin-bottom: 8px;">
          ⚡ Simulador de Viabilidad Normativa Instantánea:
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 10px;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">MONTO ESTIMADO (S/)</label>
            <input type="number" id="sim-monto" class="anc-input-styled" placeholder="Ej: 850.00 o 3500.00" oninput="ejecutarSimulacionNormativa()" />
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">NATURALEZA DE LA NECESIDAD</label>
            <select id="sim-tipo" class="anc-select-styled" onchange="ejecutarSimulacionNormativa()">
              <option value="BIEN_URGENTE">Bienes o suministros urgentes no programables</option>
              <option value="MANTENIMIENTO_LOCAL">Mantenimiento o acondicionamiento de local</option>
              <option value="TALLER_CAPACITACION">Eventos, talleres o investigación (expositor)</option>
              <option value="SERVICIO_BASICO">Servicios básicos (Agua, Luz, Teléfono, Internet)</option>
              <option value="ACTIVO_FIJO">Compra de mueble/equipo (escritorio, silla, PC)</option>
            </select>
          </div>
        </div>

        <div id="resultado-simulacion" style="background:#FFFFFF; border:1px solid var(--anc-border-light); border-radius:10px; padding:10px; font-size:0.86rem; color:var(--anc-navy-main);">
          👉 Ingrese un monto para evaluar si aplica <strong>Caja Chica</strong>, <strong>Encargos</strong> o <strong>Proceso Logístico</strong>.
        </div>
      </div>

      <!-- CHIPS DE FILTRO DE SEMÁFORO -->
      <div class="chips-row" style="margin-bottom: 14px;">
        <button type="button" class="chip-btn active" onclick="filtrarSemaforo('TODOS')">Todos los Conceptos</button>
        <button type="button" class="chip-btn" onclick="filtrarSemaforo('VERDE')">🟢 Permitido con Tope</button>
        <button type="button" class="chip-btn" onclick="filtrarSemaforo('AMARILLO')">🟡 Con Requisito Previo</button>
        <button type="button" class="chip-btn" onclick="filtrarSemaforo('ROJO')">🔴 Prohibiciones Expresas</button>
        <button type="button" class="chip-btn" onclick="filtrarSemaforo('ENCARGO')">🔵 Fondos por Encargo</button>
      </div>

      <!-- ACORDEÓN / TARJETAS DEL CATÁLOGO NORMATIVO -->
      <div id="contenedor-items-evaluador" style="display:flex; flex-direction:column; gap:10px;">
        ${generarTarjetasEvaluador(catalogo)}
      </div>
    </div>
  `;
}

function generarTarjetasEvaluador(lista) {
  if (!lista || lista.length === 0) {
    return `<div style="text-align:center; padding:20px; color:var(--anc-text-secondary);">No se encontraron conceptos normativos.</div>`;
  }

  const cfg = window.ANC_STATE.config;

  return lista.map(item => {
    let badgeColor = 'semaforo-verde';
    if (item.semaforo === 'AMARILLO') badgeColor = 'semaforo-amarillo';
    if (item.semaforo === 'ROJO') badgeColor = 'semaforo-rojo';
    if (item.modalidad === 'ENCARGO') badgeColor = 'badge-pill" style="background:var(--anc-royal-blue); color:#FFF;';

    const topeCompSoles = item.tipo_tope_comprobante === 'MONTO_FIJO' 
      ? item.valor_tope_comprobante 
      : (cfg.valor_uit * (item.valor_tope_comprobante / 100));

    return `
      <div class="section-card-white" style="padding:14px; margin-bottom:0; border-left:5px solid ${item.semaforo === 'VERDE' ? 'var(--anc-emerald)' : item.semaforo === 'AMARILLO' ? 'var(--anc-gold-bright)' : 'var(--anc-crimson)'};">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:6px;">
          <div>
            <span class="badge-pill ${badgeColor}">
              ${item.modalidad === 'ENCARGO' ? '🔵 ENCARGOS' : item.semaforo}
            </span>
            <strong style="font-size:0.95rem; color:var(--anc-navy-main); margin-left:6px;">${item.nombre_concepto}</strong>
          </div>
          <span style="font-size:0.75rem; font-weight:700; color:var(--anc-cobalt-blue);">Esp: ${item.clasificador_gasto}</span>
        </div>

        <div style="font-size:0.83rem; color:var(--anc-text-secondary); line-height:1.45; margin-bottom:8px;">
          ${item.requisitos_y_base_legal}
        </div>

        <div style="display:flex; gap:14px; flex-wrap:wrap; font-size:0.76rem; font-weight:800; background:#F8FAFC; padding:8px 10px; border-radius:8px;">
          ${item.modalidad !== 'PROHIBIDO' ? `
            <span>Tope por Comprobante: <strong style="color:var(--anc-navy-main);">S/ ${topeCompSoles.toFixed(2)}</strong></span>
            <span>Tope Anual: <strong style="color:var(--anc-gold-deep);">${item.tope_anual_uit} UIT (S/ ${(item.tope_anual_uit * cfg.valor_uit).toLocaleString('es-PE', { minimumFractionDigits: 2 })})</strong></span>
          ` : `
            <span style="color:var(--anc-crimson); font-weight:900;">BLOQUEADO AUTOMÁTICAMENTE EN CAJA CHICA</span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Filtros y Buscador del Evaluador
window.filtrarEvaluador = function(texto) {
  const query = texto.toLowerCase().trim();
  const catalogo = window.ANC_STATE.catalogoBienesServicios || [];
  const filtrados = catalogo.filter(c => 
    c.nombre_concepto.toLowerCase().includes(query) || 
    c.requisitos_y_base_legal.toLowerCase().includes(query) ||
    c.clasificador_gasto.includes(query)
  );
  const cont = document.getElementById('contenedor-items-evaluador');
  if (cont) cont.innerHTML = generarTarjetasEvaluador(filtrados);
};

window.filtrarSemaforo = function(filtro) {
  const catalogo = window.ANC_STATE.catalogoBienesServicios || [];
  let filtrados = catalogo;
  if (filtro === 'VERDE' || filtro === 'AMARILLO' || filtro === 'ROJO') {
    filtrados = catalogo.filter(c => c.semaforo === filtro);
  } else if (filtro === 'ENCARGO') {
    filtrados = catalogo.filter(c => c.modalidad === 'ENCARGO');
  }

  const chips = document.querySelectorAll('.chip-btn');
  chips.forEach(c => {
    if (c.textContent.includes(filtro)) c.classList.add('active');
    else c.classList.remove('active');
  });

  const cont = document.getElementById('contenedor-items-evaluador');
  if (cont) cont.innerHTML = generarTarjetasEvaluador(filtrados);
};

// Simulador de Viabilidad Normativa
window.ejecutarSimulacionNormativa = function() {
  const monto = parseFloat(document.getElementById('sim-monto')?.value) || 0;
  const tipo = document.getElementById('sim-tipo')?.value;
  const res = document.getElementById('resultado-simulacion');
  if (!res) return;

  const cfg = window.ANC_STATE.config;
  const tope20Uit = cfg.valor_uit * 0.20; // S/ 1,070.00
  const tope10Uit = cfg.valor_uit * 10; // S/ 53,500.00
  const unaUit = cfg.valor_uit;

  if (monto <= 0) {
    res.innerHTML = '👉 Ingrese un monto para evaluar la viabilidad.';
    return;
  }

  if (tipo === 'SERVICIO_BASICO') {
    res.innerHTML = `
      <div style="color:var(--anc-crimson); font-weight:800;">
        ⛔ PROHIBICIÓN EXPRESA (Directiva Caja Chica 5.2.1.3.9 / RD 008-2024-EF):<br />
        Queda terminantemente prohibido pagar Servicios Básicos (agua, luz, teléfono, internet) con Caja Chica.<br />
        <em>Vía requerida:</em> Gestión mensual centralizada con la Unidad de Abastecimiento.
      </div>
    `;
  } else if (tipo === 'ACTIVO_FIJO') {
    res.innerHTML = `
      <div style="color:var(--anc-crimson); font-weight:800;">
        ⛔ BIEN INVENTARIABLE / ACTIVO FIJO (Directiva 5.2.1.9.5):<br />
        Prohibida la compra de escritorios, sillas, armarios, impresoras o cámaras fotográficas por Caja Chica ni Encargos.<br />
        <em>Vía requerida:</em> Cuadro Multianual de Necesidades (CMN) y trámite formal en la Unidad de Abastecimiento.
      </div>
    `;
  } else if (monto <= tope20Uit) {
    res.innerHTML = `
      <div style="color:var(--anc-emerald-dark); font-weight:800;">
        ✅ PROCEDE POR CAJA CHICA (Tope Comprobante ≤ 20% UIT: S/ ${tope20Uit.toFixed(2)}):<br />
        El monto de S/ ${monto.toFixed(2)} califica para cancelación inmediata por Caja Chica.<br />
        <em>Requisitos:</em> Comprobante de pago a nombre de la entidad (RUC 20131370301) y sustento de urgencia no programable.
      </div>
    `;
  } else if (monto > tope20Uit && monto <= tope10Uit && (tipo === 'TALLER_CAPACITACION' || tipo === 'MANTENIMIENTO_LOCAL')) {
    res.innerHTML = `
      <div style="color:var(--anc-royal-blue); font-weight:800;">
        🔵 PROCEDE POR LA MODALIDAD DE ENCARGOS (Directiva V.06 - OGFIN/DIR-01):<br />
        Supera el 20% de Caja Chica, pero califica para solicitud de <strong>Fondo por Encargo</strong> (hasta 10 UIT: S/ ${tope10Uit.toLocaleString('es-PE')}).<br />
        • <em>Cotizaciones:</em> ${monto >= unaUit ? '⚠️ Exige recopilar 3 cotizaciones y Cuadro Comparativo (≥ 1 UIT).' : 'No requiere 3 cotizaciones (< 1 UIT).'}<br />
        • <em>Rendición:</em> Plazo improrrogable de tres (03) días hábiles después de concluida la actividad.<br />
        • <em>Personal responsable:</em> Debe pertenecer a D.L. 728 o D.L. 276 (Prohibido entregar a personal CAS o locadores / proveedores de servicios).
      </div>
    `;
  } else {
    res.innerHTML = `
      <div style="color:#D97706; font-weight:800;">
        ⚠️ SUPERA TOPES DE CAJA CHICA Y ENCARGOS (S/ ${monto.toFixed(2)}):<br />
        Debe gestionarse como requerimiento de compra o contratación formal ante la <strong>Unidad de Abastecimiento</strong> conforme a la Ley de Contrataciones.
      </div>
    `;
  }
};
