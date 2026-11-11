// =========================================================================
// ETAPA 3: NAVEGACIÓN, MENÚ LATERAL (DRAWER), HEADER DINÁMICO Y
//          MÓDULO DE CONFIGURACIÓN / PARÁMETROS / DEPENDENCIAS / ROLES
// UE 012: AUTORIDAD NACIONAL DE CONTROL DEL MINISTERIO PÚBLICO (ANC-MP)
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Inicializando Etapa 3: Drawer, Header y Configuración ANC-MP...');

  // 1. Inicializar datos desde Supabase o fallback local
  await inicializarDatosEtapa3();

  // 2. Configurar eventos de navegación y Drawer
  configurarDrawerYNavegacion();

  // 3. Renderizar vistas de Configuración y Tarifario Anexo 09
  renderizarVistaConfiguracion();
  renderizarVistaTarifario();

  // 4. Actualizar textos de la Cabecera Superior
  actualizarHeaderInstitucional('Inicio');

  // 5. Configurar botones rápidos de cabecera y PWA
  configurarAccionesRapidas();
});

// =========================================================================
// 1. CARGA DE DATOS (SUPABASE CON FALLBACK OFFLINE)
// =========================================================================
async function inicializarDatosEtapa3() {
  try {
    if (supabaseClient) {
      // Cargar Configuración Anual
      const { data: confData, error: confErr } = await supabaseClient
        .from('configuracion_anual')
        .select('*')
        .order('id', { ascending: false })
        .limit(1);

      if (!confErr && confData && confData.length > 0) {
        window.ANC_STATE.config = { ...window.ANC_STATE.config, ...confData[0] };
        window.ANC_STATE.config.tope_comprobante_soles = 
          (window.ANC_STATE.config.valor_uit * window.ANC_STATE.config.porcentaje_tope_caja_chica) / 100;
      }

      // Cargar Unidades Orgánicas y ADC
      const { data: uoData, error: uoErr } = await supabaseClient
        .from('unidades_organicas')
        .select('*')
        .eq('activo', true)
        .order('id', { ascending: true });

      if (!uoErr && uoData && uoData.length > 0) {
        window.ANC_STATE.unidadesOrganicas = uoData;
      }

      // Cargar Tarifario Anexo 09
      const { data: tariData, error: tariErr } = await supabaseClient
        .from('tarifario_movilidad_local')
        .select('*')
        .order('numero_orden', { ascending: true });

      if (!tariErr && tariData && tariData.length > 0) {
        window.ANC_STATE.tarifarioMovilidad = tariData;
      }
    }
  } catch (err) {
    console.warn('Conexión Supabase en modo offline o local:', err);
  }

  // Si no cargó unidades orgánicas por red, cargar catálogo base local (ROF Res. 0413-2025-ANC-MP-J)
  if (!window.ANC_STATE.unidadesOrganicas || window.ANC_STATE.unidadesOrganicas.length === 0) {
    window.ANC_STATE.unidadesOrganicas = getUnidadesOrganicasFallback();
  }

  // Si no cargó tarifario por red, cargar Anexo 09 local
  if (!window.ANC_STATE.tarifarioMovilidad || window.ANC_STATE.tarifarioMovilidad.length === 0) {
    window.ANC_STATE.tarifarioMovilidad = getTarifarioFallback();
  }
}

// =========================================================================
// 2. HEADER DINÁMICO INSTITUCIONAL
// =========================================================================
function actualizarHeaderInstitucional(tituloVista = 'Inicio') {
  const elTitulo = document.getElementById('header-view-title');
  const elSub = document.getElementById('header-subtitle');
  if (elTitulo) elTitulo.textContent = tituloVista;

  const cfg = window.ANC_STATE.config;
  const user = window.ANC_STATE.usuarioActivo;
  const dep = window.ANC_STATE.dependenciaActiva;

  const saldoCaja = Math.max(0, (dep.presupuesto_caja_chica || 10700) - (dep.gastado_caja_chica || 0));
  const saldoViaticos = Math.max(0, (dep.presupuesto_viaticos || 15000) - (dep.gastado_viaticos || 0));

  if (elSub) {
    elSub.innerHTML = `
      <span style="color: #EDBE02; font-weight:800;">${cfg.mes_actual || 'Noviembre'} ${cfg.anio_fiscal || 2026}</span> • 
      <strong>${user.nombres_apellidos.split(' ')[0]} ${user.nombres_apellidos.split(' ')[1] || ''}</strong> 
      (${dep.codigo} - ${dep.nombre_dependencia.split('.')[dep.nombre_dependencia.split('.').length - 1].trim()}) • 
      <span style="color: #FFFFFF; font-weight:700;">Saldo Caja Chica: S/ ${saldoCaja.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    `;
  }
}

// =========================================================================
// 3. MENÚ LATERAL DESPLEGABLE (DRAWER) Y NAVEGACIÓN MULTIVISTA
// =========================================================================
function configurarDrawerYNavegacion() {
  const menuBtn = document.getElementById('floating-menu-btn');
  const menuArrow = document.getElementById('floating-menu-arrow');
  const drawer = document.getElementById('app-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const closeBtn = document.getElementById('drawer-close-btn');

  function abrirDrawer() {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    menuBtn.classList.add('drawer-open');
    if (menuArrow) menuArrow.textContent = '❮';
  }

  function cerrarDrawer() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    menuBtn.classList.remove('drawer-open');
    if (menuArrow) menuArrow.textContent = '❯';
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      if (drawer.classList.contains('open')) {
        cerrarDrawer();
      } else {
        abrirDrawer();
      }
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', cerrarDrawer);
  if (backdrop) backdrop.addEventListener('click', cerrarDrawer);

  // Acordeones colapsables del Drawer
  const accHeaders = document.querySelectorAll('.drawer-section-header');
  accHeaders.forEach(header => {
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      const section = header.closest('.drawer-section');
      const arrow = header.querySelector('.acc-arrow');
      const isOpen = section.classList.contains('expanded');

      if (isOpen) {
        section.classList.remove('expanded');
        if (arrow) arrow.textContent = '▶';
      } else {
        section.classList.add('expanded');
        if (arrow) arrow.textContent = '▼';
      }
    });
  });

  // Navegación por ítems del Drawer
  const navItems = document.querySelectorAll('.drawer-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-target');
      if (targetId) {
        cambiarVista(targetId);
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        cerrarDrawer();
      }
    });
  });

  // Navegación por tarjetas grandes de Inicio
  const actionCards = document.querySelectorAll('.home-action-card');
  actionCards.forEach(card => {
    card.addEventListener('click', () => {
      const targetId = card.getAttribute('data-goto');
      if (targetId) {
        cambiarVista(targetId);
        // Sincronizar item activo en Drawer
        navItems.forEach(n => {
          if (n.getAttribute('data-target') === targetId) n.classList.add('active');
          else n.classList.remove('active');
        });
      }
    });
  });
}

// Función global para conmutar de vista
window.cambiarVista = function(targetId) {
  const views = document.querySelectorAll('.app-view');
  views.forEach(v => v.classList.remove('active-view'));

  const targetView = document.getElementById(targetId);
  if (targetView) {
    targetView.classList.add('active-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Actualizar título del header según la vista
    const titulos = {
      'vista-inicio': 'Inicio',
      'vista-viaticos': 'Viáticos',
      'vista-caja-chica': 'Caja Chica',
      'vista-evaluador': 'Evaluador Normativo',
      'vista-configuracion': 'Configuración y Roles',
      'vista-tarifario': 'Tarifario de Movilidad',
      'vista-admin': 'Panel Administrador'
    };
    actualizarHeaderInstitucional(titulos[targetId] || 'ANC-MP UE012');
  }
};

// =========================================================================
// 4. MÓDULO DE CONFIGURACIÓN INICIAL (UIT, T.C., DEPENDENCIAS Y ROLES)
// =========================================================================
function renderizarVistaConfiguracion() {
  const vista = document.getElementById('vista-configuracion');
  if (!vista) return;

  const cfg = window.ANC_STATE.config;
  const user = window.ANC_STATE.usuarioActivo;
  const dep = window.ANC_STATE.dependenciaActiva;
  const unidades = window.ANC_STATE.unidadesOrganicas;

  // Agrupar unidades orgánicas por categoría
  const grupos = {};
  unidades.forEach(u => {
    const grp = u.organo_agrupador || 'Otras Dependencias';
    if (!grupos[grp]) grupos[grp] = [];
    grupos[grp].push(u);
  });

  let opcionesDependencias = '';
  for (const [nombreGrupo, items] of Object.entries(grupos)) {
    opcionesDependencias += `<optgroup label="${nombreGrupo}">`;
    items.forEach(it => {
      const selected = it.id === dep.id || it.codigo === dep.codigo ? 'selected' : '';
      opcionesDependencias += `<option value="${it.id}" ${selected}>[${it.codigo}] ${it.nombre_dependencia}</option>`;
    });
    opcionesDependencias += `</optgroup>`;
  }

  vista.innerHTML = `
    <!-- Tarjeta A: Parámetros del Año Fiscal (UIT y Topes) -->
    <div class="section-card-white" style="border-top: 5px solid var(--anc-gold-metallic);">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
        <span style="font-size: 1.8rem;">⚙️</span>
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 900; color: var(--anc-navy-main);">Configuración Anual y Parámetros</h2>
          <p style="font-size: 0.85rem; color: var(--anc-text-secondary); font-weight: 600;">
            Valores oficiales de la UIT, Tipo de Cambio y Topes Normativos
          </p>
        </div>
      </div>

      <form id="form-config-anual" onsubmit="guardarParametrosAnuales(event)">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 16px;">
          
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:5px;">
              AÑO FISCAL
            </label>
            <input type="number" id="cfg-anio" class="anc-input-styled" value="${cfg.anio_fiscal || 2026}" min="2024" max="2035" required />
          </div>

          <div>
            <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:5px;">
              VALOR UIT VIGENTE (S/)
            </label>
            <input type="number" step="0.01" id="cfg-uit" class="anc-input-styled" value="${cfg.valor_uit || 5350.00}" required oninput="recalcularTopePreview(this.value)" />
            <small style="color:var(--anc-gold-deep); font-weight:700; font-size:0.75rem;" id="preview-tope-caja">
              Tope 20% Caja Chica: S/ ${((cfg.valor_uit || 5350) * 0.2).toFixed(2)} por comprobante
            </small>
          </div>

          <div>
            <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:5px;">
              TIPO CAMBIO USD (BANCO DE LA NACIÓN)
            </label>
            <input type="number" step="0.001" id="cfg-tc" class="anc-input-styled" value="${cfg.tipo_cambio_usd || 3.750}" required />
            <small style="color:var(--anc-text-secondary); font-size:0.75rem;">Para viáticos al exterior</small>
          </div>

          <div>
            <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:5px;">
              TOPE MÁXIMO VIÁTICOS EN CAJA CHICA
            </label>
            <input type="number" step="0.01" id="cfg-viaticos-cc" class="anc-input-styled" value="${cfg.tope_viaticos_caja_chica || 2000.00}" required />
            <small style="color:var(--anc-crimson); font-size:0.75rem; font-weight:700;">Máx. S/ 2,000.00 (RD N° 008-2024-EF)</small>
          </div>

        </div>

        <button type="submit" class="btn-anc-primary">
          💾 Guardar Parámetros Anuales
        </button>
      </form>
    </div>

    <!-- Tarjeta B: Selección de Dependencia Activa (ROF ANC-MP) -->
    <div class="section-card-white" style="border-top: 5px solid var(--anc-royal-blue);">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
        <span style="font-size: 1.8rem;">🏛️</span>
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 900; color: var(--anc-navy-main);">Unidad Orgánica / ADC Activa</h2>
          <p style="font-size: 0.85rem; color: var(--anc-text-secondary); font-weight: 600;">
            Selecciona tu dependencia de la Sede Central o una de las 34 ADC nacionales
          </p>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:6px;">
          DEPENDENCIA ACTUAL:
        </label>
        <select id="select-dependencia-activa" class="anc-select-styled" onchange="cambiarDependenciaActiva(this.value)">
          ${opcionesDependencias}
        </select>
      </div>

      <!-- Detalle de Presupuesto Asignado a la Dependencia -->
      <div style="background: var(--anc-blue-tint); border: 2px solid var(--anc-royal-blue); border-radius: 14px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <span style="font-size: 0.76rem; font-weight: 800; color: var(--anc-royal-blue); text-transform: uppercase;">
            Fondo Asignado Caja Chica:
          </span>
          <div style="font-size: 1.25rem; font-weight: 900; color: var(--anc-navy-main);">
            S/ ${(dep.presupuesto_caja_chica || 10700).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div>
          <span style="font-size: 0.76rem; font-weight: 800; color: var(--anc-royal-blue); text-transform: uppercase;">
            Asignación Anual Viáticos:
          </span>
          <div style="font-size: 1.25rem; font-weight: 900; color: var(--anc-navy-main);">
            S/ ${(dep.presupuesto_viaticos || 15000).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>

    <!-- Tarjeta C: Perfil de Usuario y Cambio de Rol -->
    <div class="section-card-white" style="border-top: 5px solid var(--anc-navy-main);">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
        <span style="font-size: 1.8rem;">👤</span>
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 900; color: var(--anc-navy-main);">Perfil de Usuario y Rol</h2>
          <p style="font-size: 0.85rem; color: var(--anc-text-secondary); font-weight: 600;">
            Control de permisos y accesos diferenciados
          </p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 16px;">
        <div>
          <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:5px;">
            DNI DEL USUARIO
          </label>
          <input type="text" id="user-dni" class="anc-input-styled" value="${user.dni || '40389121'}" maxlength="12" />
        </div>

        <div>
          <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:5px;">
            NOMBRES Y APELLIDOS
          </label>
          <input type="text" id="user-nombres" class="anc-input-styled" value="${user.nombres_apellidos || 'Ruperto Enrique Castillo Bonilla'}" />
        </div>

        <div>
          <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:5px;">
            CARGO INSTITUCIONAL
          </label>
          <input type="text" id="user-cargo" class="anc-input-styled" value="${user.cargo || 'Responsable de la Unidad de Abastecimiento'}" />
        </div>

        <div>
          <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:5px;">
            ROL EN EL SISTEMA
          </label>
          <select id="user-rol" class="anc-select-styled" onchange="verificarCambioRol(this.value)">
            <option value="ADMIN" ${user.rol_sistema === 'ADMIN' ? 'selected' : ''}>⭐ Rol Administrador General (Nacional)</option>
            <option value="USUARIO_SEDE" ${user.rol_sistema === 'USUARIO_SEDE' ? 'selected' : ''}>🏢 Usuario Unidad Orgánica Sede Central</option>
            <option value="USUARIO_ADC" ${user.rol_sistema === 'USUARIO_ADC' ? 'selected' : ''}>🏛️ Usuario Autoridad Desconcentrada (ADC)</option>
          </select>
        </div>
      </div>

      <button type="button" class="btn-anc-primary" onclick="guardarDatosUsuario()">
        ✓ Actualizar Perfil de Usuario
      </button>
    </div>
  `;
}

// Recalcular texto preview del 20% de la UIT
window.recalcularTopePreview = function(valorUit) {
  const el = document.getElementById('preview-tope-caja');
  const uit = parseFloat(valorUit) || 0;
  if (el) el.textContent = `Tope 20% Caja Chica: S/ ${(uit * 0.20).toFixed(2)} por comprobante`;
};

// Guardar parámetros anuales
window.guardarParametrosAnuales = async function(e) {
  e.preventDefault();
  const anio = parseInt(document.getElementById('cfg-anio').value) || 2026;
  const uit = parseFloat(document.getElementById('cfg-uit').value) || 5350.00;
  const tc = parseFloat(document.getElementById('cfg-tc').value) || 3.750;
  const viatCC = parseFloat(document.getElementById('cfg-viaticos-cc').value) || 2000.00;

  window.ANC_STATE.config.anio_fiscal = anio;
  window.ANC_STATE.config.valor_uit = uit;
  window.ANC_STATE.config.tipo_cambio_usd = tc;
  window.ANC_STATE.config.tope_viaticos_caja_chica = viatCC;
  window.ANC_STATE.config.tope_comprobante_soles = (uit * 0.20);

  // Intentar sincronizar en Supabase si hay conexión
  try {
    if (supabaseClient) {
      await supabaseClient
        .from('configuracion_anual')
        .update({
          anio_fiscal: anio,
          valor_uit: uit,
          tipo_cambio_usd: tc,
          tope_viaticos_caja_chica: viatCC,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', 1);
    }
  } catch (err) {
    console.log('Parámetros guardados localmente.');
  }

  actualizarHeaderInstitucional('Configuración Guardada');
  mostrarToast('Parámetros Anuales actualizados correctamente.', 'success');
};

// Cambiar dependencia activa
window.cambiarDependenciaActiva = function(depId) {
  const unidades = window.ANC_STATE.unidadesOrganicas;
  const encontrada = unidades.find(u => String(u.id) === String(depId));
  if (encontrada) {
    window.ANC_STATE.dependenciaActiva = {
      ...encontrada,
      gastado_caja_chica: encontrada.gastado_caja_chica || 0,
      gastado_viaticos: encontrada.gastado_viaticos || 0
    };
    actualizarHeaderInstitucional('Dependencia Actualizada');
    renderizarVistaConfiguracion();
    mostrarToast(`Dependencia activa cambiada a: [${encontrada.codigo}] ${encontrada.nombre_dependencia}`, 'success');
  }
};

// Verificar clave al intentar pasar a rol ADMIN
window.verificarCambioRol = function(nuevoRol) {
  if (nuevoRol === 'ADMIN') {
    const pin = prompt('Ingrese el PIN de seguridad para Rol Administrador General:', '');
    if (pin !== '2026' && pin !== '1234') {
      alert('PIN de seguridad incorrecto. No autorizado.');
      document.getElementById('user-rol').value = window.ANC_STATE.usuarioActivo.rol_sistema;
      return;
    }
    mostrarToast('Acceso de Administrador General concedido.', 'success');
  }
};

// Guardar datos del usuario
window.guardarDatosUsuario = function() {
  const dni = document.getElementById('user-dni').value.trim();
  const nombres = document.getElementById('user-nombres').value.trim();
  const cargo = document.getElementById('user-cargo').value.trim();
  const rol = document.getElementById('user-rol').value;

  window.ANC_STATE.usuarioActivo = {
    ...window.ANC_STATE.usuarioActivo,
    dni,
    nombres_apellidos: nombres,
    cargo,
    rol_sistema: rol
  };

  actualizarHeaderInstitucional('Perfil Actualizado');
  mostrarToast('Datos de usuario guardados correctamente.', 'success');
};

// =========================================================================
// 5. MÓDULO TARIFARIO ÚNICO DE MOVILIDAD LOCAL (ANEXO 09 - 44 DESTINOS)
// =========================================================================
function renderizarVistaTarifario() {
  const vista = document.getElementById('vista-tarifario');
  if (!vista) return;

  const tarifario = window.ANC_STATE.tarifarioMovilidad;

  vista.innerHTML = `
    <div class="section-card-white" style="border-top: 5px solid var(--anc-gold-bright);">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.8rem;">🚕</span>
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 900; color: var(--anc-navy-main);">Tarifario Único de Movilidad Local (Anexo 09)</h2>
            <p style="font-size: 0.85rem; color: var(--anc-text-secondary); font-weight: 600;">
              Sede Central y Distritos Fiscales de Lima Metropolitana / Callao
            </p>
          </div>
        </div>

        <!-- Buscador de Distritos en tiempo real -->
        <input type="text" id="buscador-tarifario" class="anc-input-styled" placeholder="🔍 Buscar distrito..." style="max-width: 240px;" oninput="filtrarTarifario(this.value)" />
      </div>

      <div style="overflow-x: auto; border-radius: 14px; border: 1.5px solid var(--anc-border-light);">
        <table class="anc-list-table" id="tabla-tarifario">
          <thead class="anc-list-thead">
            <tr>
              <th style="width: 50px; text-align: center;">N°</th>
              <th>DISTRITO / DESTINO</th>
              <th style="text-align: right; width: 110px;">TARIFA DÍA</th>
              <th style="text-align: right; width: 110px;">TARIFA NOCHE</th>
              <th>OBSERVACIÓN / ALCANCE</th>
            </tr>
          </thead>
          <tbody id="tbody-tarifario">
            ${generarFilasTarifario(tarifario)}
          </tbody>
        </table>
      </div>

      <!-- Notas normativas del Anexo 09 -->
      <div style="margin-top: 14px; padding: 12px; background: #F8FAFC; border-left: 4px solid var(--anc-gold-bright); border-radius: 8px; font-size: 0.82rem; color: var(--anc-text-secondary); line-height: 1.5;">
        <strong>Notas Normativas (Directiva Caja Chica V.08):</strong><br />
        • <strong>Horario Nocturno:</strong> Se considera a partir de las 19:00 horas.<br />
        • <strong>Aeropuerto:</strong> Tarifa fija de S/ 38.00 aplicable desde cualquier distrito de Lima Metropolitana.<br />
        • <strong>Inter-Distritos:</strong> Desplazamientos desde Callao, Lima Este, Norte y Sur al resto de Lima: S/ 28.00 Día y S/ 30.00 Noche.<br />
        • <strong>Seguridad / Escolta:</strong> Promedio de Tarifa Única: S/ 25.00 por tramo.
      </div>
    </div>
  `;
}

function generarFilasTarifario(lista) {
  if (!lista || lista.length === 0) {
    return `<tr><td colspan="5" style="text-align:center; padding: 18px; color: var(--anc-text-secondary);">No se encontraron distritos.</td></tr>`;
  }
  return lista.map(t => `
    <tr class="anc-list-row">
      <td style="text-align: center; font-weight: 800; color: var(--anc-navy-main);">${t.numero_orden || t.id}</td>
      <td style="font-weight: 800; color: var(--anc-navy-main);">${t.distrito}</td>
      <td style="text-align: right; font-weight: 900; color: var(--anc-cobalt-blue);">S/ ${parseFloat(t.tarifa_dia).toFixed(2)}</td>
      <td style="text-align: right; font-weight: 900; color: var(--anc-navy-deep); background: #FEF9C3;">S/ ${parseFloat(t.tarifa_noche).toFixed(2)}</td>
      <td style="font-size: 0.8rem; color: var(--anc-text-secondary);">${t.observacion || '-'}</td>
    </tr>
  `).join('');
}

window.filtrarTarifario = function(texto) {
  const query = texto.toLowerCase().trim();
  const tarifario = window.ANC_STATE.tarifarioMovilidad;
  const filtrados = tarifario.filter(t => t.distrito.toLowerCase().includes(query) || (t.observacion && t.observacion.toLowerCase().includes(query)));
  const tbody = document.getElementById('tbody-tarifario');
  if (tbody) tbody.innerHTML = generarFilasTarifario(filtrados);
};

// =========================================================================
// 6. ACCIONES RÁPIDAS DE CABECERA Y PWA
// =========================================================================
function configurarAccionesRapidas() {
  const btnHome = document.getElementById('btn-top-home');
  const btnCaja = document.getElementById('btn-top-caja');
  const btnShare = document.getElementById('btn-top-share');
  const btnDrawerShare = document.getElementById('btn-compartir-pwa');
  const btnInstall = document.getElementById('btn-instalar-pwa');

  if (btnHome) btnHome.addEventListener('click', () => cambiarVista('vista-inicio'));
  if (btnCaja) btnCaja.addEventListener('click', () => cambiarVista('vista-caja-chica'));

  function compartirWhatsApp() {
    const texto = encodeURIComponent(
      '🏛️ *PWA ANC-MP (UE 012)*\n' +
      'Sistema de Gestión de Viáticos, Caja Chica y Fondos por Encargo de la Autoridad Nacional de Control del Ministerio Público.\n' +
      'Accede e instala aquí: ' + window.location.href
    );
    window.open(`https://api.whatsapp.com/send?text=${texto}`, '_blank');
  }

  if (btnShare) btnShare.addEventListener('click', compartirWhatsApp);
  if (btnDrawerShare) btnDrawerShare.addEventListener('click', compartirWhatsApp);

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      const promptEvent = window.ANC_STATE.deferredInstallPrompt;
      if (promptEvent) {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        console.log(`Elección de instalación del usuario: ${outcome}`);
        window.ANC_STATE.deferredInstallPrompt = null;
      } else {
        alert('Para instalar en Android / Chrome: toca el menú de 3 puntos (⋮) y selecciona "Agregar a la pantalla principal" o "Instalar aplicación".\n\nEn iPhone (iOS / Safari): toca el botón Compartir (cuadrado con flecha hacia arriba) y selecciona "Agregar al inicio".');
      }
    });
  }
}

// =========================================================================
// 7. CATÁLOGOS LOCALES DE RESPALDO (OFFLINE FALLBACK)
// =========================================================================
function getUnidadesOrganicasFallback() {
  return [
    { id: 1, codigo: 'AD-JN', organo_agrupador: 'A. Órganos de Alta Dirección', nombre_dependencia: '1.1. Jefatura Nacional de la ANC-MP', presupuesto_caja_chica: 15000, presupuesto_viaticos: 35000 },
    { id: 2, codigo: 'AD-OCA', organo_agrupador: 'A. Órganos de Alta Dirección', nombre_dependencia: '1.2. Oficina Central Administrativa (OCA)', presupuesto_caja_chica: 15000, presupuesto_viaticos: 25000 },
    { id: 3, codigo: 'AD-UCT', organo_agrupador: 'A. Órganos de Alta Dirección', nombre_dependencia: '1.2.1. Unidad de Cooperación Técnica', presupuesto_caja_chica: 5350, presupuesto_viaticos: 10000 },
    { id: 4, codigo: 'OA-OAJ', organo_agrupador: 'B.1 Órganos de Asesoramiento', nombre_dependencia: '1.3.1. Oficina de Asesoría Jurídica', presupuesto_caja_chica: 5350, presupuesto_viaticos: 8000 },
    { id: 5, codigo: 'OA-OPP', organo_agrupador: 'B.1 Órganos de Asesoramiento', nombre_dependencia: '1.3.2. Oficina de Planeamiento y Presupuesto', presupuesto_caja_chica: 5350, presupuesto_viaticos: 10000 },
    { id: 6, codigo: 'AP-OGRH', organo_agrupador: 'B.2 Órganos de Apoyo - RR.HH.', nombre_dependencia: '1.4.1. Oficina de Gestión de Recursos Humanos', presupuesto_caja_chica: 6000, presupuesto_viaticos: 8000 },
    { id: 12, codigo: 'AP-OAF', organo_agrupador: 'B.2 Órganos de Apoyo - Administración y Finanzas', nombre_dependencia: '1.4.2. Oficina de Administración y Finanzas', presupuesto_caja_chica: 20000, presupuesto_viaticos: 25000 },
    { id: 13, codigo: 'AP-UAB', organo_agrupador: 'B.2 Órganos de Apoyo - Administración y Finanzas', nombre_dependencia: '1.4.2.1. Unidad de Abastecimiento', presupuesto_caja_chica: 25000, presupuesto_viaticos: 20000 },
    { id: 14, codigo: 'AP-UCO', organo_agrupador: 'B.2 Órganos de Apoyo - Administración y Finanzas', nombre_dependencia: '1.4.2.2. Unidad de Contabilidad', presupuesto_caja_chica: 10000, presupuesto_viaticos: 15000 },
    { id: 15, codigo: 'AP-UTE', organo_agrupador: 'B.2 Órganos de Apoyo - Administración y Finanzas', nombre_dependencia: '1.4.2.3. Unidad de Tesorería', presupuesto_caja_chica: 25000, presupuesto_viaticos: 30000 },
    { id: 16, codigo: 'AP-OTI', organo_agrupador: 'B.2 Órganos de Apoyo - Tecnologías de la Información', nombre_dependencia: '1.4.3. Oficina de Tecnologías de la Información', presupuesto_caja_chica: 10700, presupuesto_viaticos: 15000 },
    { id: 19, codigo: 'AP-OGDAC', organo_agrupador: 'B.2 Órganos de Apoyo - Gestión Documental', nombre_dependencia: '1.4.4. Oficina de Gestión Documental y Atención al Ciudadano', presupuesto_caja_chica: 6000, presupuesto_viaticos: 8000 },
    { id: 24, codigo: 'AP-OCSII', organo_agrupador: 'B.2 Órganos de Apoyo - Imagen Institucional', nombre_dependencia: '1.4.5. Oficina de Comunicación Social e Imagen Institucional', presupuesto_caja_chica: 8000, presupuesto_viaticos: 12000 },
    { id: 27, codigo: 'OL-DGGF', organo_agrupador: 'C. Órganos de Línea', nombre_dependencia: '1.5.1. Dirección General de Gestión Funcional', presupuesto_caja_chica: 10700, presupuesto_viaticos: 25000 },
    { id: 31, codigo: 'OL-DGPAD', organo_agrupador: 'C. Órganos de Línea', nombre_dependencia: '1.5.2. Dirección General de Procedimiento Administrativo Disciplinario', presupuesto_caja_chica: 12000, presupuesto_viaticos: 30000 },
    { id: 35, codigo: 'OL-DGA', organo_agrupador: 'C. Órganos de Línea', nombre_dependencia: '1.5.3. Dirección General de Apelaciones', presupuesto_caja_chica: 8000, presupuesto_viaticos: 15000 },
    { id: 36, codigo: 'ADC-01', organo_agrupador: 'D. Autoridades Desconcentradas de Control (ADC)', nombre_dependencia: 'ADC Amazonas (Chachapoyas)', presupuesto_caja_chica: 8500, presupuesto_viaticos: 14000 },
    { id: 40, codigo: 'ADC-05', organo_agrupador: 'D. Autoridades Desconcentradas de Control (ADC)', nombre_dependencia: 'ADC Ayacucho', presupuesto_caja_chica: 9500, presupuesto_viaticos: 15000 },
    { id: 51, codigo: 'ADC-16', organo_agrupador: 'D. Autoridades Desconcentradas de Control (ADC)', nombre_dependencia: 'ADC Lambayeque (Chiclayo)', presupuesto_caja_chica: 12000, presupuesto_viaticos: 18000 },
    { id: 52, codigo: 'ADC-17', organo_agrupador: 'D. Autoridades Desconcentradas de Control (ADC)', nombre_dependencia: 'ADC Lima Centro', presupuesto_caja_chica: 14000, presupuesto_viaticos: 15000 },
    { id: 53, codigo: 'ADC-18', organo_agrupador: 'D. Autoridades Desconcentradas de Control (ADC)', nombre_dependencia: 'ADC Lima Este', presupuesto_caja_chica: 11000, presupuesto_viaticos: 12000 },
    { id: 54, codigo: 'ADC-19', organo_agrupador: 'D. Autoridades Desconcentradas de Control (ADC)', nombre_dependencia: 'ADC Lima Norte', presupuesto_caja_chica: 11000, presupuesto_viaticos: 12000 },
    { id: 55, codigo: 'ADC-20', organo_agrupador: 'D. Autoridades Desconcentradas de Control (ADC)', nombre_dependencia: 'ADC Lima Noroeste (Ventanilla)', presupuesto_caja_chica: 9500, presupuesto_viaticos: 11000 },
    { id: 56, codigo: 'ADC-21', organo_agrupador: 'D. Autoridades Desconcentradas de Control (ADC)', nombre_dependencia: 'ADC Lima Sur', presupuesto_caja_chica: 11000, presupuesto_viaticos: 12000 }
  ];
}

function getTarifarioFallback() {
  return [
    { numero_orden: 1, distrito: 'Ancón', tarifa_dia: 30.00, tarifa_noche: 32.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 2, distrito: 'Ate - Vitarte', tarifa_dia: 26.00, tarifa_noche: 28.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 3, distrito: 'Barranco', tarifa_dia: 20.00, tarifa_noche: 22.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 4, distrito: 'Breña', tarifa_dia: 16.00, tarifa_noche: 18.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 5, distrito: 'El Callao', tarifa_dia: 25.00, tarifa_noche: 27.00, observacion: 'Incluye Bellavista, La Perla, Carmen de la Legua, etc.' },
    { numero_orden: 6, distrito: 'Carabayllo', tarifa_dia: 28.00, tarifa_noche: 30.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 7, distrito: 'Cercado de Lima', tarifa_dia: 14.00, tarifa_noche: 16.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 8, distrito: 'Chaclacayo', tarifa_dia: 38.00, tarifa_noche: 40.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 9, distrito: 'Chorrillos', tarifa_dia: 24.00, tarifa_noche: 26.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 10, distrito: 'Chosica', tarifa_dia: 44.00, tarifa_noche: 46.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 11, distrito: 'Cieneguilla', tarifa_dia: 33.00, tarifa_noche: 35.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 12, distrito: 'Comas', tarifa_dia: 28.00, tarifa_noche: 30.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 13, distrito: 'El Agustino', tarifa_dia: 16.00, tarifa_noche: 18.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 14, distrito: 'Huachipa', tarifa_dia: 26.00, tarifa_noche: 28.00, observacion: 'Centro Poblado Huachipa' },
    { numero_orden: 15, distrito: 'Independencia', tarifa_dia: 22.00, tarifa_noche: 24.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 16, distrito: 'Jesús María', tarifa_dia: 16.00, tarifa_noche: 18.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 17, distrito: 'La Molina', tarifa_dia: 25.00, tarifa_noche: 27.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 18, distrito: 'La Victoria', tarifa_dia: 16.00, tarifa_noche: 18.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 19, distrito: 'Lince', tarifa_dia: 16.00, tarifa_noche: 18.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 20, distrito: 'Los Olivos', tarifa_dia: 22.00, tarifa_noche: 24.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 21, distrito: 'Lurín', tarifa_dia: 34.00, tarifa_noche: 36.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 22, distrito: 'Magdalena del Mar', tarifa_dia: 18.00, tarifa_noche: 20.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 23, distrito: 'Miraflores', tarifa_dia: 20.00, tarifa_noche: 22.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 24, distrito: 'Pachacámac', tarifa_dia: 34.00, tarifa_noche: 36.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 25, distrito: 'Pucusana', tarifa_dia: 38.00, tarifa_noche: 40.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 26, distrito: 'Pueblo Libre', tarifa_dia: 16.00, tarifa_noche: 18.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 27, distrito: 'Puente Piedra', tarifa_dia: 28.00, tarifa_noche: 30.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 28, distrito: 'Punta Negra', tarifa_dia: 38.00, tarifa_noche: 40.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 29, distrito: 'Rímac', tarifa_dia: 16.00, tarifa_noche: 18.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 30, distrito: 'San Bartolo', tarifa_dia: 38.00, tarifa_noche: 40.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 31, distrito: 'San Borja', tarifa_dia: 20.00, tarifa_noche: 22.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 32, distrito: 'San Isidro', tarifa_dia: 19.00, tarifa_noche: 21.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 33, distrito: 'San Juan de Lurigancho', tarifa_dia: 22.00, tarifa_noche: 24.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 34, distrito: 'San Juan de Miraflores', tarifa_dia: 25.00, tarifa_noche: 27.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 35, distrito: 'San Luis', tarifa_dia: 20.00, tarifa_noche: 22.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 36, distrito: 'San Martín de Porres', tarifa_dia: 20.00, tarifa_noche: 22.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 37, distrito: 'San Miguel', tarifa_dia: 20.00, tarifa_noche: 22.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 38, distrito: 'Santa Anita', tarifa_dia: 24.00, tarifa_noche: 26.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 39, distrito: 'Santiago de Surco', tarifa_dia: 24.00, tarifa_noche: 26.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 40, distrito: 'Surquillo', tarifa_dia: 20.00, tarifa_noche: 22.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 41, distrito: 'Ventanilla', tarifa_dia: 36.00, tarifa_noche: 38.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 42, distrito: 'Villa El Salvador', tarifa_dia: 30.00, tarifa_noche: 32.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 43, distrito: 'Villa María del Triunfo', tarifa_dia: 30.00, tarifa_noche: 32.00, observacion: 'Tarifa Única Sede Central' },
    { numero_orden: 44, distrito: 'Aeropuerto Internacional Jorge Chávez', tarifa_dia: 38.00, tarifa_noche: 38.00, observacion: 'Desde cualquier distrito de Lima Metropolitana' }
  ];
}
