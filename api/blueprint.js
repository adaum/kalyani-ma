const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

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

      // Stealth partner validation stamp on Page 16 footer: KALYANIMA.IN-<ref>
  const fontFooter = await pdfDoc.embedFont(StandardFonts.Helvetica);
  lastPage.drawText(`-${cleanRef}`, {
    x: 238.5,
    y: 47.5,
    size: 7.5,
    font: fontFooter,
    color: rgb(0.41, 0.44, 0.41),
  });

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
