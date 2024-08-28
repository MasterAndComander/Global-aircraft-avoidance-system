module.exports = function (Manager) {

    const express = require('express');
    const router = express.Router();
  
    router.get('/', (req, res, next) => {
        res.redirect('/mapView');
    });
  
    router.get('/mapView', async (req, res, next) => {
      let page = 'mapView';
      res.render(page, {
        page: page, missions: [], devices: process.env.DEVICEAGENT_LIST.split(' '),
        title: 'GASS'
      });
    });
  
    return router;
  }
  