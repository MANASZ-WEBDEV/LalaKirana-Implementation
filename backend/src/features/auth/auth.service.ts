import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { supabase } from '../../db/supabase.js';

interface JWTPayload {
  id: string;
  email: string;
  role: 'owner' | 'staff';
  jti: string;
}

export const authService = {
  generateToken: async (
    user: { id: string; email: string; role: 'owner' | 'staff' },
    deviceHint: string,
    ip: string
  ): Promise<string> => {
    const jti = uuidv4();
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const payload: JWTPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      jti,
    };

    const expiresIn = process.env.JWT_EXPIRY || '8h';
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

  createOTP: async (email: string): Promise<string> => {
    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(otp, 12);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const { error } = await supabase
      .from('otp_requests')
      .insert({
        email,
        otp_hash: hash,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (error) {
      throw new Error(`Failed to store OTP request: ${error.message}`);
    }

    return otp;
  },

  verifyOTP: async (email: string, otp: string): Promise<boolean> => {
    // Find latest unused, non-expired OTP request
    const { data: requests, error } = await supabase
      .from('otp_requests')
      .select('*')
      .eq('email', email)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !requests || requests.length === 0) {
      return false;
    }

    const latestRequest = requests[0];
    const match = await bcrypt.compare(otp, latestRequest.otp_hash);
    if (!match) {
      return false;
    }

    // Mark as used
    const { error: updateError } = await supabase
      .from('otp_requests')
      .update({ used: true })
      .eq('id', latestRequest.id);

    if (updateError) {
      console.error(`Failed to mark OTP as used: ${updateError.message}`);
      return false;
    }

    return true;
  },
};
