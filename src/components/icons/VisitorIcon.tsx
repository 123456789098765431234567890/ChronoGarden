
// src/components/icons/VisitorIcon.tsx
import type { SVGProps } from 'react';
import { UserCircle } from 'lucide-react'; // Using a default Lucide icon

export default function VisitorIcon(props: SVGProps<SVGSVGElement>) {
  // This is a placeholder. For actual different visitor icons,
  // you would create unique SVGs or use different Lucide icons per visitor.
  return <UserCircle {...props} />;
}
