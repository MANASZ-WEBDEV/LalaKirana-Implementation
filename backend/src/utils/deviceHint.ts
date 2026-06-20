export function parseDeviceHint(userAgent?: string): string {
  if (!userAgent) return 'Unknown Device';

  const ua = userAgent.toLowerCase();
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('edge') || ua.includes('edg')) {
    browser = 'Edge';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
  } else if (ua.includes('chrome')) {
    browser = 'Chrome';
  } else if (ua.includes('safari')) {
    browser = 'Safari';
  }

  if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    os = 'macOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  }

  return `${browser} on ${os}`;
}
