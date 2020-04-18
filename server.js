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
    6 - Ошибка вадидации типов
*/

const express = require('express');
const config = require('./config');
const scheme = require('./api/scheme.json');
const json = require('./lib/messages')(scheme);

let app = express();

let escape = (str) => {
    if(typeof(str) === "string"){
        let filterCodes = [
            34, 38, 39, 47, 58, 59, 60, 61, 62, 92
        ];
        let newStr = "";
        let nextCode = 0;
        for (let i = 0;i < str.length;i++){
            nextCode = str.charCodeAt(i);
            if (filterCodes.includes(nextCode)){
                newStr += "&#"+nextCode+";";
            }
            else{
                newStr += str[i];
            }
        }
        return newStr;
    }
    return str;
};

let recursiveEscape = (response) => {
    if(response instanceof Object){
        for(let i in response){
            if(response[i] instanceof Object){
                response[i] = recursiveEscape(response[i]);
            }
            response[i] = escape(response[i]);
        }
    }else{
        response = escape(response);
    }
    return response;
};

let ServerMethod = {
    /*
        Ищет метод в схеме API
    */
    findMethod: function(method){
        for(let i = 0; i < scheme.methods.length; i++){
            let methodObject = scheme.methods[i];
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

    /*
        Валидирует типы вводимых полей
    */
    validateTypes: function(method, params){
        let validateErrors = [];
        for(let i = 0; i < scheme.methods.length; i++){
            let methodObject = scheme.methods[i];
            if(methodObject.method === method){
                for(let i = 0; i < methodObject.fields.length; i++){
                    let field = methodObject.fields[i];
                    if(field.type && field.type === "number"){
                        params[field.field] = parseInt(params[field.field]);
                        if(isNaN(params[field.field])){
                            validateErrors.push({
                                "field": field.field,
                                "description": field.description,
                                "type": field.type
                            });
                        }
                    }
                    if(field.type && field.type === "float"){
                        params[field.field] = parseFloat(params[field.field]);
                        if(isNaN(params[field.field])){
                            validateErrors.push({
                                "field": field.field,
                                "description": field.description,
                                "type": field.type
                            });
                        }
                    }
                }
                return {
                    errors: validateErrors,
                    params: params
                };
            }
        }
        return {
            errors: validateErrors,
            params: params
        };
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
        return res.send(json.makeError(1, {
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

        let types = ServerMethod.validateTypes(method, req.query);
        if(types.errors.length > 0){
            return res.send(json.makeError(6, {
                "text": "Cast fields failed", 
                "fields": types.errors
            }));
        }
        req.query = types.params;

        let version = ServerMethod.validateVersion(method, req.query.v);
        if(version !== true){
            return res.send(json.makeError(2, version));
        }

        let callMethod = require('./api/' + req.params.object + '/' + req.params.method);
        callMethod({
            error: function(code){
                if(config.DEBUG){
                    console.info("Server returned code " + code + " with method " + req.params.object + "." + req.params.method);
                }
                res.send(json.makeError(code));
            },
            success: function(response, escape){
                if(config.DEBUG){
                    console.info("Server returned success "+ req.params.object + "." + req.params.method, response);
                }
                /*
                    Заменяем недоверенные символы чтобы не допустить попадание в базу кода
                */
                if(escape !== false){
                    response = recursiveEscape(response);
                }
                res.send(json.makeSuccess(response));
            }
        }, req.query);
    }catch(e){
        if(config.DEBUG){
            console.info(e);
        }
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


