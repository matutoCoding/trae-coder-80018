import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Search, Ticket, BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { SeatMap } from '@/components/SeatMap';
import { SessionCard } from '@/components/SessionCard';
import { formatDate, formatDateTime } from '@/utils/cycleGenerator';
import { addDays, format, isSameDay, isWithinInterval, startOfDay, subDays } from 'date-fns';
import { calculatePrice, formatPrice, getDefaultDiscountOrder } from '@/utils/priceCalculator';
import type { OrderTicket } from '@/types';
import { generateId, generateOrderNo } from '@/data/mockData';

export const SeatBookingPage: React.FC = () => {
  const {
    halls, sessions, movies, members, discounts,
    currentHallId, setCurrentHall,
    currentSessionId, setCurrentSession,
    addOrder, updateSessionSeatStatus,
    orders, refundRecords, changeRecords
  } = useAppStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardHallFilter, setDashboardHallFilter] = useState<string>('');

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const sessionDate = new Date(s.startTime);
      const matchDate = isSameDay(sessionDate, selectedDate);
      const matchHall = currentHallId ? s.hallId === currentHallId : true;
      return matchDate && matchHall;
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [sessions, selectedDate, currentHallId]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || filteredSessions[0];
  const currentHall = halls.find(h => h.id === currentSession?.hallId) || halls.find(h => h.id === currentHallId) || halls[0];

  const selectedSeatDetails = useMemo(() => {
    if (!currentHall || !currentSession) return [];
    return selectedSeats.map(seatId => {
      const seat = currentHall.seats.find(s => s.id === seatId);
      const price = seat ? Math.max(seat.basePrice, currentSession.basePrice) : currentSession.basePrice;
      return { seat, price };
    }).filter(x => x.seat);
  }, [selectedSeats, currentHall, currentSession]);

  const originalTotal = selectedSeatDetails.reduce((sum, x) => sum + x.price, 0);
  const selectedMember = members.find(m => m.id === selectedMemberId);
  const discountOrder = getDefaultDiscountOrder(discounts);

  const priceResult = useMemo(() => {
    if (!currentSession || selectedSeats.length === 0) {
      return { finalTotal: 0, appliedDiscounts: [], breakdown: [], hasNegativeProtection: false };
    }
    return calculatePrice({
      originalTotal,
      discounts,
      member: selectedMember,
      session: currentSession,
      ticketCount: selectedSeats.length,
      discountOrder
    });
  }, [originalTotal, discounts, selectedMember, currentSession, selectedSeats.length, discountOrder]);

  const handleSeatClick = (seatId: string) => {
    setSelectedSeats(prev =>
      prev.includes(seatId)
        ? prev.filter(id => id !== seatId)
        : [...prev, seatId]
    );
  };

  const handleSubmitBooking = () => {
    if (!customerName || !customerPhone || selectedSeats.length === 0 || !currentSession) return;

    const tickets: OrderTicket[] = selectedSeatDetails.map(({ seat, price }) => ({
      sessionId: currentSession.id,
      seatId: seat!.id,
      seatLabel: seat!.label,
      originalPrice: price,
      finalPrice: priceResult.finalTotal / selectedSeats.length
    }));

    const newOrder = {
      id: generateId('order'),
      orderNo: generateOrderNo(),
      customerName,
      customerPhone,
      memberId: selectedMemberId,
      memberName: selectedMember?.name,
      tickets,
      originalTotal,
      finalTotal: priceResult.finalTotal,
      appliedDiscounts: priceResult.appliedDiscounts,
      status: 'paid' as const,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString()
    };

    addOrder(newOrder);

    selectedSeats.forEach(seatId => {
      updateSessionSeatStatus(currentSession.id, seatId, 'occupied', customerName);
    });

    setShowBookingModal(false);
    setShowSuccess(true);
    setSelectedSeats([]);
    setCustomerName('');
    setCustomerPhone('');
    setSelectedMemberId(undefined);

    setTimeout(() => setShowSuccess(false), 3000);
  };

  const dateButtons = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  const dashboardData = useMemo(() => {
    const rangeStart = startOfDay(selectedDate);
    const rangeEnd = addDays(rangeStart, 6);
    const dateRange = Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i));

    const rangeSessions = sessions.filter(s => {
      const d = new Date(s.startTime);
      const inRange = isWithinInterval(d, { start: rangeStart, end: addDays(rangeEnd, 1) });
      const hallMatch = !dashboardHallFilter || s.hallId === dashboardHallFilter;
      return inRange && hallMatch;
    });

    const totalSeats = rangeSessions.reduce((sum, s) => {
      return sum + Object.keys(s.seatStatus).length;
    }, 0);
    const occupiedSeats = rangeSessions.reduce((sum, s) => {
      return sum + Object.values(s.seatStatus).filter(st => st === 'occupied' || st === 'booked-private').length;
    }, 0);
    const occupancyRate = totalSeats > 0 ? (occupiedSeats / totalSeats * 100) : 0;

    const sessionIds = new Set(rangeSessions.map(s => s.id));
    const rangeOrders = orders.filter(o =>
      o.status === 'paid' &&
      o.tickets.some(t => sessionIds.has(t.sessionId))
    );
    const salesAmount = rangeOrders.reduce((sum, o) => sum + o.finalTotal, 0);

    const rangeRefunds = refundRecords.filter(r => {
      const d = new Date(r.createdAt);
      return isWithinInterval(d, { start: rangeStart, end: addDays(rangeEnd, 1) });
    });
    const refundAmount = rangeRefunds.reduce((sum, r) => sum + r.refundAmount, 0);

    const rangeChanges = changeRecords.filter(r => {
      const d = new Date(r.createdAt);
      return isWithinInterval(d, { start: rangeStart, end: addDays(rangeEnd, 1) });
    });
    const changeDiff = rangeChanges.reduce((sum, r) => sum + r.priceDifference, 0);

    const dailyData = dateRange.map(date => {
      const dayStr = format(date, 'yyyy-MM-dd');
      const daySessions = rangeSessions.filter(s => format(new Date(s.startTime), 'yyyy-MM-dd') === dayStr);
      const dayTotalSeats = daySessions.reduce((sum, s) => sum + Object.keys(s.seatStatus).length, 0);
      const dayOccupied = daySessions.reduce((sum, s) => sum + Object.values(s.seatStatus).filter(st => st === 'occupied' || st === 'booked-private').length, 0);
      const daySessionIds = new Set(daySessions.map(s => s.id));
      const dayOrders = orders.filter(o => o.status === 'paid' && o.tickets.some(t => daySessionIds.has(t.sessionId)));
      const daySales = dayOrders.reduce((sum, o) => sum + o.finalTotal, 0);
      return {
        date: dayStr,
        label: format(date, 'MM/dd EEE'),
        sessions: daySessions.length,
        totalSeats: dayTotalSeats,
        occupied: dayOccupied,
        rate: dayTotalSeats > 0 ? (dayOccupied / dayTotalSeats * 100) : 0,
        sales: daySales
      };
    });

    return {
      sessions: rangeSessions.length,
      totalSeats,
      occupiedSeats,
      occupancyRate,
      salesAmount,
      refundAmount,
      changeDiff,
      dailyData
    };
  }, [selectedDate, dashboardHallFilter, sessions, orders, refundRecords, changeRecords]);

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">选座购票</h1>
            <p className="text-gray-500">选择影厅、场次和座位进行购票</p>
          </div>
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
              showDashboard ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            经营看板
          </button>
        </div>

        {showDashboard && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 mb-6 border border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-800">经营看板</h2>
                <span className="text-sm text-gray-500 ml-2">
                  {format(selectedDate, 'MM/dd')} ~ {format(addDays(selectedDate, 6), 'MM/dd')}
                </span>
              </div>
              <select
                value={dashboardHallFilter}
                onChange={(e) => setDashboardHallFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
              >
                <option value="">全部影厅</option>
                {halls.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  上座率
                </div>
                <div className="text-xl font-bold text-indigo-600">{dashboardData.occupancyRate.toFixed(1)}%</div>
                <div className="text-xs text-gray-400 mt-0.5">{dashboardData.occupiedSeats}/{dashboardData.totalSeats}座</div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  售票金额
                </div>
                <div className="text-xl font-bold text-green-600">{formatPrice(dashboardData.salesAmount)}</div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Ticket className="w-3.5 h-3.5" />
                  场次
                </div>
                <div className="text-xl font-bold text-blue-600">{dashboardData.sessions}</div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Users className="w-3.5 h-3.5" />
                  退票金额
                </div>
                <div className="text-xl font-bold text-amber-600">{formatPrice(dashboardData.refundAmount)}</div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  改签差价
                </div>
                <div className={`text-xl font-bold ${dashboardData.changeDiff >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {dashboardData.changeDiff >= 0 ? '+' : ''}{formatPrice(dashboardData.changeDiff)}
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  净收入
                </div>
                <div className="text-xl font-bold text-gray-800">
                  {formatPrice(dashboardData.salesAmount - dashboardData.refundAmount + dashboardData.changeDiff)}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-700 mb-3">每日明细</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left text-xs text-gray-500 font-medium">日期</th>
                      <th className="pb-2 text-center text-xs text-gray-500 font-medium">场次</th>
                      <th className="pb-2 text-center text-xs text-gray-500 font-medium">总座位</th>
                      <th className="pb-2 text-center text-xs text-gray-500 font-medium">已售</th>
                      <th className="pb-2 text-center text-xs text-gray-500 font-medium">上座率</th>
                      <th className="pb-2 text-right text-xs text-gray-500 font-medium">售票额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.dailyData.map(d => (
                      <tr key={d.date} className="border-b border-gray-50">
                        <td className="py-2 text-gray-800 font-medium">{d.label}</td>
                        <td className="py-2 text-center text-gray-600">{d.sessions}</td>
                        <td className="py-2 text-center text-gray-600">{d.totalSeats}</td>
                        <td className="py-2 text-center text-gray-800 font-medium">{d.occupied}</td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            d.rate >= 60 ? 'bg-green-100 text-green-700' :
                            d.rate >= 30 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {d.rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 text-right font-medium text-green-600">{formatPrice(d.sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">选择影厅</label>
              <select
                value={currentHallId || ''}
                onChange={(e) => {
                  setCurrentHall(e.target.value);
                  setCurrentSession(null);
                  setSelectedSeats([]);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">全部影厅</option>
                {halls.map(hall => (
                  <option key={hall.id} value={hall.id}>{hall.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">选择日期</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dateButtons.map(date => (
                <button
                  key={date.toISOString()}
                  onClick={() => {
                    setSelectedDate(date);
                    setCurrentSession(null);
                    setSelectedSeats([]);
                  }}
                  className={`
                    flex-shrink-0 px-4 py-2 rounded-lg border transition-all
                    ${isSameDay(date, selectedDate)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                    }
                  `}
                >
                  <div className="text-xs opacity-75">{format(date, 'EEE')}</div>
                  <div className="text-sm font-medium">{format(date, 'MM/dd')}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            场次列表 <span className="text-sm font-normal text-gray-500">({filteredSessions.length}场)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                selected={session.id === currentSessionId}
                onClick={() => {
                  setCurrentSession(session.id);
                  setSelectedSeats([]);
                }}
              />
            ))}
            {filteredSessions.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-xl">
                当日暂无场次安排
              </div>
            )}
          </div>
        </div>

        {currentSession && currentHall && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">座位图</h3>
                <p className="text-sm text-gray-500">
                  {currentSession.movieTitle} | {formatDateTime(currentSession.startTime)}
                </p>
              </div>
              {currentSession.isPrivateBooking && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  包场：{currentSession.privateCustomerName}
                </span>
              )}
            </div>
            <SeatMap
              seats={currentHall.seats}
              rows={currentHall.rows}
              cols={currentHall.cols}
              seatStatus={currentSession.seatStatus}
              selectedSeats={selectedSeats}
              onSeatClick={handleSeatClick}
            />
          </div>
        )}
      </div>

      <div className="w-96 border-l border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-5 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-blue-500" />
            订单信息
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {selectedSeats.length > 0 ? (
            <>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-sm font-medium text-gray-700 mb-3">已选座位 ({selectedSeats.length})</div>
                <div className="flex flex-wrap gap-2">
                  {selectedSeatDetails.map(({ seat, price }) => (
                    <div key={seat!.id} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                      {seat!.label} <span className="text-xs text-gray-500">¥{price}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                <div className="text-sm font-medium text-gray-700">顾客信息</div>
                <input
                  type="text"
                  placeholder="姓名"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="tel"
                  placeholder="手机号"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  value={selectedMemberId || ''}
                  onChange={(e) => setSelectedMemberId(e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">非会员</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} - {{ normal: '普通', silver: '银卡', gold: '金卡', diamond: '钻石' }[m.level]}会员 ({(m.discountRate * 10).toFixed(1)}折)
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                <div className="text-sm font-medium text-gray-700 mb-2">价格明细</div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>原价合计</span>
                  <span>{formatPrice(originalTotal)}</span>
                </div>
                {priceResult.breakdown.map((step, idx) => (
                  <div key={idx} className="flex justify-between text-sm text-green-600">
                    <span>{step.discountName}</span>
                    <span>-{formatPrice(step.saved)}</span>
                  </div>
                ))}
                {priceResult.hasNegativeProtection && (
                  <div className="flex justify-between text-sm text-amber-600 font-medium">
                    <span>负值兜底保护</span>
                    <span>已启用</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-100 flex justify-between">
                  <span className="font-medium text-gray-800">实付金额</span>
                  <span className="text-xl font-bold text-red-500">{formatPrice(priceResult.finalTotal)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>请先选择场次和座位</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-200 bg-white">
          <button
            onClick={() => setShowBookingModal(true)}
            disabled={selectedSeats.length === 0 || !customerName || !customerPhone}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
          >
            {selectedSeats.length > 0 ? `确认购买 (${formatPrice(priceResult.finalTotal)})` : '请选择座位'}
          </button>
        </div>
      </div>

      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[480px] max-w-[90vw] shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">确认订单</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">场次</span>
                <span className="text-gray-800">{currentSession?.movieTitle}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">时间</span>
                <span className="text-gray-800">{currentSession && formatDateTime(currentSession.startTime)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">座位</span>
                <span className="text-gray-800">{selectedSeatDetails.map(x => x.seat!.label).join('、')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">顾客</span>
                <span className="text-gray-800">{customerName} ({customerPhone})</span>
              </div>
              <div className="pt-3 border-t flex justify-between">
                <span className="font-medium">应付金额</span>
                <span className="text-2xl font-bold text-red-500">{formatPrice(priceResult.finalTotal)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmitBooking}
                className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
              >
                确认支付
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-bounce">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          购票成功！
        </div>
      )}
    </div>
  );
};
