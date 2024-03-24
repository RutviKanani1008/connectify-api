import { Router } from 'express'
import {
  addNoteDetail,
  changeFolderDetails,
  // cloneNotes,
  createBulkNote,
  deleteNotesDetail,
  getNoteDetails,
  getSpecificNoteDetails,
  migrateNotes,
  printAllNotes,
  updateNoteDetail
} from '../controllers/note.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const notes = Router()

notes.get('/notes', authenticated, getNoteDetails)

notes.get('/print-notes', authenticated, printAllNotes)

notes.get('/notes/:id', getSpecificNoteDetails)

notes.post('/notes', authenticated, addNoteDetail)

notes.post('/bulk-notes', authenticated, createBulkNote)

notes.put('/notes/:id', authenticated, updateNoteDetail)

notes.delete('/notes/:id', authenticated, deleteNotesDetail)

notes.get('/migrate-notes', authenticated, migrateNotes)

notes.post('/change-note-folder', authenticated, changeFolderDetails)

// notes.get('/clone-notes', cloneNotes)

export default notes
