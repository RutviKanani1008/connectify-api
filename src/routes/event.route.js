import { Router } from 'express'
import {
  addEventDetail,
  deleteEventDetail,
  getEventDetails,
  getSpecificEventDetail,
  rsvpResponse,
  updateEventDetail,
  getRSVPDetails,
  getEvents,
  deleteRecurringEvents
} from '../controllers/event.controller'

import { authenticated } from '../middlewares/authenticated.middleware'
const Event = Router()

Event.get('/event', authenticated, getEventDetails)
Event.get('/event-detail', getSpecificEventDetail)
Event.get('/event-rsvp', authenticated, getRSVPDetails)
Event.get('/events', authenticated, getEvents)

Event.post('/event', authenticated, addEventDetail)
Event.post('/rsvp/:id', rsvpResponse)

Event.put('/event/:id', authenticated, updateEventDetail)

Event.delete('/event/:id', authenticated, deleteEventDetail)
Event.delete('/events/:recurrenceId', authenticated, deleteRecurringEvents)

export default Event
