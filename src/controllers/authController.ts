import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '@/services/authService';
import { asyncHandler, createError } from '@/middleware/errorHandler';

const router = Router();
const authService = new AuthService();

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
];

const handleValidationErrors = (req: Request, res: Response, next: Function): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = createError('Validation failed', 400);
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array(),
    });
    return;
  }
  next();
};

router.post('/login', validateLogin, handleValidationErrors, asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  const result = await authService.login({ email, password });
  
  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: result,
  });
}));

router.post('/register', validateRegister, handleValidationErrors, asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  const result = await authService.register({ email, password });
  
  res.status(201).json({
    status: 'success',
    message: 'Registration successful',
    data: result,
  });
}));

export { router as authRouter };