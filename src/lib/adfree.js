import { AD_FREE } from '../donate.config.js';

// Tips buy an ad-free pass that runs until a date, then ads come back.
// The device remembers the end date; tipping again while active extends it.
const KEY = 'lumiere-adfree';
const DAY = 24 * 60 * 60 * 1000;

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return v && typeof v.until === 'number' ? v : null;
  } catch (e) {
    return null;
  }
}

/** Ad-free days a tip of `dollars` buys, or the wallet default when the amount is unknown. */
export function daysFor(dollars) {
  const days = dollars ? Math.round(dollars * AD_FREE.daysPerDollar) : AD_FREE.walletDays;
  return Math.min(Math.max(days, 1), AD_FREE.maxDays);
}

/** { until } while a pass is active, { ended } after it runs out, or null. */
export function adFreeStatus() {
  const v = read();
  if (!v) return null;
  return v.until > Date.now() ? { until: v.until } : { ended: v.until };
}

export const isAdFree = () => !!adFreeStatus()?.until;

/** Adds `days` to the pass (on top of any time left) and returns the new end date. */
export function grantAdFree(days) {
  const start = Math.max(Date.now(), read()?.until || 0);
  const until = Math.min(start + days * DAY, Date.now() + AD_FREE.maxDays * DAY);
  try { localStorage.setItem(KEY, JSON.stringify({ until })); } catch (e) { /* storage blocked */ }
  return until;
}

export function clearAdFree() {
  try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
}

/** "3 months", "1 year", "30 days" */
export function describeDays(days) {
  if (days >= 365) return '1 year';
  if (days >= 60 && days % 30 === 0) return `${days / 30} months`;
  return days === 1 ? '1 day' : `${days} days`;
}

export const formatDate = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
