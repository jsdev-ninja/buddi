import { User } from "@firebase/auth";

// extend firebase user with role
// todo when user signup create role
export interface TUser extends User {
	role: "admin" | "user";
}
