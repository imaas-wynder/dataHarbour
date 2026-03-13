import { cookies } from 'next/headers';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
    });
}

export async function verifyAuth() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
        throw new Error('Unauthorized: No session cookie found');
    }

    try {
        const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);
        return decodedToken.uid;
    } catch (error) {
        console.error('Error verifying session cookie:', error);
        throw new Error('Unauthorized: Invalid session cookie');
    }
}
