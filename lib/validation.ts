import { z } from 'zod'

// Vote request validation
export const voteSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  restaurantId: z.string().min(1, 'restaurantId is required'),
  liked: z.boolean(),
})

// Close voting request validation (requires host authorization)
export const closeVotingSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
})

// Set reconfiguring request validation
export const setReconfiguringSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
})

// Location validation
export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

// Filters validation
export const filtersSchema = z.object({
  minRating: z.number().min(0).max(5),
  openNow: z.boolean(),
  maxReviews: z.number().min(0),
  distance: z.number().min(0).max(50), // km
  priceLevel: z.array(z.number().min(1).max(4)),
  cuisines: z.array(z.string()),
})

// Create session request validation
export const createSessionSchema = z.object({
  filters: filtersSchema,
  location: locationSchema,
})

// Reconfigure session request validation
export const reconfigureSessionSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  filters: filtersSchema,
  location: locationSchema,
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
