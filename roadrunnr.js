var requestJSON = require('request-json');
var jsonfile    = require('jsonfile');
var geocoder    = require('geocoder');

var HOSTS = {
  production: 'http://roadrunnr.in/',
  test      : 'http://128.199.241.199/'
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

module.exports = {
  'oauth_json_path' : './RoadRunnrOAuth.json',
  'config'          : {
    'CLIENT_ID'     : 'YOUR-PRODUCTION-CLIENT-ID',
    'CLIENT_SECRET' : 'YOUR-PRODUCTION-CLIENT-SECRET',
  }

  setRoadrunnrOAuthPath : function(path) {
    this.oauth_json_path = path;
  },

  setKeys : function(clientId, clientSecret) {
    this.config.CLIENT_ID     = clientId;
    this.config.CLIENT_SECRET = clientSecret;
  },

  OrderRequest : function() {
    return OrderRequest;
  },

  createShipment : function(orderRequest, callback) {
    getOAuthToken(function(error, token) {
      client.headers['authorization'] = 'Token ' + token;
      client.post(API.SHIP, orderRequest, function(error, response, body) {
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
            console.log('Roadrunnr credentials have expired. Requesting new tokens.');
            getNewToken(function(error, token) {
              this.createShipment(orderRequest, callback);
            });
          } else {
            callback(response.statusCode, null);
          }
        }
      });
    });
  },

  assignLatLong : function(orderRequest, callback) {
    getLatLngForAddress(orderRequest.pickup.user.full_address.address, function(error, pickupGeo) {
      if (error) {
        callback(error, null);
      } else {
        getLatLngForAddress(orderRequest.drop.user.full_address.address, function(error, dropGeo) {
          if (error) {
            callback(error, null);
          } else {
            orderRequest.pickup.user.full_address.geo.latitude  = pickupGeo.lat;
            orderRequest.pickup.user.full_address.geo.longitude = pickupGeo.lng;

            orderRequest.pickup.user.full_address.geo.latitude  = dropGeo.lat;
            orderRequest.pickup.user.full_address.geo.longitude = dropGeo.lng;
            callback(null, orderRequest);
          }
        });
      }
    });
  },

  function getOAuthToken(callback) {
    jsonfile.readFile(this.oauth_json_path, function(err, obj) {
      if (err) {
        getNewToken(callback);
      } else {
        callback(null, obj.access_token);
      }
    });
  },

  function getNewToken(path, callback) {
    var getTokenEP = 'oauth/token?grant_type=client_credentials&client_id=' + config.CLIENT_ID + '&client_secret=' + config.CLIENT_SECRET;
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
          jsonfile.writeFile(path, body, function (err) {
            if (err) {
              console.error('Write error: ' + err);
            }
            callback(err, body.access_token);
          });
        }
      }
    });
  },
}

function getLatLngForAddress(addressString, callback) {
  addressString = addressString.replace(/,/g, ""); // Stripping unwanted commas
  geocoder.geocode(addressString, function (err, data) {
    if (err) {
      callback(err, null)
    } else {
      if (data.results.length < 1) {
        console.error("Couldn't geocode the address");
        callback('geocode lat lng not found', null);
      } else {
        var geo = {
          lat: data.results[0].geometry.location.lat,
          lng: data.results[0].geometry.location.lng,
        }
        callback(null, geo);
      }
    }
  });
}