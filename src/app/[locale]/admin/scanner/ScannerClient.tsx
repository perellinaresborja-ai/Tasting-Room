/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { processScan, validateAccess, searchReservations } from '@/app/actions/scanner';

type Props = {
  tastings: Tasting[];
};

type Reservation = { id: string; tickets: number; status: string; payment_status: string; reservation_type: string; check_in_time?: string | null; };
type Customer = { first_name: string; last_name: string; phone?: string; email?: string; };
type Tasting = { customer?: { first_name?: string; last_name?: string; }; tickets?: number; id: string; title_es: string; date: string; start_time: string; };
type ScanResult = { status: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'NOT_FOUND' | 'ERROR' | 'SIN RESERVA' | 'RESERVA CANCELADA' | 'INVITACIÓN PENDIENTE' | 'PAGO PENDIENTE' | 'YA VALIDADO' | 'VÁLIDO'; reservation?: Reservation; customer?: Customer; tasting?: Tasting; message?: string; checkInTime?: string | null; };
export default function ScannerClient({ tastings }: Props) {
  const [selectedTastingId, setSelectedTastingId] = useState<string>(tastings[0]?.id || '');
  const [scanResult, setScanResult] = useState<{status: string; checkInTime?: string; customer?: {first_name: string; last_name: string; phone?: string; email?: string}; reservation?: {id: string; tickets: number; status: string; payment_status: string; reservation_type: string; check_in_time?: string | null}} | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Tasting[]>([]);

  // We want to extract the UUID from the URL or fallback to raw string
  // Format: https://tastingroom.es/q/{uuid}
  function extractToken(rawValue: string) {
    const parts = rawValue.split('/q/');
    if (parts.length > 1) return parts[1];
    return rawValue; // fallback if they just scan the raw uuid somehow
  }

  async function onScan(result: string) {
    if (loading || scanResult || !result || !result[0]) return;
    
    setLoading(true);
    const rawValue = result[0].rawValue;
    const token = extractToken(rawValue);

    const data = await processScan(token, selectedTastingId);
    setScanResult(data);
    setLoading(false);
  }

  function resumeScanner() {
    setScanResult(null);
  }

  async function handleValidate(reservationId: string) {
    setLoading(true);
    const res = await validateAccess(reservationId);
    if (res.success) {
      setScanResult((prev: any) => ({ ...prev, status: 'YA VALIDADO', checkInTime: res.checkInTime }));
      // Return automatically to scanner after validation (optional, but requested: "volver inmediatamente")
      setTimeout(() => setScanResult(null), 2500);
    } else {
      alert("Error al validar.");
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

  function selectManualResult(reservation: Reservation, customer: Customer) {
    let status = 'VÁLIDO';
    if (reservation.status === 'CANCELLED' || reservation.status === 'REJECTED' || reservation.payment_status === 'FAILED') status = 'RESERVA CANCELADA';
    else if (reservation.reservation_type === 'INVITATION' && reservation.status === 'PENDING') status = 'INVITACIÓN PENDIENTE';
    else if (reservation.reservation_type !== 'INVITATION' && reservation.payment_status !== 'PAID' && reservation.payment_status !== 'NOT_REQUIRED') status = 'PAGO PENDIENTE';
    else if (reservation.check_in_time) status = 'YA VALIDADO';

    setScanResult({
      status,
      reservation,
      customer,
      checkInTime: reservation.check_in_time
    });
    setSearchResults([]);
    setQuery('');
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* SECCIÓN SUPERIOR: SELECCIÓN Y BÚSQUEDA (ANCHO COMPLETO) */}
      <div className="flex flex-col gap-6 bg-[#0a0a0a] border border-[var(--color-charcoal)] p-6">
        
        {/* Selector de Cata y Accesos Rápidos */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-grow">
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">1. Seleccionar Cata Activa</label>
            <select 
              className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white focus:border-[var(--color-gold)] outline-none truncate"
              value={selectedTastingId}
              onChange={e => setSelectedTastingId(e.target.value)}
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
                Ver asistentes
              </a>
            </div>
          )}
        </div>

        {/* Búsqueda Manual */}
        <div className="relative">
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">2. Búsqueda Manual (Opcional)</label>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Buscar por email, nombre..." 
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white outline-none"
            />
            <button type="submit" className="shrink-0 bg-gray-800 hover:bg-gray-700 transition-colors text-white px-6 py-4 uppercase text-xs tracking-widest">
              Buscar
            </button>
          </form>
          
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 border border-[var(--color-charcoal)] bg-[#111] max-h-60 overflow-y-auto shadow-2xl">
              {searchResults.map(res => (
                <div key={res.id} onClick={() => selectManualResult(res as unknown as Reservation, (res as unknown as {customer: Customer}).customer)} className="p-4 border-b border-[var(--color-charcoal)] hover:bg-[#1a1a1a] cursor-pointer flex justify-between items-center">
                  <div className="flex-grow pr-4">
                    <p className="text-white text-sm font-bold">{res.customer.first_name} {res.customer.last_name}</p>
                    <p className="text-xs text-gray-400 break-all">{res.customer.email}</p>
                  </div>
                  <span className="text-[var(--color-gold)] text-sm whitespace-nowrap shrink-0 bg-black/50 px-3 py-1 border border-[var(--color-charcoal)]">{res.tickets} plazas</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN INFERIOR: ESCÁNER Y FICHA DE RESULTADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* SCANNER EN VIVO */}
        <div className="border-4 border-[var(--color-charcoal)] bg-black overflow-hidden relative flex flex-col h-[500px]">
          <div className="p-4 bg-[#111] border-b border-[var(--color-charcoal)] text-center text-xs uppercase tracking-widest text-gray-400">
            Cámara del Escáner
          </div>
          {!scanResult ? (
            <Scanner 
              onScan={(codes) => { if(codes.length > 0) onScan(codes[0].rawValue); }}
              styles={{ container: { width: '100%', height: '100%' } }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 backdrop-blur-sm">
              <p className="text-white font-bold tracking-widest uppercase">Escaneo en pausa</p>
            </div>
          )}
        </div>
      </div>

      {/* RESULTS DISPLAY - LA FICHA MUY CLARA */}
      <div>
        {scanResult ? (
          <div className="border border-[var(--color-charcoal)] bg-[#0a0a0a] p-8 h-full flex flex-col">
            
            <div className="text-center mb-8 pb-6 border-b border-[var(--color-charcoal)]">
              {scanResult.status === 'VÁLIDO' && <div className="text-4xl text-green-500 mb-2 font-bold">VÁLIDO</div>}
              {scanResult.status === 'YA VALIDADO' && <div className="text-4xl text-yellow-500 mb-2 font-bold">ACCESO YA VALIDADO</div>}
              {scanResult.status === 'SIN RESERVA' && <div className="text-4xl text-red-500 mb-2 font-bold">SIN RESERVA</div>}
              {scanResult.status === 'RESERVA CANCELADA' && <div className="text-4xl text-red-500 mb-2 font-bold">CANCELADA</div>}
              {scanResult.status === 'PAGO PENDIENTE' && <div className="text-4xl text-orange-500 mb-2 font-bold">PAGO PENDIENTE / NO PAGADO</div>}
              {scanResult.status === 'QR NO VÁLIDO' && <div className="text-4xl text-red-500 mb-2 font-bold">QR NO VÁLIDO</div>}
              
              {scanResult.checkInTime && (
                <p className="text-gray-400 text-sm">Hora: {new Date(scanResult.checkInTime).toLocaleTimeString()}</p>
              )}
            </div>

            {scanResult.customer && (
              <div className="space-y-6 flex-grow">
                <div>
                  <p className="text-xs uppercase text-gray-500 tracking-widest mb-1">NOMBRE</p>
                  <p className="text-2xl text-white font-serif">{scanResult.customer.first_name} {scanResult.customer.last_name}</p>
                </div>

                {scanResult.reservation && (
                  <>
                    <div>
                      <p className="text-xs uppercase text-gray-500 tracking-widest mb-1">PLAZAS</p>
                      <p className="text-2xl text-[var(--color-gold)] font-serif">{scanResult.reservation.tickets}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 tracking-widest mb-1">PAGO</p>
                      <p className={`text-lg font-bold ${scanResult.reservation.payment_status === 'PAID' ? 'text-green-500' : scanResult.reservation.payment_status === 'NOT_REQUIRED' ? 'text-gray-400' : 'text-orange-500'}`}>
                        {scanResult.reservation.payment_status === 'PAID' ? 'PAGADO ✓' : scanResult.reservation.payment_status === 'NOT_REQUIRED' ? 'NO REQUERIDO' : 'PENDIENTE'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 tracking-widest mb-1">
                        {scanResult.reservation.reservation_type === 'INVITATION' ? 'TIPO' : 'RESERVA'}
                      </p>
                      <p className={`text-lg font-bold ${scanResult.reservation.status === 'CONFIRMED' ? 'text-green-500' : 'text-gray-400'}`}>
                        {scanResult.reservation.reservation_type === 'INVITATION' ? 'INVITACIÓN' : scanResult.reservation.status}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mt-8">
              {scanResult.status === 'VÁLIDO' && (
                <button 
                  onClick={() => handleValidate(scanResult.reservation?.id)}
                  disabled={loading}
                  className="w-full bg-[var(--color-gold)] text-black py-5 text-xl uppercase tracking-widest font-bold hover:bg-[var(--color-gold-hover)] mb-4"
                >
                  {loading ? 'Validando...' : '[ VALIDAR ACCESO ]'}
                </button>
              )}

              <button 
                onClick={resumeScanner}
                className="w-full border border-[var(--color-charcoal)] text-gray-400 px-6 py-4 uppercase text-xs tracking-widest hover:text-white"
              >
                Volver al Lector
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-[var(--color-charcoal)] bg-[#0a0a0a] p-8 h-full flex items-center justify-center text-center">
            <p className="text-gray-500 uppercase tracking-widest">Esperando QR...<br/>Enfoca el código en la cámara</p>
          </div>
        )}
      </div>
    </div>
  );
}
