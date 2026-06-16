import React, { useState, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Play, Calendar, RefreshCw,
  Users, Building2, Film, MapPin, Clock, AlertTriangle, CheckCircle, Eye, SkipForward
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { SeatMap } from '@/components/SeatMap';
import { generateSessionsFromRule, formatDate, getWeekDayNames } from '@/utils/cycleGenerator';
import type { CycleRule, CycleUnit } from '@/types';
import type { CycleGenerateResult } from '@/utils/cycleGenerator';
import { generateId } from '@/data/mockData';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameMonth, isBefore, isAfter, startOfDay, addDays
} from 'date-fns';

export const CycleRulePage: React.FC = () => {
  const {
    cycleRules, halls, movies, privateCustomers, sessions,
    addCycleRule, updateCycleRule, deleteCycleRule, batchAddSessions,
    lastGenerateResults, saveGenerateResult
  } = useAppStore();

  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingRule, setEditingRule] = useState<CycleRule | null>(null);
  const [selectedRuleForGenerate, setSelectedRuleForGenerate] = useState<CycleRule | null>(null);
  const [generateResult, setGenerateResult] = useState<{
    total: number;
    skipped: string[];
    matched: string[];
    intervalSkipped: string[];
  } | null>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyRuleId, setHistoryRuleId] = useState<string | null>(null);
  const [calendarViewMonth, setCalendarViewMonth] = useState<Date>(new Date());

  const emptyForm: Omit<CycleRule, 'id' | 'createdAt'> = {
    name: '',
    customerId: '',
    customerName: '',
    hallId: '',
    hallName: '',
    movieId: '',
    movieTitle: '',
    basePrice: 50,
    cycleUnit: 'week',
    cycleInterval: 1,
    weekDays: [6],
    startTime: '14:00',
    endTime: '17:00',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 90 * 24 * 3600 * 1000), 'yyyy-MM-dd'),
    seatIds: [],
    isActive: true
  };

  const [formData, setFormData] = useState<Omit<CycleRule, 'id' | 'createdAt'>>(emptyForm);
  const [selectedHallIdForSeats, setSelectedHallIdForSeats] = useState<string>('');

  const selectedHall = halls.find(h => h.id === (selectedHallIdForSeats || formData.hallId));

  const handleOpenNew = () => {
    setEditingRule(null);
    setFormData(emptyForm);
    setSelectedHallIdForSeats(halls[0]?.id || '');
    setShowModal(true);
  };

  const handleOpenEdit = (rule: CycleRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      customerId: rule.customerId,
      customerName: rule.customerName,
      hallId: rule.hallId,
      hallName: rule.hallName,
      movieId: rule.movieId,
      movieTitle: rule.movieTitle,
      basePrice: rule.basePrice,
      cycleUnit: rule.cycleUnit,
      cycleInterval: rule.cycleInterval,
      weekDays: rule.weekDays,
      startTime: rule.startTime,
      endTime: rule.endTime,
      startDate: rule.startDate,
      endDate: rule.endDate,
      seatIds: rule.seatIds,
      isActive: rule.isActive
    });
    setSelectedHallIdForSeats(rule.hallId);
    setShowModal(true);
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = privateCustomers.find(c => c.id === customerId);
    setFormData(prev => ({
      ...prev,
      customerId,
      customerName: customer?.name || ''
    }));
  };

  const handleHallChange = (hallId: string) => {
    const hall = halls.find(h => h.id === hallId);
    setFormData(prev => ({ ...prev, hallId, hallName: hall?.name || '', seatIds: [] }));
    setSelectedHallIdForSeats(hallId);
  };

  const handleMovieChange = (movieId: string) => {
    const movie = movies.find(m => m.id === movieId);
    setFormData(prev => ({ ...prev, movieId, movieTitle: movie?.title || '' }));
  };

  const toggleWeekDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      weekDays: prev.weekDays?.includes(day)
        ? prev.weekDays.filter(d => d !== day)
        : [...(prev.weekDays || []), day]
    }));
  };

  const toggleSeat = (seatId: string) => {
    setFormData(prev => ({
      ...prev,
      seatIds: prev.seatIds.includes(seatId)
        ? prev.seatIds.filter(id => id !== seatId)
        : [...prev.seatIds, seatId]
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.customerId || !formData.hallId || !formData.movieId) return;

    if (editingRule) {
      updateCycleRule({ ...editingRule, ...formData });
    } else {
      const newRule: CycleRule = {
        ...formData,
        id: generateId('rule'),
        createdAt: new Date().toISOString()
      };
      addCycleRule(newRule);
    }
    setShowModal(false);
  };

  const handleGenerate = (rule: CycleRule) => {
    const hall = halls.find(h => h.id === rule.hallId);
    if (!hall) return;

    const result = generateSessionsFromRule(rule, hall, sessions);
    setSelectedRuleForGenerate(rule);
    setGenerateResult({
      total: result.totalGenerated,
      skipped: result.skippedDates,
      matched: result.matchedDates,
      intervalSkipped: result.intervalSkippedDates
    });
    setCalendarViewMonth(new Date(rule.startDate + 'T00:00:00'));
    setShowPreview(true);

    if (result.totalGenerated > 0) {
      batchAddSessions(result.sessions);
    }
    saveGenerateResult(rule.id, result, rule.name);
  };

  const handleViewHistory = (ruleId: string) => {
    setHistoryRuleId(ruleId);
    const entry = lastGenerateResults[ruleId];
    if (entry) {
      setCalendarViewMonth(new Date(entry.result.matchedDates[0] || Date.now()));
    }
    setShowHistoryModal(true);
  };

  const weekDayOptions = [
    { value: 0, label: '日' },
    { value: 1, label: '一' },
    { value: 2, label: '二' },
    { value: 3, label: '三' },
    { value: 4, label: '四' },
    { value: 5, label: '五' },
    { value: 6, label: '六' },
  ];

  const getDateColor = (dateStr: string, data: { matched: string[]; skipped: string[]; intervalSkipped: string[] }) => {
    if (data.skipped.includes(dateStr)) return 'conflict';
    if (data.matched.includes(dateStr)) return 'generated';
    if (data.intervalSkipped.includes(dateStr)) return 'interval-skip';
    return 'none';
  };

  const renderCalendar = (
    monthDate: Date,
    data: { matched: string[]; skipped: string[]; intervalSkipped: string[] },
    ruleStartDate: string,
    ruleEndDate: string
  ) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = getDay(monthStart);
    const ruleStart = startOfDay(new Date(ruleStartDate + 'T00:00:00'));
    const ruleEnd = startOfDay(new Date(ruleEndDate + 'T00:00:00'));

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCalendarViewMonth(addDays(monthStart, -1))}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            ←
          </button>
          <span className="font-medium text-gray-800">{format(monthDate, 'yyyy年MM月')}</span>
          <button
            onClick={() => setCalendarViewMonth(addDays(monthEnd, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <div key={d} className="text-xs text-gray-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const inRange = !isBefore(day, ruleStart) && !isAfter(day, ruleEnd);
            const colorType = inRange ? getDateColor(dateStr, data) : 'none';
            return (
              <div
                key={dateStr}
                className={`
                  relative text-center py-1.5 rounded-lg text-xs font-medium
                  ${!inRange ? 'text-gray-300' : ''}
                  ${colorType === 'generated' ? 'bg-green-100 text-green-700' : ''}
                  ${colorType === 'conflict' ? 'bg-amber-100 text-amber-700 line-through' : ''}
                  ${colorType === 'interval-skip' ? 'bg-gray-100 text-gray-400' : ''}
                  ${colorType === 'none' && inRange ? 'text-gray-500' : ''}
                `}
                title={
                  colorType === 'generated' ? '已生成场次' :
                  colorType === 'conflict' ? '冲突跳过' :
                  colorType === 'interval-skip' ? '间隔未排' : ''
                }
              >
                {format(day, 'd')}
                {colorType === 'interval-skip' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gray-300 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">周期规则管理</h1>
          <p className="text-gray-500">管理固定包场客户的周期占用规则，批量生成未来场次</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          新建规则
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {cycleRules.map(rule => {
          const relatedSessions = sessions.filter(s => s.generatedFromRuleId === rule.id);
          const hasHistory = !!lastGenerateResults[rule.id];
          return (
            <div key={rule.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">{rule.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {rule.customerName}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {rule.isActive ? '启用中' : '已停用'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Film className="w-4 h-4 text-gray-400" />
                    <span>{rule.movieTitle}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{rule.hallName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{rule.startTime} - {rule.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{rule.startDate} 至 {rule.endDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                    <span>
                      每{rule.cycleInterval}{rule.cycleUnit === 'day' ? '天' : rule.cycleUnit === 'week' ? '周' : '月'}
                      {rule.cycleUnit === 'week' && rule.weekDays ? ` · ${getWeekDayNames(rule.weekDays)}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>占用 {rule.seatIds.length} 个座位</span>
                    <span className="text-amber-600 font-medium">¥{rule.basePrice}/座</span>
                  </div>
                </div>

                {relatedSessions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      已生成 <span className="text-blue-600 font-medium">{relatedSessions.length}</span> 场占用
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 flex gap-2">
                <button
                  onClick={() => handleGenerate(rule)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  <Play className="w-4 h-4" />
                  批量生成
                </button>
                {hasHistory && (
                  <button
                    onClick={() => handleViewHistory(rule.id)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    title="查看最近生成明细"
                  >
                    <Eye className="w-4 h-4 text-blue-500" />
                  </button>
                )}
                <button
                  onClick={() => handleOpenEdit(rule)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('确定删除该规则吗？')) deleteCycleRule(rule.id);
                  }}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          );
        })}

        {cycleRules.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-xl">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">暂无周期规则</p>
            <p className="text-sm mt-1">点击右上角按钮新建规则</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {editingRule ? '编辑周期规则' : '新建周期规则'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">规则名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="如：XX公司每周六下午包场"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">包场客户</label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">请选择客户</option>
                    {privateCustomers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({(c.discountRate * 10).toFixed(1)}折)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">影厅</label>
                  <select
                    value={formData.hallId}
                    onChange={(e) => handleHallChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">请选择影厅</option>
                    {halls.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">影片</label>
                  <select
                    value={formData.movieId}
                    onChange={(e) => handleMovieChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">请选择影片</option>
                    {movies.map(m => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">票价（元/座）</label>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, basePrice: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                <div className="text-sm font-medium text-gray-700">周期设置</div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">周期单位</label>
                    <select
                      value={formData.cycleUnit}
                      onChange={(e) => setFormData(prev => ({ ...prev, cycleUnit: e.target.value as CycleUnit }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="day">天</option>
                      <option value="week">周</option>
                      <option value="month">月</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">间隔</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.cycleInterval}
                      onChange={(e) => setFormData(prev => ({ ...prev, cycleInterval: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">是否启用</label>
                    <div className="flex items-center h-[38px]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="w-4 h-4 text-blue-500 rounded"
                        />
                        <span className="text-sm text-gray-700">启用</span>
                      </label>
                    </div>
                  </div>
                </div>

                {formData.cycleUnit === 'week' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">选择星期</label>
                    <div className="flex gap-2">
                      {weekDayOptions.map(day => (
                        <button
                          key={day.value}
                          onClick={() => toggleWeekDay(day.value)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                            formData.weekDays?.includes(day.value)
                              ? 'bg-blue-500 text-white'
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">开始日期</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">结束日期</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">开始时间</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">结束时间</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {selectedHall && (
                <div className="p-4 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-gray-700">
                      选择包场占用座位 <span className="text-blue-600">({formData.seatIds.length}/{selectedHall.seats.length})</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, seatIds: selectedHall.seats.map(s => s.id) }))}
                        className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                      >
                        全选
                      </button>
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, seatIds: [] }))}
                        className="text-xs px-3 py-1 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                      >
                        清空
                      </button>
                    </div>
                  </div>
                  <SeatMap
                    seats={selectedHall.seats}
                    rows={selectedHall.rows}
                    cols={selectedHall.cols}
                    selectedSeats={formData.seatIds}
                    onSeatClick={toggleSeat}
                    showLegend={false}
                  />
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.customerId || !formData.hallId || !formData.movieId || formData.seatIds.length === 0}
                className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {editingRule ? '保存修改' : '创建规则'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && selectedRuleForGenerate && generateResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
            {generateResult.total > 0 ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">生成成功</h3>
                    <p className="text-sm text-gray-500">{selectedRuleForGenerate.name}</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl space-y-3 mb-4 flex-shrink-0">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">规则匹配日期</span>
                    <span className="font-bold text-blue-600">{generateResult.matched.length} 个</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">成功生成场次</span>
                    <span className="font-bold text-green-600">{generateResult.total} 场</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">冲突跳过日期</span>
                    <span className="font-bold text-amber-600">{generateResult.skipped.length} 个</span>
                  </div>
                  {generateResult.intervalSkipped.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-1">
                        <SkipForward className="w-3.5 h-3.5" />
                        间隔未排日期
                      </span>
                      <span className="font-bold text-gray-500">{generateResult.intervalSkipped.length} 个</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mb-4 text-xs flex-shrink-0">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> 生成成功</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> 冲突跳过</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" /> 间隔未排</span>
                </div>

                <div className="flex-1 overflow-y-auto mb-4">
                  {renderCalendar(
                    calendarViewMonth,
                    generateResult,
                    selectedRuleForGenerate.startDate,
                    selectedRuleForGenerate.endDate
                  )}
                </div>

                {generateResult.intervalSkipped.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-xl mb-4 flex-shrink-0">
                    <div className="flex items-start gap-2 text-sm">
                      <SkipForward className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-gray-600 font-medium mb-1">因每{selectedRuleForGenerate.cycleInterval}{selectedRuleForGenerate.cycleUnit === 'week' ? '周' : selectedRuleForGenerate.cycleUnit === 'month' ? '月' : '天'}间隔未排的日期：</div>
                        <div className="flex flex-wrap gap-1">
                          {generateResult.intervalSkipped.slice(0, 30).map(d => (
                            <span key={d} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">{d}</span>
                          ))}
                          {generateResult.intervalSkipped.length > 30 && (
                            <span className="px-2 py-0.5 text-gray-400 text-xs">...等{generateResult.intervalSkipped.length}个</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">未生成场次</h3>
                    <p className="text-sm text-gray-500">{selectedRuleForGenerate.name}</p>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl mb-4 text-sm text-amber-700">
                  {generateResult.skipped.length > 0
                    ? `所有${generateResult.skipped.length}个匹配日期均与现有场次冲突`
                    : '在指定日期范围内没有匹配规则的日期，请检查周期设置。'}
                </div>
              </>
            )}
            <button
              onClick={() => {
                setShowPreview(false);
                setSelectedRuleForGenerate(null);
                setGenerateResult(null);
              }}
              className="w-full py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex-shrink-0"
            >
              确定
            </button>
          </div>
        </div>
      )}

      {showHistoryModal && historyRuleId && lastGenerateResults[historyRuleId] && (() => {
        const entry = lastGenerateResults[historyRuleId];
        const rule = cycleRules.find(r => r.id === historyRuleId);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">最近生成明细</h3>
                  <p className="text-sm text-gray-500">{entry.ruleName} · {format(new Date(entry.generatedAt), 'yyyy-MM-dd HH:mm')}</p>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl space-y-2 mb-4 text-sm flex-shrink-0">
                <div className="flex justify-between">
                  <span className="text-gray-600">匹配日期</span>
                  <span className="font-bold text-blue-600">{entry.result.matchedDates.length} 个</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">成功生成</span>
                  <span className="font-bold text-green-600">{entry.result.totalGenerated} 场</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">冲突跳过</span>
                  <span className="font-bold text-amber-600">{entry.result.skippedDates.length} 个</span>
                </div>
                {entry.result.intervalSkippedDates.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">间隔未排</span>
                    <span className="font-bold text-gray-500">{entry.result.intervalSkippedDates.length} 个</span>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mb-4 text-xs flex-shrink-0">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> 生成成功</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> 冲突跳过</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" /> 间隔未排</span>
              </div>

              <div className="flex-1 overflow-y-auto mb-4">
                {rule && renderCalendar(
                  calendarViewMonth,
                  {
                    matched: entry.result.matchedDates,
                    skipped: entry.result.skippedDates,
                    intervalSkipped: entry.result.intervalSkippedDates
                  },
                  rule.startDate,
                  rule.endDate
                )}
              </div>

              {entry.result.intervalSkippedDates.length > 0 && rule && (
                <div className="p-3 bg-gray-50 rounded-xl mb-4 flex-shrink-0">
                  <div className="flex items-start gap-2 text-sm">
                    <SkipForward className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-gray-600 font-medium mb-1">因每{rule.cycleInterval}{rule.cycleUnit === 'week' ? '周' : rule.cycleUnit === 'month' ? '月' : '天'}间隔未排的日期：</div>
                      <div className="flex flex-wrap gap-1">
                        {entry.result.intervalSkippedDates.slice(0, 30).map((d: string) => (
                          <span key={d} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">{d}</span>
                        ))}
                        {entry.result.intervalSkippedDates.length > 30 && (
                          <span className="px-2 py-0.5 text-gray-400 text-xs">...等{entry.result.intervalSkippedDates.length}个</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex-shrink-0"
              >
                关闭
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
