import { z } from 'zod';

export const LoginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    recoveryCode: z.string().optional(),
    rememberMe: z.boolean().optional(),
  }),
});

export const ChangePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  }),
});

export const CreateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits and contain only numbers'),
    role: z.enum(['owner', 'staff']),
  }),
});

export const ResetUserPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  }),
});

export const UpdatePinSchema = z.object({
  body: z.object({
    pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  }),
});

export const VerifyPinSchema = z.object({
  body: z.object({
    pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  }),
});

export const Verify2faSchema = z.object({
  body: z.object({
    code: z.string().regex(/^\d{6}$/, '2FA code must be exactly 6 digits'),
    preAuthToken: z.string().min(1, 'Pre-auth token is required'),
  }),
});
