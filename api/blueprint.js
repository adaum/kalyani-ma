const fs = require('fs');
const path = require('path');
const { PDFDocument, PDFName, PDFFont, rgb } = require('pdf-lib');

const DEFAULT_REF = '44405';

module.exports = async function handler(req, res) {
  try {
    const rawRef = Array.isArray(req.query?.ref) ? req.query.ref[0] : (req.query?.ref || '');
    const cleanRef = String(rawRef).trim().replace(/[^a-zA-Z0-9_-]/g, '') || DEFAULT_REF;

    const rawRegion = Array.isArray(req.query?.region) ? req.query.region[0] : (req.query?.region || '');
    const cleanRegion = String(rawRegion).trim().toLowerCase();
    const isIndia = cleanRegion === 'india' || cleanRegion === 'in';

    const targetUrl = isIndia
      ? `https://kalyanima.in/access?ref=${encodeURIComponent(cleanRef)}&region=India`
      : `https://referral.doterra.me/${encodeURIComponent(cleanRef)}`;

    const pdfPath = path.join(process.cwd(), 'assets', 'household-botanical-blueprint.pdf');
    const existingPdfBytes = fs.readFileSync(pdfPath);

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width } = lastPage.getSize();

    // Inherit the exact embedded Inter SemiBold font directly from Page 16's resources
    const resources = lastPage.node.Resources();
    const fontDict = resources.lookup(PDFName.of('Font'));
    let inheritedFont = null;
    for (const [key, ref] of fontDict.entries()) {
      const fObj = pdfDoc.context.lookup(ref);
      const baseFont = fObj?.get(PDFName.of('BaseFont'))?.toString() || '';
      if (baseFont.includes('Inter')) {
        inheritedFont = PDFFont.of(ref, pdfDoc);
      }
    }

    const uriAction = pdfDoc.context.obj({
      Type: 'Action',
      S: 'URI',
      URI: targetUrl,
    });
    const linkAnnot = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [72, 322, width - 72, 360],
      Border: [0, 0, 0],
      A: uriAction,
    });
    const annots = lastPage.node.Annots();
    if (annots) {
      annots.push(linkAnnot);
    } else {
      lastPage.node.set(pdfDoc.context.obj('Annots'), pdfDoc.context.obj([linkAnnot]));
    }

    const fontSize = 6.75;
    const tracking = 1.05;
    let cursorX = 55.0;
    for (const ch of 'DOC #:') {
      lastPage.drawText(ch, {
        x: cursorX,
        y: 42.5,
        size: fontSize,
        ...(inheritedFont ? { font: inheritedFont } : {}),
        color: rgb(0.361, 0.400, 0.369),
      });
      cursorX += (inheritedFont ? inheritedFont.widthOfTextAtSize(ch, fontSize) : 4.0) + tracking;
    }
    cursorX -= 0.8;
    for (const ch of `${cleanRef}`) {
      lastPage.drawText(ch, {
        x: cursorX,
        y: 42.5,
        size: fontSize,
        ...(inheritedFont ? { font: inheritedFont } : {}),
        color: rgb(0.361, 0.400, 0.369),
      });
      cursorX += (inheritedFont ? inheritedFont.widthOfTextAtSize(ch, fontSize) : 4.0) + tracking;
    }

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Household-Botanical-Blueprint.pdf"');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('PDF stamp error:', err);
    return res.status(500).json({ error: 'Unable to generate personalized Blueprint PDF.' });
  }
};
