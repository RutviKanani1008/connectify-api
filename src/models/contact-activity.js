import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

export const AVAILABLE_EVENT_TYPE = {
  NOTE_ADDED: 'note-added',
  TASK_ASSIGNED: 'task-assigned',
  TASK_UPDATE_ADDED: 'task-update-added',
  NEW_CONTACT_CREATE_FROM_CONTACT_FORM: 'contact-created-from-contact-form',
  NEW_CONTACT_CREATE_FROM_MASS_IMPORT: 'contact-created-from-mass-import',
  NEW_CONTACT_CREATE_FROM_FILLING_MARKETING_FORM: 'contact-created-from-filling-marketing-form'
}

export const AVAILABLE_ACTIVITY_FOR = {
  task: 'task',
  note: 'note',
  taskUpdate: 'taskUpdate',
  contact: 'contact'
}

const schema = new Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [...Object.values(AVAILABLE_EVENT_TYPE)]
    },
    // It will store the contact as well as user object _id.
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contacts',
      required: false,
      default: null
    },
    eventFor: {
      type: String,
      required: true,
      enum: [...Object.values(AVAILABLE_ACTIVITY_FOR)]
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    otherReferenceField: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    otherReferenceFieldModel: {
      type: String,
      default: null
    },
    otherFormFieldDetails: {
      type: Object,
      default: null
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const ContactActivity = model('Contact-Activity', schema)
