const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  'https://qwjzzlacxafeednmsfhv.supabase.co',
  'sb_publishable_1hDOqjRFA9AEIcipgf4jVw_jsm3uIUA'
);

async function diagnostic() {
  console.log('=== DIAGNOSTIC SUPABASE ===\n');

  // 1. Vérifier si les tables existent
  const tables = ['preferences_utilisateur', 'taches', 'prereglages', 'seances_pomodoro', 'sessions_notes'];
  for (const t of tables) {
    const { data, error } = await client.from(t).select('*').limit(0);
    if (error) {
      console.log(`❌ Table "${t}": ${error.message} (code: ${error.code})`);
    } else {
      console.log(`✅ Table "${t}": accessible`);
    }
  }

  // 2. Vérifier la session auth
  console.log('\n--- Session auth ---');
  const { data: sessionData } = await client.auth.getSession();
  if (sessionData?.session) {
    console.log(`✅ Utilisateur connecté: ${sessionData.session.user.id}`);
    console.log(`   Email: ${sessionData.session.user.email}`);
    
    const userId = sessionData.session.user.id;

    // 3. Tester un SELECT sur preferences_utilisateur
    console.log('\n--- Test SELECT preferences_utilisateur ---');
    const { data: profil, error: errProfil } = await client
      .from('preferences_utilisateur')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (errProfil) {
      console.log(`❌ SELECT échoué: ${errProfil.message} (code: ${errProfil.code})`);
      console.log(`   Details: ${errProfil.details}`);
      console.log(`   Hint: ${errProfil.hint}`);
    } else {
      console.log(`✅ SELECT OK — profil:`, profil ? 'existe' : 'null (pas encore créé)');
    }

    // 4. Tester un UPSERT sur preferences_utilisateur
    console.log('\n--- Test UPSERT preferences_utilisateur ---');
    const { data: upsertResult, error: errUpsert } = await client
      .from('preferences_utilisateur')
      .upsert({
        id: userId,
        photo_profil: { dataUrl: null, position: { x: 50, y: 50 } },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select();
    
    if (errUpsert) {
      console.log(`❌ UPSERT échoué: ${errUpsert.message} (code: ${errUpsert.code})`);
      console.log(`   Details: ${errUpsert.details}`);
      console.log(`   Hint: ${errUpsert.hint}`);
    } else {
      console.log(`✅ UPSERT OK`, upsertResult);
    }

    // 5. Tester un SELECT sur taches
    console.log('\n--- Test SELECT taches ---');
    const { data: tachesData, error: errTaches } = await client
      .from('taches')
      .select('*')
      .eq('user_id', userId);
    
    if (errTaches) {
      console.log(`❌ SELECT taches échoué: ${errTaches.message}`);
    } else {
      console.log(`✅ SELECT taches OK — ${tachesData.length} tâches trouvées`);
    }

  } else {
    console.log('⚠️  Aucune session active (le script Node.js n\'a pas de session navigateur)');
    console.log('   C\'est normal — les tests avec RLS nécessitent un token valide.');
    console.log('   Vérifions si les tables acceptent des requêtes anonymes (elles ne devraient pas)...\n');
    
    // Test sans auth — devrait retourner vide (pas d'erreur) grâce à RLS
    for (const t of tables) {
      const { data, error } = await client.from(t).select('*').limit(1);
      if (error) {
        console.log(`   Table "${t}": ${error.message}`);
      } else {
        console.log(`   Table "${t}": ${data.length} lignes visibles (devrait être 0 avec RLS)`);
      }
    }
  }
}

diagnostic().catch(console.error);
