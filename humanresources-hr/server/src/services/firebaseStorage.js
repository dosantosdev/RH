import admin from 'firebase-admin'

let initialized = false

function getFirebaseApp() {
  if (initialized) return admin.app()

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_STORAGE_BUCKET
  } = process.env

  if (
    !FIREBASE_PROJECT_ID ||
    !FIREBASE_CLIENT_EMAIL ||
    !FIREBASE_PRIVATE_KEY ||
    !FIREBASE_STORAGE_BUCKET
  ) {
    throw new Error(
      'Firebase Storage não configurado. Preencha as variáveis FIREBASE_* no server/.env.'
    )
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    storageBucket: FIREBASE_STORAGE_BUCKET
  })

  initialized = true
  return admin.app()
}

export async function uploadFile(buffer, contentType, storagePath) {
  const app = getFirebaseApp()
  const bucket = app.storage().bucket()
  const file = bucket.file(storagePath)

  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType,
      metadata: {
        uploadedBySystem: 'humanresources-hr'
      }
    }
  })

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000
  })

  return { storagePath, url }
}

export async function getFileUrl(storagePath) {
  const app = getFirebaseApp()
  const file = app.storage().bucket().file(storagePath)

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000
  })

  return url
}

export async function deleteFile(storagePath) {
  const app = getFirebaseApp()
  await app.storage().bucket().file(storagePath).delete({ ignoreNotFound: true })
}
