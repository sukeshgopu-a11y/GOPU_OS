import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const founderEmail = process.env.FOUNDER_BOOTSTRAP_EMAIL;
const founderPassword = process.env.FOUNDER_BOOTSTRAP_PASSWORD;
const founderName = process.env.FOUNDER_BOOTSTRAP_NAME || 'GOPU Director';
const tenantId = process.env.FOUNDER_BOOTSTRAP_TENANT_ID || '11111111-1111-1111-1111-111111111111';

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!supabaseUrl) fail('Missing SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, or VITE_SUPABASE_URL.');
if (!serviceRoleKey) fail('Missing SUPABASE_SERVICE_ROLE_KEY. Run this only from a secure server/admin shell.');
if (!founderEmail) fail('Missing FOUNDER_BOOTSTRAP_EMAIL.');
if (!founderPassword || founderPassword.length < 12) fail('Missing FOUNDER_BOOTSTRAP_PASSWORD, or password is shorter than 12 characters.');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const { data: listedUsers, error: listError } = await supabase.auth.admin.listUsers();
if (listError) fail(`Could not list Supabase Auth users: ${listError.message}`);

const existingUser = listedUsers.users.find((user) => user.email?.toLowerCase() === founderEmail.toLowerCase());
const userPayload = {
  email: founderEmail,
  password: founderPassword,
  email_confirm: true,
  user_metadata: { full_name: founderName }
};

const { data: authData, error: authError } = existingUser
  ? await supabase.auth.admin.updateUserById(existingUser.id, userPayload)
  : await supabase.auth.admin.createUser(userPayload);

if (authError) fail(`Could not bootstrap founder Auth user: ${authError.message}`);

const user = authData.user;

const { error: tenantError } = await supabase
  .from('tenants')
  .upsert({ id: tenantId, name: 'gopu-exports', slug: 'gopu-exports', status: 'active' }, { onConflict: 'id' });
if (tenantError) fail(`Could not upsert tenant: ${tenantError.message}`);

const { error: userError } = await supabase
  .from('users')
  .upsert({ auth_user_id: user.id, email: founderEmail, full_name: founderName, status: 'active' }, { onConflict: 'auth_user_id' });
if (userError) fail(`Could not upsert app user profile: ${userError.message}`);

const { error: profileError } = await supabase
  .from('profiles')
  .upsert({
    tenant_id: tenantId,
    auth_user_id: user.id,
    email: founderEmail,
    full_name: founderName,
    role: 'director',
    status: 'active'
  }, { onConflict: 'tenant_id,auth_user_id' });
if (profileError) fail(`Could not upsert founder profile: ${profileError.message}`);

console.log(`Founder account ready for ${founderEmail}. Password was not logged.`);
