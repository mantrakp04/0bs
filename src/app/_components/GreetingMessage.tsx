"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

const morningGreetings = ["Good morning!"] as const;

const afternoonGreetings = ["Good afternoon!"] as const;

const eveningGreetings = ["Good evening!"] as const;

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
  const { user } = useUser();
  return (
    <div className="animate-fade-in text-muted-foreground mb-8 text-center text-5xl font-semibold">
      {greeting} {user?.firstName}
    </div>
  );
}
