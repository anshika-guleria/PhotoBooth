import { STICKER_URLS } from '../constants/stickers';

const imageCache = {};

export function getCachedImage(stickerKey) {
  if (imageCache[stickerKey]) return imageCache[stickerKey];
  const img = new Image();
  img.onerror = () => { img.dataset.failed = "true"; };
  img.src = STICKER_URLS[stickerKey];
  imageCache[stickerKey] = img;
  return img;
}
