const { relativeTimeRounding } = require('moment')
const cron = require('node-cron')
const scrap = require('./scrap')
const { getBookedDateList, setCache, enableService, getFilteredBookedList } = require('./utils')

/* Start scrapping process */
const init = async () => {
  const bookedDateList = await getBookedDateList()
  if ([0, 1].includes(bookedDateList.length)) scrap()
}

/* Discard old booking based on current date */
const discardOldBookings = async () => {
  const bookedDateList = await getBookedDateList()
  const updatedCache = { list: getFilteredBookedList(bookedDateList) }
  setCache('BOOKED_DATES', updatedCache)
}

if (enableService) {
  /* Cron set for every 1 hour to start the process */
  cron.schedule('0 * * * *', () => {
    console.log(`Scraping initiated at ${new Date()}`)
    init()
  })

  /* Cron set for every 6 hours to discard old dates */
  cron.schedule('0 */6 * * *', () => {
    console.log(`Discard old dates initiated at ${new Date()}`)
    discardOldBookings()
  })
}