/**
 * Layout for the chatbot-view iframe route.
 * Forces transparent background regardless of dark/light theme,
 * because this page runs inside a transparent iframe overlay (Ambient mode).
 */
export default function ChatbotViewLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <style
                // dangerouslySetInnerHTML avoids SSR quote-encoding issues
                dangerouslySetInnerHTML={{
                    __html: `
                        html, body, #__next, [data-nextjs-scroll-focus-boundary] {
                            background: transparent !important;
                            background-color: transparent !important;
                            --background: transparent !important;
                            --tw-bg-opacity: 0 !important;
                            box-shadow: none !important;
                        }
                    `
                }}
            />
            {children}
        </>
    )
}
