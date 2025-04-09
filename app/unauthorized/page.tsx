import React from 'react';
import Link from 'next/link';

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-[#1d1b1b] flex flex-col items-center justify-center text-white px-4">
            <h1 className="text-4xl font-bold mb-4 text-orange-400">Access Denied</h1>
            <p className="text-lg mb-8">You don't have permission to view this page.</p>

            <Link
                href="/"
                className="bg-orange-400 hover:bg-orange-500 text-black font-semibold py-2 px-6 rounded-lg"
            >
                Return to Home
            </Link>
        </div>
    );
}
