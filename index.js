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

router.use(function(req,res,next) {
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods","*");
    console.log('An api request is made');
    next();
});

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
                    usr.status = 2;
                    usr.save(function(err,ur) {
                        if(err) {
                            console.log(err);
                        }
                        socket.user_id = ur._id;
                        io.emit('new user connected',{user: ur,time: Date.now()});
                        MessageModel.find({added: {$lte: Date.now()}}).populate('user').exec(function(err,messages){
                            if(err) {
                                console.log(err);
                            }
                            socket.emit('initial messages',messages);
                        });
                    });
                });
            } else {
                console.log("Existing user");
                user.status = 2;
                user.save(function(err,usr) {
                    if(err) {
                        console.log(err);
                    }
                    socket.user_id = usr._id;
                    io.emit('new user connected',{user: usr,time: Date.now()});
                    MessageModel.find({added: {$lte: Date.now()}}).populate('user').exec(function(err,messages){
                        if(err) {
                            console.log(err);
                        }
                        socket.emit('initial messages',messages);
                    });
                });
            }
        });
    });

    socket.on('disconnect',function() {
        console.log(socket.username+' disconnected');
        console.log(socket.user_id+' disconnected');
        UserModel.findOne({username: socket.username},function(err,user) {
            if(err){
                console.log(err);
            } else if(user === null) {
                console.log('nobody logged in!');
            } else {
                user.status = 1;
                user.save(function(err,usr) {
                    if(err){
                        console.log(err);
                    }
                    io.emit('offline user',{user: usr});
                    socket.broadcast.emit('user disconnect',{disconnected_username: socket.username,disconnect_time: Date.now()});
                });
            }      
        });
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

    socket.on('do private chat',function(user) {
        var currentUserIdString = new String();
        var otherUserIdString = new String();
        var privateChatRoomString = new String();
        currentUserIdString = socket.user_id.toString();
        otherUserIdString = user._id.toString();
        switch(currentUserIdString.localeCompare(otherUserIdString)) {
            case -1:
                privateChatRoomString = currentUserIdString+otherUserIdString;
                break;
            case 0:
                privateChatRoomString = currentUserIdString+otherUserIdString;
                break;
            case 1:
                privateChatRoomString = otherUserIdString+currentUserIdString;
        }
        console.log(privateChatRoomString);
        socket.join(privateChatRoomString,function(err) {
            if(err) {
                console.log(err);
            }
            console.log('success');
            socket.emit('go to private chat',{room: privateChatRoomString,current_user_id: socket.user_id,other_user: user});
        });
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

router.route('/user/:user_id')
    .get(function(req,res) {
        UserModel.findById(req.params.user_id)
            .populate('messages')
            .exec(function(err,user) {
                if(err) {
                    res.send(err);
                }
                res.json(user);
            });
    });

router.route('/user/delete')
    .post(function(req,res) {
        UserModel.remove({_id: req.body.user_id},function(err,user) {
            if(err) {
                res.send(err);
            }
            res.json({message: 'Successfully deleted !'});
        });
    });

router.route('/messages')
    .get(function(req,res) {
        MessageModel.find()
                    .populate('user')
                    .exec(function(err,messages) {
                        if(err) {
                            res.send(err);
                        }
                        res.json(messages);
                    });
    });

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
        });
    });

router.route('/users/online')
    .get(function(req,res) {
        UserModel.find({status: 2},function(err,users) {
            if(err) {
                res.send(err);
            }
            res.json(users);
        });
    });

router.route('/users/offline')
    .get(function(req,res) {
        UserModel.find({status: 1},function(err,users) {
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