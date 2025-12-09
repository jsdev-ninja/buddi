import type { AdventureGroup } from '@/lib/data/mockData';
import type { CreateGroupInput } from '@/lib/schemas/group';
import { atom } from 'jotai';

// User's created groups atom
export const userGroupsAtom = atom<AdventureGroup[]>([]);

// Completed groups atom
export const completedGroupsAtom = atom<AdventureGroup[]>([]);

// Helper to convert CreateGroupInput to AdventureGroup
export function createGroupFromInput(input: CreateGroupInput): AdventureGroup {
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