/**
 * Constant Contact Service
 * Handles Constant Contact API operations for contact management
 */

export interface ConstantContactConfig {
    accessToken: string;
    refreshToken?: string;
    apiKey: string;
}

export interface ConstantContactContact {
    email_address: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    list_memberships?: string[];
    custom_fields?: Array<{ custom_field_id: string; value: string }>;
}

export class ConstantContactService {
    private config: ConstantContactConfig;
    private baseUrl = "https://api.cc.email/v3";

    constructor(config: ConstantContactConfig) {
        this.config = config;
    }

    /**
     * Refresh access token if expired
     */
    async refreshToken(): Promise<string> {
        if (!this.config.refreshToken) {
            throw new Error("No refresh token available");
        }

        const response = await fetch("https://authz.constantcontact.com/oauth2/default/v1/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${Buffer.from(`${this.config.apiKey}:${process.env.CONSTANT_CONTACT_API_SECRET || ''}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: this.config.refreshToken
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

    private async request(method: string, endpoint: string, body?: any): Promise<any> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                "Authorization": `Bearer ${this.config.accessToken}`,
                "Content-Type": "application/json"
            },
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await response.json();

        if (!response.ok) {
            // Try refreshing token if unauthorized
            if (response.status === 401 && this.config.refreshToken) {
                await this.refreshToken();
                return this.request(method, endpoint, body);
            }
            throw new Error(data.error_message || data.detail || `Constant Contact API error: ${response.statusText}`);
        }

        return data;
    }

    /**
     * Get all contact lists
     */
    async getLists(): Promise<any[]> {
        const data = await this.request("GET", "/contact_lists");
        return data.lists || [];
    }

    /**
     * Create or update a contact
     */
    async createOrUpdateContact(contact: ConstantContactContact): Promise<string> {
        // First, try to find existing contact by email
        try {
            const searchData = await this.request("GET", `/contacts?email=${encodeURIComponent(contact.email_address)}`);
            const existingContact = searchData.contacts?.[0];

            if (existingContact) {
                // Update existing contact
                const updateData = await this.request("PUT", `/contacts/${existingContact.contact_id}`, {
                    email_address: contact.email_address,
                    first_name: contact.first_name || existingContact.first_name,
                    last_name: contact.last_name || existingContact.last_name,
                    phone_number: contact.phone_number || existingContact.phone_number,
                    list_memberships: contact.list_memberships || existingContact.list_memberships || [],
                    custom_fields: contact.custom_fields || existingContact.custom_fields || []
                });
                return existingContact.contact_id;
            }
        } catch (error) {
            // Contact not found, will create new one
        }

        // Create new contact
        const createData = await this.request("POST", "/contacts", {
            email_address: contact.email_address,
            first_name: contact.first_name || "",
            last_name: contact.last_name || "",
            phone_number: contact.phone_number || "",
            list_memberships: contact.list_memberships || [],
            custom_fields: contact.custom_fields || []
        });

        return createData.contact_id;
    }

    /**
     * Get a contact by email
     */
    async getContact(email: string): Promise<any> {
        const data = await this.request("GET", `/contacts?email=${encodeURIComponent(email)}`);
        return data.contacts?.[0];
    }

    /**
     * Test connection
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.request("GET", "/account_info");
            return true;
        } catch {
            return false;
        }
    }
}
