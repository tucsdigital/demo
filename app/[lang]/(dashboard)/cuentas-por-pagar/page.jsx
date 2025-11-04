"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Filter, TrendingDown, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const formatFechaSegura = (fecha) => {
  if (!fecha) return "";
  try {
    if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
    if (fecha && typeof fecha === "object" && fecha.toDate) {
      return fecha.toDate().toISOString().split("T")[0];
    }
    const dateObj = new Date(fecha);
    if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split("T")[0];
    return "";
  } catch (error) {
    return "";
  }
};

const CuentasPorPagarPage = () => {
  const [cuentas, setCuentas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        
        // Cargar proveedores
        const proveedoresSnap = await getDocs(collection(db, "proveedores"));
        setProveedores(proveedoresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Cargar solo gastos de tipo proveedor
        const gastosSnap = await getDocs(collection(db, "gastos"));
        const cuentasData = gastosSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(g => g.tipo === "proveedor")
          .map(c => ({
            ...c,
            fecha: formatFechaSegura(c.fecha),
            fechaVencimiento: formatFechaSegura(c.fechaVencimiento),
          }));
        
        setCuentas(cuentasData.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Agrupar por proveedor
  const cuentasPorProveedor = useMemo(() => {
    const grupos = {};
    
    cuentas.forEach(cuenta => {
      const provId = cuenta.proveedorId;
      if (!grupos[provId]) {
        grupos[provId] = {
          proveedor: cuenta.proveedor,
          cuentas: [],
          total: 0,
          pagado: 0,
          pendiente: 0,
        };
      }
      
      grupos[provId].cuentas.push(cuenta);
      grupos[provId].total += Number(cuenta.monto) || 0;
      grupos[provId].pagado += Number(cuenta.montoPagado) || 0;
    });
    
    Object.keys(grupos).forEach(provId => {
      grupos[provId].pendiente = grupos[provId].total - grupos[provId].pagado;
    });
    
    return Object.values(grupos).sort((a, b) => b.pendiente - a.pendiente);
  }, [cuentas]);

  // Filtrar
  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter(c => {
      const matchProveedor = !filtroProveedor || 
        (c.proveedor?.nombre || "").toLowerCase().includes(filtroProveedor.toLowerCase());
      const matchEstado = !filtroEstado || c.estadoPago === filtroEstado;
      return matchProveedor && matchEstado;
    });
  }, [cuentas, filtroProveedor, filtroEstado]);

  // Calcular totales generales
  const totales = useMemo(() => {
    const total = cuentas.reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
    const pagado = cuentas.reduce((acc, c) => acc + (Number(c.montoPagado) || 0), 0);
    const pendiente = total - pagado;
    
    const vencidas = cuentas.filter(c => {
      const saldo = (Number(c.monto) || 0) - (Number(c.montoPagado) || 0);
      return c.fechaVencimiento && 
             new Date(c.fechaVencimiento) < new Date() && 
             saldo > 0;
    });
    
    const montoVencido = vencidas.reduce((acc, c) => 
      acc + ((Number(c.monto) || 0) - (Number(c.montoPagado) || 0)), 0
    );

    return { total, pagado, pendiente, vencidas: vencidas.length, montoVencido };
  }, [cuentas]);

  // Exportar reporte
  const exportarReporte = () => {
    const datos = cuentasFiltradas.map(c => ({
      Fecha: c.fecha,
      Proveedor: c.proveedor?.nombre || "",
      Concepto: c.concepto,
      "Nº Comprobante": c.numeroComprobante || "",
      Total: c.monto,
      Pagado: c.montoPagado || 0,
      Saldo: (Number(c.monto) || 0) - (Number(c.montoPagado) || 0),
      Vencimiento: c.fechaVencimiento || "",
      Estado: c.estadoPago === "pagado" ? "Pagado" : c.estadoPago === "parcial" ? "Pagado Parcial" : "Pendiente",
    }));

    const csv = [
      Object.keys(datos[0]).join(','),
      ...datos.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuentas-por-pagar_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="py-8 px-2 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-2 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FileText className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold mb-1">Cuentas por Pagar</h1>
            <p className="text-lg text-gray-500">Reporte de deudas con proveedores</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportarReporte} disabled={cuentasFiltradas.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar Reporte
        </Button>
      </div>

      {/* Dashboard resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Total Deuda</div>
                <div className="text-3xl font-bold text-blue-600">
                  ${totales.total.toLocaleString("es-AR")}
                </div>
              </div>
              <TrendingDown className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Total Pagado</div>
                <div className="text-3xl font-bold text-green-600">
                  ${totales.pagado.toLocaleString("es-AR")}
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Saldo Pendiente</div>
                <div className="text-3xl font-bold text-red-600">
                  ${totales.pendiente.toLocaleString("es-AR")}
                </div>
              </div>
              <Clock className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Deudas Vencidas</div>
                <div className="text-3xl font-bold text-orange-600">
                  ${totales.montoVencido.toLocaleString("es-AR")}
                </div>
                <div className="text-xs text-gray-400 mt-1">{totales.vencidas} cuentas</div>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen por proveedor */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Resumen por Proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cuentasPorProveedor.map((grupo, idx) => {
              const porcentajePagado = grupo.total > 0 ? (grupo.pagado / grupo.total) * 100 : 0;
              
              return (
                <Card key={idx} className="border-2">
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <div className="font-bold text-lg">{grupo.proveedor?.nombre || "Sin nombre"}</div>
                      <div className="text-xs text-gray-500">
                        {grupo.cuentas.length} cuenta{grupo.cuentas.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-semibold">${grupo.total.toLocaleString("es-AR")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pagado:</span>
                        <span className="font-semibold text-green-600">${grupo.pagado.toLocaleString("es-AR")}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600 font-semibold">Pendiente:</span>
                        <span className={`font-bold ${grupo.pendiente > 0 ? "text-red-600" : "text-gray-400"}`}>
                          ${grupo.pendiente.toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>
                    
                    {/* Barra de progreso */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all" 
                          style={{ width: `${porcentajePagado}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {porcentajePagado.toFixed(1)}% pagado
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabla detallada */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Detalle de Cuentas</CardTitle>
          <div className="flex gap-2">
            <Input 
              placeholder="Filtrar por proveedor..." 
              value={filtroProveedor} 
              onChange={e => setFiltroProveedor(e.target.value)} 
              className="w-56" 
            />
            <select
              className="px-3 py-2 border rounded-md text-sm"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="parcial">Pagado Parcial</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Nº Comprobante</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pagado</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Pagos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cuentasFiltradas.map(c => {
                const saldo = (Number(c.monto) || 0) - (Number(c.montoPagado) || 0);
                const vencido = c.fechaVencimiento && new Date(c.fechaVencimiento) < new Date() && saldo > 0;
                
                return (
                  <TableRow key={c.id} className={vencido ? "bg-red-50" : ""}>
                    <TableCell>{c.fecha}</TableCell>
                    <TableCell className="font-medium">{c.proveedor?.nombre || "-"}</TableCell>
                    <TableCell>{c.concepto}</TableCell>
                    <TableCell className="text-sm">{c.numeroComprobante || "-"}</TableCell>
                    <TableCell className="font-bold">${Number(c.monto).toLocaleString("es-AR")}</TableCell>
                    <TableCell className="text-green-600">${Number(c.montoPagado || 0).toLocaleString("es-AR")}</TableCell>
                    <TableCell className={`font-bold ${saldo > 0 ? "text-red-600" : "text-gray-400"}`}>
                      ${saldo.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className={vencido ? "text-red-600 font-semibold" : ""}>
                      {c.fechaVencimiento || "-"}
                      {vencido && <span className="block text-xs">¡VENCIDA!</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        c.estadoPago === "pagado" ? "bg-green-100 text-green-800" :
                        c.estadoPago === "parcial" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }>
                        {c.estadoPago === "pagado" ? "Pagado" : 
                         c.estadoPago === "parcial" ? "Parcial" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-gray-600">
                        {c.pagos && c.pagos.length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="hover:text-blue-600">{c.pagos.length} pago(s)</summary>
                            <div className="mt-2 space-y-1 bg-gray-50 p-2 rounded">
                              {c.pagos.map((pago, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span>{pago.fecha} - {pago.metodo}</span>
                                  <span className="font-semibold">${Number(pago.monto).toLocaleString("es-AR")}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : (
                          <span className="text-gray-400">Sin pagos</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CuentasPorPagarPage;

