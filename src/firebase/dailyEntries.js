import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore'
import { db } from './firebase.js'
import {
  auditCreateFields,
  auditUpdateFields,
  softDeleteFields,
  isNotDeleted
} from './audit.js'

const dailyEntriesCollection = collection(db, 'dailyEntries')

export class DuplicateDailyEntryError extends Error {
  constructor(date) {
    super(`A daily entry for ${date} already exists.`)
    this.name = 'DuplicateDailyEntryError'
    this.date = date
  }
}

export const WORKER_TYPES = ['superintendent', 'foreman', 'labourer', 'operator']
export const WORKER_TYPE_LABELS = {
  superintendent: 'Superintendent',
  foreman: 'Foreman',
  labourer: 'Labourer',
  operator: 'Operator'
}

export const EQUIPMENT_TYPES = [
  'excavator',
  'bulldozer',
  'loader',
  'skid steer',
  'dump truck',
  'grader',
  'roller',
  'pickup',
  'manual'
]
export const EQUIPMENT_TYPE_LABELS = {
  excavator: 'Excavator',
  bulldozer: 'Bulldozer',
  loader: 'Loader',
  'skid steer': 'Skid steer',
  'dump truck': 'Dump truck',
  grader: 'Grader',
  roller: 'Roller',
  pickup: 'Pickup',
  manual: 'Custom (manual)'
}

// ---------- Backward-compat normalization (read path) ----------

function normalizeWeather(value) {
  if (!value) return { conditions: '', temperature: '' }
  if (typeof value === 'string') {
    return { conditions: value, temperature: '' }
  }
  return {
    conditions: typeof value.conditions === 'string' ? value.conditions : '',
    temperature: typeof value.temperature === 'string' ? value.temperature : ''
  }
}

function normalizeWorkers(value) {
  if (Array.isArray(value)) {
    return value
      .filter((row) => row && typeof row === 'object')
      .map((row) => ({
        type: typeof row.type === 'string' && row.type ? row.type : 'labourer',
        count: Number.isFinite(Number(row.count)) ? Number(row.count) : 0
      }))
  }
  if (typeof value === 'string' && value.trim()) {
    return [{ type: 'manual', count: 1 }]
  }
  return []
}

function normalizeEquipment(value) {
  if (Array.isArray(value)) {
    return value
      .filter((row) => row && typeof row === 'object')
      .map((row) => ({
        type: typeof row.type === 'string' && row.type ? row.type : 'manual',
        quantity: Number.isFinite(Number(row.quantity)) ? Number(row.quantity) : 1,
        details: typeof row.details === 'string' ? row.details : ''
      }))
  }
  if (typeof value === 'string' && value.trim()) {
    return [{ type: 'manual', quantity: 1, details: value }]
  }
  return []
}

function mapEntry(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    companyId: data.companyId,
    jobId: data.jobId,
    date: data.date,
    contractor: typeof data.contractor === 'string' ? data.contractor : '',
    weatherAM: normalizeWeather(data.weatherAM),
    weatherPM: normalizeWeather(data.weatherPM),
    workers: normalizeWorkers(data.workers),
    equipment: normalizeEquipment(data.equipment),
    notes: typeof data.notes === 'string' ? data.notes : '',
    createdBy: data.createdBy || null,
    createdByName: data.createdByName || '',
    updatedBy: data.updatedBy || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    schemaVersion: data.schemaVersion ?? 0,
    deleted: data.deleted === true
  }
}

// ---------- Sanitization (write path) ----------

function sanitizeWeather(value) {
  return {
    conditions: ((value && value.conditions) || '').trim(),
    temperature: ((value && value.temperature) || '').trim()
  }
}

function sanitizeWorkers(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((row) => row && row.type)
    .map((row) => ({
      type: String(row.type),
      count: Math.max(0, Number(row.count) || 0)
    }))
}

function sanitizeEquipment(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((row) => row && row.type)
    .map((row) => ({
      type: String(row.type),
      quantity: Math.max(0, Number(row.quantity) || 1),
      details: (row.details || '').trim()
    }))
}

// ---------- Queries ----------

export async function listDailyEntries(jobId) {
  const q = query(
    dailyEntriesCollection,
    where('jobId', '==', jobId),
    orderBy('date', 'desc')
  )
  const result = await getDocs(q)
  // Hide soft-deleted entries (legacy entries without the field stay visible).
  return result.docs.filter((d) => isNotDeleted(d.data())).map(mapEntry)
}

export async function getDailyEntry(dailyEntryId) {
  const ref = doc(db, 'dailyEntries', dailyEntryId)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null
  if (!isNotDeleted(snapshot.data())) return null
  return mapEntry(snapshot)
}

// Used by the duplicate-date guard. Skips soft-deleted entries so a date
// can be reused after its previous entry was deleted.
async function findEntryByDate(jobId, date) {
  const q = query(
    dailyEntriesCollection,
    where('jobId', '==', jobId),
    where('date', '==', date)
  )
  const result = await getDocs(q)
  return result.docs.find((d) => isNotDeleted(d.data())) || null
}

// Find the closest earlier daily entry (chronologically) for the same job.
// Date strings are ISO `YYYY-MM-DD`, so lexical ordering matches date ordering.
export async function getPreviousDailyEntry(jobId, currentDate) {
  if (!jobId || !currentDate) return null
  // Pull a small window rather than limit(1): the immediately-prior entry
  // might be soft-deleted, in which case we want the next one back.
  const q = query(
    dailyEntriesCollection,
    where('jobId', '==', jobId),
    where('date', '<', currentDate),
    orderBy('date', 'desc'),
    limit(5)
  )
  const result = await getDocs(q)
  const snapshot = result.docs.find((d) => isNotDeleted(d.data()))
  return snapshot ? mapEntry(snapshot) : null
}

// ---------- Mutations ----------

export async function createDailyEntry(jobId, fields, user) {
  if (!jobId) {
    throw new Error('A job is required to create a daily entry.')
  }
  const date = (fields.date || '').trim()
  if (!date) {
    throw new Error('Date is required.')
  }

  const existing = await findEntryByDate(jobId, date)
  if (existing) {
    throw new DuplicateDailyEntryError(date)
  }

  const docRef = await addDoc(dailyEntriesCollection, {
    jobId,
    date,
    contractor: (fields.contractor || '').trim(),
    weatherAM: sanitizeWeather(fields.weatherAM),
    weatherPM: sanitizeWeather(fields.weatherPM),
    workers: sanitizeWorkers(fields.workers),
    equipment: sanitizeEquipment(fields.equipment),
    notes: (fields.notes || '').trim(),
    ...auditCreateFields(user)
  })
  return docRef.id
}

export async function updateDailyEntry(dailyEntryId, jobId, fields, user) {
  const date = (fields.date || '').trim()
  if (!date) {
    throw new Error('Date is required.')
  }

  const existing = await findEntryByDate(jobId, date)
  if (existing && existing.id !== dailyEntryId) {
    throw new DuplicateDailyEntryError(date)
  }

  const ref = doc(db, 'dailyEntries', dailyEntryId)
  await updateDoc(ref, {
    date,
    contractor: (fields.contractor || '').trim(),
    weatherAM: sanitizeWeather(fields.weatherAM),
    weatherPM: sanitizeWeather(fields.weatherPM),
    workers: sanitizeWorkers(fields.workers),
    equipment: sanitizeEquipment(fields.equipment),
    notes: (fields.notes || '').trim(),
    ...auditUpdateFields(user)
  })
}

// Soft delete — hidden from listings but recoverable. Field notes and
// survey data attached to this entry remain in Firestore.
export async function deleteDailyEntry(dailyEntryId, user) {
  const ref = doc(db, 'dailyEntries', dailyEntryId)
  await updateDoc(ref, softDeleteFields(user))
}
