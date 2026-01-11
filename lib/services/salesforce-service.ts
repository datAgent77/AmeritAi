/**
 * Salesforce Service
 * Handles Salesforce API operations including OAuth2 token management and Lead/Contact CRUD
 */

export interface SalesforceConfig {
    accessToken: string;
    refreshToken?: string;
    instanceUrl: string;
    orgId?: string;
}

export interface SalesforceLead {
    FirstName?: string;
    LastName?: string;
    Email?: string;
    Phone?: string;
    Company?: string;
    LeadSource?: string;
    Status?: string;
}

export interface SalesforceContact {
    FirstName?: string;
    LastName?: string;
    Email?: string;
    Phone?: string;
    AccountId?: string;
}

export class SalesforceService {
    private config: SalesforceConfig;

    constructor(config: SalesforceConfig) {
        this.config = config;
    }

    /**
     * Refresh access token if expired
     */
    async refreshToken(clientId: string, clientSecret: string): Promise<string> {
        if (!this.config.refreshToken) {
            throw new Error("No refresh token available");
        }

        const response = await fetch("https://login.salesforce.com/services/oauth2/token", {
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
        if (data.instance_url) {
            this.config.instanceUrl = data.instance_url;
        }

        return data.access_token;
    }

    /**
     * Create a Lead in Salesforce
     */
    async createLead(lead: SalesforceLead): Promise<string> {
        const response = await fetch(`${this.config.instanceUrl}/services/data/v58.0/sobjects/Lead`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.config.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ...lead,
                LeadSource: lead.LeadSource || "Web",
                Status: lead.Status || "Open - Not Contacted"
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data[0]?.message || "Failed to create lead");
        }

        return data.id;
    }

    /**
     * Create or update a Contact in Salesforce
     */
    async upsertContact(contact: SalesforceContact, emailField: string = "Email"): Promise<string> {
        // First, try to find existing contact by email
        const query = `SELECT Id FROM Contact WHERE ${emailField} = '${contact.Email}' LIMIT 1`;
        const searchResponse = await fetch(
            `${this.config.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`,
            {
                headers: { "Authorization": `Bearer ${this.config.accessToken}` }
            }
        );

        const searchData = await searchResponse.json();
        const existingContactId = searchData.records?.[0]?.Id;

        if (existingContactId) {
            // Update existing contact
            const updateResponse = await fetch(
                `${this.config.instanceUrl}/services/data/v58.0/sobjects/Contact/${existingContactId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Authorization": `Bearer ${this.config.accessToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(contact)
                }
            );

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(errorData[0]?.message || "Failed to update contact");
            }

            return existingContactId;
        } else {
            // Create new contact
            const createResponse = await fetch(
                `${this.config.instanceUrl}/services/data/v58.0/sobjects/Contact`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${this.config.accessToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(contact)
                }
            );

            const createData = await createResponse.json();
            if (!createResponse.ok) {
                throw new Error(createData[0]?.message || "Failed to create contact");
            }

            return createData.id;
        }
    }

    /**
     * Test connection by fetching user info
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.instanceUrl}/services/oauth2/userinfo`, {
                headers: { "Authorization": `Bearer ${this.config.accessToken}` }
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}
