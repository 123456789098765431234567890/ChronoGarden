import type { SVGProps } from 'react';

export default function ChronoLeafIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Leaf part */}
      <path d="M12 22c-4-4-6-7-6-10a6 6 0 0 1 12 0c0 3-2 6-6 10z" />
      <path d="M12 12A10 10 0 0 0 12 2a10 10 0 0 0 0 20" /> {/* Outer circle for clock */}
      
      {/* Clock hands */}
      <path d="M12 6v6l3 3" /> {/* Hour and minute hand */}
      
      {/* Gear like notches on the leaf edge */}
      <path d="M15.6,5.4 A6,6 0 0 0 12,4 M8.4,5.4 A6,6 0 0 1 12,4" />
      <path d="M5.4,8.4 A6,6 0 0 0 4,12 M5.4,15.6 A6,6 0 0 1 4,12" />
      <path d="M8.4,18.6 A6,6 0 0 0 12,20 M15.6,18.6 A6,6 0 0 1 12,20" />
      <path d="M18.6,15.6 A6,6 0 0 0 20,12 M18.6,8.4 A6,6 0 0 1 20,12" />
    </svg>
  );
}
