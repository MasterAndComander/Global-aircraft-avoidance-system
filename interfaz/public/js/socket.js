const socket = io({ autoConnect: false });

// Connect a socket using the user's email
const connectSocket  = () => {
  socket.connect();
}

/**
 * Sets the socket query.
 * @param {String} query Query of the socket.
 */
const setSocketQuery = (query) => {
  socket.io.opts.query = query;
}

/**
 * Set the type param of the socket.
 * @param {Stgring} type Page's type.
 */
const setSocketType = (type) => {
  socket.io.opts.query = { type: type };
}

/**
 * Set the authentication email of the socket.
 * @param {Stgring} email User's email.
 */
const setSocketEmail = (email) => {
  socket.auth = { email: email };
}

// On download data modify download percentage
socket.on("download_data", data => {
  updateDownloadItem(data[0], data[1]);
});

socket.on("download_disabled_buttons", disabled_buttons => {
  if(typeof(onGoingDownloads) === 'undefined')
    return;
  for(let i = 0; i < onGoingDownloads.length; i++){
    let j = 0;
    let found = false
    while(j < disabled_buttons.length && !found){
      if(onGoingDownloads[i][0] == disabled_buttons[j]){
        found = true;
        break;
      }
      j++;
    }
    if(found)
      disable_download_button(onGoingDownloads[i][0]);
    else
      if(onGoingDownloads[i][1] !== "100")
        terminateDownloadItem(onGoingDownloads[i][0]);
  }
});

socket.on("disable_download_button", file_name => {
  disable_download_button(file_name);
});

socket.on('notifications', notifications => {
  for(let i = 0; i < notifications.length; i++){
    notify(...notifications[i]);
  }
});

socket.on('upateButtons', buttons => {
  document.dispatchEvent(new CustomEvent('updateButtons', { detail: buttons }));
});

socket.on('updateDownloadPercent', (fileName, percent) => {
  document.dispatchEvent(new CustomEvent('updateDownloadItemPercent', { detail: [fileName, percent] }));
});

socket.on('addDownloadItemToStack', fileName => {
  document.dispatchEvent(new CustomEvent('addDownloadItemToStack', { detail: fileName }));
});

socket.on('closeWindow', () => {
  window.close();
});

document.addEventListener('closeStreaming', (e) => {
  socket.emit('closeStreaming', e.detail);
});

if(currentUser && currentUser.email){
  setSocketEmail(currentUser.email)

  let query = {};
  // set query parameters
  if(typeof dev_Id    !== 'undefined')  query.dronId    = dev_Id;
  if(typeof operaId   !== 'undefined')  query.operId    = operaId;
  if(typeof parentUrl !== 'undefined')  query.parentUrl = parentUrl;

  if(Object.entries(query).length)
    setSocketQuery(query);

  connectSocket();
}
