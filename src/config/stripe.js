// Client-side Stripe configuration
const stripeConfig = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  apiVersion: '2023-10-16'
};

// Validate publishable key
if (!stripeConfig.publishableKey) {
  console.error('Error: VITE_STRIPE_PUBLISHABLE_KEY is not set in environment variables');
}

export default stripeConfig;