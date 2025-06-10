// Backend API endpoints for Stripe integration
// This would be implemented in your backend (Node.js/Express, Next.js API routes, etc.)

import Stripe from 'stripe';
const PDFDocument = require('pdfkit');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// API endpoint to get room pricing
export async function getRoomPricing(req, res) {
  try {
    const { productId, checkIn, checkOut, guests, duration } = req.body;

    // Fetch product from Stripe
    const product = await stripe.products.retrieve(productId);
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
    });

    if (prices.data.length === 0) {
      throw new Error('No pricing found for this room type');
    }

    const basePrice = prices.data[0].unit_amount / 100; // Convert from cents
    const totalPrice = basePrice * duration;
    const taxes = Math.round(totalPrice * 0.18); // 18% GST
    const finalPrice = totalPrice + taxes;

    // Apply dynamic pricing based on dates, occupancy, etc.
    const dynamicPricing = calculateDynamicPricing({
      basePrice,
      checkIn,
      checkOut,
      guests,
      duration
    });

    res.json({
      basePrice: dynamicPricing.basePrice,
      totalPrice: dynamicPricing.totalPrice,
      taxes: dynamicPricing.taxes,
      finalPrice: dynamicPricing.finalPrice,
      duration,
      currency: 'INR'
    });
  } catch (error) {
    console.error('Error fetching room pricing:', error);
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
}

// API endpoint to create payment intent
export async function createPaymentIntent(req, res) {
  try {
    const { amount, currency, bookingDetails } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in paise for INR
      currency: currency,
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

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
}

// Helper function to calculate dynamic pricing
function calculateDynamicPricing({ basePrice, checkIn, checkOut, guests, duration }) {
  let adjustedPrice = basePrice;

  // Weekend pricing (Friday, Saturday)
  const checkInDate = new Date(checkIn);
  const isWeekend = checkInDate.getDay() === 5 || checkInDate.getDay() === 6;
  if (isWeekend) {
    adjustedPrice *= 1.2; // 20% markup for weekends
  }

  // Peak season pricing (December, January)
  const month = checkInDate.getMonth();
  if (month === 11 || month === 0) {
    adjustedPrice *= 1.3; // 30% markup for peak season
  }

  // Group size pricing
  if (guests > 2) {
    adjustedPrice *= 1.1; // 10% markup for larger groups
  }

  const totalPrice = Math.round(adjustedPrice * duration);
  const taxes = Math.round(totalPrice * 0.18);
  const finalPrice = totalPrice + taxes;

  return {
    basePrice: Math.round(adjustedPrice),
    totalPrice,
    taxes,
    finalPrice
  };
}

// API endpoint to download invoice
export async function downloadInvoice(req, res) {
  try {
    const bookingData = req.body;
    
    // Generate PDF invoice
    const doc = new PDFDocument();
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${bookingData.invoiceId}.pdf`);
    
    // Pipe the PDF directly to the response
    doc.pipe(res);

    // Add invoice content
    doc.fontSize(20).text('BOOKING INVOICE', 50, 50);
    doc.fontSize(12).text(`Invoice ID: ${bookingData.invoiceId}`, 50, 80);
    doc.text(`Booking ID: ${bookingData.bookingId}`, 50, 100);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 120);

    // Customer details
    doc.text('CUSTOMER DETAILS:', 50, 160);
    doc.text(`Name: ${bookingData.userName}`, 50, 180);
    doc.text(`Email: ${bookingData.userEmail}`, 50, 200);
    doc.text(`Mobile: ${bookingData.userMobile}`, 50, 220);

    // Booking details
    doc.text('BOOKING DETAILS:', 50, 260);
    doc.text(`Hotel: ${bookingData.hotelName}`, 50, 280);
    doc.text(`Room Type: ${bookingData.roomDetails?.name || bookingData.roomType}`, 50, 300);
    doc.text(`Check-in: ${bookingData.checkInDate}`, 50, 320);
    doc.text(`Check-out: ${bookingData.checkOutDate}`, 50, 340);
    doc.text(`Guests: ${bookingData.guests}`, 50, 360);
    doc.text(`Duration: ${bookingData.duration} nights`, 50, 380);

    // Pricing breakdown
    doc.text('PRICING BREAKDOWN:', 50, 420);
    doc.text(`Base Price: ₹${bookingData.basePrice.toLocaleString()}`, 50, 440);
    doc.text(`Subtotal: ₹${(bookingData.totalPriceINR - bookingData.taxes).toLocaleString()}`, 50, 460);
    doc.text(`Taxes (18% GST): ₹${bookingData.taxes.toLocaleString()}`, 50, 480);
    doc.text(`Total Amount: ₹${bookingData.totalPriceINR.toLocaleString()}`, 50, 500);

    // Footer
    doc.fontSize(10).text('Thank you for choosing TripAIway!', 50, 600, { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
}