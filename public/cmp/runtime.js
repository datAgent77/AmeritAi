(function () {
  function safe(fn) {
    try {
      return fn()
    } catch {
      return null
    }
  }

  function text(value) {
    return typeof value === "string" ? value : ""
  }

  function getLang() {
    var lang = (navigator.language || "").toLowerCase()
    return lang.startsWith("tr") ? "tr" : "en"
  }

  function t(lang, tr, en) {
    return lang === "tr" ? tr : en
  }

  function getDeviceId() {
    var key = "cmp_device_id"
    var existing = safe(function () {
      return localStorage.getItem(key)
    })
    if (existing) return existing

    var id = safe(function () {
      return crypto.randomUUID()
    })
    if (!id) {
      id = "id_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16)
    }
    safe(function () {
      localStorage.setItem(key, id)
    })
    return id
  }

  function getConsentKey(domainId) {
    return "cmp_consent_" + domainId
  }

  function loadStoredConsent(domainId) {
    var raw = safe(function () {
      return localStorage.getItem(getConsentKey(domainId))
    })
    if (!raw) return null
    return safe(function () {
      return JSON.parse(raw)
    })
  }

  function storeConsent(domainId, value) {
    safe(function () {
      localStorage.setItem(getConsentKey(domainId), JSON.stringify(value))
    })
  }

  function applyConsentMode(choices) {
    var analytics = choices && choices.analytics ? "granted" : "denied"
    var marketing = choices && choices.marketing ? "granted" : "denied"
    var functional = choices && choices.functional ? "granted" : "denied"

    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        ad_storage: marketing,
        analytics_storage: analytics,
        functionality_storage: functional,
        security_storage: "granted",
      })
    }

    if (Array.isArray(window.dataLayer) && typeof window.dataLayer.push === "function") {
      window.dataLayer.push({
        event: "cmp_consent_update",
        cmp_analytics: analytics,
        cmp_marketing: marketing,
        cmp_functional: functional,
      })
    }
  }

  function loadGatedScripts(category, granted) {
    if (!granted) return

    var selector = 'script[type="text/plain"][data-cmp-category="' + category + '"]'
    var scripts = Array.prototype.slice.call(document.querySelectorAll(selector) || [])
    scripts.forEach(function (node) {
      var src = node.getAttribute("data-cmp-src")
      var nonce = node.getAttribute("nonce")
      var referrerPolicy = node.getAttribute("referrerpolicy")
      var crossOrigin = node.getAttribute("crossorigin")

      var s = document.createElement("script")
      if (nonce) s.setAttribute("nonce", nonce)
      if (referrerPolicy) s.setAttribute("referrerpolicy", referrerPolicy)
      if (crossOrigin) s.setAttribute("crossorigin", crossOrigin)

      if (src) {
        s.src = src
        s.async = true
      } else {
        s.text = node.text || node.textContent || ""
      }

      s.setAttribute("data-cmp-loaded", "1")
      node.parentNode.insertBefore(s, node)
      node.parentNode.removeChild(node)
    })
  }

  function applyTagGating(choices) {
    loadGatedScripts("analytics", choices && choices.analytics)
    loadGatedScripts("marketing", choices && choices.marketing)
    loadGatedScripts("functional", choices && choices.functional)
  }

  function injectStyles() {
    if (document.getElementById("cmp-style")) return
    var style = document.createElement("style")
    style.id = "cmp-style"
    style.textContent =
      "#cmp-root{position:fixed;inset:0;z-index:2147483000;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,Apple Color Emoji,Segoe UI Emoji;}" +
      "#cmp-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.35);}" +
      "#cmp-panel{position:absolute;left:16px;right:16px;bottom:16px;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.18);padding:16px;}" +
      "#cmp-panel.dark{background:#111827;color:#f9fafb;border-color:rgba(255,255,255,.12);}" +
      "#cmp-title{font-size:14px;font-weight:700;margin:0 0 6px 0;}" +
      "#cmp-desc{font-size:13px;line-height:1.45;margin:0 0 12px 0;opacity:.85;}" +
      "#cmp-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-end;}" +
      ".cmp-btn{appearance:none;border-radius:10px;border:1px solid rgba(0,0,0,.14);background:transparent;padding:10px 12px;font-size:13px;font-weight:600;cursor:pointer;}" +
      ".cmp-btn.primary{border:none;background:var(--cmp-primary,#111827);color:#fff;}" +
      ".cmp-btn.ghost{background:transparent;}" +
      "#cmp-modal{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,calc(100% - 32px));background:#fff;border-radius:14px;border:1px solid rgba(0,0,0,.12);box-shadow:0 16px 60px rgba(0,0,0,.22);padding:16px;}" +
      "#cmp-modal.dark{background:#111827;color:#f9fafb;border-color:rgba(255,255,255,.12);}" +
      "#cmp-list{display:flex;flex-direction:column;gap:10px;margin:12px 0 0 0;}" +
      ".cmp-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid rgba(0,0,0,.10);border-radius:12px;padding:10px 12px;}" +
      ".cmp-row.dark{border-color:rgba(255,255,255,.14);}" +
      ".cmp-row-title{font-size:13px;font-weight:700;margin:0;}" +
      ".cmp-row-desc{font-size:12px;opacity:.85;margin:2px 0 0 0;}" +
      ".cmp-switch{width:44px;height:26px;border-radius:999px;position:relative;background:rgba(0,0,0,.18);border:none;cursor:pointer;flex:0 0 auto;}" +
      ".cmp-switch.on{background:var(--cmp-primary,#111827);}" +
      ".cmp-knob{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:999px;background:#fff;transition:transform .18s ease;}" +
      ".cmp-switch.on .cmp-knob{transform:translateX(18px);}"
    document.head.appendChild(style)
  }

  function ensurePreferencesButton(options) {
    if (document.getElementById("cmp-fab")) return

    var lang = options.lang

    var btn = createEl("button", {
      id: "cmp-fab",
      type: "button",
      "aria-label": t(lang, "Çerez tercihleri", "Cookie preferences"),
    })
    btn.textContent = t(lang, "Çerez Ayarları", "Cookie Settings")
    btn.style.cssText =
      "position:fixed;right:14px;bottom:14px;z-index:2147483001;border:1px solid rgba(0,0,0,.14);background:#fff;color:#111827;border-radius:999px;padding:10px 12px;font-size:12px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.16);cursor:pointer;" +
      "max-width:calc(100vw - 28px);"

    btn.addEventListener("click", function () {
      if (typeof options.openPreferences === "function") options.openPreferences()
    })

    document.body.appendChild(btn)
  }

  function createEl(tag, attrs, children) {
    var el = document.createElement(tag)
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") el.className = attrs[k]
        else if (k === "text") el.textContent = attrs[k]
        else el.setAttribute(k, attrs[k])
      })
    }
    if (children) {
      children.forEach(function (child) {
        el.appendChild(child)
      })
    }
    return el
  }

  function shouldShowBanner(domainId, policyId, revisitDays) {
    var stored = loadStoredConsent(domainId)
    if (!stored) return true
    if (stored.policyVersionId !== policyId) return true
    if (typeof stored.updatedAt !== "number") return true
    var maxAgeMs = Math.max(1, revisitDays || 180) * 24 * 60 * 60 * 1000
    return Date.now() - stored.updatedAt > maxAgeMs
  }

  function postConsent(payload) {
    return fetch("/api/cmp/public/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  }

  function renderCmp(options) {
    injectStyles()

    var domain = options.domain
    var config = options.config || {}
    var policy = options.policy
    var writeToken = options.writeToken || null
    var bannerSettings = config.bannerSettings || {}
    var preferenceSettings = config.preferenceSettings || {}

    var theme = bannerSettings.theme === "dark" ? "dark" : "light"
    var position = bannerSettings.position === "center" ? "center" : "bottom"
    var primaryColor = text(bannerSettings.primaryColor) || "#111827"
    var revisitDays = typeof preferenceSettings.revisitDays === "number" ? preferenceSettings.revisitDays : 180

    function submit(action, choices) {
      var now = Date.now()
      storeConsent(domain.id, {
        policyVersionId: policy.id,
        choices: choices,
        updatedAt: now,
      })
      applyConsentMode(choices)
      applyTagGating(choices)
      postConsent({
        hostname: (location.hostname || "").toLowerCase(),
        action: action,
        choices: choices,
        policyVersionId: policy.id,
        deviceId: getDeviceId(),
        writeToken: writeToken,
      }).catch(function () {
        return null
      })
      close()
    }

    function close() {
      if (root && root.parentNode) root.parentNode.removeChild(root)
    }

    function openPreferences() {
      if (modal) return

      var current = loadStoredConsent(domain.id)
      var baseChoices = current && current.policyVersionId === policy.id ? current.choices || defaultChoices : defaultChoices

      var m = createEl("div", { id: "cmp-modal", class: theme === "dark" ? "dark" : "" })
      var mTitle = createEl("div", { id: "cmp-title", text: t(options.lang, "Tercihleri yönet", "Manage preferences") })
      var mDesc = createEl("div", { id: "cmp-desc", text: t(options.lang, "Zorunlu çerezler her zaman aktiftir.", "Strictly necessary cookies are always enabled.") })

      var list = createEl("div", { id: "cmp-list" })

      function row(key, label, description, required) {
        var wrap = createEl("div", { class: "cmp-row" + (theme === "dark" ? " dark" : "") })
        var left = createEl("div")
        left.appendChild(createEl("div", { class: "cmp-row-title", text: label }))
        left.appendChild(createEl("div", { class: "cmp-row-desc", text: description }))
        var sw = createEl("button", { class: "cmp-switch", type: "button" })
        var knob = createEl("span", { class: "cmp-knob" })
        sw.appendChild(knob)
        var on = required ? true : Boolean(baseChoices && baseChoices[key])
        if (on) sw.classList.add("on")
        if (required || !allowed[key]) {
          sw.disabled = true
          sw.style.opacity = "0.6"
        } else {
          sw.addEventListener("click", function () {
            on = !on
            if (on) sw.classList.add("on")
            else sw.classList.remove("on")
          })
        }

        wrap.appendChild(left)
        wrap.appendChild(sw)
        return { el: wrap, get: function () { return on } }
      }

      var rNecessary = row("necessary", t(options.lang, "Zorunlu", "Necessary"), t(options.lang, "Sitenin çalışması için gereklidir.", "Required for the website to function."), true)
      var rAnalytics = row("analytics", t(options.lang, "Analitik", "Analytics"), t(options.lang, "Trafik ve kullanım ölçümü.", "Traffic and usage measurement."), false)
      var rMarketing = row("marketing", t(options.lang, "Pazarlama", "Marketing"), t(options.lang, "Reklam ve dönüşüm ölçümü.", "Ads and conversion measurement."), false)
      var rFunctional = row("functional", t(options.lang, "İşlevsel", "Functional"), t(options.lang, "Tercihler ve kişiselleştirme.", "Preferences and personalization."), false)

      list.appendChild(rNecessary.el)
      list.appendChild(rAnalytics.el)
      list.appendChild(rMarketing.el)
      list.appendChild(rFunctional.el)

      var mActions = createEl("div", { id: "cmp-actions" })
      var btnClose = createEl("button", { class: "cmp-btn ghost", type: "button", text: t(options.lang, "Kapat", "Close") })
      var btnWithdraw = createEl("button", { class: "cmp-btn", type: "button", text: t(options.lang, "Rızayı geri çek", "Withdraw consent") })
      var btnSave = createEl("button", { class: "cmp-btn primary", type: "button", text: t(options.lang, "Kaydet", "Save") })

      btnClose.addEventListener("click", function () {
        if (modal && modal.parentNode) modal.parentNode.removeChild(modal)
        modal = null
      })

      btnWithdraw.addEventListener("click", function () {
        submit("withdraw", {
          necessary: true,
          analytics: false,
          marketing: false,
          functional: false,
        })
      })

      btnSave.addEventListener("click", function () {
        var choices = {
          necessary: true,
          analytics: rAnalytics.get(),
          marketing: rMarketing.get(),
          functional: rFunctional.get(),
        }
        submit("save_preferences", choices)
      })

      mActions.appendChild(btnClose)
      mActions.appendChild(btnWithdraw)
      mActions.appendChild(btnSave)

      if (policy && policy.content && policy.content.policyUrl) {
        var linkWrap = createEl("div", { id: "cmp-desc" })
        var a = createEl("a", { href: String(policy.content.policyUrl), target: "_blank", rel: "noopener noreferrer", text: t(options.lang, "Çerez politikası", "Cookie policy") })
        a.style.cssText = "color:inherit;text-decoration:underline;"
        linkWrap.appendChild(a)
        m.appendChild(linkWrap)
      }

      m.appendChild(mTitle)
      m.appendChild(mDesc)
      m.appendChild(list)

      var dsarWrap = createEl("div", { id: "cmp-desc" })
      var did = getDeviceId()
      dsarWrap.appendChild(createEl("div", { text: t(options.lang, "Consent ID (DSAR):", "Consent ID (DSAR):") }))
      var didLine = createEl("div", { text: did })
      didLine.setAttribute("translate", "no")
      didLine.style.cssText = "margin-top:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;opacity:0.9;word-break:break-all;"
      dsarWrap.appendChild(didLine)
      var apiUrl = location.origin + "/api/cmp/public/my-consents?hostname=" + encodeURIComponent((location.hostname || "").toLowerCase()) + "&deviceId=" + encodeURIComponent(did)
      var apiLink = createEl("a", { href: apiUrl, target: "_blank", rel: "noopener noreferrer", text: t(options.lang, "Rızalarımı görüntüle", "View my consents") })
      apiLink.setAttribute("translate", "no")
      apiLink.style.cssText = "display:inline-block;margin-top:8px;color:inherit;text-decoration:underline;font-size:12px;"
      dsarWrap.appendChild(apiLink)
      m.appendChild(dsarWrap)

      m.appendChild(mActions)

      modal = m
      backdrop.style.pointerEvents = "auto"
      backdrop.style.background = "rgba(0,0,0,.35)"
      backdrop.addEventListener("click", function () {
        if (modal && modal.parentNode) modal.parentNode.removeChild(modal)
        modal = null
        if (position === "bottom") {
          backdrop.style.pointerEvents = "none"
          backdrop.style.background = "transparent"
        }
      })
      root.appendChild(modal)
    }

    var __api = {
      openPreferences: openPreferences,
      withdraw: function () {
        submit("withdraw", { necessary: true, analytics: false, marketing: false, functional: false })
      },
      getDeviceId: getDeviceId,
    }
    safe(function () {
      window.__vionCmp = __api
    })

    ensurePreferencesButton({ lang: options.lang, openPreferences: openPreferences })

    if (!shouldShowBanner(domain.id, policy.id, revisitDays)) {
      var stored = loadStoredConsent(domain.id)
      if (stored && stored.policyVersionId === policy.id && stored.choices) {
        applyConsentMode(stored.choices)
        applyTagGating(stored.choices)
      }
      return
    }

    var categories = (preferenceSettings.categories || {})
    var allowed = {
      analytics: Boolean(categories.analytics && categories.analytics.enabled),
      marketing: Boolean(categories.marketing && categories.marketing.enabled),
      functional: Boolean(categories.functional && categories.functional.enabled),
    }

    var defaultChoices = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    }

    var root = createEl("div", { id: "cmp-root" })
    root.style.setProperty("--cmp-primary", primaryColor)

    var backdrop = createEl("div", { id: "cmp-backdrop" })
    if (position === "bottom") {
      backdrop.style.pointerEvents = "none"
      backdrop.style.background = "transparent"
    }

    var panel = createEl("div", { id: "cmp-panel", class: theme === "dark" ? "dark" : "" })
    var title = createEl("div", { id: "cmp-title", text: text(policy.content && policy.content.title) || "Çerez Tercihleri" })
    var desc = createEl("div", {
      id: "cmp-desc",
      text:
        text(policy.content && policy.content.bannerDescription) ||
        "Sitenin çalışması için zorunlu çerezler kullanılır. Diğer kategoriler için tercihini seçebilirsin.",
    })

    var actions = createEl("div", { id: "cmp-actions" })
    var btnReject = createEl("button", { class: "cmp-btn ghost", type: "button", text: "Reddet" })
    var btnPrefs = createEl("button", { class: "cmp-btn", type: "button", text: "Tercihler" })
    var btnAccept = createEl("button", { class: "cmp-btn primary", type: "button", text: "Kabul et" })

    actions.appendChild(btnReject)
    actions.appendChild(btnPrefs)
    actions.appendChild(btnAccept)

    panel.appendChild(title)
    panel.appendChild(desc)
    panel.appendChild(actions)

    var modal = null

    

    btnAccept.addEventListener("click", function () {
      submit("accept_all", {
        necessary: true,
        analytics: allowed.analytics,
        marketing: allowed.marketing,
        functional: allowed.functional,
      })
    })

    btnReject.addEventListener("click", function () {
      submit("reject_all", {
        necessary: true,
        analytics: false,
        marketing: false,
        functional: false,
      })
    })

    btnPrefs.addEventListener("click", function () {
      openPreferences()
    })

    root.appendChild(backdrop)
    if (position === "center") {
      root.appendChild(panel)
      panel.style.top = "50%"
      panel.style.left = "50%"
      panel.style.right = "auto"
      panel.style.bottom = "auto"
      panel.style.transform = "translate(-50%,-50%)"
      backdrop.style.pointerEvents = "auto"
    } else {
      root.appendChild(panel)
    }

    document.body.appendChild(root)
  }

  function boot() {
    var hostname = (location.hostname || "").toLowerCase()
    if (!hostname) return
    var lang = getLang()

    fetch("/api/cmp/public/config?hostname=" + encodeURIComponent(hostname) + "&lang=" + encodeURIComponent(lang))
      .then(function (r) {
        if (!r.ok) return null
        return r.json()
      })
      .then(function (data) {
        if (!data || !data.domain || !data.policy) return
        renderCmp({ domain: data.domain, config: data.config, policy: data.policy, writeToken: data.writeToken || null, lang: lang })
      })
      .catch(function () {
        return null
      })
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot)
  } else {
    boot()
  }
})()
