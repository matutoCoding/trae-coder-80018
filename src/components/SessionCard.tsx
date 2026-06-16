import React from 'react';
import { Clock, MapPin, Film, Users } from 'lucide-react';
import type { Session } from '@/types';
import { formatDateTime, formatTime } from '@/utils/cycleGenerator';

interface SessionCardProps {
  session: Session;
  selected: boolean;
  onClick: () => void;
  showDetails?: boolean;
}

const sessionTypeColors: Record<Session['type'], string> = {
  normal: 'bg-blue-100 text-blue-700',
  private: 'bg-red-100 text-red-700',
  morning: 'bg-amber-100 text-amber-700',
  midnight: 'bg-purple-100 text-purple-700'
};

const sessionTypeLabels: Record<Session['type'], string> = {
  normal: '普通场',
  private: '包场',
  morning: '早场',
  midnight: '午夜场'
};

export const SessionCard: React.FC<SessionCardProps> = ({ session, selected, onClick, showDetails = true }) => {
  const startDate = new Date(session.startTime);
  const availableCount = Object.values(session.seatStatus).filter(s => s === 'available').length;
  const totalCount = Object.keys(session.seatStatus).length;

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
        ${selected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-sm bg-white'
        }
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Film className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-800 truncate max-w-[180px]">{session.movieTitle}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-3.5 h-3.5" />
            <span>{session.hallName}</span>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sessionTypeColors[session.type]}`}>
          {sessionTypeLabels[session.type]}
        </span>
      </div>

      {showDetails && (
        <>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDateTime(session.startTime)}</span>
              </div>
              <span className="text-xs text-gray-400">
                时长 {Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)}分钟
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Users className="w-3.5 h-3.5" />
                <span>剩余 {availableCount}/{totalCount} 座</span>
              </div>
              <span className="text-lg font-bold text-red-500">¥{session.basePrice}</span>
            </div>
          </div>

          {session.isPrivateBooking && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-red-600 font-medium">
                包场客户：{session.privateCustomerName}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
