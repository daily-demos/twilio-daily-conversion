'use strict';

/**
 * Mute/unmute your media in a Room.
 * @param {DailyCall} callObject - The Daily call object instance
 * @param {'audio'|'video'} kind - The type of media you want to mute/unmute
 * @param {'mute'|'unmute'} action - Whether you want to mute/unmute
 */
function muteOrUnmuteYourMedia(callObject, kind, action) {
  const enable = action === 'mute' ? false : true;
  if (kind === 'audio') {
    callObject.setLocalAudio(enable);
  } else {
    callObject.setLocalVideo(enable);
  }
}

/**
 * Mute your audio in a Room.
 * @param {Room} room - The Room you have joined
 * @returns {void}
 */
function muteYourAudio(room) {
  muteOrUnmuteYourMedia(room, 'audio', 'mute');
}

/**
 * Mute your video in a Room.
 * @param {Room} room - The Room you have joined
 * @returns {void}
 */
function muteYourVideo(room) {
  muteOrUnmuteYourMedia(room, 'video', 'mute');
}

/**
 * Unmute your audio in a Room.
 * @param {Room} room - The Room you have joined
 * @returns {void}
 */
function unmuteYourAudio(room) {
  muteOrUnmuteYourMedia(room, 'audio', 'unmute');
}

/**
 * Unmute your video in a Room.
 * @param {Room} room - The Room you have joined
 * @returns {void}
 */
function unmuteYourVideo(room) {
  muteOrUnmuteYourMedia(room, 'video', 'unmute');
}

/**
 * A RemoteParticipant muted or unmuted its media.
 * @param {Room} room - The Room you have joined
 * @param {function} onMutedMedia - Called when a RemoteParticipant muted its media
 * @param {function} onUnmutedMedia - Called when a RemoteParticipant unmuted its media
 * @returns {void}
 */
function participantMutedOrUnmutedMedia(callObject, onMutedMedia, onUnmutedMedia) {
  callObject.on('track-started', function(ev) {
    const track = ev.track;
    const participant = ev.participant;
    onUnmutedMedia(track, participant);
  });
  callObject.on('track-stopped', function(ev) {
    const track = ev.track;
    const participant = ev.participant;
    onMutedMedia(track, participant);
  })
}

exports.muteYourAudio = muteYourAudio;
exports.muteYourVideo = muteYourVideo;
exports.unmuteYourAudio = unmuteYourAudio;
exports.unmuteYourVideo = unmuteYourVideo;
exports.participantMutedOrUnmutedMedia = participantMutedOrUnmutedMedia;
