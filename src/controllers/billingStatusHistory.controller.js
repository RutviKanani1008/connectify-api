// ** repository **
import { createBillingStatusHistory, getBillingStatusHistory } from '../repositories/billingStatusHistory.repository'

// ** others **
import generalResponse from '../helpers/generalResponse.helper'

export const changeBillStatusHistory = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const { recordRelationId, type, note, status } = req.body
    const result = await createBillingStatusHistory({
      recordRelationId,
      type,
      note,
      status,
      company: currentUser.company
    })
    return generalResponse(res, result, 'Change status successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error?.message ? error?.message : error, '', 'error', false, 400)
  }
}
export const getBillHistory = async (req, res) => {
  try {
    const { recordRelationId, type } = req.query
    const result = await getBillingStatusHistory({
      recordRelationId,
      type
    })
    return generalResponse(res, result, 'Bill status history fetch successfully!', 'success', false)
  } catch (error) {
    return generalResponse(res, error?.message ? error?.message : error, '', 'error', false, 400)
  }
}
