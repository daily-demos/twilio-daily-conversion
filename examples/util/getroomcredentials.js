'use strict';

const ADJECTIVES = [
  'Awesome', 'Bold', 'Creative', 'Dapper', 'Eccentric', 'Fiesty', 'Golden',
  'Holy', 'Ignominious', 'Jolly', 'Kindly', 'Lucky', 'Mushy', 'Natural',
  'Oaken', 'Precise', 'Quiet', 'Rowdy', 'Sunny', 'Tall',
  'Unique', 'Vivid', 'Wonderful', 'Xtra', 'Yawning', 'Zesty'
];

const FIRST_NAMES = [
  'Anna', 'Bobby', 'Cameron', 'Danny', 'Emmett', 'Frida', 'Gracie', 'Hannah',
  'Isaac', 'Jenova', 'Kendra', 'Lando', 'Mufasa', 'Nate', 'Owen', 'Penny',
  'Quincy', 'Roddy', 'Samantha', 'Tammy', 'Ulysses', 'Victoria', 'Wendy',
  'Xander', 'Yolanda', 'Zelda'
];

const LAST_NAMES = [
  'Anchorage', 'Berlin', 'Cucamonga', 'Davenport', 'Essex', 'Fresno',
  'Gunsight', 'Hanover', 'Indianapolis', 'Jamestown', 'Kane', 'Liberty',
  'Minneapolis', 'Nevis', 'Oakland', 'Portland', 'Quantico', 'Raleigh',
  'SaintPaul', 'Tulsa', 'Utica', 'Vail', 'Warsaw', 'XiaoJin', 'Yale',
  'Zimmerman'
];

function randomItem(array) {
  var randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

function randomName() {
  return [ADJECTIVES, FIRST_NAMES, LAST_NAMES]
    .map(randomItem)
    .join(' ');
}

/**
 * Get the Room credentials from the server.
 * @param {string} [identity] identitiy to use, if not specified use random name.
 * @returns {Promise<{identity: string, token: string}>}
 */
async function getRoomCredentials(identity = randomName(), roomName) {
  let url = `/token?identity=${identity}`;

  // Append room name parameter if one is provided
  if (roomName) {
    url += `&roomName=${roomName}`
  }
  const response = await fetch(url);
  const data = await response.text();
  const resObj = JSON.parse(data);
  const token = resObj.token;
  const roomURL = resObj.roomURL;
  roomName = resObj.roomName;
  return {
    url: roomURL,
    token: token,
    roomName,
  };
}

module.exports = getRoomCredentials;
