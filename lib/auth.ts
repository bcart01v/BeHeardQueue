// lib/auth.ts
import { auth } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail
} from 'firebase/auth';

// Sign up a new user
export const registerWithEmail = async (email: string, password: string): Promise<User | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Registration Error:", error);
    throw error;
  }
};

// Sign in an existing user
export const loginWithEmail = async (email: string, password: string): Promise<User | null> => {
  if (auth.currentUser) {
    console.log("User already logged in");
    return auth.currentUser;
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
  }
};

// Sign out the current user
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
    throw error;
  }
};

// Send password reset email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log("Password reset email sent");
  } catch (error: any) {
    console.error("Error sending password reset email:", error.message);
    throw error;
  }
};

// Listen for auth state changes
export const onUserAuthStateChanged = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};