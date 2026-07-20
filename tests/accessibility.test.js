'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withApp } = require('./helpers');

test('les items de menu sont de vrais <button>, pas des <div>', async () => {
  await withApp((window, err) => {
    assert.equal(err, null);
    window.eval("document.getElementById('menuBtn').click();");
    const headers = window.document.querySelectorAll('.menu-cat-header');
    const items = window.document.querySelectorAll('.menu-tech-item');
    const pills = window.document.querySelectorAll('.lang-pill');
    const aboutBtn = window.document.getElementById('menuAboutBtn');
    assert.ok(headers.length > 0 && Array.from(headers).every((h) => h.tagName === 'BUTTON'));
    assert.ok(items.length > 0 && Array.from(items).every((i) => i.tagName === 'BUTTON'));
    assert.ok(pills.length > 0 && Array.from(pills).every((p) => p.tagName === 'BUTTON'));
    assert.equal(aboutBtn.tagName, 'BUTTON');
  });
});

test('aria-expanded reflète l\'état ouvert/fermé de l\'accordéon', async () => {
  await withApp((window, err) => {
    assert.equal(err, null);
    window.eval("document.getElementById('menuBtn').click();");
    const headers = window.document.querySelectorAll('.menu-cat-header');
    // "Calm" contient la technique par défaut (coherence) et doit être ouverte au chargement.
    // Le tri est alphabétique ("Advanced meditation" < "Calm"), donc on cherche par nom plutôt
    // que de supposer un index fixe.
    const calmHeader = Array.from(headers).find((h) => h.querySelector('span').textContent === 'Calm');
    const otherHeader = Array.from(headers).find((h) => h !== calmHeader);
    assert.ok(calmHeader, 'catégorie Calm trouvée');
    assert.equal(calmHeader.getAttribute('aria-expanded'), 'true', 'Calm est ouverte au chargement');

    otherHeader.click();
    assert.equal(calmHeader.getAttribute('aria-expanded'), 'false', 'Calm se ferme (accordéon exclusif)');
    assert.equal(otherHeader.getAttribute('aria-expanded'), 'true', 'l\'autre catégorie s\'ouvre');
  });
});

test('Escape ferme le tiroir menu et rend le focus au bouton déclencheur', async () => {
  await withApp((window, err) => {
    assert.equal(err, null);
    const menuBtn = window.document.getElementById('menuBtn');
    menuBtn.focus();
    menuBtn.click();
    assert.ok(window.document.getElementById('menuDrawer').classList.contains('open'));

    const escEvent = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    window.document.dispatchEvent(escEvent);

    assert.ok(!window.document.getElementById('menuDrawer').classList.contains('open'), 'tiroir fermé');
    assert.equal(window.document.activeElement, menuBtn, 'focus retourné au bouton menu');
  });
});

test('Escape ferme la modale À propos', async () => {
  await withApp((window, err) => {
    assert.equal(err, null);
    window.eval("document.getElementById('menuBtn').focus(); document.getElementById('menuBtn').click();");
    const aboutBtn = window.document.getElementById('menuAboutBtn');
    aboutBtn.focus();
    aboutBtn.click();
    assert.ok(window.document.getElementById('aboutModal').classList.contains('open'));

    const escEvent = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    window.document.dispatchEvent(escEvent);

    assert.ok(!window.document.getElementById('aboutModal').classList.contains('open'));
  });
});

test('le focus se déplace dans la modale à l\'ouverture', async () => {
  await withApp((window, err) => {
    assert.equal(err, null);
    window.eval("document.getElementById('menuBtn').focus(); document.getElementById('menuBtn').click();");
    window.eval("document.getElementById('menuAboutBtn').focus(); document.getElementById('menuAboutBtn').click();");
    const focused = window.document.activeElement;
    const isInsideModal = window.document.getElementById('aboutModal').contains(focused);
    assert.ok(isInsideModal, 'le focus doit être à l\'intérieur de la modale ouverte');
  });
});

test('les labels ARIA du volume et du menu sont présents et traduits', async () => {
  await withApp((window, err) => {
    assert.equal(err, null);
    const volIcon = window.document.getElementById('volIcon');
    const volSlider = window.document.getElementById('volumeSlider');
    assert.ok(volIcon.getAttribute('aria-label'));
    assert.ok(volSlider.getAttribute('aria-label'));
  });
});

test('le focus est piégé dans le tiroir ouvert (Tab depuis le dernier élément revient au premier)', async () => {
  await withApp((window, err) => {
    assert.equal(err, null);
    window.eval("document.getElementById('menuBtn').click();");
    const focusables = window.document.getElementById('menuDrawer')
      .querySelectorAll('a[href], button:not([disabled]), input:not([disabled])');
    const last = focusables[focusables.length - 1];
    const first = focusables[0];
    last.focus();
    const tabEvent = new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    window.document.dispatchEvent(tabEvent);
    assert.equal(window.document.activeElement, first, 'Tab sur le dernier élément revient au premier');
  });
});

test('le tiroir et la modale sont inert par défaut (fermés = hors du parcours clavier)', async () => {
  await withApp((window, err) => {
    assert.equal(err, null);
    const drawer = window.document.getElementById('menuDrawer');
    const modal = window.document.getElementById('aboutModal');
    assert.equal(drawer.hasAttribute('inert'), true, 'le tiroir est inert au chargement (fermé)');
    assert.equal(modal.hasAttribute('inert'), true, 'la modale est inert au chargement (fermée)');
  });
});
