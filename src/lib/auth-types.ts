// 用户认证相关类型定义

export type User = {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type LoginCredentials = {
  username: string; // 可以是邮箱或手机号
  password: string;
  rememberMe?: boolean;
};

export type LoginResponse = {
  success: boolean;
  data: {
    user: User;
    token: string;
    expiresIn: number;
  };
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
};

export type RegisterInput = {
  username: string;
  email?: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  name?: string;
};

export type RegisterResponse = {
  success: boolean;
  data?: {
    user: User;
    token: string;
  };
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
};

export type ForgotPasswordInput = {
  username: string; // 可以是邮箱或手机号
};

export type ForgotPasswordResponse = {
  success: boolean;
  message: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
};

export type ResetPasswordInput = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};

export type ResetPasswordResponse = {
  success: boolean;
  message: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
};

export type AuthError = {
  code: 'INVALID_CREDENTIALS' | 'USER_NOT_FOUND' | 'USER_INACTIVE' | 'VALIDATION_ERROR' | 'SERVER_ERROR';
  message: string;
  field?: string;
  details?: any;
};

// 验证规则
export const VALIDATION_RULES = {
  username: {
    required: '用户名不能为空',
    pattern: {
      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^1[3-9]\d{9}$/,
      message: '请输入有效的邮箱地址或手机号'
    },
    minLength: {
      value: 3,
      message: '用户名长度不能少于3个字符'
    },
    maxLength: {
      value: 50,
      message: '用户名长度不能超过50个字符'
    }
  },
  password: {
    required: '密码不能为空',
    minLength: {
      value: 6,
      message: '密码长度不能少于6个字符'
    },
    maxLength: {
      value: 20,
      message: '密码长度不能超过20个字符'
    },
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]/,
      message: '密码必须包含大小写字母和数字'
    }
  },
  email: {
    pattern: {
      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      message: '请输入有效的邮箱地址'
    }
  },
  phone: {
    pattern: {
      value: /^1[3-9]\d{9}$/,
      message: '请输入有效的手机号'
    }
  }
};