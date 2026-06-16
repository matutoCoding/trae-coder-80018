export type SeatStatus = 'available' | 'occupied' | 'selected' | 'disabled' | 'booked-private';

export type SeatType = 'normal' | 'vip' | 'couple' | 'handicapped';

export interface Seat {
  id: string;
  row: number;
  col: number;
  label: string;
  type: SeatType;
  status: SeatStatus;
  basePrice: number;
}

export interface Hall {
  id: string;
  name: string;
  rows: number;
  cols: number;
  seats: Seat[];
  createdAt: string;
}

export interface Movie {
  id: string;
  title: string;
  duration: number;
  poster?: string;
  description?: string;
}

export type SessionType = 'normal' | 'private' | 'morning' | 'midnight';

export interface Session {
  id: string;
  hallId: string;
  movieId: string;
  movieTitle: string;
  hallName: string;
  startTime: string;
  endTime: string;
  type: SessionType;
  basePrice: number;
  seatStatus: Record<string, SeatStatus>;
  seatOccupier?: Record<string, string>;
  isPrivateBooking?: boolean;
  privateCustomerId?: string;
  privateCustomerName?: string;
  generatedFromRuleId?: string;
}

export interface PrivateCustomer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  contractStartDate: string;
  contractEndDate: string;
  discountRate: number;
  notes?: string;
}

export type CycleUnit = 'day' | 'week' | 'month';

export interface CycleRule {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  hallId: string;
  hallName: string;
  movieId: string;
  movieTitle: string;
  basePrice: number;
  cycleUnit: CycleUnit;
  cycleInterval: number;
  weekDays?: number[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  seatIds: string[];
  isActive: boolean;
  createdAt: string;
}

export type DiscountType = 'percentage' | 'fixed' | 'full-reduction' | 'member-discount';

export interface Discount {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  minAmount?: number;
  maxDiscount?: number;
  applicableScope?: 'all' | 'ticket' | 'vip' | 'non-vip';
  priority: number;
  isStackable: boolean;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  description?: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  level: 'normal' | 'silver' | 'gold' | 'diamond';
  discountRate: number;
  points: number;
  joinDate: string;
}

export type OrderStatus = 'pending' | 'paid' | 'refunded' | 'changed' | 'cancelled';

export interface OrderTicket {
  sessionId: string;
  seatId: string;
  seatLabel: string;
  originalPrice: number;
  finalPrice: number;
}

export interface AppliedDiscount {
  discountId: string;
  discountName: string;
  discountType: DiscountType;
  savedAmount: number;
}

export interface Order {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  memberId?: string;
  memberName?: string;
  tickets: OrderTicket[];
  originalTotal: number;
  finalTotal: number;
  appliedDiscounts: AppliedDiscount[];
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
  refundAmount?: number;
  changedFromOrderId?: string;
  notes?: string;
}

export interface RefundRecord {
  id: string;
  orderId: string;
  orderNo: string;
  refundAmount: number;
  reason: string;
  operator: string;
  createdAt: string;
}

export interface ChangeRecord {
  id: string;
  fromOrderId: string;
  fromOrderNo: string;
  toOrderId: string;
  toOrderNo: string;
  priceDifference: number;
  reason: string;
  operator: string;
  createdAt: string;
}
