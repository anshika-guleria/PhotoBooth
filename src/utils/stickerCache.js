import { STICKER_URLS } from '../constants/stickers';

const imageCache = {};

export function getCachedImage(stickerKey) {
  if (imageCache[stickerKey]) return imageCache[stickerKey];
  const img = new Image();
  img.crossOrigin = "anonymous";  // ← add this
  img.onerror = () => { img.dataset.failed = "true"; };
  img.src = STICKER_URLS[stickerKey];
  imageCache[stickerKey] = img;
  return img;
}
// Preload all stickers immediately when the app loads
// so they're ready in cache before the user clicks anything
export function preloadAllStickers() {
  Object.keys(STICKER_URLS).forEach(key => getCachedImage(key));
}