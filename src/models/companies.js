import Joi from 'joi'
import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

import { defaultStages } from '../constants/companyStages'
const { model, Schema } = mongoose

const DEFAULT_PERMISSIONS = [
  'company',
  'company-profile',
  'users',
  'forms',
  'templates',
  'documents',
  'contacts',
  'contacts-list',
  'add-contact',
  'manage-groups',
  'status',
  'categories',
  'tags',
  'contact-pipeline',
  'custom-fields',
  'pipeline',
  'event',
  'campaigns',
  'mass-sms-tool',
  'mass-email-tool',
  'reports',
  'billing',
  'quote',
  'invoice',
  'products',
  'billing-profiles',
  'billing-templates',
  'task-manager'
]

const schema = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    massSmsPhone: {
      type: String,
      default: ''
    },
    address1: {
      type: String,
      required: false
    },
    address2: {
      type: String,
      required: false
    },
    city: {
      type: String,
      required: false
    },
    state: {
      type: String,
      required: false
    },
    zipcode: {
      type: String,
      required: false
    },
    permissions: {
      type: [String],
      default: DEFAULT_PERMISSIONS
    },
    companyUrl: {
      type: String,
      required: false,
      default: ''
    },
    website: {
      type: String,
      required: false,
      default: ''
    },
    companyLogo: {
      type: String,
      required: true
    },
    notes: {
      type: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
          text: { type: String },
          isPinned: { type: Boolean, default: false },
          createdAt: { type: String, default: new Date() }
        }
      ],
      default: []
    },
    contactStages: {
      type: [{ code: { type: String }, title: { type: String }, order: { type: Number } }],
      default: defaultStages
    },
    status: {
      type: Boolean,
      required: true,
      default: false
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY'
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      default: null
    },
    taskSetting: {
      type: Object,
      default: null
    },
    defaultTestMailConfig: {
      type: {
        receiver: { type: [String] },
        senderName: { type: String, default: null },
        senderEmail: { type: String, default: null }
      },
      default: null
    },
    archived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
)

export const validateLodges = (companies) => {
  const JoiSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().required().email().min(5).max(50),
    phone: Joi.string().required()
  })
    .options({ abortEarly: false })
    .unknown()

  return JoiSchema.validate(companies)
}

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Companies = model('Companies', schema)
