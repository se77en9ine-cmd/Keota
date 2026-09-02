import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database/connection';
import { users, roles, permissions, rolePermissions, auditLogs } from '../database/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { AppError } from '../middlewares/errorHandler';

export class UserController {
  public static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
          roleId: users.roleId,
          roleName: roles.name,
          storeId: users.storeId,
          language: users.language,
          currency: users.currency,
          theme: users.theme,
          phone: users.phone,
          pinCode: users.pinCode,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id));

      res.json({ success: true, users: list });
    } catch (err) {
      next(err);
    }
  }

  public static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password, pinCode, fullName, avatarUrl, roleId, storeId, phone, language } = req.body;
      const id = `user-${Date.now()}`;
      const passwordHash = await bcrypt.hash(password || 'password123', 10);

      await db.insert(users).values({
        id,
        username,
        email,
        passwordHash,
        pinCode: pinCode || '0000',
        fullName,
        avatarUrl,
        roleId: roleId || 'role-staff',
        storeId: storeId || 'store-flagship',
        phone,
        language: language || 'en',
        currency: 'USD',
        theme: 'dark',
        isActive: true,
      });

      res.status(201).json({ success: true, id, message: 'User created successfully' });
    } catch (err) {
      next(err);
    }
  }

  public static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { username, email, fullName, avatarUrl, phone, roleId, storeId, pinCode, isActive, language, currency, theme, password } = req.body;

      const updateData: any = {
        fullName,
        avatarUrl,
        phone,
        roleId,
        storeId,
        pinCode,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        language,
        currency,
        theme,
        updatedAt: new Date().toISOString(),
      };

      if (username && username.trim()) {
        updateData.username = username.trim();
      }

      if (email && email.trim()) {
        updateData.email = email.trim();
      }

      if (password && password.trim()) {
        updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
      }

      await db.update(users).set(updateData).where(eq(users.id, id));
      res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await db.delete(users).where(eq(users.id, id));
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/users/upload-avatar — upload staff profile picture
   */
  public static async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No avatar image uploaded' });
      }
      const avatarUrl = `/uploads/users/${req.file.filename}`;
      res.json({
        success: true,
        avatarUrl,
        filename: req.file.filename,
        size: req.file.size,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const allPerms = await db.select().from(permissions);
      res.json({ success: true, permissions: allPerms });
    } catch (err) {
      next(err);
    }
  }

  public static async getRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const allRoles = await db.select().from(roles);
      let allRolePerms = await db
        .select({
          roleId: rolePermissions.roleId,
          permissionId: rolePermissions.permissionId,
          permissionCode: permissions.code,
          module: permissions.module,
        })
        .from(rolePermissions)
        .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

      if (allRolePerms.length === 0) {
        const allPerms = await db.select().from(permissions);
        for (const role of allRoles) {
          let grantedPerms = allPerms;
          if (role.name === 'MANAGER') {
            grantedPerms = allPerms.filter((p) => p.code !== 'SYS_SETTINGS');
          } else if (role.name === 'ACCOUNTANT') {
            grantedPerms = allPerms.filter((p) => ['ACC_MANAGE', 'REP_VIEW', 'REP_EXPORT'].includes(p.code));
          } else if (role.name === 'WAREHOUSE') {
            grantedPerms = allPerms.filter((p) => ['INV_MANAGE', 'PUR_MANAGE', 'PROD_MANAGE'].includes(p.code));
          } else if (role.name === 'CASHIER') {
            grantedPerms = allPerms.filter((p) => ['POS_SELL', 'POS_DISCOUNT'].includes(p.code));
          } else if (role.name === 'STAFF') {
            grantedPerms = allPerms.filter((p) => ['POS_SELL'].includes(p.code));
          }
          // SUPER_ADMIN and OWNER get all permissions
          for (const perm of grantedPerms) {
            await db.insert(rolePermissions).values({
              id: `rp-${role.id}-${perm.id}`,
              roleId: role.id,
              permissionId: perm.id,
            });
          }
        }

        allRolePerms = await db
          .select({
            roleId: rolePermissions.roleId,
            permissionId: rolePermissions.permissionId,
            permissionCode: permissions.code,
            module: permissions.module,
          })
          .from(rolePermissions)
          .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id));
      }

      const rolesWithPerms = allRoles.map((r) => {
        const assigned = allRolePerms.filter((rp) => rp.roleId === r.id);
        return {
          ...r,
          permissionIds: assigned.map((a) => a.permissionId),
          permissionCodes: assigned.map((a) => a.permissionCode),
        };
      });

      res.json({ success: true, roles: rolesWithPerms });
    } catch (err) {
      next(err);
    }
  }

  public static async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, permissionIds } = req.body;
      const roleId = `role-${Date.now()}`;

      await db.insert(roles).values({
        id: roleId,
        name: name.toUpperCase().replace(/\s+/g, '_'),
        description,
        isSystem: false,
      });

      if (Array.isArray(permissionIds) && permissionIds.length > 0) {
        for (const pid of permissionIds) {
          await db.insert(rolePermissions).values({
            id: `rp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            roleId,
            permissionId: pid,
          });
        }
      }

      res.status(201).json({ success: true, roleId, message: 'Role created successfully' });
    } catch (err) {
      next(err);
    }
  }

  public static async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, permissionIds } = req.body;

      await db.update(roles).set({
        name: name ? name.toUpperCase().replace(/\s+/g, '_') : undefined,
        description,
      }).where(eq(roles.id, id));

      if (Array.isArray(permissionIds)) {
        await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
        for (const pid of permissionIds) {
          await db.insert(rolePermissions).values({
            id: `rp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            roleId: id,
            permissionId: pid,
          });
        }
      }

      res.json({ success: true, message: 'Role updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const existing = (await db.select().from(roles).where(eq(roles.id, id)).limit(1))[0];
      if (existing && existing.isSystem) {
        throw new AppError('Cannot delete built-in system role', 400);
      }
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
      await db.delete(roles).where(eq(roles.id, id));
      res.json({ success: true, message: 'Role deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  public static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          username: users.username,
          action: auditLogs.action,
          module: auditLogs.module,
          entityId: auditLogs.entityId,
          newValuesJson: auditLogs.newValuesJson,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .orderBy(sql`${auditLogs.createdAt} DESC`)
        .limit(100);

      res.json({ success: true, logs });
    } catch (err) {
      next(err);
    }
  }
}
