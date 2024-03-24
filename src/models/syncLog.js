import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose
const schema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      required: true
    },
    providerName: {
      type: String,
      default: null
    },
    providerEmail: {
      type: String,
      required: true
    },
    queueMessage: {
      type: Object,
      default: null
    },
    syncedDate: {
      type: Date,
      default: null
    },
    syncStartDate: {
      type: Date,
      default: null
    },
    isSynced: {
      type: Object,
      default: null
    },
    isPartialSyncRunning: {
      type: Boolean,
      default: false
    },
    isFullSyncRunning: {
      type: Boolean,
      default: false
    },
    syncingJobId: {
      type: String
    },
    watcherJobId: {
      type: String
    },
    totalNumberOfMail: {
      type: Number,
      default: 0
    },
    fetchedMailCount: {
      type: Number,
      default: 0
    },
    lastMailIdObj: {
      type: Object
    },
    currentMailSyncCronJobId: {
      type: String
    },
    mailWatcherJobId: {
      type: String
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const SyncLog = model('SyncLog', schema)
