'use strict';

const DailyIframe = require('@daily-co/daily-js');
const { connect, createLocalVideoTrack, Logger } = require('twilio-video');
const { isMobile } = require('./browser');
const $leave = $('#leave-room');
const $room = $('#room');
const $activeParticipant = $('div#active-participant > div.participant.main', $room);
const $activeVideo = $('video', $activeParticipant);
const $participants = $('div#participants', $room);

// The current active Participant in the Room.
let activeParticipant = null;
let activeSpeaker = null;

// Whether the user has selected the active Participant by clicking on
// one of the video thumbnails.
let isActiveParticipantPinned = false;

/**
 * Set the active Participant's video.
 * @param participant - the active Participant
 */
function setActiveParticipant(participant) {
  console.log("setActiveParticipant()", participant, activeParticipant)
  if (activeParticipant) {
    const $activeParticipant = $(`div#${activeParticipant.session_id}`, $participants);
    $activeParticipant.removeClass('active');
    $activeParticipant.removeClass('pinned');
    
    const videoTrack = activeParticipant.tracks.video.persistentTrack;
    // Detach any existing VideoTrack of the active Participant.
    if (videoTrack) {
      const activeVideo = $activeVideo.get(0);
      activeVideo.srcObject?.removeTrack(videoTrack);
      $activeVideo.css('opacity', '0');
    }
  }

  // Set the new active Participant.
  activeParticipant = participant;
  const userName = participant.user_name;
  const sid = participant.session_id;
  const identity = userName ? userName : sid;

  const $participant = $(`div#${sid}`, $participants);

  $participant.addClass('active');
  if (isActiveParticipantPinned) {
    $participant.addClass('pinned');
  }

  // Attach the new active Participant's video.
  const videoTrack = participant.tracks.video.persistentTrack;
  if (videoTrack) {
    updateTrackIfNeeded($activeVideo.get(0), videoTrack);
    $activeVideo.css('opacity', '');
  }

  // Set the new active Participant's identity
  $activeParticipant.attr('data-identity', identity);
}

/**
 * Set the current active Participant in the Room.
 * @param room - the Room which contains the current active Participant
 */
function setCurrentActiveParticipant(activeSpeaker, localParticipant) {
  setActiveParticipant(activeSpeaker || localParticipant);
}

/**
 * Set up the Participant's media container.
 * @param participant - the Participant whose media container is to be set up
 * @param room - the Room that the Participant joined
 */
function setupParticipantContainer(participant, callObject) {
  const sid = participant.session_id;

  // Safeguard against duplicate containers
  const existingContainer = document.getElementById(sid);
  if (existingContainer) return;

  const userName = participant.user_name;
  const identity = userName ? userName : sid;
  console.log("participant:", participant)
  // Add a container for the Participant's media.
  const $container =
    $(`<div class="participant" data-identity="${identity}" id="${sid}">
    <audio autoplay ${
      participant.local ? 'muted' : ''
    } style="opacity: 0"></audio>
    <video autoplay muted playsinline style="opacity: 0"></video>
  </div>`);

  // Toggle the pinning of the active Participant's video.
  $container.on('click', () => {
    if (activeParticipant === participant && isActiveParticipantPinned) {
      // Unpin the RemoteParticipant and update the current active Participant.
      setVideoPriority(participant, null, callObject);
      isActiveParticipantPinned = false;
      setCurrentActiveParticipant(activeSpeaker);
    } else {
      // Pin the RemoteParticipant as the active Participant.
      if (isActiveParticipantPinned) {
        setVideoPriority(activeParticipant, null, callObject);
      }
      setVideoPriority(participant, 'high', callObject);
      isActiveParticipantPinned = true;
      setActiveParticipant(participant);
    }
  });

  // Add the Participant's container to the DOM.
  $participants.append($container);
}

/**
 * Set the VideoTrack priority for the given RemoteParticipant. This has no
 * effect in Peer-to-Peer Rooms.
 * @param participant - the RemoteParticipant whose VideoTrack priority is to be set
 * @param priority - null | 'low' | 'standard' | 'high'
 */
function setVideoPriority(participant, priority, callObject) {
  const sessionID = participant.session_id;
  let receiveSettings = {}; 

  const layer = priority === 'high' ? 3 : 'inherit'
  if (priority === 'high') {
    receiveSettings[sessionID].video = {layer};
  } else {
    receiveSettings[sessionID].video = {layer};
  }
  callObject.updateReceiveSettings(receiveSettings)
}

/**
 * Attach a Track to the DOM.
 * @param track - the Track to attach
 * @param participant - the Participant which published the Track
 */
function attachTrack(track, participant, callObject) {
  // Attach the Participant's Track to the thumbnail.
  const query = `div#${participant.session_id} > ${track.kind}`;
  let $media = $(query, $participants);
  if ($media.length === 0) {
    setupParticipantContainer(participant, callObject);
    $media = $(query, $participants);
  }

  $media.css('opacity', '');
  const media = $media.get(0);

  updateTrackIfNeeded(media, track);

  // If the attached Track is a VideoTrack that is published by the active
  // Participant, then attach it to the main video as well.
  if (track.kind === 'video' && participant === activeParticipant) {
    updateTrackIfNeeded($activeVideo.get(0), track);
    $activeVideo.css('opacity', '');
  }
}

function updateTrackIfNeeded(videoElement, newTrack) {
  const src = videoElement.srcObject;
  if (!src) {
    videoElement.srcObject = new MediaStream([newTrack]);
  } else {
    const existingTracks = src.getTracks();
    const l = existingTracks.length;
    switch (l) {
      case 0:
        break;
      case 1:
        src.removeTrack(existingTracks[0]);
        break;
      default:
        console.warn(`Unexpected count of tracks. Expected 1, got ${l}`);
        break;
    }
    src.addTrack(newTrack);
  }
}

/**
 * Detach a Track from the DOM.
 * @param track - the Track to be detached
 * @param participant - the Participant that is publishing the Track
 */
function detachTrack(track, participant) {
  // Detach the Participant's Track from the thumbnail.
  const $media = $(`div#${participant.session_id} > ${track.kind}`, $participants);
  const mediaEl = $media.get(0);
  $media.css('opacity', '0');
  mediaEl.tracks.remove(track);
  mediaEl.srcObject = null;

  // If the detached Track is a VideoTrack that is published by the active
  // Participant, then detach it from the main video as well.
  if (track.kind === 'video' && participant === activeParticipant) {
    const activeVideoEl = $activeVideo.get(0);
    track.detach(activeVideoEl);
    activeVideoEl.srcObject = null;
    $activeVideo.css('opacity', '0');
  }
}

/**
 * Handle the Participant's media.
 * @param participant - the Participant
 * @param room - the Room that the Participant joined
 */
function participantConnected(participant, callObject) {
  // Set up the Participant's media container.
  setupParticipantContainer(participant, callObject);
}

/**
 * Handle a disconnected Participant.
 * @param participant - the disconnected Participant
 * @param room - the Room that the Participant disconnected from
 */
function participantDisconnected(sessionID) {
  // Remove the Participant's media container.
  $(`div#${sessionID}`, $participants).remove();
}

function removeAllParticipants() {
  $participants.empty();
}

/**
 * Join a Room.
 * @param token - the AccessToken used to join a Room
 * @param connectOptions - the ConnectOptions used to join a Room
 */
async function joinRoom(token, connectOptions) {
  // Comment the next two lines to disable verbose logging.
  const logger = Logger.getLogger('daily-video');
  logger.setLevel('debug');

  console.log("connect options: ", connectOptions);
  // Join to the Room with the given AccessToken and ConnectOptions.
  const callObject = DailyIframe.createCallObject({
    url: connectOptions.roomURL,
    token: token,
    dailyConfig: {
      userMediaVideoConstraints: connectOptions.userMediaVideoConstraints,
      receiveSettings: {
        base: { video: { layer: 0 } }, // default: { layer: 2 }
      },
      camSimulcastEncodings: connectOptions.camSimulcastEncodings,
    },
    audioSource: connectOptions.audioDeviceId,
    videoSource: connectOptions.videoDeviceId,
  });

  callObject
    .on('joined-meeting', (ev) => {
      const p = ev.participants.local;
      participantConnected(p, callObject);

      // Set the current active Participant.
      setCurrentActiveParticipant(p, p);
    })
    .on('participant-joined', (ev) => {
      const p = ev.participant;
      participantConnected(p, callObject);
    })
    .on('participant-left', (ev) => {
      const p = ev.participant;
      participantDisconnected(p.session_id);
    })
    .on('active-speaker-change', (ev) => {
      const sessionID = ev.activeSpeaker.peerId;
      const p = callObject.participants()[sessionID];
      activeSpeaker = p;
      const lp = callObject.participants().local;
      if (!isActiveParticipantPinned) {
        setCurrentActiveParticipant(p, lp);
      }
    })
    .on('track-started', (ev) => {
      const p = ev.participant;
      const track = ev.track;
      attachTrack(track, p);
    })
    .on('track-stopped', (ev) => {
      console.log("track-stopped:", ev);
      const p = ev.participant;

      // If the participant does not exist,
      // this must be a user who just left.
      // Their departure will be handle in the 
      // "participant-left" event.
      if (!p) return;
      const track = ev.track;
      detachTrack(track, p);
    })
    .on('receive-settings-updated', (ev) => {
      console.log("Receive settings updated:", ev);
    });

  // Make the Room available in the JavaScript console for debugging.
  window.room = room;

  // Leave the Room when the "Leave Room" button is clicked.
  $leave.click(function onLeave() {
    $leave.off('click', onLeave);
    callObject.leave();
  });

  callObject.join();

  return new Promise((resolve, reject) => {
    // Leave the Room when the "beforeunload" event is fired.
    window.onbeforeunload = () => {
      callObject.leave();
    };

    if (isMobile) {
      // TODO(mmalavalli): investigate why "pagehide" is not working in iOS Safari.
      // In iOS Safari, "beforeunload" is not fired, so use "pagehide" instead.
      window.onpagehide = () => {
        callObject.disconnect();
      };

      // On mobile browsers, use "visibilitychange" event to determine when
      // the app is backgrounded or foregrounded.
      document.onvisibilitychange = async () => {
        if (document.visibilityState === 'hidden') {
          // When the app is backgrounded, your app can no longer capture
          // video frames. So, stop and unpublish the LocalVideoTrack.
          callObject.setLocalVideo(false);
        } else {
          // When the app is foregrounded, your app can now continue to
          // capture video frames. So, publish a new LocalVideoTrack.
          callObject.setLocalVideo(true);
        }
      };
    }

    callObject.on('left-meeting', (ev) => {
      // Clear the event handlers on document and window..
      window.onbeforeunload = null;
      if (isMobile) {
        window.onpagehide = null;
        document.onvisibilitychange = null;
      }

      removeAllParticipants();

      // Clear the active Participant's video.
      $activeVideo.get(0).srcObject = null;

      // Clear the Room reference used for debugging from the JavaScript console.
      window.room = null;

      resolve();
    });
  });
}

module.exports = joinRoom;
