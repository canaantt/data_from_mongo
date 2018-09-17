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
            jsonfile.writeFile(c + '.json', data, {spaces: 2}, function(err){
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


//#region Transformation 
var samplemap = require('./gbmnatgen2016_samplemap.json');
var dashboard = require('./gbmnatgen2016_dashboard.json');
var network = require('./gbmnatgen2016_network.json');
var mut01 = require('./gbmnatgen2016_somaticmutation(savi2)_mut01.json');
var mut = require('./gbmnatgen2016_somaticmutation(savi2).json');
var cnv = require('./gbmnatgen2016_copynumber(gistic2_thresholded).json');


// psmap
var all_values = _.values(samplemap[0]);
all_values.shift();
var pt = _.uniq(all_values);

var sp = Object.keys(samplemap[0]);
sp.shift();


var psmap = {};
pt.forEach(p => {
    psmap[p] = getAllIndexes(all_values, p).map(index => sp[index]);
}); 
jsonfile.writeFile('output/psmap.json', psmap, function(err) {
    console.log(err);
});
// clinical
var clinical = {};
var fields = {};
var ids = _.uniq(dashboard.map(d => d.patient_ID));
var values = [];

var keys_original = Object.keys(dashboard[0]);
var keys = keys_original;
keys.shift();

keys.forEach(key => {
    if (key == 'age_at_diagnosis' ||
        key == 'days_to_last_follow_up' ||
        key == 'days_to_death') {
        var obj = {};
        var arr = dashboard.map(d => d.days_to_last_follow_up).filter(d => d!=null);
        console.log(arr);
        obj.max = _.max(arr);
        obj.min = _.min(arr);
        fields[key] = obj;
    } else {
        fields[key] = _.uniq(dashboard.map(d => d[key]));
    }
});
delete fields.patient_ID;
Object.keys(fields).forEach(key => {
    if (fields[key].length ==1 && fields[key][0] == null) {
        delete fields[key];
    }
});

var keys_remained = Object.keys(fields);
var indices_remained = keys_remained.map(key => keys_original.indexOf(key));
// [ 2, 5, 7, 8 ]
values = dashboard.map(d => {
    var arr = [];
    arr[0] = d[keys_remained[0]];
    arr[1] = fields['status_vital'].indexOf(d['status_vital']);
    arr[2] = d[keys_remained[2]];
    arr[3] = d[keys_remained[3]];
    return arr;
});

clinical.fields = fields;
clinical.ids = ids;
clinical.values = values;
jsonfile.writeFile('output/clinical.json', clinical, function(err) {
    console.log(err);
});
// cnv
var ids = Object.keys(cnv[1].data);

// mut
var ids = Object.keys(mut[1].data);

// manifest


//#endregion


var getAllIndexes = function(arr, val) {
    var indexes = [], i = -1;
    while ((i = arr.indexOf(val, i+1)) != -1){
        indexes.push(i);
    }
    return indexes;
}
