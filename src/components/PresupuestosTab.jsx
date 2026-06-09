import { useState, useMemo, useEffect } from "react";

import {
  getPresupuestoVigente,
  crearPresupuestoBase,
  guardarCapitulo,
  guardarItem,
  actualizarItem,
  eliminarItem,
  eliminarCapitulo,
  updatePresupuestoEstado,
  vincularPresupuestoAProyecto,
  loadChecklistItems,
  upsertChecklistItem,
  upsertCalendarioEvento,
} from "../lib/supabase";

const UNIDADES = ["GLOBAL", "UNIDAD", "M2", "M3"];
const ESTADOS_ITEM = ["previsto", "cotizado", "contratado", "ejecutado", "pagado"];

const orange = "#E8641A";
const orangeLight = "#FFF3EB";
const green = "#2D7A4F";
const red = "#C0392B";
const dark = "#1A1A1A";
const mid = "#444";
const light = "#F7F7F5";
const border = "#E0DDD8";

const blue      = "#2563EB";
const blueLight = "#EFF6FF";

const ESTADO_META = {
  borrador: { label: 'Borrador',          color: '#6B7280', bg: '#F3F4F6', nextEstado: 'enviado',  nextLabel: 'Marcar como enviado' },
  enviado:  { label: 'Enviado al cliente', color: orange,   bg: '#FFF3EB', nextEstado: 'aprobado', nextLabel: 'Aprobar presupuesto' },
  aprobado: { label: 'Aprobado',           color: green,    bg: '#EBF7F1', nextEstado: null,       nextLabel: null },
};

function formatMoney(n) {
  const value = Number(n || 0);
  return `$ ${Math.round(value).toLocaleString("es-AR")}`;
}

function calcPrecioClienteUnitario(item) {
  const costo = Number(item.costoDirectoUnitario || 0);
  const indirectos = Number(item.indirectosPct || 0);
  const riesgo = Number(item.riesgoPct || 0);
  const utilidad = Number(item.utilidadPct || 0);

  return costo * (1 + indirectos / 100) * (1 + riesgo / 100) * (1 + utilidad / 100);
}

function calcItem(item) {
  const cantidad = Number(item.cantidad || 0);
  const costoDirectoUnitario = Number(item.costoDirectoUnitario || 0);
  const subtotalCostoDirecto = cantidad * costoDirectoUnitario;
  const precioClienteUnitario = calcPrecioClienteUnitario(item);
  const subtotalCliente = cantidad * precioClienteUnitario;
  const margen = subtotalCliente - subtotalCostoDirecto;
  const margenPct = subtotalCliente > 0 ? (margen / subtotalCliente) * 100 : 0;

  return {
    subtotalCostoDirecto,
    precioClienteUnitario,
    subtotalCliente,
    margen,
    margenPct,
  };
}

function calcTotalesCapitulo(cap) {
  return (cap.items || []).reduce(
    (acc, item) => {
      const t = calcItem(item);
      acc.costoDirecto += t.subtotalCostoDirecto;
      acc.cliente += t.subtotalCliente;
      acc.margen += t.margen;
      return acc;
    },
    { costoDirecto: 0, cliente: 0, margen: 0 }
  );
}

const s = {
  page: { background: light, minHeight: "100vh", fontFamily: "'Outfit', 'Segoe UI', sans-serif", color: dark },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0", gap: 12 },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  subtitle: { fontSize: 13, color: "#888", marginTop: 2 },
  body: { padding: "16px 24px 32px" },
  cards: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 },
  card: (color = dark) => ({
    background: "#fff",
    borderRadius: 12,
    padding: "14px 18px",
    borderTop: `3px solid ${color}`,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  }),
  cardLabel: { fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 },
  cardValue: (color = dark) => ({ fontSize: 22, fontWeight: 700, color }),
  cardSub: { fontSize: 12, color: "#aaa", marginTop: 2 },
  btnPrimary: {
    background: orange,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    background: "#fff",
    color: mid,
    border: `1px solid ${border}`,
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  capitulo: { background: "#fff", borderRadius: 12, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden" },
  capHeader: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer" },
  capNum: { width: 28, height: 28, borderRadius: 7, background: orangeLight, color: orange, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" },
  capNombre: { flex: 1, fontSize: 14, fontWeight: 600 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", minWidth: 1180, borderCollapse: "collapse" },
  th: { padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", background: "#FAFAF9", textAlign: "left", borderBottom: `1px solid ${border}` },
  thR: { padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", background: "#FAFAF9", textAlign: "right", borderBottom: `1px solid ${border}` },
  td: { padding: "8px 10px", fontSize: 12, color: mid, borderBottom: `1px solid ${border}` },
  tdR: { padding: "8px 10px", fontSize: 12, color: mid, borderBottom: `1px solid ${border}`, textAlign: "right" },
  input: { border: `1px solid ${border}`, borderRadius: 6, padding: "5px 7px", fontSize: 12, width: "100%", outline: "none", background: "#fff" },
  select: { border: `1px solid ${border}`, borderRadius: 6, padding: "5px 7px", fontSize: 12, width: "100%", outline: "none", background: "#fff" },
  btnIcon: { background: "none", border: "none", cursor: "pointer", padding: "3px 6px", fontSize: 14 },
  btnAdd: { background: "none", border: `1px dashed ${border}`, color: "#aaa", borderRadius: 7, padding: "8px 14px", fontSize: 12, cursor: "pointer", width: "100%" },
  badge: (color, bg) => ({ fontSize: 11, fontWeight: 700, color, background: bg, padding: "2px 8px", borderRadius: 20 }),
};

function mapDBPresupuesto(data) {
  return {
    ...data,
    id: data.id,
    numeroVersion: data.numeroVersion || data.numero_version || 1,
    estadoVersion: data.estadoVersion || data.estado_version || "borrador",
    usdRate: data.usdRate || data.usd_rate || 1250,
    capitulos: (data.capitulos || data.presupuesto_capitulos || [])
      .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      .map((cap) => ({
        id: cap.id,
        nombre: cap.nombre || "",
        etapaId: cap.etapaId || cap.etapa_id || null,
        items: (cap.items || cap.presupuesto_items || [])
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
          .map((it) => ({
            id: it.id,
            descripcion: it.descripcion || "",
            unidad: it.unidad || "GLOBAL",
            cantidad: Number(it.cantidad || 0),

            costoDirectoUnitario: Number(it.costoDirectoUnitario || it.costo_directo_unitario || it.costoPresupuestado || it.costo_presupuestado || 0),
            indirectosPct: Number(it.indirectosPct || it.indirectos_pct || 0),
            riesgoPct: Number(it.riesgoPct || it.riesgo_pct || 0),
            utilidadPct: Number(it.utilidadPct || it.utilidad_pct || 0),

            precioCliente: Number(it.precioCliente || it.precio_cliente || 0),
            costoPresupuestado: Number(it.costoPresupuestado || it.costo_presupuestado || 0),

            moneda: it.moneda || "ARS",
            estadoItem: it.estadoItem || it.estado_item || "previsto",

            costoContratado: Number(it.costoContratado || it.costo_contratado || 0),
            costoComprado: Number(it.costoComprado || it.costo_comprado || 0),
            costoFacturado: Number(it.costoFacturado || it.costo_facturado || 0),
            costoPagado: Number(it.costoPagado || it.costo_pagado || 0),

            etapaId: it.etapaId || it.etapa_id || null,
            tareaId: it.tareaId || it.tarea_id || null,
            hitoId: it.hitoId || it.hito_id || null,
          })),
      })),
  };
}

function ItemRow({ item, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);

  const itemCalc = calcItem(item);
  const draftCalc = calcItem(draft);

  function updateDraft(field, value) {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function guardar() {
    const precioClienteUnitario = calcPrecioClienteUnitario(draft);

    await onUpdate({
      ...draft,
      precioCliente: precioClienteUnitario,
      costoPresupuestado: Number(draft.costoDirectoUnitario || 0),
    });

    setEditing(false);
  }

  if (editing) {
    return (
      <tr style={{ background: orangeLight }}>
        <td style={s.td}>
          <input style={s.input} value={draft.descripcion} onChange={(e) => updateDraft("descripcion", e.target.value)} />
        </td>

        <td style={s.td}>
          <select style={s.select} value={draft.unidad} onChange={(e) => updateDraft("unidad", e.target.value)}>
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </td>

        <td style={s.tdR}>
          <input style={{ ...s.input, textAlign: "right" }} type="number" value={draft.cantidad} onChange={(e) => updateDraft("cantidad", Number(e.target.value))} />
        </td>

        <td style={s.tdR}>
          <input style={{ ...s.input, textAlign: "right" }} type="number" value={draft.costoDirectoUnitario} onChange={(e) => updateDraft("costoDirectoUnitario", Number(e.target.value))} />
        </td>

        <td style={s.tdR}>{formatMoney(draftCalc.subtotalCostoDirecto)}</td>

        <td style={s.tdR}>
          <input style={{ ...s.input, textAlign: "right" }} type="number" value={draft.indirectosPct} onChange={(e) => updateDraft("indirectosPct", Number(e.target.value))} />
        </td>

        <td style={s.tdR}>
          <input style={{ ...s.input, textAlign: "right" }} type="number" value={draft.riesgoPct} onChange={(e) => updateDraft("riesgoPct", Number(e.target.value))} />
        </td>

        <td style={s.tdR}>
          <input style={{ ...s.input, textAlign: "right" }} type="number" value={draft.utilidadPct} onChange={(e) => updateDraft("utilidadPct", Number(e.target.value))} />
        </td>

        <td style={{ ...s.tdR, fontWeight: 700, color: orange }}>{formatMoney(draftCalc.precioClienteUnitario)}</td>
        <td style={{ ...s.tdR, fontWeight: 700, color: orange }}>{formatMoney(draftCalc.subtotalCliente)}</td>

        <td style={s.td}>
          <select style={s.select} value={draft.estadoItem} onChange={(e) => updateDraft("estadoItem", e.target.value)}>
            {ESTADOS_ITEM.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
          </select>
        </td>

        <td style={{ ...s.td, textAlign: "right", whiteSpace: "nowrap" }}>
          <button style={s.btnIcon} onClick={guardar}>💾</button>
          <button style={s.btnIcon} onClick={() => setEditing(false)}>✕</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td style={s.td}>{item.descripcion}</td>
      <td style={s.td}>{item.unidad}</td>
      <td style={s.tdR}>{Number(item.cantidad || 0).toLocaleString("es-AR")}</td>
      <td style={s.tdR}>{formatMoney(item.costoDirectoUnitario)}</td>
      <td style={s.tdR}>{formatMoney(itemCalc.subtotalCostoDirecto)}</td>
      <td style={s.tdR}>{Number(item.indirectosPct || 0)}%</td>
      <td style={s.tdR}>{Number(item.riesgoPct || 0)}%</td>
      <td style={s.tdR}>{Number(item.utilidadPct || 0)}%</td>
      <td style={{ ...s.tdR, color: orange, fontWeight: 700 }}>{formatMoney(itemCalc.precioClienteUnitario)}</td>
      <td style={{ ...s.tdR, color: orange, fontWeight: 700 }}>{formatMoney(itemCalc.subtotalCliente)}</td>
      <td style={s.td}>
        <span style={s.badge(green, "#EBF7F1")}>{item.estadoItem}</span>
      </td>
      <td style={{ ...s.td, textAlign: "right", whiteSpace: "nowrap" }}>
        <button style={s.btnIcon} onClick={() => setEditing(true)}>✏️</button>
        <button style={s.btnIcon} onClick={() => onDelete(item.id)}>🗑️</button>
      </td>
    </tr>
  );
}

function Capitulo({ cap, idx, onUpdateItem, onDeleteItem, onDeleteCapitulo, onAddItem }) {
  const [open, setOpen] = useState(true);
  const t = calcTotalesCapitulo(cap);
  const margenPct = t.cliente > 0 ? (t.margen / t.cliente) * 100 : 0;

  return (
    <div style={s.capitulo}>
      <div style={s.capHeader} onClick={() => setOpen(!open)}>
        <div style={s.capNum}>{idx + 1}</div>
        <div style={s.capNombre}>{cap.nombre}</div>
        <strong style={{ color: green }}>{formatMoney(t.costoDirecto)}</strong>
        <strong style={{ color: orange }}>{formatMoney(t.cliente)}</strong>
        <span style={s.badge(margenPct >= 20 ? green : margenPct >= 10 ? orange : red, margenPct >= 20 ? "#EBF7F1" : margenPct >= 10 ? "#FFF3EB" : "#FDECEA")}>
          Margen {margenPct.toFixed(1)}%
        </span>
        <button
          style={s.btnIcon}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteCapitulo(cap.id);
          }}
        >
          🗑️
        </button>
      </div>

      {open && (
        <>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Descripción</th>
                  <th style={s.th}>Unidad</th>
                  <th style={s.thR}>Cantidad</th>
                  <th style={s.thR}>Costo directo unit.</th>
                  <th style={s.thR}>Subtotal costo directo</th>
                  <th style={s.thR}>Indirectos %</th>
                  <th style={s.thR}>Riesgo %</th>
                  <th style={s.thR}>Utilidad %</th>
                  <th style={s.thR}>Precio cliente unit.</th>
                  <th style={s.thR}>Subtotal cliente</th>
                  <th style={s.th}>Estado</th>
                  <th style={s.thR}></th>
                </tr>
              </thead>

              <tbody>
                {(cap.items || []).map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onUpdate={onUpdateItem}
                    onDelete={onDeleteItem}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "8px 16px 12px" }}>
            <button style={s.btnAdd} onClick={() => onAddItem(cap.id)}>
              + Agregar ítem
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function PresupuestosTab({ proyecto, proyectosArmar, isEditor }) {
  const proyectoId = proyecto?.id;
  const [loading,      setLoading]      = useState(true);
  const [presupuesto,  setPresupuesto]  = useState(null);
  const [nuevoCapitulo, setNuevoCapitulo] = useState("");
  const [vincularOpen, setVincularOpen] = useState(false);
  const [toast,        setToast]        = useState('');

  async function cargar() {
    if (!proyectoId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let data = await getPresupuestoVigente(proyectoId);

    if (!data) {
      data = await crearPresupuestoBase(proyectoId);
    }

    setPresupuesto(mapDBPresupuesto(data || { capitulos: [] }));
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, [proyectoId]);

  const capitulos = presupuesto?.capitulos || [];

  const totales = useMemo(() => {
    return capitulos.reduce(
      (acc, cap) => {
        const t = calcTotalesCapitulo(cap);
        acc.costoDirecto += t.costoDirecto;
        acc.cliente += t.cliente;
        acc.margen += t.margen;
        return acc;
      },
      { costoDirecto: 0, cliente: 0, margen: 0 }
    );
  }, [capitulos]);

  const margenPct = totales.cliente > 0 ? (totales.margen / totales.cliente) * 100 : 0;

  async function handleAddCapitulo() {
    if (!nuevoCapitulo.trim() || !presupuesto?.id) return;
    await guardarCapitulo(presupuesto.id, nuevoCapitulo.trim(), capitulos.length);
    setNuevoCapitulo("");
    await cargar();
  }

  async function handleAddItem(capituloId) {
    await guardarItem(capituloId, {
      descripcion: "Nuevo ítem",
      unidad: "GLOBAL",
      cantidad: 1,
      costoDirectoUnitario: 0,
      indirectosPct: 0,
      riesgoPct: 0,
      utilidadPct: 0,
      precioCliente: 0,
      costoPresupuestado: 0,
      moneda: "ARS",
      estadoItem: "previsto",
    });
    await cargar();
  }

  async function handleUpdateItem(item) {
    await actualizarItem(item.id, item);
    await cargar();
  }

  async function handleDeleteItem(itemId) {
    await eliminarItem(itemId);
    await cargar();
  }

  async function handleDeleteCapitulo(capituloId) {
    await eliminarCapitulo(capituloId);
    await cargar();
  }

  async function handleEstado(nuevoEstado) {
    if (!presupuesto?.id) return;
    await updatePresupuestoEstado(presupuesto.id, nuevoEstado);
    setPresupuesto(prev => ({ ...prev, estadoVersion: nuevoEstado }));

    if (nuevoEstado === 'aprobado') {
      upsertCalendarioEvento({
        obraId:          proyecto.id || null,
        proyectoArmarId: presupuesto.proyectoArmarId || null,
        origen:          'presupuesto',
        tipoEvento:      'hito',
        titulo:          `Presupuesto aprobado: ${proyecto.name}`,
        fecha:           new Date().toISOString().slice(0, 10),
        estado:          'completado',
      })
      if (presupuesto.proyectoArmarId) {
        try {
          const items = await loadChecklistItems(presupuesto.proyectoArmarId);
          const aActualizar = items.filter(it =>
            it.estado !== 'aprobado' && (
              it.titulo.toLowerCase().includes('presupuesto aprobado') ||
              it.titulo.toLowerCase().includes('presupuesto de obra completo') ||
              it.titulo.toLowerCase().includes('presupuesto final')
            )
          );
          if (aActualizar.length > 0) {
            await Promise.all(aActualizar.map(it => upsertChecklistItem({ ...it, estado: 'aprobado' })));
            setToast('✓ Checklist del proyecto actualizado');
            setTimeout(() => setToast(''), 3500);
          }
        } catch (err) {
          console.error('handleEstado checklist:', err);
        }
      }
    }
  }

  async function handleVincularProyecto(proyArmarId) {
    if (!presupuesto?.id || !proyArmarId) return;
    await vincularPresupuestoAProyecto(presupuesto.id, proyArmarId);
    setPresupuesto(prev => ({ ...prev, proyectoArmarId: proyArmarId }));
    setVincularOpen(false);
  }

  if (loading) return <div style={s.page}>Cargando presupuesto...</div>;

  const estadoActual = presupuesto?.estadoVersion || 'borrador';
  const estadoMeta   = ESTADO_META[estadoActual] || ESTADO_META.borrador;

  const proyectoProy = proyectosArmar?.find(p => p.id === presupuesto?.proyectoArmarId);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Presupuesto</div>
          <div style={s.subtitle}>
            {proyecto?.name || proyecto?.nombre || "Obra"} · v{presupuesto?.numeroVersion || 1}
          </div>

          {/* Badge proyecto ARMAR vinculado / botón vincular */}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {proyectoProy ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: blue, background: blueLight, padding: '3px 10px', borderRadius: 99, border: '1px solid #BFDBFE' }}>
                {proyectoProy.nombre}{proyectoProy.comitente ? ` (${proyectoProy.comitente})` : ''}
              </span>
            ) : proyectosArmar?.length > 0 ? (
              vincularOpen ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select
                    defaultValue=""
                    onChange={e => { if (e.target.value) handleVincularProyecto(e.target.value) }}
                    style={{ ...s.select, width: 'auto', minWidth: 240, fontSize: 12 }}
                    autoFocus
                  >
                    <option value="" disabled>Seleccionar proyecto…</option>
                    {proyectosArmar.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}{p.comitente ? ` (${p.comitente})` : ''}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => setVincularOpen(false)} style={{ ...s.btnIcon, color: '#9CA3AF', fontSize: 16 }}>✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setVincularOpen(true)}
                  style={{ fontSize: 11, fontWeight: 700, color: blue, background: blueLight, padding: '3px 10px', borderRadius: 99, border: `1px solid #BFDBFE`, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  + Vincular proyecto
                </button>
              )
            ) : null}
          </div>
        </div>

        {/* Estado + botón avanzar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: estadoMeta.color, background: estadoMeta.bg, padding: '4px 12px', borderRadius: 99, border: `1px solid ${estadoMeta.color}22` }}>
            {estadoMeta.label}
          </span>
          {estadoMeta.nextEstado && isEditor && (
            <button
              onClick={() => handleEstado(estadoMeta.nextEstado)}
              style={{ ...s.btnPrimary, fontSize: 12, padding: '6px 14px', background: estadoActual === 'enviado' ? green : orange }}
            >
              {estadoMeta.nextLabel}
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 400, background: green, color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 20px rgba(45,122,79,0.35)', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      <div style={{ padding: "16px 24px 0" }}>
        <div style={s.cards}>
          <div style={s.card(green)}>
            <div style={s.cardLabel}>Costo directo</div>
            <div style={s.cardValue(green)}>{formatMoney(totales.costoDirecto)}</div>
            <div style={s.cardSub}>costo puro presupuestado</div>
          </div>

          <div style={s.card(orange)}>
            <div style={s.cardLabel}>Subtotal cliente</div>
            <div style={s.cardValue(orange)}>{formatMoney(totales.cliente)}</div>
            <div style={s.cardSub}>precio de venta calculado</div>
          </div>

          <div style={s.card(margenPct >= 20 ? green : margenPct >= 10 ? orange : red)}>
            <div style={s.cardLabel}>Margen estimado</div>
            <div style={s.cardValue(margenPct >= 20 ? green : margenPct >= 10 ? orange : red)}>
              {margenPct.toFixed(1)}%
            </div>
            <div style={s.cardSub}>{formatMoney(totales.margen)}</div>
          </div>

          <div style={s.card(dark)}>
            <div style={s.cardLabel}>Cantidad de capítulos</div>
            <div style={s.cardValue(dark)}>{capitulos.length}</div>
            <div style={s.cardSub}>rubros presupuestados</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            style={{ ...s.input, maxWidth: 320 }}
            value={nuevoCapitulo}
            onChange={(e) => setNuevoCapitulo(e.target.value)}
            placeholder="Nuevo capítulo. Ej: Instalación eléctrica"
          />
          <button style={s.btnPrimary} onClick={handleAddCapitulo}>
            + Capítulo
          </button>
        </div>
      </div>

      <div style={s.body}>
        {capitulos.map((cap, idx) => (
          <Capitulo
            key={cap.id}
            cap={cap}
            idx={idx}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onDeleteCapitulo={handleDeleteCapitulo}
            onAddItem={handleAddItem}
          />
        ))}
      </div>
    </div>
  );
}
