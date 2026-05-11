import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase.js'
import { TEMP_COMPANY_ID } from './jobs.js'

const surveySetupsCollection = collection(db, 'surveySetups')
const surveyShotsCollection = collection(db, 'surveyShots')

export const SHOT_TYPES = ['BS', 'FS', 'TP']

function toNumberOrNull(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function mapSetup(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    companyId: data.companyId,
    jobId: data.jobId,
    dailyEntryId: data.dailyEntryId,
    setupName: typeof data.setupName === 'string' ? data.setupName : '',
    initialBenchmarkElevation: toNumberOrNull(data.initialBenchmarkElevation),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  }
}

function mapShot(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    companyId: data.companyId,
    jobId: data.jobId,
    dailyEntryId: data.dailyEntryId,
    surveySetupId: data.surveySetupId,
    type: SHOT_TYPES.includes(data.type) ? data.type : 'FS',
    rodReading: toNumberOrNull(data.rodReading),
    description: typeof data.description === 'string' ? data.description : '',
    orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  }
}

// ---------- Setups ----------

export async function listSurveySetups(dailyEntryId) {
  const q = query(
    surveySetupsCollection,
    where('dailyEntryId', '==', dailyEntryId),
    orderBy('createdAt', 'asc')
  )
  const result = await getDocs(q)
  return result.docs.map(mapSetup)
}

export async function createSurveySetup({
  jobId,
  dailyEntryId,
  setupName,
  initialBenchmarkElevation
}) {
  const now = serverTimestamp()
  const docRef = await addDoc(surveySetupsCollection, {
    companyId: TEMP_COMPANY_ID,
    jobId,
    dailyEntryId,
    setupName: (setupName || '').trim(),
    initialBenchmarkElevation: toNumberOrNull(initialBenchmarkElevation),
    createdAt: now,
    updatedAt: now
  })
  return docRef.id
}

export async function updateSurveySetup(setupId, {
  setupName,
  initialBenchmarkElevation
}) {
  const ref = doc(db, 'surveySetups', setupId)
  await updateDoc(ref, {
    setupName: (setupName || '').trim(),
    initialBenchmarkElevation: toNumberOrNull(initialBenchmarkElevation),
    updatedAt: serverTimestamp()
  })
}

export async function deleteSurveySetup(setupId) {
  // Cascade: remove all shots in this setup atomically with the setup itself.
  const shotsQ = query(
    surveyShotsCollection,
    where('surveySetupId', '==', setupId)
  )
  const shotsResult = await getDocs(shotsQ)
  const batch = writeBatch(db)
  for (const docSnap of shotsResult.docs) {
    batch.delete(docSnap.ref)
  }
  batch.delete(doc(db, 'surveySetups', setupId))
  await batch.commit()
}

// ---------- Shots ----------

export async function listSurveyShots(surveySetupId) {
  const q = query(
    surveyShotsCollection,
    where('surveySetupId', '==', surveySetupId),
    orderBy('orderIndex', 'asc')
  )
  const result = await getDocs(q)
  return result.docs.map(mapShot)
}

export async function createSurveyShot({
  jobId,
  dailyEntryId,
  surveySetupId,
  type,
  rodReading,
  description,
  orderIndex
}) {
  const now = serverTimestamp()
  const docRef = await addDoc(surveyShotsCollection, {
    companyId: TEMP_COMPANY_ID,
    jobId,
    dailyEntryId,
    surveySetupId,
    type,
    rodReading: toNumberOrNull(rodReading),
    description: (description || '').trim(),
    orderIndex: typeof orderIndex === 'number' ? orderIndex : 0,
    createdAt: now,
    updatedAt: now
  })
  return docRef.id
}

export async function updateSurveyShot(shotId, { type, rodReading, description }) {
  const ref = doc(db, 'surveyShots', shotId)
  await updateDoc(ref, {
    type,
    rodReading: toNumberOrNull(rodReading),
    description: (description || '').trim(),
    updatedAt: serverTimestamp()
  })
}

export async function deleteSurveyShot(shotId) {
  const ref = doc(db, 'surveyShots', shotId)
  await deleteDoc(ref)
}

// ---------- HI-method calculation ----------
//
// Rules:
//   BS  → defines (or redefines) HI for the current rod position.
//         HI = currentElevation + rodReading.
//         The shot's calculatedElevation is the currentElevation it was taken on.
//   FS  → reading off a different point with the same HI.
//         calculatedElevation = HI - rodReading. currentElevation is NOT moved.
//   TP  → like FS, but the rod moves: currentElevation becomes the new point
//         so a subsequent BS can chain off it.
//
// Across setups: when a setup has no initialBenchmarkElevation, we walk back
// through prior setups and use the most recent TP elevation as the starting
// point. This implements the "TP acts as BS on next setup" rule without
// requiring the user to copy the value manually.

export function computeSetupShots(shots, startingElevation) {
  let currentElevation = Number(startingElevation)
  if (!Number.isFinite(currentElevation)) currentElevation = 0
  let currentHI = null

  return shots.map((shot) => {
    const reading = Number(shot.rodReading)
    if (!Number.isFinite(reading)) {
      return {
        ...shot,
        calculatedHI: currentHI,
        calculatedElevation: null,
        _error: 'rod reading missing'
      }
    }
    if (shot.type === 'BS') {
      currentHI = currentElevation + reading
      return {
        ...shot,
        calculatedHI: currentHI,
        calculatedElevation: currentElevation
      }
    }
    if (currentHI == null) {
      return {
        ...shot,
        calculatedHI: null,
        calculatedElevation: null,
        _error: 'add a BS before FS/TP'
      }
    }
    if (shot.type === 'FS') {
      return {
        ...shot,
        calculatedHI: currentHI,
        calculatedElevation: currentHI - reading
      }
    }
    if (shot.type === 'TP') {
      const elev = currentHI - reading
      currentElevation = elev
      return {
        ...shot,
        calculatedHI: currentHI,
        calculatedElevation: elev
      }
    }
    return { ...shot, calculatedHI: currentHI, calculatedElevation: null }
  })
}

export function computeAllSetups(setups, shotsBySetupId) {
  const computed = {}
  for (let i = 0; i < setups.length; i++) {
    const setup = setups[i]

    // Resolve starting elevation: explicit value wins; otherwise walk back
    // for the most recent prior TP, then fall back to 0.
    let startingElevation = setup.initialBenchmarkElevation
    if (startingElevation == null) {
      for (let j = i - 1; j >= 0; j--) {
        const prev = computed[setups[j].id]
        if (!prev) continue
        const lastTP = [...prev.shots]
          .reverse()
          .find(
            (s) =>
              s.type === 'TP' && Number.isFinite(s.calculatedElevation)
          )
        if (lastTP) {
          startingElevation = lastTP.calculatedElevation
          break
        }
      }
    }
    if (startingElevation == null) startingElevation = 0

    const rawShots = shotsBySetupId[setup.id] || []
    const computedShots = computeSetupShots(rawShots, startingElevation)
    const lastBS = [...computedShots].reverse().find((s) => s.type === 'BS')

    computed[setup.id] = {
      startingElevation,
      shots: computedShots,
      currentHI: lastBS ? lastBS.calculatedHI : null
    }
  }
  return computed
}
