const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local file not found at:', envPath)
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
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Staff members to create
const staffList = [
  { name: 'Emily Johnson', email: 'emily@aticanbeach.com', role: 'front_desk', shift: 'morning' },
  { name: 'Michael Okonkwo', email: 'michael@aticanbeach.com', role: 'front_desk', shift: 'afternoon' },
  // Add more staff as needed
]

async function createStaff() {
  console.log('Creating staff accounts...\n')

  for (const staff of staffList) {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('user_roles')
        .select('id')
        .eq('staff_email', staff.email)
        .single()

      if (existingUser) {
        console.log(`⚠️  Staff already exists: ${staff.email}`)
        continue
      }

      // Create auth user
      const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
        email: staff.email,
        password: 'Staff123!', // They'll reset on first login
        email_confirm: true,
      })

      if (authError) {
        console.error(`❌ Failed to create auth user for ${staff.email}:`, authError.message)
        continue
      }

      // Add to user_roles with staff info
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: staff.role,
          staff_name: staff.name,
          staff_email: staff.email,
          shift: staff.shift,
          is_active: true,
          hire_date: new Date().toISOString().split('T')[0],
        })

      if (roleError) {
        console.error(`❌ Failed to add role for ${staff.email}:`, roleError.message)
        continue
      }

      // Also create/update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: staff.name,
          role: staff.role,
        })

      if (profileError) {
        console.error(`⚠️  Failed to create profile for ${staff.email}:`, profileError.message)
      }

      console.log(`✅ Staff created: ${staff.email}`)
      console.log(`   Name: ${staff.name}`)
      console.log(`   Role: ${staff.role}`)
      console.log(`   Shift: ${staff.shift}`)
      console.log(`   Temp Password: Staff123!`)
      console.log('')
    } catch (err) {
      console.error(`❌ Error creating staff ${staff.email}:`, err.message)
    }
  }

  console.log('\nStaff creation completed!')
  console.log('\nNOTE: Staff members should change their password on first login.')
}

createStaff()