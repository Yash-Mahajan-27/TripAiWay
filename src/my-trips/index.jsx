import { db } from '@/service/firebaseConfig';
import React, { useEffect, useState } from 'react'
import { useNavigation } from 'react-router-dom';
import { collection, query, where, getDocs } from "firebase/firestore";
import UserTripCard from './components/UserTripCard';

function MyTrips() {
  const navigation = useNavigation();
  const [userTrips, setUserTrips] = useState([]);
  
  useEffect(() => {
    GetUserTrips();
  }, [])

  const GetUserTrips = async() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if(!user) {
      navigation('/');
      return;
    }
    setUserTrips([]);
    const q = query(collection(db,'AiTrips'), where('userEmail','==',user?.email))
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      setUserTrips(prev => [...prev, doc.data()])
    });
  }
   
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">My Adventures</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {userTrips?.length > 0 ? userTrips.map((trip, index) => (
            <UserTripCard trip={trip} key={index} />
          )) : (
            Array.from({ length: 6 }).map((_, index) => (
              <div 
                key={index} 
                className="bg-card rounded-xl shadow-md h-[280px] animate-pulse"
              >
                <div className="h-48 bg-muted rounded-t-xl"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default MyTrips;