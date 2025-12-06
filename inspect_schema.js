
const { createClient } = require('@supabase/supabase-js');

const fs = require('fs');
const path = require('path');

try {
    const envConfig = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.error('Error loading .env file', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
    const { data, error } = await supabase
        .from('endorser_invite_sessions')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
    } else {
        console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No data found');
    }
}

inspect();
