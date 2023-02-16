'use strict';

const { isSupported } = require('twilio-video');

const { isMobile } = require('./browser');
const joinRoom = require('./joinroom');
const micLevel = require('./miclevel');
const selectMedia = require('./selectmedia');
const selectRoom = require('./selectroom');
const showError = require('./showerror');

const $modals = $('#modals');
const $selectMicModal = $('#select-mic', $modals);
const $selectCameraModal = $('#select-camera', $modals);
const $showErrorModal = $('#show-error', $modals);
const $joinRoomModal = $('#join-room', $modals);

// ConnectOptions settings for a video web application.
const connectOptions = {
  receiveSettings: {
    // Use Daily's resonable defaults
    base: { video: { layer: 'inherit' } }
  },

  // Capture 720p video @ 24 fps.
  userMediaVideoConstraints: { height: 720, frameRate: 24, width: 1280 },

  // Override simulcast layers to match Twilio's defaults
  // for the given send resolution
  camSimulcastEncodings: [
    { scaleResolutionDownBy: 4, maxBitrate: 80000},
    { scaleResolutionDownBy: 2, maxBitrate: 200000},
    { maxBitrate: 680000 },
  ],
};

// For mobile browsers, limit the maximum incoming video bitrate to 2.5 Mbps.
if (isMobile) {
  connectOptions.receiveSettings.base.video.layer = '1';

  // If on mobile, define custom simulcast layers to match prior behavior
  // Daily's defaults for mobile can be found here: 
  // https://docs.daily.co/guides/scaling-calls/best-practices-to-scale-large-experiences#daily-call-object-default-mobile-simulcast-layers-and-their-settings
  connectOptions.camSimulcastEncodings = [
    { maxBitrate: 80000},
    { maxBitrate: 250000}
  ];
};

// On mobile browsers, there is the possibility of not getting any media even
// after the user has given permission, most likely due to some other app reserving
// the media device. So, we make sure users always test their media devices before
// joining the Room. For more best practices, please refer to the following guide:
// https://www.twilio.com/docs/video/build-js-video-application-recommendations-and-best-practices
const deviceIds = {
  audio: isMobile ? null : localStorage.getItem('audioDeviceId'),
  video: isMobile ? null : localStorage.getItem('videoDeviceId'),
};

/**
 * Select your Room name, your screen name and join.
 * @param [error=null] - Error from the previous Room session, if any
 */
async function selectAndJoinRoom(error = null) {
  const formData = await selectRoom($joinRoomModal, error);
  if (!formData) {
    // User wants to change the camera and microphone.
    // So, show them the microphone selection modal.
    deviceIds.audio = null;
    deviceIds.video = null;
    return selectMicrophone();
  }
  const { identity, roomName } = formData;

  try {
    // Fetch an AccessToken to join the Room.
    const response = await fetch(
      `/token?identity=${identity}&roomName=${roomName}`
    );

    // Extract the AccessToken from the Response.
    const data = await response.text();
    const resObj = JSON.parse(data);

    const token = resObj.token;
    const roomURL = resObj.roomURL;

    // Add the specified audio device ID to ConnectOptions.
    connectOptions.audioDeviceId = deviceIds.audio;

    // Add the specified video device ID to ConnectOptions.
    connectOptions.videoDeviceId = deviceIds.video;

    // Join the Room.
    await joinRoom(roomURL, token, connectOptions);

    // After the video session, display the room selection modal.
    return selectAndJoinRoom();
  } catch (error) {
    return selectAndJoinRoom(error);
  }
}

/**
 * Select your camera.
 */
async function selectCamera() {
  if (deviceIds.video === null) {
    try {
      deviceIds.video = await selectMedia(
        'video',
        $selectCameraModal,
        (videoTrack) => {
          const $video = $('video', $selectCameraModal);
          videoTrack.attach($video.get(0));
        }
      );
    } catch (error) {
      showError($showErrorModal, error);
      return;
    }
  }
  return selectAndJoinRoom();
}

/**
 * Select your microphone.
 */
async function selectMicrophone() {
  if (deviceIds.audio === null) {
    try {
      deviceIds.audio = await selectMedia(
        'audio',
        $selectMicModal,
        (audioTrack) => {
          const $levelIndicator = $('svg rect', $selectMicModal);
          const maxLevel = Number($levelIndicator.attr('height'));
          micLevel(audioTrack, maxLevel, (level) =>
            $levelIndicator.attr('y', maxLevel - level)
          );
        }
      );
    } catch (error) {
      showError($showErrorModal, error);
      return;
    }
  }
  return selectCamera();
}

// If the current browser is not supported by twilio-video.js, show an error
// message. Otherwise, start the application.
window.addEventListener(
  'load',
  isSupported
    ? selectMicrophone
    : () => {
        showError($showErrorModal, new Error('This browser is not supported.'));
      }
);
