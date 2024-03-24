import generalResponse from '../helpers/generalResponse.helper'
import { createStatus, deleteStatus, findAllStatus, findStatus, updateStatus } from '../repositories/status.repository'
import { ObjectId } from 'mongodb'

export const addStatusDetail = async (req, res) => {
  try {
    const { statusName, groupId } = req.body
    req.body.groupId = groupId || null

    const status = await findStatus({
      statusCode: statusName.replace(/ /g, '-').toLowerCase(),
      company: ObjectId(req.body.company),
      groupId: req.body.groupId ? ObjectId(req.body.groupId) : null
    })
    if (status) {
      return generalResponse(res, false, { text: 'Status Already Exists.' }, 'error', false, 400)
    }
    const lastStatus = await findStatus(
      { company: ObjectId(req.body.company), groupId: req.body.groupId ? ObjectId(req.body.groupId) : null },
      null,
      { position: -1 }
    )
    const newstatus = await createStatus({
      statusCode: statusName.replace(/ /g, '-').toLowerCase(),
      ...req.body,
      position: (lastStatus?.position || 0) + 1
    })
    return generalResponse(res, newstatus, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getStatusDetails = async (req, res) => {
  try {
    const { groupId } = req.query
    if (!groupId) {
      req.query.groupId = null
    }
    const status = await findAllStatus(req.query, { position: 1 })
    return generalResponse(res, status, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteStatusDetail = async (req, res) => {
  try {
    const status = await deleteStatus({ _id: ObjectId(req.params.id) })
    if (status && status.acknowledged && status.deletedCount === 0) {
      return generalResponse(res, false, { text: 'Status Not Exists.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateStatusDetail = async (req, res) => {
  try {
    const { statusName } = req.body
    let isStatusExist
    if (req.body.type === 'status') {
      isStatusExist = await findStatus({
        _id: { $ne: ObjectId(req.params.id) },
        statusCode: statusName.replace(/ /g, '-').toLowerCase(),
        company: ObjectId(req.body.company),
        active: req.body.active,
        groupId: req.body.groupId ? ObjectId(req.body.groupId) : null
      })
    } else {
      isStatusExist = await findStatus({
        _id: { $ne: ObjectId(req.params.id) },
        statusCode: statusName.replace(/ /g, '-').toLowerCase(),
        company: ObjectId(req.body.company),
        groupId: req.body.groupId ? ObjectId(req.body.groupId) : null
      })
    }

    if (isStatusExist) {
      return generalResponse(res, false, { text: 'Status Already Exists.' }, 'error', false, 400)
    }
    const status = await updateStatus(
      {
        _id: ObjectId(req.params.id),
        company: ObjectId(req.body.company),
        groupId: req.body.groupId ? ObjectId(req.body.groupId) : null
      },
      { statusCode: statusName.replace(/ /g, '-').toLowerCase(), ...req.body }
    )
    if (status && status.matchedCount === 0) {
      return generalResponse(res, false, { text: 'No Status found.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
