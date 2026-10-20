// src/config.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Simple native .env parser (zero external dependencies)
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        // Remove surrounding quotes if any
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const rawDomains = process.env.ALLOWED_EMAIL_DOMAINS || 'gmail.com,fpt.edu.vn,fe.edu.vn';
const allowedEmailDomains = rawDomains
  .split(',')
  .map(d => d.trim().toLowerCase())
  .filter(Boolean);

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  adminEmail: (process.env.ADMIN_EMAIL || 'owner.admin@gmail.com').trim().toLowerCase(),
  allowedEmailDomains,
  sessionSecret: process.env.SESSION_SECRET || 'know-your-strengths-default-secret-salt-2026',
  sessionDurationDays: 7,
  dbPath: process.env.DB_PATH || path.join(rootDir, 'data', 'know_your_strengths.db'),
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
  },
  isDomainAllowed(email) {
    if (!email || typeof email !== 'string') return false;
    const parts = email.trim().toLowerCase().split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1];
    if (allowedEmailDomains.length === 0) return true;
    return allowedEmailDomains.some(allowed => domain === allowed || domain.endsWith('.' + allowed));
  }
};
