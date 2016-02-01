var geocoder    = require('geocoder');

exports.getLatLngForAddressString = function(addressString, callback) {
  getLatLngForAddressString(addressString.replace(/,/g, ""), callback); // Stripping unwanted commas
}

function getLatLngForAddressString(addressString, callback) {
  geocoder.geocode(addressString, function (err, data) {
    console.log(addressString);
    if (err) {
      console.log(data);
      callback(err, data)
    } else {
      if (data.results.length < 1) {
        callback('geocode lat lng not found', 'geocode lat lng not found');
      } else {
        console.log('Found ' + data.results.length + ' results.');
        console.log('Using ' + JSON.stringify(data.results[0].geometry.location));

        var geo = {
          lat: data.results[0].geometry.location.lat,
          lng: data.results[0].geometry.location.lng,
        }

        callback(null, geo);
      }
    }
  });
}