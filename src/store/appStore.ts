import { create } from 'zustand';
import type {
  Hall, Session, Movie, PrivateCustomer, CycleRule,
  Discount, Member, Order, RefundRecord, ChangeRecord
} from '@/types';
import { generateMockData } from '@/data/mockData';

const STORAGE_KEY = 'cinema-ticket-system-data';

function loadFromStorage(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(state: AppState) {
  try {
    const toSave = {
      halls: state.halls,
      sessions: state.sessions,
      movies: state.movies,
      privateCustomers: state.privateCustomers,
      cycleRules: state.cycleRules,
      discounts: state.discounts,
      members: state.members,
      orders: state.orders,
      refundRecords: state.refundRecords,
      changeRecords: state.changeRecords
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

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

function getInitialState() {
  const saved = loadFromStorage();
  if (saved && saved.halls && saved.halls.length > 0) {
    return {
      halls: saved.halls,
      sessions: saved.sessions || [],
      movies: saved.movies || [],
      privateCustomers: saved.privateCustomers || [],
      cycleRules: saved.cycleRules || [],
      discounts: saved.discounts || [],
      members: saved.members || [],
      orders: saved.orders || [],
      refundRecords: saved.refundRecords || [],
      changeRecords: saved.changeRecords || [],
      currentHallId: saved.halls[0]?.id || null,
      currentSessionId: null
    };
  }
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
    currentSessionId: null
  };
}

export const useAppStore = create<AppState>((set, get) => {
  const initial = getInitialState();

  const persist = (newState: Partial<AppState>) => {
    set(newState);
    saveToStorage(get());
  };

  return {
    ...initial,

    setCurrentHall: (id) => set({ currentHallId: id }),
    setCurrentSession: (id) => set({ currentSessionId: id }),

    addHall: (hall) => persist({ halls: [...get().halls, hall] }),
    updateHall: (hall) => persist({ halls: get().halls.map((h) => (h.id === hall.id ? hall : h)) }),
    deleteHall: (id) => persist({
      halls: get().halls.filter((h) => h.id !== id),
      currentHallId: get().currentHallId === id ? (get().halls.find(h => h.id !== id)?.id || null) : get().currentHallId
    }),

    addSession: (session) => persist({ sessions: [...get().sessions, session] }),
    updateSession: (session) => persist({ sessions: get().sessions.map((s) => (s.id === session.id ? session : s)) }),
    deleteSession: (id) => persist({
      sessions: get().sessions.filter((s) => s.id !== id),
      currentSessionId: get().currentSessionId === id ? null : get().currentSessionId
    }),
    batchAddSessions: (newSessions) => persist({ sessions: [...get().sessions, ...newSessions] }),
    updateSessionSeatStatus: (sessionId, seatId, status, occupier) => persist({
      sessions: get().sessions.map((s) => {
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
    }),

    addMovie: (movie) => persist({ movies: [...get().movies, movie] }),
    updateMovie: (movie) => persist({ movies: get().movies.map((m) => (m.id === movie.id ? movie : m)) }),
    deleteMovie: (id) => persist({ movies: get().movies.filter((m) => m.id !== id) }),

    addPrivateCustomer: (customer) => persist({ privateCustomers: [...get().privateCustomers, customer] }),
    updatePrivateCustomer: (customer) => persist({ privateCustomers: get().privateCustomers.map((c) => (c.id === customer.id ? customer : c)) }),
    deletePrivateCustomer: (id) => persist({ privateCustomers: get().privateCustomers.filter((c) => c.id !== id) }),

    addCycleRule: (rule) => persist({ cycleRules: [...get().cycleRules, rule] }),
    updateCycleRule: (rule) => persist({ cycleRules: get().cycleRules.map((r) => (r.id === rule.id ? rule : r)) }),
    deleteCycleRule: (id) => persist({ cycleRules: get().cycleRules.filter((r) => r.id !== id) }),

    addDiscount: (discount) => persist({ discounts: [...get().discounts, discount] }),
    updateDiscount: (discount) => persist({ discounts: get().discounts.map((d) => (d.id === discount.id ? discount : d)) }),
    deleteDiscount: (id) => persist({ discounts: get().discounts.filter((d) => d.id !== id) }),

    addMember: (member) => persist({ members: [...get().members, member] }),
    updateMember: (member) => persist({ members: get().members.map((m) => (m.id === member.id ? member : m)) }),
    deleteMember: (id) => persist({ members: get().members.filter((m) => m.id !== id) }),

    addOrder: (order) => persist({ orders: [...get().orders, order] }),
    updateOrder: (order) => persist({ orders: get().orders.map((o) => (o.id === order.id ? order : o)) }),
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

      persist({
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

      persist({
        orders: [...state.orders.map(o =>
          o.id === fromOrderId ? { ...o, status: 'changed' as const } : o
        ), newOrder],
        changeRecords: [...state.changeRecords, newChange]
      });
    }
  };
});
