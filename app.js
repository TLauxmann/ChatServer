var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const fetch = require('node-fetch');
const helmet = require('helmet');
const port = process.env.PORT || 3000;

app.enable('trust proxy');
/*
app.use (function (req, res) {
    if (!req.secure) {
            // request was via http, so redirect to https
            res.redirect('https://' + req.headers.host + req.url);
    }

});*/ 
   app.use (function (req, res, next) {
    if (req.secure) {
            // request was via https, so do no special handling
            next();
    } else {
            // request was via http, so redirect to https
            res.redirect('https://' + req.headers.host + req.url);
    }
});

//Security
app.use(helmet());

app.use('/client', express.static(__dirname + '/client'));
//start - express, html config
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

http.listen(port, () => {
  console.log('Server running on port: %d', port);
});
//end - express, html config

var usersOnline = new Map();

io.on('connection', function(socket) {

    socket.on('disconnect', function() {
        usersOnline.delete(socket.username);
        socket.broadcast.emit('userLeft', socket.username) // to all others

    });

    socket.on('chat message', function (msg, file, writingToList, translate) {

        //if checkbox checked
        if (translate){
            translateMessage(msg)
            .then(res => 
                {
                    if (res && res.translations && res.translations[0].translation) {
                        sendMessage(writingToList, res.translations[0].translation, socket, file);
                    } else if(res && res.errorMessage) {
                        io.to(socket.id).emit('alertMsg', res.errorMessage);
                    } else {
                        io.to(socket.id).emit('alertMsg', "Something bad happend during the Translation");                    
                    }
                }
                    )
            } else{
                sendMessage(writingToList, msg, socket, file);
            }
    });

    //user Login
    socket.on('checkName', function(username) {
        //Do not care...Easteregg
        if (username.toUpperCase() == "WÜRGER" || username.toUpperCase() == "DER WÜRGER"){
            username = "Robin F";
        }
        //check username and pw TODO
        //var queryParams = [username];
        //var queryResult = dataQuery("SELECT * FROM users WHERE username = ? ;", queryParams);
        if (!usersOnline.has(username)) {
            socket.username = username;
            usersOnline.set(username, socket.id);
            //remove own name
            var uoList = Array.from(usersOnline.keys());
            uoList.splice(uoList.indexOf(socket.username), 1)
            socket.emit('validLogin', uoList);
            socket.broadcast.emit('userJoint', username) // to all others
        } else {
            socket.emit('invalidLogin');
        }
    });

    //user SignUp
    socket.on('signUp', function (signUpData) {
        database.dataQuery("SELECT * FROM users WHERE username = ? ;", [signUpData[0].toLowerCase()]).then(function(result){
            if(result && result.length > 0){
                socket.emit('alertMsg', "This user already exists")                            
            }else{
                signUpData[0] = signUpData[0].toLowerCase();
                database.dataQuery("INSERT INTO USERS (USERNAME,PASSWORD,EMAIL) VALUES ( ?, ?, ? );", signUpData).then(function(result){
                    socket.emit('alertMsg', "Registration successful") ;                           
                })
            }
        })
    });

    socket.on('checkProfilePicture', function (file) {
        //kann dann zu sign up verschoben werden
        detectImage(file).then(result => {
            if(result.errorMessage && result.errorMessage.body){
                socket.emit('alertMsg', JSON.parse(result.errorMessage.body).images[0].error.description)
            }else if(result.errorMessage && result.errorMessage.message){
                socket.emit('alertMsg', result.errorMessage.message)            
            }else{
                socket.emit('alertMsg', "Ist Person!")                            
            }
        });
    });

});

function sendMessage(writingToList, msg, socket, file) {
    if (writingToList.length) {
        //send to selected users
        writingToList.forEach(function (username) {
            io.to(usersOnline.get(username)).emit('chat message', msg, socket.username, file, writingToList);
        });
        //and to yourself
        io.to(socket.id).emit('chat message', msg, socket.username, file, writingToList);
    }
    else {
        io.emit('chat message', msg, socket.username, file, writingToList);
    }
}

    async function translateMessage(incomingMessage){

    const url = 'https://eu-de.functions.cloud.ibm.com/api/v1/web/86dd21a5-4b63-4429-a760-b21e371df199/hrt-demo/identify-and-translate';
    const detectObject = {
        text: incomingMessage
    };

    return await fetch(url, {
        method: 'post',
        body: JSON.stringify(detectObject),
        headers: { 'Content-Type': 'application/json' },
    })
    .then(res => res.json())
    .then(json => json)
}

async function detectImage(fileBuffer) {
    const url = 'https://eu-de.functions.cloud.ibm.com/api/v1/web/86dd21a5-4b63-4429-a760-b21e371df199/default/my-action';

    return await fetch(url, {
        method: 'post',
        body: fileBuffer,
    })
        .then(res => res.json())
        .then(json => json)
}