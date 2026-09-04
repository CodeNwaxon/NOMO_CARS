/**
 * Shared application constants.
 * Change websiteLink here and it will reflect everywhere:
 * - Email templates (payment.ts)
 * - Chat link filtering (ChatOverlay.tsx)
 */
export const websiteLink = "https://nomocars.vercel.app";

// Ticket Collection Policy Variables
export const startTicketCollection = true;
export const freeTicketPlanDays = 90;
export const ticketCollectionStartDate = "2026-09-04T00:00:00Z";

/**
 * Checks if a driver has a valid ticket or is within the free plan period.
 * @param driverTicketExpiry The driver's ticket expiry date from their profile.
 * @returns true if the driver has a valid ticket, or if ticket collection is paused, or if within the free plan days.
 */
export function hasValidTicket(driverTicketExpiry?: string | null): boolean {
  if (!startTicketCollection) return true;

  // Check if they have an active ticket manually purchased
  if (driverTicketExpiry) {
    const expiryDate = new Date(driverTicketExpiry);
    if (expiryDate > new Date()) return true;
  }

  // Check if we are still within the global free plan days
  const startDate = new Date(ticketCollectionStartDate);
  const freePeriodEnd = new Date(startDate.getTime() + freeTicketPlanDays * 24 * 60 * 60 * 1000);
  
  if (new Date() < freePeriodEnd) return true;

  return false;
}

export const VIP_PLANS = [
  {
    stars: 1,
    price: 5000,
    name: "VIP 1-Star",
    color: "from-blue-400 to-blue-600",
    bg: "bg-blue-50/50 dark:bg-blue-900/10",
    border: "border-blue-200 dark:border-blue-800",
    features: ["Basic priority listing", "Extra bid daily", "VIP Badge"],
    tag: "Starter",
  },
  {
    stars: 2,
    price: 7000,
    name: "VIP 2-Star",
    color: "from-green-400 to-green-600",
    bg: "bg-green-50/50 dark:bg-green-900/10",
    border: "border-green-200 dark:border-green-800",
    features: ["Enhanced priority listing", "3 Extra bids daily", "Premium VIP Badge"],
    tag: "Popular",
  },
  {
    stars: 3,
    price: 10000,
    name: "VIP 3-Star",
    color: "from-purple-400 to-purple-600",
    bg: "bg-purple-50/50 dark:bg-purple-900/10",
    border: "border-purple-200 dark:border-purple-800",
    features: ["High priority listing", "5 Extra bids daily", "Featured profile tag"],
    tag: "Advanced",
  },
  {
    stars: 4,
    price: 15000,
    name: "VIP 4-Star",
    color: "from-pink-400 to-rose-600",
    bg: "bg-pink-50/50 dark:bg-pink-900/10",
    border: "border-pink-200 dark:border-pink-800",
    features: ["Top-tier priority listing", "10 Extra bids daily", "Exclusive support"],
    tag: "Premium",
  },
  {
    stars: 5,
    price: 20000,
    name: "VIP 5-Star",
    color: "from-slate-700 to-black dark:from-slate-300 dark:to-white",
    bg: "bg-gradient-to-br from-slate-900 to-black text-white shadow-2xl shadow-black/40",
    border: "border-slate-800",
    features: ["Ultimate priority listing", "Unlimited bids daily", "Prestigious Black Card", "Dedicated Account Manager"],
    isPremium: true,
    tag: "Ultimate",
  }
];

export function getVIPBadge(stars: number) {
  if (!stars || stars < 1) return null;
  const plan = VIP_PLANS.find(p => p.stars === stars) || VIP_PLANS[0];
  
  return {
    tag: plan.tag,
    colorClass: plan.isPremium ? 'bg-amber-500 text-black' : `bg-gradient-to-r ${plan.color} text-white`
  };
}
