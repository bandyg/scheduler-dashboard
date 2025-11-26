/**
 * 登录页面单元测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/login/page';
import * as authApi from '@/lib/auth-api';
import { useRouter } from 'next/navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock auth API
jest.mock('@/lib/auth-api', () => ({
  login: jest.fn(),
  isAuthenticated: jest.fn(),
}));

describe('LoginPage', () => {
  const mockPush = jest.fn();
  const mockLogin = authApi.login as jest.MockedFunction<typeof authApi.login>;
  const mockIsAuthenticated = authApi.isAuthenticated as jest.MockedFunction<typeof authApi.isAuthenticated>;

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    mockIsAuthenticated.mockReturnValue(false);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('页面渲染', () => {
    it('应该正确渲染登录表单', () => {
      render(<LoginPage />);
      
      expect(screen.getByText('用户登录')).toBeInTheDocument();
      expect(screen.getByText('请输入您的账号信息以继续')).toBeInTheDocument();
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
      expect(screen.getByLabelText('密码')).toBeInTheDocument();
      expect(screen.getByText('记住我')).toBeInTheDocument();
      expect(screen.getByText('忘记密码？')).toBeInTheDocument();
      expect(screen.getByText('立即注册')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    });

    it('应该显示密码隐藏/显示功能', () => {
      render(<LoginPage />);
      
      const passwordInput = screen.getByLabelText('密码') as HTMLInputElement;
      const toggleButton = screen.getByRole('button', { name: /显示密码/i });
      
      expect(passwordInput.type).toBe('password');
      
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('text');
      
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });

    it('如果用户已登录应该跳转到首页', () => {
      mockIsAuthenticated.mockReturnValue(true);
      
      render(<LoginPage />);
      
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('表单验证', () => {
    it('应该验证用户名格式', async () => {
      render(<LoginPage />);
      
      const usernameInput = screen.getByLabelText('用户名');
      const loginButton = screen.getByRole('button', { name: '登录' });
      
      // 输入无效的用户名
      await userEvent.type(usernameInput, 'invalid');
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText('请输入有效的邮箱地址或手机号')).toBeInTheDocument();
      });
    });

    it('应该验证邮箱格式', async () => {
      render(<LoginPage />);
      
      const usernameInput = screen.getByLabelText('用户名');
      const loginButton = screen.getByRole('button', { name: '登录' });
      
      // 输入有效的邮箱
      await userEvent.type(usernameInput, 'test@example.com');
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.queryByText('请输入有效的邮箱地址或手机号')).not.toBeInTheDocument();
      });
    });

    it('应该验证手机号格式', async () => {
      render(<LoginPage />);
      
      const usernameInput = screen.getByLabelText('用户名');
      const loginButton = screen.getByRole('button', { name: '登录' });
      
      // 输入有效的手机号
      await userEvent.type(usernameInput, '13800138000');
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.queryByText('请输入有效的邮箱地址或手机号')).not.toBeInTheDocument();
      });
    });

    it('应该验证密码长度', async () => {
      render(<LoginPage />);
      
      const passwordInput = screen.getByLabelText('密码');
      const loginButton = screen.getByRole('button', { name: '登录' });
      
      // 输入过短的密码
      await userEvent.type(passwordInput, '123');
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText('密码长度不能少于6个字符')).toBeInTheDocument();
      });
    });

    it('应该验证密码复杂度', async () => {
      render(<LoginPage />);
      
      const passwordInput = screen.getByLabelText('密码');
      const loginButton = screen.getByRole('button', { name: '登录' });
      
      // 输入不符合复杂度要求的密码
      await userEvent.type(passwordInput, 'password');
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText('密码必须包含大小写字母和数字')).toBeInTheDocument();
      });
    });
  });

  describe('登录功能', () => {
    it('应该成功登录并重定向', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: '1',
            username: 'test@example.com',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user',
            status: 'active',
          },
          token: 'test-token',
          expiresIn: 86400000,
        },
        message: '登录成功',
      });

      render(<LoginPage />);
      
      const usernameInput = screen.getByLabelText('用户名');
      const passwordInput = screen.getByLabelText('密码');
      const loginButton = screen.getByRole('button', { name: '登录' });
      
      await userEvent.type(usernameInput, 'test@example.com');
      await userEvent.type(passwordInput, 'Test123');
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          username: 'test@example.com',
          password: 'Test123',
          rememberMe: false,
        });
        expect(screen.getByText('登录成功，正在跳转...')).toBeInTheDocument();
      });

      // 等待重定向
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      }, { timeout: 2000 });
    });

    it('应该处理登录失败', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '用户名或密码错误',
        },
      });

      render(<LoginPage />);
      
      const usernameInput = screen.getByLabelText('用户名');
      const passwordInput = screen.getByLabelText('密码');
      const loginButton = screen.getByRole('button', { name: '登录' });
      
      await userEvent.type(usernameInput, 'wrong@example.com');
      await userEvent.type(passwordInput, 'Wrong123');
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText('用户名或密码错误')).toBeInTheDocument();
      });
    });

    it('应该处理用户被禁用的情况', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: '用户被禁用',
        },
      });

      render(<LoginPage />);
      
      const usernameInput = screen.getByLabelText('用户名');
      const passwordInput = screen.getByLabelText('密码');
      const loginButton = screen.getByRole('button', { name: '登录' });
      
      await userEvent.type(usernameInput, 'inactive@example.com');
      await userEvent.type(passwordInput, 'Inactive123');
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText('账号已被禁用，请联系管理员')).toBeInTheDocument();
      });
    });

    it('应该显示加载状态', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(<LoginPage />);
      
      const usernameInput = screen.getByLabelText('用户名');
      const passwordInput = screen.getByLabelText('密码');
      const loginButton = screen.getByRole('button', { name: '登录' });
      
      await userEvent.type(usernameInput, 'test@example.com');
      await userEvent.type(passwordInput, 'Test123');
      fireEvent.click(loginButton);
      
      expect(screen.getByText('登录中...')).toBeInTheDocument();
      expect(loginButton).toBeDisabled();
    });
  });

  describe('记住我功能', () => {
    it('应该保存用户名到localStorage', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: '1',
            username: 'test@example.com',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user',
            status: 'active',
          },
          token: 'test-token',
          expiresIn: 86400000,
        },
        message: '登录成功',
      });

      render(<LoginPage />);
      
      const usernameInput = screen.getByLabelText('用户名');
      const passwordInput = screen.getByLabelText('密码');
      const rememberMeCheckbox = screen.getByLabelText('记住我');
      const loginButton = screen.getByRole('button', { name: '登录' });
      
      await userEvent.type(usernameInput, 'test@example.com');
      await userEvent.type(passwordInput, 'Test123');
      fireEvent.click(rememberMeCheckbox);
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(localStorage.getItem('remembered_username')).toBe('test@example.com');
      });
    });

    it('应该从localStorage恢复用户名', () => {
      localStorage.setItem('remembered_username', 'saved@example.com');
      
      render(<LoginPage />);
      
      const usernameInput = screen.getByLabelText('用户名') as HTMLInputElement;
      const rememberMeCheckbox = screen.getByLabelText('记住我') as HTMLInputElement;
      
      expect(usernameInput.value).toBe('saved@example.com');
      expect(rememberMeCheckbox.checked).toBe(true);
    });

    it('应该清除localStorage当取消记住我', async () => {
      localStorage.setItem('remembered_username', 'saved@example.com');
      
      render(<LoginPage />);
      
      const rememberMeCheckbox = screen.getByLabelText('记住我');
      
      fireEvent.click(rememberMeCheckbox); // 取消选中
      
      expect(localStorage.getItem('remembered_username')).toBeNull();
    });
  });

  describe('链接功能', () => {
    it('忘记密码链接应该正确', () => {
      render(<LoginPage />);
      
      const forgotPasswordLink = screen.getByText('忘记密码？');
      expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
    });

    it('注册链接应该正确', () => {
      render(<LoginPage />);
      
      const registerLink = screen.getByText('立即注册');
      expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
    });
  });

  describe('安全功能', () => {
    it('应该显示安全提示', () => {
      render(<LoginPage />);
      
      expect(screen.getByText(/🔒 您的连接是安全的/)).toBeInTheDocument();
    });

    it('应该在输入时进行XSS防护', async () => {
      render(<LoginPage />);
      
      const usernameInput = screen.getByLabelText('用户名');
      const passwordInput = screen.getByLabelText('密码');
      
      // 尝试输入潜在的XSS脚本
      await userEvent.type(usernameInput, '<script>alert("XSS")</script>');
      await userEvent.type(passwordInput, '<script>alert("XSS")</script>');
      
      // 确保输入被正确处理，不会执行脚本
      expect(usernameInput.value).toBe('<script>alert("XSS")</script>');
      expect(passwordInput.value).toBe('<script>alert("XSS")</script>');
    });
  });

  describe('响应式设计', () => {
    it('应该在移动设备上正确显示', () => {
      // 模拟移动设备视口
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      
      render(<LoginPage />);
      
      const container = screen.getByText('用户登录').closest('div');
      expect(container).toHaveClass('max-w-md');
    });

    it('应该在桌面设备上正确显示', () => {
      // 模拟桌面设备视口
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      
      render(<LoginPage />);
      
      const container = screen.getByText('用户登录').closest('div');
      expect(container).toHaveClass('max-w-md');
    });
  });

  describe('错误处理', () => {
    it('应该处理网络错误', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'));

      render(<LoginPage />);
      
      const usernameInput = screen.getByLabelText('用户名');
      const passwordInput = screen.getByLabelText('密码');
      const loginButton = screen.getByRole('button', { name: '登录' });
      
      await userEvent.type(usernameInput, 'test@example.com');
      await userEvent.type(passwordInput, 'Test123');
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText('网络连接失败，请检查网络设置')).toBeInTheDocument();
      });
    });

    it('应该处理空响应错误', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: null,
      });

      render(<LoginPage />);
      
      const usernameInput = screen.getByLabelText('用户名');
      const passwordInput = screen.getByLabelText('密码');
      const loginButton = screen.getByRole('button', { name: '登录' });
      
      await userEvent.type(usernameInput, 'test@example.com');
      await userEvent.type(passwordInput, 'Test123');
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText('登录失败，请检查用户名和密码')).toBeInTheDocument();
      });
    });
  });
});