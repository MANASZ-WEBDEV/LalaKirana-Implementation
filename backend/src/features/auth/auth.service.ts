import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { supabase } from '../../db/supabase.js';
import { env } from '../../config/env.js';

interface JWTPayload {
  id: string;
  email: string;
  role: 'master' | 'owner' | 'staff';
  jti: string;
}

export const authService = {
  generateToken: async (
    user: { id: string; email: string; role: 'master' | 'owner' | 'staff' },
    deviceHint: string,
    ip: string
  ): Promise<string> => {
    const jti = uuidv4();
    const secret = env.JWT_SECRET;

    const payload: JWTPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      jti,
    };

    const expiresIn = env.JWT_EXPIRY;
    const token = jwt.sign(payload, secret, { expiresIn: expiresIn as any });


    // Create session record in database
    const { error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        token_jti: jti,
        device_hint: deviceHint,
        ip_address: ip,
        last_seen: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return token;
  },

  revokeToken: async (jti: string, userId: string, expiresAt: Date): Promise<void> => {
    // 1. Insert token into blocklist
    const { error: blocklistError } = await supabase
      .from('token_blocklist')
      .insert({
        token_jti: jti,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
      });

    if (blocklistError) {
      console.error(`Failed to blocklist token: ${blocklistError.message}`);
    }

    // 2. Delete session
    const { error: sessionError } = await supabase
      .from('sessions')
      .delete()
      .eq('token_jti', jti);

    if (sessionError) {
      console.error(`Failed to delete session: ${sessionError.message}`);
    }
  },
};
