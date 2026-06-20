const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^['\"]|['\"]$/g, '');
      process.env[key.trim()] = value;
    }
  });
}

loadEnv();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function resetBucket() {
  console.log('Resetting atican-media bucket...\n');
  
  console.log('Step 1: Listing all files...');
  const allFiles = [];
  const folders = ['', 'rooms', 'tents', 'experiences'];
  
  for (const folder of folders) {
    const { data } = await supabase.storage.from('atican-media').list(folder, { limit: 1000 });
    if (data) {
      data.forEach(file => {
        const filePath = folder ? folder + '/' + file.name : file.name;
        allFiles.push(filePath);
        console.log('  Found: ' + filePath);
      });
    }
  }
  
  console.log('\nStep 2: Deleting ' + allFiles.length + ' files...');
  if (allFiles.length > 0) {
    const { error: deleteFilesError } = await supabase.storage.from('atican-media').remove(allFiles);
    if (deleteFilesError) {
      console.error('  Error deleting files:', deleteFilesError.message);
    } else {
      console.log('  All files deleted!');
    }
  }
  
  console.log('\nStep 3: Deleting bucket...');
  const { error: deleteError } = await supabase.storage.deleteBucket('atican-media');
  if (deleteError) {
    console.error('  Error:', deleteError.message);
    process.exit(1);
  } else {
    console.log('  Bucket deleted!');
  }
  
  console.log('\nStep 4: Creating new public bucket...');
  const { error: createError } = await supabase.storage.createBucket('atican-media', {
    public: true
  });
  
  if (createError) {
    console.error('  Error:', createError.message);
    process.exit(1);
  } else {
    console.log('  Bucket created!');
  }
  
  console.log('\nStep 5: Verifying...');
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucket = buckets?.find(b => b.name === 'atican-media');
  if (bucket) {
    console.log('  Bucket: atican-media');
    console.log('  Public:', bucket.public ? 'YES' : 'NO');
    console.log('\nDone! Bucket is now empty, public, and ready for uploads.');
  } else {
    console.error('  Bucket not found!');
    process.exit(1);
  }
}

resetBucket();