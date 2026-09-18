import jsQR from 'jsqr';

/**
 * Decodes a QR code from a photo entirely in the browser - no image leaves
 * the device for QR (docs/SCANNING.md "Input methods" §1, K deliverable 1).
 * Unlike strip/bill capture, this never calls /v1/uploads or /v1/scans.
 */
export async function decodeQrFromFile(file: File): Promise<string | undefined> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  return code?.data;
}
