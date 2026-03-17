import * as admin from 'firebase-admin';
import { cookies } from 'next/headers';

// Initialize Firebase Admin App if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

/**
 * Verifies the user's session cookie and returns the decoded token.
 * Throws an error if the user is not authenticated or the token is invalid.
 */
export async function verifyAuth() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    throw new Error('Unauthorized: No session cookie found');
  }

  try {
    // Verify the session cookie and get the user's decoded token
    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true /** checkRevoked */);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying auth cookie', error);
    throw new Error('Unauthorized: Invalid session');
  }
}