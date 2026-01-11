/**
 * SendGrid Service
 * Handles SendGrid API operations for email sending
 */

export interface SendGridConfig {
    apiKey: string;
    fromEmail: string;
}

export interface EmailData {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    cc?: string | string[];
    bcc?: string | string[];
}

export class SendGridService {
    private config: SendGridConfig;

    constructor(config: SendGridConfig) {
        this.config = config;
    }

    /**
     * Send an email via SendGrid
     */
    async sendEmail(emailData: EmailData): Promise<string> {
        const payload: any = {
            personalizations: [{
                to: Array.isArray(emailData.to) 
                    ? emailData.to.map(email => ({ email }))
                    : [{ email: emailData.to }],
                subject: emailData.subject
            }],
            from: {
                email: emailData.from || this.config.fromEmail
            },
            content: []
        };

        if (emailData.html) {
            payload.content.push({
                type: "text/html",
                value: emailData.html
            });
        }

        if (emailData.text) {
            payload.content.push({
                type: "text/plain",
                value: emailData.text
            });
        }

        if (emailData.cc) {
            payload.personalizations[0].cc = Array.isArray(emailData.cc)
                ? emailData.cc.map(email => ({ email }))
                : [{ email: emailData.cc }];
        }

        if (emailData.bcc) {
            payload.personalizations[0].bcc = Array.isArray(emailData.bcc)
                ? emailData.bcc.map(email => ({ email }))
                : [{ email: emailData.bcc }];
        }

        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.config.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors?.[0]?.message || `SendGrid API error: ${response.statusText}`);
        }

        // SendGrid returns 202 Accepted with message ID in X-Message-Id header
        const messageId = response.headers.get("X-Message-Id") || "";
        return messageId;
    }

    /**
     * Test connection by fetching user profile
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch("https://api.sendgrid.com/v3/user/profile", {
                headers: {
                    "Authorization": `Bearer ${this.config.apiKey}`,
                    "Content-Type": "application/json"
                }
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}
