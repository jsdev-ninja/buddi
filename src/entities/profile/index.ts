import { z } from "zod";

// Profile schema for Firestore - all fields optional except id and userId
export const profileSchema = z.object({
	type: z.literal("profile"),
	id: z.string(), // Required - document ID
	userId: z.string(), // Required - user's ID (same as Firebase Auth UID)
	// Basic Information (all optional)
	name: z.string().max(100).optional(),
	age: z.number().int().positive().max(120).optional(),
	location: z.string().max(200).optional(),
	locationFlag: z.string().optional(), // Emoji flag
	bio: z.string().max(1000).optional(),
	profilePhoto: z.string().url().optional().nullable(), // Photo URL
	verified: z.boolean().optional(), // Verification status
	interests: z.array(z.string()).optional(), // Array of interest tags
	adventurePlan: z.string().max(500).optional(), // Optional adventure plan text

	// Timestamps (optional - will be set when creating)
	createdAt: z.number().optional(), // JavaScript timestamp (Date.now())
	updatedAt: z.number().optional(), // JavaScript timestamp (Date.now())
});

export type Profile = z.infer<typeof profileSchema>;

// Profile input schema for forms (without id, userId, type, timestamps)
export const profileInputSchema = profileSchema.omit({
	id: true,
	userId: true,
	type: true,
	createdAt: true,
	updatedAt: true,
	verified: true, // Verified is set by admin, not user input
});

export type ProfileInput = z.infer<typeof profileInputSchema>;

export function isProfile(data: any): data is Profile {
	return data?.type === "profile";
}
