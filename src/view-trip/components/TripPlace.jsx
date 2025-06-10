import React from 'react'
import PlaceCardItem from './PlaceCardItem';

function TripPlace({trip}) {
  return (
    <div className='my-4'>
      <h2 className='font-bold text-lg sm:text-xl mb-4'>Places to Visit</h2>
      <div className='space-y-6'>
        {trip?.tripData?.itinerary?.map((item, i) => (
          <div key={i} className="space-y-3">
            <h2 className='font-medium text-base sm:text-lg px-2 py-1 bg-muted inline-block rounded-lg'>Day {item?.day}</h2>
            <div className='grid grid-cols-1 gap-4'>
              {item.plan?.map((place, index) => (
                <PlaceCardItem key={index} place={place}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TripPlace
