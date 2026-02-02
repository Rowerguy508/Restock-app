/**
 * Supabase API Client for Restocka
 * 
 * This module provides Supabase-based authentication and API calls.
 * Replace the custom auth implementation with Supabase Auth.
 */

import { createClient } from '@supabase/supabase-js'
import { useAuthStore } from '@/lib/auth-store'

// Environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY')
}

// Create Supabase client
export const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)

// Auth helpers
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export const onAuthChange = (callback: (session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}

// API calls with Supabase auth
const apiFetch = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const session = await getSession()
  
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token && { 
        'Authorization': `Bearer ${session.access_token}` 
      }),
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }

  return response.json()
}

// API client
export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: object) => 
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: object) => 
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: object) => 
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => 
    apiFetch<T>(path, { method: 'DELETE' }),
}

export { SUPABASE_URL, SUPABASE_ANON_KEY, API_URL }
