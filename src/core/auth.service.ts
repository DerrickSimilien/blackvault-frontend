import { Injectable, signal, inject } from '@angular/core';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
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

  constructor() {
    onAuthStateChanged(firebaseAuth, (user) => {
      this.currentUser.set(user);
    });
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      this.router.navigateByUrl('/dashboard');
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
      await createUserWithEmailAndPassword(firebaseAuth, email, password);
      this.router.navigateByUrl('/dashboard');
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
      const provider = new GoogleAuthProvider();
      await signInWithPopup(firebaseAuth, provider);
      this.router.navigateByUrl('/dashboard');
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

  async logout(): Promise<void> {
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