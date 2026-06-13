const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const serverOnlyEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'PAYSTACK_SECRET_KEY',
  'RESEND_API_KEY',
] as const

export function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Copy .env.local.example to .env.local and fill in the values.`
    )
  }
}

export function validateServerEnv() {
  validateEnv()
  const missing = serverOnlyEnvVars.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missing.join(', ')}\n` +
      `Copy .env.local.example to .env.local and fill in the values.`
    )
  }
}