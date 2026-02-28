import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { IntroStateService } from './intro-state.service';

export const requireIntroGuard: CanActivateFn = () => {
  const router = inject(Router);
  const introState = inject(IntroStateService);

  if (!introState.hasPlayedIntro) {
    return router.createUrlTree(['/intro'], { queryParams: { next: '/home' } });
  }

  return true;
};