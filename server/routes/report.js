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
  if (val === null || val === undefined) return '#9CA3AF';
  if (val >= 85) return '#2F9E44';
  if (val >= 50) return '#5C940D';
  return '#E03131';
}

function resultBgHex(val) {
  if (val === null || val === undefined) return '#F3F4F6';
  if (val >= 85) return '#EBFBEE';
  if (val >= 50) return '#D3F9D8';
  return '#FFF5F5';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    initial: isEt ? 'Esialgne' : 'Initial',
    prevSession: isEt ? 'Eelmine seanss' : 'Previous session',
    phone: '+372 503 7037',
    website: 'www.lifekeskus.ee',
    email: 'info@lifekeskus.ee',
  };

  try {
    const { rows: sessions } = await pool.query(`
      SELECT s.*, u.name as therapist_name
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

    const filename = `raport_${formatDate(session.date).replace(/\./g, '-')}_${lang}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const PW = doc.page.width;
    const PH = doc.page.height;
    const ML = 40, MR = 40;
    const contentW = PW - ML - MR;
    const FOOTER_H = 36;
    const availH = PH - FOOTER_H - 10;

    // FOOTER funktsioon — täpsed absoluutsed koordinaadid, ei kasuta automaatset positsioneerimist
    const drawFooter = () => {
      const fy = PH - FOOTER_H;
      doc.save();

      // Joon
      doc.moveTo(ML, fy).lineTo(PW - MR, fy)
        .strokeColor('#3a472e').lineWidth(1).stroke();

      // Logo vasakul
      const hasLogo = fs.existsSync(LOGO_PATH);
      if (hasLogo) {
        doc.image(LOGO_PATH, ML, fy + 8, { height: 15, fit: [60, 15] });
      }

      // Kontaktandmed paremal — kasuta moveTo et vältida cursor nihkumist
      const contactText = `${t.phone}  |  ${t.website}  |  ${t.email}`;
      doc.fontSize(8).fillColor('#6B7280').font(R('Regular'));
      const textW2 = doc.widthOfString(contactText);
      doc.text(contactText, PW - MR - textW2 - 5, fy + 11, { lineBreak: false });

      doc.restore();
    };

    // PÄIS
    doc.fontSize(20).fillColor('#1A1916').font(R('Bold')).text(t.title, ML, 40);

    const infoY = 72;
    const colW = contentW / 4;
    const dur = session.duration_minutes || 60;
    const durLabel = isEt ? `${dur} minutit` : `${dur} minutes`;

    [[t.client, `${client.first_name} ${client.last_name}`],
     [t.therapist, session.therapist_name || '—'],
     [t.date, formatDate(session.date)],
     [t.duration, durLabel]].forEach(([label, val], i) => {
      const x = ML + i * colW;
      doc.fontSize(8).fillColor('#6B7280').font(R('Regular')).text(label, x, infoY);
      doc.fontSize(12).fillColor('#1A1916').font(R('Bold')).text(val, x, infoY + 12);
    });

    doc.moveTo(ML, infoY + 34).lineTo(PW - MR, infoY + 34)
      .strokeColor('#E5E7EB').lineWidth(0.5).stroke();

    // SAGEDUSED
    let y = infoY + 44;

    // Pill joonistamise funktsioon
    const drawPill = (val, px, py, small = false) => {
      const fs2 = small ? 7 : 9;
      const pw2 = small ? 22 : 26;
      const ph2 = small ? 13 : 15;
      doc.roundedRect(px, py, pw2, ph2, ph2 / 2).fillColor(resultBgHex(val)).fill();
      const textY = py + (ph2 / 2) - (fs2 / 2) - 1;
      doc.fontSize(fs2).fillColor(resultColorHex(val)).font(R('Bold'))
        .text(String(val ?? '—'), px, textY, { width: pw2, align: 'center', lineBreak: false });
      return pw2 + 3;
    };

    for (const entry of entries) {
      const desc = (isEt ? entry.freq_desc_et : entry.freq_desc_en) || entry.freq_desc_et || entry.frequency_name || '';
      const minutes = entry.minute_results || [];
      const initVal = entry.initial_result;
      const prev = prevEntryMap[entry.frequency_id];

      const descH = doc.heightOfString(desc, { width: contentW - 20, fontSize: 10 });
      const rowH = descH + 28 + (prev ? 18 : 0) + 10;

      // Lehevahetus — joonista footer ENNE
      if (y + rowH > availH) {
        drawFooter();
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
        y = 40;
      }

      // Kirjeldus
      doc.fontSize(10).fillColor('#374151').font(R('Regular'))
        .text(desc, ML, y, { width: contentW - 20 });

      const pillsY = y + descH + 4;

      // Praeguse seansi tulemused
      let px = ML;
      doc.fontSize(8).fillColor('#6B7280').font(R('Regular'))
        .text(`${t.initial}:`, px, pillsY + 3, { lineBreak: false });
      px += 36;
      px += drawPill(initVal, px, pillsY);
      px += 8;
      minutes.forEach((m, i) => {
        doc.fontSize(7).fillColor('#9CA3AF').font(R('Regular'))
          .text(`${i + 1}min`, px, pillsY + 4, { lineBreak: false });
        px += 20;
        px += drawPill(m, px, pillsY);
        px += 4;
      });

      // Eelmine seanss
      if (prev) {
        const prevY = pillsY + 18;
        const prevMins = prev.minute_results || [];
        let ppx = ML;
        doc.fontSize(7).fillColor('#9CA3AF').font(R('Regular'))
          .text(`${t.prevSession} (${formatDate(prev.date)}):`, ppx, prevY + 2, { lineBreak: false });
        ppx += 120;
        ppx += drawPill(prev.initial_result, ppx, prevY, true);
        ppx += 8;
        prevMins.forEach((m, i) => {
          doc.fontSize(6).fillColor('#C0C0C0').font(R('Regular'))
            .text(`${i + 1}min`, ppx, prevY + 3, { lineBreak: false });
          ppx += 18;
          ppx += drawPill(m, ppx, prevY, true);
          ppx += 3;
        });
      }

      y += rowH + 4;

      // Eraldus joon
      if (y < availH - 10) {
        doc.moveTo(ML, y - 4).lineTo(PW - MR, y - 4)
          .strokeColor('#F3F4F6').lineWidth(0.5).stroke();
      }
    }

    // Footer viimasele lehele
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
