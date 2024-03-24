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
    body: {
      type: Object,
      required: true
    }
  },
  {
    timestamps: true
  }
)

export const validateEnvelope = (companies) => {
  const JoiSchema = Joi.object({
    name: Joi.string().required()
  })
    .options({ abortEarly: false })
    .unknown()

  return JoiSchema.validate(companies)
}

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Envelope = model('envelope', schema)
