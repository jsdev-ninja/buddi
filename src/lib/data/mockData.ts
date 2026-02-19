import { ImageSourcePropType } from 'react-native';

/**
 * UI types for discover/group views.
 * Data is fetched from Firestore; these types describe the display shape.
 */

export type TravelerProfile = {
  id: string;
  name: string;
  age: number;
  location: string;
  locationFlag?: string;
  bio: string;
  profilePhoto: ImageSourcePropType;
  verified: boolean;
  interests: string[];
  adventurePlan?: string;
  gender?: string;
};

export type AdventureGroup = {
  id: string;
  name: string;
  destination: string;
  description: string;
  coverPhoto: ImageSourcePropType;
  startDate: string;
  endDate: string;
  currentMembers: number;
  maxMembers: number;
  tags: string[];
  activityType: string;
  difficulty?: string;
};

export type TrendingAdventure = {
  id: string;
  name: string;
  destination: string;
  coverPhoto: ImageSourcePropType;
  category: string;
  difficulty: string;
  progress?: string; // e.g., "3/8"
  tags: string[];
};

export type Conversation = {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: string;
  unread?: boolean;
  members?: number;
  isGroup?: boolean;
};

export type ChatMessage = {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean; // true if sent by current user
};

