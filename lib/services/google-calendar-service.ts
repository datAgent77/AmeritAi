/**
 * Google Calendar Service
 * Handles Google Calendar API operations including OAuth2 token management and event CRUD
 */

export interface GoogleCalendarConfig {
    accessToken: string;
    refreshToken?: string;
    calendarId: string;
}

export interface CalendarEvent {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string } | { date: string };
    end: { dateTime: string; timeZone?: string } | { date: string };
    location?: string;
    attendees?: Array<{ email: string }>;
}

export class GoogleCalendarService {
    private config: GoogleCalendarConfig;

    constructor(config: GoogleCalendarConfig) {
        this.config = config;
    }

    /**
     * Refresh access token if expired
     */
    async refreshToken(): Promise<string> {
        if (!this.config.refreshToken) {
            throw new Error("No refresh token available");
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error("Google OAuth not configured");
        }

        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: this.config.refreshToken
            }).toString()
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error_description || "Failed to refresh token");
        }

        this.config.accessToken = data.access_token;
        return data.access_token;
    }

    /**
     * Create an event in Google Calendar
     */
    async createEvent(event: CalendarEvent): Promise<string> {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.config.calendarId}/events`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.config.accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    summary: event.summary,
                    description: event.description || "",
                    start: {
                        ...event.start,
                        ...('dateTime' in event.start ? { timeZone: event.start.timeZone || "UTC" } : {})
                    },
                    end: {
                        ...event.end,
                        ...('dateTime' in event.end ? { timeZone: event.end.timeZone || "UTC" } : {})
                    },
                    location: event.location,
                    attendees: event.attendees || []
                })
            }
        );

        const data = await response.json();
        if (!response.ok) {
            // Try refreshing token if unauthorized
            if (response.status === 401) {
                await this.refreshToken();
                return this.createEvent(event);
            }
            throw new Error(data.error?.message || "Failed to create event");
        }

        return data.id;
    }

    /**
     * List events from Google Calendar
     */
    async listEvents(timeMin?: string, timeMax?: string, maxResults: number = 10): Promise<any[]> {
        const params = new URLSearchParams({
            maxResults: maxResults.toString()
        });

        if (timeMin) params.set("timeMin", timeMin);
        if (timeMax) params.set("timeMax", timeMax);

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.config.calendarId}/events?${params.toString()}`,
            {
                headers: { "Authorization": `Bearer ${this.config.accessToken}` }
            }
        );

        const data = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                await this.refreshToken();
                return this.listEvents(timeMin, timeMax, maxResults);
            }
            throw new Error(data.error?.message || "Failed to list events");
        }

        return data.items || [];
    }

    /**
     * Test connection by fetching calendar info
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/users/me/calendarList/primary`,
                {
                    headers: { "Authorization": `Bearer ${this.config.accessToken}` }
                }
            );
            return response.ok;
        } catch {
            return false;
        }
    }
}
