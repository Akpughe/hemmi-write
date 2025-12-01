import { createClient } from './client'

export const signInWithGoogle = async () => {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${location.origin}/auth/callback`,
    },
  })
  return { data, error }
}

export const signInWithEmail = async (email: string) => {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${location.origin}/auth/callback`,
    },
  })
  return { data, error }
}

export const signInWithPassword = async (email: string, password: string) => {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signUpWithPassword = async (email: string, password: string, fullName?: string) => {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${location.origin}/auth/callback`,
      data: {
        full_name: fullName,
      },
    },
  })
  return { data, error }
}

export const signOut = async () => {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const resetPassword = async (email: string) => {
  const supabase = createClient()
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}/auth/callback?next=/auth/reset-password`,
  })
  return { data, error }
}

export const updatePassword = async (password: string) => {
  const supabase = createClient()
  const { data, error } = await supabase.auth.updateUser({
    password,
  })
  return { data, error }
}

export const getSession = async () => {
  const supabase = createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

export const getUser = async () => {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}
