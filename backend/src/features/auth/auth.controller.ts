import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { supabase } from '../../db/supabase.js';
import { authService } from './auth.service.js';
import { emailService } from './email.service.js';
import { parseDeviceHint } from '../../utils/deviceHint.js';

export const authController = {
  login: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      // Find user
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ message: 'Internal server error during login' });
      }

      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check if user is deactivated
      if (user.is_active === false) {
        return res.status(401).json({ message: 'Your account has been deactivated. Please contact the owner.' });
      }

      // Check lockout
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const remainingMinutes = Math.ceil(
          (new Date(user.locked_until).getTime() - Date.now()) / (60 * 1000)
        );
        return res.status(403).json({
          message: `Account is temporarily locked. Please try again in ${remainingMinutes} minutes.`,
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        // Reset failed login attempts
        if (user.failed_attempts > 0 || user.locked_until) {
          await supabase
            .from('users')
            .update({ failed_attempts: 0, locked_until: null })
            .eq('id', user.id);
        }

        // Generate token and session
        const userAgent = req.headers['user-agent'];
        const deviceHint = parseDeviceHint(userAgent);
        // Clean IPv6 prefix if present in local environments
        const ip = (req.ip || 'unknown').replace(/^::ffff:/, '');

        const token = await authService.generateToken(
          { id: user.id, email: user.email, role: user.role },
          deviceHint,
          ip
        );

        return res.json({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          token,
        });
      } else {
        // Increment failed attempts
        const failedAttempts = (user.failed_attempts || 0) + 1;
        const updateData: { failed_attempts: number; locked_until?: string | null } = {
          failed_attempts: failedAttempts,
        };

        if (failedAttempts >= 5) {
          const lockoutTime = new Date(Date.now() + 30 * 60 * 1000); // 30 mins
          updateData.locked_until = lockoutTime.toISOString();
        }

        await supabase.from('users').update(updateData).eq('id', user.id);

        if (failedAttempts >= 5) {
          return res.status(403).json({
            message: 'Account has been locked due to too many failed attempts. Please try again in 30 minutes.',
          });
        }

        return res.status(401).json({ message: 'Invalid email or password' });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  logout: async (req: Request, res: Response) => {
    if (!req.user || !req.user.jti) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const expiresAt = req.user.exp
        ? new Date(req.user.exp * 1000)
        : new Date(Date.now() + 8 * 60 * 60 * 1000); // fallback 8h

      await authService.revokeToken(req.user.jti, req.user.id, expiresAt);

      return res.json({ message: 'Logged out successfully' });
    } catch (err: any) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  me: async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', req.user.id)
        .maybeSingle();

      if (error || !user) {
        return res.status(401).json({ message: 'User not found' });
      }

      return res.json({
        user: {
          id: req.user.id,
          name: user.name,
          email: req.user.email,
          role: req.user.role,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  forgotPassword: async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      // Return identical response regardless of whether email exists to prevent enumeration
      const genericResponse = {
        message: 'If that email exists in our system, we have sent a reset OTP code.',
      };

      if (!user) {
        return res.json(genericResponse);
      }

      const otp = await authService.createOTP(email);
      await emailService.sendOTPEmail(email, otp);

      return res.json(genericResponse);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  resetPassword: async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;

    try {
      const isValid = await authService.verifyOTP(email, otp);
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid or expired OTP code' });
      }

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password and reset lockout
      await supabase
        .from('users')
        .update({
          password: hashedPassword,
          failed_attempts: 0,
          locked_until: null,
        })
        .eq('id', user.id);

      // Revoke all sessions for this user
      const { data: userSessions } = await supabase
        .from('sessions')
        .select('token_jti')
        .eq('user_id', user.id);

      if (userSessions && userSessions.length > 0) {
        const defaultExp = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
        const blocklistItems = userSessions.map((session: any) => ({
          token_jti: session.token_jti,
          user_id: user.id,
          expires_at: defaultExp.toISOString(),
        }));

        await supabase.from('token_blocklist').insert(blocklistItems);
        await supabase.from('sessions').delete().eq('user_id', user.id);
      }

      return res.json({ message: 'Password reset successfully' });
    } catch (err: any) {
      console.error('Reset password error:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  changePassword: async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .maybeSingle();

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect current password' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', user.id);

      // Revoke all other sessions for this user (except current session)
      const currentJti = req.user.jti;
      const { data: otherSessions } = await supabase
        .from('sessions')
        .select('token_jti')
        .eq('user_id', user.id)
        .neq('token_jti', currentJti || '');

      if (otherSessions && otherSessions.length > 0) {
        const defaultExp = new Date(Date.now() + 8 * 60 * 60 * 1000);
        const blocklistItems = otherSessions.map((session: any) => ({
          token_jti: session.token_jti,
          user_id: user.id,
          expires_at: defaultExp.toISOString(),
        }));

        await supabase.from('token_blocklist').insert(blocklistItems);
        await supabase
          .from('sessions')
          .delete()
          .eq('user_id', user.id)
          .neq('token_jti', currentJti || '');
      }

      return res.json({ message: 'Password changed successfully' });
    } catch (err: any) {
      console.error('Change password error:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  getSessions: async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', req.user.id)
        .order('last_seen', { ascending: false });

      if (error) {
        return res.status(500).json({ message: 'Failed to fetch sessions' });
      }

      // Mark current session
      const mappedSessions = sessions.map((session: any) => ({
        ...session,
        isCurrent: session.token_jti === req.user?.jti,
      }));

      return res.json(mappedSessions);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  deleteSession: async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const sessionId = req.params.id;

    try {
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      // A user can delete their own session, but only the owner can delete other users' sessions
      if (session.user_id !== req.user.id && req.user.role !== 'owner') {
        return res.status(403).json({ message: 'Forbidden: Cannot terminate another user\'s session' });
      }

      const defaultExp = new Date(Date.now() + 8 * 60 * 60 * 1000);
      await authService.revokeToken(session.token_jti, session.user_id, defaultExp);

      return res.json({ message: 'Session terminated' });
    } catch (err: any) {
      console.error('Delete session error:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  deleteAllSessions: async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const currentJti = req.user.jti;

      // Fetch all sessions for this user except the current one
      const { data: sessions } = await supabase
        .from('sessions')
        .select('token_jti, user_id')
        .eq('user_id', req.user.id)
        .neq('token_jti', currentJti || '');

      if (sessions && sessions.length > 0) {
        const defaultExp = new Date(Date.now() + 8 * 60 * 60 * 1000);
        const blocklistItems = sessions.map((s: any) => ({
          token_jti: s.token_jti,
          user_id: s.user_id,
          expires_at: defaultExp.toISOString(),
        }));

        await supabase.from('token_blocklist').insert(blocklistItems);
        await supabase
          .from('sessions')
          .delete()
          .eq('user_id', req.user.id)
          .neq('token_jti', currentJti || '');
      }

      return res.json({ message: `Terminated ${sessions?.length || 0} other sessions` });
    } catch (err: any) {
      console.error('Delete all sessions error:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  // --- User Management (Owner only) ---

  getUsers: async (req: Request, res: Response) => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, role, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      return res.json(users);
    } catch (err: any) {
      console.error('Get users error:', err);
      return res.status(500).json({ message: err.message || 'Failed to fetch users' });
    }
  },

  createUser: async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;

    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        return res.status(409).json({ message: 'A user with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const { data: user, error } = await supabase
        .from('users')
        .insert({ name, email, password: hashedPassword, role })
        .select('id, name, email, role, is_active, created_at')
        .single();

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }

      return res.status(201).json(user);
    } catch (err: any) {
      console.error('Create user error:', err);
      return res.status(400).json({ message: err.message || 'Failed to create user' });
    }
  },

  resetUserPassword: async (req: Request, res: Response) => {
    const userId = req.params.id;
    const { newPassword } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      const { error } = await supabase
        .from('users')
        .update({ password: hashedPassword, failed_attempts: 0, locked_until: null })
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to reset password: ${error.message}`);
      }

      // Revoke all sessions for this user
      const { data: userSessions } = await supabase
        .from('sessions')
        .select('token_jti')
        .eq('user_id', userId);

      if (userSessions && userSessions.length > 0) {
        const defaultExp = new Date(Date.now() + 8 * 60 * 60 * 1000);
        const blocklistItems = userSessions.map((session: any) => ({
          token_jti: session.token_jti,
          user_id: userId,
          expires_at: defaultExp.toISOString(),
        }));

        await supabase.from('token_blocklist').insert(blocklistItems);
        await supabase.from('sessions').delete().eq('user_id', userId);
      }

      return res.json({ message: 'Password reset successfully and all sessions terminated' });
    } catch (err: any) {
      console.error('Reset user password error:', err);
      return res.status(400).json({ message: err.message || 'Failed to reset password' });
    }
  },

  deactivateUser: async (req: Request, res: Response) => {
    const userId = req.params.id;

    try {
      // Cannot deactivate self
      if (userId === req.user?.id) {
        return res.status(400).json({ message: 'Cannot deactivate your own account' });
      }

      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to deactivate user: ${error.message}`);
      }

      // Revoke all sessions for deactivated user
      const { data: userSessions } = await supabase
        .from('sessions')
        .select('token_jti')
        .eq('user_id', userId);

      if (userSessions && userSessions.length > 0) {
        const defaultExp = new Date(Date.now() + 8 * 60 * 60 * 1000);
        const blocklistItems = userSessions.map((session: any) => ({
          token_jti: session.token_jti,
          user_id: userId,
          expires_at: defaultExp.toISOString(),
        }));

        await supabase.from('token_blocklist').insert(blocklistItems);
        await supabase.from('sessions').delete().eq('user_id', userId);
      }

      return res.json({ message: 'User deactivated and all sessions terminated' });
    } catch (err: any) {
      console.error('Deactivate user error:', err);
      return res.status(400).json({ message: err.message || 'Failed to deactivate user' });
    }
  },
};
