import { z } from 'zod';

// Profile edit schema - all fields optional
export const editProfileSchema = z.object({
	name: z.string().max(100, 'Name must be less than 100 characters').optional(),
	age: z
		.number()
		.int('Age must be a whole number')
		.positive('Age must be greater than 0')
		.max(120, 'Age must be less than 120')
		.optional(),
	location: z.string().max(200, 'Location must be less than 200 characters').optional(),
	locationFlag: z.string().optional(),
	bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
	interests: z.array(z.string()).default([]),
});

export type EditProfileInput = z.infer<typeof editProfileSchema>;