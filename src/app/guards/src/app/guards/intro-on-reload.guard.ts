import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

function wasReload(): boolean {
  const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  const navType = navEntries?.[0]?.type;
  return navType === 'reload';
}

export const introOnReloadGuard: CanActivateFn = () => {
  const router = inject(Router);

  // If user refreshed while on /home, force them through intro first
  if (wasReload()) {
    return router.createUrlTree(['/intro'], { queryParams: { next: '/home' } });
  }

  return true;
};