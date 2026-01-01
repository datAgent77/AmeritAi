import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

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

        // Check SMTP credentials
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
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
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
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
            from: `"Vion İletişim Formu" <${process.env.SMTP_USER}>`,
            to: 'info@userex.com.tr',
            replyTo: email,
            subject: `[Vion] ${subjectLabels[subject] || 'İletişim'} - ${name}`,
            text: emailContent
        })

        console.log('Email sent successfully:', result.messageId)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Contact form error:', error?.message || error)
        return NextResponse.json(
            { error: 'Failed to send message', details: error?.message },
            { status: 500 }
        )
    }
}
