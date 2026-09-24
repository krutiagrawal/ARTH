import { useEffect, useRef } from 'react';
import { useStripe } from '@stripe/stripe-react-native';

interface PaymentSheetRunnerProps {
  clientSecret: string;
  merchantDisplayName?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

/**
 * Renders nothing itself — mounted only for the moment a payment/sponsorship is actually in
 * flight, so the calling screen (CampaignDetailScreen/DriveDetailScreen) never has to statically
 * import `@stripe/stripe-react-native` just to view details. That import is what forced those
 * screens into their own React.lazy + Suspense wrapper in AppNavigator (the package throws on
 * import in Expo Go); moving it here lets the detail screens be plain, instantly-mounted screens
 * and defers Stripe's cost to the moment "Donate"/"Sponsor" is actually tapped.
 */
export default function PaymentSheetRunner({
  clientSecret,
  merchantDisplayName = 'ARTH',
  onSuccess,
  onCancel,
  onError,
}: PaymentSheetRunnerProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const { error: initError } = await initPaymentSheet({ merchantDisplayName, paymentIntentClientSecret: clientSecret });
        if (initError) {
          onError(initError.message);
          return;
        }
        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code === 'Canceled') {
            onCancel();
          } else {
            onError(presentError.message);
          }
          return;
        }
        onSuccess();
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      }
    })();
    // clientSecret identifies the intent this runner exists for — a new one means a new payment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret]);

  return null;
}
