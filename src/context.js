import { createContext, useContext } from 'react';

/** `toast(message)` shows a short status message at the bottom of the page. */
export const ToastContext = createContext(() => {});
/** Placeholder portraits for previews, plus a counter that bumps once webfonts load. */
export const ArtContext = createContext({ placeholders: [], fontsVersion: 0 });

export const useToast = () => useContext(ToastContext);
export const useArt = () => useContext(ArtContext);
