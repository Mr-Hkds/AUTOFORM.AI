import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export default async function handler(req, res) {
    // CORS headers for local and production
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { uid, amount } = req.body;

    if (!uid || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Invalid request parameters' });
    }

    // --- FIREBASE ADMIN INITIALIZATION (Consistent with verify-payment.js) ---
    let db = null;
    if (getApps().length === 0 && process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            initializeApp({
                credential: cert(serviceAccount)
            });
            console.log("[API] Firebase Admin Initialized");
            db = getFirestore();
        } catch (error) {
            console.error('[API] Failed to initialize Firebase Admin:', error);
            // Critical error, we can't proceed
            return res.status(500).json({ error: 'Server configuration error' });
        }
    } else if (getApps().length > 0) {
        db = getFirestore();
    } else {
        console.error('[API] Missing FIREBASE_SERVICE_ACCOUNT env var');
        return res.status(500).json({ error: 'Server configuration error: Missing credentials' });
    }

    try {
        const userRef = db.collection('users').doc(uid);

        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw new Error("User record not found");
            }

            const userData = userDoc.data();
            const currentTokens = userData.tokens || 0;

            if (currentTokens < amount) {
                return { success: false, error: 'INSUFFICIENT_TOKENS', currentTokens };
            }

            // Perform Atomic Deduction
            transaction.update(userRef, {
                tokens: FieldValue.increment(-amount),
                responsesUsed: FieldValue.increment(amount)
            });

            return { success: true, newTokens: currentTokens - amount };
        });

        if (result.success) {
            console.log(`[API] Deducted ${amount} tokens for ${uid}. Remaining: ${result.newTokens}`);
            return res.status(200).json(result);
        } else {
            console.warn(`[API] Deduction refused: ${result.error}`);
            return res.status(403).json(result);
        }

    } catch (error) {
        console.error('[API] Secure Token Deduction Error:', error);
        return res.status(500).json({
            error: 'Failed to process token deduction',
            message: error.message
        });
    }
}
