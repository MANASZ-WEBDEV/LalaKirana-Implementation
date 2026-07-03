import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY is required and must be secure'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long for cryptographic security'),
  JWT_EXPIRY: z.string().default('8h'),
  FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required'),
  OWNER_RECOVERY_CODE: z.string().regex(/^\d{6,}$/, 'OWNER_RECOVERY_CODE must be a numeric string of at least 6 digits'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed during startup:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  👉 Env Error [${issue.path.join('.')}]: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
