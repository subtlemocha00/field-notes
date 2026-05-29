import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore'
import { db } from './firebase.js'
import {
  auditCreateFields,
  auditUpdateFields,
  softDeleteFields,
  isNotDeleted
} from './audit.js'

// Re-exported for backward compatibility — existing modules and pages
// import TEMP_COMPANY_ID from here. The canonical definition now lives in
// audit.js so all foundation constants sit together.
export { TEMP_COMPANY_ID } from './audit.js'

const jobsCollection = collection(db, 'jobs')

function mapJob(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    companyId: data.companyId,
    jobNumber: data.jobNumber,
    jobName: data.jobName,
    location: data.location || '',
    description: data.description || '',
    createdBy: data.createdBy,
    createdByName: data.createdByName || '',
    updatedBy: data.updatedBy || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    schemaVersion: data.schemaVersion ?? 0,
    deleted: data.deleted === true
  }
}

export async function listJobs(companyId) {
  const q = query(
    jobsCollection,
    where('companyId', '==', companyId),
    orderBy('createdAt', 'desc')
  )
  const result = await getDocs(q)
  // Hide soft-deleted jobs. Filtered in code so legacy jobs without the
  // `deleted` field still appear and no new composite index is required.
  return result.docs.filter((d) => isNotDeleted(d.data())).map(mapJob)
}

export async function getJob(jobId) {
  const ref = doc(db, 'jobs', jobId)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) {
    return null
  }
  // A soft-deleted job reads as "not found" for normal callers.
  if (!isNotDeleted(snapshot.data())) {
    return null
  }
  return mapJob(snapshot)
}

export async function createJob({ jobNumber, jobName, location, description }, user) {
  const trimmedNumber = (jobNumber || '').trim()
  const trimmedName = (jobName || '').trim()
  if (!trimmedNumber || !trimmedName) {
    throw new Error('Job number and job name are required.')
  }
  const docRef = await addDoc(jobsCollection, {
    jobNumber: trimmedNumber,
    jobName: trimmedName,
    location: (location || '').trim(),
    description: (description || '').trim(),
    ...auditCreateFields(user)
  })
  return docRef.id
}

export async function updateJob(jobId, { jobNumber, jobName, location, description }, user) {
  const trimmedNumber = (jobNumber || '').trim()
  const trimmedName = (jobName || '').trim()
  if (!trimmedNumber || !trimmedName) {
    throw new Error('Job number and job name are required.')
  }
  const ref = doc(db, 'jobs', jobId)
  await updateDoc(ref, {
    jobNumber: trimmedNumber,
    jobName: trimmedName,
    location: (location || '').trim(),
    description: (description || '').trim(),
    ...auditUpdateFields(user)
  })
}

// Soft delete: the job is hidden from listings/detail but the document
// (and all its daily entries, notes, survey data, documents) remain in
// Firestore and are recoverable. We intentionally do NOT cascade — child
// records are still queried by their own FKs, but their parent job no
// longer resolves, so the UI won't surface them.
export async function deleteJob(jobId, user) {
  const ref = doc(db, 'jobs', jobId)
  await updateDoc(ref, softDeleteFields(user))
}
