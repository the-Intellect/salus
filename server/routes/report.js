import express from 'express';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { pool } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const LOGO_PATH = path.join(__dirname, '../assets/logo.png');
const FONTS_DIR = path.join(__dirname, '../assets/fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'Montserrat-Regular.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'Montserrat-Bold.ttf');

function hasFont() {
  return fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD);
}

function resultColorHex(val) {
  if (val === null || val === undefined) return '#6B7280';
  if (val >= 50) return '#2F9E44';
  return '#E03131';
}

function resultBgHex(val) {
  return '#FFFFFF'; // ei kasuta enam taustavärvi
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Joonistab tabeli jooned — ilma vasaku ja parema välisservata
// Ainult horisontaalsed jooned + sisemised vertikaalid
function drawTableLines(doc, ML, y, contentW, rowH, X_TEST, X_MINS, MAX_MINS, COL_W) {
  doc.save();
  doc.strokeColor('#E5E7EB').lineWidth(0.5);

  const RIGHT = ML + contentW;

  // Ülemine horisontaaljoon
  doc.moveTo(ML, y).lineTo(RIGHT, y).stroke();
  // Alumine horisontaaljoon
  doc.moveTo(ML, y + rowH).lineTo(RIGHT, y + rowH).stroke();

  // Sisemised vertikaalid — kirjelduse ja Test tulba vahel
  doc.moveTo(X_TEST, y).lineTo(X_TEST, y + rowH).stroke();
  // Test ja 1min vahel
  doc.moveTo(X_MINS, y).lineTo(X_MINS, y + rowH).stroke();
  // Minutite vahelised jooned
  for (let m = 1; m < MAX_MINS; m++) {
    doc.moveTo(X_MINS + m * COL_W, y).lineTo(X_MINS + m * COL_W, y + rowH).stroke();
  }
  // Viimane minut parem serv
  doc.moveTo(X_MINS + MAX_MINS * COL_W, y).lineTo(X_MINS + MAX_MINS * COL_W, y + rowH).stroke();

  doc.restore();
}

router.post('/session/:sessionId', requireAuth, async (req, res) => {
  const { lang = 'et' } = req.body;
  const isEt = lang === 'et';

  const t = {
    title: 'MER Biofeedback® teraapia',
    client: isEt ? 'Klient' : 'Client',
    therapist: isEt ? 'Terapeut' : 'Therapist',
    date: isEt ? 'Kuupäev' : 'Date',
    duration: isEt ? 'Seansi pikkus' : 'Session length',
    description: isEt ? 'Kirjeldus' : 'Description',
    test: 'Test',
    phone: '+372 503 7037',
    website: 'www.lifekeskus.ee',
    email: 'info@lifekeskus.ee',
  };

  try {
    const { rows: sessions } = await pool.query(`
      SELECT s.*, u.name as therapist_name, s.client_recommendation
      FROM sessions s LEFT JOIN users u ON s.therapist_id = u.id
      WHERE s.id = $1
    `, [req.params.sessionId]);
    if (!sessions[0]) return res.status(404).json({ error: 'Seanssi ei leitud' });
    const session = sessions[0];

    const { rows: clients } = await pool.query('SELECT * FROM clients WHERE id=$1', [session.client_id]);
    if (!clients[0]) return res.status(404).json({ error: 'Klienti ei leitud' });
    const client = clients[0];

    const { rows: entries } = await pool.query(`
      SELECT se.*, f.description as freq_desc_et, f.description_en as freq_desc_en
      FROM session_entries se
      LEFT JOIN frequencies f ON se.frequency_id = f.id
      WHERE se.session_id = $1 ORDER BY se.sort_order
    `, [session.id]);

    const { rows: prevEntries } = await pool.query(`
      SELECT se.frequency_id, se.initial_result, se.minute_results, se.final_result, s.date
      FROM session_entries se
      JOIN sessions s ON se.session_id = s.id
      WHERE s.client_id = $1 AND s.id != $2
      ORDER BY s.date DESC
    `, [session.client_id, session.id]);

    const prevEntryMap = {};
    for (const pe of prevEntries) {
      if (!prevEntryMap[pe.frequency_id]) prevEntryMap[pe.frequency_id] = pe;
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    const useFont = hasFont();
    if (useFont) {
      doc.registerFont('Regular', FONT_REGULAR);
      doc.registerFont('Bold', FONT_BOLD);
    }
    const R = (name) => useFont ? name : (name === 'Bold' ? 'Helvetica-Bold' : 'Helvetica');

    const clientName = `${client.first_name}_${client.last_name}`.replace(/\s+/g, '_');
    const filename = `${clientName}_${formatDate(session.date).replace(/\./g, '-')}_${lang}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const PW = doc.page.width;
    const PH = doc.page.height;
    const ML = 40, MR = 40;
    const contentW = PW - ML - MR;
    const FOOTER_H = 38;
    const availH = PH - FOOTER_H - 10;

    // Tabeli mõõdud
    const MAX_MINS = 7;
    const COL_W = 36;
    const TEST_W = 40;
    const MINS_W = MAX_MINS * COL_W;
    const DESC_W = contentW - TEST_W - MINS_W;

    const X_DESC = ML;
    const X_TEST = ML + DESC_W;
    const X_MINS = X_TEST + TEST_W;

    // =====================
    // FOOTER
    // =====================
    const drawFooter = () => {
      const fy = PH - FOOTER_H;
      doc.save();
      doc.moveTo(ML, fy).lineTo(PW - MR, fy)
        .strokeColor('#3a472e').lineWidth(1).stroke();
      const hasLogo = fs.existsSync(LOGO_PATH);
      if (hasLogo) {
        doc.image(LOGO_PATH, ML, fy + 10, { height: 15, fit: [60, 15] });
      }
      const contactText = `${t.phone}  |  ${t.website}  |  ${t.email}`;
      doc.fontSize(10).fillColor('#6B7280').font(R('Regular'));
      const textW2 = doc.widthOfString(contactText);
      doc.text(contactText, PW - MR - textW2 - 5, fy + 12, { lineBreak: false });
      doc.restore();
    };

    // =====================
    // PÄIS
    // =====================
    doc.fontSize(20).fillColor('#1A1916').font(R('Bold')).text(t.title, ML, 38);

    const infoY = 68;
    const colW4 = contentW / 4;
    const dur = session.duration_minutes || 60;
    const durLabel = isEt ? `${dur} minutit` : `${dur} minutes`;

    [[t.client, `${client.first_name} ${client.last_name}`],
     [t.therapist, session.therapist_name || '—'],
     [t.date, formatDate(session.date)],
     [t.duration, durLabel]].forEach(([label, val], i) => {
      const x = ML + i * colW4;
      doc.fontSize(8).fillColor('#6B7280').font(R('Regular')).text(label, x, infoY);
      doc.fontSize(13).fillColor('#1A1916').font(R('Bold')).text(val, x, infoY + 11);
    });

    // Päise ja tabeli vaheline joon PUUDUB — tabeli esimese rea ülemine joon täidab selle rolli

    // =====================
    // TABELI PÄIS
    // =====================
    let y = infoY + 38;
    const HEADER_H = 22;

    // Päise taustad
    doc.rect(X_DESC, y, DESC_W, HEADER_H).fillColor('#F9FAFB').fill();
    doc.rect(X_TEST, y, TEST_W, HEADER_H).fillColor('#F9FAFB').fill();
    for (let m = 0; m < MAX_MINS; m++) {
      doc.rect(X_MINS + m * COL_W, y, COL_W, HEADER_H).fillColor('#F9FAFB').fill();
    }

    // Päise tekst
    doc.fontSize(9).fillColor('#6B7280').font(R('Bold'));
    doc.text(t.description, X_DESC + 6, y + 7, { lineBreak: false });
    doc.text(t.test, X_TEST, y + 7, { width: TEST_W, align: 'center', lineBreak: false });
    for (let m = 0; m < MAX_MINS; m++) {
      doc.text(`${m + 1}min`, X_MINS + m * COL_W, y + 7, { width: COL_W, align: 'center', lineBreak: false });
    }

    // Päise jooned (ülemine + alumine + sisemised vertikaalid, EI vasak/parem serv)
    drawTableLines(doc, ML, y, contentW, HEADER_H, X_TEST, X_MINS, MAX_MINS, COL_W);
    y += HEADER_H;

    // =====================
    // SAGEDUSTE READ
    // =====================
    const drawTableHeader = (startY) => {
      doc.rect(X_DESC, startY, DESC_W, HEADER_H).fillColor('#F9FAFB').fill();
      doc.rect(X_TEST, startY, TEST_W, HEADER_H).fillColor('#F9FAFB').fill();
      for (let m = 0; m < MAX_MINS; m++) {
        doc.rect(X_MINS + m * COL_W, startY, COL_W, HEADER_H).fillColor('#F9FAFB').fill();
      }
      doc.fontSize(9).fillColor('#6B7280').font(R('Bold'));
      doc.text(t.description, X_DESC + 6, startY + 7, { lineBreak: false });
      doc.text(t.test, X_TEST, startY + 7, { width: TEST_W, align: 'center', lineBreak: false });
      for (let m = 0; m < MAX_MINS; m++) {
        doc.text(`${m + 1}min`, X_MINS + m * COL_W, startY + 7, { width: COL_W, align: 'center', lineBreak: false });
      }
      drawTableLines(doc, ML, startY, contentW, HEADER_H, X_TEST, X_MINS, MAX_MINS, COL_W);
      return startY + HEADER_H;
    };

    for (const entry of entries) {
      const desc = (isEt ? entry.freq_desc_et : entry.freq_desc_en) || entry.freq_desc_et || entry.frequency_name || '';
      const minutes = entry.minute_results || [];
      const initVal = entry.initial_result;
      const prev = prevEntryMap[entry.frequency_id];
      const prevMins = prev?.minute_results || [];

      const descH = doc.heightOfString(desc, { width: DESC_W - 12, fontSize: 9 });
      const ROW_H = Math.max(descH + 14, 24);

      // Lehevahetus
      if (y + ROW_H > availH) {
        drawFooter();
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
        y = drawTableHeader(40);
      }

      // 1. Eelmise seansi highlight — joonista ENNE teksti (taust)
      if (prev) {
        // Test lahter
        doc.rect(X_TEST, y, TEST_W, ROW_H).fillColor('#F0FDF4').fill();
        // Minutite lahtrid
        for (let m = 0; m < prevMins.length && m < MAX_MINS; m++) {
          doc.rect(X_MINS + m * COL_W, y, COL_W, ROW_H).fillColor('#F0FDF4').fill();
        }
      }

      // 2. Kirjelduse ala (valge taust, üle eelmise seansi rohelise)
      doc.rect(X_DESC, y, DESC_W, ROW_H).fillColor('#FFFFFF').fill();

      // 3. Jooned — joonistame PÄRAST tausta aga ENNE teksti
      drawTableLines(doc, ML, y, contentW, ROW_H, X_TEST, X_MINS, MAX_MINS, COL_W);

      // 4. Kirjelduse tekst
      doc.fontSize(9).fillColor('#374151').font(R('Regular'))
        .text(desc, X_DESC + 6, y + 7, { width: DESC_W - 12, lineBreak: true });

      // 5. Test (esialgne) tulemus
      if (initVal !== null && initVal !== undefined) {
        const cellCenterY = y + (ROW_H / 2) - 7;
        doc.rect(X_TEST + 4, cellCenterY, TEST_W - 8, 14)
          .fillColor(resultBgHex(initVal)).fill();
        doc.fontSize(9).fillColor(resultColorHex(initVal)).font(R('Bold'))
          .text(String(initVal), X_TEST + 4, cellCenterY + 3, { width: TEST_W - 8, align: 'center', lineBreak: false });
      }

      // 6. Minutite tulemused
      minutes.forEach((m, mi) => {
        if (mi >= MAX_MINS) return;
        const cellCenterY = y + (ROW_H / 2) - 7;
        const cx = X_MINS + mi * COL_W;
        doc.rect(cx + 4, cellCenterY, COL_W - 8, 14)
          .fillColor(resultBgHex(m)).fill();
        doc.fontSize(9).fillColor(resultColorHex(m)).font(R('Bold'))
          .text(String(m), cx + 4, cellCenterY + 3, { width: COL_W - 8, align: 'center', lineBreak: false });
      });

      y += ROW_H;
    }

    // Viimane alumine joon
    doc.save();
    doc.strokeColor('#E5E7EB').lineWidth(0.5);
    doc.moveTo(ML, y).lineTo(ML + contentW, y).stroke();
    doc.restore();

    // AI SOOVITUS KLIENDILE
    if (session.client_recommendation) {
      const recLabel = isEt ? 'Soovitus:' : 'Recommendation:';

      // Kontrolli kas mahub lehele — arvuta ENNE y muutmist
      const recTextH = doc.heightOfString(session.client_recommendation, { width: contentW - 20, fontSize: 10 });
      const recBlockH = recTextH + 50; // pealkiri + vabakäigu + tekst

      if (y + 20 + recBlockH > availH) {
        drawFooter();
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
        y = 40;
      }

      // Nüüd joonista õigele y-le
      const rY = y + 20;
      doc.fontSize(11).fillColor('#1A1916').font(R('Bold')).text(recLabel, ML, rY);
      doc.fontSize(10).fillColor('#374151').font(R('Regular'))
        .text(session.client_recommendation, ML, rY + 18, { width: contentW - 20, lineBreak: true });
    }

    drawFooter();
    doc.end();

  } catch (err) {
    console.error('PDF viga:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'PDF genereerimine ebaõnnestus: ' + err.message });
    }
  }
});

export default router;
