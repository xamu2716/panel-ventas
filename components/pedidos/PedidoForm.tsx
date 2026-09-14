"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input, Select, Sheet, Textarea, ToggleGroup } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { formatCOP, gananciaPedido, totalPedido } from "@/lib/calc";
import type { PedidoConProducto, Producto, TipoEntrega } from "@/lib/types";

type Props = {
  productos: Producto[];
  pedido?: PedidoConProducto;
  onClose: () => void;
  onSaved: () => void;
};

export function PedidoForm({ productos, pedido, onClose, onSaved }: Props) {
  const editando = !!pedido;

  const [cliente, setCliente] = useState(pedido?.cliente ?? "");
  const [telefono, setTelefono] = useState(pedido?.telefono ?? "");
  const [productoId, setProductoId] = useState(pedido?.producto_id ?? productos[0]?.id ?? "");
  const [cantidad, setCantidad] = useState(String(pedido?.cantidad ?? 1));
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>(pedido?.tipo_entrega ?? "recoge");
  const [direccion, setDireccion] = useState(pedido?.direccion ?? "");
  const [notas, setNotas] = useState(pedido?.notas ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Snapshot de precio/costo: al crear, siempre el del producto elegido; al
  // editar, se conserva el original salvo que el usuario cambie de producto
  // (así el histórico no se mueve solo porque el costo del producto cambió).
  const [snapshotPrecio, setSnapshotPrecio] = useState(
    pedido?.precio_unitario_snapshot ?? productos[0]?.precio_venta ?? 0,
  );
  const [snapshotCosto, setSnapshotCosto] = useState(
    pedido?.costo_unitario_snapshot ?? productos[0]?.costo_unitario ?? 0,
  );

  const productoSeleccionado = productos.find((p) => p.id === productoId);
  const cantidadNum = Number(cantidad) || 0;
  const total = totalPedido(snapshotPrecio, cantidadNum);
  const ganancia = gananciaPedido(snapshotPrecio, snapshotCosto, cantidadNum);
  const excedeStock = !!productoSeleccionado && cantidadNum > productoSeleccionado.stock;

  function handleProductoChange(id: string) {
    setProductoId(id);
    const p = productos.find((x) => x.id === id);
    if (p) {
      setSnapshotPrecio(p.precio_venta);
      setSnapshotCosto(p.costo_unitario);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!cliente.trim()) {
      setError("Escribe el nombre del cliente.");
      return;
    }
    if (!productoId) {
      setError("Elige un producto del inventario.");
      return;
    }
    if (cantidadNum <= 0) {
      setError("La cantidad debe ser al menos 1.");
      return;
    }
    if (tipoEntrega === "domicilio" && !direccion.trim()) {
      setError("Escribe la dirección de entrega.");
      return;
    }

    setSaving(true);
    const payload = {
      cliente: cliente.trim(),
      telefono: telefono.trim() || null,
      producto_id: productoId,
      cantidad: cantidadNum,
      tipo_entrega: tipoEntrega,
      direccion: tipoEntrega === "domicilio" ? direccion.trim() : null,
      notas: notas.trim() || null,
      precio_unitario_snapshot: snapshotPrecio,
      costo_unitario_snapshot: snapshotCosto,
    };

    const { error } = editando
      ? await supabase.from("pedidos").update(payload).eq("id", pedido!.id)
      : await supabase.from("pedidos").insert({ ...payload, estado: "nuevo" });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Sheet title={editando ? "Editar pedido" : "Nuevo pedido"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Cliente" htmlFor="cliente">
          <Input
            id="cliente"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Nombre del cliente"
            required
            autoFocus
          />
        </Field>

        <Field label="Teléfono (opcional)" htmlFor="telefono">
          <Input
            id="telefono"
            type="tel"
            value={telefono ?? ""}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej. 300 123 4567"
          />
        </Field>

        <Field label="Producto" htmlFor="producto">
          <Select
            id="producto"
            value={productoId}
            onChange={(e) => handleProductoChange(e.target.value)}
            required
          >
            {productos.length === 0 && <option value="">No hay productos en inventario</option>}
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} — {formatCOP(p.precio_venta)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Cantidad" htmlFor="cantidad">
          <Input
            id="cantidad"
            type="number"
            min={1}
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            required
          />
        </Field>
        {excedeStock && (
          <p className="-mt-3 text-xs font-medium text-alert">
            Solo quedan {productoSeleccionado?.stock} unidades en inventario. Puedes seguir, pero
            no podrás marcarlo &quot;Entregado&quot; sin stock suficiente.
          </p>
        )}

        <Field label="Entrega" htmlFor="entrega">
          <ToggleGroup
            name="Tipo de entrega"
            value={tipoEntrega}
            onChange={setTipoEntrega}
            options={[
              { value: "recoge", label: "Recoge en casa" },
              { value: "domicilio", label: "Domicilio" },
            ]}
          />
        </Field>

        {tipoEntrega === "domicilio" && (
          <Field label="Dirección de entrega" htmlFor="direccion">
            <Textarea
              id="direccion"
              value={direccion ?? ""}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle, número, barrio, ciudad"
              required
            />
          </Field>
        )}

        <Field label="Notas (opcional)" htmlFor="notas">
          <Textarea
            id="notas"
            value={notas ?? ""}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Cualquier detalle extra del pedido"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3 rounded-md border border-line bg-accent-soft/40 px-4 py-3">
          <div>
            <p className="text-xs text-ink-muted">Total</p>
            <p className="font-display text-xl text-accent-strong">{formatCOP(total)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Ganancia</p>
            <p
              className={`font-display text-xl ${ganancia < 0 ? "text-alert" : "text-settled"}`}
            >
              {formatCOP(ganancia)}
            </p>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-alert">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving || productos.length === 0} className="flex-1">
            {saving ? "Guardando…" : editando ? "Guardar cambios" : "Crear pedido"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
