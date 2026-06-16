import type { Discount, AppliedDiscount, Member, Session } from '@/types';

export interface CalculateParams {
  originalTotal: number;
  discounts: Discount[];
  member?: Member;
  session?: Session;
  ticketCount: number;
  discountOrder: string[];
}

export interface CalculateResult {
  finalTotal: number;
  appliedDiscounts: AppliedDiscount[];
  breakdown: {
    step: number;
    discountName: string;
    beforeAmount: number;
    afterAmount: number;
    saved: number;
  }[];
  hasNegativeProtection: boolean;
}

export function calculatePrice(params: CalculateParams): CalculateResult {
  const { originalTotal, discounts, member, session, ticketCount, discountOrder } = params;

  let currentAmount = originalTotal;
  const appliedDiscounts: AppliedDiscount[] = [];
  const breakdown: CalculateResult['breakdown'] = [];
  let hasNegativeProtection = false;
  let step = 1;

  const orderedDiscounts = discountOrder
    .map(id => discounts.find(d => d.id === id && d.isActive))
    .filter(Boolean) as Discount[];

  const unorderedDiscounts = discounts.filter(
    d => d.isActive && !discountOrder.includes(d.id) && d.type !== 'member-discount'
  ).sort((a, b) => a.priority - b.priority);

  const allDiscounts = [...orderedDiscounts, ...unorderedDiscounts];

  const memberDiscount = discounts.find(d => d.type === 'member-discount' && d.isActive);
  if (member && memberDiscount && member.discountRate < 1) {
    const discountRate = member.discountRate;
    const saved = currentAmount * (1 - discountRate);
    const newAmount = currentAmount * discountRate;
    const memberLevelName: Record<string, string> = {
      normal: '普通会员',
      silver: '银卡会员',
      gold: '金卡会员',
      diamond: '钻石会员'
    };

    breakdown.push({
      step: step++,
      discountName: `${memberLevelName[member.level]}${(discountRate * 10).toFixed(1)}折`,
      beforeAmount: currentAmount,
      afterAmount: newAmount,
      saved
    });
    appliedDiscounts.push({
      discountId: memberDiscount.id,
      discountName: `${memberLevelName[member.level]}${(discountRate * 10).toFixed(1)}折`,
      discountType: 'member-discount',
      savedAmount: saved
    });
    currentAmount = newAmount;
  }

  const fullReductionsApplied: string[] = [];

  for (const discount of allDiscounts) {
    if (!discount.isActive) continue;
    if (discount.type === 'member-discount') continue;

    let saved = 0;
    let newAmount = currentAmount;

    switch (discount.type) {
      case 'percentage': {
        if (discount.minAmount && currentAmount < discount.minAmount) continue;
        const rate = discount.value / 100;
        saved = currentAmount * rate;
        if (discount.maxDiscount) {
          saved = Math.min(saved, discount.maxDiscount);
        }
        newAmount = currentAmount - saved;
        break;
      }

      case 'fixed': {
        if (discount.applicableScope === 'ticket') {
          if (session) {
            const sessionHour = new Date(session.startTime).getHours();
            if (sessionHour >= 12) break;
          }
          saved = discount.value * ticketCount;
        } else {
          saved = discount.value;
        }
        newAmount = currentAmount - saved;
        break;
      }

      case 'full-reduction': {
        const sameGroupDiscount = fullReductionsApplied.find(id => {
          const d = discounts.find(x => x.id === id);
          return d && !d.isStackable;
        });

        if (sameGroupDiscount && !discount.isStackable) {
          continue;
        }
        if (!discount.minAmount || currentAmount >= discount.minAmount) {
          saved = discount.value;
          newAmount = currentAmount - saved;
          fullReductionsApplied.push(discount.id);
        }
        break;
      }
    }

    if (saved > 0) {
      breakdown.push({
        step: step++,
        discountName: discount.name,
        beforeAmount: currentAmount,
        afterAmount: newAmount,
        saved
      });
      appliedDiscounts.push({
        discountId: discount.id,
        discountName: discount.name,
        discountType: discount.type,
        savedAmount: saved
      });
      currentAmount = newAmount;
    }
  }

  if (currentAmount < 0) {
    hasNegativeProtection = true;
    breakdown.push({
      step: step++,
      discountName: '负值兜底（最低0元）',
      beforeAmount: currentAmount,
      afterAmount: 0,
      saved: currentAmount
    });
    currentAmount = 0;
  }

  currentAmount = Math.round(currentAmount * 100) / 100;

  return {
    finalTotal: currentAmount,
    appliedDiscounts,
    breakdown,
    hasNegativeProtection
  };
}

export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

export function getDefaultDiscountOrder(discounts: Discount[]): string[] {
  return discounts
    .filter(d => d.isActive && d.type !== 'member-discount')
    .sort((a, b) => a.priority - b.priority)
    .map(d => d.id);
}
