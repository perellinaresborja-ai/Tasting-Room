/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  reservation_type: string;
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
  const [filter, setFilter] = useState<'PENDING' | 'ARRIVED' | 'ALL' | 'INTERESTED'>('PENDING');
  
  const supabase = React.useMemo(() => createClient(), []);

  // Function to load data
  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from('reservations')
      .select('id, tickets, payment_status, reservation_type, status, check_in_time, created_at, customer:profiles(first_name, last_name, phone, email)')
      .eq('tasting_id', tastingId)
      .not('payment_status', 'in', '("FAILED", "REFUNDED")'); // Only valid payments (mostly PAID)
      
    if (data) {
      // Sort alphabetically by first_name
      const sorted = (data).sort((a: Reservation, b: Reservation) => {
        const nameA = a.customer?.first_name?.toLowerCase() || '';
        const nameB = b.customer?.first_name?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });
      setReservations(sorted);
    }
    setLoading(false);
  }, [supabase, tastingId]);

  // Subscribe to changes in reservations for this tasting
  useEffect(() => {
    // eslint-disable-next-line
    loadData();
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations', filter: `tasting_id=eq.${tastingId}` }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, tastingId, loadData]);

  // Calculations
  // Only PAID or NOT_REQUIRED count as valid spots. 
  const validReservations = reservations.filter(r => r.status === 'CONFIRMED' && (r.payment_status === 'PAID' || r.payment_status === 'NOT_REQUIRED'));
  
  const totalSpots = validReservations.reduce((sum, r) => sum + r.tickets, 0);
  const arrivedSpots = validReservations.filter(r => r.check_in_time).reduce((sum, r) => sum + r.tickets, 0);
  const pendingSpots = totalSpots - arrivedSpots;
  
  const isComplete = totalSpots > 0 && pendingSpots === 0;

  // Filtered List
  const filteredList = reservations.filter(r => {
    if (filter === 'INTERESTED') {
      const isExpired = r.status === 'EXPIRED' || r.status === 'ABANDONED';
      const isOldPending = r.status === 'PENDING' && (new Date().getTime() - new Date(r.created_at).getTime()) > 15 * 60 * 1000;
      return isExpired || isOldPending || r.status === 'CANCELLED';
    }

    if (r.status !== 'CONFIRMED') return false;
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
      <div className="flex flex-wrap gap-2 bg-[#111] p-1 border border-[var(--color-charcoal)]">
        <button 
          onClick={() => setFilter('PENDING')}
          className={`flex-1 min-w-[80px] py-3 text-xs uppercase tracking-widest font-bold transition-colors ${filter === 'PENDING' ? 'bg-[var(--color-gold)] text-black' : 'text-gray-400 hover:text-white'}`}
        >
          Pendientes
        </button>
        <button 
          onClick={() => setFilter('ARRIVED')}
          className={`flex-1 min-w-[80px] py-3 text-xs uppercase tracking-widest font-bold transition-colors ${filter === 'ARRIVED' ? 'bg-[var(--color-gold)] text-black' : 'text-gray-400 hover:text-white'}`}
        >
          Han Llegado
        </button>
        <button 
          onClick={() => setFilter('INTERESTED')}
          className={`flex-1 min-w-[80px] py-3 text-xs uppercase tracking-widest font-bold transition-colors ${filter === 'INTERESTED' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Interesados
        </button>
        <button 
          onClick={() => setFilter('ALL')}
          className={`flex-1 min-w-[60px] py-3 text-xs uppercase tracking-widest font-bold transition-colors ${filter === 'ALL' ? 'bg-[var(--color-gold)] text-black' : 'text-gray-400 hover:text-white'}`}
        >
          Todos
        </button>
      </div>

      {/* LISTA */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="text-center p-8 border border-[var(--color-charcoal)] bg-black text-gray-500 uppercase tracking-widest text-sm">
            No hay asistentes en esta categoría
          </div>
        ) : (
          filteredList.map(res => (
            <div key={res.id} className="border border-[var(--color-charcoal)] bg-black p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-white mb-1 uppercase tracking-wider">{res.customer?.first_name} {res.customer?.last_name}</p>
                  
                  {/* Additional info for INTERESTED or ALL */}
                  {(filter === 'INTERESTED' || filter === 'ALL') && (
                    <div className="mb-2">
                      <p className="text-gray-400 text-sm">{res.customer?.email}</p>
                      {res.customer?.phone && <a href={`tel:${res.customer.phone}`} className="text-blue-400 text-sm hover:underline">{res.customer.phone}</a>}
                    </div>
                  )}

                  {res.check_in_time && (
                    <p className="text-green-500 text-xs uppercase tracking-widest mt-1">
                      Llegada: {new Date(res.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  )}
                  {filter === 'INTERESTED' && (
                    <p className="text-orange-400 text-xs mt-1 uppercase tracking-widest">
                      Iniciada: {new Date(res.created_at).toLocaleString([], {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'})}
                    </p>
                  )}
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[var(--color-gold)] font-bold text-lg">{res.tickets} {res.tickets > 1 ? 'plazas' : 'plaza'}</span>
                  <span className={`text-[10px] uppercase tracking-widest font-bold mt-1 px-2 py-1 ${
                    res.reservation_type === 'INVITATION' ? 'bg-blue-900/30 text-blue-400' :
                    res.status === 'CONFIRMED' ? 'bg-green-900/30 text-green-400' : 
                    'bg-orange-900/30 text-orange-400'
                  }`}>
                    {res.reservation_type === 'INVITATION' ? 'INVITACIÓN' : res.status === 'CONFIRMED' ? 'PAGADO ✓' : 'ABANDONADO'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
