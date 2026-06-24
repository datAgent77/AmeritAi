import { NextRequest, NextResponse } from 'next/server'
import { getContactInboxEmail, sendTransactionalEmail } from '@/lib/email-service'

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i

export async function POST(req: NextRequest) {
    try {
        const { name, email, company, subject, message } = await req.json()

        // Validate required fields
        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Name, email and message are required' },
                { status: 400 }
            )
        }

        const normalizedEmail = String(email).trim().toLowerCase()
        if (!EMAIL_PATTERN.test(normalizedEmail)) {
            return NextResponse.json(
                { error: 'Valid email is required' },
                { status: 400 }
            )
        }

        // Subject mapping
        const subjectLabels: Record<string, string> = {
            general: 'Genel Soru',
            demo: 'Demo Talebi',
            support: 'Teknik Destek',
            partnership: 'İş Ortaklığı'
        }

        // Email content
        const emailContent = `
Yeni İletişim Formu Mesajı

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

İsim: ${name}
E-posta: ${email}
Şirket: ${company || 'Belirtilmedi'}
Konu: ${subjectLabels[subject] || subject}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mesaj:
${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`

        // Send email
        const emailSent = await sendTransactionalEmail({
            to: getContactInboxEmail(),
            replyTo: normalizedEmail,
            fromName: 'AmeritAI İletişim Formu',
            subject: `[AmeritAI] ${subjectLabels[subject] || 'İletişim'} - ${name}`,
            text: emailContent
        })

        if (!emailSent) {
            return NextResponse.json(
                { error: 'Failed to send message' },
                { status: 502 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Contact form error:', {
            message: error?.message,
            code: error?.code,
            responseCode: error?.responseCode,
            command: error?.command
        })

        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        )
    }
}
