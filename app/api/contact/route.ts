import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
    try {
        const { name, email, company, subject, message } = await req.json()
        const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER
        const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '').replace(/\s/g, '')
        const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
        const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10)

        // Validate required fields
        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Name, email and message are required' },
                { status: 400 }
            )
        }

        // Check SMTP credentials
        if (!smtpUser || !smtpPass) {
            console.error('SMTP credentials not configured')
            return NextResponse.json(
                { error: 'Email service not configured' },
                { status: 500 }
            )
        }

        // Subject mapping
        const subjectLabels: Record<string, string> = {
            general: 'Genel Soru',
            demo: 'Demo Talebi',
            support: 'Teknik Destek',
            partnership: 'İş Ortaklığı'
        }

        // Create email transporter
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        })

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
        const result = await transporter.sendMail({
            from: `"Vion İletişim Formu" <${smtpUser}>`,
            to: 'info@userex.com.tr',
            replyTo: email,
            subject: `[Vion] ${subjectLabels[subject] || 'İletişim'} - ${name}`,
            text: emailContent
        })

        console.log('Email sent successfully:', result.messageId)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Contact form error:', {
            message: error?.message,
            code: error?.code,
            responseCode: error?.responseCode,
            command: error?.command
        })

        const isAuthError =
            error?.responseCode === 535 ||
            error?.code === 'EAUTH' ||
            String(error?.message || '').includes('Invalid login')

        return NextResponse.json(
            {
                error: isAuthError
                    ? 'Email service authentication failed'
                    : 'Failed to send message'
            },
            { status: 500 }
        )
    }
}
