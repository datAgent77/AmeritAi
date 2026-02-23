import React from 'react';

type LoaderStyle = 'skeleton' | 'spinner' | 'pulsing-icon';

interface WidgetLoaderProps {
    loaderStyle?: LoaderStyle;
    ambientBottomMargin?: number;
    showAmbientIcon?: boolean;
}

export function WidgetLoader({ loaderStyle = 'skeleton', ambientBottomMargin = 0, showAmbientIcon = true }: WidgetLoaderProps) {
    const bottomPadding = `calc(0.75rem + ${ambientBottomMargin}px + env(safe-area-inset-bottom))`;
    const transparentRootStyle = `
        html, body, #__next, #root, body.bg-background, div.bg-background {
            background: transparent !important;
            background-color: transparent !important;
            box-shadow: none !important;
        }
        :root {
            color-scheme: light dark !important;
        }
    `

    if (loaderStyle === 'spinner') {
        return (
            <div className="fixed inset-0 w-full overflow-hidden font-sans flex items-center justify-center z-50 pointer-events-none">
                <style>{transparentRootStyle}</style>
                <div className="w-10 h-10 border-4 border-gray-200/50 dark:border-gray-700/50 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (loaderStyle === 'pulsing-icon') {
        return (
            <div className="fixed inset-0 w-full overflow-hidden font-sans flex flex-col justify-end px-4 sm:px-6 z-50 pointer-events-none" style={{ paddingBottom: bottomPadding }}>
                <style>{transparentRootStyle}</style>
                <div className="relative z-20 w-full mx-auto flex items-center justify-center mb-6" style={{ maxWidth: '1080px' }}>
                    <div className="bg-white/80 dark:bg-black/50 backdrop-blur-md p-4 rounded-full shadow-lg flex gap-1.5 opacity-90">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-[bounce_1.4s_infinite_ease-in-out]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-[bounce_1.4s_infinite_ease-in-out_-0.32s]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-[bounce_1.4s_infinite_ease-in-out_-0.16s]"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Default: Skeleton (Input Shape)
    return (
        <div className="fixed inset-0 w-full overflow-hidden font-sans flex flex-col justify-end px-4 sm:px-6 z-50 pointer-events-none">
            <style>{transparentRootStyle}</style>
            <div className="relative z-20 w-full mx-auto" style={{ maxWidth: '1080px' }}>
                <div className="px-4 pt-0" style={{ paddingBottom: bottomPadding }}>
                    <div className="relative mx-auto w-full animate-pulse">
                        <div className="rounded-[999px] p-[2px] shadow-sm bg-[#f3f4f6] dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50">
                            <div className="relative flex items-center gap-2 rounded-[999px] px-3 py-2.5 shadow-sm bg-[#f3f4f6] dark:bg-gray-800 min-h-[52px]">
                                {showAmbientIcon && (
                                    <div className="ml-1 flex-shrink-0 rounded-full w-6 h-6 bg-gray-200 dark:bg-gray-700"></div>
                                )}
                                <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full mx-3 opacity-40"></div>
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 opacity-80"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
