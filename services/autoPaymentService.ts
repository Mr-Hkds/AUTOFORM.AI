/**
 * Automatic Payment Service
 * Handles automatic token crediting after successful Razorpay payment
 */

import { doc, updateDoc, increment, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface PaymentTransaction {
    userId: string;
    userEmail: string;
    paymentId: string;
    orderId: string;
    amount: number;
    tokens: number;
    status: 'success' | 'failed' | 'pending';
    method: string;
    metadata?: any;
}

/**
 * Credit tokens automatically after payment success
 */
export const creditTokensAutomatically = async (
    userId: string,
    tokens: number,
    paymentId: string,
    orderId: string,
    userEmail: string
): Promise<boolean> => {
    try {
        console.log(`💰 Auto-crediting ${tokens} tokens to user ${userId}`);

        // 1. Update user's token balance
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            tokens: increment(tokens),
            isPremium: true,
            lastPayment: serverTimestamp(),
        });

        console.log(`✅ Tokens credited successfully!`);

        // 2. Log the transaction
        await logTransaction({
            userId,
            userEmail,
            paymentId,
            orderId,
            amount: 0, // Will be updated with actual amount
            tokens,
            status: 'success',
            method: 'razorpay',
        });

        // 3. Send success email (optional)
        try {
            await sendPaymentSuccessNotification(userEmail, tokens);
        } catch (emailError) {
            console.warn('⚠️ Email notification failed (non-critical):', emailError);
        }

        return true;

    } catch (error: any) {
        console.error('❌ Auto-credit failed:', error);

        // Log failed transaction
        try {
            await logTransaction({
                userId,
                userEmail,
                paymentId,
                orderId,
                amount: 0,
                tokens,
                status: 'failed',
                method: 'razorpay',
                metadata: { error: error.message },
            });
        } catch (logError) {
            console.error('❌ Failed to log failed transaction:', logError);
        }

        throw error;
    }
};

/**
 * Log payment transaction to Firestore
 * Uses paymentId as document ID to ensure idempotency
 */
export const logTransaction = async (transaction: PaymentTransaction): Promise<string> => {
    try {
        // Use setDoc to create or overwrite. 
        // This ensures that if the same payment comes in twice, we handle it gracefully 
        const { setDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'transactions', transaction.paymentId);

        await setDoc(docRef, {
            ...transaction,
            createdAt: serverTimestamp(),
        });

        console.log(`📝 Transaction logged: ${transaction.paymentId}`);
        return transaction.paymentId;

    } catch (error) {
        console.error('❌ Failed to log transaction:', error);
        throw error;
    }
};

/**
 * Verify transaction doesn't already exist (prevent duplicate credits)
 */
export const checkTransactionExists = async (paymentId: string): Promise<boolean> => {
    try {
        const docRef = doc(db, 'transactions', paymentId);
        const snapshot = await getDoc(docRef);
        return snapshot.exists();
    } catch (error) {
        console.error('❌ Failed to check transaction:', error);
        return false;
    }
};

/**
 * Send payment success notification email
 */
export const sendPaymentSuccessNotification = async (
    userEmail: string,
    tokens: number
): Promise<void> => {
    try {
        // Use EmailJS to send notification
        const { sendUserSuccessEmail } = await import('./emailService');

        await sendUserSuccessEmail(
            userEmail,
            userEmail.split('@')[0], // Name from email
            tokens
        );

        console.log(`📧 Payment success email sent to ${userEmail}`);

    } catch (error) {
        console.warn('⚠️ Failed to send payment success email:', error);
        // Don't throw - email failure shouldn't break payment flow
    }
};

/**
 * Rollback token credit (in case of issues)
 */
export const rollbackTokenCredit = async (
    userId: string,
    tokens: number,
    reason: string
): Promise<void> => {
    try {
        console.warn(`🔄 Rolling back ${tokens} tokens for user ${userId}. Reason: ${reason}`);

        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            tokens: increment(-tokens), // Subtract tokens
        });

        console.log(`✅ Rollback completed`);

    } catch (error) {
        console.error('❌ Rollback failed:', error);
        // This is critical - should alert admin
        throw error;
    }
};

/**
 * Get user's transaction history
 */
export const getUserTransactions = async (userId: string): Promise<PaymentTransaction[]> => {
    try {
        const transactionsRef = collection(db, 'transactions');
        const snapshot = await getDoc(doc(transactionsRef, userId));

        // In a real implementation, query by userId
        // For now, return empty array
        return [];

    } catch (error) {
        console.error('❌ Failed to fetch transactions:', error);
        return [];
    }
};
