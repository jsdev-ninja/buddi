import { z } from 'zod';

// Activity type enum
export const ActivityTypeEnum = z.enum([
	'Trekking & Hiking',
	'Rock Climbing',
	'Camping',
	'Mountaineering',
	'Cycling',
	'Water Sports',
	'Winter Sports',
	'Wildlife Safari',
	'Photography',
	'Cultural Tour',
	'Other',
]);

// Difficulty enum
export const DifficultyEnum = z.enum(['Easy', 'Moderate', 'Hard', 'Expert']);

// Privacy enum
export const PrivacyEnum = z.enum(['public', 'private']);

// Group creation schema
export const createGroupSchema = z.object({
	// Step 1: Basic Information
	groupName: z.string().max(100, 'Group name must be less than 100 characters').optional(),
	destination: z.string().max(200, 'Destination must be less than 200 characters').optional(),
	description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
	activityType: ActivityTypeEnum.optional(),
	difficulty: DifficultyEnum.optional(),
	tags: z.array(z.string()).default([]),
	privacy: PrivacyEnum.default('public'),

	// Step 2: Details & Photo
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	maxMembers: z
		.number()
		.int('Max members must be a whole number')
		.positive('Max members must be greater than 0')
		.max(1000, 'Max members cannot exceed 1000')
		.optional(),
	estimatedCost: z
		.string()
		.optional()
		.refine(
			(val) => {
				if (!val || val === '') return true;
				const num = parseFloat(val);
				return !isNaN(num) && num >= 0;
			},
			{ message: 'Estimated cost must be a valid number' }
		),
	groupPhoto: z.string().url('Group photo must be a valid URL').optional().nullable(),

	// Step 3: Add Participants
	participants: z.array(z.string()).default([]),
}).refine(
	(data) => {
		if (data.startDate && data.endDate) {
			const start = new Date(data.startDate);
			const end = new Date(data.endDate);
			return end >= start;
		}
		return true;
	},
	{
		message: 'End date must be after start date',
		path: ['endDate'],
	}
);

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type ActivityType = z.infer<typeof ActivityTypeEnum>;
export type Difficulty = z.infer<typeof DifficultyEnum>;
export type Privacy = z.infer<typeof PrivacyEnum>;