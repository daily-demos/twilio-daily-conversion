'use strict';

const DailyIframe = require('@daily-co/daily-js');
const Prism = require('prismjs');
const getSnippet = require('../../util/getsnippet');
const getRoomCredentials = require('../../util/getroomcredentials');
const helpers = require('./helpers');
const muteYourAudio = helpers.muteYourAudio;
const muteYourVideo = helpers.muteYourVideo;
const unmuteYourAudio = helpers.unmuteYourAudio;
const unmuteYourVideo = helpers.unmuteYourVideo;
const participantMutedOrUnmutedMedia = helpers.participantMutedOrUnmutedMedia;

const audioPreview = document.getElementById('audiopreview');
const videoPreview = document.getElementById('videopreview');

(async function(){
  // Load the code snippet.
  const snippet = await getSnippet('./helpers.js');
  const pre = document.querySelector('pre.language-javascript');

  pre.innerHTML = Prism.highlight(snippet, Prism.languages.javascript);

  // Get room name, if any is passed
  const params = new URLSearchParams(window.location.search);
  const roomName = params.get("roomName");
  // Get the credentials to connect to the Room.
  const tokenAndRoomData = await getRoomCredentials(undefined, roomName);

  // Create a call object 
  const callObject = DailyIframe.createCallObject({
    url: tokenAndRoomData.url,
    token: tokenAndRoomData.token,
  });

  // Starts video upon P2 joining room
  callObject
  .on('joined-meeting', () => {
    const inviteURL = new URL(window.location.href);
    populateInviteURL(tokenAndRoomData.roomName);
  })

  // Configure what happens when participant mutes or unmutes
  participantMutedOrUnmutedMedia(callObject, (track, participant) => {
    if (participant.local) return;
    removeTrack(track);
  }, (track, participant) => {
    if (participant.local) return;
    updateTrack(track)
  });

  callObject.join();

  // Muting audio track and video tracks click handlers
  muteAudioBtn.onclick = () => {
    const mute = !muteAudioBtn.classList.contains('muted');
    const activeIcon = document.getElementById('activeIcon');
    const inactiveIcon = document.getElementById('inactiveIcon');

    if(mute) {
      muteYourAudio(callObject);
      muteAudioBtn.classList.add('muted');
      muteAudioBtn.innerText = 'Enable Audio';
      activeIcon.id = 'inactiveIcon';
      inactiveIcon.id = 'activeIcon';

    } else {
      unmuteYourAudio(callObject);
      muteAudioBtn.classList.remove('muted');
      muteAudioBtn.innerText = 'Disable Audio';
      activeIcon.id = 'inactiveIcon';
      inactiveIcon.id = 'activeIcon';
    }
  }

  muteVideoBtn.onclick = () => {
    const mute = !muteVideoBtn.classList.contains('muted');

    if(mute) {
      muteYourVideo(callObject);
      muteVideoBtn.classList.add('muted');
      muteVideoBtn.innerText = 'Enable Video';
    } else {
      unmuteYourVideo(callObject);
      muteVideoBtn.classList.remove('muted');
      muteVideoBtn.innerText = 'Disable Video';
    }
  }

  // Disconnect from the Room
  window.onbeforeunload = () => {
    callObject.leave();
  }
}());

function populateInviteURL(roomName) {
  const joinEle = document.getElementById('join-link');
  const inviteURL = new URL(`${window.location.origin}${window.location.pathname}`);
  inviteURL.searchParams.append('roomName', roomName);
  const s = inviteURL.toString();
  joinEle.innerHTML = `<a href="${s}">${s}</a>`
}

function removeTrack(track) {
  const mediaEle = getMediaElement(track.kind)
  if (!mediaEle) return;
  mediaEle.srcObject?.removeTrack(track);
  mediaEle.srcObject = null;
  mediaEle.remove();

}

// updateTrack updates the audio or video
// preview elements with the given track
function updateTrack(track) {
  const mediaEle = getOrCreateMediaElement(track.kind)
  if (!mediaEle) return;

  const src = mediaEle.srcObject;
  const allTracks = src.getTracks();
  const l = allTracks.length;
  if (l === 0) {
    src.addTrack(track);
    return;
  }
  if (l > 1) {
    console.warn(`Expected 1 track, got ${l}; only working with the first`);
  }
  const existingTrack = allTracks[0];
  if (existingTrack.id === track.id) {
    return;
  }
  src.removeTrack(existingTrack);
  src.addTrack(track);
}

function getOrCreateMediaElement(trackKind) {
  const mediaEle = getMediaElement(trackKind);
  if (mediaEle) return mediaEle;
  const newMediaEle = document.createElement(trackKind);
  newMediaEle.autoplay = true;
  newMediaEle.srcObject = new MediaStream();

  const parentEle = getParentEle(trackKind);
  parentEle.append(newMediaEle);
  return newMediaEle;
}

function getMediaElement(trackKind) {
  const parentEle = getParentEle(trackKind);
  if (!parentEle) return;
  const mediaEles = parentEle.getElementsByTagName(trackKind);
  if (mediaEles.length === 0) return;
  return mediaEles[0];
}

function getParentEle(trackKind) {
  if (trackKind === 'video') {
    return videoPreview;
  }
  if (trackKind === 'audio') {
    return audioPreview;
  }
  return null;
}
