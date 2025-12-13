import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models';
import { SERVER } from '../config/config';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      [, token] = req.headers.authorization.split(' ');
    }

    // Check for token in cookies
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, SERVER.JWT_SECRET) as { id: string };

    // Get user from token
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

export const generateToken = (userId: string): string =>
  jwt.sign({ id: userId }, SERVER.JWT_SECRET, {
    expiresIn: SERVER.JWT_EXPIRE as jwt.SignOptions['expiresIn'],
  });
