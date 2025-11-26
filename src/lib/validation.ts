import { z } from 'zod';

/**
 * 用户名验证（邮箱或手机号）
 */
export const usernameSchema = z.string()
  .min(3, '用户名长度不能少于3个字符')
  .max(50, '用户名长度不能超过50个字符')
  .refine(
    (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^1[3-9]\d{9}$/;
      return emailRegex.test(value) || phoneRegex.test(value);
    },
    {
      message: '请输入有效的邮箱地址或手机号',
    }
  );

/**
 * 密码验证
 */
export const passwordSchema = z.string()
  .min(6, '密码长度不能少于6个字符')
  .max(20, '密码长度不能超过20个字符')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字');

/**
 * 登录表单验证schema
 */
export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  rememberMe: z.boolean().optional(),
});

/**
 * 注册表单验证schema
 */
export const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号').optional().or(z.literal('')),
  password: passwordSchema,
  confirmPassword: z.string(),
  name: z.string().max(20, '姓名长度不能超过20个字符').optional().or(z.literal('')),
}).refine((data) => {
  // 邮箱和手机号至少填一个
  return data.email || data.phone;
}, {
  message: '邮箱和手机号至少填一个',
  path: ['email'],
}).refine((data) => {
  // 密码确认匹配
  return data.password === data.confirmPassword;
}, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

/**
 * 忘记密码表单验证schema
 */
export const forgotPasswordSchema = z.object({
  username: usernameSchema,
});

/**
 * 重置密码表单验证schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, '重置令牌不能为空'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => {
  return data.newPassword === data.confirmPassword;
}, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

/**
 * 验证用户名格式
 */
export function validateUsername(username: string): { valid: boolean; type: 'email' | 'phone' | 'invalid' } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^1[3-9]\d{9}$/;
  
  if (emailRegex.test(username)) {
    return { valid: true, type: 'email' };
  }
  
  if (phoneRegex.test(username)) {
    return { valid: true, type: 'phone' };
  }
  
  return { valid: false, type: 'invalid' };
}

/**
 * 验证密码强度
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('密码长度不能少于6个字符');
  }
  
  if (password.length > 20) {
    errors.push('密码长度不能超过20个字符');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('密码必须包含小写字母');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('密码必须包含大写字母');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('密码必须包含数字');
  }
  
  const valid = errors.length === 0;
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  
  if (valid) {
    if (password.length >= 12 && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      strength = 'strong';
    } else if (password.length >= 8) {
      strength = 'medium';
    }
  }
  
  return { valid, strength, errors };
}

/**
 * 实时表单验证
 */
export function validateField(
  field: string,
  value: string,
  schema: z.ZodSchema
): { valid: boolean; error?: string } {
  try {
    const fieldSchema = schema.shape[field];
    if (fieldSchema) {
      fieldSchema.parse(value);
      return { valid: true };
    }
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: error.errors[0]?.message || '验证失败',
      };
    }
    return { valid: false, error: '验证失败' };
  }
}

/**
 * 获取密码强度颜色
 */
export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'text-red-500';
    case 'medium':
      return 'text-yellow-500';
    case 'strong':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * 获取密码强度文本
 */
export function getPasswordStrengthText(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return '弱';
    case 'medium':
      return '中等';
    case 'strong':
      return '强';
    default:
      return '';
  }
}