export interface Product {
  id: number;
  name: string;
  category_name: string;
  category_id: number;
  description: string;
  image_url: string;
  price: number;
  stock_quantity: number;
  unit: string;
  hsn_code: string;
  gst_rate?: number;
  is_active: number;
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
  order_status: "Pending" | "Confirmed" | "Shipped" | "Delivered" | "Cancelled";
  payment_status: "Pending" | "Paid" | "Failed" | "Refunded";
  total_amount: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
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
