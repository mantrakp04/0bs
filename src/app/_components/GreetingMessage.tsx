'use client';

import { useEffect, useState } from 'react';

const morningGreetings = [
  "Rise and shine ☀️",
  "Good morning! ☕",
  "Morning! 🌅",
] as const;

const afternoonGreetings = [
  "Afternoon! 💻",
  "Keep calm! 🚀",
  "Mid-day debugging! 🔍",
  "Good afternoon! 🌅",
] as const;

const eveningGreetings = [
  "Evening! 🌙",
  "Night mode 🌠",
] as const;

export function GreetingMessage() {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const getRandomGreeting = (greetings: readonly string[]): string => {
      return greetings[Math.floor(Math.random() * greetings.length)]!;
    };

    const updateGreeting = () => {
      const hour = new Date().getHours();
      
      if (hour >= 5 && hour < 12) {
        setGreeting(getRandomGreeting(morningGreetings));
      } else if (hour >= 12 && hour < 18) {
        setGreeting(getRandomGreeting(afternoonGreetings));
      } else {
        setGreeting(getRandomGreeting(eveningGreetings));
      }
    };

    updateGreeting();
    // Update greeting every hour
    const interval = setInterval(updateGreeting, 3600000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-5xl font-medium text-center mb-8 animate-fade-in text-muted-foreground">
      {greeting}
    </div>
  );
} 