import TelegramBot from "node-telegram-bot-api"
import Vault from "./vault.mjs";
var init = async _ =>{
    //let credsResponce = await Vault.read("rabbitmq/creds/administrtor")
    let configResponce = await Vault.read("kv/sender/telegram")
    return {...configResponce.data}
}
var config = await init();

const bot = new TelegramBot(config.Token,{
    webHook:{
                port: config.Port   
            }
});
bot.setWebHook(`https://522c515fe600.ngrok.io/bot/${config.Token}`)

bot.sendMessage(config.ChatId,"2")