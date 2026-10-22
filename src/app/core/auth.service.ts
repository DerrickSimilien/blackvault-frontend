import { Injectable, signal, inject } from '@angular/core';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserSessionPersistence,
  type User
} from 'firebase/auth';
import { firebaseAuth } from './firebase.config';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  private persistenceReady: Promise<void>;

  constructor() {
    // Session-only persistence: the user stays signed in while the
    // browser/app session is open, but a fresh launch (new session)
    // always lands back on sign-in/create-account.
    this.persistenceReady = setPersistence(firebaseAuth, browserSessionPersistence);

    onAuthStateChanged(firebaseAuth, (user) => {
      this.currentUser.set(user);
    });
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await this.persistenceReady;
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      this.router.navigateByUrl(this.takeReturnUrl());
    } catch (err: unknown) {
      this.errorMessage.set(this.parseError((err as { code: string }).code));
    } finally {
      this.isLoading.set(false);
    }
  }

  async signupWithEmail(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await this.persistenceReady;
      await createUserWithEmailAndPassword(firebaseAuth, email, password);
      this.router.navigateByUrl(this.takeReturnUrl());
    } catch (err: unknown) {
      this.errorMessage.set(this.parseError((err as { code: string }).code));
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await this.persistenceReady;
      const provider = new GoogleAuthProvider();
      await signInWithPopup(firebaseAuth, provider);
      this.router.navigateByUrl(this.takeReturnUrl());
    } catch (err: unknown) {
      this.errorMessage.set(this.parseError((err as { code: string }).code));
    } finally {
      this.isLoading.set(false);
    }
  }

  async resetPassword(email: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
    } catch (err: unknown) {
      this.errorMessage.set(this.parseError((err as { code: string }).code));
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Remember where to send the user once they have signed in (e.g. '/subscribe'
   * from the "scan limit reached" modal). Only same-site paths are accepted.
   */
  setReturnUrl(url: string): void {
    try { sessionStorage.setItem('bv.afterLogin', url); } catch { /* storage unavailable */ }
  }

  /** Where to go after sign-in: the remembered page, or the dashboard. */
  private takeReturnUrl(): string {
    try {
      const url = sessionStorage.getItem('bv.afterLogin');
      sessionStorage.removeItem('bv.afterLogin');
      if (url && url.startsWith('/') && !url.startsWith('//')) return url;
    } catch { /* storage unavailable */ }
    return '/dashboard';
  }

  async logout(): Promise<void> {
    try { sessionStorage.removeItem('bv.afterLogin'); } catch { /* ignore */ }
    await signOut(firebaseAuth);
    this.router.navigateByUrl('/home');
  }

  private parseError(code: string): string {
    switch (code) {
      case 'auth/invalid-email': return 'Invalid email address.';
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/wrong-password': return 'Incorrect password.';
      case 'auth/email-already-in-use': return 'An account with this email already exists.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
      case 'auth/popup-closed-by-user': return 'Google sign-in was cancelled.';
      default: return 'Something went wrong. Please try again.';
    }
  }
}