const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs').promises;

const path = require("path");
const cheerio = require('cheerio');
let uas = [];

const queues = ['manga','chaters'];
 
var amqp = require('amqplib/callback_api');
let RabbitMqChannel;
const url = 'mongodb://root:admin@192.168.31.174:27017';
var client = new MongoClient(url);
client.connect({ useUnifiedTopology: true })
// Database Name
const dbName = 'ReadNow';
 
amqp.connect('amqp://192.168.31.174:5672', function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    
    queues.forEach(x=>channel.assertQueue(x, {
      durable: false,      
    }));
    channel.consume(queues[0],ParceManga,{noAck: true});
    channel.consume(queues[1],ParceChater,{noAck: true})
    RabbitMqChannel = channel;
    
  });
});  

async function Parce(){
    
   console.time('Full parce');

   uas=await GetUAs();
   
   console.time('Category parce');
   await ParceCategory();
   console.timeEnd('Full parce');

}

async function ParceChater(chaterObj) {
    if(chaterObj!=undefined){
        var chater = JSON.parse(chaterObj.content.toString());
    }
    else{
        return;
    }
    await GetChattersImage(chater);
}

async function ParceManga(mangaObj) {
    if(mangaObj!=undefined){
        var manga = JSON.parse(mangaObj.content.toString());
        if(manga == undefined){
            return;
        }
    }
    else{
        return;
    }
    manga = await GetTitleInfo(manga);
    manga = await GetChatters(manga);
    try{
    await client.db(dbName)
        .collection("Manga")
        .updateOne({
            Url: manga.url,
            Name: manga.name
        },
        {$set:{
            Url: manga.url,
            Img: manga.img,
            Name: manga.name,
            LikeCount: manga.LikeCount,
            Rating:manga.Rating,
            Status: manga.Status,
            Categories: manga.Categories,
            Description:manga.Description,
            Year:manga.Year
        }},
        {
            upsert:true
        });
    }
    catch(e){
        console.dir(manga)
        console.log(e)
    }
}

async function ParceCategory() {
    let categories = await GetCategories();
    console.timeEnd('Category parce');
    let mangas = [];

    await Promise.all(categories.map(x => {
        return GetTitle(x).then(elements => mangas = [...mangas, ...elements]);
    }));
    mangas.map(x=>
        RabbitMqChannel.sendToQueue(
            queues[0],
            Buffer.from(JSON.stringify(x))));;
}

async function GetCategories() {
        let ua = await GetRandomUA();
        var response = await axios(
                                        `https://mangapoisk.ru/genre`,
                                        {
                                            headers: 
                                                {
                                                    'User-Agent': ua 
                                                }
                                        });
        const html = response.data;
        const $ = cheerio.load(html);
         
    return $('.col-6.col-md-4.py-2 a')
                .toArray()
                .map(x => {
                    return {
                        url: "https://mangapoisk.ru" + x.attribs.href,
                        name: x.firstChild.nodeValue
                    };
                });
}

async function GetTitle(category) {
    let manga = [];
    let elements = [];
    let offset = 1;
    do {
        elements = [];
        let ua = await GetRandomUA();
        try{
        var response = await axios(`${category.url}?page=${offset}`,{
            headers: 
                {
                    'User-Agent':  ua
                }
        });
        }
        catch{
            return
        }
        const html = response.data;
        const $ = cheerio.load(html);
        elements = $('.flex-item-mini.mx-1')
            .toArray()
            .map(x => {
                let elementQuerrySelector = cheerio.load(x); 
                return {
                    url: "https://mangapoisk.ru"+elementQuerrySelector(".poster-container a")[0].attribs.href,
                    img: elementQuerrySelector(".poster-container img")?.first()[0]?.attribs["src"],                    
                    name: elementQuerrySelector(".poster-container img")?.first()[0]?.attribs["title"]
                };
            });
        offset += 1;
        manga = [...manga, ...elements];
    } while (elements.length != 0);
    return manga;
}

async function GetTitleInfo(manga) {
        let ua = await GetRandomUA();
        let isSuccess = true;
        do{
            try{
            var response = await delay(60000*Math.random()).then(_=> axios(manga.url));
            }
            catch{
                return manga;
            }
        }
        while(!isSuccess)
        const html = response.data;
        const $ = cheerio.load(html);
        try{
        return {
            ...manga,
            LikeCount: $("span.ratesCount")[0].firstChild.data++,
            Rating:$(".ratingValue.ml-1")[0].firstChild.data++,
            Status: $(".post-info > span:nth-child(5)")[0].lastChild.data?.trim(),
            Categories: $(".post-info > span:nth-child(8) > a")?.toArray()?.map(x=>x?.firstChild?.data),
            Description: $(".manga-description.entry")[0].firstChild.data,
            Year:$("div.post-info > span:nth-child(10)>a")[0].firstChild.data++
        }
        }
        catch(e){
            console.log(e);
            return manga;
        }
}

async function GetChatters(manga) {
    let isSuccess = true;
    do{
        try{
        var response = await delay(60000*Math.random()).then(_=> axios(manga.url+"/chaptersList"));
        }
        catch{
            return manga;
        }
    }
    while(!isSuccess)
    const html = response.data;
    const $ = cheerio.load(html);
    let chatters = $(".list-group-item.chapter-item").toArray()?.map(x => {
        let elementQuerrySelector = cheerio.load(x); 
        
        let title = elementQuerrySelector(".chapter-title")[0].firstChild.data
                                        .trim()
                                        .replace("                    "," ");
        return {
            CreatedAt: elementQuerrySelector(".chapter-date")[0].firstChild.data.trim(),
            Title: title,
            url: "https://mangapoisk.ru"+elementQuerrySelector("a")[0].attribs.href
        };
    })
    chatters.forEach(x=>RabbitMqChannel.sendToQueue(queues[1],Buffer.from(JSON.stringify(x))))
    return {
        ...manga,
        
        Chaters:(Array.isArray(chatters))? chatters : []
    }
}

async function GetChattersImage(chatter) {
    let isSuccess = true;
    do{
        try{
        var response = await delay(60000*Math.random()).then(_=> axios(chatter.url));
        }
        catch{
            return;
        }
    }
    while(!isSuccess)
    const html = response.data;
    const $ = cheerio.load(html);
    chatter["Images"] = $("img.img-fluid.page-image").toArray()
                    .map(x=>{
                        return {
                            Image: x.attribs["data-alternative"],
                            Number: x.attribs["data-number"]
                        }
                    })
    chatter.Images.map(x=>RabbitMqChannel.sendToQueue(queues[3],Buffer.from(JSON.stringify(x)), {
        persistent: true
      }))
        
}
async function GetUAs(){
    let doc = await fs.readFile(path.join(__dirname,"UserAgents.txt"));
    return doc.toString().split('\n').map(ua=>ua.replace(' ','').replace("\r",""));
} 
async function GetRandomUA(){
    
    return uas[Math.floor(Math.random()*uas.length)];
} 
function delay(ms) {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, ms);
    });
  }

Parce();
