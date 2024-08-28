'use strict';
let map;
let googleSat;
let devices = [];
let missions = [];
let myCenter = L.latLng(0, 0);   // Centro inicial para el mapa
let isManual = false;
let iconManual = [
  {icon: '<i class="manuWhite" aria-hidden=true></i>'},
  {icon: '<i class="manuGreen" aria-hidden=true></i>'},
  {icon: '<i class="manuYellow" aria-hidden=true></i>'},
  {icon: '<i class="manuRed" aria-hidden=true></i>'},
  {icon: '<i class="autoGreen" aria-hidden=true></i>'},
  {icon: '<i class="autoYellow" aria-hidden=true></i>'},
];

let elementsInRight = [
  {level: 'playVideo',
   icon: '<i class="streamingButWhite" aria-hidden=true></i>',
  },
  {level: 'takePhoto',
   icon: '<i class="fa fa-camera" aria-hidden=true></i>',
   iconBanned: '<span class="fa-stack fa-lg"><i class="fa fa-camera fa-stack-1x"></i><i class="fa fa-ban fa-stack-2x text-danger"></i></span>'
  },
  {level: 'recVideo',
   icon: '<i id="linkRecVideo1" class="fa fa-video-camera" aria-hidden=true></i>',
   iconBanned: '<span class="fa-stack fa-lg"><i class="fa fa-video-camera fa-stack-1x"></i><i class="fa fa-ban fa-stack-2x text-danger"></i></span>'
  },
  {level: 'playVideo2',
   icon: '<i class="streamingButGreen" aria-hidden=true></i>',
  },
  {level: 'playVideo3',
   icon: '<i class="streamingButRed" aria-hidden=true></i>',
 },
  {level: 'playVideo3',
   icon: '<i class="streamingButOrange" aria-hidden=true></i>',
  }
];


$(document).ready(function() {
    map = L.map(document.getElementById("map"), { closePopupOnClick: false, zoomControl: false, attributionControl: false}).setView([36.74700544809835, -4.55431044306826], 16);
    loadLayers(map);
    if(strDevices) {
      let devicesBD = JSON.parse(strDevices.replace(/&quot;/g, '\"'));
      printDevices(devicesBD)
      .then(ok => {
        initTelemetryDevices();
      })
      .catch(err => {
          console.log(err);
      });
    }
    map.addEventListener('contextmenu', parseGoTo);
    if(currentUser.admin == 1)
      createAdminButtons();

    let relojPrincipal = setInterval(function() {
      let fechaYhora = (dateFormated(new Date())).split(' ');
      let textTime = 'LOCAL'
      document.getElementById('hora').innerHTML=`${fechaYhora[1]} ${textTime}`;
    }, 1000);
    recivePostMessages();
});

function printDevices(arrayD) {
    return new Promise( (resolve, reject) => {
        try {
            arrayD.forEach(element => {
                let esta = devices.find(cosa => cosa.id == element);
                if(!esta) {
                    let newDevice = {
                        id: element, online: false, position: {latitude: 0, longitude: 0, altitude: 0},
                        mode: '', yaw: 0, battery: 0, heading: 0, lastUpdate: null, connect: false, selected: false,
                        speed: 0, name: element, 
                        counterLostConnection: null,
                        marker: L.marker(myCenter, {
                            rotationAngle: 0,
                            icon: deviceImage.landed,
                            id: element,
                            labelContent: L.tooltip({direction: 'bottom', permanent: true, className: 'tooltipClass', offset: [0, 30], arrowClass: ''})
                                          .setContent(element)
                                          .setLatLng(myCenter)
                            })
                            .bindPopup(L.popup({closeButton: false, autoPan: false, className: 'zIndex1071'}).setContent(''))
                            .addEventListener('mouseout', closePopUp)
                            .addEventListener('mouseover', openPopUp)
                    };
                    devices.push(newDevice);
                    fillDeviceBox(newDevice);
                }
            });
            resolve(true)
        } catch (error) {
            reject(error)
        }
    })
}

function fillDeviceBox(device) {
    try {
        let deviceTable = document.getElementById('tableDevices');
        let firstRow = document.createElement('div');
        firstRow.className = "row col-sm-12 padding0";
        let secondRow = document.createElement('div');
        secondRow.className = "row col-sm-12 padding0 marginBottom3 paddingLeft6";
        let thirdRow = document.createElement('div');
        thirdRow.id = "baldoThirdRow"+device.id;
        thirdRow.className = "row col-sm-12 padding0 height35 noVisible";

        let card = document.createElement('div');
        card.id=device.id;
        card.className = 'card baldoDevice baldosa backgroundDevices borderWhite opacity06';
        card.setAttribute('name', device.id);
        card.setAttribute('valor', device.id);

        let {labelCheck, name, telem} = fillFirstRow(device);
        let {butOpen, cursive, divButtons, divButFinal, detecting} = fillSecondRow(device);

        firstRow.appendChild(labelCheck);
        firstRow.appendChild(name);

        secondRow.appendChild(butOpen);
        secondRow.appendChild(cursive);
        secondRow.appendChild(detecting);

        card.appendChild(firstRow);
        card.appendChild(secondRow);
        card.appendChild(thirdRow);

        let telemForm = telemetrySection(device.id);
        card.appendChild(telemForm);

        deviceTable.appendChild(card);

        firstRow.appendChild(telem);
        thirdRow.appendChild(divButtons);
        thirdRow.appendChild(divButFinal);

    } catch (e) {
        console.log(e)
    }
}

function fillFirstRow(device) {
    let labelCheck = document.createElement('div');
    labelCheck.className = 'col-sm-2 pointer';
    labelCheck.onclick = (event) => event.stopPropagation();
  
    let input = document.createElement('input');
    input.className='checkContainer float-left checkList marginTop4 baldoCheck';
    input.type='checkbox';
    input.id='baldoCheck'+device.id;
    input.setAttribute('disabled', true);
    input.addEventListener('change', (e) => {
      device.selected = input.checked;
    });
    labelCheck.appendChild(input);
  
    let name = document.createElement('span');
    name.className = 'col-sm-5 top2px pointer nameType';
    name.innerHTML = `${device.name}`;
    name.id='baldoName';
    name.setAttribute('valor', device.id);
  
    let telem = document.createElement('span');
    telem.className = 'col-sm-5 padding0';
    let altitude = document.createElement('span');
    altitude.id = `altitude/${device.id}`;
    altitude.className = "col-sm-6 padding-1";
    telem.appendChild(altitude);
    let speed = document.createElement('span');
    speed.id = `speed/${device.id}`;
    speed.className = "col-sm-6 padding-1";
    telem.appendChild(speed);

    return {labelCheck, name, telem};
  }

  function manualSwhitch(uav, yaAcepto, event) {
    event.stopPropagation();
    if(uav.manual.user && uav.manual.user != currentUser.email) {
      if (yaAcepto) {
        let manualDev = findDeviceManualUser();
        if(manualDev) {
          document.getElementById('textFinishManual').innerHTML = `Please finish manual mode with ${manualDev.name} before starting with any other device.`;
          let myModal = new bootstrap.Modal('#finishManual', {
          });
          myModal.show();
        } else {
          verifyConfiguration(uav);
        }
      } else {
        document.getElementById('manualConflictId').value = uav.id;
        let myModal = new bootstrap.Modal('#manualConflict', {
        });
        myModal.show();
      }
    } else if(uav.manual.mId) {
      if(uav.currentMission && uav.currentMission.paused) {
        endMissionManual(uav);
      } else {
        showEndManualOptions(uav, null);
      }
    } else {
      let manualDev = findDeviceManualUser();
      if(manualDev) {
        document.getElementById('textFinishManual').innerHTML = `Please finish manual mode with ${manualDev.name} before starting with any other device.`;
        let myModal = new bootstrap.Modal('#finishManual', {
        });
        myModal.show();
      } else {
        verifyConfiguration(uav);
      }
    }
  }
  

  function fillSecondRow(device) {
    let butOpen = document.createElement('button');
    butOpen.id = 'moreInfo'+device.id;
    butOpen.className = 'padding0 col-sm-1 btn btn-azulSave fa fa-plus-circle colorBlanco butOpen noVisible';
    butOpen.onclick = (event) => baldoInfo(device.id, event);
  
    let cursive = document.createElement('i');
    cursive.id = 'status/'+device.id;
    cursive.innerHTML = 'offline';
    cursive.className='col-sm-8 offlineDev deviceStatus align-left';
  
    let detecting = document.createElement('i');
    detecting.id = 'detecting'+device.id;
    detecting.title = 'Detection:';
    detecting.className='col-sm-1 detectingBtn noVisible';
  
    let divButtons = document.createElement('div');
    divButtons.className = 'col-sm-3 inlineFlex noVisible marginLeft70px';
    divButtons.id = 'tabSmallMissions'+device.id;
  
    let btnPause = document.createElement('button');
    btnPause.id = 'divPause'+device.id;
    btnPause.title = 'Pause';
    btnPause.className = 'btn buttonExtremeRight fa fa-pause marginright3 height32px noVisible';
    btnPause.onclick = (event) => pauseMission(device, event);
    divButtons.appendChild(btnPause);
  
    let btnContinuar = document.createElement('button');
    btnContinuar.id = 'divContinuar'+device.id;
    btnContinuar.title = 'Continue';
    btnContinuar.className = 'btn buttonExtremeRight fa fa-mail-forward marginright3 height32px noVisible';
    btnContinuar.onclick = (event) => continueMission(device.id, event);
    divButtons.appendChild(btnContinuar);
  
    let btnAbort = document.createElement('button');
    btnAbort.id = 'abort'+device.id;
    btnAbort.title = 'Abort';
    btnAbort.className = 'btn buttonExtremeRight fa fa-times height32px';
    btnAbort.onclick = (event) => showAbortOptions(device.id, event);
    divButtons.appendChild(btnAbort);
  
    let divButFinal = document.createElement('div');
    divButFinal.className = 'col-sm-3 inlineFlex marginLeft70px noVisible';
    divButFinal.id = 'btnFinalAction'+device.id;
  
    let btnFinalAction = document.createElement('button');
    btnFinalAction.title = 'Abort final action';
    btnFinalAction.className = 'btn buttonExtremeRight fa fa-times height32px';
    btnFinalAction.onclick = (event) => abortFinalAction(device, event);
    divButFinal.appendChild(btnFinalAction);
  
    return {butOpen, cursive, divButtons, divButFinal, detecting};
  }

  function telemetrySection(id) {
    let telemForm = document.createElement('div');
    telemForm.className = 'box-body height56 row col-sm-12 marginAuto noVisible';
    telemForm.id = 'telemetryForm'+id;
    telemForm.onclick = (event) => event.stopPropagation();
  
    let gpsSection = document.createElement('div');
    gpsSection.className = 'gpsSection row col-sm-12';
  
    let latitude = document.createElement('div');
    latitude.className = 'col-sm-6 form-group';
    let latLabel = document.createElement('label');
    latLabel.innerHTML = 'Latitude'
    latLabel.setAttribute('for', 'lat_act');
    let latInput = document.createElement('input');
    latInput.className = 'form-control inputColor border0 input-sm';
    latInput.type = 'text'; latInput.readOnly = true;
    latInput.name = 'lat_act'; latInput.value = '';
  
    let longitude = document.createElement('div');
    longitude.className = 'col-sm-6 form-group';
    let lonLabel = document.createElement('label');
    lonLabel.innerHTML = 'Longitude';
    lonLabel.setAttribute('for', 'lon_act');
    let lonInput = document.createElement('input');
    lonInput.className = 'form-control inputColor border0 input-sm';
    lonInput.type = 'text'; lonInput.readOnly = true;
    lonInput.name = 'lon_act'; lonInput.value = '';
  
    latitude.appendChild(latLabel);
    latitude.appendChild(latInput);
    longitude.appendChild(lonLabel);
    longitude.appendChild(lonInput);
    gpsSection.appendChild(latitude);
    gpsSection.appendChild(longitude);
  
    telemForm.appendChild(gpsSection);

    let flightSection = document.createElement('div');
    flightSection.className = 'flightSection row col-sm-12';

    let battery = document.createElement('div');
    battery.className = 'col-sm-6 form-group';
    let batLabel = document.createElement('label');
    batLabel.innerHTML = 'Battery';
    batLabel.id = 'batName'+id;
    batLabel.setAttribute('for', 'battery');
    let batInput = document.createElement('input');
    batInput.className = 'form-control inputColor border0 input-sm';
    batInput.id = 'batteryP'+id;
    batInput.type = 'text'; batInput.readOnly = true;
    batInput.name = 'battery'; batInput.value = '';

    batLabel.appendChild(batInput);
    battery.appendChild(batLabel);

    flightSection.appendChild(battery);

    telemForm.appendChild(flightSection);
    return telemForm;
  }

function initTelemetryDevices() {
    socket.on('telemetryDevices', function(telem) {
        if(typeof telem === 'string') {
            telem = JSON.parse(telem)
        }
        parseTelemetryBySocket(telem);
    });
}

function parseTelemetryBySocket(telem) {
    uavTelemetry(telem.id, telem);
}

function loadLayers(map) {
    googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      minZoom: 1,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      unloadInvisibleTiles: true,
      preferCanvas: true,
      renderer: L.canvas()
    }).addTo(map);
  }

  function openPopUp() {
    this.openPopup();
  }
  
  function closePopUp() {
    this.closePopup();
  }

  function baldoInfo(id, event) {
    event.stopPropagation();
    if($('#telemetryForm'+id).hasClass('noVisible')) {
      $('#telemetryForm'+id).removeClass('noVisible');
      $('#moreInfo'+id).removeClass('fa fa-plus-circle');
      $('#moreInfo'+id).addClass('fa fa-minus-circle');
      $(`#_${id}`).removeClass('noVisible');
    } else {
      $('#telemetryForm'+id).addClass('noVisible');
      $('#moreInfo'+id).removeClass('fa fa-minus-circle');
      $('#moreInfo'+id).addClass('fa fa-plus-circle');
      $(`#_${id}`).addClass('noVisible');
    }
  }

  /******************************************************************************/
/* FUNCIÓN QUE CORTA LA COMUNICACIÓN CON EL DRON                              */
/******************************************************************************/
function borrarDron(dron) {
    let newId = dron.getAttribute('valor');
    let device = devices.find(cosa => cosa.id == newId);
    if(device) {
      if(device.marker) {
        map.removeLayer(device.marker.options.labelContent);
        map.removeLayer(device.marker);
      }
      device.connect = false;      
      disableAbortFinalAction(device.id);
      desactiveMissionControl(device.id);
    }
  }