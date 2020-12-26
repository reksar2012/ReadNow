const TelegramBot = require("node-telegram-bot-api");
const ngrok = require('ngrok');
const express = require('express');

const id = 129816288;

async function Start() {
    const app = express();
    app.use(express.json());
    const url = await ngrok.connect(90);
    try {      
    const bot = new TelegramBot("1472617178:AAHHwaLKCnboJwPKL4imgJt-DqGmffrdN3c", {
      webHook: {
        port: 90
      }
    });

    bot.setWebHook(`${url}/bot/1472617178:AAHHwaLKCnboJwPKL4imgJt-DqGmffrdN3c"`)
    
    app.post("/send", (req, res) => {
      console.log(req.body.message);
      bot.sendMessage(id, req.body.message);
      res.sendStatus(200)
    })
    app.listen(3000);    
    }
    catch(e)
    {
      console.log(e);
    } 
};

Start();


