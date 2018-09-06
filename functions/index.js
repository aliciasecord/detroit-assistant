// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const functions = require('firebase-functions');
const fetch = require('node-fetch');
const https = require('https');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');


process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const permitshost = 'https://data.detroitmi.gov'
const trashhost = 'https://apis.detroitmi.gov/waste_notifier/address/'

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  const parameter = request.body.queryResult.parameters;

  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }

  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  // Get address from user input
  const address = parameter.short_address;

  // Call the address API
  function permitssingle(agent){
    agent.add(`Looking up permits for ${address}`);
    singlepermits(address).then((output) => {
      response.json({ 'fulfillmentMessages': output });// Return the results of the API to Dialogflow
      return null;
    }).catch(() => {
      response.json({ 'fulfillmentMessages': `I don't know` });
    });
  }
  // Get trash type from user input
  const trash_type = parameter.trash_type;

  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }


  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('permits.single', permitssingle)
  intentMap.set('trash', trashlookup);
  // intentMap.set('your intent name here', yourFunctionHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);

});

function singlepermits(address){
  return new Promise((resolve, reject) => {
    // Create the path for the HTTP request to get the permit for a single address
    let path = '/resource/but4-ky7y.json' + '?$q=' + encodeURIComponent(address);
    console.log('API request: ' + host + path);

    // Make HTTP request to get the permits
    https.get(permitshost + path, (res) => {
      let body = ''; // var to store the response chunks
      res.on('data', (d) => { body += d; }); // store each response chunk
      res.on('end', () => {
        // After all the data has been received parse the JSON for desired data
        let response = JSON.parse(body);
        let numberofpermits = response.length;

        // Create response
        if (numberofpermits === 1)
          {let output = `There is ${numberofpermits} for that address.`}
        else
          {let output = `There are ${numberofpermits} for that address.`}

        // Resolve the promise with the output
        console.log(output);
        resolve(output);
      });
      res.on('error', (error) => {
        console.log(`Error calling the permits API: ${error}`)
      });
    });
  });
}
