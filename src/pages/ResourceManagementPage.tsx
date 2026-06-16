import React, { useState } from 'react';
import {
  Plus, Edit2, Trash2, Building2, Film, Users, UserCircle,
  Phone, Calendar, Percent, Shield
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import type { Hall, Movie, PrivateCustomer, Member } from '@/types';
import { generateId, generateSeats } from '@/data/mockData';

type TabKey = 'halls' | 'movies' | 'customers' | 'members';

export const ResourceManagementPage: React.FC = () => {
  const {
    halls, movies, privateCustomers, members, sessions,
    addHall, updateHall, updateHallWithSeatSync, deleteHall,
    addMovie, updateMovie, deleteMovie,
    addPrivateCustomer, updatePrivateCustomer, deletePrivateCustomer,
    addMember, updateMember, deleteMember
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabKey>('halls');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const tabs: { key: TabKey; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'halls', label: '影厅管理', icon: Building2, count: halls.length },
    { key: 'movies', label: '影片管理', icon: Film, count: movies.length },
    { key: 'customers', label: '包场客户', icon: Users, count: privateCustomers.length },
    { key: 'members', label: '会员管理', icon: UserCircle, count: members.length },
  ];

  const handleOpenNew = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setShowModal(true);
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">资源管理</h1>
          <p className="text-gray-500">管理影厅、影片、包场客户和会员信息</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          新增{tabs.find(t => t.key === activeTab)?.label.slice(0, 2)}
        </button>
      </div>

      <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === 'halls' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {halls.map(hall => (
            <div key={hall.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{hall.name}</h3>
                    <p className="text-sm text-gray-500">{hall.rows}排 × {hall.cols}座</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">座位总数</span>
                  <span className="font-medium text-gray-800">{hall.seats.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">VIP座位</span>
                  <span className="font-medium text-amber-600">{hall.seats.filter(s => s.type === 'vip').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">情侣座</span>
                  <span className="font-medium text-pink-600">{hall.seats.filter(s => s.type === 'couple').length}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleOpenEdit(hall)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  编辑
                </button>
                <button
                  onClick={() => {
                    if (confirm('确定删除该影厅吗？')) deleteHall(hall.id);
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'movies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {movies.map(movie => (
            <div key={movie.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
              <div className="h-40 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center">
                <Film className="w-16 h-16 text-white/80" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 truncate mb-1">{movie.title}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>时长 {movie.duration} 分钟</span>
                </div>
                {movie.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4">{movie.description}</p>
                )}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenEdit(movie)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs"
                  >
                    <Edit2 className="w-3 h-3" />
                    编辑
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('确定删除该影片吗？')) deleteMovie(movie.id);
                    }}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {privateCustomers.map(customer => (
            <div key={customer.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Users className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{customer.name}</h3>
                    <p className="text-sm text-gray-500">联系人：{customer.contact}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                  {(customer.discountRate * 10).toFixed(1)}折
                </span>
              </div>
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{customer.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{customer.contractStartDate} ~ {customer.contractEndDate}</span>
                </div>
              </div>
              {customer.notes && (
                <p className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg mb-4">{customer.notes}</p>
              )}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleOpenEdit(customer)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  编辑
                </button>
                <button
                  onClick={() => {
                    if (confirm('确定删除该客户吗？')) deletePrivateCustomer(customer.id);
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">会员信息</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">手机号</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">等级</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">折扣</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">积分</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">注册日期</th>
                <th className="px-5 py-3 text-right text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(member => {
                const levelColors: Record<string, string> = {
                  normal: 'bg-gray-100 text-gray-600',
                  silver: 'bg-slate-200 text-slate-700',
                  gold: 'bg-amber-100 text-amber-700',
                  diamond: 'bg-cyan-100 text-cyan-700'
                };
                const levelNames: Record<string, string> = {
                  normal: '普通会员',
                  silver: '银卡会员',
                  gold: '金卡会员',
                  diamond: '钻石会员'
                };
                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-medium">
                          {member.name[0]}
                        </div>
                        <span className="font-medium text-gray-800">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{member.phone}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${levelColors[member.level]}`}>
                        {levelNames[member.level]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-green-600">
                      {(member.discountRate * 10).toFixed(1)}折
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-800">{member.points.toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{member.joinDate}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(member)}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('确定删除该会员吗？')) deleteMember(member.id);
                          }}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ResourceModal
          tab={activeTab}
          editingItem={editingItem}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSubmit={(data) => {
            if (activeTab === 'halls') {
              if (editingItem) {
                const oldHall = halls.find(h => h.id === editingItem.id);
                const layoutChanged = oldHall && (oldHall.rows !== data.rows || oldHall.cols !== data.cols);
                const newSeats = generateSeats(data.rows, data.cols);
                const updatedHall = { ...data, seats: newSeats } as Hall;

                if (layoutChanged) {
                  const affectedSessions = sessions.filter(s =>
                    s.hallId === editingItem.id && new Date(s.startTime) > new Date()
                  );
                  const soldSeats = affectedSessions.reduce((sum, s) =>
                    sum + Object.values(s.seatStatus).filter(st => st === 'occupied' || st === 'booked-private').length, 0
                  );
                  const msg = `排数/座位数已变更，将影响该影厅 ${affectedSessions.length} 个未开场场次${soldSeats > 0 ? `（其中 ${soldSeats} 个已售座位将保留）` : ''}。是否确认同步新座位布局？`;
                  if (confirm(msg)) {
                    updateHallWithSeatSync(updatedHall);
                  } else {
                    return;
                  }
                } else {
                  updateHall(updatedHall);
                }
              } else {
                addHall({ ...data as Hall, seats: generateSeats(data.rows, data.cols) });
              }
            } else if (activeTab === 'movies') {
              if (editingItem) updateMovie(data as Movie);
              else addMovie(data as Movie);
            } else if (activeTab === 'customers') {
              if (editingItem) updatePrivateCustomer(data as PrivateCustomer);
              else addPrivateCustomer(data as PrivateCustomer);
            } else if (activeTab === 'members') {
              if (editingItem) updateMember(data as Member);
              else addMember(data as Member);
            }
            setShowModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

const ResourceModal: React.FC<{
  tab: TabKey;
  editingItem: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ tab, editingItem, onClose, onSubmit }) => {
  const isEdit = !!editingItem;

  const getDefaultForm = (): any => {
    if (tab === 'halls') {
      return editingItem || {
        id: generateId('hall'),
        name: '',
        rows: 10,
        cols: 12,
        createdAt: new Date().toISOString()
      };
    }
    if (tab === 'movies') {
      return editingItem || {
        id: generateId('movie'),
        title: '',
        duration: 120,
        description: ''
      };
    }
    if (tab === 'customers') {
      return editingItem || {
        id: generateId('pc'),
        name: '',
        contact: '',
        phone: '',
        contractStartDate: new Date().toISOString().slice(0, 10),
        contractEndDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        discountRate: 0.9,
        notes: ''
      };
    }
    if (tab === 'members') {
      return editingItem || {
        id: generateId('mem'),
        name: '',
        phone: '',
        level: 'normal',
        discountRate: 0.95,
        points: 0,
        joinDate: new Date().toISOString().slice(0, 10)
      };
    }
    return {};
  };

  const [formData, setFormData] = useState(getDefaultForm());

  const levelDiscountMap: Record<string, number> = {
    normal: 0.95,
    silver: 0.9,
    gold: 0.8,
    diamond: 0.7
  };

  const renderForm = () => {
    if (tab === 'halls') {
      return (
        <div className="space-y-4">
          <Field label="影厅名称">
            <input
              type="text" value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={inputCls} placeholder="如：1号厅（激光IMAX）"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="排数">
              <input type="number" min={1} value={formData.rows}
                onChange={e => setFormData({ ...formData, rows: Number(e.target.value) })}
                className={inputCls} />
            </Field>
            <Field label="每排座位数">
              <input type="number" min={1} value={formData.cols}
                onChange={e => setFormData({ ...formData, cols: Number(e.target.value) })}
                className={inputCls} />
            </Field>
          </div>
        </div>
      );
    }
    if (tab === 'movies') {
      return (
        <div className="space-y-4">
          <Field label="影片名称">
            <input type="text" value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className={inputCls} placeholder="影片标题" />
          </Field>
          <Field label="时长（分钟）">
            <input type="number" min={1} value={formData.duration}
              onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })}
              className={inputCls} />
          </Field>
          <Field label="简介">
            <textarea value={formData.description || ''} rows={3}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className={inputCls} placeholder="影片简介（可选）" />
          </Field>
        </div>
      );
    }
    if (tab === 'customers') {
      return (
        <div className="space-y-4">
          <Field label="公司/客户名称">
            <input type="text" value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="联系人">
              <input type="text" value={formData.contact}
                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                className={inputCls} />
            </Field>
            <Field label="联系电话">
              <input type="tel" value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="合同开始日期">
              <input type="date" value={formData.contractStartDate}
                onChange={e => setFormData({ ...formData, contractStartDate: e.target.value })}
                className={inputCls} />
            </Field>
            <Field label="合同结束日期">
              <input type="date" value={formData.contractEndDate}
                onChange={e => setFormData({ ...formData, contractEndDate: e.target.value })}
                className={inputCls} />
            </Field>
          </div>
          <Field label="折扣率">
            <div className="flex items-center gap-2">
              <input type="range" min={0.5} max={1} step={0.05}
                value={formData.discountRate}
                onChange={e => setFormData({ ...formData, discountRate: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="font-medium text-amber-600 w-16 text-right">
                {(formData.discountRate * 10).toFixed(1)}折
              </span>
            </div>
          </Field>
          <Field label="备注">
            <textarea value={formData.notes || ''} rows={2}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className={inputCls} placeholder="备注信息（可选）" />
          </Field>
        </div>
      );
    }
    if (tab === 'members') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="会员姓名">
              <input type="text" value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={inputCls} />
            </Field>
            <Field label="手机号">
              <input type="tel" value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className={inputCls} />
            </Field>
          </div>
          <Field label="会员等级">
            <select value={formData.level}
              onChange={e => setFormData({
                ...formData,
                level: e.target.value,
                discountRate: levelDiscountMap[e.target.value]
              })}
              className={inputCls}>
              <option value="normal">普通会员</option>
              <option value="silver">银卡会员</option>
              <option value="gold">金卡会员</option>
              <option value="diamond">钻石会员</option>
            </select>
          </Field>
          <Field label="折扣率">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-gray-400" />
              <input type="number" min={0} max={1} step={0.01}
                value={formData.discountRate}
                onChange={e => setFormData({ ...formData, discountRate: Number(e.target.value) })}
                className={inputCls} />
              <span className="text-sm text-gray-500">
                折扣率（如0.8 = 8折）
              </span>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="积分">
              <input type="number" min={0} value={formData.points}
                onChange={e => setFormData({ ...formData, points: Number(e.target.value) })}
                className={inputCls} />
            </Field>
            <Field label="注册日期">
              <input type="date" value={formData.joinDate}
                onChange={e => setFormData({ ...formData, joinDate: e.target.value })}
                className={inputCls} />
            </Field>
          </div>
        </div>
      );
    }
    return null;
  };

  const modalTitles: Record<TabKey, string> = {
    halls: '影厅',
    movies: '影片',
    customers: '包场客户',
    members: '会员'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">
            {isEdit ? '编辑' : '新增'}{modalTitles[tab]}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 max-h-[65vh] overflow-y-auto">
          {renderForm()}
        </div>
        <div className="p-5 border-t border-gray-200 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">
            取消
          </button>
          <button onClick={() => onSubmit(formData)}
            className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-medium">
            {isEdit ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
};

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {children}
  </div>
);
