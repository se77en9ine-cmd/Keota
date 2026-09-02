import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, or } from 'drizzle-orm';
import { db } from '../database/connection';
import { users, roles, stores } from '../database/schema';
import { config } from '../config/environment';
import { AppError } from '../middlewares/errorHandler';

export class AuthService {
  public static async login(identifier: string, password?: string, pin?: string) {
    let user;

    if (pin) {
      // PIN fast-login / register switch
      const matches = await db
        .select()
        .from(users)
        .where(eq(users.pinCode, pin))
        .limit(1);
      user = matches[0];

      if (!user) {
        throw new AppError('Invalid Cashier PIN', 401);
      }
    } else if (password) {
      const matches = await db
        .select()
        .from(users)
        .where(or(eq(users.username, identifier), eq(users.email, identifier)))
        .limit(1);
      user = matches[0];

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        throw new AppError('Invalid credentials', 401);
      }
    } else {
      throw new AppError('Password or PIN required for authentication', 400);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated. Contact Administrator.', 403);
    }

    // Fetch user role name
    const roleRecord = (await db.select().from(roles).where(eq(roles.id, user.roleId)).limit(1))[0];
    const roleName = roleRecord ? roleRecord.name : 'STAFF';

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(users.id, user.id));

    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: roleName,
      storeId: user.storeId,
    };

    const accessToken = jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });

    const refreshToken = jwt.sign({ id: user.id }, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn as any,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: roleName,
        storeId: user.storeId,
        language: user.language,
        currency: user.currency,
        theme: user.theme,
        avatarUrl: user.avatarUrl,
      },
      accessToken,
      refreshToken,
    };
  }

  public static async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, config.jwtRefreshSecret) as { id: string };
      const user = (await db.select().from(users).where(eq(users.id, decoded.id)).limit(1))[0];

      if (!user || !user.isActive) {
        throw new AppError('Invalid refresh token', 401);
      }

      const roleRecord = (await db.select().from(roles).where(eq(roles.id, user.roleId)).limit(1))[0];
      const roleName = roleRecord ? roleRecord.name : 'STAFF';

      const accessToken = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: roleName,
          storeId: user.storeId,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      return { accessToken };
    } catch (err) {
      throw new AppError('Expired or invalid refresh token', 401);
    }
  }

  public static async pinSwitch(pin: string) {
    return this.login('', undefined, pin);
  }

  public static async googleLogin(credentialToken: string) {
    // Decode Google JWT payload or verify via OAuth client
    // For universal offline/online flexibility:
    try {
      const decoded: any = jwt.decode(credentialToken);
      if (!decoded || !decoded.email) {
        throw new AppError('Invalid Google credential payload', 400);
      }

      const email = decoded.email;
      let user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];

      if (!user) {
        // Auto-provision Google user as Cashier/Staff if not existing
        const roleRecord = (await db.select().from(roles).where(eq(roles.name, 'CASHIER')).limit(1))[0];
        const newUserId = `user-${Date.now()}`;
        const tempPasswordHash = await bcrypt.hash(Math.random().toString(36), 10);
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();

        await db.insert(users).values({
          id: newUserId,
          username: email.split('@')[0],
          email: email,
          passwordHash: tempPasswordHash,
          pinCode: randomPin,
          fullName: decoded.name || email.split('@')[0],
          avatarUrl: decoded.picture || '',
          roleId: roleRecord ? roleRecord.id : 'role-cashier',
          language: 'en',
          currency: 'USD',
          theme: 'dark',
          isActive: true,
        });

        user = (await db.select().from(users).where(eq(users.id, newUserId)).limit(1))[0];
      }

      const roleRecord = (await db.select().from(roles).where(eq(roles.id, user.roleId)).limit(1))[0];
      const roleName = roleRecord ? roleRecord.name : 'CASHIER';

      const accessToken = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: roleName,
          storeId: user.storeId,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      const refreshToken = jwt.sign({ id: user.id }, config.jwtRefreshSecret, {
        expiresIn: config.jwtRefreshExpiresIn as any,
      });

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: roleName,
          storeId: user.storeId,
          language: user.language,
          currency: user.currency,
          theme: user.theme,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
        refreshToken,
      };
    } catch (err: any) {
      throw new AppError(`Google Auth failed: ${err.message}`, 400);
    }
  }
}
