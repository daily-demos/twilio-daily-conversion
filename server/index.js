"use strict";

/**
 * Load Twilio configuration from .env config file - the following environment
 * variables should be set:
 * process.env.TWILIO_ACCOUNT_SID
 * process.env.TWILIO_API_KEY
 * process.env.TWILIO_API_SECRET
 */
 require("dotenv").load();

 const express = require("express");
 const http = require("http");
 const path = require("path");
const axios = require('axios');

// Max. period that a Participant is allowed to be in a Room (currently 14400 seconds or 4 hours)
const MAX_ALLOWED_SESSION_DURATION = 300;
const dailyAPIURL = `https://api.daily.co/v1`;

// Create Express webapp.
const app = express();

// Set up the paths for the examples.
[
  "bandwidthconstraints",
  "codecpreferences",
  "dominantspeaker",
  "localvideofilter",
  "localvideosnapshot",
  "mediadevices",
  "networkquality",
  "reconnection",
  "screenshare",
  "localmediacontrols",
  "remotereconnection",
  "datatracks",
  "manualrenderhint",
  "autorenderhint",
].forEach((example) => {
  const examplePath = path.join(__dirname, `../examples/${example}/public`);
  app.use(`/${example}`, express.static(examplePath));
});

// Set up the path for the quickstart.
const quickstartPath = path.join(__dirname, "../quickstart/public");
app.use("/quickstart", express.static(quickstartPath));

// Set up the path for the examples page.
const examplesPath = path.join(__dirname, "../examples");
app.use("/examples", express.static(examplesPath));

/**
 * Default to the Quick Start application.
 */
app.get("/", (request, response) => {
  response.redirect("/quickstart");
});

/**
 * Generate an Access Token for a chat application user - it generates a random
 * username for the client requesting a token, and takes a device ID as a query
 * parameter.
 */
app.get('/token', async function (request, response) {
  const query = request.query;
  const userName = query.identity;
  const roomName = query.roomName;

  let roomData = await getRoom(roomName);
  if (!roomData) {
    roomData = await createRoom(roomName);
  }
  // Create an access token which we will sign and return to the client,
  // containing the grant we just created.
  const token = await getMeetingToken(roomName, userName);
  const res = {
    token: token,
    roomURL: roomData.url,
  };
  response.send(JSON.stringify(res));
});

// Create http server and run it.
const server = http.createServer(app);
const port = process.env.PORT || 3000;
server.listen(port, function () {
  console.log('Express server running on *:' + port);
});

async function getRoom(roomName) {
  const apiKey = process.env.DAILY_API_KEY;
  // Prepare our headers, containing our Daily API key
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const url = `${dailyAPIURL}/rooms/${roomName}`;
  const errMsg = "Failed to get room information."

  let res;
  try {
    res = await axios
    .get(url, {
      headers: headers,
    })
  } catch(error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw new Error(`${errMsg}: ${error})`);
  }

  if (res.status !== 200 || !res.data) {
    console.error('unexpected room creation response:', res);
    throw new Error(errMsg);
  }
  // Cast Daily's response to our room data interface.
  const roomData = res.data;
  
  return roomData;
}

async function createRoom(roomName) {
  const apiKey = process.env.DAILY_API_KEY;
  // Prepare our desired room properties. Participants will start with
  // mics and cams off, and the room will expire in 24 hours.
  const req = {
    name: roomName,
    properties: {
      exp: Math.floor(Date.now() / 1000) + MAX_ALLOWED_SESSION_DURATION,
    },
  };

  // Prepare our headers, containing our Daily API key
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const url = `${dailyAPIURL}/rooms/`;
  const data = JSON.stringify(req);

  const roomErrMsg = 'failed to create room';

  const res = await axios
    .post(url, data, {
      headers: headers,
    })
    .catch((error) => {
      console.error(roomErrMsg, error);
      throw new Error(`${roomErrMsg}: ${error})`);
    });

  if (res.status !== 200 || !res.data) {
    console.error('unexpected room creation response:', res);
    throw new Error(roomErrMsg);
  }
  // Cast Daily's response to our room data interface.
  const roomData = res.data;

  return roomData;
}


// getMeetingToken() obtains a meeting token for a room from Daily
async function getMeetingToken(roomName, userName) {
  const req = {
    properties: {
      room_name: roomName,
      user_name: userName,
      exp: Math.floor(Date.now() / 1000) + 86400,
      is_owner: true,
    },
  };

  const data = JSON.stringify(req);
  const headers = {
    Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    'Content-Type': 'application/json',
  };
  const url = `${dailyAPIURL}/meeting-tokens/`;

  const errMsg = 'failed to create meeting token';
  const res = await axios.post(url, data, { headers }).catch((error) => {
    throw new Error(`${errMsg}: ${error})`);
  });
  if (res.status !== 200) {
    throw new Error(`${errMsg}: got status ${res.status})`);
  }
  return res.data?.token;
}
