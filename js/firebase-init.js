// firebase-init.js — NEUTRALIZADO en el sandbox idea-demo.
//
// La demo NO usa Firebase: la persistencia es 100% local (IndexedDB vía db.js) y la
// autenticación es local (auth.js). Este archivo se conserva solo por si algún módulo
// lo importara; exporta stubs inertes y NO descarga el SDK de Firebase. Así se garantiza
// que la demo no pueda, bajo ninguna circunstancia, hablar con Firestore de producción.

export const firebaseApp = null;
export const auth = null;
export const fdb = null;
export const FB_SDK = 'none (sandbox local)';
