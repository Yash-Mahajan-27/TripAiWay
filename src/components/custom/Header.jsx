import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog"
import { FcGoogle } from "react-icons/fc";
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Header() {
  const user = JSON.parse(localStorage.getItem('user'));
  const [openDialog, setOpenDialog] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    console.log(user)
  }, [])

  const login = useGoogleLogin({
    onSuccess: (codeResp) => GetUserProfile(codeResp),
    onError: (error) => console.log(error)
  })
  
  const GetUserProfile = (tokenInfo) => {
    axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?acess_token=${tokenInfo?.access_token}`, {
      headers: {
        Authorization: `Bearer ${tokenInfo?.access_token}`,
        Accept: 'Application/json'
      }
    }).then((resp) => {
      localStorage.setItem('user', JSON.stringify(resp.data));
      setOpenDialog(false);
      window.location.reload();
    })
  }

  const handleLogout = () => {
    googleLogout();
    localStorage.clear();
    sessionStorage.removeItem('adminAuth');
    navigate('/');
  };

  if (!mounted) return null;

  return (
    <div className='sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b w-full'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full'>
        <div className='flex justify-between items-center h-16 sm:h-20'>
          <img 
            src='/logo.png' 
            className='h-24 sm:h-32 w-auto cursor-pointer' 
            onClick={() => navigate('/')}
            alt="Logo"
          />
          <div className='flex items-center gap-2 sm:gap-4'>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 transition-all" />
              ) : (
                <Moon className="h-5 w-5 transition-all" />
              )}
            </Button>
            {user ? (
              <div className='flex items-center gap-2 sm:gap-4'>
                <a href="/create-trip" className="hidden sm:block">
                  <Button variant="outline" className="rounded-full px-4 sm:px-6 hover:bg-primary/10 text-sm sm:text-base">
                    Create Trip
                  </Button>
                </a>
                <a href="/my-trips" className="hidden sm:block">
                  <Button variant="outline" className="rounded-full px-4 sm:px-6 hover:bg-primary/10 text-sm sm:text-base">
                    My Trips
                  </Button>
                </a>
                <a href="/my-bookings" className="hidden sm:block">
                  <Button variant="outline" className="rounded-full px-4 sm:px-6 hover:bg-primary/10 text-sm sm:text-base">
                    My Bookings
                  </Button>
                </a>
                <Popover>
                  <PopoverTrigger>
                    <img 
                      src={user?.picture} 
                      className='w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-background shadow-md hover:shadow-lg transition-shadow'
                      alt="Profile" 
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div 
                      className="cursor-pointer p-2 hover:bg-muted rounded-md transition-colors"
                      onClick={handleLogout}
                    >
                      Logout
                    </div>
                    <a href="/create-trip" className="block sm:hidden">
                      <div className="cursor-pointer p-2 hover:bg-muted rounded-md transition-colors">
                        Create Trip
                      </div>
                    </a>
                    <a href="/my-trips" className="block sm:hidden">
                      <div className="cursor-pointer p-2 hover:bg-muted rounded-md transition-colors">
                        My Trips
                      </div>
                    </a>
                    <a href="/my-bookings" className="block sm:hidden">
                      <div className="cursor-pointer p-2 hover:bg-muted rounded-md transition-colors">
                        My Bookings
                      </div>
                    </a>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <Button 
                onClick={() => setOpenDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-full px-4 sm:px-6 text-sm sm:text-base hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogDescription>
              <div className="flex flex-col items-center space-y-6 py-6">
                <img src="/logo.png" className="h-32 w-auto"/>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground">Welcome Back</h2>
                  <p className="mt-2 text-muted-foreground">Sign in securely with Google to continue your journey</p>
                </div>
                <Button 
                  onClick={login} 
                  className="w-full flex items-center justify-center gap-3 bg-background border-2 border-input text-foreground hover:bg-accent transition-colors py-6"
                >
                  <FcGoogle className="h-6 w-6"/>
                  <span className="font-medium">Continue with Google</span>
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Header;