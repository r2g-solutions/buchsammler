// ═══════════════════════════════════════════════════════
//  BuchSammler · Konfiguration
//  Schritt 1: Trage hier deine Supabase-Daten ein
//  Schritt 2: Trage deinen GitHub-Nutzernamen ein
// ═══════════════════════════════════════════════════════

// GitHub Pages URL  →  https://r2g-solutions.github.io/buchsammler
const GITHUB_USER = 'r2g-solutions';   // ← hier eintragen

// Supabase → supabase.com → Project → Settings → API
const SUPABASE_URL  = 'https://qaqetpymlcyewlcwqmsf.supabase.co';   // ← hier eintragen
const SUPABASE_ANON = 'sb_publishable_V75ICIrFAkPb0njZw7XE9A_n2cO4YYD';        // ← hier eintragen

// Basis-URL für QR-Codes (wird automatisch aus GITHUB_USER gebaut)
const BASE_URL = 'https://' + GITHUB_USER + '.github.io/buchsammler';

// ── Punkte pro Aktion ─────────────────────────────────
const XP = {
  add:     10,   // Buch einstellen
  remove:   5,   // Buch entnehmen & melden
  reserve:  3,   // Reservieren
};

// ── Level-Stufen ──────────────────────────────────────
const LEVELS = [
  { name: 'Leser',        min: 0,   icon: '📖' },
  { name: 'Sammler',      min: 50,  icon: '📚' },
  { name: 'Kurator',      min: 150, icon: '🏛️'  },
  { name: 'Bibliothekar', min: 350, icon: '🦉'  },
  { name: 'Buchmeister',  min: 700, icon: '🏆'  },
];

// ── Auszeichnungen ────────────────────────────────────
const ACHIEVEMENTS = [
  { id: 'first_add',     name: 'Erstes Buch',      desc: 'Erstes Buch eingestellt',          icon: '🌱', xp: 20 },
  { id: 'ten_books',     name: '10 Bücher',         desc: '10 Bücher eingestellt',             icon: '📦', xp: 50 },
  { id: 'first_remove',  name: 'Weitergegeben',     desc: 'Erstes Buch entnommen & gemeldet', icon: '✅', xp: 10 },
  { id: 'multi_station', name: 'Vielreisender',     desc: 'An 2+ Sammelstellen aktiv',        icon: '🗺️', xp: 30 },
  { id: 'reserv_5',      name: '5 Reservierungen',  desc: '5 Reservierungen vorgenommen',     icon: '🔖', xp: 25 },
  { id: 'top3',          name: 'Top 3',             desc: 'In den Top 3 der Rangliste',       icon: '🥇', xp: 60 },
];
