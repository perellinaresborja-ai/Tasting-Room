/**
 * Centralized utility for Europe/Madrid timezone and tasting classification
 * 
 * Rules:
 * 1. Future or in-progress tastings -> UPCOMING (Próximas Experiencias)
 * 2. Finished tastings -> PAST (Recuerdos / Memories)
 * 3. DRAFT or CANCELLED -> NONE (neither section)
 * 4. A tasting can NEVER appear in both sections simultaneously.
 * 5. Uses Europe/Madrid date & time without inventing arbitrary durations.
 * 6. If an older tasting lacks end_time, it remains UPCOMING during the event date
 *    and moves to PAST at the start of the next day (unless explicitly marked COMPLETED).
 */

export interface TastingClassificationInput {
  id: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  status: string;
}

export type TastingVisibility = 'UPCOMING' | 'PAST' | 'NONE';

/**
 * Returns current date (YYYY-MM-DD) and time (HH:mm:ss) in Europe/Madrid timezone
 */
export function getNowInMadrid(refDate: Date = new Date()): { madridDate: string; madridTime: string } {
  const madridDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(refDate);

  const madridTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(refDate);

  return { madridDate, madridTime };
}

/**
 * Classifies a tasting with strict mutual exclusivity
 */
export function classifyTasting(
  tasting: TastingClassificationInput,
  refDate: Date = new Date()
): TastingVisibility {
  // Cancelled, draft, or unlisted tastings never appear in public listings
  if (tasting.status === 'CANCELLED' || tasting.status === 'DRAFT') {
    return 'NONE';
  }

  // Explicitly marked COMPLETED by admin -> always in Recuerdos / Memories
  if (tasting.status === 'COMPLETED') {
    return 'PAST';
  }

  // Only PUBLISHED or SOLD_OUT qualify for public evaluation
  if (tasting.status !== 'PUBLISHED' && tasting.status !== 'SOLD_OUT') {
    return 'NONE';
  }

  const { madridDate, madridTime } = getNowInMadrid(refDate);

  // Case 1: Date is strictly in the past (before today in Madrid)
  if (tasting.date < madridDate) {
    return 'PAST';
  }

  // Case 2: Date is strictly in the future (after today in Madrid)
  if (tasting.date > madridDate) {
    return 'UPCOMING';
  }

  // Case 3: Event date is TODAY in Madrid (tasting.date === madridDate)
  if (tasting.end_time) {
    // Normalize HH:mm to HH:mm:ss for clean lexicographical comparison
    const rawEnd = tasting.end_time.trim();
    const normalizedEndTime = rawEnd.length === 5 ? `${rawEnd}:00` : rawEnd;

    // Has it already concluded today in Madrid?
    if (madridTime >= normalizedEndTime) {
      return 'PAST';
    }

    // Still pending start or in progress today
    return 'UPCOMING';
  }

  // If an older tasting has no end_time:
  // Keep in UPCOMING during the event date, moves to PAST tomorrow (unless COMPLETED earlier)
  return 'UPCOMING';
}
