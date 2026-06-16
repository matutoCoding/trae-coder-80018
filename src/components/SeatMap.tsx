import React from 'react';
import type { Seat, SeatStatus, SeatType } from '@/types';

interface SeatMapProps {
  seats: Seat[];
  rows: number;
  cols: number;
  seatStatus?: Record<string, SeatStatus>;
  selectedSeats: string[];
  onSeatClick: (seatId: string) => void;
  showLegend?: boolean;
}

const seatTypeColors: Record<SeatType, string> = {
  normal: 'bg-slate-400',
  vip: 'bg-amber-500',
  couple: 'bg-pink-500',
  handicapped: 'bg-emerald-500'
};

const seatStatusColors: Record<SeatStatus, string> = {
  available: '',
  occupied: 'bg-gray-600 cursor-not-allowed opacity-60',
  selected: 'ring-2 ring-blue-400 ring-offset-1',
  disabled: 'bg-gray-300 cursor-not-allowed',
  'booked-private': 'bg-red-600 cursor-not-allowed'
};

const seatStatusLabels: Record<SeatStatus, string> = {
  available: '可选',
  occupied: '已售',
  selected: '已选',
  disabled: '不可用',
  'booked-private': '包场'
};

export const SeatMap: React.FC<SeatMapProps> = ({
  seats, rows, cols, seatStatus, selectedSeats, onSeatClick, showLegend = true
}) => {
  const seatGrid: (Seat | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));

  seats.forEach(seat => {
    if (seat.row - 1 < rows && seat.col - 1 < cols) {
      seatGrid[seat.row - 1][seat.col - 1] = seat;
    }
  });

  const getSeatStatus = (seat: Seat): SeatStatus => {
    if (seatStatus?.[seat.id]) return seatStatus[seat.id];
    return seat.status;
  };

  const isSelected = (seatId: string) => selectedSeats.includes(seatId);

  const handleClick = (seat: Seat) => {
    const status = getSeatStatus(seat);
    if (status === 'available' || status === 'selected') {
      onSeatClick(seat.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="w-3/4 h-8 bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-t-full flex items-center justify-center text-white text-sm font-medium shadow-lg">
          银 幕 SCREEN
        </div>
      </div>

      <div className="flex justify-center overflow-x-auto">
        <div className="inline-block">
          <div className="flex gap-2 mb-2 pl-8">
            {Array.from({ length: cols }, (_, i) => (
              <div key={i} className="w-8 h-6 text-xs text-gray-500 flex items-center justify-center">
                {i + 1}
              </div>
            ))}
          </div>

          {seatGrid.map((row, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-2 mb-1">
              <div className="w-6 h-8 text-xs text-gray-500 flex items-center justify-center font-medium">
                {String.fromCharCode(65 + rowIdx)}
              </div>
              {row.map((seat, colIdx) => {
                if (!seat) {
                  return <div key={colIdx} className="w-8 h-8" />;
                }
                const status = getSeatStatus(seat);
                const selected = isSelected(seat.id);
                const typeColor = seatTypeColors[seat.type];
                const statusColor = status === 'available' && !selected ? '' : seatStatusColors[status];
                const selectedColor = selected ? 'bg-blue-500' : '';

                return (
                  <button
                    key={seat.id}
                    onClick={() => handleClick(seat)}
                    disabled={status !== 'available' && !selected}
                    className={`
                      w-8 h-8 rounded-t-md text-[10px] font-medium transition-all duration-150
                      flex items-center justify-center
                      ${status === 'available' || selected ? 'hover:scale-110 cursor-pointer' : ''}
                      ${selected ? selectedColor : (status === 'available' ? typeColor : '')}
                      ${status !== 'available' && !selected ? statusColor : ''}
                      ${selected ? seatStatusColors.selected : ''}
                      ${status === 'available' && !selected ? 'text-white' : ''}
                      ${selected ? 'text-white' : ''}
                      ${status === 'occupied' || status === 'booked-private' ? 'text-gray-300' : ''}
                    `}
                    title={`${seat.label} - ${seat.type === 'vip' ? 'VIP' : seat.type === 'couple' ? '情侣座' : seat.type === 'handicapped' ? '无障碍' : '普通'} ${seatStatusLabels[status]}`}
                  >
                    {seat.col}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {showLegend && (
        <div className="flex flex-wrap justify-center gap-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-t-md bg-slate-400" />
            <span className="text-sm text-gray-600">普通座</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-t-md bg-amber-500" />
            <span className="text-sm text-gray-600">VIP座</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-t-md bg-pink-500" />
            <span className="text-sm text-gray-600">情侣座</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-t-md bg-blue-500 ring-2 ring-blue-400 ring-offset-1" />
            <span className="text-sm text-gray-600">已选</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-t-md bg-gray-600 opacity-60" />
            <span className="text-sm text-gray-600">已售</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-t-md bg-red-600" />
            <span className="text-sm text-gray-600">包场占用</span>
          </div>
        </div>
      )}
    </div>
  );
};
