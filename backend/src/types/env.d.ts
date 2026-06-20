declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      SUPABASE_URL: string;
      SUPABASE_SERVICE_ROLE_KEY: string;
      JWT_SECRET: string;
      JWT_EXPIRY: string;
      FRONTEND_URL: string;
      SMTP_HOST?: string;
      SMTP_PORT?: string;
      SMTP_USER?: string;
      SMTP_PASS?: string;
      SMTP_FROM?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
    }
  }
}

export {};
