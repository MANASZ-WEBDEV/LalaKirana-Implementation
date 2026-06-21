import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../db/supabase.js';

interface DecodedToken {
  id: string;
  email: string;
  role: 'owner' | 'staff';
  jti: string;
  exp: number;
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access token is missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'JWT_SECRET is not configured' });
  }

  try {
    const decoded = jwt.verify(token, secret) as DecodedToken;

    // 1. Check if token is in blocklist
    const { data: blocklisted } = await supabase
      .from('token_blocklist')
      .select('id')
      .eq('token_jti', decoded.jti)
      .maybeSingle();

    if (blocklisted) {
      return res.status(401).json({ message: 'Session has been revoked' });
    }

    // 2. Check if session exists in sessions table
    const { data: session } = await supabase
      .from('sessions')
      .select('id')
      .eq('token_jti', decoded.jti)
      .maybeSingle();

    if (!session) {
      return res.status(401).json({ message: 'Session expired or logged out' });
    }

    // 3. Update session last_seen asynchronously
    supabase
      .from('sessions')
      .update({ last_seen: new Date().toISOString() })
      .eq('token_jti', decoded.jti)
      .then(({ error }) => {
        if (error) {
          console.error(`Failed to update session last_seen: ${error.message}`);
        }
      })
      .catch((err) => {
        console.error(`Failed to update session last_seen: ${err.message}`);
      });

    // 4. Attach user payload to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
      jti: decoded.jti,
      exp: decoded.exp,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

