'use client';

import { useEffect } from 'react';

// Handles the case where Supabase implicit flow redirects to /auth/login
// with #access_token=...&type=recovery in the hash (instead of going through
// the PKCE /auth/callback route). Chrome preserves the hash on server redirects.
export function RecoveryRedirect() {
    useEffect(() => {
        if (window.location.hash.includes('type=recovery')) {
            window.location.replace('/auth/reset-password' + window.location.hash);
        }
    }, []);
    return null;
}
