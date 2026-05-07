import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function BillingCancelScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/billing/plans');
  }, []);
  return null;
}
