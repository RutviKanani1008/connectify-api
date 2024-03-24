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
    type: {
      type: String,
      enum: ['letter', 'postcard']
    },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null
    },
    postcardFront: {
      type: String
    },
    postCardSize: {
      type: String
    },
    postcardBack: {
      type: String
    },
    description: {
      type: String
    },
    body: {
      type: String
    },
    header: {
      type: String
    },
    footer: {
      type: String
    },
    order: {
      type: Number,
      required: true,
      default: 0
    }
  },
  {
    timestamps: true
  }
)

export const validateDirectMailTemplate = (companies) => {
  const JoiSchema = Joi.object({
    name: Joi.string().required()
  })
    .options({ abortEarly: false })
    .unknown()

  return JoiSchema.validate(companies)
}

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const DirectMailTemplates = model('Direct-Mail-Template', schema)
