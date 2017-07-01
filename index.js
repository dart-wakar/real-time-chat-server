var express = require('express');
var app = express();
var router = express.Router();
var morgan = require('morgan');
var bodyParser = require('body-parser');
var http = require('http').createServer(app);
var io = require('socket.io')(http);

router.get('/',function(req,res) {
    console.log("Welcome to the api")
    res.json({message: 'Welcome to the api'});
});

io.on('connection',function(socket) {

    console.log('A User connected!');

    socket.on('disconnect',function() {
        console.log('User disconnected');
    });

    socket.on('msg',function(msg) {
        socket.emit('msg',{msg: 'you sent: '+msg});
    });

});

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use('/api',router);
app.listen(3001);

http.listen(3000,function() {
    console.log('Websocket listening on 3000');
})