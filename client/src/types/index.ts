export interface User {
  id: number;
  username: string;
  role: string;
}

export interface Customer {
  id: number;
  name: string;
  mobile?: string;
  alt_mobile?: string;
  email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  image_url?: string;
  ledger_balance: number;
  is_gst?: boolean;
  total_pending?: number;
  total_invoices?: number;
  created_at: string;
  updated_at: string;
}

export interface ItemGroup {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface Item {
  id: number;
  name: string;
  group_id: number;
  group_name?: string;
  price: number;
  description?: string;
  created_at: string;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  item_id: number;
  item_name: string;
  stamp?: '' | '14k' | '18k' | '20k' | '22k' | '24k';
  remarks?: string;
  hsn?: string;
  unit: 'GM' | 'mG';
  pc: number;
  gross_weight: number;
  less: number;
  net_weight: number;
  add_weight: number;
  making_charges: number;
  rate: number;
  labour: number;
  discount: number;
  total: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  mobile?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  type: 'gst' | 'non_gst' | 'repayment';
  invoice_date?: string;
  subtotal: number;
  discount_type?: 'none' | 'percentage' | 'fixed';
  discount_value?: number;
  discount_amount?: number;
  gst_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: 'pending' | 'paid' | 'partial';
  payment_method?: 'cash' | 'upi' | 'cheque';
  payment_status?: 'unpaid' | 'paid' | 'partial' | 'credit';
  // Old item return fields (for non-GST invoices)
  old_item_type?: 'old_gold' | 'old_silver';
  old_item_value?: number;
  items?: InvoiceItem[];
  created_at: string;
  previous_balance?: number;
  current_outstanding?: number;
}

export interface DashboardStats {
  totalCustomers: number;
  totalInvoices: number;
  pendingAmount: number;
  todaySales: number;
} 