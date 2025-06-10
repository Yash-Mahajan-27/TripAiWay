import { Button } from '@/components/ui/button';
import { GetPlaceDetails, PHOTO_REF_URL } from '@/service/GlobalApi';
import React, { useEffect, useState } from 'react'
import { FaLocationDot } from "react-icons/fa6";
import { Link } from 'react-router-dom';

function PlaceCardItem({ place }) {
  const [photoUrl, setPhotoUrl] = useState();

  useEffect(() => {
    place && GetPlaceImg();
  }, [place])

  const GetPlaceImg = async () => {
    const data = {
      textQuery: place.placeName
    }
    const result = await GetPlaceDetails(data).then(resp => {
      if (resp.data.places?.[0]?.photos?.length > 0) {
        const photoIndex = Math.min(3, resp.data.places[0].photos.length - 1);
        const PhotoUrl = PHOTO_REF_URL.replace('{NAME}', resp.data.places[0].photos[photoIndex].name);
        setPhotoUrl(PhotoUrl);
      }
    })
  }

  return (
    <Link 
      to={'https://www.google.com/maps/search/?api=1&query=' + place?.placeName + "," + place?.geoCoordinates} 
      target='_blank'
      className="block"
    >
      <div className="bg-card rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="w-full sm:w-auto sm:flex-shrink-0 mb-2 sm:mb-0">
              <img 
                src={photoUrl ? photoUrl : '/road-trip-vacation.jpg'} 
                className="w-full sm:w-32 h-40 sm:h-32 rounded-lg object-cover"
                alt={place.placeName}
              />
            </div>
            <div className="flex-grow space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">{place.time}</span>
                <span className="text-xs sm:text-sm font-medium text-yellow-500 dark:text-yellow-400">⭐ {place.rating}</span>
              </div>
              <h3 className="font-semibold text-base sm:text-lg text-foreground">{place.placeName}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{place.placeDetails}</p>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">{place.ticketPricing}</span>
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full text-xs px-3 py-1 h-auto"
                >
                  <FaLocationDot className="mr-1" /> View on Map
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default PlaceCardItem;