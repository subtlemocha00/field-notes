import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
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

const surveySetupsCollection = collection(db, 'surveySetups')
const surveyShotsCollection = collection(db, 'surveyShots')

export const SHOT_TYPES = ['BS', 'FS', 'TP']
export const PIPE_MODES = ['invert', 'obvert']

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
    createdBy: data.createdBy || null,
    updatedBy: data.updatedBy || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    schemaVersion: data.schemaVersion ?? 0,
    deleted: data.deleted === true
  }
}

function mapShot(snapshot) {
  const data = snapshot.data()
  const type = SHOT_TYPES.includes(data.type) ? data.type : 'FS'
  // Pipe fields are only meaningful on FS shots. Legacy shots without
  // these fields read as non-pipe — full backward compatibility.
  const isPipe = type === 'FS' && data.isPipe === true
  const pipeMode = PIPE_MODES.includes(data.pipeMode) ? data.pipeMode : 'invert'
  return {
    id: snapshot.id,
    companyId: data.companyId,
    jobId: data.jobId,
    dailyEntryId: data.dailyEntryId,
    surveySetupId: data.surveySetupId,
    type,
    rodReading: toNumberOrNull(data.rodReading),
    description: typeof data.description === 'string' ? data.description : '',
    orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
    isPipe,
    pipeMode: isPipe ? pipeMode : 'invert',
    pipeDiameter: isPipe ? toNumberOrNull(data.pipeDiameter) : null,
    createdBy: data.createdBy || null,
    updatedBy: data.updatedBy || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    schemaVersion: data.schemaVersion ?? 0,
    deleted: data.deleted === true
  }
}

function sanitizePipeFields({ type, isPipe, pipeMode, pipeDiameter }) {
  // Only FS shots may carry pipe data. Other types are forced clean
  // so toggling a pipe FS → BS/TP can't leave orphan pipe metadata.
  if (type !== 'FS' || !isPipe) {
    return { isPipe: false, pipeMode: 'invert', pipeDiameter: null }
  }
  const mode = PIPE_MODES.includes(pipeMode) ? pipeMode : 'invert'
  return {
    isPipe: true,
    pipeMode: mode,
    pipeDiameter: toNumberOrNull(pipeDiameter)
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
  // Hide soft-deleted setups (legacy setups without the field stay visible).
  return result.docs.filter((d) => isNotDeleted(d.data())).map(mapSetup)
}

export async function createSurveySetup({
  jobId,
  dailyEntryId,
  setupName,
  initialBenchmarkElevation
}, user) {
  if (!jobId || !dailyEntryId) {
    throw new Error('A job and daily entry are required to create a setup.')
  }
  const docRef = await addDoc(surveySetupsCollection, {
    jobId,
    dailyEntryId,
    setupName: (setupName || '').trim(),
    initialBenchmarkElevation: toNumberOrNull(initialBenchmarkElevation),
    ...auditCreateFields(user)
  })
  return docRef.id
}

export async function updateSurveySetup(setupId, {
  setupName,
  initialBenchmarkElevation
}, user) {
  const ref = doc(db, 'surveySetups', setupId)
  await updateDoc(ref, {
    setupName: (setupName || '').trim(),
    initialBenchmarkElevation: toNumberOrNull(initialBenchmarkElevation),
    ...auditUpdateFields(user)
  })
}

// Soft delete — the setup is hidden from the survey section but recoverable.
// Its shots are queried by surveySetupId; with the setup hidden they no
// longer render, and they remain in Firestore alongside the setup. We
// intentionally no longer cascade-hard-delete the shots.
export async function deleteSurveySetup(setupId, user) {
  const ref = doc(db, 'surveySetups', setupId)
  await updateDoc(ref, softDeleteFields(user))
}

// ---------- Shots ----------

export async function listSurveyShots(surveySetupId) {
  const q = query(
    surveyShotsCollection,
    where('surveySetupId', '==', surveySetupId),
    orderBy('orderIndex', 'asc')
  )
  const result = await getDocs(q)
  return result.docs.filter((d) => isNotDeleted(d.data())).map(mapShot)
}

export async function createSurveyShot({
  jobId,
  dailyEntryId,
  surveySetupId,
  type,
  rodReading,
  description,
  orderIndex,
  isPipe,
  pipeMode,
  pipeDiameter
}, user) {
  if (!jobId || !dailyEntryId || !surveySetupId) {
    throw new Error('A job, daily entry, and setup are required to add a shot.')
  }
  if (!SHOT_TYPES.includes(type)) {
    throw new Error(`Invalid shot type: ${type}.`)
  }
  const pipe = sanitizePipeFields({ type, isPipe, pipeMode, pipeDiameter })
  const docRef = await addDoc(surveyShotsCollection, {
    jobId,
    dailyEntryId,
    surveySetupId,
    type,
    rodReading: toNumberOrNull(rodReading),
    description: (description || '').trim(),
    orderIndex: typeof orderIndex === 'number' ? orderIndex : 0,
    isPipe: pipe.isPipe,
    pipeMode: pipe.pipeMode,
    pipeDiameter: pipe.pipeDiameter,
    ...auditCreateFields(user)
  })
  return docRef.id
}

export async function updateSurveyShot(
  shotId,
  { type, rodReading, description, isPipe, pipeMode, pipeDiameter },
  user
) {
  if (!SHOT_TYPES.includes(type)) {
    throw new Error(`Invalid shot type: ${type}.`)
  }
  const ref = doc(db, 'surveyShots', shotId)
  const pipe = sanitizePipeFields({ type, isPipe, pipeMode, pipeDiameter })
  await updateDoc(ref, {
    type,
    rodReading: toNumberOrNull(rodReading),
    description: (description || '').trim(),
    isPipe: pipe.isPipe,
    pipeMode: pipe.pipeMode,
    pipeDiameter: pipe.pipeDiameter,
    ...auditUpdateFields(user)
  })
}

// Individual shots are fine-grained line-items edited within a setup, not in
// the named soft-delete set — they stay hard-deleted. Deleting a whole setup
// (soft) hides its shots without removing them.
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
      const elevation = currentHI - reading
      // Pipe derivation (additive — does not change `calculatedElevation`).
      // The existing elevation IS the invert (if pipeMode==='invert') or
      // the obvert (if pipeMode==='obvert'). The other value is derived
      // by ±pipeDiameter. Diameter missing or non-positive ⇒ no derivation.
      let invert = null
      let obvert = null
      if (shot.isPipe) {
        const d = Number(shot.pipeDiameter)
        const validDiameter = Number.isFinite(d) && d > 0
        if (shot.pipeMode === 'obvert') {
          obvert = elevation
          invert = validDiameter ? elevation - d : null
        } else {
          invert = elevation
          obvert = validDiameter ? elevation + d : null
        }
      }
      return {
        ...shot,
        calculatedHI: currentHI,
        calculatedElevation: elevation,
        calculatedInvert: invert,
        calculatedObvert: obvert
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
