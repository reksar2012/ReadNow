
const MongoClient = require('mongodb').MongoClient;
const puppeteer = require('puppeteer');
const getPocket = require('pocket-api');



const url = 'mongodb://root:admin@192.168.31.174:27017';
var client = new MongoClient(url);
client.connect({ useUnifiedTopology: true })
// Database Name
const dbName = 'ReadNow';
var Run = async _ => {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    let consumer_key = '94208-ed20d4ba82d51875b53f4b80';

    let pocket = new getPocket(consumer_key);
    var responce = await pocket.getRequestToken();
    await page.goto(`https://getpocket.com/auth/authorize?request_token=${responce}&redirect_uri=https://yandex.ru`);
    console.log(`https://getpocket.com/auth/authorize?request_token=${responce}&redirect_uri=https://yandex.ru`);
    page.evaluate(_ => {
        if (document.querySelector(".btn.btn-important.btn.btn-authorize") == null) {
            document.querySelector("#feed_id").innerText += "Stenchev@gmail.com";
            document.querySelector("#login_password").innerText += "NRCHEvERMeNtEc";
            document.querySelector(".login-btn-email.btn-authorize").click()
        }
        else {
            document.querySelector(".btn.btn-important.btn.btn-authorize").click();
        }
    });


    pocket.setRequestToken(responce);
    await setTimeout(_ => { }, 10000)
    var act = await pocket.getAccessToken();


    var article = await pocket.getArticles({
        "consumer_key": consumer_key,
        "access_token": act.access_token,
        "state": "unread",
        "detailType": "complete"
    });
    var arr = Object.keys(article.list).map(x => { return { ...article.list[x], source: "getpocket.com", url: article.list[x]["resolved_url"] } });
    
    await client.db(dbName).collection("Articles").insertMany(arr);
    client.db(dbName).collection("Articles").createIndex(
        {
            "item_id": 1
        }
    )
    

    await browser.close();
    client.close();
}

Run()