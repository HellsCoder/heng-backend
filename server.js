/*
    Dev by HellsCoder for HypeCloud LLC, 2018
*/

const express = require('express');
const  config = require('./config');
const  json = require('./lib/messages');

let app = express();

app.listen(config.SERVER_PORT, function(){
    console.info("Backend listening on " + config.SERVER_PORT);
});

app.all('*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.get('/:object.:method', function(req, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    if(!req.query.v){
        res.send(json.makeError(2, "Api version has no gived"));
    }
    try{
        let reqi = require('./api/' + req.params.object);
        let ver = reqi["version"];
        if(ver > req.query.v){
            res.send(json.makeError(4, "Before using this object, please, use the " + ver + " api level"));
            return;
        }
        reqi[req.params.method](res, req.query);
    }catch(e){
        return res.send(json.makeError(3, "Call undefined method"));
    }
});

app.use(function(req, res, next){
    res.send(json.makeError(1, "Please use protocol for interact the api"));
});


