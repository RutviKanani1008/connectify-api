import generalResponse from '../helpers/generalResponse.helper'
import {
  createNotes,
  deleteNotes,
  findAllNotes,
  findLastCompanyNote,
  findNotes,
  getNoteCount,
  updateManyNotes,
  updateNotes
} from '../repositories/note.repository'
import { ObjectId } from 'mongodb'
import { createBulkNotesSchedulerJob } from '../schedular-jobs/bulk-notes-create/createBulkTaskJobSchedulerQueue.helper'
import { createContactActivity } from '../repositories/contactActivities'
import { AVAILABLE_ACTIVITY_FOR, AVAILABLE_EVENT_TYPE } from '../models/contact-activity'
import { Notes } from '../models/notes'
import { Companies } from '../models/companies'
import { Users } from '../models/users'

export const addNoteDetail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    // Get Latest noteNumber
    const lastTask = await findLastCompanyNote({
      params: { company: ObjectId(currentUser.company) },
      projection: { noteNumber: 1 }
    })
    const lastNoteNumber = !lastTask?.noteNumber ? 1000 : +lastTask.noteNumber + 1

    const newlyCreatedNote = await createNotes({
      ...req.body,
      noteNumber: lastNoteNumber,
      createdBy: ObjectId(currentUser._id),
      updatedBy: ObjectId(currentUser._id)
    })
    if (['Contacts', 'Users'].includes(req.body.modelName)) {
      // Create contact activity
      await createContactActivity({
        eventType: AVAILABLE_EVENT_TYPE.NOTE_ADDED,
        contact: req.body.modelId,
        eventFor: AVAILABLE_ACTIVITY_FOR.note,
        refId: newlyCreatedNote?._id,
        company: ObjectId(currentUser.company),
        createdBy: ObjectId(currentUser._id)
      })
    }
    const newNote = await findNotes(
      { _id: ObjectId(newlyCreatedNote._id) },
      { path: 'updatedBy', ref: 'Users', select: { firstName: 1, lastName: 1 } },
      { path: 'createdBy', ref: 'Users', select: { firstName: 1, lastName: 1 } }
    )

    return generalResponse(res, newNote, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const createBulkNote = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    await createBulkNotesSchedulerJob({
      ...req.body,
      currentUser
    })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getNoteDetails = async (req, res) => {
  try {
    const { limit = 10000, page = 1, search, folder = null, ...rest } = req.query
    const skip = Number(limit) * Number(page) - Number(limit)
    const searchQuery = search
      ? { $or: [{ title: { $regex: search, $options: 'i' } }, { note: { $regex: search, $options: 'i' } }] }
      : {}

    const notes = await findAllNotes(
      { ...searchQuery, folder, ...rest },
      {},
      {
        path: 'updatedBy',
        ref: 'Users',
        select: { firstName: 1, lastName: 1 }
      },
      skip,
      limit
    )
    const total = await getNoteCount({ ...searchQuery, folder, ...rest })
    return generalResponse(res, { notes, total }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const printAllNotes = async (req, res) => {
  try {
    const { search, ...rest } = req.query
    const searchQuery = search
      ? { $or: [{ title: { $regex: search, $options: 'i' } }, { note: { $regex: search, $options: 'i' } }] }
      : {}

    const notes = await findAllNotes(
      { ...searchQuery, ...rest },
      { note: 1, attachment: 1, title: 1, updatedAt: 1, attachments: 1 },
      {
        path: 'updatedBy',
        ref: 'Users',
        select: { firstName: 1, lastName: 1 }
      }
    )
    return generalResponse(res, notes, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificNoteDetails = async (req, res) => {
  try {
    const notes = await findNotes({ ...req.query, _id: ObjectId(req.params.id) }, [
      {
        path: 'updatedBy',
        ref: 'Users',
        select: { firstName: 1, lastName: 1, userProfile: 1 }
      },
      {
        path: 'createdBy',
        ref: 'Users',
        select: { firstName: 1, lastName: 1, userProfile: 1, role: 1 }
      },
      {
        path: 'company',
        ref: 'Companies',
        select: { name: 1, email: 1, companyLogo: 1 }
      }
    ])
    return generalResponse(res, notes, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteNotesDetail = async (req, res) => {
  try {
    const status = await deleteNotes({ _id: ObjectId(req.params.id) })
    if (status && status.acknowledged && status.deletedCount === 0) {
      return generalResponse(res, false, { text: 'Status Not Exists.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateNoteDetail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const notes = await updateNotes(
      { _id: ObjectId(req.params.id), company: ObjectId(req.body.company) },
      { ...req.body, updatedBy: ObjectId(currentUser._id) }
    )
    if (notes && notes.matchedCount === 0) {
      return generalResponse(res, false, { text: 'No Note found.' }, 'error', false, 400)
    }
    const updatedNote = await findNotes(
      { _id: ObjectId(req.params.id) },
      { path: 'updatedBy', ref: 'Users', select: { firstName: 1, lastName: 1 } }
    )
    return generalResponse(res, updatedNote, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const migrateNotes = async (req, res) => {
  try {
    const notesDetails = await Notes.aggregate([
      {
        $group: {
          _id: '$company',
          notes: {
            $push: '$$ROOT'
          }
        }
      }
    ])

    const tempNotes = []
    notesDetails.forEach((notes) => {
      let startNumber = 999
      if (notes.notes.length) {
        //
        notes.notes.forEach((item) => {
          startNumber = startNumber + 1
          tempNotes.push({
            updateOne: {
              filter: {
                _id: item._id
              },
              update: { $set: { noteNumber: startNumber } }
            }
          })
        })
      }
    })

    await Notes.bulkWrite(tempNotes)
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const cloneNotes = async (req, res) => {
  try {
    const companyDetails = await Companies.find({ $expr: { $gt: [{ $size: '$notes' }, 0] } }, { _id: 1, notes: 1 })

    const creatingNote = []
    if (companyDetails.length) {
      for (const company of companyDetails) {
        if (company?.notes) {
          for (const note of company.notes) {
            const lastTask = await findLastCompanyNote({
              params: { company: ObjectId(company?._id) },
              projection: { noteNumber: 1 }
            })
            const lastNoteNumber = !lastTask?.noteNumber ? 1000 : +lastTask.noteNumber + 1
            const newNote = await createNotes({
              title: 'Note',
              note: note?.text,
              isPinned: note?.isPinned || false,
              modelId: company?._id,
              modelName: 'company',
              attachments: [],
              company: company?._id,
              noteNumber: lastNoteNumber,
              updatedBy: note?.userId
            })
            creatingNote.push(newNote)
          }
        }
        // await updateCompany({ _id: ObjectId(company?._id) }, { notes: [] })
      }
    }

    const userDetails = await Users.find({}, { _id: 1, notes: 1, company: 1 })
    if (userDetails?.length) {
      for (const user of userDetails) {
        if (user?.notes) {
          for (const note of user.notes) {
            const lastTask = await findLastCompanyNote({
              params: { company: ObjectId(user?.company?._id) },
              projection: { noteNumber: 1 }
            })
            const lastNoteNumber = !lastTask?.noteNumber ? 1000 : +lastTask.noteNumber + 1
            const newNote = await createNotes({
              title: 'Note',
              note: note?.text,
              isPinned: note?.isPinned || false,
              modelId: user?._id,
              modelName: 'Users',
              attachments: [],
              company: user?.company?._id,
              noteNumber: lastNoteNumber,
              updatedBy: note?.updatedBy
            })
            creatingNote.push(newNote)
          }
        }
        // await updateUser({ _id: ObjectId(user?._id) }, { notes: [] })
      }
    }

    return generalResponse(res, creatingNote, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const changeFolderDetails = async (req, res) => {
  try {
    const { notes, folder: folderId } = req.body

    await updateManyNotes({ _id: { $in: notes } }, { $set: { folder: folderId } }, { multi: true })

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
