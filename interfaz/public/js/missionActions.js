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
  this.description = mission.description || "";
  this.deviceId = deviceId;
  this.devicePausedId = [];
  this.missionType = mission.missionType;
  this.onEdit = onEdit;
  this.missionPoints = mission.missionPoints || [];
  this.structPoints = mission.structPoints;
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
    if (missions.length == 0) return $.notify({ message: 'There are not mission in the system.' }, { type: 'warning' });

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
    $.notify({ message: error.message || error }, { type: 'danger' });
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

  firstRow.appendChild(name);

  let divBut = document.createElement('div');
  divBut.className = 'col-sm-12 flex mtopmBot10 dateCss';

  let play = document.createElement('button');
  play.className = 'btn azulSave marginRight7px fa fa-play';
  play.id = 'play' + mission.id;
  play.title = 'Start mission';
  play.onclick = () => chargePlayDeviceList(mission);

  let abort = document.createElement('button');
  abort.className = 'btn azulSave marginRight7px fa fa-times';
  abort.id = 'abort' + mission.id;
  abort.title = 'Abort mission';
  abort.onclick = () => abortMission(mission.id);

  divBut.appendChild(play);
  divBut.appendChild(abort);
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

function abortMission(missionId) {
  let data = { missionId: missionId };
  sendAbort(data)
  .then(abort => {
    abort.responses.forEach((response, i) => {
      let device = devices.find(elem => elem.id == response.deviceId);
      if(device) {
        if (response.error == "ERR_NOERROR") {
          $.notify({ message: `${device.name} has abort ${mName}` }, { type: 'success' });
        } else {
          $.notify({ message: `${device.name} has't been able to abort ${mName}` }, { type: 'warning' });
        }
      }
    });
  })
  .catch(e => {
    $.notify({ message: `Abort from mission - `+(e.message || e) }, { type: 'danger' });
  });
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
      missionId: mId, devices: mDevices
    };
    ajaxPost('play', data)
    .then(salida => {
      let play = salida.result;
      play.responses.forEach((response, i) => {
        let device = devices.find(elem => elem.id == response.droneId);
        if(device) {
          if (response.error == "ERR_NOERROR") {
            $.notify({ message: `${device.name} has init ${mission.name}` }, { type: 'success' });
          } else {
            $.notify({ message: `${device.name} has't been able to init ${mission.name} - ${response.error}` }, { type: 'warning' });
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
    ajaxPost('stop', data)
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
    let laM = missions.find(elem => elem.id == id);
    if(laM)
      resolve(laM);
    else
      reject('Mission not available')
  })
}

function fitBoundsMission(structPoints) {
  let missionCoordinates = [];
  for (var i = 0; i < structPoints.length; i++) {
    missionCoordinates.push([structPoints[i].lat, structPoints[i].lon])
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
  if(Array.isArray(array)) {
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
}

function hideMarker(array) {
  if(Array.isArray(array)) {
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
}

function createPoint(structP, pos, icono) {
  let erName = 'Waypoint ' + pos;
  let markerTmp = L.marker([structP.lat, structP.lon], {
    icon: icono,
    labelContent: L.tooltip({ direction: 'bottom', permanent: true, className: 'tooltipClass', offset: [0, 20], arrowClass: '' })
      .setContent(erName)
      .setLatLng([structP.lat, structP.lon])
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
    let path = [{'latitude': markerAnt.lat, 'longitude': markerAnt.lon}, {'latitude': markerAct.lat, 'longitude': markerAct.lon}];
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

