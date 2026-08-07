import { env } from '../../config/env.js';
import { User } from '../../models/User.js';
import { signToken } from './auth.service.js';

export async function register({ name, email, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  const user = await User.create({ name, email, password, role: role || 'sales_executive' });
  const token = signToken({ userId: user._id, role: user.role, email: user.email });

  return {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const token = signToken({ userId: user._id, role: user.role, email: user.email });

  return {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
}

export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

export async function seedDemoUser() {
  if (!env.seedDemoUsers) return User.findOne({ email: 'sales@infinitylearn.com' });
  if (env.nodeEnv === 'production' && env.demoUserPassword === 'demo1234') {
    console.warn('[auth] Refusing to seed demo users with the default password in production. Set DEMO_USER_PASSWORD.');
    return User.findOne({ email: 'sales@infinitylearn.com' });
  }
  const existing = await User.findOne({ email: 'sales@infinitylearn.com' });
  if (!existing) {
    await User.create({
      name: 'Demo Sales Executive',
      email: 'sales@infinitylearn.com',
      password: env.demoUserPassword,
      role: 'sales_executive',
    });
  }

  const admin = await User.findOne({ email: 'admin@infinitylearn.com' });
  if (!admin) {
    await User.create({
      name: 'Demo Admin',
      email: 'admin@infinitylearn.com',
      password: env.demoUserPassword,
      role: 'admin',
    });
  }

  return User.findOne({ email: 'sales@infinitylearn.com' });
}
