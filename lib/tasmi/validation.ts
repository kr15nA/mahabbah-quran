import { z } from 'zod'

const baseTasmiSchema = z.object({
  studentId: z.number().int().positive(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  score: z.number().int().min(0).max(100).nullable().optional(),
  status: z.enum(['PASSED', 'NEEDS_REVIEW']),
  notes: z.string().max(1000).nullable().optional(),
})

export const tasmiSurahInputSchema = baseTasmiSchema.extend({
  mode: z.literal('SURAH'),
  surahId: z.number().int().positive(),
})

export const tasmiJuzRangeInputSchema = baseTasmiSchema.extend({
  mode: z.literal('JUZ_RANGE'),
  startJuz: z.number().int().min(1).max(30),
  endJuz: z.number().int().min(1).max(30),
}).refine(data => data.startJuz <= data.endJuz, {
  message: "startJuz must be less than or equal to endJuz",
  path: ["startJuz"]
})

export const tasmiInputSchema = z.discriminatedUnion('mode', [
  tasmiSurahInputSchema,
  tasmiJuzRangeInputSchema
])

export type TasmiInput = z.infer<typeof tasmiInputSchema>
export type TasmiSurahInput = z.infer<typeof tasmiSurahInputSchema>
export type TasmiJuzRangeInput = z.infer<typeof tasmiJuzRangeInputSchema>
