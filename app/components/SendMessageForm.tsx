'use client';
import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SendMessageFormProps {
  userId: string;
  buttonClassName?: string;
  fullWidth?: boolean;
}

export default function SendMessageForm({ userId, buttonClassName = '', fullWidth = false }: SendMessageFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      if (!userSnap.exists() || !userData?.fcmToken) {
        alert('This user does not have a registered FCM token.');
        setSending(false);
        return;
      }

      const res = await fetch('https://us-central1-beheardqueue.cloudfunctions.net/sendNotification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: userData.fcmToken,
          userId,
          title: 'Message from BeHeard',
          body: messageText,
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert('Message sent!');
        setMessageText('');
        setShowForm(false);
      } else {
        alert('Failed to send message.');
      }
    } catch (err) {
      console.error(err);
      alert('Error sending message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${buttonClassName}`}
        >
          {showForm ? 'Cancel' : 'Send Message'}
        </button>
      </div>

      {showForm && (
        <div className={`mt-4 ${fullWidth ? 'w-full' : 'max-w-sm'}`}>
          <textarea
            className="w-full p-3 bg-[#fff8dc] text-black placeholder-gray-700 border rounded"
            placeholder="Enter your message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={3}
          />
          <button
            onClick={handleSend}
            disabled={sending || !messageText.trim()}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      )}
    </div>
  );
}
