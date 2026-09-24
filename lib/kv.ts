/**
 * Vercel KV (Upstash Redis) client
 *
 * The Upstash marketplace integration prefixes its env vars (db1_KV_...),
 * while the legacy Vercel KV integration used unprefixed names. Accept
 * both, preferring the prefixed ones.
 */

import { createClient, type VercelKV } from '@vercel/kv'

function getKvConfig(): { url: string; token: string } | null {
  const url =
    process.env.db1_KV_REST_API_URL ??
    process.env.DB1_KV_REST_API_URL ??
    process.env.KV_REST_API_URL
  const token =
    process.env.db1_KV_REST_API_TOKEN ??
    process.env.DB1_KV_REST_API_TOKEN ??
    process.env.KV_REST_API_TOKEN

  if (!url || !token) return null
  return { url, token }
}

export function isKvConfigured(): boolean {
  return getKvConfig() !== null
}

// Lazy initialization so builds don't fail when env vars are absent
let _kv: VercelKV | null = null

function getKv(): VercelKV {
  if (!_kv) {
    const config = getKvConfig()
    if (!config) {
      throw new Error(
        'KV is not configured: set db1_KV_REST_API_URL/db1_KV_REST_API_TOKEN (or legacy KV_REST_API_URL/KV_REST_API_TOKEN)'
      )
    }
    _kv = createClient(config)
  }
  return _kv
}

export const kv = new Proxy({} as VercelKV, {
  get(_target, prop) {
    const client = getKv() as unknown as Record<string | symbol, unknown>
    const value = client[prop]
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value
  },
})
