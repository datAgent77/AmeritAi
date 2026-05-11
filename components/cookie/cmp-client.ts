"use client"

import { User } from "firebase/auth"

async function getToken(user: User) {
  return user.getIdToken()
}

export async function cmpFetch<T>(user: User, input: string, init?: RequestInit): Promise<T> {
  const token = await getToken(user)
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof (data as any)?.error === "string" ? (data as any).error : `Request failed (${res.status})`
    throw new Error(message)
  }
  return data as T
}
