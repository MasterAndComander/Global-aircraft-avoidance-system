'use strict';

const Rabbit = require('../libraries/rabbit-js/index.js');

const TIMEOUT = 3000;

class ManageSocket {
    constructor(server, logger, settings) {
      const self = this;
      self.server = server;
      self.options = settings;
      self.io = require('socket.io')(server);
      self.logger = logger;
      self.rabbit = new Rabbit(settings);
      self.deviceList = process.env.DEVICEAGENT_LIST.split(' ');
    }
  
    init() {
      const self = this;
      return new Promise( (resolve, reject) => {
        self.rabbit.init()
        .then(ok => {
          self.logger.log('success', "manageSocket::init::Rabbit::" + ok);
          resolve(ok);
          self.joinDeviceTelemetrys();
        })
        .catch(err => {
          self.logger.log('error', "manageSocket::init::Rabbit::"+ err.message);
          reject(err);
        });
      });
    }

    joinDeviceTelemetrys() {
        const self = this;
        try {
            self.asyncLoopMenor(0, self.deviceList.length, (loop) => {
                let device = self.deviceList[loop.iteration()];
                self.rabbit.joinPublisher(device, 'telemetry', self.telemetryDevices, {objeto: self})
                .then(ok => {
                    loop.next();
                })
                .catch(err => {
                    self.logger.log('error', 'init::joinDeviceTelemetrys::JoinMessage::'+device+'::'+(err.message || err));
                    loop.break(err);
                });
            }, (err) => {
                if(err)
                    self.logger.log('error', 'init::joinDeviceTelemetrys::LOOP::'+(err.message ? err.message : err));
                else
                    self.logger.log('success', 'init::joinDeviceTelemetrys::'+JSON.stringify(self.deviceList));
            });
        } catch (error) {
            self.logger.log('error', 'init::joinDeviceTelemetrys::Catch::'+(e.message ? e.message : e));
        }
    }
  
    telemetryDevices(params) {
      const self = params.objeto;
      try {
        let data = params.msg;
        if( (typeof data.id === 'string') && (typeof data.mode === 'string') &&
            (typeof data.gps === 'object') &&
            (!isNaN(data.gps.altitude)) &&
            (!isNaN(data.gps.latitude)) &&
            (!isNaN(data.gps.longitude))
        ) {
            data.online = true;
            self.io.emit('telemetryDevices', data);
        } else {
            self.logger.log('error', 'init::telemetryDevices::ERR_BADPARAMS');
        }
      } catch (e) {
        self.logger.log('error', 'telemetryDevices::Catch::'+(e.message ? e.message : e));
      }
    }
  
    routingFunction(params) {
      try {
        if(params && (typeof params.resolve === 'function') ) {
          let data;
          if(typeof params.msg === 'string')
            data = JSON.parse(params.msg);
          else if(typeof params.msg === 'object')
            data = params.msg
          else
            throw new Error('ERR_BAD_MSG_FORMAT');
          params.resolve(data);
        }
      } catch (e) {
        params.reject(e);
      }
    }
  
    sendMessage(target, routingKey, message, elapsedTime) {
      const self = this;
      return new Promise( (resolve, reject) => {
        let timer = TIMEOUT;
        if(elapsedTime && (!isNaN(elapsedTime)) && (parseInt(elapsedTime) > TIMEOUT))
          timer = elapsedTime;
        self.rabbit.sendMessageSynco(target, routingKey, message, self.routingFunction, {resolve: resolve, reject: reject, timeout: timer})
        .then(ok => {
  
        })
        .catch(err => reject(err));
      });
    }
  
    sendMessageAsync(target, routingKey, data) {
      const self = this;
      return new Promise( (resolve, reject) => {
        self.rabbit.publishMessage(target, routingKey, data)
        .then(ok => resolve({error: 'ERR_NOERROR'}))
        .catch(err => reject({error: err.message || err}));
      });
    }
  
    //Loop asincrono
    asyncLoopMenor (inicio, iterations, func, callback) {
        let index = inicio;
        let done = false;
        let numIterations=iterations;
        let loop = {
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
  
  }

  module.exports = ManageSocket;
