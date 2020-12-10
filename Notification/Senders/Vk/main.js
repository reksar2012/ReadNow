const express = require('express');
const bodyParser = require('body-parser');
const VkBot = require('node-vk-bot-api');
const { response } = require('express');
const ngrok = require('ngrok');
global.fetch = require("node-fetch");
async function Init(){

    const url = await ngrok.connect(90);
    console.log(url);
    var result = await setNewUrl(url)
}
async function getCode(){  
    return await fetch("https://vk.com/dev", {
      "headers": {
        "accept": "*/*",
        "accept-language": "ru,en;q=0.9,la;q=0.8",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        "pragma": "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        "cookie": "remixlang=0; remixlhk=c635d7b68dabee9aa7; remixflash=0.0.0; remixscreen_dpr=1; remixscreen_depth=24; remixdt=0; tmr_lvid=e06e310467f66e9fae5b1deaafb43b14; tmr_lvidTS=1595536180799; remixusid=Y2QwM2NkNmU0ZGIyNDJjYjAwNTZlZTNi; remixstid=296424002_AgzMxS2r6Uzww5lDLGVUOXEIBiPf2ajnEtx62ZHItKc; remixgp=9b6d5659c00a1085ac844a7e50de9b05; remixua=41%7C-1%7C158%7C680889511; remixscreen_width=2560; remixscreen_height=1440; remixscreen_orient=1; remixseenads=2; remixsid=b670a18473127f2bf192848651fc7e3e8cebab210c17fbdf1d213f21face0; remixrefkey=10eaf6fedb70bb9ce2; remixscreen_winzoom=1; tmr_detect=0%7C1606810646485; tmr_reqNum=490"
      },
      "referrer": "https://vk.com/dev/groups.getCallbackConfirmationCode?params[group_id]=200742254&params[v]=5.126",
      "referrerPolicy": "no-referrer-when-downgrade",
      "body": "act=a_run_method&al=1&hash=1606811474%3A161735d7a2efa183e5&method=groups.getCallbackConfirmationCode&param_group_id=200742254&param_v=5.126",
      "method": "POST",
      "mode": "cors"
    })
    .then((response) => {
        if (response.status === 404) {
          throw new Error('404 (Not Found)');
        } else {
          return response.text()
        }
      })
      .then(
        data=>{
          let dataObj = JSON.parse(data);
          let code = Array.from(data.payload).filter(x=>x[0]!=undefined)[0].response.code
          console.log(code);
        }); 
    }
async function setNewUrl(url){
    
return (await fetch("https://vk.com/dev", {
    "headers": {
      "accept": "*/*",
      "accept-language": "ru,en;q=0.9,la;q=0.8",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      "pragma": "no-cache",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-requested-with": "XMLHttpRequest",
      "cookie": "remixlang=0; remixlhk=c635d7b68dabee9aa7; remixflash=0.0.0; remixscreen_dpr=1; remixscreen_depth=24; remixdt=0; tmr_lvid=e06e310467f66e9fae5b1deaafb43b14; tmr_lvidTS=1595536180799; remixusid=Y2QwM2NkNmU0ZGIyNDJjYjAwNTZlZTNi; remixstid=296424002_AgzMxS2r6Uzww5lDLGVUOXEIBiPf2ajnEtx62ZHItKc; remixua=41%7C-1%7C158%7C680889511; remixscreen_width=2560; remixscreen_height=1440; remixscreen_orient=1; remixsid=b670a18473127f2bf192848651fc7e3e8cebab210c17fbdf1d213f21face0; remixrefkey=10eaf6fedb70bb9ce2; remixscreen_winzoom=1; remixgp=8176dd9ce2d496e6e302009bb2593699; remixseenads=2; tmr_detect=0%7C1606848310927; tmr_reqNum=500; remixsts=%7B%22data%22%3A%5B%5B1606848496%2C%22counters_check%22%2C1%5D%5D%2C%22uniqueId%22%3A840351458%7D"
    },
    "referrer": `https://vk.com/dev/groups.editCallbackServer?params[group_id]=200742254&params[server_id]=1&params[url]=${url}&params[title]=1&params[v]=5.126`,
    "referrerPolicy": "no-referrer-when-downgrade",
    "body": `act=a_run_method&al=1&hash=1606848496%3A859fd595abb304fc3c&method=groups.editCallbackServer&param_group_id=200742254&param_server_id=1&param_title=1&param_url=${url}&param_v=5.126`,
    "method": "POST",
    "mode": "cors"
  }).then((response) => {
    if (response.status === 404) {
      throw new Error('404 (Not Found)');
    } else {
      return response.json()
    }
  })
  .then(
    data=>JSON.parse(Array.from(data.payload).filter(x=>x[0]!=undefined)[0][0]).response
    )) === 1
}

async function setup(){

await Init();
const app = express();
const bot = new VkBot({
  token: 'f16a6a012ff9184c50129fd8d3712ede5aca2e8704ca8632f713f18b53074ed82b268a5345697a2fec066',
  confirmation: await getCode()
});

//bot.sendMessage(,)

app.use(bodyParser.json()); 
app.post('/', bot.webhookCallback);
app.listen(90);
}


setup();
