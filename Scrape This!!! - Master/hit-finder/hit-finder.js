/* globals chrome $ */

const finderDB = {}
const reviewsDB = {}
const includeAlerted = []
const includePushbulleted = []
//const autoPandaStorage = {}

let totalScans = 0
let pageRequestErrors = 0
let alarm = false
let alarmAudio = null
let alarmRunning = false
let finderTimeout = null

const storage = {}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

chrome.storage.local.get([`hitFinder`, `blockList`, `includeList`, `autoPandaIncludeList`, `reviews`], (keys) => {
  for (const key of Object.keys(keys)) {
    storage[key] = keys[key]
  }

  finderUpdate()
  blockListUpdate()
  includeListUpdate()
  autoPandaIncludeListUpdate()

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.reviews) {
      storage.reviews = changes.reviews.newValue
      updateRequesterReviews(reviewsDB)
    }
  })
})

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const audioAP = new window.Audio()
      audioAP.src = `/media/audio/CRB.ogg`

const audioCensor = new window.Audio()
      audioCensor.src = `/media/audio/censorOgg.ogg`

const test = document.getElementById('test');
test.onclick = function() {
    console.log('Your button is working LLL!');
    audioAP.play();
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function finderApply () {
  for (const prop in storage.hitFinder) {
    storage.hitFinder[prop] = document.getElementById(prop)[typeof (storage.hitFinder[prop]) === `boolean` ? `checked` : `value`]
  }

  chrome.storage.local.set({
    hitFinder: storage.hitFinder
  })
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function finderUpdate () {
  for (const prop in storage.hitFinder) {
    document.getElementById(prop)[typeof (storage.hitFinder[prop]) === `boolean` ? `checked` : `value`] = storage.hitFinder[prop]
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function finderToggle () {
  const active = document.getElementById(`find`).classList.toggle(`active`)

  if (active) {
    finderFetch()
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function finderFetchURL () {
  const url = new window.URL(`https://worker.mturk.com/`)
  url.searchParams.append(`sort`, storage.hitFinder[`filter-sort`])
  url.searchParams.append(`page_size`, storage.hitFinder[`filter-page-size`])
  url.searchParams.append(`filters[masters]`, storage.hitFinder[`filter-masters`])
  url.searchParams.append(`filters[qualified]`, storage.hitFinder[`filter-qualified`])
  url.searchParams.append(`filters[min_reward]`, storage.hitFinder[`filter-min-reward`])
  url.searchParams.append(`filters[search_term]`, storage.hitFinder[`filter-search-term`])
  url.searchParams.append(`format`, `json`)

  return url
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function finderNextFetch () {
  const [lastScan] = arguments

  const speed = Number(storage.hitFinder[`speed`])

  if (speed > 0) {
    const delay = lastScan + speed - window.performance.now()
    finderTimeout = setTimeout(finderFetch, delay)
  } else {
    finderToggle()
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function finderLoggedOut () {
  finderToggle()
  window.textToSpeech(`Oh SHIT you're logged out!`, `Google US English`)
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

async function finderFetch () {
  const start = window.performance.now()

  clearTimeout(finderTimeout)

  if (!document.getElementById(`find`).classList.contains(`active`)) {
    return
  }

  try {
    const response = await window.fetch(finderFetchURL(), {
      credentials: `include`
    })

    if (~response.url.indexOf(`https://worker.mturk.com`)) {
      if (response.ok) {
        await finderProcess(await response.json())
      }
      if (response.status === 429) {
        document.getElementById(`page-request-errors`).textContent = ++pageRequestErrors
      }

      finderNextFetch(start)
    } else {
      finderLoggedOut()
    }
  } catch (error) {
    console.error(error)
    finderNextFetch(start)
  } finally {
    document.getElementById(`total-scans`).textContent = ++totalScans
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function finderProcess () {
  return new Promise(async (resolve) => {
    const [json] = arguments

    
    const recentFragment = document.createDocumentFragment()
    const loggedFragment = document.createDocumentFragment()
    const autoPandaLoggedFragment = document.createDocumentFragment()
    const includedFragment = document.createDocumentFragment()
   // const autoPandaIncludedFragment = document.createDocumentFragment()
    let sound = false
    let blocked = 0

    reviewsForFinder([...new Set(json.results.map((o) => o.requester_id))])

    for (const hit of json.results) {
      if (blockListed(hit) || minimumAvailable(hit) || minimumRequesterRating(hit)) {
        blocked++
        continue
      }

      const nonqualled = (hit.caller_meets_requirements) !== true;
      
      const included = includeListed(hit) // Template
     // const dollarFilter = amount_in_dollars.monetary_reward;
      //const biggerFilter = ;
      const autoPandaIncluded = autoPandaIncludeListed(hit)

      const requesterReviewClass = await requesterReviewGetClass(hit.requester_id)
      const trackerRequester = await hitTrackerMatchObject(`requester_id`, hit.requester_id)
      const trackerTitle = await hitTrackerMatchObject(`title`, hit.title)
      const hfOptions = await StorageGetKey(`hitFinder`);

      const row = document.createElement(`tr`)
     // const pandaLink = window.open("https://worker.mturk.com/requesters/PandaCrazyAdd/projects?JRGID=${hit.hit_set_id}&JRRName=${hit.requester_name}&JRRID=${hit.requester_id}&JRTitle=${hit.hit_set_id}&JRReward=${hit.monetary_reward.amount_in_dollars}&secondsOffEdit:60");

function hasTests() {
 // const [hit] = arguments
  if (hit.has_test === true) {
   row.classList.add(`test`);
  }
}
      if ($('APO-E:checked').length > 0){hasTests();} 

     /*
      function moneyFilterTen(){
      if ( biggerFilter => 10.00) {
        // pandaLink();  This was a test to see if Panda Crazy would catch it... it did.
          audioAP.play();}
      }

      if ($('#APO10:checked').length > 0) {moneyFilterTen();}

      function notEnough() {
        // const [hit] = arguments
         if (hit.amount_in_dollars >= 0.05) {
           row.classList.add(`test`);
         }
       }
        if ($('APO-A:checked').length > 0){notEnough();} 

        function checkRequester() {
          // const [hit] = arguments
           if (hit.requester_name !== 'Pinterest') {
             row.classList.add(`test`);
           }
         }
          if ($('APO-B:checked').length > 0){checkRequester();} 
*/
      if (included) {
        row.classList.add(`included`)
       // audioAP.play();

      }

      if (hfOptions[`display-colored-rows`]) {
        row.classList.add(`table-${requesterReviewClass}`)
      }

      if (nonqualled) {
        row.classList.add(`nonqualled`);
        //audioCensor.play();
      }

      if (autoPandaIncluded) {
        row.classList.add('autoPandaIncluded')
      }

      const actions = document.createElement(`td`)
      actions.className = `w-1`
      row.appendChild(actions)

      const actionsContainer = document.createElement(`div`)
      actionsContainer.className = `btn-group`
      actions.appendChild(actionsContainer)

      const hitInfo = document.createElement(`button`)
      hitInfo.type = `button`
      hitInfo.className = `btn btn-sm btn-primary`
      hitInfo.dataset.toggle = `modal`
      hitInfo.dataset.target = `#hit-info-modal`
      hitInfo.dataset.key = hit.hit_set_id
      actionsContainer.appendChild(hitInfo)

      const hitInfoIcon = document.createElement(`i`)
      hitInfoIcon.className = `fa fa-info-circle`
      hitInfo.appendChild(hitInfoIcon)

      const time = document.createElement(`td`)
      time.className = `w-1`
      time.textContent = timeNow()
      row.appendChild(time)

      const requester = document.createElement(`td`)
      row.appendChild(requester)

      const requesterContainer = document.createElement(`div`)
      requesterContainer.className = `btn-group`
      requester.appendChild(requesterContainer)

      const requesterReviews = document.createElement(`button`)
      requesterReviews.className = `btn btn-sm btn-${hit.requester_id} btn-${requesterReviewClass}`
      requesterReviews.dataset.toggle = `modal`
      requesterReviews.dataset.target = `#requester-review-modal`
      requesterReviews.dataset.key = hit.requester_id
      requesterContainer.appendChild(requesterReviews)

      const requesterReviewsIcon = document.createElement(`i`)
      requesterReviewsIcon.className = `fa fa-user`
      requesterReviews.appendChild(requesterReviewsIcon)

      const requesterTracker = document.createElement(`button`)
      requesterTracker.type = `button`
      requesterTracker.className = `btn btn-sm btn-${trackerRequester.color} mr-1`
      requesterContainer.appendChild(requesterTracker)

      const requesterTrackerIcon = document.createElement(`i`)
      requesterTrackerIcon.className = `fa fa-${trackerRequester.icon}`
      requesterTracker.appendChild(requesterTrackerIcon)

      const requesterLink = document.createElement(`a`)
      requesterLink.href = `https://worker.mturk.com/requesters/${hit.requester_id}/projects`
      requesterLink.target = `_blank`
      requesterLink.textContent = hit.requester_name
      requesterContainer.appendChild(requesterLink)

      const title = document.createElement(`td`)
      row.appendChild(title)

      const titleContainer = document.createElement(`div`)
      titleContainer.className = `btn-group`
      title.appendChild(titleContainer)

      const sharer = document.createElement(`button`)
      sharer.type = `button`
      sharer.className = `btn btn-sm btn-primary`
      sharer.dataset.toggle = `modal`
      sharer.dataset.target = `#hit-sharer-modal`
      sharer.dataset.key = hit.hit_set_id
      titleContainer.appendChild(sharer)

      const shareIcon = document.createElement(`i`)
      shareIcon.className = `fa fa-share`
      sharer.appendChild(shareIcon)

      const titleTracker = document.createElement(`button`)
      titleTracker.type = `button`
      titleTracker.className = `btn btn-sm btn-${trackerTitle.color} mr-1`
      titleContainer.appendChild(titleTracker)

      const titleTrackerIcon = document.createElement(`i`)
      titleTrackerIcon.className = `fa fa-${trackerTitle.icon}`
      titleTracker.appendChild(titleTrackerIcon)

      const titleLink = document.createElement(`a`)
      titleLink.href = `https://worker.mturk.com/projects/${hit.hit_set_id}/tasks`
      titleLink.target = `_blank`
      titleLink.textContent = hit.title
      titleContainer.appendChild(titleLink)

      const available = document.createElement(`td`)
      available.className = `text-center w-1`
      available.textContent = hit.assignable_hits_count
      row.appendChild(available)
     
      
      const reward = document.createElement(`td`)
      reward.className = `text-center`
      row.appendChild(reward)

      const rewardLink = document.createElement(`a`)
      rewardLink.href = `https://worker.mturk.com/projects/${hit.hit_set_id}/tasks/accept_random`
      rewardLink.target = `_blank`
      rewardLink.textContent = toMoneyString(hit.monetary_reward.amount_in_dollars)
      reward.appendChild(rewardLink)

      const masters = document.createElement(`td`)
      masters.className = `text-center w-1`
      masters.textContent = hit.project_requirements.filter((o) => [`2F1QJWKUDD8XADTFD2Q0G6UTO95ALH`, `2NDP2L92HECWY8NS8H3CK0CP5L9GHO`, `21VZU98JHSTLZ5BPP4A9NOBJEK3DPG`].includes(o.qualification_type_id)).length > 0 ? `Y` : `N`
      row.appendChild(masters)

      const pandaContainer = document.createElement(`td`)
      pandaContainer.className = `btn-group`
      row.appendChild(pandaContainer)
     
      const pandaBtnP = document.createElement(`a`)
      pandaBtnP.type = `button`
      pandaBtnP.textContent = `P`// Title row button
      pandaBtnP.id = `Damn`
      pandaBtnP.className = `btn btn-sm btn-${requesterReviewClass}`
      pandaBtnP.href = `https://worker.mturk.com/requesters/PandaCrazyAdd/projects?JRGID=${hit.hit_set_id}&JRRName=${hit.requester_name}&JRRID=${hit.requester_id}&JRTitle=${hit.title}&JRReward=${toMoneyString(hit.monetary_reward.amount_in_dollars)}&secondsOffEdit:600`
      pandaBtnP.target = `_blank`
      pandaContainer.appendChild(pandaBtnP)

      const pandaBtnO = document.createElement(`a`)
      pandaBtnO.type = `button`
      pandaBtnO.textContent = `O`
      pandaBtnO.id = `It`  
      //pandaBtnO.className = `btn btn-sm btn-${hit.requester_id} btn-${requesterReviewClass}`
      pandaBtnO.className = `btn btn-sm btn-${requesterReviewClass}`
      pandaBtnO.href = `https://worker.mturk.com/requesters/PandaCrazyOnceJob/projects?JRGID=${hit.hit_set_id}&JRRName=${hit.requester_name}&JRRID=${hit.requester_id}&JRTitle=${hit.title}&JRReward=${toMoneyString(hit.monetary_reward.amount_in_dollars)}`
      pandaBtnO.target = `_blank`
      //titleContainer.appendChild(pandaBtnO)
      pandaContainer.appendChild(pandaBtnO)

      const pandaBtnS = document.createElement(`a`)
      pandaBtnS.type = `button`
      pandaBtnS.textContent = `S`
      pandaBtnS.id = `Works`  
      pandaBtnS.className = `btn btn-sm btn-${requesterReviewClass}`
      pandaBtnS.href = `https://worker.mturk.com/requesters/PandaCrazySearchJob/projects?JRGID=${hit.hit_set_id}&JRRName=${hit.requester_name}&JRRID=${hit.requester_id}&JRTitle=${hit.title}&JRReward=${toMoneyString(hit.monetary_reward.amount_in_dollars)}`
      pandaBtnS.target = `_blank`
      pandaContainer.appendChild(pandaBtnS)

      const recentRow = toggleColumns(row.cloneNode(true), `recent`)
      recentRow.id = `recent-${hit.hit_set_id}`

      const autoPandaLoggedRow = toggleColumns(row.cloneNode(true), `autoPandaLogged`)
      autoPandaLoggedRow.id = `autoPandaLogged-${hit.hit_set_id}`
      
      const loggedRow = toggleColumns(row.cloneNode(true), `logged`)
      loggedRow.id = `logged-${hit.hit_set_id}`

      const includedRow = toggleColumns(row.cloneNode(true), `included`)
      includedRow.id = `included-${hit.hit_set_id}`

      recentFragment.appendChild(recentRow)

      const loggedElement = document.getElementById(`logged-${hit.hit_set_id}`)
      if (loggedElement) loggedElement.replaceWith(loggedRow)
      else loggedFragment.appendChild(loggedRow)

      if (!finderDB[hit.hit_set_id]) {
        sound = true
        finderDB[hit.hit_set_id] = hit
      }

      if (included && !includeAlerted.includes(hit.hit_set_id)) {
        includedAlert(included, hit)
        document.getElementById(`include-list-hits-card`).style.display = ``
        includedFragment.appendChild(includedRow)
      }
    }

    toggleColumns(document.getElementById(`recent-hits-thead`).children[0], `recent`)
    toggleColumns(document.getElementById(`logged-hits-thead`).children[0], `logged`)
    toggleColumns(document.getElementById(`autoPandaLogged-hits-thead`).children[0], `autoPandaLogged`)
    removeChildren(document.getElementById(`recent-hits-tbody`))

    document.getElementById(`recent-hits-tbody`).insertBefore(recentFragment, document.getElementById(`recent-hits-tbody`).firstChild)
    document.getElementById(`logged-hits-tbody`).insertBefore(loggedFragment, document.getElementById(`logged-hits-tbody`).firstChild)
    document.getElementById(`autoPandaLogged-hits-tbody`).insertBefore(autoPandaLoggedFragment, document.getElementById(`autoPandaLogged-hits-tbody`).firstchild)
    document.getElementById(`include-list-hits-tbody`).insertBefore(includedFragment, document.getElementById(`include-list-hits-tbody`).firstChild)

    if (sound && storage.hitFinder[`alert-new-sound`] !== `none`) {
      const audio = new window.Audio()
      audio.src = `/media/audio/${storage.hitFinder[`alert-new-sound`]}.ogg`
      audio.play()
    }

    document.getElementById(`hits-found`).textContent = `Found: ${json.num_results} | Blocked: ${blocked} | ${new Date().toLocaleTimeString()}`
    document.getElementById(`hits-logged`).textContent = document.getElementById(`logged-hits-tbody`).children.length
   // document.getElementById(`autoPandaLogged-hits-logged`).textContent = document.getElementById(`autoPandaLogged-hits-tbody`).children.length

    resolve()
  })
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function moneyFilterTen(){
  if ( biggerFilter > 10.00) {
    // pandaLink();  This was a test to see if Panda Crazy would catch it... it did.
      audioAP.play();
    }
}

  if ($('#APO10:checked').length > 0) {moneyFilterTen();}

function notEnough() {
    // const [hit] = arguments
  if (hit.monetary_reward.amount_in_dollars > 0.05) {
       td.classList.add(`test`);
  }
}
  //  if ($('APO-A:checked').length > 0){notEnough();} 

function checkRequester() {
      // const [hit] = arguments
  if (hit.requester_name === 'Pinterest') {
         row.classList.add(`test`);
  }
}
      if ($('APO-B:checked').length > 0){checkRequester();} 

      
//function hasTest() {
        // const [hit] = arguments
  //  if (has_test) {
  //   row.classList.add(`test`);
  //  }
// }
//       if ($('APO-C:checked').length > 0){hasTest();} 
        
function autoPandaSi(){
  if (hit.monetary_reward.amount_in_dollars > 0.01) {
    row.classList.add(`test`);
    audioAP.play();}
      /*
      (hit.requester_name ) === 'Brian Dolan') ||
      (hit.requester_name ) === 'GooseCoins') ||
      (hit.requester_name ) === 'VacationrentalAPI')) {*/
     //   pew.play();}
     if ($('#APO-3:checked').length > 0){autoPandaSi();}
      }
      
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

 // }{window.open(hit.pandlink);});}
/*
function AutoPandaOnce3(){
  if ((hit_log.reward >= '$3.00') && // {window.open(hit.pandlink);});}
      (hit.caller_meets_requirements === true) &&
      (hit_log.reqname.replace(/"/g, "&quot;" ) !== 'Brian Dolan') &&
      (hit_log.reqname.replace(/"/g, "&quot;" ) !== 'GooseCoins') &&
      (hit_log.reqname.replace(/"/g, "&quot;" ) !== 'VacationrentalAPI')){PC_Once(); pew.play();}
  }

  if ($('#APO3:checked').length > 0){AutoPandaOnce3();}

function AutoPandaOnce5(){
  if ((hit_log.reward >= '$5.00') &&
      (hit.caller_meets_requirements === true) &&
      (hit_log.reqname.replace(/"/g, "&quot;" ) !== 'Brian Dolan') &&
      (hit_log.reqname.replace(/"/g, "&quot;" ) !== 'GooseCoins') &&
      (hit_log.reqname.replace(/"/g, "&quot;" ) !== 'VacationrentalAPI')){PC_Once(); pew.play();}
  }

  if ($('#APO5:checked').length > 0){AutoPandaOnce5();}
  */

function minimumAvailable () {
  const [hit] = arguments

  if (hit.assignable_hits_count < Number(storage.hitFinder[`filter-min-available`])) {
    return true

  }

  return false
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Function to turn the boarder red if not qualled.--------------------------------------------------------------------------------------------------------------------
function notAvailable () {
  const [hit] = arguments
  if (hit.caller_meets_requirements === false) {
     censorOgg.play()
  }
}
if ($('#APO-D:checked').length > 0){notAvailable();}





function DamnIt(){
  if (hit.caller_meets_requirements === false){
    censorOgg.play();}
}
if ($('#APO-DI:checked').length > 0){DamnIt();}

  
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function minimumRequesterRating () {
  const [hit] = arguments

  const ratingAverage = requesterRatingAverage(hit.requester_id)

  if (ratingAverage > 0 && ratingAverage < Number(storage.hitFinder[`filter-min-requester-rating`])) {
    return true
  }

  return false
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function blockListed (hit) {
  for (const match in storage.blockList) {
    const bl = storage.blockList[match]
    if (bl.strict) {
      const compared = strictCompare(match, [hit.hit_set_id, hit.requester_id, hit.requester_name, hit.title])
      if (compared === true) {
        return true
      }
    } else {
      const compared = looseCompare(match, [hit.hit_set_id, hit.requester_id, hit.requester_name, hit.title])
      if (compared === true) {
        return true
      }
    }
  }
  return false
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function includeListed (hit) {
  for (const match in storage.includeList) {
    const il = storage.includeList[match]
    if (il.strict) {
      const compared = strictCompare(match, [hit.hit_set_id, hit.requester_id, hit.requester_name, hit.title])
      if (compared === true) {
        return il
      }
    } else {
      const compared = looseCompare(match, [hit.hit_set_id, hit.requester_id, hit.requester_name, hit.title])
      if (compared === true) {
        return il
      }
    }
  }
  return false
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Trying to make a qual list

function autoPandaIncludeListed (hit) {
      for (const match in storage.autoPandaIncludeList) {
        const al = storage.autoPandaIncludeList[match]
        if (al.strict) {
          const compared = strictCompare(match, [hit.hit_set_id, hit.requester_id, hit.requester_name, hit.title])
      if (compared === false) {
        return al
      }

    } else {
      const compared = looseCompare(match, [hit.hit_set_id, hit.requester_id, hit.requester_name, hit.title])
      if (compared === true) {
        return al
      }
    }
  }
  return false
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



function AutoPandaOnce1(){
   if (hit.monetary_reward.amount_in_dollars >= '$0.10'){
       //(hit.project_requirements === true)){
       alert("It worked");}
}

   if ($('#APO-1:checked').length > 0){AutoPandaOnce1();}

function includedAlert (il, hit) {
  const alerted = includeAlerted.includes(hit.hit_set_id)
  const pushbulleted = includePushbulleted.includes(hit.hit_set_id)

  if (alerted) {
    return
  }

  if (alarm && il.alarm === true) {
    alarmSound()
  }

  if (il.sound === true) {
    if (storage.hitFinder[`alert-include-sound`] === `voice`) {
      window.textToSpeech(`${il.name}`, `Google US English`) 
      
    } else {
      const audio = new window.Audio()
      audio.src = `/media/audio/${storage.hitFinder[`alert-include-sound`]}.ogg`
      audio.play()
    }
  }

  if (il.notification) {
    try {
      chrome.notifications.create(hit.hit_set_id, {
        type: `list`,
        message: `Match`,
        title: `Hit found!`,
        iconUrl: `/media/icon_128.png`,
        items: [
          { title: `Title`, message: hit.title },
          { title: `Requester`, message: hit.requester_name },
          { title: `Reward`, message: toMoneyString(hit.monetary_reward.amount_in_dollars) },
          { title: `Available`, message: hit.assignable_hits_count.toString() },
          { title: `OW`, message: hit.requester_id }
        ],
        ...(window.chrome ? { buttons: [{ title: `Preview` }, { title: `Accept` }, {title: `Panda`}, {title: `Once`}] } : null)
      })
    } catch (error) {
      chrome.notifications.create(hit.hit_set_id, {
        type: `list`,
        message: `Match`,
        title: `Hit found!`,
        iconUrl: `/media/icon_128.png`,
        items: [
          { title: `Title`, message: hit.title },
          { title: `Requester`, message: hit.requester_name },
          { title: `Reward`, message: toMoneyString(hit.monetary_reward.amount_in_dollars) },
          { title: `Available`, message: hit.assignable_hits_count.toString() },
          { title: `OW`, message: hit.requester_id }
        ],
      })
    }
  }

  if (il.pushbullet && storage.hitFinder[`alert-pushbullet-state`] === `on` && pushbulleted === false) {
    $.ajax({
      type: `POST`,
      url: `https://api.pushbullet.com/v2/pushes`,
      headers: {
        Authorization: `Bearer ${storage.hitFinder[`alert-pushbullet-token`]}`
      },
      data: {
        type: `note`,
        title: `Include list match found!`,
        body: `Title: ${hit.title}\nReq: ${hit.requester_name}\nReward: ${toMoneyString(hit.monetary_reward.amount_in_dollars)}\nAvail: ${hit.assignable_hits_count}`
      }
    })

    includePushbulleted.unshift(hit.hit_set_id)

    setTimeout(() => {
      includePushbulleted.pop()
    }, 900000)
  }

  includeAlerted.unshift(hit.hit_set_id)

  setTimeout(() => {
    includeAlerted.pop()
  }, Number(storage.hitFinder[`alert-include-delay`]) * 60000)
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function strictCompare (string, array) {
  for (const value of array) {
    if (string === value) {
      return true
    }
  }
  return false
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function looseCompare (string, array) {
  for (const value of array) {
    if (value.toLowerCase().indexOf(string.toLowerCase()) !== -1) {
      return true
    }
  }
  return false
}

function goRed () {

}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function alarmSound () {
  if (!alarm || alarmRunning) {
    return
  }

  alarmAudio = new window.Audio()
  alarmAudio.src = `/media/audio/alarm.ogg`
  alarmAudio.loop = true
  alarmAudio.play()

  alarmRunning = true
}


// ------------------------------------------------------------------------------------Block List ----------------------------------------------------------------------------------------------

function blockListUpdate () {
  const sorted = Object.keys(storage.blockList).map((currentValue) => {
    storage.blockList[currentValue].term = currentValue
    return storage.blockList[currentValue]
  }).sort((a, b) => a.name.localeCompare(b.name, `en`, { numeric: true }))

  const body = document.getElementById(`block-list-modal`).getElementsByClassName(`modal-body`)[0]

  while (body.firstChild) {
    body.removeChild(body.firstChild)
  }

  body.appendChild((() => {
    const fragment = document.createDocumentFragment()

    for (const bl of sorted) {
      const button = document.createElement(`button`)
      button.type = `button`
      button.className = `btn btn-sm btn-danger ml-1 my-1 bl-btn`
      button.textContent = bl.name
      button.dataset.toggle = `modal`
      button.dataset.target = `#block-list-edit-modal`
      button.dataset.key = bl.match
      fragment.appendChild(button)
    }

    return fragment
  })())

  for (const key in finderDB) {
    const hit = finderDB[key]

    if (blockListed(hit)) {
      const recent = document.getElementById(`recent-${hit.hit_set_id}`)
      const logged = document.getElementById(`logged-${hit.hit_set_id}`)
      const included = document.getElementById(`included-${hit.hit_set_id}`)
      const autoPandaLogged = document.getElementById(`autoPandaLogged-${hit.hit_set_id}`)

      if (recent) recent.parentNode.removeChild(recent)
      if (logged) logged.parentNode.removeChild(logged)
      if (included) included.parentNode.removeChild(included)
      if (autoPandaLogged) autoPandaLogged.parentNode.removeChild(autoPandaLogged)

      delete finderDB[key]
    }
  }

  chrome.storage.local.set({
    blockList: storage.blockList
  })
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function includeListUpdate () {
  const sorted = Object.keys(storage.includeList).map((currentValue) => {
    storage.includeList[currentValue].match = currentValue
    return storage.includeList[currentValue]
  }).sort((a, b) => a.name.localeCompare(b.name, `en`, { numeric: true }))

  const body = document.getElementById(`include-list-modal`).getElementsByClassName(`modal-body`)[0]

  while (body.firstChild) {
    body.removeChild(body.firstChild)
  }



  body.appendChild((() => {
    const fragment = document.createDocumentFragment()

    for (const il of sorted) {
      const button = document.createElement(`button`)
      button.type = `button`
      button.className = `btn btn-sm btn-success ml-1 my-1 il-btn`
      button.textContent = il.name
      button.dataset.toggle = `modal`
      button.dataset.target = `#include-list-edit-modal`
      button.dataset.key = il.match
      fragment.appendChild(button)
    }

    return fragment
  })())

  for (const key in finderDB) {
    const hit = finderDB[key]

    const element = document.getElementById(`logged-${hit.hit_set_id}`)

    if (element) {
      if (includeListed(hit)) {
        element.classList.add(`included`)
      } else {
        element.classList.remove(`included`)
      }
    }
  }

  chrome.storage.local.set({
    includeList: storage.includeList

  })
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function autoPandaIncludeListUpdate () {
  const sorted = Object.keys(storage.autoPandaIncludeList).map((currentValue) => {
    storage.autoPandaf[currentValue].match = currentValue
    return storage.autoPandaIncludeList[currentValue]
  }).sort((a, b) => a.name.localeCompare(b.name, `en`, { numeric: true }))

  const body = document.getElementById(`autoPandaInclude-list-modal`).getElementsByClassName(`modal-body`)[0]

  while (body.firstChild) {
    body.removeChild(body.firstChild)
  }




  body.appendChild((() => {
    const fragment = document.createDocumentFragment()

    for (const al of sorted) {
      const button = document.createElement(`button`)
      button.type = `button`
      button.className = `btn btn-sm btn-success ml-1 my-1 il-btn`
      button.textContent = al.name
      button.dataset.toggle = `modal`
      button.dataset.target = `#autoPandaInclude-list-edit-modal`
      button.dataset.key = al.match
      fragment.appendChild(button)
    }

    return fragment
  })())

  for (const key in finderDB) {
    const hit = finderDB[key]

    const element = document.getElementById(`autoPandaLogged-${hit.hit_set_id}`)

    if (element) {
      if (autoPandaIncludeListed(hit)) {
        element.classList.add(`autoPandaIncluded`)
      } else {
        element.classList.remove(`autoPandaIncluded`)
      }
    }
  }

  chrome.storage.local.set({
    autoPandaIncludeList: storage.autoPandaIncludeList
  })
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function timeNow () {
  const date = new Date()
  let hours = date.getHours()
  let minutes = date.getMinutes()
  let ampm = hours >= 12 ? `p` : `a`
  hours = hours % 12
  hours = hours || 12
  minutes = minutes < 10 ? `0` + minutes : minutes
  return `${hours}:${minutes}${ampm}`
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function toggleColumns () {
  const [element, type] = arguments

  element.children[1].style.display = storage.hitFinder[`display-${type}-column-time`] ? `` : `none`
  element.children[2].style.display = storage.hitFinder[`display-${type}-column-requester`] ? `` : `none`
  element.children[3].style.display = storage.hitFinder[`display-${type}-column-title`] ? `` : `none`
  element.children[4].style.display = storage.hitFinder[`display-${type}-column-available`] ? `` : `none`
  element.children[5].style.display = storage.hitFinder[`display-${type}-column-reward`] ? `` : `none`
  element.children[6].style.display = storage.hitFinder[`display-${type}-column-masters`] ? `` : `none`

  return element
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function removeChildren () {
  const [element] = arguments

  while (element.firstChild) {
    element.removeChild(element.firstChild)
  }
}

// ------------------------------------------------------------------------- Reward Conversion --------------------------------------------------------------------------------------------------
function toMoneyString () {
  const [string] = arguments
  return `$${Number(string).toFixed(2).toLocaleString(`en-US`, { minimumFractionDigits: 2 })}`
}

// -------------------------------------------------------------------------- Duration Conversion -------------------------------------------------------------------------------------------------

function toDurationString () {
  const [string] = arguments

  let seconds = string
  let minute = Math.floor(seconds / 60)
  seconds = seconds % 60
  let hour = Math.floor(minute / 60)
  minute = minute % 60
  let day = Math.floor(hour / 24)
  hour = hour % 24

  let durationString = ``

  if (day > 0) durationString += `${day} day${day > 1 ? `s` : ``} `
  if (hour > 0) durationString += `${hour} hour${hour > 1 ? `s` : ``} `
  if (minute > 0) durationString += `${minute} minute${minute > 1 ? `s` : ``}`

  return durationString.trim()
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

chrome.notifications.onButtonClicked.addListener((id, btn) => {

  if (btn === 0) {
    window.open(`https://worker.mturk.com/projects/${id}/tasks`)
  }
  if (btn === 1) {
      window.open(`https://worker.mturk.com/projects/${id}/tasks/accept_random`);
    }

  chrome.notifications.clear(id)
})

// ------------------------------------------------------------------ Reviews Section -----------------------------------------------------------------------------------------------------------

function getReviewsDB() {
  return new Promise(resolve => {
    const open = indexedDB.open(`requesterReviewsDB`, 1);

    open.onsuccess = event => {
      resolve(event.target.result);
    };

    open.onupgradeneeded = event => {
      const db = event.target.result;
      db.createObjectStore(`requester`, { keyPath: `id` });
      resolve(db);
    };
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function getReviews(rids) {
  return new Promise(async resolve => {
    const db = await getReviewsDB();
    const transaction = db.transaction([`requester`], `readonly`);
    const objectStore = transaction.objectStore(`requester`);

    const reviews = {};

    rids.forEach(rid => {
      objectStore.get(rid).onsuccess = event => {
        reviews[rid] = event.target.result || { id: rid, time: 0 };
      };
    });

    transaction.oncomplete = () => resolve(reviews);
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

async function saveReviews(reviews) {
  const db = await getReviewsDB();
  const transaction = db.transaction([`requester`], `readwrite`);
  const objectStore = transaction.objectStore(`requester`);
  const time = new Date().getTime();

  Object.keys(reviews).forEach(rid => {
    const review = reviews[rid];
    review.id = rid;
    review.time = time;
    objectStore.put(review);
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function updateCheck(reviews) {
  return new Promise(async resolve => {
    const time = new Date().getTime() - 1800000;
    const update = Object.keys(reviews).some(rid => reviews[rid].time < time);
    resolve(update);
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function formatResponse(response) {
  return new Promise(async resolve => {
    const json = await response.json();

    if (response.url.includes(`https://api.turkopticon.info/`)) {
      const formattedTO2 = json.data.reduce((readable, requester) => {
        const { aggregates } = requester.attributes;
        const reviews = Object.keys(aggregates).reduce((review, time) => {
          const {
            broken,
            comm,
            pending,
            recommend,
            rejected,
            reward,
            tos
          } = aggregates[time];

          const reformatted = {
            tos: tos[0],
            broken: broken[0],
            rejected: rejected[0],
            pending:
              pending > 0 ? `${(pending / 86400).toFixed(2)} days` : null,
            hourly:
              reward[1] > 0 ? (reward[0] / reward[1] * 3600).toFixed(2) : null,
            comm:
              comm[1] > 0 ? `${Math.round(comm[0] / comm[1] * 100)}%` : null,
            recommend:
              recommend[1] > 0
                ? `${Math.round(recommend[0] / recommend[1] * 100)}%`
                : null
          };

          return { ...review, [time]: reformatted };
        }, {});

        return { ...readable, [requester.id]: reviews };
      }, {});

      resolve(formattedTO2);
    } else {
      resolve(json);
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function fetchReviews(site, url) {
  return new Promise(async resolve => {
    try {
      const response = await Fetch(url, undefined, 5000);
      const json = response.ok ? await formatResponse(response) : null;
      resolve({ site, json });
    } catch (error) {
      resolve({ site, json: null });
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function averageReviews(reviews) {
  return new Promise(async resolve => {
    const {
      requesterReviewsTurkerview,
      requesterReviewsTurkopticon,
      requesterReviewsTurkopticon2
    } = await StorageGetKey(`options`);

    const avg = Object.keys(reviews).reduce((obj, rid) => {
      const review = reviews[rid];

      if (review) {
        const tv = requesterReviewsTurkerview ? review.turkerview : null;
        const to = requesterReviewsTurkopticon ? review.turkopticon : null;
        const to2 = requesterReviewsTurkopticon2 ? review.turkopticon2 : null;

        const tvPay = tv ? tv.ratings.pay : null;
        const tvHrly = tv ? tv.ratings.hourly / 3 : null;
        const toPay = to ? to.attrs.pay : null;
        const to2Pay = to2 ? to2.all.hourly / 3 : null;

        if (tvPay || tvHrly || toPay || to2Pay) {
          const average = [tvPay, tvHrly, toPay, to2Pay]
            .filter(pay => pay !== null)
            .map((pay, i, filtered) => Number(pay) / filtered.length)
            .reduce((a, b) => a + b);
          review.average = average;
        }
      }

      if (!review.average) review.average = 0;

      return { ...obj, [rid]: review };
    }, {});

    resolve(avg);
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function updateReviews(reviews) {
  return new Promise(async resolve => {
    const rids = Object.keys(reviews);

    const updates = await Promise.all([
      fetchReviews(
        `turkerview`,
        `https://api.turkerview.com/api/v1/requesters/?ids=${rids}`
      ),
      fetchReviews(
        `turkopticon`,
        `https://turkopticon.ucsd.edu/api/multi-attrs.php?ids=${rids}`
      ),
      fetchReviews(
        `turkopticon2`,
        `https://api.turkopticon.info/requesters?rids=${rids}`
      )
    ]);

    const updated = rids.reduce((obj, rid) => {
      const review = updates.reduce((o, update) => {
        const { site, json } = update;
        const data =
          (json ? json[rid] : null) ||
          (reviews[rid] ? reviews[rid][site] : null);
        return { ...o, [site]: data };
      }, {});

      return { ...obj, [rid]: review };
    }, {});

    const averaged = await averageReviews(updated);

    resolve(averaged);
    saveReviews(averaged);
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

async function reviewsForFinder(rids) {
  const reviews = await getReviews(rids);
  const needsUpdate = await updateCheck(reviews);

  updateRequesterReviews(needsUpdate ? await updateReviews(reviews) : reviews);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function requesterReviewsUpdate (objectReviews, arrayIds) {
  return new Promise(async (resolve) => {
    function getReviews (stringSite, stringURL) {
      return new Promise(async (resolve) => {
        try {
          const response = await window.fetch(stringURL)

          if (response.status === 200) {
            const json = await response.json()
            resolve([stringSite, json.data ? Object.assign(...json.data.map((item) => ({
              [item.id]: item.attributes.aggregates
            }))) : json])
          } else {
            resolve()
          }
        } catch (error) {
          resolve()
        }
      })
    }

    const getReviewsAll = await Promise.all([
      getReviews(`turkerview`, `https://api.turkerview.com/api/v1/requesters/?ids=${arrayIds}&from=mts`),
      getReviews(`turkopticon`, `https://turkopticon.ucsd.edu/api/multi-attrs.php?ids=${arrayIds}`),
      getReviews(`turkopticon2`, `https://api.turkopticon.info/requesters?rids=${arrayIds}&fields[requesters]=aggregates`)
    ])

    for (const item of getReviewsAll) {
      if (item && item.length > 0) {
        const site = item[0]
        const reviews = item[1]

        for (const key in reviews) {
          objectReviews[key][site] = reviews[key]
        }
      }
    }

    const time = new Date().getTime()
    const transaction = requesterReviewsDB.transaction([`requester`], `readwrite`)
    const objectStore = transaction.objectStore(`requester`)

    for (const key in objectReviews) {
      const obj = objectReviews[key]

      obj.id = key
      obj.time = time
      objectStore.put(obj)
    }

    resolve(objectReviews)
  })
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function requesterRatingAverage () {
  const [requesterId] = arguments

  const review = reviewsDB[requesterId]

  if (review) {
    return review.average;
  }

  return 0
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

async function requesterReviewGetClass () {
  const [requesterId] = arguments

  const average = requesterRatingAverage(requesterId)
  return (average > 3.75 ? `success` : average > 2 ? `warning` : average > 0 ? `danger` : `default`)
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

async function updateRequesterReviews (reviews) {
  for (const key in reviews) {
    reviewsDB[key] = reviews[key]

    const reviewClass = await requesterReviewGetClass(key)

    if (reviewClass) {
      for (const element of document.getElementsByClassName(`btn-${key}`)) {
        element.classList.remove(`btn-success`, `btn-warning`, `btn-danger`)
        element.classList.add(`btn-${reviewClass}`)
      }
      for (const element of document.getElementsByClassName(`table-${key}`)) {
        element.classList.remove(`table-success`, `table-warning`, `table-danger`)
        if (storage.hitFinder[`display-colored-rows`]) {
          element.classList.add(`table-${reviewClass}`)
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

let hitTrackerDB = (() => {
  const open = window.indexedDB.open(`hitTrackerDB`, 1)

  open.onsuccess = (event) => {
    hitTrackerDB = event.target.result
  }
})()

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function hitTrackerMatch () {
  const [name, value] = arguments

  let resolveValue

  return new Promise((resolve) => {
    const transaction = hitTrackerDB.transaction([`hit`], `readonly`)
    const objectStore = transaction.objectStore(`hit`)
    const myIndex = objectStore.index(name)
    const myIDBKeyRange = window.IDBKeyRange.only(value)

    myIndex.openCursor(myIDBKeyRange).onsuccess = (event) => {
      const cursor = event.target.result

      if (cursor) {
        if (cursor.value.state.match(/Submitted|Approved|Rejected|Paid/)) {
          resolveValue = true
        } else {
          cursor.continue()
        }
      } else {
        resolveValue = false
      }
    }

    transaction.oncomplete = (event) => {
      resolve(resolveValue)
    }
  })
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Green checkmarks under Title and Requester
function hitTrackerMatchObject () {
  const [name, value] = arguments

  let resolveValue

  return new Promise(async (resolve) => {
    const match = await hitTrackerMatch(name, value)
    resolveValue = match ? { color: `success`, icon: `check` } : { color: `secondary`, icon: `minus` }
    resolve(resolveValue)
  })
}

function saveToFileJSON () {
  const [name, json] = arguments

  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()
  const year = today.getFullYear()
  const date = `${year}${month < 10 ? `0` : ``}${month}${day < 10 ? `0` : ``}${day}`

  const data = JSON.stringify(json)

  const exportFile = document.createElement(`a`)
  exportFile.href = window.URL.createObjectURL(new window.Blob([data], { type: `application/json` }))
  exportFile.download = `mts-backup-${date}-${name}.json`

  document.body.appendChild(exportFile)
  exportFile.click()
  document.body.removeChild(exportFile)
}

function loadFromFileJSON () {
  const [file] = arguments

  return new Promise((resolve) => {
    const reader = new window.FileReader()
    reader.readAsText(file)

    reader.onload = (event) => {
      const json = JSON.parse(event.target.result)
      resolve(json)
    }
  })
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

$(`[data-toggle="tooltip"]`).tooltip({
  delay: {
    show: 500
  }
})

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

$(`#block-list-add-modal`).on(`show.bs.modal`, (event) => {
  const name = event.relatedTarget.dataset.name
  const match = event.relatedTarget.dataset.match

  document.getElementById(`block-list-add-name`).value = name || ``
  document.getElementById(`block-list-add-match`).value = match || ``
  document.getElementById(`block-list-add-strict`).checked = true
})

$(`#block-list-edit-modal`).on(`show.bs.modal`, (event) => {
  const key = event.relatedTarget.dataset.key
  const item = storage.blockList[key]

  document.getElementById(`block-list-edit-name`).value = item.name
  document.getElementById(`block-list-edit-match`).value = item.match
  document.getElementById(`block-list-edit-strict`).checked = item.strict

  document.getElementById(`block-list-edit-delete`).dataset.key = key
})

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

$(`#include-list-add-modal`).on(`show.bs.modal`, (event) => {
  const name = event.relatedTarget.dataset.name
  const match = event.relatedTarget.dataset.match

  document.getElementById(`include-list-add-name`).value = name || ``
  document.getElementById(`include-list-add-match`).value = match || ``
  document.getElementById(`include-list-add-strict`).checked = true
  document.getElementById(`include-list-add-sound`).checked = true
  document.getElementById(`include-list-add-alarm`).checked = false
  document.getElementById(`include-list-add-notification`).checked = true
  document.getElementById(`include-list-add-pushbullet`).checked = false
})

$(`#include-list-edit-modal`).on(`show.bs.modal`, (event) => {
  const key = event.relatedTarget.dataset.key
  const item = storage.includeList[key]

  document.getElementById(`include-list-edit-name`).value = item.name
  document.getElementById(`include-list-edit-match`).value = item.match
  document.getElementById(`include-list-edit-strict`).checked = item.strict
  document.getElementById(`include-list-edit-sound`).checked = item.sound
  document.getElementById(`include-list-edit-alarm`).checked = item.alarm
  document.getElementById(`include-list-edit-notification`).checked = item.notification
  document.getElementById(`include-list-edit-pushbullet`).checked = item.pushbullet

  document.getElementById(`include-list-edit-delete`).dataset.key = key
})

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

$(`#autoPandaInclude-list-add-modal`).on(`show.bs.modal`, (event) => {
  const name = event.relatedTarget.dataset.name
  const match = event.relatedTarget.dataset.match

  document.getElementById(`autoPandaInclude-list-add-name`).value = name || ``
  document.getElementById(`autoPandaInclude-list-add-match`).value = match || ``
  document.getElementById(`autoPandaInclude-list-add-strict`).checked = true
})

$(`#autoPandaInclude-list-edit-modal`).on(`show.bs.modal`, (event) => {
  const key = event.relatedTarget.dataset.key
  const item = storage.autoPandaIncludeList[key]

  document.getElementById(`autoPandaInclude-list-edit-name`).value = item.name
  document.getElementById(`autoPandaInclude-list-edit-match`).value = item.match
  document.getElementById(`autoPandaInclude-list-edit-strict`).checked = item.strict

  document.getElementById(`autoPandaInclude-list-edit-delete`).dataset.key = key
})


// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

$(`#settings-modal`).on(`show.bs.modal`, (event) => {
  for (const prop in storage.hitFinder) {
    document.getElementById(prop)[typeof (storage.hitFinder[prop]) === `boolean` ? `checked` : `value`] = storage.hitFinder[prop]
  }
})

// --------------------------------------------------------------------------------- Hit Info Modal ---------------------------------------------------------------------------------------------


$(`#hit-info-modal`).on(`show.bs.modal`, (event) => {
  const key = event.relatedTarget.dataset.key
  const hit = finderDB[key]
  const takeTest = hit.has_test

  function testTaker(){
    if (takeTest === true) {
      alert(`test`);
    }
  }
  if ($('#APO-5:checked').length > 0){testTaker();}


  document.getElementById(`hit-info-title`).textContent = hit.title
  document.getElementById(`hit-info-requester`).textContent = `${hit.requester_name} [${hit.requester_id}]`
  document.getElementById(`hit-info-reward`).textContent = toMoneyString(hit.monetary_reward.amount_in_dollars)
  document.getElementById(`hit-info-duration`).textContent = toDurationString(hit.assignment_duration_in_seconds)
  document.getElementById(`hit-info-available`).textContent = hit.assignable_hits_count
  document.getElementById(`hit-info-description`).textContent = hit.description
  document.getElementById(`hit-info-requirements`).textContent = hit.project_requirements.map((o) => `${o.qualification_type.name} ${o.comparator} ${o.qualification_values.map(v => v).join(`, `)}`.trim()).join(`; `) || `None`
  document.getElementById(`hit-info-qualifications`).textContent = `${hit.caller_meets_requirements}`
  document.getElementById(`hit-info-tests`).textContent = (hit.has_test === true);
  document.getElementById(`hit-info-ow`).textContent = `${hit.requester_id}@${hit.requester_name}`

  document.getElementById(`hit-info-block-requester`).dataset.key = key
  document.getElementById(`hit-info-block-requester`).dataset.name = hit.requester_name
  document.getElementById(`hit-info-block-requester`).dataset.match = hit.requester_id

  document.getElementById(`hit-info-block-hit`).dataset.key = key
  document.getElementById(`hit-info-block-hit`).dataset.name = hit.title
  document.getElementById(`hit-info-block-hit`).dataset.match = hit.hit_set_id

  document.getElementById(`hit-info-include-requester`).dataset.key = key
  document.getElementById(`hit-info-include-requester`).dataset.name = hit.requester_name
  document.getElementById(`hit-info-include-requester`).dataset.match = hit.requester_id

  document.getElementById(`hit-info-autoPandaInclude-requester`).dataset.key = key
  document.getElementById(`hit-info-autoPandaInclude-requester`).dataset.name = hit.requester_name
  document.getElementById(`hit-info-autoPandaInclude-requester`).dataset.match = hit.requester_id

  document.getElementById(`hit-info-autoPandaInclude-hit`).dataset.key = key
  document.getElementById(`hit-info-autoPandaInclude-hit`).dataset.name = hit.title
  document.getElementById(`hit-info-autoPandaInclude-hit`).dataset.match = hit.hit_set_id

  document.getElementById(`hit-info-include-hit`).dataset.key = key
  document.getElementById(`hit-info-include-hit`).dataset.name = hit.title
  document.getElementById(`hit-info-include-hit`).dataset.match = hit.hit_set_id
})

//------------------------------------------------------------------------------------ Hit Sharer Modal ---------------------------------------------------------------------------------------------


$(`#hit-sharer-modal`).on(`show.bs.modal`, (event) => {
  const key = event.relatedTarget.dataset.key

  for (const element of event.target.getElementsByClassName(`hit-sharer`)) {
    element.dataset.key = key
  }
})

//-------------------------------------------------------------------------- Requester Review Modal -------------------------------------------------------------------------------------


$(`#requester-review-modal`).on(`show.bs.modal`, async (event) => {
  const key = event.relatedTarget.dataset.key
  const review = reviewsDB[key]

  const tv = review.turkerview
  const to = review.turkopticon
  const to2 = review.turkopticon2

  const options = await StorageGetKey(`options`);

  if (options.requesterReviewsTurkerview) {
    if (tv) {
      document.getElementById(`review-turkerview-link`).href = `https://turkerview.com/requesters/${key}`
      document.getElementById(`review-turkerview-ratings-hourly`).textContent = toMoneyString(tv.ratings.hourly)
      document.getElementById(`review-turkerview-ratings-pay`).textContent = tv.ratings.pay || `-`
      document.getElementById(`review-turkerview-ratings-fast`).textContent = tv.ratings.fast || `-`
      document.getElementById(`review-turkerview-ratings-comm`).textContent = tv.ratings.comm || `-`
      document.getElementById(`review-turkerview-rejections`).textContent = tv.rejections
      document.getElementById(`review-turkerview-tos`).textContent = tv.tos
      document.getElementById(`review-turkerview-blocks`).textContent = tv.blocks

      document.getElementById(`review-turkerview-review`).style.display = ``
      document.getElementById(`review-turkerview-no-reviews`).style.display = `none`
    } else {
      document.getElementById(`review-turkerview-review`).style.display = `none`
      document.getElementById(`review-turkerview-no-reviews`).style.display = ``
    }
    document.getElementById(`review-turkerview`).style.display = ``
  } else {
    document.getElementById(`review-turkerview`).style.display = `none`
  }

  if (options.requesterReviewsTurkopticon) {
    if (to) {
      document.getElementById(`review-turkopticon-link`).href = `https://turkopticon.ucsd.edu/${key}`
      document.getElementById(`review-turkopticon-attrs-pay`).textContent = `${to.attrs.pay} / 5` || `- / 5`
      document.getElementById(`review-turkopticon-attrs-fast`).textContent = `${to.attrs.fast} / 5` || `- / 5`
      document.getElementById(`review-turkopticon-attrs-comm`).textContent = `${to.attrs.comm} / 5` || `- / 5`
      document.getElementById(`review-turkopticon-attrs-fair`).textContent = `${to.attrs.fair} / 5` || `- / 5`
      document.getElementById(`review-turkopticon-reviews`).textContent = to.reviews
      document.getElementById(`review-turkopticon-tos_flags`).textContent = to.tos_flags

      document.getElementById(`review-turkopticon-review`).style.display = ``
      document.getElementById(`review-turkopticon-no-reviews`).style.display = `none`
    } else {
      document.getElementById(`review-turkopticon-review`).style.display = `none`
      document.getElementById(`review-turkopticon-no-reviews`).style.display = ``
    }
    document.getElementById(`review-turkopticon`).style.display = ``
  } else {
    document.getElementById(`review-turkopticon`).style.display = `none`
  }

  if (options.requesterReviewsTurkopticon2) {
    if (to2) {
      const {all, recent} = to2;

      document.getElementById(`review-turkopticon2-link`).href = `https://turkopticon.info/requesters/${key}`
      document.getElementById(`review-turkopticon2-recent-reward`).textContent = recent.hourly;
      document.getElementById(`review-turkopticon2-recent-pending`).textContent = recent.pending;
      document.getElementById(`review-turkopticon2-recent-comm`).textContent = recent.comm;
      document.getElementById(`review-turkopticon2-recent-recommend`).textContent = recent.recommend;
      document.getElementById(`review-turkopticon2-recent-rejected`).textContent = recent.rejected;
      document.getElementById(`review-turkopticon2-recent-tos`).textContent = recent.tos;
      document.getElementById(`review-turkopticon2-recent-broken`).textContent = recent.broken;

      document.getElementById(`review-turkopticon2-all-reward`).textContent = all.hourly;
      document.getElementById(`review-turkopticon2-all-pending`).textContent = all.pending;
      document.getElementById(`review-turkopticon2-all-comm`).textContent = all.comm;
      document.getElementById(`review-turkopticon2-all-recommend`).textContent = all.recommend;
      document.getElementById(`review-turkopticon2-all-rejected`).textContent = all.rejected;
      document.getElementById(`review-turkopticon2-all-tos`).textContent = all.tos;
      document.getElementById(`review-turkopticon2-all-broken`).textContent = all.broken;

      document.getElementById(`review-turkopticon2-review`).style.display = ``
      document.getElementById(`review-turkopticon2-no-reviews`).style.display = `none`
    } else {
      document.getElementById(`review-turkopticon2-review`).style.display = `none`
      document.getElementById(`review-turkopticon2-no-reviews`).style.display = ``
    }
  } else {
    document.getElementById(`review-turkopticon2`).style.display = `none`
  }
})

$(document).on(`close.bs.alert`, `#alarm-alert`, (event) => {
  if (alarmAudio) {
    alarmAudio.pause()
    alarmAudio.currentTime = 0
  }

  alarm = false
  alarmRunning = false
})


document.getElementById(`find`).addEventListener(`click`, finderToggle)

document.getElementById(`speed`).addEventListener(`change`, (event) => {
  storage.hitFinder.speed = event.target.value

  chrome.storage.local.set({
    finder: storage.hitFinder
  })
})

//----------------------------------------------------------------------------------- Block List Settings Modal ---------------------------------------------------------------------------------------------


document.getElementById(`block-list-delete`).addEventListener(`click`, (event) => {
  const result = window.confirm(`Are you sure you delete your entire Block List?`)

  if (result) {
    storage.blockList = {}
    blockListUpdate()
  }
})

document.getElementById(`block-list-export`).addEventListener(`click`, (event) => {
  saveToFileJSON(`block-list`, storage.blockList)
})

document.getElementById(`block-list-import`).addEventListener(`change`, async (event) => {
  const json = await loadFromFileJSON(event.target.files[0])

  for (const key in json) {
    const item = json[key]

    if (item.name.length && item.match.length) {
      storage.blockList[key] = {
        name: item.name,
        match: item.match,
        strict: typeof (item.strict) === `boolean` ? item.strict : true
      }
    }
  }

  blockListUpdate()
})

document.getElementById(`block-list-add-save`).addEventListener(`click`, (event) => {
  const name = document.getElementById(`block-list-add-name`).value
  const match = document.getElementById(`block-list-add-match`).value

  if (name.length && match.length) {
    storage.blockList[match] = {
      name: name,
      match: match,
      strict: document.getElementById(`block-list-add-strict`).checked
    }

    blockListUpdate()
  }
})

document.getElementById(`block-list-edit-save`).addEventListener(`click`, (event) => {
  const name = document.getElementById(`block-list-edit-name`).value
  const match = document.getElementById(`block-list-edit-match`).value

  if (name.length && match.length) {
    storage.blockList[match] = {
      name: name,
      match: match,
      strict: document.getElementById(`block-list-edit-strict`).checked
    }

    blockListUpdate()
  }
})

document.getElementById(`block-list-edit-delete`).addEventListener(`click`, (event) => {
  const key = event.target.dataset.key
  delete storage.blockList[key]
  blockListUpdate()
})

// ------------------------------------------------------------------------------ Include List Settings Modal ---------------------------------------------------------------------------------------------

document.getElementById(`include-list-delete`).addEventListener(`click`, (event) => {
  const result = window.confirm(`Are you sure you delete your entire Include List?`)

  if (result) {
    storage.includeList = {}
    includeListUpdate()
  }
})

document.getElementById(`include-list-import`).addEventListener(`change`, async (event) => {
  const json = await loadFromFileJSON(event.target.files[0])

  for (const key in json) {
    const item = json[key]

    if (item.name.length && item.match.length) {
      storage.includeList[key] = {
        name: item.name,
        match: item.match,
        strict: typeof (item.strict) === `boolean` ? item.strict : true,
        sound: typeof (item.sound) === `boolean` ? item.sound : true,
        alarm: typeof (item.alarm) === `boolean` ? item.alarm : false,
        pushbullet: typeof (item.pushbullet) === `boolean` ? item.pushbullet : false,
        notification: typeof (item.notification) === `boolean` ? item.notification : true
      }
    }
  }

  includeListUpdate()
})

document.getElementById(`include-list-export`).addEventListener(`click`, (event) => {
  saveToFileJSON(`include-list`, storage.includeList)
})

document.getElementById(`include-list-add-save`).addEventListener(`click`, (event) => {
  const name = document.getElementById(`include-list-add-name`).value
  const match = document.getElementById(`include-list-add-match`).value

  if (name.length && match.length) {
    storage.includeList[match] = {
      name: name,
      match: match,
      strict: document.getElementById(`include-list-add-strict`).checked,
      sound: document.getElementById(`include-list-add-sound`).checked,
      alarm: document.getElementById(`include-list-add-alarm`).checked,
      notification: document.getElementById(`include-list-add-notification`).checked,
      pushbullet: document.getElementById(`include-list-add-pushbullet`).checked
    }

    includeListUpdate()
  }
})

document.getElementById(`include-list-edit-save`).addEventListener(`click`, (event) => {
  const name = document.getElementById(`include-list-edit-name`).value
  const match = document.getElementById(`include-list-edit-match`).value

  if (name.length && match.length) {
    storage.includeList[match] = {
      name: name,
      match: match,
      strict: document.getElementById(`include-list-edit-strict`).checked,
      sound: document.getElementById(`include-list-edit-sound`).checked,
      alarm: document.getElementById(`include-list-edit-alarm`).checked,
      notification: document.getElementById(`include-list-edit-notification`).checked,
      pushbullet: document.getElementById(`include-list-edit-pushbullet`).checked
    }

    includeListUpdate()
  }
})

document.getElementById(`include-list-edit-delete`).addEventListener(`click`, (event) => {
  const key = event.target.dataset.key
  delete storage.includeList[key]
  includeListUpdate()
})


// ------------------------------------------------------------------------------ AP Settings Modal ---------------------------------------------------------------------------------------------

// start autoPanda thingy here

document.getElementById(`autoPandaInclude-list-delete`).addEventListener(`click`, (event) => {
  const result = window.confirm(`Are you sure you delete your entire autoPanda List?`)

  if (result) {
    storage.autoPandaIncludeList = {}
    autoPandaIncludeListUpdate()
  }
})

document.getElementById(`autoPandaInclude-list-import`).addEventListener(`change`, async (event) => {
  const json = await loadFromFileJSON(event.target.files[0])

  for (const key in json) {
    const item = json[key]

    if (item.name.length && item.match.length) {
      storage.autoPandaIncludeList[key] = {
        name: item.name,
        match: item.match,
        strict: typeof (item.strict) === `boolean` ? item.strict : true,
        sound: typeof (item.sound) === `boolean` ? item.sound : true,
        alarm: typeof (item.alarm) === `boolean` ? item.alarm : false,
        pushbullet: typeof (item.pushbullet) === `boolean` ? item.pushbullet : false,
        notification: typeof (item.notification) === `boolean` ? item.notification : true
      }
    }
  }

  autoPandaIncludeListUpdate()
})

document.getElementById(`autoPandaInclude-list-export`).addEventListener(`click`, (event) => {
  saveToFileJSON(`autoPandaInclude-list`, storage.autoPandaIncludeList)
})

document.getElementById(`autoPandaInclude-list-add-save`).addEventListener(`click`, (event) => {
  const name = document.getElementById(`autoPandaInclude-list-add-name`).value
  const match = document.getElementById(`autoPandaInclude-list-add-match`).value

  if (name.length && match.length) {
    storage.autoPandaIncludeList[match] = {
      name: name,
      match: match,
      strict: document.getElementById(`autoPandaInclude-list-add-strict`).checked,
      sound: document.getElementById(`autoPandaInclude-list-add-sound`).checked,
      alarm: document.getElementById(`autoPandaInclude-list-add-alarm`).checked,
      notification: document.getElementById(`autoPandaInclude-list-add-notification`).checked,
      pushbullet: document.getElementById(`autoPandaInclude-list-add-pushbullet`).checked
    }

    autoPandaIncludeListUpdate()
  }
})

document.getElementById(`autoPandaInclude-list-edit-save`).addEventListener(`click`, (event) => {
  const name = document.getElementById(`autoPandaInclude-list-edit-name`).value
  const match = document.getElementById(`autoPandaInclude-list-edit-match`).value

  if (name.length && match.length) {
    storage.autoPandaIncludeList[match] = {
      name: name,
      match: match,
      strict: document.getElementById(`autoPandaInclude-list-edit-strict`).checked,
      sound: document.getElementById(`autoPandaInclude-list-edit-sound`).checked,
      alarm: document.getElementById(`autoPandaInclude-list-edit-alarm`).checked,
      notification: document.getElementById(`autoPandaInclude-list-edit-notification`).checked,
      pushbullet: document.getElementById(`autoPandaInclude-list-edit-pushbullet`).checked
    }

    autoPandaIncludeListUpdate()
  }
})

document.getElementById(`autoPandaInclude-list-edit-delete`).addEventListener(`click`, (event) => {
  const key = event.target.dataset.key
  delete storage.autoPandaIncludeList[key]
  autoPandaIncludeListUpdate()
})

  // end here

  
// ------------------------------------------------------------------------------------ Apply Settings --------------------------------------------------------------------------------------------

document.getElementById(`settings-apply`).addEventListener(`click`, finderApply)

document.getElementById(`alarm-on`).addEventListener(`click`, (event) => {
  if (!alarm) {
    alarm = true

    const alert = document.createElement(`div`)
    alert.id = `alarm-alert`
    alert.className = `alert alert-info alert-dismissible fade show`

    const message = document.createElement(`strong`)
    message.textContent = `Alarm is active!`
    alert.appendChild(message)

    const close = document.createElement(`button`)
    close.type = `button`
    close.className = `close`
    close.textContent = `×`
    close.dataset.dismiss = `alert`
    alert.appendChild(close)

    document.body.prepend(alert)
  }
})

// --------------------------------------------------------------- Include Hits Clear Button ( Top of the 1st Card on the left)------------------------------------------------------------------

document.getElementById(`include-hits-clear`).addEventListener(`click`, (event) => {
  document.getElementById(`include-list-hits-card`).style.display = `none`
  removeChildren(document.getElementById(`include-list-hits-tbody`))
})

// ----------------------------------------------------------------------------------- Recent Hits Toggle ---------------------------------------------------------------------------------------

document.getElementById(`recent-hits-toggle`).addEventListener(`click`, (event) => {
  const classList = document.getElementById(`recent-hits-toggle`).firstElementChild.classList
  classList.toggle(`fa-caret-up`)
  classList.toggle(`fa-caret-down`)

  const element = document.getElementById(`recent-hits-card`).getElementsByClassName(`card-block`)[0]
  element.style.display = element.style.display === `none` ? `` : `none`
})

// ----------------------------------------------------------------------------------- Logged Hits Toggle ---------------------------------------------------------------------------------------

document.getElementById(`logged-hits-toggle`).addEventListener(`click`, (event) => {
  const classList = document.getElementById(`logged-hits-toggle`).firstElementChild.classList
  classList.toggle(`fa-caret-up`)
  classList.toggle(`fa-caret-down`)

  const element = document.getElementById(`logged-hits-card`).getElementsByClassName(`card-block`)[0]
  element.style.display = element.style.display === `none` ? `` : `none`
})

// --------------------------------------------------------------------------------------- AP Toggle --------------------------------------------------------------------------------------------

document.getElementById(`autoPandaLogged-hits-toggle`).addEventListener(`click`, (event) => {
  const classList = document.getElementById(`autoPandaLogged-hits-toggle`).firstElementChild.classList
  classList.toggle(`fa-caret-up`)
  classList.toggle(`fa-caret-down`)

  const element = document.getElementById(`autoPandaLogged-hits-card`).getElementsByClassName(`card-block`)[0]
  element.style.display = element.style.display === `none` ? `` : `none`
})

// ----------------------------------------------------------------------------------- Export Functions ---------------------------------------------------------------------------------------

document.getElementById(`hit-export-short`).addEventListener(`click`, (event) => {
  const key = event.target.dataset.key
  const hit = finderDB[key]
  chrome.runtime.sendMessage({ hit, hitExporter: `short` });
})

document.getElementById(`hit-export-plain`).addEventListener(`click`, (event) => {
  const key = event.target.dataset.key
  const hit = finderDB[key]
  chrome.runtime.sendMessage({ hit, hitExporter: `plain` });
})

document.getElementById(`hit-export-bbcode`).addEventListener(`click`, (event) => {
  const key = event.target.dataset.key
  const hit = finderDB[key]
  chrome.runtime.sendMessage({ hit, hitExporter: `bbcode` });

})

document.getElementById(`hit-export-markdown`).addEventListener(`click`, (event) => {
  const key = event.target.dataset.key
  const hit = finderDB[key]
  chrome.runtime.sendMessage({ hit, hitExporter: `markdown` });
})

document.getElementById(`hit-export-turkerhub`).addEventListener(`click`, (event) => {
  const result = window.prompt(`Are you sure you want to export this HIT to TurkerHub.com?`)

  if (result) {
    const key = event.target.dataset.key
    const hit = finderDB[key]
    chrome.runtime.sendMessage({ hit, hitExporter: `turkerhub`, message: result }, (response) => {
      /* mark as exported eventually */
    });
  }
})

document.getElementById(`hit-export-mturkcrowd`).addEventListener(`click`, (event) => {
  const result = window.prompt(`Are you sure you want to export this HIT to MTurkCrowd.com?`)

  if (result) {
    const key = event.target.dataset.key
    const hit = finderDB[key]
    chrome.runtime.sendMessage({ hit, hitExporter: `mturkcrowd`, message: result }, (response) => {
      /* mark as exported eventually */
    });
  }
})

// ------------------------------------------------------------------------------------- Volume Control Slider ----------------------------------------------------------------------------------

document.getElementById(`tts-volume`).addEventListener(`change`, (event) => {
  ttsFunction();
});

function ttsFunction() {
  textToSpeech('Voice level test');


}document.getElementById(`alert-volume`).addEventListener(`change`, (event) => {
  alertFunction();
});

function alertFunction() {
  textToSpeech('Alert level test');
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//function PC_Once() {
 // chrome.windows.create({
    //  url:("https://worker.mturk.com/requesters/PandaCrazyAdd/projects?JRGID=${GID}&JRRName=${hit.requester_name}&JRRID=${hit.requester_id}&JRTitle=${hit.hit_set_id}&JRReward=${'min_reward'}"),
   // URL:`https://worker.mturk.com/requesters/PandaCrazyAdd/projects?JRGID=${hit.hit_set_id}&JRRName=${hit.requester_name}&JRRID=${hit.requester_id}&JRTitle=${hit.hit_set_id}&JRReward=${'min_reward'}`
    //requesterLink.href = `https://worker.mturk.com/requesters/${hit.requester_id}/projects`
      //titleLink.href = `https://worker.mturk.com/projects/${hit.hit_set_id}/tasks`

   //   type: "popup"
 //   });  
 // console.log('You just fired PC_Once();');
//}

// ------------------------------------------------------------------------ Function to Hide the AP Modal Version 1 --------------------------------------------------------------------------


function myFunction() {
  var x = document.getElementById("myDIV");
  if (x.style.display === "none") {
      x.style.display = "block";
  } else {
      x.style.display = "none";
  }
}

// ------------------------------------------------------------------------- Toggle for the Auto Panda Modal ------------------------------------------------------------------------------------

$(document).ready(function(){
  $('#hideIt').addClass("hidden");

  $('#hideIt').click(function() {
    var $this = $(this);

    if ($this.hasClass("hidden")) {
      $(this).removeClass("hidden").addClass("visible");

    } else {
      $(this).removeClass("visible").addClass("hidden");
    }
  });
});

// ------------------------------------------------------------------------- Print To Console To Make Sure We Are Running -----------------------------------------------------------------------

console.log('MTS is Running');

