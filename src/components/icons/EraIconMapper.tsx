"use client";
    
import type { EraID } from '@/config/gameConfig';
import { Home, Dna, FlaskConical, Settings, BrainCircuit } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

const eraIconMap: Record<EraID, ComponentType<LucideProps>> = {
  Present: Home,
  Prehistoric: Dna,
  Medieval: FlaskConical,
  Modern: Settings,
  Future: BrainCircuit,
};

interface EraIconProps extends LucideProps {
  eraId: EraID;
}

export default function EraIconMapper({ eraId, ...props }: EraIconProps) {
  const IconComponent = eraIconMap[eraId] || Home; // Default to Home icon
  return <IconComponent {...props} />;
}
