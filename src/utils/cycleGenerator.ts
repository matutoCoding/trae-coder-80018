import { addDays, addWeeks, addMonths, format, parse, isBefore, isAfter, getDay as getDayOfWeek } from 'date-fns';
import type { CycleRule, Session, Hall } from '@/types';
import { generateId } from './mockData';

export interface CycleGenerateResult {
  sessions: Session[];
  skippedDates: string[];
  totalGenerated: number;
}

export function generateSessionsFromRule(
  rule: CycleRule,
  hall: Hall,
  existingSessions: Session[]
): CycleGenerateResult {
  const sessions: Session[] = [];
  const skippedDates: string[] = [];

  const startDate = parse(rule.startDate, 'yyyy-MM-dd', new Date());
  const endDate = parse(rule.endDate, 'yyyy-MM-dd', new Date());

  const [startHour, startMinute] = rule.startTime.split(':').map(Number);
  const [endHour, endMinute] = rule.endTime.split(':').map(Number);

  let currentDate = new Date(startDate);

  while (!isAfter(currentDate, endDate)) {
    const shouldGenerate = checkDateMatchesRule(currentDate, rule);

    if (shouldGenerate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const conflict = existingSessions.some(s => {
        const sDate = format(new Date(s.startTime), 'yyyy-MM-dd');
        const sStartTime = new Date(s.startTime);
        const sEndTime = new Date(s.endTime);
        const sHour = sStartTime.getHours() * 60 + sStartTime.getMinutes();
        const sEndHour = sEndTime.getHours() * 60 + sEndTime.getMinutes();
        const ruleStartMin = startHour * 60 + startMinute;
        const ruleEndMin = endHour * 60 + endMinute;

        return s.hallId === rule.hallId &&
          sDate === dateStr &&
          !(sEndHour <= ruleStartMin || sHour >= ruleEndMin);
      });

      if (conflict) {
        skippedDates.push(dateStr);
      } else {
        const startTime = new Date(currentDate);
        startTime.setHours(startHour, startMinute, 0, 0);
        const endTime = new Date(currentDate);
        endTime.setHours(endHour, endMinute, 0, 0);

        const seatStatus: Record<string, any> = {};
        const seatOccupier: Record<string, string> = {};

        hall.seats.forEach(seat => {
          if (rule.seatIds.includes(seat.id)) {
            seatStatus[seat.id] = 'booked-private';
            seatOccupier[seat.id] = rule.customerName;
          } else {
            seatStatus[seat.id] = 'available';
          }
        });

        sessions.push({
          id: generateId('session'),
          hallId: rule.hallId,
          movieId: rule.movieId,
          movieTitle: rule.movieTitle,
          hallName: rule.hallName,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          type: 'private',
          basePrice: rule.basePrice,
          seatStatus,
          seatOccupier,
          isPrivateBooking: true,
          privateCustomerId: rule.customerId,
          privateCustomerName: rule.customerName,
          generatedFromRuleId: rule.id
        });
      }
    }

    currentDate = getNextDate(currentDate, rule);
  }

  return {
    sessions,
    skippedDates,
    totalGenerated: sessions.length
  };
}

function checkDateMatchesRule(date: Date, rule: CycleRule): boolean {
  const dayOfWeek = getDayOfWeek(date);

  switch (rule.cycleUnit) {
    case 'day':
      return true;

    case 'week':
      if (rule.weekDays && rule.weekDays.length > 0) {
        return rule.weekDays.includes(dayOfWeek);
      }
      return true;

    case 'month':
      return true;

    default:
      return false;
  }
}

function getNextDate(currentDate: Date, rule: CycleRule): Date {
  switch (rule.cycleUnit) {
    case 'day':
      return addDays(currentDate, rule.cycleInterval);

    case 'week':
      if (rule.weekDays && rule.weekDays.length > 0) {
        const sortedWeekDays = [...rule.weekDays].sort();
        const currentDayOfWeek = getDayOfWeek(currentDate);

        const nextDay = sortedWeekDays.find(d => d > currentDayOfWeek);
        if (nextDay !== undefined) {
          const diff = nextDay - currentDayOfWeek;
          return addDays(currentDate, diff);
        } else {
          const firstDayOfNextWeek = sortedWeekDays[0];
          const daysToAdd = 7 - currentDayOfWeek + firstDayOfNextWeek;
          return addDays(currentDate, daysToAdd);
        }
      }
      return addWeeks(currentDate, rule.cycleInterval);

    case 'month':
      return addMonths(currentDate, rule.cycleInterval);

    default:
      return addDays(currentDate, 1);
  }
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'yyyy-MM-dd HH:mm');
}

export function formatDate(iso: string): string {
  return format(new Date(iso), 'yyyy-MM-dd');
}

export function formatTime(iso: string): string {
  return format(new Date(iso), 'HH:mm');
}

export function getWeekDayName(day: number): string {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[day] || '';
}

export function getWeekDayNames(days: number[]): string {
  return days.map(getWeekDayName).join('、');
}
