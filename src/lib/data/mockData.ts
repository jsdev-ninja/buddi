import { ImageSourcePropType } from 'react-native';

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
};

export const travelerCards: TravelerProfile[] = [
  {
    id: 'traveler-1',
    name: 'idan haziza',
    age: 23,
    location: 'israel',
    locationFlag: '🇮🇱',
    bio: 'החיים יפים הספונטניות יותר',
    profilePhoto: require('@/assets/images/react-logo.png'),
    verified: true,
    interests: ['Photography', 'Hiking', 'Culture'],
    adventurePlan: 'My Adventure Plan',
  },
  {
    id: 'traveler-2',
    name: 'Marcus Chen',
    age: 28,
    location: 'San Francisco, CA',
    locationFlag: '🇺🇸',
    bio: 'Passionate about sustainable travel and local experiences. Always up for an adventure!',
    profilePhoto: require('@/assets/images/react-logo.png'),
    verified: true,
    interests: ['Eco-tourism', 'Food', 'Adventure Sports'],
  },
  {
    id: 'traveler-3',
    name: 'Sofia Martinez',
    age: 26,
    location: 'Barcelona, Spain',
    locationFlag: '🇪🇸',
    bio: 'Digital nomad exploring the world one city at a time. Love connecting with fellow travelers.',
    profilePhoto: require('@/assets/images/react-logo.png'),
    verified: false,
    interests: ['City Exploration', 'Art', 'Nightlife'],
  }
];

export const groups: AdventureGroup[] = [
  {
    id: 'group-1',
    name: 'Himalayan Sunrise Trek',
    destination: 'Poon Hill, Nepal',
    description: 'Join us for a breathtaking journey to see the sunrise over the Himalayas.',
    coverPhoto: require('@/assets/images/react-logo.png'),
    startDate: '2024-12-15',
    endDate: '2024-12-22',
    currentMembers: 4,
    maxMembers: 12,
    tags: ['Mountain Views', 'Sunrise', 'Cultural Experience'],
    activityType: 'trekking'
  },
  {
    id: 'group-2',
    name: 'Iceland Northern Lights Quest',
    destination: 'Reykjavik & Ring Road, Iceland',
    description: 'Chase the magical Northern Lights across Iceland\'s stunning landscapes.',
    coverPhoto: require('@/assets/images/react-logo.png'),
    startDate: '2025-01-10',
    endDate: '2025-01-17',
    currentMembers: 8,
    maxMembers: 15,
    tags: ['Northern Lights', 'Photography', 'Winter Adventure'],
    activityType: 'photography-trip'
  }
];

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

export const trendingAdventures: TrendingAdventure[] = [
  {
    id: 'trending-1',
    name: 'Patagonia W-Trek Expedition',
    destination: 'Torres del Paine, Chile',
    coverPhoto: require('@/assets/images/react-logo.png'),
    category: 'Trekking',
    difficulty: 'Challenging',
    progress: '3/8',
    tags: ['Trekking', 'Challenging'],
  },
  {
    id: 'trending-2',
    name: 'Sahara Desert Crossing',
    destination: 'Morocco',
    coverPhoto: require('@/assets/images/react-logo.png'),
    category: 'Desert',
    difficulty: 'Moderate',
    tags: ['Desert', 'Moderate'],
  },
];

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

export const conversations: Conversation[] = [
  {
    id: 'conv-1',
    name: 'Hhh',
    lastMessage: 'Gggg',
    timestamp: '16:59',
    members: 1,
    isGroup: false,
  },
];

export const chatMessages: Record<string, ChatMessage[]> = {
  'conv-1': [
    {
      id: 'msg-1',
      text: 'Gggg',
      timestamp: '16:59',
      isSent: true,
    },
  ],
};

