import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SubscriptionService, ScanKind } from './subscription.service';
import { CartService } from './cart.service';

/**
 * Put on the `scan` route. Free users get:
 *   - 2 document-style scans (document, resume, code, contract),
 *   - 1 "Scan My Screen" (/scan/capture),
 *   - 1 "Device Safety Scan" (/scan/device).
 * Once an allowance is used, opening that scan shows the subscribe modal instead.
 */
export const scanGate: CanActivateFn = (_route, state) => {
  const kind: ScanKind =
    state.url.startsWith('/scan/device') ? 'device'
    : state.url.startsWith('/scan/capture') ? 'capture'
    : 'document';

  const subs = inject(SubscriptionService);
  const router = inject(Router);
  if (subs.canScan(kind)) return true;

  void subs.openModal(kind);
  // If they typed the URL directly there is no page behind the modal, so
  // park them on the dashboard.
  return router.navigated ? false : router.createUrlTree(['/dashboard']);
};

/**
 * Put on `results/:scanId`. A scan counts when the user arrives at its results
 * straight from a scan page (not when they reopen an old result from My Scans).
 * Screen scans use their own free allowance; the Device Safety Scan has no
 * results page (it is counted on the page itself when it finishes).
 */
export const countScan: CanActivateFn = (route) => {
  const router = inject(Router);
  const subs = inject(SubscriptionService);
  const from = router.getCurrentNavigation()?.previousNavigation?.finalUrl?.toString() ?? '';
  const scanId = route.paramMap.get('scanId') ?? '';
  if (from.startsWith('/scan/capture')) {
    subs.recordScan(scanId, 'capture');
  } else if (from.startsWith('/scan/') && !from.startsWith('/scan/device')) {
    subs.recordScan(scanId, 'document');
  }
  return true;
};

/** Checkout needs something in the cart; otherwise send the user back to pick a plan. */
export const cartGuard: CanActivateFn = () => {
  const cart = inject(CartService);
  const router = inject(Router);
  return cart.count() > 0 ? true : router.createUrlTree(['/subscribe']);
};