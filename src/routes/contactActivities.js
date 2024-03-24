import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import { getAllContactActivities } from '../controllers/contactActivities.controller'

const contactActivities = Router()

contactActivities.get('/contact-activities', authenticated, getAllContactActivities)

export default contactActivities
