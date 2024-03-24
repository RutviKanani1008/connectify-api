import { Router } from 'express'
import { getLoggedInUser, getNewUpdateCount, updateUserDetail, userUploadProfile } from '../controllers/auth.controller'

import { getUser, getUserDetails, homeFunction } from '../controllers/company.controller'
import { contactUs, featureRequest, reportProblem, sendrequestFileUpload } from '../controllers/profile.controller'
import { removeUploadAttachment, uploadFiles } from '../controllers/upload.controller'
import { authenticated } from '../middlewares/authenticated.middleware'
import { s3BucketFileUploader } from '../middlewares/fileUploader'

const home = Router()

home.get('/', homeFunction)
home.get('/user', getUser)
home.get('/user-details', getUserDetails)
home.get('/loggedin-user', authenticated, getLoggedInUser)
home.post('/upload', s3BucketFileUploader, uploadFiles)
home.post('/remove-attachment', removeUploadAttachment)
home.post('/upload-profile-image', authenticated, userUploadProfile)

home.post('/contact-us', authenticated, contactUs)
home.post('/feature-request', featureRequest)
home.post('/report-problem', reportProblem)
home.post('/report-problem-upload', s3BucketFileUploader, sendrequestFileUpload)

home.get('/new-updates-count', authenticated, getNewUpdateCount)

home.put('/user', authenticated, updateUserDetail)

export default home
