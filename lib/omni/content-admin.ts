import { getAdminDb } from "@/lib/firebase-admin"
import {
    CMS_COLLECTIONS,
    getDefaultCmsSeed,
    normalizeCmsItem,
    sortCmsItems,
    type CmsContentItem,
    type CmsContentKind,
} from "@/lib/cms-content"
import { authorizeOmniDirectoryRequest, authorizedForOmniPermission, jsonError, toIsoOrNull } from "@/lib/omni/server-utils"

export async function authorizeOmniContentAdminRequest(req: Request) {
    const authz = await authorizeOmniDirectoryRequest(req)
    if (!authz.ok) {
        return authz
    }

    if (!authorizedForOmniPermission(authz, "content.manage")) {
        return {
            ok: false as const,
            response: jsonError("Forbidden", 403),
        }
    }

    return authz
}

function getCmsCollection(kind: CmsContentKind) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        throw new Error("Firebase Admin SDK not initialized")
    }

    return adminDb.collection(CMS_COLLECTIONS[kind])
}

export function parseCmsKind(value: string): CmsContentKind | null {
    return value === "blog" || value === "faq" || value === "education" ? value : null
}

export async function listCmsContent(kind: CmsContentKind) {
    const collection = getCmsCollection(kind)
    const snapshot = await collection.get()
    let items = snapshot.docs.map((doc: any) => normalizeCmsItem(kind, { id: doc.id, ...doc.data() }))

    if (items.length === 0) {
        const seed = getDefaultCmsSeed(kind)
        if (seed.length > 0) {
            const batch = collection.firestore.batch()
            seed.forEach((item) => {
                const docRef = collection.doc()
                batch.set(docRef, {
                    ...item,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                })
            })
            await batch.commit()
            const seededSnapshot = await collection.get()
            items = seededSnapshot.docs.map((doc: any) => normalizeCmsItem(kind, { id: doc.id, ...doc.data() }))
        }
    }

    return sortCmsItems(kind, items)
}

export async function createCmsContent(kind: CmsContentKind, payload: any) {
    const collection = getCmsCollection(kind)
    const normalized = normalizeCmsItem(kind, payload) as CmsContentItem
    const record = {
        ...normalized,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
    delete (record as any).id

    const docRef = await collection.add(record)
    return { ...record, id: docRef.id }
}

export async function updateCmsContent(kind: CmsContentKind, id: string, payload: any) {
    const collection = getCmsCollection(kind)
    const docRef = collection.doc(id)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
        throw new Error("Content item not found")
    }

    const existing = snapshot.data() || {}
    const normalized = normalizeCmsItem(kind, { ...existing, ...payload, id }) as CmsContentItem
    const record = {
        ...normalized,
        updatedAt: new Date().toISOString(),
    }
    delete (record as any).id

    await docRef.set(record, { merge: true })
    return { ...record, id }
}

export async function deleteCmsContent(kind: CmsContentKind, id: string) {
    const collection = getCmsCollection(kind)
    const docRef = collection.doc(id)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
        throw new Error("Content item not found")
    }
    await docRef.delete()
}

export async function getAnnouncementSettings() {
    const adminDb = getAdminDb()
    if (!adminDb) {
        throw new Error("Firebase Admin SDK not initialized")
    }

    const snapshot = await adminDb.collection("settings").doc("announcement").get()
    const data = snapshot.exists ? snapshot.data() || {} : {}
    return {
        isActive: data.isActive === true,
        message: typeof data.message === "string" ? data.message : "",
        updatedAt: toIsoOrNull(data.updatedAt),
        updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
    }
}

export async function saveAnnouncementSettings(payload: { isActive?: boolean; message?: string; updatedBy?: string | null }) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        throw new Error("Firebase Admin SDK not initialized")
    }

    const record = {
        isActive: payload.isActive === true,
        message: typeof payload.message === "string" ? payload.message : "",
        updatedAt: new Date().toISOString(),
        updatedBy: payload.updatedBy || null,
    }

    await adminDb.collection("settings").doc("announcement").set(record, { merge: true })
    return record
}
