'use strict'
require('dotenv').config();
const amqp  = require('amqplib');
const EventEmitter = require('events');

const loggerLibrary = require('../loggerlib/index');
const IdGenerator = require('../uuid-generator/index');
const Promise = require('bluebird');
const ToBoolean = require('to-boolean');
const emitter = new EventEmitter();
const idGen = new IdGenerator({alphabet: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', idLength: 10});
const erLogger =  new loggerLibrary('log', 'Rabbit');

const TIMEOUT = 3000;

class Rabbit {
  constructor(connectionOpts) {
    const self = this
    self.connectionParameters = connectionOpts;
    self.logger = erLogger;
    self.correlationGen = idGen;
    self.channel = null;
    self.ready = false;
    self.arrayInfo = [];
    self.pingInterval = null;
  }

  convert2String(elem) {
    const self = this;
    const objectConstructor = ({}).constructor;
    return new Promise( (resolve, reject) => {
      if (elem.constructor === objectConstructor) {
        resolve(JSON.stringify(elem));
      } else {
        reject('ERR_BAD_ELEMENT_FORMAT');
      }
    });
  }

  connect() {
    const self = this;
    return new Promise((resolve, reject) => {
      try {
        amqp.connect(self.connectionParameters)
        .then((connection) => {
          self.connection = connection;
          self.pingInterval = setInterval(() => self.pingPublish(self), 3000);
          self.logger.log('success', 'Connection created');
          resolve(true);
        })
        .catch(err => {
          self.logger.log('error', 'Connection Error::Connect::'+err.message);
          reject(err);
        })
      } catch(e) {
        self.logger.log('error', 'Connection Error::Catch::'+e.message);
        reject(e);
      }
    });
  }

  initReconnect() {
    const self = this;
    if(self.ready) {
      self.logger.log('warn', 'initReconnect::Trying to reconnect');
      self.ready = false;
      self.reConnect()
      .then(ok => {
        self.logger.log('success', 'Reconnection completed');
        self.ready = true;
      })
      .catch(err => {
        self.logger.log('error', 'ReConnection Error::'+(err.message || err));
      });
    } else {
      self.logger.log('warn', 'initReconnect::Already on this mode');
    }
  }

  reConnect() {
    const self = this;
    return new Promise( (resolve, reject) => {
      self.connect()
      .then(ok => self.createChannel())
      .then(channel => {
        self.channel = channel;
        self.ready = true;
        self.mergeOldStatus()
        .then(ok => {
          resolve(true);
        })
        .catch(err => {
          self.logger.log('error', 'reConnect::MergeOldStatus Error::'+(err.message || err));
        });
      })
      .catch(err => {
        self.logger.log('error', 'reConnect::ReConnection Error::'+(err.message || err));
        self.logger.log('info', 'reConnect::ReConnection Next try in a second');
        setTimeout(function() {
          self.reConnect()
          .then(ok => resolve(ok))
          .catch(err => reject(err));
        }, 1000);
      });
    });
  }

  mergeOldStatus() {
    const self = this;
    return new Promise( (resolve, reject) => {
      //Primero destruyo todos los event emitter que hubiera
      let array = emitter.eventNames();
      array.forEach((item) => {
        emitter.removeAllListeners(item);
      });
      //Ahora leo los valores almacenados y relanzo
      self.arrayInfo.forEach((elem) => {
        if(elem.queue) {
          self.deleteQueue(elem.queue)
          .then(ok => {
            self.logger.log('success', 'mergeOldStatus::'+elem.exchange+'::'+elem.queue+'::DELETE QUEUE OK');
          })
          .catch(err => {
            self.logger.log('error', 'mergeOldStatus::'+elem.exchange+'::'+elem.queue+'::Delete Queue Error::'+(err.message || err));
          });
        }
        if(elem.syncro) {
          self.listenMessageSynco(elem.exchange, elem.routingKey, elem.fnc, elem.params)
          .then(ok => {
            self.logger.log('success', 'mergeOldStatus::'+elem.exchange+'::'+elem.routingKey+'::Reconnection OK');
          })
          .catch(err => {
            self.logger.log('error', 'mergeOldStatus::'+elem.exchange+'::'+elem.routingKey+'::Reconnection Error::'+(err.message || err));
          });
        } else {
          self.joinPublisher(elem.exchange, elem.routingKey, elem.fnc, elem.params)
          .then(ok => {
            self.logger.log('success', 'mergeOldStatus::'+elem.exchange+'::'+elem.routingKey+'::Reconnection OK');
          })
          .catch(err => {
            self.logger.log('error', 'mergeOldStatus::'+elem.exchange+'::'+elem.routingKey+'::Reconnection Error::'+(err.message || err));
          });
        }
      });
      resolve(true);
    });
  }

  createChannel() {
    const self = this;
    return new Promise((resolve, reject) => {
      self.connection.createChannel()
      .then(channel => {
        self.logger.log('success', 'Channel created');
        resolve(channel);
      })
      .catch(err => {
        self.logger.log('error', 'Create Channel Error::'+err.message);
        reject(err);
      });
    });
  }

  checkExchange(channelName) {
    const self = this;
    return new Promise((resolve, reject) => {
      if(self.ready) {
        self.createChannel()
        .then(channelTest => {
          channelTest.on('error', (err) => {
            self.logger.log('error', 'checkExchange::channelTest::Error::'+err.message);
          });
          channelTest.on('close', (close) => {

          });
          channelTest.checkExchange(channelName)
          .then(exist => {
            channelTest.close()
            .then(cl => {

            })
            .catch(err => {
              self.logger.log('error', 'checkExchange::channelTest::Error::'+err.message);
            });
            resolve(exist);
          })
          .catch(err => {
            self.logger.log('error', 'checkExchange Error::'+err.message);
            reject(err);
          });
        })
        .catch(err => reject(err));
      } else {
        reject(new Error('ERR_RABBIT_NOT_INITIALIZED'))
      }
    });
  }

  assertExchange(channelName) {
    const self = this;
    return new Promise((resolve, reject) => {
      if(self.ready) {
        self.channel.assertExchange(channelName, 'topic', {
          durable: false, autoDelete: true
        })
        .then(assert => {
          resolve(assert);
        })
        .catch(err => {
          self.logger.log('error', 'Assert Exchange Error::'+err.message);
          self.initReconnect();
          reject(err);
        });
      } else {
        reject(new Error('ERR_RABBIT_NOT_INITIALIZED'))
      }
    });
  }

  assertQueue(topic) {
    const self = this;
    return new Promise((resolve, reject) => {
      if(self.ready) {
        self.channel.assertQueue(topic, {
          exclusive: false, autoDelete: true, durable: false
        })
        .then(queue => {
          resolve(queue);
        })
        .catch(err => {
          self.logger.log('error', 'Assert Queue Error::'+err.message);
          reject(err);
        });
      } else {
        reject(new Error('ERR_RABBIT_NOT_INITIALIZED'))
      }
    });
  }

  bindQueue(queue, exchange, key) {
    const self = this;
    return new Promise((resolve, reject) => {
      if(self.ready) {
        self.channel.bindQueue(queue, exchange, key)
        .then(ok => {
          resolve(ok);
        })
        .catch(err => {
          self.logger.log('error', 'Bind Queue Error::'+err.message);
          reject(err);
        });
      } else {
        reject(new Error('ERR_RABBIT_NOT_INITIALIZED'))
      }
    });
  }

  msgPublish(exchange, key, msg, options) {
    const self = this;
    return new Promise((resolve, reject) => {
      if(self.ready) {
        self.convert2String(msg)
        .then(erMsg => {
          self.channel.publish(exchange, key, Buffer.from(erMsg), options)
          resolve(true);
        })
        .catch(err => reject(err));
      } else {
        reject(new Error('ERR_RABBIT_NOT_INITIALIZED'))
      }
    });
  }

  sendToQueue(queue, msg, options) {
    const self = this;
    return new Promise( (resolve, reject) => {
      if(self.ready) {
        self.convert2String(msg)
        .then(erMsg => {
          self.channel.sendToQueue(queue, Buffer.from(erMsg), options);
          resolve(true);
        })
        .catch(err => reject(err));
      } else {
        reject(new Error('ERR_RABBIT_NOT_INITIALIZED'))
      }
    });
  }

  deleteQueue(queue) {
    const self = this;
    return new Promise( (resolve, reject) => {
      if(self.ready) {
        self.channel.deleteQueue(queue)
        .then(ok => resolve(ok))
        .catch(err => reject(err));
      } else {
        reject(new Error('ERR_RABBIT_NOT_INITIALIZED'))
      }
    });
  }

  msgConsume(queue, routingKey, fnc, params, timeout) {
    const self = this;
    return new Promise((resolve, reject) => {
      if(self.ready) {
        if(timeout && (!isNaN(timeout))) {
          //Debemos hacer que conteste con TIMEOUT
          let myEvent = emitter.once(queue, fnc);
          let erTiempo;
          self.channel.consume(queue, function(msg) {
            if(msg) {
              clearTimeout(erTiempo);
              let preMsg = msg.content.toString();
              try {
                params['msg'] = JSON.parse(preMsg);
              } catch (e) {
                params['msg'] = {error: 'BAD_MESSAGE_FORMAT'};
                self.logger.log('error', 'msgConsume::Parse Error::'+e.message+'::Message::'+preMsg);
              } finally {
                emitter.emit(queue, params);
                self.channel.cancel(msg.fields.consumerTag);
                self.deleteQueue(queue);
              }
            }
          }, { noAck: true })
          .then(consum => {
            erTiempo = setTimeout(function() {
              params['msg'] = {error: 'ERR_CONNECTIONTIMEOUT'};
              emitter.emit(queue, params);
              self.channel.cancel(consum.consumerTag);
              self.deleteQueue(queue);
            }, timeout);
            resolve(myEvent);
          })
          .catch(err => {
            self.logger.log('error', 'msgConsume Error::'+err.message);
            reject(err);
          })
        } else {
          let myEvent = emitter.on(queue, fnc);
          self.channel.consume(queue, function(msg) {
            if(msg) {
              let preMsg = msg.content.toString();
              try {
                params['msg'] = JSON.parse(preMsg);
              } catch (e) {
                params['msg'] = {error: 'BAD_MESSAGE_FORMAT'};
                self.logger.log('error', 'msgConsume::Parse Error::'+e.message+'::Message::'+preMsg);
              } finally {
                emitter.emit(queue, params);
              }
            }
          }, { noAck: true })
          .then(ok => resolve(myEvent))
          .catch(err => {
            self.logger.log('error', 'msgConsume Error::'+err.message);
            reject(err);
          })
        }
      } else {
        reject(new Error('ERR_RABBIT_NOT_INITIALIZED'))
      }
    });
  }

  msgSyncro(queue, routingKey, fnc, params) {
    const self = this;
    return new Promise( (resolve, reject) => {
      if(self.ready) {
        self.channel.consume(queue, function(msg) {
          if(msg) {
            let preMsg = msg.content.toString();
            try {
              params['msg'] = JSON.parse(preMsg);
              fnc(params)
              .then(outGood => {
                self.sendToQueue(msg.properties.replyTo, outGood, {correlationId: msg.properties.correlationId})
                .catch(err => reject(err));
              })
              .catch(outFail => {
                self.sendToQueue(msg.properties.replyTo, outFail, {correlationId: msg.properties.correlationId})
                .catch(err => reject(err));
              });
            } catch (e) {
              self.logger.log('error', 'msgSyncro::Parse Error::'+e.message+'::Message::'+preMsg);
            }
          }
          self.channel.ack(msg);
        })
        .then(ok => resolve(true))
        .catch(err => {
          self.logger.log('error', 'msgConsume Error::'+err.message);
          reject(err);
        })
      } else {
        reject(new Error('ERR_RABBIT_NOT_INITIALIZED'))
      }
    });
  }

  pingPublish() {
    const self = this;
    self.publishMessage('ExchangePing', 'ping', {})
    .then(ok => {
      self.logger.log('info', 'pingPublish::OK');
    })
    .catch(err => {
      self.logger.log('error', 'pingPublish::'+(err.message || err));
    });
  }

  init() {
    const self = this;
    return new Promise((resolve, reject) => {
      //Primero inicio el logger
      let loggerMode = false;
      if(typeof process.env.DEBUG_MODE == 'string')
        loggerMode = ToBoolean(process.env.DEBUG_MODE);
      else
        loggerMode = self.connectionParameters.debugMode || false;
      self.logger.init(loggerMode)
      .then(ok => {
        self.connect()
        .then(ok => self.createChannel())
        .then(channel => {
            self.channel = channel;
            self.ready = true;

            self.channel.on('error', (err) => {
                self.logger.log('error', 'Connection::Channel::Error::'+err.message);
            });
            self.channel.on('close', () => {
                self.logger.log('info', 'Connection::Channel::Close');
            });

            self.connection.on('error', (err) => {
                self.logger.log('error', 'Connection Error::'+(err.message || err));
            });
            self.connection.on('close', () => {
                self.logger.log('error', 'Connection Close');
                self.initReconnect();
            });
            resolve(true);
        })
        .catch(err => reject(err));
      })
      .catch(err => {
        reject(err);
      });
    });
  }

  joinPublisher(exchangeId, queueId, fnc, params) {
    const self = this;
    return new Promise((resolve, reject) => {
      if(self.ready) {
        self.assertExchange(exchangeId)
        .then(exc => self.assertQueue(''))
        .then(astCol => {
          self.bindQueue(astCol.queue, exchangeId, queueId)
          .then(erBind => self.msgConsume(astCol.queue, queueId, fnc, params))
          .then(ok => {
            let bicho = self.arrayInfo.find(elem => elem.id == exchangeId+'_'+queueId);
            if(bicho) {
              bicho.queue = astCol.queue; bicho.fnc = fnc; bicho.params = params;
            } else {
              self.arrayInfo.push({
                id: exchangeId+'_'+queueId,
                exchange: exchangeId, routingKey: queueId,
                fnc: fnc, params: params, syncro: false, queue: astCol.queue
              });
            }
            resolve(true);
          })
          .catch(err => reject(err));
        })
        .catch(err => reject(err));
      } else {
        reject(new Error('ERR_RABBIT_NOT_INITIALIZED'))
      }
    });
  }

  sendMessageSynco(exchangeId, routingKey, mensaje, fnc, params) {
    const self = this;
    return new Promise((resolve, reject) => {
      if(self.ready) {
        let timeout = TIMEOUT;
        if(params.timeout && !isNaN(parseInt(params.timeout)))
          timeout = parseInt(params.timeout);
        self.assertExchange(exchangeId)
        .then(exc => self.assertQueue(''))
        .then(astCol => {
          self.bindQueue(astCol.queue, exchangeId, astCol.queue)
          .then(erBind => {
            let options = {correlationId: self.correlationGen.generate(), replyTo: astCol.queue};
            self.msgPublish(exchangeId, routingKey, mensaje, options)
            .then(allOk => {
              self.msgConsume(astCol.queue, options.correlationId, fnc, params, timeout)
              .then(ok => resolve(true))
              .catch(err => reject(err));
            })
            .catch(err => {
              self.deleteQueue(astCol.queue);
              reject(err);
            });
          })
          .catch(err => reject(err));
        })
        .catch(err => reject(err));
      } else {
        reject(new Error('ERR_RABBIT_NOT_INITIALIZED'))
      }
    });
  }

  listenMessageSynco(exchangeId, routingKey, fnc, params) {
    const self = this;
    return new Promise((resolve, reject) => {
      if(self.ready) {
        self.assertExchange(exchangeId)
        .then(exc => self.assertQueue(''))
        .then(astCol => {
          self.bindQueue(astCol.queue, exchangeId, routingKey)
          .then(erBind => {
            self.msgSyncro(astCol.queue, routingKey, fnc, params)
            .then(ok => {
              let bicho = self.arrayInfo.find(elem => elem.id == exchangeId+'_'+routingKey);
              if(bicho) {
                bicho.queue = astCol.queue; bicho.fnc = fnc; bicho.params = params;
              } else {
                self.arrayInfo.push({
                  id: exchangeId+'_'+routingKey,
                  exchange: exchangeId, routingKey: routingKey,
                  fnc: fnc, params: params, syncro: true, queue: astCol.queue
                });
              }
              resolve(ok);
            })
            .catch(err => reject(err));
          })
          .catch(err => reject(err));
        })
        .catch(err => reject(err));
      } else {
        reject(new Error('ERR_RABBIT_NOT_INITIALIZED'))
      }
    });
  }

  publishMessage(exchangeId, queueId, msg) {
    const self = this;
    return new Promise((resolve, reject) => {
      if(self.ready) {
        self.assertExchange(exchangeId)
        .then(exc => self.msgPublish(exchangeId, queueId, msg))
        .then(ok => resolve(true))
        .catch(err => reject(err));
      } else {
        reject(new Error('ERR_RABBIT_NOT_INITIALIZED'))
      }
    });
  }

}

module.exports = Rabbit

