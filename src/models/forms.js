import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'
const { model, Schema } = mongoose

const schema = new Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: false
    },
    thankyou: {
      type: String,
      required: false,
      default: null
    },
    redirectLink: {
      type: String,
      default: null
    },
    thankYouOptional: {
      type: Boolean,
      default: false
    },
    slug: {
      type: String,
      required: true
    },
    fields: {
      type: [
        {
          label: { type: String, required: true },
          type: { type: String, required: true },
          mappedContactField: { type: String, required: false, default: null },
          placeholder: { type: String, required: false, default: '' },
          options: { type: Array, default: [] },
          required: { type: Boolean, default: false },
          order: { type: Number, required: true }
        }
      ],
      default: []
    },
    responses: {
      type: [],
      default: []
    },
    active: {
      type: Boolean,
      required: true,
      default: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: null
    },
    archived: {
      type: Boolean,
      default: false
    },
    autoresponderOptional: {
      type: Boolean,
      default: false
    },
    notificationOptional: {
      type: Boolean,
      default: false
    },
    showTitle: {
      type: Boolean,
      default: false
    },
    showDescription: {
      type: Boolean,
      default: false
    },
    showLogo: {
      type: Boolean,
      default: true
    },
    showCompanyName: {
      type: Boolean,
      default: true
    },
    allowReCaptcha: {
      type: Boolean,
      default: false
    },
    autoresponder: {
      type: {
        body: { type: String, required: false, default: '' },
        subject: { type: String, required: false, default: '' },
        htmlBody: {
          type: String,
          default: null
        },
        jsonBody: {
          type: String,
          default: null
        }
      },
      default: null
    },
    notification: {
      type: {
        body: { type: String, required: false, default: '' },
        htmlBody: {
          type: String,
          default: null
        },
        jsonBody: {
          type: String,
          default: null
        },
        subject: { type: String, required: false, default: '' },
        emails: { type: [{ type: String, required: false }], required: false }
      },
      default: null
    },
    isFormAssignments: {
      type: Boolean,
      default: false
    },
    group: {
      type: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'Groups' } },
      default: null
    },
    status: {
      type: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' } },
      default: null
    },
    category: {
      type: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' } },
      default: null
    },
    pipeline: {
      type: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'Pipeline' } },
      default: null
    },
    tags: {
      type: [
        {
          id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tags' }
        }
      ],
      default: []
    },
    stage: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    createTaskOnSubmit: {
      type: Boolean,
      default: false
    },
    autoResponderDelay: {
      type: Number,
      default: 0
    },
    notificationDelay: {
      type: Number,
      default: 0
    },
    designField: {
      pageBackgroundColor: { type: String, default: '#FFFFFF' },
      pageOpacity: { type: Number, default: 100 },
      fontColor: { type: String, default: '#a3db59' },
      submitButtonColor: { type: String, default: '#a3db59' },
      submitButtonFontColor: { type: String, default: '#000000' },
      fontFamily: { type: String, default: 'montserrat' },
      fontSize: { type: Number, default: 16 },
      questionSpacing: { type: Number, default: 18 },
      formWidth: { type: Number, default: 600 },
      fieldBorderRadius: { type: Number, default: 7 },
      submitButtonWidth: { type: Number, default: 20 }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Forms = model('Forms', schema)
