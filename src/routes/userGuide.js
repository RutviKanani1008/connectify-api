import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import {
  addUserGuideDetail,
  deleteUserGuideDetail,
  getAvailablePages,
  getUserGuideDetails,
  updateUserGuideDetails
} from '../controllers/userGuide.controller'

const userGuide = Router()

userGuide.get('/pages', getAvailablePages)

userGuide.get('/user-guide', authenticated, getUserGuideDetails)

userGuide.post('/user-guide', authenticated, addUserGuideDetail)

userGuide.put('/user-guide/:id', authenticated, updateUserGuideDetails)

userGuide.delete('/user-guide/:id', authenticated, deleteUserGuideDetail)

export default userGuide
