// =========================================================================
// ETAPA 6: PANEL ADMINISTRADOR Y REPORTES NACIONALES
// CONSOLIDADO NACIONAL PARA LA SEDE CENTRAL Y LAS 34 ADC (UE 012: ANC-MP)
// =========================================================================

// Estado reactivo local para el Panel de Administrador
window.ADMIN_STATE = {
  gastosTodos: [],
  viaticosTodos: [],
  filtroDependencia: 'TODAS',
  filtroMes: 'Noviembre',
  filtroAnio: 2026
};

// Inicialización del módulo al cargar
document.addEventListener('DOMContentLoaded', () => {
  console.log('Inicializando Etapa 6: Panel Administrador ANC-MP...');
});

// Cargar todos los datos a nivel nacional (Solo si tiene Rol ADMIN)
async function cargarDatosNacionalesAdmin() {
  const user = window.ANC_STATE.usuarioActivo;
  
  if (user.rol_sistema !== 'ADMIN') {
    alert('Acceso Denegado: Su perfil no tiene privilegios de Administrador Nacional.');
    cambiarVista('vista-inicio');
    return false;
  }

  mostrarToast('Cargando registros a nivel nacional...', 'info');

  try {
    if (supabaseClient) {
      // Cargar todos los gastos de Caja Chica
      const { data: dataCaja, error: errCaja } = await supabaseClient
        .from('gastos_caja_chica')
        .select(`
          *,
          unidades_organicas(codigo, nombre_dependencia),
          usuarios_perfiles(nombres_apellidos)
        `)
        .order('id', { ascending: false });

      if (!errCaja && dataCaja) {
        window.ADMIN_STATE.gastosTodos = dataCaja;
      }

      // Cargar todas las solicitudes de Viáticos con sus comisionados
      const { data: dataViat, error: errViat } = await supabaseClient
        .from('solicitudes_viaticos')
        .select(`
          *,
          unidades_organicas(codigo, nombre_dependencia),
          usuarios_perfiles(nombres_apellidos),
          comisionados_viaticos(*)
        `)
        .order('id', { ascending: false });

      if (!errViat && dataViat) {
        window.ADMIN_STATE.viaticosTodos = dataViat;
      }
    }
  } catch (err) {
    console.warn('Modo offline: Cargando datos locales simulados para el Panel Admin');
    
    // Fallback: Usar los gastos de Caja Chica creados en la sesión actual
    window.ADMIN_STATE.gastosTodos = window.CAJA_CHICA_STATE.gastos.map(g => ({
      ...g,
      unidades_organicas: { codigo: window.ANC_STATE.dependenciaActiva.codigo, nombre_dependencia: window.ANC_STATE.dependenciaActiva.nombre_dependencia },
      usuarios_perfiles: { nombres_apellidos: window.ANC_STATE.usuarioActivo.nombres_apellidos }
    }));

    // Fallback: Si no hay viáticos, generar uno vacío
    window.ADMIN_STATE.viaticosTodos = [];
  }

  return true;
}

// =========================================================================
// 1. RENDERIZADO DEL PANEL DE ADMINISTRADOR
// =========================================================================
window.renderizarVistaAdmin = async function() {
  const vista = document.getElementById('vista-admin');
  if (!vista) return;

  const tieneAcceso = await cargarDatosNacionalesAdmin();
  if (!tieneAcceso) return;

  const st = window.ADMIN_STATE;
  const cfg = window.ANC_STATE.config;
  const dependencias = window.ANC_STATE.unidadesOrganicas || [];

  // Opciones del Filtro de Dependencias
  let optDeps = '<option value="TODAS">Nacional: Sede Central y las 34 ADC</option>';
  dependencias.forEach(d => {
    optDeps += `<option value="${d.id}">[${d.codigo}] ${d.nombre_dependencia}</option>`;
  });

  // Filtrar los datos en memoria según los selectores
  let gastosFiltrados = st.gastosTodos;
  let viaticosFiltrados = st.viaticosTodos;

  if (st.filtroDependencia !== 'TODAS') {
    gastosFiltrados = gastosFiltrados.filter(g => String(g.unidad_organica_id) === String(st.filtroDependencia));
    viaticosFiltrados = viaticosFiltrados.filter(v => String(v.unidad_organica_id) === String(st.filtroDependencia));
  }

  gastosFiltrados = gastosFiltrados.filter(g => g.anio_fiscal === st.filtroAnio && g.mes_ejecucion === st.filtroMes);
  viaticosFiltrados = viaticosFiltrados.filter(v => v.anio_fiscal === st.filtroAnio && v.mes_ejecucion === st.filtroMes);

  // Cálculos consolidados
  const totalCajaChica = gastosFiltrados.reduce((sum, g) => sum + (parseFloat(g.neto_pagado_efectivo) || 0), 0);
  const totalViaticos = viaticosFiltrados.reduce((sum, v) => sum + (parseFloat(v.total_general_pen) || 0), 0);
  const granTotal = totalCajaChica + totalViaticos;

  vista.innerHTML = `
    <div class="section-card-white" style="border-top: 5px solid var(--anc-navy-deep);">
      
      <!-- Cabecera del Panel Admin -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.8rem;">📊</span>
          <div>
            <h2 style="font-size: 1.3rem; font-weight: 900; color: var(--anc-navy-main);">Panel Administrador Nacional</h2>
            <p style="font-size: 0.85rem; color: var(--anc-text-secondary); font-weight: 600;">
              Auditoría y control consolidado de la Unidad Ejecutora 012
            </p>
          </div>
        </div>
      </div>

      <!-- Filtros Dinámicos -->
      <div style="background: var(--anc-bg-pearl); border: 1.5px solid var(--anc-border-light); border-radius: 14px; padding: 14px; margin-bottom: 20px;">
        <div style="font-size: 0.8rem; font-weight: 900; color: var(--anc-navy-main); text-transform: uppercase; margin-bottom: 10px;">
          🔍 Filtros de Auditoría:
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--anc-text-secondary); margin-bottom:4px;">DEPENDENCIA / ADC</label>
            <select id="admin-f-dep" class="anc-select-styled" onchange="aplicarFiltrosAdmin()">
              ${optDeps}
            </select>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--anc-text-secondary); margin-bottom:4px;">AÑO FISCAL</label>
            <select id="admin-f-anio" class="anc-select-styled" onchange="aplicarFiltrosAdmin()">
              <option value="2025" ${st.filtroAnio === 2025 ? 'selected' : ''}>2025</option>
              <option value="2026" ${st.filtroAnio === 2026 ? 'selected' : ''}>2026</option>
            </select>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--anc-text-secondary); margin-bottom:4px;">MES DE EJECUCIÓN</label>
            <select id="admin-f-mes" class="anc-select-styled" onchange="aplicarFiltrosAdmin()">
              <option value="Octubre" ${st.filtroMes === 'Octubre' ? 'selected' : ''}>Octubre</option>
              <option value="Noviembre" ${st.filtroMes === 'Noviembre' ? 'selected' : ''}>Noviembre</option>
              <option value="Diciembre" ${st.filtroMes === 'Diciembre' ? 'selected' : ''}>Diciembre</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tarjetas de Total Consolidado -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
        <div style="background: linear-gradient(135deg, var(--anc-navy-main) 0%, var(--anc-navy-deep) 100%); border-radius: 14px; padding: 16px; color: #FFF; box-shadow: 0 4px 10px rgba(14,44,82,0.25);">
          <div style="font-size: 0.75rem; font-weight: 800; color: var(--anc-gold-bright); text-transform: uppercase;">Ejecución Total Consolidada</div>
          <div style="font-size: 1.6rem; font-weight: 900; margin-top: 4px;">S/ ${granTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
        </div>

        <div style="background: var(--anc-emerald-soft); border: 1.5px solid var(--anc-emerald); border-radius: 14px; padding: 16px;">
          <div style="font-size: 0.75rem; font-weight: 800; color: var(--anc-emerald-dark); text-transform: uppercase;">Total Caja Chica (${gastosFiltrados.length} Registros)</div>
          <div style="font-size: 1.6rem; font-weight: 900; color: var(--anc-emerald-dark); margin-top: 4px;">S/ ${totalCajaChica.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
        </div>

        <div style="background: #FFFBEB; border: 1.5px solid var(--anc-gold-metallic); border-radius: 14px; padding: 16px;">
          <div style="font-size: 0.75rem; font-weight: 800; color: var(--anc-gold-deep); text-transform: uppercase;">Total Viáticos (${viaticosFiltrados.length} Planillas)</div>
          <div style="font-size: 1.6rem; font-weight: 900; color: var(--anc-navy-main); margin-top: 4px;">S/ ${totalViaticos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <!-- Pestañas de Tablas -->
      <div style="display: flex; gap: 8px; border-bottom: 2px solid var(--anc-border-light); margin-bottom: 14px;">
        <button type="button" id="tab-admin-caja" class="chip-btn active" style="border-radius: 10px 10px 0 0; padding: 10px 16px;" onclick="cambiarTabAdmin('CAJA')">🧾 Gastos Caja Chica</button>
        <button type="button" id="tab-admin-viat" class="chip-btn" style="border-radius: 10px 10px 0 0; padding: 10px 16px; background: transparent; color: var(--anc-navy-main);" onclick="cambiarTabAdmin('VIATICOS')">✈️ Planillas de Viáticos</button>
      </div>

      <!-- Tabla de Caja Chica Consolidada -->
      <div id="panel-admin-caja" style="display: block;">
        <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
          <button type="button" class="btn-anc-primary" style="width: auto; padding: 8px 14px; font-size: 0.82rem; background: var(--anc-emerald-dark); color: #FFF; border-color: var(--anc-emerald);" onclick="exportarExcelCajaChica()">
            📥 Exportar Caja Chica (CSV/Excel)
          </button>
        </div>
        <div style="overflow-x: auto; border: 1.5px solid var(--anc-border-light); border-radius: 14px;">
          <table class="anc-list-table">
            <thead class="anc-list-thead">
              <tr>
                <th>DEPENDENCIA</th>
                <th>FECHA</th>
                <th>COMPROBANTE</th>
                <th>PROVEEDOR (RUC)</th>
                <th>CONCEPTO / ESP.</th>
                <th style="text-align: right;">NETO (S/)</th>
                <th style="text-align: center;">AUDITORÍA</th>
              </tr>
            </thead>
            <tbody>
              ${generarTablaAdminCajaChica(gastosFiltrados)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tabla de Viáticos Consolidada -->
      <div id="panel-admin-viat" style="display: none;">
        <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
          <button type="button" class="btn-anc-primary" style="width: auto; padding: 8px 14px; font-size: 0.82rem; background: var(--anc-cobalt-blue); color: #FFF; border-color: var(--anc-royal-blue);" onclick="exportarExcelViaticos()">
            📥 Exportar Viáticos (CSV/Excel)
          </button>
        </div>
        <div style="overflow-x: auto; border: 1.5px solid var(--anc-border-light); border-radius: 14px;">
          <table class="anc-list-table">
            <thead class="anc-list-thead">
              <tr>
                <th>PLANILLA</th>
                <th>DEPENDENCIA</th>
                <th>DESTINO</th>
                <th>FECHAS / TIEMPO</th>
                <th style="text-align: right;">TOTAL S/</th>
                <th style="text-align: center;">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              ${generarTablaAdminViaticos(viaticosFiltrados)}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  // Restaurar el valor de los selectores si cambiaron
  document.getElementById('admin-f-dep').value = st.filtroDependencia;
  document.getElementById('admin-f-anio').value = st.filtroAnio;
  document.getElementById('admin-f-mes').value = st.filtroMes;
};

// Generar filas para la tabla de Caja Chica
function generarTablaAdminCajaChica(lista) {
  if (!lista || lista.length === 0) return `<tr><td colspan="7" style="text-align:center; padding:16px;">No hay registros de Caja Chica para los filtros seleccionados.</td></tr>`;

  return lista.map(g => {
    let uo = g.unidades_organicas ? `[${g.unidades_organicas.codigo}] ${g.unidades_organicas.nombre_dependencia}` : 'Dependencia Actual';
    let userReg = g.usuarios_perfiles ? g.usuarios_perfiles.nombres_apellidos : window.ANC_STATE.usuarioActivo.nombres_apellidos;
    
    let colorAuditoria = 'semaforo-verde';
    if (g.estado_auditoria === 'OBSERVADO') colorAuditoria = 'semaforo-rojo';

    return `
      <tr class="anc-list-row">
        <td>
          <strong style="font-size: 0.82rem; color: var(--anc-navy-main);">${uo}</strong><br />
          <span style="font-size: 0.72rem; color: var(--anc-text-secondary);">Reg: ${userReg}</span>
        </td>
        <td style="font-size: 0.82rem;">${g.fecha_comprobante}</td>
        <td>
          <strong style="font-size: 0.85rem;">${g.serie_numero_comprobante}</strong><br />
          <span style="font-size: 0.72rem; color: var(--anc-text-secondary);">${g.tipo_comprobante}</span>
        </td>
        <td>
          <span style="font-size: 0.82rem;">${g.razon_social_proveedor}</span><br />
          <span style="font-size: 0.72rem; color: var(--anc-text-secondary);">RUC: ${g.ruc_dni_proveedor}</span>
        </td>
        <td>
          <span style="font-size: 0.82rem;">${g.detalle_motivo_gasto}</span><br />
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--anc-cobalt-blue);">Esp: ${g.especifica_gasto}</span>
        </td>
        <td style="text-align: right; font-weight: 900; color: var(--anc-emerald-dark); font-size: 0.95rem;">
          S/ ${parseFloat(g.neto_pagado_efectivo).toFixed(2)}
        </td>
        <td style="text-align: center;">
          <span class="badge-pill ${colorAuditoria}" style="font-size: 0.7rem;">${g.estado_auditoria || 'APROBADO'}</span>
        </td>
      </tr>
    `;
  }).join('');
}

// Generar filas para la tabla de Viáticos
function generarTablaAdminViaticos(lista) {
  if (!lista || lista.length === 0) return `<tr><td colspan="6" style="text-align:center; padding:16px;">No hay planillas de viáticos registradas para los filtros seleccionados.</td></tr>`;

  return lista.map(v => {
    let uo = v.unidades_organicas ? `[${v.unidades_organicas.codigo}] ${v.unidades_organicas.nombre_dependencia}` : 'Dependencia Actual';
    
    let colorEstado = 'semaforo-verde';
    if (v.supera_tope_caja_chica) colorEstado = 'badge-pill" style="background:var(--anc-gold-deep); color:#FFF;';

    return `
      <tr class="anc-list-row">
        <td>
          <strong style="font-size: 0.85rem; color: var(--anc-navy-main);">${v.codigo_planilla}</strong><br />
          <span style="font-size: 0.72rem; color: var(--anc-text-secondary);">${v.tipo_comision}</span>
        </td>
        <td>
          <strong style="font-size: 0.82rem; color: var(--anc-navy-main);">${uo}</strong>
        </td>
        <td>
          <span style="font-size: 0.85rem; font-weight: 700;">${v.destino}</span><br />
          <span style="font-size: 0.72rem; color: var(--anc-text-secondary);">Vía: ${v.medio_transporte}</span>
        </td>
        <td>
          <span style="font-size: 0.8rem;">${v.fecha_hora_salida.replace('T',' ')} al</span><br />
          <span style="font-size: 0.8rem;">${v.fecha_hora_retorno.replace('T',' ')}</span><br />
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--anc-cobalt-blue);">${v.dias_computables} Días + ${v.horas_fraccion}h Frac.</span>
        </td>
        <td style="text-align: right; font-weight: 900; color: var(--anc-navy-main); font-size: 0.98rem;">
          S/ ${parseFloat(v.total_general_pen).toFixed(2)}
        </td>
        <td style="text-align: center;">
          <span class="badge-pill ${colorEstado}" style="font-size: 0.7rem;">
            ${v.supera_tope_caja_chica ? 'VÍA TESORERÍA' : 'APROBADO CC'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// Aplicar filtros dinámicos
window.aplicarFiltrosAdmin = function() {
  window.ADMIN_STATE.filtroDependencia = document.getElementById('admin-f-dep').value;
  window.ADMIN_STATE.filtroAnio = parseInt(document.getElementById('admin-f-anio').value);
  window.ADMIN_STATE.filtroMes = document.getElementById('admin-f-mes').value;
  renderizarVistaAdmin();
};

// Conmutar Pestañas del Panel Admin
window.cambiarTabAdmin = function(tab) {
  const tabCaja = document.getElementById('tab-admin-caja');
  const tabViat = document.getElementById('tab-admin-viat');
  const panelCaja = document.getElementById('panel-admin-caja');
  const panelViat = document.getElementById('panel-admin-viat');

  if (tab === 'CAJA') {
    tabCaja.classList.add('active');
    tabCaja.style.background = '';
    tabCaja.style.color = '';
    tabViat.classList.remove('active');
    tabViat.style.background = 'transparent';
    tabViat.style.color = 'var(--anc-navy-main)';
    panelCaja.style.display = 'block';
    panelViat.style.display = 'none';
  } else {
    tabViat.classList.add('active');
    tabViat.style.background = '';
    tabViat.style.color = '';
    tabCaja.classList.remove('active');
    tabCaja.style.background = 'transparent';
    tabCaja.style.color = 'var(--anc-navy-main)';
    panelViat.style.display = 'block';
    panelCaja.style.display = 'none';
  }
};

// Exportar CSV de Caja Chica
window.exportarExcelCajaChica = function() {
  const lista = window.ADMIN_STATE.gastosTodos.filter(g => g.anio_fiscal === window.ADMIN_STATE.filtroAnio && g.mes_ejecucion === window.ADMIN_STATE.filtroMes);
  if (lista.length === 0) {
    alert('No hay datos de Caja Chica para exportar en este periodo.');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "ID,DEPENDENCIA,FECHA,TIPO,SERIE_NUMERO,RUC,RAZON_SOCIAL,MOTIVO,ESPECIFICA,TOTAL_BRUTO,RET_IGV,RET_4TA,DETRACCION,NETO_EFECTIVO,ESTADO\n";

  lista.forEach(g => {
    let depName = g.unidades_organicas ? `[${g.unidades_organicas.codigo}] ${g.unidades_organicas.nombre_dependencia}` : '';
    depName = depName.replace(/,/g, ' '); // Evitar comas en CSV
    let motivo = g.detalle_motivo_gasto.replace(/,/g, ' ').replace(/\n/g, ' ');
    let rs = g.razon_social_proveedor.replace(/,/g, ' ');

    let row = `${g.id},${depName},${g.fecha_comprobante},${g.tipo_comprobante},${g.serie_numero_comprobante},${g.ruc_dni_proveedor},${rs},${motivo},${g.especifica_gasto},${g.importe_total_bruto},${g.monto_retencion_igv},${g.monto_retencion_4ta},${g.monto_detraccion},${g.neto_pagado_efectivo},${g.estado_auditoria}`;
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Consolidado_CajaChica_ANCMP_${window.ADMIN_STATE.filtroAnio}_${window.ADMIN_STATE.filtroMes}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  mostrarToast('Archivo CSV de Caja Chica generado exitosamente.', 'success');
};

// Exportar CSV de Viáticos
window.exportarExcelViaticos = function() {
  const lista = window.ADMIN_STATE.viaticosTodos.filter(v => v.anio_fiscal === window.ADMIN_STATE.filtroAnio && v.mes_ejecucion === window.ADMIN_STATE.filtroMes);
  if (lista.length === 0) {
    alert('No hay datos de Viáticos para exportar en este periodo.');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "PLANILLA,DEPENDENCIA,TIPO_COMISION,DESTINO,TRANSPORTE,FECHA_SALIDA,FECHA_RETORNO,DIAS,HORAS,TOTAL_PEN,VIA_TESORERIA\n";

  lista.forEach(v => {
    let depName = v.unidades_organicas ? `[${v.unidades_organicas.codigo}] ${v.unidades_organicas.nombre_dependencia}` : '';
    depName = depName.replace(/,/g, ' ');

    let row = `${v.codigo_planilla},${depName},${v.tipo_comision},${v.destino},${v.medio_transporte},${v.fecha_hora_salida.replace('T',' ')},${v.fecha_hora_retorno.replace('T',' ')},${v.dias_computables},${v.horas_fraccion},${v.total_general_pen},${v.supera_tope_caja_chica ? 'SI' : 'NO'}`;
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Consolidado_Viaticos_ANCMP_${window.ADMIN_STATE.filtroAnio}_${window.ADMIN_STATE.filtroMes}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  mostrarToast('Archivo CSV de Viáticos generado exitosamente.', 'success');
};

// Sobrescribir cambiarVista global para interceptar la carga de datos de la Etapa 6
const originalCambiarVista = window.cambiarVista;
window.cambiarVista = function(targetId) {
  if (targetId === 'vista-admin') {
    renderizarVistaAdmin(); // Invoca la carga y renderizado asíncrono
  }
  originalCambiarVista(targetId);
};
