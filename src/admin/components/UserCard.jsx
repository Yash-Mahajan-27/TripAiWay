import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FaHotel, FaCalendarAlt, FaUsers, FaDownload } from 'react-icons/fa';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL;

function UserCard({ email, userData, bookingData }) {
  const [isExpanded, setIsExpanded] = useState(false);

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
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
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

      // Create a blob from the PDF stream
      const blob = await response.blob();
      // Create a link element and trigger download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `invoice-${booking.invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice. Please try again.');
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-md border border-border p-4 sm:p-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-0 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground break-words">{email}</h2>
          <div className="flex flex-wrap gap-3 mt-1">
            <p className="text-sm sm:text-base text-muted-foreground">Total Trips: {userData.totalTrips}</p>
            {bookingData && (
              <p className="text-sm sm:text-base text-muted-foreground">Total Bookings: {bookingData.totalBookings}</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-full text-sm w-full sm:w-auto"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-4 sm:mt-6 space-y-6">
          {/* Trips Section */}
          {userData.trips.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground text-base sm:text-lg mb-3">Trip History</h3>
              <div className="space-y-3 sm:space-y-4">
                {userData.trips.map((trip, index) => (
                  <div
                    key={trip.id}
                    className="bg-background rounded-lg p-3 sm:p-4 border border-border"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-1 sm:gap-0 mb-2">
                      <h3 className="font-medium text-foreground text-sm sm:text-base">
                        Trip #{index + 1}: {trip.userSelection.location}
                      </h3>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        ID: {trip.id}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">{trip.userSelection.totalDays} days</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="text-muted-foreground">Budget:</span>
                        <span className="font-medium">{trip.userSelection.budget}</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="text-muted-foreground">Group:</span>
                        <span className="font-medium">{trip.userSelection.traveler}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bookings Section */}
          {bookingData && bookingData.bookings.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground text-base sm:text-lg mb-3">Booking History</h3>
              <div className="space-y-4">
                {bookingData.bookings.map((booking) => (
                  <div key={booking.id} className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-semibold text-foreground">{booking.hotelName}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.bookingStatus)}`}>
                            {booking.bookingStatus.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">{booking.hotelAddress}</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
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
                      
                      <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
                        <div className="text-right">
                          <p className="text-xl font-bold text-foreground">₹{booking.totalPriceINR?.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadInvoice(booking)}
                          className="flex items-center gap-2"
                        >
                          <FaDownload className="h-4 w-4" />
                          Download Invoice
                        </Button>
                      </div>
                    </div>

                    {booking.specialRequests && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-sm font-medium text-foreground mb-1">Special Requests:</p>
                        <p className="text-sm text-muted-foreground">{booking.specialRequests}</p>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Booking ID: {booking.bookingId}</span>
                      <span>Invoice ID: {booking.invoiceId}</span>
                      {booking.stripeTransactionId && (
                        <span>Transaction ID: {booking.stripeTransactionId}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserCard;