import { DatabaseConnection } from '@/database/connection';
import { HashService } from '@/utils/hash';
import { JwtService } from '@/utils/jwt';
import { createError } from '@/middleware/errorHandler';
import { User } from '@/types/database';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
  };
  token: string;
}

export class AuthService {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  public async login(data: LoginRequest): Promise<AuthResponse> {
    const { email, password } = data;

    const result = await this.db.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    const users = (result as { rows: User[] }).rows;
    
    if (users.length === 0) {
      throw createError('Invalid email or password', 401);
    }

    const user = users[0];
    const isPasswordValid = await HashService.comparePassword(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      throw createError('Invalid email or password', 401);
    }

    const token = JwtService.generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    };
  }

  public async register(data: RegisterRequest): Promise<AuthResponse> {
    const { email, password } = data;

    const existingUserResult = await this.db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    const existingUsers = (existingUserResult as { rows: User[] }).rows;
    
    if (existingUsers.length > 0) {
      throw createError('User with this email already exists', 409);
    }

    const hashedPassword = await HashService.hashPassword(password);

    const result = await this.db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );

    const newUsers = (result as { rows: User[] }).rows;
    const newUser = newUsers[0];

    const token = JwtService.generateToken({
      userId: newUser.id,
      email: newUser.email,
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
      },
      token,
    };
  }

  public async validateUser(userId: number): Promise<User | null> {
    const result = await this.db.query(
      'SELECT id, email, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    const users = (result as { rows: User[] }).rows;
    return users.length > 0 ? users[0] : null;
  }
}