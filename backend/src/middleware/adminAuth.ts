import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { logger } from '../utils/logger';

/**
 * Admin authentication middleware - requires user to be authenticated and have admin role
 */
export async function requireAdmin(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Unauthorized - Authentication required'
            });
            return;
        }

        if (req.user.role !== 'admin') {
            logger.warn(`Non-admin user ${req.user.email} attempted to access admin route`);
            res.status(403).json({
                success: false,
                error: 'Forbidden - Admin access required'
            });
            return;
        }

        next();
    } catch (error: any) {
        logger.error('Admin auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}
