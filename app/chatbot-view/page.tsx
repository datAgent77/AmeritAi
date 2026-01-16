"use client"

import { Suspense } from "react"
import ChatbotContainer from "./ChatbotContainer"

export default function ChatbotView() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-white">Loading...</div>}>
            <ChatbotContainer />
        </Suspense>
    )
}
