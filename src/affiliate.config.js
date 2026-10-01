/*
 * ─── SET UP YOUR AFFILIATE LINKS HERE ──────────────────────────────────
 *   amazonTag:     your Amazon Associates tracking ID, e.g. 'lumiere-20'.
 *                  Until it is set, links still work but earn nothing.
 *   amazonDomain:  the store you joined, e.g. 'amazon.com', 'amazon.co.uk'.
 *
 * Each item opens an Amazon search for `query`. For an exact product, paste
 * the product link from the Associates SiteStripe bar into `url` instead
 * (it already carries your tag).
 */
export const AFFILIATE = {
  amazonTag: '',
  amazonDomain: 'amazon.com',
};

export const GEAR = [
  { icon: '📸', name: 'Instant camera', text: 'Real prints the moment you press the shutter, for the party table.', query: 'Fujifilm Instax Mini 12' },
  { icon: '🖨️', name: 'Phone photo printer', text: 'Print favourite frames straight from your phone, credit‑card size.', query: 'Instax Mini Link 3 smartphone printer' },
  { icon: '🖼️', name: '4×6 home printer', text: 'Lab‑quality 4×6 prints at home. Print a double strip and cut it in two.', query: 'Canon SELPHY CP1500' },
  { icon: '💡', name: 'Ring light', text: 'Soft, even light makes every webcam shot look like a studio portrait.', query: 'ring light with phone holder' },
  { icon: '🪟', name: 'Photo strip frames', text: 'Display your 2×6 strips on a shelf, a desk or the fridge.', query: '2x6 photo strip frame' },
  { icon: '🎩', name: 'Photo booth props', text: 'Hats, glasses and signs that turn a snapshot into a story.', query: 'photo booth props kit' },
];

export function gearUrl(item) {
  if (item.url) return item.url;
  const tag = AFFILIATE.amazonTag ? `&tag=${encodeURIComponent(AFFILIATE.amazonTag)}` : '';
  return `https://www.${AFFILIATE.amazonDomain}/s?k=${encodeURIComponent(item.query)}${tag}`;
}
