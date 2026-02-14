(function () {
  // Find the current script tag to extract configuration
  // Fallback for async scripts where document.currentScript might be null
  const currentScript = document.currentScript || document.querySelector('script[src*="/widget.js"]');

  if (!currentScript) {
    console.error('Userex Widget: Could not find script tag to initialize.');
    return;
  }

  const scriptSrc = currentScript.src;
  const baseUrl = new URL(scriptSrc).origin; // Dynamically get base URL

  const attrColor = currentScript.getAttribute('data-color');
  const chatbotId = currentScript.getAttribute('data-chatbot-id') || 'default';

  console.log('Userex Widget Initializing...');
  console.log('Chatbot ID:', chatbotId);

  // Default Settings
  let settings = {
    primaryColor: attrColor || '#000000',
    position: 'bottom-right',
    viewMode: 'classic',
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
    launcherHoverEffect: 'scale'
  };

  // Global Context Data
  let dynamicContextData = {};

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
      // If legacy field exists, us it. Or check specific flag.
      // Assuming settings.enableProactiveMessaging matches backend mapping.
      if (!this.settings.enableProactiveMessaging) return;

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
      // Check if widget is already open
      const container = document.getElementById('userex-chatbot-container');
      const isWidgetOpen = container && container.style.display && container.style.display !== 'none';

      if (isWidgetOpen) return;

      // Check if bubble already exists and is visible in DOM
      const existingBubble = document.getElementById('userex-engagement-bubble');
      if (existingBubble) {
        console.log('Engagement: Bubble already visible, skipping');
        return;
      }

      // Clean up stale reference if it exists but not in DOM
      if (this.bubble && !document.body.contains(this.bubble)) {
        this.bubble = null;
        this.currentMessageText = null;
      }

      // Determine message
      let message = specificMsg;
      if (!message) {
        if (this.pendingQueue && this.pendingQueue.length > 0) {
          message = this.pendingQueue.shift();
        } else if (this.messageQueue && this.messageQueue.length > 0) {
          message = this.messageQueue[Math.floor(Math.random() * this.messageQueue.length)];
        }
      }

      if (!message) return;

      // If bubble is already open with same message, ignore
      if (this.bubble && this.currentMessageText === message.text) return;

      this.currentMessageText = message.text;
      this.hasShown = true;

      // Increment session counter (no per-page restriction anymore)
      const shownCount = parseInt(sessionStorage.getItem(this.shownCountKey) || '0');
      sessionStorage.setItem(this.shownCountKey, (shownCount + 1).toString());

      // Send event to chatbot iframe
      const iframe = document.querySelector('#userex-chatbot-container iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'USEREX_ENGAGEMENT_SHOWN',
          message: message.text,
          trigger: triggerSource || 'auto'
        }, '*');
      }

      // Note: We do NOT call cleanup() here anymore to allow subsequent scheduled messages to fire.

      // Get bubble config
      const bubble = this.settings.bubble;
      const position = bubble.position || 'top';
      const style = bubble.style || {};
      const animation = bubble.animation || 'bounce';

      // If bubble exists, update it
      if (this.bubble) {
        const content = this.bubble.querySelector('.bubble-content');
        if (content) {
          content.textContent = message.text;
          // Re-trigger animation
          if (animation && animation !== 'none') {
            this.bubble.classList.remove(`userex-eng-${animation}`);
            this.bubble.classList.remove(`userex-eng-${animation}-center`);
            void this.bubble.offsetWidth; // trigger reflow
            const animationClass = this.isBubbleCentered ? `userex-eng-${animation}-center` : `userex-eng-${animation}`;
            this.bubble.classList.add(animationClass);
          }
          // Reset auto-dismiss timer if updated
          // (This logic below handles the timer, but we should clear PREVIOUS timer if updating bubble? 
          //  Usually showBubble creates new timer. Yes.)
        }
      } else {
        // Create bubble element (Logic mostly same, just ensuring else block covers creation)
        // Actually, lines 477-549 in original handle creation. I am replacing the WHOLE showBubble function start to end?
        // No, I am replacing lines 413-570.
        // Wait, 'else' block logic is needed?
        // Line 461 checks `if (this.bubble)`. If true, it updates and returns. 
        // Wait, line 473 is `return;`.
        // So if bubble exists, it updates and returns.
        // The auto-dismiss logic is at the END of function (lines 564+).
        // If we return early at 473, auto-dismiss logic IS NOT REACHED?
        // This is a bug in original code if updating bubble doesn't reset timer.
        // I should fix that.
      }

      // ... I need to be careful. The replacement chunks should be precise.
      // I will replace the start of function signature.
      // And then replace the end of function (auto-dismiss).
      // Splitting this into smaller chunks is safer.

      // Chunk 3a: Signature
      // Chunk 3b: Event dispatch (triggerSource)
      // Chunk 3c: Auto-dismiss logic

      // Let's restart the arguments for this tool call to be safer.

      const messageText = message.text;

      // Create bubble element
      this.bubble = document.createElement('div');
      this.bubble.id = 'userex-engagement-bubble';
      this.bubble.innerHTML = `
        <div class="bubble-content">${messageText}</div>
        <button class="bubble-close" aria-label="Close">×</button>
      `;

      // Apply styles
      const borderRadius = style.borderRadius !== undefined ? style.borderRadius : 12;
      const shadows = {
        'none': 'none',
        'small': '0 2px 8px rgba(0,0,0,0.1)',
        'medium': '0 4px 12px rgba(0,0,0,0.15)',
        'large': '0 8px 24px rgba(0,0,0,0.2)',
        'glow': `0 0 15px ${style.backgroundColor || '#000000'}60`
      };

      // Effect Logic
      let backgroundStyle = `background-color: ${style.backgroundColor || '#000000'};`;
      let backdropFilter = '';
      let borderStyle = 'border: 1px solid rgba(0,0,0,0.05);'; /* Subtle default border */
      let boxShadow = shadows[style.shadow] || shadows.medium;
      let textColor = style.textColor || '#FFFFFF';

      if (style.effect === 'glass') {
        // Glassmorphism
        backgroundStyle = `background: ${this.hexToRgba(style.backgroundColor || '#000000', 0.65)};`;
        backdropFilter = `backdrop-filter: blur(${style.backdropBlur || 12}px); -webkit-backdrop-filter: blur(${style.backdropBlur || 12}px);`;
        borderStyle = `border: 1px solid ${this.hexToRgba(style.textColor || '#FFFFFF', 0.15)};`;
      } else if (style.effect === 'gradient') {
        // Advanced Gradient Generation
        const baseColor = style.backgroundColor || '#000000';
        const color2 = this.adjustColorBrightness(baseColor, -40); // Darker variant
        backgroundStyle = `background: linear-gradient(135deg, ${baseColor} 0%, ${color2} 100%);`;
        borderStyle = 'border: none;';
      } else if (style.effect === 'outline') {
        // Outline Style
        backgroundStyle = `background-color: ${style.backgroundColor || '#FFFFFF'};`; // Should usually be white or transparent
        borderStyle = `border: 2px solid ${textColor};`;
        // Ensure text color is used for border if no specific border color is set (usually same)
      }

      // Shape Logic
      let borderRad = `${borderRadius}px`;
      if (style.shape === 'pill') borderRad = '9999px';
      if (style.shape === 'square') borderRad = '0px'; // Strictly square
      if (style.shape === 'speech') borderRad = `${borderRadius}px ${borderRadius}px ${borderRadius}px 4px`;

      this.bubble.style.cssText = `
        position: fixed;
        z-index: 9998;
        ${backgroundStyle}
        ${backdropFilter}
        color: ${textColor};
        padding: 14px 18px;
        border-radius: ${borderRad};
        box-shadow: ${boxShadow};
        cursor: pointer;
        max-width: 300px;
        font-family: ${style.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
        font-size: ${style.fontSize || 14}px;
        line-height: 1.5;
        display: flex;
        align-items: center;
        gap: 10px;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); /* Spring-like entry */
        ${borderStyle}
      `;

      // Position bubble relative to launcher
      this.positionBubble(position);


      // Style close button (always shown now)
      const closeBtn = this.bubble.querySelector('.bubble-close');
      if (closeBtn) {
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
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.7');
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.hideBubble();
        });
      }

      // Add to DOM
      document.body.appendChild(this.bubble);

      // Update last shown time for frequency tracking
      sessionStorage.setItem(this.lastBubbleTimeKey, Date.now().toString());

      // Trigger animation entry
      setTimeout(() => {
        this.bubble.style.opacity = '1';
        this.bubble.style.transform = this.isBubbleCentered ? 'translate(-50%, 0)' : 'translateY(0)';
      }, 10);

      if (animation && animation !== 'none') {
        this.addAnimationStyles();
        setTimeout(() => {
          const animationClass = this.isBubbleCentered ? `userex-eng-${animation}-center` : `userex-eng-${animation}`;
          this.bubble.classList.add(animationClass);
        }, 300);
      }

      // Click handler - open chat
      this.bubble.addEventListener('click', () => {
        console.log('Engagement bubble clicked - opening chat');
        // Mark conversation as started - no more bubbles
        sessionStorage.setItem(this.conversationStartedKey, 'true');

        const launcher = document.getElementById('userex-chatbot-launcher');
        if (launcher) {
          launcher.click();
        }
        this.hideBubble();

        // Notify iframe
        const iframe = document.querySelector('#userex-chatbot-container iframe');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'USEREX_BUBBLE_CLICKED',
            message: messageText
          }, '*');
        }

        this.hideBubble();
      });


      // Auto dismiss
      // 1. Check message-specific duration first
      let dismissDelay = null;
      if (typeof message === 'object' && message.duration !== undefined && message.duration > 0) {
        dismissDelay = message.duration * 1000;
        console.log(`Engagement: Using message-specific duration: ${message.duration}s`);
      } else if (bubble.autoDismiss) {
        // 2. Fallback to global setting
        dismissDelay = (bubble.autoDismissDelay || 10) * 1000;
      }

      if (dismissDelay) {
        setTimeout(() => {
          this.hideBubble();

          // Sequential Chaining: Show next message if available
          if (triggerSource) {
            const nextMsg = this.getNextMessage(triggerSource);
            if (nextMsg) {
              console.log(`Engagement: Chaining next message for ${triggerSource}`);
              // Small delay for better UX (fade out then fade in)
              setTimeout(() => {
                this.showBubble(nextMsg, triggerSource);
              }, 500);
            }
          }
        }, dismissDelay);
      }
    }

    positionBubble(position) {
      const launcher = document.getElementById('userex-chatbot-launcher');
      if (!launcher) return;

      const launcherRect = launcher.getBoundingClientRect();
      const bubbleWidth = 280;
      const gap = 16;

      // Default to non-centered
      this.isBubbleCentered = false;

      // Dynamic Alignment Logic based on Launcher Position
      if (position === 'top') {
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
          default:
            // Default check (fallback to Right-Aligned Top if unknown)
            this.bubble.style.bottom = `${window.innerHeight - launcherRect.top + gap}px`;
            this.bubble.style.right = `${window.innerWidth - launcherRect.right}px`;
            break;
        }
      }


      // Mobile adjustments
      if (isMobileDevice()) {
        this.bubble.style.maxWidth = 'calc(100vw - 40px)';
        // On mobile, if centered, keep it centered? Or default to full width behaviors?
        // Usually mobile uses specific styles injected in addMobileStyles
      }
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

        .userex-eng-bounce {
          animation: userex-eng-bounce 1.5s ease-in-out infinite;
        }
        .userex-eng-pulse {
          animation: userex-eng-pulse 2s ease-in-out infinite;
        }
        .userex-eng-shake {
          animation: userex-eng-shake 0.5s ease-in-out infinite;
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
      `;
      document.head.appendChild(style);
    }






    hideBubble() {
      if (!this.bubble) return;

      this.bubble.style.opacity = '0';
      this.bubble.style.transform = 'translateY(20px)';

      setTimeout(() => {
        if (this.bubble && this.bubble.parentNode) {
          this.bubble.parentNode.removeChild(this.bubble);
        }
        this.bubble = null;
      }, 300);
    }

    cleanup() {
      // Clear all timers
      this.timers.forEach(timer => clearTimeout(timer));
      this.timers = [];

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
    }

    scan() {
      let changed = false;

      this.selectors.forEach(({ key, selector }) => {
        if (!key || !selector) return;
        
        try {
            const el = document.querySelector(selector);
            
            // Element found for the first time or changed reference
            if (el && el !== this.elements.get(selector)) {
                // console.log(`DynamicContext: Found element for "${key}"`, el);
                this.elements.set(selector, el);
                this.observeElement(el, key, selector);
                
                // Extract initial value
                const val = this.readElementValue(el);
                // console.log(`DynamicContext: Initial value for "${key}" -> "${val}"`);
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
            }
        } catch (e) {
            console.warn(`DynamicContext: Invalid selector "${selector}"`, e);
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
                // console.log(`DynamicContext: Value changed for "${key}" -> "${newVal}"`);
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
    if (document.getElementById('userex-chatbot-launcher')) {
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
    
    let verticalSpacing = settings.bottomSpacing !== undefined ? settings.bottomSpacing : 20;
    let sideSpacing = settings.sideSpacing !== undefined ? settings.sideSpacing : 20;

    if (isMobile) {
      // Use configured mobile spacing if available, otherwise default to 20 or desktop value (fallback)
      verticalSpacing = settings.mobileBottomSpacing !== undefined ? settings.mobileBottomSpacing : 20;
      sideSpacing = settings.mobileSideSpacing !== undefined ? settings.mobileSideSpacing : 20;
    }

    // Mobile Styles Injection
    const addMobileStyles = () => {
      if (document.getElementById('userex-mobile-styles')) return;
      const style = document.createElement('style');
      style.id = 'userex-mobile-styles';
      style.innerHTML = `
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
        `;
      document.head.appendChild(style);
    };

    if (settings.launcherAnimation !== 'none' || (settings.mobileLauncherAnimation && settings.mobileLauncherAnimation !== 'none')) {
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

    const renderLauncherContent = (isOpen) => {
      if (isOpen) {
        launcher.innerHTML = closeSvg;

        // Fix: Even if it is fullImage, when open, we want a visible close button.
        // We revert the background, shadow, and DIMENSIONS to match standard style so the white 'X' is visible.
        if (settings.launcherType === 'fullImage') {
          launcher.style.backgroundColor = settings.launcherBackgroundColor || settings.brandColor || settings.primaryColor || '#000000';
          launcher.style.boxShadow = shadowStyle;
          launcher.style.borderRadius = '50%'; // Make it circular
          // Force standard dimensions for the close button (Standard default is 60px)
          // We intentionally ignore settings.launcherWidth here because in fullImage mode that controls the image size (which can be large)
          launcher.style.width = '60px';
          launcher.style.height = '60px';
        }
        return;
      }

      // Reset styles for Full Image mode when closed (transparent, no shadow, etc)
      // Reset styles for Full Image mode when closed (transparent, no shadow, etc)
      if (settings.launcherType === 'fullImage') {
        launcher.style.backgroundColor = 'transparent';
        launcher.style.boxShadow = 'none';
        launcher.style.borderRadius = '0';
        // Reset dimensions to full image size (handled by image content usually, but let's ensure we don't force standard size if it was different)
        // Actually, for fullImage, width/height are set in initial styles based on settings or content. 
        // We just need to ensure we don't keep the forced dimensions if they differ.
        // We just need to ensure we don't keep the forced dimensions if they differ.
        // Re-applying basic style logic from initialization.
        launcher.style.width = `${settings.fullImageLauncherWidth || 60}px`;
        launcher.style.height = `${settings.fullImageLauncherHeight || 60}px`;
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

    renderLauncherContent(false);

    // Hover effect
    launcher.onmouseenter = () => {
      // Handle hover effect based on launcherHoverEffect setting
      if (settings.launcherHoverEffect === 'none') return;

      if (settings.launcherHoverEffect === 'opacity') {
        launcher.style.opacity = '0.8';
        return;
      }

      // Default: scale effect
      // Default: scale effect
      // Simplified: Container handles position, so just scale relative
      launcher.style.transform = 'scale(1.05)';
    };
    launcher.onmouseleave = () => {
      launcher.style.opacity = '1';
      launcher.style.transform = 'scale(1)';
    };

    // Auto Collapse Logic for Icon + Text
    if (isAutoCollapseEnabled) {
      // Initial collapse after a short idle window.
      scheduleCollapse(5000);

      const originalEnter = launcher.onmouseenter;
      launcher.onmouseenter = (e) => {
        if (originalEnter) originalEnter(e);
        clearCollapseTimer();
        expandLauncher();
      };

      const originalLeave = launcher.onmouseleave;
      launcher.onmouseleave = (e) => {
        if (originalLeave) originalLeave(e);
        if (!isOpen) {
          scheduleCollapse(3000);
        }
      };
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
      display: 'none',
      backgroundColor: '#fff',
      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
    });

    // Apply View Mode Styles
    if (settings.viewMode === 'wide') {
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

      // Calculate effective height for positioning
      // If fullImage, the "closed" launcher is large, but when open it becomes a 60px close button.
      // So the widget should be positioned relative to that 60px button to avoid a huge gap.
      const effectiveHeight = settings.launcherType === 'fullImage' ? 60 : settings.launcherHeight;

      if (isTop) {
        classicVerticalStyle = { top: `${verticalSpacing + effectiveHeight + 24}px`, bottom: 'auto' };
      } else if (isBottom) {
        classicVerticalStyle = { bottom: `${verticalSpacing + effectiveHeight + 24}px`, top: 'auto' };
      } else if (isMiddle) {
        // For middle, we place it next to the launcher
        classicVerticalStyle = { top: '50%', transform: 'translateY(-50%)' };
        // Adjust horizontal to be next to launcher
        if (isLeft) {
          Object.assign(horizontalStyle, { left: `${sideSpacing + settings.launcherWidth + 10}px`, right: 'auto' });
        } else if (isRight) {
          Object.assign(horizontalStyle, { right: `${sideSpacing + settings.launcherWidth + 10}px`, left: 'auto' });
        } else if (isCenter) {
          // Middle Center - place it below (or above if not enough space, but let's default to below for now)
          classicVerticalStyle = { top: '50%', transform: 'translate(-50%, -50%)' }; // Centered on screen
          // Actually for classic view in middle center, maybe just center it?
          // Let's offset it slightly so it doesn't cover the launcher if possible, or just center it over.
          // Let's center it completely.
          horizontalStyle = { left: '50%', transform: 'translate(-50%, -50%)', right: 'auto' };
          classicVerticalStyle = { top: '50%', bottom: 'auto' };
        }
      }

      Object.assign(iframeContainer.style, {
        width: '420px',
        height: '700px',
        maxHeight: '85vh',
        ...horizontalStyle,
        ...classicVerticalStyle
      });
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

    if (!isAvailable && settings.offlineMessage) {
      iframeSrc += `&offlineMessage=${encodeURIComponent(settings.offlineMessage)}`;
    }
    iframe.src = iframeSrc;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.allow = 'microphone; camera; autoplay';

    iframeContainer.appendChild(iframe);

    // Toggle Logic
    let isOpen = false;
    const toggleWidget = (forceState) => {
      isOpen = forceState !== undefined ? forceState : !isOpen;

      // GA Tracking
      if (isOpen && typeof window.gtag === 'function') {
        window.gtag('event', 'chat_widget_open', {
             'event_category': 'Chatbot',
             'event_label': chatbotId
        });
      }

      iframeContainer.style.display = isOpen ? 'block' : 'none';

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

    launcher.onclick = () => toggleWidget();

    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
      if (event.data.type === 'USEREX_CLOSE_WIDGET') {
        toggleWidget(false);
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
    // Add Launcher to DOM
    document.body.appendChild(launcherContainer);
    launcherContainer.appendChild(launcher);
    document.body.appendChild(iframeContainer);

    // Expose public API for programmatic control
    window.UserexWidget = window.UserexWidget || {};
    window.UserexWidget.open = function() { toggleWidget(true); };
    window.UserexWidget.close = function() { toggleWidget(false); };
    window.UserexWidget.toggle = function() { toggleWidget(); };

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
        const newBottom = isNowMobile ? (settings.mobileBottomSpacing ?? 20) : (settings.bottomSpacing ?? 20);
        const newSide = isNowMobile ? (settings.mobileSideSpacing ?? 20) : (settings.sideSpacing ?? 20);
        
        let newVertStyle = {};
        if (isTop) {
            newVertStyle = { top: `${newBottom}px`, bottom: 'auto' };
        } else if (isBottom) {
            newVertStyle = { bottom: `${newBottom}px`, top: 'auto' };
        } else if (isMiddle) {
             newVertStyle = { top: '50%', transform: `translateY(calc(-50% - ${settings.launcherHeight / 2}px))`, bottom: 'auto' }; // Approximate re-calc
        }

        let newHorizStyle = {};
        if (isLeft) {
            newHorizStyle = { left: `${newSide}px`, right: 'auto' };
        } else if (isRight) {
            newHorizStyle = { right: `${newSide}px`, left: 'auto' };
        } else if (isCenter) {
             newHorizStyle = { left: '50%', transform: 'translateX(-50%)', right: 'auto' };
        }

        // Apply new positioning
        Object.assign(launcherContainer.style, { ...newHorizStyle, ...newVertStyle });
        
        // 2. Update Animation
        const newAnim = isNowMobile ? (settings.mobileLauncherAnimation || 'none') : (settings.launcherAnimation || 'none');
        launcher.classList.remove('userex-anim-pulse', 'userex-anim-bounce', 'userex-anim-wiggle', 'userex-anim-float', 'userex-anim-spin');
        
        if (newAnim !== 'none') {
            launcher.classList.add(`userex-anim-${newAnim}`);
        }
    });

    // Initialize Engagement Controller if enabled
    if (settings.engagement && settings.engagement.enabled) {
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
    if (settings.enableDynamicContext && settings.dynamicContextSelectors) {
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
    if (isAvailable) {
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
      isLoggedIn: false,
      name: null,
      email: null
    };

    // Method 1: Check script data attributes
    if (currentScript) {
      const loggedIn = currentScript.getAttribute('data-user-logged-in');
      if (loggedIn === 'true') {
        userData.isLoggedIn = true;
        userData.name = currentScript.getAttribute('data-user-name') || null;
        userData.email = currentScript.getAttribute('data-user-email') || null;
      }
    }

    // Method 2: Check global UserexWidget API
    if (window.UserexWidget && window.UserexWidget.userData) {
      const apiData = window.UserexWidget.userData;
      if (apiData.isLoggedIn) {
        userData.isLoggedIn = true;
        userData.name = apiData.name || userData.name;
        userData.email = apiData.email || userData.email;
      }
    }

    return userData;
  }

  // Helper to scrape metadata
  function getPageContext() {
    return {
      url: window.location.href,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || '',
      productName: document.querySelector('meta[property="og:title"]')?.content || document.title,
      productImage: document.querySelector('meta[property="og:image"]')?.content || '',
      productPrice: document.querySelector('meta[property="product:price:amount"]')?.content || '',
      // NEW: Page type detection
      pageType: detectPageType(),
      // NEW: User login status
      user: getUserData(),
      // NEW: Dynamic Data
      dynamicData: dynamicContextData
    };
  }

  // Expose global API for dynamic user updates
  window.UserexWidget = window.UserexWidget || {};
  window.UserexWidget.setUser = function (userData) {
    window.UserexWidget.userData = userData;
    sendContextUpdate(); // Immediately notify chatbot of user change
  };

  // setContext code integration is intentionally disabled.
  window.UserexWidget.setContext = function () {
    console.warn('UserexWidget.setContext is disabled. Use Dynamic Context Selector Mode from dashboard.');
  };

  // Send context update to iframe
  function sendContextUpdate() {
    const iframe = document.querySelector('#userex-chatbot-container iframe');
    if (iframe && iframe.contentWindow) {
      const context = getPageContext();
      iframe.contentWindow.postMessage({
        type: 'USEREX_CONTEXT_UPDATE',
        context: context
      }, '*');
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

  // Helper: Fetch Settings
  async function fetchSettings() {
    try {
      const response = await fetch(`${baseUrl}/api/widget-settings?chatbotId=${chatbotId}&t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      return await response.json();
    } catch (error) {
      console.warn('Userex Widget: Using default settings (Fetch failed)', error);
      return {};
    }
  }

  // Bootstrap Function
  async function bootstrap() {
    const fetchedSettings = await fetchSettings();
    
    // STRICT CHECK: If disabled, abort
    if (fetchedSettings.isEnabled === false) {
      console.warn('Userex Widget is disabled for this account.');
      return; 
    }
    
    // Merge fetched settings into global settings object
    settings = {
      ...settings,
      ...fetchedSettings
    };
    
    console.log('Userex Widget: Configuration loaded');
    initWidget();
  }

  // Start Initialization
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bootstrap();
  } else {
    document.addEventListener('DOMContentLoaded', bootstrap);
  }

})();
