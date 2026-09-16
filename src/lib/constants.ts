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

export function buildDriverSearchTokens(...values: unknown[]) {
  const tokens = new Set<string>();
  const searchText = values
    .map((value) => String(value || ""))
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");

  for (const word of searchText.split(/\s+/).filter(Boolean)) {
    for (let length = 2; length <= word.length; length++) {
      tokens.add(word.slice(0, length));
    }
  }

  return Array.from(tokens);
}

/**
 * Checks if a driver has a valid ticket or is within the free plan period.
 * @param driverTicketExpiry The driver's ticket expiry date from their profile.
 * @returns true if the driver has a valid ticket, or if ticket collection is paused, or if within the free plan days.
 */
export function parseDateInput(dateInput: any): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateInput === 'object') {
    if (typeof dateInput.toDate === 'function') return dateInput.toDate();
    if (dateInput.seconds) return new Date(dateInput.seconds * 1000);
    if (dateInput._seconds) return new Date(dateInput._seconds * 1000);
  }
  return null;
}

export function hasValidTicket(
  driverTicketExpiry?: any,
  startTicketCollection: boolean = true,
  driverCreatedAt?: any,
  ticketCollectionStartedAt?: any
): boolean {
  if (!startTicketCollection) return true;

  // Check if they have an active ticket manually purchased
  if (driverTicketExpiry) {
    const expiryDate = parseDateInput(driverTicketExpiry);
    if (expiryDate && expiryDate > new Date()) return true;
  }

  // Calculate the personal free period using the driver's registration date
  // Fall back to now if somehow ticketCollectionStartedAt is missing
  const defaultStart = parseDateInput(ticketCollectionStartedAt) || new Date();
  const driverStart = parseDateInput(driverCreatedAt) || defaultStart;

  // The effective start date for their 90 days is whichever is later: when they joined, or when the button was turned on.
  const effectiveStartDate = new Date(Math.max(driverStart.getTime(), defaultStart.getTime()));
  const freePeriodEnd = new Date(effectiveStartDate.getTime() + freeTicketPlanDays * 24 * 60 * 60 * 1000);

  if (new Date() < freePeriodEnd) return true;

  return false;
}

/**
 * Checks if a driver has contact access based on the 60-day free trial rule or a valid paid ticket.
 */
export const contactFreeTicketDays = 60;

export function hasValidContactTicket(
  driverTicketExpiry?: any,
  startTicketCollection: boolean = true,
  driverCreatedAt?: any,
  ticketCollectionStartedAt?: any
): boolean {
  if (!startTicketCollection) return true;

  if (driverTicketExpiry) {
    const expiryDate = parseDateInput(driverTicketExpiry);
    if (expiryDate && expiryDate > new Date()) return true;
  }

  const defaultStart = parseDateInput(ticketCollectionStartedAt) || new Date();
  const driverStart = parseDateInput(driverCreatedAt) || defaultStart;

  const effectiveStartDate = new Date(Math.max(driverStart.getTime(), defaultStart.getTime()));
  const contactFreePeriodEnd = new Date(effectiveStartDate.getTime() + contactFreeTicketDays * 24 * 60 * 60 * 1000);

  if (new Date() < contactFreePeriodEnd) return true;

  return false;
}

export function getVIPBadge(stars: number) {
  if (!stars || stars < 1) return null;

  // Provide basic styling for up to 5 tiers, then fallback
  const tags = ["Starter", "Popular", "Advanced", "Premium", "Ultimate"];
  const colors = [
    "from-blue-400 to-blue-600",
    "from-green-400 to-green-600",
    "from-purple-400 to-purple-600",
    "from-pink-400 to-rose-600",
    "from-slate-700 to-black dark:from-slate-300 dark:to-white"
  ];

  const index = Math.min(stars - 1, 4);
  const tag = tags[index] || `VIP ${stars}`;
  const color = colors[index] || "from-brand-primary to-brand-secondary";
  const isPremium = stars >= 5;

  return {
    tag,
    colorClass: isPremium ? 'bg-amber-500 text-black' : `bg-gradient-to-r ${color} text-white`
  };
}
