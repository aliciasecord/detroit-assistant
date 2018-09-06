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

  // Make it easier to call parameters
  const parameter = request.body.queryResult.parameters;

  // Default welcome agent
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }

  // Default fallback agent
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  // Get address from user input
  const address = parameter.short_address;

  // This is the url for the permits api
  const permitsurl = `https://data.detroitmi.gov/resource/but4-ky7y.json?$q=`;

  // Fetch the permits API
  function permitssingle(agent){
    fetch(permitsurl + encodeURIComponent(address))
      .then(response => {return response.json()})
      .then(data => {
          // Return the number of permit records for that address
          if (data.length === 1)
            {agent.add(`There is ${data.length} permit for that ${address}.`)}
          else {agent.add(`There are ${data.length} permits for that ${address}`)}
          // then statment has to have a return
          return data.length;
        })
      // Print something if the above doesn't work
      .catch(agent.add(`I don't know`))
  }
  // Get trash type from user input
  const trash_type = parameter.trash_type;

  // Array to define day of the week
  let weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Get the url for trash API
  const trashurl = 'https://apis.detroitmi.gov/waste_notifier/address/'

  // Fetch the trash API
  function trashlookup(agent) {
    fetch(trashurl + encodeURIComponent(address) + '/')
      .then(response => {return response.json()})
      .then(data => {
        // Return the date for each type of trash
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
        // Not sure what to do with this else statement
        else
          {return null}

        // Turn date into day of the week
        let day = weekday[date.getDay()]

        // return day
        return day
      })
      .then(day => {
        // Use day to create response
        agent.add(`${trash_type} pickup is on ${day}`)

        // then statment has to have a return
        return day
      })
      // Print something if the above doesn't work
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
