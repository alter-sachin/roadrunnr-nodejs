var requestJSON = require('request-json');
var jsonfile    = require('jsonfile');
var geoCoder    = require('./geoServices.js');

var config = {
  'production' : {
    'CLIENT_ID'     : 'YOUR-PRODUCTION-CLIENT-ID',
    'CLIENT_SECRET' : 'YOUR-PRODUCTION-CLIENT-SECRET',
  },
  'test' :{
    'CLIENT_ID'     : 'YOUR-TEST-CLIENT-ID',
    'CLIENT_SECRET' : 'YOUR-TEST-CLIENT-ID',
  }
}

var HOSTS = {
  production: 'http://roadrunnr.in/',
  test      : 'http://128.199.241.199/'
}

var ROADRUNNER_OAUTH_JSON_PATH = './send_with_pi/roadrunnrOAuthSendWithPi.json';

var currentHost = HOSTS['production'];
var logistics   = config['production'];

var API = {
  SHIP           : 'v1/orders/ship',
  CANCEL         : 'v1/orders/', // + roadrunnerId + /cancel // To be implemented
  TRACK          : 'v1/orders/', // + roadrunnerId + /cancel // To be implemented
  SERVICEABILITY : 'v1/orders/serviceability/',
}

var client = requestJSON.createClient(currentHost);
client.headers['cache-control'] = 'no-cache';
client.headers['content-type'] = 'Application/JSOn';

exports.Runnr = function() {
  this.OrderRequest = OrderRequest;
  this.ship = function(callback) {
    shipOrder(this, callback);
  }
  this.assignLatLng = function(callback) {
    geoCoder.getLatLngForAddressString(this.OrderRequest.pickup.user.full_address.address, function(error, pickupGeo) {
      if (error) {
        callback(error);
      } else {
        geoCoder.getLatLngForAddressString(this.OrderRequest.drop.user.full_address.address, function(error, dropGeo) {
          if (error) {
            callback(error);
          } else {
            this.OrderRequest.pickup.user.full_address.geo.latitude  = pickupGeo.lat;
            this.OrderRequest.pickup.user.full_address.geo.longitude = pickupGeo.lng;

            this.OrderRequest.pickup.user.full_address.geo.latitude  = dropGeo.lat;
            this.OrderRequest.pickup.user.full_address.geo.longitude = dropGeo.lng;
            callback(null);
          }
        });
      }
    });
  }
}

var OrderRequest = {
  pickup: {
    user: {
      name: '',
      phone_no: '',
      email: '',
      type: 'merchant',
      external_id: 'BLR-aafe',
      full_address: {
        address: '',
        locality: {
         name: '',
        },
        sub_locality: {
         name: '',
        },
        city: {
          name: '',
        },
        geo: {
          latitude: '',
          longitude: '',
        },
      },
    },
  },
  drop: {
    user: {
      name: '',
      phone_no: '',
      email: '',
      type: 'customer',
      external_id: 'BLR-aafe',
      full_address: {
        address: '',
        locality: {
         name: '',
        },
        sub_locality: {
         name: '',
        },
        city: {
          name: '',
        },
        geo: {
          latitude: '',
          longitude: '',
        },
      },
    },
  },
  order_details: {
    order_id: '',
    order_value: '',
    amount_to_be_collected: '',
    expected_delivery_time: '',
    order_type: {
      name: '',
    },
    order_items: [
      {
        quantity: 0,
        price: 0,
        item: {
          name: '',
        }
      },
    ],
    created_at : '',
  },
  callback_url: '',
}

function shipOrder(Runnr, callback) {
  getOAuthToken(function(error, token) {
    client.headers['authorization'] = 'Token ' + token;
    // console.log(Runnr.OrderRequest);
    var data  = Runnr.OrderRequest;
    client.post(API.SHIP, data, function(error, response, body) {
      console.log(response);
      if (error) {
        console.error("Request error: " + error);
        callback(error, null);
      } else {
        if (response.statusCode == 200) {
          if (body.status.code != 200) {
            callback(body.status.code, body);
          } else {
            // Roadrunnr Success
            callback(null, body);
          }
        } else if (response.statusCode == 401) {
          // Token has expired, need to refresh
          getNewToken(function(error, token) {
            shipOrder(OrderRequest, callback);
          });
        } else {
          callback(response.statusCode, null);
        }
      }
    });
  });
}

function getOAuthToken(callback) {
  var file = ROADRUNNER_OAUTH_JSON_PATH;
  jsonfile.readFile(file, function(err, obj) {
    if (err) {
      getNewToken(callback);
    } else {
      callback(null, obj.access_token);
    }
  });
}

function getNewToken(callback) {
  var getTokenEP = 'oauth/token?grant_type=client_credentials&client_id=' + logistics.CLIENT_ID + '&client_secret=' + logistics.CLIENT_SECRET;
  client.get(getTokenEP, function(error, response, body) {
    if (error) {
      console.error("Request error: " + error);
      callback(error, response);
    } else {
      if (body.error) {
        console.error("Error returned from Roadrunnr: ", body.error);
        console.log("Results: " + body);
        callback(body.error, body);
      } else {
        console.log("Results: " + body);
        jsonfile.writeFile(ROADRUNNER_OAUTH_JSON_PATH, body, function (err) {
          if (err) {
            console.error('Write error: ' + err);
          }
          callback(err, body.access_token);
        });
      }
    }
  });
}