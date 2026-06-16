import React, { useState, useMemo } from 'react';
import {
  Search, RefreshCw, FileText, Undo2, ArrowRightLeft,
  Clock, MapPin, Film, Phone, User, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, XCircle, Ticket, Calendar, Download
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { SessionCard } from '@/components/SessionCard';
import { SeatMap } from '@/components/SeatMap';
import type { Order, OrderStatus, OrderTicket } from '@/types';
import { formatDateTime, formatDate } from '@/utils/cycleGenerator';
import { formatPrice, calculatePrice, getDefaultDiscountOrder } from '@/utils/priceCalculator';
import { generateId, generateOrderNo } from '@/data/mockData';
import { format, isSameDay, startOfDay, endOfDay } from 'date-fns';

const BOM = '\uFEFF';

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  refunded: 'bg-gray-100 text-gray-600',
  changed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700'
};

const statusLabels: Record<OrderStatus, string> = {
  pending: '待支付',
  paid: '已支付',
  refunded: '已退款',
  changed: '已改签',
  cancelled: '已取消'
};

type TabType = 'orders' | 'refund' | 'change';

export const RefundChangePage: React.FC = () => {
  const {
    orders, sessions, halls, members, discounts, refundRecords, changeRecords,
    refundOrder, changeOrder, updateSessionSeatStatus, addOrder
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrderData, setRefundOrderData] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);

  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeOrderData, setChangeOrderData] = useState<Order | null>(null);
  const [newSessionId, setNewSessionId] = useState<string>('');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [changeReason, setChangeReason] = useState('');

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchSearch = !searchText ||
        order.orderNo.toLowerCase().includes(searchText.toLowerCase()) ||
        order.customerName.includes(searchText) ||
        order.customerPhone.includes(searchText);
      const matchStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchText, statusFilter]);

  const openRefundModal = (order: Order) => {
    setRefundOrderData(order);
    setRefundAmount(order.finalTotal);
    setRefundReason('');
    setShowRefundModal(true);
  };

  const openChangeModal = (order: Order) => {
    setChangeOrderData(order);
    setNewSessionId('');
    setSelectedSeats([]);
    setChangeReason('');
    setShowChangeModal(true);
  };

  const handleRefundSubmit = () => {
    if (!refundOrderData || !refundReason) return;

    refundOrder(refundOrderData.id, refundAmount, refundReason, '管理员');

    refundOrderData.tickets.forEach(ticket => {
      updateSessionSeatStatus(ticket.sessionId, ticket.seatId, 'available');
    });

    setShowRefundModal(false);
    setRefundOrderData(null);
  };

  const newSession = sessions.find(s => s.id === newSessionId);
  const newHall = halls.find(h => h.id === newSession?.hallId);

  const originalTickets = changeOrderData?.tickets || [];
  const newSessionSeats = useMemo(() => {
    if (!newHall) return [];
    return selectedSeats.map(seatId => {
      const seat = newHall.seats.find(s => s.id === seatId);
      const price = seat ? Math.max(seat.basePrice, newSession?.basePrice || 0) : (newSession?.basePrice || 0);
      return { seat, price };
    }).filter(x => x.seat);
  }, [selectedSeats, newHall, newSession]);

  const originalTotal = originalTickets.reduce((sum, t) => sum + t.originalPrice, 0);
  const newOriginalTotal = newSessionSeats.reduce((sum, x) => sum + x.price, 0);

  const selectedMember = changeOrderData?.memberId ? members.find(m => m.id === changeOrderData.memberId) : undefined;
  const discountOrder = getDefaultDiscountOrder(discounts);
  const activeDiscounts = discounts.filter(d => d.isActive);

  const newPriceResult = useMemo(() => {
    if (!newSession || newSessionSeats.length === 0) {
      return { finalTotal: 0, appliedDiscounts: [], breakdown: [], hasNegativeProtection: false };
    }
    return calculatePrice({
      originalTotal: newOriginalTotal,
      discounts: activeDiscounts,
      member: selectedMember,
      session: newSession,
      ticketCount: newSessionSeats.length,
      discountOrder
    });
  }, [newOriginalTotal, activeDiscounts, selectedMember, newSession, newSessionSeats.length, discountOrder]);

  const priceDifference = newPriceResult.finalTotal - (changeOrderData?.finalTotal || 0);

  const handleChangeSubmit = () => {
    if (!changeOrderData || !newSession || selectedSeats.length === 0 || !changeReason) return;

    const newTickets: OrderTicket[] = newSessionSeats.map(({ seat, price }) => ({
      sessionId: newSession.id,
      seatId: seat!.id,
      seatLabel: seat!.label,
      originalPrice: price,
      finalPrice: newSessionSeats.length > 0 ? newPriceResult.finalTotal / newSessionSeats.length : 0
    }));

    const newOrder = {
      id: generateId('order'),
      orderNo: generateOrderNo(),
      customerName: changeOrderData.customerName,
      customerPhone: changeOrderData.customerPhone,
      memberId: changeOrderData.memberId,
      memberName: changeOrderData.memberName,
      tickets: newTickets,
      originalTotal: newOriginalTotal,
      finalTotal: newPriceResult.finalTotal,
      appliedDiscounts: newPriceResult.appliedDiscounts,
      status: 'paid' as const,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      changedFromOrderId: changeOrderData.id
    };

    changeOrderData.tickets.forEach(ticket => {
      updateSessionSeatStatus(ticket.sessionId, ticket.seatId, 'available');
    });

    selectedSeats.forEach(seatId => {
      updateSessionSeatStatus(newSession.id, seatId, 'occupied', changeOrderData.customerName);
    });

    changeOrder(changeOrderData.id, newOrder, priceDifference, changeReason, '管理员');

    setShowChangeModal(false);
    setChangeOrderData(null);
  };

  const stats = useMemo(() => ({
    total: orders.length,
    paid: orders.filter(o => o.status === 'paid').length,
    refunded: orders.filter(o => o.status === 'refunded').length,
    changed: orders.filter(o => o.status === 'changed').length,
    refundAmount: refundRecords.reduce((sum, r) => sum + r.refundAmount, 0),
    changeDiff: changeRecords.reduce((sum, r) => sum + r.priceDifference, 0)
  }), [orders, refundRecords, changeRecords]);

  const handleExportOrders = () => {
    const today = startOfDay(new Date());
    const todayOrders = orders.filter(o => {
      const d = new Date(o.createdAt);
      return isSameDay(d, today);
    });

    const header = '订单号,影片,影厅,座位,原价,实付金额,状态,操作时间';
    const rows = todayOrders.map(o => {
      const session = sessions.find(s => s.id === o.tickets[0]?.sessionId);
      const movie = session?.movieTitle || '';
      const hall = session?.hallName || '';
      const seats = o.tickets.map(t => t.seatLabel).join(' ');
      const status = statusLabels[o.status];
      const time = formatDateTime(o.paidAt || o.createdAt);
      return `${o.orderNo},${movie},${hall},${seats},${o.originalTotal},${o.finalTotal},${status},${time}`;
    });

    downloadCsv(`订单导出_${format(today, 'yyyyMMdd')}.csv`, [header, ...rows].join('\n'));
  };

  const handleExportRefundChange = () => {
    const today = startOfDay(new Date());

    const header = '类型,订单号,关联订单号,影片,影厅,座位,原价,实付金额,状态,金额/差价,原因,操作人,操作时间';

    const getOrderContext = (orderId: string) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return { movie: '', hall: '', seats: '', originalTotal: 0, finalTotal: 0, status: '' };
      const session = sessions.find(s => s.id === order.tickets[0]?.sessionId);
      return {
        movie: session?.movieTitle || '',
        hall: session?.hallName || '',
        seats: order.tickets.map(t => t.seatLabel).join(' '),
        originalTotal: order.originalTotal,
        finalTotal: order.finalTotal,
        status: statusLabels[order.status]
      };
    };

    const refundRows = refundRecords.filter(r => isSameDay(new Date(r.createdAt), today)).map(r => {
      const ctx = getOrderContext(r.orderId);
      return `退款,${r.orderNo},,${ctx.movie},${ctx.hall},${ctx.seats},${ctx.originalTotal},${ctx.finalTotal},${ctx.status},${r.refundAmount},${r.reason},${r.operator},${formatDateTime(r.createdAt)}`;
    });

    const changeRows = changeRecords.filter(r => isSameDay(new Date(r.createdAt), today)).map(r => {
      const ctx = getOrderContext(r.toOrderId);
      const diffStr = r.priceDifference >= 0 ? `+${r.priceDifference}` : `${r.priceDifference}`;
      return `改签,${r.toOrderNo},${r.fromOrderNo},${ctx.movie},${ctx.hall},${ctx.seats},${ctx.originalTotal},${ctx.finalTotal},${ctx.status},${diffStr},${r.reason},${r.operator},${formatDateTime(r.createdAt)}`;
    });

    downloadCsv(`退改签导出_${format(today, 'yyyyMMdd')}.csv`, [header, ...refundRows, ...changeRows].join('\n'));
  };

  const handleExportHandover = () => {
    const today = startOfDay(new Date());
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayEnd = endOfDay(today);

    const hallSummaries: Record<string, {
      hallId: string; hallName: string;
      sessions: number; ticketCount: number;
      sales: number; refund: number;
      changeDiff: number;
    }> = {};

    halls.forEach(h => {
      hallSummaries[h.id] = {
        hallId: h.id, hallName: h.name,
        sessions: 0, ticketCount: 0,
        sales: 0, refund: 0, changeDiff: 0
      };
    });

    sessions.forEach(s => {
      const st = new Date(s.startTime);
      if (!isSameDay(st, today)) return;
      if (!hallSummaries[s.hallId]) return;
      hallSummaries[s.hallId].sessions++;
    });

    const sessionHallMap = new Map(sessions.map(s => [s.id, s.hallId]));

    orders.forEach(order => {
      if (order.status === 'cancelled') return;
      const primaryHallId = sessionHallMap.get(order.tickets[0]?.sessionId || '');
      if (!primaryHallId || !hallSummaries[primaryHallId]) return;
      const anyMatch = order.tickets.some(t => {
        const ts = sessions.find(ss => ss.id === t.sessionId);
        return ts && isSameDay(new Date(ts.startTime), today);
      });
      if (!anyMatch) return;
      const paidTime = order.paidAt ? new Date(order.paidAt) : new Date(order.createdAt);
      if (paidTime >= today && paidTime <= todayEnd && order.status === 'paid') {
        hallSummaries[primaryHallId].sales += order.finalTotal;
        hallSummaries[primaryHallId].ticketCount += order.tickets.length;
      }
    });

    refundRecords.forEach(r => {
      const rt = new Date(r.createdAt);
      if (!(rt >= today && rt <= todayEnd)) return;
      const order = orders.find(o => o.id === r.orderId);
      if (!order) return;
      const primaryHallId = sessionHallMap.get(order.tickets[0]?.sessionId || '');
      if (!primaryHallId || !hallSummaries[primaryHallId]) return;
      hallSummaries[primaryHallId].refund += r.refundAmount;
    });

    changeRecords.forEach(r => {
      const ct = new Date(r.createdAt);
      if (!(ct >= today && ct <= todayEnd)) return;
      const order = orders.find(o => o.id === r.toOrderId);
      if (!order) return;
      const primaryHallId = sessionHallMap.get(order.tickets[0]?.sessionId || '');
      if (!primaryHallId || !hallSummaries[primaryHallId]) return;
      hallSummaries[primaryHallId].changeDiff += r.priceDifference;
    });

    const header = '影厅,场次,售出票数,售票金额,退款金额,改签差价,净收入';
    const rows: string[] = [];
    let totalSessions = 0, totalTickets = 0, totalSales = 0, totalRefund = 0, totalChange = 0;

    Object.values(hallSummaries).forEach(h => {
      const net = h.sales - h.refund + h.changeDiff;
      rows.push(`${h.hallName},${h.sessions},${h.ticketCount},${h.sales.toFixed(2)},${h.refund.toFixed(2)},${h.changeDiff.toFixed(2)},${net.toFixed(2)}`);
      totalSessions += h.sessions;
      totalTickets += h.ticketCount;
      totalSales += h.sales;
      totalRefund += h.refund;
      totalChange += h.changeDiff;
    });

    const totalNet = totalSales - totalRefund + totalChange;
    rows.push(`合计,${totalSessions},${totalTickets},${totalSales.toFixed(2)},${totalRefund.toFixed(2)},${totalChange.toFixed(2)},${totalNet.toFixed(2)}`);

    downloadCsv(`交班汇总_${format(today, 'yyyyMMdd')}.csv`, [header, ...rows].join('\n'));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">订单管理 · 改签退票</h1>
        <p className="text-gray-500">查看订单、办理退票和改签手续</p>
      </div>

      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">订单总数</div>
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">已支付</div>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">已退款</div>
            <div className="text-2xl font-bold text-gray-500">{stats.refunded}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">已改签</div>
            <div className="text-2xl font-bold text-blue-600">{stats.changed}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">累计退款</div>
            <div className="text-2xl font-bold text-amber-600">{formatPrice(stats.refundAmount)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">改签差价</div>
            <div className={`text-2xl font-bold ${stats.changeDiff >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {stats.changeDiff >= 0 ? '+' : ''}{formatPrice(stats.changeDiff)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'orders' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                全部订单
              </span>
            </button>
            <button
              onClick={() => setActiveTab('refund')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'refund' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Undo2 className="w-4 h-4" />
                退款记录
              </span>
            </button>
            <button
              onClick={() => setActiveTab('change')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'change' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4" />
                改签记录
              </span>
            </button>
          </div>

          {activeTab === 'orders' && (
            <div className="flex-1 flex gap-3 items-center justify-end">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索订单号/姓名/电话..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全部状态</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button
                onClick={handleExportOrders}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                导出当天订单
              </button>
              <button
                onClick={handleExportRefundChange}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                导出退改签
              </button>
              <button
                onClick={handleExportHandover}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                交班汇总
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {filteredOrders.map(order => {
              const isExpanded = expandedOrderId === order.id;
              const session = sessions.find(s => s.id === order.tickets[0]?.sessionId);
              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div
                    className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-gray-500">{order.orderNo}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                              {statusLabels[order.status]}
                            </span>
                            {order.memberName && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700">
                                会员：{order.memberName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {order.customerName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {order.customerPhone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Ticket className="w-3.5 h-3.5" />
                              {order.tickets.length}张票
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-gray-400 mb-0.5">应付 {formatPrice(order.originalTotal)}</div>
                          <div className="text-xl font-bold text-red-500">{formatPrice(order.finalTotal)}</div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2 space-y-4">
                          <div className="bg-white rounded-xl p-4">
                            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                              <Film className="w-4 h-4 text-gray-400" />
                              场次信息
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {session && (
                                <>
                                  <div>
                                    <span className="text-gray-500">影片：</span>
                                    <span className="text-gray-800">{session.movieTitle}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">影厅：</span>
                                    <span className="text-gray-800">{session.hallName}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">时间：</span>
                                    <span className="text-gray-800">{formatDateTime(session.startTime)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">座位：</span>
                                    <span className="text-gray-800">
                                      {order.tickets.map(t => t.seatLabel).join('、')}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {order.appliedDiscounts.length > 0 && (
                            <div className="bg-white rounded-xl p-4">
                              <div className="text-sm font-medium text-gray-700 mb-3">优惠明细</div>
                              <div className="space-y-2">
                                {order.appliedDiscounts.map((d, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-600">{d.discountName}</span>
                                    <span className="text-green-600">-{formatPrice(d.savedAmount)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(() => {
                            const audits = session?.removedSeatAudit?.filter(a => a.orderNo === order.orderNo) || [];
                            if (audits.length === 0) return null;
                            return (
                              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                                  <div className="text-sm font-semibold text-amber-800">
                                    影厅布局调整追溯：本订单有座位被移除
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {audits.map(a => (
                                    <div key={a.seatId + a.removedAt} className="flex justify-between text-xs bg-white rounded-lg px-3 py-2">
                                      <span className="text-amber-800 font-mono font-semibold">{a.seatLabel}</span>
                                      <span className="text-amber-600">
                                        {a.status === 'occupied' ? '已售票' : '包场'}
                                        {' · '}
                                        移除：{formatDateTime(a.removedAt)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="space-y-4">
                          <div className="bg-white rounded-xl p-4">
                            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-gray-400" />
                              订单时间
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">创建时间</span>
                                <span className="text-gray-800">{order.createdAt}</span>
                              </div>
                              {order.paidAt && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">支付时间</span>
                                  <span className="text-gray-800">{order.paidAt}</span>
                                </div>
                              )}
                              {order.refundedAt && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">退款时间</span>
                                  <span className="text-gray-800">{order.refundedAt}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {(order.status === 'paid' || order.status === 'pending') && (
                            <div className="space-y-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRefundModal(order);
                                }}
                                className="w-full py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 font-medium"
                              >
                                <Undo2 className="w-4 h-4" />
                                办理退票
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openChangeModal(order);
                                }}
                                className="w-full py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 font-medium"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                                办理改签
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredOrders.length === 0 && (
              <div className="py-20 text-center text-gray-400 bg-white rounded-xl">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">暂无订单</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'refund' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">订单号</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">退款金额</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">退款原因</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">操作人</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">退款时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {refundRecords.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 text-sm font-mono text-gray-600">{record.orderNo}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-green-600">{formatPrice(record.refundAmount)}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{record.reason}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{record.operator}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{formatDateTime(record.createdAt)}</td>
                  </tr>
                ))}
                {refundRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-gray-400">
                      <Undo2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      暂无退款记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'change' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">原订单号</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">新订单号</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">差价</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">改签原因</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">操作人</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">改签时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {changeRecords.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 text-sm font-mono text-gray-600">{record.fromOrderNo}</td>
                    <td className="px-5 py-4 text-sm font-mono text-gray-600">{record.toOrderNo}</td>
                    <td className={`px-5 py-4 text-sm font-semibold ${record.priceDifference >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {record.priceDifference >= 0 ? '+' : ''}{formatPrice(record.priceDifference)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{record.reason}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{record.operator}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{formatDateTime(record.createdAt)}</td>
                  </tr>
                ))}
                {changeRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-gray-400">
                      <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      暂无改签记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRefundModal && refundOrderData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">办理退票</h3>
                <p className="text-xs text-gray-500">请确认退票信息</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">订单号</span>
                  <span className="font-mono">{refundOrderData.orderNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">顾客</span>
                  <span>{refundOrderData.customerName} ({refundOrderData.customerPhone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">座位数</span>
                  <span>{refundOrderData.tickets.length}张</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-500">已付金额</span>
                  <span className="font-bold text-gray-800">{formatPrice(refundOrderData.finalTotal)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">退款金额</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  max={refundOrderData.finalTotal}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">退票原因</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">请选择原因</option>
                  <option value="临时有事">临时有事</option>
                  <option value="身体不适">身体不适</option>
                  <option value="计划变更">计划变更</option>
                  <option value="影片原因">影片原因</option>
                  <option value="其他原因">其他原因</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleRefundSubmit}
                disabled={!refundReason}
                className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                确认退款
              </button>
            </div>
          </div>
        </div>
      )}

      {showChangeModal && changeOrderData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">办理改签</h3>
                  <p className="text-xs text-gray-500">原订单：{changeOrderData.orderNo}</p>
                </div>
              </div>
              <button onClick={() => setShowChangeModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-1.5">
                    <Film className="w-4 h-4" />
                    选择新场次
                  </h4>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {sessions.filter(s => {
                      const sessionTime = new Date(s.startTime);
                      return sessionTime > new Date() && !s.isPrivateBooking;
                    }).slice(0, 30).map(session => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        selected={session.id === newSessionId}
                        onClick={() => {
                          setNewSessionId(session.id);
                          setSelectedSeats([]);
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-5">
                  {newSession && newHall && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-medium text-gray-800 mb-3">选择新座位</h4>
                      <SeatMap
                        seats={newHall.seats}
                        rows={newHall.rows}
                        cols={newHall.cols}
                        seatStatus={newSession.seatStatus}
                        selectedSeats={selectedSeats}
                        onSeatClick={(seatId) => setSelectedSeats(prev =>
                          prev.includes(seatId) ? prev.filter(id => id !== seatId) : [...prev, seatId]
                        )}
                        showLegend={false}
                      />
                      <p className="text-xs text-gray-500 mt-3">
                        已选 {selectedSeats.length}/{changeOrderData.tickets.length} 个座位（建议保持数量一致）
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
                    <div className="text-sm font-medium text-gray-700">改签对比</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">原价合计</span>
                      <span className="text-gray-800">{formatPrice(originalTotal)} → {formatPrice(newOriginalTotal || originalTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">实付金额</span>
                      <span className="text-gray-800">{formatPrice(changeOrderData.finalTotal)} → {formatPrice(newPriceResult.finalTotal || changeOrderData.finalTotal)}</span>
                    </div>
                    <div className="pt-2 border-t flex justify-between items-center">
                      <span className="font-medium text-gray-700">差价</span>
                      <span className={`text-xl font-bold ${priceDifference > 0 ? 'text-red-500' : priceDifference < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                        {priceDifference > 0 ? '+' : ''}{formatPrice(priceDifference)}
                      </span>
                    </div>
                    {priceDifference > 0 && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        需补收差价 {formatPrice(priceDifference)}
                      </p>
                    )}
                    {priceDifference < 0 && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        需退还差价 {formatPrice(Math.abs(priceDifference))}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">改签原因</label>
                    <select
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">请选择原因</option>
                      <option value="时间冲突">时间冲突</option>
                      <option value="更换影片">更换影片</option>
                      <option value="更换座位">更换座位</option>
                      <option value="同行人数变化">同行人数变化</option>
                      <option value="其他原因">其他原因</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowChangeModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleChangeSubmit}
                disabled={!newSession || selectedSeats.length === 0 || !changeReason}
                className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                确认改签
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
