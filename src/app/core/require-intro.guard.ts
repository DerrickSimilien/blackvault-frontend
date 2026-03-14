import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { IntroStateService } from './intro-state.service';
import { firebaseAuth } from './firebase.config';
import { onAuthStateChanged } from 'firebase/auth';

export const requireIntroGuard: CanActivateFn = () => {
  const router = inject(Router);
  const introState = inject(IntroStateService);

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe();

      // Authenticated users skip the intro entirely
      if (user) {
        resolve(true);
        return;
      }

      // Unauthenticated users must watch the intro first
      if (!introState.hasPlayedIntro) {
        resolve(router.createUrlTree(['/intro'], { queryParams: { next: '/home' } }));
        return;
      }

      resolve(true);
    });
  });
};