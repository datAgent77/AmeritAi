/**
 * Shopify Service
 * Handles Shopify Admin API operations
 */

export interface ShopifyConfig {
    shopDomain: string;
    accessToken: string;
}

export interface ShopifyOrder {
    id: string;
    name: string;
    email?: string;
    total_price: string;
    created_at: string;
    line_items: Array<{
        title: string;
        quantity: number;
        price: string;
    }>;
}

export interface ShopifyCustomer {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
}

export class ShopifyService {
    private config: ShopifyConfig;
    private apiVersion = "2024-01";

    constructor(config: ShopifyConfig) {
        this.config = config;
    }

    private getApiUrl(endpoint: string): string {
        const shopUrl = this.config.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        return `https://${shopUrl}/admin/api/${this.apiVersion}${endpoint}`;
    }

    private async request(method: string, endpoint: string, body?: any): Promise<any> {
        const url = this.getApiUrl(endpoint);
        const options: RequestInit = {
            method,
            headers: {
                "X-Shopify-Access-Token": this.config.accessToken,
                "Content-Type": "application/json"
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.errors || `Shopify API error: ${response.statusText}`);
        }

        return data;
    }

    /**
     * Get orders from Shopify
     */
    async getOrders(params: { limit?: number; status?: string; since_id?: string } = {}): Promise<ShopifyOrder[]> {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.set("limit", params.limit.toString());
        if (params.status) queryParams.set("status", params.status);
        if (params.since_id) queryParams.set("since_id", params.since_id);

        const endpoint = `/orders.json${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const data = await this.request("GET", endpoint);
        return data.orders || [];
    }

    /**
     * Get a specific order by ID
     */
    async getOrder(orderId: string): Promise<ShopifyOrder> {
        const data = await this.request("GET", `/orders/${orderId}.json`);
        return data.order;
    }

    /**
     * Get customers from Shopify
     */
    async getCustomers(params: { limit?: number; email?: string } = {}): Promise<ShopifyCustomer[]> {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.set("limit", params.limit.toString());
        if (params.email) queryParams.set("email", params.email);

        const endpoint = `/customers.json${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const data = await this.request("GET", endpoint);
        return data.customers || [];
    }

    /**
     * Get shop information
     */
    async getShop(): Promise<any> {
        const data = await this.request("GET", "/shop.json");
        return data.shop;
    }

    /**
     * Test connection
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.getShop();
            return true;
        } catch {
            return false;
        }
    }
}
