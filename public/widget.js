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
    constructor(settings, baseUrl, chatbotId) {
      if (!settings || !settings.enabled) {
        return;
      }

      this.settings = settings;
      this.baseUrl = baseUrl;
      this.chatbotId = chatbotId;
      this.bubble = null;
      this.hasShown = false;
      this.timers = [];
      this.listeners = [];
      this.targetMessage = null; // Store selected message

      // Session storage keys
      this.shownCountKey = `userex_eng_shown_${chatbotId}`;
      this.visitCountKey = `userex_eng_visits_${chatbotId}`;

      // Check if we've exceeded max shows
      const shownCount = parseInt(sessionStorage.getItem(this.shownCountKey) || '0');
      if (shownCount >= (settings.bubble.maxShowCount || 3)) {
        console.log('Engagement: Max shows reached for this session');
        return;
      }

      this.init();
    }

    init() {
      if (!this.settings) return;

      console.log('Engagement Controller initialized', this.settings);

      // Pre-select message to determine delay if needed
      this.selectMessage();

      this.setupTriggers();
    }

    selectMessage() {
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

    setupTriggers() {
      const triggers = this.settings.triggers;

      // 1. Schedule Time-based Messages (Sequential)
      if (this.messageQueue && this.messageQueue.length > 0) {
        this.messageQueue.forEach(msg => {
          // Schedule purely based on message delay
          if (msg.delay !== undefined) {
            const timer = setTimeout(() => {
              console.log(`Engagement: Delay trigger fired for message: "${msg.text}"`);
              this.showBubble(msg);
            }, (msg.delay || 0) * 1000);
            this.timers.push(timer);
          }
        });
      }

      // 2. Scroll Depth Trigger
      if (triggers.scrollDepth && triggers.scrollDepth > 0) {
        const checkScroll = () => {
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (scrollHeight <= 0) return;

          const scrolled = (window.scrollY / scrollHeight) * 100;
          if (scrolled >= triggers.scrollDepth) {
            console.log('Engagement: Scroll depth trigger fired');
            this.showBubble(); // Shows next generic
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
          if (e.clientY <= 5) {
            console.log('Engagement: Exit intent trigger fired');
            this.showBubble();
          }
        };
        document.addEventListener('mouseleave', handleMouseLeave);
        this.listeners.push({ event: 'mouseleave', handler: handleMouseLeave, target: document });
      }

      // 4. Page Revisit Trigger
      if (triggers.pageRevisit && triggers.pageRevisit > 0) {
        let visits = parseInt(localStorage.getItem(this.visitCountKey) || '0');
        visits++;
        localStorage.setItem(this.visitCountKey, visits.toString());

        if (visits >= triggers.pageRevisit) {
          console.log('Engagement: Page revisit trigger fired', visits);
          this.showBubble();
        }
      }

      // 5. Inactivity Trigger
      if (triggers.inactivity && triggers.inactivity > 0) {
        let inactivityTimer;
        const resetTimer = () => {
          clearTimeout(inactivityTimer);
          inactivityTimer = setTimeout(() => {
            console.log('Engagement: Inactivity trigger fired');
            this.showBubble();
          }, triggers.inactivity * 1000);
        };

        ['mousemove', 'keypress', 'scroll', 'click', 'touchstart'].forEach(event => {
          const handler = debounce(resetTimer, 500);
          document.addEventListener(event, handler);
          this.listeners.push({ event, handler, target: document });
        });

        resetTimer();
      }
    }

    showBubble(specificMsg = null) {
      // Check if widget is already open
      const container = document.getElementById('userex-chatbot-container');
      const isWidgetOpen = container && container.style.display && container.style.display !== 'none';

      if (isWidgetOpen) return;

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

      // Increment session counter
      const shownCount = parseInt(sessionStorage.getItem(this.shownCountKey) || '0');
      sessionStorage.setItem(this.shownCountKey, (shownCount + 1).toString());

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
            void this.bubble.offsetWidth; // trigger reflow
            this.bubble.classList.add(`userex-eng-${animation}`);
          }
          return;
        }
      }

      const messageText = message.text;

      // Create bubble element
      this.bubble = document.createElement('div');
      this.bubble.id = 'userex-engagement-bubble';
      this.bubble.innerHTML = `
        <div class="bubble-content">${messageText}</div>
        ${bubble.showCloseButton ? '<button class="bubble-close" aria-label="Close">×</button>' : ''}
      `;

      // Apply styles
      const borderRadius = style.borderRadius !== undefined ? style.borderRadius : 12;
      const shadows = {
        'none': 'none',
        'small': '0 2px 8px rgba(0,0,0,0.1)',
        'medium': '0 4px 12px rgba(0,0,0,0.15)',
        'large': '0 8px 24px rgba(0,0,0,0.2)'
      };

      this.bubble.style.cssText = `
        position: fixed;
        z-index: 999998;
        background-color: ${style.backgroundColor || '#000000'};
        color: ${style.textColor || '#FFFFFF'};
        padding: 12px 16px;
        border-radius: ${borderRadius}px;
        box-shadow: ${shadows[style.shadow] || shadows.medium};
        cursor: pointer;
        max-width: 280px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      `;

      // Position bubble relative to launcher
      this.positionBubble(position);

      // Style close button if exists
      if (bubble.showCloseButton) {
        const closeBtn = this.bubble.querySelector('.bubble-close');
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

      // Trigger animation entry
      setTimeout(() => {
        this.bubble.style.opacity = '1';
        this.bubble.style.transform = 'translateY(0)';
      }, 10);

      // Apply CSS animation
      if (animation && animation !== 'none') {
        this.addAnimationStyles();
        setTimeout(() => {
          this.bubble.classList.add(`userex-eng-${animation}`);
        }, 300);
      }

      // Click handler - open chat
      this.bubble.addEventListener('click', () => {
        console.log('Engagement bubble clicked - opening chat');
        const launcher = document.getElementById('userex-chatbot-launcher');
        if (launcher) {
          launcher.click();
        }
        this.hideBubble();
      });

      // Auto dismiss
      if (bubble.autoDismiss) {
        const delay = (bubble.autoDismissDelay || 10) * 1000;
        setTimeout(() => {
          this.hideBubble();
        }, delay);
      }
    }

    positionBubble(position) {
      const launcher = document.getElementById('userex-chatbot-launcher');
      if (!launcher) return;

      const launcherRect = launcher.getBoundingClientRect();
      const bubbleWidth = 280;
      const gap = 16;

      switch (position) {
        case 'top':
          // Above launcher
          this.bubble.style.bottom = `${window.innerHeight - launcherRect.top + gap}px`;
          this.bubble.style.right = `${window.innerWidth - launcherRect.right}px`;
          break;
        case 'left':
          // Left of launcher
          this.bubble.style.bottom = `${window.innerHeight - launcherRect.bottom}px`;
          this.bubble.style.right = `${window.innerWidth - launcherRect.left + gap}px`;
          break;
        case 'right':
          // Right of launcher  
          this.bubble.style.bottom = `${window.innerHeight - launcherRect.bottom}px`;
          this.bubble.style.left = `${launcherRect.right + gap}px`;
          break;
        default:
          // Default: top
          this.bubble.style.bottom = `${window.innerHeight - launcherRect.top + gap}px`;
          this.bubble.style.right = `${window.innerWidth - launcherRect.right}px`;
      }

      // Mobile adjustments
      if (isMobileDevice()) {
        this.bubble.style.maxWidth = 'calc(100vw - 40px)';
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
        .userex-eng-bounce {
          animation: userex-eng-bounce 1.5s ease-in-out infinite;
        }
        .userex-eng-pulse {
          animation: userex-eng-pulse 2s ease-in-out infinite;
        }
        .userex-eng-shake {
          animation: userex-eng-shake 0.5s ease-in-out infinite;
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
    if (isMobile) {
      settings.bottomSpacing = Math.max(settings.bottomSpacing, 20); // Ensure at least 20px
      settings.sideSpacing = Math.max(settings.sideSpacing, 20); // Ensure at least 20px
    }

    const verticalSpacing = settings.bottomSpacing !== undefined ? settings.bottomSpacing : 20;
    const sideSpacing = settings.sideSpacing !== undefined ? settings.sideSpacing : 20;

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

    if (settings.launcherAnimation !== 'none') {
      addAnimationStyles();
    }

    // Create Launcher Button
    const launcher = document.createElement('div');
    launcher.id = 'userex-chatbot-launcher';

    // Voice Launcher Logic
    if (settings.enableVoiceAssistant) {
      const voiceLauncher = document.createElement('div');
      voiceLauncher.id = 'userex-voice-launcher';
      const vlHeight = 50;
      const vlWidth = 50;

      Object.assign(voiceLauncher.style, {
        position: 'fixed',
        width: `${vlWidth}px`,
        height: `${vlHeight}px`,
        borderRadius: '50%',
        backgroundColor: settings.launcherBackgroundColor || settings.primaryColor || '#000000',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        zIndex: '999998',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        ...horizontalStyle,
        // Adjust vertical position to be above the main launcher
        bottom: isBottom ? `${verticalSpacing + settings.launcherHeight + 16}px` : 'auto',
        top: isTop ? `${verticalSpacing + settings.launcherHeight + 16}px` : 'auto',
      });

      // Adjust if centered or middle (simplified for now: stacks vertically)
      if (isMiddle) {
        voiceLauncher.style.transform = `translateY(calc(-50% - ${settings.launcherHeight / 2 + 10}px))`;
      }

      voiceLauncher.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${settings.launcherIconColor || '#FFFFFF'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
        `;

      // Add subtle pulse animation
      voiceLauncher.classList.add('userex-anim-pulse');

      voiceLauncher.onclick = (e) => {
        e.stopPropagation();
        toggleVoiceInterface();
      };

      // Hover effect
      voiceLauncher.onmouseenter = () => { voiceLauncher.style.transform = (voiceLauncher.style.transform || '') + ' scale(1.1)'; };
      voiceLauncher.onmouseleave = () => { voiceLauncher.style.transform = (voiceLauncher.style.transform || '').replace(' scale(1.1)', ''); };

      document.body.appendChild(voiceLauncher);
    }

    // Main Launcher Styles
    const isTextMode = settings.launcherStyle === 'text' || settings.launcherStyle === 'icon_text';

    Object.assign(launcher.style, {
      position: 'fixed',
      width: isTextMode ? 'auto' : `${settings.launcherWidth}px`,
      minWidth: isTextMode ? `${settings.launcherWidth}px` : undefined,
      height: `${settings.launcherHeight}px`,
      padding: isTextMode ? '0 24px' : '0',
      borderRadius: `${settings.launcherRadius}px`,
      backgroundColor: settings.launcherBackgroundColor || settings.brandColor,
      boxShadow: shadowStyle,
      cursor: 'pointer',
      zIndex: '999999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
      ...horizontalStyle,
      ...verticalStyle
    });

    const isTextStyle = settings.launcherStyle === 'text' || settings.launcherStyle === 'icon_text';

    // Icon rendering
    let iconHtml = '';
    if (settings.launcherIcon === 'custom' && settings.launcherIconUrl) {
      // Custom uploaded icon
      iconHtml = `<img src="${settings.launcherIconUrl}" style="width: 24px; height: 24px; object-fit: contain;" alt="Icon" />`;
    } else if (settings.launcherIconUrl && settings.launcherIconUrl.trim() !== '') {
      // Legacy: Custom icon URL (for backward compatibility)
      iconHtml = `<img src="${settings.launcherIconUrl}" style="width: 24px; height: 24px; object-fit: contain;" alt="Icon" />`;
    } else if (settings.launcherIcon === 'sparkles') {
      iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
    } else if (settings.launcherIcon === 'library' && settings.launcherLibraryIcon) {
      // Fetch icon SVG from lucide (we'll use a simple mapping or fetch for now, or just embed a few common ones.
      // For a full library in vanilla JS without a bundler, we might need a CDN or a large mapping.
      // To keep it simple and robust, we will use a CDN for Lucide icons if 'library' is selected.
      // We strip '-icon' suffix and 'Lucide' prefix to ensure correct icon name generation.
      // e.g. 'LucideMessageCircle' -> 'MessageCircle' -> 'message-circle'
      // e.g. 'ActivityIcon' -> 'Activity' -> 'activity'
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
        // If script exists, try to render icons immediately (or after a short delay to ensure DOM is ready)
        setTimeout(() => window.lucide.createIcons(), 100);
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
      position: 'fixed',
      width: isTextStyle ? 'auto' : `${currentWidth}px`,
      height: `${currentHeight}px`,
      minWidth: isTextStyle ? '100px' : 'auto',
      borderRadius: settings.launcherType === 'fullImage' ? '0' : `${settings.launcherRadius}px`,
      backgroundColor: launcherBgColor,
      boxShadow: settings.launcherType === 'fullImage' ? 'none' : shadowStyle,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '2147483647',
      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: '600',
      padding: isTextStyle ? '0 20px' : '0',
      gap: '8px',
      ...horizontalStyle,
      ...verticalStyle
    });

    if (settings.launcherAnimation === 'pulse') {
      launcher.classList.add('userex-anim-pulse');
    } else if (settings.launcherAnimation === 'bounce') {
      launcher.classList.add('userex-anim-bounce');
    } else if (settings.launcherAnimation === 'wiggle') {
      launcher.classList.add('userex-anim-wiggle');
    } else if (settings.launcherAnimation === 'float') {
      launcher.classList.add('userex-anim-float');
    } else if (settings.launcherAnimation === 'spin') {
      launcher.classList.add('userex-anim-spin');
    }

    const closeSvg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

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
        launcher.innerHTML = `<span>${settings.launcherText}</span>`;
      } else if (settings.launcherStyle === 'icon_text') {
        launcher.innerHTML = `${iconHtml}<span>${settings.launcherText}</span>`;
      } else {
        // Circle or Square (Icon only)
        launcher.innerHTML = iconHtml;
      }

      if (window.lucide) {
        window.lucide.createIcons();
      }
    };

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
      let transform = 'scale(1.05)';
      if (isMiddle && isCenter) transform = 'translate(-50%, -50%) scale(1.05)';
      else if (isMiddle) transform = 'translateY(-50%) scale(1.05)';
      else if (isCenter) transform = 'translateX(-50%) scale(1.05)';
      launcher.style.transform = transform;
    };
    launcher.onmouseleave = () => {
      launcher.style.opacity = '1';
      let transform = 'scale(1)';
      if (isMiddle && isCenter) transform = 'translate(-50%, -50%) scale(1)';
      else if (isMiddle) transform = 'translateY(-50%) scale(1)';
      else if (isCenter) transform = 'translateX(-50%) scale(1)';
      launcher.style.transform = transform;
    };

    // Create Iframe Container
    const iframeContainer = document.createElement('div');
    iframeContainer.id = 'userex-chatbot-container';

    // Base styles
    Object.assign(iframeContainer.style, {
      position: 'fixed',
      boxShadow: '0 12px 40px rgba(0,0,0,0.16), 0 2px 10px rgba(0,0,0,0.06)',
      borderRadius: '24px',
      overflow: 'hidden',
      zIndex: '2147483647',
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

    iframeContainer.appendChild(iframe);

    // Toggle Logic
    let isOpen = false;
    const toggleWidget = (forceState) => {
      isOpen = forceState !== undefined ? forceState : !isOpen;
      iframeContainer.style.display = isOpen ? 'block' : 'none';

      // If opening, hide any engagement bubble
      if (isOpen && engagementController) {
        engagementController.hideBubble();
      }

      // Update icon based on state
      renderLauncherContent(isOpen);
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

    // Append to body
    document.body.appendChild(launcher);
    document.body.appendChild(iframeContainer);

    // Initialize Engagement Controller AFTER launcher is in DOM
    // Must fetch engagement settings from the global settings object
    fetch(`${baseUrl}/api/widget-settings?chatbotId=${chatbotId}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        console.log('Engagement data from API:', data.engagement);

        // Digital Waiter: Inject time-based bubbles
        let engagementSettings = data.engagement || { enabled: false, bubble: { messages: [] }, triggers: {} };

        if (data.digitalWaiter && data.digitalWaiter.aiSuggestionsEnabled) {
          console.log('Digital Waiter: AI suggestions enabled, checking time...');
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinutes = now.getMinutes();
          const currentTime = currentHour * 60 + currentMinutes; // Minutes since midnight

          const parseTime = (timeStr) => {
            if (!timeStr) return 0;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
          };

          const breakfast = data.digitalWaiter.breakfastHours || { start: '07:00', end: '11:00' };
          const lunch = data.digitalWaiter.lunchHours || { start: '11:00', end: '15:00' };
          const dinner = data.digitalWaiter.dinnerHours || { start: '18:00', end: '23:00' };

          let mealHint = null;

          if (currentTime >= parseTime(breakfast.start) && currentTime < parseTime(breakfast.end)) {
            mealHint = { text: '☀️ Günaydın! Kahvaltı menümüze göz atmak ister misiniz?', delay: 8, isActive: true, isAiGenerated: true };
          } else if (currentTime >= parseTime(lunch.start) && currentTime < parseTime(lunch.end)) {
            mealHint = { text: '🍽️ Öğle yemeği vakti! Bugünün spesiyalini sormak ister misiniz?', delay: 8, isActive: true, isAiGenerated: true };
          } else if (currentTime >= parseTime(dinner.start) && currentTime < parseTime(dinner.end)) {
            mealHint = { text: '🥂 İyi akşamlar! Şarap listesini veya şefin önerilerini görmek ister misiniz?', delay: 8, isActive: true, isAiGenerated: true };
          }

          if (mealHint) {
            console.log('Digital Waiter: Injecting time-based bubble:', mealHint.text);
            // Ensure engagement structure exists
            if (!engagementSettings.enabled) {
              engagementSettings.enabled = true;
            }
            if (!engagementSettings.bubble) {
              engagementSettings.bubble = { messages: [], style: { backgroundColor: '#000', textColor: '#FFF' }, position: 'top', animation: 'bounce' };
            }
            if (!engagementSettings.bubble.messages) {
              engagementSettings.bubble.messages = [];
            }
            // Add the AI-generated hint to the front
            engagementSettings.bubble.messages.unshift(mealHint);
          }

          // Also add signature dishes hint if configured
          if (data.digitalWaiter.signatureDishes && data.digitalWaiter.signatureDishes.length > 0) {
            const sigDish = data.digitalWaiter.signatureDishes[Math.floor(Math.random() * data.digitalWaiter.signatureDishes.length)];
            const sigHint = { text: `⭐ Bugün ${sigDish} tavsiye ederiz!`, delay: 15, isActive: true, isAiGenerated: true };
            console.log('Digital Waiter: Injecting signature dish hint:', sigHint.text);
            if (!engagementSettings.bubble.messages) engagementSettings.bubble.messages = [];
            engagementSettings.bubble.messages.push(sigHint);
          }
        }

        // AI Auto-Bubbles: Inject pre-generated AI messages
        if (engagementSettings.aiBubbles && engagementSettings.aiBubbles.enabled) {
          const aiMessages = engagementSettings.aiBubbles.generatedMessages || [];
          const maxAi = engagementSettings.aiBubbles.maxPerSession || 2;

          // Check session limit
          const aiShownKey = `userex_ai_bubbles_${chatbotId}`;
          const aiShownCount = parseInt(sessionStorage.getItem(aiShownKey) || '0');

          if (aiShownCount < maxAi && aiMessages.length > 0) {
            console.log('AI Auto-Bubbles: Injecting', aiMessages.length, 'AI generated messages');

            // Ensure engagement structure exists
            if (!engagementSettings.enabled) {
              engagementSettings.enabled = true;
            }
            if (!engagementSettings.bubble) {
              engagementSettings.bubble = { messages: [], style: { backgroundColor: '#000', textColor: '#FFF' }, position: 'top', animation: 'bounce' };
            }
            if (!engagementSettings.bubble.messages) {
              engagementSettings.bubble.messages = [];
            }

            // Add AI bubbles (respecting max limit)
            const toAdd = aiMessages.slice(0, maxAi - aiShownCount);
            toAdd.forEach((msg, i) => {
              engagementSettings.bubble.messages.push({
                ...msg,
                delay: (msg.delay || 10) + (i * 5), // Stagger delays
                isAiGenerated: true
              });
            });

            // Update session counter
            sessionStorage.setItem(aiShownKey, (aiShownCount + toAdd.length).toString());
          }
        }

        if (engagementSettings && engagementSettings.enabled) {
          console.log('Initializing Engagement Controller after launcher creation...');
          engagementController = new EngagementController(engagementSettings, baseUrl, chatbotId);
        } else {
          console.log('Engagement disabled or not configured:', engagementSettings?.enabled);
        }
      })
      .catch(err => console.error('Failed to load engagement settings:', err));

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

  // Fetch settings from API
  fetch(`${baseUrl}/api/widget-settings?chatbotId=${chatbotId}&t=${Date.now()}`)
    .then(res => res.json())
    .then(data => {
      console.log('Widget Settings API Response:', data);

      if (data.isEnabled === false) {
        console.warn('Userex Widget is disabled for this account.');
        return;
      }

      if (!data.error) {
        settings = {
          brandColor: data.brandColor,
          primaryColor: attrColor || data.brandColor || '#000000',
          position: data.position || 'bottom-right',
          viewMode: data.viewMode || 'classic',
          modalSize: data.modalSize || 'half',
          launcherStyle: data.launcherStyle || 'circle',
          launcherText: data.launcherText || 'Sohbet',
          launcherRadius: data.launcherRadius !== undefined ? data.launcherRadius : 50,
          launcherHeight: data.launcherHeight || 60,
          launcherWidth: data.launcherWidth || 60,
          fullImageLauncherWidth: data.fullImageLauncherWidth || 60,
          fullImageLauncherHeight: data.fullImageLauncherHeight || 60,
          launcherIcon: data.launcherIcon || 'message',
          launcherIconColor: data.launcherIconColor || '#FFFFFF',
          launcherBackgroundColor: (data.launcherBackgroundColor && data.launcherBackgroundColor.trim()) ? data.launcherBackgroundColor : '',
          launcherIconUrl: data.launcherIconUrl || '',
          launcherLibraryIcon: data.launcherLibraryIcon || 'MessageSquare',
          bottomSpacing: data.bottomSpacing !== undefined ? data.bottomSpacing : 20,
          sideSpacing: data.sideSpacing !== undefined ? data.sideSpacing : 20,
          launcherShadow: data.launcherShadow || 'medium',
          launcherAnimation: data.launcherAnimation || 'none',
          // Full Image / Lottie Mode
          launcherType: data.launcherType || 'standard',
          launcherImageMode: data.launcherImageMode || 'image',
          launcherFullImageUrl: data.launcherFullImageUrl || '',
          launcherLottieUrl: data.launcherLottieUrl || '',
          launcherHoverEffect: data.launcherHoverEffect || 'scale',
          // Triggers
          autoOpenDelay: data.autoOpenDelay || 0,
          openOnExitIntent: data.openOnExitIntent || false,
          openOnScroll: data.openOnScroll || 0,
          // Language
          initialLanguage: data.initialLanguage || 'auto',
          // Availability
          enableBusinessHours: data.enableBusinessHours || false,
          timezone: data.timezone || 'UTC',
          businessHoursStart: data.businessHoursStart || '09:00',
          businessHoursEnd: data.businessHoursEnd || '17:00',
          offlineMessage: data.offlineMessage || 'Şu anda çevrimdışıyız.'
        };
        console.log('Final settings object:', settings);
        console.log('Launcher Debug:', 'type:', settings.launcherType, 'imageMode:', settings.launcherImageMode, 'lottieUrl:', settings.launcherLottieUrl?.substring(0, 60));
      }
      initWidget();
    })
    .catch(err => {
      console.error('Failed to load widget settings:', err);
      initWidget(); // Fallback to defaults
    });

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
      user: getUserData()
    };
  }

  // Expose global API for dynamic user updates
  window.UserexWidget = window.UserexWidget || {};
  window.UserexWidget.setUser = function (userData) {
    window.UserexWidget.userData = userData;
    sendContextUpdate(); // Immediately notify chatbot of user change
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

  // VOICE INTERFACE LOGIC
  function toggleVoiceInterface() {
    let overlay = document.getElementById('userex-voice-overlay');

    if (overlay) {
      // Toggle visibility
      if (overlay.style.display === 'none') {
        overlay.style.display = 'flex';
        startVoiceSession();
      } else {
        overlay.style.display = 'none';
        stopVoiceSession();
      }
    } else {
      createVoiceOverlay();
    }
  }

  function createVoiceOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'userex-voice-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      zIndex: '999999',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    });

    overlay.innerHTML = `
        <div style="position: absolute; top: 20px; right: 20px; cursor: pointer;" id="userex-voice-close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </div>
        <div style="text-align: center; max-width: 90%;"> // <--- Fixed: added closing quote
            <div id="userex-voice-status" style="font-size: 24px; font-weight: 500; margin-bottom: 20px;">Listening...</div>
            <div id="userex-voice-visualizer" style="height: 60px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <div class="bar" style="width: 4px; height: 10px; background: white; border-radius: 2px;"></div>
                <div class="bar" style="width: 4px; height: 20px; background: white; border-radius: 2px;"></div>
                <div class="bar" style="width: 4px; height: 15px; background: white; border-radius: 2px;"></div>
                <div class="bar" style="width: 4px; height: 25px; background: white; border-radius: 2px;"></div>
                <div class="bar" style="width: 4px; height: 15px; background: white; border-radius: 2px;"></div>
            </div>
        </div>
        <div id="userex-voice-controls" style="margin-top: 40px;">
            <button id="userex-voice-mic-toggle" style="background: #ef4444; border: none; padding: 16px; border-radius: 50%; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </button>
        </div>
      `;

    document.body.appendChild(overlay);

    // Force reflow
    overlay.offsetHeight;
    overlay.style.opacity = '1';

    document.getElementById('userex-voice-close').onclick = () => toggleVoiceInterface();

    // Simple visualizer animation
    const bars = overlay.querySelectorAll('.bar');
    setInterval(() => {
      bars.forEach(bar => {
        bar.style.height = Math.random() * 40 + 10 + 'px';
      });
    }, 100);

    startVoiceSession();
  }

  function startVoiceSession() {
    // Placeholder for ElevenLabs/WebSpeech API logic
    const statusEl = document.getElementById('userex-voice-status');
    if (statusEl) statusEl.innerText = "Listening...";
    console.log('Voice Session Started');
  }

  function stopVoiceSession() {
    console.log('Voice Session Stopped');
  }

})();
