import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './db/database.js';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import sessionRoutes from './routes/sessions.js';
import frequencyRoutes from './routes/frequencies.js';
import reportRoutes from './routes/report.js';
import { scheduleBackup } from './backup.js';
import aiRoutes from './routes/ai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL, // Render/production URL
].filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/frequencies', frequencyRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

initDB().then(() => {
  scheduleBackup();

app.listen(PORT, () => {
    console.log(`Salus server jookseb: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Andmebaasi viga:', err);
  process.exit(1);
});
