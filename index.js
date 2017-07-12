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
                    MessageModel.find({added: {$lte: Date.now()}}).populate('user').exec(function(err,messages){
                        if(err) {
                            console.log(err);
                        }
                        socket.emit('initial messages',messages);
                    });
                });
            } else {
                console.log("Existing user");
                io.emit('new user connected',{username: user.username,time: Date.now()});
                MessageModel.find({added: {$lte: Date.now()}}).populate('user').exec(function(err,messages){
                    if(err) {
                        console.log(err);
                    }
                    socket.emit('initial messages',messages);
                });
            }
        });
    });

    socket.on('disconnect',function() {
        console.log(socket.username+' disconnected');
        socket.broadcast.emit('user disconnect',{disconnected_username: socket.username,disconnect_time: Date.now()});
    });

    socket.on('msg',function(msg) {
        console.log('New msg received');
        UserModel.findOne({username: socket.username},function(err,user) {
            if(err) {
                console.log(err);
            } else {
                var message = new MessageModel();
                message.message = msg;
                message.user = user._id;
                message.save(function(err,mesg) {
                    if(err) {
                        console.log(err);
                    }
                    user.messages.push(mesg._id);
                    user.save(function(err,usr) {
                        console.log("success");
                        io.emit('msg',{username: socket.username,msg: mesg});
                    })
                });
            }
        });
    });

    socket.on('user typing',function(message) {
        console.log(socket.username+' typing');
        socket.broadcast.emit('typing now',{username: socket.username});
    });

    socket.on('stop typing',function(msg) {
        console.log(socket.username+' stopped typing');
        socket.broadcast.emit('stopped typing',{username: socket.username});
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

router.route('/messages')
    .get(function(req,res) {
        MessageModel.find(function(err,messages) {
            if(err) {
                res.send(err);
            }
            res.json(messages);
        })
    })

router.route('/message/delete')
    .post(function(req,res) {
        MessageModel.remove({_id: req.body.message_id},function(err,message) {
            if(err) {
                res.send(err);
            }
            res.json({message: 'Successfully deleted!'});
        });
    });

router.route('/messages/before')
    .get(function(req,res) {
        MessageModel.find({added: {$lte: Date.now()}},function(err,messages) {
            if(err) {
                res.send(err);
            }
            res.json(messages);
        })
    })

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