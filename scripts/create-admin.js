const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local manually
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local file not found at:', envPath)
    console.error('Please create .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=').replace(/^["']|["']$/g, '')
      process.env[key.trim()] = value
    }
  })
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing required environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'found' : 'MISSING')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'found' : 'MISSING')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createAdmin() {
  const email = 'admin@aticanbeach.com'
  const password = 'AticanAdmin2024!'

  console.log('Creating admin user...')
  console.log('Email:', email)

  // Create user in auth.users
  const { data: user, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (signUpError) {
    if (signUpError.message.includes('already been registered') || signUpError.message.includes('already exists')) {
      console.log('Admin user already exists. Updating role...')

      // Get existing user
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) {
        console.error('Error listing users:', listError)
        process.exit(1)
      }

      const existingUser = users.find(u => u.email === email)
      if (!existingUser) {
        console.error('Could not find existing user')
        process.exit(1)
      }

      // Upsert admin role in user_roles table
      const { error: upsertError } = await supabase
        .from('user_roles')
        .upsert({ user_id: existingUser.id, role: 'admin' }, { onConflict: 'user_id' })

      if (upsertError) {
        console.error('Error updating role:', upsertError)
        process.exit(1)
      }

      console.log('Admin role updated successfully!')
      console.log('Email:', email)
      return
    }
    console.error('Error creating user:', signUpError)
    process.exit(1)
  }

  // Upsert admin role into user_roles table (handles case where trigger already created a row)
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({ user_id: user.user.id, role: 'admin' }, { onConflict: 'user_id' })

  if (roleError) {
    console.error('Error assigning role:', roleError)
    process.exit(1)
  }

  console.log('Admin user created successfully!')
  console.log('Email:', email)
  console.log('Password:', password)
  console.log('User ID:', user.user.id)
  console.log('\nYou can now login at: http://localhost:3000/admin/login')
}

createAdmin()