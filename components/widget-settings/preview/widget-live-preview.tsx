"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { WidgetSettings } from "@/hooks/use-widget-settings"
import type { AmbientDockPreviewState } from "@/lib/ambient-dock-style"

interface WidgetLivePreviewProps {
    userId: string
    settings: WidgetSettings
    t: (key: string) => string
    ambientPreviewDockState?: AmbientDockPreviewState
    ambientPreviewThinking?: boolean
}

function escapeHtmlAttr(value: string) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
}

function buildPreviewSrcDoc({
    origin,
    chatbotId,
    previewDraftKey,
    previewMode,
    ambientPreviewDockState,
    ambientPreviewThinking,
}: {
    origin: string
    chatbotId: string
    previewDraftKey: string
    previewMode: "mobile" | "desktop"
    ambientPreviewDockState: AmbientDockPreviewState
    ambientPreviewThinking: boolean
}) {
    const safeOrigin = escapeHtmlAttr(origin)
    const safeChatbotId = escapeHtmlAttr(chatbotId || "preview")
    const safeDraftKey = escapeHtmlAttr(previewDraftKey)
    const safeDockState = escapeHtmlAttr(ambientPreviewDockState)
    const safeThinking = ambientPreviewThinking ? "true" : "false"
    const isMobile = previewMode === "mobile"

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; height: 100%; overflow: hidden; }
      body {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(139, 92, 246, 0.08), transparent 28%),
          radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.08), transparent 30%),
          #f8fafc;
        color: #0f172a;
      }
      .preview-host {
        position: relative;
        height: 100%;
        overflow: hidden;
      }
      .preview-page {
        min-height: 100%;
        padding: ${isMobile ? "20px 16px 28px" : "28px 28px 40px"};
      }
      .hero {
        height: ${isMobile ? "120px" : "152px"};
        border-radius: ${isMobile ? "24px" : "28px"};
        background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
        border: 1px solid rgba(148, 163, 184, 0.18);
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
      }
      .hero-lines {
        display: grid;
        gap: 14px;
        padding: ${isMobile ? "20px" : "28px"};
      }
      .line {
        height: 12px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(148, 163, 184, 0.22), rgba(226, 232, 240, 0.75));
      }
      .cards {
        display: grid;
        grid-template-columns: ${isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))"};
        gap: 14px;
        margin-top: 18px;
      }
      .card {
        height: ${isMobile ? "76px" : "104px"};
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.75);
        border: 1px solid rgba(148, 163, 184, 0.16);
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
      }
      .card.tall {
        height: ${isMobile ? "140px" : "180px"};
        margin-top: 14px;
      }
    </style>
  </head>
  <body>
    <div class="preview-host">
      <div class="preview-page">
        <div class="hero">
          <div class="hero-lines">
            <div class="line" style="width: 42%;"></div>
            <div class="line" style="width: 88%;"></div>
            <div class="line" style="width: 66%;"></div>
          </div>
        </div>
        <div class="cards">
          <div class="card"></div>
          <div class="card"></div>
          <div class="card"></div>
        </div>
        <div class="card tall"></div>
      </div>
      <script
        async
        src="${safeOrigin}/widget.js"
        data-chatbot-id="${safeChatbotId}"
        data-preview-draft-key="${safeDraftKey}"
        data-preview-ambient-dock-state="${safeDockState}"
        data-preview-ambient-thinking="${safeThinking}"
      ></script>
    </div>
  </body>
</html>`
}

export function WidgetLivePreview({
    userId,
    settings,
    t,
    ambientPreviewDockState = "auto",
    ambientPreviewThinking = false,
}: WidgetLivePreviewProps) {
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile')
    const [origin, setOrigin] = useState("")
    const [frameVersion, setFrameVersion] = useState(0)

    const previewDraftKey = useMemo(
        () => `userex_widget_preview_draft:${userId || "anonymous"}`,
        [userId]
    )
    const serializedDraft = useMemo(() => JSON.stringify(settings), [settings])

    useEffect(() => {
        if (typeof window === "undefined") return
        setOrigin(window.location.origin)
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return
        try {
            window.localStorage.setItem(previewDraftKey, serializedDraft)
        } catch (error) {
            console.warn("Widget preview: Failed to persist draft settings", error)
        }
    }, [previewDraftKey, serializedDraft])

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setFrameVersion((current) => current + 1)
        }, 180)

        return () => window.clearTimeout(timeoutId)
    }, [previewMode, ambientPreviewDockState, ambientPreviewThinking, serializedDraft])

    useEffect(() => {
        return () => {
            if (typeof window === "undefined") return
            try {
                window.localStorage.removeItem(previewDraftKey)
                window.localStorage.removeItem(`${previewDraftKey}:open`)
            } catch (error) {
                console.warn("Widget preview: Failed to clean preview draft", error)
            }
        }
    }, [previewDraftKey])

    const previewSrcDoc = useMemo(() => {
        if (!origin) return ""
        return buildPreviewSrcDoc({
            origin,
            chatbotId: userId || "preview",
            previewDraftKey,
            previewMode,
            ambientPreviewDockState,
            ambientPreviewThinking,
        })
    }, [origin, userId, previewDraftKey, previewMode, ambientPreviewDockState, ambientPreviewThinking])

    return (
        <div className="flex-1 flex flex-col items-center bg-muted/30 rounded-xl border border-dashed border-border/50 p-6 min-h-[600px] h-full overflow-y-auto">
            <div className="flex gap-2 mb-4">
                <Button
                    variant={previewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                >
                    {t('mobile') || 'Mobile'}
                </Button>
                <Button
                    variant={previewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                >
                    {t('desktop') || 'Desktop'}
                </Button>
            </div>

            <div className="sticky top-8 w-full max-w-[700px] flex justify-center">
                {previewMode === 'mobile' ? (
                    <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.8rem] h-[740px] w-[360px] shadow-xl shrink-0">
                        <div className="w-[178px] h-[22px] bg-gray-800 top-0 rounded-b-[1.1rem] left-1/2 -translate-x-1/2 absolute z-50"></div>
                        <div className="h-[36px] w-[3px] bg-gray-800 absolute -start-[17px] top-[88px] rounded-s-lg"></div>
                        <div className="h-[52px] w-[3px] bg-gray-800 absolute -start-[17px] top-[146px] rounded-s-lg"></div>
                        <div className="h-[52px] w-[3px] bg-gray-800 absolute -start-[17px] top-[206px] rounded-s-lg"></div>
                        <div className="h-[72px] w-[3px] bg-gray-800 absolute -end-[17px] top-[164px] rounded-e-lg"></div>

                        <iframe
                            key={`mobile-${frameVersion}`}
                            title="Widget live preview mobile"
                            srcDoc={previewSrcDoc}
                            className="rounded-[2rem] overflow-hidden w-full h-full bg-white border-0"
                        />
                    </div>
                ) : (
                    <div className="w-full max-w-[600px] bg-white rounded-lg shadow-2xl border overflow-hidden shrink-0">
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 flex items-center gap-2 border-b">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <div className="flex-1 bg-white dark:bg-gray-700 rounded px-3 py-1 text-xs text-gray-500 text-center">
                                yourwebsite.com
                            </div>
                        </div>
                        <iframe
                            key={`desktop-${frameVersion}`}
                            title="Widget live preview desktop"
                            srcDoc={previewSrcDoc}
                            className="h-[500px] w-full border-0 bg-white"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
