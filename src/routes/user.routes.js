import { Router } from 'express'
import {
  createNewUser,
  createUserNote,
  deleteUserById,
  deleteUserNoteById,
  getAllCompanyUsers,
  getCompanyUsers,
  getUser,
  getUserNotes,
  getUsers,
  updateUserById,
  updateUserDetail,
  updateUserNote,
  updateUserPreferences
} from '../controllers/user.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const router = Router()

router.post('/users', authenticated, createNewUser)
router.post('/users/:id/notes', authenticated, createUserNote)

router.get('/users', authenticated, getUsers)
router.get('/users/:id', authenticated, getUser)
router.get('/users/company/all/:companyId', authenticated, getAllCompanyUsers)
router.get('/users/company/:companyId', authenticated, getCompanyUsers)
router.get('/users/:id/notes', authenticated, getUserNotes)

router.patch('/user/:id', authenticated, updateUserDetail)

router.put('/users/preferences/:id', authenticated, updateUserPreferences)
router.put('/users/:id', authenticated, updateUserById)
router.put('/users/:id/notes/:noteId', authenticated, updateUserNote)

router.delete('/users/:id', authenticated, deleteUserById)
router.delete('/users/:id/notes/:noteId', authenticated, deleteUserNoteById)

export default router
