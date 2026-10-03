/*
 * ─── SHOOT TOGETHER: CONNECTION SETTINGS ───────────────────────────────
 * Two browsers connect directly to each other (WebRTC). The free PeerJS cloud
 * service only introduces them; photos and video never pass through it.
 *
 * Some strict networks (school or office Wi-Fi, some mobile data) block direct
 * connections. PeerJS then falls back to its public relay. For a more reliable
 * relay, add your own TURN server here, for example from a free Metered.ca account:
 *   { urls: 'turn:a.relay.metered.ca:443', username: '…', credential: '…' }
 */
export const TURN = [];
