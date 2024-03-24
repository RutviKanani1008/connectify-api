import pkg from 'rrule'
const { RRule } = pkg
const weeklyRule = {
  0: RRule.SU,
  1: RRule.MO,
  2: RRule.TU,
  3: RRule.WE,
  4: RRule.TH,
  5: RRule.FR,
  6: RRule.SA
}
export const getRecurringFrequency = (product) => {
  const { schedule, startDate, endDate, selectedWeekDay, selectedMonthDay, selectedYear } = product
  const reccuringObj = {}

  // Set frequency
  if (schedule === 'weekly') {
    reccuringObj.freq = RRule.WEEKLY
    if (selectedWeekDay !== null && selectedWeekDay !== undefined && selectedWeekDay.length) {
      const weekly = []
      selectedWeekDay.forEach((d) => weekly.push(weeklyRule[d]))
      reccuringObj.byweekday = weekly
    }
  }
  if (schedule === 'monthly') {
    reccuringObj.freq = RRule.MONTHLY
    if (selectedMonthDay !== null && selectedMonthDay !== undefined) {
      reccuringObj.bymonthday = [selectedMonthDay]
    }
  }
  if (schedule === 'yearly') {
    reccuringObj.freq = RRule.YEARLY
    if (selectedYear !== null && selectedYear !== undefined) {
      reccuringObj.bymonth = [new Date(selectedYear).getMonth()]
      reccuringObj.bymonthday = [new Date(selectedYear).getDate()]
    }
  }

  // set startDate
  if (startDate) {
    reccuringObj.dtstart = new Date(startDate)
  }

  // set endDate
  if (endDate) {
    reccuringObj.until = new Date(endDate)
  }
  reccuringObj.wkst = RRule.MO
  return new RRule(reccuringObj).toString()
}

export const getDatesFromRRule = (rrule) => {
  if (rrule) {
    return RRule.fromString(rrule).all()
  }
}
