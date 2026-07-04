import { Request, Response } from 'express';
import { masterService } from './master.service.js';

export const masterController = {
  getAllUsers: async (req: Request, res: Response) => {
    try {
      const users = await masterService.getAllUsers();
      return res.json(users);
    } catch (err: any) {
      console.error('Error fetching all users:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  createOwner: async (req: Request, res: Response) => {
    const { name, email, phone, password } = req.body;
    const masterId = req.user!.id;

    try {
      const user = await masterService.createOwner({ name, email, phone, password });
      
      // Log audit
      await masterService.logAction(
        masterId,
        'create_owner',
        user.id,
        `Created owner account for ${email}`
      );

      return res.status(201).json(user);
    } catch (err: any) {
      console.error('Error creating owner:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  changeUserRole: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { role } = req.body;
    const masterId = req.user!.id;

    try {
      // Prevent changing self role
      if (id === masterId) {
        return res.status(400).json({ message: 'You cannot change your own role.' });
      }

      const user = await masterService.changeUserRole(id, role);

      // Log audit
      await masterService.logAction(
        masterId,
        'change_role',
        id,
        `Changed role of ${user.email} to ${role}`
      );

      return res.json(user);
    } catch (err: any) {
      console.error('Error changing user role:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  deactivateUser: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const masterId = req.user!.id;

    try {
      // Prevent deactivating self
      if (id === masterId) {
        return res.status(400).json({ message: 'You cannot deactivate your own master account.' });
      }

      const user = await masterService.deactivateUser(id);

      // Log audit
      await masterService.logAction(
        masterId,
        'deactivate_user',
        id,
        `Deactivated account for ${user.email}`
      );

      return res.json(user);
    } catch (err: any) {
      console.error('Error deactivating user:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  activateUser: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const masterId = req.user!.id;

    try {
      const user = await masterService.activateUser(id);

      // Log audit
      await masterService.logAction(
        masterId,
        'activate_user',
        id,
        `Activated account for ${user.email}`
      );

      return res.json(user);
    } catch (err: any) {
      console.error('Error activating user:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  resetAnyPassword: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { newPassword } = req.body;
    const masterId = req.user!.id;

    try {
      const user = await masterService.resetUserPassword(id, newPassword);

      // Log audit
      await masterService.logAction(
        masterId,
        'reset_password',
        id,
        `Reset password for user ${user.email}`
      );

      return res.json({ message: `Successfully reset password for user ${user.email}.` });
    } catch (err: any) {
      console.error('Error resetting user password:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },

  getShopOverview: async (req: Request, res: Response) => {
    try {
      const overview = await masterService.getShopOverview();
      return res.json(overview);
    } catch (err: any) {
      console.error('Error fetching shop overview:', err);
      return res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
  },
};
