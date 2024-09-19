'use strict';

let deviceImage = {
    flying: 'images/devices/deviceFly.png',
    landed: 'images/devices/deviceLanded.png',
    disconnect: 'images/devices/deviceDisconnect.png',
    imgCircleGif: 'images/devices/circleWhite.gif'
};

jQuery.each(deviceImage, function(i, val) {
  if(i == 'imgCircleGif') {
    deviceImage[i] = parseDeviceIcon(val, 100, 100);
  } else 
    deviceImage[i] = parseDeviceIcon(val, 50, 50);
});

function checkAutoMission(oldAuto, currentAuto) {
  return new Promise( (resolve) => {
    if(!currentAuto || !currentAuto.mId) {
      //Ha pasado a null, elimino
      if(oldAuto && oldAuto.mId)
        cleanOldMissionExec(oldAuto.mId)
      resolve(currentAuto);
    } else if(!oldAuto || (oldAuto.mId != currentAuto.mId)) {
      if(oldAuto && oldAuto.mId)
        cleanOldMissionExec(oldAuto.mId)
      let mission = findInMissionsArray(currentAuto.mId);
      if(mission) {
        addInMissionsArray(mission, [], false);
        resolve(currentAuto);
      } else {
        getMissionById(currentAuto.mId)
        .then(mission => {
          addInMissionsArray(mission);
          resolve(currentAuto);
        })
      }
    } else {
      resolve(currentAuto)
    }
  });
}

/******************************************************************************/
/* ACTUALIZA LA INFORMACIÓN DEL DRON                                          */
/******************************************************************************/
function uavTelemetry(id, info) {
  try {
      let device = devices.find(cosa => cosa.id == id);
      if(device) {
        if(info.online) {
          device.online = true;
          if(device.counterLostConnection) {
            clearTimeout(device.counterLostConnection)
            device.counterLostConnection = null;
            $('#'+device.id).removeClass('opacity06');
          }
          //Actualizamos telemetría
          device.position = info.gps;
          device.control = info.control;
          let ant = device.mode;
          device.mode = info.mode;
          device.submode = info.mode;
          device.currentTask = info.currentTask;
          device.laser = info.gps.altitude;
          device.landed = device.mode == 'LANDED';
          device.heading = info.heading;
          device.battery = info.battery;
          device.onEvasion = info.onEvasion;
          device.speed = info.v.speed || 0;
          device.eulerData = info.euler;
          device.lastUpdate = new Date().getTime();
          checkAutoMission(device.automatic, info.automatic)
          .then(laM => {
            device.automatic = laM;
            fillTelemetryInfo(device);
            if(device.connect) {
              configurationUavOnline(device);
              let newPointUav= L.latLng(device.position.latitude, device.position.longitude);
              device.marker.setLatLng(newPointUav);
              device.circleMarker.setLatLng(newPointUav);
              device.marker.setZIndexOffset(105);
              device.marker.options.labelContent.setLatLng(newPointUav);
              let imgMarkerActive;
              if(device.landed) {
                imgMarkerActive = deviceImage.landed;
                device.marker.setIcon(deviceImage.landed);
              } else {
                imgMarkerActive = deviceImage.flying;
                device.marker.setIcon(deviceImage.flying);
              }
              if(device.onEvasion) {
                if(!map.hasLayer(device.circleMarker)) {
                  device.circleMarker.addTo(map);
                }
              } else {
                map.removeLayer(device.circleMarker);
              }
              let missionStr = parseAutoMission(device.automatic);
              device.marker.setRotationAngle(device.heading);
              device.marker.setRotationOrigin(imgMarkerActive.options.iconAnchor[0]+'px '+imgMarkerActive.options.iconAnchor[1]+'px');
              let contentString = 
              `<div class="infoWindow" style="font-size: 13px">
                <div>
                <b>${device.name}</b><br>
                <b>Position: </b>${device.position.latitude.toFixed(4)}, ${device.position.longitude.toFixed(4)} <b> Alt: </b>${device.laser.toFixed(1)} <br>
                <b>Mode: </b>${device.mode}<br>
                <b>Submode: </b>${device.submode}<br>
                ${missionStr}
                </div>
                </div>`;
              device.marker.setPopupContent(contentString);

              if(!map.hasLayer(device.marker)) {
                device.marker.addTo(map);
              }
              if(!map.hasLayer(device.marker.options.labelContent)) {
                device.marker.options.labelContent.addTo(map);
              }
              stateOfActiveDevice(device, ant);
            } else {
              stateNotActiveDevice(device, ant);
              configurationUavReady(device);
            }
          });
        } else {
          device.online = false;
          map.removeLayer(device.circleMarker);
          if(device.connect) {
            device.marker.setIcon(deviceImage.disconnect);
            desactiveMissionControl(device.id);
            configurationUavLostConnection(device);
          } else {
            configurationUavOffline(device);
          }
        }
      }
  } catch (error) {
      console.log(error)
  }
}

function parseAutoMission(auto) {
  let str = '';
  try {
    if(auto && auto.mId) {
      let paused = auto.paused ? 'PAUSED <br>' : '';
      str = '<hr><b>Automatic Mission: </b><br> Current MP: '+auto.currentMp+' Init MP: '+auto.initMp+'<br> '+' Last MP: '+auto.finishMp+'<br> '+
      //'Current Lap: '+mission.currentLap+' Total Laps: '+mission.totalLaps+'<br> '+
      paused+
      'Final Action: '+auto.finalAction+'  <br>';
    }
  } catch (error) {
    console.log(error);
  } finally {
    return str;
  }
}

async function fillTelemetryInfo(object) {
  let inputs = document.getElementById('telemetryForm'+object.id).getElementsByTagName('input');
  let status = document.getElementById(`status/${object.id}`);
  let altitude = document.getElementById(`altitude/${object.id}`);
  if(isNaN(object.laser)) altitude.innerHTML = 'Alt:-m';
  else altitude.innerHTML = 'Alt:'+object.laser.toFixed(2)+'m';

  let speed = document.getElementById(`speed/${object.id}`);
  speed.innerHTML = baldoSpeedParse(object.speed);

  document.getElementById('batteryP'+object.id).value=object.battery;

  let landed = object.landed ? '- landed' : '- '+object.submode;

  if(object.automatic && object.automatic.mId) {
    let mission = findInMissionsArray(object.automatic.mId);
    if(mission && mission.missionPoints) {
      showMarker(mission.missionPoints);
    }
    showBaldoMps(mission);
    if(mission && mission.name) {
      status.innerHTML = `${object.mode} "${mission.name}" ${landed}`;
    } 
  } else {
    status.innerHTML = `${object.mode} ${landed}`;
  }

  inputs[0].value=object.position.latitude;
  inputs[1].value=object.position.longitude;

}

function configurationUavReady(device) {
  let dron = document.getElementById(device.id);
  if(dron) {
    if(device.marker)
      map.removeLayer(device.marker.options.labelContent);
    map.removeLayer(device.marker);
    dron.onclick = () => agregarDrone(dron);
    dron.querySelector('#baldoCheck'+device.id).disabled=false;
    $(dron).addClass('pointer');
    dron.title = '';
    var button = dron.getElementsByTagName('button');
    $(button[0]).addClass('noVisible');
    $('#baldoThirdRow'+device.id).removeClass('noVisible');
  }
}

function configurationUavOnline(device) {
  let dron = document.getElementById(device.id);
  if(dron) {
    dron.onclick = () => clickOnDrone(device);
    dron.querySelector('#baldoCheck'+device.id).disabled=false;
    $(dron).addClass('pointer');
    dron.title = '';
    var button = dron.getElementsByTagName('button');
    $(button[0]).removeClass('noVisible');
    $('#baldoThirdRow'+device.id).removeClass('noVisible');
  }
}

function configurationUavOffline(device) {
  let dron = document.getElementById(device.id);
  if(dron) {
      if(device.status != 'offline') {
        let devStatus = document.getElementById(`status/${device.id}`);
        devStatus.setAttribute('status', 'offline');
      }
      if(device.marker) {
        map.removeLayer(device.marker.options.labelContent);
      }
      map.removeLayer(device.marker);
      device.connect = false;
      device.selected = false;
      device.status = 'offline';
      eraseDomElement(`canvasMain${device.id}`);
      if($('#moreInfo'+device.id).hasClass('fa fa-minus-circle')) {
        $('#telemetryForm'+device.id).addClass('noVisible');
        $('#moreInfo'+device.id).removeClass('fa fa-minus-circle');
        $('#moreInfo'+device.id).addClass('fa fa-plus-circle');
        $(`#_${device.id}`).addClass('noVisible');
      }
      dron.onclick = function() {};
      dron.querySelector('#baldoName').onclick = () => {};
      dron.querySelector('#baldoCheck'+device.id).disabled=true;
      let italic = dron.getElementsByTagName('i');
      italic[0].innerHTML='offline';
      $(dron).removeClass('pointer');
      $('#'+device.id).addClass('opacity06');
      dron.title = 'Offline';
      let button = dron.getElementsByTagName('button');
      $(button[0]).addClass('noVisible');
      document.getElementById(`altitude/${device.id}`).innerHTML = '';
      document.getElementById(`speed/${device.id}`).innerHTML = '';
      $('#baldoThirdRow'+device.id).addClass('noVisible');
  }
}

function configurationUavLostConnection(device) {
  if(!device.counterLostConnection) {
    device.counterLostConnection = setTimeout(function() {
      configurationUavOffline(device);
    }, 30000);
  }
  var dron = document.getElementById(device.id);
  if(dron) {
    var italic = dron.getElementsByTagName('i');
    italic[0].innerHTML='Lost connection';
    dron.onclick = function() {};
    eraseDomElement(`canvasMain${device.id}`);
    dron.querySelector('#baldoName').onclick = () => {};
    dron.querySelector('#baldoCheck'+device.id).disabled=true;
    dron.querySelector('#baldoCheck'+device.id).checked=false;
    if($('#moreInfo'+device.id).hasClass('fa fa-minus-circle')) {
      $('#telemetryForm'+device.id).addClass('noVisible');
      $('#moreInfo'+device.id).removeClass('fa fa-minus-circle');
      $('#moreInfo'+device.id).addClass('fa fa-plus-circle');
      $(`#_${device.id}`).addClass('noVisible');
    }
    $('#'+device.id).addClass('opacity06');
    $(dron).removeClass('pointer');
    dron.title = '';
    var button = dron.getElementsByTagName('button');
    $(button[0]).removeClass('noVisible');
    $('#baldoThirdRow'+device.id).removeClass('noVisible');
  }
}

/******************************************************************************/
/* INICIA LA CONEXIÓN AL DRON Y LA ACTIVA Y AGREGA SI ES POSIBLE              */
/******************************************************************************/
function agregarDrone(drone) {
    let id = drone.getAttribute('valor');
    let device = devices.find(cosa => cosa.id == id);
    if(device) {
        if($('#'+id).hasClass('opacity06')) $('#'+id).removeClass('opacity06');
        location.href = "#"+device.id;
        drone.onclick = function() {};
        $(drone).removeClass('pointer');
        activateDron(device);
    } else {

    }
  }
  
  function activateDron(device) {
    device.connect = true;
    map.panTo([device.position.latitude, device.position.longitude], {animate: true});
  }

  /******************************************************************************/
/* RESUELVE EL HACER CLICK SOBRE EL DRONE                                     */
/******************************************************************************/
function clickOnDrone(device) {
    if(device) {
      if(device.connect) {
        device.connect = false;
        desactivaBaldoDevice(device);
        checkVideoStr(device);
      } else {
           
      }
    }
  }

  function desactivaBaldoDevice(device) {
    let id = device.id
    document.getElementById(`altitude/${id}`).innerHTML='';
    document.getElementById(`speed/${id}`).innerHTML='';
    borrarDron(document.getElementById(id));
    $('#'+id).addClass('opacity06');
    $('#telemetryForm'+id).addClass('noVisible');
    $('#moreInfo'+id).removeClass('fa fa-minus-circle');
    $('#moreInfo'+id).addClass('fa fa-plus-circle');
    $(`#_${id}`).addClass('noVisible');
    configurationUavReady(device);
  }

  function baldoSpeedParse(val) {
    return (val*3.6).toFixed(2)+'km/h';
  }

  function checkVideoStr(device) {
    if(devices.every(elem => !elem.connect)) {
      clearDomElement('videoBox');
      $('#devBody').removeClass('changeHeightDevices');
    } else if(document.getElementById('canvasMain'+device.id)) {
      clearDomElement('videoBox');
      $('#devBody').removeClass('changeHeightDevices');
    }
  }

//****************************************************************************//
// PAUSA CON LA MISION CARGADA ACTUALMENTE                                    //
//****************************************************************************//
function pauseMission(device, event) {
  event.stopPropagation();
  try {
    if(device && device.automatic && device.automatic.mId) {
      if(!device.automatic.paused) {
        let data = {
          arrayIds: [device.id],
          missionId: device.automatic.mId
        };
        let theMission = findInMissionsArray(device.automatic.mId);
        let mName = theMission ? theMission.name : "";
        document.getElementById('divContinuar'+device.id).disabled = true;
        sendPause(data)
        .then(sale => {
          sale.responses.forEach((response, i) => {
            if(response.deviceId == device.id) {
              if(response.error.error == "ERR_NOERROR") {
                $.notify({message: `${device.name} command received PAUSE`}, {type: 'success'});
              } else {
                $.notify({message: `${device.name} has't been able to pause mission ${mName}`}, {type: 'warning'});
              }
            }
          });
          document.getElementById('divContinuar'+device.id).disabled = false;
        })
        .catch(e => {
          document.getElementById('divContinuar'+device.id).disabled = false;
          $.notify({message: (e.message || e)}, {type: 'warning'})
        });
      } else {
        throw "Mission already paused";
      }
    } else {
      throw "No mission on execution";
    }
  } catch (e) {
    $.notify({message: `${device.name} has an error `+(e.message || e)}, {type: 'danger'});
  }
}

//****************************************************************************//
// CONTINUA CON LA MISION CARGADA ACTUALMENTE                                 //
//****************************************************************************//
function continueMission(id, event) {
  event.stopPropagation();
  try {
    let myDevice = devices.find(elem => elem.id == id);
    if(myDevice && myDevice.automatic && myDevice.automatic.paused) {
      let valuePaused = myDevice.automatic;
      let data = {
        arrayIds: [myDevice.id],
        missionId: valuePaused.mId
      };
      let theMission = findInMissionsArray(valuePaused.mId);
      let mName = theMission ? theMission.name : "";
      document.getElementById('divContinuar'+myDevice.id).disabled = true;
      sendContinue(data)
      .then(sale => {
        sale.responses.forEach((response, i) => {
          if(response.deviceId == myDevice.id) {
            if(response.error.error == "ERR_NOERROR") {
              $.notify({message: `${myDevice.name} command received CONTINUE`}, {type: 'success'});
            } else {
              $.notify({message: `${myDevice.name} has't been able to continue mission ${mName}`}, {type: 'warning'});
            }
          }
        });
        document.getElementById('divContinuar'+myDevice.id).disabled = false;
      })
      .catch(e => {
        document.getElementById('divContinuar'+myDevice.id).disabled = false;
        $.notify({message: (e.message || e)}, {type: 'warning'})
      });
    } else {
      $.notify({message: `${myDevice.name} is not on mission paused`}, {type: 'warning'});
    }
  } catch (e) {
    $.notify({message: `${myDevice.name} has an error `+e.message}, {type: 'danger'});
  }
}

function sendContinue(data) {
  return new Promise((resolve, reject) => {
    ajaxPost('device/missionResume', data)
    .then(salida => {
      if(salida.result.error=='ERR_NOERROR') {
        resolve(salida.result);
      } else {
        reject(salida.result.error);
      }
    })
    .catch(err => reject(err));
  });
}

function sendPause(data) {
  return new Promise((resolve, reject) => {
    ajaxPost('device/missionPause', data)
    .then(salida => {
      if(salida.result.error=='ERR_NOERROR') {
        resolve(salida.result);
      } else {
        reject(salida.result.error);
      }
    })
    .catch(err => reject(err));
  });
}

function stateOfActiveDevice(uav, ant) {
  /** @description Configurate actives' drones actions according to its state
    * @param {object} uav Object with drone's info
    * @param {string} ant Mode of the drone (idle, automatic, assisted)
    * @return Enable or disable actions wether of the state
  **/
  if(ant == uav.mode) {
    //Si el estado del dron ACTIVO no ha cambiado
    if(uav.mode == 'IDLE') {
      modeIdle(uav);
      if(uav.automatic && uav.automatic.paused) {
        modePause(uav);
      } else {
        if(uav.automatic) {
          activatePlay(uav.id);
        } else {
          desactivatePlay(uav.id);
        }
      }
      if(uav.landed) {
        
      } else {
        
      }
    } else if (uav.mode == 'AUTOMATIC') {
      modeMission(uav);
      if(uav.aim=='Evasion') {
        modeAutoEvasion();
      } else if (uav.automatic && uav.automatic.paused) {
        modePause(uav);
      }
    } else if (uav.mode == 'ASSISTED') {
      modeAssisted(uav);
    }
  } else {
    //Si ha habido cambio de estado en el dron ACTIVO
    if(ant == 'IDLE' && uav.mode == 'AUTOMATIC') {
      modeMission(uav);
      if(uav.connect && uav.automatic.mId) {
        findMissionById(uav.automatic.mId)
      }
    } else if(ant == 'IDLE' && uav.mode == 'ASSISTED') {
      modeAssisted(uav);
    } else if (ant == 'IDLE' && uav.mode == 'MANUAL') {
      modeIdle2Manual(uav);
    } else if (ant == 'MANUAL' && uav.mode == 'IDLE') {
      modeManual2Idle(uav);
    } else if (ant == 'MANUAL' && uav.mode == 'AUTOMATIC') {
      modeManual2Mission(uav);
    } else if (ant == 'MANUAL' && uav.mode == 'ASSISTED') {
      changeIconManual(uav.id, false, uav.manual);
    } else if (ant == 'AUTOMATIC' && uav.mode == 'MANUAL') {
      modeMission2Manual(uav);
    } else if (ant == 'AUTOMATIC' && uav.mode == 'IDLE') {
      modeMission2Idle(uav);
      if(uav.automatic && uav.automatic.paused) {
        modePause(uav);
      }
    } else if (ant == 'ASSISTED' && uav.mode == 'MANUAL') {
      modeAssisted2Manual(uav);
    } else if (ant == 'ASSISTED' && uav.mode == 'AUTOMATIC') {
      modeMission(uav);
      if(uav.connect && uav.automatic.mId) {
        findMissionById(uav.automatic.mId)
      }
      if(uav.automatic && uav.automatic.paused) {
        modePause(uav);
      }
    } else if (ant == 'AUTOMATIC' && uav.mode == 'ASSISTED') {
      modeAssisted(uav);
    } else if (ant == 'ASSISTED' && uav.mode == 'IDLE') {
       modeAssisted2Idle(uav);
    }
  }
}

function stateNotActiveDevice(uav, ant) {
  /** @description Configurate not actives' drones actions according to its state
    * @param {object} uav Object of drone "class"
    * @param {string} ant Mode of the drone
    * @return Enable or disable actions wether of the state
  **/
  if(ant == uav.mode) {
    //Si el estado del dron no ha cambiado
    if(uav.mode == 'IDLE') {
      //No hay cambios
    } else if (uav.mode == 'MANUAL') {
      //En principio nunca podría darse este estado
    } else if (uav.mode == 'AUTOMATIC') {
      //Estaba en misión y continúa en misión
    } else if (uav.mode == 'ASSISTED') {
      //Estaba en misión y continúa en misión
    }
  } else {
    //Si ha habido cambio de estado
    if(ant == 'IDLE' && uav.mode == 'AUTOMATIC') {
      //Estado inalcanzable, ya que no es el dronActivo
    } else if(ant == 'IDLE' && uav.mode == 'ASSISTED') {
      //Estado inalcanzable, ya que no es el dronActivo
    } else if (ant == 'IDLE' && uav.mode == 'MANUAL') {
      //Estado inalcanzable, ya que no es el dronActivo
    } else if(ant == 'AUTOMATIC' && uav.mode == 'ASSISTED') {
      //Estado inalcanzable, ya que no es el dronActivo
    } else if (ant == 'ASSISTED' && uav.mode == 'AUTOMATIC') {
      //Estado inalcanzable, ya que no es el dronActivo
      disableAbortFinalAction(uav.id);
    } else if (ant == 'ASSISTED' && uav.mode == 'MANUAL') {
      //Estado inalcanzable, ya que no es el dronActivo
      disableAbortFinalAction(uav.id);
    } else if (ant == 'MANUAL' && uav.mode == 'AUTOMATIC') {

    } else if (ant == 'AUTOMATIC' && uav.mode == 'MANUAL') {

    } else if (ant == 'MANUAL' && uav.mode == 'IDLE') {

    } else if (ant == 'AUTOMATIC' && uav.mode == 'IDLE') {

    } else if (ant == 'ASSISTED' && uav.mode == 'IDLE') {
      disableAbortFinalAction(uav.id);
    }
  }
}

/******************************************************************************/
/* CONFIGURA EL ESTADO IDLE DEL DRON                                          */
/******************************************************************************/
function modeIdle(uav) {
  disableAbortFinalAction(uav.id);
  desactiveMissionControl(uav.id);
}

function modeAssisted2Manual(uav) {
  disableAbortFinalAction(uav.id);
}

/******************************************************************************/
/* CONFIGURA EL ESTADO IDLE DEL DRON TRAS MISIÓN NORMAL                       */
/******************************************************************************/
function modeMission2Idle(uav) {
  misionFinalizadaVisual(uav);
}

/******************************************************************************/
/* CONFIGURA EL ESTADO IDLE DEL DRON TRAS MISIÓN ASSISTED                     */
/******************************************************************************/
function modeAssisted2Idle(uav) {
  misionFinalizadaVisual(uav);
  disableAbortFinalAction(uav.id);
}

/******************************************************************************/
/* CONFIGURA EL ESTADO MISSION DEL DRON                                       */
/******************************************************************************/
function modeMission(uav) {
  $(document.getElementById('divPlay'+uav.id)).addClass('noVisible');
  $(document.getElementById('divPause'+uav.id)).removeClass('noVisible');
  $(document.getElementById('divContinuar'+uav.id)).addClass('noVisible');
  activeMissionControl(uav.id);
  disableAbortFinalAction(uav.id);
}

/******************************************************************************/
/* CONFIGURA EL ESTADO ASSISTED DEL DRON                                      */
/******************************************************************************/
function modeAssisted(uav) {
  desactiveMissionControl(uav.id);
  enableAbortFinalAction(uav.id);
}

/******************************************************************************/
/* CONFIGURA EL CLIENTE PARA UNA MISIÓN PAUSADA                               */
/******************************************************************************/
function modePause(uav) {
  $(document.getElementById('divPlay'+uav.id)).addClass('noVisible');
  $(document.getElementById('divPause'+uav.id)).addClass('noVisible');
  $(document.getElementById('divContinuar'+uav.id)).removeClass('noVisible');
  disableAbortFinalAction(uav.id);
}

function modeAutoEvasion() {

}

/******************************************************************************/
/* ACTIVA EL BOTÓN DE PLAY MISSION                                            */
/******************************************************************************/
function activatePlay(id) {
  $(document.getElementById('divPlay'+id)).removeClass('noVisible');
  $(document.getElementById('divPause'+id)).addClass('noVisible');
  $(document.getElementById('divContinuar'+id)).addClass('noVisible');
}

/******************************************************************************/
/* DESACTIVA EL BOTÓN DE PLAY MISSION                                         */
/******************************************************************************/
function desactivatePlay(id) {
  $(document.getElementById('divPlay'+id)).removeClass('noVisible');
  $(document.getElementById('divPause'+id)).addClass('noVisible');
  $(document.getElementById('divContinuar'+id)).addClass('noVisible');
}

/******************************************************************************/
/* CONFIGURA EL CLIENTE TRAS RECIBIR LA NOTIFICACIÓN DE FIN DE MISIÓN         */
/******************************************************************************/
function misionFinalizadaVisual(uav) {
  $(document.getElementById('divPlay'+uav.id)).removeClass('noVisible');
  $(document.getElementById('divPause'+uav.id)).addClass('noVisible');
  $(document.getElementById('divContinuar'+uav.id)).addClass('noVisible');
}

//Desactiva el boton de ABORT FINAL ACTION
function disableAbortFinalAction(id) {
  if(!$('#btnFinalAction'+id).hasClass('noVisible')) {
    $('#btnFinalAction'+id).addClass('noVisible');
    document.getElementById('btnFinalAction'+id).disabled = true;
  }
}

//Activa el boton de ABORT FINAL ACTION
function enableAbortFinalAction(id) {
  if($('#btnFinalAction'+id).hasClass('noVisible')) {
    $('#btnFinalAction'+id).removeClass('noVisible');
    document.getElementById('btnFinalAction'+id).disabled = false;
  }
}

//Activa los botones de control de misión
function activeMissionControl(id) {
  if($(document.getElementById('tabSmallMissions'+id)).hasClass('noVisible')) {
    $(document.getElementById('tabSmallMissions'+id)).removeClass('noVisible');
  }
}

//Desactiva los botones de control de misión
function desactiveMissionControl(id) {
  if(!$(document.getElementById('tabSmallMissions'+id)).hasClass('noVisible')) {
    $(document.getElementById('tabSmallMissions'+id)).addClass('noVisible');
  }
}


function abortFinalAction(erDevice, event) {
  event.stopPropagation();
  if(erDevice && erDevice.currentTask && erDevice.currentTask.id) {
    let data = {deviceId: erDevice.id, taskId: erDevice.currentTask.id};
    ajaxPost('device/abortTask', data)
    .then(salida => {
      if(salida.result.error == 'ERR_NOERROR') {
        showNotify('Abort - Command received Abort final action', 'success');
      } else {
        showNotify('Abort - '+salida.result.error, 'danger');
      }
    })
    .catch(err => {
      showNotify('Abort - '+(err.message || err), 'danger');
    });
  } else {
    showNotify('Abort - No current task to abort', 'warning');
  }
}

function showAbortOptions(id, event) {
  event.stopPropagation();
  document.getElementById('idDevicechooseAbortType').value = id;
  let myModal = new bootstrap.Modal('#chooseAbortTypeModal', {
    backdrop: 'static',
    keyboard: false
  });
  myModal.show();
}

function parseGoTo(event) {
  //Si tengo un dispositivo
  let mDevice = devices.find(elem => elem.online && elem.connect);
  if(mDevice) {
    let altitude = mDevice.landed ? 20 : mDevice.position.altitude;
    document.getElementById('latitudeGoTo').value = event.latlng.lat.toFixed(5);
    document.getElementById('longitudeGoTo').value = event.latlng.lng.toFixed(5);
    document.getElementById('altitudeGoTo').value = altitude;
    let myModal = new bootstrap.Modal('#GoToConfiguration', {});
    myModal.show();
  }
}

function sendGoTo() {
  let mDevice = devices.find(elem => elem.online && elem.connect);
  if(mDevice) {
    let altitude = parseFloat(document.getElementById('altitudeGoTo').value);
    if(isNaN(altitude)) {
      showNotify('Send Go To - Bad altitude value', 'danger');
    } else {
      let data = {
        deviceId: mDevice.id, altitude: altitude,
        latitude: parseFloat(document.getElementById('latitudeGoTo').value),
        longitude: parseFloat(document.getElementById('longitudeGoTo').value)
      };
      ajaxPost('device/sendGoTo', data)
      .then(salida => {
        if(salida.result.error == 'ERR_NOERROR') {
          showNotify('Send Go To - Latitude: '+data.latitude+', Longitude: '+data.longitude+', Altitude: '+data.altitude, 'success');
        } else {
          showNotify('Send Go To - '+(salida.result.error), 'danger');
        }
      })
      .catch(err => {
        showNotify('Send Go To - '+(err.message || err), 'danger');
      });
    }
  } else {
    showNotify('Send Go To - No device in manual mode', 'danger');
  }
}
