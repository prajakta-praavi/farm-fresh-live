export interface Product {
  id: number;
  name: string;
  sku?: string | null;
  category_name: string;
  category_id: number;
  description: string;
  image_url: string;
  price: number;
  stock_quantity: number;
  product_status?: "Active" | "Out of Stock";
  unit: string;
  hsn_code: string;
  gst_rate?: number;
  is_active: number;
  created_at: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  variation_id?: number | null;
  variation_value?: string | null;
  order_id?: number | null;
  movement_type: "order_deduction" | "admin_adjustment" | "restock";
  quantity_delta: number;
  previous_stock: number;
  new_stock: number;
  note?: string | null;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Attribute {
  id: number;
  name: string;
}

export interface AttributeTerm {
  id: number;
  attribute_id: number;
  term_name: string;
  quantity_value?: number | null;
  unit?: string | null;
}

export interface ProductVariation {
  id?: number;
  product_id?: number;
  attribute_id: number;
  term_id: number;
  value: string;
  quantity_value?: number | null;
  unit?: string | null;
  price: number;
  stock: number;
  sku?: string | null;
  attribute_name?: string;
  term_name?: string;
}

export interface OrderItem {
  id: number;
  product_id?: number | null;
  variation_id?: number | null;
  attribute_name?: string | null;
  term_name?: string | null;
  variation_value?: string | null;
  quantity_value?: number | null;
  unit?: string | null;
  sku?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: number;
  customer_id?: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_pincode: string;
  order_status: "Pending" | "Confirmed" | "Processing" | "Ready to Ship" | "Shipped" | "Delivered" | "Cancelled";
  payment_status: "Pending" | "Paid" | "Failed" | "Refunded";
  total_amount: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  invoice_id?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface FarmStayInquiry {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  check_in_date: string;
  check_out_date: string;
  people_count: number;
  message: string;
  status: "New" | "Confirmed" | "Completed" | "Cancelled";
  created_at: string;
}

export interface DashboardOverview {
  totalProducts: number;
  totalOrders: number;
  totalCustomers?: number;
  totalRevenue: number;
  totalFarmStayInquiries: number;
  recentOrders: Order[];
}

export interface AdminProfile {
  id: number;
  name: string;
  username: string;
  email: string;
  profile_image?: string | null;
  last_login?: string | null;
  created_at?: string;
}

export interface CustomerRecord {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  last_login?: string | null;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  author_name?: string | null;
  excerpt: string;
  content: string;
  image_url?: string | null;
  category: string;
  read_time: string;
  is_published: number;
  publish_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface BlogCategory {
  id: number;
  name: string;
  created_at: string;
}

export interface FarmStaySettings {
  total_property_capacity: number;
  total_rooms: number;
  room_base_capacity: number;
  room_max_capacity: number;
  room_price_per_night: number;
  extra_bed_charge: number;
}

export interface FarmStayUnit {
  id: number;
  unit_type: "ROOM" | "TENT";
  unit_name: string;
  capacity: number;
  price_per_night: number;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface FarmStayBooking {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  check_in_date: string;
  check_out_date: string;
  guest_count: number;
  accommodation_type: "ROOM" | "TENT";
  rooms_allocated: number;
  extra_beds: number;
  subtotal_per_night: number;
  gst_rate: number;
  gst_amount_per_night: number;
  total_gst: number;
  total_price: number;
  notes?: string | null;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  created_at: string;
}

export interface FarmStayBlockedDate {
  id: number;
  blocked_date: string;
  reason?: string | null;
  is_active: number;
  created_at: string;
}

export interface FarmStayGuestCount {
  date: string;
  guest_count: number;
  remaining_capacity: number;
}

export type UserRole = "administrator" | "author" | "subscriber";

export interface ManagedUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface PaginatedUsers {
  items: ManagedUser[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
