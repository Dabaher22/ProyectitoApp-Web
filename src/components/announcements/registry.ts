import React from 'react';
import SaltarEjerciciosCard from './SaltarEjerciciosCard';
import EnlaceDirectoCard from './EnlaceDirectoCard';
import { AppNotification } from '../../services/notifications';

export interface AnnouncementCardProps {
  onClose: () => void;
}

interface AnnouncementCardMeta {
  label: string;
  component: React.ComponentType<AnnouncementCardProps>;
}

export const CARD_REGISTRY: Record<string, AnnouncementCardMeta> = {
  saltar_ejercicios: {
    label: 'Ahora podés saltar ejercicios',
    component: SaltarEjerciciosCard,
  },
  enlace_directo: {
    label: 'Enlace directo para tus asesorados',
    component: EnlaceDirectoCard,
  },
};

export function getAnnouncementCard(n: AppNotification): React.ComponentType<AnnouncementCardProps> | null {
  if (n.presentation !== 'card' || !n.cardKey) return null;
  return CARD_REGISTRY[n.cardKey]?.component ?? null;
}
