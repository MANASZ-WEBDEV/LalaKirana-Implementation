import { z } from 'zod';

export const CreateTranslationSchema = z.object({
  body: z.object({
    token: z
      .string()
      .min(1, 'Token is required')
      .transform((val) => val.trim().toLowerCase()),
    hindi: z.string().min(1, 'Hindi translation is required').trim(),
    category: z.enum(['brand', 'product', 'qualifier', 'general']),
  }),
});

export const UpdateTranslationSchema = z.object({
  body: z.object({
    token: z
      .string()
      .min(1, 'Token is required')
      .transform((val) => val.trim().toLowerCase())
      .optional(),
    hindi: z.string().min(1, 'Hindi translation is required').trim().optional(),
    category: z.enum(['brand', 'product', 'qualifier', 'general']).optional(),
  }),
});
