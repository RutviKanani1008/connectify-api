import generalResponse from '../helpers/generalResponse.helper'
import Lob from 'lob'
import { findDirectMail } from '../repositories/directMail.repository'
import { findOneCompany } from '../repositories/companies.repository'

const lob = new Lob(process.env.LOB_API_KEY)

export const sendDirectMailViaLob = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const companyData = await findOneCompany({
      _id: currentUser?.company
    }).select({
      _id: 1,
      address1: 1,
      address2: 1,
      city: 1,
      state: 1,
      zipcode: 1,
      name: 1
    })

    const data = []
    const massEmailWithContacts = await findDirectMail({ _id: req.params.id }, {}, [
      {
        path: 'contacts',
        match: {},
        populate: [{ path: 'group.id', ref: 'Groups', select: 'groupName' }],
        select: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          address1: 1,
          address2: 1,
          city: 1,
          state: 1,
          zip: 1
        }
      },
      {
        path: 'directMailTemplate',
        select: {
          _id: 1,
          body: 1,
          description: 1,
          postcardFront: 1,
          postcardBack: 1,
          type: 1
        }
      }
    ])
    console.log({ companyData })
    console.log(massEmailWithContacts?.directMailTemplate)
    if (massEmailWithContacts?.contacts && massEmailWithContacts?.directMailTemplate?.type) {
      for (const contact of massEmailWithContacts.contacts) {
        try {
          const { address1, address2, city, state, zip, firstName, lastName, email } = contact
          console.log({ address1, address2, city, state, zip, firstName, lastName, email })
          if (massEmailWithContacts?.directMailTemplate?.type === 'letter') {
            const addressDetails = {
              description: massEmailWithContacts?.directMailTemplate?.description,
              to: {
                name: [firstName, lastName].join(' ').trim() || email,
                address_line1: address1,
                address_line2: address2,
                address_city: city,
                address_state: state,
                address_zip: zip
              },
              from: {
                name: companyData.name,
                address_line1: companyData.address1,
                address_line2: companyData.address2,
                address_city: companyData.city,
                address_state: companyData.state,
                address_zip: `${companyData.zipcode}`
              },
              file: massEmailWithContacts?.directMailTemplate?.body,
              color: true,
              address_placement: 'insert_blank_page'
            }
            const response = await lob.letters.create(addressDetails)
            data.push(response)
          } else {
            const addressDetails = {
              description: massEmailWithContacts?.directMailTemplate?.description,
              to: {
                name: [firstName, lastName].join(' ').trim() || email,
                address_line1: address1,
                address_line2: address2,
                address_city: city,
                address_state: state,
                address_zip: zip
              },
              from: {
                name: companyData.name,
                address_line1: companyData.address1,
                address_line2: companyData.address2,
                address_city: companyData.city,
                address_state: companyData.state,
                address_zip: `${companyData.zipcode}`
              },
              front: `${process.env.S3_BUCKET_BASE_URL}${massEmailWithContacts?.directMailTemplate?.postcardFront}`,
              back: `${process.env.S3_BUCKET_BASE_URL}${massEmailWithContacts?.directMailTemplate?.postcardBack}`
            }
            const response = await lob.postcards.create(addressDetails)
            data.push(response)
          }
        } catch (error) {
          console.log('error', error?.message || error)
        }
      }
    }

    return generalResponse(res, data, 'Send via lob successfully.', 'success', true, 200)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
