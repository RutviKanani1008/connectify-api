import { Router } from 'express'
import {
  createNewGroup,
  deleteGroupDetail,
  getGroupRelatedDetails,
  getGroups,
  updateGroupDetails
} from '../controllers/group.controller'

const group = Router()

group.get('/group', getGroups)

group.get('/group-related-details/:id', getGroupRelatedDetails)

group.post('/group', createNewGroup)

group.put('/group/:id', updateGroupDetails)

group.delete('/group/:id', deleteGroupDetail)

export default group
