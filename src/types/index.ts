export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'staff' | 'customer';
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface Court {
  id: string;
  name: string;
  type: 'indoor' | 'outdoor';
  surface: string;
  status: 'active' | 'maintenance' | 'inactive';
  hourly_rate: number;
  peak_rate: number;
  lighting_fee: number;
  description: string;
  image_url: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  is_vip: boolean;
  notes: string;
  total_bookings: number;
  total_spent: number;
  created_at: string;
}

export interface Booking {
  id: string;
  court_id: string;
  customer_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  deposit_amount: number;
  deposit_paid: boolean;
  total_amount: number;
  notes: string;
  is_recurring: boolean;
  recurring_pattern: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
  court?: Court;
  customer?: Customer;
}

export interface Product {
  id: string;
  name: string;
  category: 'rental' | 'food' | 'drink' | 'equipment' | 'other';
  price: number;
  rental_price_per_hour: number;
  stock_quantity: number;
  min_stock: number;
  barcode: string;
  is_active: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  booking_id: string | null;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  deposit_deducted: number;
  amount_due: number;
  payment_method: 'cash' | 'transfer' | 'card' | 'momo' | 'zalopay' | 'vnpay';
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes: string;
  created_by: string;
  created_at: string;
  customer?: Customer;
  booking?: Booking;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_type: 'court' | 'product' | 'rental' | 'lighting' | 'service';
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Setting {
  id: string;
  key: string;
  value: unknown;
  updated_at: string;
}
