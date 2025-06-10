import React, { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/service/firebaseConfig';
import { Button } from '@/components/ui/button';
import { FaHotel, FaCalendarAlt, FaUsers, FaCreditCard, FaDownload } from 'react-icons/fa';
import { toast } from 'sonner';

function BookingManagement() {
  const API_URL = import.meta.env.VITE_API_URL;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRefunds, setProcessingRefunds] = useState(new Set());

  const fetchUserBookings = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;

      const q = query(
        collection(db, 'bookings'),
        where('userId', '==', user.email)
      );

      const querySnapshot = await getDocs(q);
      const userBookings = [];
      
      querySnapshot.forEach((doc) => {
        userBookings.push({
          id: doc.id,
          ...doc.data()
        });
      });

      userBookings.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);
      setBookings(userBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to check individual booking status
  const checkBookingStatus = useCallback(async (bookingId) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      
      if (bookingSnap.exists()) {
        const bookingData = bookingSnap.data();
        
        // Update the booking in the state
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking.id === bookingId 
              ? { ...booking, ...bookingData }
              : booking
          )
        );

        // If the booking is no longer in refund_requested status, stop polling
        if (bookingData.bookingStatus !== 'refund_requested') {
          setProcessingRefunds(prev => {
            const next = new Set(prev);
            next.delete(bookingId);
            return next;
          });
          
          if (bookingData.bookingStatus === 'refunded') {
            toast.success('Your refund has been processed successfully!');
          }
        }
      }
    } catch (error) {
      console.error('Error checking booking status:', error);
    }
  }, []);

  // Set up polling for bookings being processed
  useEffect(() => {
    const pollInterval = 2000; // Poll every 2 seconds
    const polls = {};

    processingRefunds.forEach(bookingId => {
      if (!polls[bookingId]) {
        polls[bookingId] = setInterval(() => {
          checkBookingStatus(bookingId);
        }, pollInterval);
      }
    });

    // Cleanup intervals
    return () => {
      Object.values(polls).forEach(interval => clearInterval(interval));
    };
  }, [processingRefunds, checkBookingStatus]);

  // Initial fetch
  useEffect(() => {
    fetchUserBookings();
  }, []);

  const handleRefundRequest = async (bookingId) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        bookingStatus: 'refund_requested',
        updatedAt: new Date().toISOString()
      });
      
      // Add to processing set to start polling
      setProcessingRefunds(prev => new Set([...prev, bookingId]));
      
      toast.success('Refund request submitted successfully');
      fetchUserBookings();
    } catch (error) {
      console.error('Error requesting refund:', error);
      toast.error('Failed to submit refund request');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        bookingStatus: 'cancellation_requested',
        updatedAt: new Date().toISOString()
      });
      
      toast.success('Cancellation request submitted successfully');
      fetchUserBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to submit cancellation request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'checked_out':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
      case 'cancellation_requested':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
      case 'refund_requested':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
    }
  };

  const getStatusMessage = (booking) => {
    const status = booking.bookingStatus;
    switch (status) {
      case 'confirmed':
        return 'CONFIRMED';
      case 'pending':
        return 'PENDING';
      case 'cancelled':
        return 'CANCELLED';
      case 'refunded':
        return 'REFUNDED';
      case 'checked_in':
        return 'CHECKED IN';
      case 'checked_out':
        return 'CHECKED OUT';
      case 'cancellation_requested':
        return 'CANCELLATION REQUESTED';
      case 'refund_requested':
        if (processingRefunds.has(booking.id)) {
          const requestTime = booking.updatedAt ? new Date(booking.updatedAt) : new Date();
          const currentTime = new Date();
          const timeDiff = Math.floor((currentTime - requestTime) / 1000); // difference in seconds
          
          if (timeDiff <= 5) {
            return `PROCESSING REFUND (${5 - timeDiff}s)`;
          }
        }
        return 'REFUND REQUESTED';
      default:
        return status.replace('_', ' ').toUpperCase();
    }
  };

  const downloadInvoice = async (booking) => {
    try {
      // Create a clean booking object without Firebase Timestamp
      const cleanBooking = {
        ...booking,
        timestamp: booking.timestamp ? new Date(booking.timestamp.seconds * 1000).toISOString() : null,
        createdAt: booking.createdAt || new Date().toISOString(),
      };

      console.log('Sending booking data:', cleanBooking);
      const response = await fetch(`${API_URL}/api/download-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanBooking),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        toast.error(`Failed to download invoice: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        console.error('Invalid content type received:', contentType);
        toast.error('Invalid response from server');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${booking.invoiceId || 'download'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">My Bookings</h1>
        
        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <FaHotel className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No bookings found</h3>
            <p className="text-muted-foreground">You haven't made any hotel bookings yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-card rounded-xl shadow-md border border-border p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-foreground">{booking.hotelName}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.bookingStatus)}`}>
                        {getStatusMessage(booking)}
                      </span>
                    </div>
                    
                    <p className="text-muted-foreground mb-4">{booking.hotelAddress}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="font-medium">Check-in</p>
                          <p className="text-muted-foreground">{booking.checkInDate}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="font-medium">Check-out</p>
                          <p className="text-muted-foreground">{booking.checkOutDate}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FaUsers className="text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="font-medium">Guests</p>
                          <p className="text-muted-foreground">{booking.guests} guests</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FaHotel className="text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="font-medium">Room</p>
                          <p className="text-muted-foreground">{booking.roomDetails?.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                    <div className="text-right mb-4">
                      <p className="text-2xl font-bold text-foreground">₹{booking.totalPriceINR?.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                    </div>
                    
                    <div className="flex flex-col gap-2 min-w-[150px]">
                      {(booking.bookingStatus === 'pending' || booking.bookingStatus === 'confirmed' ||  booking.bookingStatus === 'checked_in' || booking.bookingStatus === 'checked_out') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadInvoice(booking)}
                        className="flex items-center gap-2 w-full justify-center"
                      >
                        <FaDownload className="h-4 w-4" />
                        Invoice
                      </Button>
                      )}
                      {(booking.bookingStatus === 'pending' || booking.bookingStatus === 'confirmed') && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelBooking(booking.id)}
                        className="flex items-center gap-2 w-full justify-center"
                      >
                        Cancel Booking
                      </Button>
                      )}
                      {booking.bookingStatus === 'cancelled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefundRequest(booking.id)}
                          className="flex items-center gap-2 w-full justify-center border-purple-500 text-purple-600 hover:bg-purple-50"
                        >
                          Request Refund
                        </Button>
                      )}
                      
                      {booking.bookingStatus === 'cancellation_requested' && (
                        <div className="text-sm text-orange-600 mt-2 text-center p-2 bg-orange-50 rounded-md">
                          Cancellation request is being reviewed
                        </div>
                      )}

                      {booking.bookingStatus === 'refund_requested' && (
                        <div className="text-sm text-purple-600 mt-2 text-center p-2 bg-purple-50 rounded-md">
                          {processingRefunds.has(booking.id) 
                            ? "Refund is being processed..."
                            : "Refund request is being reviewed"}
                        </div>
                      )}

                      {booking.bookingStatus === 'cancelled' && (
                        <div className="text-sm text-red-600 mt-2 text-center p-2 bg-red-50 rounded-md">
                          Booking has been cancelled
                        </div>
                      )}

                      {booking.bookingStatus === 'refunded' && (
                        <div className="text-sm text-green-600 mt-2 text-center p-2 bg-green-50 rounded-md">
                          Refund has been processed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {booking.specialRequests && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium text-foreground mb-1">Special Requests:</p>
                    <p className="text-sm text-muted-foreground">{booking.specialRequests}</p>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>Booking ID: {booking.bookingId}</span>
                  <span>Invoice ID: {booking.invoiceId}</span>
                  {booking.stripeTransactionId && (
                    <span>Transaction ID: {booking.stripeTransactionId}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingManagement;