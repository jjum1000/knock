import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

function errorHandler(
  err: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Default error response
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  // Handle specific error types

  // 1. Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Invalid request data';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // 2. Prisma errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    errorCode = 'DATABASE_ERROR';

    switch (err.code) {
      case 'P2002':
        message = 'A record with this value already exists';
        details = { field: err.meta?.target };
        statusCode = 409;
        errorCode = 'DUPLICATE_ENTRY';
        break;
      case 'P2025':
        message = 'Record not found';
        statusCode = 404;
        errorCode = 'NOT_FOUND';
        break;
      case 'P2003':
        message = 'Foreign key constraint failed';
        errorCode = 'FOREIGN_KEY_ERROR';
        break;
      default:
        message = 'Database operation failed';
    }
  }

  // 3. Prisma validation errors
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Invalid data provided';
  }

  // 4. Custom API errors
  else if ('statusCode' in err && err.statusCode) {
    statusCode = err.statusCode;
    errorCode = (err as ApiError).code || 'API_ERROR';
    message = err.message;
  }

  // 5. JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: errorCode,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
}

export default errorHandler;

// Helper function to create custom errors
export function createError(
  message: string,
  statusCode: number = 500,
  code: string = 'ERROR'
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
