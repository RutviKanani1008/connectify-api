import { EventRSVP } from '../models/eventRsvp'

const findEventRSVP = (params) => {
  return EventRSVP.findOne(params)
}

const findAllEventRSVP = (params, populate = {}) => {
  return EventRSVP.find(params).populate(populate).sort({ createdAt: -1 })
}

const createEventRSVP = (data) => {
  return EventRSVP.create(data)
}

const updateEventRSVP = (search, updateValue) => {
  return EventRSVP.updateOne(search, updateValue)
}

const deleteEventRSVP = (params) => {
  return EventRSVP.delete(params)
}

export { createEventRSVP, findEventRSVP, findAllEventRSVP, updateEventRSVP, deleteEventRSVP }
