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
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('Email Service: EMAIL_USER or EMAIL_PASSWORD not set');
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });
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

    try {
        await transporter.sendMail({
            from: `"${companyName}" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            subject: `✅ Randevunuz Onaylandı - ${formattedDate}`,
            text: textContent,
            html: htmlContent,
        });

        console.log(`Email Service: Confirmation email sent to ${customerEmail}`);
        return true;
    } catch (error) {
        console.error('Email Service: Failed to send email:', error);
        return false;
    }
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

    try {
        await transporter.sendMail({
            from: `"${companyName}" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            subject: `❌ Randevunuz İptal Edildi - ${formattedDate}`,
            text: `Sayın ${customerName}, ${formattedDate} tarihli, saat ${time}'deki randevunuz iptal edilmiştir.`,
            html: htmlContent,
        });

        console.log(`Email Service: Cancellation email sent to ${customerEmail}`);
        return true;
    } catch (error) {
        console.error('Email Service: Failed to send cancellation email:', error);
        return false;
    }
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

    try {
        await transporter.sendMail({
            from: `"Vion AI" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `📋 Fatura Kesim Hatırlatması - ${customerName || customerEmail}`,
            text: `Fatura Kesim Zamanı\n\nMüşteri: ${customerName || customerEmail}\nE-posta: ${customerEmail}\nPlan: ${planName}\nFatura Tarihi: ${formattedDate}\nTutar: ${amountText}`,
            html: htmlContent,
        });

        console.log(`Email Service: Invoice reminder sent to admin ${adminEmail} for customer ${customerEmail}`);
        return true;
    } catch (error) {
        console.error('Email Service: Failed to send invoice reminder:', error);
        return false;
    }
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

    try {
        await transporter.sendMail({
            from: `"${companyName}" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            subject: `💳 Ödeme Hatırlatması - ${formattedDate}`,
            text: `Ödeme Hatırlatması\n\nSayın ${customerName || 'Değerli Müşterimiz'},\n\n${planName} planınız için ödeme zamanı yaklaşıyor.\n\nSon Ödeme Tarihi: ${formattedDate}\n${amount ? `Tutar: ${amountText}` : ''}\n\nHizmetlerinizin kesintisiz devam etmesi için lütfen ödemenizi zamanında yapınız.\n\n${companyName}`,
            html: htmlContent,
        });

        console.log(`Email Service: Payment reminder sent to ${customerEmail}`);
        return true;
    } catch (error) {
        console.error('Email Service: Failed to send payment reminder:', error);
        return false;
    }
}
