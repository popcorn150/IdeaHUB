export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!,
  products: {
    monthly: {
      priceId: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || 'price_monthly_test',
      name: 'Monthly Pro',
      price: '$10',
      interval: 'month',
      description: 'Upload up to 100 ideas per month. Includes idea protection & blur feature.',
      features: [
        '100 ideas per month',
        'Idea protection & blur',
        'Premium support',
        'Advanced analytics'
      ]
    },
    quarterly: {
      priceId: import.meta.env.VITE_STRIPE_QUARTERLY_PRICE_ID || 'price_quarterly_test',
      name: 'Quarterly Pro',
      price: '$25',
      interval: '3 months',
      description: 'Upload up to 300 ideas over 3 months. Best for active creators.',
      features: [
        '300 ideas per quarter',
        'Idea protection & blur',
        'Premium support',
        'Advanced analytics',
        'Priority feature requests'
      ]
    },
    lifetime: {
      priceId: import.meta.env.VITE_STRIPE_LIFETIME_PRICE_ID || 'price_lifetime_test',
      name: 'Lifetime Pro',
      price: '$99',
      interval: 'lifetime',
      description: 'One-time payment for unlimited idea uploads and protection forever.',
      features: [
        'Unlimited ideas forever',
        'Idea protection & blur',
        'Premium support',
        'Advanced analytics',
        'Priority feature requests',
        'Early access to new features'
      ]
    }
  }
}

export const STRIPE_TEST_CARDS = {
  success: '4242424242424242',
  decline: '4000000000000002',
  requiresAuth: '4000002500003155',
  insufficientFunds: '4000000000009995'
}