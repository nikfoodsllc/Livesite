// Using string instead of ObjectId to avoid bundling MongoDB in client components
// On the server side, these map to MongoDB ObjectId type
export type ObjectId = string;

export type UserRole = 'USER' | 'ADMIN';

export interface IUser {
  _id?: ObjectId;
  name?: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  isCompleted: boolean;
  provider: string;
  addresses?: ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAddress {
  _id?: ObjectId;
  user: ObjectId;
  name: string;
  location_remark?: string;
  phone?: string;
  email: string;
  street_address: string;
  city: string;
  province?: string;
  postal_code: string;
  apartment?: string;
  floor?: string;
  entrance?: string;
  notes?: string;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserResponse {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: UserRole;
  isCompleted: boolean;
}

export interface AuthResponse {
  data: {
    user: UserResponse;
    token: string;
    refreshToken: string;
    expiresIn: number;
    isCompleted: boolean;
  };
  message: string;
}

export interface SignupStep1Request {
  fullName?: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
