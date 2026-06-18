const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export function rateLimit(ip: string, limit = 60, windowMs = 60 * 1000) {
  const now = Date.now();

  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.lastReset > windowMs) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return { allowed: true };
  }

  entry.count++;

  if (entry.count > limit) {
    return { allowed: false };
  }

  return { allowed: true };
}