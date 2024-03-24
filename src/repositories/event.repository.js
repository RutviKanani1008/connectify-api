import { Event } from '../models/event'
import mongoose from 'mongoose'
const ObjectId = mongoose.Types.ObjectId

const findEvent = (params, populate = {}) => {
  return Event.findOne(params).populate(populate).sort({ createdAt: -1 })
}

const findAllEvent = (params, populate = {}, projection = {}) => {
  return Event.find(params, projection).populate(populate).sort({ createdAt: -1 })
}

const createEvent = (data) => {
  return Event.insertMany(data)
}

const updateEvent = (search, updateValue) => {
  return Event.updateOne(search, updateValue)
}

const deleteEvent = (params) => {
  return Event.delete(params)
}

const findEventAggregate = (params) => {
  return Event.aggregate(params)
}

const getEventsRepo = (contactID) => {
  return Event.aggregate([
    {
      $match: { contacts: new ObjectId(contactID) }
    },
    {
      $lookup: {
        from: 'eventrsvps',
        let: { eventID: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $and: [{ $eq: ['$event', '$$eventID'] }, { $eq: ['$contact', new ObjectId(contactID)] }] }
            }
          }
        ],
        as: 'eventrsvp'
      }
    },
    {
      $match: {
        eventrsvp: { $ne: [] }
      }
    }
    // {
    //   $match: {
    //     eventrsvp: { $eq: [] }
    //   }
    // }
  ])
}

export { createEvent, findEvent, findAllEvent, updateEvent, deleteEvent, findEventAggregate, getEventsRepo }
