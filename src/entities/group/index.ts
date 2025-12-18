import { z } from "zod";

// Group schema for Firestore - all fields optional except id and userId
export const groupSchema = z.object({
	id: z.string(), // Required - document ID
	userId: z.string(), // Required - creator's user ID

	// Basic Information (all optional)
	groupName: z.string().max(100).optional(),
	destination: z.string().max(200).optional(),
	description: z.string().max(1000).optional(),
	activityType: z
		.enum([
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
		])
		.optional(),
	difficulty: z.enum(["Easy", "Moderate", "Hard", "Expert"]).optional(),
	tags: z.array(z.string()).optional(),
	privacy: z.enum(["public", "private"]).optional(),

	// Details & Photo (all optional)
	startDate: z.number().optional(), // JavaScript timestamp (Date.now())
	endDate: z.number().optional(), // JavaScript timestamp (Date.now())
	maxMembers: z.number().int().positive().max(1000).optional(),
	estimatedCost: z.string().optional(),
	groupPhoto: z.string().url().optional().nullable(),

	// Participants (all optional)
	participants: z.array(z.string()).optional(), // Array of user IDs

	// Timestamps (optional - will be set when creating)
	createdAt: z.number().optional(), // JavaScript timestamp (Date.now())
	updatedAt: z.number().optional(), // JavaScript timestamp (Date.now())
});

export type Group = z.infer<typeof groupSchema>;
