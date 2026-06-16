import React, { useState } from 'react';
import {
  Ticket, Calendar as CalendarIcon, Percent, RefreshCcw,
  Film, Building2, Users, Settings, ChevronRight, Menu, X
} from 'lucide-react';
import { SeatBookingPage } from '@/pages/SeatBookingPage';
import { CycleRulePage } from '@/pages/CycleRulePage';
import { DiscountPage } from '@/pages/DiscountPage';
import { RefundChangePage } from '@/pages/RefundChangePage';
import { ResourceManagementPage } from '@/pages/ResourceManagementPage';

type PageKey = 'booking' | 'cycle' | 'discount' | 'refund' | 'resource';

interface MenuItem {
  key: PageKey;
  label: string;
  icon: React.ElementType;
  description: string;
}

const menuItems: MenuItem[] = [
  { key: 'booking', label: '选座购票', icon: Ticket, description: '场次座位模块' },
  { key: 'cycle', label: '周期规则', icon: CalendarIcon, description: '周期生成模块' },
  { key: 'discount', label: '优惠管理', icon: Percent, description: '优惠计算模块' },
  { key: 'refund', label: '改签退票', icon: RefreshCcw, description: '改签退票模块' },
  { key: 'resource', label: '资源管理', icon: Building2, description: '影厅/影片/客户/会员' },
];

export const AppLayout: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageKey>('booking');
  const [collapsed, setCollapsed] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'booking': return <SeatBookingPage />;
      case 'cycle': return <CycleRulePage />;
      case 'discount': return <DiscountPage />;
      case 'refund': return <RefundChangePage />;
      case 'resource': return <ResourceManagementPage />;
      default: return <SeatBookingPage />;
    }
  };

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shadow-sm`}
      >
        <div className={`h-16 flex items-center ${collapsed ? 'justify-center' : 'px-5'} border-b border-gray-100`}>
          {collapsed ? (
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Film className="w-5 h-5 text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 text-sm leading-tight">影院系统</h1>
                <p className="text-[10px] text-gray-400">Cinema Manager</p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setCurrentPage(item.key)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'text-gray-400 group-hover:text-gray-600'}`} />
                {!collapsed && (
                  <>
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-medium ${isActive ? '' : ''}`}>{item.label}</div>
                      <div className={`text-[10px] mt-0.5 ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                        {item.description}
                      </div>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 opacity-80" />}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        <div className={`p-2 border-t border-gray-100 ${collapsed ? '' : 'px-3'}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors`}
          >
            {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            {!collapsed && <span className="text-sm">收起菜单</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">
                {menuItems.find(m => m.key === currentPage)?.label || '控制台'}
              </h2>
              <p className="text-xs text-gray-400">
                {menuItems.find(m => m.key === currentPage)?.description || ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>管理员</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium shadow">
              管
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-gray-50">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};
