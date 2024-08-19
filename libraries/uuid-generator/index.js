'use strict';

class uuidGenerator  {
  constructor (opts) {
    const self = this;
    self.alphabet = opts.alphabet;
    self.idLength = opts.idLength;
  }

  //PUBLIC FUNCTIONS
  generate () {
    const self = this;
    let rtn = '';
    for (let i = 0; i < self.idLength; i++) {
      rtn += self.alphabet.charAt(Math.floor(Math.random() * self.alphabet.length));
    }
    return rtn;
  }

}

module.exports = uuidGenerator;
