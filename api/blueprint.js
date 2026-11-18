const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const DEFAULT_REF = '44405';

module.exports = async function handler(req, res) {
  try {
    const rawRef = Array.isArray(req.query?.ref) ? req.query.ref[0] : (req.query?.ref || '');
    const cleanRef = String(rawRef).trim().replace(/[^a-zA-Z0-9_-]/g, '') || DEFAULT_REF;
    const targetUrl = `https://referral.doterra.me/${cleanRef}`;

    const pdfPath = path.join(process.cwd(), 'assets', 'household-botanical-blueprint.pdf');
    const existingPdfBytes = fs.readFileSync(pdfPath);

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1]; // Page 8
    const { width } = lastPage.getSize();

    // Make the entire CTA button + link area on Page 8 clickable to targetUrl
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
