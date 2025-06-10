export const SelectBudgetOptions=[
    {
        id:1,
        title:'Cheap',
        desc:"Stay conscious of costs",
        icon: <img src="/trip/cheap.ico" className="h-16 w-16 sm:h-32 sm:w-50"/>,
    },
    {
        id:2,
        title:'Moderate',
        desc:"Keep cost on the average side",
        icon: <img src="/trip/moderate.ico" className="h-16 w-16 sm:h-32 sm:w-60"/>,
    },
    {
        id:3,
        title:'Luxury',
        desc:"Don't worry about cost",
        icon: <img src="/trip/luxury.ico" className="h-16 w-16 sm:h-32 sm:w-60"/>,
    },
]

export const SelectTravelList=[
    {
        id:1,
        title:'Just Me',
        desc:"A sole traveles",
        icon: <img src="/trip/me.ico" className="h-16 w-16 sm:h-28 sm:w-50"/>,
        people:'1',
    },
    {
        id:2,
        title:'A couple',
        desc:"Two travelers",
        icon: <img src="/trip/couple.ico" className="h-16 w-16 sm:h-28 sm:w-50 sm:ml-8"/>,
        people:'2',
    },
    {
        id:3,
        title:'Family',
        desc:"A group of fun loving adv",
        icon: <img src="/trip/family.ico" className="h-16 w-16 sm:h-28 sm:w-50 sm:ml-8"/>,
        people:'3 to 5 people',
    },
    {
        id:4,
        title:'Friends',
        desc:"A bunch of thrill-seekers",
        icon: <img src="/trip/friends.ico" className="h-16 w-16 sm:h-28 sm:w-50 sm:ml-8"/>,
        people:'5 to 12 people',
    },
]


export const AI_PROMPT='Generate Travel Plan for Location : {location} for {totalDays} Days for {traveler} with a {budget} budget, Give me a Hotels options list with HotelName,Hotel address,Price in Indian Rupees (₹), hotel image url,geo coordinates,rating,descriptions and suggest itinerary with placeName,Place Details,Place Image Url, Geo Coordinates,ticket Pricing in Indian Rupees (₹),rating,Time travel each of the location for 3 days with each day plan with best time to visit in JSON format.'