/**
 * Script one-time para migrar logos base64 na BD para Supabase Storage
 * Executar: node scripts/migrate-logos-to-storage.js
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kfnrstxrhaetgrujyjyk.supabase.co';
// Precisa da service_role key para bypass RLS
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Defina SUPABASE_SERVICE_ROLE_KEY como variável de ambiente');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateClinicLogos() {
    console.log('🔍 A procurar logos base64 na BD...');

    const { data: clinics, error } = await supabase
        .from('clinics')
        .select('id, commercial_name, logo_url')
        .like('logo_url', 'data:image%');

    if (error) {
        console.error('❌ Erro ao buscar clínicas:', error);
        return;
    }

    console.log(`📋 Encontradas ${clinics.length} clínicas com logo base64`);

    for (const clinic of clinics) {
        try {
            console.log(`\n🏥 A migrar: ${clinic.commercial_name} (${clinic.id})`);

            // Extrair mime type e dados base64
            const match = clinic.logo_url.match(/^data:(image\/\w+);base64,(.+)$/);
            if (!match) {
                console.log('  ⚠️ Formato base64 inválido, a saltar...');
                continue;
            }

            const mimeType = match[1];
            const base64Data = match[2];
            const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
            const filePath = `logos/${clinic.id}.${ext}`;

            // Converter base64 para Buffer
            const buffer = Buffer.from(base64Data, 'base64');
            console.log(`  📦 Tamanho: ${(buffer.length / 1024).toFixed(1)} KB`);

            // Upload para Storage
            const { error: uploadError } = await supabase.storage
                .from('clinic-logos')
                .upload(filePath, buffer, {
                    upsert: true,
                    contentType: mimeType
                });

            if (uploadError) {
                console.error(`  ❌ Erro upload:`, uploadError);
                continue;
            }

            // Obter URL pública
            const { data: urlData } = supabase.storage
                .from('clinic-logos')
                .getPublicUrl(filePath);

            const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

            // Actualizar BD com URL em vez de base64
            const { error: updateError } = await supabase
                .from('clinics')
                .update({ logo_url: publicUrl })
                .eq('id', clinic.id);

            if (updateError) {
                console.error(`  ❌ Erro update BD:`, updateError);
                continue;
            }

            console.log(`  ✅ Migrada com sucesso → ${publicUrl}`);

        } catch (err) {
            console.error(`  ❌ Erro inesperado:`, err);
        }
    }

    console.log('\n✅ Migração concluída!');
}

async function migrateUserAvatars() {
    console.log('\n🔍 A procurar avatares base64 na BD...');

    const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url')
        .like('avatar_url', 'data:image%');

    if (error) {
        console.error('❌ Erro ao buscar perfis:', error);
        return;
    }

    console.log(`📋 Encontrados ${profiles.length} perfis com avatar base64`);

    for (const profile of profiles) {
        try {
            console.log(`\n👤 A migrar: ${profile.full_name} (${profile.user_id})`);

            const match = profile.avatar_url.match(/^data:(image\/\w+);base64,(.+)$/);
            if (!match) {
                console.log('  ⚠️ Formato base64 inválido, a saltar...');
                continue;
            }

            const mimeType = match[1];
            const base64Data = match[2];
            const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
            const filePath = `avatars/${profile.user_id}.${ext}`;

            const buffer = Buffer.from(base64Data, 'base64');
            console.log(`  📦 Tamanho: ${(buffer.length / 1024).toFixed(1)} KB`);

            const { error: uploadError } = await supabase.storage
                .from('user-avatars')
                .upload(filePath, buffer, {
                    upsert: true,
                    contentType: mimeType
                });

            if (uploadError) {
                console.error(`  ❌ Erro upload:`, uploadError);
                continue;
            }

            const { data: urlData } = supabase.storage
                .from('user-avatars')
                .getPublicUrl(filePath);

            const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ avatar_url: publicUrl })
                .eq('user_id', profile.user_id);

            if (updateError) {
                console.error(`  ❌ Erro update BD:`, updateError);
                continue;
            }

            console.log(`  ✅ Migrado com sucesso → ${publicUrl}`);

        } catch (err) {
            console.error(`  ❌ Erro inesperado:`, err);
        }
    }

    console.log('\n✅ Migração de avatares concluída!');
}

async function main() {
    console.log('====================================');
    console.log('📸 Migração Base64 → Supabase Storage');
    console.log('====================================\n');

    await migrateClinicLogos();
    await migrateUserAvatars();

    console.log('\n====================================');
    console.log('🎉 Todas as migrações concluídas!');
    console.log('====================================');
}

main();
