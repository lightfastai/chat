/**
 * Authentication configuration
 * This file is kept for backward compatibility during migration.
 * Authentication is now handled by Clerk.
 */

// Export empty functions to prevent breaking imports
export const auth = () => {
	throw new Error(
		"Authentication has been migrated to Clerk. Please update your code.",
	);
};

export const signIn = () => {
	throw new Error(
		"Authentication has been migrated to Clerk. Please use Clerk's signIn.",
	);
};

export const signOut = () => {
	throw new Error(
		"Authentication has been migrated to Clerk. Please use Clerk's signOut.",
	);
};

export const store = {};

export const isAuthenticated = () => {
	throw new Error(
		"Authentication has been migrated to Clerk. Please use Clerk's authentication checks.",
	);
};
