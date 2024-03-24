import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'

import {
  addChangeLog,
  deleteChangeLogDetail,
  getAllChangeLogs,
  getLatestChangeLog,
  updateChangeLogById
} from '../controllers/changeLog.controller'

const changeLog = Router()

changeLog.get('/change-logs/latest', authenticated, getLatestChangeLog)

// changeLog.use(authenticated)
changeLog.get('/change-logs', authenticated, getAllChangeLogs)
changeLog.post('/change-logs', authenticated, addChangeLog)
changeLog.put('/change-logs/:id', authenticated, updateChangeLogById)
changeLog.delete('/change-logs/:id', authenticated, deleteChangeLogDetail)

// changeLog.route('/change-logs/:id').get(getChangeLogById).put(updateChangeLogById).delete(deleteChangeLog)

export default changeLog
