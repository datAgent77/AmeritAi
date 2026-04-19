/**
 * Notification Service
 * 
 * Handles in-app notifications for billing reminders and other system events.
 * Stores notifications in Firestore 'notifications' collection.
 */

import { getAdminDb } from './firebase-admin';

export interface Notification {
    id?: string;
    userId: string;
    type: 'invoice_reminder' | 'payment_due' | 'payment_overdue' | 'general' | 'trial_expired' | 'upgrade_request' | 'human_handoff_request';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    metadata?: {
        invoiceDate?: string;
        paymentDueDate?: string;
        amount?: number;
        currency?: string;
        customerId?: string;
        customerEmail?: string;
        currentPlan?: string;
        targetPlan?: string;
        requestId?: string;
        callbackId?: string;
        source?: string;
        eventType?: string;
        triggerSource?: string;
        companyName?: string;
    };
}

/**
 * Create a new notification for a user
 */
export async function createNotification(data: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Promise<string | null> {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            console.error('Database not initialized');
            return null;
        }

        const notification: Omit<Notification, 'id'> = {
            ...data,
            isRead: false,
            createdAt: new Date().toISOString()
        };

        const docRef = await adminDb.collection('notifications').add(notification);
        return docRef.id;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

/**
 * Get notifications for a user
 */
export async function getNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            console.error('Database not initialized');
            return [];
        }

        const snapshot = await adminDb
            .collection('notifications')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Notification));
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            console.error('Database not initialized');
            return 0;
        }

        const snapshot = await adminDb
            .collection('notifications')
            .where('userId', '==', userId)
            .where('isRead', '==', false)
            .get();

        return snapshot.size;
    } catch (error) {
        console.error('Error counting unread notifications:', error);
        return 0;
    }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            console.error('Database not initialized');
            return false;
        }

        await adminDb.collection('notifications').doc(notificationId).update({
            isRead: true
        });

        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            console.error('Database not initialized');
            return false;
        }

        const snapshot = await adminDb
            .collection('notifications')
            .where('userId', '==', userId)
            .where('isRead', '==', false)
            .get();

        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });

        await batch.commit();
        return true;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
    }
}

/**
 * Delete old notifications (older than X days)
 */
export async function cleanupOldNotifications(userId: string, daysOld: number = 30): Promise<number> {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            console.error('Database not initialized');
            return 0;
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const snapshot = await adminDb
            .collection('notifications')
            .where('userId', '==', userId)
            .where('createdAt', '<', cutoffDate.toISOString())
            .get();

        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        return snapshot.size;
    } catch (error) {
        console.error('Error cleaning up old notifications:', error);
        return 0;
    }
}
