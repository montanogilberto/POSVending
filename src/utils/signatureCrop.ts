// Crops the printed signature region from a captured INE (Mexican voter
// ID) front photo, for automated comparison against the signature captured
// at contract-signing time (see SignaturePad.tsx + the Contrato step in
// ClientsPage.tsx / ClientFaceRecognitionPage.tsx).
//
// The fractions below are calibrated against a real captured front image
// from this session (1100x694, the capture pipeline's standard output
// size) — verified visually via a direct Python/OpenCV crop test before
// being ported here, not guessed blind. Still a single-sample estimate:
// it will likely need retuning against a broader range of real captures
// (how tightly different users fill the capture guide, INE print
// revisions), and only applies to the CURRENT INE layout — INE has been
// redesigned multiple times historically. Only call this for
// documentType === 'INE'; for Passport/Driver License the physical layout
// is different and this rect would crop meaningless content.
const SIGNATURE_RECT_FRAC = {
  xFrac: 0.14,
  yFrac: 0.70,
  widthFrac: 0.24,
  heightFrac: 0.11,
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for signature crop'));
    img.src = src;
  });
}

// Returns a PNG data URL of just the signature region, cropped from the
// full front-of-card capture. Throws if the image fails to load — callers
// should treat that as "signature crop unavailable" and skip the match
// attempt rather than block the wizard.
export async function cropIneSignatureRegion(idFrontImageBase64: string): Promise<string> {
  const img = await loadImage(idFrontImageBase64);

  const cropX = img.naturalWidth * SIGNATURE_RECT_FRAC.xFrac;
  const cropY = img.naturalHeight * SIGNATURE_RECT_FRAC.yFrac;
  const cropW = img.naturalWidth * SIGNATURE_RECT_FRAC.widthFrac;
  const cropH = img.naturalHeight * SIGNATURE_RECT_FRAC.heightFrac;

  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2D context for signature crop');

  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return canvas.toDataURL('image/png');
}
