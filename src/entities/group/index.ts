import { z } from "zod";

// Activity type enum
export const ActivityTypeEnum = z.enum([
	"Trekking & Hiking",
	"Rock Climbing",
	"Camping",
	"Mountaineering",
	"Cycling",
	"Water Sports",
	"Winter Sports",
	"Wildlife Safari",
	"Photography",
	"Cultural Tour",
	"Other",
]);

// Difficulty enum
export const DifficultyEnum = z.enum(["Easy", "Moderate", "Hard", "Expert"]);

// Privacy enum
export const PrivacyEnum = z.enum(["public", "private"]);

// Group schema for Firestore - all fields optional except id and userId
export const groupSchema = z.object({
	id: z.string(), // Required - document ID
	userId: z.string(), // Required - creator's user ID

	// Basic Information (all optional)
	groupName: z.string().max(100).optional(),
	destination: z.string().max(200).optional(),
	description: z.string().max(1000).optional(),
	activityType: ActivityTypeEnum.optional(),
	difficulty: DifficultyEnum.optional(),
	tags: z.array(z.string()).optional(),
	privacy: PrivacyEnum.optional(),

	// Details & Photo (all optional)
	startDate: z.number().optional(), // JavaScript timestamp (Date.now())
	endDate: z.number().optional(), // JavaScript timestamp (Date.now())
	maxMembers: z.number().int().positive().max(1000).optional(),
	estimatedCost: z.string().optional(),
	groupPhoto: z.string().url().optional().nullable(),

	// Participants (all optional)
	participants: z.array(z.string()).optional(), // Array of user IDs

	// Status: active (default) or completed
	status: z.enum(["active", "completed"]).optional(),
	completedAt: z.number().optional(), // JavaScript timestamp when marked completed

	// Timestamps (optional - will be set when creating)
	createdAt: z.number().optional(), // JavaScript timestamp (Date.now())
	updatedAt: z.number().optional(), // JavaScript timestamp (Date.now())
});

export type Group = z.infer<typeof groupSchema>;

// Group input schema for forms (without id, userId, timestamps, with string dates)
export const groupInputSchema = groupSchema
	.omit({
		id: true,
		userId: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		type: z.literal("group"), // Include type for form input
		// Allow string dates for form input (will be converted to timestamps)
		startDate: z.string().optional(),
		endDate: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.startDate && data.endDate) {
				const start = new Date(data.startDate);
				const end = new Date(data.endDate);
				return end >= start;
			}
			return true;
		},
		{
			message: "End date must be after start date",
			path: ["endDate"],
		}
	);

export type GroupInput = z.infer<typeof groupInputSchema>;

// Export enum types
export type ActivityType = z.infer<typeof ActivityTypeEnum>;
export type Difficulty = z.infer<typeof DifficultyEnum>;
export type Privacy = z.infer<typeof PrivacyEnum>;

export function isGroup(data: any): data is Group {
	return data?.type === "group";
}
