import { useState, useMemo, useEffect } from "react";
import {
  getPresupuestoVigente,
  crearPresupuestoBase,
  guardarCapitulo,
  guardarItem,
  actualizarItem,
  eliminarItem,
  eliminarCapitulo,
} from "./supabase";

const USD_RATE_DEFAULT = 1250;

const ESTADOS_ITEM = [
  "previsto",
  "cotizado",
  "aprobado",
  "contratado",
  "comprado",
  "ejecutado",
  "certificado",
  "pagado",
];

const orange = "#E8641A";
const orangeLight = "#FFF3EB";
const green = "#2D7A4F";
const greenLight = "#EBF7F1";
const red = "#C0392B";
const redLight = "#FDECEA";
const blue = "#2563EB";
const blueLight = "#EFF6FF";
const dark = "#1A1A1A";
const mid = "#444";
const light = "#F7F7F5";
const border = "#E0DDD8";

function toARS(monto, moneda, usdRate) {
  return moneda === "USD" ? Number(monto || 0) * usdRate : Number(monto || 0);
}

function formatMoney(n, moneda = "ARS") {
  const value = Number(n || 0);
  if (moneda === "USD") {
    return `U$D ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
  }
  return `$ ${Math.round(value).toLocaleString("es-AR")}`;
}

function getCostoRealARS(item, usdRate) {
  const real =
    item.costoPagado ||
    item.costoFacturado ||
    item.costoComprado ||
    item.costoContratado ||
    0;

  return toARS(real * item.cantidad, item.moneda, usdRate);
}

function calcTotalesCapitulo(cap, usdRate) {
  let cliente = 0;
  let costoPresupuestado = 0;
  let costoReal = 0;

  cap.items.forEach((item) => {
    cliente += toARS(item.precioCliente * item.cantidad, item.moneda, usdRate);
    costoPresupuestado += toARS(item.costoPresupuestado * item.cantidad, item.moneda, usdRate);
    costoReal += getCostoRealARS(item, usdRate);
  });

  const margen = cliente - costoPresupuestado;
  const margenPct = cliente > 0 ? (margen / cliente) * 100 : 0;
  const desvio = costoReal - costoPresupuestado;
  const desvioPct = costoPresupuestado > 0 ? (desvio / costoPresupuestado) * 100 : 0;

  return {
    cliente,
    costoPresupuestado,
    costoReal,
    margen,
    margenPct,
    desvio,
    desvioPct,
  };
}

function colorDesvio(pct) {
  if (pct <= 0) return green;
  if (pct <= 10) return orange;
  return red;
}

function bgDesvio(pct) {
  if (pct <= 0) return greenLight;
  if (pct <= 10) return orangeLight;
  return redLight;
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
  vistaBadge: (active) => ({
    padding: "5px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    border: active ? "none" : `1px solid ${border}`,
    background: active ? orange : "#fff",
    color: active ? "#fff" : "#888",
  }),
  capitulo: { background: "#fff", borderRadius: 12, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden" },
  capHeader: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer" },
  capNum: { width: 28, height: 28, borderRadius: 7, background: orangeLight, color: orange, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" },
  capNombre: { flex: 1, fontSize: 14, fontWeight: 600 },
  badge: (color, bg) => ({ fontSize: 12, fontWeight: 700, color, background: bg, padding: "2px 8px", borderRadius: 20 }),
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", background: "#FAFAF9", textAlign: "left", borderBottom: `1px solid ${border}` },
  thR: { padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", background: "#FAFAF9", textAlign: "right", borderBottom: `1px solid ${border}` },
  td: { padding: "9px 12px", fontSize: 13, color: mid, borderBottom: `1px solid ${border}` },
  tdR: { padding: "9px 12px", fontSize: 13, color: mid, borderBottom: `1px solid ${border}`, textAlign: "right" },
  tdMono: { padding: "9px 12px", fontSize: 13, fontFamily: "'Courier New', monospace", borderBottom: `1px solid ${border}`, textAlign: "right" },
  input: { border: `1px solid ${border}`, borderRadius: 6, padding: "5px 8px", fontSize: 13, width: "100%", outline: "none" },
  btnIcon: { background: "none", border: "none", cursor: "pointer", padding: "3px 6px", fontSize: 14 },
  btnAdd: { background: "none", border: `1px dashed ${border}`, color: "#aaa", borderRadius: 7, padding: "8px 14px", fontSize: 12, cursor: "pointer", width: "100%" },
};

function mapDBPresupuesto(data) {
  return {
    ...data,
    capitulos: (data.presupuesto_capitulos || [])
      .sort((a, b) => a.orden - b.orden)
      .map((cap) => ({
        id: cap.id,
        nombre: cap.nombre,
        etapaId: cap.etapa_id,
        items: (cap.presupuesto_items || [])
          .sort((a, b) => a.orden - b.orden)
          .map((it) => ({
            id: it.id,
            descripcion: it.descripcion,
            unidad: it.unidad,
            cantidad: Number(it.cantidad || 0),
            precioCliente: Number(it.precio_cliente || 0),
            costoPresupuestado: Number(it.costo_presupuestado || 0),
            costoContratado: Number(it.costo_contratado || 0),
            costoComprado: Number(it.costo_comprado || 0),
            costoFacturado: Number(it.costo_facturado || 0),
            costoPagado: Number(it.costo_pagado || 0),
            moneda: it.moneda || "ARS",
            estadoItem: it.estado_item || "previsto",
            etapaId: it.etapa_id,
            tareaId: it.tarea_id,
            hitoId: it.hito_id,
          })),
      })),
  };
}

function ItemRow({ item, vista, usdRate, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);

  const subtotalCliente = toARS(item.precioCliente * item.cantidad, item.moneda, usdRate);
  const subtotalPresupuestado = toARS(item.costoPresupuestado * item.cantidad, item.moneda, usdRate);
  const costoReal = getCostoRealARS(item, usdRate);
  const desvio = costoReal - subtotalPresupuestado;
  const desvioPct = subtotalPresupuestado > 0 ? (desvio / subtotalPresupuestado) * 100 : 0;
  const margen = subtotalCliente - subtotalPresupuestado;
  const margenPct = subtotalCliente > 0 ? (margen / subtotalCliente) * 100 : 0;

  async function guardar() {
    await onUpdate(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <tr style={{ background: orangeLight }}>
        <td style={s.td} colSpan={10}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 70px 70px 110px 110px 110px 110px 110px 110px", gap: 8 }}>
            <input style={s.input} value={draft.descripcion} onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })} />
            <input style={s.input} value={draft.unidad} onChange={(e) => setDraft({ ...draft, unidad: e.target.value })} />
            <input style={s.input} type="number" value={draft.cantidad} onChange={(e) => setDraft({ ...draft, cantidad: Number(e.target.value) })} />
            <input style={s.input} type="number" value={draft.precioCliente} onChange={(e) => setDraft({ ...draft, precioCliente: Number(e.target.value) })} />
            <input style={s.input} type="number" value={draft.costoPresupuestado} onChange={(e) => setDraft({ ...draft, costoPresupuestado: Number(e.target.value) })} />
            <input style={s.input} type="number" value={draft.costoContratado} onChange={(e) => setDraft({ ...draft, costoContratado: Number(e.target.value) })} />
            <input style={s.input} type="number" value={draft.costoFacturado} onChange={(e) => setDraft({ ...draft, costoFacturado: Number(e.target.value) })} />
            <select style={s.input} value={draft.estadoItem} onChange={(e) => setDraft({ ...draft, estadoItem: e.target.value })}>
              {ESTADOS_ITEM.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
            </select>
            <select style={s.input} value={draft.moneda} onChange={(e) => setDraft({ ...draft, moneda: e.target.value })}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button style={s.btnSecondary} onClick={() => setEditing(false)}>Cancelar</button>
            <button style={s.btnPrimary} onClick={guardar}>Guardar</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td style={s.td}>{item.descripcion}</td>
      <td style={s.td}>{item.unidad}</td>
      <td style={s.tdR}>{item.cantidad}</td>

      {vista !== "interno" && <td style={s.tdMono}>{formatMoney(item.precioCliente, item.moneda)}</td>}
      {vista !== "cliente" && <td style={s.tdMono}>{formatMoney(item.costoPresupuestado, item.moneda)}</td>}
      {vista === "real" && <td style={s.tdMono}>{formatMoney(costoReal)}</td>}

      {vista === "comparar" && (
        <>
          <td style={s.tdMono}>{formatMoney(subtotalCliente)}</td>
          <td style={{ ...s.tdMono, color: margenPct >= 20 ? green : margenPct >= 10 ? orange : red }}>{margenPct.toFixed(1)}%</td>
          <td style={{ ...s.tdMono, color: colorDesvio(desvioPct) }}>{desvioPct.toFixed(1)}%</td>
        </>
      )}

      <td style={s.td}>
        <span style={s.badge(blue, blueLight)}>{item.estadoItem}</span>
      </td>

      <td style={{ ...s.td, textAlign: "right" }}>
        <button style={s.btnIcon} onClick={() => setEditing(true)}>✏️</button>
        <button style={s.btnIcon} onClick={() => onDelete(item.id)}>🗑️</button>
      </td>
    </tr>
  );
}

function Capitulo({ cap, idx, vista, usdRate, onUpdateItem, onDeleteItem, onDeleteCapitulo, onAddItem }) {
  const [open, setOpen] = useState(true);
  const t = calcTotalesCapitulo(cap, usdRate);

  return (
    <div style={s.capitulo}>
      <div style={s.capHeader} onClick={() => setOpen(!open)}>
        <div style={s.capNum}>{idx + 1}</div>
        <div style={s.capNombre}>{cap.nombre}</div>
        <strong style={{ color: orange }}>{formatMoney(t.cliente)}</strong>
        <strong style={{ color: green }}>{formatMoney(t.costoPresupuestado)}</strong>
        <span style={s.badge(colorDesvio(t.desvioPct), bgDesvio(t.desvioPct))}>
          Desvío {t.desvioPct.toFixed(1)}%
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
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Descripción</th>
                <th style={s.th}>Unidad</th>
                <th style={s.thR}>Cant.</th>
                {vista !== "interno" && <th style={s.thR}>P. Cliente</th>}
                {vista !== "cliente" && <th style={s.thR}>Costo Presup.</th>}
                {vista === "real" && <th style={s.thR}>Costo Real</th>}
                {vista === "comparar" && (
                  <>
                    <th style={s.thR}>Subtotal Cliente</th>
                    <th style={s.thR}>Margen</th>
                    <th style={s.thR}>Desvío</th>
                  </>
                )}
                <th style={s.th}>Estado</th>
                <th style={s.thR}></th>
              </tr>
            </thead>
            <tbody>
              {cap.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  vista={vista}
                  usdRate={usdRate}
                  onUpdate={onUpdateItem}
                  onDelete={onDeleteItem}
                />
              ))}
            </tbody>
          </table>

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

export default function PresupuestosTab({ proyecto }) {
  const proyectoId = proyecto?.id;
  const [loading, setLoading] = useState(true);
  const [presupuesto, setPresupuesto] = useState(null);
  const [vista, setVista] = useState("comparar");
  const [nuevoCapitulo, setNuevoCapitulo] = useState("");

  async function cargar() {
    if (!proyectoId) return;

    setLoading(true);

    let data = await getPresupuestoVigente(proyectoId);

    if (!data) {
      data = await crearPresupuestoBase(proyectoId);
      data.presupuesto_capitulos = [];
    }

    setPresupuesto(mapDBPresupuesto(data));
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, [proyectoId]);

  const usdRate = presupuesto?.usd_rate || USD_RATE_DEFAULT;
  const capitulos = presupuesto?.capitulos || [];

  const totales = useMemo(() => {
    return capitulos.reduce(
      (acc, cap) => {
        const t = calcTotalesCapitulo(cap, usdRate);
        acc.cliente += t.cliente;
        acc.costoPresupuestado += t.costoPresupuestado;
        acc.costoReal += t.costoReal;
        acc.desvio += t.desvio;
        return acc;
      },
      { cliente: 0, costoPresupuestado: 0, costoReal: 0, desvio: 0 }
    );
  }, [capitulos, usdRate]);

  const margen = totales.cliente - totales.costoPresupuestado;
  const margenPct = totales.cliente > 0 ? (margen / totales.cliente) * 100 : 0;
  const desvioPct = totales.costoPresupuestado > 0 ? (totales.desvio / totales.costoPresupuestado) * 100 : 0;

  async function handleAddCapitulo() {
    if (!nuevoCapitulo.trim()) return;
    await guardarCapitulo(presupuesto.id, nuevoCapitulo.trim(), capitulos.length);
    setNuevoCapitulo("");
    await cargar();
  }

  async function handleAddItem(capituloId) {
    await guardarItem(capituloId, {
      descripcion: "Nuevo ítem",
      unidad: "m2",
      cantidad: 1,
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

  if (loading) {
    return <div style={s.page}>Cargando presupuesto...</div>;
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Presupuesto</div>
          <div style={s.subtitle}>
            {proyecto?.nombre || "Obra"} · Versión {presupuesto?.numero_version || 1} · {presupuesto?.estado_version || "borrador"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {[
            ["cliente", "Cliente"],
            ["interno", "Interno"],
            ["comparar", "Comparar"],
            ["real", "Real"],
          ].map(([key, label]) => (
            <button key={key} style={s.vistaBadge(vista === key)} onClick={() => setVista(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 24px 0" }}>
        <div style={s.cards}>
          <div style={s.card(orange)}>
            <div style={s.cardLabel}>Total cliente</div>
            <div style={s.cardValue(orange)}>{formatMoney(totales.cliente)}</div>
            <div style={s.cardSub}>Precio de venta presupuestado</div>
          </div>

          <div style={s.card(green)}>
            <div style={s.cardLabel}>Costo presupuestado interno</div>
            <div style={s.cardValue(green)}>{formatMoney(totales.costoPresupuestado)}</div>
            <div style={s.cardSub}>Base económica aprobada</div>
          </div>

          <div style={s.card(margenPct >= 20 ? green : margenPct >= 10 ? orange : red)}>
            <div style={s.cardLabel}>Margen estimado</div>
            <div style={s.cardValue(margenPct >= 20 ? green : margenPct >= 10 ? orange : red)}>
              {margenPct.toFixed(1)}%
            </div>
            <div style={s.cardSub}>{formatMoney(margen)}</div>
          </div>

          <div style={s.card(colorDesvio(desvioPct))}>
            <div style={s.cardLabel}>Desvío real</div>
            <div style={s.cardValue(colorDesvio(desvioPct))}>
              {desvioPct.toFixed(1)}%
            </div>
            <div style={s.cardSub}>{formatMoney(totales.desvio)}</div>
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
            vista={vista}
            usdRate={usdRate}
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
