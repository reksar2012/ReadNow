const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs').promises;
const parceMode= process.env.ParceMode?.split(",") || ["parce"];
const path = require("path");
const cheerio = require('cheerio');
const hash = require("object-hash")
let uas = [];

const queues = ['manga', 'chaters'];
console.log(parceMode);

var amqp = require('amqplib/callback_api');
let RabbitMqChannel;
const url = 'mongodb://root:admin@192.168.31.174:27017';
var client = new MongoClient(url,{useUnifiedTopology:true});
client.connect()
// Database Name
const dbName = 'ReadNow';

amqp.connect('amqp://192.168.31.174:5672', function (error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }

        queues.forEach(x => {channel.assertExchange(x,'direct', {
            durable: false,
        });
        channel.bindQueue(x, x, "mangapoisk");
        }
        );


        if(parceMode.includes("listening"))
        {
            channel.assertQueue(queues[0],{exclusive:true},ParceManga);
            channel.assertQueue(queues[1],{exclusive:true},ParceChater)
        }
        RabbitMqChannel = channel;

    });
});

async function Parce() {

    console.time('Full parce');

    uas = await GetUAs();

    console.time('Category parce');
    await ParceCategory();
    console.timeEnd('Full parce');

}

async function ParceChater(chaterObj) {
    if (chaterObj != undefined) {
        var chater = JSON.parse(chaterObj.content.toString());
    }
    else {
        return;
    }
    await GetChattersImage(chater);
    RabbitMqChannel.ack(chaterObj)
}

async function ParceManga(mangaObj) {
    if (mangaObj != undefined) {
        var manga = JSON.parse(mangaObj.content.toString());
        if (manga == undefined) {
            return;
        }
    }
    else {
        return;
    }
    try {
        console.log("start parsing ");
        manga = await GetTitleInfo(manga);
        manga = await GetChatters(manga);

        await client.db(dbName)
            .collection("Manga")
            .updateOne({
                Url: manga.url,
                Name: manga.name
            },
                {
                    $set: {
                        Url: manga.Url,
                        Img: manga.Img,
                        Name: manga.Name,
                        LikeCount: manga.LikeCount,
                        Rating: manga.Rating,
                        Status: manga.Status,
                        Categories: manga.Categories,
                        Description: manga.Description,
                        Year: manga.Year
                    }
                },
                {
                    upsert: true
                });
    }
    catch (e) {
        console.dir(manga);
        console.log(e);
        return;
    }
    console.dir(manga)
    console.log("end parsing "+manga.name);
}

async function ParceCategory() {
    let categories = await GetCategories();
    let mangas = [];

    await Promise.all(categories.map(x => {
        return GetTitle(x).then(elements => mangas = [...mangas, ...elements]);
    }));

    mangas = mangas.map(x=>{
        var objectHash = hash.sha1(x);
        x.hash = objectHash;
        return x
    });

    var hashes =[ ...new Set(mangas.map(x=>x.hash))];

    mangas = mangas.filter(x=>{
        var result = hashes.includes(x.hash);
        if(result) 
        hashes = hashes.filter(h=>h!=x.hash)
        return result;
    }).map(x=>{return {Name: x.name,Url:x.url}})
    .map(x=>RabbitMqChannel.publish(
        queues[0],
        "mangapoisk",
        Buffer.from(
            JSON.stringify(x)
            )
        )
    );
    
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
    isSuccess = true
    do {
        let ua = await GetRandomUA();
        let isSuccess = true;
        do {

            try {
                isSuccess = true;
                var response = await axios(`${category.url}?page=${offset}`, {
                    headers:
                    {
                        'User-Agent': ua
                    }
                });
            }
            catch {
                isSuccess = false;
                await delay(5000);
            }
        }
        while (!isSuccess)
        const html = response.data;
        const $ = cheerio.load(html);
        elements = $('.flex-item-mini.mx-1')
            .toArray()
            .map(x => {
                let elementQuerrySelector = cheerio.load(x);
                return {
                    url: "https://mangapoisk.ru" + elementQuerrySelector(".poster-container a")[0].attribs.href,
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
    do {
        try {
            isSuccess = true;
            var response = await delay(600000 * Math.random()).then(_ => axios(manga.Url));
        }
        catch {
            isSuccess = false;
            await delay(5000);
        }
    }
    while (!isSuccess)
    const html = response.data;
    const $ = cheerio.load(html);
    try {
        return {
            ...manga,
            Img: $(".col-md-4.col-lg-4.text-center img")[0]?.attribs?.src,
            LikeCount: $("span.ratesCount")[0].firstChild.data++,
            Rating: $(".ratingValue.ml-1")[0].firstChild.data++,
            Status: $(".post-info > span:nth-child(5)")[0].lastChild.data?.trim(),
            Categories: $(".post-info > span:nth-child(8) > a")?.toArray()?.map(x => x?.firstChild?.data),
            Description: $(".manga-description.entry")[0].firstChild.data,
            Year: $("div.post-info > span:nth-child(10)>a")[0].firstChild.data++
        }
    }
    catch (e) {
        console.log(e);
        return manga;
    }
}

async function GetChatters(manga) {
    let isSuccess = true;
    do {
        try {
            var response = await delay(60000 * Math.random()).then(_ => axios(manga.Url + "/chaptersList"));
        }
        catch {
            isSuccess = false;
            await delay(5000);
        }
    }
    while (!isSuccess)
    const html = response.data;
    const $ = cheerio.load(html);
    let chatters = $(".list-group-item.chapter-item").toArray()?.map(x => {
        let elementQuerrySelector = cheerio.load(x);

        let title = elementQuerrySelector(".chapter-title")[0].firstChild.data
            .trim()
            .replace("                    ", " ");
        return {
            CreatedAt: elementQuerrySelector(".chapter-date")[0].firstChild.data.trim(),
            Title: title,
            Url: "https://mangapoisk.ru" + elementQuerrySelector("a")[0].attribs.href
        };
    })
    chatters.forEach(x => RabbitMqChannel.publish(queues[1],"mangapoisk", Buffer.from(JSON.stringify(x))))
    return {
        ...manga,

        Chaters: (Array.isArray(chatters)) ? chatters : []
    }
}

async function GetChattersImage(chatter) {
    let isSuccess = true;
    do {
        try {
            var response = await delay(60000 * Math.random()).then(_ => axios(chatter.Url));
        }
        catch {
            isSuccess = false;
            await delay(5000);
        }
    }
    while (!isSuccess)
    const html = response.data;
    const $ = cheerio.load(html);
    chatter["Images"] = $("img.img-fluid.page-image").toArray()
        .map(x => {
            return {
                Image: x.attribs["data-alternative"],
                Number: x.attribs["data-number"]
            }
        })

}
async function GetUAs() {
    let doc = await fs.readFile(path.join(__dirname, "UserAgents.txt"));
    return doc.toString().split('\n').map(ua => ua.replace(' ', '').replace("\r", ""));
}
async function GetRandomUA() {

    return uas[Math.floor(Math.random() * uas.length)];
}
function delay(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}
if(parceMode.includes("parce")){
    Parce();
}
