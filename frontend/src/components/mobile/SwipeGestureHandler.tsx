import React, { useState, useCallback, useRef } from 'react';
import { Box } from '@mui/material';

interface SwipeGestureHandlerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
}

interface TouchPosition {
  x: number;
  y: number;
}

export const SwipeGestureHandler: React.FC<SwipeGestureHandlerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className,
}) => {
  const [startTouch, setStartTouch] = useState<TouchPosition | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setStartTouch({ x: touch.clientX, y: touch.clientY });
    setIsScrolling(false);
    
    // Clear any existing scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startTouch) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - startTouch.x);
    const deltaY = Math.abs(touch.clientY - startTouch.y);

    // If vertical movement is significant, consider it scrolling
    if (deltaY > deltaX && deltaY > 10) {
      setIsScrolling(true);
    }
  }, [startTouch]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!startTouch || isScrolling) {
      setStartTouch(null);
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startTouch.x;
    const deltaY = touch.clientY - startTouch.y;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine swipe direction based on the largest movement
    if (absDeltaX > threshold && absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else if (absDeltaY > threshold && absDeltaY > absDeltaX) {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }

    setStartTouch(null);
  }, [startTouch, isScrolling, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return (
    <Box
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      sx={{
        touchAction: 'pan-y', // Allow vertical scrolling but prevent horizontal
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {children}
    </Box>
  );
};