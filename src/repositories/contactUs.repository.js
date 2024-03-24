import { ContactUs } from '../models/contactUs'

const createContactUs = (data) => {
  return ContactUs.create(data)
}

export { createContactUs }
