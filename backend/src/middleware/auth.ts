import { Request, Response, NextFunction } from 'express';
import { User } from '../types';
import * as userStore from '../stores/user.store';
import * as banStore from '../stores/ban.store';
import * as deletedUserStore from '../stores/deleted-user.store';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
    user?: User;
}

/**
 * Authentication middleware - verifies JWT token from X-Session-Token header
 */
export async function authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const token = req.headers['x-session-token'] as string;

        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Unauthorized - No session token provided'
            });
            return;
        }

        logger.debug('Validating token...');

        // Get user from token using Supabase Auth
        const user = await userStore.getUserFromToken(token);

        if (!user) {
            res.status(401).json({
                success: false,
                error: 'Unauthorized - Invalid token'
            });
            return;
        }

        // Check if user was deleted
        const deletedUser = await deletedUserStore.getDeletedUserByEmail(user.email);
        if (deletedUser) {
            res.status(403).json({
                success: false,
                deleted: true,
                deletedData: deletedUser,
                error: 'User account was deleted'
            });
            return;
        }

        // Check if user is banned
        const { banned, data: banData } = await banStore.isUserBanned(user.id);
        if (banned && banData) {
            res.status(403).json({
                success: false,
                banned: true,
                banData,
                error: `User is ${banData.type}ed`
            });
            return;
        }

        // Check user status
        if (user.status !== 'active') {
            res.status(403).json({
                success: false,
                status: user.status,
                error: 'User account is not active'
            });
            return;
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error: any) {
        logger.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * Optional authentication - doesn't fail if no token, but validates if present
 */
export async function optionalAuth(
    req: AuthRequest,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const token = req.headers['x-session-token'] as string;

        if (!token) {
            next();
            return;
        }

        const user = await userStore.getUserFromToken(token);
        if (user) {
            req.user = user;
        }

        next();
    } catch (error: any) {
        logger.error('Optional auth error:', error);
        next();
    }
}
