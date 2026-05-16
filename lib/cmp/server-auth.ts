import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { resolveCookieConsentEnabled } from "@/lib/product-entitlements"
import { isSuperAdminRole, type UserRole } from "@/lib/user-roles"

type CmpAccessOk = {
  ok: true
  callerUid: string
  role: UserRole
  isSuperAdmin: boolean
  userData: Record<string, any>
  adminDb: FirebaseFirestore.Firestore
}

type CmpAccessDenied = {
  ok: false
  response: Response
}

export type CmpAccessResult = CmpAccessOk | CmpAccessDenied

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return null
  return header.slice("Bearer ".length)
}

export async function authorizeCmpAccess(req: Request): Promise<CmpAccessResult> {
  const adminAuth = getAdminAuth()
  const adminDb = getAdminDb()
  if (!adminAuth || !adminDb) {
    return { ok: false, response: NextResponse.json({ error: "Server misconfigured" }, { status: 500 }) }
  }

  const token = getBearerToken(req)
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  let decoded: any
  try {
    decoded = await adminAuth.verifyIdToken(token)
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const snapshot = await adminDb.collection("users").doc(decoded.uid).get()
  const userData = snapshot.exists ? snapshot.data() || {} : {}
  const role: UserRole = (userData.role || decoded.role || "USER") as UserRole
  const isSuperAdmin = isSuperAdminRole(role)
  const enabled = resolveCookieConsentEnabled(userData, isSuperAdmin ? "SUPER_ADMIN" : null)

  if (!enabled) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { ok: true, callerUid: decoded.uid, role, isSuperAdmin, userData, adminDb }
}
