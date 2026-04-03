/**
 * compile.mjs — Bibliyotèk JSX Pre-compiler
 * Usage: node compile.mjs
 * Entrée : index.html (dans le même dossier)
 * Sortie : index.compiled.html (Babel retiré, JS pur)
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// ── 1. Vérifier que @babel/core est installé ──────────
if (!existsSync('./node_modules/@babel/core')) {
  console.log('📦 Installation de @babel/core et presets...');
  execSync('npm install --save-dev @babel/core @babel/preset-react @babel/preset-env', {
    stdio: 'inherit'
  });
}

const { transformSync } = await import('@babel/core');

// ── 2. Lire index.html ────────────────────────────────
const html = readFileSync('./index.html', 'utf8');

// ── 3. Extraire le contenu du bloc <script type="text/babel"> ──
const babelBlockMatch = html.match(/<script\s+type="text\/babel">([\s\S]*?)<\/script>/);
if (!babelBlockMatch) {
  console.error('❌ Aucun bloc <script type="text/babel"> trouvé dans index.html');
  process.exit(1);
}

const jsxCode = babelBlockMatch[1];
console.log(`✅ Bloc JSX extrait (${(jsxCode.length / 1024).toFixed(1)} KB)`);

// ── 4. Compiler le JSX → JS pur ───────────────────────
console.log('⚙️  Compilation Babel en cours...');
let compiled;
try {
  const result = transformSync(jsxCode, {
    presets: [
      ['@babel/preset-react', { runtime: 'classic' }],
      ['@babel/preset-env', {
        targets: { browsers: ['last 2 years', 'not dead'] },
        modules: false,
        // Ne pas transformer les modules ES — on est dans un browser classique
        exclude: ['transform-modules-commonjs']
      }]
    ],
    compact: true,       // minification basique
    comments: false,     // supprimer les commentaires
  });
  compiled = result.code;
  console.log(`✅ Compilation réussie (${(compiled.length / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error('❌ Erreur de compilation Babel:');
  console.error(err.message);
  process.exit(1);
}

// ── 5. Reconstruire le HTML ───────────────────────────
let output = html;

// Supprimer la ligne <script src="...babel.min.js">
output = output.replace(
  /<script[^>]*cdn\.jsdelivr\.net\/npm\/@babel\/standalone[^>]*><\/script>\n?/,
  ''
);

// Remplacer le bloc babel par le JS compilé dans un script normal
output = output.replace(
  /<script\s+type="text\/babel">[\s\S]*?<\/script>/,
  `<script>${compiled}</script>`
);

// ── 6. Écrire le fichier de sortie ────────────────────
writeFileSync('./index.compiled.html', output, 'utf8');

const originalSize = (html.length / 1024).toFixed(1);
const compiledSize = (output.length / 1024).toFixed(1);
const babelSize = 233; // kb approximatif de babel standalone CDN

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ index.compiled.html généré avec succès');
console.log(`   HTML original   : ${originalSize} KB`);
console.log(`   HTML compilé    : ${compiledSize} KB`);
console.log(`   Babel CDN évité : ~${babelSize} KB (chargement réseau)`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📋 Prochaines étapes:');
console.log('   1. Teste index.compiled.html avec Live Server');
console.log('   2. Si tout fonctionne: renomme-le en index.html');
console.log('   3. git add index.html && git commit -m "perf: remove babel standalone"');
console.log('   4. git push → Netlify redéploie automatiquement\n');
