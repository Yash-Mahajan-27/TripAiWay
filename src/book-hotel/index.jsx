import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FaHotel, FaMapMarkerAlt, FaStar, FaUsers, FaCalendarAlt, FaPhone, FaEnvelope, FaUser, FaCreditCard } from 'react-icons/fa';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/service/firebaseConfig';
import stripeConfig from '../config/stripe.js';
import PaymentForm from '@/components/PaymentForm';


// Initialize Stripe
const stripePromise = loadStripe(stripeConfig.publishableKey);

function BookHotel() {
  const API_URL = import.meta.env.VITE_API_URL;
  const location = useLocation();
  const navigate = useNavigate();
  const hotelData = location.state;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    roomType: '',
    guests: '',
    checkIn: '',
    checkOut: '',
    specialRequests: ''
  });

  const [loading, setLoading] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [roomPricing, setRoomPricing] = useState(null);
  const [paymentStep, setPaymentStep] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const roomTypes = [
    { 
      id: 'standard', 
      name: 'Standard Room', 
      description: 'Comfortable room with essential amenities',
      features: ['Free WiFi', 'Air Conditioning', 'TV', 'Private Bathroom'],
      maxGuests: 2,
      stripeProductId: 'prod_standard_room'
    },
    { 
      id: 'deluxe', 
      name: 'Deluxe Room', 
      description: 'Spacious room with premium amenities',
      features: ['Free WiFi', 'Air Conditioning', 'Smart TV', 'Mini Bar', 'City View'],
      maxGuests: 3,
      stripeProductId: 'prod_deluxe_room'
    },
    { 
      id: 'suite', 
      name: 'Suite', 
      description: 'Luxurious suite with separate living area',
      features: ['Free WiFi', 'Air Conditioning', 'Smart TV', 'Mini Bar', 'Ocean View', 'Balcony'],
      maxGuests: 4,
      stripeProductId: 'prod_suite_room'
    },
    { 
      id: 'family', 
      name: 'Family Room', 
      description: 'Large room perfect for families',
      features: ['Free WiFi', 'Air Conditioning', 'Smart TV', 'Kitchenette', 'Sofa Bed'],
      maxGuests: 6,
      stripeProductId: 'prod_family_room'
    }
  ];

  const handleInputChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = () => {
    const requiredFields = ['name', 'email', 'mobile', 'roomType', 'guests', 'checkIn', 'checkOut'];
    
    for (let field of requiredFields) {
      if (!formData[field]) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    // Mobile validation
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(formData.mobile)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return false;
    }

    // Date validation
    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      toast.error('Check-in date cannot be in the past');
      return false;
    }

    if (checkOutDate <= checkInDate) {
      toast.error('Check-out date must be after check-in date');
      return false;
    }

    // Guest validation
    const selectedRoom = roomTypes.find(room => room.id === formData.roomType);
    if (selectedRoom && parseInt(formData.guests) > selectedRoom.maxGuests) {
      toast.error(`Selected room type can accommodate maximum ${selectedRoom.maxGuests} guests`);
      return false;
    }

    return true;
  };

  const calculateDuration = () => {
    if (formData.checkIn && formData.checkOut) {
      const checkIn = new Date(formData.checkIn);
      const checkOut = new Date(formData.checkOut);
      const diffTime = Math.abs(checkOut - checkIn);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  const fetchRoomPricing = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const selectedRoom = roomTypes.find(room => room.id === formData.roomType);
      const duration = calculateDuration();
      
      const response = await fetch(`${API_URL}/api/get-room-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedRoom.stripeProductId,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          guests: formData.guests,
          duration: duration
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pricing');
      }

      const pricingData = await response.json();
      setRoomPricing(pricingData);
      setShowPricing(true);
    } catch (error) {
      console.error('Error fetching pricing:', error);
      // Fallback pricing
      const basePrices = {
        'standard': 3500,
        'deluxe': 6000,
        'suite': 12000,
        'family': 8000
      };
      
      const basePrice = basePrices[formData.roomType] || 3500;
      const duration = calculateDuration();
      const totalPrice = basePrice * duration;
      
      setRoomPricing({
        basePrice,
        totalPrice,
        duration,
        taxes: Math.round(totalPrice * 0.18),
        finalPrice: Math.round(totalPrice * 1.18)
      });
      setShowPricing(true);
      toast.error('Could not fetch live pricing. Using fallback prices.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        toast.error('Please sign in to continue with booking');
        return;
      }

      if (!roomPricing || !roomPricing.finalPrice) {
        toast.error('Invalid pricing information. Please try again.');
        return;
      }

      // Create payment intent
      console.log('Creating payment intent...');
      const response = await fetch(`${API_URL}/api/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(roomPricing.finalPrice * 100), // Convert to paise
          currency: 'inr',
          bookingDetails: {
            ...formData,
            hotelData,
            roomPricing,
            userId: user.email
          }
        }),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create payment intent');
      }

      const { clientSecret, paymentIntentId } = responseData;
      console.log('Payment intent created:', paymentIntentId);
      
      // Store the client secret and show payment form
      setClientSecret(clientSecret);
      setShowPaymentForm(true);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      console.log('Payment successful:', paymentIntent.id);
      await saveBookingToFirebase(paymentIntent.id);
      toast.success('Payment successful! Booking confirmed.');
      setPaymentStep(true);
    } catch (error) {
      console.error('Error saving booking:', error);
      toast.error('Payment successful but failed to save booking. Please contact support.');
    }
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    toast.error(error.message || 'Payment processing failed. Please try again.');
  };

  const saveBookingToFirebase = async (stripeTransactionId) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const bookingId = `BK${Date.now()}`;
      
      const bookingData = {
        bookingId,
        userId: user.email,
        userName: formData.name,
        userEmail: formData.email,
        userMobile: formData.mobile,
        hotelName: hotelData.hotelName,
        hotelAddress: hotelData.hotelAddress,
        roomType: formData.roomType,
        roomDetails: roomTypes.find(room => room.id === formData.roomType),
        guests: parseInt(formData.guests),
        checkInDate: formData.checkIn,
        checkOutDate: formData.checkOut,
        duration: roomPricing.duration,
        specialRequests: formData.specialRequests,
        totalPriceINR: roomPricing.finalPrice,
        basePrice: roomPricing.basePrice,
        taxes: roomPricing.taxes,
        paymentStatus: 'completed',
        bookingStatus: 'pending',
        stripeTransactionId,
        invoiceId: `INV${bookingId}`,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'bookings'), bookingData);
      
    } catch (error) {
      console.error('Error saving booking:', error);
      toast.error('Booking saved but there was an issue. Please contact support.');
    }
  };

  if (!hotelData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">No Hotel Selected</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (paymentStep) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 dark:from-green-950 dark:via-background dark:to-background flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-background/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-border">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">Booking Request Sent!</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Your booking request has been sent. Please wait for the hotel to confirm your booking.
            </p>
            <div className="bg-muted rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold mb-2">Booking Details:</h3>
              <p><strong>Check-in:</strong> {formData.checkIn}</p>
              <p><strong>Check-out:</strong> {formData.checkOut}</p>
              <p><strong>Room Type:</strong> {roomTypes.find(r => r.id === formData.roomType)?.name}</p>
              <p><strong>Guests:</strong> {formData.guests}</p>
              <p><strong>Total Amount:</strong> ₹{roomPricing?.finalPrice?.toLocaleString()}</p>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              A confirmation email with your invoice has been sent to {formData.email}
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/my-bookings')} className="bg-blue-600 hover:bg-blue-700">
                View My Bookings
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-background dark:to-background w-full overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="mb-4 rounded-full"
          >
            ← Back to Hotels
          </Button>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 text-transparent bg-clip-text">
            Book Your Stay
          </h1>
          <p className="text-lg text-muted-foreground mt-2">Complete your reservation details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Hotel Information */}
          <div className="bg-background/80 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-border">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <FaHotel className="text-blue-600 dark:text-blue-400" />
              Hotel Details
            </h2>
            
            <div className="space-y-4">
              <div className="relative">
                <img 
                  src={hotelData.photoUrl || '/road-trip-vacation.jpg'} 
                  className="w-full h-48 sm:h-64 object-cover rounded-xl"
                  alt={hotelData.hotelName}
                />
                <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium flex items-center gap-1">
                  <FaStar className="text-yellow-500" />
                  {hotelData.rating}
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground">{hotelData.hotelName}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <FaMapMarkerAlt className="text-blue-600 dark:text-blue-400" />
                  {hotelData.hotelAddress}
                </p>
                {hotelData.description && (
                  <p className="text-sm text-muted-foreground">{hotelData.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="bg-background/80 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-border">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Reservation Details</h2>
            
            <div className="space-y-4 sm:space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FaUser className="text-blue-600 dark:text-blue-400" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Full Name *</label>
                    <Input
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Mobile Number *</label>
                    <Input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={formData.mobile}
                      onChange={(e) => handleInputChange('mobile', e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email Address *</label>
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Room Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FaHotel className="text-blue-600 dark:text-blue-400" />
                  Room Selection
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {roomTypes.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => handleInputChange('roomType', room.id)}
                      className={`cursor-pointer p-4 rounded-lg border-2 transition-all duration-300 ${
                        formData.roomType === room.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                          : 'border-border hover:border-blue-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-foreground">{room.name}</h4>
                        <span className="text-sm text-muted-foreground">Max {room.maxGuests} guests</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{room.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {room.features.map((feature, index) => (
                          <span key={index} className="text-xs bg-muted px-2 py-1 rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />
                  Booking Details
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Check-in Date *</label>
                    <Input
                      type="date"
                      value={formData.checkIn}
                      onChange={(e) => handleInputChange('checkIn', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Check-out Date *</label>
                    <Input
                      type="date"
                      value={formData.checkOut}
                      onChange={(e) => handleInputChange('checkOut', e.target.value)}
                      min={formData.checkIn || new Date().toISOString().split('T')[0]}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Number of Guests *</label>
                  <Input
                    type="number"
                    placeholder="Number of guests"
                    value={formData.guests}
                    onChange={(e) => handleInputChange('guests', e.target.value)}
                    min="1"
                    max={formData.roomType ? roomTypes.find(r => r.id === formData.roomType)?.maxGuests : 10}
                    className="w-full"
                  />
                </div>

                {calculateDuration() > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Duration of Stay: {calculateDuration()} {calculateDuration() === 1 ? 'night' : 'nights'}
                    </p>
                  </div>
                )}
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Special Requests (Optional)</label>
                <textarea
                  placeholder="Any special requests or preferences..."
                  value={formData.specialRequests}
                  onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                />
              </div>

              {/* Pricing Display */}
              {showPricing && roomPricing && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/50 dark:to-blue-950/50 p-6 rounded-xl border border-green-200 dark:border-green-800">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <FaCreditCard className="text-green-600 dark:text-green-400" />
                    Pricing Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Room Rate (per night):</span>
                      <span>₹{roomPricing.basePrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{roomPricing.duration} nights</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{roomPricing.totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes & Fees (18% GST):</span>
                      <span>₹{roomPricing.taxes.toLocaleString()}</span>
                    </div>
                    <hr className="border-border" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Amount:</span>
                      <span className="text-green-600 dark:text-green-400">₹{roomPricing.finalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!showPricing ? (
                <Button
                  onClick={fetchRoomPricing}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white py-6 text-lg rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-300"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                      Getting Pricing...
                    </div>
                  ) : (
                    'Get Pricing & Continue'
                  )}
                </Button>
              ) : showPricing && !showPaymentForm ? (
                <Button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-500 dark:to-blue-500 text-white py-6 text-lg rounded-xl hover:from-green-700 hover:to-blue-700 dark:hover:from-green-600 dark:hover:to-blue-600 transition-all duration-300"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                      Initializing Payment...
                    </div>
                  ) : (
                    <>
                      <FaCreditCard className="mr-2" />
                      Pay ₹{roomPricing.finalPrice.toLocaleString()} & Confirm Booking
                    </>
                  )}
                </Button>
              ) : showPaymentForm && clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentForm
                    clientSecret={clientSecret}
                    amount={roomPricing.finalPrice}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </Elements>
              ) : null}

              <p className="text-xs text-muted-foreground text-center">
                {!showPricing 
                  ? "Pricing will be calculated based on your selection and dates"
                  : "Secure payment powered by Stripe. Your booking will be confirmed immediately after payment."
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookHotel;