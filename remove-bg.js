// Script V2: Correcções cirúrgicas para pôntico e enxerto
const sharp = require('sharp');
const path = require('path');

const DIR = path.join(__dirname, 'public', 'images', 'dental-elements');

// ═══ PÔNTICO: remover segmentos isolados (linhas tracejadas) ═══
async function fixPontico() {
    const fp = path.join(DIR, 'pontico.png');
    console.log('\n═══ PÔNTICO ═══');

    const { data, info } = await sharp(fp).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;

    // Encontrar o bounding box do corpo principal do dente
    // Para cada linha, encontrar clusters de pixels opacos
    // O corpo principal é o cluster mais largo; linhas tracejadas são clusters finos separados

    const out = Buffer.from(data);
    let removed = 0;

    for (let y = 0; y < height; y++) {
        // Encontrar todos os segmentos opacos nesta linha
        const segments = [];
        let segStart = -1;

        for (let x = 0; x < width; x++) {
            const a = data[((y * width + x) * channels) + 3];
            if (a > 10) {
                if (segStart === -1) segStart = x;
            } else {
                if (segStart !== -1) {
                    segments.push({ start: segStart, end: x - 1, width: x - segStart });
                    segStart = -1;
                }
            }
        }
        if (segStart !== -1) {
            segments.push({ start: segStart, end: width - 1, width: width - segStart });
        }

        if (segments.length <= 1) continue; // Apenas 1 segmento = sem linhas isoladas

        // Encontrar o segmento mais largo (corpo do dente)
        const mainSeg = segments.reduce((a, b) => a.width > b.width ? a : b);

        // Remover todos os outros segmentos (linhas tracejadas)
        for (const seg of segments) {
            if (seg === mainSeg) continue;
            // Só remover se for significativamente mais fino que o principal
            if (seg.width < mainSeg.width * 0.3) {
                for (let x = seg.start; x <= seg.end; x++) {
                    const idx = (y * width + x) * channels;
                    out[idx + 3] = 0;
                    removed++;
                }
            }
        }
    }

    console.log(`  Pixels de linhas isoladas removidos: ${removed}`);
    await sharp(out, { raw: { width, height, channels } }).png().toFile(fp);
    console.log('  ✅ Done!');
}

// ═══ ENXERTO: remover brancos/cinzas claros mais agressivamente ═══
async function fixEnxerto() {
    const fp = path.join(DIR, 'enxerto.png');
    console.log('\n═══ ENXERTO ═══');

    const { data, info } = await sharp(fp).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;

    const out = Buffer.from(data);
    let removed = 0;

    for (let i = 0; i < data.length; i += channels) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 10) continue;

        const avg = (r + g + b) / 3;
        const maxDev = Math.max(Math.abs(r - avg), Math.abs(g - avg), Math.abs(b - avg));

        // Threshold mais baixo: avg > 150 em vez de 170
        // E também incluir pixels ligeiramente coloridos (maxDev < 25)
        if (maxDev < 25 && avg > 150) {
            const transparency = Math.min(1, (avg - 130) / 60);
            out[i + 3] = Math.round(a * (1 - transparency));
            removed++;
        }
    }

    console.log(`  Pixels brancos removidos: ${removed}/${width * height}`);
    await sharp(out, { raw: { width, height, channels } }).png().toFile(fp);
    console.log('  ✅ Done!');
}

async function main() {
    await fixPontico();
    await fixEnxerto();
    console.log('\n✅ Concluído!');
}

main().catch(console.error);
