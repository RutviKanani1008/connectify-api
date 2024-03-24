// ==================== Packages =======================
import { ObjectId } from 'mongodb'
import _ from 'lodash'
// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import {
  createEvent,
  deleteEvent,
  findAllEvent,
  findEvent,
  getEventsRepo,
  updateEvent
} from '../repositories/event.repository'
import { createContact, findContact } from '../repositories/contact.repository'
import { sendMail } from '../services/send-grid'
import { generateRandomString } from '../helpers/generateRandomString'
import { createEventRSVP, findAllEventRSVP, findEventRSVP } from '../repositories/eventRsvp.repository'
import { findGroup } from '../repositories/groups.repository'
import { findOneEmailTemplate } from '../repositories/emailTemplates.repository'
import { INTERNAL_COMMUNICATION_TEMPLATE } from '../constants/internalCommunicationTemplate'
import { varSetInTemplate } from '../helpers/dynamicVarSetInTemplate.helper'
import { getSelectParams } from '../helpers/generalHelper'

export const getEventDetails = async (req, res) => {
  try {
    if (req.query.start && req.query.end) {
      req.query = {
        $or: [
          { start: { $lte: req.query.start }, end: { $gte: req.query.start } },
          { start: { $gte: req.query.start, $lte: req.query.end } }
        ]
      }
      delete req.query.end
    }
    const events = await findAllEvent(req.query, [{ path: 'contacts' }], getSelectParams(req))
    return generalResponse(res, events, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getRSVPDetails = async (req, res) => {
  try {
    const rsvp = await findAllEventRSVP(req.query, { path: 'contact' })
    return generalResponse(res, rsvp, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificEventDetail = async (req, res) => {
  try {
    const events = await findEvent(req.query, [{ path: 'contacts' }, { path: 'company' }])
    return generalResponse(res, events, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const addEventDetail = async (req, res) => {
  try {
    let events = req.body
    if (_.isArray) {
      // const __dirname = path.resolve()
      const slug = generateRandomString(10)
      const randomEventId = new Date().getTime().toString()
      events = events.map((obj) => ({ ...obj, slug, recurrenceId: randomEventId }))
      const newEvent = await createEvent(events)

      if (req?.body?.[0].contacts?.length > 0) {
        req?.body[0].contacts.forEach(async (contact) => {
          const contactDetails = await findContact({ _id: contact })

          const template = await findOneEmailTemplate({
            _id: INTERNAL_COMMUNICATION_TEMPLATE.eventNotification
          }).select({ htmlBody: true, subject: true })
          let htmlBody = template.htmlBody

          const htmlVarObj = {
            name:
              contactDetails?.firstName || contactDetails?.lastName
                ? `${contactDetails?.firstName} - ${contactDetails?.lastName}`
                : '',
            link: `${process.env.HOST_NAME}/rsvp/${slug}`,
            eventName: newEvent[0]?.name,
            eventDescription: newEvent[0]?.description,
            eventStartDate: newEvent[0]?.start,
            eventEndDate: newEvent[0]?.end
          }
          htmlBody = varSetInTemplate(htmlVarObj, htmlBody)

          sendMail({ receiver: contactDetails?.email, subject: template.subject, htmlBody })
        })
      }
      return generalResponse(res, newEvent, 'success')
    }
    throw new Error('Something went wrong!')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteEventDetail = async (req, res) => {
  try {
    const Event = await deleteEvent({ _id: ObjectId(req.params.id) })
    if (Event && Event.acknowledged && Event.deletedCount === 0) {
      return generalResponse(res, false, { text: 'Event Not Exists.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'Event deleted successfully!')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteRecurringEvents = async (req, res) => {
  try {
    const Event = await deleteEvent({ recurrenceId: req.params.recurrenceId })
    if (Event && Event.acknowledged && Event.deletedCount === 0) {
      return generalResponse(res, false, { text: 'Event Not Exists.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'Event deleted successfully!')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateEventDetail = async (req, res) => {
  try {
    await updateEvent({ _id: ObjectId(req.params.id), company: ObjectId(req.body.company) }, { ...req.body })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const rsvpResponse = async (req, res) => {
  try {
    const { token, ...reqBody } = req.body
    // const check = await checkGoogleReCaptchaVerification(req.body.token)
    // if (!check) {
    //   return generalResponse(res, null, 'Something went wrong', 'error', false, 400)
    // }
    const event = await findEvent({ slug: req.params.id }, [{ path: 'contacts' }, { path: 'company' }])

    if (!event) {
      // In case event is not found.
      return generalResponse(res, null, { text: 'Event Not found.' }, 'error', false, 400)
    }
    let contact = await findContact({ email: req.body.email, company: ObjectId(event.company) })
    if (!contact) {
      //  Create New Contact if contact is not exists.
      const group = await findGroup({ company: event.company })
      const contactBody = {
        email: req.body.email,
        company: JSON.parse(JSON.stringify(event.company)),
        group: group?._id
      }
      const newContact = await createContact({ firstName: '', lastName: '', ...contactBody })
      contact = JSON.parse(JSON.stringify(newContact))
    }
    if (contact) {
      const isRSVPSubmitted = await findEventRSVP({ contact: contact?._id, event: event?._id })
      if (isRSVPSubmitted) {
        return generalResponse(res, null, { text: 'You already submitted rsvp response.' }, 'error', false, 400)
      }
    }
    if (event) {
      // Check email is in event invited list or not.
      event?.contacts?.find((contact) => contact.email === req.body.email)
    }

    const rsvp = await createEventRSVP({ ...reqBody, event: event._id, contact: contact?._id })
    return generalResponse(res, rsvp, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getEvents = async (req, res) => {
  try {
    const response = await getEventsRepo(req.query.contactID)
    return generalResponse(res, response, 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
