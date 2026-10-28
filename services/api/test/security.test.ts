import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import jwt from 'jsonwebtoken';

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const PDF = Buffer.from('%PDF-1.7 fake body here');
const HTML = Buffer.from('<html><script>alert(1)</script></html>');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

describe('upload content sniffing', () => {
  it('recognises real images and PDFs by their leading bytes', async () => {
    const { detectFileType } = await import('../src/services/upload.service');
    expect(detectFileType(JPEG)).toBe('jpeg');
    expect(detectFileType(PNG)).toBe('png');
    expect(detectFileType(PDF)).toBe('pdf');
  });

  it('rejects HTML and SVG even when the client calls them images', async () => {
    const { detectFileType } = await import('../src/services/upload.service');
    expect(detectFileType(HTML)).toBeNull();
    expect(detectFileType(SVG)).toBeNull();
  });

  it('refuses a PDF where only photos are allowed, and ignores the claimed filename/mimetype', async () => {
    const { saveTreePhoto } = await import('../src/services/upload.service');
    await expect(saveTreePhoto({ filename: 'x.png', mimetype: 'image/png', buffer: PDF })).rejects.toThrow(/Unsupported image type/);
    await expect(saveTreePhoto({ filename: 'evil.html', mimetype: 'image/png', buffer: HTML })).rejects.toThrow(/Unsupported image type/);
  });
});

describe('escapeHtml', () => {
  it('neutralises markup in user-supplied names', async () => {
    const { escapeHtml } = await import('../src/utils/html');
    expect(escapeHtml('<a href="https://evil.test">Click</a>')).toBe('&lt;a href=&quot;https://evil.test&quot;&gt;Click&lt;/a&gt;');
    expect(escapeHtml(null)).toBe('');
  });
});

describe('access tokens', () => {
  it('rejects an unsigned (alg: none) token and a token signed with another secret', async () => {
    const { verifyAccessToken, signAccessToken } = await import('../src/utils/jwt');
    const none = jwt.sign({ sub: 'u1', email: 'a@b.c', role: 'admin' }, '', { algorithm: 'none' });
    expect(() => verifyAccessToken(none)).toThrow();
    const wrong = jwt.sign({ sub: 'u1', email: 'a@b.c', role: 'admin' }, 'some-other-secret-some-other-secret');
    expect(() => verifyAccessToken(wrong)).toThrow();
    const good = signAccessToken({ sub: 'u1', email: 'a@b.c', role: 'user' });
    expect(verifyAccessToken(good).sub).toBe('u1');
  });
});

describe('payments fail closed in production', () => {
  it('does not skip payment when Stripe is unconfigured in production, but may in development', async () => {
    const { env } = await import('../src/config/env');
    const { getStripeClientOrDevBypass } = await import('../src/lib/stripe');
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();

    (env as { NODE_ENV: string }).NODE_ENV = 'production';
    expect(() => getStripeClientOrDevBypass()).toThrow(/Stripe is not configured/);

    (env as { NODE_ENV: string }).NODE_ENV = 'development';
    expect(getStripeClientOrDevBypass()).toBeNull();
  });
});

describe('rate limiting', () => {
  async function buildTestApp() {
    const app = Fastify({ trustProxy: true });
    const rateLimitModule = await import('../src/plugins/rateLimit');
    await app.register(rateLimitModule.default);
    app.post('/login', rateLimitModule.limitByBodyField(3, '1 minute', 'email'), async () => ({ ok: true }));
    app.post('/orders/:id/deliver', rateLimitModule.limitByParam(2, '1 minute', 'id'), async () => ({ ok: true }));
    app.get('/health', rateLimitModule.noRateLimit, async () => ({ ok: true }));
    return app;
  }

  it('blocks repeated login attempts for one email but not for another', async () => {
    const app = await buildTestApp();
    const attempt = (email: string) => app.inject({ method: 'POST', url: '/login', payload: { email } });
    for (let i = 0; i < 3; i++) expect((await attempt('victim@example.com')).statusCode).toBe(200);
    expect((await attempt('victim@example.com')).statusCode).toBe(429);
    expect((await attempt('someone-else@example.com')).statusCode).toBe(200);
  });

  it('limits guesses of a delivery code per order, even when the caller changes IP', async () => {
    const app = await buildTestApp();
    const guess = (ip: string) => app.inject({ method: 'POST', url: '/orders/abc/deliver', remoteAddress: ip, payload: {} });
    expect((await guess('1.1.1.1')).statusCode).toBe(200);
    expect((await guess('2.2.2.2')).statusCode).toBe(200);
    expect((await guess('3.3.3.3')).statusCode).toBe(429);
  });

  it('never rate-limits the health check', async () => {
    const app = await buildTestApp();
    for (let i = 0; i < 700; i++) {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
    }
  });
});

describe('mobile error intake', () => {
  async function buildIntakeApp() {
    const app = Fastify({ trustProxy: true });
    const rateLimitModule = await import('../src/plugins/rateLimit');
    await app.register(rateLimitModule.default);
    app.decorate('optionalAuthenticate', async () => {});
    const routes = (await import('../src/routes/clientErrors.routes')).default;
    await app.register(routes, { prefix: '/api/client-errors' });
    return app;
  }

  it('accepts a report and answers 204, even when the report is malformed', async () => {
    const app = await buildIntakeApp();
    const ok = await app.inject({ method: 'POST', url: '/api/client-errors', payload: { message: 'boom', platform: 'android' } });
    expect(ok.statusCode).toBe(204);
    const bad = await app.inject({ method: 'POST', url: '/api/client-errors', payload: { nonsense: true } });
    expect(bad.statusCode).toBe(204);
  });

  it('is rate limited so it cannot be used to flood error reporting', async () => {
    const app = await buildIntakeApp();
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) {
      codes.push((await app.inject({ method: 'POST', url: '/api/client-errors', payload: { message: `e${i}` } })).statusCode);
    }
    expect(codes.slice(0, 10).every((c) => c === 204)).toBe(true);
    expect(codes[10]).toBe(429);
  });
});
