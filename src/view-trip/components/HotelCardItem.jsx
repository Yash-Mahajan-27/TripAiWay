import { GetPlaceDetails, PHOTO_REF_URL } from '@/service/GlobalApi';
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button';

function HotelCardItem({item}) {
  const [photoUrl, setPhotoUrl] = useState();
  const [hotelExists, setHotelExists] = useState(false);
  const [placeId, setPlaceId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    item && verifyAndGetHotelDetails();
  }, [item])

  const verifyAndGetHotelDetails = async() => { 
    if (!item?.hotelName) return;
    
    const data = {
      textQuery: item?.hotelName + " " + (item?.hotelAddress || "")
    }
    
    try {
      const result = await GetPlaceDetails(data);
      if (result?.data?.places && result.data.places.length > 0) {
        const place = result.data.places[0];
        setHotelExists(true);
        setPlaceId(place.id);
        
        if (place.photos && place.photos.length > 0) {
          const PhotoUrl = PHOTO_REF_URL.replace('{NAME}', place.photos[0].name);
          setPhotoUrl(PhotoUrl);
        }
      } else {
        setHotelExists(false);
      }
    } catch (error) {
      console.error("Error verifying hotel:", error);
      setHotelExists(false);
    }
  }

  const handleBookNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Navigate to booking page with hotel details
    navigate('/book-hotel', {
      state: {
        hotelName: item?.hotelName,
        hotelAddress: item?.hotelAddress,
        price: item?.price,
        rating: item?.rating,
        description: item?.description,
        photoUrl: photoUrl
      }
    });
  };

  if (!hotelExists) return null;

  // Generate direct hotel link
  const hotelLink = placeId 
    ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item?.hotelName + " " + (item?.hotelAddress || ""))}`;

  return (
    <div className="bg-card rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 dark:rounded-xl">
      <div className="relative">
        <img 
          src={photoUrl ? photoUrl : '/road-trip-vacation.jpg'} 
          className="h-36 sm:h-48 w-full object-cover rounded-t-xl dark:rounded-t-xl"
          alt={item?.hotelName}
        />
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-background/90 backdrop-blur-sm rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium">
          ⭐ {item?.rating}
        </div>
      </div>
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <h3 className="font-semibold text-base sm:text-lg line-clamp-1 text-foreground">{item?.hotelName}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">📍 {item?.hotelAddress}</p>
        <p className="text-blue-600 dark:text-blue-400 font-medium text-sm sm:text-base">💰 {item?.price}</p>
        
        <div className="flex flex-wrap gap-2 pt-2">
          <Link 
            to={hotelLink}
            target='_blank'
            className="flex-1 min-w-[120px]"
          >
            <Button 
              variant="outline" 
              className="w-full text-xs sm:text-sm py-2 rounded-lg hover:bg-accent"
            >
              View Details
            </Button>
          </Link>
          <Button 
            onClick={handleBookNow}
            className="flex-1 min-w-[120px] bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white text-xs sm:text-sm py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-300"
          >
            Book Now
          </Button>
        </div>
      </div>
    </div>
  )
}

export default HotelCardItem;