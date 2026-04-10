import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection.js';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Send verification email via Resend
async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  if (!resend) {
    console.log(`[Auth] Resend not configured. Verification code for ${email}: ${code}`);
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Gamige <onboarding@resend.dev>',
      to: [email],
      subject: 'ვერიფიკაციის კოდი — Gamige.com',
      html: `
<!DOCTYPE html>
<html lang="ka">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Gamige.com</h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">ფასების შედარება ერთ ადგილას</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#374151;font-size:16px;margin:0 0 24px;line-height:1.6;">
                გამარჯობა! თქვენი ვერიფიკაციის კოდია:
              </p>
              <div style="background:#f0f0ff;border:2px dashed #6366f1;border-radius:10px;padding:24px;text-align:center;margin:0 0 24px;">
                <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#4f46e5;">${code}</span>
              </div>
              <p style="color:#6b7280;font-size:14px;margin:0 0 8px;line-height:1.5;">
                კოდი მოქმედებს <strong>15 წუთის</strong> განმავლობაში.
              </p>
              <p style="color:#6b7280;font-size:14px;margin:0;line-height:1.5;">
                თუ თქვენ არ მოითხოვეთ ეს კოდი, უბრალოდ უგულებელყავით ეს წერილი.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                &copy; ${new Date().getFullYear()} Gamige.com — ფასების შედარების პლატფორმა
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
    });

    if (error) {
      console.error('[Auth] Resend email error:', error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[Auth] Failed to send verification email:', err?.message);
    return false;
  }
}

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

// === AUTH CONFIG (public) ===
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});

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

    // Send verification email
    const emailSent = await sendVerificationEmail(emailLower, code);
    if (!emailSent) {
      console.warn(`[Auth] Email sending failed for ${emailLower}, code: ${code}`);
    }

    res.json({
      success: true,
      userId: user.id,
      message: 'ვერიფიკაციის კოდი გამოგზავნილია email-ზე',
      emailSent,
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
router.post('/login', async (req: Request, res: Response) => {
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
    const emailSent = await sendVerificationEmail(email.toLowerCase().trim(), code);
    if (!emailSent) {
      console.warn(`[Auth] Resend email failed for ${email}, code: ${code}`);
    }
    res.status(403).json({ error: 'email ვერიფიცირებული არ არის', needsVerification: true, emailSent });
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

// === GOOGLE SIGN-IN ===
router.post('/google', async (req: Request, res: Response) => {
  const { credential } = req.body;
  if (!credential) {
    res.status(400).json({ error: 'Google credential სავალდებულოა' });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('[Auth] GOOGLE_CLIENT_ID not set');
    res.status(500).json({ error: 'Google auth არ არის კონფიგურირებული' });
    return;
  }

  try {
    // Verify the Google ID token using Google's tokeninfo endpoint
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!verifyRes.ok) {
      res.status(401).json({ error: 'არასწორი Google token' });
      return;
    }

    const payload = await verifyRes.json() as { aud: string; email: string; email_verified: string; name?: string; sub: string };

    // Verify the token was issued for our client
    if (payload.aud !== clientId) {
      res.status(401).json({ error: 'არასწორი Google token' });
      return;
    }

    if (payload.email_verified !== 'true') {
      res.status(401).json({ error: 'Google email ვერიფიცირებული არ არის' });
      return;
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || null;
    const db = getDb();

    // Check if user already exists
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (user) {
      // Existing user — update auth_provider if needed, log them in
      if (user.auth_provider === 'local' && !user.email_verified) {
        // They had an unverified local account — verify it now via Google
        db.prepare('UPDATE users SET email_verified = 1, auth_provider = ?, verification_code = NULL WHERE id = ?').run('google', user.id);
      }
    } else {
      // New user — create account
      const deviceId = `google:${payload.sub}`;
      db.prepare(`
        INSERT INTO users (device_id, email, password_hash, name, email_verified, auth_provider)
        VALUES (?, ?, NULL, ?, 1, 'google')
      `).run(deviceId, email, name);
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    }

    // Generate token and log in
    const token = generateToken();
    db.prepare('UPDATE users SET device_id = ? WHERE id = ?').run(`token:${token}`, user.id);

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name || name },
    });
  } catch (err: any) {
    console.error('[Auth] Google auth error:', err?.message);
    res.status(500).json({ error: 'Google ავტორიზაცია ვერ მოხერხდა' });
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
