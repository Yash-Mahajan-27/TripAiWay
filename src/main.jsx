import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import CreateTrip from './create-trip/index.jsx'
import Header from './components/custom/Header.jsx'
import { Toaster } from './components/ui/sonner.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import ViewTrip from './view-trip/[tripId]/index.jsx'
import MyTrips from './my-trips/index.jsx'
import { ThemeProvider } from 'next-themes'
import AdminPanel from './admin/index.jsx'
import BookHotel from './book-hotel/index.jsx'
import BookingManagement from './components/BookingManagement.jsx'
import HotelBookingManagement from './admin/components/HotelBookingManagement.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <>
        <Header />
        <App />
      </>
    ),
  },
  {
    path: '/create-trip',
    element: (
      <>
        <Header />
        <CreateTrip />
      </>
    ),
  },
  {
    path: '/view-trip/:tripId',
    element: (
      <>
        <Header />
        <ViewTrip />
      </>
    ),
  },
  {
    path: '/my-trips',
    element: (
      <>
        <Header />
        <MyTrips />
      </>
    ),
  },
  {
    path: '/my-bookings',
    element: (
      <>
        <Header />
        <BookingManagement />
      </>
    ),
  },
  {
    path: '/admin',
    element: (
      <>
        <Header />
        <AdminPanel />
      </>
    ),
  },
  {
    path: '/admin/hotel-bookings',
    element: (
      <>
        <Header />
        <HotelBookingManagement />
      </>
    ),
  },
  {
    path: '/book-hotel',
    element: (
      <>
        <Header />
        <BookHotel />
      </>
    ),
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID}>
        <Toaster />
        <RouterProvider router={router}/>
      </GoogleOAuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)