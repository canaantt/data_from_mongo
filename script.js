const mongoose = require('mongoose');
const jsonfile = require("jsonfile");
const _ = require('lodash');
const asyncLoop = require('node-async-loop');
const connection = mongoose.connection;
mongoose.connect(
    process.env.MONGO_CONNECTION, {
        db: {
            native_parser: true
        },
        server: {
            poolSize: 5,
            reconnectTries: Number.MAX_VALUE
        },
        replset: {
            rs_name: 'rs0'
        },
        user: process.env.MONGO_USER,
        pass: process.env.MONGO_PASSWORD
    });
var allCollectionNames = [
    'gbmnatgen2016_copynumber(gistic2_thresholded)',
    'gbmnatgen2016_dashboard',
    'gbmnatgen2016_diagnosis',
    'gbmnatgen2016_network',
    'gbmnatgen2016_samplemap',
    'gbmnatgen2016_somaticmutation(savi2)',
    'gbmnatgen2016_somaticmutation(savi2)_mut01'
];
connection.once('open', function(){
    var db = connection.db; 
    asyncLoop(allCollectionNames, function(c, next){ 
        console.log(c);
        db.collection(c).find({}).toArray().then((data) => {
            console.log(data.length);
            jsonfile.writeFile(c + '.json', JSON.stringify(data), {spaces: 2}, function(err){
                console.error(err);
                next();
            });
        });
    }, function (err)
    {
        if (err)
        {
            console.error('Error: ' + err.message);
            return;
        }
       console.log('Finished!');
       connection.close();
    });
  
});

