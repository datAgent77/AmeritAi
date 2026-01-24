import { expect, test, describe } from 'vitest';
import { isSafeUrl } from './security';

describe('isSafeUrl', () => {
  test('allows safe public URLs', () => {
    expect(isSafeUrl('https://google.com')).toBe(true);
    expect(isSafeUrl('http://example.com/foo')).toBe(true);
    expect(isSafeUrl('https://safe-site.com')).toBe(true);
  });

  test('blocks invalid protocols', () => {
    expect(isSafeUrl('ftp://example.com')).toBe(false);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
  });

  test('blocks localhost and local domains', () => {
    expect(isSafeUrl('http://localhost')).toBe(false);
    expect(isSafeUrl('http://localhost:3000')).toBe(false);
    expect(isSafeUrl('http://my.local')).toBe(false);
    expect(isSafeUrl('http://my.internal')).toBe(false);
  });

  test('blocks IPv4 private ranges', () => {
    expect(isSafeUrl('http://127.0.0.1')).toBe(false);
    expect(isSafeUrl('http://0.0.0.0')).toBe(false);
    expect(isSafeUrl('http://10.0.0.1')).toBe(false);
    expect(isSafeUrl('http://192.168.1.1')).toBe(false);
    expect(isSafeUrl('http://169.254.169.254')).toBe(false); // Link-local / Cloud Metadata
  });

  test('blocks IPv6 loopback and private ranges', () => {
    expect(isSafeUrl('http://[::1]')).toBe(false);
    expect(isSafeUrl('http://[::]')).toBe(false);
    expect(isSafeUrl('http://[fc00::1]')).toBe(false); // Unique Local
    expect(isSafeUrl('http://[fe80::1]')).toBe(false); // Link-local
  });

  test('blocks cloud metadata services', () => {
    expect(isSafeUrl('http://metadata.google.internal')).toBe(false);
    expect(isSafeUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
  });

  test('blocks obfuscated IPs', () => {
    // These rely on URL parsing normalization
    expect(isSafeUrl('http://0177.0.0.1')).toBe(false); // Octal 127.0.0.1
    expect(isSafeUrl('http://0x7f.0.0.1')).toBe(false); // Hex 127.0.0.1
  });
});
