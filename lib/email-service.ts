/**
 * Email Service using Nodemailer with Gmail SMTP
 * 
 * SETUP REQUIREMENTS:
 * 1. Go to https://myaccount.google.com/security
 * 2. Enable 2-Step Verification
 * 3. Generate an "App Password" for this application
 * 4. Add to .env.local:
 *    - EMAIL_USER=your-email@gmail.com
 *    - EMAIL_PASSWORD=your-app-password
 */

import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
    // Check for credentials (support both naming conventions)
    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const emailPass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

    // Development Mode / Missing Credentials Check
    if (!emailUser || !emailPass) {
        console.warn('Email Service: SMTP_USER/EMAIL_USER or SMTP_PASS/EMAIL_PASSWORD not set. Running in MOCK mode.');
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });
};

// Helper: Handle email sending (Real or Mock)
const sendEmailOrMock = async (transporter: nodemailer.Transporter | null, mailOptions: nodemailer.SendMailOptions): Promise<boolean> => {
    if (!transporter) {
        // Mock Mode: Log to console
        console.log('\n🔵 [MOCK EMAIL SERVICE] ---------------------------------------------------');
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log('--- Body Preview ---');
        const textContent = typeof mailOptions.text === 'string' ? mailOptions.text : '[Non-text content]';
        console.log(textContent.substring(0, 200) + (textContent.length > 200 ? '...' : ''));
        console.log('--------------------------------------------------------------------------\n');
        return true; // Pretend we sent it successfully
    }

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email Service: Email sent to ${mailOptions.to}`);
        return true;
    } catch (error) {
        console.error('Email Service: Failed to send email:', error);
        return false;
    }
};

export interface AppointmentEmailData {
    customerEmail: string;
    customerName: string;
    date: string;
    time: string;
    companyName?: string;
    notes?: string;
}

/**
 * Send appointment confirmation email to customer
 */
export async function sendAppointmentConfirmationEmail(data: AppointmentEmailData): Promise<boolean> {
    const transporter = createTransporter();

    if (!transporter) {
        console.error('Email Service: Transporter not configured');
        return false;
    }

    const { customerEmail, customerName, date, time, companyName = 'Vion AI', notes } = data;

    // Format date for display
    const formattedDate = new Date(date).toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Randevu Onayı</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
                            <div style="width: 60px; height: 60px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 30px;">✓</span>
                            </div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Randevunuz Onaylandı!</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Sayın <strong>${customerName}</strong>,
                            </p>
                            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">
                                Randevunuz onaylanmıştır. Detaylar aşağıda yer almaktadır:
                            </p>
                            
                            <!-- Appointment Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
                                <tr>
                                    <td>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                                                    <span style="color: #6c757d; font-size: 13px;">TARİH</span><br>
                                                    <span style="color: #212529; font-size: 16px; font-weight: 600;">📅 ${formattedDate}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                                                    <span style="color: #6c757d; font-size: 13px;">SAAT</span><br>
                                                    <span style="color: #212529; font-size: 16px; font-weight: 600;">⏰ ${time}</span>
                                                </td>
                                            </tr>
                                            ${notes ? `
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <span style="color: #6c757d; font-size: 13px;">NOT</span><br>
                                                    <span style="color: #212529; font-size: 14px;">${notes}</span>
                                                </td>
                                            </tr>
                                            ` : ''}
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                                Herhangi bir değişiklik veya iptal için lütfen bizimle iletişime geçin.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #6c757d; font-size: 13px; margin: 0;">
                                ${companyName} tarafından gönderilmiştir.<br>
                                <span style="color: #adb5bd;">Powered by Vion AI</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const textContent = `
Randevunuz Onaylandı!

Sayın ${customerName},

Randevunuz onaylanmıştır. Detaylar:

📅 Tarih: ${formattedDate}
⏰ Saat: ${time}
${notes ? `📝 Not: ${notes}` : ''}

Herhangi bir değişiklik veya iptal için lütfen bizimle iletişime geçin.

${companyName}
    `;

    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'mock@vion.ai';
    return sendEmailOrMock(transporter, {
        from: `"${companyName}" <${emailUser}>`,
        to: customerEmail,
        subject: `✅ Randevunuz Onaylandı - ${formattedDate}`,
        text: textContent,
        html: htmlContent,
    });
}

/**
 * Send appointment cancellation email to customer
 */
export async function sendAppointmentCancellationEmail(data: AppointmentEmailData): Promise<boolean> {
    const transporter = createTransporter();

    if (!transporter) {
        console.error('Email Service: Transporter not configured');
        return false;
    }

    const { customerEmail, customerName, date, time, companyName = 'Vion AI' } = data;

    const formattedDate = new Date(date).toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Randevu İptali</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #dc3545; padding: 40px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Randevunuz İptal Edildi</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6;">
                                Sayın <strong>${customerName}</strong>,
                            </p>
                            <p style="color: #666666; font-size: 15px; line-height: 1.6;">
                                <strong>${formattedDate}</strong> tarihli, saat <strong>${time}</strong>'deki randevunuz iptal edilmiştir.
                            </p>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                                Yeni bir randevu almak için lütfen bizimle iletişime geçin.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center;">
                            <p style="color: #6c757d; font-size: 13px; margin: 0;">
                                ${companyName}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'mock@vion.ai';
    return sendEmailOrMock(transporter, {
        from: `"${companyName}" <${emailUser}>`,
        to: customerEmail,
        subject: `❌ Randevunuz İptal Edildi - ${formattedDate}`,
        text: `Sayın ${customerName}, ${formattedDate} tarihli, saat ${time}'deki randevunuz iptal edilmiştir.`,
        html: htmlContent,
    });
}

// ============================================================================
// BILLING REMINDER EMAILS
// ============================================================================

export interface InvoiceReminderData {
    adminEmail: string;
    customerEmail: string;
    customerName?: string;
    invoiceDate: string;
    planName: string;
    amount?: number;
    currency?: string;
}

/**
 * Send invoice reminder email to Super Admin
 * Notifies admin that it's time to create an invoice for a customer
 */
export async function sendInvoiceReminderToAdmin(data: InvoiceReminderData): Promise<boolean> {
    const transporter = createTransporter();

    if (!transporter) {
        console.error('Email Service: Transporter not configured');
        return false;
    }

    const { adminEmail, customerEmail, customerName, invoiceDate, planName, amount, currency = 'TRY' } = data;

    const formattedDate = new Date(invoiceDate).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const amountText = amount ? `${amount.toLocaleString('tr-TR')} ${currency}` : 'Tutarı belirleyin';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Fatura Kesim Hatırlatması</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px; text-align: center;">
                            <div style="font-size: 40px; margin-bottom: 15px;">📋</div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Fatura Kesim Zamanı</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Aşağıdaki müşteri için fatura kesim zamanı geldi:
                            </p>
                            
                            <!-- Customer Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
                                <tr>
                                    <td>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #92400e; font-size: 13px;">MÜŞTERİ</span><br>
                                                    <span style="color: #78350f; font-size: 16px; font-weight: 600;">${customerName || customerEmail}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #92400e; font-size: 13px;">E-POSTA</span><br>
                                                    <span style="color: #78350f; font-size: 14px;">${customerEmail}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #92400e; font-size: 13px;">PLAN</span><br>
                                                    <span style="color: #78350f; font-size: 14px; font-weight: 600;">${planName}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #92400e; font-size: 13px;">FATURA TARİHİ</span><br>
                                                    <span style="color: #78350f; font-size: 16px; font-weight: 600;">📅 ${formattedDate}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #92400e; font-size: 13px;">TUTAR</span><br>
                                                    <span style="color: #78350f; font-size: 18px; font-weight: 700;">${amountText}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                                Lütfen müşteri panelinden faturayı oluşturun.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #6c757d; font-size: 13px; margin: 0;">
                                <span style="color: #adb5bd;">Vion AI Admin Bildirimi</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'mock@vion.ai';
    return sendEmailOrMock(transporter, {
        from: `"Vion AI" <${emailUser}>`,
        to: adminEmail,
        subject: `📋 Fatura Kesim Hatırlatması - ${customerName || customerEmail}`,
        text: `Fatura Kesim Zamanı\n\nMüşteri: ${customerName || customerEmail}\nE-posta: ${customerEmail}\nPlan: ${planName}\nFatura Tarihi: ${formattedDate}\nTutar: ${amountText}`,
        html: htmlContent,
    });
}

export interface PaymentReminderData {
    customerEmail: string;
    customerName?: string;
    paymentDueDate: string;
    planName: string;
    amount?: number;
    currency?: string;
    companyName?: string;
}

/**
 * Send payment reminder email to customer
 * Notifies customer that their payment is due
 */
export async function sendPaymentReminderToCustomer(data: PaymentReminderData): Promise<boolean> {
    const transporter = createTransporter();

    if (!transporter) {
        console.error('Email Service: Transporter not configured');
        return false;
    }

    const { customerEmail, customerName, paymentDueDate, planName, amount, currency = 'TRY', companyName = 'Vion AI' } = data;

    const formattedDate = new Date(paymentDueDate).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const amountText = amount ? `${amount.toLocaleString('tr-TR')} ${currency}` : '';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Ödeme Hatırlatması</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px; text-align: center;">
                            <div style="font-size: 40px; margin-bottom: 15px;">💳</div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Ödeme Hatırlatması</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Sayın <strong>${customerName || 'Değerli Müşterimiz'}</strong>,
                            </p>
                            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">
                                <strong>${planName}</strong> planınız için ödeme zamanı yaklaşıyor.
                            </p>
                            
                            <!-- Payment Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
                                <tr>
                                    <td>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <span style="color: #1e40af; font-size: 13px;">SON ÖDEME TARİHİ</span><br>
                                                    <span style="color: #1e3a8a; font-size: 20px; font-weight: 700;">📅 ${formattedDate}</span>
                                                </td>
                                            </tr>
                                            ${amount ? `
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <span style="color: #1e40af; font-size: 13px;">ÖDEME TUTARI</span><br>
                                                    <span style="color: #1e3a8a; font-size: 22px; font-weight: 700;">${amountText}</span>
                                                </td>
                                            </tr>
                                            ` : ''}
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                                Hizmetlerinizin kesintisiz devam etmesi için lütfen ödemenizi zamanında yapınız.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #6c757d; font-size: 13px; margin: 0;">
                                ${companyName}<br>
                                <span style="color: #adb5bd;">Powered by Vion AI</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'mock@vion.ai';
    return sendEmailOrMock(transporter, {
        from: `"${companyName}" <${emailUser}>`,
        to: customerEmail,
        subject: `💳 Ödeme Hatırlatması - ${formattedDate}`,
        text: `Ödeme Hatırlatması\n\nSayın ${customerName || 'Değerli Müşterimiz'},\n\n${planName} planınız için ödeme zamanı yaklaşıyor.\n\nSon Ödeme Tarihi: ${formattedDate}\n${amount ? `Tutar: ${amountText}` : ''}\n\nHizmetlerinizin kesintisiz devam etmesi için lütfen ödemenizi zamanında yapınız.\n\n${companyName}`,
        html: htmlContent,
    });
}

export interface TrialExpiredNotificationData {
    adminEmail: string;
    customerEmail: string;
    customerName?: string;
    planName: string;
    trialEndDate: string;
}

/**
 * Send trial expired notification to Super Admin
 */
export async function sendTrialExpiredAdminNotification(data: TrialExpiredNotificationData): Promise<boolean> {
    const transporter = createTransporter();

    if (!transporter) {
        console.error('Email Service: Transporter not configured');
        return false;
    }

    const { adminEmail, customerEmail, customerName, planName, trialEndDate } = data;

    const formattedDate = new Date(trialEndDate).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Deneme Süresi Sona Erdi</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 40px; text-align: center;">
                            <div style="font-size: 40px; margin-bottom: 15px;">⏳</div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Deneme Süresi Sona Erdi</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Aşağıdaki müşterinin 14 günlük deneme süresi doldu:
                            </p>
                            
                            <!-- Customer Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
                                <tr>
                                    <td>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #991b1b; font-size: 13px;">MÜŞTERİ</span><br>
                                                    <span style="color: #7f1d1d; font-size: 16px; font-weight: 600;">${customerName || customerEmail}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #991b1b; font-size: 13px;">E-POSTA</span><br>
                                                    <span style="color: #7f1d1d; font-size: 14px;">${customerEmail}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #991b1b; font-size: 13px;">PLAN</span><br>
                                                    <span style="color: #7f1d1d; font-size: 14px; font-weight: 600;">${planName}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #991b1b; font-size: 13px;">BİTİŞ TARİHİ</span><br>
                                                    <span style="color: #7f1d1d; font-size: 16px; font-weight: 600;">📅 ${formattedDate}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                                Lütfen müşteriyle iletişime geçin veya hesap durumunu kontrol edin.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #6c757d; font-size: 13px; margin: 0;">
                                <span style="color: #adb5bd;">Vion AI Admin Bildirimi</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'mock@vion.ai';
    return sendEmailOrMock(transporter, {
        from: `"Vion AI" <${emailUser}>`,
        to: adminEmail,
        subject: `⏳ Deneme Süresi Bitti - ${customerName || customerEmail}`,
        text: `Deneme Süresi Sona Erdi\n\nMüşteri: ${customerName || customerEmail}\nE-posta: ${customerEmail}\nPlan: ${planName}\nBitiş Tarihi: ${formattedDate}`,
        html: htmlContent,
    });
}

/**
 * Send trial expired notification to Customer
 */
export async function sendTrialExpiredCustomerNotification(data: Omit<TrialExpiredNotificationData, 'adminEmail'>): Promise<boolean> {
    const transporter = createTransporter();

    if (!transporter) {
        console.error('Email Service: Transporter not configured');
        return false;
    }

    const { customerEmail, customerName, planName, trialEndDate } = data;

    const formattedDate = new Date(trialEndDate).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Deneme Süreniz Sona Erdi</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 40px; text-align: center;">
                            <div style="font-size: 40px; margin-bottom: 15px;">🚀</div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Vion AI Deneme Süreniz Sona Erdi</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Sayın <strong>${customerName || 'Kullanıcımız'}</strong>,
                            </p>
                            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                                <strong>Vion AI ${planName}</strong> planındaki 14 günlük deneme süreniz <strong>${formattedDate}</strong> tarihinde sona ermiştir.
                            </p>
                            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">
                                Hizmetlerimizden kesintisiz yararlanmaya devam etmek ve verilerinizi kaybetmemek için hesabınızı hemen yükseltin.
                            </p>
                            
                            <!-- Action Button -->
                            <div style="text-align: center; margin-bottom: 30px;">
                                <a href="https://app.getvion.com/console/settings" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
                                    Planı Yükselt
                                </a>
                            </div>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                                Sorularınız için bizimle iletişime geçebilirsiniz.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #6c757d; font-size: 13px; margin: 0;">
                                Vion AI Ekibi<br>
                                <span style="color: #adb5bd;">Powered by Vion AI</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'mock@vion.ai';
    return sendEmailOrMock(transporter, {
        from: `"Vion AI" <${emailUser}>`,
        to: customerEmail,
        subject: `🚀 Deneme Süreniz Sona Erdi - Paketinizi Yükseltin`,
        text: `Sayın ${customerName || 'Kullanıcımız'},\n\nVion AI ${planName} planındaki deneme süreniz ${formattedDate} tarihinde sona ermiştir.\n\nHesabınızı yükseltmek için: https://app.getvion.com/console/settings`,
        html: htmlContent,
    });
}

export interface UpgradeRequestData {
    adminEmail?: string; // Optional, defaults to env or info@userex.com.tr
    customerEmail: string;
    customerName: string;
    currentUserParams: {
        userId: string;
        currentPlan: string;
    };
    targetPlan: string;
}

/**
 * Send plan upgrade request to Admin
 */
export async function sendUpgradeRequestToAdmin(data: UpgradeRequestData): Promise<boolean> {
    const transporter = createTransporter();

    // Transporter check handled in sendEmailOrMock

    const { adminEmail, customerEmail, customerName, currentUserParams, targetPlan } = data;
    const recipientEmail = adminEmail || 'info@userex.com.tr';

    const formattedDate = new Date().toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Plan Yükseltme Talebi</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                            <div style="font-size: 40px; margin-bottom: 15px;">🚀</div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Yeni Plan Yükseltme Talebi</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Aşağıdaki müşterimiz planını yükseltmek istiyor:
                            </p>
                            
                            <!-- Request Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-radius: 8px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #10b981;">
                                <tr>
                                    <td>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #047857; font-size: 13px;">MÜŞTERİ</span><br>
                                                    <span style="color: #064e3b; font-size: 16px; font-weight: 600;">${customerName}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #047857; font-size: 13px;">E-POSTA</span><br>
                                                    <span style="color: #064e3b; font-size: 14px;">${customerEmail}</span>
                                                </td>
                                            </tr>
                                             <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #047857; font-size: 13px;">MEVCUT PLAN</span><br>
                                                    <span style="color: #064e3b; font-size: 14px;">${currentUserParams.currentPlan}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #047857; font-size: 13px;">İSTENEN PLAN</span><br>
                                                    <span style="color: #064e3b; font-size: 18px; font-weight: 700;">${targetPlan}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #047857; font-size: 13px;">TALEP TARİHİ</span><br>
                                                    <span style="color: #064e3b; font-size: 14px;">📅 ${formattedDate}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                             <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                                Müşteri ID: <code style="background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px;">${currentUserParams.userId}</code>
                            </p>

                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://app.getvion.com/admin/tenant/${currentUserParams.userId}/settings/customer-admin" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 30px; border-radius: 8px;">
                                    Müşteri Ayarlarına Git
                                </a>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #6c757d; font-size: 13px; margin: 0;">
                                <span style="color: #adb5bd;">Vion AI Admin Bildirimi</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'mock@vion.ai';
    return sendEmailOrMock(transporter, {
        from: `"Vion AI" <${emailUser}>`,
        to: recipientEmail,
        subject: `🚀 Yeni Plan Yükseltme Talebi - ${customerName}`,
        text: `Yeni Plan Yükseltme Talebi\n\nMüşteri: ${customerName} (${customerEmail})\nMevcut Plan: ${currentUserParams.currentPlan}\nİstenen Plan: ${targetPlan}\nTarih: ${formattedDate}`,
        html: htmlContent,
    });
}

