"use client"

import { useParams } from "next/navigation"
import DigitalWaiterPage from "@/app/console/digital-waiter/page"

export default function AdminDigitalWaiterPage() {
    const params = useParams()
    const userId = params.userId as string

    // Reuse the console page component but we might need to handle the targetUserId
    // However, DigitalWaiterPage already handles getting the chatbotId from auth or could be updated to accept a prop.
    
    // Let's check if our DigitalWaiterPage component in app/console/digital-waiter/page.tsx 
    // needs adjustment to accept a targetUserId prop.
    
    return <DigitalWaiterPage />
}
