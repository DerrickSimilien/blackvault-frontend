import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SubscriptionService } from './subscription.service';
import { CartService } from './cart.service';

/**
 * Put on the `scan` route. Free users get 2 scans; after that, trying to open
 * any scan page shows the subscribe modal instead. The Device Safety Scan runs
 * on the user's own device and never uploads anything, so it stays free.
 */
export const scanGate: CanActivateFn = (_route, state) => {
  if (state.url.startsWith('/scan/device')) return true;

  const subs = inject(SubscriptionService);
  const router = inject(Router);
  if (subs.canScan()) return true;

  void subs.openModal();
  // If they typed the URL directly there is no page behind the modal, so
  // park them on the dashboard.
  return router.navigated ? false : router.createUrlTree(['/dashboard']);
};

/**
 * Put on `results/:scanId`. A scan counts when the user arrives at its results
 * straight from a scan page (not when they reopen an old result from My Scans).
 */
export const countScan: CanActivateFn = (route) => {
  const router = inject(Router);
  const subs = inject(SubscriptionService);
  const from = router.getCurrentNavigation()?.previousNavigation?.finalUrl?.toString() ?? '';
  if (from.startsWith('/scan/') && !from.startsWith('/scan/device')) {
    subs.recordScan(route.paramMap.get('scanId') ?? '');
  }
  return true;
};

/** Checkout needs something in the cart; otherwise send the user back to pick a plan. */
export const cartGuard: CanActivateFn = () => {
  const cart = inject(CartService);
  const router = inject(Router);
  return cart.count() > 0 ? true : router.createUrlTree(['/subscribe']);
};