const puppeteer = require('puppeteer')
const moment = require('moment')
const { getBookedDateList, getLastBookedId, setCache, churchDay, regDetails } = require('./utils')

const register = async (page, date) => {
  const formElement = await page.$$('#email')
  if (formElement.length === 0) {
    console.log(`Failed to navigate to form page page at ${new Date()}`)
    await page.screenshot({ path: `./screenshots/${+moment()}.png` });
    return false
  }

  const { email, mobile, name, dob, emiratesId, passport } = regDetails
  await page.type('#email', email)
  await page.type('#mobile', mobile)
  const bookedId = await getLastBookedId()
  await page.select('#identification_type', bookedId === 'passport' ? '1' : '2')
  await page.type('#name', name)
  await page.type('#identification', bookedId === 'passport' ? emiratesId : passport)
  await page.type('#birth_date', dob)
  const submitButton = await page.$$('button[type=submit]')
  await submitButton[0].click()
  await page.waitForTimeout(5000)
  const successDiv = await page.$x(`//*[@id="app"]/div/div[2]/div[3]/div/div[3]`)
  if (successDiv.length > 0) {
    const bookedDateList = await getBookedDateList()
    setCache('BOOKED_DATES', { list: [...bookedDateList, date] })
    setCache('PREVIOUS_BOOKED_ID', bookedId === 'passport' ? 'emiratesId' : 'passport', false)
    console.log(`Successfully registered to attend mass at ${new Date()}`)
  } else {
    await page.screenshot({ path: `./screenshots/${+moment()}.png` });
    console.log(`Failed to navigate to final thank you page at ${new Date()}`)
  }
}

const slotSelection = async (page, parentKey, childKey) => {
  const clickHandler = await page.$x(`//*[@id="app"]/div/div[2]/div[3]/div/form/div[1]/div[2]/div/div[2]/div[${parentKey}]/div[${childKey}]/div[3]/div`)
  await clickHandler[0].click()
  await page.waitForTimeout(2000)
}

const findMatchingDom = async (page) => {
  const bookedDateList = await getBookedDateList()
  const blocks = await page.$$('.bg-gray-100.border.border-gray-300.p-2')
  for (const key in blocks) {
    const innerText = await blocks[key].getProperty('innerText')
    const divText = await innerText.jsonValue()
    const textArray = divText.split(/\r?\n/)
    if (textArray[0].includes(churchDay) && !textArray[textArray.length - 1].includes('Not') && !bookedDateList.includes(textArray[0])) {
      return {
        date: textArray[0],
        parentKey: key > 7 ? 2 : 1, 
        childKey: key > 7 ? (parseInt(key) + 1) - 8 : parseInt(key) + 1
      }
    }
  }
  console.log(`No available slots for ${churchDay}. Scrap Date: ${new Date()}`)
  return {}
}

module.exports = async () => {
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.goto('https://access.saintmarysdubai.org', { waitUntil: 'networkidle2' })
    await page.waitForTimeout(2000)
    await page.select('#count', '1')
    await page.waitForTimeout(2000)
    const { date, parentKey, childKey } = await findMatchingDom(page)
    if (parentKey) {
      await slotSelection(page, parentKey, childKey)
      await register(page, date)
    }
  } catch (error) {
    console.log(`Error occurred while registering. Date: ${new Date()} Error: ${error}`)
  }
  await browser.close()
}