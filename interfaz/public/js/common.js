'use strict';
let currentUser = {name: 'Alberto', email: 'albertocobot@gmail.com'};

/******************************************************************************/
/* CREAMOS EL CONTENEDOR PARA LA CARGA DE INFORMACIÓN                         */
/******************************************************************************/
let cargando = document.createElement('div');
cargando.className = 'gifLoading';
cargando.id = 'carga';

function parseIcon(url, x, y) {
  return L.icon({
    iconUrl: url, iconSize: [x, y], 
    iconAnchor: [x/2, y], popupAnchor: [x-x-5, -y/2]
  });
}

function parseDeviceIcon(url, x, y) {
  return L.icon({
    iconUrl: url, iconSize: [x, y], 
    iconAnchor: [x/2, y/2], popupAnchor: [x-x-5, -y/2]
  });
}

function parseBool(val) {
  return (val==='true');
}

  //Elimina todos los hijos del elemento pasado como parametro
function clearDomElement(elem) {
  var box = document.getElementById(elem);
  if(box && box.hasChildNodes) {
    while (box.childNodes.length >= 1) {
      box.removeChild(box.firstChild);
    }
  }
}

//Elimina los hijos del elemento en si
function clearChildElements(box) {
  if(box && box.hasChildNodes) {
    while (box.childNodes.length >= 1) {
      box.removeChild(box.firstChild);
    }
  }
}

//Borra el elemento pasado como id
function eraseDomElement(elem) {
  let box =  document.getElementById(elem);
  if(box) {
    box.remove();
  }
}

//Borra el elemento pasado
function eraseElement(box) {
  if(box) {
    box.remove();
  }
}

function dateFormated(date) {
  let laFecha = new Date(date);
  if(laFecha == 'Invalid Date') {
    if(!isNaN(parseInt(date))) {
      date = parseInt(date)
    }
  }
  laFecha = new Date(date);
  let DD = ("0" + laFecha.getDate()).slice(-2);
  let MM = ("0" + (laFecha.getMonth() + 1)).slice(-2);
  let YYYY = laFecha.getFullYear();
  let hh = ("0" + laFecha.getHours()).slice(-2);
  let mm = ("0" + laFecha.getMinutes()).slice(-2);
  let ss = ("0" + laFecha.getSeconds()).slice(-2);
  let dateString = DD + "/" + MM + "/" + YYYY + " " + hh + ":" + mm + ":" + ss;
  return dateString;
}

function dateMinFormated(date) {
  if(!isNaN(parseInt(date))) {
    date = parseInt(date)
  } 
  let laFecha = new Date(date);
  let DD = ("0" + laFecha.getDate()).slice(-2);
  let MM = ("0" + (laFecha.getMonth() + 1)).slice(-2);
  let YYYY = laFecha.getFullYear();
  let dateString = DD + "/" + MM + "/" + YYYY;
  return dateString;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

$(document).ready(() => {
  
});

/******************************************************************************/
/* GESTIONA PETICIONES GET A WEBSERVICE                                       */
/******************************************************************************/
function ajaxGet(url, datos) {
  return new Promise( (resolve, reject) => {
    var req = new XMLHttpRequest();
    req.responseType = 'json';
    req.open('GET', '/'+url+'?'+datos, true);
    req.setRequestHeader('ajax-req', true);

    req.timeout = 30000;

    req.ontimeout = function(error) {
      reject('ERR_CONNECTIONTIMEOUT');
    }

    req.onload = function () {
      parseResponse(req)
      .then(out => {
        resolve(out);
      })
      .catch(err => {
        reject(err);
      });
    };

    req.onerror = function(error) {
      reject('ERR_CONNECTIONERROR');
    }

    req.send(null);
  });
}

/******************************************************************************/
/* GESTIONA PETICIONES POST A WEBSERVICE                                      */
/******************************************************************************/
function ajaxPost(url, datos) {
  return new Promise( (resolve, reject) => {
    var req = new XMLHttpRequest();
    req.responseType = 'json';
    req.open('POST', '/'+url, true);
    req.setRequestHeader('Content-type', 'application/json');
    req.setRequestHeader('ajax-req', true);

    req.timeout = 30000;

    req.ontimeout = function(error) {
      reject('ERR_CONNECTIONTIMEOUT');
    }

    req.onload = function () {
      parseResponse(req)
      .then(out => {
        resolve(out);
      })
      .catch(err => {
        reject(err);
      });
    };

    req.onerror = function(error) {
      reject('ERR_CONNECTIONERROR');
    }

    req.send(JSON.stringify(datos));
  });
}

function parseResponse(entrada) {
  return new Promise( (resolve, reject) => {
    try {
      if(!isNaN(entrada.status)) {
        if(entrada.status == 200 || entrada.status == 500 || entrada.status == 400 || entrada.status == 403) {
          if(entrada.response && (typeof entrada.response === 'object')) {
            var json = entrada.response
            var error = Object.keys(json);
            if((error.indexOf('success') > -1) && (typeof json.success === 'boolean')) {
              if(json.success) {
                resolve(json.data);
              } else {
                reject(json.error);
              }
            } else {
              reject('ERR_PARSERESPONSE');
            }
          } else {
            reject('ERR_PARSERESPONSE');
          }
        } else {
          reject('ERR_SERVERNOTRESPOND');
        }
      } else {
        reject('ERR_PARSERESPONSE');
      }
    } catch(e) {
      reject(e.message || e)
    }
  });
}

function sendPostMessage(source, target, body) {
  let msg = { source: source, target: target, body: body };
  if (window.opener) window.opener.postMessage(msg, window.opener.location.href);
}

function recivePostMessages() {
  window.addEventListener('message', function(event) {
    try {
      

    } catch(err) {
      showNotify(err, 'warning');
    }
  },false);
}

function showNotify(msg, type, position) {
  return $.notify({ message: msg }, { type: type, placement: position });
}

//Añade un mensaje de error en el elemento del DOM pasado como parámetro
function addErrorMessage(div, message) {
  var p = document.createElement('p');
  p.className='redBattery';
  p.innerHTML=message;
  document.getElementById(div).appendChild(p);
}

/******************************************************************************/
/* LOOPS ASINCRONOS                                                           */
/******************************************************************************/
function asyncLoopMenor(inicio, iterations, func, callback) {
  var index = inicio;
  var done = false;
  var numIterations=iterations;
  var loop = {
      next: function(init, fin) {
          if(init!=undefined){index=init;}
          if(fin!=undefined){numIterations=fin;}
          if (done) {
              return;
          }
          if (index < numIterations) {
              index++;
              func(loop);
          } else {
              done = true;
              callback();
          }
      },
      iteration: function() {
        return index - 1;
      },
      setIndex: function(value) {
        index=index+value;
      },
      break: function(value) {
        done = true;
        callback(value);
      },
      getEnd: function() {
        return numIterations;
      }
  };
  loop.next();
  return loop;
}

function asyncLoopMenorIgual(inicio, iterations, func, callback) {
  var index = inicio;
  var done = false;
  var numIterations=iterations;
  var loop = {
      next: function(inicio, fin) {
          if(inicio) {index=inicio;}
          if(fin){numIterations=fin;}
          if (done) {
              return;
          }
          if (index <= numIterations) {
              index++;
              func(loop);
          } else {
              done = true;
              callback(true);
          }
      },
      iteration: function() {
          return index - 1;
      },
      setIndex: function(value) {
        index=index+value;
      },
      break: function() {
          done = true;
          callback(false);
      },
      getEnd: function() {
        return numIterations;
      }
  };
  loop.next();
  return loop;
}