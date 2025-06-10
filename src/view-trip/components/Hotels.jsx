import React from 'react'
import HotelCardItem from './HotelCardItem'

function Hotels({trip}) {
  return (
    <div>
        <h2 className='font-bold text-lg sm:text-xl my-4 sm:my-7'>Hotel Recommendation</h2>
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'>
            {trip?.tripData?.hotelOptions?.map((item,index) =>(
                 <HotelCardItem key={index} item={item}/>
                ))}
        </div>
    </div>
  )
}

export default Hotels
