import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection.js';
import crypto from 'crypto';

const router = Router();

// Simple password hashing (bcrypt alternative without native deps)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verify;
}

// Generate session token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate 6-digit verification code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// === REGISTER ===
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email და პაროლი სავალდებულოა' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'პაროლი მინიმუმ 6 სიმბოლო' });
    return;
  }

  const emailLower = email.toLowerCase().trim();
  const db = getDb();

  // Check if email exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailLower);
  if (existing) {
    res.status(409).json({ error: 'ეს email უკვე რეგისტრირებულია' });
    return;
  }

  const passwordHash = hashPassword(password);
  const code = generateCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  // Create user
  const deviceId = `email:${emailLower}`;
  try {
    db.prepare(`
      INSERT INTO users (device_id, email, password_hash, name, email_verified, verification_code, verification_expires, auth_provider)
      VALUES (?, ?, ?, ?, 0, ?, ?, 'local')
    `).run(deviceId, emailLower, passwordHash, name || null, code, expires);

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(emailLower) as { id: number };

    // TODO: Send email with code (for now, return it in dev mode)
    console.log(`[Auth] Verification code for ${emailLower}: ${code}`);

    res.json({
      success: true,
      userId: user.id,
      message: 'ვერიფიკაციის კოდი გამოგზავნილია email-ზე',
      // Dev mode — remove in production
      _devCode: code,
    });
  } catch (err: any) {
    console.error('[Auth] Register error:', err?.message);
    res.status(500).json({ error: 'რეგისტრაცია ვერ მოხერხდა' });
  }
});

// === VERIFY EMAIL ===
router.post('/verify', (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ error: 'email და კოდი სავალდებულოა' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;

  if (!user) {
    res.status(404).json({ error: 'მომხმარებელი ვერ მოიძებნა' });
    return;
  }

  if (user.email_verified) {
    res.json({ success: true, message: 'email უკვე ვერიფიცირებულია' });
    return;
  }

  if (user.verification_code !== code) {
    res.status(400).json({ error: 'არასწორი კოდი' });
    return;
  }

  if (new Date(user.verification_expires) < new Date()) {
    res.status(400).json({ error: 'კოდს ვადა გაუვიდა, სცადეთ თავიდან' });
    return;
  }

  db.prepare('UPDATE users SET email_verified = 1, verification_code = NULL WHERE id = ?').run(user.id);

  const token = generateToken();
  // Store token (simple approach — in user table)
  db.prepare('UPDATE users SET device_id = ? WHERE id = ?').run(`token:${token}`, user.id);

  res.json({
    success: true,
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

// === LOGIN ===
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email და პაროლი სავალდებულოა' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;

  if (!user || !user.password_hash) {
    res.status(401).json({ error: 'არასწორი email ან პაროლი' });
    return;
  }

  if (!verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'არასწორი email ან პაროლი' });
    return;
  }

  if (!user.email_verified) {
    // Resend code
    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET verification_code = ?, verification_expires = ? WHERE id = ?').run(code, expires, user.id);
    console.log(`[Auth] Resent code for ${email}: ${code}`);
    res.status(403).json({ error: 'email ვერიფიცირებული არ არის', needsVerification: true, _devCode: code });
    return;
  }

  const token = generateToken();
  db.prepare('UPDATE users SET device_id = ? WHERE id = ?').run(`token:${token}`, user.id);

  res.json({
    success: true,
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

// === GET CURRENT USER ===
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'არაავტორიზებული' });
    return;
  }

  const token = authHeader.slice(7);
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, email_verified FROM users WHERE device_id = ?').get(`token:${token}`) as any;

  if (!user) {
    res.status(401).json({ error: 'არაავტორიზებული' });
    return;
  }

  res.json({ user: { id: user.id, email: user.email, name: user.name, emailVerified: !!user.email_verified } });
});

// === DELETE ACCOUNT ===
router.delete('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'არაავტორიზებული' });
    return;
  }

  const token = authHeader.slice(7);
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE device_id = ?').get(`token:${token}`) as any;

  if (!user) {
    res.status(401).json({ error: 'არაავტორიზებული' });
    return;
  }

  try {
    db.prepare('DELETE FROM alerts WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM favorites WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Auth] Delete account error:', err?.message);
    res.status(500).json({ error: 'ანგარიშის წაშლა ვერ მოხერხდა' });
  }
});

// === LOGOUT ===
router.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const db = getDb();
    const user = db.prepare('SELECT id, email FROM users WHERE device_id = ?').get(`token:${token}`) as any;
    if (user) {
      db.prepare('UPDATE users SET device_id = ? WHERE id = ?').run(`email:${user.email}`, user.id);
    }
  }
  res.json({ success: true });
});

export default router;
