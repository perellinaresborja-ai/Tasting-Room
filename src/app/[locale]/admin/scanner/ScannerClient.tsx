/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { processScan, validateAccess, searchReservations } from '@/app/actions/scanner';

type Props = {
  tastings: Tasting[];
};

type Tasting = {
  id: string;
  title_es: string;
  date: string;
};

type Reservation = {
  id: string;
  tickets: number;
  totalTickets: number;
  usedTickets: number;
  availableTickets: number;
  isFullyCheckedIn: boolean;
  status: string;
  payment_status: string;
  reservation_type: string;
  check_in_time?: string | null;
  checkinLogs?: Array<{
    id: string;
    tickets: number;
    created_at: string;
    staff?: { first_name?: string; last_name?: string } | null;
  }>;
};

type Profile = {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
};

export default function ScannerClient({ tastings }: Props) {
  const [selectedTastingId, setSelectedTastingId] = useState<string>(tastings[0]?.id || '');
  const [scanResult, setScanResult] = useState<any>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string>('');
  const [ticketsToValidate, setTicketsToValidate] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);

  function extractToken(rawValue: string) {
    const parts = rawValue.split('/q/');
    if (parts.length > 1) return parts[1];
    return rawValue.trim();
  }

  async function handleScan(token: string) {
    setLoading(true);
    setValidationSuccess(null);
    const data = await processScan(token, selectedTastingId);
    setScanResult(data);

    // Default to the reservation that has available spots
    if (data?.reservations && data.reservations.length > 0) {
      const activeRes = data.reservations.find((r: Reservation) => r.availableTickets > 0) || data.reservations[0];
      setSelectedReservationId(activeRes.id);
      setTicketsToValidate(Math.max(1, activeRes.availableTickets || 1));
    } else if (data?.reservation) {
      setSelectedReservationId(data.reservation.id);
      setTicketsToValidate(Math.max(1, data.reservation.availableTickets || 1));
    }

    setLoading(false);
  }

  async function onScan(result: any) {
    if (loading || scanResult || !result || !result[0]) return;
    const rawValue = result[0].rawValue;
    if (!rawValue) return;
    const token = extractToken(rawValue);
    await handleScan(token);
  }

  function resumeScanner() {
    setScanResult(null);
    setValidationSuccess(null);
  }

  // Active reservation currently selected for validation
  const currentReservation: Reservation | undefined = scanResult?.reservations?.find(
    (r: Reservation) => r.id === selectedReservationId
  ) || scanResult?.reservation;

  async function handleValidate() {
    if (!currentReservation) return;
    setLoading(true);
    setValidationSuccess(null);

    const qty = Math.min(ticketsToValidate, currentReservation.availableTickets);
    const res = await validateAccess(currentReservation.id, qty);

    if (res.success) {
      setValidationSuccess(
        `✓ ${res.ticketsValidated} plaza(s) validada(s) correctamente. Restan ${res.remaining} por entrar.`
      );

      // Refresh scan data to show updated used/remaining
      if (scanResult?.profile) {
        // Update state locally
        setScanResult((prev: any) => {
          if (!prev) return prev;
          const updatedReservations = (prev.reservations || []).map((r: Reservation) => {
            if (r.id === currentReservation.id) {
              const newUsed = r.usedTickets + qty;
              const newAvailable = Math.max(0, r.totalTickets - newUsed);
              return {
                ...r,
                usedTickets: newUsed,
                availableTickets: newAvailable,
                isFullyCheckedIn: newAvailable === 0,
                check_in_time: res.checkInTime,
                checkinLogs: [
                  {
                    id: Math.random().toString(),
                    tickets: qty,
                    created_at: res.checkInTime,
                    staff: { first_name: 'Staff', last_name: '' }
                  },
                  ...(r.checkinLogs || [])
                ]
              };
            }
            return r;
          });

          const anyRemaining = updatedReservations.some((r: Reservation) => r.availableTickets > 0);

          return {
            ...prev,
            status: anyRemaining ? 'VÁLIDO' : 'YA VALIDADO',
            reservations: updatedReservations,
            checkInTime: res.checkInTime
          };
        });

        // Update ticket quantity input for next scan
        const newRemaining = currentReservation.availableTickets - qty;
        setTicketsToValidate(Math.max(1, newRemaining));
      }
    } else {
      alert(res.error || "Error al validar acceso.");
    }
    setLoading(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    const results = await searchReservations(query, selectedTastingId);
    setSearchResults(results);
    setLoading(false);
  }

  function selectManualResult(res: any) {
    const customer = res.customer || res.profile;
    const totalTickets = Number(res.tickets) || 0;
    const usedTickets = typeof res.checked_in_tickets === 'number'
      ? res.checked_in_tickets
      : (res.check_in_time ? totalTickets : 0);
    const availableTickets = Math.max(0, totalTickets - usedTickets);

    let status = 'VÁLIDO';
    if (res.status === 'CANCELLED' || res.status === 'REJECTED' || res.payment_status === 'FAILED') status = 'RESERVA CANCELADA';
    else if (res.reservation_type === 'INVITATION' && res.status === 'PENDING') status = 'INVITACIÓN PENDIENTE';
    else if (res.reservation_type !== 'INVITATION' && res.payment_status !== 'PAID' && res.payment_status !== 'NOT_REQUIRED') status = 'PAGO PENDIENTE';
    else if (availableTickets === 0) status = 'YA VALIDADO';

    const enrichedRes = {
      ...res,
      totalTickets,
      usedTickets,
      availableTickets,
      isFullyCheckedIn: availableTickets === 0
    };

    setScanResult({
      status,
      reservations: [enrichedRes],
      reservation: enrichedRes,
      profile: customer,
      customer,
      checkInTime: res.check_in_time
    });

    setSelectedReservationId(res.id);
    setTicketsToValidate(Math.max(1, availableTickets || 1));
    setSearchResults([]);
    setQuery('');
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* SECCIÓN SUPERIOR: SELECCIÓN Y BÚSQUEDA */}
      <div className="flex flex-col gap-6 bg-[#0a0a0a] border border-[var(--color-charcoal)] p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-grow">
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">1. Cata Seleccionada</label>
            <select 
              className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white focus:border-[var(--color-gold)] outline-none"
              value={selectedTastingId}
              onChange={e => {
                setSelectedTastingId(e.target.value);
                setScanResult(null);
                setValidationSuccess(null);
              }}
            >
              {tastings.map(t => (
                <option key={t.id} value={t.id}>{t.title_es} ({new Date(t.date).toLocaleDateString()})</option>
              ))}
            </select>
          </div>
          {selectedTastingId && (
            <div className="flex items-end">
              <a 
                href={`/es/admin/tastings/${selectedTastingId}/attendees`}
                target="_blank"
                className="w-full md:w-auto text-center shrink-0 bg-[var(--color-gold)] text-black font-bold uppercase tracking-widest text-xs px-6 py-4 hover:bg-[var(--color-gold-hover)] transition-colors"
              >
                Ver Asistentes en Vivo
              </a>
            </div>
          )}
        </div>

        {/* Búsqueda Manual */}
        <div className="relative">
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">2. Búsqueda Manual por Nombre / Email</label>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Buscar por email, nombre..." 
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white outline-none focus:border-[var(--color-gold)]"
            />
            <button type="submit" className="shrink-0 bg-gray-800 hover:bg-gray-700 transition-colors text-white px-6 py-4 uppercase text-xs tracking-widest font-bold">
              Buscar
            </button>
          </form>
          
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 border border-[var(--color-charcoal)] bg-[#111] max-h-60 overflow-y-auto shadow-2xl">
              {searchResults.map(res => (
                <div 
                  key={res.id} 
                  onClick={() => selectManualResult(res)} 
                  className="p-4 border-b border-[var(--color-charcoal)] hover:bg-[#1a1a1a] cursor-pointer flex justify-between items-center"
                >
                  <div className="flex-grow pr-4">
                    <p className="text-white text-sm font-bold">{res.customer?.first_name} {res.customer?.last_name}</p>
                    <p className="text-xs text-gray-400 break-all">{res.customer?.email}</p>
                  </div>
                  <span className="text-[var(--color-gold)] text-sm whitespace-nowrap shrink-0 bg-black/50 px-3 py-1 border border-[var(--color-charcoal)]">
                    {res.availableTickets}/{res.totalTickets} plazas libres
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL: ESCÁNER Y FICHA DE RESULTADOS (2 COLUMNAS EN DESKTOP) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* COLUMNA 1: CÁMARA ESCÁNER */}
        <div className="border border-[var(--color-charcoal)] bg-black overflow-hidden relative flex flex-col min-h-[420px] lg:min-h-[520px]">
          <div className="p-4 bg-[#111] border-b border-[var(--color-charcoal)] flex justify-between items-center text-xs uppercase tracking-widest text-gray-400">
            <span>Cámara del Escáner</span>
            {scanResult && <span className="text-yellow-500 font-bold">Pausado</span>}
          </div>
          
          <div className="relative flex-grow flex items-center justify-center min-h-[360px]">
            {!scanResult ? (
              <Scanner 
                onScan={onScan}
                styles={{ container: { width: '100%', height: '100%' } }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-10 backdrop-blur-xs p-6 text-center">
                <p className="text-white font-bold tracking-widest uppercase mb-4">Código Escaneado</p>
                <button 
                  onClick={resumeScanner}
                  className="bg-[var(--color-gold)] text-black px-6 py-3 uppercase tracking-widest text-xs font-bold hover:bg-white transition-colors"
                >
                  Escanear Siguiente QR
                </button>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 2: FICHA DE CONTROL DE ACCESO */}
        <div className="border border-[var(--color-charcoal)] bg-[#0a0a0a] p-6 md:p-8 flex flex-col min-h-[420px]">
          {scanResult ? (
            <div className="space-y-6">
              
              {/* Header Status */}
              <div className="text-center pb-6 border-b border-[var(--color-charcoal)]">
                {scanResult.status === 'VÁLIDO' && (
                  <div className="text-3xl md:text-4xl text-green-500 font-bold tracking-wider">ACCESO VÁLIDO</div>
                )}
                {scanResult.status === 'YA VALIDADO' && (
                  <div className="text-3xl text-yellow-500 font-bold tracking-wider">PLAZAS COMPLETADAS</div>
                )}
                {scanResult.status === 'SIN RESERVA' && (
                  <div className="text-3xl text-red-500 font-bold tracking-wider">SIN RESERVA</div>
                )}
                {scanResult.status === 'RESERVA CANCELADA' && (
                  <div className="text-3xl text-red-500 font-bold tracking-wider">RESERVA CANCELADA</div>
                )}
                {scanResult.status === 'PAGO PENDIENTE' && (
                  <div className="text-3xl text-orange-500 font-bold tracking-wider">PAGO PENDIENTE</div>
                )}
                {scanResult.status === 'QR NO VÁLIDO' && (
                  <div className="text-3xl text-red-500 font-bold tracking-wider">QR NO VÁLIDO</div>
                )}
                
                {scanResult.message && (
                  <p className="text-gray-400 text-sm mt-2">{scanResult.message}</p>
                )}
              </div>

              {/* Mensaje de éxito tras validar */}
              {validationSuccess && (
                <div className="p-4 bg-green-950/60 border border-green-700 text-green-300 text-sm text-center">
                  {validationSuccess}
                </div>
              )}

              {/* Datos del Cliente */}
              {scanResult.profile && (
                <div className="bg-[#111] p-4 border border-[var(--color-charcoal)]">
                  <p className="text-xs uppercase text-gray-500 tracking-widest mb-1">Cliente</p>
                  <p className="text-xl text-white font-serif">
                    {scanResult.profile.first_name} {scanResult.profile.last_name || ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{scanResult.profile.email} • {scanResult.profile.phone || 'Sin tel.'}</p>
                </div>
              )}

              {/* Si hay múltiples reservas para este cliente en esta cata */}
              {scanResult.reservations && scanResult.reservations.length > 1 && (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[var(--color-gold)] mb-2 font-bold">
                    El cliente tiene {scanResult.reservations.length} reservas para esta cata:
                  </label>
                  <div className="flex flex-col gap-2">
                    {scanResult.reservations.map((r: Reservation, idx: number) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSelectedReservationId(r.id);
                          setTicketsToValidate(Math.max(1, r.availableTickets || 1));
                        }}
                        className={`p-3 text-left border text-xs flex justify-between items-center transition-colors ${
                          selectedReservationId === r.id 
                            ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-white' 
                            : 'border-[var(--color-charcoal)] bg-black text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="font-bold">Reserva #{idx + 1} ({r.totalTickets} plazas)</span>
                        <span className={r.availableTickets > 0 ? 'text-green-400' : 'text-gray-500'}>
                          {r.availableTickets} disponibles ({r.usedTickets} usadas)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Desglose de Plazas de la Reserva Activa */}
              {currentReservation && (
                <div className="space-y-4">
                  
                  {/* Tarjetas de Control de Plazas */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-black p-3 border border-[var(--color-charcoal)]">
                      <p className="text-[10px] uppercase text-gray-500 tracking-wider mb-1">Compradas</p>
                      <p className="text-2xl font-serif text-white">{currentReservation.totalTickets}</p>
                    </div>
                    <div className="bg-black p-3 border border-[var(--color-charcoal)]">
                      <p className="text-[10px] uppercase text-gray-500 tracking-wider mb-1">Ya Entradas</p>
                      <p className="text-2xl font-serif text-yellow-500">{currentReservation.usedTickets}</p>
                    </div>
                    <div className="bg-black p-3 border border-[var(--color-charcoal)]">
                      <p className="text-[10px] uppercase text-gray-500 tracking-wider mb-1">Disponibles</p>
                      <p className={`text-2xl font-serif ${currentReservation.availableTickets > 0 ? 'text-green-400 font-bold' : 'text-gray-500'}`}>
                        {currentReservation.availableTickets}
                      </p>
                    </div>
                  </div>

                  {/* Estado de Pago */}
                  <div className="flex justify-between items-center text-xs py-2 px-3 bg-[#111] border border-[var(--color-charcoal)]">
                    <span className="text-gray-400 uppercase tracking-widest">Estado de Pago:</span>
                    <span className={`font-bold ${currentReservation.payment_status === 'PAID' ? 'text-green-400' : 'text-orange-400'}`}>
                      {currentReservation.payment_status === 'PAID' ? 'PAGADO ✓' : currentReservation.payment_status}
                    </span>
                  </div>

                  {/* Selector de Plazas que entran ahora */}
                  {currentReservation.availableTickets > 0 && scanResult.status === 'VÁLIDO' && (
                    <div className="bg-[#141414] p-4 border border-[var(--color-charcoal)] space-y-3">
                      <label className="block text-xs uppercase tracking-widest text-[var(--color-gold)] font-bold">
                        ¿Cuántas personas entran en este momento?
                      </label>
                      <div className="flex items-center gap-3">
                        <select 
                          value={ticketsToValidate}
                          onChange={(e) => setTicketsToValidate(Number(e.target.value))}
                          className="flex-1 bg-black border border-[var(--color-charcoal)] p-3 text-lg font-bold text-white focus:border-[var(--color-gold)] outline-none"
                        >
                          {Array.from({ length: currentReservation.availableTickets }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? 'persona' : 'personas'} {n === currentReservation.availableTickets ? '(todas las restantes)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button 
                        type="button"
                        onClick={handleValidate}
                        disabled={loading || ticketsToValidate <= 0}
                        className="w-full bg-[var(--color-gold)] text-black py-4 text-base uppercase tracking-widest font-bold hover:bg-white transition-all shadow-lg cursor-pointer disabled:opacity-50"
                      >
                        {loading ? 'Validando...' : `[ VALIDAR ${ticketsToValidate} PLAZA${ticketsToValidate > 1 ? 'S' : ''} ]`}
                      </button>
                    </div>
                  )}

                  {/* Historial de entradas registradas para esta reserva */}
                  {currentReservation.checkinLogs && currentReservation.checkinLogs.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[10px] uppercase text-gray-500 tracking-widest mb-2">Historial de entradas registradas:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {currentReservation.checkinLogs.map((log: any, i: number) => (
                          <div key={log.id || i} className="text-xs text-gray-400 bg-black/60 p-2 border border-[var(--color-charcoal)] flex justify-between">
                            <span>🕒 {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — <strong>{log.tickets} plaza(s)</strong></span>
                            <span className="text-gray-500">{log.staff?.first_name ? `Staff: ${log.staff.first_name}` : 'Staff'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botón para volver al lector */}
              <div className="pt-4 border-t border-[var(--color-charcoal)]">
                <button 
                  type="button"
                  onClick={resumeScanner}
                  className="w-full border border-[var(--color-charcoal)] text-gray-400 hover:text-white px-6 py-3 uppercase text-xs tracking-widest hover:border-gray-500 transition-colors"
                >
                  Continuar Escaneando
                </button>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500">
              <span className="text-4xl mb-4 opacity-40">📷</span>
              <p className="uppercase tracking-widest text-sm text-gray-400 mb-2">Esperando lectura</p>
              <p className="text-xs text-gray-600 max-w-xs">
                Apunta la cámara al código QR permanente del cliente o búscalo por nombre arriba.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
