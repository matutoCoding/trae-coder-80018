import { addDays, addWeeks, addMonths, format, parse, isBefore, isAfter, getDay as getDayOfWeek, differenceInDays, startOfDay } from 'date-fns';
import type { CycleRule, Session, Hall } from '@/types';
import { generateId } from '@/data/mockData';

export interface CycleGenerateResult {
  sessions: Session[];
  skippedDates: string[];
  matchedDates: string[];
  intervalSkippedDates: string[];
  totalGenerated: number;
}

export function generateSessionsFromRule(
  rule: CycleRule,
  hall: Hall,
  existingSessions: Session[]
): CycleGenerateResult {
  const sessions: Session[] = [];
  const skippedDates: string[] = [];
  const matchedDates: string[] = [];

  const startDate = parse(rule.startDate, 'yyyy-MM-dd', new Date());
  const endDate = parse(rule.endDate, 'yyyy-MM-dd', new Date());

  const [startHour, startMinute] = rule.startTime.split(':').map(Number);
  const [endHour, endMinute] = rule.endTime.split(':').map(Number);

  const matchingDates = findAllMatchingDates(startDate, endDate, rule);
  const intervalSkippedDates = (rule.cycleInterval > 1)
    ? findIntervalSkippedDates(startDate, endDate, rule)
    : [];

  for (const dateStr of matchingDates) {
    const currentDate = parse(dateStr, 'yyyy-MM-dd', new Date());

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

  return {
    sessions,
    skippedDates,
    matchedDates: matchingDates,
    intervalSkippedDates,
    totalGenerated: sessions.length
  };
}

function findIntervalSkippedDates(startDate: Date, endDate: Date, rule: CycleRule): string[] {
  const skipped: string[] = [];
  if (rule.cycleInterval <= 1) return skipped;

  const ruleStart = startOfDay(startDate);
  const ruleEnd = startOfDay(endDate);

  if (rule.cycleUnit === 'week') {
    const weekDays = rule.weekDays && rule.weekDays.length > 0
      ? [...rule.weekDays].sort()
      : [getDayOfWeek(ruleStart)];

    const firstDayOfWeek = weekDays[0];
    let searchDate = startOfDay(ruleStart);
    while (getDayOfWeek(searchDate) !== firstDayOfWeek && !isAfter(searchDate, ruleEnd)) {
      searchDate = addDays(searchDate, 1);
    }
    if (isAfter(searchDate, ruleEnd)) return skipped;
    const firstWeekBase = startOfDay(searchDate);

    let weekIndex = 0;
    let weekBase = firstWeekBase;
    const matchedWeeks = new Set<number>();

    while (!isAfter(weekBase, ruleEnd)) {
      matchedWeeks.add(weekIndex);
      weekIndex++;
      weekBase = addWeeks(firstWeekBase, weekIndex * rule.cycleInterval);
    }

    let allWeekIndex = 0;
    let allWeekBase = firstWeekBase;
    while (!isAfter(allWeekBase, ruleEnd)) {
      if (!matchedWeeks.has(allWeekIndex)) {
        for (const dayOfWeek of weekDays) {
          const daysFromBase = dayOfWeek - getDayOfWeek(allWeekBase);
          const candidateDate = addDays(allWeekBase, daysFromBase);
          if (!isBefore(candidateDate, ruleStart) && !isAfter(candidateDate, ruleEnd)) {
            skipped.push(format(candidateDate, 'yyyy-MM-dd'));
          }
        }
      }
      allWeekIndex++;
      allWeekBase = addWeeks(firstWeekBase, allWeekIndex);
    }
  } else if (rule.cycleUnit === 'day') {
    let dayIndex = 0;
    let current = startOfDay(ruleStart);
    while (!isAfter(current, ruleEnd)) {
      if (dayIndex % rule.cycleInterval !== 0) {
        skipped.push(format(current, 'yyyy-MM-dd'));
      }
      dayIndex++;
      current = addDays(ruleStart, dayIndex);
    }
  } else if (rule.cycleUnit === 'month') {
    let monthIndex = 0;
    let current = startOfDay(ruleStart);
    while (!isAfter(current, ruleEnd)) {
      if (monthIndex % rule.cycleInterval !== 0) {
        skipped.push(format(current, 'yyyy-MM-dd'));
      }
      monthIndex++;
      current = addMonths(ruleStart, monthIndex);
    }
  }

  return skipped;
}

function findAllMatchingDates(startDate: Date, endDate: Date, rule: CycleRule): string[] {
  const dates: string[] = [];

  switch (rule.cycleUnit) {
    case 'day': {
      let current = startOfDay(startDate);
      const end = startOfDay(endDate);
      while (!isAfter(current, end)) {
        dates.push(format(current, 'yyyy-MM-dd'));
        current = addDays(current, rule.cycleInterval);
      }
      break;
    }

    case 'week': {
      const weekDays = rule.weekDays && rule.weekDays.length > 0
        ? [...rule.weekDays].sort()
        : [getDayOfWeek(startDate)];

      const ruleStart = startOfDay(startDate);
      const ruleEnd = startOfDay(endDate);

      const firstDayOfWeek = weekDays[0];

      let searchDate = startOfDay(startDate);

      while (getDayOfWeek(searchDate) !== firstDayOfWeek && !isAfter(searchDate, ruleEnd)) {
        searchDate = addDays(searchDate, 1);
      }
      if (isAfter(searchDate, ruleEnd)) break;

      const firstWeekBase = startOfDay(searchDate);

      let weekIndex = 0;
      let weekBase = firstWeekBase;

      while (!isAfter(weekBase, ruleEnd)) {
        for (const dayOfWeek of weekDays) {
          const daysFromBase = dayOfWeek - getDayOfWeek(weekBase);
          const candidateDate = addDays(weekBase, daysFromBase);

          if (!isBefore(candidateDate, ruleStart) && !isAfter(candidateDate, ruleEnd)) {
            dates.push(format(candidateDate, 'yyyy-MM-dd'));
          }
        }

        weekIndex++;
        weekBase = addWeeks(firstWeekBase, weekIndex * rule.cycleInterval);
      }
      break;
    }

    case 'month': {
      let current = startOfDay(startDate);
      const end = startOfDay(endDate);
      while (!isAfter(current, end)) {
        dates.push(format(current, 'yyyy-MM-dd'));
        current = addMonths(current, rule.cycleInterval);
      }
      break;
    }
  }

  return dates;
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
