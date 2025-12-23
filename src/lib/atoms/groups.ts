import type { GroupInput } from '@/entities/group';
import type { AdventureGroup } from '@/lib/data/mockData';
import { atom } from 'jotai';

// User's created groups atom
export const userGroupsAtom = atom<AdventureGroup[]>([]);

// Completed groups atom
export const completedGroupsAtom = atom<AdventureGroup[]>([]);

// Helper to convert GroupInput to AdventureGroup
export function createGroupFromInput(input: GroupInput): AdventureGroup {
	return {
		id: `group-${Date.now()}`,
		name: input.groupName || 'Unnamed Group',
		destination: input.destination || 'TBA',
		description: input.description || '',
		coverPhoto: require('@/assets/images/react-logo.png'), // Default photo
		startDate: input.startDate || '',
		endDate: input.endDate || '',
		currentMembers: (input.participants?.length || 0) + 1, // +1 for creator
		maxMembers: input.maxMembers || 10,
		tags: input.tags || [],
		activityType: input.activityType || 'Other',
	};
}