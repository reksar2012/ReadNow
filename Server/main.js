const MongoClient = require('mongodb').MongoClient;
const express = require('express')
const app = express()
const port = 3000
const url = 'mongodb://root:admin@192.168.31.174:27017';
var client = new MongoClient(url);
client.connect({ useUnifiedTopology: true })

app.get('/', (req, res) => {
    var x = client.db("ReadNow")
    .collection("Articles")
    .find();
                    res.send(x);
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})