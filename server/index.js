import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import serverConfig from './config.js';
import PDFDocument from 'pdfkit';

const app = express();

// Initialize Stripe with the configuration
const stripe = new Stripe(serverConfig.stripe.secretKey, {
  apiVersion: serverConfig.stripe.apiVersion
});

// Middleware
app.use(cors());
app.use(express.json());

// Test Stripe connection on startup
(async () => {
  try {
    await stripe.paymentMethods.list({ limit: 1 });
    console.log('✓ Connected to Stripe successfully');
    console.log('✓ Server is ready to process payments');
  } catch (error) {
    console.error('Error connecting to Stripe:', error.message);
    process.exit(1);
  }
})();

// API endpoint to get room pricing
app.post(`/api/get-room-pricing`, async (req, res) => {
  try {
    const { productId, checkIn, checkOut, guests, duration } = req.body;
    console.log('Received pricing request:', { productId, checkIn, checkOut, guests, duration });

    // For demo purposes, using fixed prices
    const basePrices = {
      'prod_standard_room': 3500,
      'prod_deluxe_room': 6000,
      'prod_suite_room': 12000,
      'prod_family_room': 8000
    };

    const basePrice = basePrices[productId] || 3500;
    let adjustedPrice = basePrice;
    const checkInDate = new Date(checkIn);
    
    // Apply pricing rules
    const isWeekend = checkInDate.getDay() === 5 || checkInDate.getDay() === 6;
    if (isWeekend) adjustedPrice *= 1.2;

    const month = checkInDate.getMonth();
    if (month === 11 || month === 0) adjustedPrice *= 1.3;

    if (guests > 2) adjustedPrice *= 1.1;

    const totalPrice = Math.round(adjustedPrice * duration);
    const taxes = Math.round(totalPrice * 0.18);
    const finalPrice = totalPrice + taxes;

    const response = {
      basePrice: Math.round(adjustedPrice),
      totalPrice,
      taxes,
      finalPrice,
      duration,
      currency: 'INR'
    };

    console.log('Calculated pricing:', response);
    res.json(response);
  } catch (error) {
    console.error('Error calculating room pricing:', error);
    res.status(500).json({ error: 'Failed to calculate pricing' });
  }
});

// API endpoint to create payment intent
app.post(`/api/create-payment-intent`, async (req, res) => {
  try {
    const { amount, currency, bookingDetails } = req.body;
    console.log('Creating payment intent:', { amount, currency });

    if (!amount || !Number.isInteger(amount) || amount <= 0) {
      console.error('Invalid amount:', amount);
      return res.status(400).json({
        error: 'Invalid amount. Must be a positive integer in paise.'
      });
    }

    if (!currency || currency.toLowerCase() !== 'inr') {
      console.error('Invalid currency:', currency);
      return res.status(400).json({
        error: 'Invalid currency. Only INR is supported.'
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        bookingId: `BK${Date.now()}`,
        userId: bookingDetails.userId,
        hotelName: bookingDetails.hotelData.hotelName,
        checkIn: bookingDetails.checkIn,
        checkOut: bookingDetails.checkOut,
      },
    });

    console.log('Payment intent created:', paymentIntent.id);
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Stripe error:', error);
    
    if (error.type === 'StripeAuthenticationError') {
      return res.status(401).json({
        error: 'Invalid Stripe API key. Please check server configuration.'
      });
    }
    
    if (error.type === 'StripeCardError') {
      return res.status(402).json({ error: error.message });
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: 'Invalid request to Stripe API: ' + error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to create payment intent. Please try again.'
    });
  }
});

// API endpoint to download invoice
app.post(`/api/download-invoice`, async (req, res) => {
  try {
    const bookingData = req.body;
    console.log('Received booking data:', bookingData);
    
    if (!bookingData || !bookingData.bookingId) {
      console.error('Invalid booking data received:', bookingData);
      return res.status(400).json({ error: 'Invalid booking data' });
    }

    // Format dates
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    };

    // Generate and send PDF
    const doc = new PDFDocument();
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${bookingData.invoiceId}.pdf`);
    
    // Handle any errors that occur during PDF generation
    doc.on('error', (err) => {
      console.error('Error during PDF generation:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate PDF' });
      }
    });

    // Pipe the PDF directly to the response
    doc.pipe(res);

    try {
      // Add invoice content
      doc.fontSize(20).text('BOOKING INVOICE', 50, 50);
      doc.fontSize(12).text(`Invoice ID: ${bookingData.invoiceId}`, 50, 80);
      doc.text(`Booking ID: ${bookingData.bookingId}`, 50, 100);
      doc.text(`Date: ${formatDate(bookingData.createdAt)}`, 50, 120);

      // Customer details
      doc.text('CUSTOMER DETAILS:', 50, 160);
      doc.text(`Name: ${bookingData.userName || 'N/A'}`, 50, 180);
      doc.text(`Email: ${bookingData.userEmail || 'N/A'}`, 50, 200);
      doc.text(`Mobile: ${bookingData.userMobile || 'N/A'}`, 50, 220);

      // Booking details
      doc.text('BOOKING DETAILS:', 50, 260);
      doc.text(`Hotel: ${bookingData.hotelName || 'N/A'}`, 50, 280);
      doc.text(`Room Type: ${(bookingData.roomDetails?.name || bookingData.roomType || 'N/A')}`, 50, 300);
      doc.text(`Check-in: ${formatDate(bookingData.checkInDate)}`, 50, 320);
      doc.text(`Check-out: ${formatDate(bookingData.checkOutDate)}`, 50, 340);
      doc.text(`Guests: ${bookingData.guests || 'N/A'}`, 50, 360);
      doc.text(`Duration: ${bookingData.duration || 'N/A'} nights`, 50, 380);

      // Pricing breakdown
      doc.text('PRICING BREAKDOWN:', 50, 420);
      doc.text(`Base Price: ₹${(bookingData.basePrice || 0).toLocaleString('en-IN')}`, 50, 440);
      doc.text(`Subtotal: ₹${((bookingData.totalPriceINR || 0) - (bookingData.taxes || 0)).toLocaleString('en-IN')}`, 50, 460);
      doc.text(`Taxes (18% GST): ₹${(bookingData.taxes || 0).toLocaleString('en-IN')}`, 50, 480);
      doc.text(`Total Amount: ₹${(bookingData.totalPriceINR || 0).toLocaleString('en-IN')}`, 50, 500);

      // Payment details
      doc.text('PAYMENT DETAILS:', 50, 540);
      doc.text(`Payment Status: ${bookingData.paymentStatus?.toUpperCase() || 'N/A'}`, 50, 560);
      doc.text(`Transaction ID: ${bookingData.stripeTransactionId || 'N/A'}`, 50, 580);

      // Footer
      doc.fontSize(10).text('Thank you for choosing TripAIway!', 50, 650, { align: 'center' });
      doc.text('This is a computer-generated invoice and does not require a signature.', 50, 670, { align: 'center' });

      // Finalize PDF
      doc.end();
    } catch (pdfError) {
      console.error('Error while generating PDF content:', pdfError);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate PDF content', details: pdfError.message });
      }
    }

  } catch (error) {
    console.error('Error in download-invoice endpoint:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate invoice', details: error.message });
    }
  }
});

// API endpoint to process refund
app.post(`/api/process-refund`, async (req, res) => {
  try {
    const { paymentIntentId, amount } = req.body;

    // Create refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount, // Amount in paise
    });

    res.json({ refundId: refund.id });
  } catch (error) {
    console.error('Stripe refund error:', error);
    
    if (error.type === 'StripeAuthenticationError') {
      return res.status(401).json({
        error: 'Invalid Stripe API key. Please check server configuration.'
      });
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: 'Invalid request to Stripe API: ' + error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to process refund. Please try again.'
    });
  }
});

const PORT = serverConfig.port;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
}); 