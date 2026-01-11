/**
 * Mailchimp Service
 * Handles Mailchimp API operations for list management and subscriber operations
 */

export interface MailchimpConfig {
    apiKey: string;
    serverPrefix: string;
}

export interface MailchimpMember {
    email_address: string;
    status: "subscribed" | "unsubscribed" | "cleaned" | "pending" | "transactional";
    merge_fields?: {
        FNAME?: string;
        LNAME?: string;
        PHONE?: string;
        [key: string]: any;
    };
    tags?: string[];
}

export class MailchimpService {
    private config: MailchimpConfig;
    private baseUrl: string;

    constructor(config: MailchimpConfig) {
        this.config = config;
        this.baseUrl = `https://${config.serverPrefix}.api.mailchimp.com/3.0`;
    }

    private getAuthHeader(): string {
        return `Basic ${Buffer.from(`anystring:${this.config.apiKey}`).toString('base64')}`;
    }

    private async request(method: string, endpoint: string, body?: any): Promise<any> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                "Authorization": this.getAuthHeader(),
                "Content-Type": "application/json"
            },
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || `Mailchimp API error: ${response.statusText}`);
        }

        return data;
    }

    /**
     * Get all lists
     */
    async getLists(): Promise<any[]> {
        const data = await this.request("GET", "/lists?count=1000");
        return data.lists || [];
    }

    /**
     * Get a specific list
     */
    async getList(listId: string): Promise<any> {
        return this.request("GET", `/lists/${listId}`);
    }

    /**
     * Add or update a member in a list
     */
    async addOrUpdateMember(listId: string, member: MailchimpMember): Promise<string> {
        const emailHash = Buffer.from(member.email_address.toLowerCase()).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        const data = await this.request("PUT", `/lists/${listId}/members/${emailHash}`, {
            email_address: member.email_address,
            status_if_new: member.status,
            status: member.status,
            merge_fields: member.merge_fields || {},
            tags: member.tags || []
        });

        return data.id;
    }

    /**
     * Get a member from a list
     */
    async getMember(listId: string, email: string): Promise<any> {
        const emailHash = Buffer.from(email.toLowerCase()).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return this.request("GET", `/lists/${listId}/members/${emailHash}`);
    }

    /**
     * Add tags to a member
     */
    async addTags(listId: string, email: string, tags: string[]): Promise<void> {
        const emailHash = Buffer.from(email.toLowerCase()).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        await this.request("POST", `/lists/${listId}/members/${emailHash}/tags`, {
            tags: tags.map(tag => ({ name: tag, status: "active" }))
        });
    }

    /**
     * Test connection
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.request("GET", "/");
            return true;
        } catch {
            return false;
        }
    }
}
