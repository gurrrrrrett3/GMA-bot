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
        oldmountain: [],
        trials: [],
        users: [],
        links:[],
        notif: [],
        global: []
    })
    .write()

    var mountains = db.get("mountains")
    var oldmountain = db.get("oldmountain")
    var trials = db.get("trials")
    var users = db.get("users")
    var links = db.get("links")
    var notif = db.get("notif")
    var global = db.get("global")

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


     //check time since last update

     
     var globals

     if (global.find({id: "update"}).value() == undefined) {
        globals = {
            id: "update",
            lastUpdate: 0
        }
     } else {
        
        globals = global.find({id: "update"}).value()

     }

     if (Date.now() - globals.lastUpdate > 3600000 ) {
 
         globals.lastUpdate = Date.now()
         global.find({id: "update"}).remove().write()
         global.push(globals).write()



         UpdateDatabase()
     }



    if (!message.content.startsWith(prefix)) {
        return
    }

    if (message.content.includes("@everyone") || message.content.includes("@here")) {
        return
    }


   

    const msg = message.content.toLowerCase();
    var command = msg.replace(prefix, '').split(' ')[0]
   

    var argument = msg.replace(prefix, '').replace(command + " ", "")

    console.log("--")
    console.log(command)
    console.log(argument)

    //actual commands

    if (command == "update") {
      message.channel.send("Updating Database...")
        UpdateDatabase()
    }

    if (command == "trial") {

        const list = FuzzySet(trials.value())
        console.log(list.get(argument))
        if (list.get(argument) == null) {
            message.channel.send(`Sorry, I couldn't fimd a trial with the name: ${argument}. Please refine your search.`)
            return
        }
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
        embed.setColor("#ffffff")
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

    if (command == "wr") {
        //make userlist as there is no point in storing it
        const userData = users.value()

        var list = []

        for (var i = 0; i < userData.length; i++) {
            const userObj = users.find({id: i}).value()
            if (userObj != undefined) {
                const user = userObj.user
                list.push(user)
            }
            
        }

        //check if the message has a mention and if it does, check for a linked account

        if (message.mentions.members.size > 0) {
            if (links.find({id: message.mentions.members.first().user.id}).value() == undefined) {
                //not a linked account, so return an error
                message.channel.send("Sorry, that user hasn't linked their account yet.")
                return
            } else {

                argument = links.find({id: message.mentions.members.first().user.id}).value().name

            }
        }

        list = FuzzySet(list)
        const userGuess = list.get(argument)
        console.log(userGuess)
        if(userGuess == null) {
            message.channel.send(`Sorry, I couldn't find a user with the name: ${argument}.  Please refine your search.`)
            return
        }

        const id = users.find({user: userGuess[0][1]}).value().id
        const user = userGuess[0][1]

        var wrs = []
        //now we need to get all of the WRs that this user has
        //this will not be easy, as we need to grab every track and sort by score
        //then grab the first one
        
        //(yes, I'm copying the code from above)

        const l = mountains.value().length

        for (var idd = 0; idd < l; idd ++) {

        const trial = trials.value()[idd]

        const trialData = mountains.find({name: trial}).value()
        
        

        var scores = []
        for (var i = 3; i < length; i++) {
            var score = trialData[i]
            if (!(score == "" || score == undefined)) {
            
            scores.push({
                user: i,
                score: score
            })        
            
        }

       
    }

   

        if (trialData.asc) {
            scores.sort((a,b) => b.score.replace(",","") - a.score.replace(",",""))
        } else {
            scores.sort((a,b) => a.score.replace(",","") - b.score.replace(",",""))
        }

        if (scores[0].user == id) {
            wrs.push({
                name: trial,
                score: scores[0].score 
            })
        }

        i++
    }
    console.log(wrs)

    var desc = ""

    wrs.forEach(element => {
        desc = `${desc}\n **${element.name}**: ${element.score}\n`
    });

    var embed = new Discord.MessageEmbed()
        embed.setTitle(`${user}'s World Records`)
        embed.setDescription(desc)
        embed.setTimestamp()
        embed.setFooter(`${Math.round(list.get(argument)[0][0] * 100)}% Certain`)
        embed.setColor("#ffffff")
        message.channel.send(embed)

    }

    if (command == "link") {
//links your discord account to your leaderboard entry, which allows you to enable notifs and to get your userdata by ping

 //make userlist as there is no point in storing it
 const userData = users.value()

 var list = []

 for (var i = 0; i < userData.length; i++) {
     const userObj = users.find({id: i}).value()
     if (userObj != undefined) {
         const user = userObj.user.toLowerCase()
         list.push(user)
     }
    }
     
     if (list.includes(argument)) {
         //this is a valid username, so now check if it's already been linked

         if (links.find({name: argument}).value() == undefined) {

            //now lets stop people from claiming multiple accounts

            if (links.find({id: message.author.id}).value() != undefined) {
                message.channel.send(`Looks like you have already linked a username! Your account is linked to ${links.find({id: message.author.id}).value().name}`)
                return
            }

            const linkData = {

                name: argument,
                id: message.author.id,
                
            }

            links.push(linkData).write()

            message.channel.send(`<@${message.member.user.id}>, your account has been linked to your leaderboard username: ${argument}.`)

         } else {
             message.channel.send(`Sorry, this leaderboard username has already been linked! If this is your username, please DM Gucci Garrett#9211 and he will fix it.`)
         }

     } else {
         message.channel.send(`Sorry, that username doesn't exist.  Make sure you typed it correctly!`)
     }

    }   

    if (command == "user") {
          //make userlist as there is no point in storing it
          const userData = users.value()

          var list = []
  
          for (var i = 0; i < userData.length; i++) {
              const userObj = users.find({id: i}).value()
              if (userObj != undefined) {
                  const user = userObj.user
                  list.push(user)
              }
              
          }
          
          //check if the message has a mention and if it does, check for a linked account
          
          var linked = false


          if (message.mentions.members.size > 0) {
              if (links.find({id: message.mentions.members.first().user.id}).value() == undefined) {
                  //not a linked account, so return an error
                  message.channel.send("Sorry, that user hasn't linked their account yet.")
                  return
              } else {
  
                  argument = links.find({id: message.mentions.members.first().user.id}).value().name
                
                  linked = true
                  
              }
          }
  
          list = FuzzySet(list)
          const userGuess = list.get(argument)
          console.log(userGuess)
          if(userGuess == null) {
              message.channel.send(`Sorry, I couldn't find a user with the name: ${argument}.  Please refine your search.`)
              return
          }
  
          const id = users.find({user: userGuess[0][1]}).value().id
          const user = userGuess[0][1]

          //now let's compile data, yes, I'm coping so many things
          //also, fuck functions

          var wrs = []
          //now we need to get all of the WRs that this user has
          //this will not be easy, as we need to grab every track and sort by score
          //then grab the first one
          
          //(yes, I'm copying the code from above)
  
          const l = mountains.value().length
  
          for (var idd = 0; idd < l; idd ++) {
  
          const trial = trials.value()[idd]
  
          const trialData = mountains.find({name: trial}).value()
          
          
  
          var scores = []
          for (var i = 3; i < length; i++) {
              var score = trialData[i]
              if (!(score == "" || score == undefined)) {
              
              scores.push({
                  user: i,
                  score: score
              })        
              
          }
  
         
      }
  
     
  
          if (trialData.asc) {
              scores.sort((a,b) => b.score.replace(",","") - a.score.replace(",",""))
          } else {
              scores.sort((a,b) => a.score.replace(",","") - b.score.replace(",",""))
          }
  
          if (scores[0].user == id) {
              wrs.push({
                  name: trial,
                  score: scores[0].score 
              })
          }
  
          i++
      }
      console.log(wrs) 

      //update userdata

      var userDataObj = {
          Nickname: user,
          wrs: wrs.length,
          linked: linked,
          
      }

      const linkedUser = links.find({name: user.toLowerCase()}).value()

      if (linkedUser != undefined) {
        userDataObj.linkedName = Client.users.cache.get(linkedUser.id).username
        userDataObj.linked = true
      } else {
        userDataObj.linkedName = "Unknown"
      }

      console.log(userDataObj)

      var check = ""

      if (userDataObj.linked) {
          check = "✅"
      } else {
          check = "❌"
      }

      var embed = new Discord.MessageEmbed()

      embed.setTitle(`${user}'s Profile`)
      embed.addField("World Records", userDataObj.wrs)
      embed.addField("Discord Linked", check)
      embed.addField("Discord Username", userDataObj.linkedName)
      embed.setFooter(`${Math.round(list.get(argument)[0][0] * 100)}% Certain`)
      embed.setTimestamp()

      message.channel.send(embed)
    }

    if (command == "notif") {
        if (links.find({id: message.author.id}).value() == undefined) {
            message.channel.send("Sorry, you need to link your discord to your LB username, as well as have at least 1 score posted to the LB.  Use =link {lb username} to link.")
        } else {
            if (notif.find({id: message.author.id}).value() == undefined) {
                const notifDefault = {
                    id: message.author.id,
                    name: links.find({id: message.author.id}).value().name,
                    wrUpdates: true
                }

                notif.push(notifDefault).write()
            }

            var notifData = notif.find({id: message.author.id}).value()

            var embed = new Discord.MessageEmbed()
            embed.setTitle(`${message.member.displayName}'s Notification Panel`)
            embed.addField("Get a DM when one of your WR's is broken", `🟥: ${toggle(notifData.wrUpdates)}`)
            embed.setTimestamp()
            embed.setFooter("This message is only active for 60 seconds.")

            message.channel.send(embed).then(sentMessage => {
                sentMessage.react("🟥")
                const filter = (reaction, user) => {
                    return reaction.emoji.name === '🟥' && user.id === message.author.id;
                };
                
                const collector = sentMessage.createReactionCollector(filter, { time: 60000 });
                
                collector.on('collect', (reaction, user) => {
                    if (notifData.wrUpdates) {
                        notifData.wrUpdates = false
                    } else {
                        notifData.wrUpdates = true
                    }

                    const newEmbed = new Discord.MessageEmbed()
                    sentMessage.reactions.removeAll()
                    .then(sentMessage => {
                        sentMessage.react('🟥')
                    })
                    .catch(error => console.error('Failed to clear reactions: ', error));
                    newEmbed.setTitle(`${message.member.displayName}'s Notification Panel`)
                    newEmbed.addField("Get a DM when one of your WR's is broken", `🟥: ${toggle(notifData.wrUpdates)}`)
                    newEmbed.setTimestamp()
                    newEmbed.setFooter("This message is only active for 60 seconds.")
                    sentMessage.edit(newEmbed)
                });
                
                collector.on('end', collected => {
                    const newEmbed = new Discord.MessageEmbed()
                    newEmbed.setTitle(`${message.member.displayName}'s Notification Panel`)
                    newEmbed.addField("Get a DM when one of your WR's is broken", `🟥: ${toggle(notifData.wrUpdates)}`)
                    newEmbed.setTimestamp()
                    newEmbed.setFooter("This message is no longer active.")
                    sentMessage.edit(newEmbed)
                });
            })


        }
    }
})




function UpdateDatabase() {

console.log("Updating database...")

//load the entire database into a variable, and then compare differences afterwards

const preMountains = mountains.value()

db.set("oldmountain", preMountains).write()

oldmountain = db.get("oldmountain")


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

                    if (challengeData.id < 155) {
                        asc = false
                    } else {
                        asc = true
                    }

                    challengeData.dd = dd
                    challengeData.td = td
                    challengeData.asc = asc

                    for (var i = 3; i < length; i ++) {
                        var score = row[i]

                        if (score != undefined && score != "-") {
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
      
//now, grab the most recent WRs off the front page (because I want to make harrison do all the work for me...)

})

 //for each user, check if they have subscribed to notifs
var userData = users.value()
      userData.map((data) => {
    if (notif.find({name: data.user.toLowerCase()}).value() == undefined) {
        return
    }
    if (notif.find({name: data.user.toLowerCase()}).value().wrUpdates == false) {
        return
    }

    

})

}

}
/**
 * 
 * @param {boolean} bool 
 */
function toggle(bool) {
    if (bool) {
        return "✅"
    } else {
        return "❌"
    }
}

Client.login("ODI4NzM5OTAyNDc5OTI1Mjc5.YGt-LQ.C98aMbaI4laI-9NSYarBUvb52UM")
 
