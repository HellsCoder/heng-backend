/*
    Dev by HellsCoder for HypeCloud LLC, 2018
*/


/*
    Описание возвращаемых ошибок API

    1 - Не передана версия API
    2 - Версия используемого API выше или ниже, чем требует текущий метод
    3 - Вызван неизвестный метод
    4 - В методе произошла непредвиденная ошибка
    5 - Ошибка валидации. Не заполнены поля
*/

const express = require('express');
const config = require('./config');
const scheme = require('./api/scheme.json');
const json = require('./lib/messages')(scheme);


let app = express();

let ServerMethod = {
    /*
        Ищет метод в схеме API
    */
    findMethod: function(method){
        for(let i = 0; i < scheme.methods.length; i++){
            let methodObject = scheme.methods[i];
            console.info(methodObject);
            if(methodObject.method === method){
                return true;
            }
        }
        return false;
    },

    /*
        Влидирует метод по схеме
    */
    validateFields: function(method, params){
        let validateErrors = [];
        for(let i = 0; i < scheme.methods.length; i++){
            let methodObject = scheme.methods[i];
            if(methodObject.method === method){
                for(let i = 0; i < methodObject.fields.length; i++){
                    let field = methodObject.fields[i];
                    if(field.required && !params[field.field]){
                        validateErrors.push({
                            "field": field.field,
                            "description": field.description
                        });
                    }
                }
                return validateErrors;
            }
        }
        return validateErrors;
    },

    validateVersion: function(method, currentVersion){
        for(let i = 0; i < scheme.methods.length; i++){
            let methodObject = scheme.methods[i];
            if(methodObject.method === method){
                if(methodObject.minVersion > currentVersion || methodObject.maxVersion < currentVersion){
                    if(methodObject.minVersion  === methodObject.maxVersion){
                        return "This method is available on " + methodObject.minVersion + " API version";
                    }
                    return "This method is available on API versions "+methodObject.minVersion+" through "+methodObject.maxVersion+" inclusive";
                }
                return true;
            }
        }
    }
};

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
        res.send(json.makeError(1, {
            "text": "Api version has no gived"
        }));
    }
    try{
        let method = req.params.object + '.' + req.params.method;
        if(!ServerMethod.findMethod(method)){
            return res.send(json.makeError(3, {
                "text": "This method or object is not in the API"
            }));
        }

        let validate = ServerMethod.validateFields(method, req.query);
        if(validate.length > 0){
            return res.send(json.makeError(5, {
                "text": "This fields cannot be empty", 
                "fields": validate
            }));
        }

        let version = ServerMethod.validateVersion(method, req.query.v);
        if(version !== true){
            return res.send(json.makeError(2, version));
        }

        /*
            TODO: Call method
        */
        let callMethod = require('./api/' + req.params.object + '/' + req.params.method);
        callMethod({
            error: function(code){
                res.send(json.makeError(code));
            },
            success: function(response){
                res.send(json.makeSuccess(response));
            }
        }, req.params);
    }catch(e){
        console.info(e);
        return res.send(json.makeError(4, {
            "text": "Method has generated exception. Please try use later"
        }));
    }
});


app.use(function(req, res, next){
    res.send(json.makeError(3, {
        "text": "This method or object is not in the API"
    }));
});


