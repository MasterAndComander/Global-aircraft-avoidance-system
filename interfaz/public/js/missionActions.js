'use strict';

let missionMarker = 'images/marker/marker.png';
let missionExecMarker = 'images/marker/execMarker.png';
let missionsArray = [];

//Clase para las misiones
function classMission(mission, deviceId, onEdit) {
  this.exec = false;
  this.paused = false;
  this.id = mission.id;
  this.name = mission.name;
  this.description = mission.description;
  this.deviceId = deviceId;
  this.devicePausedId = [];
  this.missionType = mission.missionType;
  this.onEdit = onEdit;
  this.missionPoints = mission.missionPoints;
  this.structPoints = mission.structPoints;
  this.creatorId = mission.creatorId;
}

function clearMissionMarkers(mission) {
  if(mission) {
    hideMarker(mission.structPoints);
    hideMarker(mission.missionPoints);
  }
}

function findInMissionsArray(id) {
  return missionsArray.find(elem => elem.id == id);
}

function deleteInMissionsArray(id) {
  let theMission = findInMissionsArray(id);
  clearMissionMarkers(theMission);
  missionsArray = missionsArray.filter(elem => elem.id != id);
}

function addInMissionsArray(mission, deviceArr, onEdit) {
  if (findInMissionsArray(mission.id)) {
    deleteInMissionsArray(mission.id)
  }
  let newMission = new classMission(mission, deviceArr, onEdit);
  createMarker(newMission);
  missionsArray.push(newMission);
  insertOnTable(mission);
  return newMission;
}

missionMarker = parseIcon(missionMarker, 35, 35);
missionExecMarker = parseIcon(missionExecMarker, 35, 35);

function closeMissions() {
  $('#missionList').addClass('noVisible');
  let baldoMiss = document.getElementById("tableMissions");
  while (baldoMiss.firstChild) {
    baldoMiss.removeChild(baldoMiss.lastChild);
  }
}

function insertOnTable(mission) {
  if (mission) {
    if (!document.getElementById('missionId' + mission.id)) {
      addBaldoMission(mission);
    }
  }
}

async function printMissions() {
  try {
    let missions = await getMissions();
    if (missions.length == 0) return $.notify({ message: 'There are not mission in database. Create one to start.' }, { type: 'warning' });

    let baldoMiss = document.getElementById("tableMissions");
    while (baldoMiss.firstChild) {
      baldoMiss.removeChild(baldoMiss.lastChild);
    }

    missions.forEach((mission, i) => {
      addBaldoMission(mission, i);
    });
    $('#missionList').removeClass('noVisible');
  } catch (error) {
    console.log(error);
  }
}

function addBaldoMission(mission, i) {
  let leftMenu = document.getElementById('tableMissions');
  let firstRow = document.createElement('div');
  firstRow.id = 'missionFirstRow';
  firstRow.className = "row col-sm-12 pointer";
  firstRow.onclick = () => clickBaldoMission(mission.id);
  let secondRow = document.createElement('div');
  secondRow.className = "row col-sm-12";
  let errorRow = document.createElement('div');
  errorRow.id = 'errorMission' + mission.id;
  errorRow.className = "row col-sm-12";
  let thirdRow = document.createElement('div');
  thirdRow.id = `mp${mission.id}`;
  thirdRow.className = "row col-sm-12 box border0 box-default noVisible marginLeft0";
  let forthRow = document.createElement('div');
  forthRow.className = "row col-sm-12";

  let card = document.createElement('div');
  card.className = 'card backgroundDevices borderWhite baldoMission';
  card.setAttribute('num', i);
  card.setAttribute('abierta', false);
  card.id = 'missionId' + mission.id;

  let name = document.createElement('span');
  name.id = 'nameMission';
  name.className = 'col-sm-8 nameMission findNameMission';
  name.innerHTML = `${mission.name} (${mission.missionType})`;

  let creator = document.createElement('i');
  creator.className = 'col-sm-4 capitalize nameMission creators';
  creator.innerHTML = `(${mission.userName})`;

  firstRow.appendChild(name);
  firstRow.appendChild(creator);

  let divDate = document.createElement('h6');
  divDate.className = 'col-sm-12 sortByDate mtopmBot10 dateCss pointer';
  divDate.setAttribute('date', new Date(mission.dateCreation).getTime());
  divDate.innerHTML = dateFormated(mission.dateCreation);
  divDate.onclick = () => clickBaldoMission(mission.id);

  let divBut = document.createElement('div');
  divBut.className = 'col-sm-12 flex mtopmBot10 dateCss';

  let play = document.createElement('button');
  play.className = 'btn azulSave marginRight7px fa fa-play';
  play.id = 'play' + mission.id;
  play.title = 'Start mission';
  play.onclick = () => chargePlayDeviceList(mission);

  let pause = document.createElement('button');
  pause.className = 'btn azulSave marginRight7px fa fa-pause';
  pause.id = 'pause' + mission.id;
  pause.title = 'Pause mission';
  pause.onclick = (event) => pauseMissionFromMission(mission.id, event);

  let continueM = document.createElement('button');
  continueM.className = 'btn azulSave marginRight7px fa fa-mail-forward';
  continueM.id = 'continue' + mission.id;
  continueM.title = 'Continue mission';
  continueM.onclick = (event) => continueMissionFromMission(mission.id, event);

  let abort = document.createElement('button');
  abort.className = 'btn azulSave marginRight7px fa fa-times';
  abort.id = 'abort' + mission.id;
  abort.title = 'Abort mission';
  abort.onclick = () => abortMissionFromBaldo(mission.id);

  let edit = document.createElement('button');
  edit.className = 'btn azulSave marginRight7px fa fa-edit';
  edit.title = 'Edit mission';
  edit.onclick = () => editMission(mission.id, mission.userId == currentUser.id);

  let remove = document.createElement('button');
  remove.onclick = () => deleteMission(mission.id, mission.userId);
  remove.title = 'Delete mission';
  remove.className = 'btn azulSave fa fa-trash';

  divBut.appendChild(play);
  divBut.appendChild(pause);
  divBut.appendChild(continueM);
  divBut.appendChild(abort);
  divBut.appendChild(edit);
  divBut.appendChild(remove);
  secondRow.appendChild(divDate);
  secondRow.appendChild(divBut);

  let boxHeader = document.createElement('div');
  boxHeader.className = "col-sm-12 box-header with-border";

  let title = document.createElement('h5');
  title.className = "col-sm-12 box-title";
  title.innerHTML = 'Waypoints';
  boxHeader.appendChild(title);
  let missionPointBox = document.createElement('div');
  missionPointBox.id = `mpLoadBox${mission.id}`;
  missionPointBox.setAttribute('mId', mission.id);
  missionPointBox.className = "col-sm-12 sinPadding scrollable height230 box-body marginLeft2";
  boxHeader.appendChild(missionPointBox);

  thirdRow.appendChild(boxHeader);
  forthRow.appendChild(errorRow);

  card.appendChild(firstRow);
  card.appendChild(secondRow);
  card.appendChild(thirdRow);
  card.appendChild(forthRow);
  leftMenu.appendChild(card);
}

function getMissions(dateStart, dateEnd) {
  return new Promise((resolve, reject) => {
    ajaxPost('missions/search', { dateStart: dateStart, dateEnd: dateEnd })
      .then(salida => {
        resolve(salida.result.missions);
      })
      .catch(err => reject(err.message || err))
  })
}

function clickBaldoMission(id) {
  clearDomElement('errorMission' + id);
  let opened = parseBool(document.getElementById('missionId' + id).getAttribute('abierta'));
  if (opened) {
    cleanOldMissionExec(id);
  } else {
    showThisMission(id, (structPoints) => {
      if (structPoints)
        fitBoundsMission(structPoints);
    });
    document.getElementById('missionId' + id).setAttribute('abierta', true);
  }
}

function findMissionById(id) {
  showThisMission(id, (structPoints) => {
    if (structPoints)
      fitBoundsMission(structPoints);
  });
  document.getElementById('missionId' + id).setAttribute('abierta', true);
}

function pauseMissionFromMission(missionId, event) {
  event.stopPropagation();
  try {
    let dev2Send = devices.filter(device => {
      if (device.automatic) {
        return (device.automatic.mId == missionId && !device.automatic.paused);
      }
    });
    if (dev2Send.length > 0) {
      let theMission = findInMissionsArray(missionId);
      let mName = theMission ? theMission.name : "";
      let devicesMission = dev2Send.map(elem => elem.id);
      let data = { arrayIds: devicesMission, missionId: missionId };
      sendPause(data)
      .then(pause => {
        pause.responses.forEach((response, i) => {
          let device = devices.find(elem => elem.id == response.deviceId);
          if(device) {
            if (response.error.error == "ERR_NOERROR") {
              $.notify({ message: `${device.name} has pause ${mName}` }, { type: 'success' });
            } else {
              $.notify({ message: `${device.name} has't been able to pause ${mName}` }, { type: 'warning' });
            }
          }
        });
      })
      .catch(e => {
        throw `Pause from mission - `+(e.message || e);
      });
    } else {
      throw "No devices to pause this mission";
    }
  } catch (e) {
    $.notify({ message: `Pause from mission - `+(e.message || e) }, { type: 'danger' });
  }
}

function continueMissionFromMission(missionId, event) {
  event.stopPropagation();
  try {
    let dev2Send = devices.filter(device => {
      if (device.automatic) {
        return (device.automatic.mId == missionId && device.automatic.paused);
      }
    });
    if (dev2Send.length > 0) {
      let theMission = findInMissionsArray(missionId);
      let mName = theMission ? theMission.name : "";
      let devicesMission = dev2Send.map(elem => elem.id);
      let data = { arrayIds: devicesMission, missionId: missionId };
      sendContinue(data)
      .then(cont => {
        cont.responses.forEach((response, i) => {
          let device = devices.find(elem => elem.id == response.deviceId);
          if(device) {
            if (response.error.error == "ERR_NOERROR") {
              $.notify({ message: `${device.name} has continue ${mName}` }, { type: 'success' });
            } else {
              $.notify({ message: `${device.name} has't been able to continue ${mName}` }, { type: 'warning' });
            }
          }
        });
      })
      .catch(e => {
        throw `Pause from mission - `+(e.message || e);
      });
    } else {
      throw "No devices to pause this mission";
    }
  } catch (e) {
    $.notify({ message: `Continue from mission - `+(e.message || e) }, { type: 'danger' });
  }
}

function abortMissionFromBaldo(missionId) {
  let devExec = devices.some(device => {
    if (device.automatic) {
      return (device.automatic.mId == missionId);
    }
  });
  if (devExec) {
    document.getElementById('idDeviceGeneralAbort').value = missionId;
    let myModal = new bootstrap.Modal('#chooseGeneralAbort', {});
    myModal.show();
  } else {
    $.notify({ message: 'There are no devices executing this mission' }, { type: 'warning' });
  }
}

function abortMissionFromMission(missionId) {
  let abortType = document.getElementById('generalAbortSelect').value;
  let theMission = findInMissionsArray(missionId);
  let mName = theMission ? theMission.name : "";
  let devExec = devices.filter(device => {
    if (device.automatic) {
      return (device.automatic.mId == missionId);
    }
  });
  if (devExec.length > 0) {
    let devicesMission = devExec.map(elem => elem.id);
    let data = { arrayIds: devicesMission, missionId: missionId, abortType: abortType };
    sendAbort(data)
    .then(abort => {
      abort.responses.forEach((response, i) => {
        let device = devices.find(elem => elem.id == response.deviceId);
        if(device) {
          if (response.error.error == "ERR_NOERROR") {
            $.notify({ message: `${device.name} has abort ${mName}` }, { type: 'success' });
          } else {
            $.notify({ message: `${device.name} has't been able to abort ${mName}` }, { type: 'warning' });
          }
        }
      });
      $('#chooseGeneralAbort').modal('hide');
    })
    .catch(e => {
      $.notify({ message: `Abort from mission - `+(e.message || e) }, { type: 'danger' });
    });
  } else {
    $.notify({ message: `Device not found` }, { type: 'warning' });
  }
}

//Función que aborta la misión desde el botón en la baldosa del dispositivo
function abortMission(deviceId, abortType) {
  let device = devices.find(elem => elem.id == deviceId)
  if(device) {
    if(device.automatic && device.automatic.mId) {
      let data = {arrayIds: [deviceId], missionId: device.automatic.mId, abortType: abortType };
      let theMission = findInMissionsArray(device.automatic.mId);
      let mName = theMission ? theMission.name : "";
      sendAbort(data)
      .then(abort => {
        abort.responses.forEach((response, i) => {
          abort.responses.forEach((response, i) => {
            let device = devices.find(elem => elem.id == response.deviceId);
            if(device) {
              if (response.error.error == "ERR_NOERROR") {
                $.notify({ message: `${device.name} has abort ${mName}` }, { type: 'success' });
              } else {
                $.notify({ message: `${device.name} has't been able to abort ${mName}` }, { type: 'warning' });
              }
            }
          });
        });
      }).catch(e => {
        $.notify({ message: `Abort from ${device.name} - `+(e.message || e) }, { type: 'danger' });
      });
    } else {
      $.notify({ message: `Abort from ${device.name} - No current mission` }, { type: 'warning' });
    }
  }
}

function chargePlayDeviceList(mission) {
  let mId = mission.id;
  clearDomElement('errorMission' + mId);
  let mDevices = devices.filter(elem => elem.selected).map(cosa => cosa.id);
  if (mDevices.length == 0) {
    let div = document.getElementById('errorMission' + mId);
    let p = document.createElement('p');
    p.className = 'redBattery marginTop2 marginLeft6';
    p.innerHTML = 'No device has been selected';
    div.appendChild(p);
  } else {
    let data = {
      missionId: mId, devices: mDevices,
      initPoint: document.getElementById('initMp').value,
      finalAction: document.getElementById('finalActSelect').value
    };
    ajaxPost('missions/play', data)
    .then(salida => {
      let play = salida.result;
      play.responses.forEach((response, i) => {
        let device = devices.find(elem => elem.id == response.droneId);
        if(device) {
          if (response.error.error == "ERR_NOERROR") {
            $.notify({ message: `${device.name} has init ${mission.name}` }, { type: 'success' });
          } else {
            $.notify({ message: `${device.name} has't been able to init ${mission.name}` }, { type: 'warning' });
          }
        }
      });
    })
    .catch(err => {
      let div = document.getElementById('errorMission' + mId);
      let p = document.createElement('p');
      p.className = 'redBattery marginTop2 marginLeft6';
      p.innerHTML = err.message || err;
      div.appendChild(p);
    })
  }
}

function cleanOldMissionExec(mId) {
  if (mId) {
    clearMP(mId, `mpLoadBox${mId}`, `mp${mId}`);
    let mission = document.getElementById('missionId' + mId);
    if(mission)
      mission.setAttribute('abierta', false);
  }
}

function sendAbort(data) {
  return new Promise((resolve, reject) => {
    ajaxPost('device/automaticAbort', data)
    .then(salida => {
      resolve(salida.result);
    })
    .catch(err => {
      reject(err);
    });
  });
}


async function showThisMission(id, cb) {
  try {
    let mission = await getMissionById(id);
    if (mission) {
      let newM = addInMissionsArray(mission, [], false);
      if (newM.structPoints) {
        showMarker(newM.structPoints);
      }
      showBaldoMps(newM);
      cb(newM.structPoints);
    } else {
      cb(null);
    }
  } catch (error) {
    cb(error.message || error)
  }
}

function lineClosePolygon(type, lastPoint, firstPoint, sePinta) {
  if (type == 'area' || type == 'perimeter' || type == 'orthomosaic') {
    pintaRuta(lastPoint, firstPoint, sePinta);
  }
}

function getMissionById(id) {
  return new Promise((resolve, reject) => {
    ajaxGet('missions/getmissionbyid', 'missionId=' + id)
      .then(salida => {
        if (salida.result.error == "ERR_NOERROR") {
          resolve(salida.result.mission);
        } else {
          reject(salida.result.error);
        }
      })
      .catch(err => reject(err.message || err));
  })
}

function fitBoundsMission(structPoints) {
  let missionCoordinates = [];
  for (var i = 0; i < structPoints.length; i++) {
    missionCoordinates.push([structPoints[i].gps.latitude, structPoints[i].gps.longitude])
  }
  let bounds = new L.LatLngBounds(missionCoordinates);
  map.flyTo([bounds._northEast.lat, bounds._northEast.lng], map.getZoom());
  map.fitBounds(bounds);
}

function createMarker(mission) {
  mission.missionPoints.forEach((point, i) => {
    createPoint(point, i + 1, missionExecMarker);
    pintaRuta(mission.missionPoints[i - 1], mission.missionPoints[i], false);
  });
  mission.structPoints.forEach((point, i) => {
    createPoint(point, i + 1, missionMarker);
    pintaRuta(mission.structPoints[i - 1], mission.structPoints[i], false);
  });
  lineClosePolygon(mission.missionType, mission.structPoints[mission.structPoints.length - 1], mission.structPoints[0], false)
}

function showMarker(array) {
  array.forEach(erMp => {
    if (!map.hasLayer(erMp.marker)) {
      erMp.marker.addTo(map);
    }
    if (!map.hasLayer(erMp.marker.options.labelContent)) {
      erMp.marker.options.labelContent.addTo(map);
    }
    if (erMp.polyline) {
      if (!map.hasLayer(erMp.polyline)) {
        erMp.polyline.addTo(map);
      }
    }
  })
}

function hideMarker(array) {
  array.forEach(elem => {
    if (elem.marker) {
      map.removeLayer(elem.marker.options.labelContent);
      map.removeLayer(elem.marker);
    }
    if (elem.polyline) {
      map.removeLayer(elem.polyline)
    }
  })
}

function createPoint(structP, pos, icono) {
  let erName = 'Waypoint ' + pos;
  let markerTmp = L.marker([structP.gps.latitude, structP.gps.longitude], {
    icon: icono,
    labelContent: L.tooltip({ direction: 'bottom', permanent: true, className: 'tooltipClass', offset: [0, 20], arrowClass: '' })
      .setContent(erName)
      .setLatLng([structP.gps.latitude, structP.gps.longitude])
  });
  structP.name = erName;
  structP.marker = markerTmp;
  structP.polyline = null;
}


//****************************************************************************//
// Pinta ruta asíncrono en mapa                                               //
//****************************************************************************//
function pintaRuta(markerAnt, markerAct, sePinta) {
  if (markerAnt && markerAct) {
    let path = [markerAnt.gps, markerAct.gps];
    markerAct.polyline = drawRoute(path, sePinta);
  }
}

function drawRoute(array, show) {
  let polyline = null;
  let path = [];
  let optNotCross = {
    color: '#fbe700',
    opacity: 1.0,
    weight: 2
  };
  for (var i = 0; i < array.length; i++) {
    path.push(L.latLng(array[i].latitude, array[i].longitude));
  }
  polyline = L.polyline(path, optNotCross);
  if (show)
    polyline.addTo(map);
  return polyline;
}

function clearMP(id, mpLoad, mpDom) {
  let mission = findInMissionsArray(id);
  if (mission) {
    hideMarker(mission.structPoints);
    hideMarker(mission.missionPoints);
  }
  $(`#${mpDom}`).addClass('noVisible');
}

function showBaldoMps(mission) {
  if (mission && mission.id) {
    clearDomElement(`mpLoadBox${mission.id}`);
    mission.structPoints.forEach(function (value, index, arr) {
      addViewLoadMP(value, index, `mpLoadBox${mission.id}`);
    });
    $(`#mp${mission.id}`).removeClass('noVisible');
  }
}

/******************************************************************************/
/* AGREGA LA VISTA AL INTERFAZ DEL CLIENTE EN MISIÓN CARGADA                  */
/******************************************************************************/
function addViewLoadMP(mp, pos, cont) {
  let mpBox = document.getElementById(cont);
  if (mpBox) {
    let div = document.createElement('div');
    div.setAttribute('valor', pos);
    div.className = 'alert colorMP pointer';
    div.appendChild(document.createTextNode(mp.name));
    //div.addEventListener('mouseover', () => overMpLoad(div));
    mpBox.appendChild(div);
  }
}

function overMpLoad(div) {
  let mId = parseInt(div.parentNode.getAttribute('mId'));
  let pos = parseInt(div.getAttribute('valor'));
  let estaMission = findInMissionsArray(mId);
  if (estaMission && estaMission.exec != true) {
    var showMp = estaMission.structPoints[pos];
  } else {
    var showMp = estaMission.missionPoints[pos];
  }
  if (map.hasLayer(showMp.marker) && !showMp.marker.isBouncing() && !showMp.virtual) {
    showMp.marker.bounce();
  }
  div.addEventListener('click', () => openLoadMP(div));
  div.addEventListener('mouseout', () => outMpLoad(div));
  div.addEventListener('mouseover', () => overMpLoad(div));
}

function openNewMission() {
  if (mapPopUpWindows.has('newMissionWindow')) return mapPopUpWindows.get('newMissionWindow').focus();
  setTimeout(() => {
    let missionManager = window.open('', 'CreateMission', "width=" + screen.width + ",height=" + screen.height + ",modal=yes,toolbar=no,menubar=no,resizable=no");
    let form = document.createElement("form");
    let opBoundingBox = document.createElement('input');
    let zoomLatLng = document.createElement('input');
    let parentUrl = document.createElement('input');

    form.method = "POST";
    form.action = `missionManager`;
    form.target = 'CreateMission';
    form.className = 'noVisible';

    opBoundingBox.value = JSON.stringify(map.getBounds());
    opBoundingBox.name = "bBox";
    form.appendChild(opBoundingBox);

    zoomLatLng.value = JSON.stringify({ zoom: map.getZoom(), latLng: map.getCenter() });
    zoomLatLng.name = "zoomLatLng";
    form.appendChild(zoomLatLng);

    parentUrl.name = 'parentUrl';
    parentUrl.value = window.location.href;
    form.appendChild(parentUrl);

    mapPopUpWindows.set('newMissionWindow', missionManager);
    document.body.appendChild(form);
    form.submit();
    form.remove();
  }, 200);
}

function editMission(elId, owner) {
  if (mapPopUpWindows.has('editMissionWindow')) return mapPopUpWindows.get('editMissionWindow').focus();
  setTimeout(() => {
    let editMission = window.open('', 'Edit mission', "width=" + screen.width + ",height=" + screen.height + ",modal=yes,toolbar=no,menubar=no,resizable=no");
    let form = document.createElement("form");
    let missionId = document.createElement('input');
    let propietario = document.createElement('input');
    let opBoundingBox = document.createElement('input');
    let parentUrl = document.createElement('input');

    form.method = "POST";
    form.action = `missionManager`;
    form.target = 'Edit mission';
    form.className = 'noVisible';

    missionId.value = elId;
    missionId.name = 'missionId';
    form.appendChild(missionId);

    propietario.value = owner;
    propietario.name = 'propietario';
    form.appendChild(propietario);

    opBoundingBox.value = JSON.stringify(map.getBounds());
    opBoundingBox.name = "bBox";
    form.appendChild(opBoundingBox);

    parentUrl.name = 'parentUrl';
    parentUrl.value = window.location.href;
    form.appendChild(parentUrl);

    mapPopUpWindows.set('editMissionWindow', editMission);
    document.body.appendChild(form);
    form.submit();
    form.remove();
  }, 200);
}

function deleteMission(id, creator) {
  deleteMissionFromDatabase(id, creator)
    .then(message => {
      deleteInMissionsArray(id);
      printMissions(() => { });
      showNotify(message, 'success')
    })
    .catch(err => showNotify(err.message || err, 'danger'));
}

function deleteMissionFromDatabase(id, creator) {
  return new Promise((resolve, reject) => {
    if (creator == currentUser.id) {
      ajaxPost('missions/delete', { missionId: id })
        .then(salida => {
          if (salida.result && salida.result.error == 'ERR_NOERROR') {
            resolve('Mission delete from database')
          } else {
            reject(alida.result.error)
          }
        })
        .catch(err => reject(err));
    } else {
      reject('You are not the creator of the mission')
    }
  })
}