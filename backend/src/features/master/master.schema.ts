import { z } from 'zod';

export const CreateOwnerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits and contain only numbers'),
  }),
});

export const ChangeRoleSchema = z.object({
  body: z.object({
    role: z.enum(['owner', 'staff']),
  }),
});

export const ResetPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  }),
});
