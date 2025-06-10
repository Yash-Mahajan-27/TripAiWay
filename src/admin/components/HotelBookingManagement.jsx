import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/service/firebaseConfig';
import { Button } from '@/components/ui/button';
import { FaHotel, FaCalendarAlt, FaUsers, FaCreditCard, FaUser, FaEnvelope, FaPhone } from 'react-icons/fa';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import stripeConfig from '../../config/stripe.js';

const stripe = loadStripe(stripeConfig.publishableKey);

function HotelBookingManagement() {
  const [bookingsByUser, setBookingsByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [processingRefund, setProcessingRefund] = useState(null);

  useEffect(() => {
    fetchAllBookings();
  }, []);

  const fetchAllBookings = async () => {
    try {
      const q = query(collection(db, 'bookings'));
      const querySnapshot = await getDocs(q);
      const bookings = {};
      
      querySnapshot.forEach((doc) => {
        const booking = { id: doc.id, ...doc.data() };
        const userEmail = booking.userId;
        
        if (!bookings[userEmail]) {
          bookings[userEmail] = {
            userDetails: {
              email: userEmail,
              name: booking.userName,
              phone: booking.userMobile
            },
            bookings: []
          };
        }
        bookings[userEmail].bookings.push(booking);
      });

      // Sort bookings for each user by date
      Object.keys(bookings).forEach(userEmail => {
        bookings[userEmail].bookings.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);
      });

      setBookingsByUser(bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-500';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border border-yellow-500';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border border-red-500';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-500';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-500';
      case 'checked_out':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300 border border-gray-500';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300 border border-gray-500';
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      let booking;
      
      // Find the booking in our state
      Object.values(bookingsByUser).some(userData => {
        booking = userData.bookings.find(b => b.id === bookingId);
        return booking;
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Add check-in and check-out timestamps
      const updateData = {
        bookingStatus: newStatus,
        updatedAt: new Date().toISOString(),
      };

      if (newStatus === 'checked_in') {
        updateData.checkInTimestamp = new Date().toISOString();
      } else if (newStatus === 'checked_out') {
        updateData.checkOutTimestamp = new Date().toISOString();
      } else if (newStatus === 'cancelled') {
        updateData.cancelledAt = new Date().toISOString();
      } else if (newStatus === 'refunded') {
        setProcessingRefund(bookingId);
        
        // Simulate refund processing delay
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        updateData.refundedAt = new Date().toISOString();
        updateData.refundProcessedAt = new Date().toISOString();
      }

      await updateDoc(bookingRef, updateData);
      toast.success(`Booking status updated to ${newStatus.replace('_', ' ')}`);
      setProcessingRefund(null);
      fetchAllBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      setProcessingRefund(null);
      toast.error('Failed to update booking status');
    }
  };

  const toggleUserExpanded = (userEmail) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userEmail)) {
      newExpanded.delete(userEmail);
    } else {
      newExpanded.add(userEmail);
    }
    setExpandedUsers(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Hotel Booking Management</h1>
        
        {Object.keys(bookingsByUser).length === 0 ? (
          <div className="text-center py-12">
            <FaHotel className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No bookings found</h3>
            <p className="text-muted-foreground">There are no hotel bookings in the system.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(bookingsByUser).map(([userEmail, userData]) => (
              <div key={userEmail} className="bg-card rounded-xl shadow-md border border-border overflow-hidden">
                {/* User Header Section */}
                <div 
                  className="p-6 bg-muted/50 cursor-pointer"
                  onClick={() => toggleUserExpanded(userEmail)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FaUser className="text-blue-600 dark:text-blue-400" />
                        <h3 className="text-lg font-semibold">{userData.userDetails.name}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FaEnvelope className="text-muted-foreground" />
                          {userEmail}
                        </div>
                        {userData.userDetails.phone && (
                          <div className="flex items-center gap-1">
                            <FaPhone className="text-muted-foreground" />
                            {userData.userDetails.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        Total Bookings: {userData.bookings.length}
                      </span>
                      <Button variant="outline" size="sm">
                        {expandedUsers.has(userEmail) ? 'Hide Details' : 'Show Details'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Bookings Section */}
                {expandedUsers.has(userEmail) && (
                  <div className="p-6 space-y-4">
                    {userData.bookings.map((booking) => (
                      <div key={booking.id} className="bg-background rounded-lg p-4 border border-border">
                        <div className="flex flex-col lg:flex-row justify-between gap-6">
                          <div className="flex-grow">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-foreground">{booking.hotelName}</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.bookingStatus)}`}>
                                {booking.bookingStatus.toUpperCase()}
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
                                <FaCreditCard className="text-blue-600 dark:text-blue-400" />
                                <div>
                                  <p className="font-medium">Payment</p>
                                  <p className="text-muted-foreground">₹{booking.totalPriceINR?.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-3">
                            {booking.bookingStatus === 'pending' && (
                              <>
                                <Button
                                  onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Confirm Booking
                                </Button>
                                <Button
                                  onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Cancel Booking
                                </Button>
                              </>
                            )}
                            
                            {booking.bookingStatus === 'confirmed' && (
                              <Button
                                onClick={() => handleStatusUpdate(booking.id, 'checked_in')}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Check In
                              </Button>
                            )}

                            {booking.bookingStatus === 'cancellation_requested' && (
                              <>
                                <Button
                                  onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Approve Cancellation
                                </Button>
                                <Button
                                  onClick={() => handleStatusUpdate(booking.id, 'pending')}
                                  variant="outline"
                                >
                                  Reject Cancellation
                                </Button>
                              </>
                            )}

                            {booking.bookingStatus === 'refund_requested' && (
                              <>
                                <Button
                                  onClick={() => handleStatusUpdate(booking.id, 'refunded')}
                                  className="bg-purple-600 hover:bg-purple-700 text-white"
                                  disabled={processingRefund === booking.id}
                                >
                                  {processingRefund === booking.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                                      Processing Refund...
                                    </>
                                  ) : (
                                    'Process Refund'
                                  )}
                                </Button>
                                <Button
                                  onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                                  variant="outline"
                                  disabled={processingRefund === booking.id}
                                >
                                  Reject Refund
                                </Button>
                              </>
                            )}

                            {booking.bookingStatus === 'checked_in' && (
                              <Button
                                onClick={() => handleStatusUpdate(booking.id, 'checked_out')}
                                className="bg-gray-600 hover:bg-gray-700 text-white"
                              >
                                Check Out
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {booking.specialRequests && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <p className="text-sm font-medium text-foreground mb-1">Special Requests:</p>
                            <p className="text-sm text-muted-foreground">{booking.specialRequests}</p>
                          </div>
                        )}
                        
                        {(booking.checkInTimestamp || booking.checkOutTimestamp) && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                              {booking.checkInTimestamp && (
                                <div className="flex items-center gap-2">
                                  <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />
                                  <div>
                                    <p className="font-medium">Checked In</p>
                                    <p className="text-muted-foreground">
                                      {new Date(booking.checkInTimestamp).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {booking.checkOutTimestamp && (
                                <div className="flex items-center gap-2">
                                  <FaCalendarAlt className="text-gray-600 dark:text-gray-400" />
                                  <div>
                                    <p className="font-medium">Checked Out</p>
                                    <p className="text-muted-foreground">
                                      {new Date(booking.checkOutTimestamp).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>Booking ID: {booking.bookingId}</span>
                          <span>Transaction ID: {booking.stripeTransactionId}</span>
                          {booking.refundedAt && (
                            <span>Refunded At: {new Date(booking.refundedAt).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HotelBookingManagement;