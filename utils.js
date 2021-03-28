require('dotenv').config()
const { promisify } = require('util')
const moment = require('moment-timezone')
const redis = require('redis')

const redisClient = redis.createClient({
  host: 'redis', // host assigned by docker-compose
  port: process.env.REDIS_PORT,
  no_ready_check: true,
  detect_buffers: true
})

redisClient.on('error', err => console.log(`Redis connect error: ${err}`))

const getAsync = promisify(redisClient.get).bind(redisClient)

const parseValue = async key => {
  const value = await getAsync(key)
  return !value ? '{}' : JSON.parse(value)
}

const getMonthKey = month => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return months.indexOf(month)
}

const getCache = (key, parse = true) => parse ? parseValue(key) : getAsync(key)

exports.setCache = (key, data, stringify = true) => redisClient.setex(key, +process.env.REDIS_TTL, stringify ? JSON.stringify(data) : data)

exports.churchDay = process.env.GO_TO_CHURCH_DAY

exports.regDetails = {
  email: process.env.REG_EMAIL,
  mobile: process.env.REG_MOBILE,
  name: process.env.REG_NAME,
  emiratesId: process.env.REG_EMIRATES_ID,
  passport: process.env.REG_PASSPORT,
  dob: process.env.REG_DOB
}

exports.enableService = /true/gi.test(process.env.ENABLE_SERVICE)

exports.getBookedDateList = async () => {
  const bookedDates =  await getCache('BOOKED_DATES')
  return bookedDates?.list || []
}

exports.getLastBookedId = async () => {
  const bookedId =  await getCache('PREVIOUS_BOOKED_ID', false)
  return !bookedId ? 'passport' : bookedId
}

exports.getFilteredBookedList = list => {
  const today = moment().utc()
  return list.filter(date => {
    const dateArr = date.split(' ')
    const bookedDate = moment([+process.env.CURRENT_YEAR, getMonthKey(dateArr[2]), +dateArr[1].replace(/\D+/g, '')])
    const currentDate = today.tz('Asia/Dubai')
    if (bookedDate.diff(currentDate, 'days') >= 0) {
      return date
    }
  })
}

