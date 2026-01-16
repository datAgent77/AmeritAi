
interface ConfirmationModalProps {
    isOpen: boolean
    onConfirm: () => void
    onCancel: () => void
    title?: string
    description?: string
    confirmText?: string
    cancelText?: string
    t: (key: string) => string
}

export function ConfirmationModal({
    isOpen,
    onConfirm,
    onCancel,
    title,
    description,
    confirmText,
    cancelText,
    t
}: ConfirmationModalProps) {
    if (!isOpen) return null

    return (
        <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div 
                className="bg-white rounded-xl shadow-xl p-6 max-w-xs w-full animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="font-semibold text-lg mb-2">{title || t('clearHistoryTitle') || "Clear History?"}</h3>
                <p className="text-sm text-gray-500 mb-4">{description || t('clearHistoryDesc') || "This will delete your current conversation. This action cannot be undone."}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        {cancelText || t('cancel') || "Cancel"}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
                    >
                        {confirmText || t('clearChat') || "Clear Chat"}
                    </button>
                </div>
            </div>
        </div>
    )
}
