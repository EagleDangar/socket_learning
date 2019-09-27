const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const port = process.env.PORT || 4001;
const app = express();
const index = require("./routes/index");
const server = http.createServer(app);
// const app.io = socketIo();
var Request = require("request").defaults({
  forever: true
});
var MongoClient = require("mongodb").MongoClient;
var credentials = require("./key.js");
app.io = socketIo();

app.io.listen(server);

app.use(function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

var option = {
  useNewUrlParser: true,
  socketTimeoutMS: 30000,
  keepAlive: true,
  reconnectTries: 60,
  reconnectInterval: 1000,
  poolSize: 10,
  bufferMaxEntries: 0,
  useUnifiedTopology: true
};

let interval;
// app.listen(4002, () => {
//   console.log(`started web process at Port :`);
// });

// app.use("/", index(app.io));

app.io.on("connection", socket => {
  if (interval) {
    clearInterval(interval);
  }
  var uri = credentials.url;
  const client = new MongoClient(uri, option);
  client.connect((err, db) => {
    if (err) console.log(err);
    console.log(` Here connected To DB `);

    // socket.on("getModelProgress", (deal_id,version_id) => {

    // console.log(` Here is the ${deal_id} `)
    // interval = setInterval(() => {
    try {
        socket.on(
          "getDealIdForModelProgress",
          (deal_id, version_id, deal_out_name) => {
            console.log(` Deal out name is ${deal_out_name} 
          and  Deal ID is ${deal_id}`);

            if (err) console.log(err);
            //Getting Cache Data From Collection

            db.db("argo")
              .collection("model_sims_progress")
              .aggregate(
                [
                  {
                    $match: {
                      $and: [
                        { deal_id: { $eq: deal_id } },
                        { version_id: { $eq: version_id } }
                      ]
                    }
                  },
                  {
                    $group: {
                      _id: null,
                      sum: { $sum: "$simulations_done" }
                    }
                  }
                ],
                function(err, sumsofsim) {
                  if (err) console.log(err);
                  let chang_flag;
                  let count = 0;
                  sumsofsim.toArray().then(simsCount => {
                    simsCount.forEach(sims => {
                      console.log(
                        "Total Simulation Count of Deal ID ==>" +
                          deal_id +
                          "==>",
                        sims.sum
                      );
                      percentage_done =
                        Number(((sims.sum / 10000) * 100).toFixed(2));
                      console.log(percentage_done + "  Done");

                      socket.emit(
                        "modelProgress",
                        percentage_done,
                        deal_out_name
                      );
                    });
                  });
                }
              );
          }
        );

        socket.on(
          "getDealIdForCashflowProgress",
          (deal_id, version_id, deal_out_name) => {
            console.log(` Deal out name is ${deal_out_name} 
          and  Deal ID is ${deal_id}`);

            if (err) console.log(err);
            //Getting Cache Data From Collection

            db.db("argo")
              .collection("cashflow_calcs_progress")
              .findOne(
                {deal_id : deal_id}).then(
                progress_deal => {
                  // console.log(progress_deal);
                  let status;
                  if(progress_deal!=null){
                    status = progress_deal.status;
                  }
                  else{
                    status = 35;
                  }
                  console.log(` Deal Name :- ${deal_out_name} Status :- ${status} `);
                  socket.emit(
                    "cashflowProgress",
                    status,
                    deal_out_name
                  );
                  
                });
          }
        );

        socket.on(
          "getAccumulationCalcProgress",
          () => {
            console.log(` accumulation Process `);

            if (err) console.log(err);
            //Getting Cache Data From Collection

            db.db("argo")
              .collection("accumulation_calcs_progress")
              .findOne().then(
                progress_accum => {
                  // console.log(progress_deal);
                  let status;
                  if(progress_accum!=null){
                    status = progress_accum.status;
                  }
                  else{
                    status = 35;
                  }
                  console.log(` Status :- ${status} `);
                  socket.emit(
                    "accumulationProgress",
                    status
                  );
                  
                });
          }
        );
      
    } catch (error) {
      console.error(`Error: ${error.code}`);
    }

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));

async function update_progress(socket, cashflow) {
  try {
    var uri = credentials.url;
    const client = new MongoClient(uri, option);
    client.connect((err, db) => {
      if (err) console.log(err);
      //Getting Cache Data From Collection

      db.db("argo")
        .collection("model_sims_progress")
        .aggregate(
          [
            {
              $match: {
                $and: [
                  { deal_id: { $eq: cashflow.deal_id } },
                  { version_id: { $eq: cashflow.version_id } }
                ]
              }
            },
            {
              $group: {
                _id: null,
                sum: { $sum: "$simulations_done" }
              }
            }
          ],
          function(err, sumsofsim) {
            sumsofsim.toArray().then(simsCount => {
              simsCount.forEach(sims => {
                console.log(
                  "Total Simulation Count of Deal ID ==>" +
                    cashflow.deal_id +
                    "==>",
                  sims.sum
                );
                percentage_done =
                  ((sims.sum / cashflow.simu_length) * 100).toFixed(0) + " %";
                console.log(percentage_done + "  Done");

                socket.emit("FromAPI", percentage_done, cashflow.deal_out_name);
                console.log("cashflow sims length==>", cashflow.simu_length);
              });
            });
          }
        );
    });
  } catch (error) {
    console.error(`Error: ${error.code}`);
  }
}
