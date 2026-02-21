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
  is_active: number;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: number;
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
  totalRevenue: number;
  totalFarmStayInquiries: number;
  recentOrders: Order[];
}

