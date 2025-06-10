import React, { useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';

function Hero() {
  const headingRef = useRef(null);
  const descriptionRef = useRef(null);
  const buttonRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Create a timeline for smooth sequence animation
    const tl = gsap.timeline({
      defaults: { 
        ease: "power4.out",
        duration: 1
      }
    });

    // Initial state - hide all elements
    gsap.set([headingRef.current, descriptionRef.current, buttonRef.current, imageRef.current], {
      opacity: 0,
      y: 50
    });

    // Container fade in
    tl.fromTo(containerRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.5 }
    )

    // Heading animation with text split
    .fromTo(headingRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1 }
    )

    // Description fade in and slide up
    .fromTo(descriptionRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8 },
      "-=0.5"
    )

    // Button animation
    .fromTo(buttonRef.current,
      { opacity: 0, y: 20, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8 },
      "-=0.5"
    )

    // Image container animation
    .fromTo(imageRef.current,
      { 
        opacity: 0,
        x: 100,
        rotate: 5
      },
      { 
        opacity: 1,
        x: 0,
        rotate: 0,
        duration: 1.2,
        ease: "elastic.out(1, 0.8)"
      },
      "-=1"
    );

    // Hover animation for the image
    gsap.to(imageRef.current, {
      y: 15,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut"
    });

  }, []);

  return (
    <div 
      ref={containerRef}
      className="min-h-[80vh] w-full bg-gradient-to-b from-blue-50 to-background dark:from-blue-950 dark:to-background flex items-center opacity-0 overflow-x-hidden"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
            <h1 
              ref={headingRef}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                Discover Your Next Adventure
              </span>
              <br />
              <span className="text-foreground">with AI Magic</span>
            </h1>
            <p 
              ref={descriptionRef}
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed"
            >
              Your personal AI travel curator crafting perfect itineraries tailored to your dreams and budget.
            </p>
            <div ref={buttonRef} className="flex justify-center lg:justify-start">
              <Link to="/create-trip">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-full hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200">
                  Start Planning Your Journey
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative mt-8 lg:mt-0" ref={imageRef}>
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-2xl blur-2xl opacity-50"></div>
            <img 
              src="/landing.png" 
              alt="Travel Planning 3D Illustration"
              className="relative rounded-2xl w-full max-w-lg mx-auto transform transition duration-500 drop-shadow-[0_35px_35px_rgba(0,0,0,0.25)] hover:drop-shadow-[0_45px_45px_rgba(0,0,0,0.3)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;