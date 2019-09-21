import { Request, Response, NextFunction } from "express";
import { InitBot } from "./common/discord";
import { InitDb, CreateMocks } from './common/sequalize';
import * as swaggerJSDoc from 'swagger-jsdoc';

/**
 * This file sets up API endpoints based on the current folder tree in Heroku.
 * 
 * Here's how it works:
 * Consumable JS files named with an HTTP method (all lowercase) are handed the Request and Response parameters from ExpressJS
 * The path of the file is set up as the endpoint on the server, and is set up with the HTTP method indicated by the filename 
 * 
 * Example: 
 * The file `./myapp/bugreport/post.js` is set up at `POST https://example.com/myapp/bugreport/`
 * 
 * For local development, run `npm start dev`
 */

const express = require('express'), app = express();
const expressWs = require('express-ws')(app);

const bodyParser = require('body-parser');
const glob = require('glob');
const helpers = require('./common/helpers');
const swaggerUi = require('swagger-ui-express');

const PORT = process.env.PORT || 5000;
const MOCK = process.argv.filter(val => val == 'mock').length > 0;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use((req: Request, res: Response, next: NextFunction) => {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization');

    // Pass to next layer of middleware
    next();
});

InitDb().then(() => {
    if (MOCK) CreateMocks()
});

InitBot();
InitApi();


app.listen(PORT, (err: string) => {
    if (err) {
        console.error(`Error while setting up port ${PORT}:`, err);
        return;
    }
    console.log(`Ready, listening on port ${PORT}`);
});


//#region Setup 

let RegexMethods = /((?:post|get|put|patch|delete|ws)+)(?:.js)/;

function InitApi() {
    glob(__dirname + '/api/**/*.js', function (err: Error, result: string[]) {
        for (let filePath of result) {

            if (!filePath.includes("node_modules") && helpers.match(filePath, RegexMethods)) {
                let serverPath = filePath.replace(RegexMethods, "").replace("/app", "").replace("/api", "").replace("/build", "");

                if (helpers.DEVENV) serverPath = serverPath.replace(__dirname.replace(/\\/g, `/`).replace("/build", ""), "");

                const method = helpers.match(filePath, RegexMethods);
                console.log(`Setting up ${filePath} as ${method.toUpperCase()} ${serverPath}`);

                switch (method) {
                    case "post":
                        app.post(serverPath, require(filePath));
                        break;
                    case "get":
                        app.get(serverPath, require(filePath));
                        break;
                    case "put":
                        app.put(serverPath, require(filePath));
                        break;
                    case "patch":
                        app.patch(serverPath, require(filePath));
                        break;
                    case "delete":
                        app.delete(serverPath, require(filePath));
                        break;
                    case "ws":
                        app.ws(serverPath, require(filePath)(expressWs, serverPath));
                        break;
                }
            }
        }
    });

    const yaml = require('js-yaml');
    const fs = require('fs');

    // Get document, or throw exception on error
    try {
        const doc = yaml.safeLoad(fs.readFileSync('./src/api.yaml', 'utf8'));
        app.use('/__docs', swaggerUi.serve, swaggerUi.setup(doc));
        app.get('/swagger.json', (req: Request, res: Response) => res.json(doc));
    } catch (e) {
        console.log(e);
    }
}
//#endregion
