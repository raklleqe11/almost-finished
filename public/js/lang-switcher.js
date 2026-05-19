/**
 * Fish Shop Ardit — Language Switcher
 * Reads current path, detects language prefix, and builds alternate URLs.
 */
(function() {
  'use strict';

  function detectLang(path) {
    if (path.startsWith('/sq')) return 'sq';
    if (path.startsWith('/it')) return 'it';
    return 'en';
  }

  function stripLangPrefix(path) {
    return path.replace(/^\/(sq|it)(\/|$)/, '/');
  }

  function buildAltUrl(targetLang, currentPath) {
    var clean = stripLangPrefix(currentPath);
    if (targetLang === 'en') return clean || '/';
    return '/' + targetLang + (clean.startsWith('/') ? clean : '/' + clean);
  }

  function updateLangBar() {
    var path = window.location.pathname;
    var current = detectLang(path);
    var langs = ['en', 'sq', 'it'];
    langs.forEach(function(lang) {
      var links = document.querySelectorAll('.lang-bar a[data-lang="' + lang + '"]');
      links.forEach(function(link) {
        link.href = buildAltUrl(lang, path);
        if (lang === current) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    });
  }

  // Auto-detect preferred language on homepage
  function autoRedirect() {
    var path = window.location.pathname;
    if (path !== '/' && path !== '') return;
    var saved = localStorage.getItem('fsardit_lang');
    if (saved && saved !== 'en') {
      window.location.replace('/' + saved + '/');
    }
  }

  // Save language selection
  function saveLang() {
    var path = window.location.pathname;
    var lang = detectLang(path);
    localStorage.setItem('fsardit_lang', lang);
  }

  document.addEventListener('DOMContentLoaded', function() {
    updateLangBar();
    saveLang();
    autoRedirect();
  });
})();
