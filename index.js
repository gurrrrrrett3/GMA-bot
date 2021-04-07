//GMA DISCORD BOT

const Discord = require("discord.js")
const Client = new Discord.Client

//Database init
const low = require("lowdb")
const FileSync = require('lowdb/adapters/FileSync');    

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({
        mountains: [],
        trials: [],
        users: []
    })
    .write()

    var mountains = db.get("mountains")
    var trials = db.get("trials")
    var users = db.get("users")

//fuzzy

const FuzzySet = require("fuzzyset.js")

//now we need to get access to the GS API

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');



//globals

const prefix = "="
const length = 33 //UPDATE THIS IF HARRISON EVER ADDS MORE COLS


//On ready, init the bot

Client.on("ready", () => {

    console.log("Bot is ready!")
    console.log(`Logged in as ${Client.user.username}!`)
})

Client.on("message", (message) => {

    if (!message.content.startsWith(prefix)) {
        return
    }

    const msg = message.content.toLowerCase();
    var command = msg.replace(prefix, '').split(' ')[0]
   

    var argument = msg.replace(prefix, '').replace(command + " ", "")

    console.log("--")
    console.log(command)
    console.log(argument)

    if (command == "update") {
        message.channel.send("Updating Database...")
        UpdateDatabase()
    }


    if (command == "trial") {

        if (argument.length < 4) {
            message.channel.send("Search is too short, please provide a longer search.")
            return
        }
        const list = FuzzySet(trials.value())
        console.log(list.get(argument))
        const trial = list.get(argument)[0][1]

        const trialData = mountains.find({name: trial}).value()
        
        var scores = []
        for (var i = 3; i < length; i++) {
            var score = trialData[i]
            if (!(score == "" || score == undefined)) {
            

            

            scores.push({
                user: users.find({id: i}).value().user,
                score: score
            })
        
            
        }
    }

        if (trialData.asc) {
            scores.sort((a,b) => b.score.replace(",","") - a.score.replace(",",""))
        } else {
            scores.sort((a,b) => a.score.replace(",","") - b.score.replace(",",""))
        }

        var embed = new Discord.MessageEmbed()
        embed.setTitle(trial)
        embed.setDescription(`DD: ${trialData.dd} TD: ${trialData.td}`)
        embed.setTimestamp()
        embed.setFooter(`${Math.round(list.get(argument)[0][0] * 100)}% Certain`)

        var embedLength

        if(scores.length < 10) {
            embedLength = scores.length
        } else {
            embedLength = 10
        }

        for (var i = 0; i < embedLength; i++) {
            if(scores[i].score != "") {
                embed.addField(scores[i].user, scores[i].score)
            }
        }
        message.channel.send(embed)

    }
    
})




function UpdateDatabase() {

console.log("Updating database...")


    // If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), getData);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Gets the data of the leaderboard
 * @see https://docs.google.com/spreadsheets/d/1_-NCikVtDi38_WlQhPBsccjvZSszVhKN5d7y14UnDRU/edit#gid=328076107
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function getData(auth) {
  const sheets = google.sheets({version: 'v4', auth});


  sheets.spreadsheets.values.get({
    spreadsheetId: '1_-NCikVtDi38_WlQhPBsccjvZSszVhKN5d7y14UnDRU',
    range: 'PB Sheet!A2:BD251',
  }, (err, res) => {
    if (err) {
        console.log('The API returned an error: ' + err)
        return
    }

    const rows = res.data.values;
    if (rows.length) {
      console.log('Data');
      var id = 0
      rows.map((row) => {
          //clean data
        var challengeData = {}
          var name = row[2]
            //ignore non challenge names
            if (name != undefined) {
                if (!(name.toLowerCase().includes("score") || name.toLowerCase().includes("total") || name.toLowerCase().includes("triple diamond count")  || name == "Challenge Name") || name == "") {
                    if (name.includes("*")) {
                        name = name.replace("*","")
                        name = name.replace("*","")
                    }

                    console.log(`${id} ${name}`)

                    challengeData.id = id
                    challengeData.name = name


                    //direction finding

                    const dd = row[0].replace(",","")
                    const td = row[1].replace(",","")

                    var asc

                    if (dd > td) {
                        asc = false
                    } else {
                        asc = true
                    }

                    challengeData.dd = dd
                    challengeData.td = td
                    challengeData.asc = asc

                    for (var i = 3; i < length; i ++) {
                        var score = row[i]

                        if (score != undefined) {
                            challengeData[i] = score   
                        }
                    }

                    if (mountains.find({name: name}).value() == undefined) {
                        mountains.push(challengeData).write()
                        trials.push(name).write()
                    } else {
                        mountains.remove({name: name}).write()
                        mountains.push(challengeData).write()
                    }
                    

                    id ++
                }
            }
      });
    } else {
      console.log('No data found.');
    }
  });


sheets.spreadsheets.values.get({
    spreadsheetId: '1_-NCikVtDi38_WlQhPBsccjvZSszVhKN5d7y14UnDRU',
    range: 'PB Sheet!D1:BD1',
  }, (err, res) => {
    if (err) {
        console.log('The API returned an error: ' + err)
        return
    }

    const rows = res.data.values;
    if (rows.length) {
      console.log('Data');
      var id = 3
            rows.map((row) => {

               
        row.forEach(element => {

            var userData = {
                id: id,
                user: element
            }
            id ++


            if (users.find({user: element}).value() == undefined) {
                users.push(userData).write()
            } else {
                users.remove({user: element}).write()
                users.push(userData).write()
            }
        });

      })
    }
})


}

}

Client.login("ODI4NzM5OTAyNDc5OTI1Mjc5.YGt-LQ.C98aMbaI4laI-9NSYarBUvb52UM")

