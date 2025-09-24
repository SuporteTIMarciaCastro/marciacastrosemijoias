import { getApps, initializeApp, applicationDefault, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Suporte a quebra de linha em variáveis de ambiente
if (privateKey && privateKey.startsWith('-----BEGIN')) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

const app = getApps().length
  ? getApp()
  : initializeApp(
      clientEmail && privateKey
        ? {
            credential: cert({
              projectId,
              clientEmail,
              privateKey: privateKey as string,
            }),
          }
        : {
            credential: applicationDefault(),
          }
    );

const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

export { app as adminApp, adminAuth, adminDb };
