import { getModel } from '../helpers/exportData'

export const updateMultiplePositions = ({ collectionName, items, customPipelineId }) => {
  const model = getModel(collectionName)

  const isCustomPipeline = collectionName === 'pipeline' && customPipelineId

  if (isCustomPipeline) {
    const updates = items.map((item) => ({
      updateOne: {
        filter: { _id: customPipelineId, 'stages._id': item._id },
        update: { $set: { 'stages.$.order': item.position } }
      }
    }))
    return model.bulkWrite(updates)
  }

  const updates = items.map((item) => ({
    updateOne: { filter: { _id: item._id }, update: { $set: { position: item.position } } }
  }))

  return model.bulkWrite(updates)
}
