import mongoose from 'mongoose'
import Joi from 'joi'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose
const userSchema = new Schema(
  {
    firstName: {
      type: String
    },
    lastName: {
      type: String
    },
    email: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true,
      default: ''
    },
    phone: {
      type: String
    },
    address1: {
      type: String
    },
    address2: {
      type: String
    },
    city: {
      type: String
    },
    state: {
      type: String
    },
    country: {
      type: String
    },
    zip: {
      type: String
    },
    notes: {
      type: [
        {
          text: { type: String },
          updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
          updatedAt: { type: Date, default: new Date() },
          isPinned: { type: Boolean, default: false }
        }
      ],
      default: []
    },
    authCode: {
      type: String,
      required: false
    },
    verificationCode: {
      type: Number,
      required: false
    },
    role: {
      type: String,
      required: true,
      default: 'admin'
    },
    inventoryRole: {
      type: String,
      default: 'inputUser'
    },
    permissions: {
      type: mongoose.SchemaTypes.Mixed,
      required: true,
      default: []
    },
    taskManagerUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      required: true
    },
    relation: {
      type: String,
      required: false,
      default: null
    },
    userProfile: {
      type: String,
      required: false,
      default: null
    },
    biograpy: {
      type: String,
      required: false,
      default: null
    },
    active: {
      type: Boolean,
      default: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    lastLogin: {
      type: Date,
      default: new Date()
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contacts',
      default: null
    },
    lastChangeLogTime: {
      type: Date,
      default: new Date()
    },
    // UI STATE
    taskManagerSidebarCollapsed: {
      type: Boolean,
      default: false
    },
    mainSidebarCollapsed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
)

export const validateLoginUser = (user) => {
  const JoiSchema = Joi.object({
    // email: Joi.string().email().min(5).max(50).required(),
    email: Joi.string()
      .email({ minDomainSegments: 2, tlds: { allow: false } })
      .min(5)
      .max(51)
      .required(),

    password: Joi.string().required()
  }).options({ abortEarly: false })

  return JoiSchema.validate(user)
}

export const validateRegisterUser = (user) => {
  const JoiSchema = Joi.object({
    email: Joi.string().required().email().min(5).max(50)
  })
    .options({ abortEarly: false })
    .unknown()

  return JoiSchema.validate(user)
}

userSchema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Users = model('Users', userSchema)
