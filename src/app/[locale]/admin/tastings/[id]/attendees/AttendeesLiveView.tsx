"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type Props = {
  tastingId: string;
  tastingTitle: string;
};

type Reservation = {
  id: string;
  tickets: number;
  payment_status: string;
  status: string;
  check_in_time: string | null;
  customer: {
    first_name: string;
    last_name: string;
    phone: string | null;
  };
};

export default function AttendeesLiveView({ tastingId, tastingTitle }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'ARRIVED' | 'ALL'>('PENDING');
  
  const supabase = createClient();

  // Function to load data
  async function loadData() {
    const { data } = await supabase
      .from('reservations')
      .select('id, tickets, payment_status, status, check_in_time, customer:customers(first_name, last_name, phone)')
      .eq('tasting_id', tastingId)
      .in('status', ['CONFIRMED', 'PENDING']) // Exclude CANCELLED
      .not('payment_status', 'in', '("FAILED", "REFUNDED")'); // Only valid payments (mostly PAID)
      
    if (data) {
      // Sort alphabetically by first_name
      const sorted = (data as unknown[]).sort((a, b) => {
        const nameA = a.customer?.first_name || '';
        const nameB = b.customer?.first_name || '';
        return nameA.localeCompare(nameB);
      });
      setReservations(sorted);
      setReservations(sorted as Reservation[]);
    }
    setLoading(false);
  }

  // Polling every 3 seconds for robust real-time updates without WebSockets
  useEffect(() => {
    let active = true;
    const fetchIt = async () => {
      if (active) await loadData();
    };
    fetchIt();
    const interval = setInterval(fetchIt, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tastingId]);

  // Calculations
  // Only PAID count as valid spots. If they are PENDING and haven't paid, they are technically not confirmed attendees, 
  // but to avoid edge cases, we assume 'PAID' is the strict source of truth for the counter.
  const validReservations = reservations.filter(r => r.payment_status === 'PAID');
  
  const totalSpots = validReservations.reduce((sum, r) => sum + r.tickets, 0);
  const arrivedSpots = validReservations.filter(r => r.check_in_time).reduce((sum, r) => sum + r.tickets, 0);
  const pendingSpots = totalSpots - arrivedSpots;
  
  const isComplete = totalSpots > 0 && pendingSpots === 0;

  // Filtered List
  const filteredList = validReservations.filter(r => {
    if (filter === 'PENDING') return !r.check_in_time;
    if (filter === 'ARRIVED') return !!r.check_in_time;
    return true;
  });

  if (loading) {
    return <div className="p-8 text-center text-gray-500 uppercase tracking-widest text-sm">Cargando asistentes...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl font-serif text-[var(--color-gold)] uppercase tracking-widest">{tastingTitle}</h1>
        <Link href={`/es/admin/scanner`} className="text-xs uppercase tracking-widest text-gray-400 hover:text-white border border-[var(--color-charcoal)] px-3 py-2">
          Ir al Scanner
        </Link>
      </div>

      {/* CONTADOR PRINCIPAL */}
      <div className={`border-4 p-8 text-center transition-colors ${isComplete ? 'border-green-500 bg-green-500/10' : 'border-[var(--color-charcoal)] bg-black'}`}>
        {isComplete ? (
          <div>
            <h2 className="text-3xl font-bold text-green-500 mb-2">CATA COMPLETA</h2>
            <p className="text-gray-400 uppercase tracking-widest text-sm">Todos los asistentes ({totalSpots}) han llegado</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">FALTAN POR LLEGAR</p>
              <p className="text-6xl font-bold text-white">{pendingSpots}</p>
            </div>
            <div className="flex justify-center gap-8 border-t border-[var(--color-charcoal)] pt-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest">AFORO</p>
                <p className="text-xl font-bold text-gray-300">{totalSpots}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest">HAN ENTRADO</p>
                <p className="text-xl font-bold text-[var(--color-gold)]">{arrivedSpots}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FILTROS */}
      <div className="flex gap-2 bg-[#111] p-1 border border-[var(--color-charcoal)]">
        <button 
          onClick={() => setFilter('PENDING')}
          className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold transition-colors ${filter === 'PENDING' ? 'bg-[var(--color-gold)] text-black' : 'text-gray-400 hover:text-white'}`}
        >
          Pendientes
        </button>
        <button 
          onClick={() => setFilter('ARRIVED')}
          className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold transition-colors ${filter === 'ARRIVED' ? 'bg-[var(--color-gold)] text-black' : 'text-gray-400 hover:text-white'}`}
        >
          Han Llegado
        </button>
        <button 
          onClick={() => setFilter('ALL')}
          className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold transition-colors ${filter === 'ALL' ? 'bg-[var(--color-gold)] text-black' : 'text-gray-400 hover:text-white'}`}
        >
          Todos
        </button>
      </div>

      {/* LISTA */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="text-center p-8 border border-[var(--color-charcoal)] bg-black text-gray-500 uppercase tracking-widest text-sm">
            No hay asistentes en esta lista
          </div>
        ) : (
          filteredList.map(res => (
            <div key={res.id} className="border border-[var(--color-charcoal)] bg-black p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-white mb-1 uppercase tracking-wider">{res.customer.first_name} {res.customer.last_name}</p>
                {res.customer.phone ? (
                  <a href={`tel:${res.customer.phone}`} className="text-blue-400 text-sm hover:underline">{res.customer.phone}</a>
                ) : (
                  <p className="text-gray-600 text-sm">Sin teléfono</p>
                )}
                
                {res.check_in_time && (
                  <p className="text-green-500 text-xs mt-2 uppercase tracking-widest">
                    Llegada: {new Date(res.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xl font-serif text-[var(--color-gold)] mb-1">{res.tickets} <span className="text-sm">plazas</span></p>
                <p className="text-[10px] uppercase tracking-widest text-green-500">PAGADO</p>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
