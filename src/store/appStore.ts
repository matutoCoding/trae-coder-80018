import { create } from 'zustand';
import type {
  Hall, Session, Movie, PrivateCustomer, CycleRule,
  Discount, Member, Order, RefundRecord, ChangeRecord
} from '@/types';
import { generateMockData } from '@/data/mockData';

interface AppState {
  halls: Hall[];
  sessions: Session[];
  movies: Movie[];
  privateCustomers: PrivateCustomer[];
  cycleRules: CycleRule[];
  discounts: Discount[];
  members: Member[];
  orders: Order[];
  refundRecords: RefundRecord[];
  changeRecords: ChangeRecord[];
  currentHallId: string | null;
  currentSessionId: string | null;

  setCurrentHall: (id: string | null) => void;
  setCurrentSession: (id: string | null) => void;

  addHall: (hall: Hall) => void;
  updateHall: (hall: Hall) => void;
  deleteHall: (id: string) => void;

  addSession: (session: Session) => void;
  updateSession: (session: Session) => void;
  deleteSession: (id: string) => void;
  batchAddSessions: (sessions: Session[]) => void;
  updateSessionSeatStatus: (sessionId: string, seatId: string, status: string, occupier?: string) => void;

  addMovie: (movie: Movie) => void;
  updateMovie: (movie: Movie) => void;
  deleteMovie: (id: string) => void;

  addPrivateCustomer: (customer: PrivateCustomer) => void;
  updatePrivateCustomer: (customer: PrivateCustomer) => void;
  deletePrivateCustomer: (id: string) => void;

  addCycleRule: (rule: CycleRule) => void;
  updateCycleRule: (rule: CycleRule) => void;
  deleteCycleRule: (id: string) => void;

  addDiscount: (discount: Discount) => void;
  updateDiscount: (discount: Discount) => void;
  deleteDiscount: (id: string) => void;

  addMember: (member: Member) => void;
  updateMember: (member: Member) => void;
  deleteMember: (id: string) => void;

  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  refundOrder: (orderId: string, refundAmount: number, reason: string, operator: string) => void;
  changeOrder: (fromOrderId: string, newOrder: Order, priceDiff: number, reason: string, operator: string) => void;
}

export const useAppStore = create<AppState>((set, get) => {
  const mock = generateMockData();

  return {
    halls: mock.halls,
    sessions: mock.sessions,
    movies: mock.movies,
    privateCustomers: mock.privateCustomers,
    cycleRules: mock.cycleRules,
    discounts: mock.discounts,
    members: mock.members,
    orders: mock.orders,
    refundRecords: mock.refundRecords,
    changeRecords: mock.changeRecords,
    currentHallId: mock.halls[0]?.id || null,
    currentSessionId: mock.sessions[0]?.id || null,

    setCurrentHall: (id) => set({ currentHallId: id }),
    setCurrentSession: (id) => set({ currentSessionId: id }),

    addHall: (hall) => set((state) => ({ halls: [...state.halls, hall] })),
    updateHall: (hall) => set((state) => ({
      halls: state.halls.map((h) => (h.id === hall.id ? hall : h))
    })),
    deleteHall: (id) => set((state) => ({
      halls: state.halls.filter((h) => h.id !== id),
      currentHallId: state.currentHallId === id ? (state.halls.find(h => h.id !== id)?.id || null) : state.currentHallId
    })),

    addSession: (session) => set((state) => ({ sessions: [...state.sessions, session] })),
    updateSession: (session) => set((state) => ({
      sessions: state.sessions.map((s) => (s.id === session.id ? session : s))
    })),
    deleteSession: (id) => set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSessionId: state.currentSessionId === id ? (state.sessions.find(s => s.id !== id)?.id || null) : state.currentSessionId
    })),
    batchAddSessions: (newSessions) => set((state) => ({
      sessions: [...state.sessions, ...newSessions]
    })),
    updateSessionSeatStatus: (sessionId, seatId, status, occupier) => set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const newSeatStatus = { ...s.seatStatus, [seatId]: status as any };
        const newSeatOccupier = { ...s.seatOccupier };
        if (occupier) {
          newSeatOccupier[seatId] = occupier;
        } else if (status === 'available') {
          delete newSeatOccupier[seatId];
        }
        return { ...s, seatStatus: newSeatStatus, seatOccupier: Object.keys(newSeatOccupier).length ? newSeatOccupier : undefined };
      })
    })),

    addMovie: (movie) => set((state) => ({ movies: [...state.movies, movie] })),
    updateMovie: (movie) => set((state) => ({
      movies: state.movies.map((m) => (m.id === movie.id ? movie : m))
    })),
    deleteMovie: (id) => set((state) => ({
      movies: state.movies.filter((m) => m.id !== id)
    })),

    addPrivateCustomer: (customer) => set((state) => ({ privateCustomers: [...state.privateCustomers, customer] })),
    updatePrivateCustomer: (customer) => set((state) => ({
      privateCustomers: state.privateCustomers.map((c) => (c.id === customer.id ? customer : c))
    })),
    deletePrivateCustomer: (id) => set((state) => ({
      privateCustomers: state.privateCustomers.filter((c) => c.id !== id)
    })),

    addCycleRule: (rule) => set((state) => ({ cycleRules: [...state.cycleRules, rule] })),
    updateCycleRule: (rule) => set((state) => ({
      cycleRules: state.cycleRules.map((r) => (r.id === rule.id ? rule : r))
    })),
    deleteCycleRule: (id) => set((state) => ({
      cycleRules: state.cycleRules.filter((r) => r.id !== id)
    })),

    addDiscount: (discount) => set((state) => ({ discounts: [...state.discounts, discount] })),
    updateDiscount: (discount) => set((state) => ({
      discounts: state.discounts.map((d) => (d.id === discount.id ? discount : d))
    })),
    deleteDiscount: (id) => set((state) => ({
      discounts: state.discounts.filter((d) => d.id !== id)
    })),

    addMember: (member) => set((state) => ({ members: [...state.members, member] })),
    updateMember: (member) => set((state) => ({
      members: state.members.map((m) => (m.id === member.id ? member : m))
    })),
    deleteMember: (id) => set((state) => ({
      members: state.members.filter((m) => m.id !== id)
    })),

    addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
    updateOrder: (order) => set((state) => ({
      orders: state.orders.map((o) => (o.id === order.id ? order : o))
    })),
    refundOrder: (orderId, refundAmount, reason, operator) => {
      const state = get();
      const order = state.orders.find(o => o.id === orderId);
      if (!order) return;

      const newRefund: RefundRecord = {
        id: `refund_${Date.now()}`,
        orderId,
        orderNo: order.orderNo,
        refundAmount,
        reason,
        operator,
        createdAt: new Date().toISOString()
      };

      set({
        orders: state.orders.map(o =>
          o.id === orderId
            ? { ...o, status: 'refunded', refundedAt: new Date().toISOString(), refundAmount }
            : o
        ),
        refundRecords: [...state.refundRecords, newRefund]
      });
    },
    changeOrder: (fromOrderId, newOrder, priceDiff, reason, operator) => {
      const state = get();
      const fromOrder = state.orders.find(o => o.id === fromOrderId);
      if (!fromOrder) return;

      const newChange: ChangeRecord = {
        id: `change_${Date.now()}`,
        fromOrderId,
        fromOrderNo: fromOrder.orderNo,
        toOrderId: newOrder.id,
        toOrderNo: newOrder.orderNo,
        priceDifference: priceDiff,
        reason,
        operator,
        createdAt: new Date().toISOString()
      };

      set({
        orders: state.orders.map(o =>
          o.id === fromOrderId ? { ...o, status: 'changed' } : o
        ),
        changeRecords: [...state.changeRecords, newChange]
      });
      get().addOrder(newOrder);
    }
  };
});
