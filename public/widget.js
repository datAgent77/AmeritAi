(function () {
  const BLOCKED_WIDGET_ROUTE_PREFIXES = [
    '/admin',
    '/agency',
    '/console',
    '/onboarding',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password'
  ];

  function isBlockedWidgetRoute(pathname) {
    const currentPath = pathname || window.location.pathname || '';
    return BLOCKED_WIDGET_ROUTE_PREFIXES.some((prefix) => currentPath.startsWith(prefix));
  }

  if (isBlockedWidgetRoute()) {
    return;
  }

  // Global Initialization Guard to prevent multiple widgets if script is included twice
  if (window.__VION_WIDGET_INITIALIZED__) {
    console.warn('Vion AI Widget is already initialized.');
    return;
  }
  window.__VION_WIDGET_INITIALIZED__ = true;

  // Find the current script tag to extract configuration
  // Fallback for async scripts where document.currentScript might be null
  const currentScript = document.currentScript || Array.from(document.querySelectorAll('script[src*="/widget.js"]')).at(-1);

  if (!currentScript) {
    console.error('Userex Widget: Could not find script tag to initialize.');
    return;
  }

  const scriptSrc = currentScript.src;
  let baseUrl = new URL(scriptSrc).origin; // Dynamically get base URL
  // Canonicalize to avoid CORS preflight redirects
  if (baseUrl === 'https://getvion.com') {
    baseUrl = 'https://www.getvion.com';
  }

  const attrColor = currentScript.getAttribute('data-color');
  const chatbotId = currentScript.getAttribute('data-chatbot-id') || 'default';
  const previewDraftKey = currentScript.getAttribute('data-preview-draft-key') || '';
  const previewAmbientDockState = currentScript.getAttribute('data-preview-ambient-dock-state') || '';
  const previewAmbientThinking = currentScript.getAttribute('data-preview-ambient-thinking') === 'true';

  console.log('Userex Widget Initializing...');
  console.log('Chatbot ID:', chatbotId);

  // Default Settings
  let settings = {
    primaryColor: attrColor || '#000000',
    position: 'bottom-right',
    viewMode: 'classic',
    interactionMode: 'launcher',
    chatDisplayMode: 'classic',
    sidecarWidth: 420,
    sidecarMinWidth: 360,
    sidecarMaxWidth: 560,
    sidecarGutter: 0,
    sidecarDesktopOnly: true,
    sidecarAlwaysOpen: false,
    ambientWidth: 800,
    ambientInputWidth: 800,
    ambientSideMargin: 0,
    launcherStyle: 'circle',
    launcherWidth: 60,
    launcherHeight: 60,
    fullImageLauncherWidth: 60,
    fullImageLauncherHeight: 60,
    launcherRadius: 50,
    launcherText: 'Chat',
    launcherIcon: 'message',
    launcherIconColor: '#FFFFFF',
    launcherBackgroundColor: '',
    // Full Image / Lottie Mode
    launcherType: 'standard',
    launcherImageMode: 'image',
    launcherFullImageUrl: '',
    launcherLottieUrl: '',
    launcherHoverEffect: 'scale',
    enableContextAwareness: false,
    dynamicContextMode: 'nocode',
    dynamicSiteContextCapturePII: false
  };
  let baseDeviceAwareSettings = null;

  // Global Context Data
  let dynamicContextData = {};
  let trustedRuntimeContext = {
    source: 'none',
    publicContext: {},
    privateContextSummary: {},
    updatedAt: null
  };

  const TRUSTED_CONTEXT_SENSITIVE_KEY_RE = /(email|mail|phone|gsm|mobile|telephone|tc|kimlik|identity|national|passport|birth|dogum|address|adres|token|password|secret|cookie|iban|salary|maas|health|medical|diagnos|document|attachment|leave_reason|izin_nedeni)/i;

  function getDynamicContextMode() {
    return settings.dynamicContextMode === 'enterprise_adapter' ? 'enterprise_adapter' : 'nocode';
  }

  function isEnterpriseContextMode() {
    return getDynamicContextMode() === 'enterprise_adapter';
  }

  function isSensitiveTrustedContextPath(path) {
    return TRUSTED_CONTEXT_SENSITIVE_KEY_RE.test(String(path || ''));
  }

  function sanitizeTrustedContextScalar(value) {
    if (typeof value === 'string') {
      return truncateText(value, 240);
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (value === null) {
      return null;
    }
    return undefined;
  }

  function sanitizeTrustedContextValue(value, path, depth) {
    if (depth > 4) return undefined;
    const scalar = sanitizeTrustedContextScalar(value);
    if (scalar !== undefined) return scalar;

    if (Array.isArray(value)) {
      const next = [];
      value.slice(0, 8).forEach((item, index) => {
        const sanitized = sanitizeTrustedContextValue(item, `${path}[${index}]`, depth + 1);
        if (sanitized !== undefined) {
          next.push(sanitized);
        }
      });
      return next;
    }

    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const next = {};
    Object.entries(value).slice(0, 20).forEach(([key, child]) => {
      const childPath = path ? `${path}.${key}` : key;
      if (isSensitiveTrustedContextPath(childPath)) return;
      const sanitized = sanitizeTrustedContextValue(child, childPath, depth + 1);
      if (sanitized !== undefined) {
        next[key] = sanitized;
      }
    });
    return next;
  }

  function sanitizeTrustedContextSection(section) {
    const sanitized = sanitizeTrustedContextValue(section, '', 0);
    if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
      return {};
    }
    return sanitized;
  }

  function sanitizeTrustedContextPayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    const source = truncateText(payload.source || 'host_app', 32) || 'host_app';
    const publicContext = sanitizeTrustedContextSection(payload.publicContext || payload.public || payload.context);
    const privateContextSummary = sanitizeTrustedContextSection(payload.privateContextSummary || payload.privateSummary);
    if (!Object.keys(publicContext).length && !Object.keys(privateContextSummary).length) {
      return null;
    }
    return {
      source,
      publicContext,
      privateContextSummary,
      updatedAt: nowIso()
    };
  }

  function refreshTrustedRuntimeContext() {
    let snapshot = null;
    try {
      if (window.VionContextBridge && typeof window.VionContextBridge.getSnapshot === 'function') {
        snapshot = window.VionContextBridge.getSnapshot();
      } else if (window.UserexWidget && window.UserexWidget.contextData) {
        snapshot = window.UserexWidget.contextData;
      }
    } catch (error) {
      console.warn('Userex Widget: Failed to read trusted runtime context', error);
    }

    const sanitized = sanitizeTrustedContextPayload(snapshot);
    if (sanitized) {
      trustedRuntimeContext = sanitized;
    }

    return trustedRuntimeContext;
  }

  // ============================================
  // SITE-WIDE DYNAMIC CONTEXT (BETA)
  // ============================================
  const SITE_CONTEXT_SELECTOR_NOISE_PREFIXES = ['#userex-', '.userex-', '#vion-', '.vion-'];
  const SITE_CONTEXT_STORAGE_NOISE_PREFIXES = ['userex_', 'vion_'];
  const SITE_CONTEXT_FRAMEWORK_NOISE_IDS = ['__next', '__nuxt', 'root', 'app'];
  const SITE_CONTEXT_SENSITIVE_KEYS = [
    'password', 'passwd', 'pwd', 'token', 'accesstoken', 'refreshtoken',
    'authorization', 'cookie', 'secret', 'otp', 'cvv', 'cvc'
  ];
  const SITE_CONTEXT_ROUTE_DENYLIST = [
    'logout', 'signout', 'delete', 'remove', 'destroy', 'create', 'edit', 'new',
    'download', 'export', 'action', 'callback', '/api/', 'mailto:', 'tel:',
    '/login', '/signup', '/onboarding', '/console', '/admin', '/platform', '/dashboard'
  ];
  const SITE_CONTEXT_TRACKING_QUERY_PREFIXES = ['utm_', 'gclid', 'fbclid', 'msclkid'];
  const SITE_CONTEXT_MAX_PAGE_NETWORK_BYTES = 300 * 1024;

  let siteSessionContext = null;
  let siteContextUpdateDebounceTimer = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function createEmptySiteSessionContext() {
    const ts = nowIso();
    return {
      version: 1,
      startedAt: ts,
      updatedAt: ts,
      crawl: {
        status: 'idle',
        trigger: 'manual',
        routeScope: 'sidebar_safe',
        progress: {
          total: 0,
          visited: 0,
          success: 0,
          failed: 0,
          currentRoute: ''
        },
        errors: []
      },
      routes: {},
      network: {
        resources: {}
      },
      entityIndex: {
        rawRouteFacts: []
      },
      preset: null
    };
  }

  siteSessionContext = createEmptySiteSessionContext();

  function isWidgetNoiseStorageKey(key) {
    const lower = String(key || '').toLowerCase();
    return SITE_CONTEXT_STORAGE_NOISE_PREFIXES.some(prefix => lower.startsWith(prefix));
  }

  function isWidgetNoiseSelector(selector) {
    const lower = String(selector || '').toLowerCase();
    return SITE_CONTEXT_SELECTOR_NOISE_PREFIXES.some(prefix => lower.startsWith(prefix));
  }

  function isWidgetNoiseElement(el) {
    if (!el || !(el instanceof Element)) return false;
    const id = (el.id || '').toLowerCase();
    if (id.startsWith('userex-') || id.startsWith('vion-')) return true;
    if (SITE_CONTEXT_FRAMEWORK_NOISE_IDS.includes(id)) return true;
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT') return true;
    const className = typeof el.className === 'string' ? el.className.toLowerCase() : '';
    return className.includes('userex-') || className.includes(' vion-') || className.startsWith('vion-');
  }

  function truncateText(input, maxLen) {
    const text = String(input || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLen) return text;
    return text.slice(0, Math.max(0, maxLen - 1)).trim() + '…';
  }

  function normalizeFieldKey(value, fallback) {
    const cleaned = String(value || '')
      .trim()
      .replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return cleaned || fallback;
  }

  function escapeCssAttrValue(value) {
    const raw = String(value || '');
    try {
      if (window.CSS && typeof window.CSS.escape === 'function') {
        return window.CSS.escape(raw);
      }
    } catch (e) { }
    return raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function toSafeRouteString(urlObj) {
    if (!urlObj) return '';
    const clean = new URL(urlObj.toString());
    const keysToDelete = [];
    clean.searchParams.forEach((_, key) => {
      const lower = key.toLowerCase();
      if (lower === 'vion_scan' || lower === 'vion_site_crawl' || lower === 'vion_site_crawl_page' || lower.startsWith('vion_')) {
        keysToDelete.push(key);
        return;
      }
      if (SITE_CONTEXT_TRACKING_QUERY_PREFIXES.some(prefix => lower === prefix || lower.startsWith(prefix))) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => clean.searchParams.delete(key));
    return clean.pathname + (clean.search ? clean.search : '');
  }

  function isSafeSiteRoute(urlObj) {
    if (!urlObj || urlObj.origin !== window.location.origin) return false;
    const route = `${urlObj.pathname}${urlObj.search}`.toLowerCase();
    if (!urlObj.pathname || urlObj.pathname.startsWith('/api/')) return false;
    if (/\.(pdf|zip|rar|7z|png|jpg|jpeg|gif|svg|webp|mp4|mp3|xlsx?|csv|docx?)($|\?)/i.test(route)) return false;
    if (SITE_CONTEXT_ROUTE_DENYLIST.some(token => route.includes(token))) return false;
    return true;
  }

  function extractShortStatsFromDocument(doc, limit) {
    const stats = [];
    const seen = new Set();
    let scanned = 0;
    const elements = doc.querySelectorAll('body *');

    for (const el of elements) {
      scanned += 1;
      if (scanned > 1200) break;
      if (!(el instanceof HTMLElement)) continue;
      if (isWidgetNoiseElement(el)) continue;
      if (el.children && el.children.length > 6) continue;
      const text = truncateText(el.innerText || el.textContent || '', 80);
      if (!text || text.length < 2 || text.length > 70) continue;
      if (!/\d/.test(text)) continue;
      if (/^(http|https):/i.test(text)) continue;

      let value = '';
      let label = '';
      let m = text.match(/^(\d[\d.,]*)\s+(.+)$/);
      if (m) {
        value = m[1];
        label = m[2];
      } else {
        m = text.match(/^(.+?)\s+(\d[\d.,]*)$/);
        if (m) {
          label = m[1];
          value = m[2];
        }
      }
      if (!m) continue;
      label = truncateText(label, 48);
      value = truncateText(value, 24);
      if (!label || !value) continue;
      const key = `${label}::${value}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      stats.push({ label, value });
      if (stats.length >= (limit || 12)) break;
    }

    return stats;
  }

  function collectSelectorCandidatesFromDocument(doc, maxCount) {
    const discovered = [];
    const unique = new Set();
    const addCandidate = (key, selector) => {
      if (!selector) return;
      if (isWidgetNoiseSelector(selector)) return;
      const normSelector = String(selector);
      if (unique.has(normSelector)) return;
      unique.add(normSelector);
      discovered.push({
        key: normalizeFieldKey(key, 'field'),
        selector: normSelector
      });
    };

    try {
      const controls = doc.querySelectorAll('input, textarea, select');
      controls.forEach((el, index) => {
        if (!(el instanceof HTMLElement)) return;
        if (isWidgetNoiseElement(el)) return;

        const tag = (el.tagName || '').toLowerCase();
        const type = (el.getAttribute('type') || '').toLowerCase();
        if (type === 'hidden' || type === 'password' || type === 'file') return;

        const id = (el.id || '').trim();
        const name = (el.getAttribute('name') || '').trim();
        const placeholder = (el.getAttribute('placeholder') || '').trim();
        const ariaLabel = (el.getAttribute('aria-label') || '').trim();
        const dataAttrs = ['data-testid', 'data-test', 'data-cy', 'data-qa']
          .map(attr => (el.getAttribute(attr) || '').trim())
          .filter(Boolean);
        const hint = [id, name, placeholder, ariaLabel, type, ...dataAttrs].join(' ').toLowerCase();
        if (SITE_CONTEXT_SENSITIVE_KEYS.some(k => hint.includes(k))) return;

        if (id) {
          addCandidate(id, `#${id}`);
          return;
        }
        if (name) {
          addCandidate(name, `${tag}[name="${escapeCssAttrValue(name)}"]`);
          return;
        }
        if (dataAttrs.length > 0) {
          const val = dataAttrs[0];
          const attrName = ['data-testid', 'data-test', 'data-cy', 'data-qa'].find(attr => el.hasAttribute(attr));
          if (attrName) {
            addCandidate(val, `[${attrName}="${escapeCssAttrValue(val)}"]`);
            return;
          }
        }
        if (placeholder && placeholder.length <= 60) {
          addCandidate(placeholder, `${tag}[placeholder="${escapeCssAttrValue(placeholder)}"]`);
          return;
        }
      });
    } catch (e) { }

    return discovered.slice(0, maxCount || 20);
  }

  function collectDomSummaryFromDocument(doc) {
    const headings = [];
    try {
      doc.querySelectorAll('h1, h2, h3').forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        if (isWidgetNoiseElement(el)) return;
        const text = truncateText(el.innerText || el.textContent || '', 120);
        if (text && !headings.includes(text) && headings.length < 8) headings.push(text);
      });
    } catch (e) { }

    const forms = [];
    try {
      doc.querySelectorAll('form').forEach((form) => {
        if (!(form instanceof HTMLElement)) return;
        if (isWidgetNoiseElement(form)) return;
        const fields = [];
        form.querySelectorAll('input, textarea, select').forEach((field) => {
          if (!(field instanceof HTMLElement)) return;
          if (isWidgetNoiseElement(field)) return;
          const label = field.getAttribute('aria-label')
            || field.getAttribute('name')
            || field.getAttribute('placeholder')
            || field.id
            || field.tagName.toLowerCase();
          const normalized = truncateText(label, 48);
          if (normalized && !fields.includes(normalized) && fields.length < 12) fields.push(normalized);
        });
        if (fields.length > 0 && forms.length < 4) {
          forms.push({ fields });
        }
      });
    } catch (e) { }

    const tables = [];
    try {
      doc.querySelectorAll('table').forEach((table) => {
        if (!(table instanceof HTMLElement)) return;
        if (isWidgetNoiseElement(table)) return;
        if (tables.length >= 4) return;
        const headerTexts = Array.from(table.querySelectorAll('th'))
          .map(th => truncateText(th.innerText || th.textContent || '', 40))
          .filter(Boolean)
          .slice(0, 8);
        const rowCount = Math.max(0, table.querySelectorAll('tbody tr').length || table.querySelectorAll('tr').length - 1);
        let title = '';
        const nearestSection = table.closest('section, article, div');
        if (nearestSection && nearestSection instanceof HTMLElement) {
          const maybeTitleEl = nearestSection.querySelector('h2, h3, h4, [role="heading"]');
          if (maybeTitleEl && maybeTitleEl instanceof HTMLElement) {
            title = truncateText(maybeTitleEl.innerText || maybeTitleEl.textContent || '', 80);
          }
        }
        tables.push({
          title: title || undefined,
          rowCount: rowCount >= 0 ? rowCount : undefined,
          columns: headerTexts
        });
      });
    } catch (e) { }

    return {
      headings,
      forms,
      tables,
      stats: extractShortStatsFromDocument(doc, 12)
    };
  }

  function parseTableRows(doc, keywords) {
    const items = [];
    const statusBreakdown = {};
    let totalCount = null;

    try {
      const tables = Array.from(doc.querySelectorAll('table'));
      tables.forEach((table) => {
        if (!(table instanceof HTMLElement) || isWidgetNoiseElement(table)) return;
        const headers = Array.from(table.querySelectorAll('th'))
          .map(th => (th.textContent || '').trim().toLowerCase());
        if (!headers.length) return;
        const hasKeyword = headers.some(h => keywords.some(k => h.includes(k)));
        if (!hasKeyword) return;

        const rows = Array.from(table.querySelectorAll('tbody tr'));
        if (rows.length > 0) totalCount = rows.length;
        rows.slice(0, 10).forEach((row) => {
          const cells = Array.from(row.querySelectorAll('td')).map(td => truncateText(td.innerText || td.textContent || '', 120));
          if (!cells.length) return;
          const item = {
            title: cells[0] || '',
            assignee: cells[1] || '',
            status: cells[cells.length - 1] || ''
          };
          if (item.title) items.push(item);
          if (item.status) {
            statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + 1;
          }
        });
      });
    } catch (e) { }

    return {
      recentItems: items,
      totalCount: typeof totalCount === 'number' ? totalCount : undefined,
      statusBreakdown
    };
  }

  function buildRouteFacts(route, domSummary) {
    const facts = [];
    if (!domSummary) return facts;
    (domSummary.stats || []).slice(0, 8).forEach((stat) => {
      if (stat && stat.label && stat.value) {
        facts.push(`[${route}] ${stat.label}: ${stat.value}`);
      }
    });
    return facts;
  }

  function getEntityTimestamp(entity) {
    if (!entity || typeof entity !== 'object') return '';
    return String(entity.capturedAt || entity.visitedAt || entity.updatedAt || '');
  }

  function getEntityConfidence(entity) {
    if (!entity || typeof entity !== 'object') return 0;
    const n = Number(entity.confidence);
    return Number.isFinite(n) ? n : 0;
  }

  function mergeEntityByFreshness(existingEntity, incomingEntity) {
    if (!existingEntity) return incomingEntity;
    if (!incomingEntity) return existingEntity;
    const existingTs = getEntityTimestamp(existingEntity);
    const incomingTs = getEntityTimestamp(incomingEntity);
    if (incomingTs && existingTs && incomingTs !== existingTs) {
      return incomingTs > existingTs ? incomingEntity : existingEntity;
    }
    const existingConf = getEntityConfidence(existingEntity);
    const incomingConf = getEntityConfidence(incomingEntity);
    if (incomingConf !== existingConf) {
      return incomingConf > existingConf ? incomingEntity : existingEntity;
    }
    if (typeof existingEntity === 'object' && typeof incomingEntity === 'object' && !Array.isArray(existingEntity) && !Array.isArray(incomingEntity)) {
      return { ...existingEntity, ...incomingEntity };
    }
    return incomingEntity;
  }

  function withEntityMeta(payload, meta) {
    if (!payload || typeof payload !== 'object') return payload;
    return {
      ...payload,
      source: meta && meta.source ? meta.source : 'dom',
      sourceType: meta && meta.sourceType ? meta.sourceType : 'dom',
      route: meta && meta.route ? meta.route : '',
      capturedAt: meta && meta.capturedAt ? meta.capturedAt : nowIso(),
      confidence: typeof (meta && meta.confidence) === 'number' ? Math.max(0.1, Math.min(1, meta.confidence)) : 0.6
    };
  }

  function extractNameFromDoc(doc) {
    try {
      const bodyText = truncateText((doc.body && doc.body.innerText) || '', 2500);
      const greetingMatch = bodyText.match(/(?:günaydın|merhaba|welcome|hello|hi)[,\s]+([A-ZÇĞİÖŞÜ][\p{L}\s.'-]{2,60})/iu);
      if (greetingMatch) return truncateText(greetingMatch[1], 80);
    } catch (e) { }
    return '';
  }

  function extractOrderNumber(text) {
    const raw = String(text || '').trim();
    if (!raw) return '';
    const match = raw.match(/(?:sipariş|siparis|order|no|#)\s*[:#-]?\s*([A-Z0-9-]{4,})/i);
    if (match) return match[1];
    if (/^[A-Z0-9-]{4,}$/.test(raw.replace(/\s+/g, ''))) return raw.replace(/\s+/g, '');
    return '';
  }

  function extractTrackingNumber(text) {
    const raw = String(text || '').trim();
    if (!raw) return '';
    const match = raw.match(/(?:takip|tracking|kargo)\s*(?:no|numarası|number)?\s*[:#-]?\s*([A-Z0-9-]{6,})/i);
    if (match) return match[1];
    const fallback = raw.match(/\b[A-Z0-9-]{8,}\b/);
    return fallback ? fallback[0] : '';
  }

  function extractCurrencyAndAmount(text) {
    const raw = String(text || '').trim();
    if (!raw) return {};
    let currency = '';
    if (/₺|TRY|TL/i.test(raw)) currency = 'TRY';
    else if (/€|EUR/i.test(raw)) currency = 'EUR';
    else if (/\$|USD/i.test(raw)) currency = 'USD';
    const amountMatch = raw.match(/(\d[\d.\s,]{0,20})/);
    return {
      total: amountMatch ? truncateText(amountMatch[1].replace(/\s+/g, ''), 24) : undefined,
      currency: currency || undefined
    };
  }

  function parseDateLike(text) {
    const raw = String(text || '').trim();
    if (!raw) return '';
    if (/\d{4}-\d{2}-\d{2}/.test(raw)) return raw.match(/\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?/)?.[0] || raw;
    if (/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(raw)) return raw.match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/)?.[0] || raw;
    return '';
  }

  function normalizeObjectKeysLower(obj) {
    const out = {};
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
    Object.keys(obj).forEach((k) => { out[String(k).toLowerCase()] = obj[k]; });
    return out;
  }

  function coerceArrayLike(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.rows)) return value.rows;
    if (Array.isArray(value.results)) return value.results;
    if (Array.isArray(value.nodes)) return value.nodes;
    return [];
  }

  function collectKeyMatchesDeep(value, targetKeys, maxDepth, out, path) {
    if (!value || maxDepth < 0) return;
    const currentPath = path || '';
    if (Array.isArray(value)) {
      value.slice(0, 8).forEach((item, idx) => collectKeyMatchesDeep(item, targetKeys, maxDepth - 1, out, `${currentPath}[${idx}]`));
      return;
    }
    if (typeof value !== 'object') return;
    Object.keys(value).slice(0, 40).forEach((key) => {
      const child = value[key];
      const lower = String(key).toLowerCase();
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      if (targetKeys.some((tk) => lower.includes(tk))) {
        out.push({ key, lowerKey: lower, value: child, path: nextPath });
      }
      collectKeyMatchesDeep(child, targetKeys, maxDepth - 1, out, nextPath);
    });
  }

  function extractEcommerceDomEntities(route, doc, domSummary, presetRuntime, routeVisitedAt) {
    const lowerRoute = String(route || '').toLowerCase();
    const entities = {};
    const baseConfidence = Number(presetRuntime?.confidenceBase || 0.72);
    const statusKeywords = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'kargoda', 'teslim', 'hazırlan', 'hazirlaniyor', 'iptal'];

    try {
      const tables = Array.from(doc.querySelectorAll('table'));
      tables.forEach((table) => {
        if (!(table instanceof HTMLElement) || isWidgetNoiseElement(table)) return;
        const headers = Array.from(table.querySelectorAll('th')).map((th) => truncateText(th.innerText || th.textContent || '', 80).toLowerCase());
        const headerText = headers.join(' | ');
        const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 10);
        if (!rows.length) return;
        const isOrderTable = /(order|sipariş|siparis)/i.test(headerText);
        const isShipmentTable = /(shipment|shipping|kargo|teslimat|tracking|takip)/i.test(headerText);
        const isReturnTable = /(return|iade)/i.test(headerText);
        if (!(isOrderTable || isShipmentTable || isReturnTable)) return;

        const parsedRows = rows.map((row) => Array.from(row.querySelectorAll('td')).map((td) => truncateText(td.innerText || td.textContent || '', 120)));

        if (isOrderTable) {
          const recentItems = [];
          const statusBreakdown = {};
          parsedRows.forEach((cells) => {
            const merged = cells.join(' | ');
            if (!merged) return;
            const amountCell = cells.find((c) => /₺|\$|€|TRY|USD|EUR/i.test(c)) || '';
            const amount = extractCurrencyAndAmount(amountCell);
            const status = cells.find((c) => statusKeywords.some((s) => c.toLowerCase().includes(s))) || cells[cells.length - 1] || '';
            recentItems.push({
              orderNo: extractOrderNumber(cells[0]) || extractOrderNumber(merged) || truncateText(cells[0] || '', 40) || undefined,
              status: status ? truncateText(status, 60) : undefined,
              total: amount.total,
              currency: amount.currency,
              createdAt: cells.map(parseDateLike).find(Boolean) || undefined
            });
            if (status) statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
          });
          if (recentItems.length) {
            entities.orders = withEntityMeta({ totalCount: rows.length, recentItems, statusBreakdown }, {
              source: 'dom', sourceType: 'dom_table', route, capturedAt: routeVisitedAt, confidence: baseConfidence + 0.08
            });
          }
        }

        if (isShipmentTable) {
          const recentItems = [];
          const statusBreakdown = {};
          parsedRows.forEach((cells) => {
            const merged = cells.join(' | ');
            if (!merged) return;
            const status = cells.find((c) => statusKeywords.some((s) => c.toLowerCase().includes(s))) || cells[cells.length - 1] || '';
            recentItems.push({
              trackingNumber: extractTrackingNumber(merged) || undefined,
              carrier: (cells.find((c) => /(aras|yurtiçi|yurtici|mng|ups|fedex|dhl|sürat|surat|ptt)/i.test(c)) || undefined),
              status: status ? truncateText(status, 60) : undefined,
              eta: cells.map(parseDateLike).find(Boolean) || undefined,
              updatedAt: routeVisitedAt
            });
            if (status) statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
          });
          if (recentItems.length) {
            entities.shipments = withEntityMeta({ totalCount: rows.length, recentItems, statusBreakdown }, {
              source: 'dom', sourceType: 'dom_table', route, capturedAt: routeVisitedAt, confidence: baseConfidence + 0.08
            });
          }
        }

        if (isReturnTable) {
          const recentItems = parsedRows.map((cells) => ({
            orderNo: extractOrderNumber(cells.join(' | ')) || truncateText(cells[0] || '', 40) || undefined,
            status: truncateText(cells[cells.length - 1] || '', 60) || undefined
          })).filter((r) => r.orderNo || r.status);
          if (recentItems.length) {
            entities.returns = withEntityMeta({ totalCount: rows.length, recentItems }, {
              source: 'dom', sourceType: 'dom_table', route, capturedAt: routeVisitedAt, confidence: baseConfidence
            });
          }
        }
      });
    } catch (e) { }

    if (/(cart|sepet|checkout)/i.test(lowerRoute)) {
      const cartStats = (domSummary?.stats || []).filter((s) => /(cart|sepet|item|ürün|urun|toplam|total)/i.test(`${s.label} ${s.value}`)).slice(0, 6);
      if (cartStats.length) {
        const totalStat = cartStats.find((s) => /(toplam|total|tutar|amount)/i.test(String(s.label || '')));
        const totalParsed = extractCurrencyAndAmount(`${totalStat?.label || ''} ${totalStat?.value || ''}`);
        entities.cart = withEntityMeta({
          itemCount: cartStats.find((s) => /(adet|item|ürün|urun)/i.test(String(s.label || '')))?.value,
          total: totalParsed.total || (totalStat ? totalStat.value : undefined),
          currency: totalParsed.currency
        }, { source: 'dom', sourceType: 'dom_stats', route, capturedAt: routeVisitedAt, confidence: baseConfidence });
      }
    }

    if (/(account|my-account|hesabim|profil|profile)/i.test(lowerRoute)) {
      const name = extractNameFromDoc(doc);
      const fields = (domSummary?.forms || []).flatMap((f) => Array.isArray(f.fields) ? f.fields : []).slice(0, 10);
      if (name || fields.length) {
        entities.account = withEntityMeta({
          profileSummary: { name: name || undefined, visibleFields: fields }
        }, { source: 'dom', sourceType: 'dom_profile', route, capturedAt: routeVisitedAt, confidence: baseConfidence - 0.02 });
      }
    }

    return entities;
  }

  function extractEcommerceNetworkEntities(route, networkResources, presetRuntime, routeVisitedAt) {
    const entities = {};
    const resources = Array.isArray(networkResources) ? networkResources : [];
    if (!resources.length) return entities;
    const baseConfidence = Number(presetRuntime?.confidenceBase || 0.72);

    const buildMeta = (resource) => ({
      source: 'network',
      sourceType: resource?.sourceType || (String(resource?.method || 'GET').toUpperCase() === 'GET' ? 'get_json' : 'post_json'),
      route,
      capturedAt: resource?.capturedAt || routeVisitedAt,
      confidence: baseConfidence + 0.1
    });

    resources.forEach((resource) => {
      const sample = resource?.sample || resource?.summary?.sample;
      if (!sample || typeof sample !== 'object') return;
      const matches = [];
      collectKeyMatchesDeep(sample, ['order', 'siparis', 'shipment', 'shipping', 'kargo', 'tracking', 'cart', 'sepet', 'account', 'profile', 'customer', 'return', 'iade'], 4, matches, '');
      matches.forEach((entry) => {
        const lk = entry.lowerKey || '';
        const arr = coerceArrayLike(entry.value);
        const obj = entry.value && typeof entry.value === 'object' && !Array.isArray(entry.value) ? entry.value : null;

        if ((lk.includes('order') || lk.includes('siparis')) && arr.length) {
          const recentItems = arr.slice(0, 8).map((item) => {
            const o = normalizeObjectKeysLower(item);
            return {
              orderNo: o.orderno || o.order_id || o.orderid || o.siparisno || o.no || o.number || o.id || undefined,
              status: o.status || o.state || undefined,
              total: o.total || o.grandtotal || o.amount || undefined,
              currency: o.currency || o.currencycode || undefined,
              createdAt: o.createdat || o.created_at || o.date || o.orderdate || undefined
            };
          }).filter((item) => item.orderNo || item.status || item.total);
          if (recentItems.length) {
            const statusBreakdown = {};
            recentItems.forEach((item) => {
              if (item.status) statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + 1;
            });
            entities.orders = mergeEntityByFreshness(entities.orders, withEntityMeta({
              totalCount: arr.length,
              recentItems,
              statusBreakdown
            }, buildMeta(resource)));
          }
        }

        if ((lk.includes('shipment') || lk.includes('tracking') || lk.includes('kargo')) && (arr.length || obj)) {
          const list = (arr.length ? arr : [obj]).slice(0, 8);
          const recentItems = list.map((item) => {
            const o = normalizeObjectKeysLower(item);
            return {
              trackingNumber: o.trackingnumber || o.tracking || o.tracking_no || o.awb || o.waybill || undefined,
              carrier: o.carrier || o.courier || o.company || undefined,
              status: o.status || o.state || undefined,
              eta: o.eta || o.estimateddelivery || o.deliverydate || undefined,
              updatedAt: o.updatedat || o.updated_at || o.lastupdated || undefined
            };
          }).filter((item) => item.trackingNumber || item.status || item.carrier);
          if (recentItems.length) {
            const statusBreakdown = {};
            recentItems.forEach((item) => {
              if (item.status) statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + 1;
            });
            entities.shipments = mergeEntityByFreshness(entities.shipments, withEntityMeta({
              totalCount: recentItems.length,
              recentItems,
              statusBreakdown
            }, buildMeta(resource)));
          }
        }

        if ((lk.includes('cart') || lk.includes('sepet')) && obj) {
          const o = normalizeObjectKeysLower(obj);
          const itemCount = o.itemcount || o.count || (Array.isArray(o.items) ? o.items.length : undefined);
          const total = o.total || o.grandtotal || o.amount || undefined;
          const currency = o.currency || o.currencycode || undefined;
          if (itemCount !== undefined || total !== undefined) {
            entities.cart = mergeEntityByFreshness(entities.cart, withEntityMeta({ itemCount, total, currency }, buildMeta(resource)));
          }
        }

        if ((lk.includes('account') || lk.includes('profile') || lk.includes('customer')) && obj) {
          const o = normalizeObjectKeysLower(obj);
          const profileSummary = {
            name: o.name || [o.firstname, o.lastname].filter(Boolean).join(' ').trim() || undefined,
            email: o.email || undefined,
            phone: o.phone || o.phonenumber || undefined
          };
          if (profileSummary.name || profileSummary.email || profileSummary.phone) {
            entities.account = mergeEntityByFreshness(entities.account, withEntityMeta({ profileSummary }, buildMeta(resource)));
          }
        }

        if ((lk.includes('return') || lk.includes('iade')) && arr.length) {
          const recentItems = arr.slice(0, 8).map((item) => {
            const o = normalizeObjectKeysLower(item);
            return {
              orderNo: o.orderno || o.orderid || o.siparisno || o.order_no || undefined,
              status: o.status || o.state || undefined,
              createdAt: o.createdat || o.created_at || o.date || undefined
            };
          }).filter((item) => item.orderNo || item.status);
          if (recentItems.length) {
            entities.returns = mergeEntityByFreshness(entities.returns, withEntityMeta({ totalCount: arr.length, recentItems }, buildMeta(resource)));
          }
        }
      });
    });

    return entities;
  }

  function extractEntitiesForRoute(route, doc, domSummary, options) {
    const lowerRoute = String(route || '').toLowerCase();
    const entities = {};
    const opts = options || {};
    const presetRuntime = (opts.presetRuntime && typeof opts.presetRuntime === 'object') ? opts.presetRuntime : null;
    const routeVisitedAt = opts.visitedAt || nowIso();
    const baseConfidence = Number(presetRuntime?.confidenceBase || 0.62);

    if (lowerRoute.includes('gorev') || lowerRoute.includes('task') || lowerRoute.includes('dashboard') || lowerRoute.includes('ozet')) {
      const parsedTasks = parseTableRows(doc, ['görev', 'gorev', 'task']);
      if (parsedTasks.recentItems.length || parsedTasks.totalCount !== undefined) {
        entities.tasks = withEntityMeta(parsedTasks, {
          source: 'dom',
          sourceType: 'dom_table',
          route,
          capturedAt: routeVisitedAt,
          confidence: baseConfidence
        });
      }
      const dashboardStats = (domSummary?.stats || []).slice(0, 10);
      if (dashboardStats.length) {
        entities.dashboard = withEntityMeta({ stats: dashboardStats }, {
          source: 'dom',
          sourceType: 'dom_stats',
          route,
          capturedAt: routeVisitedAt,
          confidence: baseConfidence - 0.05
        });
      }
    }

    if (lowerRoute.includes('proje') || lowerRoute.includes('project')) {
      const parsedProjects = parseTableRows(doc, ['proje', 'project']);
      if (parsedProjects.recentItems.length || parsedProjects.totalCount !== undefined) {
        entities.projects = withEntityMeta(parsedProjects, {
          source: 'dom',
          sourceType: 'dom_table',
          route,
          capturedAt: routeVisitedAt,
          confidence: baseConfidence
        });
      }
    }

    if (lowerRoute.includes('profil') || lowerRoute.includes('profile') || lowerRoute.includes('benim-sayfam') || lowerRoute.includes('my-page')) {
      const profile = {};
      const extractedName = extractNameFromDoc(doc);
      if (extractedName) profile.name = extractedName;
      if (Object.keys(profile).length) {
        entities.profile = withEntityMeta(profile, {
          source: 'dom',
          sourceType: 'dom_profile',
          route,
          capturedAt: routeVisitedAt,
          confidence: baseConfidence - 0.08
        });
      }
    }

    if (presetRuntime?.presetId === 'ecommerce-generic') {
      const domEntities = extractEcommerceDomEntities(route, doc, domSummary, presetRuntime, routeVisitedAt);
      Object.keys(domEntities).forEach((key) => {
        entities[key] = mergeEntityByFreshness(entities[key], domEntities[key]);
      });
      if (Array.isArray(opts.networkResources) && opts.networkResources.length) {
        const networkEntities = extractEcommerceNetworkEntities(route, opts.networkResources, presetRuntime, routeVisitedAt);
        Object.keys(networkEntities).forEach((key) => {
          entities[key] = mergeEntityByFreshness(entities[key], networkEntities[key]);
        });
      }
    }

    return entities;
  }

  function mergeRouteSnapshotIntoSiteSessionContext(snapshot) {
    if (!snapshot || !snapshot.route) return;
    if (!siteSessionContext) siteSessionContext = createEmptySiteSessionContext();

    siteSessionContext.updatedAt = nowIso();
    siteSessionContext.routes[snapshot.route] = snapshot;

    const entities = snapshot.entities || {};
    ['tasks', 'projects', 'profile', 'dashboard', 'orders', 'shipments', 'returns', 'cart', 'account'].forEach((entityKey) => {
      if (!entities[entityKey]) return;
      siteSessionContext.entityIndex[entityKey] = mergeEntityByFreshness(siteSessionContext.entityIndex[entityKey], entities[entityKey]);
    });

    const facts = buildRouteFacts(snapshot.route, snapshot.domSummary);
    if (!Array.isArray(siteSessionContext.entityIndex.rawRouteFacts)) {
      siteSessionContext.entityIndex.rawRouteFacts = [];
    }
    facts.forEach((fact) => {
      if (!siteSessionContext.entityIndex.rawRouteFacts.includes(fact)) {
        siteSessionContext.entityIndex.rawRouteFacts.push(fact);
      }
    });
    if (siteSessionContext.entityIndex.rawRouteFacts.length > 100) {
      siteSessionContext.entityIndex.rawRouteFacts = siteSessionContext.entityIndex.rawRouteFacts.slice(-100);
    }
  }

  function summarizeUnknownForAI(value, depth) {
    if (depth <= 0) return Array.isArray(value) ? `[array:${value.length}]` : (value && typeof value === 'object' ? '[object]' : value);
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return truncateText(value, 240);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.slice(0, 5).map(v => summarizeUnknownForAI(v, depth - 1));
    if (typeof value === 'object') {
      const out = {};
      Object.keys(value).slice(0, 12).forEach((key) => {
        out[key] = summarizeUnknownForAI(value[key], depth - 1);
      });
      return out;
    }
    return String(value);
  }

  function isSensitiveKeyName(key) {
    const lower = String(key || '').toLowerCase();
    return SITE_CONTEXT_SENSITIVE_KEYS.some((token) => lower.includes(token));
  }

  function stripSensitiveData(value, depth) {
    if (depth <= 0) return undefined;
    if (value === null || value === undefined) return value;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.slice(0, 20).map((item) => stripSensitiveData(item, depth - 1));
    if (typeof value === 'object') {
      const out = {};
      Object.keys(value).slice(0, 50).forEach((key) => {
        if (isSensitiveKeyName(key)) return;
        out[key] = stripSensitiveData(value[key], depth - 1);
      });
      return out;
    }
    return undefined;
  }

  function applyNetworkResponseFieldFilters(value, policy, depth) {
    if (!policy || typeof policy !== 'object') return value;
    const allowlist = Array.isArray(policy.responseFieldAllowlist) ? policy.responseFieldAllowlist.map((v) => String(v).toLowerCase()) : [];
    const denylist = Array.isArray(policy.responseFieldDenylist) ? policy.responseFieldDenylist.map((v) => String(v).toLowerCase()) : [];
    if (depth <= 0) return undefined;
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.slice(0, 20).map((item) => applyNetworkResponseFieldFilters(item, policy, depth - 1));
    const out = {};
    Object.keys(value).slice(0, 60).forEach((key) => {
      const lower = String(key).toLowerCase();
      if (denylist.some((token) => lower.includes(token))) return;
      if (allowlist.length > 0 && !allowlist.some((token) => lower.includes(token))) {
        const child = value[key];
        if (child && typeof child === 'object') {
          const nested = applyNetworkResponseFieldFilters(child, policy, depth - 1);
          if (nested && ((Array.isArray(nested) && nested.length > 0) || (!Array.isArray(nested) && Object.keys(nested).length > 0))) {
            out[key] = nested;
          }
        }
        return;
      }
      out[key] = applyNetworkResponseFieldFilters(value[key], policy, depth - 1);
    });
    return out;
  }

  function summarizeNetworkJsonForStorage(jsonValue, options) {
    const opts = options || {};
    const filtered = applyNetworkResponseFieldFilters(jsonValue, opts.networkPolicy || null, 5);
    const scrubbed = stripSensitiveData(filtered, 5);
    const sample = summarizeUnknownForAI(scrubbed, 3);
    let topLevelType = Array.isArray(scrubbed) ? 'array' : typeof scrubbed;
    let itemCount = undefined;
    if (Array.isArray(scrubbed)) itemCount = scrubbed.length;
    else if (scrubbed && typeof scrubbed === 'object') itemCount = Object.keys(scrubbed).length;
    return {
      topLevelType,
      itemCount,
      sample
    };
  }

  function mergeNetworkResourceSummaries(resources) {
    if (!siteSessionContext || !siteSessionContext.network || !siteSessionContext.network.resources) return;
    if (!Array.isArray(resources)) return;
    resources.forEach((resource) => {
      if (!resource || !resource.key) return;
      siteSessionContext.network.resources[resource.key] = resource;
    });
    const resourceKeys = Object.keys(siteSessionContext.network.resources);
    if (resourceKeys.length > 120) {
      resourceKeys
        .sort((a, b) => String(siteSessionContext.network.resources[a]?.capturedAt || '').localeCompare(String(siteSessionContext.network.resources[b]?.capturedAt || '')))
        .slice(0, resourceKeys.length - 120)
        .forEach((key) => delete siteSessionContext.network.resources[key]);
    }
  }

  function getSiteSessionContextForAI() {
    if (!siteSessionContext) return undefined;
    const routeEntries = Object.values(siteSessionContext.routes || {});
    routeEntries.sort((a, b) => String(b.visitedAt || '').localeCompare(String(a.visitedAt || '')));
    const recentRoutes = routeEntries.slice(0, 5).map((route) => ({
      route: route.route,
      title: route.title || '',
      visitedAt: route.visitedAt,
      pageTextSnippet: truncateText(route.pageTextSnippet || '', 400),
      domSummary: summarizeUnknownForAI(route.domSummary || {}, 2),
      selectorCandidates: Array.isArray(route.selectorCandidates) ? route.selectorCandidates.slice(0, 8) : [],
      entities: summarizeUnknownForAI(route.entities || {}, 2)
    }));

    const networkEntries = Object.values(siteSessionContext.network?.resources || {})
      .sort((a, b) => String(b.capturedAt || '').localeCompare(String(a.capturedAt || '')))
      .slice(0, 12)
      .map((r) => ({
        key: r.key,
        urlPath: r.urlPath,
        method: r.method,
        sourceType: r.sourceType,
        operationName: r.operationName,
        capturedAt: r.capturedAt,
        summary: summarizeUnknownForAI(r.summary || {}, 2)
      }));

    return {
      version: 1,
      startedAt: siteSessionContext.startedAt,
      updatedAt: siteSessionContext.updatedAt,
      crawl: {
        status: siteSessionContext.crawl?.status || 'idle',
        trigger: siteSessionContext.crawl?.trigger || 'manual',
        routeScope: siteSessionContext.crawl?.routeScope || 'sidebar_safe',
        progress: siteSessionContext.crawl?.progress || {},
        errors: Array.isArray(siteSessionContext.crawl?.errors) ? siteSessionContext.crawl.errors.slice(-10) : []
      },
      preset: summarizeUnknownForAI(siteSessionContext.preset || {}, 2),
      entityIndex: summarizeUnknownForAI(siteSessionContext.entityIndex || {}, 3),
      network: {
        resourceCount: Object.keys(siteSessionContext.network?.resources || {}).length,
        resources: networkEntries
      },
      routes: recentRoutes
    };
  }

  function scheduleSiteContextUpdate() {
    if (siteContextUpdateDebounceTimer) clearTimeout(siteContextUpdateDebounceTimer);
    siteContextUpdateDebounceTimer = setTimeout(() => {
      try {
        sendContextUpdate();
      } catch (e) { }
    }, 200);
  }

  function getDynamicSiteContextOptions() {
    const fallbackPreset = {
      presetId: 'generic-web-app',
      routeHints: ['dashboard', 'overview', 'profile', 'account', 'settings', 'projects', 'tasks'],
      entityTargets: ['dashboard', 'tasks', 'projects', 'profile'],
      confidenceBase: 0.55,
      networkPolicy: {
        allowGetJson: true,
        allowGraphQLSummary: false,
        allowedPostEndpoints: [],
        allowedGraphQLOperations: []
      }
    };
    const defaults = {
      enabled: false,
      collectionMode: 'dom_network',
      crawlTrigger: 'manual',
      routeScope: 'sidebar_safe',
      allowlist: [],
      maxRoutes: 30,
      maxDurationSec: 90,
      hydrationWaitMs: 4000,
      capturePII: false
    };
    const runtimePreset = settings.dynamicSiteContextRuntimePreset && typeof settings.dynamicSiteContextRuntimePreset === 'object'
      ? settings.dynamicSiteContextRuntimePreset
      : fallbackPreset;
    return {
      enabled: !isEnterpriseContextMode() && settings.enableDynamicSiteContext === true,
      collectionMode: settings.dynamicSiteContextCollectionMode || defaults.collectionMode,
      crawlTrigger: settings.dynamicSiteContextCrawlTrigger || defaults.crawlTrigger,
      routeScope: settings.dynamicSiteContextRouteScope || defaults.routeScope,
      allowlist: Array.isArray(settings.dynamicSiteContextAllowlist) ? settings.dynamicSiteContextAllowlist : defaults.allowlist,
      maxRoutes: Number(settings.dynamicSiteContextMaxRoutes || defaults.maxRoutes),
      maxDurationSec: Number(settings.dynamicSiteContextMaxDurationSec || defaults.maxDurationSec),
      hydrationWaitMs: Number(settings.dynamicSiteContextHydrationWaitMs || defaults.hydrationWaitMs),
      capturePII: settings.dynamicSiteContextCapturePII === true,
      presetMode: settings.dynamicSiteContextPresetMode || 'none',
      presetId: settings.dynamicSiteContextResolvedPresetId || settings.dynamicSiteContextPresetId || runtimePreset.presetId || 'generic-web-app',
      suggestedPresetId: settings.dynamicSiteContextSuggestedPresetId || 'generic-web-app',
      runtimePreset
    };
  }

  function getWidgetSearchParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  function hasWidgetSearchFlag(name) {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.has(name);
    } catch (e) {
      return false;
    }
  }

  function isSiteCrawlPageMode() {
    return hasWidgetSearchFlag('vion_site_crawl_page');
  }

  function isSiteCrawlOrchestratorMode() {
    return hasWidgetSearchFlag('vion_site_crawl') && !hasWidgetSearchFlag('vion_site_crawl_page');
  }

  // ============================================
  // PROACTIVE ENGAGEMENT CONTROLLER
  // ============================================

  // Helper: Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }



  // Helper: Check if mobile device
  function isMobileDevice() {
    return window.innerWidth < 768;
  }

  function mergeDefined(target, source) {
    const out = { ...target };
    if (!source || typeof source !== 'object') return out;
    Object.keys(source).forEach((key) => {
      if (source[key] !== undefined) out[key] = source[key];
    });
    return out;
  }

  function resolveAmbientDeviceSettingsForWidget(source, device) {
    const shared = {};
    [
      'ambientMaxHeight',
      'ambientOverlayOpacity',
      'ambientWidth',
      'ambientInputWidth',
      'ambientSideMargin',
      'ambientBottomMargin',
      'ambientInputSize',
      'showAmbientIcon',
      'ambientIconUrl',
      'ambientIconType',
      'ambientLibraryIcon',
      'ambientIconColor',
      'ambientInputTextColor',
      'ambientPlaceholderText',
      'ambientTheme',
      'enableAmbientRainbowBorder',
      'ambientBorderColorIdle',
      'ambientBorderColorFocused',
      'ambientClosedBgColor',
      'ambientInputBgColorIdle',
      'ambientInputBgColorFocused',
      'ambientClosedBorderColorIdle',
      'ambientClosedBorderColorFocused',
      'ambientAiBubbleColor',
      'ambientUserBubbleColor',
      'ambientBorderGradientColor1',
      'ambientBorderGradientColor2',
      'ambientBorderGradientColor3',
      'ambientBorderGradientColor4',
      'ambientBorderGradientShowWhenCollapsed',
      'ambientBorderGradientShowWhenOpen',
      'ambientBorderGradientShowWhenThinking'
    ].forEach((key) => {
      if (source[key] !== undefined) shared[key] = source[key];
    });

    if (source.ambientPerDeviceSettingsEnabled !== true) return shared;
    const deviceObj = device === 'mobile' ? source.ambientMobileSettings : source.ambientDesktopSettings;
    return mergeDefined(shared, deviceObj);
  }

  function resolveClassicDeviceSettingsForWidget(source, device) {
    const shared = {};
    [
      'bottomSpacing',
      'sideSpacing',
      'launcherAnimation',
      'launcherStyle',
      'launcherCollapse',
      'launcherText',
      'launcherRadius',
      'launcherHeight',
      'launcherWidth',
      'fullImageLauncherWidth',
      'fullImageLauncherHeight',
      'launcherIcon',
      'launcherIconUrl',
      'launcherLibraryIcon',
      'launcherIconColor',
      'launcherBackgroundColor',
      'launcherShadow',
      'launcherType',
      'launcherImageMode',
      'launcherFullImageUrl',
      'launcherLottieUrl',
      'launcherHoverEffect',
      'viewMode',
      'modalSize'
    ].forEach((key) => {
      if (source[key] !== undefined) shared[key] = source[key];
    });

    const deviceObj = source.classicPerDeviceSettingsEnabled === true
      ? (device === 'mobile' ? source.classicMobileSettings : source.classicDesktopSettings)
      : null;

    const merged = mergeDefined(shared, deviceObj);

    if (device === 'mobile') {
      const hasDeviceBottom = !!deviceObj && Object.prototype.hasOwnProperty.call(deviceObj, 'bottomSpacing');
      const hasDeviceSide = !!deviceObj && Object.prototype.hasOwnProperty.call(deviceObj, 'sideSpacing');
      const hasDeviceAnim = !!deviceObj && Object.prototype.hasOwnProperty.call(deviceObj, 'launcherAnimation');
      if (!hasDeviceBottom && source.mobileBottomSpacing !== undefined) merged.bottomSpacing = source.mobileBottomSpacing;
      if (!hasDeviceSide && source.mobileSideSpacing !== undefined) merged.sideSpacing = source.mobileSideSpacing;
      if (!hasDeviceAnim && source.mobileLauncherAnimation !== undefined) merged.launcherAnimation = source.mobileLauncherAnimation;
    }

    return merged;
  }

  function applyDeviceResolvedWidgetSettings(source, device) {
    if (!source || typeof source !== 'object') return source;
    const out = { ...source };
    if (source.chatDisplayMode === 'ambient') {
      return mergeDefined(out, resolveAmbientDeviceSettingsForWidget(source, device));
    }
    return mergeDefined(out, resolveClassicDeviceSettingsForWidget(source, device));
  }

  // Engagement Controller Class
  class EngagementController {
    constructor(settings, baseUrl, chatbotId, language) {
      if (!settings || !settings.enabled) {
        return;
      }

      this.settings = settings;
      this.baseUrl = baseUrl;
      this.chatbotId = chatbotId;
      this.language = language || 'tr';
      this.bubble = null;
      this.hasShown = false;
      this.timers = [];
      this.listeners = [];
      this.targetMessage = null; // Store selected message
      this.dismissTimer = null;
      this.typewriterTimers = [];
      this.lastTypedBubbleText = '';
      this.activeTypewriterText = '';
      this.bubbleTextFullyRendered = true;
      this.currentBubbleAnimation = null;

      // Session storage keys
      this.shownCountKey = `userex_eng_shown_${chatbotId}`;
      this.conversationStartedKey = `userex_eng_conversation_${chatbotId}`;
      this.visitCountKey = `userex_eng_visits_${chatbotId}`;
      this.lastBubbleTimeKey = `userex_eng_last_time_${chatbotId}`;

      // Check if user has already started a conversation - no more bubbles needed
      if (sessionStorage.getItem(this.conversationStartedKey)) {
        console.log('Engagement: User already started conversation, stopping bubbles');
        return;
      }

      // Check if we've exceeded max shows for this session (overall limit)
      const shownCount = parseInt(sessionStorage.getItem(this.shownCountKey) || '0');

      let maxPerSession = 10;
      if (settings.aiSmartBubbles && settings.aiSmartBubbles.enabled) {
        // 0 means unlimited
        const limit = settings.aiSmartBubbles.maxPerSession;
        maxPerSession = (limit === 0) ? 9999 : (limit || 5);
      } else {
        maxPerSession = settings.bubble.maxShowCount || 10;
      }

      if (shownCount >= maxPerSession) {
        console.log('Engagement: Max shows reached for this session', shownCount, '/', maxPerSession);
        return;
      }

      if (window.userexEngagement) {
        // Cleanup previous instance
        try {
          window.userexEngagement.destroy();
        } catch (e) {
          console.error('Userex: Failed to destroy previous engagement controller', e);
        }
      }
      window.userexEngagement = this;

      this.init();
    }

    destroy() {
      // Remove all event listeners
      this.listeners.forEach(({ event, handler, target }) => {
        (target || window).removeEventListener(event, handler);
      });
      this.listeners = [];

      // Clear all timers
      this.timers.forEach(timer => clearTimeout(timer));
      this.timers = [];

      // Remove bubble if exists
      if (this.bubble && this.bubble.parentNode) {
        this.bubble.parentNode.removeChild(this.bubble);
      }

      console.log('Engagement: Controller destroyed');
    }

    init() {
      if (!this.settings) return;
      // console.log('Engagement Controller initialized', this.settings);

      // Initialize behavior tracking for AI
      this.initBehaviorTracking();

      // Custom logic starts here

      // Pre-select message to determine delay if needed
      this.selectMessage();

      this.setupTriggers();

      // AI Mode: Fetch AI-powered bubble instead of context bubble
      if (this.settings.enabled) {
        // Check targeting - should we show on this page?
        if (!this.shouldShowOnThisPage()) {
          console.log('Engagement: Page not in targeting list, skipping');
          return;
        }

        // Check quiet hours
        if (this.isInQuietHours()) {
          console.log('Engagement: Quiet hours active, skipping');
          return;
        }

        // Use initialDelay setting (default 5 seconds)
        const delay = (this.settings.initialDelay || 5) * 1000;
        setTimeout(() => {
          this.fetchAIBubble();
        }, delay);
      }

      // SPA Route Change Detection - trigger AI bubble on client-side navigation
      this.setupRouteChangeDetection();
    }

    // Check if current page matches targeting settings
    shouldShowOnThisPage() {
      const targeting = this.settings.targeting || 'all';
      const pathname = window.location.pathname;

      if (targeting === 'all') return true;
      if (targeting === 'homepage') return pathname === '/' || pathname === '';
      if (targeting === 'custom') {
        const targetUrls = this.settings.targetUrls || [];
        return targetUrls.some(url => pathname.startsWith(url.trim()));
      }
      return true;
    }

    // Check if current time is in quiet hours
    isInQuietHours() {
      const quietHours = this.settings.quietHours;
      if (!quietHours || !quietHours.enabled) return false;

      const now = new Date();
      const currentHour = now.getHours();
      const start = quietHours.startHour ?? 22;
      const end = quietHours.endHour ?? 8;

      // Handle overnight quiet hours (e.g., 22:00 - 08:00)
      if (start > end) {
        return currentHour >= start || currentHour < end;
      }
      // Normal range (e.g., 13:00 - 14:00)
      return currentHour >= start && currentHour < end;
    }

    // NEW: Detect SPA route changes and trigger AI bubble for new pages
    setupRouteChangeDetection() {
      let currentPath = window.location.pathname;

      const handleRouteChange = () => {
        const newPath = window.location.pathname;
        if (newPath !== currentPath) {
          currentPath = newPath;
          console.log('Engagement: Route changed to', newPath);

          // Check if user already started conversation - no more bubbles
          if (sessionStorage.getItem(this.conversationStartedKey)) {
            console.log('Engagement: User already started conversation, skipping');
            return;
          }

          // Check max shows
          const shownCount = parseInt(sessionStorage.getItem(this.shownCountKey) || '0');
          const maxPerSession = this.settings.bubble?.maxShowCount || 10;
          if (shownCount >= maxPerSession) {
            console.log('Engagement: Max shows reached');
            return;
          }

          // Reset behavior for new page
          this.behavior.startTime = Date.now();
          this.behavior.scrollDepth = 0;
          this.behavior.clickCount = 0;
          this.hasShown = false;

          // Close existing bubble
          this.hideBubble();

          // Trigger AI bubble for new page after delay
          const delay = (this.settings.delay || 5) * 1000;
          setTimeout(() => {
            this.fetchAIBubble();
          }, delay);
        }
      };

      // Listen for popstate (browser back/forward)
      window.addEventListener('popstate', handleRouteChange);

      // Polling approach - safer for Next.js/React
      // Check for URL changes every 500ms
      setInterval(() => {
        handleRouteChange();
      }, 500);
    }

    // NEW: Initialize behavior tracking for AI intent detection
    initBehaviorTracking() {
      this.behavior = {
        startTime: Date.now(),
        scrollDepth: 0,
        clickCount: 0,
        isExitIntent: false
      };

      // Track scroll depth with throttle to prevent jitter
      let scrollThrottleTimer = null;
      const trackScroll = () => {
        if (scrollThrottleTimer) return;
        scrollThrottleTimer = setTimeout(() => {
          scrollThrottleTimer = null;
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (scrollHeight > 0) {
            const depth = Math.round((window.scrollY / scrollHeight) * 100);
            this.behavior.scrollDepth = Math.max(this.behavior.scrollDepth, depth);
          }
        }, 200); // 200ms throttle
      };
      window.addEventListener('scroll', trackScroll, { passive: true });
      this.listeners.push({ event: 'scroll', handler: trackScroll, target: window });

      // Track clicks
      const trackClick = () => { this.behavior.clickCount++; };
      document.addEventListener('click', trackClick);
      this.listeners.push({ event: 'click', handler: trackClick, target: document });
    }

    // NEW: Collect rich page context for AI
    collectPageContext() {
      const timeOnPage = Math.round((Date.now() - this.behavior.startTime) / 1000);

      // Get headings
      const headings = [];
      document.querySelectorAll('h1, h2, h3').forEach((el, i) => {
        if (i < 5 && el.innerText) headings.push(el.innerText.trim().substring(0, 100));
      });

      // Get meta description
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';

      // Get visible text (first 500 chars of body text)
      const bodyText = document.body?.innerText?.substring(0, 500) || '';

      return {
        url: window.location.href,
        title: document.title,
        headings,
        metaDescription: metaDesc.substring(0, 200),
        visibleText: bodyText.substring(0, 300),
        behavior: {
          timeOnPage,
          scrollDepth: this.behavior.scrollDepth,
          clickCount: this.behavior.clickCount,
          isExitIntent: this.behavior.isExitIntent
        }
      };
    }

    // NEW: Fetch AI-powered smart bubble
    async fetchAIBubble() {
      // Only if AI mode is enabled
      if (!this.settings.enabled) return;

      // CHECK 1: Conversation already started?
      if (sessionStorage.getItem(this.conversationStartedKey)) {
        console.log('Engagement: User conversation active, skipping AI bubble');
        return;
      }

      // CHECK 2: Session Limit
      const shownCount = parseInt(sessionStorage.getItem(this.shownCountKey) || '0');
      let maxPerSession = 5; // Default for AI mode
      if (this.settings.maxPerSession !== undefined) {
        maxPerSession = this.settings.maxPerSession === 0 ? 9999 : this.settings.maxPerSession;
      }

      if (shownCount >= maxPerSession) {
        console.log('Engagement: Max AI bubbles reached for session', shownCount);
        return;
      }

      // CHECK 3: Frequency (Time since last bubble)
      const lastTimeStr = sessionStorage.getItem(this.lastBubbleTimeKey);
      if (lastTimeStr) {
        const lastTime = parseInt(lastTimeStr);
        const now = Date.now();
        const frequency = (this.settings.frequency || 15) * 1000; // Default 15s

        if (now - lastTime < frequency) {
          console.log('Engagement: Too soon for next bubble (Frequency limit)', (frequency - (now - lastTime)) / 1000, 's remaining');
          return;
        }
      }

      console.log('Engagement: Fetching AI smart bubble...');

      try {
        const pageContext = this.collectPageContext();
        const apiUrl = `${this.baseUrl}/api/ai-engagement/generate`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatbotId: this.chatbotId,
            pageContext,
            tone: this.settings.tone || 'friendly',
            messageLength: this.settings.messageLength || 'medium',
            language: this.language || 'tr',
            sectorHint: this.settings.sectorHint || '',
            actionMode: this.settings.actionMode || 'aiDecides'
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Engagement: AI response received', data);

          if (data.action === 'openWidget') {
            // Open widget with AI message
            console.log('Engagement: AI decided to open widget');
            this.openWidget();
            // Optionally send the AI message as first message
            if (data.openWidgetMessage) {
              const iframe = document.querySelector('#userex-chatbot-container iframe');
              if (iframe && iframe.contentWindow) {
                setTimeout(() => {
                  iframe.contentWindow.postMessage({
                    type: 'USEREX_AI_GREETING',
                    message: data.openWidgetMessage
                  }, '*');
                }, 500);
              }
            }
          } else if ((data.action === 'showBubble' || data.action === 'showCard') && data.message) {
            // Suggestion Card (Stealth Mode) removed as per user request. 
            // Always falling back to standard proactive bubble.
            console.log('Engagement: AI bubble:', data.message);
            this.showBubble({ text: data.message }, 'aiBubble');
          }
        }
      } catch (e) {
        console.error('Engagement: Failed to fetch AI bubble', e);
      }
    }

    // Helper: Hex to RGBA
    hexToRgba(hex, alpha) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    adjustColorBrightness(hex, percent) {
      let num = parseInt(hex.replace("#", ""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        B = (num >> 8 & 0x00FF) + amt,
        G = (num & 0x0000FF) + amt;
      return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
    }

    clearDismissTimer() {
      if (this.dismissTimer) {
        clearTimeout(this.dismissTimer);
        this.dismissTimer = null;
      }
    }

    clearTypewriterTimers() {
      if (!this.typewriterTimers || this.typewriterTimers.length === 0) return;
      this.typewriterTimers.forEach(timer => clearTimeout(timer));
      this.typewriterTimers = [];
    }

    getPrefersReducedMotion() {
      try {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      } catch (e) {
        return false;
      }
    }

    normalizeBubbleAnimation(animation) {
      const allowed = ['none', 'bounce', 'pulse', 'shake', 'slide', 'fade'];
      return allowed.includes(animation) ? animation : 'bounce';
    }

    getAmbientVariantConfig() {
      const ambientVariant = this.settings && this.settings.bubble && this.settings.bubble.ambientVariant;
      if (!ambientVariant || !ambientVariant.enabled) return null;
      return ambientVariant;
    }

    getAmbientAiBubblePresetStyle(baseStyle = {}, theme = 'default') {
      const ambientColor = (settings && (settings.ambientAiBubbleColor || settings.launcherBackgroundColor || settings.brandColor || settings.primaryColor))
        || baseStyle.backgroundColor
        || '#3B82F6';
      const defaults = {
        backgroundColor: ambientColor,
        textColor: '#FFFFFF',
        effect: 'glass',
        backdropBlur: Math.max(Number(baseStyle.backdropBlur || 0), 14),
        shape: 'rounded',
        borderRadius: Math.max(Number(baseStyle.borderRadius || 12), 18),
        shadow: 'large',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        fontSize: baseStyle.fontSize || 14
      };

      if (theme === 'minimal') {
        return Object.assign({}, defaults, {
          effect: 'solid',
          backgroundColor: baseStyle.backgroundColor || '#101218',
          borderColor: 'rgba(255,255,255,0.12)',
          borderWidth: 1,
          shadow: 'small',
          borderRadius: Math.max(Number(baseStyle.borderRadius || 12), 16)
        });
      }
      if (theme === 'glass') {
        return Object.assign({}, defaults, {
          effect: 'glass',
          backdropBlur: Math.max(Number(baseStyle.backdropBlur || 0), 18),
          borderColor: 'rgba(255,255,255,0.28)',
          shadow: 'large',
          borderRadius: Math.max(Number(baseStyle.borderRadius || 12), 20)
        });
      }
      if (theme === 'compact') {
        return Object.assign({}, defaults, {
          fontSize: Math.min(Number(baseStyle.fontSize || 14), 13),
          borderRadius: Math.max(Number(baseStyle.borderRadius || 12), 14),
          shadow: 'medium',
          backdropBlur: Math.max(Number(baseStyle.backdropBlur || 0), 10)
        });
      }

      return defaults;
    }

    resolveBubblePresentation(messageText) {
      const bubble = (this.settings && this.settings.bubble) || {};
      const baseStyle = Object.assign({}, bubble.style || {});
      const basePosition = bubble.position || 'top';
      const baseAnimation = this.normalizeBubbleAnimation(bubble.animation || 'bounce');
      const isAmbientMode = !!(settings && settings.chatDisplayMode === 'ambient');
      const ambientVariant = isAmbientMode ? this.getAmbientVariantConfig() : null;
      const renderStyle = (ambientVariant && ambientVariant.renderStyle) || 'custom';
      const aiBubbleTheme = (ambientVariant && ambientVariant.aiBubbleTheme) || 'default';

      let resolvedStyle = Object.assign({}, baseStyle);
      if (ambientVariant) {
        if (renderStyle === 'ambient_ai_bubble' || renderStyle === 'ambient_ai_bubble_typewriter') {
          resolvedStyle = Object.assign({}, baseStyle, this.getAmbientAiBubblePresetStyle(baseStyle, aiBubbleTheme), ambientVariant.style || {});
        } else {
          resolvedStyle = Object.assign({}, baseStyle, ambientVariant.style || {});
        }
      }

      const parsedOffsetX = Number(ambientVariant && ambientVariant.offsetX);
      const parsedOffsetY = Number(ambientVariant && ambientVariant.offsetY);
      const parsedMaxWidth = Number(ambientVariant && ambientVariant.maxWidth);
      const typewriterDefaults = {
        enabled: true,
        charDelayMs: 18,
        startDelayMs: 100,
        cursorVisible: true,
        cursorChar: '▍',
        completePauseMs: 300,
        reducedMotionBehavior: 'instant',
        replayBehavior: 'new_text_only'
      };
      const typewriter = Object.assign({}, typewriterDefaults, (ambientVariant && ambientVariant.typewriter) || {});
      const typewriterEnabled = !!(
        ambientVariant &&
        renderStyle === 'ambient_ai_bubble_typewriter' &&
        typewriter.enabled !== false
      );

      return {
        isAmbientMode,
        useAmbientVariant: !!ambientVariant,
        renderStyle,
        aiBubbleTheme,
        position: (ambientVariant && ambientVariant.position) || basePosition,
        animation: this.normalizeBubbleAnimation((ambientVariant && ambientVariant.animation) || baseAnimation),
        style: resolvedStyle,
        offsetX: Number.isFinite(parsedOffsetX) ? parsedOffsetX : 0,
        offsetY: Number.isFinite(parsedOffsetY) ? parsedOffsetY : 0,
        maxWidth: Number.isFinite(parsedMaxWidth) && parsedMaxWidth > 0 ? parsedMaxWidth : null,
        typewriterEnabled,
        typewriter,
        messageText: String(messageText || '')
      };
    }

    removeBubbleAnimationClasses() {
      if (!this.bubble) return;
      ['bounce', 'pulse', 'shake', 'slide', 'fade'].forEach(name => {
        this.bubble.classList.remove(`userex-eng-${name}`);
        this.bubble.classList.remove(`userex-eng-${name}-center`);
      });
    }

    applyBubbleAnimation(animation) {
      if (!this.bubble) return;
      const normalizedAnimation = this.normalizeBubbleAnimation(animation);
      this.removeBubbleAnimationClasses();
      if (!normalizedAnimation || normalizedAnimation === 'none') return;
      this.addAnimationStyles();
      void this.bubble.offsetWidth;
      const animationClass = this.isBubbleCentered ? `userex-eng-${normalizedAnimation}-center` : `userex-eng-${normalizedAnimation}`;
      this.currentBubbleAnimation = normalizedAnimation;
      this.bubble.classList.add(animationClass);
    }

    applyBubbleContentWithTypewriter(contentEl, text, presentation, onComplete) {
      if (!contentEl) {
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      const plainText = String(text || '');
      this.activeTypewriterText = plainText;
      this.bubbleTextFullyRendered = false;
      this.clearTypewriterTimers();

      const shouldType = !!presentation.typewriterEnabled;
      const reducedMotion = this.getPrefersReducedMotion();
      const reducedBehavior = (presentation.typewriter && presentation.typewriter.reducedMotionBehavior) || 'instant';
      const shouldSkipForSameText = shouldType && this.lastTypedBubbleText === plainText;
      const shouldSkipForReducedMotion = shouldType && reducedMotion && reducedBehavior === 'instant';

      if (!shouldType || shouldSkipForSameText || shouldSkipForReducedMotion) {
        contentEl.textContent = plainText;
        this.bubbleTextFullyRendered = true;
        if (shouldType) this.lastTypedBubbleText = plainText;
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      const typewriter = presentation.typewriter || {};
      const charDelayMs = Math.max(5, Number(typewriter.charDelayMs || 18));
      const startDelayMs = Math.max(0, Number(typewriter.startDelayMs || 100));
      const completePauseMs = Math.max(0, Number(typewriter.completePauseMs || 300));
      const cursorVisible = typewriter.cursorVisible !== false;
      const cursorChar = typeof typewriter.cursorChar === 'string' && typewriter.cursorChar.length > 0
        ? typewriter.cursorChar
        : '▍';

      let idx = 0;
      const renderFrame = () => {
        if (!this.bubble || !this.bubble.contains(contentEl)) return;
        const visibleText = plainText.slice(0, idx);
        contentEl.textContent = cursorVisible && idx < plainText.length
          ? `${visibleText}${cursorChar}`
          : visibleText;
      };

      const finish = () => {
        if (!this.bubble || !this.bubble.contains(contentEl)) return;
        contentEl.textContent = plainText;
        this.lastTypedBubbleText = plainText;
        this.bubbleTextFullyRendered = true;
        const finishTimer = setTimeout(() => {
          if (typeof onComplete === 'function') onComplete();
        }, completePauseMs);
        this.typewriterTimers.push(finishTimer);
      };

      const step = () => {
        if (!this.bubble || !this.bubble.contains(contentEl)) return;
        if (this.activeTypewriterText !== plainText) return;
        idx += 1;
        renderFrame();
        if (idx >= plainText.length) {
          finish();
          return;
        }
        const t = setTimeout(step, charDelayMs);
        this.typewriterTimers.push(t);
      };

      renderFrame();
      const startTimer = setTimeout(() => {
        if (!this.bubble || !this.bubble.contains(contentEl)) return;
        if (this.activeTypewriterText !== plainText) return;
        if (plainText.length === 0) {
          finish();
          return;
        }
        step();
      }, startDelayMs);
      this.typewriterTimers.push(startTimer);
    }

    getDismissDelayForMessage(message, bubble) {
      if (typeof message === 'object' && message.duration !== undefined && message.duration > 0) {
        console.log(`Engagement: Using message-specific duration: ${message.duration}s`);
        return message.duration * 1000;
      }
      if (bubble && bubble.autoDismiss) {
        return (bubble.autoDismissDelay || 10) * 1000;
      }
      return null;
    }

    scheduleBubbleDismiss(dismissDelay, triggerSource) {
      this.clearDismissTimer();
      if (!dismissDelay) return;
      this.dismissTimer = setTimeout(() => {
        this.hideBubble();

        if (triggerSource) {
          const nextMsg = this.getNextMessage(triggerSource);
          if (nextMsg) {
            console.log(`Engagement: Chaining next message for ${triggerSource}`);
            const chainTimer = setTimeout(() => {
              this.showBubble(nextMsg, triggerSource);
            }, 500);
            this.timers.push(chainTimer);
          }
        }
      }, dismissDelay);
    }

    selectMessage() {
      // Exclusivity Check
      if (this.settings.aiSmartBubbles && this.settings.aiSmartBubbles.enabled) return;

      const rawMessages = this.settings.bubble?.messages;

      if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
        console.log('Engagement: No valid messages array found');
        return;
      }

      // Filter active messages
      const activeMessages = rawMessages.map(m => {
        if (typeof m === 'string') return { text: m, delay: 0, isActive: true };
        if (typeof m === 'object' && m !== null && m.text) {
          return { text: m.text, delay: m.delay || 0, isActive: m.isActive !== false };
        }
        return null;
      }).filter(m => m !== null && m.isActive !== false);

      if (activeMessages.length === 0) {
        console.log('Engagement: No active messages found');
        return;
      }

      // Sort by delay to ensure sequential display
      this.messageQueue = activeMessages.sort((a, b) => a.delay - b.delay);
      this.pendingQueue = [...this.messageQueue]; // For trigger consumption

      // Legacy support to prevent immediate crash before showBubble update
      this.targetMessage = this.messageQueue[0];

      console.log('Engagement: Message queue prepared', this.messageQueue);
    }

    // NEW: Helper to find bound message (Sequential Logic)
    getNextMessage(triggerIdSuffix) {
      if (!this.settings || !this.settings.triggers) return null;

      const triggers = this.settings.triggers;

      // 1. Try to get specific message list for this trigger
      const messages = triggers[`${triggerIdSuffix}Messages`];

      // 2. Fallback to legacy binding if exists
      if (!messages || messages.length === 0) {
        const legacyId = triggers[`${triggerIdSuffix}MessageId`];
        if (legacyId) return this.settings.bubble?.messages?.find(m => m.id === legacyId) || null;
        return null;
      }

      // 3. Sequential Selection
      const activeMsgs = messages.filter(m => m.isActive !== false);
      if (activeMsgs.length === 0) return null;

      // Initialize index map if needed
      if (!this.triggerIndices) this.triggerIndices = {};
      if (this.triggerIndices[triggerIdSuffix] === undefined) {
        this.triggerIndices[triggerIdSuffix] = 0;
      }

      let currentIndex = this.triggerIndices[triggerIdSuffix];

      // Safety check
      if (currentIndex >= activeMsgs.length) {
        currentIndex = 0;
        this.triggerIndices[triggerIdSuffix] = 0;
      }

      const selectedMsg = activeMsgs[currentIndex];

      // Advance index for next time (Circular)
      this.triggerIndices[triggerIdSuffix] = (currentIndex + 1) % activeMsgs.length;

      return selectedMsg;
    }

    // NEW: Open widget directly (Phase 1)
    openWidget() {
      const launcher = document.getElementById('userex-chatbot-launcher');
      const container = document.getElementById('userex-chatbot-container');

      if (launcher) {
        // Check if already open to prevent toggle (closing)
        if (container && container.style.display !== 'none') {
          console.log('Engagement: Widget already open, skipping open action');
          return;
        }

        console.log('Engagement: Opening widget via trigger action');
        // Mark conversation as started - no more bubbles after this
        sessionStorage.setItem(this.conversationStartedKey, 'true');
        this.hideBubble();
        launcher.click();
        return;
      }

      // Ambient / always-open modes may not render a launcher.
      // In that case, treat "openWidget" as "focus/open input".
      if (container) {
        console.log('Engagement: No launcher found, focusing input for always-open widget');
        sessionStorage.setItem(this.conversationStartedKey, 'true');
        this.hideBubble();
        const iframe = container.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'USEREX_ACTIVATE_INPUT' }, '*');
        }
      }
    }

    // NEW: Execute trigger action based on actionType
    executeTriggerAction(triggerId, triggerSource) {
      const actionType = this.settings.triggers[`${triggerId}ActionType`] || 'bubble';

      if (actionType === 'openWidget') {
        this.openWidget();
      } else {
        // Default: Show bubble
        const msg = this.getNextMessage(triggerSource);
        if (msg) this.showBubble(msg, triggerSource);
      }
    }

    setupTriggers() {
      // Exclusivity Check: If AI Smart Bubbles are enabled, ignore manual triggers
      if (this.settings.aiSmartBubbles && this.settings.aiSmartBubbles.enabled) {
        console.log('Engagement: AI Auto-Pilot active. Skipping manual triggers.');
        return;
      }

      const triggers = this.settings.triggers;
      console.log('Engagement: Setting up triggers', triggers);

      // 1. Schedule Time-based Messages (Sequential)
      if (this.messageQueue && this.messageQueue.length > 0) {
        this.messageQueue.forEach(msg => {
          if (msg.delay !== undefined) {
            const timer = setTimeout(() => {
              if (this.hasShown && !this.settings.bubble.autoDismiss) return; // Don't interrupt if already shown and persistent
              console.log(`Engagement: Delay trigger fired for message: "${msg.text}"`);
              this.showBubble(msg);
            }, (msg.delay || 0) * 1000);
            this.timers.push(timer);
          }
        });
      }

      // 1. Initialize indices
      this.triggerIndices = {};

      // (Done in getNextMessage or init)

      // 2. Scroll Depth Trigger
      if (triggers.scrollDepth && triggers.scrollDepth > 0) {
        const checkScroll = () => {
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (scrollHeight <= 0) return;

          const scrolled = (window.scrollY / scrollHeight) * 100;
          if (scrolled >= triggers.scrollDepth) {
            console.log('Engagement: Scroll depth trigger fired');
            this.executeTriggerAction('scrollDepth', 'scrollDepth');
            window.removeEventListener('scroll', debouncedCheck);
          }
        };
        const debouncedCheck = debounce(checkScroll, 200);
        window.addEventListener('scroll', debouncedCheck);
        this.listeners.push({ event: 'scroll', handler: debouncedCheck });
      }

      // 3. Exit Intent Trigger (Desktop only)
      if (triggers.exitIntent && !isMobileDevice()) {
        const handleMouseLeave = (e) => {
          if (e.clientY <= 10) {
            console.log('Engagement: Exit intent trigger fired');
            this.executeTriggerAction('exitIntent', 'exitIntent');
            document.removeEventListener('mouseleave', handleMouseLeave);
          }
        };
        document.addEventListener('mouseleave', handleMouseLeave);
        this.listeners.push({ event: 'mouseleave', handler: handleMouseLeave, target: document });
      }





      // 4. Page Revisit Trigger
      if (triggers.pageRevisit && triggers.pageRevisit > 0) {
        let visits = parseInt(localStorage.getItem(this.visitCountKey) || '0');
        if (visits >= triggers.pageRevisit) {
          console.log('Engagement: Page revisit trigger fired', visits);
          setTimeout(() => this.executeTriggerAction('pageRevisit', 'pageRevisit'), 1000);
        }
      }

      // 5. Inactivity Trigger (Idle)
      if (triggers.inactivity && triggers.inactivity > 0) {
        let inactivityTimer;
        const resetTimer = () => {
          clearTimeout(inactivityTimer);
          inactivityTimer = setTimeout(() => {
            console.log('Engagement: Inactivity trigger fired');
            this.executeTriggerAction('inactivity', 'inactivity');
          }, triggers.inactivity * 1000);
        };

        // Reset on any activity
        ['mousemove', 'keypress', 'scroll', 'click', 'touchstart'].forEach(event => {
          document.addEventListener(event, resetTimer, { passive: true });
          this.listeners.push({ event, handler: resetTimer, target: document });
        });
        resetTimer();
      }

      // 6. Time on Page (New)
      if (triggers.timeOnPage && triggers.timeOnPage > 0) {
        const timer = setTimeout(() => {
          console.log('Engagement: Time on Page trigger fired');
          this.executeTriggerAction('timeOnPage', 'timeOnPage');
        }, triggers.timeOnPage * 1000);
        this.timers.push(timer);
      }

      // 7. Click Count (New)
      if (triggers.clickCount && triggers.clickCount > 0) {
        let clicks = 0;
        const clickHandler = () => {
          clicks++;
          if (clicks >= triggers.clickCount) {
            console.log('Engagement: Click count trigger fired', clicks);
            this.executeTriggerAction('clickCount', 'clickCount');
            document.removeEventListener('click', clickHandler);
          }
        };
        document.addEventListener('click', clickHandler);
        this.listeners.push({ event: 'click', handler: clickHandler, target: document });
      }

      // 8. Copy Trigger (New)
      if (triggers.copyTrigger) {
        const copyHandler = () => {
          console.log('Engagement: Copy trigger fired');
          this.executeTriggerAction('copyTrigger', 'copyTrigger');
        };
        document.addEventListener('copy', copyHandler);
        this.listeners.push({ event: 'copy', handler: copyHandler, target: document });
      }

    }

    async fetchContextBubble() {
      // Check if proactive messaging is enabled in settings (using legacy field or new module logic)
      // fetchContextBubble relies on the settings object passed into the EngagementController constructor.
      // Assuming settings.enableProactiveMessaging matches backend mapping.
      if (this.settings.enableProactiveMessaging !== true) return;

      console.log('Engagement: Fetching context bubble...');

      try {
        const pageUrl = window.location.href;
        const pageTitle = document.title;
        const h1 = document.querySelector('h1')?.innerText || '';

        // API URL construction
        // If baseUrl ends with slash, remove it for safety, or just trust it.
        // baseUrl comes from script src origin.
        const apiUrl = `${this.baseUrl}/api/generate-context-bubble`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatbotId: this.chatbotId,
            pageUrl,
            pageTitle,
            h1,
            tone: this.settings.tone || 'friendly'
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.bubble) {
            console.log('Engagement: Context bubble received:', data.bubble);
            // Show it after a short delay (e.g. 2 seconds) to grab attention
            setTimeout(() => {
              this.showBubble({ text: data.bubble }, 'contextBubble'); // Pass source
            }, 2000);
          }
        }
      } catch (e) {
        console.error('Engagement: Failed to fetch context bubble', e);
      }
    }

    showBubble(specificMsg = null, triggerSource = null) {
      const container = document.getElementById('userex-chatbot-container');
      const isWidgetOpen = !!(container && container.style.display && container.style.display !== 'none');
      const isAmbientMode = !!(settings && settings.chatDisplayMode === 'ambient');
      const isAmbientFeedOpen = !!(isAmbientMode && container && container.dataset && container.dataset.userexAmbientFeedVisible === '1');

      if ((!isAmbientMode && isWidgetOpen) || isAmbientFeedOpen) {
        console.log('Engagement: Bubble suppressed because chat is open', {
          isAmbientMode,
          isWidgetOpen,
          isAmbientFeedOpen
        });
        return;
      }

      const existingBubble = document.getElementById('userex-engagement-bubble');
      if (existingBubble) {
        console.log('Engagement: Bubble already visible, skipping');
        return;
      }

      if (this.bubble && !document.body.contains(this.bubble)) {
        this.bubble = null;
        this.currentMessageText = null;
      }

      let message = specificMsg;
      if (!message) {
        if (this.pendingQueue && this.pendingQueue.length > 0) {
          message = this.pendingQueue.shift();
        } else if (this.messageQueue && this.messageQueue.length > 0) {
          message = this.messageQueue[Math.floor(Math.random() * this.messageQueue.length)];
        }
      }

      if (!message || !message.text) return;

      if (this.bubble && this.currentMessageText === message.text) return;

      this.currentMessageText = message.text;
      this.hasShown = true;
      this.clearDismissTimer();
      this.clearTypewriterTimers();

      const shownCount = parseInt(sessionStorage.getItem(this.shownCountKey) || '0');
      sessionStorage.setItem(this.shownCountKey, (shownCount + 1).toString());

      const iframe = document.querySelector('#userex-chatbot-container iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'USEREX_ENGAGEMENT_SHOWN',
          message: message.text,
          trigger: triggerSource || 'auto'
        }, '*');
      }

      const bubbleConfig = this.settings.bubble || {};
      const presentation = this.resolveBubblePresentation(message.text);
      const position = presentation.position || 'top';
      const style = presentation.style || {};
      const animation = presentation.animation || 'bounce';
      const messageText = presentation.messageText;

      this.bubble = document.createElement('div');
      this.bubble.id = 'userex-engagement-bubble';
      this.bubble.dataset.userexBubbleVariant = presentation.useAmbientVariant ? 'ambient' : 'classic';
      this.bubble.className = presentation.useAmbientVariant ? 'userex-engagement-bubble--ambient' : 'userex-engagement-bubble--classic';
      this.bubble.innerHTML = `
	        <div class="bubble-content"></div>
	        <button class="bubble-close" aria-label="Close">×</button>
	      `;

      const borderRadius = style.borderRadius !== undefined ? style.borderRadius : 12;
      const shadows = {
        'none': 'none',
        'small': '0 2px 8px rgba(0,0,0,0.1)',
        'medium': '0 4px 12px rgba(0,0,0,0.15)',
        'large': '0 8px 24px rgba(0,0,0,0.2)',
        'glow': `0 0 15px ${(style.backgroundColor || '#000000')}60`
      };

      let backgroundStyle = `background-color: ${style.backgroundColor || '#000000'};`;
      let backdropFilter = '';
      let borderStyle = 'border: 1px solid rgba(0,0,0,0.05);';
      let boxShadow = shadows[style.shadow] || shadows.medium;
      let textColor = style.textColor || '#FFFFFF';

      if (style.effect === 'glass') {
        backgroundStyle = `background: ${this.hexToRgba(style.backgroundColor || '#000000', 0.65)};`;
        backdropFilter = `backdrop-filter: blur(${style.backdropBlur || 12}px); -webkit-backdrop-filter: blur(${style.backdropBlur || 12}px);`;
        if (style.borderWidth && style.borderWidth > 0) {
          borderStyle = `border: ${style.borderWidth}px solid ${style.borderColor || this.hexToRgba(style.textColor || '#FFFFFF', 0.15)};`;
        } else {
          borderStyle = `border: 1px solid ${this.hexToRgba(style.textColor || '#FFFFFF', 0.15)};`;
        }
      } else if (style.effect === 'gradient') {
        const baseColor = style.backgroundColor || '#000000';
        const color2 = this.adjustColorBrightness(baseColor, -40);
        backgroundStyle = `background: linear-gradient(135deg, ${baseColor} 0%, ${color2} 100%);`;
        borderStyle = (style.borderWidth && style.borderWidth > 0)
          ? `border: ${style.borderWidth}px solid ${style.borderColor || 'transparent'};`
          : 'border: none;';
      } else if (style.effect === 'outline') {
        backgroundStyle = `background-color: ${style.backgroundColor || '#FFFFFF'};`;
        borderStyle = `border: 2px solid ${style.borderColor || textColor};`;
      } else {
        if (style.borderWidth && style.borderWidth > 0) {
          borderStyle = `border: ${style.borderWidth}px solid ${style.borderColor || 'rgba(0,0,0,0.05)'};`;
        }
      }

      let borderRad = `${borderRadius}px`;
      if (style.shape === 'pill') borderRad = '9999px';
      if (style.shape === 'square') borderRad = '0px';
      if (style.shape === 'speech') borderRad = `${borderRadius}px ${borderRadius}px ${borderRadius}px 4px`;

      const resolvedMaxWidth = presentation.maxWidth || 300;
      this.bubble.style.cssText = `
	        position: fixed;
	        z-index: 9998;
	        ${backgroundStyle}
	        ${backdropFilter}
	        color: ${textColor};
	        padding: ${presentation.useAmbientVariant ? (presentation.aiBubbleTheme === 'compact' ? '10px 12px' : '12px 14px') : '14px 18px'};
	        border-radius: ${borderRad};
	        box-shadow: ${boxShadow};
	        cursor: pointer;
	        max-width: ${Math.max(180, resolvedMaxWidth)}px;
	        font-family: ${style.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
	        font-size: ${style.fontSize || 14}px;
	        line-height: 1.5;
	        display: flex;
	        align-items: ${presentation.useAmbientVariant ? 'flex-start' : 'center'};
	        gap: 10px;
	        opacity: 0;
	        transform: translateY(20px);
	        transition: opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	        ${borderStyle}
	      `;

      if (presentation.useAmbientVariant) {
        this.bubble.style.boxShadow = this.bubble.style.boxShadow || '0 12px 32px rgba(0,0,0,0.24)';
      }

      document.body.appendChild(this.bubble);
      this.positionBubble(position, presentation);

      const content = this.bubble.querySelector('.bubble-content');
      if (content) {
        content.style.cssText = `
	          display: block;
	          white-space: pre-wrap;
	          word-break: break-word;
	          flex: 1;
	        `;
      }

      const closeBtn = this.bubble.querySelector('.bubble-close');
      if (closeBtn) {
        const showCloseButton = bubbleConfig.showCloseButton !== false;
        closeBtn.style.cssText = `
	          background: none;
	          border: none;
	          color: ${style.textColor || '#FFFFFF'};
	          font-size: 20px;
	          cursor: pointer;
	          padding: 0;
	          margin-left: auto;
	          opacity: 0.7;
	          transition: opacity 0.2s;
	          width: 20px;
	          height: 20px;
	          display: ${showCloseButton ? 'flex' : 'none'};
	          align-items: center;
	          justify-content: center;
	          flex-shrink: 0;
	        `;
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.7');
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.hideBubble();
        });
      }

      sessionStorage.setItem(this.lastBubbleTimeKey, Date.now().toString());

      setTimeout(() => {
        if (!this.bubble) return;
        this.bubble.style.opacity = '1';
        this.bubble.style.transform = this.isBubbleCentered ? 'translate(-50%, 0)' : 'translateY(0)';
      }, 10);

      if (animation && animation !== 'none') {
        setTimeout(() => {
          this.applyBubbleAnimation(animation);
        }, 300);
      }

      this.bubble.addEventListener('click', () => {
        console.log('Engagement bubble clicked - opening chat');
        sessionStorage.setItem(this.conversationStartedKey, 'true');
        this.clearTypewriterTimers();

        const launcher = document.getElementById('userex-chatbot-launcher');
        if (launcher) {
          launcher.click();
        } else {
          const bubbleIframe = document.querySelector('#userex-chatbot-container iframe');
          if (bubbleIframe && bubbleIframe.contentWindow) {
            bubbleIframe.contentWindow.postMessage({ type: 'USEREX_ACTIVATE_INPUT' }, '*');
          }
        }

        const notifyIframe = document.querySelector('#userex-chatbot-container iframe');
        if (notifyIframe && notifyIframe.contentWindow) {
          notifyIframe.contentWindow.postMessage({
            type: 'USEREX_BUBBLE_CLICKED',
            message: messageText
          }, '*');
        }

        this.hideBubble();
      });

      const dismissDelay = this.getDismissDelayForMessage(message, bubbleConfig);
      this.applyBubbleContentWithTypewriter(content, messageText, presentation, () => {
        this.scheduleBubbleDismiss(dismissDelay, triggerSource);
      });
    }

    applyBubblePositionOffsets(presentation) {
      if (!this.bubble || !presentation) return;
      const offsetX = Number.isFinite(Number(presentation.offsetX)) ? Number(presentation.offsetX) : 0;
      const offsetY = Number.isFinite(Number(presentation.offsetY)) ? Number(presentation.offsetY) : 0;
      const maxWidth = Number.isFinite(Number(presentation.maxWidth)) ? Number(presentation.maxWidth) : null;

      if (maxWidth && maxWidth > 0) {
        this.bubble.style.maxWidth = `${Math.max(180, maxWidth)}px`;
      }

      if (offsetY !== 0 && this.bubble.style.bottom) {
        const currentBottom = parseFloat(this.bubble.style.bottom);
        if (!Number.isNaN(currentBottom)) {
          this.bubble.style.bottom = `${currentBottom + offsetY}px`;
        }
      }

      if (offsetX !== 0) {
        if (this.bubble.style.left && this.bubble.style.left !== 'auto') {
          const currentLeft = parseFloat(this.bubble.style.left);
          if (!Number.isNaN(currentLeft)) {
            this.bubble.style.left = `${currentLeft + offsetX}px`;
          }
        } else if (this.bubble.style.right && this.bubble.style.right !== 'auto') {
          const currentRight = parseFloat(this.bubble.style.right);
          if (!Number.isNaN(currentRight)) {
            this.bubble.style.right = `${Math.max(0, currentRight - offsetX)}px`;
          }
        }
      }
    }

    clampBubbleToViewport() {
      if (!this.bubble || !document.body.contains(this.bubble)) return;
      const margin = 12;
      const rect = this.bubble.getBoundingClientRect();
      if (!rect || !Number.isFinite(rect.left)) return;

      if (rect.left < margin) {
        if (this.bubble.style.left && this.bubble.style.left !== 'auto') {
          const left = parseFloat(this.bubble.style.left);
          if (!Number.isNaN(left)) this.bubble.style.left = `${left + (margin - rect.left)}px`;
        } else if (this.bubble.style.right && this.bubble.style.right !== 'auto') {
          const right = parseFloat(this.bubble.style.right);
          if (!Number.isNaN(right)) this.bubble.style.right = `${Math.max(0, right - (margin - rect.left))}px`;
        }
      }

      if (rect.right > window.innerWidth - margin) {
        const overflow = rect.right - (window.innerWidth - margin);
        if (this.bubble.style.left && this.bubble.style.left !== 'auto') {
          const left = parseFloat(this.bubble.style.left);
          if (!Number.isNaN(left)) this.bubble.style.left = `${Math.max(margin, left - overflow)}px`;
        } else if (this.bubble.style.right && this.bubble.style.right !== 'auto') {
          const right = parseFloat(this.bubble.style.right);
          if (!Number.isNaN(right)) this.bubble.style.right = `${right + overflow}px`;
        }
      }

      const rectAfterX = this.bubble.getBoundingClientRect();
      if (rectAfterX.bottom > window.innerHeight - margin && this.bubble.style.bottom) {
        const bottom = parseFloat(this.bubble.style.bottom);
        if (!Number.isNaN(bottom)) {
          this.bubble.style.bottom = `${bottom + (rectAfterX.bottom - (window.innerHeight - margin))}px`;
        }
      }
      if (rectAfterX.top < margin && this.bubble.style.bottom) {
        const bottom = parseFloat(this.bubble.style.bottom);
        if (!Number.isNaN(bottom)) {
          this.bubble.style.bottom = `${Math.max(margin, bottom - (margin - rectAfterX.top))}px`;
        }
      }
    }

    positionBubble(position, presentation = null) {
      const launcher = document.getElementById('userex-chatbot-launcher');
      const container = document.getElementById('userex-chatbot-container');
      let anchorRect = null;
      let anchorKind = 'launcher';

      if (launcher) {
        anchorRect = launcher.getBoundingClientRect();
      } else if (container) {
        anchorRect = container.getBoundingClientRect();
        anchorKind = 'container';
      }

      if (!anchorRect) return;

      const launcherRect = anchorRect;
      const gap = 16;

      // Default to non-centered
      this.isBubbleCentered = false;

      // If there's no launcher (ambient / always-open), anchor above the visible container.
      if (anchorKind === 'container') {
        const anchorCenter = launcherRect.left + (launcherRect.width / 2);
        const screenW = window.innerWidth;
        let targetBottom = Math.max(gap, window.innerHeight - launcherRect.top + gap);

        // Ambient mode: anchor the proactive bubble near the input dock (form),
        // not the top of the whole iframe container (which can be much taller).
        if (settings && settings.chatDisplayMode === 'ambient') {
          const distanceToBottom = Math.max(0, window.innerHeight - launcherRect.bottom);
          const distanceToTop = Math.max(0, launcherRect.top);
          const isBottomAnchoredAmbient = distanceToBottom <= (distanceToTop + 4);

          if (isBottomAnchoredAmbient) {
            const ambientBottomMargin = Number(settings.ambientBottomMargin || 0);
            // Anchor near the visible input dock (not the iframe's full ambient rail height).
            // The previous estimate was too tall and placed the bubble far above the form.
            const estimatedDockOffset = (isMobileDevice() ? 64 : 56) + ambientBottomMargin;
            const estimatedDockTop = Math.max(0, launcherRect.bottom - estimatedDockOffset);
            const ambientGap = isMobileDevice() ? 10 : 12;
            targetBottom = Math.max(ambientGap, window.innerHeight - estimatedDockTop + ambientGap);
          }
        }

        this.bubble.style.bottom = `${targetBottom}px`;

        const forcedLeft = position === 'left' || position === 'bottom-left';
        const forcedRight = position === 'right' || position === 'bottom-right';
        const forcedCenter = position === 'top';

        if (forcedLeft || (!forcedRight && !forcedCenter && anchorCenter < screenW * 0.33)) {
          this.bubble.style.left = `${Math.max(12, launcherRect.left)}px`;
          this.bubble.style.right = 'auto';
          this.bubble.style.transform = 'translateY(20px)';
        } else if (forcedRight || (!forcedCenter && anchorCenter > screenW * 0.66)) {
          this.bubble.style.right = `${Math.max(12, screenW - launcherRect.right)}px`;
          this.bubble.style.left = 'auto';
          this.bubble.style.transform = 'translateY(20px)';
        } else {
          this.bubble.style.left = `${anchorCenter}px`;
          this.bubble.style.right = 'auto';
          this.bubble.style.transform = 'translate(-50%, 20px)';
          this.isBubbleCentered = true;
        }
      } else if (position === 'top') {
        const launcherCenter = launcherRect.left + (launcherRect.width / 2);
        const screenW = window.innerWidth;

        // Vertical placement (always above)
        this.bubble.style.bottom = `${window.innerHeight - launcherRect.top + gap}px`;

        // Horizontal Zones
        if (launcherCenter < screenW * 0.33) {
          // LEFT ZONE -> Align Left Edge
          this.bubble.style.left = `${launcherRect.left}px`;
          this.bubble.style.right = 'auto';
          this.bubble.style.transform = 'translateY(20px)';
        } else if (launcherCenter > screenW * 0.66) {
          // RIGHT ZONE -> Align Right Edge
          this.bubble.style.right = `${screenW - launcherRect.right}px`;
          this.bubble.style.left = 'auto';
          this.bubble.style.transform = 'translateY(20px)';
        } else {
          // CENTER ZONE -> Align to Center of Launcher
          this.bubble.style.left = `${launcherCenter}px`;
          this.bubble.style.right = 'auto';
          // Center the bubble relative to the launcher's center point
          this.bubble.style.transform = 'translate(-50%, 20px)';
          this.isBubbleCentered = true;
        }
      } else {
        // Fallback for other manual positions (left/right of launcher)
        switch (position) {
          case 'left':
            this.bubble.style.bottom = `${window.innerHeight - launcherRect.bottom}px`;
            this.bubble.style.right = `${window.innerWidth - launcherRect.left + gap}px`;
            break;
          case 'right':
            this.bubble.style.bottom = `${window.innerHeight - launcherRect.bottom}px`;
            this.bubble.style.left = `${launcherRect.right + gap}px`;
            break;
          case 'bottom-left':
            this.bubble.style.bottom = `${Math.max(12, window.innerHeight - launcherRect.bottom + 8)}px`;
            this.bubble.style.left = `${Math.max(12, launcherRect.left)}px`;
            break;
          case 'bottom-right':
            this.bubble.style.bottom = `${Math.max(12, window.innerHeight - launcherRect.bottom + 8)}px`;
            this.bubble.style.right = `${Math.max(12, window.innerWidth - launcherRect.right)}px`;
            break;
          default:
            // Default check (fallback to Right-Aligned Top if unknown)
            this.bubble.style.bottom = `${window.innerHeight - launcherRect.top + gap}px`;
            this.bubble.style.right = `${window.innerWidth - launcherRect.right}px`;
            break;
        }
      }


      // Mobile adjustments
      if (isMobileDevice()) {
        this.bubble.style.maxWidth = this.bubble.style.maxWidth || 'calc(100vw - 40px)';
        if (presentation && presentation.maxWidth) {
          this.bubble.style.maxWidth = `min(${Math.max(180, presentation.maxWidth)}px, calc(100vw - 24px))`;
        }
        // On mobile, if centered, keep it centered? Or default to full width behaviors?
        // Usually mobile uses specific styles injected in addMobileStyles
      }

      if (presentation) {
        this.applyBubblePositionOffsets(presentation);
      }
      this.clampBubbleToViewport();
    }

    addAnimationStyles() {
      if (document.getElementById('userex-engagement-animations')) return;

      const style = document.createElement('style');
      style.id = 'userex-engagement-animations';
      style.innerHTML = `
        @keyframes userex-eng-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes userex-eng-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
	        @keyframes userex-eng-shake {
	          0%, 100% { transform: translateX(0); }
	          25% { transform: translateX(-4px); }
	          75% { transform: translateX(4px); }
	        }
	        @keyframes userex-eng-slide {
	          0%, 100% { transform: translateY(0); }
	          50% { transform: translateY(-4px) translateX(4px); }
	        }
	        @keyframes userex-eng-fade {
	          0%, 100% { opacity: 1; }
	          50% { opacity: 0.65; }
	        }
	        /* Centered Animations */
	        @keyframes userex-eng-bounce-center {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -8px); }
        }
        @keyframes userex-eng-pulse-center {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50% { transform: translate(-50%, 0) scale(1.05); }
        }
	        @keyframes userex-eng-shake-center {
	          0%, 100% { transform: translate(-50%, 0); }
	          25% { transform: translate(calc(-50% - 4px), 0); }
	          75% { transform: translate(calc(-50% + 4px), 0); }
	        }
	        @keyframes userex-eng-slide-center {
	          0%, 100% { transform: translate(-50%, 0); }
	          50% { transform: translate(calc(-50% + 4px), -4px); }
	        }
	        @keyframes userex-eng-fade-center {
	          0%, 100% { opacity: 1; }
	          50% { opacity: 0.65; }
	        }

        .userex-eng-bounce {
          animation: userex-eng-bounce 1.5s ease-in-out infinite;
        }
        .userex-eng-pulse {
          animation: userex-eng-pulse 2s ease-in-out infinite;
        }
	        .userex-eng-shake {
	          animation: userex-eng-shake 0.5s ease-in-out infinite;
	        }
	        .userex-eng-slide {
	          animation: userex-eng-slide 1.6s ease-in-out infinite;
	        }
	        .userex-eng-fade {
	          animation: userex-eng-fade 1.8s ease-in-out infinite;
	        }
	        /* Centered Classes */
        .userex-eng-bounce-center {
          animation: userex-eng-bounce-center 1.5s ease-in-out infinite;
        }
        .userex-eng-pulse-center {
          animation: userex-eng-pulse-center 2s ease-in-out infinite;
        }
	        .userex-eng-shake-center {
	          animation: userex-eng-shake-center 0.5s ease-in-out infinite;
	        }
	        .userex-eng-slide-center {
	          animation: userex-eng-slide-center 1.6s ease-in-out infinite;
	        }
	        .userex-eng-fade-center {
	          animation: userex-eng-fade-center 1.8s ease-in-out infinite;
	        }
	      `;
      document.head.appendChild(style);
    }






    hideBubble() {
      if (!this.bubble) return;
      this.clearDismissTimer();
      this.clearTypewriterTimers();
      this.activeTypewriterText = '';
      this.bubbleTextFullyRendered = true;
      this.removeBubbleAnimationClasses();

      this.bubble.style.opacity = '0';
      this.bubble.style.transform = this.isBubbleCentered ? 'translate(-50%, 20px)' : 'translateY(20px)';

      setTimeout(() => {
        if (this.bubble && this.bubble.parentNode) {
          this.bubble.parentNode.removeChild(this.bubble);
        }
        this.bubble = null;
        this.currentMessageText = null;
      }, 300);
    }

    cleanup() {
      // Clear all timers
      this.timers.forEach(timer => clearTimeout(timer));
      this.timers = [];
      this.clearDismissTimer();
      this.clearTypewriterTimers();

      // Remove all event listeners
      this.listeners.forEach(({ event, handler, target }) => {
        (target || window).removeEventListener(event, handler);
      });
      this.listeners = [];
    }

    destroy() {
      this.hideBubble();
      this.cleanup();
    }
  }

  // ============================================
  // DYNAMIC CONTEXT OBSERVER (NO-CODE)
  // ============================================
  class DynamicContextObserver {
    constructor(selectors) {
      this.selectors = selectors || [];
      this.observers = new Map(); // Map<Selector, MutationObserver>
      this.inputListeners = new Map(); // Map<Selector, { el, handler }>
      this.elements = new Map(); // Map<Selector, Element>
      this.data = {};
      this.debounceTimer = null;
      this.pollingTimer = null;
    }

    readElementValue(el) {
      const tag = (el.tagName || '').toLowerCase();

      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        const inputType = (el.type || '').toLowerCase();

        if (inputType === 'checkbox' || inputType === 'radio') {
          return String(!!el.checked);
        }

        return String(el.value || '').trim();
      }

      return String(el.innerText || el.textContent || '').trim();
    }

    init() {
      // console.log('DynamicContext: Initializing No-Code Observer', this.selectors);
      this.scan();

      // Watch for new elements appearing in the DOM
      this.globalObserver = new MutationObserver((mutations) => {
        // Just scan again if nodes are added/removed
        let shouldScan = false;
        for (const mut of mutations) {
          if (mut.type === 'childList' && (mut.addedNodes.length > 0 || mut.removedNodes.length > 0)) {
            shouldScan = true;
            break;
          }
        }
        if (shouldScan) this.scan();
      });

      this.globalObserver.observe(document.body, { childList: true, subtree: true });

      // Fallback polling for localStorage, cookies or missed DOM changes
      this.pollingTimer = setInterval(() => {
        this.scan();
      }, 2000);
    }

    scan() {
      let changed = false;

      this.selectors.forEach(({ key, selector }) => {
        if (!key || !selector) return;

        try {
          if (selector.startsWith('localStorage:')) {
            // LocalStorage Scraper
            const lsKey = selector.replace('localStorage:', '').trim();
            const val = window.localStorage.getItem(lsKey) || '';
            if (this.data[key] !== val) {
              this.data[key] = val;
              changed = true;
            }
          } else if (selector.startsWith('cookie:')) {
            // Cookie Scraper
            const cookieKey = selector.replace('cookie:', '').trim();
            const match = document.cookie.match(new RegExp('(^| )' + cookieKey + '=([^;]+)'));
            const val = match ? decodeURIComponent(match[2]) : '';
            if (this.data[key] !== val) {
              this.data[key] = val;
              changed = true;
            }
          } else {
            // DOM Scraper
            const el = document.querySelector(selector);

            // Element found for the first time or changed reference
            if (el && el !== this.elements.get(selector)) {
              this.elements.set(selector, el);
              this.observeElement(el, key, selector);

              // Extract initial value
              const val = this.readElementValue(el);
              if (this.data[key] !== val) {
                this.data[key] = val;
                changed = true;
              }
            } else if (!el && this.elements.has(selector)) {
              // Element lost
              this.elements.delete(selector);
              const obs = this.observers.get(selector);
              if (obs) {
                obs.disconnect();
                this.observers.delete(selector);
              }
              const listener = this.inputListeners.get(selector);
              if (listener) {
                listener.el.removeEventListener('input', listener.handler);
                listener.el.removeEventListener('change', listener.handler);
                this.inputListeners.delete(selector);
              }
              if (this.data[key] !== '') {
                this.data[key] = ''; // Clear lost element data
                changed = true;
              }
            } else if (el) {
              // Element exists, double check value in polling
              const val = this.readElementValue(el);
              if (this.data[key] !== val) {
                this.data[key] = val;
                changed = true;
              }
            }
          }
        } catch (e) {
          console.warn(`DynamicContext: Invalid selector or error "${selector}"`, e);
        }
      });

      if (changed) {
        this.triggerUpdate();
      }
    }

    observeElement(el, key, selector) {
      // Disconnect old observer if any
      if (this.observers.has(selector)) {
        this.observers.get(selector).disconnect();
      }
      if (this.inputListeners.has(selector)) {
        const oldListener = this.inputListeners.get(selector);
        oldListener.el.removeEventListener('input', oldListener.handler);
        oldListener.el.removeEventListener('change', oldListener.handler);
        this.inputListeners.delete(selector);
      }

      const updateValue = () => {
        const newVal = this.readElementValue(el);
        if (this.data[key] !== newVal) {
          this.data[key] = newVal;
          this.triggerUpdate();
        }
      };

      const observer = new MutationObserver(updateValue);

      observer.observe(el, { characterData: true, subtree: true, childList: true });
      this.observers.set(selector, observer);

      const tag = (el.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        el.addEventListener('input', updateValue);
        el.addEventListener('change', updateValue);
        this.inputListeners.set(selector, { el, handler: updateValue });
      }
    }

    triggerUpdate() {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        dynamicContextData = { ...dynamicContextData, ...this.data };
        sendContextUpdate();
      }, 500);
    }
  }

  // Global reference for cleanup
  let engagementController = null;

  // Function to initialize widget
  function initWidget() {
    // Check if widget already exists
    if (document.getElementById('userex-chatbot-launcher') || document.getElementById('userex-chatbot-container')) {
      return;
    }

    // Determine position styles
    const position = settings.position || 'bottom-right';
    const isLeft = position.includes('left');
    const isRight = position.includes('right');
    const isCenter = position.includes('center'); // Horizontal center
    const isTop = position.includes('top');
    const isBottom = position.includes('bottom');
    const isMiddle = position.includes('middle'); // Vertical middle

    // Adjust spacing for mobile
    const isMobile = window.innerWidth < 768;
    const isAmbientWidgetMode = settings.chatDisplayMode === 'ambient';
    const isSidecarWidgetMode = settings.chatDisplayMode === 'sidecar';
    const isSidecarDesktopOnly = settings.sidecarDesktopOnly !== false;
    const isSidecarMode = isSidecarWidgetMode && (!isMobile || !isSidecarDesktopOnly);
    const isPersistentSidecar = isSidecarMode && settings.sidecarAlwaysOpen === true;
    const isAlwaysOpenMode = (settings.interactionMode === 'always_open' && !isSidecarWidgetMode) || isAmbientWidgetMode || isSidecarMode;
    const usesLauncher = isSidecarMode ? !isPersistentSidecar : !isAlwaysOpenMode;

    let verticalSpacing = settings.bottomSpacing !== undefined ? settings.bottomSpacing : 20;
    let sideSpacing = settings.sideSpacing !== undefined ? settings.sideSpacing : 20;

    if (isMobile) {
      // Use configured mobile spacing if available, otherwise default to 20 or desktop value (fallback)
      verticalSpacing = settings.mobileBottomSpacing !== undefined ? settings.mobileBottomSpacing : 20;
      sideSpacing = settings.mobileSideSpacing !== undefined ? settings.mobileSideSpacing : 20;
    }

    const getSidecarWidth = () => {
      const requestedWidth = Number(settings.sidecarWidth || 420);
      const minWidth = Number(settings.sidecarMinWidth || 360);
      const maxWidth = Number(settings.sidecarMaxWidth || 560);
      const safeMin = Math.max(280, minWidth);
      const safeMax = Math.max(safeMin, maxWidth);
      const boundedRequested = Math.max(safeMin, Math.min(safeMax, requestedWidth));
      const viewportLimit = Math.max(safeMin, window.innerWidth - 120);
      return Math.max(safeMin, Math.min(boundedRequested, viewportLimit));
    };

    const applySidecarInset = (enabled) => {
      const htmlEl = document.documentElement;
      const bodyEl = document.body;
      if (!htmlEl || !bodyEl) return;
      
      const sidecarGutter = Number(settings.sidecarGutter || 0);
      const sidecarWidth = getSidecarWidth();
      const inset = sidecarWidth + Math.max(0, sidecarGutter);
      const styleId = 'userex-sidecar-layout-styles';

      if (enabled) {
        htmlEl.classList.add('userex-sidecar-active');
        htmlEl.style.transition = 'margin-right 240ms ease, width 240ms ease';
        htmlEl.style.marginRight = `${inset}px`;
        htmlEl.style.width = `calc(100% - ${inset}px)`;
        
        // Remove margin-right from body to avoid double shifting
        bodyEl.style.marginRight = '0px';
        bodyEl.style.overflowX = 'hidden';

        // Inject dynamic styles for fixed/sticky elements
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.innerHTML = `
            html.userex-sidecar-active header:not([id^="userex-"]),
            html.userex-sidecar-active nav:not([id^="userex-"]),
            html.userex-sidecar-active [class*="header"]:not([id^="userex-"]),
            html.userex-sidecar-active [class*="navbar"]:not([id^="userex-"]),
            html.userex-sidecar-active [style*="position: fixed"]:not([id^="userex-"]),
            html.userex-sidecar-active [style*="position: sticky"]:not([id^="userex-"]) {
               margin-right: ${inset}px !important;
               right: ${inset}px !important;
            }
          `;
          document.head.appendChild(style);
        } else {
          document.getElementById(styleId).innerHTML = `
            html.userex-sidecar-active header:not([id^="userex-"]),
            html.userex-sidecar-active nav:not([id^="userex-"]),
            html.userex-sidecar-active [class*="header"]:not([id^="userex-"]),
            html.userex-sidecar-active [class*="navbar"]:not([id^="userex-"]),
            html.userex-sidecar-active [style*="position: fixed"]:not([id^="userex-"]),
            html.userex-sidecar-active [style*="position: sticky"]:not([id^="userex-"]) {
               margin-right: ${inset}px !important;
               right: ${inset}px !important;
            }
          `;
        }
      } else {
        htmlEl.classList.remove('userex-sidecar-active');
        htmlEl.style.marginRight = '';
        htmlEl.style.width = '';
        bodyEl.style.marginRight = '';
        bodyEl.style.overflowX = '';
        const style = document.getElementById(styleId);
        if (style) style.remove();
      }
    };

    let mobileScrollLockState = null;
    const shouldLockMobileScroll = () => window.innerWidth < 768 && usesLauncher;
    const applyMobileScrollLock = (enabled) => {
      const htmlEl = document.documentElement;
      const bodyEl = document.body;
      if (!htmlEl || !bodyEl) return;

      if (!enabled) {
        if (!mobileScrollLockState) return;

        htmlEl.style.overflow = mobileScrollLockState.htmlOverflow;
        htmlEl.style.overscrollBehavior = mobileScrollLockState.htmlOverscrollBehavior;
        bodyEl.style.position = mobileScrollLockState.bodyPosition;
        bodyEl.style.top = mobileScrollLockState.bodyTop;
        bodyEl.style.left = mobileScrollLockState.bodyLeft;
        bodyEl.style.right = mobileScrollLockState.bodyRight;
        bodyEl.style.width = mobileScrollLockState.bodyWidth;
        bodyEl.style.overflow = mobileScrollLockState.bodyOverflow;
        bodyEl.style.overscrollBehavior = mobileScrollLockState.bodyOverscrollBehavior;

        const restoreScrollY = mobileScrollLockState.scrollY;
        mobileScrollLockState = null;
        window.scrollTo(0, restoreScrollY);
        return;
      }

      if (mobileScrollLockState || !shouldLockMobileScroll()) return;

      const scrollY = window.scrollY || window.pageYOffset || 0;
      mobileScrollLockState = {
        scrollY,
        htmlOverflow: htmlEl.style.overflow,
        htmlOverscrollBehavior: htmlEl.style.overscrollBehavior,
        bodyPosition: bodyEl.style.position,
        bodyTop: bodyEl.style.top,
        bodyLeft: bodyEl.style.left,
        bodyRight: bodyEl.style.right,
        bodyWidth: bodyEl.style.width,
        bodyOverflow: bodyEl.style.overflow,
        bodyOverscrollBehavior: bodyEl.style.overscrollBehavior
      };

      htmlEl.style.overflow = 'hidden';
      htmlEl.style.overscrollBehavior = 'none';
      bodyEl.style.position = 'fixed';
      bodyEl.style.top = `-${scrollY}px`;
      bodyEl.style.left = '0';
      bodyEl.style.right = '0';
      bodyEl.style.width = '100%';
      bodyEl.style.overflow = 'hidden';
      bodyEl.style.overscrollBehavior = 'none';
    };

    // Mobile Styles Injection
    const addMobileStyles = () => {
      if (document.getElementById('userex-mobile-styles')) return;
      const style = document.createElement('style');
      style.id = 'userex-mobile-styles';
      const alwaysOpenWidth = isAmbientWidgetMode ? '100vw' : 'calc(100vw - 20px)';
      const alwaysOpenInset = isAmbientWidgetMode ? '0px' : '10px';
      const alwaysOpenRadius = isAmbientWidgetMode ? '0' : '18px';
      style.innerHTML = isAlwaysOpenMode
        ? `
        @media (max-width: 768px) {
          #userex-chatbot-container {
            width: ${alwaysOpenWidth} !important;
            max-width: ${alwaysOpenWidth} !important;
            left: ${alwaysOpenInset} !important;
            right: ${alwaysOpenInset} !important;
            border-radius: ${alwaysOpenRadius} !important;
          }
          #userex-chatbot-launcher {
             max-width: calc(100vw - 40px) !important;
          }
        }
      `
        : `
        @media (max-width: 768px) {
          #userex-chatbot-container {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            border-radius: 0 !important;
            transform: none !important;
          }
          #userex-chatbot-launcher {
             max-width: calc(100vw - 40px) !important;
          }
        }
      `;
      document.head.appendChild(style);
    };
    addMobileStyles();

    // Horizontal Style
    let horizontalStyle = {};
    if (isLeft) {
      horizontalStyle = { left: `${sideSpacing}px`, right: 'auto' };
    } else if (isRight) {
      horizontalStyle = { right: `${sideSpacing}px`, left: 'auto' };
    } else if (isCenter) {
      horizontalStyle = { left: '50%', transform: 'translateX(-50%)', right: 'auto' };
    }

    // Vertical Style for Launcher
    let verticalStyle = {};
    if (isTop) {
      verticalStyle = { top: `${verticalSpacing}px`, bottom: 'auto' };
    } else if (isBottom) {
      verticalStyle = { bottom: `${verticalSpacing}px`, top: 'auto' };
    } else if (isMiddle) {
      verticalStyle = { top: '50%', transform: 'translateY(-50%)', bottom: 'auto' };
    }

    // Combined Transform for Middle Center
    if (isMiddle && isCenter) {
      verticalStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bottom: 'auto', right: 'auto' };
      horizontalStyle = {}; // Clear horizontal style as it's handled in verticalStyle
    }

    // Shadow Styles
    const shadows = {
      'none': 'none',
      'light': '0 2px 8px rgba(0,0,0,0.1)',
      'medium': '0 6px 16px rgba(0,0,0,0.2)',
      'heavy': '0 10px 24px rgba(0,0,0,0.3)'
    };
    const shadowStyle = shadows[settings.launcherShadow] || shadows['medium'];

    // Animation Styles
    const addAnimationStyles = () => {
      if (document.getElementById('userex-animation-styles')) return;
      const style = document.createElement('style');
      style.id = 'userex-animation-styles';
      style.innerHTML = `
            @keyframes userex-pulse {
                0% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(0, 0, 0, 0); }
                100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
            }
            @keyframes userex-bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }
            @keyframes userex-wiggle {
                0%, 100% { transform: rotate(-3deg); }
                50% { transform: rotate(3deg); }
            }
            @keyframes userex-float {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
                100% { transform: translateY(0px); }
            }
            @keyframes userex-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .userex-anim-pulse {
                animation: userex-pulse 2s infinite;
            }
            .userex-anim-bounce {
                animation: userex-bounce 2s infinite;
            }
            .userex-anim-wiggle {
                animation: userex-wiggle 1s ease-in-out infinite;
            }
            .userex-anim-float {
                animation: userex-float 3s ease-in-out infinite;
            }
            .userex-anim-spin {
                animation: userex-spin 4s linear infinite;
            }

            /* --- New animations --- */

            /* Shake: quick left-right vibrate with pause */
            @keyframes userex-shake {
                0%, 70%, 100% { transform: translateX(0); }
                72%, 76%, 80%, 84% { transform: translateX(-5px); }
                74%, 78%, 82% { transform: translateX(5px); }
            }
            .userex-anim-shake {
                animation: userex-shake 3s ease-in-out infinite;
            }

            /* Glow: pulsing color halo */
            @keyframes userex-glow {
                0%, 100% { box-shadow: 0 0 6px 2px rgba(255,255,255,0.25), 0 4px 16px rgba(0,0,0,0.3); }
                50% { box-shadow: 0 0 22px 8px rgba(255,255,255,0.55), 0 4px 16px rgba(0,0,0,0.3); }
            }
            .userex-anim-glow {
                animation: userex-glow 2s ease-in-out infinite;
            }

            /* Border: rotating arc around button */
            @keyframes userex-border-rotate {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
            }
            #userex-chatbot-launcher.userex-anim-border {
                overflow: visible;
                z-index: 0;
            }
            #userex-chatbot-launcher.userex-anim-border::before {
                content: '';
                position: absolute;
                inset: -3px;
                border-radius: inherit;
                background: conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.9) 20%, transparent 40%);
                animation: userex-border-rotate 1.8s linear infinite;
                z-index: -1;
            }
            #userex-chatbot-launcher.userex-anim-border::after {
                content: '';
                position: absolute;
                inset: 2px;
                border-radius: inherit;
                background: inherit;
                z-index: -1;
            }
        `;
      document.head.appendChild(style);
    };

    if (usesLauncher && (
      (settings.launcherAnimation && settings.launcherAnimation !== 'none') ||
      (settings.mobileLauncherAnimation && settings.mobileLauncherAnimation !== 'none')
    )) {
      addAnimationStyles();
    }

    // Create Launcher Button
    const launcher = document.createElement('div');
    launcher.id = 'userex-chatbot-launcher';

    // Voice is only available inside the chatbot (via ChatInput mic button)

    // Main Launcher Styles
    const isTextMode = settings.launcherStyle === 'text' || settings.launcherStyle === 'icon_text';

    // Launcher Container (Wrapper) to separate positioning from animation transforms
    const launcherContainer = document.createElement('div');
    launcherContainer.id = 'userex-launcher-wrapper';
    Object.assign(launcherContainer.style, {
      position: 'fixed',
      zIndex: '9999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none', // Pass clicks through
      ...horizontalStyle,
      ...verticalStyle
    });

    Object.assign(launcher.style, {
      position: 'relative',
      width: isTextMode ? 'auto' : `${settings.launcherWidth}px`,
      minWidth: isTextMode ? `${settings.launcherWidth}px` : undefined,
      maxWidth: isTextMode ? '600px' : undefined,
      height: `${settings.launcherHeight}px`,
      padding: isTextMode ? '0 16px' : '0',
      borderRadius: `${settings.launcherRadius}px`,
      backgroundColor: settings.launcherBackgroundColor || settings.brandColor,
      boxShadow: shadowStyle,
      boxSizing: 'border-box',
      cursor: 'pointer',
      pointerEvents: 'auto', // Catch clicks
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    });

    const isTextStyle = settings.launcherStyle === 'text' || settings.launcherStyle === 'icon_text';

    // Icon rendering
    let iconHtml = '';
    if (settings.launcherIcon === 'custom' && settings.launcherIconUrl) {
      // Custom uploaded icon
      iconHtml = `<img src="${settings.launcherIconUrl}" style="width: 24px; height: 24px; object-fit: contain;" alt="Icon" />`;
    } else if (settings.launcherIcon === 'library' && settings.launcherLibraryIcon) {
      // Fetch icon SVG from lucide (we'll use a simple mapping or fetch for now, or just embed a few common ones.
      // For a full library in vanilla JS without a bundler, we might need a CDN or a large mapping.
      // To keep it simple and robust, we will use a CDN for Lucide icons if 'library' is selected.
      // We strip '-icon' suffix and 'Lucide' prefix to ensure correct icon name generation.
      // e.g. 'LucideMessageCircle' -> 'MessageCircle' -> 'message-circle'
      // e.g. 'ActivityIcon' -> 'Activity' -> 'activity'
      // Static SVGs for common icons to ensure instant rendering without CDN dependency
      const staticIcons = {
        'MessageSquare': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        'Bot': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
        'Sparkles': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
        'Brain': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/></svg>',
        'Headset': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/></svg>',
        'MessageCircle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
        'Zap': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
      };

      if (staticIcons[settings.launcherLibraryIcon]) {
        // Use static SVG
        // Wrap in a span to apply color and dimensions
        iconHtml = `<span style="display:flex; width: 24px; height: 24px; color: ${settings.launcherIconColor || '#FFFFFF'};">${staticIcons[settings.launcherLibraryIcon]}</span>`;
      } else {
        // Fallback to Lucide CDN for other icons
        const iconName = settings.launcherLibraryIcon
          .replace(/^Lucide/, '')
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase()
          .replace(/-icon$/, '');
        iconHtml = `<i data-lucide="${iconName}" style="width: 24px; height: 24px; color: ${settings.launcherIconColor || '#FFFFFF'};"></i>`;

        // Inject Lucide Script if not already present
        if (!document.getElementById('userex-lucide-script')) {
          const script = document.createElement('script');
          script.id = 'userex-lucide-script';
          script.src = 'https://unpkg.com/lucide@latest';
          script.onload = () => {
            if (window.lucide) {
              window.lucide.createIcons();
            }
          };
          document.head.appendChild(script);
        } else if (window.lucide) {
          setTimeout(() => window.lucide.createIcons(), 100);
        }
      }
    } else {
      // Default Message Icon
      iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 0 0 1-2 2H7l-4 4V5a2 0 0 1 2-2h14a2 0 0 1 2 2z"/></svg>`;
    }

    // Determine background color - transparent for full image mode
    const launcherBgColor = settings.launcherType === 'fullImage'
      ? 'transparent'
      : (settings.launcherBackgroundColor || settings.brandColor || settings.primaryColor);

    // Determine dimensions based on type using independent settings
    const currentWidth = settings.launcherType === 'fullImage' ? (settings.fullImageLauncherWidth || 60) : settings.launcherWidth;
    const currentHeight = settings.launcherType === 'fullImage' ? (settings.fullImageLauncherHeight || 60) : settings.launcherHeight;

    Object.assign(launcher.style, {
      position: 'relative',
      width: isTextStyle ? 'auto' : `${currentWidth}px`,
      height: `${currentHeight}px`,
      minWidth: `${currentWidth}px`,
      borderRadius: settings.launcherType === 'fullImage' ? '0' : `${settings.launcherRadius}px`,
      backgroundColor: launcherBgColor,
      boxShadow: settings.launcherType === 'fullImage' ? 'none' : shadowStyle,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: '600',
      padding: isTextStyle ? '0 16px' : '0',
      gap: '8px',
      pointerEvents: 'auto'
    });

    const activeAnimation = isMobile ? (settings.mobileLauncherAnimation || 'none') : (settings.launcherAnimation || 'none');

    if (activeAnimation === 'pulse') {
      launcher.classList.add('userex-anim-pulse');
    } else if (activeAnimation === 'bounce') {
      launcher.classList.add('userex-anim-bounce');
    } else if (activeAnimation === 'wiggle') {
      launcher.classList.add('userex-anim-wiggle');
    } else if (activeAnimation === 'float') {
      launcher.classList.add('userex-anim-float');
    } else if (activeAnimation === 'spin') {
      launcher.classList.add('userex-anim-spin');
    } else if (activeAnimation === 'shake') {
      addAnimationStyles();
      launcher.classList.add('userex-anim-shake');
    } else if (activeAnimation === 'glow') {
      addAnimationStyles();
      launcher.classList.add('userex-anim-glow');
    } else if (activeAnimation === 'border') {
      addAnimationStyles();
      launcher.classList.add('userex-anim-border');
    }

    const closeSvg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    const isAutoCollapseEnabled = settings.launcherStyle === 'icon_text' && settings.launcherCollapse;
    let collapseTimer = null;
    let isLauncherCollapsed = false;

    const clearCollapseTimer = () => {
      if (collapseTimer) {
        clearTimeout(collapseTimer);
        collapseTimer = null;
      }
    };

    const collapseLauncher = (force = false) => {
      if (!isAutoCollapseEnabled) return;
      if (isLauncherCollapsed && !force) return;
      isLauncherCollapsed = true;

      launcher.style.width = `${settings.launcherHeight}px`;
      launcher.style.padding = '0';
      launcher.style.minWidth = `${settings.launcherHeight}px`;
      launcher.style.gap = '0';

      const span = launcher.querySelector('.userex-launcher-text');
      if (span) {
        span.style.opacity = '0';
        span.style.maxWidth = '0';
        span.style.margin = '0';
        span.style.whiteSpace = 'nowrap';
        span.style.overflow = 'hidden';
        span.style.display = 'none';
        span.style.pointerEvents = 'none';
      }
    };

    const expandLauncher = (force = false) => {
      if (!isAutoCollapseEnabled) return;
      if (!isLauncherCollapsed && !force) return;
      isLauncherCollapsed = false;

      launcher.style.width = 'auto';
      launcher.style.padding = '0 16px';
      launcher.style.minWidth = `${settings.launcherWidth || 100}px`;
      launcher.style.gap = '8px';

      const span = launcher.querySelector('.userex-launcher-text');
      if (span) {
        span.style.display = 'inline-block';
        span.style.opacity = '1';
        span.style.maxWidth = '300px';
        span.style.margin = '';
        span.style.pointerEvents = 'auto';
      }
    };

    const scheduleCollapse = (delayMs = 3000) => {
      if (!isAutoCollapseEnabled) return;
      clearCollapseTimer();
      collapseTimer = setTimeout(() => collapseLauncher(), delayMs);
    };

    const applyOpenLauncherPosition = () => {
      const isMobileFullscreenOverlay = window.innerWidth < 768 && !isAlwaysOpenMode;
      const shouldHideOpenLauncher = isMobileFullscreenOverlay || isSidecarMode;

      if (shouldHideOpenLauncher) {
        // Fullscreen mobile and sidecar both have internal close controls.
        // Hide the external launcher close button to avoid duplication.
        Object.assign(launcherContainer.style, {
          display: 'none',
        });
        return;
      }

      // Keep the close button anchored where the launcher normally lives.
      // Only raise its stacking context so it stays clickable above the iframe.
      Object.assign(launcherContainer.style, {
        display: 'flex',
        position: 'fixed',
        zIndex: '10001',
        right: '',
        left: '',
        top: '',
        bottom: '',
        transform: '',
      });
      Object.assign(launcherContainer.style, horizontalStyle);
      Object.assign(launcherContainer.style, verticalStyle);
    };

    const renderLauncherContent = (isOpen) => {
      if (isOpen) {
        launcher.innerHTML = closeSvg;

        // Compact to icon-only for all launcher types when widget is open
        const iconSize = settings.launcherHeight || 52;
        launcher.style.width = `${iconSize}px`;
        launcher.style.minWidth = `${iconSize}px`;
        launcher.style.height = `${iconSize}px`;
        launcher.style.padding = '0';
        launcher.style.gap = '0';
        launcher.style.borderRadius = '50%';
        launcher.style.backgroundColor = settings.launcherBackgroundColor || settings.brandColor || settings.primaryColor || '#000000';
        launcher.style.boxShadow = shadowStyle;

        applyOpenLauncherPosition();

        // Pause animation while widget is open
        launcher.classList.remove('userex-anim-pulse', 'userex-anim-bounce', 'userex-anim-wiggle', 'userex-anim-float', 'userex-anim-spin', 'userex-anim-shake', 'userex-anim-glow', 'userex-anim-border');
        return;
      }

      // Restore position, z-index and visibility when widget is closed
      Object.assign(launcherContainer.style, {
        display: 'flex',
        position: 'fixed',
        zIndex: '9999',
        right: '',
        left: '',
        top: '',
        bottom: '',
        transform: '',
      });
      // Now apply original horizontal + vertical styles (may override the blanks above)
      Object.assign(launcherContainer.style, horizontalStyle);
      Object.assign(launcherContainer.style, verticalStyle);

      // Restore dimensions when closed
      if (settings.launcherType === 'fullImage') {
        launcher.style.backgroundColor = 'transparent';
        launcher.style.boxShadow = 'none';
        launcher.style.borderRadius = '0';
        launcher.style.width = `${settings.fullImageLauncherWidth || 60}px`;
        launcher.style.height = `${settings.fullImageLauncherHeight || 60}px`;
        launcher.style.minWidth = '';
        launcher.style.padding = '';
        launcher.style.gap = '';
      } else if (isTextStyle) {
        launcher.style.width = 'auto';
        launcher.style.minWidth = `${settings.launcherWidth || 100}px`;
        launcher.style.height = `${settings.launcherHeight || 52}px`;
        launcher.style.padding = '0 16px';
        launcher.style.gap = '8px';
        launcher.style.borderRadius = `${settings.launcherRadius}px`;
        launcher.style.backgroundColor = settings.launcherBackgroundColor || settings.brandColor;
        launcher.style.boxShadow = shadowStyle;
      } else {
        launcher.style.width = `${currentWidth}px`;
        launcher.style.minWidth = `${currentWidth}px`;
        launcher.style.height = `${currentHeight}px`;
        launcher.style.padding = '0';
        launcher.style.gap = '0';
        launcher.style.borderRadius = `${settings.launcherRadius}px`;
        launcher.style.backgroundColor = settings.launcherBackgroundColor || settings.brandColor;
        launcher.style.boxShadow = shadowStyle;
      }

      // Resume animation when widget is closed
      if (activeAnimation && activeAnimation !== 'none') {
        launcher.classList.add(`userex-anim-${activeAnimation}`);
      }

      // Full Image Mode (PNG/GIF or Lottie)
      if (settings.launcherType === 'fullImage') {
        if (settings.launcherImageMode === 'lottie' && settings.launcherLottieUrl && settings.launcherLottieUrl.trim()) {
          // Lottie Animation
          launcher.innerHTML = `<div id="userex-lottie-container" style="width:100%;height:100%;overflow:hidden;"></div>`;

          // Add style to make Lottie SVG fill container
          const lottieStyle = document.createElement('style');
          lottieStyle.id = 'userex-lottie-style';
          lottieStyle.textContent = `
            #userex-lottie-container svg {
              width: 100% !important;
              height: 100% !important;
            }
          `;
          if (!document.getElementById('userex-lottie-style')) {
            document.head.appendChild(lottieStyle);
          }

          // Load lottie-web if not loaded
          if (!window.lottie) {
            const lottieScript = document.createElement('script');
            lottieScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
            lottieScript.onload = () => {
              window.lottie.loadAnimation({
                container: document.getElementById('userex-lottie-container'),
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: settings.launcherLottieUrl.trim(),
                rendererSettings: {
                  preserveAspectRatio: 'xMidYMid slice'
                }
              });
            };
            document.head.appendChild(lottieScript);
          } else {
            window.lottie.loadAnimation({
              container: document.getElementById('userex-lottie-container'),
              renderer: 'svg',
              loop: true,
              autoplay: true,
              path: settings.launcherLottieUrl.trim(),
              rendererSettings: {
                preserveAspectRatio: 'xMidYMid slice'
              }
            });
          }
        } else if (settings.launcherFullImageUrl) {
          // Static Image (PNG/GIF)
          launcher.innerHTML = `<img src="${settings.launcherFullImageUrl}" alt="Chat" style="width:100%;height:100%;object-fit:contain;" />`;
        } else {
          // Fallback to icon
          launcher.innerHTML = iconHtml;
        }
        return;
      }

      // Standard Mode
      if (settings.launcherStyle === 'text') {
        launcher.innerHTML = `<span class="userex-launcher-text">${settings.launcherText}</span>`;
      } else if (settings.launcherStyle === 'icon_text') {
        launcher.innerHTML = `${iconHtml}<span class="userex-launcher-text">${settings.launcherText}</span>`;
      } else {
        // Circle or Square (Icon only)
        launcher.innerHTML = iconHtml;
      }

      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Re-apply visual collapse/expand state after any re-render.
      if (isAutoCollapseEnabled) {
        if (isLauncherCollapsed) {
          collapseLauncher(true);
        } else {
          expandLauncher(true);
        }
      }
    };

    // Store dynamic context data - MOVED TO GLOBAL SCOPE
    // let dynamicContextData = {};

    if (usesLauncher) {
      renderLauncherContent(false);

      // Hover effect
      launcher.onmouseenter = () => {
        // Handle hover effect based on launcherHoverEffect setting
        if (settings.launcherHoverEffect === 'none') return;

        // Force scale effect regardless of legacy 'opacity' setting
        // Simplified: Container handles position, so just scale relative
        launcher.style.transform = 'scale(1.05)';
      };
      launcher.onmouseleave = () => {
        launcher.style.opacity = '1';
        // Use empty string to remove inline style and allow CSS animations to resume
        launcher.style.transform = '';
      };

      // Auto Collapse Logic for Icon + Text
      if (isAutoCollapseEnabled) {
        // Initial collapse after a short idle window.
        scheduleCollapse(5000);

        const originalEnter = launcher.onmouseenter;
        launcher.onmouseenter = (e) => {
          if (originalEnter) originalEnter(e);
          if (!isOpen) {
            clearCollapseTimer();
            expandLauncher();
          }
        };

        const originalLeave = launcher.onmouseleave;
        launcher.onmouseleave = (e) => {
          if (originalLeave) originalLeave(e);
          if (!isOpen) {
            scheduleCollapse(3000);
          }
        };
      }
    }

    // Create Iframe Container
    const iframeContainer = document.createElement('div');
    iframeContainer.id = 'userex-chatbot-container';

    // Base styles
    Object.assign(iframeContainer.style, {
      position: 'fixed',
      boxShadow: '0 12px 40px rgba(0,0,0,0.16), 0 2px 10px rgba(0,0,0,0.06)',
      borderRadius: '24px',
      overflow: 'hidden',
      zIndex: '9999',
      display: usesLauncher ? 'none' : 'block',
      backgroundColor: 'transparent',
      color: 'rgba(250, 250, 250, 0)',
      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
    });
    let applyAmbientContainerSize = null;
    let ambientFeedVisible = false;

    // Apply View Mode Styles
    const isAmbientMode = isAmbientWidgetMode;

    if (isSidecarMode) {
      const sidecarWidth = getSidecarWidth();
      Object.assign(iframeContainer.style, {
        top: '0',
        right: '0',
        left: 'auto',
        bottom: '0',
        width: `${sidecarWidth}px`,
        minWidth: `${Math.max(280, Number(settings.sidecarMinWidth || 360))}px`,
        maxWidth: `${Math.max(Number(settings.sidecarMaxWidth || 560), Number(settings.sidecarMinWidth || 360))}px`,
        height: '100vh',
        maxHeight: '100vh',
        borderRadius: '0',
        boxShadow: '0 0 0 1px rgba(15,23,42,0.04), -2px 0 12px rgba(15,23,42,0.08)',
        transform: 'none'
      });
      applySidecarInset(true);
    } else if (isAmbientMode) {
      const ambientRailHeight = Math.max(220, Math.min(900, Number(settings.ambientMaxHeight || 260)));
      const ambientExpandedHeight = Math.max(360, Math.min(1100, ambientRailHeight + 220));
      // Keep collapsed dock compact so we do not leave an oversized invisible surface.
      const ambientInputOnlyHeight = isMobileDevice() ? 112 : 96;

      const bottomMargin = settings.ambientBottomMargin || 0;

      // Bottom margin applied INSIDE the iframe as padding, not as container position
      // This ensures the overlay can cover the full bottom edge
      const ambientPositionStyle = isTop
        ? { top: '0px', bottom: 'auto' }
        : { bottom: '0px', top: 'auto' };

      const ambientHorizontalStyle = { left: '0', right: '0', transform: 'none' };


      let ambientShrinkTimeout = null;

      iframeContainer.dataset.userexAmbientFeedVisible = '0';

      applyAmbientContainerSize = (hasFeed) => {
        if (ambientShrinkTimeout) clearTimeout(ambientShrinkTimeout);
        // Update logical visibility immediately so proactive bubble guards
        // reflect the current state (not delayed by close animation timing).
        iframeContainer.dataset.userexAmbientFeedVisible = hasFeed ? '1' : '0';

        const applySizes = (isExpanding) => {
          const mobileViewportHeight = Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
          const nextHeight = isExpanding
            ? (isMobileDevice() ? mobileViewportHeight : (ambientExpandedHeight + bottomMargin))
            : (ambientInputOnlyHeight + bottomMargin);
          const nextMaxHeight = isExpanding
            ? (isMobileDevice() ? '100vh' : '86vh')
            : `${ambientInputOnlyHeight + bottomMargin}px`;

          Object.assign(iframeContainer.style, {
            width: '100vw',
            maxWidth: '100vw',
            height: `${nextHeight}px`,
            maxHeight: nextMaxHeight,
            borderRadius: '0',
            overflow: 'hidden',
            background: 'transparent',
            backgroundColor: 'transparent',
            boxShadow: 'none',
            border: 'none',
            transition: isExpanding ? 'height 0.28s cubic-bezier(0.22, 1, 0.36, 1), left 0.28s, right 0.28s' : 'none',
            ...ambientHorizontalStyle,
            ...ambientPositionStyle
          });
        };

        if (hasFeed) {
          applySizes(true);
        } else {
          // Wait 300ms for React elements to gracefully fade out before snapping the iframe shut
          ambientShrinkTimeout = setTimeout(() => applySizes(false), 300);
        }
      };

      applyAmbientContainerSize(false);
    } else if (settings.viewMode === 'wide') {
      if (settings.modalSize === 'full') {
        // Full Screen Modal Styles
        Object.assign(iframeContainer.style, {
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          borderRadius: '0',
          bottom: 'auto',
          right: 'auto'
        });
      } else {
        // Half/Wide Modal Styles (Default)
        Object.assign(iframeContainer.style, {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '1000px', // Increased
          maxWidth: '95%',
          height: '700px', // Increased
          maxHeight: '90vh',
          bottom: 'auto',
          right: 'auto'
        });
      }
    } else {
      // Classic Styles
      let classicVerticalStyle = {};

      const effectiveHeight = usesLauncher
        ? (settings.launcherType === 'fullImage' ? 60 : settings.launcherHeight)
        : 0;
      // Offset applied so the chatbot opens above the launcher
      const launcherOffset = usesLauncher ? effectiveHeight + 16 : 0;

      if (isTop) {
        classicVerticalStyle = { top: `${verticalSpacing + launcherOffset}px`, bottom: 'auto' };
      } else if (isBottom) {
        classicVerticalStyle = { bottom: `${verticalSpacing + launcherOffset}px`, top: 'auto' };
      } else if (isMiddle) {
        // For middle, we place it next to the launcher
        classicVerticalStyle = { top: '50%', transform: 'translateY(-50%)' };
        // Adjust horizontal to be next to launcher
        if (isLeft) {
          Object.assign(horizontalStyle, { left: `${sideSpacing + (usesLauncher ? settings.launcherWidth + 10 : 0)}px`, right: 'auto' });
        } else if (isRight) {
          Object.assign(horizontalStyle, { right: `${sideSpacing + (usesLauncher ? settings.launcherWidth + 10 : 0)}px`, left: 'auto' });
        } else if (isCenter) {
          // Middle Center
          classicVerticalStyle = { top: '50%', transform: 'translate(-50%, -50%)', bottom: 'auto' };
          horizontalStyle = { left: '50%', transform: 'translate(-50%, -50%)', right: 'auto' };
        }
      }

      Object.assign(iframeContainer.style, {
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        height: '700px',
        maxHeight: '85vh',
        ...horizontalStyle,
        ...classicVerticalStyle
      });
      applySidecarInset(false);
    }

    // Check Availability
    const isAvailable = checkAvailability();

    // Create Iframe
    const iframe = document.createElement('iframe');
    let iframeSrc = `${baseUrl}/chatbot-view?id=${chatbotId}`;

    // Append initial Context
    const context = getPageContext();
    const contextParams = new URLSearchParams({
      url: context.url,
      title: context.title,
      desc: context.description ? context.description.substring(0, 200) : ''
    }).toString();
    iframeSrc += `&${contextParams}`;

    // Add initial language if configured (not 'auto')
    if (settings.initialLanguage && settings.initialLanguage !== 'auto') {
      iframeSrc += `&lang=${settings.initialLanguage}`;
    }

    // Only inherit the parent theme when ambient mode explicitly uses auto.
    if (settings.chatDisplayMode === 'ambient' && settings.ambientTheme === 'auto') {
      const isDarkMode = document.documentElement.classList.contains('dark') || 
                         document.body.classList.contains('dark') || 
                         (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      iframeSrc += `&theme=${isDarkMode ? 'dark' : 'light'}`;
    }

    if (!isAvailable && settings.offlineMessage) {
      iframeSrc += `&offlineMessage=${encodeURIComponent(settings.offlineMessage)}`;
    }
    // Add loader style
    if (settings.widgetLoaderStyle) {
      iframeSrc += `&loaderStyle=${encodeURIComponent(settings.widgetLoaderStyle)}`;
    }

    // Pass ambientBottomMargin to iframe content for internal padding
    if (isAmbientMode && settings.ambientBottomMargin > 0) {
      iframeSrc += `&ambientBottomMargin=${settings.ambientBottomMargin}`;
    }
    if (previewDraftKey) {
      iframeSrc += `&previewDraftKey=${encodeURIComponent(previewDraftKey)}`;
    }
    if (previewAmbientDockState) {
      iframeSrc += `&previewAmbientDockState=${encodeURIComponent(previewAmbientDockState)}`;
    }
    if (previewAmbientThinking) {
      iframeSrc += `&previewAmbientThinking=1`;
    }

    iframe.src = iframeSrc;
    iframe.loading = 'eager';
    iframe.setAttribute('fetchpriority', 'high');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.background = 'transparent';
    iframe.setAttribute('allowTransparency', 'true');
    iframe.allow = 'microphone; camera; autoplay';
    iframe.addEventListener('load', () => {
      setTimeout(() => {
        try {
          sendContextUpdate();
        } catch (e) { }
      }, 80);
    });

    iframeContainer.appendChild(iframe);

    // Toggle Logic
    let isOpen = isSidecarMode ? true : !usesLauncher;
    if (usesLauncher) {
      const persistedPreviewOpenState = readPreviewOpenState();
      if (typeof persistedPreviewOpenState === 'boolean') {
        isOpen = persistedPreviewOpenState;
      }
    }
    const toggleWidget = (forceState) => {
      if (!usesLauncher) {
        const nextState = forceState !== undefined ? forceState : true;
        isOpen = !!nextState;
        iframeContainer.style.display = isOpen ? 'block' : 'none';
        if (isSidecarMode) {
          applySidecarInset(isOpen);
        }
        return;
      }

      isOpen = forceState !== undefined ? forceState : !isOpen;

      // GA Tracking
      if (isOpen && typeof window.gtag === 'function') {
        window.gtag('event', 'chat_widget_open', {
          'event_category': 'Chatbot',
          'event_label': chatbotId
        });
      }

      iframeContainer.style.display = isOpen ? 'block' : 'none';
      if (isSidecarMode) {
        applySidecarInset(isOpen);
      }
      applyMobileScrollLock(isOpen);
      writePreviewOpenState(isOpen);

      if (!isAmbientWidgetMode) {
        launcherContainer.style.display = 'flex';
      }

      // Notify React app that visibility changed so it can instantly scroll to bottom
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'USEREX_WIDGET_TOGGLED', isOpen }, '*');
      }

      // If opening, hide any engagement bubble
      if (isOpen && engagementController) {
        engagementController.hideBubble();
      }

      // Update icon based on state
      renderLauncherContent(isOpen);

      // Keep collapse state consistent across open/close re-renders.
      if (isAutoCollapseEnabled) {
        if (isOpen) {
          clearCollapseTimer();
        } else if (isLauncherCollapsed) {
          collapseLauncher(true);
        } else {
          expandLauncher(true);
          scheduleCollapse(3000);
        }
      }
    };

    if (usesLauncher) {
      launcher.onclick = () => toggleWidget();
      iframeContainer.style.display = isOpen ? 'block' : 'none';
      if (isSidecarMode) {
        applySidecarInset(isOpen);
      }
      renderLauncherContent(isOpen);
      applyMobileScrollLock(isOpen);
    }

    // Sorun 2: Ambient modda X butonuna basınca widget tamamen kapanıyor ve geri açılamıyordu.
    // Çözüm: Ambient modda "kapat" yerine sadece feed'i gizle ve input-only moduna al.
    // Kullanıcı tekrar yazınca feed yeniden açılıyor — launcher olmadığından tam kapama yok.
    const hideAmbientFeed = () => {
      ambientFeedVisible = false;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'USEREX_FORCE_AMBIENT_FEED_CLOSE' }, '*');
      }
      if (applyAmbientContainerSize) {
        applyAmbientContainerSize(false); // Sadece boyutu küçült, container'ı gizleme
      }
    };

    // Ambient mode: clicking outside the widget area on the host page should collapse the feed.
    // We only react when the expanded ambient feed is visible.
    const handleAmbientOutsidePointerDown = (event) => {
      if (!isAmbientWidgetMode || !ambientFeedVisible) return;

      const target = event.target;
      if (!(target instanceof Node)) return;

      // Ignore clicks inside the widget iframe/container itself.
      if (iframeContainer.contains(target)) return;

      // Ignore clicks on proactive bubbles (they manage their own open/focus behavior).
      const engagementBubble = document.getElementById('userex-engagement-bubble');
      if (engagementBubble && engagementBubble.contains(target)) return;

      hideAmbientFeed();
    };
    document.addEventListener('pointerdown', handleAmbientOutsidePointerDown, true);

    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
      if (event.data.type === 'USEREX_CLOSE_WIDGET') {
        if (isAmbientWidgetMode) {
          // Ambient modda: tam kapatma yok, sadece feed'i gizle (input kalır)
          hideAmbientFeed();
        } else if (isSidecarMode && !isPersistentSidecar) {
          toggleWidget(false);
        } else if (!isSidecarMode) {
          toggleWidget(false);
        }
      }
      if (event.data.type === 'USEREX_AMBIENT_FEED_VISIBILITY' && applyAmbientContainerSize) {
        ambientFeedVisible = !!event.data.hasFeed;
        if (ambientFeedVisible && engagementController) {
          engagementController.hideBubble();
        }
        applyAmbientContainerSize(ambientFeedVisible);
      }
      if (event.data.type === 'USEREX_SITE_CRAWL_START') {
        startSiteContextCrawl(event.data.options || {}).then((result) => {
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: result && result.success ? 'USEREX_SITE_CRAWL_COMPLETE' : 'USEREX_SITE_CRAWL_ERROR',
              payload: result || null
            }, '*');
          }
        }).catch((err) => {
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'USEREX_SITE_CRAWL_ERROR',
              payload: { error: { message: err && err.message ? err.message : 'Failed to start crawl' } }
            }, '*');
          }
        });
      }
      if (event.data.type === 'USEREX_SITE_CRAWL_CANCEL') {
        if (window.UserexWidget && typeof window.UserexWidget.cancelSiteContextCrawl === 'function') {
          window.UserexWidget.cancelSiteContextCrawl();
        }
      }
      if (event.data.type === 'USEREX_TOGGLE_SIZE') {
        if (settings.viewMode === 'wide') {
          const isExpanded = event.data.isExpanded;
          if (isExpanded) {
            // Full Screen
            Object.assign(iframeContainer.style, {
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
              borderRadius: '0',
              transform: 'none'
            });
          } else {
            // Revert to Half/Wide
            Object.assign(iframeContainer.style, {
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '1000px', // Increased from 800px
              maxWidth: '95%', // Increased from 90%
              height: '700px', // Increased from 600px
              maxHeight: '90vh', // Increased from 80vh
              borderRadius: '24px'
            });
          }
        }
      }
    });

    // Append to body (Container wraps launcher)
    if (usesLauncher) {
      document.body.appendChild(launcherContainer);
      launcherContainer.appendChild(launcher);
    }
    document.body.appendChild(iframeContainer);

    // Expose public API for programmatic control
    const postActivateInput = () => {
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'USEREX_ACTIVATE_INPUT' }, '*');
      }
    };

    window.UserexWidget = window.UserexWidget || {};
    window.UserexWidget.open = function () { toggleWidget(true); };
    window.UserexWidget.close = function () {
      if (usesLauncher) toggleWidget(false);
    };
    window.UserexWidget.destroy = function () {
      try {
        removeBootstrappedWidgetShell();
      } catch (error) {
        console.warn('Userex Widget: Failed to remove widget shell during destroy', error);
      }

      try {
        if (window.userexEngagement && typeof window.userexEngagement.destroy === 'function') {
          window.userexEngagement.destroy();
        }
      } catch (error) {
        console.warn('Userex Widget: Failed to destroy engagement controller', error);
      }

      delete window.userexEngagement;
      delete window.__VION_WIDGET_INITIALIZED__;
    };
    window.UserexWidget.toggle = function () {
      if (usesLauncher) toggleWidget();
      else toggleWidget(true);
    };
    window.UserexWidget.focusInput = function () {
      postActivateInput();
    };
    window.UserexWidget.openAndFocus = function () {
      toggleWidget(true);
      postActivateInput();
      setTimeout(postActivateInput, 80);
      setTimeout(postActivateInput, 220);
    };
    window.UserexWidget.startSiteContextCrawl = function (options) {
      return startSiteContextCrawl(options || {});
    };
    window.UserexWidget.getSiteSessionContext = function () {
      return getSiteSessionContextForAI();
    };
    window.UserexWidget.cancelSiteContextCrawl = function () {
      if (activeSiteCrawlJob && activeSiteCrawlJob.running) {
        try {
          if (activeSiteCrawlJob.routeTimer) clearTimeout(activeSiteCrawlJob.routeTimer);
          if (activeSiteCrawlJob.overallTimer) clearTimeout(activeSiteCrawlJob.overallTimer);
          if (siteSessionContext && siteSessionContext.crawl) {
            siteSessionContext.crawl.status = 'failed';
            siteSessionContext.crawl.errors = siteSessionContext.crawl.errors || [];
            siteSessionContext.crawl.errors.push({ route: '', code: 'unreachable', message: 'Crawl cancelled manually' });
            scheduleSiteContextUpdate();
          }
          if (typeof activeSiteCrawlJob.cleanup === 'function') {
            activeSiteCrawlJob.cleanup({
              success: false,
              status: 'failed',
              reason: 'cancelled',
              siteSessionContext: getSiteSessionContextForAI()
            });
          } else {
            activeSiteCrawlJob.running = false;
          }
          activeSiteCrawlJob = null;
          emitSiteCrawlMessageToOpener('USEREX_SITE_CRAWL_ERROR', {
            error: { code: 'unreachable', message: 'Crawl cancelled manually' }
          });
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    };

    // Initial Trigger Check
    setTimeout(() => {
      if (engagementController) {
        engagementController.init();
      }
    }, 1000);

    // Dynamic Resize Handler
    window.addEventListener('resize', () => {
      const isNowMobile = window.innerWidth < 768;

      // 1. Update Spacing
      const resizeSettings = applyDeviceResolvedWidgetSettings(baseDeviceAwareSettings || settings, isNowMobile ? 'mobile' : 'desktop');
      const newBottom = resizeSettings.bottomSpacing ?? 20;
      const newSide = resizeSettings.sideSpacing ?? 20;

      let newVertStyle = {};
      if (isTop) {
        newVertStyle = { top: `${newBottom}px`, bottom: 'auto' };
      } else if (isBottom) {
        newVertStyle = { bottom: `${newBottom}px`, top: 'auto' };
      } else if (isMiddle) {
        newVertStyle = { top: '50%', transform: `translateY(calc(-50% - ${(resizeSettings.launcherHeight || settings.launcherHeight) / 2}px))`, bottom: 'auto' };
      }

      let newHorizStyle = {};
      if (isLeft) {
        newHorizStyle = { left: `${newSide}px`, right: 'auto' };
      } else if (isRight) {
        newHorizStyle = { right: `${newSide}px`, left: 'auto' };
      } else if (isCenter) {
        newHorizStyle = { left: '50%', transform: 'translateX(-50%)', right: 'auto' };
      }

      if (usesLauncher) {
        horizontalStyle = newHorizStyle;
        verticalStyle = newVertStyle;

        // Apply new positioning
        if (isOpen) {
          applyOpenLauncherPosition();
        } else {
          Object.assign(launcherContainer.style, { ...newHorizStyle, ...newVertStyle });
        }

        // 2. Update Animation
        const newAnim = resizeSettings.launcherAnimation || 'none';
        launcher.classList.remove('userex-anim-pulse', 'userex-anim-bounce', 'userex-anim-wiggle', 'userex-anim-float', 'userex-anim-spin', 'userex-anim-shake', 'userex-anim-glow', 'userex-anim-border');

        if (newAnim !== 'none') {
          addAnimationStyles();
          launcher.classList.add(`userex-anim-${newAnim}`);
        }
      }

      if (isSidecarMode) {
        const resizedSidecarWidth = getSidecarWidth();
        iframeContainer.style.width = `${resizedSidecarWidth}px`;
        applySidecarInset(isOpen);
      }

      if (usesLauncher) {
        applyMobileScrollLock(isOpen && isNowMobile);
      }
    });

    // Initialize Engagement Controller if enabled
    const proactiveModuleEnabled = settings.enableProactiveMessaging === true;
    if (settings.engagement && settings.engagement.enabled === true && proactiveModuleEnabled) {
      // Resolve language precedence for proactive bubbles:
      // 1) engagement.language (Proactive module setting)
      // 2) initialLanguage (widget global setting)
      // 3) browser language (auto fallback)
      let resolvedLanguage = settings.engagement.language || settings.initialLanguage;
      if (!resolvedLanguage || resolvedLanguage === 'auto') {
        const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        if (browserLang.startsWith('tr')) resolvedLanguage = 'tr';
        else if (browserLang.startsWith('es')) resolvedLanguage = 'es';
        else if (browserLang.startsWith('de')) resolvedLanguage = 'de';
        else if (browserLang.startsWith('fr')) resolvedLanguage = 'fr';
        else resolvedLanguage = 'en';
      }
      console.log('Initializing Engagement Controller with language:', resolvedLanguage);
      engagementController = new EngagementController(settings.engagement, baseUrl, chatbotId, resolvedLanguage);
    }

    // Initialize No-Code Dynamic Context
    if (!isEnterpriseContextMode() && settings.enableDynamicContext && settings.dynamicContextSelectors) {
      try {
        // Ensure it's an array
        const validSelectors = Array.isArray(settings.dynamicContextSelectors) ? settings.dynamicContextSelectors : [];
        if (validSelectors.length > 0) {
          const contextObserver = new DynamicContextObserver(validSelectors);
          contextObserver.init();
        }
      } catch (e) {
        console.error('Userex: Failed to init Dynamic Context Observer', e);
      }
    }

    // Optional site-wide dynamic context crawl (beta)
    try {
      const siteContextOptions = getDynamicSiteContextOptions();
      if (!isEnterpriseContextMode() && siteContextOptions.enabled && (siteContextOptions.crawlTrigger === 'auto' || siteContextOptions.crawlTrigger === 'hybrid')) {
        setTimeout(() => {
          startSiteContextCrawl({
            trigger: siteContextOptions.crawlTrigger,
            routeScope: siteContextOptions.routeScope,
            allowlist: siteContextOptions.allowlist,
            maxRoutes: siteContextOptions.maxRoutes,
            maxDurationSec: siteContextOptions.maxDurationSec,
            hydrationWaitMs: siteContextOptions.hydrationWaitMs,
            collectionMode: siteContextOptions.collectionMode,
            capturePII: siteContextOptions.capturePII
          }).catch(() => { });
        }, 1500);
      }
    } catch (e) {
      console.warn('Userex: Failed to auto-start site context crawl', e);
    }

    // AI Smart Bubbles Logic - DISABLED (Replaced by AI Engagement PRO in EngagementController.fetchAIBubble)
    // The new AI Engagement PRO system handles AI-powered bubbles with better context collection,
    // behavior tracking, and intent detection. See EngagementController.init() -> fetchAIBubble()
    /*
    if (settings.engagement &&
      settings.engagement.aiSmartBubbles &&
      settings.engagement.aiSmartBubbles.enabled) {

      const smartConfig = settings.engagement.aiSmartBubbles;
      const maxPerSession = smartConfig.maxPerSession || 3;
      const aiCountKey = `userex_ai_smart_count_${chatbotId}`;
      const currentCount = parseInt(sessionStorage.getItem(aiCountKey) || '0');
      const cacheKey = `userex_ai_smart_cache_${chatbotId}_${window.location.pathname}`;

      if (currentCount < maxPerSession) {
        let bubbleText = sessionStorage.getItem(cacheKey);

        if (!bubbleText) {
          // Fetch new AI bubble
          fetch(`${baseUrl}/api/generate-context-bubble`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatbotId: chatbotId,
              pageUrl: window.location.href,
              pageTitle: document.title,
              h1: document.querySelector('h1')?.innerText || '',
              tone: smartConfig.tone || 'friendly'
            })
          })
            .then(res => res.json())
            .then(data => {
              if (data.bubble) {
                sessionStorage.setItem(cacheKey, data.bubble);
                sessionStorage.setItem(aiCountKey, (currentCount + 1).toString());

                // Dynamically add to engagement controller
                if (engagementController) {
                  engagementController.showBubble({
                    text: data.bubble,
                    delay: smartConfig.delay || 5,
                    isAiGenerated: true
                  });
                }
              }
            })
            .catch(err => console.error('AI Smart Bubble failed:', err));
        } else {
          // Use cached
          if (engagementController) {
            engagementController.showBubble({
              text: bubbleText,
              delay: smartConfig.delay || 5,
              isAiGenerated: true
            });
          }
        }
      }
    }
    */

    // --- Triggers ---
    if (isAvailable && usesLauncher) {
      // Auto Open
      if (settings.autoOpenDelay > 0) {
        setTimeout(() => {
          if (!isOpen) toggleWidget(true);
        }, settings.autoOpenDelay * 1000);
      }

      // Exit Intent
      if (settings.openOnExitIntent && window.innerWidth >= 1024) { // Desktop only
        const onMouseLeave = (e) => {
          if (e.clientY <= 0) {
            if (!isOpen) toggleWidget(true);
            document.removeEventListener('mouseleave', onMouseLeave); // Trigger once
          }
        };
        document.addEventListener('mouseleave', onMouseLeave);
      }

      // Scroll
      if (settings.openOnScroll > 0) {
        const onScroll = () => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const scrollPercent = (scrollTop / docHeight) * 100;

          if (scrollPercent >= settings.openOnScroll) {
            if (!isOpen) toggleWidget(true);
            window.removeEventListener('scroll', onScroll); // Trigger once
          }
        };
        window.addEventListener('scroll', onScroll);
      }
    }
  }



  // --- Context Awareness & Proactive Logic ---

  // Helper: Detect page type from URL
  function detectPageType() {
    const path = window.location.pathname.toLowerCase();

    // Cart pages
    if (path.includes('/cart') || path.includes('/sepet') || path.includes('/basket')) return 'cart';

    // Checkout pages
    if (path.includes('/checkout') || path.includes('/odeme') || path.includes('/payment')) return 'checkout';

    // Product pages
    if (path.includes('/product') || path.includes('/urun') || path.includes('/item')) return 'product';

    // Category pages
    if (path.includes('/category') || path.includes('/kategori') || path.includes('/collection')) return 'category';

    // Booking/reservation pages
    if (path.includes('/booking') || path.includes('/rezervasyon') || path.includes('/reserve')) return 'booking';

    // Extras/add-ons pages
    if (path.includes('/extras') || path.includes('/ek-hizmetler') || path.includes('/add-ons') || path.includes('/additional')) return 'extras';

    // Confirmation pages
    if (path.includes('/confirmation') || path.includes('/onay') || path.includes('/success') || path.includes('/thank')) return 'confirmation';

    // Search pages
    if (path.includes('/search') || path.includes('/ara') || path.includes('/results')) return 'search';

    // Academic specific pages
    if (path.includes('/department') || path.includes('/bolum') || path.includes('/faculty')) return 'department';
    if (path.includes('/dorm') || path.includes('/yurt') || path.includes('/housing') || path.includes('/accommodation')) return 'housing';
    if (path.includes('/scholarship') || path.includes('/burs')) return 'scholarship';
    if (path.includes('/apply') || path.includes('/basvuru') || path.includes('/admission')) return 'application';

    return 'general';
  }

  // Helper: Get user login status from various sources
  function getUserData() {
    const userData = {
      isLoggedIn: false
    };

    // Method 1: Check script data attributes
    if (currentScript) {
      const loggedIn = currentScript.getAttribute('data-user-logged-in');
      if (loggedIn === 'true') {
        userData.isLoggedIn = true;
      }
    }

    // Method 2: Check global UserexWidget API
    if (window.UserexWidget && window.UserexWidget.userData) {
      const apiData = window.UserexWidget.userData;
      if (apiData.isLoggedIn) {
        userData.isLoggedIn = true;
      }
    }

    return userData;
  }

  // Helper to scrape metadata
  function getPageContext() {
    let pageText = '';
    // Optional: Only scrape heavy text if context awareness is enabled AND Dynamic Module is active
    if (settings && settings.enableDynamicContext && settings.enableContextAwareness && !isEnterpriseContextMode()) {
      try {
        const mainElement = document.querySelector('main') || document.body;
        if (mainElement) {
          // Clean up newlines, scripts, and extra spaces. Grab first 1000 chars.
          pageText = mainElement.innerText.replace(/\s+/g, ' ').trim().substring(0, 1000);
        }
      } catch (err) {
        console.warn('Userex Context Scraper Error:', err);
      }
    }

    const trustedContext = refreshTrustedRuntimeContext();
    const siteContextForAI = isEnterpriseContextMode() ? null : getSiteSessionContextForAI();
    const publicContext = trustedContext && trustedContext.publicContext && Object.keys(trustedContext.publicContext).length
      ? trustedContext.publicContext
      : undefined;
    const privateContextSummary = trustedContext && trustedContext.privateContextSummary && Object.keys(trustedContext.privateContextSummary).length
      ? trustedContext.privateContextSummary
      : undefined;

    return {
      url: window.location.href,
      title: document.title,
      desc: document.querySelector('meta[name="description"]')?.content || '',
      description: document.querySelector('meta[name="description"]')?.content || '',
      productName: document.querySelector('meta[property="og:title"]')?.content || document.title,
      productImage: document.querySelector('meta[property="og:image"]')?.content || '',
      productPrice: document.querySelector('meta[property="product:price:amount"]')?.content || '',
      pageText: pageText,
      // NEW: Page type detection
      pageType: detectPageType(),
      // NEW: User login status
      user: getUserData(),
      publicContext: publicContext,
      privateContextSummary: privateContextSummary,
      assistantContextSource: trustedContext.source && trustedContext.source !== 'none'
        ? trustedContext.source
        : (isEnterpriseContextMode() ? 'enterprise_bridge' : 'nocode_scrape'),
      // NEW: Dynamic Data
      dynamicData: !isEnterpriseContextMode() && Object.keys(dynamicContextData || {}).length > 0 ? dynamicContextData : undefined,
      siteSessionContext: siteContextForAI,
      crawlStatus: siteContextForAI ? siteContextForAI.crawl : undefined
    };
  }

  // Expose global API for dynamic user updates
  window.UserexWidget = window.UserexWidget || {};
  window.UserexWidget.setUser = function (userData) {
    window.UserexWidget.userData = userData;
    sendContextUpdate(); // Immediately notify chatbot of user change
  };

  window.UserexWidget.setContext = function (payload) {
    const sanitized = sanitizeTrustedContextPayload(payload);
    if (!sanitized) {
      console.warn('UserexWidget.setContext rejected invalid payload.');
      return false;
    }
    window.UserexWidget.contextData = sanitized;
    trustedRuntimeContext = sanitized;
    sendContextUpdate();
    return true;
  };
  window.UserexWidget.getContextSnapshot = function () {
    return refreshTrustedRuntimeContext();
  };

  // Send context update to iframe
  function sendContextUpdate() {
    if (isBlockedWidgetRoute()) {
      if (window.UserexWidget && typeof window.UserexWidget.destroy === 'function') {
        window.UserexWidget.destroy();
      }
      return;
    }

    const iframe = document.querySelector('#userex-chatbot-container iframe');
    if (iframe && iframe.contentWindow) {
      const context = getPageContext();
      iframe.contentWindow.postMessage({
        type: 'USEREX_CONTEXT_UPDATE',
        context: context
      }, '*');
      if (context && context.siteSessionContext) {
        iframe.contentWindow.postMessage({
          type: 'USEREX_SITE_SESSION_CONTEXT_UPDATE',
          siteSessionContext: context.siteSessionContext
        }, '*');
      }
    }
  }

  // Monkey-patch history API for SPA support
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    sendContextUpdate();
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    sendContextUpdate();
  };

  window.addEventListener('popstate', sendContextUpdate);
  // Also listen to hashchange just in case
  window.addEventListener('hashchange', sendContextUpdate);

  // Helper to check business hours

  function checkAvailability() {
    if (!settings.enableBusinessHours) return true;

    try {
      const now = new Date();
      // Get current time in target timezone
      const options = { timeZone: settings.timezone, hour: 'numeric', minute: 'numeric', hour12: false };
      const formatter = new Intl.DateTimeFormat([], options);
      const parts = formatter.formatToParts(now);
      const hourPart = parts.find(p => p.type === 'hour');
      const minutePart = parts.find(p => p.type === 'minute');

      if (!hourPart || !minutePart) return true; // Fallback

      const currentHour = parseInt(hourPart.value, 10);
      const currentMinute = parseInt(minutePart.value, 10);
      const currentTimeVal = currentHour * 60 + currentMinute;

      const [startHour, startMinute] = settings.businessHoursStart.split(':').map(Number);
      const [endHour, endMinute] = settings.businessHoursEnd.split(':').map(Number);
      const startTimeVal = startHour * 60 + startMinute;
      const endTimeVal = endHour * 60 + endMinute;

      return currentTimeVal >= startTimeVal && currentTimeVal < endTimeVal;
    } catch (e) {
      console.error('Error checking availability:', e);
      return true; // Fail open
    }
  }

  // Voice interface is handled inside the chatbot iframe (ChatInput mic button + VoiceOverlay component)

  const SETTINGS_CACHE_TTL_MS = 15 * 60 * 1000;
  const SETTINGS_FALLBACK_LAUNCHER_DELAY_MS = 700;

  let settingsFetchPromise = null;
  let bootstrapStarted = false;
  let widgetOriginPrewarmed = false;

  function getSettingsCacheKey() {
    return `userex_widget_settings_v1:${baseUrl}:${chatbotId}`;
  }

  function readCachedSettings() {
    try {
      const raw = window.localStorage && window.localStorage.getItem(getSettingsCacheKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.settings || typeof parsed.settings !== 'object') {
        return null;
      }
      const savedAt = Number(parsed.savedAt || 0);
      if (!savedAt || (Date.now() - savedAt) > SETTINGS_CACHE_TTL_MS) {
        return null;
      }
      return parsed.settings;
    } catch (error) {
      console.warn('Userex Widget: Failed to read cached settings', error);
      return null;
    }
  }

  function writeCachedSettings(nextSettings) {
    try {
      if (!nextSettings || typeof nextSettings !== 'object' || !window.localStorage) return;
      window.localStorage.setItem(getSettingsCacheKey(), JSON.stringify({
        savedAt: Date.now(),
        settings: nextSettings
      }));
    } catch (error) {
      console.warn('Userex Widget: Failed to persist settings cache', error);
    }
  }

  function clearCachedSettings() {
    try {
      if (!window.localStorage) return;
      window.localStorage.removeItem(getSettingsCacheKey());
    } catch (error) {
      console.warn('Userex Widget: Failed to clear settings cache', error);
    }
  }

  function readPreviewDraftSettings() {
    if (!previewDraftKey) return null;

    try {
      if (!window.localStorage) return null;
      const raw = window.localStorage.getItem(previewDraftKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (error) {
      console.warn('Userex Widget: Failed to read preview draft settings', error);
      return null;
    }
  }

  function getPreviewOpenStateKey() {
    return previewDraftKey ? `${previewDraftKey}:open` : '';
  }

  function readPreviewOpenState() {
    const key = getPreviewOpenStateKey();
    if (!key) return null;

    try {
      if (!window.localStorage) return null;
      const raw = window.localStorage.getItem(key);
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return null;
    } catch (error) {
      console.warn('Userex Widget: Failed to read preview open state', error);
      return null;
    }
  }

  function writePreviewOpenState(isOpen) {
    const key = getPreviewOpenStateKey();
    if (!key) return;

    try {
      if (!window.localStorage) return;
      window.localStorage.setItem(key, isOpen ? 'true' : 'false');
    } catch (error) {
      console.warn('Userex Widget: Failed to persist preview open state', error);
    }
  }

  function prewarmWidgetOrigin() {
    if (widgetOriginPrewarmed || !document.head) return;
    widgetOriginPrewarmed = true;

    try {
      const origin = new URL(baseUrl).origin;

      if (!document.head.querySelector(`link[data-userex-preconnect="${origin}"]`)) {
        const preconnect = document.createElement('link');
        preconnect.rel = 'preconnect';
        preconnect.href = origin;
        preconnect.crossOrigin = 'anonymous';
        preconnect.setAttribute('data-userex-preconnect', origin);
        document.head.appendChild(preconnect);
      }

      if (!document.head.querySelector(`link[data-userex-dns-prefetch="${origin}"]`)) {
        const dnsPrefetch = document.createElement('link');
        dnsPrefetch.rel = 'dns-prefetch';
        dnsPrefetch.href = origin;
        dnsPrefetch.setAttribute('data-userex-dns-prefetch', origin);
        document.head.appendChild(dnsPrefetch);
      }
    } catch (error) {
      console.warn('Userex Widget: Failed to prewarm widget origin', error);
    }
  }

  function normalizeBootstrapSettings(nextSettings) {
    let resolvedSettings = {
      ...settings,
      ...(nextSettings && typeof nextSettings === 'object' ? nextSettings : {})
    };

    // Module toggle is the source of truth. If disabled, force runtime engagement off.
    if (resolvedSettings.enableProactiveMessaging === false && resolvedSettings.engagement && typeof resolvedSettings.engagement === 'object') {
      resolvedSettings = {
        ...resolvedSettings,
        engagement: {
          ...resolvedSettings.engagement,
          enabled: false
        }
      };
    }

    return resolvedSettings;
  }

  function applyBootstrapSettings(nextSettings, sourceLabel) {
    baseDeviceAwareSettings = normalizeBootstrapSettings(nextSettings);
    settings = applyDeviceResolvedWidgetSettings(baseDeviceAwareSettings, isMobileDevice() ? 'mobile' : 'desktop');
    console.log(`Userex Widget: Configuration loaded${sourceLabel ? ` (${sourceLabel})` : ''}`);
  }

  function removeBootstrappedWidgetShell() {
    try {
      if (engagementController && typeof engagementController.destroy === 'function') {
        engagementController.destroy();
      }
    } catch (error) {
      console.warn('Userex Widget: Failed to destroy engagement controller during cleanup', error);
    }
    engagementController = null;

    [
      'userex-chatbot-launcher',
      'userex-chatbot-container',
      'userex-launcher-wrapper',
      'userex-engagement-bubble',
      'userex-mobile-styles',
      'userex-sidecar-layout-styles'
    ].forEach((id) => {
      const node = document.getElementById(id);
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });

    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    if (htmlEl) {
      htmlEl.classList.remove('userex-sidecar-active');
      htmlEl.style.marginRight = '';
      htmlEl.style.width = '';
      htmlEl.style.transition = '';
    }
    if (bodyEl) {
      bodyEl.style.marginRight = '';
      bodyEl.style.overflowX = '';
    }
  }

  function getSettingsCacheKey() {
    return `userex_widget_settings_v1:${baseUrl}:${chatbotId}`;
  }

  function readCachedSettings() {
    try {
      const raw = window.localStorage && window.localStorage.getItem(getSettingsCacheKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.settings || typeof parsed.settings !== 'object') {
        return null;
      }
      const savedAt = Number(parsed.savedAt || 0);
      if (!savedAt || (Date.now() - savedAt) > SETTINGS_CACHE_TTL_MS) {
        return null;
      }
      return parsed.settings;
    } catch (error) {
      console.warn('Userex Widget: Failed to read cached settings', error);
      return null;
    }
  }

  function writeCachedSettings(nextSettings) {
    try {
      if (!nextSettings || typeof nextSettings !== 'object' || !window.localStorage) return;
      window.localStorage.setItem(getSettingsCacheKey(), JSON.stringify({
        savedAt: Date.now(),
        settings: nextSettings
      }));
    } catch (error) {
      console.warn('Userex Widget: Failed to persist settings cache', error);
    }
  }

  function clearCachedSettings() {
    try {
      if (!window.localStorage) return;
      window.localStorage.removeItem(getSettingsCacheKey());
    } catch (error) {
      console.warn('Userex Widget: Failed to clear settings cache', error);
    }
  }

  function normalizeBootstrapSettings(nextSettings) {
    let resolvedSettings = {
      ...settings,
      ...(nextSettings && typeof nextSettings === 'object' ? nextSettings : {})
    };

    // Module toggle is the source of truth. If disabled, force runtime engagement off.
    if (resolvedSettings.enableProactiveMessaging === false && resolvedSettings.engagement && typeof resolvedSettings.engagement === 'object') {
      resolvedSettings = {
        ...resolvedSettings,
        engagement: {
          ...resolvedSettings.engagement,
          enabled: false
        }
      };
    }

    return resolvedSettings;
  }

  function applyBootstrapSettings(nextSettings, sourceLabel) {
    baseDeviceAwareSettings = normalizeBootstrapSettings(nextSettings);
    settings = applyDeviceResolvedWidgetSettings(baseDeviceAwareSettings, isMobileDevice() ? 'mobile' : 'desktop');
    console.log(`Userex Widget: Configuration loaded${sourceLabel ? ` (${sourceLabel})` : ''}`);
  }

  function removeBootstrappedWidgetShell() {
    try {
      if (engagementController && typeof engagementController.destroy === 'function') {
        engagementController.destroy();
      }
    } catch (error) {
      console.warn('Userex Widget: Failed to destroy engagement controller during cleanup', error);
    }
    engagementController = null;

    [
      'userex-chatbot-launcher',
      'userex-chatbot-container',
      'userex-launcher-wrapper',
      'userex-engagement-bubble',
      'userex-mobile-styles',
      'userex-sidecar-layout-styles'
    ].forEach((id) => {
      const node = document.getElementById(id);
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });

    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    if (htmlEl) {
      htmlEl.classList.remove('userex-sidecar-active');
      htmlEl.style.marginRight = '';
      htmlEl.style.width = '';
      htmlEl.style.transition = '';
    }
    if (bodyEl) {
      bodyEl.style.marginRight = '';
      bodyEl.style.overflowX = '';
    }
  }

  // Helper: Fetch Settings
  async function fetchSettings() {
    const previewDraftSettings = readPreviewDraftSettings();

    try {
      const response = await fetch(`${baseUrl}/api/widget-settings?chatbotId=${chatbotId}&t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      const fetchedSettings = await response.json();
      writeCachedSettings(fetchedSettings);
      return fetchedSettings;
    } catch (error) {
      if (previewDraftSettings) {
        console.warn('Userex Widget: Using preview draft settings (Fetch failed)', error);
        return previewDraftSettings;
      }

      console.warn('Userex Widget: Using default settings (Fetch failed)', error);
      return {};
    }
  }

  // Bootstrap Function
  async function bootstrap() {
    if (bootstrapStarted) return;
    bootstrapStarted = true;

    if (isSiteCrawlPageMode()) {
      console.log('Userex Widget: Site crawl page mode detected, skipping widget UI bootstrap');
      return;
    }

    let widgetShellReady = false;

    const cachedSettings = readCachedSettings();
    if (cachedSettings && cachedSettings.isEnabled !== false) {
      applyBootstrapSettings(cachedSettings, 'cache');
      initWidget();
      widgetShellReady = true;
    }

    const fetchedSettings = await (settingsFetchPromise || fetchSettings());

    // STRICT CHECK: If disabled, abort and remove any optimistic shell.
    if (fetchedSettings.isEnabled === false) {
      clearCachedSettings();
      if (widgetShellReady) {
        removeBootstrappedWidgetShell();
      }
      console.warn('Userex Widget is disabled for this account.');
      return;
    }

    const isIdentical = cachedSettings && JSON.stringify(cachedSettings) === JSON.stringify(fetchedSettings);
    applyBootstrapSettings(fetchedSettings, widgetShellReady ? 'network refresh' : 'network');
    
    if (!widgetShellReady || !isIdentical) {
      if (widgetShellReady) {
        removeBootstrappedWidgetShell();
      }
      initWidget();
    }
  }

  // Start fetching settings immediately so network overlaps with page render.
  prewarmWidgetOrigin();
  settingsFetchPromise = fetchSettings();

  // Start Initialization
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bootstrap();
  } else {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  }

  let activeSiteCrawlJob = null;

  function emitSiteCrawlMessageToOpener(type, payload) {
    if (!window.opener) return;
    try {
      window.opener.postMessage({ type, payload }, '*');
    } catch (e) { }
  }

  function discoverSafeRoutesForSiteCrawl(options) {
    const opts = options || {};
    const routeScope = opts.routeScope || 'sidebar_safe';
    const maxRoutes = Math.max(1, Math.min(100, Number(opts.maxRoutes || 30)));
    const allowlist = Array.isArray(opts.allowlist) ? opts.allowlist : [];
    const presetRouteHints = Array.isArray(opts.presetRuntime?.routeHints)
      ? opts.presetRuntime.routeHints.map((h) => String(h || '').toLowerCase()).filter(Boolean)
      : [];
    const found = new Set();
    const pushRoute = (urlLike) => {
      try {
        const u = new URL(urlLike, window.location.href);
        if (!isSafeSiteRoute(u)) return;
        if (routeScope === 'allowlist' && allowlist.length > 0) {
          const normalized = toSafeRouteString(u);
          const allowed = allowlist.some((entry) => {
            if (!entry) return false;
            try {
              const eUrl = new URL(entry, window.location.href);
              return toSafeRouteString(eUrl) === normalized;
            } catch (e) {
              return normalized === String(entry).trim();
            }
          });
          if (!allowed) return;
        }
        found.add(toSafeRouteString(u));
      } catch (e) { }
    };

    pushRoute(window.location.href);

    try {
      const selector = routeScope === 'same_origin_all'
        ? 'a[href]'
        : 'nav a[href], aside a[href], [role="navigation"] a[href], [data-sidebar] a[href], [class*="sidebar"] a[href], header a[href]';
      let anchors = Array.from(document.querySelectorAll(selector));
      if (!anchors.length && routeScope !== 'same_origin_all') {
        anchors = Array.from(document.querySelectorAll('a[href]'));
      }
      anchors.forEach((a) => {
        if (!(a instanceof HTMLAnchorElement)) return;
        if (isWidgetNoiseElement(a)) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
        pushRoute(href);
      });
    } catch (e) { }

    const routes = Array.from(found);

    // Prefer current route first, then shorter paths (often sidebar index pages)
    const current = toSafeRouteString(new URL(window.location.href));
    routes.sort((a, b) => {
      if (a === current) return -1;
      if (b === current) return 1;
      const lowerA = a.toLowerCase();
      const lowerB = b.toLowerCase();
      const hintScore = (path) => presetRouteHints.reduce((acc, hint) => acc + (path.includes(hint) ? 1 : 0), 0);
      const hintDiff = hintScore(lowerB) - hintScore(lowerA);
      if (hintDiff !== 0) return hintDiff;
      return a.length - b.length;
    });

    return routes.slice(0, maxRoutes);
  }

  function buildSiteCrawlPageUrl(route, options) {
    const routeUrl = new URL(route, window.location.origin);
    routeUrl.searchParams.set('vion_site_crawl_page', '1');
    routeUrl.searchParams.set('vion_site_crawl_scan_id', String(options.scanId || 'scan'));
    routeUrl.searchParams.set('vion_site_crawl_hydration_wait_ms', String(options.hydrationWaitMs || 4000));
    routeUrl.searchParams.set('vion_site_crawl_collection_mode', String(options.collectionMode || 'dom_network'));
    routeUrl.searchParams.set('vion_site_crawl_capture_pii', options.capturePII === false ? '0' : '1');
    try {
      if (options.presetRuntime && typeof options.presetRuntime === 'object') {
        routeUrl.searchParams.set('vion_site_crawl_preset_runtime', JSON.stringify(options.presetRuntime));
      }
    } catch (e) { }
    return routeUrl.toString();
  }

  function aggregateSelectorCandidatesFromSiteSessionContext() {
    const unique = new Map();
    const routes = Object.values(siteSessionContext?.routes || {});
    routes.forEach((routeSnap) => {
      const candidates = Array.isArray(routeSnap.selectorCandidates) ? routeSnap.selectorCandidates : [];
      candidates.forEach((item) => {
        if (!item || !item.selector || isWidgetNoiseSelector(item.selector)) return;
        if (!unique.has(item.selector) && unique.size < 200) {
          unique.set(item.selector, { key: item.key || 'field', selector: item.selector, route: routeSnap.route });
        }
      });
    });
    return Array.from(unique.values());
  }

  function startSiteContextCrawl(rawOptions) {
    const opts = rawOptions || {};
    if (activeSiteCrawlJob && activeSiteCrawlJob.running) {
      return Promise.resolve({
        success: false,
        reason: 'already_running',
        context: getSiteSessionContextForAI()
      });
    }

    const config = getDynamicSiteContextOptions();
    const crawlOptions = {
      trigger: opts.trigger || 'manual',
      routeScope: opts.routeScope || config.routeScope || 'sidebar_safe',
      allowlist: Array.isArray(opts.allowlist) ? opts.allowlist : config.allowlist,
      maxRoutes: Number(opts.maxRoutes || config.maxRoutes || 30),
      maxDurationSec: Number(opts.maxDurationSec || config.maxDurationSec || 90),
      hydrationWaitMs: Number(opts.hydrationWaitMs || config.hydrationWaitMs || 4000),
      collectionMode: opts.collectionMode || config.collectionMode || 'dom_network',
      capturePII: opts.capturePII !== undefined ? !!opts.capturePII : config.capturePII !== false,
      presetRuntime: (opts.presetRuntime && typeof opts.presetRuntime === 'object') ? opts.presetRuntime : (config.runtimePreset || null),
      scanId: opts.scanId || (`scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      mode: opts.mode || (isSiteCrawlOrchestratorMode() ? 'popup' : 'runtime')
    };

    const routes = discoverSafeRoutesForSiteCrawl(crawlOptions);
    siteSessionContext = createEmptySiteSessionContext();
    siteSessionContext.crawl.status = 'running';
    siteSessionContext.crawl.trigger = crawlOptions.trigger;
    siteSessionContext.crawl.routeScope = crawlOptions.routeScope;
    siteSessionContext.preset = crawlOptions.presetRuntime ? {
      presetId: crawlOptions.presetRuntime.presetId || config.presetId || 'generic-web-app',
      presetMode: config.presetMode || 'none',
      suggestedPresetId: config.suggestedPresetId || 'generic-web-app',
      runtime: crawlOptions.presetRuntime
    } : null;
    siteSessionContext.crawl.progress = {
      total: routes.length,
      visited: 0,
      success: 0,
      failed: 0,
      currentRoute: routes[0] || ''
    };
    scheduleSiteContextUpdate();

    emitSiteCrawlMessageToOpener('USEREX_SITE_CRAWL_START', {
      scanId: crawlOptions.scanId,
      options: crawlOptions,
      progress: siteSessionContext.crawl.progress
    });

    if (!routes.length) {
      siteSessionContext.crawl.status = 'failed';
      siteSessionContext.crawl.errors.push({ route: window.location.pathname, code: 'parse_error', message: 'No safe routes discovered' });
      scheduleSiteContextUpdate();
      emitSiteCrawlMessageToOpener('USEREX_SITE_CRAWL_ERROR', {
        scanId: crawlOptions.scanId,
        error: { code: 'parse_error', message: 'No safe routes discovered' }
      });
      return Promise.resolve({ success: false, reason: 'no_routes', context: getSiteSessionContextForAI() });
    }

    return new Promise((resolve) => {
      const job = {
        running: true,
        scanId: crawlOptions.scanId,
        routes,
        options: crawlOptions,
        index: 0,
        hiddenIframe: null,
        routeTimer: null,
        overallTimer: null,
        messageHandler: null,
        resolve
      };
      activeSiteCrawlJob = job;

      const cleanup = (finalPayload) => {
        if (!job.running) return;
        job.running = false;
        if (job.routeTimer) clearTimeout(job.routeTimer);
        if (job.overallTimer) clearTimeout(job.overallTimer);
        if (job.messageHandler) window.removeEventListener('message', job.messageHandler);
        if (job.hiddenIframe && job.hiddenIframe.parentNode) {
          job.hiddenIframe.parentNode.removeChild(job.hiddenIframe);
        }
        if (activeSiteCrawlJob === job) activeSiteCrawlJob = null;
        job.resolve(finalPayload);
      };
      job.cleanup = cleanup;

      const finish = (status) => {
        siteSessionContext.crawl.status = status;
        siteSessionContext.updatedAt = nowIso();
        scheduleSiteContextUpdate();

        const payload = {
          scanId: crawlOptions.scanId,
          siteSessionContext: getSiteSessionContextForAI(),
          discoveredSelectors: aggregateSelectorCandidatesFromSiteSessionContext(),
          progress: siteSessionContext.crawl.progress,
          errors: siteSessionContext.crawl.errors
        };
        emitSiteCrawlMessageToOpener('USEREX_SITE_CRAWL_COMPLETE', payload);
        cleanup({ success: status === 'completed' || status === 'partial', status, ...payload });
      };

      const goNext = () => {
        if (!job.running) return;
        if (job.index >= job.routes.length) {
          const finalStatus = siteSessionContext.crawl.progress.failed > 0 ? 'partial' : 'completed';
          finish(finalStatus);
          return;
        }

        const route = job.routes[job.index];
        siteSessionContext.crawl.progress.currentRoute = route;
        siteSessionContext.updatedAt = nowIso();
        scheduleSiteContextUpdate();
        emitSiteCrawlMessageToOpener('USEREX_SITE_CRAWL_PROGRESS', {
          scanId: crawlOptions.scanId,
          progress: siteSessionContext.crawl.progress,
          currentRoute: route
        });

        if (job.routeTimer) clearTimeout(job.routeTimer);
        job.routeTimer = setTimeout(() => {
          siteSessionContext.crawl.progress.visited += 1;
          siteSessionContext.crawl.progress.failed += 1;
          siteSessionContext.crawl.errors.push({ route, code: 'timeout', message: 'Timed out waiting for route scan result' });
          job.index += 1;
          scheduleSiteContextUpdate();
          goNext();
        }, Math.max(5000, crawlOptions.hydrationWaitMs + 12000));

        const crawlUrl = buildSiteCrawlPageUrl(route, crawlOptions);
        job.hiddenIframe.src = crawlUrl;
      };

      job.messageHandler = (event) => {
        const data = event && event.data;
        if (!data || data.type !== 'USEREX_SITE_CRAWL_PAGE_RESULT') return;
        if (String(data.scanId || '') !== String(job.scanId)) return;

        const payload = data.payload || {};
        if (job.routeTimer) {
          clearTimeout(job.routeTimer);
          job.routeTimer = null;
        }

        siteSessionContext.crawl.progress.visited += 1;
        if (payload.ok === false) {
          siteSessionContext.crawl.progress.failed += 1;
          siteSessionContext.crawl.errors.push({
            route: payload.route || job.routes[job.index] || '',
            code: payload.error?.code || 'parse_error',
            message: payload.error?.message || 'Page scan failed'
          });
        } else {
          siteSessionContext.crawl.progress.success += 1;
          if (payload.snapshot) {
            mergeRouteSnapshotIntoSiteSessionContext(payload.snapshot);
          }
          if (Array.isArray(payload.networkResources)) {
            mergeNetworkResourceSummaries(payload.networkResources);
          }
        }

        job.index += 1;
        scheduleSiteContextUpdate();
        emitSiteCrawlMessageToOpener('USEREX_SITE_CRAWL_PROGRESS', {
          scanId: crawlOptions.scanId,
          progress: siteSessionContext.crawl.progress,
          currentRoute: siteSessionContext.crawl.progress.currentRoute,
          lastRouteResult: {
            route: payload.route || '',
            ok: payload.ok !== false,
            selectorCandidates: Array.isArray(payload.snapshot?.selectorCandidates) ? payload.snapshot.selectorCandidates.length : 0
          }
        });
        goNext();
      };

      window.addEventListener('message', job.messageHandler);

      job.hiddenIframe = document.createElement('iframe');
      job.hiddenIframe.setAttribute('aria-hidden', 'true');
      job.hiddenIframe.tabIndex = -1;
      Object.assign(job.hiddenIframe.style, {
        position: 'fixed',
        width: '1px',
        height: '1px',
        opacity: '0',
        pointerEvents: 'none',
        left: '-9999px',
        top: '-9999px',
        border: '0'
      });
      document.body.appendChild(job.hiddenIframe);

      job.overallTimer = setTimeout(() => {
        siteSessionContext.crawl.status = 'failed';
        siteSessionContext.crawl.errors.push({ route: siteSessionContext.crawl.progress.currentRoute || '', code: 'timeout', message: 'Overall crawl timed out' });
        finish(siteSessionContext.crawl.progress.success > 0 ? 'partial' : 'failed');
      }, Math.max(15000, crawlOptions.maxDurationSec * 1000));

      goNext();
    });
  }

  function createPageNetworkCaptureCollector(options) {
    const opts = options || {};
    const capturePII = opts.capturePII !== false;
    const maxBytes = Math.max(2048, Number(opts.maxBytes || SITE_CONTEXT_MAX_PAGE_NETWORK_BYTES));
    const networkPolicy = (opts.networkPolicy && typeof opts.networkPolicy === 'object') ? opts.networkPolicy : {
      allowGetJson: true,
      allowGraphQLSummary: false,
      allowedPostEndpoints: [],
      allowedGraphQLOperations: []
    };
    const resources = new Map();
    let totalBytes = 0;

    const makeResourceKey = (method, urlString, summary) => {
      let path = '';
      try {
        path = new URL(urlString, window.location.href).pathname;
      } catch (e) {
        path = String(urlString || '');
      }
      let stableKeys = '';
      const sample = summary && summary.sample;
      if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
        stableKeys = Object.keys(sample).slice(0, 8).sort().join(',');
      }
      return `${String(method || 'GET').toUpperCase()} ${path} ${stableKeys}`.trim();
    };

    const isAllowedPostEndpoint = (urlString) => {
      const allowlist = Array.isArray(networkPolicy.allowedPostEndpoints) ? networkPolicy.allowedPostEndpoints : [];
      if (!allowlist.length) return false;
      try {
        const path = new URL(urlString, window.location.href).pathname.toLowerCase();
        return allowlist.some((entry) => {
          const e = String(entry || '').trim().toLowerCase();
          return e && path.includes(e);
        });
      } catch (e) {
        return false;
      }
    };

    const parseGraphQLOperationName = (bodyLike) => {
      try {
        if (!bodyLike) return '';
        let raw = '';
        if (typeof bodyLike === 'string') raw = bodyLike;
        else if (bodyLike instanceof URLSearchParams) raw = bodyLike.toString();
        else if (typeof bodyLike === 'object' && typeof bodyLike.text === 'function') return '';
        if (!raw) return '';
        if (raw.includes('operationName=')) {
          const params = new URLSearchParams(raw);
          return params.get('operationName') || '';
        }
        const parsed = JSON.parse(raw);
        return parsed?.operationName || '';
      } catch (e) {
        return '';
      }
    };

    const isAllowedGraphQLOperation = (operationName) => {
      const allowOps = Array.isArray(networkPolicy.allowedGraphQLOperations) ? networkPolicy.allowedGraphQLOperations : [];
      if (!allowOps.length) return false;
      const normalized = String(operationName || '').trim().toLowerCase();
      if (!normalized) return false;
      return allowOps.some((op) => String(op || '').trim().toLowerCase() === normalized);
    };

    const shouldCapture = (method, urlString, contentType, bodyLike) => {
      const m = String(method || 'GET').toUpperCase();
      let isGraphql = false;
      try {
        const u = new URL(urlString, window.location.href);
        if (u.origin !== window.location.origin) return false;
        isGraphql = u.pathname.toLowerCase().includes('graphql');
      } catch (e) {
        return false;
      }
      if (m === 'GET') {
        if (networkPolicy.allowGetJson === false) return false;
      } else {
        if (m !== 'POST') return false;
        const postEndpointAllowed = isAllowedPostEndpoint(urlString);
        const operationName = parseGraphQLOperationName(bodyLike);
        const graphqlAllowed = networkPolicy.allowGraphQLSummary === true && (isGraphql || /graphql/i.test(String(urlString || '')))
          && (!Array.isArray(networkPolicy.allowedGraphQLOperations) || networkPolicy.allowedGraphQLOperations.length === 0
            ? true
            : isAllowedGraphQLOperation(operationName));
        if (!postEndpointAllowed && !graphqlAllowed) return false;
      }
      const ct = String(contentType || '').toLowerCase();
      return ct.includes('application/json') || ct.includes('json');
    };

    const detectSourceType = (method, urlString, requestBody) => {
      const m = String(method || 'GET').toUpperCase();
      if (m === 'GET') return 'get_json';
      let isGraphql = false;
      try { isGraphql = new URL(urlString, window.location.href).pathname.toLowerCase().includes('graphql'); } catch (e) { }
      const operationName = parseGraphQLOperationName(requestBody);
      if (networkPolicy.allowGraphQLSummary && (isGraphql || operationName)) return 'graphql_summary';
      return 'post_json';
    };

    const recordJson = (method, urlString, jsonBody, requestBody) => {
      if (!jsonBody) return;
      const summary = summarizeNetworkJsonForStorage(capturePII ? jsonBody : stripSensitiveData(jsonBody, 5), { networkPolicy });
      const key = makeResourceKey(method, urlString, summary);
      let path = '';
      try { path = new URL(urlString, window.location.href).pathname; } catch (e) { path = String(urlString || ''); }
      const sourceType = detectSourceType(method, urlString, requestBody);
      const operationName = parseGraphQLOperationName(requestBody) || undefined;
      const resource = {
        key,
        urlPath: path,
        method: String(method || 'GET').toUpperCase(),
        sourceType,
        operationName,
        capturedAt: nowIso(),
        summary,
        sample: summary.sample
      };
      const estimatedBytes = JSON.stringify(resource).length;
      if (totalBytes + estimatedBytes > maxBytes) return;
      totalBytes += estimatedBytes;
      resources.set(key, resource);
    };

    let originalFetch = null;
    let originalXhrOpen = null;
    let originalXhrSend = null;

    try {
      if (typeof window.fetch === 'function') {
        originalFetch = window.fetch.bind(window);
        window.fetch = async function (...args) {
          const response = await originalFetch(...args);
          try {
            const requestInfo = args[0];
            const requestInit = args[1] || {};
            const urlString = typeof requestInfo === 'string'
              ? requestInfo
              : (requestInfo && requestInfo.url) || '';
            const method = (requestInit.method || (requestInfo && requestInfo.method) || 'GET').toUpperCase();
            const contentType = response.headers && response.headers.get ? response.headers.get('content-type') || '' : '';
            const requestBody = requestInit.body || (requestInfo && requestInfo.body) || null;
            if (shouldCapture(method, urlString, contentType, requestBody)) {
              const clone = response.clone();
              clone.text().then((txt) => {
                if (!txt || txt.length > SITE_CONTEXT_MAX_PAGE_NETWORK_BYTES) return;
                try {
                  const parsed = JSON.parse(txt);
                  recordJson(method, urlString, parsed, requestBody);
                } catch (e) { }
              }).catch(() => { });
            }
          } catch (e) { }
          return response;
        };
      }
    } catch (e) { }

    try {
      if (window.XMLHttpRequest && window.XMLHttpRequest.prototype) {
        originalXhrOpen = window.XMLHttpRequest.prototype.open;
        originalXhrSend = window.XMLHttpRequest.prototype.send;
        window.XMLHttpRequest.prototype.open = function (method, url) {
          this.__userexCaptureMethod = method;
          this.__userexCaptureUrl = url;
          return originalXhrOpen.apply(this, arguments);
        };
        window.XMLHttpRequest.prototype.send = function () {
          this.__userexCaptureBody = arguments[0];
          try {
            this.addEventListener('load', function () {
              try {
                const method = String(this.__userexCaptureMethod || 'GET').toUpperCase();
                const urlString = this.__userexCaptureUrl || '';
                const contentType = (this.getResponseHeader && this.getResponseHeader('content-type')) || '';
                const requestBody = this.__userexCaptureBody;
                if (!shouldCapture(method, urlString, contentType, requestBody)) return;
                if (typeof this.responseText !== 'string' || this.responseText.length > SITE_CONTEXT_MAX_PAGE_NETWORK_BYTES) return;
                const parsed = JSON.parse(this.responseText);
                recordJson(method, urlString, parsed, requestBody);
              } catch (e) { }
            });
          } catch (e) { }
          return originalXhrSend.apply(this, arguments);
        };
      }
    } catch (e) { }

    return {
      getResources() {
        return Array.from(resources.values());
      },
      stop() {
        try {
          if (originalFetch) window.fetch = originalFetch;
        } catch (e) { }
        try {
          if (originalXhrOpen) window.XMLHttpRequest.prototype.open = originalXhrOpen;
          if (originalXhrSend) window.XMLHttpRequest.prototype.send = originalXhrSend;
        } catch (e) { }
      }
    };
  }

  async function runSiteCrawlPageAgent() {
    const params = new URLSearchParams(window.location.search);
    const scanId = params.get('vion_site_crawl_scan_id') || 'scan';
    const hydrationWaitMs = Math.max(800, Math.min(10000, Number(params.get('vion_site_crawl_hydration_wait_ms') || 4000)));
    const collectionMode = params.get('vion_site_crawl_collection_mode') || 'dom_network';
    const capturePII = params.get('vion_site_crawl_capture_pii') !== '0';
    let presetRuntime = null;
    try {
      const rawPreset = params.get('vion_site_crawl_preset_runtime');
      if (rawPreset) {
        const parsedPreset = JSON.parse(rawPreset);
        if (parsedPreset && typeof parsedPreset === 'object') presetRuntime = parsedPreset;
      }
    } catch (e) { }

    const sendResult = (payload) => {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'USEREX_SITE_CRAWL_PAGE_RESULT',
            scanId,
            payload
          }, '*');
        }
      } catch (e) { }
    };

    let networkCollector = null;
    if (collectionMode === 'dom_network') {
      networkCollector = createPageNetworkCaptureCollector({
        capturePII,
        maxBytes: SITE_CONTEXT_MAX_PAGE_NETWORK_BYTES,
        networkPolicy: presetRuntime?.networkPolicy || null
      });
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, hydrationWaitMs));
      await new Promise((resolve) => setTimeout(resolve, 800));

      const domSummary = collectDomSummaryFromDocument(document);
      const selectorCandidates = collectSelectorCandidatesFromDocument(document, 24);
      const route = toSafeRouteString(new URL(window.location.href));
      const pageTextSnippet = truncateText(((document.querySelector('main') || document.body)?.innerText || document.body?.textContent || ''), 1000);
      const networkResources = networkCollector ? networkCollector.getResources() : [];
      const visitedAt = nowIso();
      const entities = extractEntitiesForRoute(route, document, domSummary, {
        presetRuntime,
        networkResources,
        visitedAt
      });

      const snapshot = {
        route,
        title: document.title || '',
        visitedAt,
        pageTextSnippet,
        domSummary,
        selectorCandidates,
        entities
      };

      sendResult({
        ok: true,
        route,
        snapshot,
        networkResources
      });
    } catch (error) {
      sendResult({
        ok: false,
        route: toSafeRouteString(new URL(window.location.href)),
        error: {
          code: 'parse_error',
          message: error && error.message ? error.message : 'Unknown page scan error'
        }
      });
    } finally {
      if (networkCollector) networkCollector.stop();
    }
  }

  // ============================================
  // Auto-Discovery Agent (Triggers when vion_scan=1 is in URL)
  // ============================================
  function runAutoDiscovery() {
    if (isSiteCrawlPageMode()) {
      console.log('Vion AI: Site Crawl Page Agent Started...');
      runSiteCrawlPageAgent();
      return;
    }

    if (isSiteCrawlOrchestratorMode()) {
      console.log('Vion AI: Site Crawl Orchestrator Mode Started...');
      const params = new URLSearchParams(window.location.search);
      const crawlOptions = {
        trigger: 'manual',
        routeScope: params.get('vion_site_crawl_route_scope') || 'sidebar_safe',
        collectionMode: params.get('vion_site_crawl_collection_mode') || 'dom_network',
        maxRoutes: Number(params.get('vion_site_crawl_max_routes') || 30),
        maxDurationSec: Number(params.get('vion_site_crawl_max_duration_sec') || 90),
        hydrationWaitMs: Number(params.get('vion_site_crawl_hydration_wait_ms') || 4000),
        capturePII: params.get('vion_site_crawl_capture_pii') !== '0',
        scanId: params.get('vion_site_crawl_scan_id') || undefined,
        mode: 'popup'
      };

      let tries = 0;
      const tryStart = () => {
        tries += 1;
        const startFn = (window.UserexWidget && typeof window.UserexWidget.startSiteContextCrawl === 'function')
          ? window.UserexWidget.startSiteContextCrawl
          : (typeof startSiteContextCrawl === 'function' ? startSiteContextCrawl : null);
        if (typeof startFn === 'function') {
          startFn(crawlOptions).then((result) => {
            if (params.get('vion_site_crawl_auto_close') === '1' && result && result.success) {
              try { window.close(); } catch (e) { }
            }
          }).catch((err) => {
            emitSiteCrawlMessageToOpener('USEREX_SITE_CRAWL_ERROR', {
              scanId: crawlOptions.scanId || null,
              error: { code: 'parse_error', message: err && err.message ? err.message : 'Failed to start site crawl' }
            });
          });
          return;
        }
        if (tries < 40) {
          setTimeout(tryStart, 250);
        } else {
          emitSiteCrawlMessageToOpener('USEREX_SITE_CRAWL_ERROR', {
            scanId: crawlOptions.scanId || null,
            error: { code: 'unreachable', message: 'Site crawl runtime did not initialize in time' }
          });
        }
      };

      setTimeout(tryStart, 200);
      return;
    }

    if (window.location.search.includes('vion_scan=1') || window.location.hash.includes('vion_scan')) {
      console.log('Vion AI: Auto-Discovery Scan Started...');
      setTimeout(() => {
        const discovered = [];
        const sanitizeKey = (value, fallback) => {
          const cleaned = String(value || '')
            .trim()
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
          return cleaned || fallback;
        };
        const escapeAttrValue = (value) => {
          const raw = String(value || '');
          try {
            if (window.CSS && typeof window.CSS.escape === 'function') {
              return window.CSS.escape(raw);
            }
          } catch (e) { }
          return raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        };
        const pushDiscovered = (key, selector) => {
          if (!selector) return;
          if (isWidgetNoiseSelector(selector)) return;
          discovered.push({ key: sanitizeKey(key, 'field'), selector: String(selector) });
        };
        const isSensitiveFieldHint = (value) => {
          const v = String(value || '').toLowerCase();
          return (
            v.includes('password') ||
            v.includes('passwd') ||
            v.includes('pwd') ||
            v.includes('otp') ||
            v.includes('cvv') ||
            v.includes('cvc') ||
            v.includes('iban') ||
            v.includes('cardnumber') ||
            v.includes('card-number') ||
            v.includes('creditcard') ||
            v.includes('credit-card')
          );
        };

        // 1. Scan LocalStorage
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (isWidgetNoiseStorageKey(key)) continue;
            const lower = key.toLowerCase();
            if (lower.includes('user') || lower.includes('token') || lower.includes('cart') || lower.includes('auth') || lower.includes('basket') || lower.includes('order') || lower.includes('session') || lower.includes('price')) {
              pushDiscovered(key, `localStorage:${key}`);
            }
          }
        } catch (e) { }

        // 2. Scan Cookies
        try {
          const cookies = document.cookie.split(';');
          cookies.forEach(c => {
            const key = c.split('=')[0].trim();
            if (!key) return;
            if (isWidgetNoiseStorageKey(key)) return;
            const lower = key.toLowerCase();
            if (lower.includes('user') || lower.includes('token') || lower.includes('session') || lower.includes('auth')) {
              pushDiscovered(key, `cookie:${key}`);
            }
          });
        } catch (e) { }

        // 3. Scan DOM Elements
        try {
          const elements = document.querySelectorAll('[id*="user"], [id*="cart"], [id*="balance"], [id*="price"], [class*="user"], [class*="cart"], [class*="balance"], [class*="price"]');
          elements.forEach(el => {
            if (isWidgetNoiseElement(el)) return;
            if (el.id) {
              const lowerId = el.id.toLowerCase();
              if (lowerId.includes('user') || lowerId.includes('cart') || lowerId.includes('balance') || lowerId.includes('price')) {
                pushDiscovered(el.id, `#${el.id}`);
              }
            } else if (el.className && typeof el.className === 'string') {
              const classes = el.className.split(' ').filter(c => {
                const lc = c.toLowerCase();
                return lc.includes('user') || lc.includes('cart') || lc.includes('balance') || lc.includes('price');
              });
              if (classes.length > 0) {
                pushDiscovered(classes[0], `.${classes[0]}`);
              }
            }
          });
        } catch (e) { }

        // 4. Scan form controls (input/textarea/select) for no-code dynamic context
        // This is the most useful source for lead forms and checkout/contact flows.
        try {
          const controls = document.querySelectorAll('input, textarea, select');
          controls.forEach((el, index) => {
            if (isWidgetNoiseElement(el)) return;
            const tag = (el.tagName || '').toLowerCase();
            const type = (el.type || '').toLowerCase();

            if (type === 'hidden' || type === 'password' || type === 'file') return;
            if ((el.disabled || el.readOnly) && !el.id && !el.name) return;

            const rawId = (el.id || '').trim();
            const rawName = (el.getAttribute && el.getAttribute('name') || '').trim();
            const placeholder = (el.getAttribute && el.getAttribute('placeholder') || '').trim();
            const ariaLabel = (el.getAttribute && el.getAttribute('aria-label') || '').trim();
            const hintBlob = [rawId, rawName, placeholder, ariaLabel, type].join(' ');
            if (isSensitiveFieldHint(hintBlob)) return;

            let selector = '';
            if (rawId) {
              selector = `#${rawId}`;
            } else if (rawName) {
              selector = `${tag}[name="${escapeAttrValue(rawName)}"]`;
            } else if (placeholder && placeholder.length <= 60) {
              selector = `${tag}[placeholder="${escapeAttrValue(placeholder)}"]`;
            }

            if (!selector) return;

            const keyHint = rawName || rawId || ariaLabel || placeholder || `${tag}_${index + 1}`;
            pushDiscovered(keyHint, selector);
          });
        } catch (e) { }

        // 5. Scan common testing/data hooks (often stable selectors on modern apps)
        try {
          const dataHookAttrs = ['data-testid', 'data-test', 'data-cy', 'data-qa'];
          const dataHookSelector = dataHookAttrs.map(attr => `[${attr}]`).join(', ');
          const dataHookElements = document.querySelectorAll(dataHookSelector);
          dataHookElements.forEach((el) => {
            if (isWidgetNoiseElement(el)) return;
            for (const attr of dataHookAttrs) {
              const attrValue = el.getAttribute && el.getAttribute(attr);
              if (!attrValue) continue;
              if (isSensitiveFieldHint(attrValue)) break;
              pushDiscovered(attrValue, `[${attr}="${escapeAttrValue(attrValue)}"]`);
              break;
            }
          });
        } catch (e) { }

        // Deduplicate using a Map
        const uniqueMap = new Map();
        discovered.forEach(item => {
          if (!uniqueMap.has(item.selector) && uniqueMap.size < 30) {
            uniqueMap.set(item.selector, item);
          }
        });
        const finalResults = Array.from(uniqueMap.values());

        // Send results back to window opener
        if (window.opener) {
          window.opener.postMessage({ type: 'USEREX_DISCOVERY_RESULTS', payload: finalResults }, '*');
          // Try to close the scanning popup automatically if permitted
          window.close();
        } else {
          console.log('Vion AI Discovered Data:', finalResults);
        }
      }, 2500); // 2.5 seconds wait for fully loaded page & hydrated SPA
    }
  }

  // Execute scan check
  runAutoDiscovery();

})();
