const functions = require('firebase-functions');
const admin = require('firebase-admin');
const GeoFire = require('geofire');

admin.initializeApp(functions.config().firebase);
const geoFire = new GeoFire(admin.database().ref('/geofire'));

var googleMapsClient = require('@google/maps').createClient({
  key: functions.config().google.maps_client_key
});

const stripe = require('stripe')(functions.config().stripe.secret_key);
const logging = require('@google-cloud/logging')();

exports.saveShop = functions.database.ref('/shops/{pushId}/data/address')
.onWrite(event => {
  let address = event.data.val();
  address = address.zipcode+', '+address.street+", "+address.city+", "+address.state+", "+address.country;
  let lat = 0;
  let lng = 0;
  googleMapsClient.geocode({
    address: address
  }, function(err, response) {
    if (!err) {
      let coords = response.json.results;
      lat = coords[0].geometry.location.lat;
      lng = coords[0].geometry.location.lng;

    }
    else {
      lat = 0;
      lng = 0;
    }
    return admin.database().ref('/shops/'+event.params.pushId+'/data/location').set({
      lat: lat,
      lng: lng
    }).then(function(){
      geoFire.set(event.params.pushId, [lat, lng]);
    }).catch(function(error) {
      geoFire.set(event.params.pushId, [lat, lng]);
    });
  });
});

exports.editShop = functions.database.ref('/shops/{pushId}/data/address')
.onUpdate(event => {
  let address = event.data.val();
  address = address.zipcode+', '+address.street+", "+address.city+", "+address.state+", "+address.country;
  let lat = 0;
  let lng = 0;
  googleMapsClient.geocode({
    address: address
  }, function(err, response) {
    if (!err) {
      let coords = response.json.results;
      lat = coords[0].geometry.location.lat;
      lng = coords[0].geometry.location.lng;

    }
    else {
      lat = 0;
      lng = 0;
    }
    return admin.database().ref('/shops/'+event.params.pushId+'/data/location').set({
      lat: lat,
      lng: lng
    }).then(function(){
      geoFire.set(event.params.pushId, [lat, lng]);
    }).catch(function(error) {
      geoFire.set(event.params.pushId, [lat, lng]);
    });
  });
});

exports.createStripeCustomer = functions.auth.user().onCreate(event => {
  const data = event.data;
  return stripe.customers.create({
    email: data.email,
  })
  .then(customer => {
    return admin.database().ref(`/users/${data.uid}`).update({ customerId: customer.id });
  })
  .catch(error => {
    throw new Error(error);
  });
});

/**
 * Firebase will create a url that will allow us to make a POST request
 * this function, in response, it will either take the token and add a card, or throw an error
 * https://us-central1-hellomoon-dev2.cloudfunctions.net/addPaymentSourceToCustomer
 */

exports.addPaymentSourceToCustomer = functions.https.onRequest((req, res) => {
  const token = req.body.token;
  const userId = req.body.userId;

  return admin.database().ref(`/users/${userId}`).once('value').then(snapshot => {
    const customerId = snapshot.val().customerId;
    return stripe.customers.createSource(customerId, { source: token });
  })
  .then((card) => {
    return admin.database().ref(`/cards/${userId}/${card.id}`).set({
      brand: card.brand,
      expiration: {
        month: card.exp_month,
        year: card.exp_year,
      },
      country: card.country,
      last4: card.last4,
    });
  })
  .then(() => res.status(200).send('Successfully Added Card!'))
  .catch((error) => {
    let errorMessage;

    if (error.type === 'StripeCardError') {
      errorMessage = error.message;
    } else {
      errorMessage = 'An unknown error occurred. Administration has been notified.';
    }

    console.error(error);
    res.status(400).send(errorMessage);
  });
});

// https://us-central1-hellomoon-dev2.cloudfunctions.net/removePaymentSourceFromCustomer

exports.removePaymentSourceFromCustomer = functions.https.onRequest((req, res) => {
  const userId = req.body.userId;
  const cardId = req.body.cardId;

  return admin.database().ref(`users/${userId}`).once('value')
  .then(snapshot => {
    const customerId = snapshot.val().customerId;
    return stripe.customers.deleteCard(customerId, cardId);
  })
  .then(({ id }) => {
    return admin.database().ref(`/cards/${userId}/${id}`).remove();
  })
  .then(() => res.status(200).send('Successfully Removed Payment Method'))
  .catch((error) => {
    let errorMessage;

    if (error.type === 'StripeCardError') {
      errorMessage = error.message;
    } else {
      errorMessage = 'An unknown error occurred. Administration has been notified.';
    }

    console.error(error);
    res.status(400).send(errorMessage);
  });
});
