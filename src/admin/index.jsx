import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/service/firebaseConfig';
import UserCard from './components/UserCard';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function AdminPanel() {
  const [users, setUsers] = useState({});
  const [bookings, setBookings] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const adminAuth = sessionStorage.getItem('adminAuth');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = () => {
    if (username === 'admin' && password === 'admin123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuth', 'true');
      fetchData();
    } else {
      toast.error('Invalid credentials');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUsers(), fetchBookings()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const tripsSnapshot = await getDocs(collection(db, 'AiTrips'));
      const userTrips = {};

      tripsSnapshot.forEach((doc) => {
        const tripData = doc.data();
        const userEmail = tripData.userEmail;

        if (!userTrips[userEmail]) {
          userTrips[userEmail] = {
            trips: [],
            totalTrips: 0,
          };
        }

        userTrips[userEmail].trips.push({
          id: doc.id,
          ...tripData,
        });
        userTrips[userEmail].totalTrips += 1;
      });

      setUsers(userTrips);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  const fetchBookings = async () => {
    try {
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const userBookings = {};

      bookingsSnapshot.forEach((doc) => {
        const bookingData = doc.data();
        const userEmail = bookingData.userId;

        if (!userBookings[userEmail]) {
          userBookings[userEmail] = {
            bookings: [],
            totalBookings: 0,
          };
        }

        userBookings[userEmail].bookings.push({
          id: doc.id,
          ...bookingData,
        });
        userBookings[userEmail].totalBookings += 1;
      });

      setBookings(userBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 w-full overflow-x-hidden">
        <div className="bg-card p-6 sm:p-8 rounded-xl shadow-lg border border-border w-full max-w-md">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">Admin Login</h2>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full"
            />
            <Button 
              onClick={handleLogin}
              className="w-full bg-primary text-primary-foreground"
            >
              Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <Button
              onClick={() => navigate('/admin/hotel-bookings')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Manage Hotel Bookings
            </Button>
            <div className="bg-card px-3 sm:px-4 py-2 rounded-lg">
              <span className="text-sm sm:text-base text-muted-foreground">Total Users: </span>
              <span className="font-bold text-foreground">{Object.keys(users).length}</span>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                sessionStorage.removeItem('adminAuth');
                setIsAuthenticated(false);
              }}
              className="text-sm sm:text-base"
            >
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {Object.entries(users).map(([email, userData]) => (
            <UserCard 
              key={email} 
              email={email} 
              userData={userData} 
              bookingData={bookings[email]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;