/**
 * Harmony Music Player - Authentication Module
 * Handles register, login, logout, password reset, session management
 */

import supabase from './supabase.js';
import notify from './notifications.js';
import { validate, redirect, sanitizeHTML } from './utils.js';

// ─── Auth State ───────────────────────────────────────────────────────────────
let currentUser = null;
let currentProfile = null;

// ─── Public API ───────────────────────────────────────────────────────────────
export const auth = {
  // ── Register ───────────────────────────────────────────────────────────────
  async register(formData) {
    const { fullName, username, email, password, confirmPassword } = formData;

    // Client-side validation
    if (!validate.required(fullName)) return { error: 'Full name is required.' };
    if (!validate.required(username)) return { error: 'Username is required.' };
    if (!validate.email(email)) return { error: 'Please enter a valid email.' };
    if (!validate.password(password)) return { error: 'Password must be at least 8 characters.' };
    if (password !== confirmPassword) return { error: 'Passwords do not match.' };

    // Check username availability
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', sanitizeHTML(username))
      .maybeSingle();
    if (existing) return { error: 'Username is already taken.' };

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: sanitizeHTML(fullName),
          username: sanitizeHTML(username.toLowerCase().replace(/\s+/g, '_')),
        },
      },
    });

    if (error) {
      const code = error.code || '';
      const msg  = error.message || '';
      if (code === 'over_email_send_rate_limit' || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('after'))
        return { error: 'Too many signup attempts. Please wait a few minutes before trying again.' };
      if (code === 'user_already_exists' || msg.toLowerCase().includes('already registered'))
        return { error: 'An account with this email already exists. Please sign in.' };
      if (code === 'weak_password' || msg.toLowerCase().includes('weak'))
        return { error: 'Password is too weak. Use at least 8 characters with letters and numbers.' };
      return { error: msg || 'Signup failed. Please try again.' };
    }
    // If identities array is empty the email is already registered (pending confirmation)
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      return { error: 'This email is already registered. Check your inbox for the confirmation link, or try signing in.' };
    }
    return { data, needsVerification: !data.session };
  },

  // ── Login ──────────────────────────────────────────────────────────────────
  async login(email, password, rememberMe = false) {
    if (!validate.email(email)) return { error: 'Please enter a valid email.' };
    if (!password) return { error: 'Password is required.' };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      const code = error.code || '';
      const msg  = error.message || '';
      if (code === 'invalid_credentials' || msg.includes('Invalid login') || msg.includes('invalid_grant') || msg.includes('Invalid email or password'))
        return { error: 'Invalid email or password.' };
      if (code === 'email_not_confirmed' || msg.includes('Email not confirmed') || msg.includes('email_not_confirmed'))
        return { error: 'Please verify your email first — check your inbox for the confirmation link.' };
      if (code === 'user_not_found' || msg.includes('User not found'))
        return { error: 'No account found with this email.' };
      if (code === 'over_email_send_rate_limit' || msg.includes('rate limit'))
        return { error: 'Too many attempts. Please wait a minute and try again.' };
      return { error: msg || 'Login failed. Please try again.' };
    }

    if (rememberMe) {
      localStorage.setItem('harmony_remember', 'true');
    }

    currentUser = data.user;
    return { data };
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  async logout() {
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    localStorage.removeItem('harmony_remember');
    redirect('index.html');
  },

  // ── Forgot Password ────────────────────────────────────────────────────────
  async forgotPassword(email) {
    if (!validate.email(email)) return { error: 'Please enter a valid email address.' };

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/profile.html?reset=true` }
    );

    if (error) return { error: error.message };
    return { success: true };
  },

  // ── Update Password ────────────────────────────────────────────────────────
  async updatePassword(newPassword) {
    if (!validate.password(newPassword)) return { error: 'Password must be at least 8 characters.' };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return { success: true };
  },

  // ── Get Session ────────────────────────────────────────────────────────────
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // ── Get Current User ───────────────────────────────────────────────────────
  async getUser() {
    if (currentUser) return currentUser;
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
    return user;
  },

  // ── Get Profile ────────────────────────────────────────────────────────────
  async getProfile() {
    if (currentProfile) return currentProfile;
    const user = await this.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    currentProfile = data;
    return data;
  },

  // ── Require Auth (Route Protection) ───────────────────────────────────────
  async requireAuth() {
    const session = await this.getSession();
    if (!session) {
      const currentPage = encodeURIComponent(window.location.pathname + window.location.search);
      redirect(`login.html?redirect=${currentPage}`);
      return false;
    }
    return true;
  },

  // ── Require Guest (prevent logged-in users from seeing auth pages) ─────────
  async requireGuest() {
    const session = await this.getSession();
    if (session) {
      redirect('dashboard.html');
      return false;
    }
    return true;
  },

  // ── On Auth State Change ───────────────────────────────────────────────────
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      if (!session) currentProfile = null;
      callback(event, session);
    });
  },
};

// ─── Form Handlers ────────────────────────────────────────────────────────────

/** Attach login form handler */
export function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const email = form.querySelector('#email')?.value;
    const password = form.querySelector('#password')?.value;
    const rememberMe = form.querySelector('#rememberMe')?.checked;

    setLoading(btn, true, 'Signing in...');
    clearFormErrors(form);

    const { data, error } = await auth.login(email, password, rememberMe);

    if (error) {
      setLoading(btn, false, 'Sign In');
      showFormError(form, error);
      return;
    }

    notify.success('Welcome back!', `Good to see you again.`);
    setTimeout(() => {
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
      redirect(redirectUrl ? decodeURIComponent(redirectUrl) : 'dashboard.html');
    }, 800);
  });
}

/** Attach register form handler */
export function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  let submitting = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return;

    const btn = form.querySelector('[type="submit"]');
    submitting = true;
    setLoading(btn, true, 'Creating account...');
    clearFormErrors(form);

    const { data, error, needsVerification } = await auth.register({
      fullName: form.querySelector('#fullName')?.value,
      username: form.querySelector('#username')?.value,
      email: form.querySelector('#email')?.value,
      password: form.querySelector('#password')?.value,
      confirmPassword: form.querySelector('#confirmPassword')?.value,
    });

    submitting = false;
    setLoading(btn, false, 'Create Account');

    if (error) { showFormError(form, error); return; }

    if (needsVerification) {
      redirect(`login.html?registered=true`);
    } else {
      notify.success('Account created!', 'Welcome to Harmony!');
      redirect('dashboard.html');
    }
  });

  // Live password strength indicator
  const passInput = form.querySelector('#password');
  const strengthBar = form.querySelector('.password-strength-bar');
  if (passInput && strengthBar) {
    passInput.addEventListener('input', () => {
      const strength = getPasswordStrength(passInput.value);
      strengthBar.style.width = `${strength.score * 25}%`;
      strengthBar.dataset.level = strength.level;
    });
  }
}

/** Attach forgot password form handler */
export function initForgotPasswordForm() {
  const form = document.getElementById('forgotForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const email = form.querySelector('#email')?.value;

    setLoading(btn, true, 'Sending...');
    clearFormErrors(form);

    const { success, error } = await auth.forgotPassword(email);
    setLoading(btn, false, 'Send Reset Link');

    if (error) { showFormError(form, error); return; }

    document.getElementById('forgotForm')?.classList.add('hidden');
    document.getElementById('successMessage')?.classList.remove('hidden');
  });
}

// ─── Form Helpers ─────────────────────────────────────────────────────────────
function setLoading(btn, loading, text) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner"></span>${text}`
    : text;
}

function showFormError(form, msg) {
  const errorEl = form.querySelector('.form-error');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
  }
}

function clearFormErrors(form) {
  form.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
}

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = ['', 'weak', 'fair', 'good', 'strong'];
  return { score, level: levels[score] || '' };
}
