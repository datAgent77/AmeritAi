/**
 * Outlook Calendar Service
 * Handles Microsoft Graph API operations for Outlook Calendar
 */

export interface OutlookCalendarConfig {
    accessToken: string;
    refreshToken?: string;
    calendarId: string;
}

export interface CalendarEvent {
    subject: string;
    body?: {
        contentType: "HTML" | "Text";
        content: string;
    };
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    location?: {
        displayName: string;
    };
    attendees?: Array<{
        emailAddress: {
            address: string;
            name?: string;
        };
        type: "required" | "optional";
    }>;
}

export class OutlookCalendarService {
    private config: OutlookCalendarConfig;
    private baseUrl = "https://graph.microsoft.com/v1.0";

    constructor(config: OutlookCalendarConfig) {
        this.config = config;
    }

    /**
     * Refresh access token if expired
     */
    async refreshToken(): Promise<string> {
        if (!this.config.refreshToken) {
            throw new Error("No refresh token available");
        }

        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error("Microsoft OAuth not configured");
        }

        const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: this.config.refreshToken,
                scope: "https://graph.microsoft.com/Calendars.ReadWrite offline_access"
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error_description || "Failed to refresh token");
        }

        this.config.accessToken = data.access_token;
        if (data.refresh_token) {
            this.config.refreshToken = data.refresh_token;
        }

        return data.access_token;
    }

    /**
     * Create an event in Outlook Calendar
     */
    async createEvent(event: CalendarEvent): Promise<string> {
        const calendarEndpoint = this.config.calendarId === "calendar" 
            ? "/me/calendar/events"
            : `/me/calendars/${this.config.calendarId}/events`;

        const response = await fetch(`${this.baseUrl}${calendarEndpoint}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.config.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                subject: event.subject,
                body: event.body || {
                    contentType: "HTML",
                    content: ""
                },
                start: {
                    dateTime: event.start.dateTime,
                    timeZone: event.start.timeZone || "UTC"
                },
                end: {
                    dateTime: event.end.dateTime,
                    timeZone: event.end.timeZone || "UTC"
                },
                location: event.location,
                attendees: event.attendees || []
            })
        });

        const data = await response.json();
        if (!response.ok) {
            // Try refreshing token if unauthorized
            if (response.status === 401 && this.config.refreshToken) {
                await this.refreshToken();
                return this.createEvent(event);
            }
            throw new Error(data.error?.message || "Failed to create event");
        }

        return data.id;
    }

    /**
     * List events from Outlook Calendar
     */
    async listEvents(startDateTime?: string, endDateTime?: string, maxResults: number = 10): Promise<any[]> {
        const params = new URLSearchParams({
            $top: maxResults.toString()
        });

        if (startDateTime) params.set("$filter", `start/dateTime ge '${startDateTime}'`);
        if (endDateTime && startDateTime) {
            params.set("$filter", `start/dateTime ge '${startDateTime}' and start/dateTime le '${endDateTime}'`);
        }

        const calendarEndpoint = this.config.calendarId === "calendar"
            ? "/me/calendar/events"
            : `/me/calendars/${this.config.calendarId}/events`;

        const response = await fetch(
            `${this.baseUrl}${calendarEndpoint}?${params.toString()}`,
            {
                headers: { "Authorization": `Bearer ${this.config.accessToken}` }
            }
        );

        const data = await response.json();
        if (!response.ok) {
            if (response.status === 401 && this.config.refreshToken) {
                await this.refreshToken();
                return this.listEvents(startDateTime, endDateTime, maxResults);
            }
            throw new Error(data.error?.message || "Failed to list events");
        }

        return data.value || [];
    }

    /**
     * Test connection by fetching calendar info
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/me/calendars`, {
                headers: { "Authorization": `Bearer ${this.config.accessToken}` }
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}
