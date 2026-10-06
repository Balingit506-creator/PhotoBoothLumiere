// A confirmed PayPal or card tip turns ads off for good on that device.
// (Older time-limited passes still count until their end date.)
const KEY = 'lumiere-adfree';

export function isAdFree() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return !!v && (v.lifetime === true || (typeof v.until === 'number' && v.until > Date.now()));
  } catch (e) {
    return false;
  }
}

export function grantAdFree() {
  try { localStorage.setItem(KEY, JSON.stringify({ lifetime: true, since: Date.now() })); } catch (e) { /* storage blocked */ }
}

export function clearAdFree() {
  try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
}
