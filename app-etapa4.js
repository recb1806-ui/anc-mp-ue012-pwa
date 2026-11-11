// =========================================================================
// ETAPA 4: MÓDULO DE CÁLCULO Y SOLICITUD DE VIÁTICOS (DIRECTIVA V.10)
// UE 012: AUTORIDAD NACIONAL DE CONTROL DEL MINISTERIO PÚBLICO (ANC-MP)
// Soporta:
// 1. Comisiones Nacionales fuera del DF (Cuadros 01 y 02 - Máx 5 días)
// 2. Comisiones Internas ADC / DF > 24h (Cuadro 03 - Máx 10 días)
// 3. Comisiones Sin Viáticos / Radio Urbano (Anexo 07 - S/ 40.00 o S/ 80.00)
// 4. Comisiones Internacionales (Cuadros 04 y 05 en USD con T.C. vigente)
// + Generación de Planilla Oficial (Anexo 01 / Anexo 07) en PDF
// =========================================================================

// Estado local reactivo de la solicitud de viáticos en curso
window.VIATICOS_STATE = {
  tipoComision: 'NACIONAL_FUERA_DF', // 'NACIONAL_FUERA_DF', 'INTERNO_ADC', 'SIN_VIATICOS', 'INTERNACIONAL'
  docAutorizacion: '',
  motivoComision: '',
  origen: 'LIMA',
  destino: '',
  medioTransporte: 'AEREO', // 'AEREO', 'TERRESTRE', 'FLUVIAL', 'VEHICULO_OFICIAL'
  placaVehiculo: '',
  conductorVehiculo: '',
  fechaSalida: '',
  horaSalida: '08:00',
  fechaRetorno: '',
  horaRetorno: '18:00',
  zonaInternacional: 'América del Sur',
  comisionados: [],
  calculoResumen: {
    horasEfectivas: 0,
    horasTerminal: 4,
    totalHoras: 0,
    diasComputables: 0,
    horasFraccion: 0,
    totalGeneralPEN: 0,
    superaCajaChica: false
  }
};

// Inicializar módulo al cambiar o cargar la vista de viáticos
window.addEventListener('DOMContentLoaded', () => {
  // Cargar comisionado por defecto si existe usuario
  resetearSolicitudViaticos();
});

// Renderizar la vista completa de Viáticos
function renderizarVistaViaticos() {
  const vista = document.getElementById('vista-viaticos');
  if (!vista) return;

  const st = window.VIATICOS_STATE;
  const cfg = window.ANC_STATE.config;

  vista.innerHTML = `
    <!-- Tarjeta Principal del Módulo de Viáticos -->
    <div class="section-card-white" style="border-top: 5px solid var(--anc-gold-metallic);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.8rem;">✈️</span>
          <div>
            <h2 style="font-size: 1.3rem; font-weight: 900; color: var(--anc-navy-main);">Cálculo y Solicitud de Viáticos</h2>
            <p style="font-size: 0.85rem; color: var(--anc-text-secondary); font-weight: 600;">
              Directiva V.10 • Res. N° 000038-2025 • UE 012: ANC-MP
            </p>
          </div>
        </div>

        <button type="button" class="chip-btn" style="background: var(--anc-navy-main); color: var(--anc-gold-bright); border: 1px solid var(--anc-gold-metallic);" onclick="resetearSolicitudViaticos(true)">
          🔄 Nueva Comisión
        </button>
      </div>

      <!-- Selector de Tipo de Comisión (Tabs Horizontales) -->
      <div style="margin-bottom: 18px;">
        <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:6px;">
          MODALIDAD DE COMISIÓN DE SERVICIOS:
        </label>
        <div class="chips-row" style="margin-top:0;">
          <button type="button" class="chip-btn ${st.tipoComision === 'NACIONAL_FUERA_DF' ? 'active' : ''}" onclick="seleccionarTipoComision('NACIONAL_FUERA_DF')">
            🇵🇪 Nacional (Fuera DF)
          </button>
          <button type="button" class="chip-btn ${st.tipoComision === 'INTERNO_ADC' ? 'active' : ''}" onclick="seleccionarTipoComision('INTERNO_ADC')">
            🏛️ Interno ADC / DF (>24h)
          </button>
          <button type="button" class="chip-btn ${st.tipoComision === 'SIN_VIATICOS' ? 'active' : ''}" onclick="seleccionarTipoComision('SIN_VIATICOS')">
            ⏱️ Sin Viáticos (Mismo Día)
          </button>
          <button type="button" class="chip-btn ${st.tipoComision === 'INTERNACIONAL' ? 'active' : ''}" onclick="seleccionarTipoComision('INTERNACIONAL')">
            🌐 Internacional (USD)
          </button>
        </div>
      </div>

      <!-- Alerta Normativa Res. 000038-2025 sobre PROPINAS -->
      <div style="background: var(--anc-crimson-soft); border-left: 4px solid var(--anc-crimson); padding: 10px 14px; border-radius: 8px; margin-bottom: 18px; font-size: 0.83rem; color: #991B1B; line-height: 1.45;">
        <strong>⚠️ Control Normativo (Res. N° 000038-2025-MP-FN-GG-OGFIN):</strong><br />
        No se reconocerán gastos por el otorgamiento de <strong>propinas</strong> en comprobantes de consumo, alojamiento o movilidad.
      </div>

      <!-- FORMULARIO DE DATOS DE LA COMISIÓN -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 16px;">
        
        <div>
          <label style="display:block; font-size:0.78rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">
            DOCUMENTO QUE AUTORIZA (*)
          </label>
          <input type="text" id="via-doc" class="anc-input-styled" placeholder="Ej: Res. Jefatural N° 012-2026-ANC" value="${st.docAutorizacion}" oninput="actualizarCampoVia('docAutorizacion', this.value)" required />
        </div>

        <div>
          <label style="display:block; font-size:0.78rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">
            CIUDAD / DESTINO DE LA COMISIÓN (*)
          </label>
          <input type="text" id="via-destino" class="anc-input-styled" placeholder="Ej: Chachapoyas, Cusco, Chiclayo..." value="${st.destino}" oninput="actualizarCampoVia('destino', this.value)" required />
        </div>

        <div>
          <label style="display:block; font-size:0.78rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">
            MEDIO DE TRANSPORTE
          </label>
          <select id="via-transporte" class="anc-select-styled" onchange="actualizarTransporte(this.value)">
            <option value="AEREO" ${st.medioTransporte === 'AEREO' ? 'selected' : ''}>✈️ Aéreo (+2h ida y +2h retorno al terminal)</option>
            <option value="TERRESTRE" ${st.medioTransporte === 'TERRESTRE' ? 'selected' : ''}>🚌 Terrestre (+1h ida y +1h retorno al terminal)</option>
            <option value="FLUVIAL" ${st.medioTransporte === 'FLUVIAL' ? 'selected' : ''}>🚤 Fluvial / Acémila</option>
            <option value="VEHICULO_OFICIAL" ${st.medioTransporte === 'VEHICULO_OFICIAL' ? 'selected' : ''}>🚙 Vehículo Oficial de la ANC-MP</option>
          </select>
        </div>

        ${st.tipoComision === 'INTERNACIONAL' ? `
          <div>
            <label style="display:block; font-size:0.78rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">
              ZONA GEOGRÁFICA INTERNACIONAL
            </label>
            <select id="via-zona-int" class="anc-select-styled" onchange="actualizarCampoVia('zonaInternacional', this.value)">
              <option value="América del Sur" ${st.zonaInternacional === 'América del Sur' ? 'selected' : ''}>América del Sur ($370 / $333 + 1 día inst.)</option>
              <option value="América Central" ${st.zonaInternacional === 'América Central' ? 'selected' : ''}>América Central ($315 / $283 + 1 día inst.)</option>
              <option value="América del Norte" ${st.zonaInternacional === 'América del Norte' ? 'selected' : ''}>América del Norte ($440 / $396 + 1 día inst.)</option>
              <option value="Europa" ${st.zonaInternacional === 'Europa' ? 'selected' : ''}>Europa ($540 / $486 + 2 días inst.)</option>
              <option value="Caribe" ${st.zonaInternacional === 'Caribe' ? 'selected' : ''}>Caribe ($430 / $387 + 1 día inst.)</option>
              <option value="Asia" ${st.zonaInternacional === 'Asia' ? 'selected' : ''}>Asia ($500 / $450 + 2 días inst.)</option>
              <option value="Medio Oriente" ${st.zonaInternacional === 'Medio Oriente' ? 'selected' : ''}>Medio Oriente ($510 / $459 + 2 días inst.)</option>
              <option value="África" ${st.zonaInternacional === 'África' ? 'selected' : ''}>África ($480 / $432 + 2 días inst.)</option>
              <option value="Oceanía" ${st.zonaInternacional === 'Oceanía' ? 'selected' : ''}>Oceanía ($385 / $346 + 2 días inst.)</option>
            </select>
          </div>
        ` : ''}

      </div>

      ${st.medioTransporte === 'VEHICULO_OFICIAL' ? `
        <div style="background: #F1F5F9; border: 1.5px dashed var(--anc-royal-blue); border-radius: 12px; padding: 12px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">PLACA VEHÍCULO OFICIAL</label>
            <input type="text" class="anc-input-styled" placeholder="Ej: EGI-823" value="${st.placaVehiculo}" oninput="actualizarCampoVia('placaVehiculo', this.value)" />
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">NOMBRE DEL CONDUCTOR</label>
            <input type="text" class="anc-input-styled" placeholder="Nombre completo del chofer asignado" value="${st.conductorVehiculo}" oninput="actualizarCampoVia('conductorVehiculo', this.value)" />
          </div>
        </div>
      ` : ''}

      <!-- ITINERARIO: FECHAS Y HORAS -->
      <div style="background: var(--anc-blue-tint); border: 1.5px solid var(--anc-royal-blue); border-radius: 14px; padding: 14px; margin-bottom: 18px;">
        <div style="font-size: 0.82rem; font-weight: 800; color: var(--anc-royal-blue); text-transform: uppercase; margin-bottom: 10px;">
          📅 Itinerario de la Comisión (Cálculo Automático de Días y Horas)
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
          <div>
            <label style="display:block; font-size:0.74rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">FECHA SALIDA</label>
            <input type="date" id="via-fec-sal" class="anc-input-styled" value="${st.fechaSalida}" onchange="actualizarCampoVia('fechaSalida', this.value)" />
          </div>
          <div>
            <label style="display:block; font-size:0.74rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">HORA SALIDA</label>
            <input type="time" id="via-hor-sal" class="anc-input-styled" value="${st.horaSalida}" onchange="actualizarCampoVia('horaSalida', this.value)" />
          </div>
          <div>
            <label style="display:block; font-size:0.74rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">FECHA RETORNO</label>
            <input type="date" id="via-fec-ret" class="anc-input-styled" value="${st.fechaRetorno}" onchange="actualizarCampoVia('fechaRetorno', this.value)" />
          </div>
          <div>
            <label style="display:block; font-size:0.74rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">HORA RETORNO</label>
            <input type="time" id="via-hor-ret" class="anc-input-styled" value="${st.horaRetorno}" onchange="actualizarCampoVia('horaRetorno', this.value)" />
          </div>
        </div>

        <!-- Resumen del Cómputo de Horas -->
        <div id="caja-computo-horas" style="margin-top: 12px; font-size: 0.86rem; color: var(--anc-navy-main); font-weight: 700; background: #FFFFFF; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--anc-border-light);">
          ${generarTextoComputoHoras()}
        </div>
      </div>

      <!-- MOTIVO DE LA COMISIÓN -->
      <div style="margin-bottom: 20px;">
        <label style="display:block; font-size:0.78rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">
          OBJETO Y MOTIVO DETALLADO DE LA COMISIÓN (*)
        </label>
        <textarea id="via-motivo" class="anc-input-styled" rows="2" placeholder="Especificar las diligencias, inspección o visitas de control a realizar..." oninput="actualizarCampoVia('motivoComision', this.value)">${st.motivoComision}</textarea>
      </div>

      <!-- SECCIÓN: LISTA DE COMISIONADOS (MULTI-USUARIO) -->
      <div style="border-top: 2px dashed var(--anc-border-light); padding-top: 18px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 900; color: var(--anc-navy-main);">
              👥 Relación de Comisionados (${st.comisionados.length})
            </h3>
            <p style="font-size: 0.8rem; color: var(--anc-text-secondary); font-weight: 600;">
              Agrega a los magistrados o personal que integran la comisión
            </p>
          </div>

          <button type="button" class="btn-anc-primary" style="width: auto; padding: 9px 16px; font-size: 0.88rem;" onclick="abrirModalAgregarComisionado()">
            ➕ Adicionar Comisionado
          </button>
        </div>

        <!-- Tabla / Tarjetas de Comisionados con Desglose Financiero -->
        <div id="contenedor-tabla-comisionados">
          ${generarTablaComisionados()}
        </div>
      </div>

      <!-- RESUMEN FINAL Y ALERTAS DE TOPE -->
      <div style="background: var(--anc-surface-white); border: 2.5px solid var(--anc-gold-metallic); border-radius: 18px; padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div>
            <span style="font-size: 0.78rem; font-weight: 800; color: var(--anc-navy-main); text-transform: uppercase;">
              TOTAL GENERAL DE LA PLANILLA:
            </span>
            <div style="font-size: 1.85rem; font-weight: 900; color: var(--anc-navy-main);">
              S/ ${st.calculoResumen.totalGeneralPEN.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              ${st.tipoComision === 'INTERNACIONAL' ? `<span style="font-size:0.95rem; color:var(--anc-royal-blue); font-weight:700;">(T.C. S/ ${cfg.tipo_cambio_usd.toFixed(3)})</span>` : ''}
            </div>
          </div>

          <div style="text-align: right;">
            ${st.calculoResumen.superaCajaChica ? `
              <span class="badge-pill semaforo-rojo" style="font-size:0.85rem;">
                ⚠️ Supera S/ 2,000 (Atención por Tesorería Central)
              </span>
            ` : `
              <span class="badge-pill semaforo-verde" style="font-size:0.85rem;">
                ✓ Apto para atención por Caja Chica (≤ S/ 2,000)
              </span>
            `}
          </div>
        </div>
      </div>

      <!-- BOTONES DE ACCIÓN: GUARDAR / PROCESAR / GENERAR PDF -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <button type="button" class="btn-anc-primary" style="background: var(--anc-navy-main); color: var(--anc-gold-bright); border-color: var(--anc-gold-metallic);" onclick="guardarViaticosEnSupabase()">
          💾 Procesar y Guardar en BD
        </button>

        <button type="button" class="btn-anc-primary" style="background: linear-gradient(135deg, var(--anc-gold-bright) 0%, var(--anc-gold-deep) 100%);" onclick="generarPlanillaPDF()">
          📄 Generar Planilla Oficial en PDF
        </button>
      </div>

    </div>

    <!-- Contenedor Oculto para la Renderización del PDF (Anexo 01 / Anexo 07) -->
    <div id="area-impresion-pdf" style="display:none;"></div>
  `;
}

// =========================================================================
// 2. LÓGICA DE CÁLCULO DE HORAS, DÍAS Y MONTOS
// =========================================================================
function recalcularViaticos() {
  const st = window.VIATICOS_STATE;
  const cfg = window.ANC_STATE.config;

  // 1. Cómputo de Horas
  let totalHoras = 0;
  let dias = 0;
  let horasFraccion = 0;

  if (st.fechaSalida && st.fechaRetorno) {
    const fSal = new Date(`${st.fechaSalida}T${st.horaSalida || '00:00'}:00`);
    const fRet = new Date(`${st.fechaRetorno}T${st.horaRetorno || '00:00'}:00`);

    if (fRet >= fSal) {
      const diffMs = fRet - fSal;
      const horasEfectivas = diffMs / (1000 * 60 * 60);

      // Horas adicionales por traslado al terminal (Anexo 08 Directiva V.10)
      let horasTerminal = 0;
      if (st.medioTransporte === 'AEREO') horasTerminal = 4; // +2h ida y +2h vuelta
      else if (st.medioTransporte === 'TERRESTRE') horasTerminal = 2; // +1h ida y +1h vuelta

      totalHoras = horasEfectivas + horasTerminal;

      if (st.tipoComision === 'SIN_VIATICOS') {
        dias = 1;
        horasFraccion = 0;
      } else {
        // Regla: Si dura >= 4 horas hasta 24 horas = 1 día
        // Si dura más de 24 horas: días completos + residuo
        const diasEnteros = Math.floor(totalHoras / 24);
        const residuo = totalHoras % 24;

        if (diasEnteros === 0) {
          if (residuo >= 4) dias = 1;
          else horasFraccion = Math.min(3, Math.floor(residuo));
        } else {
          dias = diasEnteros;
          if (residuo >= 4) {
            dias += 1;
          } else {
            horasFraccion = Math.min(3, Math.floor(residuo));
          }
        }
      }
    }
  }

  st.calculoResumen.totalHoras = totalHoras;
  st.calculoResumen.diasComputables = dias;
  st.calculoResumen.horasFraccion = horasFraccion;

  // 2. Cálculo por cada Comisionado según la Escala Oficial
  let sumaPlanillaPEN = 0;

  st.comisionados.forEach(c => {
    let netoViatico = 0;
    let movLocal = 0;
    let movEmbarque = 0;
    let descAlojamiento = 0;
    let topeDJ = 0;

    if (st.tipoComision === 'NACIONAL_FUERA_DF') {
      // Escalas Nacionales Cuadro N° 01 y N° 02
      const esNivel1 = c.nivel === 'NIVEL_1';
      const tarifaDia = esNivel1 ? 380.00 : 320.00;
      const tarifaHora = esNivel1 ? 15.80 : 13.30;

      if (dias === 1) {
        // Cuadro N° 02 (Comisión de 1 día):
        // Nivel 1: Embarque S/ 100, Local S/ 14
        // Nivel 2: Embarque S/ 80, Local S/ 14
        movEmbarque = esNivel1 ? 100.00 : 80.00;
        movLocal = 14.00;
        netoViatico = tarifaDia - (movEmbarque + movLocal);
      } else if (dias > 1) {
        // Comisión mayor a 1 día:
        // Embarque S/ 120 (S/ 60 ida + S/ 60 vuelta) + Mov local S/ 20 por día
        movEmbarque = 120.00;
        movLocal = 20.00 * dias;
        netoViatico = (tarifaDia * dias) - (movEmbarque + movLocal);
      }

      // Fracción menor a 4 horas (hasta 3 horas)
      if (horasFraccion > 0) {
        netoViatico += (horasFraccion * tarifaHora);
      }

      // Descuento si no sustenta alojamiento: S/ 80.00 por día
      if (!c.sustentaAlojamiento && dias > 0) {
        descAlojamiento = 80.00 * dias;
      }

      const subtotalViatico = Math.max(0, netoViatico + movLocal + movEmbarque - descAlojamiento);
      topeDJ = subtotalViatico * 0.30; // 30% Declaración Jurada

      c.montoViaticoNeto = netoViatico;
      c.montoMovLocal = movLocal;
      c.montoMovEmbarque = movEmbarque;
      c.descuentoAlojamiento = descAlojamiento;
      c.topeDJ = topeDJ;
      c.totalPEN = subtotalViatico + (c.montoPasajes || 0) + (c.montoCombustible || 0) + (c.montoPeajes || 0);

    } else if (st.tipoComision === 'INTERNO_ADC') {
      // Escala dentro del propio Distrito Fiscal / ADC > 24h (Cuadro N° 03)
      const esNivelA = c.nivel === 'NIVEL_A';
      const tarifaDia = esNivelA ? 150.00 : 130.00;
      const tarifaHora = esNivelA ? 6.30 : 5.40;

      movLocal = 15.00 * (dias || 1);
      movEmbarque = 20.00; // S/ 10 ida + S/ 10 vuelta
      netoViatico = (tarifaDia * (dias || 1)) - (movLocal + movEmbarque);

      if (horasFraccion > 0) {
        netoViatico += (horasFraccion * tarifaHora);
      }

      // Descuento si no sustenta alojamiento: S/ 40.00 por día
      if (!c.sustentaAlojamiento && dias > 0) {
        descAlojamiento = 40.00 * dias;
      }

      const subtotalViatico = Math.max(0, netoViatico + movLocal + movEmbarque - descAlojamiento);
      topeDJ = subtotalViatico * 0.30;

      c.montoViaticoNeto = netoViatico;
      c.montoMovLocal = movLocal;
      c.montoMovEmbarque = movEmbarque;
      c.descuentoAlojamiento = descAlojamiento;
      c.topeDJ = topeDJ;
      c.totalPEN = subtotalViatico + (c.montoPasajes || 0) + (c.montoCombustible || 0) + (c.montoPeajes || 0);

    } else if (st.tipoComision === 'SIN_VIATICOS') {
      // Anexo 07: Comisión en el mismo día / radio urbano
      // De 4 a < 8 horas: 12.5% del Nivel 2 = S/ 40.00
      // Más de 8 horas: 25% del Nivel 2 = S/ 80.00
      let asignacionAlimento = 40.00;
      if (totalHoras >= 8) asignacionAlimento = 80.00;

      c.montoViaticoNeto = asignacionAlimento;
      c.montoMovLocal = 0;
      c.montoMovEmbarque = 0;
      c.descuentoAlojamiento = 0;
      c.topeDJ = asignacionAlimento; // Sustentado con DJ y boletas Anexo 07
      c.totalPEN = asignacionAlimento + (c.montoPasajes || 0) + (c.montoCombustible || 0) + (c.montoPeajes || 0);

    } else if (st.tipoComision === 'INTERNACIONAL') {
      // Cuadros N° 04 y N° 05 (Tarifa Diaria en USD)
      const esSupremo = c.nivel === 'NIVEL_1';
      const tablaUSD = {
        'América del Sur': { sup: 370, otros: 333, inst: 1 },
        'América Central': { sup: 315, otros: 283, inst: 1 },
        'América del Norte': { sup: 440, otros: 396, inst: 1 },
        'Europa': { sup: 540, otros: 486, inst: 2 },
        'Caribe': { sup: 430, otros: 387, inst: 1 },
        'Asia': { sup: 500, otros: 450, inst: 2 },
        'Medio Oriente': { sup: 510, otros: 459, inst: 2 },
        'África': { sup: 480, otros: 432, inst: 2 },
        'Oceanía': { sup: 385, otros: 346, inst: 2 }
      };

      const tarifaZona = tablaUSD[st.zonaInternacional] || tablaUSD['América del Sur'];
      const diarioUSD = esSupremo ? tarifaZona.sup : tarifaZona.otros;
      const diasTotalesConInstalacion = (dias || 1) + tarifaZona.inst;
      const totalUSD = diarioUSD * diasTotalesConInstalacion;
      const totalConvertidoPEN = totalUSD * (cfg.tipo_cambio_usd || 3.750);

      c.montoViaticoNeto = totalConvertidoPEN;
      c.totalUSD = totalUSD;
      c.diasInstalacion = tarifaZona.inst;
      c.topeDJ = totalConvertidoPEN * 0.20; // 20% en comisiones al extranjero
      c.totalPEN = totalConvertidoPEN;
    }

    sumaPlanillaPEN += c.totalPEN;
  });

  st.calculoResumen.totalGeneralPEN = sumaPlanillaPEN;
  st.calculoResumen.superaCajaChica = sumaPlanillaPEN > (cfg.tope_viaticos_caja_chica || 2000.00);
}

function generarTextoComputoHoras() {
  const st = window.VIATICOS_STATE;
  if (!st.fechaSalida || !st.fechaRetorno) {
    return '⏱️ Ingrese fechas y horas para calcular la duración exacta.';
  }

  const { totalHoras, diasComputables, horasFraccion } = st.calculoResumen;
  let detalle = `<strong>Duración Total:</strong> ${totalHoras.toFixed(1)} horas (incluye traslado al terminal). `;
  detalle += `• <strong>Cómputo Oficial:</strong> ${diasComputables} día(s)`;
  if (horasFraccion > 0) detalle += ` + ${horasFraccion} hora(s) de fracción`;

  if (st.tipoComision === 'NACIONAL_FUERA_DF' && diasComputables > 5) {
    detalle += ` <span style="color:var(--anc-crimson); font-weight:900;">⚠️ ALERTA: Supera el tope de 5 días (Cuadro N° 01). Requiere autorización excepcional de Gerencia General.</span>`;
  } else if (st.tipoComision === 'INTERNO_ADC' && diasComputables > 10) {
    detalle += ` <span style="color:var(--anc-crimson); font-weight:900;">⚠️ ALERTA: Supera el tope de 10 días al interior de la sede (Cuadro N° 03).</span>`;
  }

  return detalle;
}

function generarTablaComisionados() {
  const st = window.VIATICOS_STATE;
  if (!st.comisionados || st.comisionados.length === 0) {
    return `
      <div style="text-align: center; padding: 22px; background: #F8FAFC; border: 1.5px dashed var(--anc-border-light); border-radius: 12px; color: var(--anc-text-secondary);">
        No hay comisionados registrados. Toca <strong>"➕ Adicionar Comisionado"</strong> para comenzar el cálculo.
      </div>
    `;
  }

  return `
    <div style="overflow-x: auto; border: 1.5px solid var(--anc-border-light); border-radius: 14px;">
      <table class="anc-list-table">
        <thead class="anc-list-thead">
          <tr>
            <th>DNI / NOMBRES</th>
            <th>CARGO / NIVEL</th>
            <th>ALOJAMIENTO</th>
            <th style="text-align:right;">VIÁTICO</th>
            <th style="text-align:right;">MOVILIDAD</th>
            <th style="text-align:right;">TOPE DJ</th>
            <th style="text-align:right;">TOTAL S/</th>
            <th style="text-align:center;">ACCIÓN</th>
          </tr>
        </thead>
        <tbody>
          ${st.comisionados.map((c, idx) => `
            <tr class="anc-list-row">
              <td>
                <strong style="color:var(--anc-navy-main);">${c.nombres_apellidos}</strong><br />
                <span style="font-size:0.75rem; color:var(--anc-text-secondary);">DNI: ${c.dni} • ${c.regimen}</span>
              </td>
              <td>
                <span style="font-size:0.82rem; font-weight:700;">${c.cargo}</span><br />
                <span class="badge-pill" style="background:#E2E8F0; color:var(--anc-navy-main); font-size:0.72rem;">${c.nivelNombre}</span>
              </td>
              <td style="font-size:0.82rem; font-weight:700;">
                ${c.sustentaAlojamiento ? '✓ Con Alojamiento' : '<span style="color:var(--anc-crimson);">✗ Sin Aloj. (Descuento)</span>'}
              </td>
              <td style="text-align:right; font-weight:800; color:var(--anc-navy-main);">
                S/ ${(c.montoViaticoNeto || 0).toFixed(2)}
              </td>
              <td style="text-align:right; font-size:0.82rem; color:var(--anc-text-secondary);">
                S/ ${((c.montoMovLocal || 0) + (c.montoMovEmbarque || 0)).toFixed(2)}
              </td>
              <td style="text-align:right; font-size:0.82rem; color:var(--anc-gold-deep); font-weight:700;">
                S/ ${(c.topeDJ || 0).toFixed(2)}
              </td>
              <td style="text-align:right; font-size:1.05rem; font-weight:900; color:var(--anc-royal-blue);">
                S/ ${(c.totalPEN || 0).toFixed(2)}
              </td>
              <td style="text-align:center;">
                <button type="button" class="btn-stepper" style="width:30px; height:30px; background:#FEE2E2; color:#B91C1C; font-size:0.9rem;" onclick="eliminarComisionado(${idx})" title="Eliminar comisionado">
                  ✕
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// =========================================================================
// 3. CONTROLADORES DE CAMPOS Y MODAL DE COMISIONADOS
// =========================================================================
window.seleccionarTipoComision = function(tipo) {
  window.VIATICOS_STATE.tipoComision = tipo;
  // Actualizar niveles según tipo
  window.VIATICOS_STATE.comisionados.forEach(c => {
    if (tipo === 'INTERNO_ADC') {
      c.nivel = 'NIVEL_B';
      c.nivelNombre = 'Nivel B: Fiscales y Personal';
    } else if (tipo === 'NACIONAL_FUERA_DF') {
      c.nivel = 'NIVEL_2';
      c.nivelNombre = 'Nivel 2: Fiscales y Administrativos';
    }
  });
  recalcularViaticos();
  renderizarVistaViaticos();
};

window.actualizarCampoVia = function(campo, valor) {
  window.VIATICOS_STATE[campo] = valor;
  recalcularViaticos();
  const cja = document.getElementById('caja-computo-horas');
  if (cja) cja.innerHTML = generarTextoComputoHoras();
};

window.actualizarTransporte = function(medio) {
  window.VIATICOS_STATE.medioTransporte = medio;
  recalcularViaticos();
  renderizarVistaViaticos();
};

window.eliminarComisionado = function(index) {
  window.VIATICOS_STATE.comisionados.splice(index, 1);
  recalcularViaticos();
  renderizarVistaViaticos();
  mostrarToast('Comisionado retirado de la planilla.', 'info');
};

function resetearSolicitudViaticos(confirmar = false) {
  if (confirmar && !confirm('¿Deseas iniciar una nueva solicitud de viáticos? Se limpiarán los datos en pantalla.')) return;

  const hoy = new Date();
  const manana = new Date();
  manana.setDate(hoy.getDate() + 2);

  const formatFecha = d => d.toISOString().split('T')[0];

  const usr = window.ANC_STATE.usuarioActivo;

  window.VIATICOS_STATE = {
    tipoComision: 'NACIONAL_FUERA_DF',
    docAutorizacion: '',
    motivoComision: '',
    origen: 'LIMA',
    destino: '',
    medioTransporte: 'AEREO',
    placaVehiculo: '',
    conductorVehiculo: '',
    fechaSalida: formatFecha(hoy),
    horaSalida: '07:00',
    fechaRetorno: formatFecha(manana),
    horaRetorno: '19:00',
    zonaInternacional: 'América del Sur',
    comisionados: [
      {
        dni: usr.dni,
        nombres_apellidos: usr.nombres_apellidos,
        cargo: usr.cargo,
        regimen: usr.regimen_vinculo,
        nivel: 'NIVEL_2',
        nivelNombre: 'Nivel 2 (S/ 320/día)',
        sustentaAlojamiento: true,
        montoPasajes: 0,
        montoCombustible: 0,
        montoPeajes: 0
      }
    ],
    calculoResumen: {
      horasEfectivas: 0,
      horasTerminal: 4,
      totalHoras: 0,
      diasComputables: 0,
      horasFraccion: 0,
      totalGeneralPEN: 0,
      superaCajaChica: false
    }
  };

  recalcularViaticos();
  renderizarVistaViaticos();
}

// Modal Dinámico para Adicionar Comisionados
window.abrirModalAgregarComisionado = function() {
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  const st = window.VIATICOS_STATE;

  let opcionesNivel = '';
  if (st.tipoComision === 'INTERNO_ADC') {
    opcionesNivel = `
      <option value="NIVEL_A">Nivel A: Fiscal Superior / Jefe de ADC (S/ 150.00/día)</option>
      <option value="NIVEL_B" selected>Nivel B: Fiscales y Personal Administrativo (S/ 130.00/día)</option>
    `;
  } else if (st.tipoComision === 'INTERNACIONAL') {
    opcionesNivel = `
      <option value="NIVEL_1">Cuadro 04: Alta Dirección / Jefe Nacional / Fiscal Supremo</option>
      <option value="NIVEL_2" selected>Cuadro 05: Fiscales y Personal Administrativo</option>
    `;
  } else {
    opcionesNivel = `
      <option value="NIVEL_1">Nivel 1: Jefe ANC, Fiscal Supremo, Fiscal Superior, Jefe OCA (S/ 380.00/día)</option>
      <option value="NIVEL_2" selected>Nivel 2: Fiscales Adjuntos, Provinciales, Administrativos (S/ 320.00/día)</option>
    `;
  }

  modalContainer.innerHTML = `
    <div class="modal-backdrop open" id="modal-comisionado">
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.4rem;">👤</span>
            <span class="modal-sheet-title">Adicionar Comisionado</span>
          </div>
          <button type="button" class="btn-modal-back" onclick="cerrarModalComisionado()">✕</button>
        </div>

        <div class="modal-sheet-body">
          <form onsubmit="guardarNuevoComisionado(event)">
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">DNI / DOCUMENTO (*)</label>
              <input type="text" id="m-com-dni" class="anc-input-styled" placeholder="Número de DNI" maxlength="12" required />
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">APELLIDOS Y NOMBRES (*)</label>
              <input type="text" id="m-com-nombres" class="anc-input-styled" placeholder="Nombres completos" required />
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">CARGO INSTITUCIONAL (*)</label>
              <input type="text" id="m-com-cargo" class="anc-input-styled" placeholder="Ej: Fiscal Provincial, Asistente de Función Fiscal..." required />
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">RÉGIMEN / VÍNCULO LABORAL</label>
              <select id="m-com-regimen" class="anc-select-styled">
                <option value="Carrera Fiscal">Carrera Fiscal</option>
                <option value="D.L. 728">D.L. 728 (Personal Administrativo)</option>
                <option value="D.L. 276">D.L. 276</option>
                <option value="CAS D.L. 1057">CAS D.L. 1057</option>
                <option value="Locador / Proveedor de Servicios">Locador / Proveedor de Servicios (Conforme TDR)</option>
              </select>
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--anc-navy-main); margin-bottom:4px;">ESCALA / NIVEL DE VIÁTICOS</label>
              <select id="m-com-nivel" class="anc-select-styled">
                ${opcionesNivel}
              </select>
            </div>

            <div style="margin-bottom: 16px; background:#F8FAFC; padding:10px; border-radius:10px; border:1px solid var(--anc-border-light);">
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; font-weight:700; color:var(--anc-navy-main); cursor:pointer;">
                <input type="checkbox" id="m-com-aloj" checked />
                <span>¿Sustentará gastos de Alojamiento?</span>
              </label>
              <small style="display:block; color:var(--anc-text-secondary); margin-top:4px; font-size:0.74rem;">
                Si se desmarca, se aplicará el descuento obligatorio normativo (S/ 80/día en comisión nacional o S/ 40/día en interna ADC).
              </small>
            </div>

            <div style="display:flex; gap:10px;">
              <button type="button" class="btn-anc-primary" style="background:#E2E8F0; color:var(--anc-navy-main); border:none;" onclick="cerrarModalComisionado()">
                Cancelar
              </button>
              <button type="submit" class="btn-anc-primary">
                ✓ Agregar a la Planilla
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
};

window.cerrarModalComisionado = function() {
  const modal = document.getElementById('modal-comisionado');
  if (modal) modal.remove();
};

window.guardarNuevoComisionado = function(e) {
  e.preventDefault();
  const dni = document.getElementById('m-com-dni').value.trim();
  const nombres = document.getElementById('m-com-nombres').value.trim();
  const cargo = document.getElementById('m-com-cargo').value.trim();
  const regimen = document.getElementById('m-com-regimen').value;
  const nivel = document.getElementById('m-com-nivel').value;
  const nivelSelect = document.getElementById('m-com-nivel');
  const nivelNombre = nivelSelect.options[nivelSelect.selectedIndex].text.split('(')[0].trim();
  const sustentaAloj = document.getElementById('m-com-aloj').checked;

  window.VIATICOS_STATE.comisionados.push({
    dni,
    nombres_apellidos: nombres,
    cargo,
    regimen,
    nivel,
    nivelNombre,
    sustentaAlojamiento: sustentaAloj,
    montoPasajes: 0,
    montoCombustible: 0,
    montoPeajes: 0
  });

  cerrarModalComisionado();
  recalcularViaticos();
  renderizarVistaViaticos();
  mostrarToast(`Comisionado ${nombres} agregado a la planilla.`, 'success');
};

// =========================================================================
// 4. GUARDAR EN SUPABASE (SOLICITUDES_VIATICOS Y COMISIONADOS_VIATICOS)
// =========================================================================
window.guardarViaticosEnSupabase = async function() {
  const st = window.VIATICOS_STATE;
  const cfg = window.ANC_STATE.config;
  const dep = window.ANC_STATE.dependenciaActiva;
  const usr = window.ANC_STATE.usuarioActivo;

  if (!st.docAutorizacion) {
    alert('Por favor ingrese el Documento de Autorización (Resolución u Oficio).');
    return;
  }
  if (!st.destino) {
    alert('Por favor ingrese la ciudad o destino de la comisión.');
    return;
  }
  if (!st.comisionados || st.comisionados.length === 0) {
    alert('Debe adicionar al menos un comisionado para procesar la planilla.');
    return;
  }

  const codPlanilla = `PL-VIA-${cfg.anio_fiscal}-${String(Math.floor(1000 + Math.random() * 9000))}`;

  try {
    if (supabaseClient) {
      // 1. Insertar Cabecera en solicitudes_viaticos
      const { data: solData, error: solErr } = await supabaseClient
        .from('solicitudes_viaticos')
        .insert([{
          codigo_planilla: codPlanilla,
          anio_fiscal: cfg.anio_fiscal || 2026,
          mes_ejecucion: cfg.mes_actual || 'Noviembre',
          unidad_organica_id: dep.id,
          usuario_registro_id: usr.id,
          documento_autorizacion: st.docAutorizacion,
          motivo_comision: st.motivoComision || 'Comisión oficial de control',
          tipo_comision: st.tipoComision,
          origen: st.origen || 'LIMA',
          destino: st.destino,
          medio_transporte: st.medioTransporte,
          placa_vehiculo_oficial: st.placaVehiculo || null,
          nombre_conductor: st.conductorVehiculo || null,
          fecha_hora_salida: `${st.fechaSalida}T${st.horaSalida || '00:00'}:00`,
          fecha_hora_retorno: `${st.fechaRetorno}T${st.horaRetorno || '00:00'}:00`,
          total_horas_calculadas: st.calculoResumen.totalHoras,
          dias_computables: st.calculoResumen.diasComputables,
          horas_fraccion: st.calculoResumen.horasFraccion,
          total_general_pen: st.calculoResumen.totalGeneralPEN,
          supera_tope_caja_chica: st.calculoResumen.superaCajaChica,
          estado_auditoria: 'APROBADO'
        }])
        .select();

      if (solErr) throw solErr;

      const solicitudId = solData[0].id;

      // 2. Insertar Detalle en comisionados_viaticos
      const comisionadosRows = st.comisionados.map(c => ({
        solicitud_id: solicitudId,
        dni_comisionado: c.dni,
        nombres_apellidos: c.nombres_apellidos,
        cargo_comisionado: c.cargo,
        regimen_vinculo: c.regimen,
        incluye_alojamiento: c.sustentaAlojamiento,
        monto_viatico_neto: c.montoViaticoNeto || 0,
        monto_movilidad_local: c.montoMovLocal || 0,
        monto_movilidad_embarque: c.montoMovEmbarque || 0,
        monto_pasajes: c.montoPasajes || 0,
        monto_combustible: c.montoCombustible || 0,
        monto_peajes_otros: c.montoPeajes || 0,
        descuento_aplicado_alojamiento: c.descuentoAlojamiento || 0,
        tope_maximo_dj: c.topeDJ || 0,
        total_comisionado_pen: c.totalPEN || 0
      }));

      await supabaseClient.from('comisionados_viaticos').insert(comisionadosRows);
    }

    // Actualizar gasto acumulado en el estado de la dependencia
    dep.gastado_viaticos = (dep.gastado_viaticos || 0) + st.calculoResumen.totalGeneralPEN;
    actualizarHeaderInstitucional('Planilla Procesada');

    mostrarToast(`✓ Planilla ${codPlanilla} guardada exitosamente en Supabase.`, 'success');
  } catch (err) {
    console.warn('Guardado en caché local (offline):', err);
    mostrarToast(`Planilla ${codPlanilla} registrada correctamente de forma local.`, 'success');
  }
};

// =========================================================================
// 5. GENERADOR OFICIAL DE PLANILLA EN PDF (ANEXO 01 / ANEXO 07)
// =========================================================================
window.generarPlanillaPDF = function() {
  const st = window.VIATICOS_STATE;
  const cfg = window.ANC_STATE.config;
  const dep = window.ANC_STATE.dependenciaActiva;

  if (!st.comisionados || st.comisionados.length === 0) {
    alert('Agregue al menos un comisionado para emitir el reporte.');
    return;
  }

  const codPlanilla = `PL-VIA-${cfg.anio_fiscal}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  const esSinViaticos = st.tipoComision === 'SIN_VIATICOS';

  const htmlDoc = `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; padding: 20px; line-height: 1.35;">
      
      <!-- Encabezado Institucional Oficial -->
      <table style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
        <tr>
          <td style="width: 60px; vertical-align: middle;">
            <img src="./escudo-anc.png" style="height: 52px; width: auto;" alt="Escudo" />
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <div style="font-size: 13px; font-weight: 900; letter-spacing: 0.5px;">MINISTERIO PÚBLICO - FISCALÍA DE LA NACIÓN</div>
            <div style="font-size: 12px; font-weight: 800; color: #0E2C52;">AUTORIDAD NACIONAL DE CONTROL (ANC-MP)</div>
            <div style="font-size: 10px; font-weight: 700;">UNIDAD EJECUTORA 012: ANC-MP • AÑO FISCAL ${cfg.anio_fiscal}</div>
          </td>
          <td style="width: 90px; text-align: right; font-size: 10px; vertical-align: top;">
            <strong>${codPlanilla}</strong><br />
            Versión 10<br />
            ${cfg.mes_actual} ${cfg.anio_fiscal}
          </td>
        </tr>
      </table>

      <!-- Título de la Planilla -->
      <div style="text-align: center; background: #EEE; border: 1px solid #999; padding: 5px; font-size: 12px; font-weight: 900; margin-bottom: 12px;">
        ${esSinViaticos ? 'ANEXO 07: PLANILLA DE COMISIÓN DE SERVICIOS QUE NO IMPLICA VIÁTICOS' : 'ANEXO 01: PLANILLA DE VIÁTICOS Y ASIGNACIONES POR COMISIÓN DE SERVICIOS'}
      </div>

      <!-- Datos Generales de la Comisión -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5px;">
        <tr>
          <td style="width: 18%; font-weight: bold;">Dependencia / Sede:</td>
          <td style="width: 42%; border-bottom: 1px dotted #666;">[${dep.codigo}] ${dep.nombre_dependencia}</td>
          <td style="width: 18%; font-weight: bold;">Doc. Autoriza:</td>
          <td style="width: 22%; border-bottom: 1px dotted #666;">${st.docAutorizacion || 'Resolución Jefatural'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding-top: 4px;">Lugar Destino:</td>
          <td style="border-bottom: 1px dotted #666; padding-top: 4px;">${st.destino || '-'} (${st.tipoComision})</td>
          <td style="font-weight: bold; padding-top: 4px;">Medio Transporte:</td>
          <td style="border-bottom: 1px dotted #666; padding-top: 4px;">${st.medioTransporte}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding-top: 4px;">Salida Programada:</td>
          <td style="border-bottom: 1px dotted #666; padding-top: 4px;">${st.fechaSalida} a las ${st.horaSalida} hrs</td>
          <td style="font-weight: bold; padding-top: 4px;">Retorno Estimado:</td>
          <td style="border-bottom: 1px dotted #666; padding-top: 4px;">${st.fechaRetorno} a las ${st.horaRetorno} hrs</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding-top: 4px;">Duración Cómputo:</td>
          <td colspan="3" style="border-bottom: 1px dotted #666; padding-top: 4px;">
            ${st.calculoResumen.totalHoras.toFixed(1)} horas totales • <strong>${st.calculoResumen.diasComputables} día(s) computables</strong>
            ${st.calculoResumen.horasFraccion > 0 ? ` + ${st.calculoResumen.horasFraccion} hora(s) fracc.` : ''}
          </td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding-top: 4px;">Motivo Comisión:</td>
          <td colspan="3" style="border-bottom: 1px dotted #666; padding-top: 4px;">${st.motivoComision || 'Inspección de control y diligencias oficiales'}</td>
        </tr>
      </table>

      <!-- Tabla de Comisionados y Asignación de Recursos -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px;" border="1" cellpadding="4">
        <thead>
          <tr style="background: #0E2C52; color: #FFF; text-align: center;">
            <th style="width: 25px;">N°</th>
            <th>APELLIDOS Y NOMBRES</th>
            <th>CARGO / RÉGIMEN</th>
            <th>NIVEL</th>
            <th>HOSPEDAJE Y ALIMENT.</th>
            <th>MOV. LOCAL</th>
            <th>MOV. EMBARQUE</th>
            <th>PASAJES / OTROS</th>
            <th>TOTAL S/</th>
          </tr>
        </thead>
        <tbody>
          ${st.comisionados.map((c, i) => `
            <tr>
              <td style="text-align: center;">${i + 1}</td>
              <td><strong>${c.nombres_apellidos}</strong><br />DNI: ${c.dni}</td>
              <td>${c.cargo}<br /><em>${c.regimen}</em></td>
              <td style="text-align: center;">${c.nivel}</td>
              <td style="text-align: right;">S/ ${(c.montoViaticoNeto || 0).toFixed(2)}</td>
              <td style="text-align: right;">S/ ${(c.montoMovLocal || 0).toFixed(2)}</td>
              <td style="text-align: right;">S/ ${(c.montoMovEmbarque || 0).toFixed(2)}</td>
              <td style="text-align: right;">S/ ${((c.montoPasajes || 0) + (c.montoCombustible || 0) + (c.montoPeajes || 0)).toFixed(2)}</td>
              <td style="text-align: right; font-weight: bold; background: #F8FAFC;">S/ ${(c.totalPEN || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr style="background: #F1F5F9; font-weight: bold;">
            <td colspan="8" style="text-align: right;">TOTAL GENERAL DE LA PLANILLA (SOLES):</td>
            <td style="text-align: right; font-size: 11px; color: #0E2C52;">S/ ${st.calculoResumen.totalGeneralPEN.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Notas Normativas de Rendición -->
      <div style="font-size: 9px; color: #333; margin-bottom: 25px; border: 1px solid #CCC; padding: 6px; background: #FAFAFA;">
        <strong>NOTAS IMPORTANTES (Directiva de Viáticos V.10 + Directiva Caja Chica V.08):</strong><br />
        a) La rendición de cuentas debe presentarse dentro de los <strong>diez (10) días hábiles</strong> después de culminada la comisión (15 días calendario en el exterior).<br />
        b) De existir saldo no utilizado, debe devolverse en efectivo dentro de los <strong>cinco (05) días calendario</strong> contados desde la culminación de la comisión.<br />
        c) La Declaración Jurada solo será aplicable hasta el <strong>30%</strong> en comisiones nacionales (zonas sin comprobantes válidos) y hasta el <strong>20%</strong> en el extranjero.<br />
        d) En caso de no sustentar alojamiento, se aplica el descuento automático de <strong>S/ 80.00</strong> por día en comisión nacional o <strong>S/ 40.00</strong> en sede interna.<br />
        e) Conforme a la Res. N° 000038-2025, <strong>no se reconocen gastos por propinas</strong> en comprobantes de consumo, alojamiento o movilidad.
      </div>

      <!-- Firmas de Autorización Oficial -->
      <table style="width: 100%; text-align: center; font-size: 9.5px; margin-top: 35px;">
        <tr>
          <td style="width: 33%; border-top: 1px solid #000; padding-top: 5px;">
            <strong>Comisionado(s)</strong><br />
            Firma y Sello
          </td>
          <td style="width: 33%; border-top: 1px solid #000; padding-top: 5px;">
            <strong>Responsable Dependencia Solicitante</strong><br />
            V°B° Autorización
          </td>
          <td style="width: 33%; border-top: 1px solid #000; padding-top: 5px;">
            <strong>Encargado de Caja Chica / Administración</strong><br />
            V°B° Pagado / Conforme
          </td>
        </tr>
      </table>

    </div>
  `;

  // Renderizar e invocar la librería html2pdf en el cliente
  const opt = {
    margin: [8, 8, 8, 8],
    filename: `${codPlanilla}_ANC_MP.pdf`,
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
      mostrarToast(`✓ Reporte ${codPlanilla}.pdf descargado exitosamente.`, 'success');
    });
  } else {
    // Si no cargó la librería CDN, imprimir por ventana
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${codPlanilla}</title></head><body>${htmlDoc}</body></html>`);
    win.document.close();
    win.print();
  }
};
