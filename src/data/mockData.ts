import type {
  Hall, Session, Movie, PrivateCustomer, CycleRule,
  Discount, Member, Order, RefundRecord, ChangeRecord, Seat, SeatStatus
} from '@/types';
import { addDays, addWeeks, format, parse, startOfWeek, getDay, nextDay } from 'date-fns';

export function generateSeats(rows: number, cols: number): Seat[] {
  const seats: Seat[] = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const id = `${r}-${c}`;
      let type: Seat['type'] = 'normal';
      let basePrice = 50;
      if (r <= 2) {
        basePrice = 35;
      } else if (r >= rows - 1) {
        type = 'vip';
        basePrice = 80;
      }
      if (c >= Math.floor(cols / 2) && c <= Math.floor(cols / 2) + 1 && r >= 4 && r <= rows - 2) {
        type = 'couple';
        basePrice = 120;
      }
      seats.push({
        id,
        row: r,
        col: c,
        label: `${String.fromCharCode(64 + r)}${c}`,
        type,
        status: 'available',
        basePrice
      });
    }
  }
  return seats;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateOrderNo(): string {
  return `CY${format(new Date(), 'yyyyMMddHHmmss')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

export function generateMockData() {
  const now = new Date();

  const halls: Hall[] = [
    {
      id: 'hall_1',
      name: '1号厅（激光IMAX）',
      rows: 10,
      cols: 12,
      seats: generateSeats(10, 12),
      createdAt: now.toISOString()
    },
    {
      id: 'hall_2',
      name: '2号厅（杜比全景声）',
      rows: 8,
      cols: 10,
      seats: generateSeats(8, 10),
      createdAt: now.toISOString()
    },
    {
      id: 'hall_3',
      name: '3号厅（普通3D）',
      rows: 12,
      cols: 14,
      seats: generateSeats(12, 14),
      createdAt: now.toISOString()
    }
  ];

  const movies: Movie[] = [
    {
      id: 'movie_1',
      title: '星际穿越2：终极边界',
      duration: 180,
      description: '科幻史诗巨作，探索宇宙的终极奥秘。'
    },
    {
      id: 'movie_2',
      title: '唐人街探案5',
      duration: 135,
      description: '喜剧悬疑，笑料不断。'
    },
    {
      id: 'movie_3',
      title: '我和我的祖国·新时代',
      duration: 150,
      description: '主旋律献礼片，感人至深。'
    },
    {
      id: 'movie_4',
      title: '速度与激情11',
      duration: 140,
      description: '终极飙车对决。'
    }
  ];

  const privateCustomers: PrivateCustomer[] = [
    {
      id: 'pc_1',
      name: '未来科技集团',
      contact: '张经理',
      phone: '13800001111',
      contractStartDate: format(now, 'yyyy-MM-dd'),
      contractEndDate: format(addDays(now, 365), 'yyyy-MM-dd'),
      discountRate: 0.85,
      notes: '每周六下午2点包场1号厅'
    },
    {
      id: 'pc_2',
      name: '阳光幼儿园',
      contact: '李老师',
      phone: '13900002222',
      contractStartDate: format(now, 'yyyy-MM-dd'),
      contractEndDate: format(addDays(now, 180), 'yyyy-MM-dd'),
      discountRate: 0.7,
      notes: '每周五上午10点儿童场'
    }
  ];

  const sessions: Session[] = [];
  const timeSlots = ['10:00', '13:30', '15:00', '17:30', '19:30', '22:00'];

  for (let day = 0; day < 7; day++) {
    const date = addDays(now, day);
    const dateStr = format(date, 'yyyy-MM-dd');

    halls.forEach((hall, hallIdx) => {
      timeSlots.forEach((time, slotIdx) => {
        if (Math.random() > 0.3) {
          const movie = movies[(day + hallIdx + slotIdx) % movies.length];
          const [hour, minute] = time.split(':').map(Number);
          const startTime = new Date(date);
          startTime.setHours(hour, minute, 0, 0);
          const endTime = new Date(startTime.getTime() + movie.duration * 60000);

          const seatStatus: Record<string, SeatStatus> = {};
          const seatOccupier: Record<string, string> = {};

          hall.seats.forEach(seat => {
            if (Math.random() < 0.3) {
              seatStatus[seat.id] = 'occupied';
            } else {
              seatStatus[seat.id] = 'available';
            }
          });

          let sessionType: Session['type'] = 'normal';
          if (hour < 12) sessionType = 'morning';
          if (hour >= 22) sessionType = 'midnight';

          sessions.push({
            id: generateId('session'),
            hallId: hall.id,
            movieId: movie.id,
            movieTitle: movie.title,
            hallName: hall.name,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            type: sessionType,
            basePrice: 50 + hallIdx * 10 + (sessionType === 'midnight' ? -15 : sessionType === 'morning' ? -10 : 0),
            seatStatus,
            seatOccupier: Object.keys(seatOccupier).length ? seatOccupier : undefined
          });
        }
      });
    });
  }

  const cycleRules: CycleRule[] = [
    {
      id: 'rule_1',
      name: '未来科技周六包场',
      customerId: 'pc_1',
      customerName: '未来科技集团',
      hallId: 'hall_1',
      hallName: '1号厅（激光IMAX）',
      movieId: 'movie_1',
      movieTitle: '星际穿越2：终极边界',
      basePrice: 60,
      cycleUnit: 'week',
      cycleInterval: 1,
      weekDays: [6],
      startTime: format(new Date().setHours(14, 0, 0, 0), 'HH:mm'),
      endTime: format(new Date().setHours(17, 0, 0, 0), 'HH:mm'),
      startDate: format(now, 'yyyy-MM-dd'),
      endDate: format(addWeeks(now, 12), 'yyyy-MM-dd'),
      seatIds: halls[0].seats.filter(s => s.type === 'vip' || (s.row >= 5 && s.row <= 8)).map(s => s.id),
      isActive: true,
      createdAt: now.toISOString()
    },
    {
      id: 'rule_2',
      name: '阳光幼儿园周五儿童场',
      customerId: 'pc_2',
      customerName: '阳光幼儿园',
      hallId: 'hall_3',
      hallName: '3号厅（普通3D）',
      movieId: 'movie_3',
      movieTitle: '我和我的祖国·新时代',
      basePrice: 35,
      cycleUnit: 'week',
      cycleInterval: 1,
      weekDays: [5],
      startTime: format(new Date().setHours(10, 0, 0, 0), 'HH:mm'),
      endTime: format(new Date().setHours(12, 30, 0, 0), 'HH:mm'),
      startDate: format(now, 'yyyy-MM-dd'),
      endDate: format(addWeeks(now, 8), 'yyyy-MM-dd'),
      seatIds: halls[2].seats.filter(s => s.row <= 6).map(s => s.id),
      isActive: true,
      createdAt: now.toISOString()
    }
  ];

  const discounts: Discount[] = [
    {
      id: 'disc_1',
      name: '新用户首单9折',
      type: 'percentage',
      value: 10,
      minAmount: 0,
      maxDiscount: 20,
      priority: 1,
      isStackable: true,
      isActive: true,
      description: '新用户首次下单享受9折优惠，最高减20元'
    },
    {
      id: 'disc_2',
      name: '满100减20',
      type: 'full-reduction',
      value: 20,
      minAmount: 100,
      priority: 2,
      isStackable: true,
      isActive: true,
      description: '订单满100元减20元'
    },
    {
      id: 'disc_3',
      name: '满200减50',
      type: 'full-reduction',
      value: 50,
      minAmount: 200,
      priority: 3,
      isStackable: false,
      isActive: true,
      description: '订单满200元减50元，不可与满100减20叠加'
    },
    {
      id: 'disc_4',
      name: '早场立减10元',
      type: 'fixed',
      value: 10,
      applicableScope: 'ticket',
      priority: 4,
      isStackable: true,
      isActive: true,
      description: '上午12点前场次每票立减10元'
    },
    {
      id: 'disc_5',
      name: '会员折扣',
      type: 'member-discount',
      value: 0,
      priority: 0,
      isStackable: true,
      isActive: true,
      description: '根据会员等级享受折扣，该值会被会员实际折扣覆盖'
    }
  ];

  const members: Member[] = [
    {
      id: 'mem_1',
      name: '王小明',
      phone: '13811112222',
      level: 'gold',
      discountRate: 0.8,
      points: 5680,
      joinDate: format(addDays(now, -365), 'yyyy-MM-dd')
    },
    {
      id: 'mem_2',
      name: '李华',
      phone: '13822223333',
      level: 'silver',
      discountRate: 0.9,
      points: 2340,
      joinDate: format(addDays(now, -180), 'yyyy-MM-dd')
    },
    {
      id: 'mem_3',
      name: '张三',
      phone: '13833334444',
      level: 'diamond',
      discountRate: 0.7,
      points: 18900,
      joinDate: format(addDays(now, -730), 'yyyy-MM-dd')
    }
  ];

  const orders: Order[] = [
    {
      id: 'order_1',
      orderNo: generateOrderNo(),
      customerName: '王小明',
      customerPhone: '13811112222',
      memberId: 'mem_1',
      memberName: '王小明',
      tickets: [
        { sessionId: sessions[0]?.id || '', seatId: '5-5', seatLabel: 'E5', originalPrice: 60, finalPrice: 43.2 },
        { sessionId: sessions[0]?.id || '', seatId: '5-6', seatLabel: 'E6', originalPrice: 60, finalPrice: 43.2 }
      ],
      originalTotal: 120,
      finalTotal: 86.4,
      appliedDiscounts: [
        { discountId: 'disc_5', discountName: '金卡会员8折', discountType: 'member-discount', savedAmount: 24 },
        { discountId: 'disc_2', discountName: '满100减20', discountType: 'full-reduction', savedAmount: 9.6 }
      ],
      status: 'paid',
      createdAt: format(addDays(now, -2), 'yyyy-MM-dd HH:mm:ss'),
      paidAt: format(addDays(now, -2), 'yyyy-MM-dd HH:mm:ss')
    }
  ];

  return {
    halls,
    sessions,
    movies,
    privateCustomers,
    cycleRules,
    discounts,
    members,
    orders,
    refundRecords: [] as RefundRecord[],
    changeRecords: [] as ChangeRecord[]
  };
}

export { generateId, generateOrderNo };
