// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const functions = require('firebase-functions');
const fetch = require('node-fetch');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');


process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

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

  // Get the main location for the permits api
  const permitsurl = `https://data.detroitmi.gov/resource/but4-ky7y.json?$q=`;

  // Call the address API
  function permitssingle(agent){
    agent.add(`Looking up permits for ${address}`);

    fetch(permitsurl + encodeURIComponent(address))
      .then(response => {return response.json()})
      .then(data => {
          agent.add(`There is ${data.length} permit for that ${address}.`)
          return data.length;
        })
      .catch(agent.add(`I don't know`))
  }
  // Get trash type from user input
  const trash_type = parameter.trash_type;

  // Array to define day of the week
  let weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Get the location for trash
  const trashurl = 'https://apis.detroitmi.gov/waste_notifier/address/'

  // Sample for trash
  function trashlookup(agent) {
    agent.add(`Searching for ${trash_type} in ${trashhost + address + '/'}`);

    fetch(trashurl + encodeURIComponent(address) + '/')
      .then(response => {return response.json()})
      .then(data => {
        if (trash_type === 'trash'){
          let date = new Date(data.next_pickups.trash.date)
        }
        else if (trash_type === 'bulk'){
          let date = new Date(data.next_pickups.bulk.date)
        }
        else if (trash_type === 'yard waste'){
          let date = new Date(data.next_pickups['yard waste'].date)
        }
        else if (trash_type === 'recycling'){
          let date = new Date(data.next_pickups.recycling.date)
        }
        else
          {return null}

        let day = weekday[date.getDay()]
        agent.add(`${trash_type} pickup is on ${day}`)
        return day
      })
      .catch(agent.add(`I'm not sure`));
    }

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
