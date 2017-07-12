var express = require('express');
var app = express();
var router = express.Router();
var morgan = require('morgan');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var http = require('http').createServer(app);
var io = require('socket.io')(http);

mongoose.connect('mongodb://localhost/realTimeChat');
var UserModel = require('./models/user');
var MessageModel = require('./models/message');

router.get('/',function(req,res) {
    console.log("Welcome to the api")
    res.json({message: 'Welcome to the api'});
});

io.on('connection',function(socket) {

    console.log('A User connected!');

    socket.on('login',function(username) {
        socket.username = username;
        UserModel.findOne({username: socket.username},function(err,user) {
            if(err) {
                console.log(err);
            } else if(user === null) {
                console.log("New user!");
                var newuser = new UserModel();
                newuser.username = socket.username;
                newuser.save(function(err,usr) {
                    if(err) {
                        console.log(err);
                    }
                    io.emit('new user connected',{username: usr.username,time: Date.now()});
                })
            } else {
                console.log("Existing user");
                io.emit('new user connected',{username: user.username,time: Date.now()});
            }
        });
    });

    socket.on('disconnect',function() {
        console.log(socket.username+' disconnected');
    });

    socket.on('msg',function(msg) {
        console.log('New msg received');
        io.emit('msg',{username: socket.username,msg: msg});
    });

});

router.route('/users')
    .get(function(req,res) {
        UserModel.find(function(err,users) {
            if(err) {
                res.send(err);
            }
            res.json(users);
        });
    });

var db = mongoose.connection;
db.on('error',console.error.bind(console,'connection error: '));
db.once('open',function() {
    console.log('Connected to database !');
});

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use('/api',router);
app.listen(3001);

http.listen(3000,function() {
    console.log('Websocket listening on 3000');
})