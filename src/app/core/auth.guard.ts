import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firebaseAuth } from './firebase.config';
import { onAuthStateChanged } from 'firebase/auth';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe();
      if (user) {
        resolve(true);
      } else {
        resolve(router.createUrlTree(['/auth/login']));
      }
    });
  });
};