import { z } from 'zod'

// Vote request validation — voter identity comes from Clerk auth() server-side
export const voteSchema = z.object({
  restaurantId: z.string().min(1, 'restaurantId is required'),
  liked: z.boolean(),
})

// Location validation
export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

// Filters validation
// Google-era fields (rating, price, open-now) are gone; unknown keys from
// old clients are stripped by Zod, not rejected.
export const filtersSchema = z.object({
  distance: z.number().min(0).max(80), // km (50 miles max)
  cuisines: z.array(z.string()),
  preferLocal: z.boolean().default(true), // Prefer local restaurants over chains
})

// Create session request validation
// Where the deck comes from (Phase 5): mix (default) | library | group
const deckSourceSchema = z.enum(['mix', 'library', 'group']).optional()
const groupIdSchema = z.string().uuid().optional()

export const createSessionSchema = z.object({
  filters: filtersSchema,
  location: locationSchema,
  deckSource: deckSourceSchema,
  groupId: groupIdSchema,
})

// Reconfigure session request validation — host identity comes from auth()
export const reconfigureSessionSchema = z.object({
  filters: filtersSchema,
  location: locationSchema,
  deckSource: deckSourceSchema,
  groupId: groupIdSchema,
})

// Helper to parse and validate request body
export async function parseBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = result.error.issues.map((e: any) =>
        `${e.path?.join('.') || 'value'}: ${e.message}`
      ).join(', ')
      return { success: false, error: errors || 'Validation failed' }
    }
    return { success: true, data: result.data }
  } catch {
    return { success: false, error: 'Invalid JSON body' }
  }
}
