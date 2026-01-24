
/**
 * Security utilities for the application.
 */

/**
 * Checks if a URL is safe to fetch (SSRF protection).
 * Validates protocol and ensures the hostname is not a private/local IP address.
 *
 * @param urlString The URL to check
 * @returns boolean True if safe, false otherwise
 */
export function isSafeUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString);

        // 1. Check Protocol
        if (!['http:', 'https:'].includes(url.protocol)) {
            return false;
        }

        const hostname = url.hostname;

        // 2. Block localhost and known local domains
        if (hostname === 'localhost' ||
            hostname.endsWith('.local') ||
            hostname.endsWith('.internal') ||
            hostname.endsWith('.localhost')) {
            return false;
        }

        // 3. Check for IPv4 address
        // IPv4 Regex (0-255)
        const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        const ipv4Match = hostname.match(ipv4Regex);

        if (ipv4Match) {
            const parts = ipv4Match.slice(1).map(Number);
            const [a, b, c, d] = parts;

            // 0.0.0.0/8 (Current network)
            if (a === 0) return false;
            // 10.0.0.0/8 (Private)
            if (a === 10) return false;
            // 100.64.0.0/10 (Shared Address Space)
            if (a === 100 && (b >= 64 && b <= 127)) return false;
            // 127.0.0.0/8 (Loopback)
            if (a === 127) return false;
            // 169.254.0.0/16 (Link-local)
            if (a === 169 && b === 254) return false;
            // 172.16.0.0/12 (Private)
            if (a === 172 && (b >= 16 && b <= 31)) return false;
            // 192.0.0.0/24 (IETF Protocol Assignments)
            if (a === 192 && b === 0 && c === 0) return false;
            // 192.0.2.0/24 (TEST-NET-1)
            if (a === 192 && b === 0 && c === 2) return false;
            // 192.88.99.0/24 (6to4 Relay Anycast)
            if (a === 192 && b === 88 && c === 99) return false;
            // 192.168.0.0/16 (Private)
            if (a === 192 && b === 168) return false;
            // 198.18.0.0/15 (Network Benchmark)
            if (a === 198 && (b >= 18 && b <= 19)) return false;
            // 198.51.100.0/24 (TEST-NET-2)
            if (a === 198 && b === 51 && c === 100) return false;
            // 203.0.113.0/24 (TEST-NET-3)
            if (a === 203 && b === 0 && c === 113) return false;
            // 224.0.0.0/4 (Multicast)
            if (a >= 224) return false;
        }

        // 4. Check for IPv6 address
        // IPv6 literals are often enclosed in brackets in URLs (e.g., [::1])
        let normalizedHostname = hostname;
        if (normalizedHostname.startsWith('[') && normalizedHostname.endsWith(']')) {
            normalizedHostname = normalizedHostname.slice(1, -1);
        }

        // Basic check for common private/local IPv6 ranges
        if (normalizedHostname === '::1') return false; // Loopback
        if (normalizedHostname === '::') return false;

        // fc00::/7 (Unique Local) -> fc00 to fdff
        // regex: ^f[cd][0-9a-f]{2}:
        if (/^f[cd][0-9a-f]{2}:/i.test(normalizedHostname)) return false;

        // fe80::/10 (Link-local) -> fe80 to febf
        // regex: ^fe[89ab][0-9a-f]:
        if (/^fe[89ab][0-9a-f]:/i.test(normalizedHostname)) return false;

        // Common metadata services
        if (hostname === 'metadata.google.internal') return false;
        if (hostname === '169.254.169.254') return false; // Already covered by IP check, but explicit is fine.

        return true;
    } catch (e) {
        return false;
    }
}
