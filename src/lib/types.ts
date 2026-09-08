export type TastingStatus = "DRAFT" | "PUBLISHED" | "SOLD_OUT" | "COMPLETED" | "CANCELLED";

export interface Tasting {
  id: string;
  slug: string;
  title_es: string;
  title_en: string;
  subtitle_es?: string;
  subtitle_en?: string;
  description_es: string;
  description_en: string;
  cover_image?: string;
  category?: string;
  date: string;
  start_time: string;
  end_time?: string;
  location: string;
  price: number;
  capacity: number;
  status: TastingStatus;
  host?: string;
  includes_alcohol?: boolean;
  created_at: string;
  updated_at: string;
}

export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface Reservation {
  id: string;
  tasting_id: string;
  profile_id: string;
  places: number;
  total_amount: number;
  status: ReservationStatus;
  stripe_session_id?: string;
  stripe_payment_intent?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  role: "CUSTOMER" | "STAFF" | "ADMIN";
  preferred_language: string;
  public_token: string;
  created_at: string;
}
