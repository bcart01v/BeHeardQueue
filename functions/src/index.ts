// TEMPORARILY DISABLED TO PREVENT BUILD ERROR

/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
/*
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as corsLib from 'cors';
import type { Notification } from './types/notification';

admin.initializeApp();
const cors = corsLib({ origin: true });

export const sendNotification = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('HTTP method not allowed');
            return;
        }

        const { token, title, body, userId } = req.body;
        console.log('Received payload:', { token, title, body, userId });

        const message = {
            token,
            notification: { title, body },
            data: { userId },
        };

        try {
            // Send push notification
            const response = await admin.messaging().send(message);
            // Save message in Firestore
            const notification: Omit<Notification, 'id'> = {
                userId,
                message: body,
                read: false,
                createdAt: new Date(),
            };

            await admin
                .firestore()
                .collection('users')
                .doc(userId)
                .collection('notifications')
                .add(notification);

            res.status(200).send({ success: true, response });
        } catch (error: any) {
            console.error('Error sending FCM message:', error);
            res.status(500).send({ success: false, error: error.message });
        }
    });
});

*/