import React, { useState, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Percent, Ticket, Calculator,
  GripVertical, ChevronDown, ChevronUp, Shield, Users, Play, ArrowDownUp
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { calculatePrice, formatPrice, getDefaultDiscountOrder } from '@/utils/priceCalculator';
import type { Discount, DiscountType } from '@/types';
import { generateId } from '@/data/mockData';

const discountTypeLabels: Record<DiscountType, string> = {
  'percentage': '折扣券',
  'fixed': '立减券',
  'full-reduction': '满减券',
  'member-discount': '会员折扣'
};

const discountTypeColors: Record<DiscountType, string> = {
  'percentage': 'bg-purple-100 text-purple-700',
  'fixed': 'bg-orange-100 text-orange-700',
  'full-reduction': 'bg-red-100 text-red-700',
  'member-discount': 'bg-emerald-100 text-emerald-700'
};

export const DiscountPage: React.FC = () => {
  const { discounts, members, sessions, addDiscount, updateDiscount, deleteDiscount } = useAppStore();

  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  const [discountOrder, setDiscountOrder] = useState<string[]>(() => {
    return getDefaultDiscountOrder(discounts);
  });

  const [showCalculator, setShowCalculator] = useState(true);
  const [calcOriginalTotal, setCalcOriginalTotal] = useState(300);
  const [calcTicketCount, setCalcTicketCount] = useState(4);
  const [calcMemberId, setCalcMemberId] = useState<string | undefined>(members[0]?.id);
  const [calcSessionType, setCalcSessionType] = useState<'morning' | 'normal'>('morning');

  const calcSession = useMemo(() => {
    if (calcSessionType === 'morning') {
      return sessions.find(s => s.type === 'morning' || new Date(s.startTime).getHours() < 12);
    }
    return sessions.find(s => s.type !== 'morning' && new Date(s.startTime).getHours() >= 12);
  }, [calcSessionType, sessions]);

  const emptyForm: Omit<Discount, 'id'> = {
    name: '',
    type: 'percentage',
    value: 0,
    minAmount: 0,
    maxDiscount: undefined,
    applicableScope: 'all',
    priority: discounts.length + 1,
    isStackable: true,
    isActive: true,
    description: ''
  };

  const [formData, setFormData] = useState<Omit<Discount, 'id'>>(emptyForm);

  const activeDiscounts = useMemo(() => discounts.filter(d => d.isActive), [discounts]);
  const calcMember = members.find(m => m.id === calcMemberId);

  const priceResult = useMemo(() => calculatePrice({
    originalTotal: calcOriginalTotal,
    discounts: activeDiscounts,
    member: calcMember,
    session: calcSession,
    ticketCount: calcTicketCount,
    discountOrder
  }), [calcOriginalTotal, activeDiscounts, calcMember, calcSession, calcTicketCount, discountOrder]);

  const handleOpenNew = () => {
    setEditingDiscount(null);
    setFormData({ ...emptyForm, priority: discounts.length + 1 });
    setShowModal(true);
  };

  const handleOpenEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      type: discount.type,
      value: discount.value,
      minAmount: discount.minAmount,
      maxDiscount: discount.maxDiscount,
      applicableScope: discount.applicableScope,
      priority: discount.priority,
      isStackable: discount.isStackable,
      isActive: discount.isActive,
      description: discount.description,
      startDate: discount.startDate,
      endDate: discount.endDate
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.name) return;

    if (editingDiscount) {
      updateDiscount({ ...editingDiscount, ...formData });
    } else {
      const newDiscount: Discount = {
        ...formData,
        id: generateId('disc')
      };
      addDiscount(newDiscount);
      setDiscountOrder(prev => [...prev, newDiscount.id]);
    }
    setShowModal(false);
  };

  const moveDiscount = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...discountOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setDiscountOrder(newOrder);

    newOrder.forEach((id, i) => {
      const d = discounts.find(x => x.id === id);
      if (d && d.priority !== i) {
        updateDiscount({ ...d, priority: i });
      }
    });
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">优惠管理</h1>
          <p className="text-gray-500">配置折扣券、满减券、会员折扣，调整计算顺序，负值自动兜底</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
              showCalculator ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calculator className="w-4 h-4" />
            价格计算器
          </button>
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            新增优惠
          </button>
        </div>
      </div>

      {showCalculator && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-100">
          <div className="flex items-center gap-2 mb-5">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">实时价格计算器</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">原始金额（元）</label>
                <input
                  type="number"
                  value={calcOriginalTotal}
                  onChange={(e) => setCalcOriginalTotal(Number(e.target.value))}
                  min={0}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">购票数量</label>
                <input
                  type="number"
                  value={calcTicketCount}
                  onChange={(e) => setCalcTicketCount(Number(e.target.value))}
                  min={1}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">选择会员</label>
                <select
                  value={calcMemberId || ''}
                  onChange={(e) => setCalcMemberId(e.target.value || undefined)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">非会员</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} - {{ normal: '普通', silver: '银卡', gold: '金卡', diamond: '钻石' }[m.level]} ({(m.discountRate * 10).toFixed(1)}折)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">场次类型</label>
                <select
                  value={calcSessionType}
                  onChange={(e) => setCalcSessionType(e.target.value as 'morning' | 'normal')}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="morning">早场（12点前）— 可享早场立减</option>
                  <option value="normal">普通场次（12点后）— 不享早场立减</option>
                </select>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 h-full">
                <div className="text-sm text-gray-500 mb-4 flex items-center gap-1.5">
                  <ArrowDownUp className="w-4 h-4" />
                  计算过程
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <span className="text-sm text-gray-600">原始金额</span>
                    <span className="font-medium">{formatPrice(calcOriginalTotal)}</span>
                  </div>
                  {priceResult.breakdown.map((step, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg">
                      <span className="text-sm text-gray-700 flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center">
                          {step.step}
                        </span>
                        {step.discountName}
                      </span>
                      <span className="text-green-600 font-medium text-sm">-{formatPrice(step.saved)}</span>
                    </div>
                  ))}
                  {priceResult.hasNegativeProtection && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <span className="text-sm text-amber-700 flex items-center gap-1.5">
                        <Shield className="w-4 h-4" />
                        负值兜底保护
                      </span>
                      <span className="text-amber-600 font-medium text-sm">触发</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
              <div className="text-center space-y-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">优惠金额</div>
                  <div className="text-3xl font-bold text-green-500">
                    -{formatPrice(calcOriginalTotal - priceResult.finalTotal)}
                  </div>
                </div>
                <div className="h-px bg-gray-100" />
                <div>
                  <div className="text-sm text-gray-500 mb-1">应付金额</div>
                  <div className="text-4xl font-bold text-red-500">
                    {formatPrice(priceResult.finalTotal)}
                  </div>
                </div>
                {calcOriginalTotal > 0 && (
                  <div className="text-sm text-gray-400">
                    综合折扣 {((priceResult.finalTotal / calcOriginalTotal) * 10).toFixed(1)}折
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 p-5">
        <div className="flex items-center gap-2 mb-5">
          <GripVertical className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-bold text-gray-800">优惠计算顺序（优先级）</h2>
          <span className="text-xs text-gray-500 ml-2">从上到下依次应用，顺序影响最终价格</span>
        </div>
        <div className="space-y-2">
          {discountOrder.map((id, index) => {
            const discount = discounts.find(d => d.id === id);
            if (!discount) return null;
            return (
              <div
                key={id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  discount.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${discountTypeColors[discount.type]}`}>
                    {discountTypeLabels[discount.type]}
                  </span>
                  <span className="font-medium text-gray-800">{discount.name}</span>
                  <span className="text-sm text-gray-500">
                    {discount.type === 'percentage' && `${discount.value}% OFF`}
                    {discount.type === 'fixed' && `立减 ¥${discount.value}`}
                    {discount.type === 'full-reduction' && `满¥${discount.minAmount}减¥${discount.value}`}
                    {discount.type === 'member-discount' && '按会员等级'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveDiscount(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => moveDiscount(index, 'down')}
                    disabled={index === discountOrder.length - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {discounts.map(discount => (
          <div key={discount.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 opacity-5 pointer-events-none">
              {discount.type === 'percentage' && <Percent className="w-full h-full text-purple-500" />}
              {discount.type === 'fixed' && <Ticket className="w-full h-full text-orange-500" />}
              {discount.type === 'full-reduction' && <Ticket className="w-full h-full text-red-500" />}
              {discount.type === 'member-discount' && <Users className="w-full h-full text-emerald-500" />}
            </div>

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium mb-2 ${discountTypeColors[discount.type]}`}>
                    {discountTypeLabels[discount.type]}
                  </span>
                  <h3 className="font-semibold text-gray-800 text-lg">{discount.name}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  discount.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {discount.isActive ? '启用' : '停用'}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20">优惠值</span>
                  <span className="text-gray-800 font-medium">
                    {discount.type === 'percentage' && `${discount.value}% 折扣`}
                    {discount.type === 'fixed' && `立减 ¥${discount.value}`}
                    {discount.type === 'full-reduction' && `满 ¥${discount.minAmount} 减 ¥${discount.value}`}
                    {discount.type === 'member-discount' && '根据会员等级'}
                  </span>
                </div>
                {discount.maxDiscount !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-20">最高优惠</span>
                    <span className="text-gray-800">¥{discount.maxDiscount}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20">叠加</span>
                  <span className={discount.isStackable ? 'text-green-600' : 'text-amber-600'}>
                    {discount.isStackable ? '可叠加' : '不可叠加'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20">优先级</span>
                  <span className="text-gray-800">{discount.priority}</span>
                </div>
              </div>

              {discount.description && (
                <p className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg mb-4">
                  {discount.description}
                </p>
              )}

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleOpenEdit(discount)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  编辑
                </button>
                <button
                  onClick={() => {
                    if (confirm('确定删除该优惠吗？')) {
                      deleteDiscount(discount.id);
                      setDiscountOrder(prev => prev.filter(id => id !== discount.id));
                    }
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {editingDiscount ? '编辑优惠' : '新增优惠'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">优惠名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="如：满100减20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">优惠类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as DiscountType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="percentage">折扣券（按百分比）</option>
                    <option value="fixed">立减券（固定金额）</option>
                    <option value="full-reduction">满减券</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {formData.type === 'percentage' ? '折扣百分比(%)' :
                     formData.type === 'full-reduction' ? '减免金额(元)' : '立减金额(元)'}
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {(formData.type === 'full-reduction' || formData.type === 'percentage') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">最低消费金额(元)</label>
                    <input
                      type="number"
                      value={formData.minAmount || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, minAmount: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                {formData.type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">最高优惠(元)</label>
                    <input
                      type="number"
                      value={formData.maxDiscount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxDiscount: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="不填则不限"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                {formData.type === 'fixed' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">适用范围</label>
                    <select
                      value={formData.applicableScope || 'all'}
                      onChange={(e) => setFormData(prev => ({ ...prev, applicableScope: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">全场通用</option>
                      <option value="ticket">按票数计算</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">优先级</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end gap-4 pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isStackable}
                      onChange={(e) => setFormData(prev => ({ ...prev, isStackable: e.target.checked }))}
                      className="w-4 h-4 text-blue-500 rounded"
                    />
                    <span className="text-sm text-gray-700">可叠加</span>
                  </label>
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
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">说明</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="优惠说明（可选）"
                  />
                </div>
              </div>
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
                disabled={!formData.name}
                className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {editingDiscount ? '保存修改' : '创建优惠'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
