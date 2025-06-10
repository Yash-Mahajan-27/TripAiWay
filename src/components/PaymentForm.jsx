import React, { useState, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function PaymentForm({ clientSecret, amount, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw submitError;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        throw error;
      }

      if (paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent);
      } else {
        throw new Error(`Payment status: ${paymentIntent.status}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-500 dark:to-blue-500 text-white py-6 text-lg rounded-xl hover:from-green-700 hover:to-blue-700 dark:hover:from-green-600 dark:hover:to-blue-600 transition-all duration-300"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
            Processing Payment...
          </div>
        ) : (
          <>Pay ₹{amount?.toLocaleString()}</>
        )}
      </Button>
    </form>
  );
}

export default PaymentForm; 