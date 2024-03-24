import Joi from 'joi'
import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    name: {
      type: String,
      required: true
    },
    subject: {
      type: String
    },
    status: {
      type: Boolean,
      default: true
    },
    htmlBody: {
      type: String,
      default: null
    },
    jsonBody: {
      type: String,
      default: null
    },
    isAutoResponderTemplate: {
      type: Boolean,
      default: false
    },
    tags: [
      {
        type: String
      }
    ],
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null
    }
  },
  {
    timestamps: true
  }
)

export const validateTemplate = (companies) => {
  const JoiSchema = Joi.object({
    name: Joi.string().required()
  })
    .options({ abortEarly: false })
    .unknown()

  return JoiSchema.validate(companies)
}

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const EmailTemplates = model('Email-Template', schema)
