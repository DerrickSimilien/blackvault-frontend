import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firebaseAuth } from './firebase.config';
import { IntroStateService } from './intro-state.service';
import { onAuthStateChanged } from 'firebase/auth';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const introState = inject(IntroStateService);

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe();
      if (user) {
        introState.hasPlayedIntro = true;
        resolve(true);
      } else {
        resolve(router.createUrlTree(['/auth/login']));
      }
    });
  });
};