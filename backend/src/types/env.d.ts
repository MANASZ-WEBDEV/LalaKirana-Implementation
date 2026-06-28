declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      SUPABASE_URL: string;
      SUPABASE_SERVICE_ROLE_KEY: string;
      JWT_SECRET: string;
      JWT_EXPIRY: string;
      FRONTEND_URL: string;
      OWNER_RECOVERY_CODE?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
    }
  }
}

export {};
