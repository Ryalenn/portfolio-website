// lang.js : i18n par page (scope) + common, compatible GitHub Pages

const DEFAULT_LANG = "fr";
let currentLang = localStorage.getItem("lang") || DEFAULT_LANG;

/**
 * Retourne un préfixe de chemin relatif selon la page courante.
 * - Sur /index.html => "."
 * - Sur /pages/nlp.html => ".."
 */
function getBasePrefix() {
  const path = window.location.pathname;
  // Si l'URL contient "/pages/", on est dans un sous-dossier
  return path.includes("/pages/") ? ".." : ".";
}

function setActiveButtons(lang) {
  const btnFr = document.getElementById("btn-fr");
  const btnEn = document.getElementById("btn-en");
  if (!btnFr || !btnEn) return;

  btnFr.classList.toggle("active", lang === "fr");
  btnEn.classList.toggle("active", lang === "en");
}

/**
 * Récupère une valeur dans un objet via une clé "a.b.c"
 */
function getNestedValue(obj, dottedKey) {
  return dottedKey.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

/**
 * Fusion profonde (common + page). Les valeurs de page écrasent common.
 */
function deepMerge(a, b) {
  const out = { ...(a || {}) };
  for (const k in (b || {})) {
    const av = out[k];
    const bv = b[k];
    const bothObjects =
      typeof av === "object" && av !== null && !Array.isArray(av) &&
      typeof bv === "object" && bv !== null && !Array.isArray(bv);

    out[k] = bothObjects ? deepMerge(av, bv) : bv;
  }
  return out;
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Impossible de charger ${path} (HTTP ${res.status})`);
  return res.json();
}

function applyTranslations(dict) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;

    // Support des deux styles :
    // - dict["site.title"] (ancienne méthode)
    // - dict.site.title (nouvelle méthode avec JSON imbriqué)
    const direct = dict[key];
    const nested = direct === undefined ? getNestedValue(dict, key) : direct;

    if (nested !== undefined && nested !== null) {
      el.textContent = nested;
    }
  });
}

/**
 * Charge common + scope(page), fusionne, applique.
 * Scope se définit sur <body data-i18n-scope="pages/nlp">
 */
async function loadLanguage(lang) {
  try {
    const scope = document.body?.dataset?.i18nScope;
    if (!scope) {
      console.warn("⚠️ data-i18n-scope manquant sur <body>. Exemple: <body data-i18n-scope='pages/index'>");
      return;
    }

    const base = getBasePrefix();

    // Exemple :
    // common:   ./i18n/common/fr.json  ou ../i18n/common/fr.json
    // page:     ./i18n/pages/nlp/fr.json  ou ../i18n/pages/nlp/fr.json
    const commonPath = `${base}/i18n/common/${lang}.json`;
    const pagePath = `${base}/i18n/${scope}/${lang}.json`;

    const [commonDict, pageDict] = await Promise.all([
      loadJSON(commonPath),
      loadJSON(pagePath),
    ]);

    const merged = deepMerge(commonDict, pageDict);

    applyTranslations(merged);

    currentLang = lang;
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
    setActiveButtons(lang);
  } catch (err) {
    console.error("Erreur de chargement de la langue :", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // boutons de langue
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      if (lang && lang !== currentLang) {
        loadLanguage(lang);
      }
    });
  });

  // charge la langue initiale
  loadLanguage(currentLang);
});
