import generalResponse from '../helpers/generalResponse.helper'
import {
  createPipeline,
  deletePipeline,
  findAllPipeline,
  findPipeline,
  updatePipeline
} from '../repositories/pipeline.repository'
import { ObjectId } from 'mongodb'

export const createNewPipeline = async (req, res) => {
  try {
    const { pipelineName, groupId } = req.body
    req.body.groupId = groupId || null
    const pipeline = await findAllPipeline({
      pipelineCode: pipelineName.replace(/ /g, '-').toLowerCase(),
      company: ObjectId(req.body.company),
      groupId: req.body.groupId ? ObjectId(req.body.groupId) : null
    })
    if (pipeline && pipeline.length > 0) {
      return generalResponse(res, false, { text: 'Pipeline Already Exists.' }, 'error', false, 400)
    }
    const newPipeline = await createPipeline({
      pipelineCode: pipelineName.replace(/ /g, '-').toLowerCase(),
      ...req.body
    })
    return generalResponse(res, newPipeline, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getPipeline = async (req, res) => {
  try {
    const { groupId, _id } = req.query
    if (!groupId && !_id) {
      req.query.groupId = null
    }
    const pipeline = await findAllPipeline(req.query, {}, { createdAt: -1 })

    return generalResponse(res, pipeline, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getPipelineStages = async (req, res) => {
  try {
    const { groupId, _id } = req.query
    if (!groupId && !_id) {
      req.query.groupId = null
    }
    const pipeline = await findPipeline(req.query)

    return generalResponse(res, pipeline.stages, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updatePipelineDetails = async (req, res) => {
  try {
    // const pipeline = await findAllPipeline(req.query, {}, { createdAt: -1 })
    const { pipelineName } = req.body
    let isPipelineExists
    if (req.body.type === 'status') {
      isPipelineExists = await findAllPipeline({
        pipelineCode: pipelineName.replace(/ /g, '-').toLowerCase(),
        company: ObjectId(req.body.company),
        active: req.body.active,
        groupId: req.body.groupId ? ObjectId(req.body.groupId) : null
      })
    } else {
      isPipelineExists = await findAllPipeline({
        pipelineCode: pipelineName.replace(/ /g, '-').toLowerCase(),
        company: ObjectId(req.body.company),
        groupId: req.body.groupId ? ObjectId(req.body.groupId) : null
      })
    }
    if (isPipelineExists && isPipelineExists.length > 0) {
      return generalResponse(res, false, { text: 'Pipeline Already Exists.' }, 'error', false, 400)
    }
    await updatePipeline(
      { _id: req.params.id },
      { pipelineCode: pipelineName.replace(/ /g, '-').toLowerCase(), ...req.body }
    )
    const updatesPipeline = await findPipeline({ _id: req.params.id })

    return generalResponse(res, updatesPipeline, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deletePipelineDetails = async (req, res) => {
  try {
    // const pipeline = await findAllPipeline(req.query, {}, { createdAt: -1 })
    await deletePipeline({ _id: req.params.id })

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateMemberPipeline = async (req, res) => {
  try {
    const { stage } = req.body

    await updatePipeline({ _id: req.params.id }, { stages: stage })

    const newObject = await findPipeline({ _id: req.params.id })
    return generalResponse(res, newObject.stages, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
